

import type { Request, Response } from 'express';
import pool from '../config/database.js';

// GET all rules for the current tenant
export async function getRules(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });

  try {
    const result = await pool.query('SELECT * FROM automation_rules WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to retrieve automation rules.' });
  }
}

// POST a new rule for the current tenant
export async function createRule(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });

  const { name, condition_type, condition_value, action_type } = req.body;
  if (!name || !condition_type || !condition_value || !action_type) {
    return res.status(400).json({ error: 'Missing required rule parameters.' });
  }

  // Hardcoded for now, as we only support one trigger and action type
  const trigger_type = 'zabbix_alert';
  const trigger_conditions = { [condition_type]: condition_value };
  const action_params = {}; // No params needed for the current action

  try {
    const query = `
      INSERT INTO automation_rules (tenant_id, name, trigger_type, trigger_conditions, action_type, action_params)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await pool.query(query, [tenantId, name, trigger_type, trigger_conditions, action_type, action_params]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create automation rule.' });
  }
}

// PUT (update) an existing rule for the current tenant
export async function updateRule(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });

  const { id } = req.params;
  const { is_enabled } = req.body;

  if (typeof is_enabled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid update data. Only is_enabled can be updated.' });
  }

  try {
    const query = `
      UPDATE automation_rules
      SET is_enabled = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [is_enabled, id, tenantId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rule not found or you do not have permission to update it.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update automation rule.' });
  }
}

// DELETE a rule for the current tenant
export async function deleteRule(req: Request, res: Response) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });

  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM automation_rules WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rule not found or you do not have permission to delete it.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: 'Failed to delete automation rule.' });
  }
}
