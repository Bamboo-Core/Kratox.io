import type { Request, Response } from 'express';
import pool from '../config/database.js';
import { isIP, isIPv4, isIPv6 } from 'node:net';

const isValidIpOrCidr = (input: string): boolean => {
    if (isIP(input) !== 0) return true;

    const [ip, prefix] = input.split('/');
    if (!ip || !prefix) return false;

    const prefixNum = parseInt(prefix, 10);
    if (isNaN(prefixNum)) return false;

    if (isIPv4(ip)) {
        return prefixNum >= 0 && prefixNum <= 32;
    }

    if (isIPv6(ip)) {
        return prefixNum >= 0 && prefixNum <= 128;
    }

    return false;
};

const ipToLong = (ip: string) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

const longToIp = (long: number) => {
    return [
        (long >>> 24) & 255,
        (long >>> 16) & 255,
        (long >>> 8) & 255,
        long & 255
    ].join('.');
};

const normalizeCidr = (input: string): string => {
    if (!input.includes('/')) return input;

    const [ip, prefixStr] = input.split('/');

    if (isIPv4(ip)) {
        const prefix = parseInt(prefixStr, 10);
        if (isNaN(prefix) || prefix < 0 || prefix > 32) return input;

        const mask = prefix === 0 ? 0 : (-1 << (32 - prefix));

        const ipLong = ipToLong(ip);
        const netLong = (ipLong & mask) >>> 0;

        return `${longToIp(netLong)}/${prefix}`;
    }

    return input;
};

export async function getBlockedIps(req: Request, res: Response) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const result = await pool.query(
            'SELECT *, ip_address as domain FROM blocked_ips WHERE tenant_id = $1 ORDER BY "blockedAt" DESC',
            [tenantId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error in getBlockedIps:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve blocked IPs.', details: message });
    }
}

export async function addBlockedIp(req: Request, res: Response) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const { ip } = req.body;
        if (!ip || typeof ip !== 'string') {
            return res.status(400).json({ error: 'IP address or CIDR is required and must be a string.' });
        }

        if (!isValidIpOrCidr(ip)) {
            return res.status(400).json({ error: 'Invalid format. Must be a valid IP address or CIDR range.' });
        }

        const normalizedIp = normalizeCidr(ip);

        const result = await pool.query(
            'INSERT INTO blocked_ips (ip_address, tenant_id) VALUES ($1, $2) RETURNING *',
            [normalizedIp, tenantId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error in addBlockedIp:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        // Handle potential unique constraint violation
        if (error instanceof Error && 'code' in error && (error as any).code === '23505') {
            return res
                .status(409)
                .json({ error: 'This IP address is already in the blocklist for this tenant.' });
        }
        res.status(500).json({ error: 'Failed to add blocked IP.', details: message });
    }
}

// DELETE handler to remove a blocked IP
export async function removeBlockedIp(req: Request, res: Response) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM blocked_ips WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (result.rowCount && result.rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'IP with the specified ID not found for this tenant.' });
        }
    } catch (error) {
        console.error('Error in removeBlockedIp:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to remove blocked IP.', details: message });
    }
}

// PUT handler to update a blocked IP
export async function updateBlockedIp(req: Request, res: Response) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const { id } = req.params;
        const { ip } = req.body;

        if (!ip || typeof ip !== 'string') {
            return res.status(400).json({ error: 'IP address or CIDR is required and must be a string.' });
        }

        if (!isValidIpOrCidr(ip)) {
            return res.status(400).json({ error: 'Invalid format. Must be a valid IP address or CIDR range.' });
        }

        const normalizedIp = normalizeCidr(ip);

        const result = await pool.query(
            'UPDATE blocked_ips SET ip_address = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
            [normalizedIp, id, tenantId]
        );

        if (result.rowCount && result.rowCount > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'IP with the specified ID not found for this tenant.' });
        }
    } catch (error) {
        console.error('Error in updateBlockedIp:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';

        if (error instanceof Error && 'code' in error && (error as any).code === '23505') {
            return res
                .status(409)
                .json({ error: 'This IP address is already in the blocklist for this tenant.' });
        }

        res.status(500).json({ error: 'Failed to update blocked IP.', details: message });
    }
}

export async function removeAllBlockedIps(req: Request, res: Response) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }

        await pool.query(
            'DELETE FROM blocked_ips WHERE tenant_id = $1',
            [tenantId]
        );

        res.status(204).send();
    } catch (error) {
        console.error('Error in removeAllBlockedIps:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to remove all blocked IPs.', details: message });
    }
}
