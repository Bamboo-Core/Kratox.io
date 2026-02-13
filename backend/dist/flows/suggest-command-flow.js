'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestCommandsOutputSchema = exports.SuggestCommandsInputSchema = void 0;
exports.suggestCommands = suggestCommands;
/**
 * @fileOverview A flow to suggest diagnostic commands based on a Zabbix alert.
 *
 * - suggestCommands - A function that handles the command suggestion process.
 * - SuggestCommandsInput - The input type for the function.
 * - SuggestCommandsOutput - The return type for the function.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
// Input Schema
exports.SuggestCommandsInputSchema = zod_1.z.object({
    alertMessage: zod_1.z.string().min(5, 'Alert message must be at least 5 characters.').describe('The full text of the Zabbix alert or problem.'),
    deviceVendor: zod_1.z.string().min(1, 'Device vendor is required.').describe("The vendor of the device (e.g., cisco_ios, huawei). This MUST match a Netmiko device type."),
});
// Output Schema
exports.SuggestCommandsOutputSchema = zod_1.z.object({
    commands: zod_1.z.array(zod_1.z.string()).describe('A list of 3-5 relevant diagnostic command strings, tailored to the specific device vendor CLI.'),
    reasoning: zod_1.z.string().describe('A brief explanation of why these commands were chosen.'),
});
// Genkit Prompt
const suggestCommandsPrompt = genkit_js_1.ai.definePrompt({
    name: 'suggestCommandsPrompt',
    input: { schema: exports.SuggestCommandsInputSchema },
    output: { schema: exports.SuggestCommandsOutputSchema },
    prompt: `You are a senior network operations engineer with expertise in multiple network device CLIs, including Cisco IOS, Huawei VRP, and Juniper Junos.
  Your task is to analyze a network alert and suggest a few relevant, read-only diagnostic commands to help troubleshoot the issue.

  **Crucially, you must tailor the command syntax to the specific device vendor provided.**

  - The device vendor is: **{{{deviceVendor}}}**.
  - If 'huawei', use VRP commands (e.g., 'display ...').
  - If 'cisco_ios', use IOS commands (e.g., 'show ...').
  - If 'juniper_junos', use Junos commands (e.g., 'show ...').
  - Prioritize commands that give the most information with the least impact.
  - Provide a short, one-sentence reasoning for your choices.
  - Return between 3 and 5 commands. Do not suggest commands with '|' pipes as they may not work in all execution contexts.

  Alert Message to Analyze:
  "{{{alertMessage}}}"
  `,
});
// Genkit Flow
const suggestCommandsFlow = genkit_js_1.ai.defineFlow({
    name: 'suggestCommandsFlow',
    inputSchema: exports.SuggestCommandsInputSchema,
    outputSchema: exports.SuggestCommandsOutputSchema,
}, async (input) => {
    const { output } = await suggestCommandsPrompt(input);
    return output;
});
// Exported wrapper function to be used by controllers
async function suggestCommands(input) {
    return suggestCommandsFlow(input);
}
