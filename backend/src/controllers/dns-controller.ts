
import type { Request, Response } from 'express';
import { extractDomainsFromText, ExtractDomainsInputSchema } from '../flows/extract-domains-flow';

export async function handleExtractDomains(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body against the Zod schema
    const validationResult = ExtractDomainsInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { text } = validationResult.data;

    console.log(`Received request to extract domains from text: "${text.substring(0, 50)}..."`);

    // Call the Genkit flow
    const result = await extractDomainsFromText({ text });

    if (!result || !result.domains) {
        throw new Error("AI flow did not return the expected output format.");
    }
    
    console.log(`Extracted domains: ${result.domains.join(', ')}`);

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in handleExtractDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to extract domains from text.', details: message });
  }
}
