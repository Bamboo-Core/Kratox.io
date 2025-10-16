
'use server';
/**
 * @fileOverview A flow to suggest a diagnostic script for an automation template.
 *
 * - suggestAutomationScript - A function that handles the script suggestion process.
 * - SuggestAutomationScriptInput - The input type for the function.
 * - SuggestAutomationScriptOutput - The return type for the function.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';

// Input Schema
export const SuggestAutomationScriptInputSchema = z.object({
  trigger_description: z.string().min(10, 'Trigger description must be at least 10 characters.').describe('A natural language description of the alert or event that triggers the automation.'),
  device_vendor: z.string().min(1, 'Device vendor is required.').describe("The vendor of the target device (e.g., cisco_ios, huawei). This must match a Netmiko device type."),
});
export type SuggestAutomationScriptInput = z.infer<typeof SuggestAutomationScriptInputSchema>;

// Output Schema
export const SuggestAutomationScriptOutputSchema = z.object({
  suggested_script: z.string().describe('A newline-separated script of 2-4 relevant, read-only diagnostic commands tailored to the specific device vendor CLI.'),
});
export type SuggestAutomationScriptOutput = z.infer<typeof SuggestAutomationScriptOutputSchema>;


// Genkit Prompt
const suggestScriptPrompt = ai.definePrompt({
  name: 'suggestScriptPrompt',
  input: { schema: SuggestAutomationScriptInputSchema },
  output: { schema: SuggestAutomationScriptOutputSchema },
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
const suggestAutomationScriptFlow = ai.defineFlow(
  {
    name: 'suggestAutomationScriptFlow',
    inputSchema: SuggestAutomationScriptInputSchema,
    outputSchema: SuggestAutomationScriptOutputSchema,
  },
  async (input: SuggestAutomationScriptInput) => {
    const { output } = await suggestScriptPrompt(input);
    return output!;
  }
);


// Exported wrapper function to be used by controllers
export async function suggestAutomationScript(input: SuggestAutomationScriptInput): Promise<SuggestAutomationScriptOutput> {
  return suggestAutomationScriptFlow(input);
}
