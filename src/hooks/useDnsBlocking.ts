import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { fetchWithAuth, fetchBlobWithAuth } from '@/services/api-client';

// --- Types ---
interface BlockedDomain {
  id: string;
  domain: string;
  blockedAt: string;
  source_list_id: string | null;
  source_list_name: string | null;
  is_excluded?: boolean;
}

interface RpzFile {
  rpzContent: string;
}

interface ExtractedDomains {
  domains: string[];
  ipv4: string[];
  ipv6: string[];
  cidrs: AnalyzeCidrOutput[];
  lowConfidenceDomains?: string[];
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
const BLOCKED_DOMAINS_QUERY_KEY = 'blockedDomains';
const AVAILABLE_BLOCKLISTS_QUERY_KEY = 'availableBlocklists';
const MY_SUBSCRIPTIONS_QUERY_KEY = 'mySubscriptions';
const BLOCKED_IPS_QUERY_KEY = 'blockedIps';
const EXPORT_FORMATS_QUERY_KEY = 'exportFormats_v2';

// --- Custom Hook ---
// tenantIdOverride: Optional tenant ID for admins to view/manage other tenants' data
export default function useDnsBlocking(tenantIdOverride?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
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
      return fetchWithAuth(url);
    },
    enabled: isAuthenticated && !!effectiveTenantId,
  });

  const availableBlocklistsQuery = useQuery<AvailableBlocklist[], Error>({
    queryKey: [AVAILABLE_BLOCKLISTS_QUERY_KEY],
    queryFn: () => fetchWithAuth('/api/dns/blocklists'),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // Stale for 5 minutes
  });

  const mySubscriptionsQuery = useQuery<string[], Error>({
    queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, effectiveTenantId],
    queryFn: () => {
      const url = tenantIdOverride
        ? `/api/dns/subscriptions?tenantId=${tenantIdOverride}`
        : '/api/dns/subscriptions';
      return fetchWithAuth(url);
    },
    enabled: isAuthenticated && !!effectiveTenantId,
  });

  const blockedIpsQuery = useQuery<BlockedDomain[], Error>({
    queryKey: [BLOCKED_IPS_QUERY_KEY, effectiveTenantId],
    queryFn: () => {
      const url = tenantIdOverride
        ? `/api/ip/blocked-ips?tenantId=${tenantIdOverride}`
        : '/api/ip/blocked-ips';
      return fetchWithAuth(url);
    },
    enabled: isAuthenticated && !!effectiveTenantId,
  });

  // --- Mutations ---

  const addDomainMutation = useMutation<BlockedDomain, Error, string>({
    mutationFn: (domain: string) => {
      const url = tenantIdOverride
        ? `/api/dns/blocked-domains?tenantId=${tenantIdOverride}`
        : '/api/dns/blocked-domains';
      return fetchWithAuth(url, { method: 'POST', body: JSON.stringify({ domain }) });
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
      return fetchWithAuth(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const updateDomainMutation = useMutation<BlockedDomain, Error, { id: string; domain: string }>({
    mutationFn: ({ id, domain }) => {
      const url = tenantIdOverride
        ? `/api/dns/blocked-domains/${id}?tenantId=${tenantIdOverride}`
        : `/api/dns/blocked-domains/${id}`;
      return fetchWithAuth(url, { method: 'PUT', body: JSON.stringify({ domain }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const removeAllDomainsMutation = useMutation<void, Error, void>({
    mutationFn: () => {
      const url = tenantIdOverride
        ? `/api/dns/blocked-domains?tenantId=${tenantIdOverride}`
        : '/api/dns/blocked-domains';
      return fetchWithAuth(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const addIpMutation = useMutation<BlockedDomain, Error, string>({
    mutationFn: (ip: string) => {
      const url = tenantIdOverride
        ? `/api/ip/blocked-ips?tenantId=${tenantIdOverride}`
        : '/api/ip/blocked-ips';
      return fetchWithAuth(url, { method: 'POST', body: JSON.stringify({ ip }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_IPS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const removeIpMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => {
      const url = tenantIdOverride
        ? `/api/ip/blocked-ips/${id}?tenantId=${tenantIdOverride}`
        : `/api/ip/blocked-ips/${id}`;
      return fetchWithAuth(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_IPS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const updateIpMutation = useMutation<BlockedDomain, Error, { id: string; ip: string }>({
    mutationFn: ({ id, ip }) => {
      const url = tenantIdOverride
        ? `/api/ip/blocked-ips/${id}?tenantId=${tenantIdOverride}`
        : `/api/ip/blocked-ips/${id}`;
      return fetchWithAuth(url, { method: 'PUT', body: JSON.stringify({ ip }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_IPS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const removeAllIpsMutation = useMutation<void, Error, void>({
    mutationFn: () => {
      const url = tenantIdOverride
        ? `/api/ip/blocked-ips?tenantId=${tenantIdOverride}`
        : '/api/ip/blocked-ips';
      return fetchWithAuth(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_IPS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const generateRpzFileMutation = useMutation<RpzFile, Error, void>({
    mutationFn: () => {
      const url = tenantIdOverride
        ? `/api/dns/generate-rpz?tenantId=${tenantIdOverride}`
        : '/api/dns/generate-rpz';
      return fetchWithAuth(url);
    },
  });

  const extractDomainsMutation = useMutation<ExtractedDomains, Error, string>({
    mutationFn: (text: string) =>
      fetchWithAuth('/api/ai/extract-domains', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  });

  const extractDomainsFromFileMutation = useMutation<ExtractedDomains, Error, string>({
    mutationFn: (fileDataUri: string) =>
      fetchWithAuth('/api/ai/extract-domains-from-file', {
        method: 'POST',
        body: JSON.stringify({ fileDataUri }),
      }),
  });

  const analyzeCidrMutation = useMutation<AnalyzeCidrOutput, Error, string>({
    mutationFn: (cidr: string) =>
      fetchWithAuth('/api/ai/analyze-cidr', {
        method: 'POST',
        body: JSON.stringify({ cidr }),
      }),
  });

  const subscribeMutation = useMutation<void, Error, string>({
    mutationFn: (blocklistId: string) => {
      const url = tenantIdOverride
        ? `/api/dns/subscriptions?tenantId=${tenantIdOverride}`
        : '/api/dns/subscriptions';
      return fetchWithAuth(url, { method: 'POST', body: JSON.stringify({ blocklistId }) });
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
      return fetchWithAuth(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
      queryClient.invalidateQueries({ queryKey: [MY_SUBSCRIPTIONS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const excludeDomainMutation = useMutation<void, Error, string>({
    mutationFn: (domain: string) => {
      const url = tenantIdOverride
        ? `/api/dns/exclusions?tenantId=${tenantIdOverride}`
        : '/api/dns/exclusions';
      return fetchWithAuth(url, { method: 'POST', body: JSON.stringify({ domain }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  const reincludeDomainMutation = useMutation<void, Error, string>({
    mutationFn: (domain: string) => {
      const url = tenantIdOverride
        ? `/api/dns/exclusions/${domain}?tenantId=${tenantIdOverride}`
        : `/api/dns/exclusions/${domain}`;
      return fetchWithAuth(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOCKED_DOMAINS_QUERY_KEY, effectiveTenantId] });
    },
  });

  return {
    blockedDomainsQuery,
    addDomainMutation,
    removeDomainMutation,
    updateDomainMutation,
    removeAllDomainsMutation,
    generateRpzFileMutation,
    extractDomainsMutation,
    extractDomainsFromFileMutation,
    availableBlocklistsQuery,
    mySubscriptionsQuery,
    subscribeMutation,
    unsubscribeMutation,
    blockedIpsQuery,
    addIpMutation,
    removeIpMutation,
    updateIpMutation,
    removeAllIpsMutation,
    analyzeCidrMutation,
    excludeDomainMutation,
    reincludeDomainMutation,
  };
}

export interface AnalyzeCidrOutput {
  ip: string;
  prefix: string;
  cidr: string;
}

// --- Export Blocklist Hook ---
// Separated hook for export functionality
export function useBlocklistExport(tenantIdOverride?: string) {
  const { isAuthenticated } = useAuthStore();

  const exportFormatsQuery = useQuery<ExportFormat[], Error>({
    queryKey: [EXPORT_FORMATS_QUERY_KEY],
    queryFn: () => fetchWithAuth('/api/dns/export/formats'),
    enabled: isAuthenticated,
    staleTime: 0, // Force fresh fetch
  });

  const exportBlocklist = async (format: string): Promise<Blob> => {
    const url = tenantIdOverride
      ? `/api/dns/export?format=${format}&tenantId=${tenantIdOverride}`
      : `/api/dns/export?format=${format}`;

    return fetchBlobWithAuth(url);
  };

  return {
    exportFormatsQuery,
    exportBlocklist,
  };
}

export function useBlocklistDownloadToken({ tenantId }: { tenantId?: string } = {}) {
  const { isAuthenticated } = useAuthStore();

  const generateDownloadTokenMutation = useMutation<
    { token: string },
    Error,
    { format: string; tenantId?: string; listType?: 'dns' | 'ip' }
  >({
    mutationFn: ({ format, tenantId, listType }) =>
      fetchWithAuth('/api/dns/generate-link-token', {
        method: 'POST',
        body: JSON.stringify({ format, tenantId, listType }),
      }),
  });

  const queryParams = new URLSearchParams();
  if (tenantId) queryParams.append('tenantId', tenantId);

  interface LinkInfo {
    token: string;
    format: string;
    list_type?: string;
    expires_at?: string;
  }

  const getDownloadLinkInfoQuery = useQuery<LinkInfo[]>({
    queryKey: ['blocklistLinkInfo', tenantId],
    queryFn: () => fetchWithAuth(`/api/dns/download-link-info?${queryParams.toString()}`),
    enabled: isAuthenticated,
  });

  const deleteDownloadTokenMutation = useMutation<void, Error, string>({
    mutationFn: (tokenToDelete) =>
      fetchWithAuth(`/api/dns/download-link?token=${encodeURIComponent(tokenToDelete)}`, {
        method: 'DELETE',
      }),
  });

  return {
    generateDownloadTokenMutation,
    getDownloadLinkInfoQuery,
    deleteDownloadTokenMutation,
  };
}

// --- IP Export Hook ---

export interface EquipmentFormat {
  id: string;
  name: string;
  description: string;
  extension: string;
}

const IP_EXPORT_FORMATS_QUERY_KEY = 'ipExportFormats_v2';

export function useIpExport(tenantIdOverride?: string) {
  const { isAuthenticated } = useAuthStore();

  const ipExportFormatsQuery = useQuery<EquipmentFormat[], Error>({
    queryKey: [IP_EXPORT_FORMATS_QUERY_KEY],
    queryFn: () => fetchWithAuth('/api/ip/export/formats'),
    enabled: isAuthenticated,
    staleTime: 0, // Force fresh fetch
  });

  const exportIps = async (equipment: string): Promise<Blob> => {
    const url = tenantIdOverride
      ? `/api/ip/export?equipment=${equipment}&tenantId=${tenantIdOverride}`
      : `/api/ip/export?equipment=${equipment}`;

    return fetchBlobWithAuth(url);
  };

  return {
    ipExportFormatsQuery,
    exportIps,
  };
}
