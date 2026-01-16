'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';

// --- Types ---

interface SuggestedRule {
  when: string;
  if: string;
  action: string;
}

interface SuggestRuleResponse {
  rule: SuggestedRule;
}

interface SuggestScriptPayload {
  trigger_description: string;
  device_vendor: string;
}

interface SuggestScriptResponse {
  suggested_script: string;
}

// --- API Base ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);

// --- API Fetching Function ---

const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const suggestRuleFromDescription = async (
  description: string,
  token: string | null
): Promise<SuggestRuleResponse> => {
  if (!token) throw new Error('Authentication token is missing.');

  const response = await fetch(`${API_BASE_URL}/api/ai/suggest-rule`, {
    method: 'POST',
    headers: getAuthHeader(token),
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to get suggestion' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const suggestScriptFromTrigger = async (
  payload: SuggestScriptPayload,
  token: string | null
): Promise<SuggestScriptResponse> => {
  if (!token) throw new Error('Authentication token is missing.');

  const response = await fetch(`${API_BASE_URL}/api/ai/suggest-script`, {
    method: 'POST',
    headers: getAuthHeader(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to get suggestion' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// --- Custom Hooks ---

export const useSuggestRuleMutation = () => {
  const { token } = useAuthStore();

  return useMutation<SuggestRuleResponse, Error, string>({
    mutationFn: (description: string) => suggestRuleFromDescription(description, token),
  });
};

export const useSuggestScriptMutation = () => {
  const { token } = useAuthStore();

  return useMutation<SuggestScriptResponse, Error, SuggestScriptPayload>({
    mutationFn: (payload: SuggestScriptPayload) => suggestScriptFromTrigger(payload, token),
  });
};
