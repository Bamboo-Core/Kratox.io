
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
});
export type ExtractDomainsFromFileOutput = z.infer<typeof ExtractDomainsFromFileOutputSchema>;


// Genkit Prompt
const extractDomainsFromFilePrompt = ai.definePrompt({
  name: 'extractDomainsFromFilePrompt',
  input: { schema: ExtractDomainsFromFileInputSchema },
  output: { schema: ExtractDomainsFromFileOutputSchema },
  prompt: `You are a network security analyst. Your task is to analyze the provided file and extract all fully qualified domain names (FQDNs).
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Do NOT include IP addresses, URLs with paths (like example.com/page), or email addresses.
  - Return only the domain names in the 'domains' array. If no domains are found, return an empty array.

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
