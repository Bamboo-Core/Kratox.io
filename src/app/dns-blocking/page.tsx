"use client";

import { useState, useEffect, type FormEvent, ChangeEvent, useMemo } from 'react';
import PageHeader from '@/components/layout/page-header';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2, Download, Sparkles, FileScan, ListChecks, UploadCloud, FileText, CheckCircle, Edit, Calculator, EyeOff, Eye, BookOpen } from 'lucide-react';
import useDnsBlocking, { useBlocklistExport, useIpExport } from '@/hooks/useDnsBlocking';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useAuthStore } from '@/store/auth-store';
import { useTenantsQuery } from '@/hooks/useAdminManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Link as LinkIcon, AlertTriangle, Monitor, Globe, RefreshCw } from 'lucide-react';
import { useBlocklistDownloadToken, type AnalyzeCidrOutput } from '@/hooks/useDnsBlocking';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import AppFooter from '@/components/layout/app-footer';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function DnsBlockingPage() {
  const [isClient, setIsClient] = useState(false);
  const [domainToBlock, setDomainToBlock] = useState("");
  const [textToAnalyze, setTextToAnalyze] = useState("");
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('hosts');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("dns");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionSearchQuery, setSuggestionSearchQuery] = useState("");
  const [suggestionPage, setSuggestionPage] = useState(1);
  const [suggestionRowsPerPage, setSuggestionRowsPerPage] = useState(10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [textAnalysisProgress, setTextAnalysisProgress] = useState(0);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [fileAnalysisProgress, setFileAnalysisProgress] = useState(0);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [manualAddError, setManualAddError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string, domain: string } | null>(null);
  const { t } = useTranslation();

  // Get user info and tenants list for admin dropdown
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { data: tenants = [] } = useTenantsQuery();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set default tenant to user's tenant when admin loads
  useEffect(() => {
    if (isAdmin && user?.tenantId && !selectedTenantId) {
      setSelectedTenantId(user.tenantId);
    }
  }, [isAdmin, user?.tenantId, selectedTenantId]);

  // Update selected export format when active tab changes
  useEffect(() => {
    if (activeTab === 'ip') {
      setSelectedExportFormat('default');
    } else {
      setSelectedExportFormat('hosts');
    }
  }, [activeTab]);

  const { toast } = useToast();
  const {
    blockedDomainsQuery,
    addDomainMutation,
    addDomainsBulkMutation,
    removeDomainMutation,
    updateDomainMutation,
    generateRpzFileMutation,
    extractDomainsMutation,
    extractDomainsFromFileMutation,
    // New hooks for subscriptions
    availableBlocklistsQuery,
    mySubscriptionsQuery,
    subscribeMutation,
    unsubscribeMutation,
    blockedIpsQuery,
    addIpMutation,
    removeIpMutation,
    updateIpMutation,

    removeAllDomainsMutation,
    removeAllIpsMutation,
    analyzeCidrMutation,
    excludeDomainMutation,
    reincludeDomainMutation,
  } = useDnsBlocking(isAdmin ? selectedTenantId : undefined);

  // Export hooks - DNS formats for domains, Equipment formats for IPs
  const { exportFormatsQuery, exportBlocklist } = useBlocklistExport(isAdmin ? selectedTenantId : undefined);
  const { data: exportFormats = [] } = exportFormatsQuery;

  const { ipExportFormatsQuery, exportIps } = useIpExport(isAdmin ? selectedTenantId : undefined);
  const { data: ipExportFormats = [] } = ipExportFormatsQuery;

  const { data: blockedDomains = [], isLoading: isLoadingDomains, isError: isErrorDomains, error: errorDomains } = blockedDomainsQuery;
  const { data: blockedIps = [], isLoading: isLoadingIps, isError: isErrorIps, error: errorIps } = blockedIpsQuery;
  const isLoading = isLoadingDomains || isLoadingIps;
  const isError = isErrorDomains || isErrorIps;
  const error = errorDomains || errorIps;
  const { data: availableBlocklists = [] } = availableBlocklistsQuery;
  const { data: mySubscriptions = [] } = mySubscriptionsQuery;

  // Helper to check if string is IP or CIDR (Improved)
  const isValidIP = (value: string) => {
    const ipv4Regex = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/(?:[0-2]?[0-9]|3[0-2]))?$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$/;
    return ipv4Regex.test(value) || ipv6Regex.test(value);
  };

  const isValidDomain = (value: string) => {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
    return domainRegex.test(value);
  };

  const detectInputType = (value: string): 'ip' | 'domain' | 'none' => {
    if (!value) return 'none';
    const trimmed = value.trim();
    if (/^[0-9a-fA-F.:/]+$/.test(trimmed) && (trimmed.includes('.') || trimmed.includes(':'))) {
      return 'ip';
    }
    return 'domain';
  };

  const isIpAddress = (str: string) => isValidIP(str);

  const formatIp = (value: string, prevValue: string) => {
    if (value.includes(':')) return value; // Don't format IPv6
    if (value.length < prevValue.length) return value; // Don't format on delete

    // Only numbers and dots
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');

    // Limit to 4 parts
    const limitedParts = parts.slice(0, 4);

    const formattedParts = limitedParts.map((part, i) => {
      let p = part.substring(0, 3);
      if (parseInt(p) > 255) p = '255';

      // Auto-add dot if 3 digits and not at the end
      if (p.length === 3 && i < 3 && i === limitedParts.length - 1) {
        return p + '.';
      }
      return p;
    });

    return formattedParts.join('.');
  };

  // Filter and Split blocked domains into Domains and IPs
  const { domainsList, ipsList } = useMemo(() => {
    const validDomains = blockedDomains.filter(item =>
      item.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const validIps = blockedIps.filter(item =>
      item.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return { domainsList: validDomains, ipsList: validIps };
  }, [blockedDomains, blockedIps, searchQuery]);

  const currentList = activeTab === 'dns' ? domainsList : ipsList;
  const totalPages = Math.ceil(currentList.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return currentList.slice(startIndex, startIndex + itemsPerPage);
  }, [currentList, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const filteredSuggested = useMemo(() => {
    return suggestedDomains.filter(item =>
      item.toLowerCase().includes(suggestionSearchQuery.toLowerCase())
    );
  }, [suggestedDomains, suggestionSearchQuery]);

  const suggestionTotalPages = Math.ceil(filteredSuggested.length / suggestionRowsPerPage);

  const paginatedSuggestions = useMemo(() => {
    const startIndex = (suggestionPage - 1) * suggestionRowsPerPage;
    return filteredSuggested.slice(startIndex, startIndex + suggestionRowsPerPage);
  }, [filteredSuggested, suggestionPage, suggestionRowsPerPage]);

  const handleSuggestionPageChange = (page: number) => {
    if (page >= 1 && page <= suggestionTotalPages) {
      setSuggestionPage(page);
    }
  };

  const handleAddDomain = (input: string, showToast = true) => {
    if (!input) return;

    if (isIpAddress(input)) {
      addIpMutation.mutate(input, {
        onSuccess: () => {
          if (showToast) toast({ title: t('common.success'), description: t('dnsBlocking.manual.success', { domain: input }) });
          setSuggestedDomains(prev => prev.filter(d => d !== input));
        },
        onError: (error) => {
          if (showToast) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        }
      });
    } else {
      addDomainMutation.mutate(input, {
        onSuccess: () => {
          if (showToast) toast({ title: t('common.success'), description: t('dnsBlocking.manual.success', { domain: input }) });
          setSuggestedDomains(prev => prev.filter(d => d !== input));
        },
        onError: (error) => {
          if (showToast) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        }
      });
    }
  };

  const handleManualAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const val = domainToBlock.trim();
    if (!val) return;

    const type = detectInputType(val);
    if (type === 'ip' && !isValidIP(val)) {
      setManualAddError(t('dnsBlocking.manual.invalidIp') || "IP inválido");
      return;
    }
    if (type === 'domain' && !isValidDomain(val)) {
      setManualAddError(t('dnsBlocking.manual.invalidDomain') || "Domínio inválido");
      return;
    }

    setManualAddError(null);
    handleAddDomain(val);
    setDomainToBlock("");
  };

  const handleBlockAllSuggested = () => {
    const itemsToBlock = suggestedDomains;
    if (itemsToBlock.length === 0) return;

    // Separate IPs from domains
    const domainsToBlock = itemsToBlock.filter(d => !isIpAddress(d));
    const ipsToBlock = itemsToBlock.filter(d => isIpAddress(d));

    const promises: Promise<unknown>[] = [];

    // Domains: single bulk request regardless of list size
    if (domainsToBlock.length > 0) {
      promises.push(
        new Promise((resolve, reject) => {
          addDomainsBulkMutation.mutate(domainsToBlock, {
            onSuccess: resolve,
            onError: reject,
          });
        })
      );
    }

    // IPs still go one-by-one (no bulk IP endpoint yet)
    ipsToBlock.forEach(ip => {
      promises.push(
        new Promise((resolve) => {
          addIpMutation.mutate(ip, { onSuccess: () => resolve(true), onError: () => resolve(false) });
        })
      );
    });

    Promise.all(promises).then(() => {
      toast({ title: t('common.success'), description: t('dnsBlocking.suggestions.itemsAdded', { count: itemsToBlock.length }) });
      setSuggestedDomains([]);
    });
  };

  const handleRemoveDomain = (item: { id: string, domain: string, source_list_id?: string | null, is_excluded?: boolean }) => {
    if (activeTab === 'ip') {
      removeIpMutation.mutate(item.id, {
        onSuccess: () => toast({ title: t('common.success'), description: t('dnsBlocking.remove.success') }),
        onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
      });
      return;
    }

    if (item.source_list_id) {
      if (item.is_excluded) {
        reincludeDomainMutation.mutate(item.domain, {
          onSuccess: () => toast({ title: t('common.success'), description: t('dnsBlocking.domainReincluded') }),
          onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
        });
      } else {
        excludeDomainMutation.mutate(item.domain, {
          onSuccess: () => toast({ title: t('common.success'), description: t('dnsBlocking.domainExcluded') }),
          onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
        });
      }
    } else {
      removeDomainMutation.mutate(item.id, {
        onSuccess: () => toast({ title: t('common.success'), description: t('dnsBlocking.remove.success') }),
        onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
      });
    }
  };

  const handleEditClick = (item: { id: string, domain: string }) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.domain.trim()) return;

    if (activeTab === 'ip') {
      updateIpMutation.mutate({ id: editingItem.id, ip: editingItem.domain }, {
        onSuccess: () => {
          toast({ title: t('common.success'), description: t('dnsBlocking.edit.success') });
          setIsEditModalOpen(false);
          setEditingItem(null);
        },
        onError: (error) => {
          toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        }
      });
    } else {
      updateDomainMutation.mutate({ id: editingItem.id, domain: editingItem.domain }, {
        onSuccess: () => {
          toast({ title: t('common.success'), description: t('dnsBlocking.edit.success') });
          setIsEditModalOpen(false);
          setEditingItem(null);
        },
        onError: (error) => {
          toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        }
      });
    }
  };



  const handleGenerateRpz = () => {
    generateRpzFileMutation.mutate(undefined, {
      onSuccess: (data) => {
        const blob = new Blob([data.rpzContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'rpz.block.hosts.zone');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: t('common.success'), description: t('dnsBlocking.rpz.success') });
      },
      onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
    })
  }

  const handleExportBlocklist = async () => {
    if (!selectedExportFormat) return;
    setIsExporting(true);
    try {
      let blob: Blob;
      let filename: string;
      const date = new Date().toISOString().split('T')[0];

      if (activeTab === 'ip') {
        // Export IPs with equipment format
        blob = await exportIps(selectedExportFormat);
        const format = ipExportFormats.find(f => f.id === selectedExportFormat);
        filename = `blocklist_${selectedExportFormat}_ip_${date}.${format?.extension || 'txt'}`;
      } else {
        // Export DNS domains with standard format
        blob = await exportBlocklist(selectedExportFormat);
        const format = exportFormats.find(f => f.id === selectedExportFormat);
        filename = `blocklist_${selectedExportFormat}_${date}.${format?.extension || 'txt'}`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const formatName = activeTab === 'ip'
        ? ipExportFormats.find(f => f.id === selectedExportFormat)?.name
        : exportFormats.find(f => f.id === selectedExportFormat)?.name;
      toast({ title: t('common.success'), description: t('dnsBlocking.blockedList.exportSuccess', { format: formatName || selectedExportFormat }) });
    } catch (error) {
      toast({ variant: 'destructive', title: t('dnsBlocking.blockedList.exportError'), description: error instanceof Error ? error.message : t('dnsBlocking.blockedList.exportFailed') });
    } finally {
      setIsExporting(false);
    }
  }


  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [linkType, setLinkType] = useState('dns');
  const [selectedLinkFormat, setSelectedLinkFormat] = useState('hosts');

  const handleClearAll = () => {
    if (activeTab === 'ip') {
      removeAllIpsMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: t('common.success'), description: t('dnsBlocking.blockedList.clearAllSuccess') });
          setShowClearAllConfirm(false);
        },
        onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
      });
    } else {
      removeAllDomainsMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: t('common.success'), description: t('dnsBlocking.blockedList.clearAllSuccess') });
          setShowClearAllConfirm(false);
        },
        onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
      });
    }
  };

  // Pass selectedTenantId to hook to fetch correct link info 
  // (Assuming isAdmin is available here, if not need to verify scope. Yes, isAdmin is from useAuthStore higher up)
  const { generateDownloadTokenMutation, getDownloadLinkInfoQuery, deleteDownloadTokenMutation } = useBlocklistDownloadToken({
    tenantId: isAdmin && selectedTenantId ? selectedTenantId : undefined
  });

  const activeLinks = Array.isArray(getDownloadLinkInfoQuery.data) ? getDownloadLinkInfoQuery.data : [];

  const [linkToDelete, setLinkToDelete] = useState<{ token: string } | null>(null);
  const [linkToRegenerate, setLinkToRegenerate] = useState<{ token: string, format: string, listType: string } | null>(null);

  const confirmDeleteLink = () => {
    if (linkToDelete) {
      deleteDownloadTokenMutation.mutate(linkToDelete.token, {
        onSuccess: () => {
          toast({ description: t('dnsBlocking.link.delete.success') });
          getDownloadLinkInfoQuery.refetch();
          setLinkToDelete(null);
        },
        onError: () => toast({ variant: "destructive", description: t('dnsBlocking.link.delete.error') })
      });
    }
  };

  const confirmRegenerateLink = () => {
    if (linkToRegenerate) {
      deleteDownloadTokenMutation.mutate(linkToRegenerate.token, {
        onSuccess: () => {
          generateDownloadTokenMutation.mutate({
            format: linkToRegenerate.format,
            listType: linkToRegenerate.listType as 'dns' | 'ip',
            tenantId: isAdmin && selectedTenantId ? selectedTenantId : undefined
          }, {
            onSuccess: () => {
              toast({ description: t('dnsBlocking.link.regenerate.success') });
              getDownloadLinkInfoQuery.refetch();
              setLinkToRegenerate(null);
            },
            onError: () => toast({ variant: "destructive", description: t('dnsBlocking.link.regenerate.error') })
          });
        },
        onError: () => toast({ variant: "destructive", description: t('dnsBlocking.link.regenerate.error') })
      });
    }
  };

  const handleGenerateLink = () => {
    // Determine the list type from the selected format if possible, or use explicit state?
    // Using explicit state linkType ('dns' or 'ip')
    generateDownloadTokenMutation.mutate({
      format: selectedLinkFormat,
      tenantId: isAdmin && selectedTenantId ? selectedTenantId : undefined,
      listType: linkType as 'dns' | 'ip'
    }, {
      onSuccess: (data) => {
        toast({ title: t('common.success'), description: t('dnsBlocking.link.modal.generateSuccess') });
        setShowRegenerateConfirm(false);
        getDownloadLinkInfoQuery.refetch();
      },
      onError: (error) => {
        toast({ variant: 'destructive', title: t('common.error'), description: error.message });
      }
    });
  };

  const copyToClipboard = (link: string) => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: t('common.success'), description: t('dnsBlocking.link.modal.copySuccess') });
    }
  };

  const handleLinkModalOpenChange = (open: boolean) => {
    setIsLinkModalOpen(open);
    if (open) {
      setLinkType(activeTab === 'ip' ? 'ip' : 'dns');
      // Set default format based on active tab
      if (activeTab === 'ip' && ipExportFormats.length > 0) {
        setSelectedLinkFormat(ipExportFormats[0].id);
      } else if (activeTab === 'dns' && exportFormats.length > 0) {
        setSelectedLinkFormat(exportFormats[0].id);
      }
    }
  };

  const handleTextAnalysisSuccess = (data: { domains: string[], ipv4?: string[], ipv6?: string[], cidrs?: AnalyzeCidrOutput[] }) => {
    const extractedDomains = data.domains || [];
    const extractedIps = [...(data.ipv4 || []), ...(data.ipv6 || [])];
    const extractedCidrs = (data.cidrs || []).map(c => c.cidr);

    const newDomains = extractedDomains.filter(d => !blockedDomains.some(bd => bd.domain === d));
    const newIps = extractedIps.filter(ip => !blockedIps.some(bi => bi.domain === ip));
    // CIDRs are treated as IPs for blocking purposes
    const newCidrs = extractedCidrs.filter(cidr => !blockedIps.some(bi => bi.domain === cidr));

    const allNewItems = [...newDomains, ...newIps, ...newCidrs];

    if (allNewItems.length === 0) {
      toast({ title: t('dnsBlocking.analysis.successTitle'), description: t('dnsBlocking.analysis.noNewDomains') });
    } else {
      setSuggestedDomains(allNewItems);
      toast({ title: t('dnsBlocking.analysis.successTitle'), description: `${allNewItems.length} ${t('dnsBlocking.analysis.newDomainsFound')}` });
    }
  };

  const startProgressSimulation = (
    setProgress: (val: (prev: number) => number) => void,
    setStatus: (val: boolean) => void
  ) => {
    setStatus(true);
    setProgress(() => 0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) return prev + 5;
        if (prev < 70) return prev + 2;
        if (prev < 90) return prev + 0.5;
        if (prev < 98) return prev + 0.1;
        return prev;
      });
    }, 200);
    return interval;
  };

  const handleAnalyzeText = () => {
    if (!textToAnalyze.trim()) return;
    const progressInterval = startProgressSimulation(setTextAnalysisProgress, setIsAnalyzingText);

    extractDomainsMutation.mutate(textToAnalyze, {
      onSuccess: (data) => {
        clearInterval(progressInterval);
        setTextAnalysisProgress(() => 100);
        setTimeout(() => {
          setIsAnalyzingText(false);
          setTextAnalysisProgress(0);
          handleTextAnalysisSuccess(data);
        }, 500);
      },
      onError: (error) => {
        clearInterval(progressInterval);
        setIsAnalyzingText(false);
        setTextAnalysisProgress(0);
        toast({ variant: 'destructive', title: t('dnsBlocking.analysis.failed'), description: error.message });
      }
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;
    const progressInterval = startProgressSimulation(setFileAnalysisProgress, setIsAnalyzingFile);

    try {
      const fileDataUri = await fileToDataUri(selectedFile);
      extractDomainsFromFileMutation.mutate(fileDataUri, {
        onSuccess: (data) => {
          clearInterval(progressInterval);
          setFileAnalysisProgress(() => 100);
          setTimeout(() => {
            setIsAnalyzingFile(false);
            setFileAnalysisProgress(0);
            handleTextAnalysisSuccess(data);
          }, 500);
        },
        onError: (error) => {
          clearInterval(progressInterval);
          setIsAnalyzingFile(false);
          setFileAnalysisProgress(0);
          toast({ variant: 'destructive', title: t('dnsBlocking.analysis.failed'), description: error.message });
        }
      });
    } catch (error) {
      clearInterval(progressInterval);
      setIsAnalyzingFile(false);
      setFileAnalysisProgress(0);
      toast({ variant: 'destructive', title: t('dnsBlocking.analysis.fileReadError'), description: t('dnsBlocking.analysis.couldNotRead') });
    }
  };



  const handleSubscriptionToggle = (blocklistId: string, isSubscribed: boolean) => {
    const mutation = isSubscribed ? unsubscribeMutation : subscribeMutation;
    mutation.mutate(blocklistId, {
      onSuccess: () => toast({ title: t('common.success'), description: t('dnsBlocking.feeds.subscriptionUpdated') }),
      onError: (err) => toast({ variant: 'destructive', title: t('common.error'), description: t(err.message) })
    });
  };


  if (!isClient) {
    return (
      <div className="flex flex-col h-full"><PageHeader title={t('dnsBlocking.title')} /><main className="flex-1 p-4 md:p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></main></div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="fixed-top">
        <PageHeader title={t('dnsBlocking.title')} />
      </div>
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">

        {/* New Blocklist Feeds Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t('dnsBlocking.feeds.title')}</CardTitle>
            <CardDescription>{t('dnsBlocking.feeds.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableBlocklistsQuery.isLoading && <div className="text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /> {t('dnsBlocking.feeds.loading')}</div>}
            {availableBlocklists.map(list => {
              const isSubscribed = mySubscriptions.includes(list.id);
              const isMutating = subscribeMutation.isPending && subscribeMutation.variables === list.id ||
                unsubscribeMutation.isPending && unsubscribeMutation.variables === list.id;
              return (
                <div key={list.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <h4 className="font-semibold">{list.name}</h4>
                    <p className="text-sm text-muted-foreground">{list.description} ({t('dnsBlocking.feeds.source')}: {list.source})</p>
                    <p className="text-xs text-muted-foreground">{list.domain_count} {t('dnsBlocking.feeds.domainsCount')}</p>
                  </div>
                  <Button
                    variant={isSubscribed ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleSubscriptionToggle(list.id, isSubscribed)}
                    className="bg-orange-500 hover:bg-orange-600 cursor-pointer"
                    disabled={isMutating}
                  >
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSubscribed ? <CheckCircle className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
                    {isSubscribed ? t('dnsBlocking.feeds.subscribed') : t('dnsBlocking.feeds.subscribe')}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* AI and Manual Additions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileScan className="h-6 w-6 text-orange-500" />
                {t('dnsBlocking.analysis.textTitle')}
              </CardTitle>
              <CardDescription>
                {t('dnsBlocking.analysis.textDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Textarea
                placeholder={t('dnsBlocking.analysis.textPlaceholder')}
                value={textToAnalyze}
                onChange={(e) => setTextToAnalyze(e.target.value)}
                rows={5}
                disabled={isAnalyzingText}
              />
              {isAnalyzingText && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{t('common.loading')}</span>
                    <span>{Math.round(textAnalysisProgress)}%</span>
                  </div>
                  <Progress value={textAnalysisProgress} className="h-1.5 bg-orange-500/10" indicatorClassName="bg-orange-500" />
                </div>
              )}
            </CardContent>

            <CardFooter className="mt-auto">
              <Button
                onClick={handleAnalyzeText}
                className="bg-orange-500 hover:bg-orange-600 cursor-pointer w-full"
                disabled={!textToAnalyze.trim() || extractDomainsMutation.isPending}
              >
                {extractDomainsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {t('dnsBlocking.analysis.analyzeButton')}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-orange-500" />
                {t('dnsBlocking.analysis.fileTitle')}
              </CardTitle>
              <CardDescription>
                {t('dnsBlocking.analysis.fileDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Label htmlFor="file-upload" className="sr-only">
                Upload PDF
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isAnalyzingFile}
              />
              {selectedFile && !isAnalyzingFile && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2 animate-in fade-in duration-300">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                </div>
              )}
              {isAnalyzingFile && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{t('common.loading')}</span>
                    <span>{Math.round(fileAnalysisProgress)}%</span>
                  </div>
                  <Progress value={fileAnalysisProgress} className="h-1.5 bg-orange-500/10" indicatorClassName="bg-orange-500" />
                </div>
              )}
            </CardContent>

            <CardFooter className="mt-auto">
              <Button
                onClick={handleAnalyzeFile}
                className="bg-orange-500 hover:bg-orange-600 cursor-pointer w-full"
                disabled={!selectedFile || extractDomainsFromFileMutation.isPending}
              >
                {extractDomainsFromFileMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {t('dnsBlocking.analysis.fileButton')}
              </Button>
            </CardFooter>
          </Card>



          <Card className="shadow-lg flex flex-col h-full md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-6 w-6 text-orange-500" />
                {t('dnsBlocking.manual.title')}
              </CardTitle>
              <CardDescription>
                {t('dnsBlocking.manual.description')}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleManualAddSubmit} className="flex flex-col h-full">
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="domainToBlock">{t('dnsBlocking.manual.label')}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="domainToBlock"
                        placeholder={t('dnsBlocking.manual.placeholder')}
                        value={domainToBlock}
                        onChange={(e) => {
                          let val = e.target.value;
                          const type = detectInputType(val);
                          
                          if (type === 'ip') {
                            val = formatIp(val, domainToBlock);
                          }
                          
                          setDomainToBlock(val);
                          if (manualAddError) setManualAddError(null);
                        }}
                        onBlur={() => {
                          const val = domainToBlock.trim();
                          if (!val) return;
                          const type = detectInputType(val);
                          if (type === 'ip' && !isValidIP(val)) setManualAddError(t('dnsBlocking.manual.invalidIp') || "IP inválido");
                          else if (type === 'domain' && !isValidDomain(val)) setManualAddError(t('dnsBlocking.manual.invalidDomain') || "Domínio inválido");
                          else setManualAddError(null);
                        }}
                        className={cn(
                          "transition-all duration-200 pr-16",
                          manualAddError && "border-destructive focus-visible:ring-destructive bg-destructive/5"
                        )}
                        disabled={addDomainMutation.isPending}
                      />
                      {domainToBlock && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-200 pointer-events-none">
                          <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-bold bg-background/50 border-orange-500/20 text-orange-500 uppercase tracking-widest">
                            {detectInputType(domainToBlock) === 'ip' ? 'IP' : 'Domínio'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {manualAddError && (
                      <p className="text-[11px] text-destructive mt-1.5 font-medium animate-in slide-in-from-top-1 duration-200">
                        {manualAddError}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="mt-auto">
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 cursor-pointer w-full"
                  disabled={!domainToBlock.trim() || addDomainMutation.isPending}
                >
                  {addDomainMutation.isPending &&
                    addDomainMutation.variables === domainToBlock.trim() ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('dnsBlocking.manual.button')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        {suggestedDomains.length > 0 && (
          <Card className="shadow-lg border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  {t('dnsBlocking.suggestions.title')}
                </CardTitle>
                <CardDescription>{t('dnsBlocking.suggestions.description')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-destructive hover:text-white cursor-pointer"
                  onClick={() => { setSuggestedDomains([]); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.clear')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:bg-orange-500 hover:text-white border-orange-500/50 cursor-pointer"
                  onClick={handleBlockAllSuggested}
                  disabled={addDomainMutation.isPending || addDomainsBulkMutation.isPending || suggestedDomains.length === 0}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  {t('dnsBlocking.suggestions.blockAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 max-w-sm mb-2">
                <Input
                  placeholder={t('common.search')}
                  value={suggestionSearchQuery}
                  onChange={(e) => {
                    setSuggestionSearchQuery(e.target.value);
                    setSuggestionPage(1);
                  }}
                  className="h-9 focus-visible:ring-orange-500"
                />
              </div>

              <div className="border rounded-lg overflow-hidden border-orange-500/10">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[120px]">{t('common.type')}</TableHead>
                      <TableHead>{t('dnsBlocking.blockedList.table.domain')}</TableHead>
                      <TableHead className="text-right">{t('dnsBlocking.blockedList.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSuggestions.length > 0 ? (
                      paginatedSuggestions.map((domain) => {
                        const isIP = isIpAddress(domain);
                        return (
                          <TableRow key={domain} className="h-16 group transition-colors hover:bg-orange-500/5">
                            <TableCell>
                              <Badge variant={isIP ? "outline" : "secondary"} className={isIP ? "border-blue-500/50 text-blue-400" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}>
                                {isIP ? 'IP/CIDR' : 'Domain'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {domain}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAddDomain(domain)}
                                className="h-8 w-8 hover:bg-orange-500 hover:text-white cursor-pointer group-hover:scale-110 transition-transform"
                                title={t('common.add')}
                                disabled={addDomainMutation.isPending}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSuggestedDomains(prev => prev.filter(d => d !== domain))}
                                className="h-8 w-8 hover:bg-destructive hover:text-white cursor-pointer ml-1"
                                title={t('common.remove')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          {suggestionSearchQuery ? t('dnsBlocking.blockedList.empty') : t('dnsBlocking.analysis.noNewDomains')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {filteredSuggested.length > suggestionRowsPerPage && (
                  <div className="flex items-center justify-between gap-4 py-3 px-4 border-t bg-muted/20">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('common.itemsPerPage')}</span>
                      <Select value={suggestionRowsPerPage.toString()} onValueChange={(v) => { setSuggestionRowsPerPage(parseInt(v)); setSuggestionPage(1); }}>
                        <SelectTrigger className="w-[70px] h-8 focus:ring-orange-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={size.toString()} className="focus:bg-orange-500 focus:text-white cursor-pointer">{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DataTablePagination currentPage={suggestionPage} totalPages={suggestionTotalPages} onPageChange={handleSuggestionPageChange} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Card className="shadow-lg">

            <CardHeader><div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeTab === 'dns' ? <ShieldAlert className="h-6 w-6 text-orange-500" /> : <Monitor className="h-6 w-6 text-orange-500" />}
                  {activeTab === 'dns' ? t('dnsBlocking.blockedList.title') : t('dnsBlocking.ips.title')}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'dns' ? t('dnsBlocking.blockedList.description') : t('dnsBlocking.ips.description')}
                </CardDescription>
                <TabsList className="mt-4">
                  <TabsTrigger value="dns" className="gap-2"><Globe className="h-4 w-4" /> {t('dnsBlocking.tabs.domains')}</TabsTrigger>
                  <TabsTrigger value="ip" className="gap-2"><Monitor className="h-4 w-4" /> {t('dnsBlocking.tabs.ips')}</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <Input
                    placeholder={activeTab === 'dns' ? t('dnsBlocking.search.dnsPlaceholder') : t('dnsBlocking.search.ipPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive hover:text-white cursor-pointer"
                    onClick={() => setShowClearAllConfirm(true)}
                    disabled={activeTab === 'dns' ? blockedDomains.length === 0 : blockedIps.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('dnsBlocking.blockedList.clearAll')}
                  </Button>
                  {isAdmin && (
                    <Select value={selectedTenantId || ''} onValueChange={(value) => setSelectedTenantId(value || undefined)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t('dnsBlocking.blockedList.selectTenant')} />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id} className="focus:bg-orange-500 focus:text-white cursor-pointer">{tenant.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={selectedExportFormat} onValueChange={setSelectedExportFormat}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={t('dnsBlocking.blockedList.format')} />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {(activeTab === 'ip' ? ipExportFormats : exportFormats).map((format) => (
                        <SelectItem key={format.id} value={format.id} title={format.description} className="focus:bg-orange-500 focus:text-white cursor-pointer">{format.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleExportBlocklist} className="bg-orange-500 hover:bg-orange-600 cursor-pointer" disabled={isExporting || (isAdmin && !selectedTenantId) || (activeTab === 'dns' ? blockedDomains.length === 0 : blockedIps.length === 0)}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{t('dnsBlocking.blockedList.exportButton')}
                  </Button>
                  <Button onClick={() => setIsLinkModalOpen(true)} variant="outline" className="cursor-pointer hover:bg-orange-500 hover:text-black" disabled={activeTab === 'dns' && blockedDomains.length === 0 || (isAdmin && !selectedTenantId)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {t('dnsBlocking.link.button')}
                  </Button>

                  <Dialog open={isLinkModalOpen} onOpenChange={handleLinkModalOpenChange}>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{t('dnsBlocking.link.modal.title')}</DialogTitle>
                        <DialogDescription>
                          {t('dnsBlocking.link.modal.description')}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4 space-y-6">
                        {/* Generation Form */}
                        <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('dnsBlocking.link.modal.generateNew')}</h3>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t('common.type')}</Label>
                              <Select value={linkType} onValueChange={(v) => {
                                setLinkType(v);
                                // Reset format when type changes
                                if (v === 'ip' && ipExportFormats.length > 0) setSelectedLinkFormat(ipExportFormats[0].id);
                                if (v === 'dns' && exportFormats.length > 0) setSelectedLinkFormat(exportFormats[0].id);
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dns" className="cursor-pointer focus:bg-orange-500 focus:text-white">DNS</SelectItem>
                                  <SelectItem value="ip" className="cursor-pointer focus:bg-orange-500 focus:text-white">IP</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>{t('dnsBlocking.link.modal.formatLabel')}</Label>
                              <Select value={selectedLinkFormat} onValueChange={setSelectedLinkFormat}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(linkType === 'ip' ? ipExportFormats : exportFormats).map((format) => (
                                    <SelectItem key={format.id} value={format.id} className="cursor-pointer focus:bg-orange-500 focus:text-white">
                                      {format.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Counter and Generate Button */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{activeLinks.length}/2</span>
                              {activeLinks.length >= 2 && (
                                <span className="text-destructive text-xs">{t('dnsBlocking.link.limitReached')}</span>
                              )}
                            </div>
                            <Button
                              onClick={handleGenerateLink}
                              disabled={generateDownloadTokenMutation.isPending || (isAdmin && !selectedTenantId) || activeLinks.length >= 2}
                              className="bg-orange-500 hover:bg-orange-600 w-full"
                            >
                              {generateDownloadTokenMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {activeLinks.length >= 2 ? t('dnsBlocking.link.deleteToCreateNew') : t('dnsBlocking.link.modal.generateButton')}
                            </Button>
                          </div>
                        </div>

                        {/* Active Links Table */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('dnsBlocking.link.activeLinks')}</h3>
                          {activeLinks.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">{t('dnsBlocking.link.noActiveLinks')}</p>
                          ) : (
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('common.type')}</TableHead>
                                    <TableHead>{t('common.format')}</TableHead>
                                    <TableHead>{t('common.link')}</TableHead>
                                    {/* <TableHead>{t('Expires')}</TableHead> */}
                                    <TableHead className="text-right">{t('common.action')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {activeLinks.map((link, idx) => {
                                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
                                    const fullLink = `${apiUrl}/download/${link.token}`;
                                    return (
                                      <TableRow key={idx}>
                                        <TableCell className="capitalize">
                                          <Badge variant={link.list_type === 'ip' ? 'outline' : 'secondary'}>
                                            {link.list_type || 'dns'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{link.format}</TableCell>
                                        <TableCell>
                                          <div className="max-w-[300px] truncate text-xs font-mono bg-muted p-1 rounded">
                                            {fullLink}
                                          </div>
                                        </TableCell>
                                        {/* <TableCell className="text-xs text-muted-foreground">
                                         {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Never'}
                                       </TableCell> */}
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(fullLink)} title={t('common.copy')} className="hover:bg-orange-500 focus:bg-orange-500 focus:text-white">
                                              <Copy className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setLinkToRegenerate({ token: link.token, format: link.format, listType: link.list_type || 'dns' })} title={t('dnsBlocking.link.regenerate.tooltip')} className="hover:bg-orange-500 focus:bg-orange-500 focus:text-white">
                                              <RefreshCw className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setLinkToDelete({ token: link.token })} title={t('dnsBlocking.link.delete.tooltip')} className="hover:bg-orange-500 focus:bg-orange-500 focus:text-white">
                                              <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        {/* Documentation Shortcut */}
                        <div className="mt-4 p-5 border rounded-xl bg-orange-500/[0.03] border-orange-500/10 flex flex-col items-center text-center space-y-4">
                          <div className="bg-orange-500/10 p-2 rounded-full">
                            <BookOpen className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Possui dúvidas sobre a integração?</p>
                            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                              Em casos de dúvidas ou para entender melhor como utilizar de maneira correta, visite a documentação oficial da plataforma Kratox.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white cursor-pointer transition-all active:scale-95"
                            onClick={() => window.open('/docs/technical', '_blank')}
                          >
                            <BookOpen className="h-4 w-4" />
                            {t('footer.documentation')}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('dnsBlocking.link.confirm.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('dnsBlocking.link.confirm.description')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('dnsBlocking.link.confirm.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleGenerateLink(); }} className="bg-destructive hover:bg-destructive/90">
                          {t('dnsBlocking.link.confirm.confirmButton')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('dnsBlocking.blockedList.clearAllConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('dnsBlocking.blockedList.clearAllConfirmDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleClearAll(); }} className="bg-destructive hover:bg-destructive/90">
                          {removeAllDomainsMutation.isPending || removeAllIpsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {t('common.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Edit Modal */}
                  <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('dnsBlocking.edit.title')}</DialogTitle>
                        <DialogDescription>
                          {t('dnsBlocking.edit.description')}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="edit-domain">{t('dnsBlocking.manual.label')}</Label>
                          <Input
                            id="edit-domain"
                            value={editingItem?.domain || ''}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, domain: e.target.value } : null)}
                            className="mt-1"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>{t('common.cancel')}</Button>
                          <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={updateDomainMutation.isPending}>
                            {updateDomainMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('common.save')}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="dns" className="mt-0">
                {isLoading ? (<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /><p className="ml-2">{t('dnsBlocking.blockedList.loading')}</p></div>) : isError ? (<Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error?.message || t('common.unknownError')}</AlertDescription></Alert>) : domainsList.length > 0 ? (
                  <div className='border rounded-lg'>
                    <Table><TableHeader><TableRow><TableHead>{t('dnsBlocking.blockedList.table.domain')}</TableHead><TableHead>{t('dnsBlocking.blockedList.table.source')}</TableHead><TableHead>{t('dnsBlocking.blockedList.table.blockedAt')}</TableHead><TableHead className="text-right">{t('dnsBlocking.blockedList.table.actions')}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {paginatedItems.map((item) => (
                          <TableRow key={item.id} className={removeDomainMutation.isPending && removeDomainMutation.variables === item.id ? 'opacity-50' : ''}>
                            <TableCell className={`font-medium font-mono h-16 ${item.is_excluded ? 'line-through opacity-50' : ''}`}>{item.domain}</TableCell>
                            <TableCell className={`h-16 ${item.is_excluded ? 'opacity-50' : ''}`}><Badge variant={item.source_list_name ? 'secondary' : 'outline'}>{item.source_list_name || 'Manual'}</Badge></TableCell>
                            <TableCell className={`h-16 ${item.is_excluded ? 'opacity-50' : ''}`}>{isClient ? new Date(item.blockedAt).toLocaleString() : ""}</TableCell>
                            <TableCell className="text-right h-16">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="mr-2 hover:bg-orange-100 cursor-pointer" title={t('common.edit')} disabled={!!item.source_list_id}>
                                <Edit className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label={`Unblock domain ${item.domain}`} onClick={() => handleRemoveDomain(item)} className="hover:text-white hover:bg-orange-500 cursor-pointer" disabled={removeDomainMutation.isPending || excludeDomainMutation.isPending || reincludeDomainMutation.isPending} title={item.source_list_id ? (item.is_excluded ? t('dnsBlocking.domainReincluded') : t('dnsBlocking.blockedList.table.unsubscribeTooltip')) : t('dnsBlocking.blockedList.table.removeTooltip')}>
                                {item.source_list_id ? (item.is_excluded ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />) : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {Array.from({ length: Math.max(0, Math.min(itemsPerPage, domainsList.length) - paginatedItems.length) }).map((_, index) => (
                          <TableRow key={`empty-${index}`}>
                            <TableCell colSpan={4} className="h-16"></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between gap-4 py-2 px-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t('common.itemsPerPage')}</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size} value={size.toString()} className="focus:bg-orange-500 focus:text-white cursor-pointer">{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DataTablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </div>
                  </div>
                ) : (<p className="py-4 text-center text-muted-foreground">{t('dnsBlocking.blockedList.empty')}</p>)}
              </TabsContent>
              <TabsContent value="ip" className="mt-0">
                {isLoading ? (<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /><p className="ml-2">{t('dnsBlocking.blockedList.loading')}</p></div>) : ipsList.length > 0 ? (
                  <div className='border rounded-lg'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dnsBlocking.ips.table.ip')}</TableHead>
                          <TableHead>{t('dnsBlocking.blockedList.table.source')}</TableHead>
                          <TableHead>{t('dnsBlocking.blockedList.table.blockedAt')}</TableHead>
                          <TableHead className="text-right">{t('dnsBlocking.blockedList.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.map((item) => (
                          <TableRow key={item.id} className={removeDomainMutation.isPending && removeDomainMutation.variables === item.id ? 'opacity-50' : ''}>
                            <TableCell className="font-medium font-mono h-16">{item.domain}</TableCell>
                            <TableCell className="h-16"><Badge variant={item.source_list_name ? 'secondary' : 'outline'}>{item.source_list_name || 'Manual'}</Badge></TableCell>
                            <TableCell className="h-16">{isClient ? new Date(item.blockedAt).toLocaleString() : ""}</TableCell>
                            <TableCell className="text-right h-16">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="mr-2 hover:bg-orange-100 cursor-pointer" title={t('common.edit')} disabled={!!item.source_list_id}>
                                <Edit className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveDomain(item)} className="hover:text-white hover:bg-orange-500 cursor-pointer" disabled={removeDomainMutation.isPending || !!item.source_list_id} title={t('dnsBlocking.blockedList.table.removeTooltip')}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {Array.from({ length: Math.max(0, Math.min(itemsPerPage, ipsList.length) - paginatedItems.length) }).map((_, index) => (
                          <TableRow key={`empty-${index}`}>
                            <TableCell colSpan={4} className="h-16"></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between gap-4 py-2 px-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t('common.itemsPerPage')}</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size} value={size.toString()} className="focus:bg-orange-500 focus:text-white cursor-pointer">{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DataTablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">{t('dnsBlocking.ips.empty')}</p>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </main>

      <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dnsBlocking.link.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dnsBlocking.link.delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLink} className="bg-red-500 hover:bg-red-600">{t('dnsBlocking.link.delete.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!linkToRegenerate} onOpenChange={(open) => !open && setLinkToRegenerate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dnsBlocking.link.regenerate.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dnsBlocking.link.regenerate.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegenerateLink}>{t('dnsBlocking.link.regenerate.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AppFooter />
    </div >
  );
}
