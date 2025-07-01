
import type { Request, Response } from 'express';
import { extractDomainsFromText, ExtractDomainsInputSchema } from '../flows/extract-domains-flow';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const blockedDomainsPath = path.join(__dirname, '../mocks/blocked-domains.json');

// Helper function to read data from the JSON file
function readBlockedDomains() {
  const fileContent = fs.readFileSync(blockedDomainsPath, 'utf-8');
  return JSON.parse(fileContent);
}

// Helper function to write data to the JSON file
function writeBlockedDomains(data: any) {
  fs.writeFileSync(blockedDomainsPath, JSON.stringify(data, null, 2), 'utf-8');
}


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
    const data = readBlockedDomains();
    res.status(200).json(data.blockedDomains);
  } catch (error) {
    console.error('Error in getBlockedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve blocked domains.', details: message });
  }
}

// POST handler for adding a blocked domain
export function addBlockedDomain(req: Request, res: Response): void {
  try {
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
        res.status(400).json({ error: 'Domain is required and must be a string.' });
        return;
    }

    const blockedDomainsData = readBlockedDomains();

    const newDomain: BlockedDomain = {
      id: uuidv4(),
      domain: domain,
      blockedAt: new Date().toISOString(),
    };

    blockedDomainsData.blockedDomains.push(newDomain);
    writeBlockedDomains(blockedDomainsData);

    res.status(201).json(newDomain);
  } catch (error) {
    console.error('Error in addBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to add blocked domain.', details: message });
  }
}

// DELETE handler for removing a blocked domain
export function removeBlockedDomain(req: Request, res: Response): void {
    try {
        const { id } = req.params;
        const blockedDomainsData = readBlockedDomains();
        const initialLength = blockedDomainsData.blockedDomains.length;
        
        blockedDomainsData.blockedDomains = blockedDomainsData.blockedDomains.filter((d: BlockedDomain) => d.id !== id);

        if (blockedDomainsData.blockedDomains.length < initialLength) {
            writeBlockedDomains(blockedDomainsData);
            res.status(204).send(); // Success, no content
        } else {
            res.status(404).json({ error: 'Domain with the specified ID not found.' });
        }
    } catch (error) {
        console.error('Error in removeBlockedDomain:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to remove blocked domain.', details: message });
    }
}
