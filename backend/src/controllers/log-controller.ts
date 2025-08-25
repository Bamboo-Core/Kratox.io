
import type { Request, Response } from 'express';
import pool from '../config/database.js';

export async function getAutomationLogs(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
  }

  try {
    const result = await pool.query(
        'SELECT * FROM automation_logs WHERE tenant_id = $1 ORDER BY executed_at DESC', 
        [tenantId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    res.status(500).json({ error: 'Failed to retrieve automation logs.' });
  }
}
