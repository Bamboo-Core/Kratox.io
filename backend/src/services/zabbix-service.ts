import axios from 'axios';
import { zabbixConfig } from '../config/zabbix-config.js';

interface ZabbixApiParams {
  output: any;
  selectHosts?: any;
  recent?: boolean;
  time_from?: string;
  time_to?: string;
  [key: string]: any;
}

// Generic function to make requests to the Zabbix API
async function zabbixApiRequest(method: string, params: object, tenantId: string) {
  const { apiUrl, apiToken } = zabbixConfig;

  // If Zabbix is not configured, log it and return an empty array immediately.
  // This prevents requests from hanging and ensures the frontend gets a valid (empty) response.
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
        id: 1, // A unique ID for the request
      },
      {
        headers: { 'Content-Type': 'application/json-rpc' },
      }
    );

    if (response.data.error) {
      console.error(`[Zabbix Service] API Error for tenant ${tenantId}:`, response.data.error);
      throw new Error(`Zabbix API Error: ${response.data.error.message} - ${response.data.error.data}`);
    }

    return response.data.result;
  } catch (error) {
    // Log the detailed error but throw a more generic one to the controller
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
    // Re-throw the error so the controller can handle it and send a proper error response to the client
    throw new Error('Failed to communicate with the Zabbix API. Check backend logs for details.');
  }
}

/**
 * Fetches the list of monitored hosts from Zabbix.
 * @param tenantId The ID of the tenant making the request.
 * @returns A promise that resolves to a list of Zabbix hosts.
 */
export async function getZabbixHosts(tenantId: string) {
  console.log(`[Zabbix Service] Fetching hosts for tenant: ${tenantId}`);
  const params = {
    output: ['hostid', 'name', 'status', 'description'],
    selectInterfaces: ['ip'], // Attempt to get IP addresses as well
  };
  return await zabbixApiRequest('host.get', params, tenantId);
}

/**
 * Fetches the list of active alerts (problems) from Zabbix.
 * @param tenantId The ID of the tenant making the request.
 * @param dateFilter Optional object with time_from and time_to for filtering.
 * @returns A promise that resolves to a list of Zabbix alerts.
 */
export async function getZabbixAlerts(
  tenantId: string,
  dateFilter: { time_from?: string; time_to?: string } = {}
) {
  console.log(`[Zabbix Service] Fetching alerts (problems) for tenant: ${tenantId}`);
  
  const params: ZabbixApiParams = {
    output: 'extend', // Gets all fields for the problems
    selectHosts: ['hostid', 'name'], // Important: get the host name associated with the problem
    recent: false, // Fetch all current problems, not just recent ones
  };

  // Add date filters if they are provided
  if (dateFilter.time_from) {
    params.time_from = dateFilter.time_from;
  }
  if (dateFilter.time_to) {
    params.time_to = dateFilter.time_to;
    // When filtering a time range, 'recent' should be false to get historical problems
    params.recent = false; 
  }

  return await zabbixApiRequest('problem.get', params, tenantId);
}
