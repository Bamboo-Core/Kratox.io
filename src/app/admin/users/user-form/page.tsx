
"use client";

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTenantsQuery, useCreateUserMutation, newUserFormSchema, type NewUserFormData } from '@/hooks/useAdminManagement';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NewUserPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    // Data fetching hooks
    const { data: tenants = [], isLoading: isLoadingTenants, isError: isErrorTenants, error: errorTenants } = useTenantsQuery();
    const createUserMutation = useCreateUserMutation();

    const form = useForm<NewUserFormData>({
        resolver: zodResolver(newUserFormSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'collaborator',
            tenantId: undefined,
        },
    });

    const onSubmit = (values: NewUserFormData) => {
        createUserMutation.mutate(values, {
            onSuccess: (data) => {
                toast({ title: 'Success', description: `User "${data.name}" created successfully.` });
                router.push('/admin');
            },
            onError: (err: Error) => {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
            },
        });
    };

    return (
        <div className="flex flex-col h-full">
            <PageHeader title="Create New User">
                 <Button variant="outline" onClick={() => router.push('/admin')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin
                </Button>
            </PageHeader>
            <main className="flex-1 p-4 md:p-6 flex justify-center">
                <Card className="w-full max-w-2xl shadow-lg">
                    <CardHeader>
                        <CardTitle>New User Details</CardTitle>
                        <CardDescription>
                            Fill in the form to create a new user. The password must be at least 8 characters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isErrorTenants && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertTitle>Error Loading Tenants</AlertTitle>
                                <AlertDescription>{errorTenants?.message || 'Could not load tenants. Please try again later.'}</AlertDescription>
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
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
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
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="user@example.com" {...field} />
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
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} />
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
                                        <FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="collaborator">Collaborator</SelectItem>
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
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingTenants || isErrorTenants}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder={isLoadingTenants ? "Loading tenants..." : "Select a tenant"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={createUserMutation.isPending || isLoadingTenants}>
                                        {createUserMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : 'Create User'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
