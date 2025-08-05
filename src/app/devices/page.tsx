
"use client";

import PageHeader from "@/components/layout/page-header";
import { useZabbixData, type ZabbixHost } from "@/hooks/useZabbix";
import { Loader2, AlertTriangle, Server, PlusCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const StatusBadge = ({ status }: { status: string }) => {
    const isEnabled = status === '0';
    return (
      <Badge variant={isEnabled ? 'success' : 'secondary'}>
        {isEnabled ? 'Habilitado' : 'Desabilitado'}
      </Badge>
    );
};


export default function DevicesPage() {
    // We call useZabbixData without filters to get all hosts the user is allowed to see.
    const { hostsQuery } = useZabbixData(); 
    const { isLoading, isError, error, data: hosts = [] } = hostsQuery;

    return (
        <div className="flex flex-col h-full">
            <PageHeader title="Equipamentos Monitorados" />
            <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Lista de Dispositivos</CardTitle>
                        <CardDescription>
                            Esta é a lista de todos os equipamentos (hosts) que seu usuário tem permissão para visualizar no Zabbix.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-2">Carregando dispositivos do Zabbix...</p>
                            </div>
                        )}
                        {isError && !isLoading && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Falha ao Carregar Dispositivos</AlertTitle>
                                <AlertDescription>{error?.message || 'Ocorreu um erro desconhecido.'}</AlertDescription>
                            </Alert>
                        )}
                        {!isLoading && !isError && hosts.length > 0 && (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Nome do Host</TableHead>
                                            <TableHead>Grupos</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-center">Credenciais</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hosts.map((host) => (
                                            <TableRow key={host.hostid}>
                                                <TableCell><StatusBadge status={host.status} /></TableCell>
                                                <TableCell className="font-medium font-mono">{host.name}</TableCell>
                                                <TableCell className="text-xs">{host.groups.map(g => g.name).join(', ')}</TableCell>
                                                <TableCell className="text-muted-foreground">{host.description || 'N/A'}</TableCell>
                                                <TableCell className="text-center">
                                                     <Button variant="outline" size="sm" disabled>
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Adicionar
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                         {!isLoading && !isError && hosts.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <Server className="mx-auto h-8 w-8 mb-2" />
                                Nenhum dispositivo encontrado para seu usuário.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
