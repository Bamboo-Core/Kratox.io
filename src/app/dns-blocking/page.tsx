'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldAlert, PlusCircle, Trash2, Ban, Loader2 } from 'lucide-react';
import useDnsBlocking from '@/hooks/useDnsBlocking';
export default function DnsBlockingPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    blockedDomains,
    isLoading,
    domainToBlock,
    setDomainToBlock,
    handleAddDomain,
    handleRemoveDomain,
  } = useDnsBlocking();

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
            <CardDescription>Enter a domain name to add to the blocklist.</CardDescription>
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
              <p className="py-4 text-center text-muted-foreground">
                No domains are currently blocked.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
