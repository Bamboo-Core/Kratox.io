
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useSuggestScriptMutation } from '@/hooks/useAiRules';
import {
  useCreateAutomationTemplateMutation,
  useUpdateAutomationTemplateMutation,
  automationTemplateFormSchema,
  type AutomationTemplateFormData,
  type AutomationTemplate,
} from '@/hooks/useAutomationTemplates';
import { useTenantsQuery } from '@/hooks/useAdminManagement'; // Import tenants query

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, HelpCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { TenantSelectionDialog } from './tenant-selection-dialog'; // Import the new dialog
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const deviceTypes = [
  { label: 'Huawei VRP', value: 'huawei' },
  { label: 'Cisco IOS', value: 'cisco_ios' },
  { label: 'Juniper Junos', value: 'juniper_junos' },
  { label: 'Arista EOS', value: 'arista_eos' },
  { label: 'MikroTik RouterOS', value: 'mikrotik_routeros' },
];

interface Props {
  template?: AutomationTemplate;
}

export default function AutomationTemplateForm({ template }: Props) {
  const router = useRouter();
  const isEditMode = !!template;
  const { toast } = useToast();

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const { data: tenants = [] } = useTenantsQuery();

  const createMutation = useCreateAutomationTemplateMutation();
  const updateMutation = useUpdateAutomationTemplateMutation();
  const suggestScriptMutation = useSuggestScriptMutation();

  const form = useForm<AutomationTemplateFormData>({
    resolver: zodResolver(automationTemplateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      trigger_description: '',
      device_vendor: '',
      action_script: '',
      is_enabled: true,
      initial_subscription: 'none',
    },
  });

  const watchInitialSubscription = form.watch('initial_subscription');

  useEffect(() => {
    if (template) {
      form.reset({
        ...template,
        initial_subscription: 'none', // This field is only for creation
      });
    }
  }, [template, form]);

  const handleSuggestScript = () => {
    const triggerDescription = form.getValues('trigger_description');
    const deviceVendor = form.getValues('device_vendor');

    if (!triggerDescription || !deviceVendor) {
      toast({
        variant: 'destructive',
        title: 'Atenção',
        description:
          'Por favor, preencha a descrição do gatilho e o fabricante do dispositivo para obter uma sugestão.',
      });
      return;
    }

    suggestScriptMutation.mutate(
      { trigger_description: triggerDescription, device_vendor: deviceVendor },
      {
        onSuccess: (data) => {
          form.setValue('action_script', data.suggested_script, { shouldValidate: true });
          toast({ title: 'Sucesso', description: 'Script sugerido pela IA e preenchido abaixo.' });
        },
        onError: (err: Error) => {
          toast({ variant: 'destructive', title: 'Erro na Sugestão', description: err.message });
        },
      }
    );
  };

  const onSubmit = (values: AutomationTemplateFormData) => {
    let tenantIds: string[] = [];
    if (values.initial_subscription === 'all') {
      tenantIds = tenants.map((t) => t.id);
    } else if (values.initial_subscription === 'specific') {
      tenantIds = selectedTenantIds;
    }

    const payload = {
      ...values,
      tenantIds: tenantIds,
    };

    const handleSuccess = () => {
      toast({ title: 'Success', description: `Template ${isEditMode ? 'updated' : 'created'}.` });
      router.push('/admin');
      router.refresh();
    };

    const handleError = (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    };

    if (isEditMode) {
      // is_enabled is the only property we can update this way from this form
      const updatePayload = {
        ...template, // start with existing data
        ...values, // override with form values
      };
      updateMutation.mutate(
        { id: template!.id, data: updatePayload },
        { onSuccess: handleSuccess, onError: handleError }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: handleSuccess, onError: handleError });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <TooltipProvider>
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit' : 'Create'} Automation Template</CardTitle>
          <CardDescription>
            Define a trigger and a script-based action to automate a network task.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Diagnose High CPU on Cisco Routers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="A brief summary of what this automation does"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <h3 className="text-lg font-medium">Trigger Definition</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="trigger_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Alert Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., High CPU utilization on a device" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="device_vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Vendor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor for script" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deviceTypes.map((dt) => (
                            <SelectItem key={dt.value} value={dt.value}>
                              {dt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Action Script</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestScript}
                    disabled={suggestScriptMutation.isPending}
                  >
                    {suggestScriptMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Suggest Script with AI
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="action_script"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Script Commands</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={8}
                          placeholder={`show version\nshow interfaces\nshow ip route`}
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter one command per line. These will be executed on the device.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              {isEditMode ? (
                <FormField
                  control={form.control}
                  name="is_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Template Enabled</FormLabel>
                        <FormDescription>
                          If disabled, this template will not be available for any tenant to use.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="initial_subscription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Initial Subscription
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Choose which tenants will have this template
                              <br />
                              enabled automatically upon creation.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="flex items-center gap-4">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[220px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Enable for No One</SelectItem>
                            <SelectItem value="all">Enable for ALL Tenants</SelectItem>
                            <SelectItem value="specific">Enable for Specific Tenants</SelectItem>
                          </SelectContent>
                        </Select>
                        {watchInitialSubscription === 'specific' && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsTenantModalOpen(true)}
                          >
                            Select Tenants ({selectedTenantIds.length})
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <TenantSelectionDialog
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        allTenants={tenants}
        selectedTenantIds={selectedTenantIds}
        onSelectionChange={setSelectedTenantIds}
      />
    </TooltipProvider>
  );
}
