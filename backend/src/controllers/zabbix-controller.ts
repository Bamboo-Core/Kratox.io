

import type { Request, Response } from 'express';
import * as zabbixService from '../services/zabbix-service.js';
import { processZabbixEvent } from '../services/rule-engine-service.js';
import { getFeatureFlag } from '../services/feature-flag-service.js';
import type { ZabbixEventPayload } from '../services/rule-engine-service.js';

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
    
    // Pass the 'isAdmin' flag to the service function
    const hosts = await zabbixService.getZabbixHosts(tenantId, groupFilter, undefined, role === 'admin');
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
 * Handles the request to get historical data for a specific Zabbix item.
 */
export async function getItemHistory(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
    }
    const tenantId = req.user.tenantId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required.' });
    }
    
    // The history type (0: float, 3: int) and time range are passed as query params
    const { historyType, time_from, time_to } = req.query;

    if (!historyType || (historyType !== '0' && historyType !== '3')) {
        return res.status(400).json({ error: 'A valid historyType (0 for float, 3 for integer) is required.' });
    }

    const history = await zabbixService.getZabbixHistoryForItem(
        tenantId,
        itemId,
        historyType as '0' | '3',
        {
          time_from: typeof time_from === 'string' ? time_from : undefined,
          time_to: typeof time_to === 'string' ? time_to : undefined
        }
    );
    res.status(200).json(history);

  } catch (error) {
    console.error('Error in getItemHistory controller:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve Zabbix item history.', details: message });
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
 * This is the entry point for the automation rules engine.
 */
export async function handleZabbixEvent(req: Request, res: Response) {
  try {
    console.log('--- ZABBIX EVENT RECEIVED ---');
    // We send a 200 OK response immediately to Zabbix to prevent timeouts.
    // The actual processing will happen asynchronously.
    res.status(200).json({ status: 'success', message: 'Event received and queued for processing.' });

    // Asynchronously process the event without holding up the response
    processZabbixEvent(req.body).catch(err => {
        console.error('--- ERROR PROCESSING ZABBIX EVENT ASYNCHRONOUSLY ---');
        console.error(err);
    });

  } catch (error) {
    console.error('Error in handleZabbixEvent controller:', error);
    // This will only catch errors in the initial synchronous part
    res.status(500).json({ status: 'error', message: 'Internal server error processing event.' });
  }
}

/**
 * Handles a test request to trigger the rule engine with mock data.
 * This endpoint is controlled by a feature flag.
 */
export async function handleTestZabbixEvent(req: Request, res: Response) {
    const { tenantId, zabbix_hostgroup_ids } = req.user || {};
    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }

    // Check if the feature flag is enabled for this tenant
    if (!getFeatureFlag('test_automation_rule_trigger', tenantId)) {
        return res.status(403).json({ error: 'Forbidden: Test trigger is not enabled for this tenant.' });
    }
    
    // Mock a Zabbix payload. Use a mock event ID.
    // The rule engine will now use this ID to fetch event details.
    const mockPayload: ZabbixEventPayload = {
      eventid: "50123", // Using a valid mock event ID from zabbix-service
    };
    
    try {
        console.log('--- MANUAL TEST EVENT TRIGGERED ---');
        res.status(202).json({ status: 'accepted', message: 'Test event accepted and is being processed.', details: mockPayload });

        processZabbixEvent(mockPayload).catch(err => {
            console.error('--- ERROR PROCESSING TEST EVENT ASYNCHRONOUSLY ---');
            console.error(err);
        });

    } catch (error) {
        console.error('Error in handleTestZabbixEvent controller:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error processing test event.' });
    }
}


/**
 * Handles the request to get the items associated with a specific Zabbix event.
 */
export async function getItemsForEvent(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
    }
    const tenantId = req.user.tenantId;
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required.' });
    }
    
    const items = await zabbixService.getZabbixItemsForEvent(tenantId, eventId);
    res.status(200).json(items);

  } catch (error) {
    console.error(`Error in getItemsForEvent controller for event ${req.params.eventId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to retrieve items for the event.', details: message });
  }
}
