import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

// --- Tenant Management ---

export async function getAllTenants(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM tenants ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAllTenants:', error);
    res.status(500).json({ error: 'Failed to retrieve tenants.' });
  }
}

export async function createTenant(req: Request, res: Response) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Tenant name is required.' });
  }

  try {
    const result = await pool.query('INSERT INTO tenants (name) VALUES ($1) RETURNING id, name, created_at', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'A tenant with this name already exists.' });
    }
    console.error('Error in createTenant:', error);
    res.status(500).json({ error: 'Failed to create tenant.' });
  }
}

// --- User Management ---

export async function getAllUsers(req: Request, res: Response) {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.tenant_id, t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.tenant_id, t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error in getUserById for ID ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user.' });
  }
}


export async function createUser(req: Request, res: Response) {
  const { name, email, password, role, tenantId } = req.body;

  if (!name || !email || !password || !role || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields: name, email, password, role, tenantId.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, email, password_hash, role, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, created_at, tenant_id
    `;
    const result = await pool.query(query, [name, email, hashedPassword, role, tenantId]);
    
    // Fetch tenant name to return a complete user object
    const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [result.rows[0].tenant_id]);
    const finalUser = { ...result.rows[0], tenant_name: tenantResult.rows[0].name || 'N/A' };

    res.status(201).json(finalUser);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error('Error in createUser:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
}

export async function updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const { name, email, role, tenantId, password } = req.body;

    if (!name || !email || !role || !tenantId) {
        return res.status(400).json({ error: 'Missing required fields: name, email, role, tenantId.' });
    }

    try {
        const updates = [name, email, role, tenantId];
        let query = `
            UPDATE users
            SET name = $1, email = $2, role = $3, tenant_id = $4
        `;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(hashedPassword);
            query += `, password_hash = $${updates.length}`;
        }
        
        updates.push(id);
        query += `
            WHERE id = $${updates.length}
            RETURNING id, name, email, role, created_at, tenant_id
        `;

        const result = await pool.query(query, updates);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [result.rows[0].tenant_id]);
        const finalUser = { ...result.rows[0], tenant_name: tenantResult.rows[0].name || 'N/A' };

        res.status(200).json(finalUser);
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        console.error('Error in updateUser:', error);
        res.status(500).json({ error: 'Failed to update user.' });
    }
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}


// --- DNS Management (Admin) ---

export async function getAllBlockedDomains(req: Request, res: Response) {
  try {
    const query = `
        SELECT bd.id, bd.domain, bd."blockedAt", bd.tenant_id, t.name as tenant_name
        FROM blocked_domains bd
        JOIN tenants t ON bd.tenant_id = t.id
        ORDER BY t.name, bd.domain;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAllBlockedDomains:', error);
    res.status(500).json({ error: 'Failed to retrieve all blocked domains.' });
  }
}

export async function addBlockedDomainForTenant(req: Request, res: Response) {
  const { domain, tenantId } = req.body;
  if (!domain || !tenantId) {
    return res.status(400).json({ error: 'Domain and tenantId are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) RETURNING *',
      [domain, tenantId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'This domain is already in the blocklist for this tenant.' });
    }
    console.error('Error in addBlockedDomainForTenant:', error);
    res.status(500).json({ error: 'Failed to add blocked domain.' });
  }
}
