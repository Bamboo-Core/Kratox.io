
"use client";

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAdminManagement, type User } from '@/hooks/useAdminManagement';
import Link from 'next/link';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function UsersTab() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  const { usersQuery, tenantsQuery, deleteUserMutation } = useAdminManagement();
  
  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = usersQuery;
  const { isLoading: isLoadingTenants } = tenantsQuery;

  const handleDelete = (userId: string) => {
    deleteUserMutation.mutate(userId, {
        onSuccess: () => {
            toast({ title: 'Success', description: 'User deleted successfully.'});
        },
        onError: (err: Error) => {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    });
  };
  
  const isLoading = useMemo(() => isLoadingUsers || isLoadingTenants, [isLoadingUsers, isLoadingTenants]);

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button asChild>
                <Link href="/admin/users/user-form?mode=new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New User
                </Link>
            </Button>
        </div>

      {isLoading && <div className="flex justify-center items-center py-10"><Loader2 className="h-6 w-6 animate-spin inline-block" /> <span className="ml-2">Loading data...</span></div>}
      {isErrorUsers && !isLoading && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{errorUsers?.message ?? 'An unknown error occurred'}</AlertDescription></Alert>}

      {!isLoading && !isErrorUsers && (
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.length > 0 ? (
                users.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>{user.tenant_name}</TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/users/user-form?mode=edit&id=${user.id}`}>
                                <Edit className="h-4 w-4" />
                            </Link>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={user.id === currentUser?.userId}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user <span className="font-bold">{user.name}</span>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                disabled={deleteUserMutation.isPending && deleteUserMutation.variables === user.id}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting... </>) : ( 'Delete' )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">
                    No users found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}
