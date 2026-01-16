
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { type DateRange } from 'react-day-picker';

// --- Types matching Zabbix API responses ---
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

// As defined in the backend swagger schema
export interface ZabbixHost {
    hostid: string;
    name: string;
    status: string; // "0" - monitored, "1" - not monitored
    description: string;
    groups: ZabbixHostGroup[]; // Added to see which groups the host belongs to
    interfaces: ZabbixHostInterface[];
    has_credentials?: boolean;
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

export interface ZabbixItem {
    itemid: string;
    name: string;
    key_: string;
    value_type: '0' | '1' | '2' | '3' | '4' | string; // '0'(float), '1'(char), '2'(log), '3'(unsigned), '4'(text)
    units: string;
    lastvalue?: string; // lastvalue is available in item.get
}

export interface ZabbixHistoryPoint {
    clock: string; // Unix timestamp
    value: string; // Value as a string
    ns: string;
}

export interface CommandExecutionPayload {
    hostId: string;
    command: string;
}

export interface CommandExecutionResponse {
    output: string;
}

export interface SuggestCommandsPayload {
    alertMessage: string;
    deviceVendor: string;
}

export interface SuggestCommandsResponse {
    commands: string[];
    reasoning: string;
}

export interface DiagnoseNetworkPayload {
    objective: string;
}

export interface DiagnoseNetworkResponse {
    response: string;
}


// --- API URL and Query Keys ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const ZABBIX_HOSTS_QUERY_KEY = 'zabbixHosts';
const ZABBIX_HOST_QUERY_KEY = 'zabbixHost';
const ZABBIX_ALERTS_QUERY_KEY = 'zabbixAlerts';
const ZABBIX_ITEMS_QUERY_KEY = 'zabbixItems';
const ZABBIX_ITEMS_BY_EVENT_QUERY_KEY = 'zabbixItemsByEvent';
const ZABBIX_ITEM_HISTORY_QUERY_KEY = 'zabbixItemHistory';
const ZABBIX_HOST_GROUPS_QUERY_KEY = 'zabbixHostGroups';


// --- API Fetching Functions ---

const getAuthHeader = (token: string | null) => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const fetchZabbixHosts = async (token: string | null, groupId?: string): Promise<ZabbixHost[]> => {
    if (!token) throw new Error('Authentication token is missing.');

    const params = new URLSearchParams();
    if (groupId && groupId !== 'all') {
        params.append('groupid', groupId);
    }

    const url = `${API_BASE_URL}/api/zabbix/hosts?${params.toString()}`;
    const response = await fetch(url, { headers: getAuthHeader(token) });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

const fetchZabbixHostById = async (token: string | null, hostId: string): Promise<ZabbixHost | null> => {
    if (!token) throw new Error('Authentication token is missing.');
    // We can reuse the fetchZabbixHosts function and just filter the result
    // To ensure we get the host regardless of group filter, we call it without a groupid
    const allHosts = await fetchZabbixHosts(token);
    return allHosts.find(h => h.hostid === hostId) || null;
}


const fetchZabbixAlerts = async (token: string | null, dateRange?: DateRange, groupId?: string): Promise<ZabbixAlert[]> => {
    if (!token) throw new Error('Authentication token is missing.');

    const params = new URLSearchParams();
    if (dateRange?.from) {
        params.append('time_from', Math.floor(dateRange.from.getTime() / 1000).toString());
    }
    if (dateRange?.to) {
        params.append('time_to', Math.floor(dateRange.to.getTime() / 1000).toString());
    }
    if (groupId && groupId !== 'all') {
        params.append('groupid', groupId);
    }

    const url = `${API_BASE_URL}/api/zabbix/alerts?${params.toString()}`;

    const response = await fetch(url, {
        headers: getAuthHeader(token),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const fetchZabbixItemsForHost = async (token: string | null, hostId: string): Promise<ZabbixItem[]> => {
    if (!token) throw new Error('Authentication token is missing.');
    if (!hostId) throw new Error('Host ID is required.');

    const response = await fetch(`${API_BASE_URL}/api/zabbix/hosts/${hostId}/items`, {
        headers: getAuthHeader(token),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const fetchZabbixItemHistory = async (token: string | null, itemId: string, historyType: '0' | '3', dateRange?: DateRange): Promise<ZabbixHistoryPoint[]> => {
    if (!token) throw new Error('Authentication token is missing.');
    const params = new URLSearchParams({ historyType });

    if (dateRange?.from) {
        params.append('time_from', Math.floor(dateRange.from.getTime() / 1000).toString());
    }
    // We intentionally do not send time_to to the backend to maintain compatibility.
    // The backend will always fetch from time_from until 'now'.
    // The client hook will perform the final filtering if a time_to is specified.

    const response = await fetch(`${API_BASE_URL}/api/zabbix/items/${itemId}/history?${params.toString()}`, {
        headers: getAuthHeader(token),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const fetchZabbixHostGroups = async (token: string | null): Promise<ZabbixHostGroup[]> => {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/zabbix/host-groups`, {
        headers: getAuthHeader(token),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const runCommand = async (payload: CommandExecutionPayload, token: string | null): Promise<CommandExecutionResponse> => {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/devices/run-command`, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to run command' }));
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const suggestCommands = async (payload: SuggestCommandsPayload, token: string | null): Promise<SuggestCommandsResponse> => {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/ai/suggest-commands`, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get suggestions' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

const fetchZabbixItemsByEvent = async (token: string | null, eventId: string): Promise<ZabbixItem[]> => {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/zabbix/events/${eventId}/items`, {
        headers: getAuthHeader(token),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const diagnoseNetwork = async (payload: DiagnoseNetworkPayload, token: string | null): Promise<DiagnoseNetworkResponse> => {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/ai/diagnose-network`, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to diagnose network' }));
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};


// --- Custom Hooks ---

export const useZabbixData = (dateRange?: DateRange, groupId?: string) => {
    const { token, user } = useAuthStore();
    const tenantId = user?.tenantId;

    const hostsQuery = useQuery<ZabbixHost[], Error>({
        queryKey: [ZABBIX_HOSTS_QUERY_KEY, tenantId, groupId],
        queryFn: () => fetchZabbixHosts(token, groupId),
        enabled: !!token && !!tenantId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const alertsQuery = useQuery<ZabbixAlert[], Error>({
        queryKey: [ZABBIX_ALERTS_QUERY_KEY, tenantId, dateRange, groupId],
        queryFn: () => fetchZabbixAlerts(token, dateRange, groupId),
        enabled: !!token && !!tenantId,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    return {
        hostsQuery,
        alertsQuery
    };
};

export const useZabbixHostQuery = (hostId?: string) => {
    const { token } = useAuthStore();
    return useQuery<ZabbixHost | null, Error>({
        queryKey: [ZABBIX_HOST_QUERY_KEY, hostId],
        queryFn: () => fetchZabbixHostById(token, hostId!),
        enabled: !!hostId && !!token,
        staleTime: 1000 * 60 * 5,
    });
};

export const useZabbixItemsQuery = (hostId?: string, enabled = true) => {
    const { token } = useAuthStore();
    return useQuery<ZabbixItem[], Error>({
        queryKey: [ZABBIX_ITEMS_QUERY_KEY, hostId],
        queryFn: () => fetchZabbixItemsForHost(token, hostId!),
        enabled: !!hostId && !!token && enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useZabbixItemHistoryQuery = (itemId?: string, historyType?: '0' | '3', dateRange?: DateRange) => {
    const { token } = useAuthStore();
    return useQuery<ZabbixHistoryPoint[], Error>({
        queryKey: [ZABBIX_ITEM_HISTORY_QUERY_KEY, itemId, historyType, dateRange],
        queryFn: async () => {
            const data = await fetchZabbixItemHistory(token, itemId!, historyType!, dateRange);
            // If a 'to' date is specified in the range, filter the results on the client side.
            if (dateRange?.to) {
                const toTimestamp = Math.floor(dateRange.to.getTime() / 1000);
                return data.filter(point => parseInt(point.clock, 10) <= toTimestamp);
            }
            return data;
        },
        enabled: !!token && !!itemId && !!historyType,
        staleTime: 1000 * 60, // 1 minute
        refetchInterval: 300000, // 5 minutes
    });
};

export const useZabbixHostGroupsQuery = (enabled = true) => {
    const { token } = useAuthStore();
    return useQuery<ZabbixHostGroup[], Error>({
        queryKey: [ZABBIX_HOST_GROUPS_QUERY_KEY],
        queryFn: () => fetchZabbixHostGroups(token),
        enabled: !!token && enabled,
        staleTime: Infinity, // Host groups don't change often
    });
};

export const useRunCommandMutation = () => {
    const { token } = useAuthStore();
    return useMutation<CommandExecutionResponse, Error, CommandExecutionPayload>({
        mutationFn: (payload) => runCommand(payload, token),
    });
};

export const useSuggestCommandsMutation = () => {
    const { token } = useAuthStore();
    return useMutation<SuggestCommandsResponse, Error, SuggestCommandsPayload>({
        mutationFn: (payload) => suggestCommands(payload, token),
    });
};

export const useZabbixItemsByEventQuery = (eventId?: string | null) => {
    const { token } = useAuthStore();
    return useQuery<ZabbixItem[], Error>({
        queryKey: [ZABBIX_ITEMS_BY_EVENT_QUERY_KEY, eventId],
        queryFn: () => fetchZabbixItemsByEvent(token, eventId!),
        enabled: !!token && !!eventId,
        staleTime: Infinity, // The items for an event don't change
    });
};

export const useDiagnoseNetworkMutation = () => {
    const { token } = useAuthStore();
    return useMutation<DiagnoseNetworkResponse, Error, DiagnoseNetworkPayload>({
        mutationFn: (payload) => diagnoseNetwork(payload, token),
    });
};