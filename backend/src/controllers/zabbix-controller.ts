
import type { Request, Response } from 'express';
import * as zabbixService from '../services/zabbix-service.js';

/**
 * Handles the request to get the list of Zabbix hosts.
 * Filters by user's host groups if the user is not an admin.
 */
export async function getHosts(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    // Apply host group filter only for non-admin users who have groups assigned
    const groupids = req.user?.role !== 'admin' && req.user.zabbix_hostgroup_ids.length > 0
        ? req.user.zabbix_hostgroup_ids
        : undefined;
    
    const hosts = await zabbixService.getZabbixHosts(tenantId, groupids);
    res.status(200).json(hosts);

  } catch (error) {
    console.error('Error in getHosts controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix hosts.', details: message });
  }
}

/**
 * Handles the request to get the list of active Zabbix alerts.
 * Filters by user's host groups if the user is not an admin.
 */
export async function getAlerts(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    // Apply host group filter only for non-admin users who have groups assigned
    const groupids = req.user?.role !== 'admin' && req.user.zabbix_hostgroup_ids.length > 0
        ? req.user.zabbix_hostgroup_ids
        : undefined;

    const { time_from, time_to } = req.query;

    const alerts = await zabbixService.getZabbixAlerts(
        tenantId,
        {
            time_from: typeof time_from === 'string' ? time_from : undefined,
            time_to: typeof time_to === 'string' ? time_to : undefined,
        },
        groupids
    );
    
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

/**
 * Handles the request to get the list of Zabbix host groups.
 */
export async function getHostGroups(req: Request, res: Response) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        
        const hostGroups = await zabbixService.getZabbixHostGroups(tenantId);
        res.status(200).json(hostGroups);

    } catch (error) {
        console.error('Error in getHostGroups controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix host groups.', details: message });
    }
}
