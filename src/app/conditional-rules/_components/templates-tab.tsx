
"use client";

import { useAutomationTemplatesForClient, useSubscribeToTemplateMutation, useUnsubscribeFromTemplateMutation } from "@/hooks/useAutomationTemplates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function TemplatesTab() {
  const { data, isLoading, isError, error } = useAutomationTemplatesForClient();
  const subscribeMutation = useSubscribeToTemplateMutation();
  const unsubscribeMutation = useUnsubscribeFromTemplateMutation();
  const { toast } = useToast();

  const handleToggle = (templateId: string, isEnabled: boolean) => {
    const mutation = isEnabled ? unsubscribeMutation : subscribeMutation;
    mutation.mutate(templateId, {
      onSuccess: () => {
        toast({ title: 'Sucesso', description: 'Template de automação atualizado.' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Erro', description: err.message });
      },
    });
  };

  if (isLoading) {
    return <div className="text-center p-4"><Loader2 className="h-5 w-5 animate-spin inline-block" /> Carregando templates...</div>;
  }
  if (isError) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Nome do Template</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Fabricante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.templates.length > 0 ? data.templates.map((template) => {
            const isEnabled = data.subscriptions.includes(template.id);
            const isMutating = (subscribeMutation.isPending && subscribeMutation.variables === template.id) || 
                               (unsubscribeMutation.isPending && unsubscribeMutation.variables === template.id);
            return (
              <TableRow key={template.id}>
                <TableCell>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(template.id, isEnabled)}
                    disabled={isMutating}
                  />
                </TableCell>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{template.description}</TableCell>
                <TableCell><Badge variant="outline">{template.device_vendor}</Badge></TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24">Nenhum template de automação disponível.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

    