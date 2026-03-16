'use server';
/**
 * @fileOverview Flow to extract domains, IPs, and CIDRs from a block of text.
 * Uses deterministic regex + PSL validation via detectDomainsInText.
 */

import { z } from 'zod';
import { detectDomainsInText } from './detect-domains-in-text-flow.js';

// Input Schema
export const ExtractDomainsInputSchema = z.object({
  text: z
    .string()
    .min(1, 'Text cannot be empty.')
    .describe('The block of text to analyze for domain names.'),
});
export type ExtractDomainsInput = z.infer<typeof ExtractDomainsInputSchema>;

// Output Schema
const CidrInfoSchema = z.object({
  ip: z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
  prefix: z
    .union([z.string(), z.number()])
    .transform(val => String(val))
    .describe('The prefix length (e.g., "/24").'),
  cidr: z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});

export const ExtractDomainsOutputSchema = z.object({
  domains: z.array(z.string()).nullable().describe('A list of domain names extracted from the text.').default([]),
  ipv4: z.array(z.string()).nullable().describe('A list of IPv4 addresses extracted from the text.').default([]),
  ipv6: z.array(z.string()).nullable().describe('A list of IPv6 addresses extracted from the text.').default([]),
  cidrs: z
    .array(CidrInfoSchema)
    .nullable()
    .describe('A list of CIDR blocks extracted and analyzed from the text.')
    .default([]),
});
export type ExtractDomainsOutput = z.infer<typeof ExtractDomainsOutputSchema>;

export async function extractDomainsFromText(input: ExtractDomainsInput): Promise<ExtractDomainsOutput> {
  return detectDomainsInText({ text: input.text });
}
