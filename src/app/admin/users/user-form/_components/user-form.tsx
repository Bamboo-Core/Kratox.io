'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTenantsQuery } from '@/hooks/useAdminManagement';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  userFormSchema,
  type UserFormData,
  type User,
} from '@/hooks/useUserManagement';
import { useZabbixHostGroupsQuery } from '@/hooks/useZabbix';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GroupSelectionDialog } from './group-selection-dialog';
import { Badge } from '@/components/ui/badge';
import LanguageSwitcher from '@/components/language-switcher';

interface UserFormProps {
  user?: User; // Optional user prop for editing
}

export default function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isEditMode = !!user;
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Data fetching hooks
  const {
    data: tenants = [],
    isLoading: isLoadingTenants,
    isError: isErrorTenants,
    error: errorTenants,
  } = useTenantsQuery();
  const {
    data: hostGroups = [],
    isLoading: isLoadingHostGroups,
    isError: isErrorHostGroups,
    error: errorHostGroups,
  } = useZabbixHostGroupsQuery();
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'cliente',
      tenantId: undefined,
      zabbix_hostgroup_ids: [],
      phone_number: '',
    },
  });

  // Populate form with user data in edit mode
  useEffect(() => {
    if (isEditMode && user) {
      form.reset({
        name: user.name,
        email: user.email,
        password: '', // Password is not fetched, leave empty for no change
        role: user.role,
        tenantId: user.tenant_id,
        zabbix_hostgroup_ids: user.zabbix_hostgroup_ids || [],
        phone_number: user.phone_number || '',
      });
    }
  }, [isEditMode, user, form]);

  const watchRole = form.watch('role');
  const watchedGroupIds = form.watch('zabbix_hostgroup_ids') || [];

  // Find the NOC AI Corp tenant ID
  const nocAiTenantId = useMemo(() => {
    return tenants.find((t) => t.name === 'NOC AI Corp')?.id;
  }, [tenants]);

  const selectedGroups = useMemo(() => {
    return hostGroups.filter((hg) => watchedGroupIds.includes(hg.groupid));
  }, [hostGroups, watchedGroupIds]);

  // Effect to auto-select tenant when role is admin
  useEffect(() => {
    if (watchRole === 'admin' && nocAiTenantId) {
      form.setValue('tenantId', nocAiTenantId, { shouldValidate: true });
    }
  }, [watchRole, nocAiTenantId, form]);

  const onSubmit = (values: UserFormData) => {
    const handleSuccess = (updatedUser: User) => {
      toast({
        title: t('common.success'),
        description: isEditMode
          ? t('admin.users.form.successUpdated', { name: updatedUser.name })
          : t('admin.users.form.successCreated', { name: updatedUser.name }),
      });
      router.push('/admin');
    };

    const handleError = (err: Error) => {
      toast({
        variant: 'destructive',
        title: isEditMode ? t('admin.users.form.errorUpdating') : t('admin.users.form.errorCreating'),
        description: err.message,
      });
    };

    if (isEditMode && user) {
      updateUserMutation.mutate(
        { id: user.id, data: values },
        { onSuccess: handleSuccess, onError: handleError }
      );
    } else {
      createUserMutation.mutate(values, { onSuccess: handleSuccess, onError: handleError });
    }
  };

  const isLoading = isLoadingTenants || isLoadingHostGroups;
  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  const handleGroupSelectionChange = (newGroupIds: string[]) => {
    form.setValue('zabbix_hostgroup_ids', newGroupIds, { shouldValidate: true });
  };

  const removeGroup = (groupId: string) => {
    const currentGroups = form.getValues('zabbix_hostgroup_ids') || [];
    handleGroupSelectionChange(currentGroups.filter((id) => id !== groupId));
  };

  return (
    <>
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {isEditMode ? t('admin.users.form.editTitle') : t('admin.users.form.createTitle')}
            <LanguageSwitcher />
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? t('admin.users.form.editDescription')
              : t('admin.users.form.createDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isErrorTenants && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{t('admin.users.form.errorTenants')}</AlertTitle>
              <AlertDescription>
                {errorTenants?.message || t('admin.users.form.errorTenantsDesc')}
              </AlertDescription>
            </Alert>
          )}
          {isErrorHostGroups && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{t('admin.users.form.errorGroups')}</AlertTitle>
              <AlertDescription>
                {errorHostGroups?.message || t('admin.users.form.errorGroupsDesc')}
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.form.fullName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('admin.users.form.fullNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.form.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('admin.users.form.emailPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.form.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('admin.users.form.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.form.password')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('admin.users.form.passwordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.form.role')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="transition-colors focus:ring-orange-500 focus:ring-1">
                          <SelectValue placeholder={t('admin.users.form.selectRole')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem
                          value="cliente"
                          className="cursor-pointer hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
                        >
                          {t('admin.users.form.roleCliente')}
                        </SelectItem>
                        <SelectItem
                          value="admin"
                          className="cursor-pointer hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
                        >
                          {t('admin.users.form.roleAdmin')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.form.tenant')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading || isErrorTenants || watchRole === 'admin'}
                    >
                      <FormControl>
                        <SelectTrigger className="transition-colors focus:ring-orange-500 focus:ring-1">
                          <SelectValue
                            placeholder={isLoadingTenants ? t('admin.users.form.loading') : t('admin.users.form.selectTenant')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={t.id}
                            className="cursor-pointer hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
                          >
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRole === 'cliente' && (
                <FormField
                  control={form.control}
                  name="zabbix_hostgroup_ids"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('admin.users.form.zabbixGroups')}</FormLabel>
                      <div className="p-3 border rounded-md min-h-[40px] space-x-2 space-y-2">
                        {selectedGroups.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            {t('admin.users.form.noGroupsSelected')}
                          </span>
                        ) : (
                          selectedGroups.map((group) => (
                            <Badge key={group.groupid} variant="secondary" className="gap-1">
                              {group.name}
                              <button
                                type="button"
                                onClick={() => removeGroup(group.groupid)}
                                className="rounded-full hover:bg-muted-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 hover:bg-orange-500 hover:text-white"
                        onClick={() => setIsGroupModalOpen(true)}
                        disabled={isLoadingHostGroups}
                      >
                        {isLoadingHostGroups ? t('admin.users.form.loadingGroups') : t('admin.users.form.addRemoveGroups')}
                      </Button>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('admin.users.form.saving')}
                    </>
                  ) : isEditMode ? (
                    t('admin.users.form.updateUser')
                  ) : (
                    t('admin.users.form.createUser')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <GroupSelectionDialog
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        allGroups={hostGroups}
        selectedGroupIds={watchedGroupIds}
        onSelectionChange={handleGroupSelectionChange}
      />
    </>
  );
}
