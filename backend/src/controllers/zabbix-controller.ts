
import type { Request, Response } from 'express';
import * as zabbixService from '../services/zabbix-service.js';

/**
 * Handles the request to get the list of Zabbix hosts.
 * - Admin without groupid query: gets all hosts.
 * - Admin with groupid query: gets hosts from that specific group.
 * - Cliente: gets hosts only from their assigned groups.
 */
export async function getHosts(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
    }
    const { tenantId, role, zabbix_hostgroup_ids } = req.user;
    const { groupid } = req.query; // Admin can filter by a specific group

    let groupFilter: string[] | undefined;

    if (role === 'admin') {
        // If admin provides a specific groupid, use it
        if (typeof groupid === 'string' && groupid !== 'all') {
            groupFilter = [groupid];
        }
        // If admin doesn't provide a groupid or selects 'all', groupFilter remains undefined (get all)
    } else {
        // For non-admin, always use their assigned groups, ignoring any query parameter for security.
        if (zabbix_hostgroup_ids.length > 0) {
            groupFilter = zabbix_hostgroup_ids;
        } else {
            // If a non-admin has no groups, they see no hosts.
            return res.status(200).json([]); 
        }
    }
    
    const hosts = await zabbixService.getZabbixHosts(tenantId, groupFilter);
    res.status(200).json(hosts);

  } catch (error) {
    console.error('Error in getHosts controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix hosts.', details: message });
  }
}

/**
 * Handles the request to get the list of active Zabbix alerts.
 * Filtering logic mirrors getHosts.
 */
export async function getAlerts(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
    }
    const { tenantId, role, zabbix_hostgroup_ids } = req.user;
    const { time_from, time_to, groupid } = req.query; // Admin can filter by group

    let groupFilter: string[] | undefined;

    if (role === 'admin') {
        if (typeof groupid === 'string' && groupid !== 'all') {
            groupFilter = [groupid];
        }
    } else {
        if (zabbix_hostgroup_ids.length > 0) {
            groupFilter = zabbix_hostgroup_ids;
        } else {
             // If a non-admin has no groups, they see no alerts.
            return res.status(200).json([]);
        }
    }

    const alerts = await zabbixService.getZabbixAlerts(
        tenantId,
        {
            time_from: typeof time_from === 'string' ? time_from : undefined,
            time_to: typeof time_to === 'string' ? time_to : undefined,
        },
        groupFilter
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
    if (!req.user || !req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
    }
    const tenantId = req.user.tenantId;
    
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
        if (!req.user || !req.user.tenantId) {
            return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
        }
        const tenantId = req.user.tenantId;
        
        const hostGroups = await zabbixService.getZabbixHostGroups(tenantId);
        res.status(200).json(hostGroups);

    } catch (error) {
        console.error('Error in getHostGroups controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix host groups.', details: message });
    }
}


/**
 * Handles incoming event notifications from Zabbix via webhook.
 * This endpoint is designed to be called by Zabbix actions.
 * For now, it just logs the payload to inspect the data structure.
 */
export async function handleZabbixEvent(req: Request, res: Response) {
  try {
    console.log('--- ZABBIX EVENT RECEIVED ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('--- END ZABBIX EVENT ---');
    
    // In the future, this is where we would parse the body,
    // identify the tenant, and save the event to an `alert_history` table.

    res.status(200).json({ status: 'success', message: 'Event received successfully.' });
  } catch (error) {
    console.error('Error in handleZabbixEvent controller:', error);
    // Respond with an error but don't reveal internal details.
    res.status(500).json({ status: 'error', message: 'Internal server error processing event.' });
  }
}
