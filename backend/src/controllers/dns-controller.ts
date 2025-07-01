
import type { Request, Response } from 'express';
import { extractDomainsFromText, ExtractDomainsInputSchema } from '../flows/extract-domains-flow';
import blockedDomains from '../mocks/blocked-domains.json'; // Import the mock data
import { v4 as uuidv4 } from 'uuid'; 

interface BlockedDomain {
  id: string;
  domain: string;
  blockedAt: string;
}

export async function handleExtractDomains(req: Request, res: Response): Promise<void> {
  try {
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

// GET handler for blocked domains
export function getBlockedDomains(req: Request, res: Response): void {
  try {
    res.status(200).json(blockedDomains);
  } catch (error) {
    console.error('Error in getBlockedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve blocked domains.', details: message });
  }
}

// POST handler for adding blocked domains
export function addBlockedDomain(req: Request, res: Response): void {
  try {
    const newDomain: BlockedDomain = {
      id: uuidv4(), // Generate a unique ID
      domain: req.body.domain,
      blockedAt: new Date().toISOString(), // Set current timestamp
    };

    // Add the new domain to the mock data
    blockedDomains.blockedDomains.push(newDomain);

    res.status(201).json(newDomain);
  } catch (error) {
    console.error('Error in addBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to add blocked domain.', details: message });
  }
}
