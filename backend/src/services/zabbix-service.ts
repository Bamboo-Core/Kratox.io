
import axios from 'axios';
import { zabbixConfig } from '../config/zabbix-config.js';

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
}

// Interface for the minimal trigger data we need
interface ZabbixTrigger {
    triggerid: string;
    hosts: Array<{ hostid: string; name: string }>;
}

interface ZabbixApiParams {
  output: any;
  selectHosts?: any;
  selectInterfaces?: any;
  selectGroups?: any;
  recent?: boolean;
  time_from?: string;
  time_to?: string;
  hostids?: string | string[];
  groupids?: string | string[];
  triggerids?: string[];
  sortfield?: string | string[];
  sortorder?: string;
  [key: string]: any;
}

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
 * Fetches the list of monitored hosts from Zabbix.
 * @param tenantId The ID of the tenant making the request.
 * @param groupids Optional array of host group IDs to filter by.
 * @param hostids Optional array of host IDs to filter by.
 * @returns A promise that resolves to a list of Zabbix hosts.
 */
export async function getZabbixHosts(tenantId: string, groupids?: string[], hostids?: string[]): Promise<ZabbixHost[]> {
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
  return await zabbixApiRequest('host.get', params, tenantId);
}

/**
 * Fetches the list of active alerts (problems) from Zabbix.
 * This function uses a two-step process to ensure host information is included,
 * which is necessary for older Zabbix versions.
 * @param tenantId The ID of the tenant making the request.
 * @param dateFilter Optional object with time_from and time_to for filtering.
 * @param groupids Optional array of host group IDs to filter by.
 * @returns A promise that resolves to a list of Zabbix alerts, enriched with host data.
 */
export async function getZabbixAlerts(
  tenantId: string,
  dateFilter: { time_from?: string; time_to?: string } = {},
  groupids?: string[]
) {
  console.log(`[Zabbix Service] Fetching alerts for tenant: ${tenantId}` + (groupids ? ` for groups: ${groupids.join(',')}` : ''));
  
  // Step 1: Fetch the initial list of problems (alerts).
  const problemParams: ZabbixApiParams = {
    output: 'extend',
    recent: false,
  };

  if (dateFilter.time_from) problemParams.time_from = dateFilter.time_from;
  if (dateFilter.time_to) problemParams.time_to = dateFilter.time_to;
  if (groupids && groupids.length > 0) problemParams.groupids = groupids;

  const alerts = await zabbixApiRequest('problem.get', problemParams, tenantId);

  if (!alerts || alerts.length === 0) {
    return []; // No alerts, no need to proceed.
  }
  
  // Step 2: Extract trigger IDs from the alerts. The 'objectid' of a trigger-based
  // problem corresponds to the 'triggerid'.
  const triggerIds = alerts.map((alert: any) => alert.objectid).filter(Boolean);
  if (triggerIds.length === 0) {
    // If alerts exist but have no trigger IDs, return them as is (without host info).
    return alerts.map((alert: any) => ({ ...alert, hosts: [] }));
  }
  
  // Step 3: Fetch the triggers with their associated hosts.
  const triggerParams: ZabbixApiParams = {
    output: ['triggerid'],
    selectHosts: ['hostid', 'name'],
    triggerids: triggerIds,
  };

  const triggers: ZabbixTrigger[] = await zabbixApiRequest('trigger.get', triggerParams, tenantId);
  
  // Step 4: Create a map for quick lookup of triggerid -> hosts.
  const triggerHostMap = new Map<string, Array<{ hostid: string; name: string }>>();
  triggers.forEach(trigger => {
    triggerHostMap.set(trigger.triggerid, trigger.hosts);
  });
  
  // Step 5: Merge the host information back into the original alert objects.
  const enrichedAlerts = alerts.map((alert: any) => {
    return {
      ...alert,
      hosts: triggerHostMap.get(alert.objectid) || [], // Ensure hosts array is always present.
    };
  });
  
  return enrichedAlerts;
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
    output: ['itemid', 'name', 'key_', 'value_type', 'units'],
    hostids: hostId,
    sortfield: 'name',
    sortorder: 'ASC',
  };
  return await zabbixApiRequest('item.get', params, tenantId);
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
