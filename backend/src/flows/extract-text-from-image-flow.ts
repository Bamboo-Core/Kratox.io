'use server';
/**
 * @fileOverview Extracts domains, IPs, and CIDRs from images using Gemini Vision.
 *
 * Filters applied before sending each image to Gemini:
 *  1. Minimum size:    images smaller than MIN_IMAGE_WIDTH × MIN_IMAGE_HEIGHT are skipped
 *  2. Header/footer:  images entirely within the top or bottom 15% of the page are skipped
 *  3. Deduplication:  identical images (by SHA-256 hash) are sent only once
 *  4. Token budget:   stops processing when accumulated tokens would exceed IMAGE_TOKEN_LIMIT
 *
 * Output items go into the main detection flow as Tier 1 confirmed entries.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { createHash } from 'crypto';
import { isValidDomain, isExcluded, loadPsl, CidrInfoSchema, type CidrInfo } from './detect-domains-in-text-flow.js';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const IMAGE_TOKEN_LIMIT = 20_000;
const MIN_IMAGE_WIDTH = 100;  // px
const MIN_IMAGE_HEIGHT = 30;  // px
const HEADER_FOOTER_MARGIN = 0.15; // 15% of page height

// ─────────────────────────────────────────────
// Token Calculation
// ─────────────────────────────────────────────

export function calculateImageTokens(width: number, height: number): number {
  if (width <= 384 && height <= 384) return 258;
  const cropUnit = Math.floor(Math.min(width, height) / 1.5);
  const tilesH = Math.ceil(width / cropUnit);
  const tilesV = Math.ceil(height / cropUnit);
  return tilesH * tilesV * 258;
}

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

export const ImageItemSchema = z.object({
  base64: z.string().describe('JPEG/PNG image as base64 string (no data URI prefix).'),
  width: z.number().describe('Image width in pixels.'),
  height: z.number().describe('Image height in pixels.'),
  index: z.number().describe('Page or image index (0-based).'),
  yTop: z.number().optional().describe('Top y-coordinate within the page (for embedded images).'),
  yBottom: z.number().optional().describe('Bottom y-coordinate within the page (for embedded images).'),
  pageHeight: z.number().optional().describe('Total page height in pixels (required for header/footer filtering).'),
});
export type ImageItem = z.infer<typeof ImageItemSchema>;

export const ExtractFromImageInputSchema = z.object({
  images: z.array(ImageItemSchema).describe('Images to process.'),
});
export type ExtractFromImageInput = z.infer<typeof ExtractFromImageInputSchema>;

export const ExtractFromImageOutputSchema = z.object({
  domains: z.array(z.string()).default([]),
  ipv4: z.array(z.string()).default([]),
  ipv6: z.array(z.string()).default([]),
  cidrs: z.array(CidrInfoSchema).default([]),
  truncated: z.boolean().default(false).describe('True when the token limit was reached and remaining images were skipped.'),
  imagesProcessed: z.number().default(0),
  tokensUsed: z.number().default(0),
  perImageResults: z.array(z.object({
    index: z.number(),
    aiResponseRaw: z.string(),
  })).default([]).describe('Raw AI response per image that was actually sent to Gemini.'),
});
export type ExtractFromImageOutput = z.infer<typeof ExtractFromImageOutputSchema>;

// ─────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────

function isTooSmall(img: ImageItem): boolean {
  return img.width < MIN_IMAGE_WIDTH || img.height < MIN_IMAGE_HEIGHT;
}

function isHeaderOrFooter(img: ImageItem): boolean {
  if (img.yTop === undefined || img.yBottom === undefined || img.pageHeight === undefined) return false;
  const topBoundary = img.pageHeight * HEADER_FOOTER_MARGIN;
  const bottomBoundary = img.pageHeight * (1 - HEADER_FOOTER_MARGIN);
  return img.yBottom <= topBoundary || img.yTop >= bottomBoundary;
}

function hashImage(base64: string): string {
  return createHash('sha256').update(base64).digest('hex');
}

// ─────────────────────────────────────────────
// Single Image Extraction (Gemini Vision)
// ─────────────────────────────────────────────

const GeminiImageResponseSchema = z.object({
  domains: z.array(z.string()).default([]),
  ipv4: z.array(z.string()).default([]),
  ipv6: z.array(z.string()).default([]),
  cidrs: z.array(z.string()).default([]),
});

async function extractFromSingleImage(image: ImageItem): Promise<{
  domains: string[];
  ipv4: string[];
  ipv6: string[];
  cidrs: string[];
  inputTokens: number;
  outputTokens: number;
  rawResponse: string;
}> {
  // Detect JPEG by its base64 prefix (/9j/ = FF D8 FF)
  const mimeType = image.base64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
  const dataUri = `data:${mimeType};base64,${image.base64}`;

  const prompt = [
    'This image is from a PDF document. It may contain a list or table of domain names, IP addresses, and CIDR blocks.',
    'Extract ALL of them. Be systematic and exhaustive — go through every entry in the list or table, including the very first and very last rows.',
    'Do NOT stop early. If you see a numbered list or table with N entries, extract all N items.',
    'Domain names may be split (word-wrapped) across lines — reconstruct and include them as single entries.',
    'Domain names may use unusual or newer TLDs such as .gratis, .su, .lol, .baby, .fun, .online, .live, .lat, .xyz — these are all valid domain extensions.',
    'IMPORTANT: Ignore superscript numbers or footnote markers (e.g. ¹ ² ³ ⁴ ⁵) that appear immediately after a domain name — they are footnote references, not part of the domain.',
    '',
    'Return a JSON object with exactly these keys:',
    '- "domains": array of domain name strings (e.g. ["example.com", "sub.domain.org"])',
    '- "ipv4": array of IPv4 address strings (e.g. ["1.2.3.4"])',
    '- "ipv6": array of IPv6 address strings',
    '- "cidrs": array of CIDR strings (e.g. ["192.168.0.0/24"])',
    '',
    'Return ONLY the JSON object, no extra text. If a category has no items, use an empty array.',
  ].join('\n');

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash-lite',
    messages: [
      {
        role: 'user',
        content: [
          { media: { url: dataUri, contentType: mimeType } },
          { text: prompt },
        ],
      },
    ],
    config: { temperature: 1 },
  });

  const raw = (response.text ?? '').trim();
  // Strip markdown code fences if present
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const inputTokens = response.usage?.inputTokens ?? 0;
  const outputTokens = response.usage?.outputTokens ?? 0;
  // Note: Genkit does not expose thinking or image tokens — inputTokens is text-prompt only.
  // gemini-2.5-flash-lite is not a thinking model; image tokens are billed separately by Google.

  try {
    return { ...GeminiImageResponseSchema.parse(JSON.parse(json)), inputTokens, outputTokens, rawResponse: raw };
  } catch (e) {
    console.error(`[Image OCR] Failed to parse Gemini response for image ${image.index}:`, e, '\nRaw:', raw.slice(0, 200));
    return { domains: [], ipv4: [], ipv6: [], cidrs: [], inputTokens, outputTokens, rawResponse: raw };
  }
}

// ─────────────────────────────────────────────
// Post-processing
// ─────────────────────────────────────────────

function validateDomains(domains: string[]): string[] {
  const { simpleTLDs, compoundTLDs } = loadPsl();
  return domains
    .map(d => d.toLowerCase().trim())
    .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
    .filter(d => !isExcluded(d));
}

function parseCidrString(cidrString: string): CidrInfo {
  const parts = cidrString.split('/');
  return { ip: parts[0].trim(), prefix: parts[1]?.trim() || '32', cidr: cidrString.trim() };
}

// ─────────────────────────────────────────────
// Genkit Flow
// ─────────────────────────────────────────────

const extractTextFromImageFlow = ai.defineFlow(
  {
    name: 'extractTextFromImageFlow',
    inputSchema: ExtractFromImageInputSchema,
    outputSchema: ExtractFromImageOutputSchema,
  },
  async (input: ExtractFromImageInput): Promise<ExtractFromImageOutput> => {
    const seenHashes = new Set<string>();
    let tokensUsed = 0;
    let imagesProcessed = 0;
    let truncated = false;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const allDomains: string[] = [];
    const allIpv4: string[] = [];
    const allIpv6: string[] = [];
    const allCidrs: string[] = [];
    const perImageResults: Array<{ index: number; aiResponseRaw: string }> = [];

    for (const image of input.images) {
      if (isTooSmall(image)) {
        console.log(`[Image OCR] Skipping image ${image.index}: too small (${image.width}×${image.height})`);
        continue;
      }

      if (isHeaderOrFooter(image)) {
        console.log(`[Image OCR] Skipping image ${image.index}: header/footer region`);
        continue;
      }

      const hash = hashImage(image.base64);
      if (seenHashes.has(hash)) {
        console.log(`[Image OCR] Skipping image ${image.index}: duplicate`);
        continue;
      }
      seenHashes.add(hash);

      const imageTokens = calculateImageTokens(image.width, image.height);
      if (tokensUsed + imageTokens > IMAGE_TOKEN_LIMIT) {
        console.log(`[Image OCR] Token limit reached (${tokensUsed}/${IMAGE_TOKEN_LIMIT}). Stopping at image ${image.index}.`);
        truncated = true;
        break;
      }

      console.log(`[Image OCR] Processing image ${image.index} (${image.width}×${image.height}, ~${imageTokens} tokens)...`);
      try {
        const result = await extractFromSingleImage(image);
        allDomains.push(...result.domains);
        allIpv4.push(...result.ipv4);
        allIpv6.push(...result.ipv6);
        allCidrs.push(...result.cidrs);
        tokensUsed += imageTokens;
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
        imagesProcessed++;
        perImageResults.push({ index: image.index, aiResponseRaw: result.rawResponse });
        console.log(`[Image OCR] Image ${image.index}: ${result.domains.length} domains, ${result.ipv4.length} IPs, ${result.cidrs.length} CIDRs`);
      } catch (e) {
        console.error(`[Image OCR] Failed to process image ${image.index}:`, e);
      }
    }

    const finalDomains = validateDomains([...new Set(allDomains)]);
    const finalIpv4 = [...new Set(allIpv4)];
    const finalIpv6 = [...new Set(allIpv6)];
    const finalCidrs = [...new Set(allCidrs)].map(parseCidrString);

    console.log('[Image OCR] Complete:', {
      domains: finalDomains.length,
      ipv4: finalIpv4.length,
      ipv6: finalIpv6.length,
      cidrs: finalCidrs.length,
      imagesProcessed,
      truncated,
    });
    console.log(`[Image OCR] Token usage — input: ${totalInputTokens}, output: ${totalOutputTokens}, total: ${totalInputTokens + totalOutputTokens}`);

    return {
      domains: finalDomains,
      ipv4: finalIpv4,
      ipv6: finalIpv6,
      cidrs: finalCidrs,
      truncated,
      imagesProcessed,
      tokensUsed,
      perImageResults,
    };
  },
);

export async function extractTextFromImages(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
  return extractTextFromImageFlow(input);
}
