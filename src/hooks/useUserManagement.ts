
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

// --- Base Types & API URL ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const ADMIN_QUERY_KEY_USERS = 'adminUsers';

// --- Schemas & Types ---
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cliente';
  tenant_id: string;
  tenant_name: string;
  zabbix_hostgroup_ids: string[];
}

// Schema for the User Form (creation)
export const newUserFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['admin', 'cliente']),
  tenantId: z.string().uuid('Please select a tenant.').optional(),
  zabbix_hostgroup_ids: z.array(z.string()).optional(),
}).refine(data => data.role === 'admin' || !!data.tenantId, {
    message: 'Tenant is required for Cliente role.',
    path: ['tenantId'],
});
export type NewUserFormData = z.infer<typeof newUserFormSchema>;

// --- Helper Functions ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// --- API Functions (Internal to the hook) ---

// USERS
async function fetchUsers(token: string | null): Promise<User[]> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeader(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch users');
  return response.json();
}

async function createUser(user: NewUserFormData, token: string | null): Promise<User> {
    if (!token) throw new Error('Authentication token is missing.');
    const url = `${API_BASE_URL}/api/admin/users`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to create user`);
    return response.json();
}

async function deleteUser(userId: string, token: string | null): Promise<void> {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader(token),
    });
    if (!response.ok && response.status !== 204) {
        throw new Error((await response.json()).error || 'Failed to delete user');
    }
}


// --- Custom Hooks ---

export const useUsersQuery = () => {
    const { token } = useAuthStore();
    return useQuery<User[], Error>({
        queryKey: [ADMIN_QUERY_KEY_USERS],
        queryFn: () => fetchUsers(token),
        enabled: !!token,
    });
};

export const useCreateUserMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<User, Error, NewUserFormData>({
        mutationFn: (data: NewUserFormData) => createUser(data, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_USERS] });
        },
    });
};

export const useDeleteUserMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
      mutationFn: (userId: string) => deleteUser(userId, token),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_USERS] });
      },
  });
};
