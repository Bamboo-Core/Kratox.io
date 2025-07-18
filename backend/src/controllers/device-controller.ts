
import type { Request, Response } from 'express';
import * as zabbixService from '../services/zabbix-service.js';
import { executeCommandViaNetmiko } from '../services/netmiko-service.js';

/**
 * Handles the request to execute a command on a network device.
 */
export async function runCommandOnDevice(req: Request, res: Response) {
  const { hostId, command } = req.body;

  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
  }

  if (!hostId || !command) {
    return res.status(400).json({ error: 'hostId and command are required.' });
  }

  try {
    // 1. Get host details from Zabbix to find its IP address
    const hosts = await zabbixService.getZabbixHosts(req.user.tenantId, undefined, [hostId]);
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

    // 2. Prepare payload for the Netmiko service
    // O device_type é um placeholder. Em um sistema real, isso viria do banco de dados/Zabbix.
    const payload = {
        host: hostIp,
        device_type: 'cisco_ios', // Placeholder - assumindo Cisco IOS
        command: command
    };

    // 3. Execute the command via the Netmiko service
    const result = await executeCommandViaNetmiko(payload);

    // 4. Return the result
    res.status(200).json({ output: result });

  } catch (error) {
    console.error(`Error in runCommandOnDevice for hostId ${hostId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to execute command.', details: message });
  }
}
