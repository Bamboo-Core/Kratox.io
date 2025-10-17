
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, PlusCircle, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  tenantFormSchema,
  type TenantFormData,
  type Tenant,
} from '@/hooks/useAdminManagement';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export default function TenantsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const { data: tenants = [], isLoading, isError, error } = useTenantsQuery();
  const createTenantMutation = useCreateTenantMutation();
  const updateTenantMutation = useUpdateTenantMutation();

  const isEditMode = !!selectedTenant;

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: '',
      probe_api_url: '',
    },
  });

  const handleOpenDialog = (tenant: Tenant | null = null) => {
    setSelectedTenant(tenant);
    if (tenant) {
      form.reset({
        name: tenant.name,
        probe_api_url: tenant.probe_api_url || '',
      });
    } else {
      form.reset({ name: '', probe_api_url: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTenant(null);
  };

  const onSubmit = (values: TenantFormData) => {
    const handleSuccess = () => {
      toast({
        title: 'Success',
        description: `Tenant ${isEditMode ? 'updated' : 'created'} successfully.`,
      });
      handleCloseDialog();
    };

    const handleError = (err: Error) => {
      toast({
        variant: 'destructive',
        title: `Error ${isEditMode ? 'updating' : 'creating'} tenant`,
        description: err.message,
      });
    };

    if (isEditMode) {
      updateTenantMutation.mutate(
        { id: selectedTenant!.id, data: values },
        { onSuccess: handleSuccess, onError: handleError }
      );
    } else {
      createTenantMutation.mutate(values, { onSuccess: handleSuccess, onError: handleError });
    }
  };

  const isSubmitting = createTenantMutation.isPending || updateTenantMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Tenant
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Tenant' : 'Create New Tenant'}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? `Update details for ${selectedTenant?.name}.`
                : 'Add a new tenant to the platform.'}
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
              <FormField
                control={form.control}
                name="probe_api_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probe API URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="http://customer-probe.internal/api" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Save Changes' : 'Create Tenant'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin inline-block" /> Loading tenants...
        </div>
      )}
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
              <TableHead>Probe API URL</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length > 0 ? (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {tenant.probe_api_url || 'Not set'}
                  </TableCell>
                  <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tenant)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No tenants found.
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
