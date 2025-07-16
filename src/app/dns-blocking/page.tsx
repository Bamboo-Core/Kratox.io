
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2, Download, Sparkles, FileScan } from 'lucide-react';
import useDnsBlocking from '@/hooks/useDnsBlocking'; 
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function DnsBlockingPage() {
  const [isClient, setIsClient] = useState(false);
  const [domainToBlock, setDomainToBlock] = useState("");
  const [textToAnalyze, setTextToAnalyze] = useState("");
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([]);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();
  const { 
    blockedDomainsQuery, 
    addDomainMutation, 
    removeDomainMutation,
    generateRpzFileMutation,
    extractDomainsMutation
  } = useDnsBlocking();

  const handleAddDomain = (domain: string) => {
    if (!domain) return;

    addDomainMutation.mutate(domain, {
      onSuccess: () => {
        setDomainToBlock(""); 
        toast({ title: 'Success', description: `Domain "${domain}" added to the blocklist.` });
        // Remove the domain from suggestions if it was there
        setSuggestedDomains(prev => prev.filter(d => d !== domain));
      },
      onError: (error) => {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };
  
  const handleManualAddSubmit = (e: FormEvent) => {
      e.preventDefault();
      handleAddDomain(domainToBlock.trim());
  };

  const handleRemoveDomain = (id: string) => {
    removeDomainMutation.mutate(id, {
        onSuccess: () => {
            toast({ title: 'Success', description: 'Domain removed from the blocklist.' });
        },
        onError: (error) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };

  const handleGenerateRpz = () => {
    generateRpzFileMutation.mutate(undefined, {
      onSuccess: (data) => {
        const blob = new Blob([data.rpzContent], { type: 'text/plain;charset=utf-t' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'rpz.block.hosts.zone');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: 'Success', description: 'RPZ zone file generated successfully.' });
      },
      onError: (error) => {
        toast({ variant: 'destructive', title: 'Error generating file', description: error.message });
      }
    })
  }
  
  const handleAnalyzeText = () => {
      if (!textToAnalyze.trim()) return;
      extractDomainsMutation.mutate(textToAnalyze, {
          onSuccess: (data) => {
              if (data.domains.length === 0) {
                  toast({ title: 'Analysis Complete', description: 'No new domains found in the text.' });
              } else {
                  setSuggestedDomains(data.domains);
                  toast({ title: 'Analysis Complete', description: `${data.domains.length} domain(s) found.` });
              }
          },
          onError: (error) => {
              toast({ variant: 'destructive', title: 'AI Analysis Failed', description: error.message });
          }
      });
  };

  const { data: blockedDomains = [], isLoading, isError, error } = blockedDomainsQuery;

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="DNS Blocking Management" />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="DNS Blocking Management" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <FileScan className="h-6 w-6 text-primary" />
                    Analisar Texto para Domínios com IA
                    </CardTitle>
                    <CardDescription>
                    Cole um log, e-mail ou relatório de ameaças para extrair domínios.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Textarea
                        placeholder="Paste text here... for example: 'Suspicious activity from evil.com and its subdomain test.evil.com...'"
                        value={textToAnalyze}
                        onChange={(e) => setTextToAnalyze(e.target.value)}
                        rows={5}
                        disabled={extractDomainsMutation.isPending}
                     />
                     {suggestedDomains.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Suggested Domains:</h4>
                            <div className="flex flex-wrap gap-2">
                                {suggestedDomains.map(domain => (
                                    <Badge key={domain} variant="secondary" className="flex items-center gap-2 p-1 pr-2">
                                        <span>{domain}</span>
                                        <button 
                                          title={`Block ${domain}`}
                                          onClick={() => handleAddDomain(domain)} 
                                          disabled={addDomainMutation.isPending && addDomainMutation.variables === domain} 
                                          className="ml-1 text-primary hover:text-primary/80 disabled:opacity-50"
                                        >
                                           {addDomainMutation.isPending && addDomainMutation.variables === domain ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4" />}
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                     )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAnalyzeText} disabled={!textToAnalyze.trim() || extractDomainsMutation.isPending}>
                        {extractDomainsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Analisar com IA
                    </Button>
                </CardFooter>
            </Card>

            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Ban className="h-6 w-6 text-primary" />
                Block New Domain Manually
                </CardTitle>
                <CardDescription>
                Enter a domain to add it directly to the blocklist.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleManualAddSubmit}>
                <CardContent>
                <div>
                    <Label htmlFor="domainToBlock">Domain Name</Label>
                    <Input
                    id="domainToBlock"
                    placeholder="e.g., example.com, malicious-site.org"
                    value={domainToBlock}
                    onChange={(e) => setDomainToBlock(e.target.value)}
                    className="mt-1"
                    disabled={addDomainMutation.isPending}
                    />
                </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" disabled={!domainToBlock.trim() || addDomainMutation.isPending}>
                    {addDomainMutation.isPending && addDomainMutation.variables === domainToBlock.trim() ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                    )}
                    Block Domain
                </Button>
                </CardFooter>
            </form>
            </Card>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                    Currently Blocked Domains
                    </CardTitle>
                    <CardDescription>
                    List of domains currently being blocked by DNS policy for your tenant.
                    </CardDescription>
                </div>
                <Button onClick={handleGenerateRpz} disabled={blockedDomains.length === 0 || generateRpzFileMutation.isPending}>
                   {generateRpzFileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Generate RPZ File
                </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading blocked domains...</p>
                </div>
            ) : isError ? (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error?.message || "Unknown error"}</AlertDescription>
                </Alert>
            ) : blockedDomains.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedDomains.map((item) => (
                    <TableRow key={item.id} className={removeDomainMutation.isPending && removeDomainMutation.variables === item.id ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{item.domain}</TableCell>
                      <TableCell>
                        {isClient ? new Date(item.blockedAt).toLocaleString() : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Unblock domain ${item.domain}`}
                          onClick={() => handleRemoveDomain(item.id)}
                          className="hover:text-destructive"
                          disabled={removeDomainMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-4 text-center text-muted-foreground">No domains are currently blocked.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
