import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import pool from '../config/database.js';

function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})+$/;
  return domainRegex.test(domain);
}

// GET handler to list blocked domains from the database for the current tenant
// Returns combined manual domains + subscribed blocklist domains, minus exclusions
export async function getBlockedDomains(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    // 1. Fetch manual domains
    const manualResult = await pool.query(
      `SELECT id, domain, "blockedAt", NULL as source_list_id, NULL as source_list_name 
       FROM blocked_domains 
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // 2. Fetch domains from subscribed blocklists
    const subscribedResult = await pool.query(
      `SELECT 
         b.id as source_list_id,
         b.name as source_list_name,
         unnest(b.domains) as domain
       FROM dns_blocklists b
       JOIN tenant_blocklist_subscriptions s ON b.id = s.blocklist_id
       WHERE s.tenant_id = $1`,
      [tenantId]
    );

    // 3. Fetch excluded domains for this tenant
    const exclusionsResult = await pool.query(
      `SELECT domain FROM tenant_domain_exclusions WHERE tenant_id = $1`,
      [tenantId]
    );
    const excludedDomains = new Set(exclusionsResult.rows.map(r => r.domain));

    // 4. Transform subscribed domains to match BlockedDomain format
    const subscribedDomains = subscribedResult.rows.map((row, index) => ({
      id: `sub-${row.source_list_id}-${index}`,
      domain: row.domain,
      blockedAt: null,
      source_list_id: row.source_list_id,
      source_list_name: row.source_list_name,
    }));

    // 5. Combine and deduplicate (manual domains take precedence)
    const manualDomainSet = new Set(manualResult.rows.map(r => r.domain));
    const uniqueSubscribed = subscribedDomains.filter(d => !manualDomainSet.has(d.domain));

    // 6. Mark excluded domains in the subscribed list (instead of removal)
    const markedSubscribed = uniqueSubscribed.map(d => ({
      ...d,
      is_excluded: excludedDomains.has(d.domain)
    }));

    const allDomains = [...manualResult.rows.map(r => ({ ...r, is_excluded: false })), ...markedSubscribed];

    // Sort: manual first (by blockedAt DESC), then subscribed (alphabetically)
    allDomains.sort((a, b) => {
      if (a.source_list_id === null && b.source_list_id !== null) return -1;
      if (a.source_list_id !== null && b.source_list_id === null) return 1;
      if (a.source_list_id === null && b.source_list_id === null) {
        // Both manual, sort by blockedAt DESC
        return new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime();
      }
      return a.domain.localeCompare(b.domain);
    });

    res.status(200).json(allDomains);
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

    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain format.' });
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
      return res
        .status(409)
        .json({ error: 'This domain is already in the blocklist for this tenant.' });
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
    const result = await pool.query(
      'DELETE FROM blocked_domains WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

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

// PUT handler to update a blocked domain for the current tenant
export async function updateBlockedDomain(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { id } = req.params;
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required and must be a string.' });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain format.' });
    }

    const result = await pool.query(
      'UPDATE blocked_domains SET domain = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [domain, id, tenantId]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Domain with the specified ID not found for this tenant.' });
    }
  } catch (error) {
    console.error('Error in updateBlockedDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';

    // Handle potential unique constraint violation
    if (error instanceof Error && 'code' in error && (error as any).code === '23505') {
      return res
        .status(409)
        .json({ error: 'This domain is already in the blocklist for this tenant.' });
    }

    res.status(500).json({ error: 'Failed to update blocked domain.', details: message });
  }
}

// GET handler to generate an RPZ zone file for the current tenant
export async function generateRpzZoneFile(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    const result = await pool.query(
      'SELECT domain FROM blocked_domains WHERE tenant_id = $1 ORDER BY domain ASC',
      [tenantId]
    );

    const domains: string[] = result.rows.map((row) => row.domain);

    // Generate a serial number based on the current date and time (YYYYMMDDHH)
    const serial = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 10);

    // Standard SOA record for an RPZ file
    let rpzContent = `$TTL 1h\n`;
    rpzContent += `@ IN SOA localhost. root.localhost. (${serial} 1h 15m 30d 2h)\n`;
    rpzContent += `  IN NS  localhost.\n`;
    rpzContent += `;\n; RPZ zone file generated by NOC AI for tenant ${tenantId}\n;\n`;

    // Add domain entries
    domains.forEach((domain) => {
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

// DELETE handler to remove ALL manually blocked domains
export async function removeAllBlockedDomains(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    await pool.query('DELETE FROM blocked_domains WHERE tenant_id = $1', [tenantId]);

    res.status(204).send();
  } catch (error) {
    console.error('Error in removeAllBlockedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to remove all blocked domains.', details: message });
  }
}

// --- Domain Exclusion Management ---

// POST handler to exclude a domain from subscribed blocklists (per-tenant)
export async function excludeDomain(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required and must be a string.' });
    }

    await pool.query(
      `INSERT INTO tenant_domain_exclusions (tenant_id, domain) 
       VALUES ($1, $2) 
       ON CONFLICT (tenant_id, domain) DO NOTHING`,
      [tenantId, domain]
    );

    res.status(201).json({ message: 'Domain excluded successfully', domain });
  } catch (error) {
    console.error('Error in excludeDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to exclude domain.', details: message });
  }
}

// DELETE handler to re-include a previously excluded domain
export async function reincludeDomain(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    const { domain } = req.params;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required.' });
    }

    const result = await pool.query(
      `DELETE FROM tenant_domain_exclusions WHERE tenant_id = $1 AND domain = $2`,
      [tenantId, domain]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Exclusion not found for this domain.' });
    }
  } catch (error) {
    console.error('Error in reincludeDomain:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to re-include domain.', details: message });
  }
}

// GET handler to list all excluded domains for the current tenant
export async function getExcludedDomains(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    const result = await pool.query(
      `SELECT id, domain, excluded_at FROM tenant_domain_exclusions WHERE tenant_id = $1 ORDER BY domain ASC`,
      [tenantId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getExcludedDomains:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve excluded domains.', details: message });
  }
}

// --- Blocklist Feed Subscription Management ---

export async function getAvailableBlocklists(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT id, name, description, source, created_at FROM dns_blocklists ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in getAvailableBlocklists:', error);
    res.status(500).json({ error: 'Failed to retrieve blocklists.' });
  }
}

export async function getMySubscriptions(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant ID missing' });

    const result = await pool.query(
      'SELECT blocklist_id FROM tenant_blocklist_subscriptions WHERE tenant_id = $1',
      [tenantId]
    );
    res.status(200).json(result.rows.map(row => row.blocklist_id));
  } catch (error) {
    console.error('Error in getMySubscriptions:', error);
    res.status(500).json({ error: 'Failed to retrieve subscriptions.' });
  }
}

export async function subscribeToBlocklist(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant ID missing' });
    const { blocklistId } = req.body;

    if (!blocklistId) return res.status(400).json({ error: 'blocklistId is required' });

    await pool.query(
      'INSERT INTO tenant_blocklist_subscriptions (tenant_id, blocklist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [tenantId, blocklistId]
    );
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error in subscribeToBlocklist:', error);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
}

export async function unsubscribeFromBlocklist(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant ID missing' });
    const { blocklistId } = req.params;

    await pool.query(
      'DELETE FROM tenant_blocklist_subscriptions WHERE tenant_id = $1 AND blocklist_id = $2',
      [tenantId, blocklistId]
    );
    res.status(204).send();
  } catch (error) {
    console.error('Error in unsubscribeFromBlocklist:', error);
    res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
}

// --- Blocklist Export ---

export async function getExportFormats(req: Request, res: Response) {
  res.status(200).json([
    { id: 'hosts', name: 'Hosts File', description: 'Standard /etc/hosts format', extension: 'hosts' },
    { id: 'unbound', name: 'Unbound', description: 'Unbound DNS configuration', extension: 'conf' },
    { id: 'bind', name: 'BIND9', description: 'BIND9 zone file format', extension: 'zone' },
    { id: 'json', name: 'JSON', description: 'Raw JSON array of domains', extension: 'json' },
    { id: 'csv', name: 'CSV', description: 'Comma-separated values', extension: 'csv' }
  ]);
}

export async function exportBlocklist(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || (req.query.tenantId as string);
    // If accessed via public token logic, tenantId might come differently, 
    // but for this endpoint (likely authenticated), we rely on req.user or admin override.

    // NOTE: If this is a public download endpoint, authentication might be skipped or handled differently.
    // However, the route definition suggests this one might be authenticated or at least expects tenantId.
    // For now assuming authenticated or internal use.

    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required for export' });

    const format = (req.query.format as string) || 'hosts';

    // Fetch manual domains
    const manualRes = await pool.query('SELECT domain FROM blocked_domains WHERE tenant_id = $1', [tenantId]);
    const manualDomains = manualRes.rows.map(r => r.domain);

    // Fetch subscribed domains
    const subRes = await pool.query(`
      SELECT b.domains 
      FROM dns_blocklists b
      JOIN tenant_blocklist_subscriptions s ON b.id = s.blocklist_id
      WHERE s.tenant_id = $1
    `, [tenantId]);

    let subscribedDomains: string[] = [];
    subRes.rows.forEach(row => {
      if (Array.isArray(row.domains)) {
        subscribedDomains = subscribedDomains.concat(row.domains);
      }
    });

    // Fetch excluded domains
    const exclusionsRes = await pool.query(
      'SELECT domain FROM tenant_domain_exclusions WHERE tenant_id = $1',
      [tenantId]
    );
    const excludedDomains = new Set(exclusionsRes.rows.map(r => r.domain));

    // Merge, deduplicate, and filter out exclusions
    const allDomains = Array.from(new Set([...manualDomains, ...subscribedDomains]))
      .filter(d => !excludedDomains.has(d))
      .sort();

    let content = '';
    if (format === 'hosts') {
      content = allDomains.map(d => `0.0.0.0 ${d}`).join('\n');
    } else if (format === 'json') {
      content = JSON.stringify(allDomains, null, 2);
    } else if (format === 'csv') {
      content = 'domain\n' + allDomains.join('\n');
    } else if (format === 'unbound') {
      content = allDomains.map(d => `local-zone: "${d}" redirect\nlocal-data: "${d} A 0.0.0.0"`).join('\n');
    } else if (format === 'bind') {
      // Simple RPZ style
      content = allDomains.map(d => `${d} CNAME .`).join('\n');
    } else {
      return res.status(400).json({ error: 'Unsupported format' });
    }
    // Determine Content-Type and file extension based on format
    const formatConfig: Record<string, { contentType: string; extension: string }> = {
      hosts: { contentType: 'text/plain', extension: 'hosts' },
      json: { contentType: 'text/plain', extension: 'json' },
      csv: { contentType: 'text/plain', extension: 'csv' },
      unbound: { contentType: 'text/plain', extension: 'conf' },
      bind: { contentType: 'text/plain', extension: 'zone' },
    };

    const config = formatConfig[format] || { contentType: 'text/plain', extension: 'txt' };

    res.header('Content-Type', config.contentType);
    res.header('Content-Disposition', `inline; filename="blocklist.${config.extension}"`);
    res.send(content);

  } catch (error) {
    console.error('Error in exportBlocklist:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}

// --- Download Token Managment (Mock/Simple Implementation) ---

// --- Download Token Managment ---

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Need to import exportBlockedIps from ip-controller
import { exportBlockedIps } from './ip-controller.js';

export async function generateDownloadToken(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant ID missing' });

    const { format = 'hosts', listType = 'dns' } = req.body;

    // Generate a token valid for 1 year
    const tokenPayload = {
      tenantId,
      type: 'blocklist_download',
      listType, // "dns" or "ip"
      jti: uuidv4()
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '365d' });

    // Calculate expiry date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Save token to database (always create new)
    await pool.query(
      `INSERT INTO tenant_download_tokens (tenant_id, token, format, list_type, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, token, format, listType, expiresAt]
    );

    res.status(200).json({ token, format, listType });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDownloadLinkInfo(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant ID missing' });

    const result = await pool.query(
      `SELECT token, format, list_type, expires_at FROM tenant_download_tokens 
       WHERE tenant_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching download link info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteDownloadToken(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant ID missing' });

    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await pool.query(
      'DELETE FROM tenant_download_tokens WHERE tenant_id = $1 AND token = $2',
      [tenantId, token]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting download token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadBlocklistByToken(req: Request, res: Response) {
  const { token, format } = req.params;
  if (!token) return res.status(400).send('Token required');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.tenantId || decoded.type !== 'blocklist_download') {
      return res.status(403).send('Invalid token');
    }

    // Verify token exists in database (revocation check)
    // This ensures that if the user deleted the link, the URL becomes invalid immediately
    const dbCheck = await pool.query(
      'SELECT 1 FROM tenant_download_tokens WHERE token = $1 AND tenant_id = $2',
      [token, decoded.tenantId]
    );
    if ((dbCheck.rowCount || 0) === 0) {
      return res.status(403).send('Link revoked or invalid');
    }

    // Set tenantId for export functions (they check req.user or req.query.tenantId)
    // Inject into req.user to ensure compatibility with all controllers that check req.user
    (req as any).user = { tenantId: decoded.tenantId };
    req.query.tenantId = decoded.tenantId;

    // Determine type
    const listType = decoded.listType || 'dns'; // default to dns for older tokens

    if (listType === 'ip') {
      // For IP, the format param in URL corresponds to 'equipment'
      req.query.equipment = format || (req.query.format as string);
      // If generateDownloadToken was called with format='mikrotik', that's what we expect here.
      // But allow override if user manually changes URL? Maybe better to stick to token format?
      // For flexibility, let's use the URL format param if present, else fallback

      return exportBlockedIps(req, res);
    } else {
      // DNS
      req.query.format = format || (req.query.format as string) || 'hosts';
      return exportBlocklist(req, res);
    }

  } catch (err) {
    console.error("Token verification failed", err);
    return res.status(403).send('Invalid or expired token');
  }
}