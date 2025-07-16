
"use client";

import {  useState, useEffect, type FormEvent } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2, Download } from 'lucide-react';
import useDnsBlocking from '@/hooks/useDnsBlocking'; 
import { useToast } from '@/hooks/use-toast';

export default function DnsBlockingPage() {
  const [isClient, setIsClient] = useState(false);
  const [domainToBlock, setDomainToBlock] = useState("");
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();
  const { 
    blockedDomainsQuery, 
    addDomainMutation, 
    removeDomainMutation,
    generateRpzFileMutation
  } = useDnsBlocking();

  const handleAddDomain = (e: FormEvent) => {
    e.preventDefault();
    const newDomainValue = domainToBlock.trim();
    if (!newDomainValue) return;

    addDomainMutation.mutate(newDomainValue, {
      onSuccess: () => {
        setDomainToBlock(""); 
        toast({ title: 'Success', description: `Domain "${newDomainValue}" added to the blocklist.` });
      },
      onError: (error) => {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
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
        const blob = new Blob([data.rpzContent], { type: 'text/plain;charset=utf-8' });
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-6 w-6 text-primary" />
              Block New Domain
            </CardTitle>
            <CardDescription>
              Enter a domain name to add to the blocklist. The system will automatically add entries for the root domain and all subdomains (*.example.com).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAddDomain}>
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
                {addDomainMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                Block Domain
              </Button>
            </CardFooter>
          </form>
        </Card>

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
                <div className="text-destructive-foreground bg-destructive p-4 rounded-md">
                    <p>Error fetching blocked domains: {error?.message || "Unknown error"}</p>
                </div>
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
