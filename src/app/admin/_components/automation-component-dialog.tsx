
'use client';

import { useEffect } from 'react';
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
} from '@/hooks/useAdminManagement';

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
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ComponentType = 'criterion' | 'action';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: ComponentType;
  item: AutomationCriterion | AutomationAction | null;
}

export function AutomationComponentDialog({ isOpen, onClose, type, item }: Props) {
  const isEditMode = !!item;
  const { toast } = useToast();

  // Mutations
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
        value_type: (item as AutomationCriterion).value_type || 'text',
      });
    } else {
      form.reset({ name: '', label: '', description: '', value_type: 'text' });
    }
  }, [item, form]);

  const onSubmit = (values: AutomationComponentFormData) => {
    let mutation;
    if (type === 'criterion') {
      mutation = isEditMode ? updateCriterion : createCriterion;
    } else {
      mutation = isEditMode ? updateAction : createAction;
    }

    const params = isEditMode ? { id: item!.id, data: values } : values;

    mutation.mutate(params as any, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} ${
            isEditMode ? 'updated' : 'created'
          }.`,
        });
        onClose();
      },
      onError: (err: Error) => {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
      },
    });
  };

  const isSubmitting =
    createCriterion.isPending ||
    updateCriterion.isPending ||
    createAction.isPending ||
    updateAction.isPending;

  const title = `${isEditMode ? 'Edit' : 'Create'} ${type === 'criterion' ? 'Criterion' : 'Action'}`;
  const description = `Fill out the details for the automation ${type}.`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
