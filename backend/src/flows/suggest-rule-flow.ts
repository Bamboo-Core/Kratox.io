
'use server';
/**
 * @fileOverview A flow to suggest an automation rule from a natural language description.
 *
 * - suggestRule - A function that handles the rule suggestion process.
 * - SuggestRuleInput - The input type for the function.
 * - SuggestRuleOutput - The return type for the function.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';

// Input Schema
export const SuggestRuleInputSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters.').describe('A natural language description of a problem or desired automation.'),
});
export type SuggestRuleInput = z.infer<typeof SuggestRuleInputSchema>;

// Output Schema
const SuggestedRuleSchema = z.object({
    when: z.string().describe("The trigger event for the rule, like 'Zabbix Alert Received' or 'Metric Threshold Exceeded'."),
    if: z.string().describe("The specific condition to check for the trigger, like 'Alert name contains `High CPU`' or 'Ping latency > 100ms for 5 minutes'."),
    action: z.string().describe("The automated action to perform, like 'Block domain in DNS' or 'Send notification to admin'."),
});

export const SuggestRuleOutputSchema = z.object({
  rule: SuggestedRuleSchema.describe("The structured automation rule with WHEN, IF, and ACTION components."),
});
export type SuggestRuleOutput = z.infer<typeof SuggestRuleOutputSchema>;


// Genkit Prompt
const suggestRulePrompt = ai.definePrompt({
  name: 'suggestRulePrompt',
  input: { schema: SuggestRuleInputSchema },
  output: { schema: SuggestRuleOutputSchema },
  prompt: `You are a network automation expert for an Internet Service Provider (ISP).
  Your task is to convert a user's natural language description of a problem into a structured automation rule.
  The rule must have three parts: "WHEN" (the trigger), "IF" (the condition), and "ACTION" (the command to execute).

  You have knowledge of the following systems and potential actions:
  - Zabbix (for monitoring and alerts)
  - DNS Blocking (for security)
  - Ticketing Systems (generic concept)
  - Notifications (email, Telegram, etc.)

  Analyze the user's description and create the most logical and concise rule.

  User Description:
  {{{description}}}
  `,
});


// Genkit Flow
const suggestRuleFlow = ai.defineFlow(
  {
    name: 'suggestRuleFlow',
    inputSchema: SuggestRuleInputSchema,
    outputSchema: SuggestRuleOutputSchema,
  },
  async (input: SuggestRuleInput) => {
    const { output } = await suggestRulePrompt(input);
    return output!;
  }
);


// Exported wrapper function to be used by controllers
export async function suggestRule(input: SuggestRuleInput): Promise<SuggestRuleOutput> {
  return suggestRuleFlow(input);
}
