
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import {
  useZabbixHostQuery,
  useZabbixItemsQuery,
  useZabbixItemHistoryQuery,
  useZabbixItemsByEventQuery,
  type ZabbixHostInterface,
  type ZabbixItem,
} from '@/hooks/useZabbix';
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  AreaChart,
  Server,
  Network,
  Edit,
  Info,
  Component,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import MetricChart from './_components/metric-chart';

const StatusBadge = ({ status }: { status: string }) => {
  const isEnabled = status === '0';
  return <Badge variant={isEnabled ? 'success' : 'secondary'}>{isEnabled ? 'Habilitado' : 'Desabilitado'}</Badge>;
};

const InterfaceTypeBadge = ({ type }: { type: string }) => {
  const typeMap: { [key: string]: { text: string; variant: 'default' | 'secondary' } } = {
    '1': { text: 'Agent', variant: 'default' },
    '2': { text: 'SNMP', variant: 'secondary' },
    '3': { text: 'IPMI', variant: 'secondary' },
    '4': { text: 'JMX', variant: 'secondary' },
  };
  const { text, variant } = typeMap[type] || { text: 'Unknown', variant: 'secondary' };
  return <Badge variant={variant}>{text}</Badge>;
};

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const eventId = searchParams.get('eventId');

  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  const { data: host, isLoading: isLoadingHost, isError: isErrorHost, error: errorHost } = useZabbixHostQuery(id);
  const {
    data: items = [],
    isLoading: isLoadingItems,
    isError: isErrorItems,
    error: errorItems,
  } = useZabbixItemsQuery(id, host?.status === '0');
  const { data: itemsFromEvent } = useZabbixItemsByEventQuery(eventId);

  // Process items into chartable and grouped informational items
  const { chartableItems, groupedInfoItems } = useMemo(() => {
    const chartable: ZabbixItem[] = [];
    const info: ZabbixItem[] = [];
    items.forEach((item) => {
      if (item.value_type === '0' || item.value_type === '3') {
        chartable.push(item);
      } else {
        info.push(item);
      }
    });

    const grouped = info.reduce(
      (acc, item) => {
        const parts = item.name.split(':');
        const component = parts.length > 1 ? parts[0].trim() : 'General';
        const property = parts.length > 1 ? parts.slice(1).join(':').trim() : item.name;

        if (!acc[component]) {
          acc[component] = [];
        }
        acc[component].push({ property, value: item.lastvalue || 'N/A' });
        return acc;
      },
      {} as Record<string, { property: string; value: string }[]>
    );

    return {
      chartableItems: chartable.sort((a, b) => a.name.localeCompare(b.name)),
      groupedInfoItems: grouped,
    };
  }, [items]);

  const selectedItem = chartableItems?.find((item) => item.itemid === selectedItemId);
  const historyType =
    selectedItem?.value_type === '0' || selectedItem?.value_type === '3'
      ? selectedItem.value_type
      : undefined;

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    isError: isErrorHistory,
    error: errorHistory,
  } = useZabbixItemHistoryQuery(selectedItemId, historyType);

  useEffect(() => {
    if (selectedItemId) return;

    if (itemsFromEvent && itemsFromEvent.length > 0) {
      const relevantItem = itemsFromEvent[0];
      if (relevantItem.value_type === '0' || relevantItem.value_type === '3') {
        setSelectedItemId(relevantItem.itemid);
        return;
      }
    }

    if (chartableItems.length > 0) {
      setSelectedItemId(chartableItems[0].itemid);
    }
  }, [itemsFromEvent, chartableItems, selectedItemId]);

  const isLoading = isLoadingHost;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={host ? host.name : 'Detalhes do Dispositivo'}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Carregando dados do dispositivo...</p>
          </div>
        )}
        {isErrorHost && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha ao Carregar Dados</AlertTitle>
            <AlertDescription>{errorHost?.message}</AlertDescription>
          </Alert>
        )}
        {host && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="shadow-lg md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" /> Informações do Host
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="font-mono">{host.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={host.status} />
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Descrição</span>
                    <span className="text-right">{host.description || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grupos</span>
                    <span className="text-right">{host.groups.map((g) => g.name).join(', ')}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" /> Interfaces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Principal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {host.interfaces.map((iface: ZabbixHostInterface) => (
                        <TableRow key={iface.interfaceid}>
                          <TableCell className="font-mono">{iface.ip}</TableCell>
                          <TableCell>
                            <InterfaceTypeBadge type={iface.type} />
                          </TableCell>
                          <TableCell>{iface.main === '1' ? 'Sim' : 'Não'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {host.status !== '0' && (
              <Card className="shadow-lg border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle /> Dispositivo Desabilitado
                  </CardTitle>
                  <CardDescription>
                    Este dispositivo não está sendo monitorado ativamente. Para habilitá-lo e
                    começar a coletar dados, é necessário configurar as credenciais de acesso.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => router.push(`/devices?openCredsModal=${host.hostid}`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Configurar Credenciais
                  </Button>
                </CardContent>
              </Card>
            )}

            {host.status === '0' && (
              <>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AreaChart className="h-5 w-5" />
                      Métricas do Host
                    </CardTitle>
                    <CardDescription>
                      Selecione uma métrica para visualizar o histórico de dados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingItems && (
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin inline-block" /> Carregando
                        métricas...
                      </div>
                    )}
                    {isErrorItems && (
                      <Alert variant="destructive">
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{errorItems?.message}</AlertDescription>
                      </Alert>
                    )}

                    {chartableItems.length > 0 ? (
                      <>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                          <SelectTrigger className="max-w-md">
                            <SelectValue placeholder="Selecione uma métrica para visualizar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {chartableItems.map((item) => (
                              <SelectItem key={item.itemid} value={item.itemid}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedItem && (
                          <MetricChart
                            itemName={selectedItem.name}
                            itemUnits={selectedItem.units}
                            historyData={historyData}
                            isLoading={isLoadingHistory}
                            isError={isErrorHistory}
                            error={errorHistory}
                          />
                        )}
                      </>
                    ) : (
                      !isLoadingItems && (
                        <p className="text-muted-foreground">
                          Nenhuma métrica para gráfico encontrada para este host.
                        </p>
                      )
                    )}
                  </CardContent>
                </Card>

                {Object.keys(groupedInfoItems).length > 0 && (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Informações de Inventário
                      </CardTitle>
                      <CardDescription>
                        Dados estáticos e de inventário coletados do host.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(groupedInfoItems).map(([component, properties]) => (
                        <div key={component} className="border rounded-lg p-4">
                          <h3 className="font-semibold text-md flex items-center gap-2 mb-2">
                            <Component className="h-4 w-4 text-primary" />
                            {component}
                          </h3>
                          <dl className="space-y-1 text-sm">
                            {properties.map(({ property, value }) => (
                              <div key={property} className="grid grid-cols-3 gap-2">
                                <dt className="text-muted-foreground col-span-1">{property}</dt>
                                <dd className="font-mono col-span-2">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
