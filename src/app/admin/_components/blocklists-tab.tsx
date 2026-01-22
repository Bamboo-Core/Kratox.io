'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import {
  useBlocklistsQuery,
  useCreateBlocklistMutation,
  useUpdateBlocklistMutation,
  useDeleteBlocklistMutation,
  blocklistFormSchema,
  type BlocklistFormData,
  type Blocklist,
} from '@/hooks/useAdminManagement';
import { useTranslation } from 'react-i18next';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BlocklistsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBlocklist, setSelectedBlocklist] = useState<Blocklist | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: blocklists = [], isLoading, isError, error } = useBlocklistsQuery();
  const createMutation = useCreateBlocklistMutation();
  const updateMutation = useUpdateBlocklistMutation();
  const deleteMutation = useDeleteBlocklistMutation();

  const form = useForm<BlocklistFormData>({
    resolver: zodResolver(blocklistFormSchema),
    defaultValues: {
      name: '',
      description: '',
      source: '',
      domains: '',
    },
  });

  const handleOpenDialog = (list: Blocklist | null = null) => {
    setSelectedBlocklist(list);
    if (list) {
      form.reset({
        name: list.name,
        description: list.description || '',
        source: list.source || '',
        domains: list.domains.join('\n'),
      });
    } else {
      form.reset({ name: '', description: '', source: '', domains: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedBlocklist(null);
  };

  const onSubmit = (values: BlocklistFormData) => {
    const handleSuccess = () => {
      toast({
        title: t('common.success'),
        description: selectedBlocklist ? t('admin.blocklists.editDialog.success') : t('admin.blocklists.createDialog.success'),
      });
      handleCloseDialog();
    };

    const handleError = (err: Error) => {
      toast({ variant: 'destructive', title: t('common.error'), description: err.message });
    };

    if (selectedBlocklist) {
      updateMutation.mutate(
        { id: selectedBlocklist.id, data: values },
        { onSuccess: handleSuccess, onError: handleError }
      );
    } else {
      createMutation.mutate(values, { onSuccess: handleSuccess, onError: handleError });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: t('common.success'), description: t('admin.blocklists.deleteDialog.success') }),
      onError: (err) => toast({ variant: 'destructive', title: t('common.error'), description: err.message }),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white cursor-pointer"
        >
          <PlusCircle className="mr-2 h-4 w-4 " />
          {t('admin.blocklists.newBlocklist')}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBlocklist ? t('admin.blocklists.editDialog.title') : t('admin.blocklists.createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.blocklists.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.blocklists.form.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('admin.blocklists.form.placeholderName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.blocklists.form.source')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('admin.blocklists.form.placeholderSource')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.blocklists.form.description')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('admin.blocklists.form.placeholderDesc')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.blocklists.form.domains')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={10}
                        placeholder={`example.com\nanother-bad-site.org`}
                        {...field}
                      />
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
                  className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('admin.blocklists.createDialog.submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin inline-block" /> {t('admin.blocklists.loading')}
        </div>
      )}
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.blocklists.table.name')}</TableHead>
              <TableHead>{t('admin.blocklists.table.source')}</TableHead>
              <TableHead>{t('admin.blocklists.table.domainCount')}</TableHead>
              <TableHead className="text-right">{t('admin.blocklists.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocklists.length > 0
              ? blocklists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{list.source}</Badge>
                    </TableCell>
                    <TableCell>{list.domains.length}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(list)}
                        className="hover:bg-orange-500 hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="bg-transparent hover:bg-transparent"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('admin.blocklists.deleteDialog.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('admin.blocklists.deleteDialog.description')} <strong>{list.name}</strong>{' '}
                              blocklist.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(list.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t('common.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              : !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      {t('admin.blocklists.noBlocklists')}
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
