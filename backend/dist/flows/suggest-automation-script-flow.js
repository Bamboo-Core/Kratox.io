'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestAutomationScriptOutputSchema = exports.SuggestAutomationScriptInputSchema = void 0;
exports.suggestAutomationScript = suggestAutomationScript;
/**
 * @fileOverview A flow to suggest a diagnostic script for an automation template.
 *
 * - suggestAutomationScript - A function that handles the script suggestion process.
 * - SuggestAutomationScriptInput - The input type for the function.
 * - SuggestAutomationScriptOutput - The return type for the function.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
// Input Schema
exports.SuggestAutomationScriptInputSchema = zod_1.z.object({
    trigger_description: zod_1.z.string().min(10, 'Trigger description must be at least 10 characters.').describe('A natural language description of the alert or event that triggers the automation.'),
    device_vendor: zod_1.z.string().min(1, 'Device vendor is required.').describe("The vendor of the target device (e.g., cisco_ios, huawei). This must match a Netmiko device type."),
});
// Output Schema
exports.SuggestAutomationScriptOutputSchema = zod_1.z.object({
    suggested_script: zod_1.z.string().describe('A newline-separated script of 2-4 relevant, read-only diagnostic commands tailored to the specific device vendor CLI.'),
});
// Genkit Prompt
const suggestScriptPrompt = genkit_js_1.ai.definePrompt({
    name: 'suggestScriptPrompt',
    input: { schema: exports.SuggestAutomationScriptInputSchema },
    output: { schema: exports.SuggestAutomationScriptOutputSchema },
    prompt: `You are an expert network automation engineer specializing in creating diagnostic scripts for network devices.
  Your task is to analyze an alert description and suggest a script of 2 to 4 read-only diagnostic commands to help troubleshoot the issue.
  The script should be a list of commands, each on a new line. Do not add any extra explanation or formatting.

  **Crucially, you must tailor the command syntax to the specific device vendor provided.**

  - The device vendor is: **{{{device_vendor}}}**.
  - If 'huawei', use VRP commands (e.g., 'display ...').
  - If 'cisco_ios', use IOS commands (e.g., 'show ...').
  - If 'juniper_junos', use Junos commands (e.g., 'show ...').
  - Prioritize commands that give the most information with the least impact.
  - Do not suggest commands with '|' pipes or interactive commands.

  Alert Description to Analyze:
  "{{{trigger_description}}}"
  `,
});
// Genkit Flow
const suggestAutomationScriptFlow = genkit_js_1.ai.defineFlow({
    name: 'suggestAutomationScriptFlow',
    inputSchema: exports.SuggestAutomationScriptInputSchema,
    outputSchema: exports.SuggestAutomationScriptOutputSchema,
}, async (input) => {
    const { output } = await suggestScriptPrompt(input);
    return output;
});
// Exported wrapper function to be used by controllers
async function suggestAutomationScript(input) {
    return suggestAutomationScriptFlow(input);
}
