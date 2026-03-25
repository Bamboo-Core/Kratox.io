'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);
const AUTOMATION_TEMPLATES_QUERY_KEY = 'adminAutomationTemplates';
const CLIENT_TEMPLATES_QUERY_KEY = 'clientAutomationTemplates';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger_description: string;
  device_vendor: string;
  action_script: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const automationTemplateFormSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters.'),
  description: z.string().optional(),
  trigger_description: z.string().min(10, 'Trigger description must be at least 10 characters.'),
  device_vendor: z.string().min(1, 'Device vendor is required.'),
  action_script: z.string().min(1, 'Action script cannot be empty.'),
  is_enabled: z.boolean().default(true),
  initial_subscription: z.enum(['none', 'all', 'specific']).optional(),
});

export type AutomationTemplateFormData = z.infer<typeof automationTemplateFormSchema>;
export type CreateAutomationTemplatePayload = AutomationTemplateFormData & { tenantIds?: string[] };

interface ClientTemplatesResponse {
  templates: AutomationTemplate[];
  subscriptions: string[];
}

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
      errorData.error || errorData.message || `HTTP error! status: ${response.status}`
    );
  }
  return response.status === 204 ? (null as T) : response.json();
};

// --- Admin Hooks ---
export const useAutomationTemplatesQuery = () => {
  const { token } = useAuthStore();
  return useQuery<AutomationTemplate[], Error>({
    queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY],
    queryFn: () => fetchApi('/api/admin/automation/templates', {}, token),
    enabled: !!token,
  });
};

export const useAutomationTemplateById = (id?: string) => {
  const { token } = useAuthStore();
  return useQuery<AutomationTemplate, Error>({
    queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY, id],
    queryFn: () => fetchApi(`/api/admin/automation/templates/${id}`, {}, token),
    enabled: !!token && !!id,
  });
};

export const useCreateAutomationTemplateMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<AutomationTemplate, Error, CreateAutomationTemplatePayload>({
    mutationFn: (data) =>
      fetchApi(
        '/api/admin/automation/templates',
        { method: 'POST', body: JSON.stringify(data) },
        token
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY] }),
  });
};

export const useUpdateAutomationTemplateMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    AutomationTemplate,
    Error,
    { id: string; data: Partial<AutomationTemplateFormData> }
  >({
    mutationFn: ({ id, data }) =>
      fetchApi(
        `/api/admin/automation/templates/${id}`,
        { method: 'PUT', body: JSON.stringify(data) },
        token
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY, data.id] });
    },
  });
};

export const useDeleteAutomationTemplateMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      fetchApi(`/api/admin/automation/templates/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY] }),
  });
};

// --- Client Hooks ---
export const useAutomationTemplatesForClient = (tenantIdOverride: string | null = null) => {
  const { token, user } = useAuthStore();
  const effectiveTenantId = tenantIdOverride || user?.tenantId;

  return useQuery<ClientTemplatesResponse, Error>({
    queryKey: [CLIENT_TEMPLATES_QUERY_KEY, effectiveTenantId],
    queryFn: async () => {
      const baseUrl = '/api/rules';
      const templatesUrl = tenantIdOverride ? `${baseUrl}/templates?tenantId=${tenantIdOverride}` : `${baseUrl}/templates`;
      const subscriptionsUrl = tenantIdOverride ? `${baseUrl}/subscriptions?tenantId=${tenantIdOverride}` : `${baseUrl}/subscriptions`;

      const [templates, subscriptions] = await Promise.all([
        fetchApi<AutomationTemplate[]>(templatesUrl, {}, token),
        fetchApi<string[]>(subscriptionsUrl, {}, token),
      ]);
      return { templates, subscriptions };
    },
    enabled: !!token && !!effectiveTenantId,
  });
};

export const useSubscribeToTemplateMutation = (tenantIdOverride: string | null = null) => {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantIdOverride || user?.tenantId;

  return useMutation<void, Error, string>({
    mutationFn: (templateId) => {
      const url = tenantIdOverride ? `/api/rules/subscriptions?tenantId=${tenantIdOverride}` : '/api/rules/subscriptions';
      return fetchApi(
        url,
        { method: 'POST', body: JSON.stringify({ templateId }) },
        token
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENT_TEMPLATES_QUERY_KEY, effectiveTenantId] });
    },
  });
};

export const useUnsubscribeFromTemplateMutation = (tenantIdOverride: string | null = null) => {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantIdOverride || user?.tenantId;

  return useMutation<void, Error, string>({
    mutationFn: (templateId) => {
      const url = tenantIdOverride ? `/api/rules/subscriptions/${templateId}?tenantId=${tenantIdOverride}` : `/api/rules/subscriptions/${templateId}`;
      return fetchApi(url, { method: 'DELETE' }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENT_TEMPLATES_QUERY_KEY, effectiveTenantId] });
    },
  });
};
