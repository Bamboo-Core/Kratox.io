import axios from 'axios';
import { zabbixConfig } from '../config/zabbix-config.js';

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
        timeout: 5000, // Add a timeout to prevent hanging requests
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
        } else {
            console.error('The request to Zabbix timed out or could not be completed.');
        }
    } else {
        console.error(`[Zabbix Service] An unexpected error occurred for tenant ${tenantId}:`, error);
    }
    // Return an empty array in case of any error to prevent frontend from hanging
    return [];
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
