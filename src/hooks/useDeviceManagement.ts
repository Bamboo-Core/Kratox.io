'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);
const ZABBIX_HOSTS_QUERY_KEY = 'zabbixHosts';
const DEVICE_CREDENTIALS_QUERY_KEY = 'deviceCredentials';

// --- Schema & Types ---
export const deviceCredentialsSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
  port: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), {
      message: 'Port must be a number.',
    }),
  device_type: z.string({ required_error: 'Device type is required.' }),
});
export type DeviceCredentialsFormData = z.infer<typeof deviceCredentialsSchema>;

interface SaveCredentialsPayload extends DeviceCredentialsFormData {
  hostId: string;
}

// Type for the data returned from GET /:hostId/credentials
export interface DeviceCredentials {
  username: string;
  port: string | null;
  device_type: string;
}

// --- API Functions ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

async function saveDeviceCredentials(
  payload: SaveCredentialsPayload,
  token: string | null
): Promise<any> {
  if (!token) throw new Error('Authentication token is missing.');

  const { hostId, ...body } = payload;

  // Ensure port is a number or null if empty
  const apiPayload = {
    ...body,
    port: body.port ? parseInt(body.port, 10) : null,
  };

  const response = await fetch(`${API_BASE_URL}/api/devices/${hostId}/credentials`, {
    method: 'POST',
    headers: getAuthHeader(token),
    body: JSON.stringify(apiPayload),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to save credentials');
  return response.json();
}

async function fetchDeviceCredentials(
  hostId: string,
  token: string | null
): Promise<DeviceCredentials> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/devices/${hostId}/credentials`, {
    headers: getAuthHeader(token),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch credentials');
  return response.json();
}

// --- Custom Hooks ---
export const useSaveDeviceCredentialsMutation = () => {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<any, Error, SaveCredentialsPayload>({
    mutationFn: (payload: SaveCredentialsPayload) => saveDeviceCredentials(payload, token),
    onSuccess: (_data, variables) => {
      // Refetch the hosts query to update the 'has_credentials' status in the UI
      queryClient.invalidateQueries({ queryKey: [ZABBIX_HOSTS_QUERY_KEY, user?.tenantId] });
      // Invalidate the specific credentials query as well
      queryClient.invalidateQueries({ queryKey: [DEVICE_CREDENTIALS_QUERY_KEY, variables.hostId] });
    },
  });
};

export const useDeviceCredentialsQuery = (hostId?: string, enabled = true) => {
  const { token } = useAuthStore();
  return useQuery<DeviceCredentials, Error>({
    queryKey: [DEVICE_CREDENTIALS_QUERY_KEY, hostId],
    queryFn: () => fetchDeviceCredentials(hostId!, token),
    enabled: !!token && !!hostId && enabled,
  });
};
