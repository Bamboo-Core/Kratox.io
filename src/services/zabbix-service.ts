import axios from 'axios';
import { zabbixConfig } from '../config/zabbix-config.js';

// Generic function to make requests to the Zabbix API
async function zabbixApiRequest(method: string, params: object, tenantId: string) {
  const { apiUrl, apiToken } = zabbixConfig;

  if (!apiUrl || !apiToken) {
    console.error(`[Zabbix Service] Tenant ${tenantId}: Zabbix API URL or Token is not configured. Returning empty data.`);
    // Return a default empty state that matches the expected return type
    if (method.includes('host')) return [];
    if (method.includes('problem')) return [];
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
        }
    } else {
        console.error(`[Zabbix Service] An unexpected error occurred for tenant ${tenantId}:`, error);
    }
    throw new Error('Failed to communicate with the Zabbix API.');
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
 * @returns A promise that resolves to a list of Zabbix alerts.
 */
export async function getZabbixAlerts(tenantId: string) {
  console.log(`[Zabbix Service] Fetching alerts (problems) for tenant: ${tenantId}`);
  const params = {
    output: 'extend', // Gets all fields for the problems
    selectHosts: ['name'], // Important: get the host name associated with the problem
    recent: false, // Fetch all current problems, not just recent ones
    sortfield: ['severity', 'clock'],
    sortorder: 'DESC',
  };
  return await zabbixApiRequest('problem.get', params, tenantId);
}

    