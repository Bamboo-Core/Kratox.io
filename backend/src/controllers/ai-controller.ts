
import type { Request, Response } from 'express';
import { extractDomainsFromText, ExtractDomainsInputSchema } from '../flows/extract-domains-flow.js';

/**
 * Handles the request to extract domains from a block of text using Genkit AI flow.
 */
export async function extractDomains(req: Request, res: Response) {
  try {
    // Validate the request body against the Zod schema
    const validationResult = ExtractDomainsInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      // If validation fails, return a 400 error with the details
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const { text } = validationResult.data;

    // Call the Genkit flow with the validated text
    const result = await extractDomainsFromText({ text });

    // Return the result from the flow
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
