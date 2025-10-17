
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
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
  isOpen: boolean;
  onClose: () => void;
  template: AutomationTemplate | null;
}

export function AutomationTemplateDialog({ isOpen, onClose, template }: Props) {
  const isEditMode = !!template;
  const { toast } = useToast();

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
    },
  });

  useEffect(() => {
    if (template) {
      form.reset(template);
    } else {
      form.reset({ name: '', description: '', trigger_description: '', device_vendor: '', action_script: '' });
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
    const mutation = isEditMode ? updateMutation : createMutation;
    const params = isEditMode ? { id: template!.id, data: values } : values;

    mutation.mutate(params as any, {
      onSuccess: () => {
        toast({ title: 'Success', description: `Template ${isEditMode ? 'updated' : 'created'}.` });
        onClose();
      },
      onError: (err: Error) => {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Automation Template</DialogTitle>
          <DialogDescription>
            Define a trigger and a script-based action to automate a network task.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                    <Input placeholder="What this automation does" {...field} />
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
            <FormField
              control={form.control}
              name="action_script"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Script</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder={`show version\nshow interfaces`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
