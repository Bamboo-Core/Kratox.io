
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// This interface must match the object structure returned by the backend API
interface BlockedDomain {
  id: string;
  domain: string;  
  blockedAt: string;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const BLOCKED_DOMAINS_QUERY_KEY = 'blockedDomains';

// --- API Fetching Functions ---

const fetchBlockedDomains = async (): Promise<BlockedDomain[]> => {
  const response = await fetch(`${API_BASE_URL}/api/dns/blocked-domains`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const addBlockedDomain = async (domain: string): Promise<BlockedDomain> => {
    const response = await fetch(`${API_BASE_URL}/api/dns/blocked-domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add domain' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const removeBlockedDomain = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/dns/blocked-domains/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) { // 204 No Content is a success status
        const errorData = await response.json().catch(() => ({ message: 'Failed to remove domain' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
};


// --- Custom Hook ---

const useDnsBlocking = () => {
  const queryClient = useQueryClient();

  const blockedDomainsQuery = useQuery<BlockedDomain[], Error>({
    queryKey: [BLOCKED_DOMAINS_QUERY_KEY],
    queryFn: fetchBlockedDomains,
  });

  const addDomainMutation = useMutation({
    mutationFn: addBlockedDomain,
    onSuccess: () => {
      // When a domain is successfully added, invalidate the query cache
      // This tells React Query to refetch the data to keep the UI in sync
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY] });
    },
  });

  const removeDomainMutation = useMutation({
    mutationFn: removeBlockedDomain,
    onSuccess: () => {
      // Invalidate and refetch after a successful deletion
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
