
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
  prefix: z.string().describe('The prefix length (e.g., "/24").'),
  mask: z.string().describe('The subnet mask (e.g., "255.255.255.0").'),
  total_ips: z.number().describe('The total number of IP addresses in the block.'),
  range_start: z.string().describe('The starting IP address of the range.'),
  range_end: z.string().describe('The ending IP address of the range.'),
  first_usable: z.string().optional().describe('The first usable IP address.'),
  last_usable: z.string().optional().describe('The last usable IP address.'),
  correction_message: z.string().optional().describe('A message explaining any corrections made to the input IP.'),
});

export const ExtractDomainsOutputSchema = z.object({
  domains: z.array(z.string()).describe('A list of domain names extracted from the text.'),
  ipv4: z.array(z.string()).describe('A list of IPv4 addresses extracted from the text.'),
  ipv6: z.array(z.string()).describe('A list of IPv6 addresses extracted from the text.'),
  cidrs: z.array(CidrInfoSchema).describe('A list of CIDR blocks extracted and analyzed from the text.'),
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
    - For each CIDR, calculate: mask, total_ips, range_start, range_end, first_usable, and last_usable.
    - Validate the network address. If "192.168.0.10/24" is found, correct it to "192.168.0.0/24" and set a 'correction_message'.
    - For detected CIDR blocks that contain 256 IPs or fewer (e.g. /24 or smaller), EXPAND the block and list EVERY single IP address in the 'ipv4' or 'ipv6' arrays. Do not expand larger blocks (like /16 or /8) to avoid excessive output.
  - Identify IP ranges described in text (e.g., 'from 192.168.0.10 to 192.168.0.30', '10.0.0.1-10.0.0.5'). For these ranges, EXPAND them and list EVERY single IP address within that range in the 'ipv4' or 'ipv6' arrays.
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - Returns IPs purely as the address (e.g. "1.1.1.1") without ports.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', 'ipv6', and 'cidrs'.

  Text to analyze:
  {{{text}}}
  `,
});



// Helper functions for IP manipulation
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

    const { ipv4 = [], cidrs = [] } = output;
    const existingIps = new Set(ipv4);

    // Manual expansion of CIDRs to ensure consistency
    cidrs.forEach(cidr => {
      // Only expand small blocks to avoid performance issues
      if (cidr.total_ips <= 256 && cidr.range_start && cidr.range_end) {
        try {
          const start = ipToLong(cidr.range_start);
          const end = ipToLong(cidr.range_end);

          // Safety check to prevent massive loops if LLM hallucinated range
          if (end - start >= 0 && end - start < 256) {
            for (let i = start; i <= end; i++) {
              const ip = longToIp(i);
              if (!existingIps.has(ip)) {
                ipv4.push(ip);
                existingIps.add(ip);
              }
            }
          }
        } catch (e) {
          console.error("Error expanding CIDR:", cidr, e);
        }
      }
    });

    // Sort IPs for better UX? Optional but nice.
    output.ipv4 = Array.from(existingIps).sort((a, b) => ipToLong(a) - ipToLong(b));

    return output;
  }
);


// Exported wrapper function to be used by controllers
export async function extractDomainsFromText(input: ExtractDomainsInput): Promise<ExtractDomainsOutput> {
  return extractDomainsFlow(input);
}

