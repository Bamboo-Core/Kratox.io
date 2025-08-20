import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import * as zabbixService from '../services/zabbix-service.js';
import type { ZabbixHostGroup } from '../services/zabbix-service.js'; // Import the type

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
    // 1. Fetch all users from the database
    const userQuery = `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.tenant_id, t.name as tenant_name, u.zabbix_hostgroup_ids
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.name ASC
    `;
    const userResult = await pool.query(userQuery);
    const users = userResult.rows;

    // 2. Fetch all Zabbix host groups to create a map
    const tenantId = req.user?.tenantId; // Use any valid tenant ID to make the call
    if (!tenantId) {
      // This should ideally not happen due to auth middleware, but as a safeguard:
      return res.status(500).json({ error: 'Tenant context not found for Zabbix API call.' });
    }
    const hostGroups: ZabbixHostGroup[] = await zabbixService.getZabbixHostGroups(tenantId);
    const hostGroupMap = new Map(hostGroups.map((hg: ZabbixHostGroup) => [hg.groupid, hg.name]));

    // 3. Enrich users with host group names
    const enrichedUsers = users.map(user => {
      const group_ids = user.zabbix_hostgroup_ids || [];
      const zabbix_group_names = group_ids.map((id: string) => hostGroupMap.get(id) || `Unknown (ID: ${id})`);
      return {
        ...user,
        zabbix_group_names,
      };
    });

    res.status(200).json(enrichedUsers);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.tenant_id, t.name as tenant_name, u.zabbix_hostgroup_ids
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

async function getNocAiTenantId(): Promise<string> {
    const tenantRes = await pool.query("SELECT id FROM tenants WHERE name = 'NOC AI Corp' LIMIT 1");
    if (tenantRes.rowCount === 0) {
        throw new Error("Critical: 'NOC AI Corp' tenant not found.");
    }
    return tenantRes.rows[0].id;
}


export async function createUser(req: Request, res: Response) {
  let { name, email, password, role, tenantId, zabbix_hostgroup_ids } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields: name, email, password, role.' });
  }
  
  if (role !== 'admin' && !tenantId) {
    return res.status(400).json({ error: 'Missing required field: tenantId is required for non-admin users.' });
  }

  try {
    if (role === 'admin') {
      tenantId = await getNocAiTenantId();
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, email, password_hash, role, tenant_id, zabbix_hostgroup_ids)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, created_at, tenant_id, zabbix_hostgroup_ids
    `;
    const hostgroup_ids = Array.isArray(zabbix_hostgroup_ids) ? zabbix_hostgroup_ids : [];

    const result = await pool.query(query, [name, email, hashedPassword, role, tenantId, hostgroup_ids]);
    
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
    let { name, email, role, tenantId, password, zabbix_hostgroup_ids } = req.body;

    if (!name || !email || !role) {
        return res.status(400).json({ error: 'Missing required fields: name, email, role.' });
    }
    
    if (role !== 'admin' && !tenantId) {
        return res.status(400).json({ error: 'Missing required field: tenantId is required for non-admin users.' });
    }

    try {
        if (role === 'admin') {
            tenantId = await getNocAiTenantId();
        }
        
        const hostgroup_ids = Array.isArray(zabbix_hostgroup_ids) ? zabbix_hostgroup_ids : [];

        const updates = [name, email, role, tenantId, hostgroup_ids];
        let query = `
            UPDATE users
            SET name = $1, email = $2, role = $3, tenant_id = $4, zabbix_hostgroup_ids = $5
        `;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(hashedPassword);
            query += `, password_hash = $${updates.length}`;
        }
        
        updates.push(id);
        query += `
            WHERE id = $${updates.length}
            RETURNING id, name, email, role, created_at, tenant_id, zabbix_hostgroup_ids
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

// --- DNS Blocklist Management (Admin) ---

export async function getAllBlocklists(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM dns_blocklists ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAllBlocklists:', error);
    res.status(500).json({ error: 'Failed to retrieve blocklists.' });
  }
}

export async function createBlocklist(req: Request, res: Response) {
  const { name, description, source, domains } = req.body;
  if (!name || !domains || !Array.isArray(domains)) {
    return res.status(400).json({ error: 'Name and a list of domains are required.' });
  }

  try {
    const query = `
      INSERT INTO dns_blocklists (name, description, source, domains, updated_at) 
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`;
    const result = await pool.query(query, [name, description, source, domains]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
        return res.status(409).json({ error: 'A blocklist with this name already exists.' });
    }
    console.error('Error in createBlocklist:', error);
    res.status(500).json({ error: 'Failed to create blocklist.' });
  }
}

export async function updateBlocklist(req: Request, res: Response) {
    const { id } = req.params;
    const { name, description, source, domains } = req.body;

    if (!name || !domains || !Array.isArray(domains)) {
        return res.status(400).json({ error: 'Name and a list of domains are required.' });
    }

    try {
        const query = `
            UPDATE dns_blocklists 
            SET name = $1, description = $2, source = $3, domains = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING *`;
        const result = await pool.query(query, [name, description, source, domains, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Blocklist not found.' });
        }
        
        // TODO: Here we should trigger a sync for all subscribed tenants
        
        res.status(200).json(result.rows[0]);
    } catch (error) {
       if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A blocklist with this name already exists.' });
       }
       console.error('Error in updateBlocklist:', error);
       res.status(500).json({ error: 'Failed to update blocklist.' });
    }
}

export async function deleteBlocklist(req: Request, res: Response) {
    const { id } = req.params;
    try {
        // TODO: We must first remove this list from all tenants' blocklists
        await pool.query('DELETE FROM dns_blocklists WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('Error in deleteBlocklist:', error);
        res.status(500).json({ error: 'Failed to delete blocklist.' });
    }
}
