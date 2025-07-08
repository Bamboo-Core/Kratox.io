
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';

// This interface must match the object structure returned by the backend API
interface BlockedDomain {
  id: string;
  domain: string;  
  blockedAt: string;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const BLOCKED_DOMAINS_QUERY_KEY = 'blockedDomains';

// --- API Fetching Functions ---

const getAuthHeader = (token: string | null) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const fetchBlockedDomains = async (token: string | null): Promise<BlockedDomain[]> => {
  if (!token) throw new Error('Authentication token is missing.');

  const response = await fetch(`${API_BASE_URL}/api/dns/blocked-domains`, {
    headers: getAuthHeader(token),
  });

  if (!response.ok) {
    if(response.status === 401) {
      // Use the auth store's logout function if unauthorized
      useAuthStore.getState().logout();
      throw new Error('Unauthorized. Please log in again.');
    }
    const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const addBlockedDomain = async (domain: string, token: string | null): Promise<BlockedDomain> => {
    if (!token) throw new Error('Authentication token is missing.');

    const response = await fetch(`${API_BASE_URL}/api/dns/blocked-domains`, {
        method: 'POST',
        headers: getAuthHeader(token),
        body: JSON.stringify({ domain }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add domain' }));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const removeBlockedDomain = async (id: string, token: string | null): Promise<void> => {
    if (!token) throw new Error('Authentication token is missing.');

    const response = await fetch(`${API_BASE_URL}/api/dns/blocked-domains/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(token),
    });
    if (!response.ok && response.status !== 204) { // 204 No Content is a success status
        const errorData = await response.json().catch(() => ({ message: 'Failed to remove domain' }));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
};


// --- Custom Hook ---

const useDnsBlocking = () => {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  const blockedDomainsQuery = useQuery<BlockedDomain[], Error>({
    queryKey: [BLOCKED_DOMAINS_QUERY_KEY],
    queryFn: () => fetchBlockedDomains(token),
    enabled: !!token, // Only run the query if the token exists
  });

  const addDomainMutation = useMutation({
    mutationFn: (domain: string) => addBlockedDomain(domain, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY] });
    },
  });

  const removeDomainMutation = useMutation({
    mutationFn: (id: string) => removeBlockedDomain(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY] });
    },
  });

  return {
    blockedDomainsQuery,
    addDomainMutation,
    removeDomainMutation,
  };
};

export default useDnsBlocking;
