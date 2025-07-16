
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

// --- Base Types & API URL ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const ADMIN_QUERY_KEY_USERS = 'adminUsers';
const ADMIN_QUERY_KEY_TENANTS = 'adminTenants';

// --- Schemas & Types ---
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'collaborator';
  tenant_id: string;
  tenant_name: string;
}

// Schema for the User Form
export const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().optional(), // Made optional, validation handled by superRefine
  role: z.enum(['admin', 'collaborator']),
  tenantId: z.string().uuid('Please select a tenant.'),
});
export type UserFormData = z.infer<typeof userFormSchema>;

// Schema for the Tenant Form
export const tenantFormSchema = z.object({
  name: z.string().min(3, 'Tenant name must be at least 3 characters.'),
});
export type TenantFormData = z.infer<typeof tenantFormSchema>;


// --- Helper Functions ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// --- API Functions (Internal to the hook) ---

async function fetchTenants(token: string | null): Promise<Tenant[]> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/tenants`, { headers: getAuthHeader(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch tenants');
  return response.json();
}

async function createTenant(data: TenantFormData, token: string | null): Promise<Tenant> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/tenants`, {
    method: 'POST',
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to create tenant');
  return response.json();
}

async function fetchUsers(token: string | null): Promise<User[]> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeader(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch users');
  return response.json();
}

async function mutateUser(user: UserFormData, token: string | null): Promise<User> {
    if (!token) throw new Error('Authentication token is missing.');
    const isEditing = !!user.id;
    const url = isEditing
        ? `${API_BASE_URL}/api/admin/users/${user.id}`
        : `${API_BASE_URL}/api/admin/users`;
    const method = isEditing ? 'PUT' : 'POST';

    // Create a mutable copy and remove the password field if it's empty during an edit
    const body: Partial<UserFormData> & { password?: string } = { ...user };
    if (isEditing && (!body.password || body.password === '')) {
        delete body.password;
    }
    
    const response = await fetch(url, {
        method,
        headers: getAuthHeader(token),
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to ${isEditing ? 'update' : 'create'} user`);
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


// --- Custom Hook ---
export const useAdminManagement = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  // --- QUERIES ---
  const tenantsQuery = useQuery<Tenant[], Error>({
    queryKey: [ADMIN_QUERY_KEY_TENANTS],
    queryFn: () => fetchTenants(token),
    enabled: !!token,
  });

  const usersQuery = useQuery<User[], Error>({
    queryKey: [ADMIN_QUERY_KEY_USERS],
    queryFn: () => fetchUsers(token),
    enabled: !!token,
  });

  // --- MUTATIONS ---
  const createTenantMutation = useMutation<Tenant, Error, TenantFormData>({
    mutationFn: (data: TenantFormData) => createTenant(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_TENANTS] });
    },
  });

  const userMutation = useMutation<User, Error, UserFormData>({
    mutationFn: (data: UserFormData) => mutateUser(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_USERS] });
    },
  });

  const deleteUserMutation = useMutation<void, Error, string>({
      mutationFn: (userId: string) => deleteUser(userId, token),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_USERS] });
      },
  });

  return {
    // Queries
    tenantsQuery,
    usersQuery,
    // Mutations
    createTenantMutation,
    userMutation,
    deleteUserMutation,
  };
};
