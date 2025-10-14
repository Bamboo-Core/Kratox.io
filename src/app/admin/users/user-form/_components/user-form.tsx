
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTenantsQuery } from '@/hooks/useAdminManagement';
import { useCreateUserMutation, useUpdateUserMutation, userFormSchema, type UserFormData, type User } from '@/hooks/useUserManagement';
import { useZabbixHostGroupsQuery, type ZabbixHostGroup } from '@/hooks/useZabbix';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GroupSelectionDialog } from './group-selection-dialog';
import { Badge } from '@/components/ui/badge';


interface UserFormProps {
  user?: User; // Optional user prop for editing
}

export default function UserForm({ user }: UserFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const isEditMode = !!user;
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    // Data fetching hooks
    const { data: tenants = [], isLoading: isLoadingTenants, isError: isErrorTenants, error: errorTenants } = useTenantsQuery();
    const { data: hostGroups = [], isLoading: isLoadingHostGroups, isError: isErrorHostGroups, error: errorHostGroups } = useZabbixHostGroupsQuery();
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
            });
        }
    }, [isEditMode, user, form]);

    const watchRole = form.watch('role');
    const watchedGroupIds = form.watch('zabbix_hostgroup_ids') || [];

    // Find the NOC AI Corp tenant ID
    const nocAiTenantId = useMemo(() => {
        return tenants.find(t => t.name === 'NOC AI Corp')?.id;
    }, [tenants]);

    const selectedGroups = useMemo(() => {
        return hostGroups.filter(hg => watchedGroupIds.includes(hg.groupid));
    }, [hostGroups, watchedGroupIds]);


    // Effect to auto-select tenant when role is admin
    useEffect(() => {
        if (watchRole === 'admin' && nocAiTenantId) {
            form.setValue('tenantId', nocAiTenantId, { shouldValidate: true });
        }
    }, [watchRole, nocAiTenantId, form]);

    const onSubmit = (values: UserFormData) => {
        const mutation = isEditMode ? updateUserMutation : createUserMutation;
        const action = isEditMode ? 'update' : 'create';
        const params = isEditMode ? { id: user.id, data: values } : values;

        mutation.mutate(params as any, {
            onSuccess: (data) => {
                toast({ title: 'Success', description: `User "${data.name}" ${action}d successfully.` });
                router.push('/admin');
            },
            onError: (err: Error) => {
                toast({ variant: 'destructive', title: `Error ${action}ing user`, description: err.message });
            },
        });
    };
    
    const isLoading = isLoadingTenants || isLoadingHostGroups;
    const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

    const handleGroupSelectionChange = (newGroupIds: string[]) => {
        form.setValue('zabbix_hostgroup_ids', newGroupIds, { shouldValidate: true });
    };

    const removeGroup = (groupId: string) => {
        const currentGroups = form.getValues('zabbix_hostgroup_ids') || [];
        handleGroupSelectionChange(currentGroups.filter(id => id !== groupId));
    };

    return (
        <>
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader>
                    <CardTitle>{isEditMode ? 'Edit User' : 'New User Details'}</CardTitle>
                    <CardDescription>
                        {isEditMode 
                            ? "Update the user's details. Leave the password field blank to keep it unchanged."
                            : "Fill in the form to create a new user. Admins are automatically assigned to the 'NOC AI Corp' tenant."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isErrorTenants && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Error Loading Tenants</AlertTitle>
                            <AlertDescription>{errorTenants?.message || 'Could not load tenants.'}</AlertDescription>
                        </Alert>
                    )}
                    {isErrorHostGroups && (
                            <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Error Loading Zabbix Data</AlertTitle>
                            <AlertDescription>{errorHostGroups?.message || 'Could not load Zabbix Host Groups.'}</AlertDescription>
                        </Alert>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="cliente">Cliente</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
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
                                    <FormLabel>Tenant</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || isErrorTenants || watchRole === 'admin'}>
                                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingTenants ? "Loading..." : "Select a tenant"} /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
                                        <FormLabel>Zabbix Host Groups</FormLabel>
                                        <div className="p-3 border rounded-md min-h-[40px] space-x-2 space-y-2">
                                            {selectedGroups.length === 0 ? (
                                                <span className="text-sm text-muted-foreground">Nenhum grupo selecionado.</span>
                                            ) : (
                                                selectedGroups.map(group => (
                                                    <Badge key={group.groupid} variant="secondary" className="gap-1">
                                                        {group.name}
                                                        <button type="button" onClick={() => removeGroup(group.groupid)} className="rounded-full hover:bg-muted-foreground/20">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setIsGroupModalOpen(true)} disabled={isLoadingHostGroups}>
                                            {isLoadingHostGroups ? 'Carregando grupos...' : 'Adicionar/Remover Grupos'}
                                        </Button>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                            
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isSubmitting || isLoading}>
                                    {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : (isEditMode ? 'Update User' : 'Create User')}
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

    