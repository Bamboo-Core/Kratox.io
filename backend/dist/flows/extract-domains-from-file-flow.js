'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractDomainsFromFileOutputSchema = exports.ExtractDomainsFromFileInputSchema = void 0;
exports.extractDomainsFromFile = extractDomainsFromFile;
/**
 * @fileOverview A flow to extract domain names from a file (e.g., PDF).
 *
 * - extractDomainsFromFile - A function that handles the domain extraction process from a file.
 * - ExtractDomainsFromFileInput - The input type for the function.
 * - ExtractDomainsFromFileOutput - The return type for the function.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
// Input Schema
exports.ExtractDomainsFromFileInputSchema = zod_1.z.object({
    fileDataUri: zod_1.z.string().refine(val => val.startsWith('data:'), {
        message: "File must be a data URI starting with 'data:'"
    }).describe("A file (like a PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
// Output Schema
const CidrInfoSchema = zod_1.z.object({
    ip: zod_1.z.string().describe('The IP address part of the CIDR (e.g. "192.168.0.10")'),
    prefix: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => String(val)).describe('The prefix length (e.g., "/24").'),
    cidr: zod_1.z.string().describe('The full CIDR string as provided/found (e.g., "192.168.0.10/24").'),
});
exports.ExtractDomainsFromFileOutputSchema = zod_1.z.object({
    domains: zod_1.z.array(zod_1.z.string()).nullable().describe('A list of domain names extracted from the file.').default([]),
    ipv4: zod_1.z.array(zod_1.z.string()).nullable().describe('A list of IPv4 addresses extracted from the file.').default([]),
    ipv6: zod_1.z.array(zod_1.z.string()).nullable().describe('A list of IPv6 addresses extracted from the file.').default([]),
    cidrs: zod_1.z.array(CidrInfoSchema).nullable().describe('A list of CIDR blocks extracted and analyzed from the file.').default([]),
});
// Genkit Prompt
const extractDomainsFromFilePrompt = genkit_js_1.ai.definePrompt({
    name: 'extractDomainsFromFilePrompt',
    input: { schema: exports.ExtractDomainsFromFileInputSchema },
    output: { schema: exports.ExtractDomainsFromFileOutputSchema },
    prompt: `You are a network security analyst. Your task is to analyze the provided file and extract all fully qualified domain names (FQDNs), IPv4 addresses, IPv6 addresses, and CIDR blocks.
  
  Instructions:
  - Identify and list all unique domain names (e.g., example.com, malicious-site.org, sub.domain.co.uk).
  - Identify and list all unique IPv4 addresses (e.g., 192.168.1.1, 10.0.0.5).
  - Identify and list all unique IPv6 addresses (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
  - Identify and analyze all CIDR blocks (e.g., 192.168.0.0/24).
    - Return the IP, Prefix and full CIDR string.
    - Do NOT expand the block.
    - Do NOT correct the IP address to the network address. Return it exactly as provided.
  - EXTREMELY IMPORTANT: Pay close attention to numerical IP addresses. They might be part of log lines, config files, or tables. Ensure you extract ALL of them.
  - Do NOT include URLs with paths (like example.com/page), or email addresses.
  - If an IP is found, purely output the IP address itself (e.g. "1.1.1.1") without port numbers or protocol prefixes.
  - Return the results in the corresponding arrays: 'domains', 'ipv4', 'ipv6', and 'cidrs'.
  
  CRITICAL EXCLUSION RULES:
  - DO NOT include government domains (ending in .gov, .gov.br).
  - DO NOT include official institution domains like "anatel.gov.br", "gov.br".
  - The goal is to identify THREATS and BLOCKLIST items. legitimate government and infrastructure domains MUST NOT be included in the output.
  - Pay close attention to the context. Many documents mention the authorities (Anatel, gov.br). These are NOT threats. Do not extract them.
  
  File to analyze:
  {{media url=fileDataUri}}
  `,
});
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
const extractDomainsFromFileFlow = genkit_js_1.ai.defineFlow({
    name: 'extractDomainsFromFileFlow',
    inputSchema: exports.ExtractDomainsFromFileInputSchema,
    outputSchema: exports.ExtractDomainsFromFileOutputSchema,
}, async (input) => {
    const { output } = await extractDomainsFromFilePrompt(input);
    if (!output) {
        console.log("Failed to extract domains from file");
        throw new Error("Failed to extract domains from file");
    }
    console.log("AI Output:", JSON.stringify(output, null, 2));
    return {
        domains: output.domains || [],
        ipv4: output.ipv4 || [],
        ipv6: output.ipv6 || [],
        cidrs: output.cidrs || [],
    };
});
// Exported wrapper function to be used by controllers
async function extractDomainsFromFile(input) {
    return extractDomainsFromFileFlow(input);
}
