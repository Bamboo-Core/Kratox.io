
"use client";

import { useState } from 'react';
import { useRunCommandMutation, type ZabbixAlert, type ZabbixHost } from '@/hooks/useZabbix';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Play, Server, Terminal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const commonCommands = [
    { label: 'Show Version', value: 'show version' },
    { label: 'Show IP Interface Brief', value: 'show ip interface brief' },
    { label: 'Show Log', value: 'show log' },
    { label: 'Show Running-Config', value: 'show running-config' },
];

interface CommandExecutionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  alert: ZabbixAlert | null;
  host: ZabbixHost | null;
}

export function CommandExecutionDialog({ isOpen, onOpenChange, alert, host }: CommandExecutionDialogProps) {
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const [commandOutput, setCommandOutput] = useState<string | null>(null);

  const runCommandMutation = useRunCommandMutation();

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state on close
      setSelectedCommand('');
      setCommandOutput(null);
      runCommandMutation.reset();
    }
  };

  const handleExecute = () => {
    if (!host || !selectedCommand) return;
    setCommandOutput(null); // Clear previous output
    runCommandMutation.mutate(
      { hostId: host.hostid, command: selectedCommand },
      {
        onSuccess: (data) => {
          setCommandOutput(data.output);
        },
      }
    );
  };

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
            <Select onValueChange={setSelectedCommand} value={selectedCommand}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um comando para executar..." />
              </SelectTrigger>
              <SelectContent>
                {commonCommands.map(cmd => (
                  <SelectItem key={cmd.value} value={cmd.value}>
                    {cmd.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExecute} disabled={!selectedCommand || runCommandMutation.isPending}>
              {runCommandMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Executar
            </Button>
          </div>
          <div className="flex-1 bg-muted rounded-md p-4 overflow-auto font-mono text-sm border">
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
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Server className="h-6 w-6 mr-4" />
                    A saída do comando aparecerá aqui.
                </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
