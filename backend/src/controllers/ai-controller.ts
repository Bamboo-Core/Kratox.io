
import type { Request, Response } from 'express';
import { extractDomainsFromText, ExtractDomainsInputSchema } from '../flows/extract-domains-flow.js';
import { suggestRule, SuggestRuleInputSchema } from '../flows/suggest-rule-flow.js';

/**
 * Handles the request to extract domains from a block of text using Genkit AI flow.
 */
export async function extractDomains(req: Request, res: Response) {
  try {
    const validationResult = ExtractDomainsInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const { text } = validationResult.data;
    const result = await extractDomainsFromText({ text });
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in extractDomains controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to extract domains using AI.',
      details: message,
    });
  }
}


/**
 * Handles the request to suggest an automation rule based on a user's description.
 */
export async function suggestAutomationRule(req: Request, res: Response) {
  try {
    const validationResult = SuggestRuleInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const { description } = validationResult.data;
    const result = await suggestRule({ description });
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in suggestAutomationRule controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to suggest rule using AI.',
      details: message,
    });
  }
}
