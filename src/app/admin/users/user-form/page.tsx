
"use client";

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAdminManagement, type UserFormData, userFormSchema as baseUserSchema } from '@/hooks/useAdminManagement';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Schema for this specific form page
const userFormSchema = baseUserSchema.superRefine((data, ctx) => {
    // New user (mode=new), password is required
    if (data.mode === 'new' && (!data.password || data.password.length < 8)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password must be at least 8 characters for new users.',
        });
    }
    // Existing user (mode=edit) and a password is provided, it must be valid
    if (data.mode === 'edit' && data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'New password must be at least 8 characters.',
        });
    }
});


export default function UserFormPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const mode = searchParams.get('mode') as 'new' | 'edit';
    const userId = searchParams.get('id');

    const { usersQuery, tenantsQuery, userMutation } = useAdminManagement();
    
    const { data: users = [], isLoading: isLoadingUsers } = usersQuery;
    const { data: tenants = [], isLoading: isLoadingTenants, isError: isErrorTenants } = tenantsQuery;

    const userToEdit = useMemo(() => {
        if (mode === 'edit' && userId) {
            return users.find(u => u.id === userId);
        }
        return null;
    }, [mode, userId, users]);

    const form = useForm<UserFormData & { mode: 'new' | 'edit' }>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            mode: mode,
            id: undefined,
            name: '',
            email: '',
            password: '',
            role: 'collaborator',
            tenantId: '',
        },
    });

    useEffect(() => {
        if (mode === 'edit' && userToEdit) {
            form.reset({
                mode: 'edit',
                id: userToEdit.id,
                name: userToEdit.name,
                email: userToEdit.email,
                role: userToEdit.role,
                tenantId: userToEdit.tenant_id,
                password: '',
            });
        } else if (mode === 'new') {
            form.reset({
                mode: 'new',
                id: undefined,
                name: '',
                email: '',
                password: '',
                role: 'collaborator',
                tenantId: '',
            });
        }
    }, [mode, userToEdit, form]);
    
    // Redirect if mode is invalid or if editing without a valid user
    useEffect(() => {
        if (!mode || (mode === 'edit' && !isLoadingUsers && !userToEdit)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid user or mode.' });
            router.push('/admin');
        }
    }, [mode, isLoadingUsers, userToEdit, router, toast]);

    const onSubmit = (values: UserFormData) => {
        userMutation.mutate(values, {
            onSuccess: () => {
                toast({ title: 'Success', description: `User ${mode === 'edit' ? 'updated' : 'created'} successfully.` });
                router.push('/admin');
            },
            onError: (err: Error) => {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
            },
        });
    };
    
    const isLoading = isLoadingUsers || isLoadingTenants;
    if (isLoading) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader title={mode === 'edit' ? 'Edit User' : 'Create New User'}>
                 <Button variant="outline" onClick={() => router.push('/admin')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin
                </Button>
            </PageHeader>
            <main className="flex-1 p-4 md:p-6 flex justify-center">
                <Card className="w-full max-w-2xl shadow-lg">
                    <CardHeader>
                        <CardTitle>{mode === 'edit' ? `Editing: ${userToEdit?.name}` : 'New User Details'}</CardTitle>
                        <CardDescription>
                            Fill in the form below to {mode} a user.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       {isErrorTenants ? (
                           <Alert variant="destructive">
                                <AlertTitle>Could not load tenants</AlertTitle>
                                <AlertDescription>Tenants are required to create or edit users. Please try again later.</AlertDescription>
                           </Alert>
                       ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl> <Input placeholder="John Doe" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email Address</FormLabel> <FormControl> <Input type="email" placeholder="user@example.com" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl> <Input type="password" placeholder={mode === 'edit' ? 'Leave blank to keep current' : '••••••••'} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="role" render={({ field }) => ( <FormItem> <FormLabel>Role</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a role" /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="collaborator">Collaborator</SelectItem> <SelectItem value="admin">Admin</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                    <FormField control={form.control} name="tenantId" render={({ field }) => ( <FormItem> <FormLabel>Tenant</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a tenant" /> </SelectTrigger> </FormControl> <SelectContent> {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={userMutation.isPending || isLoadingTenants}>
                                        {userMutation.isPending ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>) : mode === 'edit' ? ( 'Save Changes' ) : ( 'Create User' )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                       )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

