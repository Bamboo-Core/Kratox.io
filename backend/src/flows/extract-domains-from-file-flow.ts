
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

// Output Schema - same as the text extraction flow
export const ExtractDomainsFromFileOutputSchema = z.object({
  domains: z.array(z.string()).describe('A list of domain names extracted from the file.'),
  ipv4: z.array(z.string()).describe('A list of IPv4 addresses extracted from the file.'),
  ipv6: z.array(z.string()).describe('A list of IPv6 addresses extracted from the file.'),
});
export type ExtractDomainsFromFileOutput = z.infer<typeof ExtractDomainsFromFileOutputSchema>;


// Genkit Prompt
const extractDomainsFromFilePrompt = ai.definePrompt({
  name: 'extractDomainsFromFilePrompt',
  input: { schema: ExtractDomainsFromFileInputSchema },
  output: { schema: ExtractDomainsFromFileOutputSchema },
  prompt: `You are a network security analyst. Your task is to analyze the provided file and extract all fully qualified domain names (FQDNs), IPv4 addresses, and IPv6 addresses.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. They might be part of log lines, config files, or tables. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - If an IP is found, purely output the IP address itself (e.g. "1.1.1.1") without port numbers or protocol prefixes.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', and 'ipv6'.
  
  File to analyze:
  {{media url=fileDataUri}}
  `,
});


// Genkit Flow
const extractDomainsFromFileFlow = ai.defineFlow(
  {
    name: 'extractDomainsFromFileFlow',
    inputSchema: ExtractDomainsFromFileInputSchema,
    outputSchema: ExtractDomainsFromFileOutputSchema,
  },
  async (input: ExtractDomainsFromFileInput) => {
    const { output } = await extractDomainsFromFilePrompt(input);
    return output!;
  }
);


// Exported wrapper function to be used by controllers
export async function extractDomainsFromFile(input: ExtractDomainsFromFileInput): Promise<ExtractDomainsFromFileOutput> {
  return extractDomainsFromFileFlow(input);
}
