
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

// --- Base Types & API URL ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const ADMIN_QUERY_KEY_USERS = 'adminUsers';
const ADMIN_QUERY_KEY_TENANTS = 'adminTenants';
const ADMIN_QUERY_KEY_ALL_BLOCKED_DOMAINS = 'adminAllBlockedDomains';


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

export interface AdminBlockedDomain {
    id: string;
    domain: string;
    blockedAt: string;
    tenant_id: string;
    tenant_name: string;
}

// Schema for the User Form (creation)
export const newUserFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['admin', 'collaborator']),
  tenantId: z.string({ required_error: 'Please select a tenant.' }).uuid('Please select a tenant.'),
});
export type NewUserFormData = z.infer<typeof newUserFormSchema>;

// Schema for the Tenant Form
export const tenantFormSchema = z.object({
  name: z.string().min(3, 'Tenant name must be at least 3 characters.'),
});
export type TenantFormData = z.infer<typeof tenantFormSchema>;

// Schema for adding a domain for a tenant
export interface AddDomainForTenantPayload {
    domain: string;
    tenantId: string;
}

// --- Helper Functions ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// --- API Functions (Internal to the hook) ---

// TENANTS
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

// DNS MANAGEMENT (ADMIN)
async function fetchAllBlockedDomains(token: string | null): Promise<AdminBlockedDomain[]> {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/admin/dns/all-blocked-domains`, { headers: getAuthHeader(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch all blocked domains');
    return response.json();
}

async function addBlockedDomainForTenant(payload: AddDomainForTenantPayload, token: string | null) {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/admin/dns/blocked-domains`, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to add blocked domain');
    return response.json();
}


// --- Custom Hooks ---

// TENANT HOOKS
export const useTenantsQuery = () => {
    const { token } = useAuthStore();
    return useQuery<Tenant[], Error>({
        queryKey: [ADMIN_QUERY_KEY_TENANTS],
        queryFn: () => fetchTenants(token),
        enabled: !!token,
    });
};

export const useCreateTenantMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<Tenant, Error, TenantFormData>({
        mutationFn: (data: TenantFormData) => createTenant(data, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_TENANTS] });
        },
    });
};


// USER HOOKS
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

// DNS MGMT HOOKS (ADMIN)
export const useAllBlockedDomainsQuery = () => {
    const { token } = useAuthStore();
    return useQuery<AdminBlockedDomain[], Error>({
        queryKey: [ADMIN_QUERY_KEY_ALL_BLOCKED_DOMAINS],
        queryFn: () => fetchAllBlockedDomains(token),
        enabled: !!token,
    });
};

export const useAddBlockedDomainForTenantMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: AddDomainForTenantPayload) => addBlockedDomainForTenant(payload, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_ALL_BLOCKED_DOMAINS] });
        },
    });
};
