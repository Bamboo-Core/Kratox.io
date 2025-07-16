
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- Types & Schema ---
interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

const tenantSchema = z.object({
  name: z.string().min(3, 'Tenant name must be at least 3 characters.'),
});

// --- API Functions ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');

const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

async function fetchTenants(token: string | null): Promise<Tenant[]> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/tenants`, { headers: getAuthHeader(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch tenants');
  return response.json();
}

async function createTenant(data: { name: string }, token: string | null): Promise<Tenant> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/tenants`, {
    method: 'POST',
    headers: getAuthHeader(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to create tenant');
  return response.json();
}

// --- Component ---
export default function TenantsTab() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { name: '' },
  });

  const { data: tenants = [], isLoading, isError, error } = useQuery<Tenant[], Error>({
    queryKey: ['adminTenants'],
    queryFn: () => fetchTenants(token),
    enabled: !!token,
  });

  const createTenantMutation = useMutation({
    mutationFn: (data: z.infer<typeof tenantSchema>) => createTenant(data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTenants'] });
      toast({ title: 'Success', description: 'Tenant created successfully.' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const onSubmit = (values: z.infer<typeof tenantSchema>) => {
    createTenantMutation.mutate(values);
  };

  return (
    <div className="space-y-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex justify-end">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Tenant
                </Button>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Add a new tenant to the platform. Users can be assigned to this tenant.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ACME Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createTenantMutation.isPending}>
                    {createTenantMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>Create Tenant</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {isLoading && <div className="text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /> Loading tenants...</div>}
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length > 0 ? (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No tenants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    