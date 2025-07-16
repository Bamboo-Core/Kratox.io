
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// --- Types & Schema ---
interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'collaborator';
  tenant_id: string;
  tenant_name: string;
}

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  role: z.enum(['admin', 'collaborator']),
  tenantId: z.string().uuid('Please select a tenant.'),
});

const userFormSchema = userSchema.extend({
    id: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.id && !data.password) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password is required for new users.',
        });
    }
});


// --- API Functions ---
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');

const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

async function fetchUsers(token: string | null): Promise<User[]> {
  if (!token) throw new Error('Authentication token is missing.');
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeader(token) });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch users');
  return response.json();
}

async function fetchTenants(token: string | null): Promise<Tenant[]> {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/admin/tenants`, { headers: getAuthHeader(token) });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch tenants');
    return response.json();
}

async function mutateUser(user: z.infer<typeof userFormSchema>, token: string | null): Promise<User> {
    if (!token) throw new Error('Authentication token is missing.');
    const isEditing = !!user.id;
    const url = isEditing ? `${API_BASE_URL}/api/admin/users/${user.id}` : `${API_BASE_URL}/api/admin/users`;
    const method = isEditing ? 'PUT' : 'POST';

    const body = { ...user };
    if (isEditing && !body.password) {
        delete body.password;
    }
    
    const response = await fetch(url, {
        method,
        headers: getAuthHeader(token),
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to ${isEditing ? 'update' : 'create'} user`);
    return response.json();
}

async function deleteUser(userId: string, token: string | null): Promise<void> {
    if (!token) throw new Error('Authentication token is missing.');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader(token),
    });
    if (!response.ok && response.status !== 204) {
        throw new Error((await response.json()).error || 'Failed to delete user');
    }
}

// --- Component ---
export default function UsersTab() {
  const { token, user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  console.log('[UsersTab] Component rendering...');

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
  });

  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = useQuery<User[], Error>({
    queryKey: ['adminUsers'],
    queryFn: () => fetchUsers(token),
    enabled: !!token,
  });

  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<Tenant[], Error>({
    queryKey: ['adminTenants'],
    queryFn: () => fetchTenants(token),
    enabled: !!token,
  });
  
  console.log('[UsersTab] Query States:', {
    isLoadingUsers,
    isErrorUsers,
    usersCount: users.length,
    isLoadingTenants,
    tenantsCount: tenants.length
  });


  const userMutation = useMutation({
    mutationFn: (data: z.infer<typeof userFormSchema>) => mutateUser(data, token),
    onSuccess: (data) => {
      console.log('[UsersTab] userMutation SUCCESS:', data);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({ title: 'Success', description: `User ${editingUser ? 'updated' : 'created'} successfully.` });
      setFormOpen(false);
    },
    onError: (err: Error) => {
      console.error('[UsersTab] userMutation ERROR:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const deleteUserMutation = useMutation({
      mutationFn: (userId: string) => deleteUser(userId, token),
      onSuccess: (data, userId) => {
          console.log(`[UsersTab] deleteUserMutation SUCCESS for user ID: ${userId}`);
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
          toast({ title: 'Success', description: 'User deleted successfully.'});
      },
      onError: (err: Error) => {
          console.error('[UsersTab] deleteUserMutation ERROR:', err);
          toast({ variant: 'destructive', title: 'Error', description: err.message });
      }
  })

  const handleOpenDialog = (user: User | null = null) => {
    console.log('[UsersTab] handleOpenDialog called. User:', user ? user.id : 'new user');
    setEditingUser(user);
    if (user) {
      console.log('[UsersTab] Setting form for EDITING user:', user);
      form.reset({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        password: '',
      });
    } else {
      console.log('[UsersTab] Setting form for CREATING new user.');
      form.reset({ id: undefined, name: '', email: '', role: 'collaborator', tenantId: '', password: '' });
    }
    console.log('[UsersTab] Setting isFormOpen to true');
    setFormOpen(true);
  };

  const onSubmit = (values: z.infer<typeof userFormSchema>) => {
    console.log('[UsersTab] Form submitted with values:', values);
    userMutation.mutate(values);
  };
  
  const isLoading = isLoadingUsers || isLoadingTenants;
  
  console.log('[UsersTab] Final isLoading check before render:', isLoading);

  return (
    <div className="space-y-4">
      {console.log("[UsersTab] Rendering Dialog container")}
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <div className="flex justify-end">
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New User
                </Button>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the user.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl> <Input placeholder="John Doe" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl> <Input type="email" placeholder="user@example.com" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl> <Input type="password" placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="role" render={({ field }) => ( <FormItem> <FormLabel>Role</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a role" /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="collaborator">Collaborator</SelectItem> <SelectItem value="admin">Admin</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="tenantId" render={({ field }) => ( <FormItem> <FormLabel>Tenant</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a tenant" /> </SelectTrigger> </FormControl> <SelectContent> {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>

                <DialogFooter>
                   <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={userMutation.isPending || isLoadingTenants}>
                    {userMutation.isPending ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>) : editingUser ? ( 'Save Changes' ) : ( 'Create User' )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
      </Dialog>


      {isLoading && <div className="text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /> Loading data...</div>}
      {isErrorUsers && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{errorUsers.message}</AlertDescription></Alert>}
      
      {console.log("[UsersTab] Rendering Table container")}
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
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" disabled={user.id === currentUser?.userId}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user <span className="font-bold">{user.name}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            disabled={deleteUserMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                             {deleteUserMutation.isPending ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting... </>) : ( <>Delete User</> )}
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
    </div>
  );
}
