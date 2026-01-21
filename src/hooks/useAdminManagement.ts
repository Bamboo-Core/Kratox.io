'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

// --- Base Types & API URL ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);
const ADMIN_QUERY_KEY_USERS = 'adminUsers';
const ADMIN_QUERY_KEY_TENANTS = 'adminTenants';
const ADMIN_QUERY_KEY_ALL_BLOCKED_DOMAINS = 'adminAllBlockedDomains';
const ADMIN_QUERY_KEY_BLOCKLISTS = 'adminBlocklists';
const ADMIN_QUERY_KEY_AUTOMATION_CRITERIA = 'adminAutomationCriteria';
const ADMIN_QUERY_KEY_AUTOMATION_ACTIONS = 'adminAutomationActions';

// --- Schemas & Types ---
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
  probe_api_url?: string; // Added field
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cliente';
  tenant_id: string;
  tenant_name: string;
  zabbix_hostgroup_ids: string[];
  zabbix_group_names?: string[];
}

export interface AdminBlockedDomain {
  id: string;
  domain: string;
  blockedAt: string;
  tenant_id: string;
  tenant_name: string;
}

export interface Blocklist {
  id: string;
  name: string;
  description: string;
  source: string;
  domains: string[];
}

const criterionValueTypes = z.enum(['text', 'number', 'select']);
export type CriterionValueType = z.infer<typeof criterionValueTypes>;

export interface AutomationCriterion {
  id: string;
  name: string;
  label: string;
  description: string;
  value_type: CriterionValueType;
}

export interface AutomationAction {
  id: string;
  name: string;
  label: string;
  description: string;
}

export const automationCriterionSchema = z.object({
  name: z.string().min(3, 'System name is required.'),
  label: z.string().min(3, 'Label is required.'),
  description: z.string().optional(),
  value_type: criterionValueTypes,
});

export const automationActionSchema = z.object({
  name: z.string().min(3, 'System name is required.'),
  label: z.string().min(3, 'Label is required.'),
  description: z.string().optional(),
});
export type AutomationComponentFormData =
  | z.infer<typeof automationCriterionSchema>
  | z.infer<typeof automationActionSchema>;

// Schema for the User Form (creation)
export const newUserFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    role: z.enum(['admin', 'cliente']),
    tenantId: z.string().uuid('Please select a tenant.').optional(),
  })
  .refine((data) => data.role === 'admin' || !!data.tenantId, {
    message: 'Tenant is required for Cliente role.',
    path: ['tenantId'],
  });
export type NewUserFormData = z.infer<typeof newUserFormSchema>;

// Schema for the Tenant Form
export const tenantFormSchema = z.object({
  name: z.string().min(3, 'Tenant name must be at least 3 characters.'),
  probe_api_url: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
});
export type TenantFormData = z.infer<typeof tenantFormSchema>;
export type UpdateTenantPayload = { id: string; data: TenantFormData };

// Schema for adding a domain for a tenant
export interface AddDomainForTenantPayload {
  domain: string;
  tenantId: string;
}

// Schema for the Blocklist form
export const blocklistFormSchema = z.object({
  name: z.string().min(3, 'Name is required.'),
  description: z.string().optional(),
  source: z.string().min(2, 'Source is required.'),
  domains: z.string().min(1, 'At least one domain is required.'),
});
export type BlocklistFormData = z.infer<typeof blocklistFormSchema>;
type CreateBlocklistPayload = Omit<BlocklistFormData, 'domains'> & { domains: string[] };

// Schema for WhatsApp test form
export const whatsappTestSchema = z.object({
  toNumber: z.string().min(10, 'O número de telefone é obrigatório.'),
  message: z.string().min(1, 'A mensagem é obrigatória.'),
});
export type WhatsappTestFormData = z.infer<typeof whatsappTestSchema>;

// --- Helper Functions ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const fetchApi = async <T>(url: string, options: RequestInit, token: string | null): Promise<T> => {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: getAuthHeader(token),
  });
  if (!response.ok && response.status !== 204) {
    if (response.status === 401) useAuthStore.getState().logout();
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(
      errorData.error ||
        errorData.details ||
        errorData.message ||
        `HTTP error! status: ${response.status}`
    );
  }
  return response.status === 204 ? (null as T) : response.json();
};

// --- API Functions (Internal to the hook) ---

// WHATSAPP
const testWhatsappSend = (data: WhatsappTestFormData, token: string | null) =>
  fetchApi('/api/admin/whatsapp/test-send', { method: 'POST', body: JSON.stringify(data) }, token);

const testAutomationLog = (groupId: string, token: string | null) =>
  fetchApi<{ success: boolean; message: string; logId: string; host: string }>(
    '/api/admin/automation/test-log',
    { method: 'POST', body: JSON.stringify({ groupId }) },
    token
  );

// TENANTS
const createTenant = (data: TenantFormData, token: string | null) =>
  fetchApi<Tenant>('/api/admin/tenants', { method: 'POST', body: JSON.stringify(data) }, token);
const updateTenant = ({ id, data }: UpdateTenantPayload, token: string | null) =>
  fetchApi<Tenant>(
    `/api/admin/tenants/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token
  );

// USERS
const createUser = (user: NewUserFormData, token: string | null) =>
  fetchApi<User>('/api/admin/users', { method: 'POST', body: JSON.stringify(user) }, token);
const deleteUser = (userId: string, token: string | null) =>
  fetchApi<void>(`/api/admin/users/${userId}`, { method: 'DELETE' }, token);

// DNS
const addBlockedDomainForTenant = (payload: AddDomainForTenantPayload, token: string | null) =>
  fetchApi(
    '/api/admin/dns/blocked-domains',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );

// BLOCKLISTS
const prepareBlocklistPayload = (data: BlocklistFormData): CreateBlocklistPayload => ({
  ...data,
  domains: data.domains
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean),
});
const createBlocklist = (data: BlocklistFormData, token: string | null) =>
  fetchApi<Blocklist>(
    '/api/admin/dns/blocklists',
    { method: 'POST', body: JSON.stringify(prepareBlocklistPayload(data)) },
    token
  );
const updateBlocklist = (
  { id, data }: { id: string; data: BlocklistFormData },
  token: string | null
) =>
  fetchApi<Blocklist>(
    `/api/admin/dns/blocklists/${id}`,
    { method: 'PUT', body: JSON.stringify(prepareBlocklistPayload(data)) },
    token
  );
const deleteBlocklist = (id: string, token: string | null) =>
  fetchApi<void>(`/api/admin/dns/blocklists/${id}`, { method: 'DELETE' }, token);

// AUTOMATION COMPONENTS
const fetchAutomationCriterionById = (id: string, token: string | null) =>
  fetchApi<AutomationCriterion>(`/api/admin/automation/criteria/${id}`, {}, token);
const fetchAutomationActionById = (id: string, token: string | null) =>
  fetchApi<AutomationAction>(`/api/admin/automation/actions/${id}`, {}, token);

const createAutomationCriterion = (data: AutomationComponentFormData, token: string | null) =>
  fetchApi<AutomationCriterion>(
    '/api/admin/automation/criteria',
    { method: 'POST', body: JSON.stringify(data) },
    token
  );
const updateAutomationCriterion = (
  { id, data }: { id: string; data: AutomationComponentFormData },
  token: string | null
) =>
  fetchApi<AutomationCriterion>(
    `/api/admin/automation/criteria/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token
  );
const deleteAutomationCriterion = (id: string, token: string | null) =>
  fetchApi<void>(`/api/admin/automation/criteria/${id}`, { method: 'DELETE' }, token);

const createAutomationAction = (data: AutomationComponentFormData, token: string | null) =>
  fetchApi<AutomationAction>(
    '/api/admin/automation/actions',
    { method: 'POST', body: JSON.stringify(data) },
    token
  );
const updateAutomationAction = (
  { id, data }: { id: string; data: AutomationComponentFormData },
  token: string | null
) =>
  fetchApi<AutomationAction>(
    `/api/admin/automation/actions/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token
  );
const deleteAutomationAction = (id: string, token: string | null) =>
  fetchApi<void>(`/api/admin/automation/actions/${id}`, { method: 'DELETE' }, token);

// --- Custom Hooks ---

// WHATSAPP HOOK
export const useTestWhatsappMutation = () => {
  const { token } = useAuthStore();
  return useMutation<any, Error, WhatsappTestFormData>({
    mutationFn: (data) => testWhatsappSend(data, token),
  });
};

export const useTestAutomationLogMutation = () => {
  const { token } = useAuthStore();
  return useMutation<
    { success: boolean; message: string; logId: string; host: string },
    Error,
    string
  >({
    mutationFn: (groupId) => testAutomationLog(groupId, token),
  });
};

// TENANT HOOKS
export const useTenantsQuery = () => {
  const { token } = useAuthStore();
  return useQuery<Tenant[], Error>({
    queryKey: [ADMIN_QUERY_KEY_TENANTS],
    queryFn: () => fetchApi('/api/admin/tenants', {}, token),
    enabled: !!token,
  });
};

export const useCreateTenantMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<Tenant, Error, TenantFormData>({
    mutationFn: (data) => createTenant(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_TENANTS] });
    },
  });
};

export const useUpdateTenantMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<Tenant, Error, UpdateTenantPayload>({
    mutationFn: (payload) => updateTenant(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_TENANTS] });
    },
  });
};

// USER HOOKS (No change, just for context)
export const useCreateUserMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<User, Error, NewUserFormData>({
    mutationFn: (data) => createUser(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_USERS] });
    },
  });
};

export const useDeleteUserMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (userId) => deleteUser(userId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_USERS] });
    },
  });
};

// DNS MGMT HOOKS (ADMIN)
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

// BLOCKLIST HOOKS (ADMIN)
export const useBlocklistsQuery = () => {
  const { token } = useAuthStore();
  return useQuery<Blocklist[], Error>({
    queryKey: [ADMIN_QUERY_KEY_BLOCKLISTS],
    queryFn: () => fetchApi('/api/admin/dns/blocklists', {}, token),
    enabled: !!token,
  });
};

export const useCreateBlocklistMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<Blocklist, Error, BlocklistFormData>({
    mutationFn: (data) => createBlocklist(data, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_BLOCKLISTS] }),
  });
};

export const useUpdateBlocklistMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<Blocklist, Error, { id: string; data: BlocklistFormData }>({
    mutationFn: (params) => updateBlocklist(params, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_BLOCKLISTS] }),
  });
};

export const useDeleteBlocklistMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteBlocklist(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_BLOCKLISTS] }),
  });
};

// AUTOMATION COMPONENTS HOOKS (ADMIN)
export const useAdminAutomationCriteria = () => {
  const { token } = useAuthStore();
  return useQuery<AutomationCriterion[], Error>({
    queryKey: [ADMIN_QUERY_KEY_AUTOMATION_CRITERIA],
    queryFn: () => fetchApi('/api/admin/automation/criteria', {}, token),
    enabled: !!token,
  });
};

export const useAdminAutomationCriterionById = (id: string, options?: { enabled?: boolean }) => {
  const { token } = useAuthStore();
  return useQuery<AutomationCriterion, Error>({
    queryKey: [ADMIN_QUERY_KEY_AUTOMATION_CRITERIA, id],
    queryFn: () => fetchAutomationCriterionById(id, token),
    enabled: !!token && !!id && (options?.enabled ?? true),
  });
};

export const useCreateAutomationCriterionMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<AutomationCriterion, Error, AutomationComponentFormData>({
    mutationFn: (data) => createAutomationCriterion(data, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_AUTOMATION_CRITERIA] }),
  });
};

export const useUpdateAutomationCriterionMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<AutomationCriterion, Error, { id: string; data: AutomationComponentFormData }>(
    {
      mutationFn: (params) => updateAutomationCriterion(params, token),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_AUTOMATION_CRITERIA] }),
    }
  );
};

export const useDeleteAutomationCriterionMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteAutomationCriterion(id, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_AUTOMATION_CRITERIA] }),
  });
};

export const useAdminAutomationActions = () => {
  const { token } = useAuthStore();
  return useQuery<AutomationAction[], Error>({
    queryKey: [ADMIN_QUERY_KEY_AUTOMATION_ACTIONS],
    queryFn: () => fetchApi('/api/admin/automation/actions', {}, token),
    enabled: !!token,
  });
};

export const useAdminAutomationActionById = (id: string, options?: { enabled?: boolean }) => {
  const { token } = useAuthStore();
  return useQuery<AutomationAction, Error>({
    queryKey: [ADMIN_QUERY_KEY_AUTOMATION_ACTIONS, id],
    queryFn: () => fetchAutomationActionById(id, token),
    enabled: !!token && !!id && (options?.enabled ?? true),
  });
};

export const useCreateAutomationActionMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<AutomationAction, Error, AutomationComponentFormData>({
    mutationFn: (data) => createAutomationAction(data, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_AUTOMATION_ACTIONS] }),
  });
};

export const useUpdateAutomationActionMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<AutomationAction, Error, { id: string; data: AutomationComponentFormData }>({
    mutationFn: (params) => updateAutomationAction(params, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_AUTOMATION_ACTIONS] }),
  });
};

export const useDeleteAutomationActionMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteAutomationAction(id, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY_AUTOMATION_ACTIONS] }),
  });
};
