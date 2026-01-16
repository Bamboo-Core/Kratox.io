'use client';

import { useEffect } from 'react';
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
import { Loader2, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose of this automation template"
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
                  className="hover:bg-orange-500 hover:text-white"
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
