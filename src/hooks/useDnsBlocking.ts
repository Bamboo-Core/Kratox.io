
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';

// --- Types ---
interface BlockedDomain {
  id: string;
  domain: string;
  blockedAt: string;
  source_list_id: string | null;
  source_list_name: string | null;
}

interface RpzFile {
  rpzContent: string;
}

interface ExtractedDomains {
  domains: string[];
}

interface AvailableBlocklist {
  id: string;
  name: string;
  description: string;
  source: string;
  domain_count: number;
}

export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  extension: string;
}

// --- Constants ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);
const BLOCKED_DOMAINS_QUERY_KEY = 'blockedDomains';
const AVAILABLE_BLOCKLISTS_QUERY_KEY = 'availableBlocklists';
const MY_SUBSCRIPTIONS_QUERY_KEY = 'mySubscriptions';
const EXPORT_FORMATS_QUERY_KEY = 'exportFormats';

// --- API Fetching Functions ---

const getAuthHeader = (token: string | null) => {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const fetchApi = async <T>(url: string, options: RequestInit, token: string | null): Promise<T> => {
  if (!token) throw new Error('Authentication token is missing.');

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers: getAuthHeader(token) });

  if (!response.ok && response.status !== 204) {
    // 204 No Content is a success status
    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Unauthorized. Please log in again.');
    }
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) return null as T;
  return response.json();
};

// --- Custom Hook ---
// tenantIdOverride: Optional tenant ID for admins to view/manage other tenants' data
export default function useDnsBlocking(tenantIdOverride?: string) {
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const userTenantId = user?.tenantId;

  // Use override if provided, otherwise use user's tenant
  const effectiveTenantId = tenantIdOverride || userTenantId;

  // --- Queries ---

  const blockedDomainsQuery = useQuery<BlockedDomain[], Error>({
    queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId],
    queryFn: () => {
      const url = tenantIdOverride
        ? `/api/dns/blocked-domains?tenantId=${tenantIdOverride}`
        : '/api/dns/blocked-domains';
      return fetchApi(url, {}, token);
    },
    enabled: !!token && !!effectiveTenantId,
  });

  const availableBlocklistsQuery = useQuery<AvailableBlocklist[], Error>({
    queryKey: [AVAILABLE_BLOCKLISTS_QUERY_KEY],
    queryFn: () => fetchApi('/api/dns/blocklists', {}, token),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // Stale for 5 minutes
  });

  const mySubscriptionsQuery = useQuery<string[], Error>({
    queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, effectiveTenantId],
    queryFn: () => {
      const url = tenantIdOverride
        ? `/api/dns/subscriptions?tenantId=${tenantIdOverride}`
        : '/api/dns/subscriptions';
      return fetchApi(url, {}, token);
    },
    enabled: !!token && !!effectiveTenantId,
  });

  // --- Mutations ---

  const addDomainMutation = useMutation<BlockedDomain, Error, string>({
    mutationFn: (domain: string) => {
      const url = tenantIdOverride
        ? `/api/dns/blocked-domains?tenantId=${tenantIdOverride}`
        : '/api/dns/blocked-domains';
      return fetchApi(url, { method: 'POST', body: JSON.stringify({ domain }) }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const removeDomainMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => {
      const url = tenantIdOverride
        ? `/api/dns/blocked-domains/${id}?tenantId=${tenantIdOverride}`
        : `/api/dns/blocked-domains/${id}`;
      return fetchApi(url, { method: 'DELETE' }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const generateRpzFileMutation = useMutation<RpzFile, Error, void>({
    mutationFn: () => {
      const url = tenantIdOverride
        ? `/api/dns/generate-rpz?tenantId=${tenantIdOverride}`
        : '/api/dns/generate-rpz';
      return fetchApi(url, {}, token);
    },
  });

  const extractDomainsMutation = useMutation<ExtractedDomains, Error, string>({
    mutationFn: (text: string) =>
      fetchApi('/api/ai/extract-domains', { method: 'POST', body: JSON.stringify({ text }) }, token),
  });

  const extractDomainsFromFileMutation = useMutation<ExtractedDomains, Error, string>({
    mutationFn: (fileDataUri: string) =>
      fetchApi(
        '/api/ai/extract-domains-from-file',
        { method: 'POST', body: JSON.stringify({ fileDataUri }) },
        token
      ),
  });

  const subscribeMutation = useMutation<void, Error, string>({
    mutationFn: (blocklistId: string) => {
      const url = tenantIdOverride
        ? `/api/dns/subscriptions?tenantId=${tenantIdOverride}`
        : '/api/dns/subscriptions';
      return fetchApi(url, { method: 'POST', body: JSON.stringify({ blocklistId }) }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
      queryClient.invalidateQueries({ queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const unsubscribeMutation = useMutation<void, Error, string>({
    mutationFn: (blocklistId: string) => {
      const url = tenantIdOverride
        ? `/api/dns/subscriptions/${blocklistId}?tenantId=${tenantIdOverride}`
        : `/api/dns/subscriptions/${blocklistId}`;
      return fetchApi(url, { method: 'DELETE' }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
      queryClient.invalidateQueries({ queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, effectiveTenantId] });
    },
  });

  return {
    blockedDomainsQuery,
    addDomainMutation,
    removeDomainMutation,
    generateRpzFileMutation,
    extractDomainsMutation,
    extractDomainsFromFileMutation,
    availableBlocklistsQuery,
    mySubscriptionsQuery,
    subscribeMutation,
    unsubscribeMutation,
  });
}

// --- Export Blocklist Hook ---
// Separated hook for export functionality
export function useBlocklistExport(tenantIdOverride?: string) {
  const { token } = useAuthStore();

  const exportFormatsQuery = useQuery<ExportFormat[], Error>({
    queryKey: [EXPORT_FORMATS_QUERY_KEY],
    queryFn: () => fetchApi('/api/dns/export/formats', {}, token),
    enabled: !!token,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const exportBlocklist = async (format: string): Promise<Blob> => {
    if (!token) throw new Error('Authentication token is missing.');

    const url = tenantIdOverride
      ? `${API_BASE_URL}/api/dns/export?format=${format}&tenantId=${tenantIdOverride}`
      : `${API_BASE_URL}/api/dns/export?format=${format}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(error.error || 'Export failed');
    }

    return response.blob();
  };

  return {
    exportFormatsQuery,
    exportBlocklist,
  };
}

