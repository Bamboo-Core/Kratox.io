
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
});
export type ExtractDomainsOutput = z.infer<typeof ExtractDomainsOutputSchema>;


// Genkit Prompt
const extractDomainsPrompt = ai.definePrompt({
  name: 'extractDomainsPrompt',
  input: { schema: ExtractDomainsInputSchema },
  output: { schema: ExtractDomainsOutputSchema },
  prompt: `You are a network security analyst. Your task is to read the provided text and extract all fully qualified domain names (FQDNs).
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Do NOT include IP addresses, URLs with paths (like example.com/page), or email addresses.
  - Return only the domain names in the 'domains' array. If no domains are found, return an empty array.

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
