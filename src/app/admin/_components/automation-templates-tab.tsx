'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAutomationTemplatesQuery,
  useDeleteAutomationTemplateMutation,
  useUpdateAutomationTemplateMutation,
} from '@/hooks/useAutomationTemplates';
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
import { useToast } from '@/hooks/use-toast';
import type { AutomationTemplate } from '@/hooks/useAutomationTemplates';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export default function AutomationTemplatesTab() {
  const { toast } = useToast();

  const { data: templates = [], isLoading, isError, error } = useAutomationTemplatesQuery();
  const deleteMutation = useDeleteAutomationTemplateMutation();
  const updateMutation = useUpdateAutomationTemplateMutation();

  const handleToggleEnabled = (template: AutomationTemplate, isEnabled: boolean) => {
    updateMutation.mutate(
      {
        id: template.id,
        data: {
          name: template.name,
          trigger_description: template.trigger_description,
          device_vendor: template.device_vendor,
          action_script: template.action_script,
          is_enabled: isEnabled,
        },
      },
      {
        onSuccess: () =>
          toast({
            title: 'Success',
            description: `Template ${isEnabled ? 'enabled' : 'disabled'}.`,
          }),
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Error', description: err.message }),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: 'Success', description: 'Template deleted.' }),
      onError: (err) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
    });
  };

  if (isLoading)
    return (
      <div className="text-center p-4">
        <Loader2 className="h-5 w-5 animate-spin inline-block" /> Loading Templates...
      </div>
    );
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          asChild
          className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white cursor-pointer"
        >
          <Link href="/admin/automation/templates/form">
            <PlusCircle className="mr-2 h-4 w-4" /> New Template
          </Link>
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Trigger Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length > 0 ? (
              templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Switch
                      checked={t.is_enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(t, checked)}
                      className="data-[state=checked]:bg-orange-500 [&_span]:bg-white"
                      disabled={updateMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.trigger_description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.device_vendor}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="hover:bg-orange-500 hover:text-white cursor-pointer"
                    >
                      <Link href={`/admin/automation/templates/form/${t.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
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
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the template <strong>{t.name}</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(t.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No automation templates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
