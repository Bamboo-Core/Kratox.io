
'use server';
/**
 * @fileOverview A flow to extract domain names from a block of text.
 *
 * - extractDomainsFromText - A function that handles the domain extraction process.
 * - ExtractDomainsInput - The input type for the function.
 * - ExtractDomainsOutput - The return type for the function.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';

// Input Schema
export const ExtractDomainsInputSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty.').describe('The block of text or document to analyze for domain names.'),
});
export type ExtractDomainsInput = z.infer<typeof ExtractDomainsInputSchema>;

// Output Schema
const CidrInfoSchema = z.object({
  ip: z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
  prefix: z.union([z.string(), z.number()]).transform(val => String(val)).describe('The prefix length (e.g., "/24").'),
  cidr: z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});

export const ExtractDomainsOutputSchema = z.object({
  domains: z.array(z.string()).nullable().describe('A list of domain names extracted from the text.').default([]),
  ipv4: z.array(z.string()).nullable().describe('A list of IPv4 addresses extracted from the text.').default([]),
  ipv6: z.array(z.string()).nullable().describe('A list of IPv6 addresses extracted from the text.').default([]),
  cidrs: z.array(CidrInfoSchema).nullable().describe('A list of CIDR blocks extracted and analyzed from the text.').default([]),
});
export type ExtractDomainsOutput = z.infer<typeof ExtractDomainsOutputSchema>;


// Genkit Prompt
const extractDomainsPrompt = ai.definePrompt({
  name: 'extractDomainsPrompt',
  input: { schema: ExtractDomainsInputSchema },
  output: { schema: ExtractDomainsOutputSchema },
  prompt: `You are a network security analyst. Your task is to read the provided text and extract all fully qualified domain names (FQDNs), IPv4 addresses, IPv6 addresses, and CIDR blocks.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - Identify and analyze all CIDR blocks (e.g., 192.168.0.0/24).
    - Return the IP, Prefix and full CIDR string.
    - Do NOT expand the block.
    - Do NOT correct the IP address to the network address. Return it exactly as provided.
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - Returns IPs purely as the address (e.g. "1.1.1.1") without ports.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', 'ipv6', and 'cidrs'.
  
  CRITICAL EXCLUSION RULES:
  - DO NOT include government domains (ending in .gov, .gov.br).
  - DO NOT include official institution domains like "anatel.gov.br", "gov.br", "receita.fazenda.gov.br".
  - The goal is to identify THREATS and BLOCKLIST items. legitimate government and infrastructure domains MUST NOT be included in the output.
  - Pay close attention to the context. If a domain is mentioned as the "source" of a blocklist (e.g. "List from Anatel"), IT IS NOT A THREAT. Do not extract it.

  Text to analyze:
  {{{text}}}
  `,
});



// Helper functions for IP manipulation (kept for potential future needs, but unused in simplified flow)
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

// Genkit Flow
const extractDomainsFlow = ai.defineFlow(
  {
    name: 'extractDomainsFlow',
    inputSchema: ExtractDomainsInputSchema,
    outputSchema: ExtractDomainsOutputSchema,
  },
  async (input: ExtractDomainsInput) => {
    const { output } = await extractDomainsPrompt(input);

    if (!output) {
      throw new Error("Failed to extract domains");
    }


    return {
      domains: output.domains || [],
      ipv4: output.ipv4 || [],
      ipv6: output.ipv6 || [],
      cidrs: output.cidrs || [],
    };
  }
);


// Exported wrapper function to be used by controllers
export async function extractDomainsFromText(input: ExtractDomainsInput): Promise<ExtractDomainsOutput> {
  return extractDomainsFlow(input);
}

