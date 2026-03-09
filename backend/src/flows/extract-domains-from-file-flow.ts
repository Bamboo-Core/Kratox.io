'use server';
/**
 * @fileOverview Flow to extract domain names, IPs, and CIDRs from a file (PDF).
 *
 * Phase 1 : Text extraction via Python (PyMuPDF + pdfplumber)
 * Phase 1b: Broken domain detection (Tier 1 + Tier 2 heuristics, PSL-based)
 * Phase 2 : Deterministic regex extraction on merged text + PSL validation
 * Phase 3 : Filtering, deduplication, Tier 2 validation  [TODO]
 * Phase 4 : Caching                                       [TODO]
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { unzipSync } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

export const ExtractDomainsFromFileInputSchema = z.object({
  fileDataUri: z.string()
    .refine(val => val.startsWith('data:'), {
      message: "File must be a data URI starting with 'data:'",
    })
    .describe("A file (like a PDF) as a data URI (Base64, MIME-prefixed)."),
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
});
export type ExtractDomainsFromFileOutput = z.infer<typeof ExtractDomainsFromFileOutputSchema>;

// ─────────────────────────────────────────────
// Phase 1 Python result interface
// ─────────────────────────────────────────────

interface PythonExtractionResult {
  text: string;
  candidates: Array<{ fragment: string; joined: string; page: number }>;
  candidates_tier2: Array<{ fragment: string; joined: string; page: number }>;
  zip_base64?: string | null; // Python's None serializes to JSON null, not undefined
  warnings?: string[];
}

// ─────────────────────────────────────────────
// Phase 1: Text Extraction (Python subprocess)
// ─────────────────────────────────────────────

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
      // EPIPE = Python process already exited before we finished writing (e.g. early crash)
      if (err.code !== 'EPIPE') console.error('[Python stdin error]', err);
    });
    py.stdin.write(base64Data);
    py.stdin.end();
  });
}

// ─────────────────────────────────────────────
// Phase 2: PSL loading + deterministic regex
// ─────────────────────────────────────────────

/**
 * Load the Public Suffix List from the local file.
 * Returns two Sets: simpleTLDs (no dot) and compoundTLDs (one dot).
 * Cached after first load.
 */
let _simpleTLDs: Set<string> | null = null;
let _compoundTLDs: Set<string> | null = null;

function loadPsl(): { simpleTLDs: Set<string>; compoundTLDs: Set<string> } {
  if (_simpleTLDs && _compoundTLDs) return { simpleTLDs: _simpleTLDs, compoundTLDs: _compoundTLDs };

  const pslPath = join(__dirname, '..', '..', 'scripts', 'public_suffix_list.dat');
  const simple: Set<string> = new Set();
  const compound: Set<string> = new Set();

  try {
    const lines = readFileSync(pslPath, 'utf-8').split('\n');
    for (const raw of lines) {
      const line = raw.trim().toLowerCase();
      if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('!')) continue;
      if (!line.includes('.')) simple.add(line);
      else if (line.split('.').length === 2) compound.add(line);
    }
    console.log(`[PSL] Loaded ${simple.size} simple TLDs, ${compound.size} compound TLDs`);
  } catch (e) {
    console.warn('[PSL] Could not read public_suffix_list.dat, using fallback:', e);
    for (const t of ['com', 'net', 'org', 'br', 'tk', 'app', 'io', 'xyz', 'site', 'online', 'info', 'biz', 'co', 'me']) simple.add(t);
    for (const t of ['com.br', 'org.br', 'net.br', 'co.uk', 'com.ar']) compound.add(t);
  }

  _simpleTLDs = simple;
  _compoundTLDs = compound;
  return { simpleTLDs: simple, compoundTLDs: compound };
}

/** Check if a string is a complete domain with a PSL-known TLD. */
function isValidDomain(domain: string, simpleTLDs: Set<string>, compoundTLDs: Set<string>): boolean {
  const d = domain.toLowerCase().trim();
  if (d.length < 4 || d.length > 253) return false;
  if (!/^[a-z0-9][a-z0-9.\-]*[a-z0-9]$/.test(d)) return false;
  if (!d.includes('.')) return false;

  const parts = d.split('.');
  // Check simple TLD (e.g. .com)
  if (simpleTLDs.has(parts[parts.length - 1])) return true;
  // Check compound TLD (e.g. .com.br)
  if (parts.length >= 3) {
    const compound = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (compoundTLDs.has(compound)) return true;
  }
  return false;
}

// Hardcoded exclusion patterns — official/gov/infra domains NOT to block
const EXCLUSION_PATTERNS: RegExp[] = [
  /\.gov\.br$/i,
  /\.mil\.br$/i,
  /\.leg\.br$/i,
  /\.jus\.br$/i,
  /\.gov$/i,
  /\.mil$/i,
  /^anatel\./i,
  /^mj\./i,
  /^pf\./i,
  /^tcu\./i,
  /^stf\./i,
  /^stj\./i,
  /^cade\./i,
];

/** Returns true if domain should be excluded. */
function isExcluded(domain: string): boolean {
  return EXCLUSION_PATTERNS.some(re => re.test(domain));
}

// Fixed regex patterns (deterministic, no AI needed)
const DOMAIN_BROAD_RE = /\b([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)\b/g;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const IPV6_RE = /\b(?:[0-9a-fA-F]{1,4}:){4,7}[0-9a-fA-F]{1,4}\b/g;
const CIDR_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\/(?:[12]?\d|3[0-2])\b/g;

function parseCidr(cidrString: string) {
  const parts = cidrString.split('/');
  return { ip: parts[0].trim(), prefix: parts[1]?.trim() || '32', cidr: cidrString.trim() };
}

/**
 * Phase 2: apply deterministic regex to extracted text,
 * validate against PSL, apply exclusions, and merge Tier 1 joined domains.
 */
function extractWithRegex(
  text: string,
  tier1Domains: string[],
): Pick<ExtractDomainsFromFileOutput, 'domains' | 'ipv4' | 'ipv6' | 'cidrs'> {
  const { simpleTLDs, compoundTLDs } = loadPsl();

  // ── Domains ──────────────────────────────────
  const rawDomainMatches = [...text.matchAll(DOMAIN_BROAD_RE)].map(m => m[0].toLowerCase());
  const regexDomains = rawDomainMatches
    .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
    .filter(d => !isExcluded(d));

  // Merge Tier 1 joined domains (already confirmed, not in broken text)
  const tier1Valid = tier1Domains
    .map(d => d.toLowerCase())
    .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
    .filter(d => !isExcluded(d));

  const domains = [...new Set([...regexDomains, ...tier1Valid])];

  // ── CIDRs (extract before IPv4 to avoid double-counting) ──
  const cidrMatches = [...text.matchAll(CIDR_RE)].map(m => m[0]);
  const cidrSet = new Set(cidrMatches);

  // ── IPv4 (skip IPs already part of a CIDR) ──
  const ipv4Matches = [...text.matchAll(IPV4_RE)]
    .map(m => m[0])
    .filter(ip => ![...cidrSet].some(cidr => cidr.startsWith(ip)));

  // ── IPv6 ──
  const ipv6Matches = [...text.matchAll(IPV6_RE)].map(m => m[0]);

  console.log('[Phase 2] Raw regex matches:', {
    domains: rawDomainMatches.length,
    tier1: tier1Valid.length,
    merged: domains.length,
    ipv4: ipv4Matches.length,
    ipv6: ipv6Matches.length,
    cidrs: cidrMatches.length,
  });

  return {
    domains,
    ipv4: [...new Set(ipv4Matches)],
    ipv6: [...new Set(ipv6Matches)],
    cidrs: [...new Set(cidrMatches)].map(parseCidr),
  };
}

// ─────────────────────────────────────────────
// Phase 3: Filtering + Tier 2 DNS Validation
// ─────────────────────────────────────────────

/**
 * Track A: Filter Phase 2 domains.
 * Removes:
 *  1. Broken fragments that are a raw piece (w1 or w2) of a Tier 1 candidate
 */
function applyFilters(
  domains: string[],
  tier1Candidates: Array<{ fragment: string; joined: string }>,
): string[] {
  // Build the set of raw fragment pieces from Tier 1 (w1 and w2 separately).
  // These are broken pieces that were caught by the heuristic but are NOT complete
  // domains on their own (e.g. "d.tk" is the w2 of "assistirfilmeseseriesonlinegh\nd.tk").
  const tier1Fragments = new Set(
    tier1Candidates.flatMap(c =>
      c.fragment.split('\n').map(s => s.trim().toLowerCase())
    )
  );

  const filtered = domains.filter(d => {
    // Exclude bare Tier 1 fragments
    if (tier1Fragments.has(d)) return false;
    return true;
  });

  console.log(`[Phase 3] Filter: ${domains.length} → ${filtered.length} domains (removed ${domains.length - filtered.length})`);
  if (domains.length !== filtered.length) {
    const removedSet = new Set(filtered);
    const removed = domains.filter(d => !removedSet.has(d));
    console.log('[Phase 3] Removed:', removed);
  }
  return filtered;
}

/**
 * Phase 3b: AI-validate Tier 2 broken domain candidates.
 * Extracts cropped JPEG images from the candidates ZIP, sends each to Gemini
 * with a yes/no prompt, and returns confirmed domain strings.
 */
async function validateTier2WithAI(
  candidates: Array<{ fragment: string; joined: string; page: number }>,
  zipBase64?: string | null,
): Promise<string[]> {
  // Guard: log the reason so the skip is never silent
  if (!candidates.length) {
    console.log('[Phase 3b] Skipping AI validation: no Tier 2 candidates.');
    return [];
  }
  if (!zipBase64) {
    console.log('[Phase 3b] Skipping AI validation: zip_base64 is missing/null from Python output.');
    return [];
  }

  // Extract Tier 2 images from ZIP (keyed by 0-based index)
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

  console.log(`[Phase 3b] AI validating ${candidates.length} Tier 2 candidates...`);
  const confirmed: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const imgBuffer = imagesByIndex.get(i);
    if (!imgBuffer) {
      console.log(`[Phase 3b] No image for candidate ${i} "${c.joined}" — skipping (images available at indices: [${[...imagesByIndex.keys()].join(', ')}])`);
      continue;
    }

    const imgBase64 = imgBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${imgBase64}`;
    const prompt = [
      'The image below is a cropped cell from a PDF table of domain names.',
      'A domain appears to be broken (word-wrapped) across two lines in this cell.',
      `The reconstructed domain is: "${c.joined}"`,
      '',
      'Does the image clearly show this domain split across two lines?',
      'Answer ONLY with "yes" or "no".',
    ].join('\n');

    try {
      console.log(`[Phase 3b] Calling Gemini for candidate ${i + 1}/${candidates.length} "${c.joined}"...`);
      const response = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        messages: [{
          role: 'user',
          content: [
            { media: { url: imageUrl, contentType: 'image/jpeg' } },
            { text: prompt },
          ],
        }],
        config: { maxOutputTokens: 10, temperature: 0 },
      });

      const answer = (response.text ?? '').trim().toLowerCase();
      console.log(`[Phase 3b] Candidate ${i + 1}/${candidates.length} "${c.joined}" → "${answer}"`);
      if (answer.startsWith('yes')) confirmed.push(c.joined.toLowerCase());
    } catch (e) {
      console.error(`[Phase 3b] AI call failed for "${c.joined}":`, e);
    }
  }

  console.log(`[Phase 3b] AI confirmed ${confirmed.length}/${candidates.length}:`, confirmed);
  return confirmed;
}

// ─────────────────────────────────────────────
// Genkit Flow
// ─────────────────────────────────────────────

const extractDomainsFromFileFlow = ai.defineFlow(
  {
    name: 'extractDomainsFromFileFlow',
    inputSchema: ExtractDomainsFromFileInputSchema,
    outputSchema: ExtractDomainsFromFileOutputSchema,
  },
  async (input: ExtractDomainsFromFileInput) => {
    console.time('⏱️ Total Processing Time');

    // ── Phase 1 + 1b: Python text extraction + broken domain detection ──
    console.time('⏱️ Phase 1: PDF Text Extraction');
    console.log('[Extract Domains Flow] Phase 1: extracting text (Python)...');
    const pythonResult = await extractTextFromPdf(input.fileDataUri);
    console.timeEnd('⏱️ Phase 1: PDF Text Extraction');
    console.log('[Extract Domains Flow] Extracted text length:', pythonResult.text.length);
    console.log('[Extract Domains Flow] Tier 1 candidates:', pythonResult.candidates.length);
    console.log('[Extract Domains Flow] Tier 2 candidates:', pythonResult.candidates_tier2?.length ?? 0);
    if (pythonResult.warnings?.length) {
      console.warn('[Extract Domains Flow] Python warnings:', pythonResult.warnings);
    }

    // ── Phase 2: Deterministic regex + PSL validation ──
    console.time('⏱️ Phase 2: Regex Extraction');
    console.log('[Extract Domains Flow] Phase 2: running regex + PSL validation...');
    const tier1Joined = pythonResult.candidates.map(c => c.joined);
    const phase2Result = extractWithRegex(pythonResult.text, tier1Joined);
    console.timeEnd('⏱️ Phase 2: Regex Extraction');
    console.log('[Extract Domains Flow] Phase 2 complete:', {
      domains: phase2Result.domains?.length ?? 0,
      ipv4: phase2Result.ipv4?.length ?? 0,
      ipv6: phase2Result.ipv6?.length ?? 0,
      cidrs: phase2Result.cidrs?.length ?? 0,
    });

    // ── Phase 3a: Filter Phase 2 domain results ──
    console.time('⏱️ Phase 3a: Filtering');
    const filteredDomains = applyFilters(phase2Result.domains ?? [], pythonResult.candidates);
    console.timeEnd('⏱️ Phase 3a: Filtering');

    // ── Phase 3b: AI validate Tier 2 candidates ──
    console.time('⏱️ Phase 3b: Tier 2 AI Validation');
    const tier2Candidates = pythonResult.candidates_tier2 ?? [];
    const tier2Confirmed = await validateTier2WithAI(tier2Candidates, pythonResult.zip_base64);
    // PSL-valid Tier 2 joined domains — AI-confirmed ones take priority in log
    const { simpleTLDs, compoundTLDs } = loadPsl();
    const tier2Joined = tier2Candidates
      .map(c => c.joined.toLowerCase())
      .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
      .filter(d => !isExcluded(d));
    console.timeEnd('⏱️ Phase 3b: Tier 2 AI Validation');
    console.log(`[Phase 3b] Tier 2: ${tier2Candidates.length} candidates, ${tier2Confirmed.length} AI-confirmed, ${tier2Joined.length} total included`);

    // Phase 3c: Remove Phase 2 domains that are superseded by a Tier 2 reconstruction.
    // For Cases A/B/C/D: the fragment's first line (t1) is the incomplete domain to remove.
    // For Case E (label-split): BOTH t1 and t2 lines are separate "complete-looking" domains
    //   that the regex captured individually (e.g. "megacine.so" and "ftonic.com.br"),
    //   both should be removed in favour of the joined form.
    const tier2SupersededFragments = new Set(
      tier2Candidates.flatMap(c =>
        c.fragment.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean)
      )
    );
    const filteredMinusSuperseded = filteredDomains.filter(d => !tier2SupersededFragments.has(d));
    if (filteredDomains.length !== filteredMinusSuperseded.length) {
      const removed = filteredDomains.filter(d => tier2SupersededFragments.has(d));
      console.log('[Phase 3c] Removed superseded incomplete domains:', removed);
    }

    // Merge and deduplicate: Phase 2 filtered + all Tier 2 joined
    const finalDomains = [...new Set([...filteredMinusSuperseded, ...tier2Joined])];
    console.log('[Phase 3] Final domains:', finalDomains.length);

    console.timeEnd('⏱️ Total Processing Time');

    return {
      ...phase2Result,
      domains: finalDomains,
      extractedText: pythonResult.text,
      candidatesZipBase64: pythonResult.zip_base64 ?? undefined,
    };
  }
);

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

export async function extractDomainsFromFile(
  input: ExtractDomainsFromFileInput,
): Promise<ExtractDomainsFromFileOutput> {
  return extractDomainsFromFileFlow(input);
}

// Exported directly so controller can bypass Genkit when needed (e.g. debug)
export { extractTextFromPdf };
