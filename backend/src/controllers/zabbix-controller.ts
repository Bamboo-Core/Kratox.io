
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

    const { time_from, time_to } = req.query;

    const alerts = await zabbixService.getZabbixAlerts(tenantId, {
      time_from: typeof time_from === 'string' ? time_from : undefined,
      time_to: typeof time_to === 'string' ? time_to : undefined,
    });
    
    res.status(200).json(alerts);

  } catch (error)
 {
    console.error('Error in getAlerts controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix alerts.', details: message });
  }
}

/**
 * Handles the request to get the list of items for a specific Zabbix host.
 */
export async function getHostItems(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Host ID is required.' });
    }
    
    const items = await zabbixService.getZabbixItemsForHost(tenantId, hostId);
    res.status(200).json(items);

  } catch (error) {
    console.error('Error in getHostItems controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix host items.', details: message });
  }
}
