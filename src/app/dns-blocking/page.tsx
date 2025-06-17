
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2 } from "lucide-react";

interface BlockedDomain {
  id: string;
  domain: string;
  blockedAt: string; 
}

export default function DnsBlockingPage() {
  const [domainToBlock, setDomainToBlock] = useState("");
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleBlockDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!domainToBlock.trim()) {
      alert("Please enter a domain name.");
      return;
    }
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

    if (!isClient) { // Should not happen if button is enabled only on client
        setIsLoading(false);
        return;
    }

    const newBlockedDomain: BlockedDomain = {
      id: crypto.randomUUID(),
      domain: domainToBlock.trim(),
      blockedAt: new Date().toISOString(),
    };
    setBlockedDomains(prev => [newBlockedDomain, ...prev]);
    setDomainToBlock("");
    setIsLoading(false);
  };

  const handleUnblockDomain = async (idToUnblock: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API call
    setBlockedDomains(prev => prev.filter(d => d.id !== idToUnblock));
    setIsLoading(false);
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
              Enter a domain name to block access via DNS. This will prevent resolution of the specified domain.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleBlockDomain}>
            <CardContent>
              <div>
                <Label htmlFor="domainToBlock">Domain Name</Label>
                <Input
                  id="domainToBlock"
                  placeholder="e.g., example.com, malicious-site.org"
                  value={domainToBlock}
                  onChange={(e) => setDomainToBlock(e.target.value)}
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !domainToBlock.trim()}>
                {isLoading ? (
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
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              Currently Blocked Domains
            </CardTitle>
            <CardDescription>
              List of domains currently being blocked by DNS policy. (Demonstration only)
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {blockedDomains.length > 0 ? (
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
                          onClick={() => handleUnblockDomain(item.id)}
                          disabled={isLoading}
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
