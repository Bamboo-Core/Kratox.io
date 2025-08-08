
"use client";

import { useState, useEffect } from 'react';
import { useRunCommandMutation, useSuggestCommandsMutation, type ZabbixAlert, type ZabbixHost } from '@/hooks/useZabbix';
import { useDeviceCredentialsQuery } from '@/hooks/useDeviceManagement'; // Import the new hook
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Play, Server, Terminal, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CommandExecutionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  alert: ZabbixAlert | null;
  host: ZabbixHost | null;
}

export function CommandExecutionDialog({ isOpen, onOpenChange, alert, host }: CommandExecutionDialogProps) {
  const [command, setCommand] = useState<string>('');
  const [commandOutput, setCommandOutput] = useState<string | null>(null);

  const runCommandMutation = useRunCommandMutation();
  const suggestCommandsMutation = useSuggestCommandsMutation();
  
  // Fetch device credentials (which includes device_type) when the dialog is open
  const { data: credentials, isLoading: isLoadingCreds } = useDeviceCredentialsQuery(host?.hostid, isOpen);

  useEffect(() => {
    // Only fetch suggestions if the dialog is open, we have an alert, and credentials (with device_type) are loaded.
    if (isOpen && alert && credentials?.device_type && !suggestCommandsMutation.data && !suggestCommandsMutation.isPending) {
        suggestCommandsMutation.mutate({ 
            alertMessage: alert.name,
            deviceVendor: credentials.device_type,
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, alert, credentials, suggestCommandsMutation.isPending]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state on close
      setCommand('');
      setCommandOutput(null);
      runCommandMutation.reset();
      suggestCommandsMutation.reset();
    }
  };

  const handleExecute = () => {
    if (!host || !command) return;
    setCommandOutput(null); // Clear previous output
    runCommandMutation.mutate(
      { hostId: host.hostid, command: command },
      {
        onSuccess: (data) => {
          setCommandOutput(data.output);
        },
      }
    );
  };
  
  const suggestedCommands = suggestCommandsMutation.data?.commands || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-6 w-6" />
            Executar Comando no Dispositivo
          </DialogTitle>
          <DialogDescription>
            Execute comandos de diagnóstico no host <span className="font-bold text-primary">{host?.name}</span> para o alerta: "{alert?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Digite um comando ou selecione uma sugestão..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
              disabled={runCommandMutation.isPending}
            />
            <Button onClick={handleExecute} disabled={!command || runCommandMutation.isPending}>
              {runCommandMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Executar
            </Button>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Sugestões da IA ({credentials?.device_type || '...'})
            </h4>
            <div className="flex flex-wrap items-center gap-2">
                {(suggestCommandsMutation.isPending || isLoadingCreds) && <Badge variant="outline" className="gap-2"><Loader2 className="h-3 w-3 animate-spin" />Analisando alerta...</Badge>}
                <TooltipProvider>
                    {suggestedCommands.map((cmd, i) => (
                        <Tooltip key={i}>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20" onClick={() => setCommand(cmd)}>
                                    {cmd}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p>Usar este comando</p></TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
            {suggestCommandsMutation.data?.reasoning && (
                <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                   <Sparkles className="h-3 w-3 text-accent" /> {suggestCommandsMutation.data.reasoning}
                </p>
            )}
             {!suggestCommandsMutation.isPending && !isLoadingCreds && suggestedCommands.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma sugestão de comando gerada para este alerta.</p>
            )}
          </div>
          <div className="flex-1 bg-muted rounded-md p-4 overflow-auto font-mono text-sm border mt-2">
             {runCommandMutation.isPending && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-4" />
                    Executando comando no dispositivo...
                </div>
            )}
            {runCommandMutation.isError && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Falha na Execução do Comando</AlertTitle>
                    <AlertDescription>{runCommandMutation.error.message}</AlertDescription>
                </Alert>
            )}
            {commandOutput !== null && (
                <pre className="whitespace-pre-wrap">{commandOutput}</pre>
            )}
            {!runCommandMutation.isPending && !runCommandMutation.isError && commandOutput === null && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                    <Server className="h-8 w-8 mb-4" />
                    <p>A saída do comando aparecerá aqui.</p>
                    <p className="text-xs">Selecione uma sugestão ou digite seu próprio comando e clique em "Executar".</p>
                </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
