
"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';

// --- Types matching Zabbix API responses ---

// As defined in the backend swagger schema
export interface ZabbixHost {
  hostid: string;
  name: string;
  status: string; // "0" - monitored, "1" - not monitored
  description: string;
}

// Based on Zabbix problem.get API response
export interface ZabbixAlert {
  eventid: string;
  name: string; // Description of the problem
  severity: string; // '0'-'5': Not classified, Info, Warning, Average, High, Disaster
  acknowledged: string; // "0" or "1"
  clock: string; // Timestamp of the event
  hosts: Array<{ hostid: string; name: string }>;
}


// --- API URL and Query Keys ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const ZABBIX_HOSTS_QUERY_KEY = 'zabbixHosts';
const ZABBIX_ALERTS_QUERY_KEY = 'zabbixAlerts';

// --- API Fetching Functions ---

const getAuthHeader = (token: string | null) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const fetchZabbixHosts = async (token: string | null): Promise<ZabbixHost[]> => {
  if (!token) throw new Error('Authentication token is missing.');

  const response = await fetch(`${API_BASE_URL}/api/zabbix/hosts`, {
    headers: getAuthHeader(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};


const fetchZabbixAlerts = async (token: string | null): Promise<ZabbixAlert[]> => {
  if (!token) throw new Error('Authentication token is missing.');

  const response = await fetch(`${API_BASE_URL}/api/zabbix/alerts`, {
    headers: getAuthHeader(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};


// --- Custom Hook ---

export const useZabbixData = () => {
  const { token, user } = useAuthStore();
  const tenantId = user?.tenantId;

  const hostsQuery = useQuery<ZabbixHost[], Error>({
    queryKey: [ZABBIX_HOSTS_QUERY_KEY, tenantId],
    queryFn: () => fetchZabbixHosts(token),
    enabled: !!token && !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const alertsQuery = useQuery<ZabbixAlert[], Error>({
    queryKey: [ZABBIX_ALERTS_QUERY_KEY, tenantId],
    queryFn: () => fetchZabbixAlerts(token),
    enabled: !!token && !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds
    // Sort on the client-side as a fallback for Zabbix APIs that don't support it
    select: (data) => {
        return [...data].sort((a, b) => {
            if (b.severity !== a.severity) {
                return parseInt(b.severity) - parseInt(a.severity);
            }
            return parseInt(b.clock) - parseInt(a.clock);
        });
    }
  });
  
  return {
    hostsQuery,
    alertsQuery
  };
};

    