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
    prefix: z.string().describe('The prefix length (e.g., "/24").'),
    mask: z.string().describe('The subnet mask (e.g., "255.255.255.0").'),
    total_ips: z.number().describe('The total number of IP addresses in the block.'),
    range_start: z.string().describe('The starting IP address of the range.'),
    range_end: z.string().describe('The ending IP address of the range.'),
    first_usable: z.string().optional().describe('The first usable IP address.'),
    last_usable: z.string().optional().describe('The last usable IP address.'),
    correction_message: z.string().optional().describe('A message explaining any corrections made to the input IP (e.g. if the user provided a host IP instead of network address).'),
});
export type AnalyzeCidrOutput = z.infer<typeof AnalyzeCidrOutputSchema>;


// Genkit Prompt
const analyzeCidrPrompt = ai.definePrompt({
    name: 'analyzeCidrPrompt',
    input: { schema: AnalyzeCidrInputSchema },
    output: { schema: AnalyzeCidrOutputSchema },
    prompt: `Act as a network security specialist. Your task is to analyze Classless Inter-Domain Routing (CIDR) prefixes to identify and block IP ranges.
  
  Logic:
  - Given an IP and prefix (e.g., 192.168.0.10/24), calculate the Network Address (start) and Broadcast Address (end).
  - Convert the prefix to a decimal subnet mask (e.g., /24 = 255.255.255.0).
  - Calculate total IPs: 2^(32 - prefix).
  - Identify the first and last IP of the range.
  
  Validation Rule:
  - Always validate if the provided base IP is the correct Network Address. 
  - If the user provides "192.168.0.10/24", you must CORRECT it to "192.168.0.0/24".
  - Return a 'correction_message' if you had to fix the IP (e.g., "Input IP 192.168.0.10 was corrected to network address 192.168.0.0").

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
