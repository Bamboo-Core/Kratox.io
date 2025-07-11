
// Basic configuration for the Zabbix API client.
// It retrieves the API URL and authentication token from environment variables.

// Ensure ZABBIX_API_URL is set. It's the entry point for all Zabbix API requests.
if (!process.env.ZABBIX_API_URL) {
  console.warn('WARNING: ZABBIX_API_URL environment variable is not set. Zabbix integration will not work.');
}

// The API token is required for authentication with the Zabbix API.
if (!process.env.ZABBIX_API_TOKEN) {
  console.warn('WARNING: ZABBIX_API_TOKEN environment variable is not set. Zabbix integration will not work.');
}

export const zabbixConfig = {
  apiUrl: process.env.ZABBIX_API_URL || '',
  apiToken: process.env.ZABBIX_API_TOKEN || '',
};
