
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import {
  automationActionSchema,
  automationCriterionSchema,
  useCreateAutomationActionMutation,
  useCreateAutomationCriterionMutation,
  useUpdateAutomationActionMutation,
  useUpdateAutomationCriterionMutation,
  type AutomationAction,
  type AutomationCriterion,
  type AutomationComponentFormData,
  type CriterionValueType,
} from '@/hooks/useAdminManagement';

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
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ComponentType = 'criterion' | 'action';

interface Props {
  type: ComponentType;
  item?: AutomationCriterion | AutomationAction;
}

export default function AutomationComponentForm({ type, item }: Props) {
  const router = useRouter();
  const isEditMode = !!item;
  const { toast } = useToast();

  const createCriterion = useCreateAutomationCriterionMutation();
  const updateCriterion = useUpdateAutomationCriterionMutation();
  const createAction = useCreateAutomationActionMutation();
  const updateAction = useUpdateAutomationActionMutation();

  const form = useForm<AutomationComponentFormData>({
    resolver: zodResolver(type === 'criterion' ? automationCriterionSchema : automationActionSchema),
    defaultValues: {
      name: '',
      label: '',
      description: '',
      value_type: 'text',
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        label: item.label,
        description: item.description || '',
        value_type:
          type === 'criterion' ? (item as AutomationCriterion).value_type || 'text' : undefined,
      });
    } else {
      form.reset({ name: '', label: '', description: '', value_type: 'text' });
    }
  }, [item, type, form]);

  const onSubmit = (values: AutomationComponentFormData) => {
    const handleSuccess = () => {
      const componentName = type.charAt(0).toUpperCase() + type.slice(1);
      toast({
        title: 'Success',
        description: `${componentName} ${isEditMode ? 'updated' : 'created'}.`,
      });
      router.push('/admin');
    };
    const handleError = (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    };

    if (type === 'criterion') {
      if (isEditMode) {
        updateCriterion.mutate({ id: item!.id, data: values }, { onSuccess: handleSuccess, onError: handleError });
      } else {
        createCriterion.mutate(values, { onSuccess: handleSuccess, onError: handleError });
      }
    } else { // type === 'action'
      if (isEditMode) {
        updateAction.mutate({ id: item!.id, data: values }, { onSuccess: handleSuccess, onError: handleError });
      } else {
        createAction.mutate(values, { onSuccess: handleSuccess, onError: handleError });
      }
    }
  };

  const isSubmitting =
    createCriterion.isPending ||
    updateCriterion.isPending ||
    createAction.isPending ||
    updateAction.isPending;

  const title = `${isEditMode ? 'Edit' : 'Create'} ${type === 'criterion' ? 'Criterion' : 'Action'}`;
  const description = `Fill out the details for the automation ${type}.`;

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="User-friendly name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Name</FormLabel>
                  <FormControl>
                    <Input placeholder="system_name_without_spaces" {...field} />
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
                    <Input placeholder="What does this do?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === 'criterion' && (
              <FormField
                control={form.control}
                name="value_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value as CriterionValueType}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end pt-4 gap-2">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
