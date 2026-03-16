'use server';
/**
 * @fileOverview Orchestrator for domain/IP/CIDR extraction from PDF files.
 *
 * Detects PDF type and routes accordingly:
 *  - Text PDF:    Python extraction → detectDomainsInText (Phase 2+3a+3c) → Phase 3b (Tier 2 AI)
 *  - Scanned PDF: Render pages → extractTextFromImages (Gemini Vision)
 *  - Mixed PDF:   Text path + embedded image Vision path, results merged
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unzipSync, zipSync } from 'fflate';
import { detectDomainsInText } from './detect-domains-in-text-flow.js';
import { extractTextFromImages, type ImageItem } from './extract-text-from-image-flow.js';
import { isValidDomain, isExcluded, loadPsl } from './detect-domains-in-text-flow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Minimum extracted text length to consider a PDF as having a text layer
const SCANNED_TEXT_THRESHOLD = 200;

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

export const ExtractDomainsFromFileInputSchema = z.object({
  fileDataUri: z
    .string()
    .refine(val => val.startsWith('data:'), {
      message: "File must be a data URI starting with 'data:'",
    })
    .describe('A file (like a PDF) as a data URI (Base64, MIME-prefixed).'),
});
export type ExtractDomainsFromFileInput = z.infer<typeof ExtractDomainsFromFileInputSchema>;

const CidrInfoSchema = z.object({
  ip: z.string().describe('IP part of the CIDR'),
  prefix: z.union([z.string(), z.number()]).transform(String).describe('Prefix length'),
  cidr: z.string().describe('Full CIDR string'),
});

export const ExtractDomainsFromFileOutputSchema = z.object({
  domains: z.array(z.string()).nullable().default([]),
  ipv4: z.array(z.string()).nullable().default([]),
  ipv6: z.array(z.string()).nullable().default([]),
  cidrs: z.array(CidrInfoSchema).nullable().default([]),
  extractedText: z.string().optional(),
  candidatesZipBase64: z.string().optional(),
  truncated: z.boolean().optional().describe('True if image processing was cut short by the token limit.'),
  pagesAnalyzed: z.number().optional().describe('Number of pages analyzed in scanned PDF mode.'),
});
export type ExtractDomainsFromFileOutput = z.infer<typeof ExtractDomainsFromFileOutputSchema>;

// ─────────────────────────────────────────────
// Phase 1: Python Text Extraction
// ─────────────────────────────────────────────

interface EmbeddedImage {
  index: number;
  page: number;
  width: number;
  height: number;
  base64: string;
  ext: string;
  y_top?: number;
  y_bottom?: number;
  page_height?: number;
}

interface PythonExtractionResult {
  text: string;
  text_pymupdf?: string;
  text_pdfplumber?: string;
  candidates: Array<{ fragment: string; joined: string; page: number }>;
  candidates_tier2: Array<{ fragment: string; joined: string; page: number }>;
  zip_base64?: string | null;
  embedded_images?: EmbeddedImage[];
  warnings?: string[];
}

async function extractTextFromPdf(fileDataUri: string): Promise<PythonExtractionResult> {
  const base64Data = fileDataUri.split(',')[1];
  const scriptPath = join(__dirname, '..', '..', 'scripts', 'extract_pdf_text.py');

  return new Promise((resolve, reject) => {
    const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    py.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    py.on('close', (code: number) => {
      if (stderr) console.log('[Extract Domains Flow] Python stderr:', stderr.trim());
      if (code !== 0) return reject(new Error(`Python exited with code ${code}: ${stderr}`));
      try {
        const lines = stdout.trim().split('\n');
        const result: PythonExtractionResult = JSON.parse(lines[lines.length - 1]);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${e}\nRaw: ${stdout.slice(0, 500)}`));
      }
    });

    py.stdin.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') console.error('[Python stdin error]', err);
    });
    py.stdin.write(base64Data);
    py.stdin.end();
  });
}

// ─────────────────────────────────────────────
// Page Rendering (for scanned PDFs)
// ─────────────────────────────────────────────

interface RenderedPage {
  index: number;
  width: number;
  height: number;
  base64: string;
}

async function renderPdfPages(fileDataUri: string): Promise<RenderedPage[]> {
  const base64Data = fileDataUri.split(',')[1];
  const scriptPath = join(__dirname, '..', '..', 'scripts', 'render_pdf_pages.py');

  return new Promise((resolve, reject) => {
    const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    py.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    py.on('close', (code: number) => {
      if (stderr) console.log('[Render Pages] Python stderr:', stderr.trim());
      if (code !== 0) return reject(new Error(`Page render exited with code ${code}: ${stderr}`));
      try {
        const lines = stdout.trim().split('\n');
        const result = JSON.parse(lines[lines.length - 1]) as {
          pages: RenderedPage[];
          warnings?: string[];
        };
        if (result.warnings?.length) console.warn('[Render Pages] Warnings:', result.warnings);
        resolve(result.pages ?? []);
      } catch (e) {
        reject(new Error(`Failed to parse render output: ${e}\nRaw: ${stdout.slice(0, 500)}`));
      }
    });

    py.stdin.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') console.error('[Render stdin error]', err);
    });
    py.stdin.write(base64Data);
    py.stdin.end();
  });
}

// ─────────────────────────────────────────────
// Phase 3b: Tier 2 AI Validation
// Returns the domain string the AI sees.
// c.joined is used only for logging (cross-check), not sent to the AI.
// ─────────────────────────────────────────────

async function validateTier2WithAI(
  candidates: Array<{ fragment: string; joined: string; page: number }>,
  zipBase64?: string | null,
): Promise<string[]> {
  if (!candidates.length) {
    console.log('[Phase 3b] Skipping AI validation: no Tier 2 candidates.');
    return [];
  }
  if (!zipBase64) {
    console.log('[Phase 3b] Skipping AI validation: zip_base64 is missing/null from Python output.');
    return [];
  }

  // Extract Tier 2 images from ZIP
  const imagesByIndex = new Map<number, Buffer>();
  try {
    const zipBytes = Buffer.from(zipBase64, 'base64');
    const files = unzipSync(new Uint8Array(zipBytes));
    const allFiles = Object.keys(files);
    console.log(`[Phase 3b] ZIP opened — ${allFiles.length} entries:`, allFiles.slice(0, 10));
    for (const [name, data] of Object.entries(files)) {
      const m = name.match(/tier2\/candidate_(\d+)_/);
      if (m) imagesByIndex.set(parseInt(m[1], 10) - 1, Buffer.from(data as Uint8Array));
    }
    console.log(`[Phase 3b] Extracted ${imagesByIndex.size} Tier 2 image(s) from ZIP.`);
  } catch (e) {
    console.error('[Phase 3b] Failed to extract images from ZIP:', e);
    return [];
  }

  const { simpleTLDs, compoundTLDs } = loadPsl();
  const confirmed: string[] = [];

  // Case E response schema: AI returns verdict + list of domains
  const CaseEResponseSchema = z.object({
    verdict: z.enum(['separate', 'joined']),
    domains: z.array(z.string()),
  });

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const imgBuffer = imagesByIndex.get(i);
    if (!imgBuffer) {
      console.log(
        `[Phase 3b] No image for candidate ${i} "${c.joined}" — skipping (available indices: [${[...imagesByIndex.keys()].join(', ')}])`,
      );
      continue;
    }

    // Detect Case E: both fragment parts are independently valid domains
    const parts = c.fragment.split('\n');
    const t1 = parts[0]?.trim() ?? '';
    const t2 = parts[1]?.trim() ?? '';
    const isCaseE = t1 && t2
      && isValidDomain(t1, simpleTLDs, compoundTLDs)
      && isValidDomain(t2, simpleTLDs, compoundTLDs);

    const imgBase64 = imgBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${imgBase64}`;

    const prompt = isCaseE
      ? [
          'This image shows two items that appeared on consecutive lines in a PDF document.',
          `The heuristic identified: "${t1}" (line 1) and "${t2}" (line 2).`,
          'They could be:',
          '(a) Two separate domain names listed one after the other.',
          '(b) A single domain name broken (word-wrapped) across two lines.',
          '',
          'Look at the image carefully and decide.',
          'Return ONLY a JSON object — no extra text:',
          '{"verdict": "separate", "domains": ["first.domain", "second.domain"]}',
          '{"verdict": "joined",   "domains": ["combined.domain"]}',
        ].join('\n')
      : [
          'This image is a cropped cell from a PDF table of domain names.',
          'A domain name may be split (word-wrapped) across two lines inside this cell.',
          'What is the complete domain name you see?',
          'Return ONLY the domain name string (e.g. "example.com.br"). If you cannot identify a domain, return "null".',
        ].join('\n');

    try {
      console.log(`[Phase 3b] Calling Gemini for candidate ${i + 1}/${candidates.length} (heuristic: "${c.joined}", caseE: ${!!isCaseE})...`);
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: [
              { media: { url: imageUrl, contentType: 'image/jpeg' } },
              { text: prompt },
            ],
          },
        ],
        config: { maxOutputTokens: isCaseE ? 100 : 50, temperature: 1 },
      });

      const rawText = (response.text ?? '').trim();

      if (isCaseE) {
        const json = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        try {
          const parsed = CaseEResponseSchema.parse(JSON.parse(json));
          console.log(`[Phase 3b] Case E candidate ${i + 1} — verdict: "${parsed.verdict}", domains: [${parsed.domains.join(', ')}]`);
          for (const domain of parsed.domains) {
            const d = domain.toLowerCase().replace(/['"]/g, '').trim();
            if (d && d !== 'null' && isValidDomain(d, simpleTLDs, compoundTLDs) && !isExcluded(d)) {
              confirmed.push(d);
            }
          }
        } catch (e) {
          console.error(`[Phase 3b] Failed to parse Case E response for "${c.joined}":`, e, '\nRaw:', rawText.slice(0, 200));
        }
      } else {
        const domainFromAI = rawText.toLowerCase().replace(/['"]/g, '');
        console.log(`[Phase 3b] Candidate ${i + 1}/${candidates.length} — heuristic: "${c.joined}", AI: "${domainFromAI}"`);
        if (
          domainFromAI &&
          domainFromAI !== 'null' &&
          isValidDomain(domainFromAI, simpleTLDs, compoundTLDs) &&
          !isExcluded(domainFromAI)
        ) {
          if (domainFromAI !== c.joined.toLowerCase()) {
            console.log(`[Phase 3b] Heuristic corrected: "${c.joined}" → "${domainFromAI}"`);
          }
          confirmed.push(domainFromAI);
        }
      }
    } catch (e) {
      console.error(`[Phase 3b] AI call failed for "${c.joined}":`, e);
    }
  }

  console.log(`[Phase 3b] Confirmed ${confirmed.length}/${candidates.length}:`, confirmed);
  return confirmed;
}

// ─────────────────────────────────────────────
// ZIP Augmentation
// Removes candidates.txt, adds embedded images + AI responses, adds domains.txt
// ─────────────────────────────────────────────

function buildAugmentedZip(
  existingZipBase64: string | null | undefined,
  embeddedImages: EmbeddedImage[],
  perImageResults: Array<{ index: number; aiResponseRaw: string }>,
  finalResult: { domains: string[]; ipv4: string[]; ipv6: string[]; cidrs: Array<{ cidr: string }> },
  pymupdfText: string,
  pdfplumberText: string,
): string | undefined {
  const hasContent = existingZipBase64 || embeddedImages.length > 0 || pymupdfText.trim() || pdfplumberText.trim();
  if (!hasContent) return undefined;

  const entries: Record<string, Uint8Array> = {};

  // Copy existing tier1/tier2 candidate images, dropping candidates.txt
  if (existingZipBase64) {
    const existing = unzipSync(new Uint8Array(Buffer.from(existingZipBase64, 'base64')));
    for (const [name, data] of Object.entries(existing)) {
      if (name !== 'candidates.txt') {
        entries[name] = data as Uint8Array;
      }
    }
  }

  // Add all embedded images (found) + AI response files (for those actually sent to AI)
  const aiResponseMap = new Map(perImageResults.map(r => [r.index, r.aiResponseRaw]));
  for (const img of embeddedImages) {
    const ext = img.ext || 'jpg';
    const pad = String(img.index + 1).padStart(3, '0');
    const prefix = `embedded/image_${pad}_p${img.page + 1}`;
    entries[`${prefix}.${ext}`] = new Uint8Array(Buffer.from(img.base64, 'base64'));
    const aiResponse = aiResponseMap.get(img.index);
    if (aiResponse !== undefined) {
      entries[`${prefix}_ai_response.txt`] = new TextEncoder().encode(aiResponse);
    }
  }

  // Add final results list
  const lines: string[] = [`=== DOMAINS (${finalResult.domains.length}) ===`, ...finalResult.domains];
  if (finalResult.ipv4.length > 0) lines.push('', `=== IPv4 (${finalResult.ipv4.length}) ===`, ...finalResult.ipv4);
  if (finalResult.ipv6.length > 0) lines.push('', `=== IPv6 (${finalResult.ipv6.length}) ===`, ...finalResult.ipv6);
  if (finalResult.cidrs.length > 0) lines.push('', `=== CIDRs (${finalResult.cidrs.length}) ===`, ...finalResult.cidrs.map(c => c.cidr));
  entries['domains.txt'] = new TextEncoder().encode(lines.join('\n'));

  if (pymupdfText.trim()) entries['extraction/text_pymupdf.txt'] = new TextEncoder().encode(pymupdfText);
  if (pdfplumberText.trim()) entries['extraction/text_pdfplumber.txt'] = new TextEncoder().encode(pdfplumberText);

  return Buffer.from(zipSync(entries, { level: 6 })).toString('base64');
}

// ─────────────────────────────────────────────
// Genkit Flow (Orchestrator)
// ─────────────────────────────────────────────

const extractDomainsFromFileFlow = ai.defineFlow(
  {
    name: 'extractDomainsFromFileFlow',
    inputSchema: ExtractDomainsFromFileInputSchema,
    outputSchema: ExtractDomainsFromFileOutputSchema,
  },
  async (input: ExtractDomainsFromFileInput) => {
    console.time('⏱️ Total Processing Time');

    // ── Phase 1: Python text extraction ──
    console.time('⏱️ Phase 1: PDF Text Extraction');
    console.log('[Orchestrator] Phase 1: extracting text (Python)...');
    const pythonResult = await extractTextFromPdf(input.fileDataUri);
    console.timeEnd('⏱️ Phase 1: PDF Text Extraction');

    if (pythonResult.warnings?.length) {
      console.warn('[Orchestrator] Python warnings:', pythonResult.warnings);
    }

    const textLength = pythonResult.text?.trim().length ?? 0;
    console.log(
      `[Orchestrator] Text length: ${textLength} | Tier1: ${pythonResult.candidates.length} | Tier2: ${pythonResult.candidates_tier2?.length ?? 0}`,
    );

    // ── Route: Scanned PDF (no/minimal text layer) ──
    if (textLength < SCANNED_TEXT_THRESHOLD) {
      console.log('[Orchestrator] Scanned PDF detected — switching to Gemini Vision path.');

      console.time('⏱️ Page Rendering');
      const renderedPages = await renderPdfPages(input.fileDataUri);
      console.timeEnd('⏱️ Page Rendering');
      console.log(`[Orchestrator] Rendered ${renderedPages.length} pages.`);

      const images: ImageItem[] = renderedPages.map(p => ({
        base64: p.base64,
        width: p.width,
        height: p.height,
        index: p.index,
      }));

      console.time('⏱️ Gemini Vision Extraction');
      const imageResult = await extractTextFromImages({ images });
      console.timeEnd('⏱️ Gemini Vision Extraction');
      console.timeEnd('⏱️ Total Processing Time');

      return {
        domains: imageResult.domains,
        ipv4: imageResult.ipv4,
        ipv6: imageResult.ipv6,
        cidrs: imageResult.cidrs,
        extractedText: '',
        truncated: imageResult.truncated,
        pagesAnalyzed: imageResult.imagesProcessed,
      };
    }

    // ── Route: Text PDF ──
    console.log('[Orchestrator] Text PDF detected — using text extraction path.');

    // Phase 3b: AI validate Tier 2 broken-domain candidates
    console.time('⏱️ Phase 3b: Tier 2 AI Validation');
    const tier2Candidates = pythonResult.candidates_tier2 ?? [];
    const tier2Confirmed = await validateTier2WithAI(tier2Candidates, pythonResult.zip_base64);
    console.timeEnd('⏱️ Phase 3b: Tier 2 AI Validation');

    // Phases 2 + 3a + 3c: deterministic detection + filtering
    console.time('⏱️ Phase 2+3: Detection');
    const detectionResult = detectDomainsInText({
      text: pythonResult.text,
      tier1Candidates: pythonResult.candidates,
      tier2Candidates,
      tier2Confirmed,
    });
    console.timeEnd('⏱️ Phase 2+3: Detection');

    // ── Route: Mixed PDF (embedded images alongside text layer) ──
    let embeddedImageResult: Awaited<ReturnType<typeof extractTextFromImages>> | null = null;
    const embeddedImages = pythonResult.embedded_images ?? [];
    if (embeddedImages.length > 0) {
      console.log(`[Orchestrator] Mixed PDF detected — ${embeddedImages.length} embedded image(s) to process.`);
      console.time('⏱️ Embedded Image Extraction');
      const images: ImageItem[] = embeddedImages.map(img => ({
        base64: img.base64,
        width: img.width,
        height: img.height,
        index: img.index,
        yTop: img.y_top,
        yBottom: img.y_bottom,
        pageHeight: img.page_height,
      }));
      embeddedImageResult = await extractTextFromImages({ images });
      console.timeEnd('⏱️ Embedded Image Extraction');
    }

    console.timeEnd('⏱️ Total Processing Time');

    const finalDomains = [...new Set([
      ...(detectionResult.domains ?? []),
      ...(embeddedImageResult?.domains ?? []),
    ])];
    const finalIpv4 = [...new Set([
      ...(detectionResult.ipv4 ?? []),
      ...(embeddedImageResult?.ipv4 ?? []),
    ])];
    const finalIpv6 = [...new Set([
      ...(detectionResult.ipv6 ?? []),
      ...(embeddedImageResult?.ipv6 ?? []),
    ])];
    const finalCidrs = [
      ...(detectionResult.cidrs ?? []),
      ...(embeddedImageResult?.cidrs ?? []),
    ].filter((c, i, arr) => arr.findIndex(x => x.cidr === c.cidr) === i);

    const augmentedZip = buildAugmentedZip(
      pythonResult.zip_base64,
      embeddedImages,
      embeddedImageResult?.perImageResults ?? [],
      { domains: finalDomains, ipv4: finalIpv4, ipv6: finalIpv6, cidrs: finalCidrs },
      pythonResult.text_pymupdf ?? '',
      pythonResult.text_pdfplumber ?? '',
    );

    return {
      domains: finalDomains,
      ipv4: finalIpv4,
      ipv6: finalIpv6,
      cidrs: finalCidrs,
      extractedText: pythonResult.text,
      candidatesZipBase64: augmentedZip,
      truncated: embeddedImageResult?.truncated,
      pagesAnalyzed: embeddedImageResult?.imagesProcessed,
    };
  },
);

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

export async function extractDomainsFromFile(
  input: ExtractDomainsFromFileInput,
): Promise<ExtractDomainsFromFileOutput> {
  return extractDomainsFromFileFlow(input);
}

export { extractTextFromPdf };
