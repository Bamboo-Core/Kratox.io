
import type { Request, Response } from 'express';
import * as zabbixService from '../services/zabbix-service.js';

/**
 * Handles the request to get the list of Zabbix hosts.
 */
export async function getHosts(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    
    // Calls the service layer to get the data (currently mocked)
    const hosts = await zabbixService.getZabbixHosts(tenantId);
    res.status(200).json(hosts);

  } catch (error) {
    console.error('Error in getHosts controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix hosts.', details: message });
  }
}

/**
 * Handles the request to get the list of active Zabbix alerts.
 */
export async function getAlerts(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    // Pass time_from and time_to from query parameters to the service
    const { time_from, time_to } = req.query;

    const alerts = await zabbixService.getZabbixAlerts(tenantId, {
      time_from: time_from as string | undefined,
      time_to: time_to as string | undefined,
    });
    
    res.status(200).json(alerts);

  } catch (error) {
    console.error('Error in getAlerts controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix alerts.', details: message });
  }
}
