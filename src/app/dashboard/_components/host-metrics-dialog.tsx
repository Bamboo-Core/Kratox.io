
"use client";

import { useState } from 'react';
import { useZabbixItemsQuery } from '@/hooks/useZabbix';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, AreaChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock data and Chart component for demonstration
// In a real scenario, you'd fetch history data and use a real charting library
const MockMetricChart = ({ itemName }: { itemName: string }) => {
    return (
        <div className="w-full h-64 border rounded-lg flex flex-col items-center justify-center bg-muted/50 mt-4">
            <AreaChart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-center">Chart for {itemName}</p>
            <p className="text-sm text-muted-foreground">(Chart display is a future feature)</p>
        </div>
    )
}

interface HostMetricsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  hostId: string;
  hostName: string;
}

export function HostMetricsDialog({ isOpen, onOpenChange, hostId, hostName }: HostMetricsDialogProps) {
  const { data: items, isLoading, isError, error } = useZabbixItemsQuery(hostId);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedItemId(undefined); // Reset selection on close
    }
  };

  const selectedItem = items?.find(item => item.itemid === selectedItemId);
  const initialItem = items && items.length > 0 ? items[0] : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Métricas para: {hostName}</DialogTitle>
          <DialogDescription>
            Visualize as métricas disponíveis e o histórico de dados para este host.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Buscando métricas disponíveis...</p>
            </div>
          )}
          {isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha ao Carregar Métricas</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {items && items.length > 0 && (
            <div>
              <Select
                onValueChange={setSelectedItemId}
                defaultValue={initialItem?.itemid}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma métrica para visualizar..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.itemid} value={item.itemid}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <MockMetricChart itemName={selectedItem?.name || initialItem?.name || 'N/A'}/>
            </div>
          )}
           {items && items.length === 0 && !isLoading && !isError && (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
                Nenhuma métrica (item) encontrada para este host.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

    