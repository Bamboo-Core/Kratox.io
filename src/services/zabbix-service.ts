

import axios from 'axios';
import { zabbixConfig } from '../config/zabbix-config.js';
import pool from '../config/database.js';
import { subDays } from 'date-fns';
import { getFeatureFlag } from './feature-flag-service.js';


// Define the type for a Zabbix Host Group
export interface ZabbixHostGroup {
    groupid: string;
    name: string;
}

export interface ZabbixHostInterface {
    interfaceid: string;
    ip: string;
    main: '0' | '1';
    type: string; // e.g. "1" for Agent
}

export interface ZabbixHost {
  hostid: string;
  name: string;
  status: string;
  description: string;
  groups: ZabbixHostGroup[];
  interfaces: ZabbixHostInterface[];
  has_credentials?: boolean; // Optional field to be enriched
}

// Interface for the minimal trigger data we need
interface ZabbixTrigger {
    triggerid: string;
    hosts: Array<{ hostid: string; name: string }>;
}

export interface ZabbixHistoryPoint {
    clock: string; // Unix timestamp
    value: string; // Value as a string
    ns: string;
}

interface ZabbixApiParams {
  output: any;
  selectHosts?: any;
  selectInterfaces?: any;
  selectGroups?: any;
  selectItems?: any;
  time_from?: string;
  time_to?: string;
  hostids?: string | string[];
  groupids?: string | string[];
  triggerids?: string[];
  itemids?: string[];
  eventids?: string[];
  history?: '0' | '3'; // 0 for float, 3 for integer
  sortfield?: string | string[];
  sortorder?: string;
  object?: '0'; // For event.get: only trigger-related events
  value?: '1'; // For event.get: only problem events
  [key: string]: any;
}

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
async function zabbixApiRequest(method: string, params: object, tenantId: string) {
  const { apiUrl, apiToken } = zabbixConfig;

  // If Zabbix is not configured, log it and return an empty array immediately.
  if (!apiUrl || !apiToken || !apiUrl.startsWith('http')) {
    console.warn(`[Zabbix Service] Tenant ${tenantId}: Zabbix API is not configured or URL is invalid. Returning empty data.`);
    return [];
  }

  try {
    const response = await axios.post(
      apiUrl,
      {
        jsonrpc: '2.0',
        method: method,
        params: params,
        auth: apiToken,
        id: 1,
      },
      {
        headers: { 'Content-Type': 'application/json-rpc' },
        // No timeout for now to handle slow Zabbix APIs
      }
    );

    if (response.data.error) {
      console.error(`[Zabbix Service] API Error for tenant ${tenantId}:`, response.data.error);
      throw new Error(`Zabbix API Error: ${response.data.error.message} - ${response.data.error.data}`);
    }

    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error(`[Zabbix Service] Axios error connecting to Zabbix for tenant ${tenantId}:`, error.message);
        if (error.response) {
            console.error('Zabbix API Response Error Data:', error.response.data);
        } else if (error.code === 'ECONNABORTED') {
            console.error('The request to Zabbix timed out or could not be completed.');
        } else {
             console.error('A network error occurred while trying to connect to Zabbix.');
        }
    } else {
        console.error(`[Zabbix Service] An unexpected error occurred for tenant ${tenantId}:`, error);
    }
    throw new Error('Failed to communicate with the Zabbix API. Check backend logs for details.');
  }
}

/**
 * Checks if the mock service should be used, either by environment variable or feature flag.
 */
function isMockEnabled(tenantId: string): boolean {
    if (process.env.USE_ZABBIX_MOCK === 'true') {
        return true;
    }
    return getFeatureFlag('use_zabbix_mock', tenantId);
}

/**
 * Fetches the list of monitored hosts from Zabbix and enriches them with credential status.
 * @param tenantId The ID of the tenant making the request.
 * @param groupids Optional array of host group IDs to filter by.
 * @param hostids Optional array of host IDs to filter by.
 * @param isAdmin Flag to indicate if the requesting user is an admin.
 * @returns A promise that resolves to a list of Zabbix hosts.
 */
export async function getZabbixHosts(
  tenantId: string, 
  groupids?: string[], 
  hostids?: string[], 
  isAdmin: boolean = false
): Promise<ZabbixHost[]> {
  if (isMockEnabled(tenantId)) {
    console.log(`[Zabbix Mock] ON for getZabbixHosts | Tenant: ${tenantId}, Groups: ${groupids}`);
    const groupidsStr = (groupids ?? []).map(String);

    if (groupidsStr.length > 0) {
        const filtered = MOCK_HOSTS_FOR_TESTING.filter(host =>
            host.groups.some(group => groupidsStr.includes(String(group.groupid)))
        );
        return JSON.parse(JSON.stringify(filtered));
    }
    return JSON.parse(JSON.stringify(MOCK_HOSTS_FOR_TESTING));
  }

  const logParts = [`[Zabbix Service] Fetching hosts for tenant: ${tenantId}`];
  if (groupids) logParts.push(`for groups: ${groupids.join(',')}`);
  if (hostids) logParts.push(`for hosts: ${hostids.join(',')}`);
  console.log(logParts.join(' '));

  const params: ZabbixApiParams = {
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
  const hosts: ZabbixHost[] = await zabbixApiRequest('host.get', params, tenantId);

  // Enrich hosts with credential status
  if (hosts.length > 0) {
    const hostIdsFromZabbix = hosts.map(h => h.hostid);
    let query = 'SELECT host_id FROM device_credentials WHERE host_id = ANY($1::text[])';
    const queryParams: any[] = [hostIdsFromZabbix];
    
    // If NOT admin, filter by tenantId. If admin, search across all tenants.
    if (!isAdmin) {
        query += ' AND tenant_id = $2';
        queryParams.push(tenantId);
    }

    const credsResult = await pool.query(query, queryParams);
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
 * @param tenantId The ID of the tenant making the request.
 * @param dateFilter Optional object with time_from and time_to for filtering.
 * @param groupids Optional array of host group IDs to filter by.
 * @returns A promise that resolves to a list of Zabbix alerts.
 */
export async function getZabbixAlerts(
  tenantId: string,
  dateFilter: { time_from?: string; time_to?: string } = {},
  groupids?: string[]
) {
  if (isMockEnabled(tenantId)) {
    console.log(`[Zabbix Mock] ON for getZabbixAlerts | Tenant: ${tenantId}, Groups: ${groupids}`);
    const groupidsStr = (groupids ?? []).map(String);

    if (groupidsStr.length === 0) {
      console.log('[Zabbix Mock] No group filter, returning all mock alerts.');
      return JSON.parse(JSON.stringify(MOCK_ALERTS_FOR_TESTING));
    }
    
    const hostsInGroup = MOCK_HOSTS_FOR_TESTING.filter(host =>
        host.groups.some(g => groupidsStr.includes(String(g.groupid)))
    );
    const hostIdsInGroup = new Set(hostsInGroup.map(h => String(h.hostid)));

    console.log(`[Zabbix Mock] Found host IDs in group(s) ${groupidsStr}:`, Array.from(hostIdsInGroup));

    const filteredAlerts = MOCK_ALERTS_FOR_TESTING.filter(alert =>
        alert.hosts.some(h => hostIdsInGroup.has(String(h.hostid)))
    );

    console.log(`[Zabbix Mock] Returning ${filteredAlerts.length} filtered alerts.`);
    return JSON.parse(JSON.stringify(filteredAlerts));
  }

  console.log(`[Zabbix Service] Fetching alerts for tenant: ${tenantId}` + (groupids ? ` for groups: ${groupids.join(',')}` : ''));

  // Use event.get as validated by the user's test
  const eventParams: ZabbixApiParams = {
    output: 'extend',
    selectHosts: ['hostid', 'name', 'groups'], // Request host details including groups
    object: '0', // Events generated by a trigger
    value: '1', // Problem events (alert is active)
    sortfield: ['clock', 'eventid'],
    sortorder: 'DESC',
  };

  if (dateFilter.time_from) eventParams.time_from = dateFilter.time_from;
  if (dateFilter.time_to) eventParams.time_to = dateFilter.time_to;
  if (groupids && groupids.length > 0) eventParams.groupids = groupids;

  const alerts = await zabbixApiRequest('event.get', eventParams, tenantId);
  return alerts;
}


/**
 * Fetches the list of available items (metrics) for a specific Zabbix host.
 * @param tenantId The ID of the tenant making the request.
 * @param hostId The ID of the Zabbix host.
 * @returns A promise that resolves to a list of Zabbix items.
 */
export async function getZabbixItemsForHost(tenantId: string, hostId: string) {
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
export async function getZabbixHistoryForItem(
  tenantId: string,
  itemId: string,
  historyType: '0' | '3',
  dateFilter: { time_from?: string; time_to?: string } = {}
): Promise<ZabbixHistoryPoint[]> {
  console.log(`[Zabbix Service] Fetching history for item ${itemId} for tenant: ${tenantId}`);

  // Default to last 24 hours if no time range is provided
  const time_from = dateFilter.time_from || Math.floor(subDays(new Date(), 1).getTime() / 1000).toString();

  const params: ZabbixApiParams = {
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
export async function getZabbixHostGroups(tenantId: string): Promise<ZabbixHostGroup[]> {
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
export async function getZabbixItemsForEvent(tenantId: string, eventId: string) {
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
