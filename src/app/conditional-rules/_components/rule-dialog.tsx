
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateAutomationRuleMutation,
  ruleFormSchema,
  type RuleFormData,
} from '@/hooks/useAutomationRules';
import { useToast } from '@/hooks/use-toast';

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
import { Separator } from '@/components/ui/separator';

interface RuleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function RuleDialog({ isOpen, onOpenChange }: RuleDialogProps) {
  const { toast } = useToast();
  const createRuleMutation = useCreateAutomationRuleMutation();

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: '',
      condition_type: 'alert_name_contains',
      condition_value: '',
      action_type: 'dns_block_domain_from_alert',
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  const onSubmit = (values: RuleFormData) => {
    createRuleMutation.mutate(values, {
      onSuccess: () => {
        toast({ title: 'Sucesso', description: `Regra "${values.name}" criada.` });
        handleOpenChange(false);
      },
      onError: (error) => {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Regra de Automação</DialogTitle>
          <DialogDescription>
            Defina um gatilho e uma ação para automatizar tarefas repetitivas. O gatilho sempre
            será um &quot;Alerta do Zabbix&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Regra</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Bloquear domínios de phishing automaticamente"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            <p className="font-medium text-lg">SE (Condição)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField
                control={form.control}
                name="condition_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Critério</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="alert_name_contains">
                          Nome do Alerta do Zabbix Contém
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="condition_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input placeholder="phishing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <p className="font-medium text-lg">AÇÃO</p>

            <FormField
              control={form.control}
              name="action_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ação a ser executada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dns_block_domain_from_alert">
                        Extrair domínio do alerta e bloquear no DNS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRuleMutation.isPending}>
                {createRuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Regra
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
