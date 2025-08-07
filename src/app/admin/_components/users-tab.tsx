
"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useUsersQuery, useDeleteUserMutation, type User } from '@/hooks/useUserManagement';
import { useZabbixHostGroupsQuery } from '@/hooks/useZabbix';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

const ITEMS_PER_PAGE = 10;

export default function UsersTab() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const [hostGroupFilter, setHostGroupFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = useUsersQuery();
  const { data: hostGroups = [], isLoading: isLoadingHostGroups } = useZabbixHostGroupsQuery();
  const deleteUserMutation = useDeleteUserMutation();
  
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
  
  const isLoading = useMemo(() => isLoadingUsers || isLoadingHostGroups, [isLoadingUsers, isLoadingHostGroups]);

  const filteredUsers = useMemo(() => {
    if (hostGroupFilter === 'all') {
      return users;
    }
    return users.filter(user => user.zabbix_hostgroup_ids?.includes(hostGroupFilter));
  }, [users, hostGroupFilter]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                 <Select onValueChange={setHostGroupFilter} value={hostGroupFilter} disabled={isLoading}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder={isLoadingHostGroups ? 'Loading groups...' : 'Filter by Host Group'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Host Groups</SelectItem>
                        {hostGroups.map((hg) => (
                            <SelectItem key={hg.groupid} value={hg.groupid}>{hg.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button asChild>
                <Link href="/admin/users/user-form">
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
                <TableHead>Zabbix Group</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>{user.tenant_name}</TableCell>
                    <TableCell>{user.zabbix_group_names?.join(', ') || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/users/user-form/${user.id}`}>
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
                    <TableCell colSpan={6} className="text-center h-24">
                      {isLoading ? 'Loading...' : 'No users found for this filter.'}
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
            <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </div>
      )}
    </div>
  );
}
