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
import { useTranslation } from 'react-i18next';

export default function TenantsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

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
        title: t('common.success'),
        description: isEditMode ? t('admin.tenants.editDialog.success') : t('admin.tenants.createDialog.success'),
      });
      handleCloseDialog();
    };

    const handleError = (err: Error) => {
      toast({
        variant: 'destructive',
        title: isEditMode ? t('admin.tenants.editDialog.error') : t('admin.tenants.createDialog.error'),
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
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white cursor-pointer"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('admin.tenants.newTenant')}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? t('admin.tenants.editDialog.title') : t('admin.tenants.createDialog.title')}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? t('admin.tenants.editDialog.description', { name: selectedTenant?.name })
                : t('admin.tenants.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.tenants.form.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('admin.tenants.form.placeholderName')} {...field} />
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
                    <FormLabel>{t('admin.tenants.form.probeUrl')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('admin.tenants.form.placeholderUrl')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={handleCloseDialog}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? t('admin.tenants.editDialog.submit') : t('admin.tenants.createDialog.submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin inline-block" /> {t('admin.tenants.loading')}
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
              <TableHead>{t('admin.tenants.table.name')}</TableHead>
              <TableHead>{t('admin.tenants.table.probeUrl')}</TableHead>
              <TableHead>{t('admin.tenants.table.createdAt')}</TableHead>
              <TableHead className="text-right">{t('admin.tenants.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length > 0
              ? tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {tenant.probe_api_url || t('admin.tenants.table.notSet')}
                    </TableCell>
                    <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-orange-500 hover:text-white cursor-pointer"
                        onClick={() => handleOpenDialog(tenant)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              : !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      {t('admin.tenants.noTenants')}
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
