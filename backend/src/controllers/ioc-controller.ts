import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database.js';
import { detectDomainsInText } from '../flows/detect-domains-in-text-flow.js';
import { extractDomainsFromFile } from '../flows/extract-domains-from-file-flow.js';
import { isIP } from 'node:net';

const IocBlockSchema = z.object({
  email: z.string().email().optional(),
  text: z.string().optional(),
  target: z.string().optional(),
  file: z.string().optional(),
});


/**
 * Controller to handle IoC blocking from multiple sources.
 * Designed to be robust and easily consumed by automation tools like n8n.
 */
export async function processIocBlock(req: Request, res: Response) {
  try {
    // 1. Validate payload
    const validation = IocBlockSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: validation.error.format()
      });
    }

    const { email, text, target, file } = validation.data;

    let tenantId = req.user?.tenantId;

    // 2. Identify Tenant by Email (Override if provided)
    if (email) {
      const userRes = await pool.query(
        'SELECT tenant_id FROM users WHERE email = $1',
        [email]
      );
      
      if (userRes.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: `User with email ${email} not found.`
        });
      }
      
      tenantId = userRes.rows[0].tenant_id;
    }

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Tenant ID is missing and no valid user email was provided.'
      });
    }

    if (!text && !target && !file) {
      return res.status(400).json({
        success: false,
        error: 'At least one input source (text, target, or file) must be provided.'
      });
    }


    const collectedDomains = new Set<string>();
    const collectedIps = new Set<string>();

    // 2. Process direct target
    if (target) {
      const trimmedTarget = target.trim().toLowerCase();
      if (isIP(trimmedTarget)) {
        collectedIps.add(trimmedTarget);
      } else {
        // Basic domain validation could be added here, or we can let the DB/Regex handle it
        collectedDomains.add(trimmedTarget);
      }
    }

    // 3. Process free text
    if (text) {
      const textResult = detectDomainsInText({ text });
      textResult.domains?.forEach(d => collectedDomains.add(d.toLowerCase()));
      textResult.ipv4?.forEach(ip => collectedIps.add(ip));
      textResult.ipv6?.forEach(ip => collectedIps.add(ip));
      // CIDRs could also be handled if the schema/table supports it
      textResult.cidrs?.forEach(c => collectedIps.add(c.cidr));
    }

    // 4. Process PDF file
    if (file) {
      try {
        const fileResult = await extractDomainsFromFile({ fileDataUri: file });
        fileResult.domains?.forEach(d => collectedDomains.add(d.toLowerCase()));
        fileResult.ipv4?.forEach(ip => collectedIps.add(ip));
        fileResult.ipv6?.forEach(ip => collectedIps.add(ip));
        fileResult.cidrs?.forEach(c => collectedIps.add(c.cidr));
      } catch (fileError) {
        console.error('Error processing PDF file:', fileError);
      }
    }

    const domainsToBlock = Array.from(collectedDomains);
    const ipsToBlock = Array.from(collectedIps);

    // 5. Database persistence (Batch Insert with conflict handling)
    let domainsInserted = 0;
    let ipsInserted = 0;

    if (domainsToBlock.length > 0) {
      const domainResult = await pool.query(
        `INSERT INTO blocked_domains (domain, tenant_id) 
         SELECT unnest($1::text[]), $2::uuid 
         ON CONFLICT DO NOTHING`,
        [domainsToBlock, tenantId]
      );
      domainsInserted = domainResult.rowCount ?? 0;
    }

    if (ipsToBlock.length > 0) {
      const ipResult = await pool.query(
        `INSERT INTO blocked_ips (ip_address, tenant_id) 
         SELECT unnest($1::text[]), $2::uuid 
         ON CONFLICT DO NOTHING`,
        [ipsToBlock, tenantId]
      );
      ipsInserted = ipResult.rowCount ?? 0;
    }

    return res.status(200).json({
      success: true,
      summary: {
        total_extracted: domainsToBlock.length + ipsToBlock.length,
        domains_count: domainsToBlock.length,
        ips_count: ipsToBlock.length,
        new_blocks: domainsInserted + ipsInserted,
        duplicates_skipped: (domainsToBlock.length - domainsInserted) + (ipsToBlock.length - ipsInserted)
      },
      data: {
        domains: domainsToBlock,
        ips: ipsToBlock
      },
      metadata: {
        processed_at: new Date().toISOString(),
        tenant_id: tenantId
      }
    });

  } catch (error) {
    console.error('Error in processIocBlock:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}
