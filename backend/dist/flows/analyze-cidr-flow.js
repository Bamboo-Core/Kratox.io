'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeCidrOutputSchema = exports.AnalyzeCidrInputSchema = void 0;
exports.analyzeCidr = analyzeCidr;
/**
 * @fileOverview A flow to analyze CIDR blocks.
 *
 * - analyzeCidr - A function that handles the CIDR analysis process.
 * - AnalyzeCidrInput - The input type for the function.
 * - AnalyzeCidrOutput - The return type for the function.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
// Input Schema
exports.AnalyzeCidrInputSchema = zod_1.z.object({
    cidr: zod_1.z.string().describe('The CIDR string to analyze (e.g., "192.168.0.10/24").'),
});
// Output Schema
exports.AnalyzeCidrOutputSchema = zod_1.z.object({
    ip: zod_1.z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
    prefix: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => String(val)).describe('The prefix length (e.g., "/24").'),
    cidr: zod_1.z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});
// Genkit Prompt
const analyzeCidrPrompt = genkit_js_1.ai.definePrompt({
    name: 'analyzeCidrPrompt',
    input: { schema: exports.AnalyzeCidrInputSchema },
    output: { schema: exports.AnalyzeCidrOutputSchema },
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
const analyzeCidrFlow = genkit_js_1.ai.defineFlow({
    name: 'analyzeCidrFlow',
    inputSchema: exports.AnalyzeCidrInputSchema,
    outputSchema: exports.AnalyzeCidrOutputSchema,
}, async (input) => {
    const { output } = await analyzeCidrPrompt(input);
    return output;
});
// Exported wrapper function to be used by controllers
async function analyzeCidr(input) {
    return analyzeCidrFlow(input);
}
