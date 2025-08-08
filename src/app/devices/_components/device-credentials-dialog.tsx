
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSaveDeviceCredentialsMutation, type DeviceCredentialsFormData, deviceCredentialsSchema } from '@/hooks/useDeviceManagement';
import type { ZabbixHost } from '@/hooks/useZabbix';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeviceCredentialsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  host: ZabbixHost | null;
}

export function DeviceCredentialsDialog({ isOpen, onOpenChange, host }: DeviceCredentialsDialogProps) {
    const { toast } = useToast();
    const saveCredentialsMutation = useSaveDeviceCredentialsMutation();
    
    const form = useForm<DeviceCredentialsFormData>({
        resolver: zodResolver(deviceCredentialsSchema),
        defaultValues: {
            username: '',
            password: '',
            port: '',
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset(); // Reset form when closing
        }
        onOpenChange(open);
    };

    const onSubmit = (values: DeviceCredentialsFormData) => {
        if (!host) return;
        saveCredentialsMutation.mutate({ hostId: host.hostid, ...values }, {
            onSuccess: () => {
                toast({ title: "Success", description: `Credentials for ${host.name} saved successfully.` });
                handleOpenChange(false);
            },
            onError: (error) => {
                toast({ variant: "destructive", title: "Error", description: error.message });
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Device Credentials</DialogTitle>
                    <DialogDescription>
                        Enter the SSH credentials for <span className="font-bold font-mono">{host?.name}</span>. These will be stored securely.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., netadmin" {...field} autoComplete="off" />
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
                                        <Input type="password" placeholder="••••••••" {...field} autoComplete="off" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="port"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Port (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="22" {...field} autoComplete="off" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={saveCredentialsMutation.isPending}>
                                {saveCredentialsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Credentials
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

    