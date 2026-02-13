'use server';
/**
 * @fileOverview A flow to analyze CIDR blocks.
 *
 * - analyzeCidr - A function that handles the CIDR analysis process.
 * - AnalyzeCidrInput - The input type for the function.
 * - AnalyzeCidrOutput - The return type for the function.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';

// Input Schema
export const AnalyzeCidrInputSchema = z.object({
    cidr: z.string().describe('The CIDR string to analyze (e.g., "192.168.0.10/24").'),
});
export type AnalyzeCidrInput = z.infer<typeof AnalyzeCidrInputSchema>;

// Output Schema
export const AnalyzeCidrOutputSchema = z.object({
    ip: z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
    prefix: z.union([z.string(), z.number()]).transform(val => String(val)).describe('The prefix length (e.g., "/24").'),
    cidr: z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});
export type AnalyzeCidrOutput = z.infer<typeof AnalyzeCidrOutputSchema>;


// Genkit Prompt
const analyzeCidrPrompt = ai.definePrompt({
    name: 'analyzeCidrPrompt',
    input: { schema: AnalyzeCidrInputSchema },
    output: { schema: AnalyzeCidrOutputSchema },
    prompt: `Act as a network security specialist. Your task is to analyze Classless Inter-Domain Routing (CIDR) prefixes.

  Logic:
  - Identify the IP address and the Prefix from the input.
  - Do NOT calculate ranges.
  - Do NOT correct the IP address to the network address. Return it exactly as provided.
  
  Example:
  - Input: "192.168.0.10/24" -> Output IP: "192.168.0.10", Prefix: "/24", CIDR: "192.168.0.10/24"

  Input CIDR:
  {{cidr}}
  `,
});


// Genkit Flow
const analyzeCidrFlow = ai.defineFlow(
    {
        name: 'analyzeCidrFlow',
        inputSchema: AnalyzeCidrInputSchema,
        outputSchema: AnalyzeCidrOutputSchema,
    },
    async (input: AnalyzeCidrInput) => {
        const { output } = await analyzeCidrPrompt(input);
        return output!;
    }
);


// Exported wrapper function to be used by controllers
export async function analyzeCidr(input: AnalyzeCidrInput): Promise<AnalyzeCidrOutput> {
    return analyzeCidrFlow(input);
}
