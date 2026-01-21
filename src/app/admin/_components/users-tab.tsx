'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useUsersQuery, useDeleteUserMutation, type User } from '@/hooks/useUserManagement';
import { useZabbixHostGroupsQuery } from '@/hooks/useZabbix';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 10;

export default function UsersTab() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const [hostGroupFilter, setHostGroupFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    error: errorUsers,
  } = useUsersQuery();
  const { data: hostGroups = [], isLoading: isLoadingHostGroups } = useZabbixHostGroupsQuery();
  const deleteUserMutation = useDeleteUserMutation();

  const handleDelete = (userId: string) => {
    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        toast({ title: t('common.success'), description: t('admin.users.successDelete') });
      },
      onError: (err: Error) => {
        toast({ variant: 'destructive', title: t('common.error'), description: err.message });
      },
    });
  };

  const isLoading = useMemo(
    () => isLoadingUsers || isLoadingHostGroups,
    [isLoadingUsers, isLoadingHostGroups]
  );

  const filteredUsers = useMemo(() => {
    if (hostGroupFilter === 'all') {
      return users;
    }
    return users.filter((user) => user.zabbix_hostgroup_ids?.includes(hostGroupFilter));
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

  const renderGroupCell = (groupNames: string[] | undefined) => {
    if (!groupNames || groupNames.length === 0) {
      return 'N/A';
    }
    if (groupNames.length === 1) {
      return groupNames[0];
    }
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="link" className="p-0 h-auto font-normal text-xs">
            {t('admin.users.table.groupsCount', { count: groupNames.length })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{t('admin.users.table.associatedGroups')}</p>
            <ul className="list-disc list-inside text-muted-foreground">
              {groupNames.map((name, index) => (
                <li key={index}>{name}</li>
              ))}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Select onValueChange={setHostGroupFilter} value={hostGroupFilter} disabled={isLoading}>
            <SelectTrigger className="w-[280px]">
              <SelectValue
                placeholder={isLoadingHostGroups ? t('admin.users.loadingGroups') : t('admin.users.filterByHostGroup')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.users.allHostGroups')}</SelectItem>
              {hostGroups.map((hg) => (
                <SelectItem key={hg.groupid} value={hg.groupid}>
                  {hg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
          <Link href="/admin/users/user-form">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('admin.users.newUser')}
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin inline-block" />{' '}
          <span className="ml-2">{t('admin.users.loadingData')}</span>
        </div>
      )}
      {isErrorUsers && !isLoading && (
        <Alert variant="destructive">
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>{errorUsers?.message ?? t('admin.users.unknownError')}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isErrorUsers && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.users.table.name')}</TableHead>
                <TableHead>{t('admin.users.table.email')}</TableHead>
                <TableHead>{t('admin.users.table.phone')}</TableHead>
                <TableHead>{t('admin.users.table.role')}</TableHead>
                <TableHead>{t('admin.users.table.tenant')}</TableHead>
                <TableHead>{t('admin.users.table.zabbixGroups')}</TableHead>
                <TableHead className="text-right">{t('admin.users.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone_number}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.tenant_name}</TableCell>
                    <TableCell>{renderGroupCell(user.zabbix_group_names)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        className="hover:bg-orange-500 hover:text-white cursor-pointer"
                        size="icon"
                        asChild
                      >
                        <Link href={`/admin/users/user-form/${user.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-transparent cursor-pointer"
                            disabled={user.id === currentUser?.userId}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('admin.users.deleteDialog.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('admin.users.deleteDialog.description')}{' '}
                              <span className="font-bold">{user.name}</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user.id)}
                              disabled={
                                deleteUserMutation.isPending &&
                                deleteUserMutation.variables === user.id
                              }
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {deleteUserMutation.isPending &&
                              deleteUserMutation.variables === user.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('admin.users.deleteDialog.deleting')} {' '}
                                </>
                              ) : (
                                t('common.delete')
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    {isLoading ? t('admin.users.loadingData') : t('admin.users.noUsersFound')}
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
