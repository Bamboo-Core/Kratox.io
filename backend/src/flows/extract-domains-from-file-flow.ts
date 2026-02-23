//usando chunks
'use server';
/**
 * @fileOverview A flow to extract domain names from a file (e.g., PDF).
 *
 * - extractDomainsFromFile - A function that handles the domain extraction process from a file.
 * - ExtractDomainsFromFileInput - The input type for the function.
 * - ExtractDomainsFromFileOutput - The return type for the function.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { splitPdfIntoChunks } from '../utils/pdf-chunker.js';

// Input Schema
export const ExtractDomainsFromFileInputSchema = z.object({
  fileDataUri: z.string().refine(val => val.startsWith('data:'), {
    message: "File must be a data URI starting with 'data:'"
  }).describe("A file (like a PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractDomainsFromFileInput = z.infer<typeof ExtractDomainsFromFileInputSchema>;

// Output Schema
const CidrInfoSchema = z.object({
  ip: z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
  prefix: z.union([z.string(), z.number()]).transform(val => String(val)).describe('The prefix length (e.g., "/24").'),
  cidr: z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});

export const ExtractDomainsFromFileOutputSchema = z.object({
  domains: z.array(z.string()).nullable().describe('A list of domain names extracted from the file.').default([]),
  ipv4: z.array(z.string()).nullable().describe('A list of IPv4 addresses extracted from the file.').default([]),
  ipv6: z.array(z.string()).nullable().describe('A list of IPv6 addresses extracted from the file.').default([]),
  cidrs: z.array(CidrInfoSchema).nullable().describe('A list of CIDR blocks extracted and analyzed from the file.').default([]),
});
export type ExtractDomainsFromFileOutput = z.infer<typeof ExtractDomainsFromFileOutputSchema>;


// Genkit Prompt
const extractDomainsFromFilePrompt = ai.definePrompt({
  name: 'extractDomainsFromFilePrompt',
  input: { schema: ExtractDomainsFromFileInputSchema },
  output: { schema: ExtractDomainsFromFileOutputSchema },
  config: {
    maxOutputTokens: 65536, // Gemini 2.0 Flash supports up to 65k output tokens
  },
  prompt: `You are a network security analyst. Your task is to analyze the provided file and extract all fully qualified domain names (FQDNs), IPv4 addresses, IPv6 addresses, and CIDR blocks.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - Identify and analyze all CIDR blocks (e.g., 192.168.0.0/24).
    - Return the IP, Prefix and full CIDR string.
    - Do NOT expand the block.
    - Do NOT correct the IP address to the network address. Return it exactly as provided.
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. They might be part of log lines, config files, or tables. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - If an IP is found, purely output the IP address itself (e.g. "1.1.1.1") without port numbers or protocol prefixes.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', 'ipv6', and 'cidrs'.
  
  CRITICAL EXCLUSION RULES:
  - DO NOT include government domains (ending in .gov, .gov.br).
  - DO NOT include official institution domains like "anatel.gov.br", "gov.br".
  - The goal is to identify THREATS and BLOCKLIST items. legitimate government and infrastructure domains MUST NOT be included in the output.
  - Pay close attention to the context. Many documents mention the authorities (Anatel, gov.br). These are NOT threats. Do not extract them.
  
  File to analyze:
  {{media url=fileDataUri}}
  `,
});

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
const extractDomainsFromFileFlow = ai.defineFlow(
  {
    name: 'extractDomainsFromFileFlow',
    inputSchema: ExtractDomainsFromFileInputSchema,
    outputSchema: ExtractDomainsFromFileOutputSchema,
  },
  async (input: ExtractDomainsFromFileInput) => {
    // Step 1: Split PDF into chunks if needed
    console.time("⏱️ AI Processing Time");
    const chunks = await splitPdfIntoChunks(input.fileDataUri);
    console.log(`[Extract Domains Flow] Processing ${chunks.length} chunk(s)...`);

    // Step 2: Process all chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map(async (chunkDataUri, index) => {
        console.log(`[Extract Domains Flow] Processing chunk ${index + 1}/${chunks.length}...`);
        const { output, usage } = await extractDomainsFromFilePrompt({ fileDataUri: chunkDataUri });

        if (!output) {
          console.warn(`[Extract Domains Flow] Warning: No output from chunk ${index + 1}`);
          return {
            domains: [],
            ipv4: [],
            ipv6: [],
            cidrs: [],
          };
        }

        console.log(`[Extract Domains Flow] Chunk ${index + 1}/${chunks.length} completed:`, {
          domains: output.domains?.length || 0,
          ipv4: output.ipv4?.length || 0,
          ipv6: output.ipv6?.length || 0,
          cidrs: output.cidrs?.length || 0,
        });


        console.log("Token Usage:", JSON.stringify(usage, null, 2));

        return {
          domains: output.domains || [],
          ipv4: output.ipv4 || [],
          ipv6: output.ipv6 || [],
          cidrs: output.cidrs || [],
        };
      })
    );

    // Step 3: Merge and deduplicate results
    const allDomains = new Set<string>();
    const allIpv4 = new Set<string>();
    const allIpv6 = new Set<string>();
    const allCidrs = new Map<string, typeof CidrInfoSchema._type>();

    chunkResults.forEach((result) => {
      result.domains.forEach(d => allDomains.add(d));
      result.ipv4.forEach(ip => allIpv4.add(ip));
      result.ipv6.forEach(ip => allIpv6.add(ip));
      result.cidrs.forEach(cidr => {
        // Use full CIDR string as key to deduplicate
        allCidrs.set(cidr.cidr, cidr);
      });
    });

    const finalResult = {
      domains: Array.from(allDomains),
      ipv4: Array.from(allIpv4),
      ipv6: Array.from(allIpv6),
      cidrs: Array.from(allCidrs.values()),
    };
    console.timeEnd("⏱️ AI Processing Time");
    console.log(finalResult);
    return finalResult;
  }
);

// Exported wrapper function to be used by controllers
export async function extractDomainsFromFile(input: ExtractDomainsFromFileInput): Promise<ExtractDomainsFromFileOutput> {
  return extractDomainsFromFileFlow(input);
}
