import type { Request, Response } from 'express';
import pool from '../config/database.js';

// GET handler to list blocked domains from the database for the current tenant
export async function getBlockedDomains(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const result = await pool.query('SELECT * FROM blocked_domains WHERE tenant_id = $1 ORDER BY "blockedAt" DESC', [tenantId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getBlockedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve blocked domains.', details: message });
  }
}

// POST handler to add a new blocked domain to the database for the current tenant
export async function addBlockedDomain(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required and must be a string.' });
    }

    const result = await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) RETURNING *',
      [domain, tenantId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in addBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Handle potential unique constraint violation (duplicate domain for the same tenant)
    if (error instanceof Error && 'code' in error && error.code === '23505') {
        return res.status(409).json({ error: 'This domain is already in the blocklist for this tenant.' });
    }
    res.status(500).json({ error: 'Failed to add blocked domain.', details: message });
  }
}

// DELETE handler to remove a blocked domain from the database for the current tenant
export async function removeBlockedDomain(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blocked_domains WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

    // Check for rowCount being non-null before comparing
    if (result.rowCount && result.rowCount > 0) {
      res.status(204).send(); // Success, no content
    } else {
      res.status(404).json({ error: 'Domain with the specified ID not found for this tenant.' });
    }
  } catch (error) {
    console.error('Error in removeBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to remove blocked domain.', details: message });
  }
}
