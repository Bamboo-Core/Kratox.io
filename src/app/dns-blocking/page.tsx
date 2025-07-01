
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2 } from 'lucide-react';

interface BlockedDomain {
  id: string;
  domain: string;
  blockedAt: string;
}

// Using a hardcoded list for demonstration purposes, similar to the conditional-rules page.
const initialDomains: BlockedDomain[] = [
    { id: '1', domain: 'malicious-site.com', blockedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', domain: 'phishing-scam.net', blockedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: '3', domain: 'viruses-galore.org', blockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: '4', domain: 'spam-paradise.xyz', blockedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
];

export default function DnsBlockingPage() {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [domainToBlock, setDomainToBlock] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Simulate initial data load
    setTimeout(() => {
        setBlockedDomains(initialDomains);
        setIsLoading(false);
    }, 500);
  }, []);

  const handleAddDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!domainToBlock.trim()) return;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newDomain: BlockedDomain = {
      id: crypto.randomUUID(),
      domain: domainToBlock.trim(),
      blockedAt: new Date().toISOString(),
    };

    setBlockedDomains(prev => [newDomain, ...prev]);
    setDomainToBlock("");
  };

  const handleRemoveDomain = (id: string) => {
    setBlockedDomains(prev => prev.filter(d => d.id !== id));
  };

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
              Enter a domain name to add to the blocklist.
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
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={!domainToBlock.trim()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Block Domain
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              Currently Blocked Domains
            </CardTitle>
            <CardDescription>
              List of domains currently being blocked by DNS policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading blocked domains...</p>
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
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.domain}</TableCell>
                      <TableCell>{new Date(item.blockedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Unblock domain ${item.domain}`}
                          onClick={() => handleRemoveDomain(item.id)}
                          className="hover:text-destructive"
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
