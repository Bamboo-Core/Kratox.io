'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestRuleOutputSchema = exports.SuggestRuleInputSchema = void 0;
exports.suggestRule = suggestRule;
/**
 * @fileOverview A flow to suggest an automation rule from a natural language description.
 *
 * - suggestRule - A function that handles the rule suggestion process.
 * - SuggestRuleInput - The input type for the function.
 * - SuggestRuleOutput - The return type for the function.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
// Input Schema
exports.SuggestRuleInputSchema = zod_1.z.object({
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters.').describe('A natural language description of a problem or desired automation.'),
});
// Output Schema
const SuggestedRuleSchema = zod_1.z.object({
    when: zod_1.z.string().describe("The trigger event for the rule, like 'Zabbix Alert Received' or 'Metric Threshold Exceeded'."),
    if: zod_1.z.string().describe("The specific condition to check for the trigger, like 'Alert name contains `High CPU`' or 'Ping latency > 100ms for 5 minutes'."),
    action: zod_1.z.string().describe("The automated action to perform, like 'Block domain in DNS' or 'Send notification to admin'."),
});
exports.SuggestRuleOutputSchema = zod_1.z.object({
    rule: SuggestedRuleSchema.describe("The structured automation rule with WHEN, IF, and ACTION components."),
});
// Genkit Prompt
const suggestRulePrompt = genkit_js_1.ai.definePrompt({
    name: 'suggestRulePrompt',
    input: { schema: exports.SuggestRuleInputSchema },
    output: { schema: exports.SuggestRuleOutputSchema },
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
const suggestRuleFlow = genkit_js_1.ai.defineFlow({
    name: 'suggestRuleFlow',
    inputSchema: exports.SuggestRuleInputSchema,
    outputSchema: exports.SuggestRuleOutputSchema,
}, async (input) => {
    const { output } = await suggestRulePrompt(input);
    return output;
});
// Exported wrapper function to be used by controllers
async function suggestRule(input) {
    return suggestRuleFlow(input);
}
