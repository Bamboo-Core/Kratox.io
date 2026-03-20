'use server';
/**
 * @fileOverview Shared domain/IP/CIDR detection from text.
 *
 * Phase 2:  Deterministic regex + PSL validation
 * Phase 3a: Filter Tier 1 fragment pieces
 * Phase 3c: Remove superseded fragments, merge Tier 2 confirmed domains
 *
 * Used by:
 *  - extract-domains-from-file-flow (text PDFs)
 *  - extract-domains-flow (direct text input from frontend)
 */

import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

export const CidrInfoSchema = z.object({
  ip: z.string().describe('IP part of the CIDR'),
  prefix: z.union([z.string(), z.number()]).transform(String).describe('Prefix length'),
  cidr: z.string().describe('Full CIDR string'),
});
export type CidrInfo = z.infer<typeof CidrInfoSchema>;

export const DetectDomainsInputSchema = z.object({
  text: z.string().describe('Text to scan for domains, IPs, and CIDRs.'),
  tier1Candidates: z
    .array(z.object({ fragment: z.string(), joined: z.string() }))
    .optional()
    .default([])
    .describe('Tier 1 broken-domain candidates — fragment pieces to filter out of Phase 2 results.'),
  tier2Candidates: z
    .array(z.object({ fragment: z.string(), joined: z.string(), page: z.number() }))
    .optional()
    .default([])
    .describe('Tier 2 broken-domain candidates — fragments superseded by AI-confirmed reconstructions.'),
  tier2Confirmed: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Tier 2 domains confirmed by AI (actual domain strings to include in final results).'),
});
export type DetectDomainsInput = z.input<typeof DetectDomainsInputSchema>;

export const DetectDomainsOutputSchema = z.object({
  domains: z.array(z.string()).default([]),
  ipv4: z.array(z.string()).default([]),
  ipv6: z.array(z.string()).default([]),
  cidrs: z.array(CidrInfoSchema).default([]),
});
export type DetectDomainsOutput = z.infer<typeof DetectDomainsOutputSchema>;

// ─────────────────────────────────────────────
// PSL Loading
// ─────────────────────────────────────────────

let _simpleTLDs: Set<string> | null = null;
let _compoundTLDs: Set<string> | null = null;

export function loadPsl(): { simpleTLDs: Set<string>; compoundTLDs: Set<string> } {
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
    for (const t of ['com', 'net', 'org', 'br', 'tk', 'app', 'io', 'xyz', 'site', 'online', 'info', 'biz', 'co', 'me'])
      simple.add(t);
    for (const t of ['com.br', 'org.br', 'net.br', 'co.uk', 'com.ar']) compound.add(t);
  }

  _simpleTLDs = simple;
  _compoundTLDs = compound;
  return { simpleTLDs: simple, compoundTLDs: compound };
}

export function isValidDomain(domain: string, simpleTLDs: Set<string>, compoundTLDs: Set<string>): boolean {
  const d = domain.toLowerCase().trim();
  if (d.length < 4 || d.length > 253) return false;
  if (!/^[a-z0-9][a-z0-9.\-]*[a-z0-9]$/.test(d)) return false;
  if (!d.includes('.')) return false;

  const parts = d.split('.');
  if (simpleTLDs.has(parts[parts.length - 1])) return true;
  if (parts.length >= 3) {
    const compound = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (compoundTLDs.has(compound)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// Exclusion Patterns
// ─────────────────────────────────────────────

const EXCLUSION_PATTERNS: RegExp[] = [
  // ── Brazilian institutional TLDs (restricted registry, never piracy targets) ──
  /\.gov\.br$/i,   // Federal/state/municipal government
  /\.mil\.br$/i,   // Armed forces
  /\.jus\.br$/i,   // Judiciary (STF, STJ, TJs, TRFs, TRTs…)
  /\.leg\.br$/i,   // Legislature (Câmara, Senado, Assembleias…)
  /\.mp\.br$/i,    // Ministério Público
  /\.def\.br$/i,   // Public defenders (Defensorias Públicas)
  /\.tc\.br$/i,    // Courts of Audit (Tribunais de Contas)
  /\.b\.br$/i,     // Banks authorised by Banco Central
  /\.aju\.br$/i,   // State/municipal legal advisory offices
  // ── Brazilian regulated profession TLDs ──
  /\.adv\.br$/i,   // Lawyers (OAB)
  /\.med\.br$/i,   // Doctors (CFM)
  /\.eng\.br$/i,   // Engineers (CREA)
  /\.arq\.br$/i,   // Architects (CAU)
  // ── Generic institutional TLDs ──
  /\.gov$/i,
  /\.mil$/i,
  // ── Well-known Brazilian authority prefixes ──
  /^anatel\./i,
  /^mj\./i,
  /^pf\./i,
  /^tcu\./i,
  /^stf\./i,
  /^stj\./i,
  /^cade\./i,
];

export function isExcluded(domain: string): boolean {
  return EXCLUSION_PATTERNS.some(re => re.test(domain));
}

// ─────────────────────────────────────────────
// Regex Patterns
// ─────────────────────────────────────────────

const DOMAIN_BROAD_RE =
  /\b([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)\b/g;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const IPV6_RE = /\b(?:[0-9a-fA-F]{1,4}:){4,7}[0-9a-fA-F]{1,4}\b/g;
const CIDR_RE =
  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\/(?:[12]?\d|3[0-2])\b/g;

// Matches email domains, tolerating whitespace/newlines between @ and domain (common in PDF extraction)
const EMAIL_DOMAIN_RE =
  /[a-zA-Z0-9._%+\-]+@\s*([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)/g;

/** Extract all domains that appear as part of email addresses in the text. */
export function extractEmailDomains(text: string): Set<string> {
  return new Set(
    [...text.matchAll(EMAIL_DOMAIN_RE)].map(m => m[1].toLowerCase()),
  );
}

function parseCidr(cidrString: string): CidrInfo {
  const parts = cidrString.split('/');
  return { ip: parts[0].trim(), prefix: parts[1]?.trim() || '32', cidr: cidrString.trim() };
}

// ─────────────────────────────────────────────
// Phase 2: Regex + PSL Extraction
// ─────────────────────────────────────────────

function extractWithRegex(
  text: string,
  tier1Joined: string[],
  simpleTLDs: Set<string>,
  compoundTLDs: Set<string>,
): DetectDomainsOutput {
  // Collect domains that are part of email addresses so we can exclude them
  const emailDomains = new Set(
    [...text.matchAll(EMAIL_DOMAIN_RE)].map(m => m[1].toLowerCase()),
  );
  if (emailDomains.size > 0) {
    console.log('[Phase 2] Email domains excluded:', [...emailDomains]);
  }

  const rawDomainMatches = [...text.matchAll(DOMAIN_BROAD_RE)].map(m => m[0].toLowerCase());
  const regexDomains = rawDomainMatches
    .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
    .filter(d => !isExcluded(d))
    .filter(d => !emailDomains.has(d));

  const tier1Valid = tier1Joined
    .map(d => d.toLowerCase())
    .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
    .filter(d => !isExcluded(d));

  const domains = [...new Set([...regexDomains, ...tier1Valid])];

  const cidrMatches = [...text.matchAll(CIDR_RE)].map(m => m[0]);
  const cidrSet = new Set(cidrMatches);

  const ipv4Matches = [...text.matchAll(IPV4_RE)]
    .map(m => m[0])
    .filter(ip => ![...cidrSet].some(cidr => cidr.startsWith(ip)));

  const ipv6Matches = [...text.matchAll(IPV6_RE)].map(m => m[0]);

  console.log('[Phase 2] Matches:', {
    rawDomains: rawDomainMatches.length,
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
// Phase 3a: Filter Tier 1 Fragment Pieces
// ─────────────────────────────────────────────

function applyFilters(
  domains: string[],
  tier1Candidates: Array<{ fragment: string; joined: string }>,
): string[] {
  const tier1Fragments = new Set(
    tier1Candidates.flatMap(c => c.fragment.split('\n').map(s => s.trim().toLowerCase())),
  );

  const filtered = domains.filter(d => !tier1Fragments.has(d));
  console.log(`[Phase 3a] ${domains.length} → ${filtered.length} domains`);
  if (filtered.length < domains.length) {
    const removedSet = new Set(filtered);
    console.log('[Phase 3a] Removed:', domains.filter(d => !removedSet.has(d)));
  }
  return filtered;
}

// ─────────────────────────────────────────────
// Exported Detection Function
// ─────────────────────────────────────────────

export function detectDomainsInText(input: DetectDomainsInput): DetectDomainsOutput {
  const { text, tier1Candidates = [], tier2Candidates = [], tier2Confirmed = [] } = input;
  const { simpleTLDs, compoundTLDs } = loadPsl();

  // Phase 2: regex + PSL
  const tier1Joined = tier1Candidates.map(c => c.joined);
  const phase2Result = extractWithRegex(text, tier1Joined, simpleTLDs, compoundTLDs);

  // Phase 3a: remove bare Tier 1 fragment pieces from Phase 2 results
  const filteredDomains = applyFilters(phase2Result.domains ?? [], tier1Candidates);

  // Phase 3c: remove domains superseded by Tier 2 reconstructions, merge AI-confirmed ones
  const tier2ConfirmedValid = tier2Confirmed
    .map(d => d.toLowerCase())
    .filter(d => isValidDomain(d, simpleTLDs, compoundTLDs))
    .filter(d => !isExcluded(d));

  const tier2SupersededFragments = new Set(
    tier2Candidates.flatMap(c =>
      c.fragment
        .split('\n')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const filteredMinusSuperseded = filteredDomains.filter(d => !tier2SupersededFragments.has(d));
  if (filteredDomains.length !== filteredMinusSuperseded.length) {
    const removed = filteredDomains.filter(d => tier2SupersededFragments.has(d));
    console.log('[Phase 3c] Removed superseded fragments:', removed);
  }

  const finalDomains = [...new Set([...filteredMinusSuperseded, ...tier2ConfirmedValid])];
  console.log('[Detection] Final:', {
    domains: finalDomains.length,
    ipv4: phase2Result.ipv4?.length ?? 0,
    ipv6: phase2Result.ipv6?.length ?? 0,
    cidrs: phase2Result.cidrs?.length ?? 0,
  });

  return {
    ...phase2Result,
    domains: finalDomains,
  };
}
