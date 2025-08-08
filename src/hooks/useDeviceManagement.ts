
"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const ZABBIX_HOSTS_QUERY_KEY = 'zabbixHosts';

// --- Schema & Types ---
export const deviceCredentialsSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
  port: z.string().optional().refine(val => !val || /^\d+$/.test(val), {
    message: "Port must be a number.",
  }),
  device_type: z.string({ required_error: 'Device type is required.' }),
});
export type DeviceCredentialsFormData = z.infer<typeof deviceCredentialsSchema>;

interface SaveCredentialsPayload extends DeviceCredentialsFormData {
  hostId: string;
}

// --- API Function ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

async function saveDeviceCredentials(payload: SaveCredentialsPayload, token: string | null): Promise<any> {
    if (!token) throw new Error('Authentication token is missing.');

    const { hostId, username, password, port, device_type } = payload;

    const body: { username: string; password: string; device_type: string; port?: string } = { username, password, device_type };
    if (port) {
        body.port = port;
    }

    const response = await fetch(`${API_BASE_URL}/api/devices/${hostId}/credentials`, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to save credentials');
    return response.json();
}

// --- Custom Hook ---
export const useSaveDeviceCredentialsMutation = () => {
    const { token, user } = useAuthStore();
    const queryClient = useQueryClient();
    
    return useMutation<any, Error, SaveCredentialsPayload>({
        mutationFn: (payload: SaveCredentialsPayload) => saveDeviceCredentials(payload, token),
        onSuccess: () => {
            // Refetch the hosts query to update the 'has_credentials' status in the UI
            queryClient.invalidateQueries({ queryKey: [ZABBIX_HOSTS_QUERY_KEY, user?.tenantId] });
        },
    });
};

    
