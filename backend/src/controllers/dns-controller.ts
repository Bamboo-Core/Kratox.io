import type { Request, Response } from 'express';
import pool from '../config/database.js';

// GET handler to list blocked domains from the database
export async function getBlockedDomains(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM blocked_domains ORDER BY "blockedAt" DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getBlockedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve blocked domains.', details: message });
  }
}

// POST handler to add a new blocked domain to the database
export async function addBlockedDomain(req: Request, res: Response) {
  try {
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required and must be a string.' });
    }

    const result = await pool.query(
      'INSERT INTO blocked_domains (domain) VALUES ($1) RETURNING *',
      [domain]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in addBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Handle potential unique constraint violation (duplicate domain)
    if (error instanceof Error && 'code' in error && error.code === '23505') {
        return res.status(409).json({ error: 'This domain is already in the blocklist.' });
    }
    res.status(500).json({ error: 'Failed to add blocked domain.', details: message });
  }
}

// DELETE handler to remove a blocked domain from the database
export async function removeBlockedDomain(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blocked_domains WHERE id = $1', [id]);

    if (result.rowCount > 0) {
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
