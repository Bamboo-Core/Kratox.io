
import type { Request, Response } from 'express';
import pool from '../config/database.js';
import { formatBlocklist, getAvailableFormats, type ExportFormat, type BlockedDomainRow } from '../services/blocklist-export-service.js';

// --- Helper to resolve tenant ID (supports admin override) ---
function resolveTenantId(req: Request): string | null {
  const userRole = req.user?.role;
  const userTenantId = req.user?.tenantId;
  const queryTenantId = req.query.tenantId as string | undefined;

  // Admin can override tenant via query param
  if (queryTenantId && userRole === 'admin') {
    return queryTenantId;
  }

  return userTenantId || null;
}

// --- Tenant-Specific Blocked Domains ---

// GET handler to list blocked domains for a tenant
// Admins can specify tenantId query param to view another tenant's domains
export async function getBlockedDomains(req: Request, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    // Updated query to join with dns_blocklists to get the source name
    const query = `
      SELECT 
        bd.id, 
        bd.domain, 
        bd."blockedAt", 
        bd.tenant_id, 
        bd.source_list_id,
        bl.name as source_list_name
      FROM blocked_domains bd
      LEFT JOIN dns_blocklists bl ON bd.source_list_id = bl.id
      WHERE bd.tenant_id = $1 
      ORDER BY bd."blockedAt" DESC
    `;
    const result = await pool.query(query, [tenantId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getBlockedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve blocked domains.', details: message });
  }
}

// POST handler to add a new manually blocked domain
// Admins can specify tenantId query param to add to another tenant
export async function addBlockedDomain(req: Request, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required and must be a string.' });
    }

    // Manual additions have a NULL source_list_id
    const result = await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id, source_list_id) VALUES ($1, $2, NULL) RETURNING *',
      [domain, tenantId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in addBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'This domain is already in the blocklist for this tenant.' });
    }
    res.status(500).json({ error: 'Failed to add blocked domain.', details: message });
  }
}

// DELETE handler to remove a manually blocked domain
// Admins can specify tenantId query param to remove from another tenant
export async function removeBlockedDomain(req: Request, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { id } = req.params;
    // IMPORTANT: Only allow deleting manually added domains (source_list_id IS NULL)
    // To unblock a domain from a list, the user must unsubscribe from the list.
    const result = await pool.query(
      'DELETE FROM blocked_domains WHERE id = $1 AND tenant_id = $2 AND source_list_id IS NULL',
      [id, tenantId]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Domain not found or it belongs to a subscribed blocklist feed.' });
    }
  } catch (error) {
    console.error('Error in removeBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to remove blocked domain.', details: message });
  }
}

// GET handler to generate an RPZ zone file for a tenant
// Admins can optionally specify a tenantId query param to generate for another tenant
export async function generateRpzZoneFile(req: Request, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
    const tenantName = tenantResult.rows[0]?.name || 'Unknown Tenant';

    const result = await pool.query('SELECT domain FROM blocked_domains WHERE tenant_id = $1 ORDER BY domain ASC', [tenantId]);

    const domains: string[] = result.rows.map(row => row.domain);
    const serial = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 10);

    let rpzContent = `$TTL 1h\n`;
    rpzContent += `@ IN SOA localhost. root.localhost. (${serial} 1h 15m 30d 2h)\n`;
    rpzContent += `  IN NS  localhost.\n`;
    rpzContent += `;\n; RPZ zone file generated by NOC AI for tenant: ${tenantName}\n;\n`;

    domains.forEach(domain => {
      rpzContent += `${domain} CNAME .\n`;
      rpzContent += `*.${domain} CNAME .\n`;
    });

    res.status(200).json({ rpzContent });

  } catch (error) {
    console.error('Error in generateRpzZoneFile:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to generate RPZ zone file.', details: message });
  }
}


// --- Tenant-Facing Blocklist Feed Management ---

// GET handler for a tenant to see all available blocklists
export async function getAvailableBlocklists(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT id, name, description, source, array_length(domains, 1) as domain_count FROM dns_blocklists ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAvailableBlocklists:', error);
    res.status(500).json({ error: 'Failed to retrieve available blocklists.' });
  }
}

// GET handler for a tenant to see their current subscriptions
// Admins can specify tenantId query param
export async function getMySubscriptions(req: Request, res: Response) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });

  try {
    const query = 'SELECT blocklist_id FROM tenant_blocklist_subscriptions WHERE tenant_id = $1';
    const result = await pool.query(query, [tenantId]);
    // Return a simple array of IDs for easy lookup on the frontend
    res.status(200).json(result.rows.map(row => row.blocklist_id));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to retrieve subscriptions.' });
  }
}

// POST handler for a tenant to subscribe to a blocklist
// Admins can specify tenantId query param
export async function subscribeToBlocklist(req: Request, res: Response) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
  const { blocklistId } = req.body;
  if (!blocklistId) return res.status(400).json({ error: 'Blocklist ID is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the list of domains from the blocklist
    const listRes = await client.query('SELECT domains FROM dns_blocklists WHERE id = $1', [blocklistId]);
    if (listRes.rowCount === 0) {
      throw new Error('Blocklist not found.');
    }
    const domains = listRes.rows[0].domains;

    // 2. Add the subscription entry
    await client.query(
      'INSERT INTO tenant_blocklist_subscriptions (tenant_id, blocklist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [tenantId, blocklistId]
    );

    // 3. Insert all domains into the tenant's blocked_domains table
    if (domains && domains.length > 0) {
      const insertQuery = `
                INSERT INTO blocked_domains (domain, tenant_id, source_list_id)
                SELECT unnest($1::text[]), $2, $3
                ON CONFLICT (domain, tenant_id) DO NOTHING;
            `;
      await client.query(insertQuery, [domains, tenantId, blocklistId]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Subscribed successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in subscribeToBlocklist:', error);
    res.status(500).json({ error: 'dnsBlocking.errors.subscribeFailed' });
  } finally {
    client.release();
  }
}

// DELETE handler for a tenant to unsubscribe from a blocklist
// Admins can specify tenantId query param
export async function unsubscribeFromBlocklist(req: Request, res: Response) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
  const { blocklistId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Remove the subscription entry
    await client.query('DELETE FROM tenant_blocklist_subscriptions WHERE tenant_id = $1 AND blocklist_id = $2', [tenantId, blocklistId]);

    // 2. Remove all domains from that list from the tenant's blocked_domains table
    await client.query('DELETE FROM blocked_domains WHERE tenant_id = $1 AND source_list_id = $2', [tenantId, blocklistId]);

    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in unsubscribeFromBlocklist:', error);
    res.status(500).json({ error: 'dnsBlocking.errors.unsubscribeFailed' });
  } finally {
    client.release();
  }
}

// --- Blocklist Export ---

const VALID_FORMATS: ExportFormat[] = ['hosts', 'unbound', 'bind', 'json', 'csv'];

// GET handler to get available export formats
export async function getExportFormats(req: Request, res: Response) {
  res.status(200).json(getAvailableFormats());
}

// GET handler to export blocklist in specified format
export async function exportBlocklist(req: Request, res: Response) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    const format = req.query.format as string;
    if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
      return res.status(400).json({
        error: 'Invalid format. Valid formats are: ' + VALID_FORMATS.join(', ')
      });
    }

    // Get tenant name
    const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
    const tenantName = tenantResult.rows[0]?.name || 'Unknown Tenant';

    // Get blocked domains with source info
    const query = `
      SELECT 
        bd.domain, 
        bd."blockedAt", 
        bl.name as source_list_name
      FROM blocked_domains bd
      LEFT JOIN dns_blocklists bl ON bd.source_list_id = bl.id
      WHERE bd.tenant_id = $1 
      ORDER BY bd.domain ASC
    `;
    const result = await pool.query(query, [tenantId]);
    const domains: BlockedDomainRow[] = result.rows;

    // Format the blocklist
    const exportResult = formatBlocklist(format as ExportFormat, domains, tenantName);

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `blocklist_${format}_${date}.${exportResult.extension}`;

    // Set response headers for download
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(exportResult.content);

    // Log the export
    console.log(`[Export] Tenant ${tenantId} exported blocklist in ${format} format (${domains.length} domains)`);

  } catch (error) {
    console.error('Error in exportBlocklist:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to export blocklist.', details: message });
  }
}
