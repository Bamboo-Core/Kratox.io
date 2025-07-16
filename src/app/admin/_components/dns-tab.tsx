
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useAllBlockedDomainsQuery,
  useTenantsQuery,
  useAddBlockedDomainForTenantMutation,
} from '@/hooks/useAdminManagement';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const addDomainFormSchema = z.object({
  domain: z.string().min(3, 'Domain must be at least 3 characters.'),
  tenantId: z.string({ required_error: 'Please select a tenant.' }).uuid(),
});

type AddDomainFormData = z.infer<typeof addDomainFormSchema>;

interface BlockedDomain {
    id: string;
    domain: string;
    blockedAt: string;
    tenant_id: string;
    tenant_name: string;
}

export default function DnsTab() {
  const { toast } = useToast();
  
  // Data fetching
  const { data: allBlockedDomains = [], isLoading: isLoadingDomains, isError: isErrorDomains, error: errorDomains } = useAllBlockedDomainsQuery();
  const { data: tenants = [], isLoading: isLoadingTenants } = useTenantsQuery();
  const addDomainMutation = useAddBlockedDomainForTenantMutation();

  const form = useForm<AddDomainFormData>({
    resolver: zodResolver(addDomainFormSchema),
    defaultValues: {
      domain: '',
      tenantId: undefined,
    },
  });

  // Group domains by tenant
  const domainsByTenant = useMemo(() => {
    return allBlockedDomains.reduce((acc, domain) => {
      const { tenant_name } = domain;
      if (!acc[tenant_name]) {
        acc[tenant_name] = [];
      }
      acc[tenant_name].push(domain);
      return acc;
    }, {} as Record<string, BlockedDomain[]>);
  }, [allBlockedDomains]);


  const onSubmit = (values: AddDomainFormData) => {
    addDomainMutation.mutate(values, {
      onSuccess: () => {
        toast({ title: 'Success', description: `Domain "${values.domain}" blocked successfully.` });
        form.reset();
      },
      onError: (err: Error) => {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
      },
    });
  };

  const isLoading = isLoadingDomains || isLoadingTenants;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Block Domain for Tenant
          </CardTitle>
          <CardDescription>
            Manually add a domain to a specific tenant's blocklist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Domain Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., malicious-site.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Tenant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingTenants}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingTenants ? 'Loading...' : 'Select a tenant'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-1">
                <Button type="submit" disabled={addDomainMutation.isPending} className="w-full">
                  {addDomainMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Block Domain
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>All Blocked Domains by Tenant</CardTitle>
          <CardDescription>
            Review the DNS blocklists for every tenant on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin inline-block" /> Loading data...</div>}
          {isErrorDomains && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{errorDomains?.message}</AlertDescription></Alert>}

          {!isLoading && !isErrorDomains && allBlockedDomains.length > 0 && (
            <Accordion type="multiple" className="w-full">
              {Object.entries(domainsByTenant).map(([tenantName, domains]) => (
                <AccordionItem value={tenantName} key={tenantName}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold text-lg">{tenantName}</span>
                      <span className="text-sm text-muted-foreground">{domains.length} blocked</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-md">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Domain</TableHead>
                            <TableHead>Blocked At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {domains.map((d) => (
                            <TableRow key={d.id}>
                                <TableCell className="font-mono">{d.domain}</TableCell>
                                <TableCell>{new Date(d.blockedAt).toLocaleString()}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {!isLoading && !isErrorDomains && allBlockedDomains.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p>No domains are currently blocked for any tenant.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
