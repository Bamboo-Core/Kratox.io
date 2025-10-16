"use client";

import { useEffect } from 'react';
import { useDiagnoseNetworkMutation, type ZabbixAlert, type ZabbixHost } from '@/hooks/useZabbix';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, BrainCircuit, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AiDiagnosticDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  alert: ZabbixAlert | null;
  host: ZabbixHost | null;
}

export function AiDiagnosticDialog({ isOpen, onOpenChange, alert, host }: AiDiagnosticDialogProps) {
  const diagnoseMutation = useDiagnoseNetworkMutation();

  useEffect(() => {
    // Reset mutation state when dialog closes
    if (!isOpen) {
      diagnoseMutation.reset();
    }
  }, [isOpen, diagnoseMutation]);

  const handleDiagnose = () => {
    if (!alert) return;
    diagnoseMutation.mutate({ objective: alert.name });
  };
  
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            Diagnóstico com IA
          </DialogTitle>
          <DialogDescription>
            Use o agente de IA para analisar o alerta e obter um diagnóstico e os próximos passos.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Alerta</p>
                <p className="text-sm text-muted-foreground font-mono">{alert?.name}</p>
                 <p className="text-sm font-medium mt-2">Dispositivo</p>
                <p className="text-sm text-muted-foreground font-mono">{host?.name}</p>
            </div>
            
            {!diagnoseMutation.isPending && !diagnoseMutation.data && !diagnoseMutation.isError &&(
                <div className="text-center py-4">
                    <Button onClick={handleDiagnose}>
                        <Sparkles className="mr-2 h-4 w-4"/>
                        Diagnosticar com IA
                    </Button>
                </div>
            )}

            {diagnoseMutation.isPending && (
                <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-4" />
                    Agente de IA está analisando...
                </div>
            )}
            {diagnoseMutation.isError && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Falha no Diagnóstico</AlertTitle>
                    <AlertDescription>{diagnoseMutation.error.message}</AlertDescription>
                </Alert>
            )}
            {diagnoseMutation.data && (
                <div className="space-y-4">
                    <h3 className="font-semibold">Resultado do Diagnóstico:</h3>
                    <div className="p-4 border rounded-lg bg-background text-sm">
                        {diagnoseMutation.data.response}
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
