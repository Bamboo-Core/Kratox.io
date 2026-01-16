
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useTestWhatsappMutation, whatsappTestSchema, type WhatsappTestFormData } from '@/hooks/useAdminManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';

export default function WhatsappTestCard() {
  const { toast } = useToast();
  const testWhatsappMutation = useTestWhatsappMutation();

  const form = useForm<WhatsappTestFormData>({
    resolver: zodResolver(whatsappTestSchema),
    defaultValues: {
      toNumber: '',
      message: 'Esta é uma mensagem de teste enviada pela plataforma NOC AI.',
    },
  });

  const onSubmit = (values: WhatsappTestFormData) => {
    testWhatsappMutation.mutate(values, {
      onSuccess: () => {
        toast({
          title: 'Sucesso!',
          description: 'A mensagem de teste foi enviada para o serviço configurado.',
        });
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'Falha no Envio',
          description: error.message,
        });
      },
    });
  };

  return (
    <Card className="shadow-lg mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Teste de Envio de WhatsApp
        </CardTitle>
        <CardDescription>
          Use este formulário para enviar uma mensagem de teste para verificar a configuração do
          provedor de WhatsApp (GZappy ou Mock) no backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="toNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Destino</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 5511999998888"
                      {...field}
                      disabled={testWhatsappMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} disabled={testWhatsappMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={testWhatsappMutation.isPending}>
              {testWhatsappMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enviar Mensagem de Teste
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
