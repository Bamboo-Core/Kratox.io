
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

// --- Types & Schemas ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const AUTOMATION_RULES_QUERY_KEY = 'automationRules';
const AUTOMATION_LOGS_QUERY_KEY = 'automationLogs';

export interface AutomationRule {
    id: string;
    tenant_id: string;
    name: string;
    trigger_type: string;
    trigger_conditions: any;
    action_type: string;
    action_params: any;
    is_enabled: boolean;
    created_at: string;
}

export interface AutomationLog {
    id: string;
    rule_id: string;
    rule_name: string;
    tenant_id: string;
    trigger_event: any;
    action_type: string;
    action_details: any;
    status: 'success' | 'failure';
    message: string;
    executed_at: string;
}

export const ruleFormSchema = z.object({
    name: z.string().min(5, 'O nome da regra deve ter pelo menos 5 caracteres.'),
    condition_type: z.string(), // e.g., 'alert_name_contains'
    condition_value: z.string().min(1, 'O valor da condição é obrigatório.'),
    action_type: z.string(), // e.g., 'dns_block_domain_from_alert'
});

export type RuleFormData = z.infer<typeof ruleFormSchema>;
export type UpdateRulePayload = { id: string, data: Partial<{ is_enabled: boolean }> };

// --- API Functions ---
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

// --- Custom Hooks ---

export const useAutomationRulesQuery = ({ enabled = true } = {}) => {
    const { token, user } = useAuthStore();
    return useQuery<AutomationRule[], Error>({
        queryKey: [AUTOMATION_RULES_QUERY_KEY, user?.tenantId],
        queryFn: () => fetchApi('/api/rules', {}, token),
        enabled: !!token && !!user && enabled,
    });
};

export const useCreateAutomationRuleMutation = () => {
    const { token, user } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<AutomationRule, Error, RuleFormData>({
        mutationFn: (data) => fetchApi('/api/rules', { method: 'POST', body: JSON.stringify(data) }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AUTOMATION_RULES_QUERY_KEY, user?.tenantId] });
        },
    });
};

export const useUpdateAutomationRuleMutation = () => {
    const { token, user } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<AutomationRule, Error, UpdateRulePayload>({
        mutationFn: ({ id, data }) => fetchApi(`/api/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AUTOMATION_RULES_QUERY_KEY, user?.tenantId] });
        },
    });
};

export const useDeleteAutomationRuleMutation = () => {
    const { token, user } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => fetchApi(`/api/rules/${id}`, { method: 'DELETE' }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AUTOMATION_RULES_QUERY_KEY, user?.tenantId] });
        },
    });
};

export const useAutomationLogsQuery = () => {
    const { token, user } = useAuthStore();
    return useQuery<AutomationLog[], Error>({
        queryKey: [AUTOMATION_LOGS_QUERY_KEY, user?.tenantId],
        queryFn: () => fetchApi('/api/logs/automation', {}, token),
        enabled: !!token && !!user,
        refetchInterval: 60000, // Refetch every minute
    });
};

    