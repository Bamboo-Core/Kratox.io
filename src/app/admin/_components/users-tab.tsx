
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAdminManagement, type User, type UserFormData, userFormSchema as baseUserSchema } from '@/hooks/useAdminManagement';

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

// Refined schema for form validation
const userFormSchema = baseUserSchema.superRefine((data, ctx) => {
    // If it's a new user (no id) and no password is provided
    if (!data.id && (!data.password || data.password.length < 8)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password must be at least 8 characters for new users.',
        });
    }
    // If it's an existing user and a password is provided, it must be valid
    if (data.id && data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'New password must be at least 8 characters.',
        });
    }
});


export default function UsersTab() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { usersQuery, tenantsQuery, userMutation, deleteUserMutation } = useAdminManagement();
  
  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = usersQuery;
  const { data: tenants = [], isLoading: isLoadingTenants } = tenantsQuery;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
  });

  const handleOpenDialog = (user: User | null = null) => {
    setEditingUser(user);
    if (user) {
      form.reset({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        password: '',
      });
    } else {
      form.reset({ id: undefined, name: '', email: '', role: 'collaborator', tenantId: undefined, password: '' });
    }
    setFormOpen(true);
  };

  const onSubmit = (values: UserFormData) => {
    userMutation.mutate(values, {
        onSuccess: () => {
            toast({ title: 'Success', description: `User ${editingUser ? 'updated' : 'created'} successfully.` });
            setFormOpen(false);
        },
        onError: (err: Error) => {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        },
    });
  };

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
  
  const isLoading = isLoadingUsers || isLoadingTenants;

  return (
    <div className="space-y-4">
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
            {/* Move DialogContent outside of Form, Form wraps the native form */}
            <Form {...form}> {/* Form starts here, wrapping the native form */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl> <Input placeholder="John Doe" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl> <Input type="email" placeholder="user@example.com" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl> <Input type="password" placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="role" render={({ field }) => ( <FormItem> <FormLabel>Role</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a role" /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="collaborator">Collaborator</SelectItem> <SelectItem value="admin">Admin</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="tenantId" render={({ field }) => ( <FormItem> <FormLabel>Tenant</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a tenant" /> </SelectTrigger> </FormControl> <SelectContent> {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>

                    <DialogFooter>
                       <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={userMutation.isPending || isLoadingTenants}>
                        {userMutation.isPending ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>) : editingUser ? ( 'Save Changes' ) : ( 'Create User' )}
                      </Button>
                    </DialogFooter>
                </form>
            </Form> {/* Form ends here */}
          </DialogContent>
      </Dialog>

      {isLoading && <div className="text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /> Loading data...</div>}
      {isErrorUsers && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{errorUsers.message}</AlertDescription></Alert>}

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
                            onClick={() => handleDelete(user.id)}
                            disabled={deleteUserMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                             {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting... </>) : ( 'Delete User' )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                  </TableCell>
                </TableRow>
              ))
            ) : (
              !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
