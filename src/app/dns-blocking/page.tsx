"use client";

import { useState, useEffect, type FormEvent, ChangeEvent, useMemo } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2, Download, Sparkles, FileScan, ListChecks, UploadCloud, FileText, CheckCircle } from 'lucide-react';
import useDnsBlocking, { useBlocklistExport } from '@/hooks/useDnsBlocking';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useAuthStore } from '@/store/auth-store';
import { useTenantsQuery } from '@/hooks/useAdminManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 10;

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
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [selectedExportFormat, setSelectedExportFormat] = useState<string>('hosts');
  const [isExporting, setIsExporting] = useState(false);
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

  const { toast } = useToast();
  const {
    blockedDomainsQuery,
    addDomainMutation,
    removeDomainMutation,
    generateRpzFileMutation,
    extractDomainsMutation,
    extractDomainsFromFileMutation,
    // New hooks for subscriptions
    availableBlocklistsQuery,
    mySubscriptionsQuery,
    subscribeMutation,
    unsubscribeMutation,
  } = useDnsBlocking(isAdmin ? selectedTenantId : undefined);

  // Export hook
  const { exportFormatsQuery, exportBlocklist } = useBlocklistExport(isAdmin ? selectedTenantId : undefined);
  const { data: exportFormats = [] } = exportFormatsQuery;

  const { data: blockedDomains = [], isLoading, isError, error } = blockedDomainsQuery;
  const { data: availableBlocklists = [] } = availableBlocklistsQuery;
  const { data: mySubscriptions = [] } = mySubscriptionsQuery;

  const totalPages = Math.ceil(blockedDomains.length / ITEMS_PER_PAGE);

  const paginatedDomains = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return blockedDomains.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [blockedDomains, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleAddDomain = (domain: string, showToast = true) => {
    if (!domain) return;
    addDomainMutation.mutate(domain, {
      onSuccess: () => {
        if (showToast) toast({ title: t('common.success'), description: t('dnsBlocking.manual.success', { domain }) });
        setSuggestedDomains(prev => prev.filter(d => d !== domain));
      },
      onError: (error) => {
        if (showToast) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
      }
    });
  };

  const handleManualAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAddDomain(domainToBlock.trim());
    setDomainToBlock("");
  };

  const handleBlockAllSuggested = () => {
    if (suggestedDomains.length === 0) return;
    const domainsToBlock = [...suggestedDomains];
    Promise.all(domainsToBlock.map(domain => {
      return new Promise((resolve) => {
        addDomainMutation.mutate(domain, { onSuccess: () => resolve(true), onError: () => resolve(false) });
      });
    })).then(() => {
      toast({ title: t('common.success'), description: `${domainsToBlock.length} domains have been added to the blocklist.` });
      setSuggestedDomains([]);
    });
  };

  const handleRemoveDomain = (id: string) => {
    removeDomainMutation.mutate(id, {
      onSuccess: () => toast({ title: t('common.success'), description: t('dnsBlocking.remove.success') }),
      onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
    });
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
        toast({ title: t('common.success'), description: 'RPZ zone file generated successfully.' });
      },
      onError: (error) => toast({ variant: 'destructive', title: t('common.error'), description: error.message })
    })
  }

  const handleExportBlocklist = async () => {
    if (!selectedExportFormat) return;
    setIsExporting(true);
    try {
      const blob = await exportBlocklist(selectedExportFormat);
      const format = exportFormats.find(f => f.id === selectedExportFormat);
      const date = new Date().toISOString().split('T')[0];
      const filename = `blocklist_${selectedExportFormat}_${date}.${format?.extension || 'txt'}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: t('common.success'), description: t('dnsBlocking.blockedList.exportSuccess', { format: format?.name || selectedExportFormat }) });
    } catch (error) {
      toast({ variant: 'destructive', title: t('dnsBlocking.blockedList.exportError'), description: error instanceof Error ? error.message : 'Falha na exportação.' });
    } finally {
      setIsExporting(false);
    }
  }

  const handleTextAnalysisSuccess = (data: { domains: string[] }) => {
    const newDomains = data.domains.filter(d => !blockedDomains.some(bd => bd.domain === d));
    if (newDomains.length === 0) {
      toast({ title: t('dnsBlocking.analysis.successTitle'), description: t('dnsBlocking.analysis.noNewDomains') });
    } else {
      setSuggestedDomains(newDomains);
      toast({ title: t('dnsBlocking.analysis.successTitle'), description: `${newDomains.length} ${t('dnsBlocking.analysis.newDomainsFound')}` });
    }
  };

  const handleAnalyzeText = () => {
    if (!textToAnalyze.trim()) return;
    extractDomainsMutation.mutate(textToAnalyze, {
      onSuccess: handleTextAnalysisSuccess,
      onError: (error) => toast({ variant: 'destructive', title: t('dnsBlocking.analysis.failed'), description: error.message })
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;
    try {
      const fileDataUri = await fileToDataUri(selectedFile);
      extractDomainsFromFileMutation.mutate(fileDataUri, {
        onSuccess: handleTextAnalysisSuccess,
        onError: (error) => toast({ variant: 'destructive', title: t('dnsBlocking.analysis.failed'), description: error.message })
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('dnsBlocking.analysis.fileReadError'), description: t('dnsBlocking.analysis.couldNotRead') });
    }
  };

  const handleSubscriptionToggle = (blocklistId: string, isSubscribed: boolean) => {
    const mutation = isSubscribed ? unsubscribeMutation : subscribeMutation;
    mutation.mutate(blocklistId, {
      onSuccess: () => toast({ title: t('common.success'), description: `Subscription updated successfully.` }),
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
      <PageHeader title={t('dnsBlocking.title')} />
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
                disabled={extractDomainsMutation.isPending}
              />
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
                disabled={extractDomainsFromFileMutation.isPending}
              />

              {selectedFile && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
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
                <div>
                  <Label htmlFor="domainToBlock">{t('dnsBlocking.manual.label')}</Label>
                  <Input
                    id="domainToBlock"
                    placeholder={t('dnsBlocking.manual.placeholder')}
                    value={domainToBlock}
                    onChange={(e) => setDomainToBlock(e.target.value)}
                    className="mt-1"
                    disabled={addDomainMutation.isPending}
                  />
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
          <Card><CardHeader><div className="flex justify-between items-center mb-2"><CardTitle className="text-lg">{t('dnsBlocking.suggestions.title')}</CardTitle><Button size="sm" variant="outline" className="hover:bg-orange-500 hover:text-white cursor-pointer" onClick={handleBlockAllSuggested} disabled={addDomainMutation.isPending}><ListChecks className="mr-2 h-4 w-4" />{t('dnsBlocking.suggestions.blockAll')}</Button></div><CardDescription>{t('dnsBlocking.suggestions.description')}</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2 p-2 rounded-md border bg-muted/50">{suggestedDomains.map(domain => (<Badge key={domain} variant="secondary" className="flex items-center gap-2 p-1 pr-2"><span className="font-normal">{domain}</span><button title={`Block ${domain}`} onClick={() => handleAddDomain(domain)} disabled={addDomainMutation.isPending && addDomainMutation.variables === domain} className="ml-1 hover:text-primary/80 disabled:opacity-50">{addDomainMutation.isPending && addDomainMutation.variables === domain ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 hover:text-orange-400" />}</button></Badge>))}</div></CardContent></Card>
        )}

        <Card className="shadow-lg">
          <CardHeader><div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-orange-500" />{t('dnsBlocking.blockedList.title')}</CardTitle>
              <CardDescription>{t('dnsBlocking.blockedList.description')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
                <SelectContent>
                  {exportFormats.map((format) => (
                    <SelectItem key={format.id} value={format.id} title={format.description} className="focus:bg-orange-500 focus:text-white cursor-pointer">{format.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleExportBlocklist} className="bg-orange-500 hover:bg-orange-600 cursor-pointer" disabled={blockedDomains.length === 0 || isExporting || (isAdmin && !selectedTenantId)}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{t('dnsBlocking.blockedList.exportButton')}
              </Button>
            </div>
          </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /><p className="ml-2">{t('dnsBlocking.blockedList.loading')}</p></div>) : isError ? (<Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error?.message || "Unknown error"}</AlertDescription></Alert>) : blockedDomains.length > 0 ? (
              <div className='border rounded-lg'>
                <Table><TableHeader><TableRow><TableHead>{t('dnsBlocking.blockedList.table.domain')}</TableHead><TableHead>{t('dnsBlocking.blockedList.table.source')}</TableHead><TableHead>{t('dnsBlocking.blockedList.table.blockedAt')}</TableHead><TableHead className="text-right">{t('dnsBlocking.blockedList.table.actions')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedDomains.map((item) => (
                      <TableRow key={item.id} className={removeDomainMutation.isPending && removeDomainMutation.variables === item.id ? 'opacity-50' : ''}>
                        <TableCell className="font-medium font-mono">{item.domain}</TableCell>
                        <TableCell><Badge variant={item.source_list_name ? 'secondary' : 'outline'}>{item.source_list_name || 'Manual'}</Badge></TableCell>
                        <TableCell>{isClient ? new Date(item.blockedAt).toLocaleString() : ""}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" aria-label={`Unblock domain ${item.domain}`} onClick={() => handleRemoveDomain(item.id)} className="hover:text-white hover:bg-orange-500 cursor-pointer" disabled={removeDomainMutation.isPending || !!item.source_list_id} title={item.source_list_id ? 'Cancele a inscrição do feed para remover' : 'Remover bloqueio manual'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <DataTablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            ) : (<p className="py-4 text-center text-muted-foreground">{t('dnsBlocking.blockedList.empty')}</p>)}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
