
'use server';
/**
 * @fileOverview A flow to suggest diagnostic commands based on a Zabbix alert.
 *
 * - suggestCommands - A function that handles the command suggestion process.
 * - SuggestCommandsInput - The input type for the function.
 * - SuggestCommandsOutput - The return type for the function.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';

// Input Schema
export const SuggestCommandsInputSchema = z.object({
  alertMessage: z.string().min(5, 'Alert message must be at least 5 characters.').describe('The full text of the Zabbix alert or problem.'),
  deviceVendor: z.string().optional().describe('The vendor of the device (e.g., Cisco, Huawei, Juniper). Helps in tailoring commands.'),
});
export type SuggestCommandsInput = z.infer<typeof SuggestCommandsInputSchema>;

// Output Schema
export const SuggestCommandsOutputSchema = z.object({
  commands: z.array(z.string()).describe('A list of 3-5 relevant diagnostic command strings.'),
  reasoning: z.string().describe('A brief explanation of why these commands were chosen.'),
});
export type SuggestCommandsOutput = z.infer<typeof SuggestCommandsOutputSchema>;


// Genkit Prompt
const suggestCommandsPrompt = ai.definePrompt({
  name: 'suggestCommandsPrompt',
  input: { schema: SuggestCommandsInputSchema },
  output: { schema: SuggestCommandsOutputSchema },
  prompt: `You are a senior network operations engineer with expertise in Cisco IOS, Huawei VRP, and Juniper Junos.
  Your task is to analyze a network alert and suggest a few relevant, read-only diagnostic commands to help troubleshoot the issue.

  - Prioritize commands that give the most information with the least impact.
  - If a device vendor is provided ({{{deviceVendor}}}), tailor the commands to that specific vendor's CLI syntax.
  - If no vendor is provided, assume Cisco IOS as the default.
  - Provide a short, one-sentence reasoning for your choices.
  - Return between 3 and 5 commands.

  Alert Message to Analyze:
  "{{{alertMessage}}}"
  `,
});


// Genkit Flow
const suggestCommandsFlow = ai.defineFlow(
  {
    name: 'suggestCommandsFlow',
    inputSchema: SuggestCommandsInputSchema,
    outputSchema: SuggestCommandsOutputSchema,
  },
  async (input: SuggestCommandsInput) => {
    const { output } = await suggestCommandsPrompt(input);
    return output!;
  }
);


// Exported wrapper function to be used by controllers
export async function suggestCommands(input: SuggestCommandsInput): Promise<SuggestCommandsOutput> {
  return suggestCommandsFlow(input);
}
