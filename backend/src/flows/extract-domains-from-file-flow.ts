
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

// Input Schema
export const ExtractDomainsFromFileInputSchema = z.object({
  fileDataUri: z.string().refine(val => val.startsWith('data:'), {
    message: "File must be a data URI starting with 'data:'"
  }).describe("A file (like a PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractDomainsFromFileInput = z.infer<typeof ExtractDomainsFromFileInputSchema>;

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

export const ExtractDomainsFromFileOutputSchema = z.object({
  domains: z.array(z.string()).describe('A list of domain names extracted from the file.'),
  ipv4: z.array(z.string()).describe('A list of IPv4 addresses extracted from the file.'),
  ipv6: z.array(z.string()).describe('A list of IPv6 addresses extracted from the file.'),
  cidrs: z.array(CidrInfoSchema).describe('A list of CIDR blocks extracted and analyzed from the file.'),
});
export type ExtractDomainsFromFileOutput = z.infer<typeof ExtractDomainsFromFileOutputSchema>;


// Genkit Prompt
const extractDomainsFromFilePrompt = ai.definePrompt({
  name: 'extractDomainsFromFilePrompt',
  input: { schema: ExtractDomainsFromFileInputSchema },
  output: { schema: ExtractDomainsFromFileOutputSchema },
  prompt: `You are a network security analyst. Your task is to analyze the provided file and extract all fully qualified domain names (FQDNs), IPv4 addresses, IPv6 addresses, and CIDR blocks.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - Identify and analyze all CIDR blocks (e.g., 192.168.0.0/24).
    - For each CIDR, calculate: mask, total_ips, range_start, range_end, first_usable, and last_usable.
    - Validate the network address. If "192.168.0.10/24" is found, correct it to "192.168.0.0/24" and set a 'correction_message'.
    - For detected CIDR blocks that contain 256 IPs or fewer (e.g. /24 or smaller), EXPAND the block and list EVERY single IP address in the 'ipv4' or 'ipv6' arrays. Do not expand larger blocks (like /16 or /8) to avoid excessive output.
  - Identify IP ranges described in text (e.g., 'from 192.168.0.10 to 192.168.0.30', '10.0.0.1-10.0.0.5'). For these ranges, EXPAND them and list EVERY single IP address within that range in the 'ipv4' or 'ipv6' arrays.
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. They might be part of log lines, config files, or tables. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - If an IP is found, purely output the IP address itself (e.g. "1.1.1.1") without port numbers or protocol prefixes.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', 'ipv6', and 'cidrs'.
  
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
    const { output } = await extractDomainsFromFilePrompt(input);

    if (!output) {
      throw new Error("Failed to extract domains from file");
    }

    const { ipv4 = [], cidrs = [] } = output;
    const existingIps = new Set(ipv4);

    cidrs.forEach(cidr => {
      if (cidr.total_ips <= 256 && cidr.range_start && cidr.range_end) {
        try {
          const start = ipToLong(cidr.range_start);
          const end = ipToLong(cidr.range_end);

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

    output.ipv4 = Array.from(existingIps).sort((a, b) => ipToLong(a) - ipToLong(b));

    return output;
  }
);


// Exported wrapper function to be used by controllers
export async function extractDomainsFromFile(input: ExtractDomainsFromFileInput): Promise<ExtractDomainsFromFileOutput> {
  return extractDomainsFromFileFlow(input);
}

