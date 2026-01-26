
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
export const ExtractDomainsOutputSchema = z.object({
  domains: z.array(z.string()).describe('A list of domain names extracted from the text.'),
  ipv4: z.array(z.string()).describe('A list of IPv4 addresses extracted from the text.'),
  ipv6: z.array(z.string()).describe('A list of IPv6 addresses extracted from the text.'),
});
export type ExtractDomainsOutput = z.infer<typeof ExtractDomainsOutputSchema>;


// Genkit Prompt
const extractDomainsPrompt = ai.definePrompt({
  name: 'extractDomainsPrompt',
  input: { schema: ExtractDomainsInputSchema },
  output: { schema: ExtractDomainsOutputSchema },
  prompt: `You are a network security analyst. Your task is to read the provided text and extract all fully qualified domain names (FQDNs), IPv4 addresses, and IPv6 addresses.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - Returns IPs purely as the address (e.g. "1.1.1.1") without ports.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', and 'ipv6'.

  Text to analyze:
  {{{text}}}
  `,
});


// Genkit Flow
const extractDomainsFlow = ai.defineFlow(
  {
    name: 'extractDomainsFlow',
    inputSchema: ExtractDomainsInputSchema,
    outputSchema: ExtractDomainsOutputSchema,
  },
  async (input: ExtractDomainsInput) => {
    const { output } = await extractDomainsPrompt(input);
    return output!;
  }
);


// Exported wrapper function to be used by controllers
export async function extractDomainsFromText(input: ExtractDomainsInput): Promise<ExtractDomainsOutput> {
  return extractDomainsFlow(input);
}
