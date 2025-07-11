
// This service is responsible for all interactions with the Zabbix API.
// For now, it returns mocked data to allow for frontend development without a live Zabbix connection.

// Mock data representing hosts monitored by Zabbix.
const MOCKED_HOSTS = [
  { hostid: '10580', name: 'router-ny-01', status: '0', description: 'Core router for New York datacenter' },
  { hostid: '10581', name: 'switch-sf-02', status: '0', description: 'Distribution switch for San Francisco office' },
  { hostid: '10582', name: 'server-lon-db-01', status: '1', description: 'Main database server in London (unreachable)' },
  { hostid: '10583', name: 'firewall-tok-01', status: '0', description: 'Primary firewall for Tokyo gateway' },
];

// Mock data representing active alerts (problems) from Zabbix.
const MOCKED_ALERTS = [
    { eventid: '48121', name: 'High CPU utilization on router-ny-01', severity: '4', acknowledged: '0' },
    { eventid: '48122', name: 'Ping loss to switch-sf-02', severity: '2', acknowledged: '1' },
    { eventid: '48123', name: 'Server server-lon-db-01 is unreachable', severity: '5', acknowledged: '0' },
];

/**
 * Fetches the list of monitored hosts from Zabbix.
 * @param tenantId The ID of the tenant making the request.
 * @returns A promise that resolves to a list of Zabbix hosts.
 */
export async function getZabbixHosts(tenantId: string) {
  console.log(`[Mock Zabbix Service] Fetching hosts for tenant: ${tenantId}`);
  // In a real implementation, you would use zabbixConfig to make an API call.
  // Example: `const response = await axios.post(zabbixConfig.apiUrl, { ... });`
  return Promise.resolve(MOCKED_HOSTS);
}

/**
 * Fetches the list of active alerts (problems) from Zabbix.
 * @param tenantId The ID of the tenant making the request.
 * @returns A promise that resolves to a list of Zabbix alerts.
 */
export async function getZabbixAlerts(tenantId: string) {
  console.log(`[Mock Zabbix Service] Fetching alerts for tenant: ${tenantId}`);
  // In a real implementation, this would fetch data from the Zabbix API.
  return Promise.resolve(MOCKED_ALERTS);
}
