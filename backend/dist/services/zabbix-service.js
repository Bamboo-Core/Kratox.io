"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZabbixHosts = getZabbixHosts;
exports.getZabbixAlerts = getZabbixAlerts;
exports.getZabbixEventById = getZabbixEventById;
exports.getZabbixItemsForHost = getZabbixItemsForHost;
exports.getZabbixHistoryForItem = getZabbixHistoryForItem;
exports.getZabbixHostGroups = getZabbixHostGroups;
exports.getZabbixItemsForEvent = getZabbixItemsForEvent;
const axios_1 = __importDefault(require("axios"));
const zabbix_config_js_1 = require("../config/zabbix-config.js");
const database_js_1 = __importDefault(require("../config/database.js"));
const date_fns_1 = require("date-fns");
const feature_flag_service_js_1 = require("./feature-flag-service.js");
// --- MOCK DATA FOR RENDER/PRODUCTION TESTING ---
const MOCK_HOSTS_FOR_TESTING = [
    {
        hostid: "10501",
        name: "Router-SaoPaulo-Core",
        status: "0",
        description: "Core router for SP datacenter",
        groups: [{ groupid: "15", name: "Fibra Veloz - SP" }],
        interfaces: [{ interfaceid: "1", ip: "203.0.113.1", main: "1", type: "2" }],
        has_credentials: true
    },
    {
        hostid: "10502",
        name: "Router-RioJaneiro-Edge",
        status: "0",
        description: "Edge router for RJ office",
        groups: [{ groupid: "16", name: "Fibra Veloz - RJ" }],
        interfaces: [{ interfaceid: "2", ip: "198.51.100.5", main: "1", type: "2" }],
        has_credentials: false
    },
    {
        hostid: "10601",
        name: "acme-fw-01",
        status: "0",
        description: "Main Firewall ACME Inc",
        groups: [{ groupid: "4", name: "ACME Inc." }],
        interfaces: [{ interfaceid: "3", ip: "192.0.2.10", main: "1", type: "1" }],
        has_credentials: true
    },
];
const MOCK_ALERTS_FOR_TESTING = [
    {
        eventid: "50123",
        name: "High latency to Google DNS on Router-SaoPaulo-Core",
        severity: "3", // Average
        acknowledged: "0",
        clock: String(Math.floor((Date.now() / 1000) - 60 * 5)), // 5 minutes ago
        hosts: [{ hostid: "10501", name: "Router-SaoPaulo-Core" }],
    },
    {
        eventid: "50124",
        name: "Host acme-fw-01 is unreachable",
        severity: "5", // Disaster
        acknowledged: "0",
        clock: String(Math.floor((Date.now() / 1000) - 60 * 60 * 2)), // 2 hours ago
        hosts: [{ hostid: "10601", name: "acme-fw-01" }],
    },
    {
        eventid: "50125",
        name: "Packet loss detected on link to gateway 198.51.100.1",
        severity: "4", // High
        acknowledged: "0",
        clock: String(Math.floor((Date.now() / 1000) - 60 * 30)), // 30 minutes ago
        hosts: [{ hostid: "10502", name: "Router-RioJaneiro-Edge" }],
    },
    {
        eventid: "50126",
        name: "CPU utilization is above 90% on acme-fw-01",
        severity: "2", // Warning
        acknowledged: "1",
        clock: String(Math.floor((Date.now() / 1000) - 60 * 60 * 24)), // 1 day ago
        hosts: [{ hostid: "10601", name: "acme-fw-01" }],
    },
];
// Generic function to make requests to the Zabbix API
async function zabbixApiRequest(method, params, tenantId) {
    const { apiUrl, apiToken } = zabbix_config_js_1.zabbixConfig;
    // If Zabbix is not configured, log it and return an empty array immediately.
    if (!apiUrl || !apiToken || !apiUrl.startsWith('http')) {
        console.warn(`[Zabbix Service] Tenant ${tenantId}: Zabbix API is not configured or URL is invalid. Returning empty data.`);
        return [];
    }
    try {
        const response = await axios_1.default.post(apiUrl, {
            jsonrpc: '2.0',
            method: method,
            params: params,
            auth: apiToken,
            id: 1,
        }, {
            headers: { 'Content-Type': 'application/json-rpc' },
            // No timeout for now to handle slow Zabbix APIs
        });
        if (response.data.error) {
            console.error(`[Zabbix Service] API Error for tenant ${tenantId}:`, response.data.error);
            throw new Error(`Zabbix API Error: ${response.data.error.message} - ${response.data.error.data}`);
        }
        return response.data.result;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error(`[Zabbix Service] Axios error connecting to Zabbix for tenant ${tenantId}:`, error.message);
            if (error.response) {
                console.error('Zabbix API Response Error Data:', error.response.data);
            }
            else if (error.code === 'ECONNABORTED') {
                console.error('The request to Zabbix timed out or could not be completed.');
            }
            else {
                console.error('A network error occurred while trying to connect to Zabbix.');
            }
        }
        else {
            console.error(`[Zabbix Service] An unexpected error occurred for tenant ${tenantId}:`, error);
        }
        throw new Error('Failed to communicate with the Zabbix API. Check backend logs for details.');
    }
}
/**
 * Checks if the mock service should be used, either by environment variable or feature flag.
 */
function isMockEnabled(tenantId) {
    if (process.env.USE_ZABBIX_MOCK === 'true') {
        return true;
    }
    return (0, feature_flag_service_js_1.getFeatureFlag)('use_zabbix_mock', tenantId);
}
/**
 * Fetches the list of monitored hosts from Zabbix and enriches them with credential status.
 * @param tenantId The ID of the tenant making the request.
 * @param groupids Optional array of host group IDs to filter by.
 * @param hostids Optional array of host IDs to filter by.
 * @param isAdmin Flag to indicate if the requesting user is an admin.
 * @returns A promise that resolves to a list of Zabbix hosts.
 */
async function getZabbixHosts(tenantId, groupids, hostids, isAdmin = false) {
    if (isMockEnabled(tenantId)) {
        console.log(`[Zabbix Mock] ON for getZabbixHosts | Tenant: ${tenantId}, Groups: ${groupids}`);
        const groupidsStr = (groupids ?? []).map(String);
        if (groupidsStr.length > 0) {
            const filtered = MOCK_HOSTS_FOR_TESTING.filter(host => host.groups.some(group => groupidsStr.includes(String(group.groupid))));
            return JSON.parse(JSON.stringify(filtered));
        }
        return JSON.parse(JSON.stringify(MOCK_HOSTS_FOR_TESTING));
    }
    const logParts = [`[Zabbix Service] Fetching hosts for tenant: ${tenantId}`];
    if (groupids)
        logParts.push(`for groups: ${groupids.join(',')}`);
    if (hostids)
        logParts.push(`for hosts: ${hostids.join(',')}`);
    console.log(logParts.join(' '));
    const params = {
        output: ['hostid', 'name', 'status', 'description'],
        selectInterfaces: 'extend',
        selectGroups: 'extend'
    };
    if (groupids && groupids.length > 0) {
        params.groupids = groupids;
    }
    if (hostids && hostids.length > 0) {
        params.hostids = hostids;
    }
    const hosts = await zabbixApiRequest('host.get', params, tenantId);
    // Enrich hosts with credential status
    if (hosts.length > 0) {
        const hostIdsFromZabbix = hosts.map(h => h.hostid);
        let query = 'SELECT host_id FROM device_credentials WHERE host_id = ANY($1::text[])';
        const queryParams = [hostIdsFromZabbix];
        // If NOT admin, filter by tenantId. If admin, search across all tenants.
        if (!isAdmin) {
            query += ' AND tenant_id = $2';
            queryParams.push(tenantId);
        }
        const credsResult = await database_js_1.default.query(query, queryParams);
        const hostsWithCreds = new Set(credsResult.rows.map(row => row.host_id));
        return hosts.map(host => ({
            ...host,
            has_credentials: hostsWithCreds.has(host.hostid)
        }));
    }
    return hosts;
}
/**
 * Fetches the list of active alerts (problems) from Zabbix.
 * This function now uses 'event.get' to ensure host data is embedded, as validated.
 * @param tenantId The ID of the tenant making the request.
 * @param dateFilter Optional object with time_from and time_to for filtering.
 * @param groupids Optional array of host group IDs to filter by.
 * @returns A promise that resolves to a list of Zabbix alerts.
 */
async function getZabbixAlerts(tenantId, dateFilter = {}, groupids) {
    if (isMockEnabled(tenantId)) {
        console.log(`[Zabbix Mock] ON for getZabbixAlerts | Tenant: ${tenantId}, Groups: ${groupids}`);
        const groupidsStr = (groupids ?? []).map(String);
        if (groupidsStr.length === 0) {
            console.log('[Zabbix Mock] No group filter, returning all mock alerts.');
            return JSON.parse(JSON.stringify(MOCK_ALERTS_FOR_TESTING));
        }
        const hostsInGroup = MOCK_HOSTS_FOR_TESTING.filter(host => host.groups.some(g => groupidsStr.includes(String(g.groupid))));
        const hostIdsInGroup = new Set(hostsInGroup.map(h => String(h.hostid)));
        console.log(`[Zabbix Mock] Found host IDs in group(s) ${groupidsStr}:`, Array.from(hostIdsInGroup));
        const filteredAlerts = MOCK_ALERTS_FOR_TESTING.filter(alert => alert.hosts.some(h => hostIdsInGroup.has(String(h.hostid))));
        console.log(`[Zabbix Mock] Returning ${filteredAlerts.length} filtered alerts.`);
        return JSON.parse(JSON.stringify(filteredAlerts));
    }
    console.log(`[Zabbix Service] Fetching alerts via event.get for tenant: ${tenantId}`);
    // This is the corrected parameter set, matching the user's validated test.
    const eventParams = {
        // Core parameters to get active problem events
        object: '0', // Events generated by a trigger
        value: '1', // Problem events (alert is active)
        // Data to retrieve
        output: 'extend',
        selectHosts: 'extend', // *** The crucial parameter to embed host data ***
        // Sorting and filtering
        sortfield: ['clock', 'eventid'],
        sortorder: 'DESC',
    };
    // Apply dynamic filters
    if (dateFilter.time_from)
        eventParams.time_from = dateFilter.time_from;
    if (dateFilter.time_to)
        eventParams.time_to = dateFilter.time_to;
    if (groupids && groupids.length > 0)
        eventParams.groupids = groupids;
    // Make the API call
    const alerts = await zabbixApiRequest('event.get', eventParams, tenantId);
    return alerts;
}
/**
 * Fetches a single Zabbix event by its ID.
 * @param eventId The ID of the event to fetch.
 * @returns A promise that resolves to the Zabbix event object or null if not found.
 */
async function getZabbixEventById(eventId) {
    // For this call, we don't have a tenantId yet, so we use a placeholder.
    // The API key is global, so the call will succeed regardless.
    const tenantIdPlaceholder = 'system-event-lookup';
    if (isMockEnabled(tenantIdPlaceholder)) {
        console.log(`[Zabbix Mock] ON for getZabbixEventById | Event: ${eventId}`);
        const found = MOCK_ALERTS_FOR_TESTING.find(a => a.eventid === eventId);
        return found ? JSON.parse(JSON.stringify(found)) : null;
    }
    console.log(`[Zabbix Service] Fetching event details for eventId: ${eventId}`);
    const params = {
        output: 'extend',
        eventids: [eventId],
        select_acknowledges: 'extend',
        selectHosts: 'extend', // Important to get host info
    };
    const events = await zabbixApiRequest('event.get', params, tenantIdPlaceholder);
    return events.length > 0 ? events[0] : null;
}
/**
 * Fetches the list of available items (metrics) for a specific Zabbix host.
 * @param tenantId The ID of the tenant making the request.
 * @param hostId The ID of the Zabbix host.
 * @returns A promise that resolves to a list of Zabbix items.
 */
async function getZabbixItemsForHost(tenantId, hostId) {
    console.log(`[Zabbix Service] Fetching items for host ${hostId} for tenant: ${tenantId}`);
    const params = {
        output: ['itemid', 'name', 'key_', 'value_type', 'units', 'lastvalue'],
        hostids: hostId,
        sortfield: 'name',
        sortorder: 'ASC',
    };
    return await zabbixApiRequest('item.get', params, tenantId);
}
/**
 * Fetches historical data for a specific Zabbix item.
 * @param tenantId The ID of the tenant making the request.
 * @param itemId The ID of the Zabbix item.
 * @param historyType The type of history to retrieve ('0' for float, '3' for int).
 * @param dateFilter Optional date range. Defaults to the last 24 hours.
 * @returns A promise that resolves to a list of history data points.
 */
async function getZabbixHistoryForItem(tenantId, itemId, historyType, dateFilter = {}) {
    console.log(`[Zabbix Service] Fetching history for item ${itemId} for tenant: ${tenantId}`);
    // Default to last 24 hours if no time range is provided
    const time_from = dateFilter.time_from || Math.floor((0, date_fns_1.subDays)(new Date(), 1).getTime() / 1000).toString();
    const params = {
        output: 'extend',
        history: historyType,
        itemids: [itemId],
        sortfield: 'clock',
        sortorder: 'ASC',
        time_from,
    };
    if (dateFilter.time_to) {
        params.time_to = dateFilter.time_to;
    }
    return await zabbixApiRequest('history.get', params, tenantId);
}
/**
 * Fetches the list of all host groups from Zabbix.
 * @param tenantId The ID of the tenant making the request.
 * @returns A promise that resolves to a list of Zabbix host groups.
 */
async function getZabbixHostGroups(tenantId) {
    console.log(`[Zabbix Service] Fetching host groups for tenant: ${tenantId}`);
    const params = {
        output: ['groupid', 'name'],
        sortfield: 'name',
        sortorder: 'ASC',
    };
    return await zabbixApiRequest('hostgroup.get', params, tenantId);
}
/**
 * Fetches the items associated with a specific Zabbix event ID.
 * @param tenantId The ID of the tenant making the request.
 * @param eventId The ID of the Zabbix event.
 * @returns A promise that resolves to a list of Zabbix items.
 */
async function getZabbixItemsForEvent(tenantId, eventId) {
    console.log(`[Zabbix Service] Fetching items for event ${eventId} for tenant: ${tenantId}`);
    // 1. Get the event to find the trigger ID (objectid)
    const eventParams = {
        output: ['objectid'],
        eventids: [eventId],
    };
    const events = await zabbixApiRequest('event.get', eventParams, tenantId);
    if (!events || events.length === 0) {
        console.warn(`[Zabbix Service] No event found with ID ${eventId}`);
        return [];
    }
    const triggerId = events[0].objectid;
    // 2. Get the trigger to find the associated items
    const triggerParams = {
        output: [],
        triggerids: [triggerId],
        selectItems: ['itemid', 'name', 'key_', 'value_type', 'units'],
    };
    const triggers = await zabbixApiRequest('trigger.get', triggerParams, tenantId);
    if (!triggers || triggers.length === 0 || !triggers[0].items) {
        console.warn(`[Zabbix Service] No trigger or items found for trigger ID ${triggerId}`);
        return [];
    }
    // 3. Return the items from the trigger
    return triggers[0].items;
}
