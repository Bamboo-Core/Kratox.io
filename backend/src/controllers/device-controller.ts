
import type { Request, Response } from 'express';
import * as zabbixService from '../services/zabbix-service.js';
import { executeCommandViaNetmiko } from '../services/netmiko-service.js';
import pool from '../config/database.js';
import { encrypt, decrypt } from '../utils/crypto.js';

/**
 * Handles the request to execute a command on a network device.
 */
export async function runCommandOnDevice(req: Request, res: Response) {
  const { hostId, command } = req.body;

  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
  }
  const { tenantId } = req.user;

  if (!hostId || !command) {
    return res.status(400).json({ error: 'hostId and command are required.' });
  }

  try {
    // 1. Get host details from Zabbix to find its IP address
    const hosts = await zabbixService.getZabbixHosts(tenantId, undefined, [hostId]);
    const host = hosts[0];

    if (!host) {
      return res.status(404).json({ error: 'Host not found in Zabbix.' });
    }
    
    // Find the primary IP address from the interfaces
    const primaryInterface = host.interfaces.find(iface => iface.main === '1');
    const hostIp = primaryInterface?.ip;

    if (!hostIp) {
      return res.status(404).json({ error: 'Could not determine IP address for the host.' });
    }

    // 2. Fetch credentials for the host from our database
    const credsResult = await pool.query(
        'SELECT username, encrypted_password, port FROM device_credentials WHERE host_id = $1 AND tenant_id = $2',
        [hostId, tenantId]
    );

    if (credsResult.rowCount === 0) {
        return res.status(404).json({ error: 'Credentials for this device are not configured.' });
    }
    
    const credentials = credsResult.rows[0];
    const decryptedPassword = decrypt(credentials.encrypted_password);

    // 3. Prepare payload for the Netmiko service, now including credentials
    const payload = {
        host: hostIp,
        device_type: 'huawei', // Placeholder - this could be dynamic in the future
        command: command,
        username: credentials.username,
        password: decryptedPassword,
        port: credentials.port || 22, // Use saved port or default to 22
    };

    // 4. Execute the command via the Netmiko service
    const result = await executeCommandViaNetmiko(payload);

    // 5. Return the result
    res.status(200).json({ output: result });

  } catch (error) {
    console.error(`Error in runCommandOnDevice for hostId ${hostId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to execute command.', details: message });
  }
}

/**
 * Saves or updates credentials for a specific device.
 */
export async function saveDeviceCredentials(req: Request, res: Response) {
    const { hostId } = req.params;
    const { username, password, port } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    // Validate port if provided
    if (port && (isNaN(parseInt(port, 10)) || parseInt(port, 10) <= 0 || parseInt(port, 10) > 65535)) {
        return res.status(400).json({ error: 'Invalid port number provided.' });
    }

    try {
        const encryptedPassword = encrypt(password);
        const dbPort = port ? parseInt(port, 10) : null; // Store as number or NULL

        const query = `
            INSERT INTO device_credentials (host_id, tenant_id, username, encrypted_password, port)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (host_id, tenant_id) DO UPDATE 
            SET username = EXCLUDED.username, encrypted_password = EXCLUDED.encrypted_password, port = EXCLUDED.port, updated_at = NOW();
        `;
        await pool.query(query, [hostId, tenantId, username, encryptedPassword, dbPort]);

        res.status(200).json({ message: 'Credentials saved successfully.' });
    } catch (error) {
        console.error(`Error saving credentials for hostId ${hostId}:`, error);
        res.status(500).json({ error: 'Failed to save credentials.' });
    }
}

/**
 * Checks if credentials exist for a specific device.
 */
export async function checkDeviceCredentials(req: Request, res: Response) {
    const { hostId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    try {
        const result = await pool.query(
            'SELECT 1 FROM device_credentials WHERE host_id = $1 AND tenant_id = $2',
            [hostId, tenantId]
        );
        res.status(200).json({ has_credentials: result.rowCount ? result.rowCount > 0 : false });
    } catch (error) {
        console.error(`Error checking credentials for hostId ${hostId}:`, error);
        res.status(500).json({ error: 'Failed to check credentials status.' });
    }
}

    