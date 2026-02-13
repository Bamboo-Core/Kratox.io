"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHosts = getHosts;
exports.getAlerts = getAlerts;
exports.getHostItems = getHostItems;
exports.getItemHistory = getItemHistory;
exports.getHostGroups = getHostGroups;
exports.handleZabbixEvent = handleZabbixEvent;
exports.handleTestZabbixEvent = handleTestZabbixEvent;
exports.getItemsForEvent = getItemsForEvent;
const zabbixService = __importStar(require("../services/zabbix-service.js"));
const rule_engine_service_js_1 = require("../services/rule-engine-service.js");
const feature_flag_service_js_1 = require("../services/feature-flag-service.js");
const supabase_service_js_1 = require("../services/supabase-service.js");
/**
 * Handles the request to get the list of Zabbix hosts.
 * - Admin without groupid query: gets all hosts.
 * - Admin with groupid query: gets hosts from that specific group.
 * - Cliente: gets hosts only from their assigned groups.
 */
async function getHosts(req, res) {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
        }
        const { tenantId, role, zabbix_hostgroup_ids } = req.user;
        const { groupid } = req.query; // Admin can filter by a specific group
        let groupFilter;
        if (role === 'admin') {
            // If admin provides a specific groupid, use it
            if (typeof groupid === 'string' && groupid !== 'all') {
                groupFilter = [groupid];
            }
            // If admin doesn't provide a groupid or selects 'all', groupFilter remains undefined (get all)
        }
        else {
            // For non-admin, always use their assigned groups, ignoring any query parameter for security.
            if (zabbix_hostgroup_ids.length > 0) {
                groupFilter = zabbix_hostgroup_ids;
            }
            else {
                // If a non-admin has no groups, they see no hosts.
                return res.status(200).json([]);
            }
        }
        // Pass the 'isAdmin' flag to the service function
        const hosts = await zabbixService.getZabbixHosts(tenantId, groupFilter, undefined, role === 'admin');
        res.status(200).json(hosts);
    }
    catch (error) {
        console.error('Error in getHosts controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix hosts.', details: message });
    }
}
/**
 * Handles the request to get the list of active Zabbix alerts.
 * Filtering logic mirrors getHosts.
 */
async function getAlerts(req, res) {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
        }
        const { tenantId, role, zabbix_hostgroup_ids } = req.user;
        const { time_from, time_to, groupid } = req.query; // Admin can filter by group
        let groupFilter;
        if (role === 'admin') {
            if (typeof groupid === 'string' && groupid !== 'all') {
                groupFilter = [groupid];
            }
        }
        else {
            if (zabbix_hostgroup_ids.length > 0) {
                groupFilter = zabbix_hostgroup_ids;
            }
            else {
                // If a non-admin has no groups, they see no alerts.
                return res.status(200).json([]);
            }
        }
        const alerts = await zabbixService.getZabbixAlerts(tenantId, {
            time_from: typeof time_from === 'string' ? time_from : undefined,
            time_to: typeof time_to === 'string' ? time_to : undefined,
        }, groupFilter);
        res.status(200).json(alerts);
    }
    catch (error) {
        console.error('Error in getAlerts controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix alerts.', details: message });
    }
}
/**
 * Handles the request to get the list of items for a specific Zabbix host.
 */
async function getHostItems(req, res) {
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
    }
    catch (error) {
        console.error('Error in getHostItems controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix host items.', details: message });
    }
}
/**
 * Handles the request to get historical data for a specific Zabbix item.
 */
async function getItemHistory(req, res) {
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
        const history = await zabbixService.getZabbixHistoryForItem(tenantId, itemId, historyType, {
            time_from: typeof time_from === 'string' ? time_from : undefined,
            time_to: typeof time_to === 'string' ? time_to : undefined
        });
        res.status(200).json(history);
    }
    catch (error) {
        console.error('Error in getItemHistory controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix item history.', details: message });
    }
}
/**
 * Handles the request to get the list of Zabbix host groups.
 */
async function getHostGroups(req, res) {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
        }
        const tenantId = req.user.tenantId;
        const hostGroups = await zabbixService.getZabbixHostGroups(tenantId);
        res.status(200).json(hostGroups);
    }
    catch (error) {
        console.error('Error in getHostGroups controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve Zabbix host groups.', details: message });
    }
}
/**
 * Handles incoming event notifications from Zabbix via webhook.
 * This is the entry point for the automation rules engine.
 * Also saves the alert to Supabase for dashboard display.
 */
async function handleZabbixEvent(req, res) {
    try {
        console.log('--- ZABBIX EVENT RECEIVED ---');
        console.log('Payload:', JSON.stringify(req.body, null, 2));
        // We send a 200 OK response immediately to Zabbix to prevent timeouts.
        res.status(200).json({ status: 'success', message: 'Event received and queued for processing.' });
        const eventId = req.body.eventid;
        if (!eventId) {
            console.warn('[Webhook] Payload missing eventid, cannot save to Supabase');
        }
        else {
            // Fetch full event details from Zabbix API
            const event = await zabbixService.getZabbixEventById(eventId);
            if (event) {
                const hostId = event.hosts?.[0]?.hostid;
                if (hostId) {
                    const tenantId = await (0, rule_engine_service_js_1.findTenantIdFromHost)(hostId);
                    if (tenantId) {
                        // Build full payload with event data
                        const host = event.hosts?.[0];
                        const fullPayload = {
                            eventid: event.eventid,
                            name: event.name,
                            severity: event.severity,
                            acknowledged: event.acknowledged,
                            clock: event.clock,
                            hostid: hostId,
                            hostname: host?.name || host?.host || 'Unknown',
                            hostgroups: host?.groups?.map((g) => g.name).join(',') || '',
                        };
                        (0, supabase_service_js_1.saveAlertToSupabase)(tenantId, fullPayload).catch(err => {
                            console.error('--- ERROR SAVING ALERT TO SUPABASE ---');
                            console.error(err);
                        });
                    }
                    else {
                        console.warn(`[Webhook] No tenant found for host ${hostId}`);
                    }
                }
            }
        }
        // Process automation rules (existing logic)
        (0, rule_engine_service_js_1.processZabbixEvent)(req.body).catch(err => {
            console.error('--- ERROR PROCESSING ZABBIX EVENT ASYNCHRONOUSLY ---');
            console.error(err);
        });
    }
    catch (error) {
        console.error('Error in handleZabbixEvent controller:', error);
        // This will only catch errors in the initial synchronous part
        res.status(500).json({ status: 'error', message: 'Internal server error processing event.' });
    }
}
/**
 * Handles a test request to trigger the rule engine with mock data.
 * This endpoint is controlled by a feature flag.
 */
async function handleTestZabbixEvent(req, res) {
    const { tenantId, zabbix_hostgroup_ids } = req.user || {};
    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    // Check if the feature flag is enabled for this tenant
    if (!(0, feature_flag_service_js_1.getFeatureFlag)('test_automation_rule_trigger', tenantId)) {
        return res.status(403).json({ error: 'Forbidden: Test trigger is not enabled for this tenant.' });
    }
    // Mock a Zabbix payload. Use a mock event ID.
    // The rule engine will now use this ID to fetch event details.
    const mockPayload = {
        eventid: "50123", // Using a valid mock event ID from zabbix-service
    };
    try {
        console.log('--- MANUAL TEST EVENT TRIGGERED ---');
        res.status(202).json({ status: 'accepted', message: 'Test event accepted and is being processed.', details: mockPayload });
        (0, rule_engine_service_js_1.processZabbixEvent)(mockPayload).catch(err => {
            console.error('--- ERROR PROCESSING TEST EVENT ASYNCHRONOUSLY ---');
            console.error(err);
        });
    }
    catch (error) {
        console.error('Error in handleTestZabbixEvent controller:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error processing test event.' });
    }
}
/**
 * Handles the request to get the items associated with a specific Zabbix event.
 */
async function getItemsForEvent(req, res) {
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
    }
    catch (error) {
        console.error(`Error in getItemsForEvent controller for event ${req.params.eventId}:`, error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve items for the event.', details: message });
    }
}
