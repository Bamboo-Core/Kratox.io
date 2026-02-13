'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractDomainsOutputSchema = exports.ExtractDomainsInputSchema = void 0;
exports.extractDomainsFromText = extractDomainsFromText;
/**
 * @fileOverview A flow to extract domain names from a block of text.
 *
 * - extractDomainsFromText - A function that handles the domain extraction process.
 * - ExtractDomainsInput - The input type for the function.
 * - ExtractDomainsOutput - The return type for the function.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
// Input Schema
exports.ExtractDomainsInputSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, 'Text cannot be empty.').describe('The block of text or document to analyze for domain names.'),
});
// Output Schema
const CidrInfoSchema = zod_1.z.object({
    ip: zod_1.z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
    prefix: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => String(val)).describe('The prefix length (e.g., "/24").'),
    cidr: zod_1.z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});
exports.ExtractDomainsOutputSchema = zod_1.z.object({
    domains: zod_1.z.array(zod_1.z.string()).nullable().describe('A list of domain names extracted from the text.').default([]),
    ipv4: zod_1.z.array(zod_1.z.string()).nullable().describe('A list of IPv4 addresses extracted from the text.').default([]),
    ipv6: zod_1.z.array(zod_1.z.string()).nullable().describe('A list of IPv6 addresses extracted from the text.').default([]),
    cidrs: zod_1.z.array(CidrInfoSchema).nullable().describe('A list of CIDR blocks extracted and analyzed from the text.').default([]),
});
// Genkit Prompt
const extractDomainsPrompt = genkit_js_1.ai.definePrompt({
    name: 'extractDomainsPrompt',
    input: { schema: exports.ExtractDomainsInputSchema },
    output: { schema: exports.ExtractDomainsOutputSchema },
    prompt: `You are a network security analyst. Your task is to read the provided text and extract all fully qualified domain names (FQDNs), IPv4 addresses, IPv6 addresses, and CIDR blocks.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - Identify and analyze all CIDR blocks (e.g., 192.168.0.0/24).
    - Return the IP, Prefix and full CIDR string.
    - Do NOT expand the block.
    - Do NOT correct the IP address to the network address. Return it exactly as provided.
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - Returns IPs purely as the address (e.g. "1.1.1.1") without ports.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', 'ipv6', and 'cidrs'.
  
  CRITICAL EXCLUSION RULES:
  - DO NOT include government domains (ending in .gov, .gov.br).
  - DO NOT include official institution domains like "anatel.gov.br", "gov.br", "receita.fazenda.gov.br".
  - The goal is to identify THREATS and BLOCKLIST items. legitimate government and infrastructure domains MUST NOT be included in the output.
  - Pay close attention to the context. If a domain is mentioned as the "source" of a blocklist (e.g. "List from Anatel"), IT IS NOT A THREAT. Do not extract it.

  Text to analyze:
  {{{text}}}
  `,
});
// Helper functions for IP manipulation (kept for potential future needs, but unused in simplified flow)
function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
function longToIp(long) {
    return [
        (long >>> 24) & 255,
        (long >>> 16) & 255,
        (long >>> 8) & 255,
        long & 255
    ].join('.');
}
// Genkit Flow
const extractDomainsFlow = genkit_js_1.ai.defineFlow({
    name: 'extractDomainsFlow',
    inputSchema: exports.ExtractDomainsInputSchema,
    outputSchema: exports.ExtractDomainsOutputSchema,
}, async (input) => {
    const { output } = await extractDomainsPrompt(input);
    if (!output) {
        throw new Error("Failed to extract domains");
    }
    return {
        domains: output.domains || [],
        ipv4: output.ipv4 || [],
        ipv6: output.ipv6 || [],
        cidrs: output.cidrs || [],
    };
});
// Exported wrapper function to be used by controllers
async function extractDomainsFromText(input) {
    return extractDomainsFlow(input);
}
