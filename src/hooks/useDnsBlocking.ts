
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

// --- Constants ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const BLOCKED_DOMAINS_QUERY_KEY = 'blockedDomains';
const AVAILABLE_BLOCKLISTS_QUERY_KEY = 'availableBlocklists';
const MY_SUBSCRIPTIONS_QUERY_KEY = 'mySubscriptions';


// --- API Fetching Functions ---

const getAuthHeader = (token: string | null) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const fetchApi = async <T>(url: string, options: RequestInit, token: string | null): Promise<T> => {
    if (!token) throw new Error('Authentication token is missing.');

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers: getAuthHeader(token) });

    if (!response.ok && response.status !== 204) { // 204 No Content is a success status
        if (response.status === 401) {
            useAuthStore.getState().logout();
            throw new Error('Unauthorized. Please log in again.');
        }
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    if(response.status === 204) return null as T;
    return response.json();
};

// --- Custom Hook ---

export default function useDnsBlocking() {
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const tenantId = user?.tenantId;

  // --- Queries ---

  const blockedDomainsQuery = useQuery<BlockedDomain[], Error>({
    queryKey: [BLOCKED_DOMAINS_QUERY_KEY, tenantId],
    queryFn: () => fetchApi('/api/dns/blocked-domains', {}, token),
    enabled: !!token && !!tenantId,
  });

  const availableBlocklistsQuery = useQuery<AvailableBlocklist[], Error>({
      queryKey: [AVAILABLE_BLOCKLISTS_QUERY_KEY],
      queryFn: () => fetchApi('/api/dns/blocklists', {}, token),
      enabled: !!token,
      staleTime: 1000 * 60 * 5, // Stale for 5 minutes
  });

  const mySubscriptionsQuery = useQuery<string[], Error>({
      queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, tenantId],
      queryFn: () => fetchApi('/api/dns/subscriptions', {}, token),
      enabled: !!token && !!tenantId,
  });

  // --- Mutations ---

  const addDomainMutation = useMutation<BlockedDomain, Error, string>({
    mutationFn: (domain: string) => fetchApi('/api/dns/blocked-domains', { method: 'POST', body: JSON.stringify({ domain }) }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, tenantId] });
    },
  });

  const removeDomainMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => fetchApi(`/api/dns/blocked-domains/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, tenantId] });
    },
  });

  const generateRpzFileMutation = useMutation<RpzFile, Error, void>({
    mutationFn: () => fetchApi('/api/dns/generate-rpz', {}, token),
  });

  const extractDomainsMutation = useMutation<ExtractedDomains, Error, string>({
    mutationFn: (text: string) => fetchApi('/api/ai/extract-domains', { method: 'POST', body: JSON.stringify({ text }) }, token),
  });

  const extractDomainsFromFileMutation = useMutation<ExtractedDomains, Error, string>({
    mutationFn: (fileDataUri: string) => fetchApi('/api/ai/extract-domains-from-file', { method: 'POST', body: JSON.stringify({ fileDataUri }) }, token),
  });

  const subscribeMutation = useMutation<void, Error, string>({
      mutationFn: (blocklistId: string) => fetchApi('/api/dns/subscriptions', { method: 'POST', body: JSON.stringify({ blocklistId }) }, token),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, tenantId] });
          queryClient.invalidateQueries({ queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, tenantId] });
      },
  });

  const unsubscribeMutation = useMutation<void, Error, string>({
      mutationFn: (blocklistId: string) => fetchApi(`/api/dns/subscriptions/${blocklistId}`, { method: 'DELETE' }, token),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, tenantId] });
          queryClient.invalidateQueries({ queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, tenantId] });
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
  };
};
