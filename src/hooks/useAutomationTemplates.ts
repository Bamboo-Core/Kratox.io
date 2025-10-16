
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const AUTOMATION_TEMPLATES_QUERY_KEY = 'adminAutomationTemplates';

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
});

export type AutomationTemplateFormData = z.infer<typeof automationTemplateFormSchema>;

const getAuthHeader = (token: string | null) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

const fetchApi = async <T>(url: string, options: RequestInit, token: string | null): Promise<T> => {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers: getAuthHeader(token) });
    if (!response.ok && response.status !== 204) {
        if (response.status === 401) useAuthStore.getState().logout();
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.status === 204 ? (null as T) : response.json();
};

export const useAutomationTemplatesQuery = () => {
    const { token } = useAuthStore();
    return useQuery<AutomationTemplate[], Error>({
        queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY],
        queryFn: () => fetchApi('/api/admin/automation/templates', {}, token),
        enabled: !!token,
    });
};

export const useCreateAutomationTemplateMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<AutomationTemplate, Error, AutomationTemplateFormData>({
        mutationFn: (data) => fetchApi('/api/admin/automation/templates', { method: 'POST', body: JSON.stringify(data) }, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY] }),
    });
};

export const useUpdateAutomationTemplateMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<AutomationTemplate, Error, { id: string, data: AutomationTemplateFormData }>({
        mutationFn: ({ id, data }) => fetchApi(`/api/admin/automation/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY] }),
    });
};

export const useDeleteAutomationTemplateMutation = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => fetchApi(`/api/admin/automation/templates/${id}`, { method: 'DELETE' }, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [AUTOMATION_TEMPLATES_QUERY_KEY] }),
    });
};
