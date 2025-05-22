// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview An AI agent that suggests network rules based on a description.
 *
 * - suggestRulesFromDescription - A function that generates rule suggestions from a description.
 * - SuggestRulesFromDescriptionInput - The input type for the suggestRulesFromDescription function.
 * - SuggestRulesFromDescriptionOutput - The return type for the suggestRulesFromDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRulesFromDescriptionInputSchema = z.object({
  description: z
    .string()
    .describe(
      'A description of the desired network behavior for which to generate rules.'
    ),
});

export type SuggestRulesFromDescriptionInput = z.infer<
  typeof SuggestRulesFromDescriptionInputSchema
>;

const SuggestRulesFromDescriptionOutputSchema = z.object({
  suggestedRules: z
    .string()
    .describe(
      'Suggested rule configurations based on the provided description.'
    ),
});

export type SuggestRulesFromDescriptionOutput = z.infer<
  typeof SuggestRulesFromDescriptionOutputSchema
>;

export async function suggestRulesFromDescription(
  input: SuggestRulesFromDescriptionInput
): Promise<SuggestRulesFromDescriptionOutput> {
  return suggestRulesFromDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRulesFromDescriptionPrompt',
  input: {schema: SuggestRulesFromDescriptionInputSchema},
  output: {schema: SuggestRulesFromDescriptionOutputSchema},
  prompt: `You are a network automation expert. Generate rule configurations based on the following description:

Description: {{{description}}}

Consider common ISP issues and best practices when creating the rule suggestions.

Output the rule suggestions in a clear, concise format.`,
});

const suggestRulesFromDescriptionFlow = ai.defineFlow(
  {
    name: 'suggestRulesFromDescriptionFlow',
    inputSchema: SuggestRulesFromDescriptionInputSchema,
    outputSchema: SuggestRulesFromDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
