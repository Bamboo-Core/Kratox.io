
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PageHeader from "@/components/layout/page-header";
import { useZabbixHostQuery, useZabbixItemsQuery, type ZabbixHostInterface, type ZabbixItem } from '@/hooks/useZabbix';
import { Loader2, ArrowLeft, AlertTriangle, AreaChart, Server, Info, Network } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock Chart Component - To be replaced with a real implementation
const MockMetricChart = ({ itemName }: { itemName: string }) => {
    return (
        <div className="w-full h-80 border rounded-lg flex flex-col items-center justify-center bg-muted/50 mt-4">
            <AreaChart className="h-20 w-20 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-center">Gráfico para {itemName}</p>
            <p className="text-sm text-muted-foreground">(A exibição do gráfico é um recurso futuro)</p>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const isEnabled = status === '0';
    return (
      <Badge variant={isEnabled ? 'success' : 'secondary'}>
        {isEnabled ? 'Habilitado' : 'Desabilitado'}
      </Badge>
    );
};

const InterfaceTypeBadge = ({ type }: { type: string }) => {
    const typeMap: { [key: string]: { text: string; variant: "default" | "secondary" } } = {
      '1': { text: 'Agent', variant: 'default' },
      '2': { text: 'SNMP', variant: 'secondary' },
      '3': { text: 'IPMI', variant: 'secondary' },
      '4': { text: 'JMX', variant: 'secondary' },
    };
    const { text, variant } = typeMap[type] || { text: 'Unknown', variant: 'secondary' };
    return <Badge variant={variant}>{text}</Badge>;
}

const findRelevantItem = (items: ZabbixItem[], alertName: string | null): ZabbixItem | undefined => {
    if (!alertName || !items || items.length === 0) return undefined;

    // A simple heuristic: find an item whose name is contained within the alert name.
    // e.g., Alert "High CPU utilization..." and Item "CPU utilization".
    const lowerCaseAlertName = alertName.toLowerCase();
    
    // Sort items by name length descending to match longer names first
    const sortedItems = [...items].sort((a, b) => b.name.length - a.name.length);

    return sortedItems.find(item => lowerCaseAlertName.includes(item.name.toLowerCase()));
};


export default function DeviceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = typeof params.id === 'string' ? params.id : undefined;
    const alertName = searchParams.get('alert_name');

    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

    const { data: host, isLoading: isLoadingHost, isError: isErrorHost, error: errorHost } = useZabbixHostQuery(id);
    const { data: items = [], isLoading: isLoadingItems, isError: isErrorItems, error: errorItems } = useZabbixItemsQuery(id);
    
    useEffect(() => {
      // This effect runs when items are loaded or the alertName changes.
      if (items.length > 0) {
        const relevantItem = findRelevantItem(items, alertName);
        if (relevantItem) {
          setSelectedItemId(relevantItem.itemid);
        } else if (items.length > 0) {
          // Fallback to the first item if no relevant one is found
          setSelectedItemId(items[0].itemid);
        }
      }
    }, [items, alertName]);
    
    const selectedItem = items?.find(item => item.itemid === selectedItemId);
    const isLoading = isLoadingHost || isLoadingItems;
    
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
                {(isErrorHost || isErrorItems) && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Falha ao Carregar Dados</AlertTitle>
                        <AlertDescription>{(errorHost || errorItems)?.message}</AlertDescription>
                    </Alert>
                )}
                {host && items && (
                    <>
                        <div className="grid md:grid-cols-3 gap-6">
                           <Card className="shadow-lg md:col-span-1">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Informações do Host</CardTitle>
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
                                        <span className="text-right">{host.groups.map(g => g.name).join(', ')}</span>
                                    </div>
                                </CardContent>
                           </Card>
                           <Card className="shadow-lg md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5" /> Interfaces</CardTitle>
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
                                                    <TableCell><InterfaceTypeBadge type={iface.type} /></TableCell>
                                                    <TableCell>{iface.main === '1' ? 'Sim' : 'Não'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                           </Card>
                        </div>
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><AreaChart className="h-5 w-5"/>Métricas do Host (Itens)</CardTitle>
                                <CardDescription>Selecione uma métrica (item) para visualizar o histórico de dados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {items.length > 0 ? (
                                    <>
                                        <Select
                                            value={selectedItemId}
                                            onValueChange={setSelectedItemId}
                                        >
                                            <SelectTrigger className="max-w-md">
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
                                        
                                        {selectedItem && <MockMetricChart itemName={selectedItem.name} />}
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Nenhuma métrica (item) encontrada para este host.</p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    );
}
