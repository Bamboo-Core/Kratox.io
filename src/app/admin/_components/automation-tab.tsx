
'use client';

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
import {
  useAdminAutomationActions,
  useAdminAutomationCriteria,
  useDeleteAutomationActionMutation,
  useDeleteAutomationCriterionMutation,
} from '@/hooks/useAdminManagement';
import { AlertTriangle, Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { AutomationCriterion, AutomationAction } from '@/hooks/useAdminManagement';

function CriteriaTable() {
  const { data: criteria = [], isLoading, isError, error } = useAdminAutomationCriteria();
  const deleteMutation = useDeleteAutomationCriterionMutation();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: 'Success', description: 'Criterion deleted.' }),
      onError: (err) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
    });
  };

  if (isLoading)
    return (
      <div className="text-center p-4">
        <Loader2 className="h-5 w-5 animate-spin inline-block" /> Loading Criteria...
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
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>System Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criteria.length > 0 ? (
            criteria.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.label}</TableCell>
                <TableCell>{c.description}</TableCell>
                <TableCell className="font-mono text-xs">{c.name}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/automation/components/form/criterion/${c.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the criterion <strong>{c.label}</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c.id)}
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
              <TableCell colSpan={4} className="text-center">
                No criteria defined.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ActionsTable() {
  const { data: actions = [], isLoading, isError, error } = useAdminAutomationActions();
  const deleteMutation = useDeleteAutomationActionMutation();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: 'Success', description: 'Action deleted.' }),
      onError: (err) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
    });
  };

  if (isLoading)
    return (
      <div className="text-center p-4">
        <Loader2 className="h-5 w-5 animate-spin inline-block" /> Loading Actions...
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
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>System Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.length > 0 ? (
            actions.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.label}</TableCell>
                <TableCell>{a.description}</TableCell>
                <TableCell className="font-mono text-xs">{a.name}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/automation/components/form/action/${a.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the action <strong>{a.label}</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(a.id)}
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
              <TableCell colSpan={4} className="text-center">
                No actions defined.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AutomationTab() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Rule Criteria</h3>
            <p className="text-sm text-muted-foreground">
              These are the conditions clients can select in the &apos;IF&apos; part of their
              automation rules.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/automation/components/form/criterion">
              <PlusCircle className="mr-2 h-4 w-4" /> New Criterion
            </Link>
          </Button>
        </div>
        <CriteriaTable />
      </div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Rule Actions</h3>
            <p className="text-sm text-muted-foreground">
              These are the actions clients can select in the &apos;ACTION&apos; part of their
              automation rules.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/automation/components/form/action">
              <PlusCircle className="mr-2 h-4 w-4" /> New Action
            </Link>
          </Button>
        </div>
        <ActionsTable />
      </div>
    </div>
  );
}
