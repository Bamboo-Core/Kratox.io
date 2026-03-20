
import type { Request, Response } from 'express';
import { extractDomainsFromText, ExtractDomainsInputSchema } from '../flows/extract-domains-flow.js';
import { suggestRule, SuggestRuleInputSchema } from '../flows/suggest-rule-flow.js';
import { extractDomainsFromFile, ExtractDomainsFromFileInputSchema } from '../flows/extract-domains-from-file-flow.js';
import { suggestCommands, SuggestCommandsInputSchema } from '../flows/suggest-command-flow.js';
import { diagnoseNetworkWithTools, DiagnoseNetworkInputSchema } from '../flows/execute-probe-command-flow.js';
import { suggestAutomationScript, SuggestAutomationScriptInputSchema } from '../flows/suggest-automation-script-flow.js';

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
    console.log('[AI Debug] extractDomains result:', JSON.stringify(result, null, 2));
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
 * Handles the request to extract domains from a file (e.g., PDF) using Genkit AI flow.
 */
export async function extractDomainsFromFileController(req: Request, res: Response) {
  try {
    const validationResult = ExtractDomainsFromFileInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body. Expecting fileDataUri.',
        details: validationResult.error.flatten(),
      });
    }

    const { fileDataUri } = validationResult.data;

    // Runs Phase 1 (Python extraction + broken domain detection)
    // and Phase 2 (deterministic regex + PSL validation)
    const result = await extractDomainsFromFile({ fileDataUri });

    console.log('[Controller] Extraction complete:', {
      domains: result.domains?.length ?? 0,
      ipv4: result.ipv4?.length ?? 0,
      ipv6: result.ipv6?.length ?? 0,
      cidrs: result.cidrs?.length ?? 0,
    });

    return res.status(200).json(result);


  } catch (error) {
    console.error('Error in extractDomainsFromFile controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to extract domains from file using AI.',
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

/**
 * Handles the request to suggest diagnostic commands based on an alert.
 */
export async function suggestCommandsForAlert(req: Request, res: Response) {
  try {
    const validationResult = SuggestCommandsInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const { alertMessage, deviceVendor } = validationResult.data;
    const result = await suggestCommands({ alertMessage, deviceVendor });
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in suggestCommandsForAlert controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to suggest commands using AI.',
      details: message,
    });
  }
}


/**
 * Handles a natural language request to diagnose network issues, potentially using tools.
 */
export async function diagnoseNetwork(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
  }

  try {
    const validationResult = DiagnoseNetworkInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    // The 'objective' comes from the validated request body.
    const { objective } = validationResult.data;

    // The 'tenantId' comes securely from the authentication token.
    // We pass both to the flow.
    const result = await diagnoseNetworkWithTools({ objective, tenantId });

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in diagnoseNetwork controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to diagnose network issue using AI.',
      details: message,
    });
  }
}

/**
 * Handles the request to suggest an automation script.
 */
export async function suggestScript(req: Request, res: Response) {
  try {
    const validationResult = SuggestAutomationScriptInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const result = await suggestAutomationScript(validationResult.data);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in suggestScript controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to suggest script using AI.',
      details: message,
    });
  }
}

import { analyzeCidr, AnalyzeCidrInputSchema } from '../flows/analyze-cidr-flow.js';

export async function analyzeCidrController(req: Request, res: Response) {
  try {
    const validationResult = AnalyzeCidrInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const { cidr } = validationResult.data;
    const result = await analyzeCidr({ cidr });
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in analyzeCidr controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to analyze CIDR using AI.',
      details: message,
    });
  }
}

import { sendExtractionIssueReport } from '../services/email-service.js';
import { z } from 'zod';

const ReportIssueInputSchema = z.object({
  type: z.string(),
  comments: z.string().optional(),
  fileDataUri: z.string().optional(),
  textAnalyzed: z.string().optional(),
});

export async function reportExtractionIssueController(req: Request, res: Response) {
  try {
    const validationResult = ReportIssueInputSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body.',
        details: validationResult.error.flatten(),
      });
    }

    const { type, comments, fileDataUri, textAnalyzed } = validationResult.data;
    const userEmail = req.user?.email || 'unknown';

    const success = await sendExtractionIssueReport(
      { type, comments: comments || '', userEmail },
      fileDataUri,
      textAnalyzed
    );

    if (!success) {
      throw new Error("Failed to send email");
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error in reportExtractionIssue controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({
      error: 'Failed to report extraction issue.',
      details: message,
    });
  }
}

