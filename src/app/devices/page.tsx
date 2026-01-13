
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import { useZabbixData, type ZabbixHost } from '@/hooks/useZabbix';
import { Loader2, AlertTriangle, Server, PlusCircle, CheckCircle, Edit, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeviceCredentialsDialog } from './_components/device-credentials-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE = 10;

const StatusBadge = ({ status }: { status: string }) => {
  const isEnabled = status === '0';
  return <Badge variant={isEnabled ? 'success' : 'secondary'}>{isEnabled ? 'Habilitado' : 'Desabilitado'}</Badge>;
};

export default function DevicesPage() {
  const { hostsQuery } = useZabbixData();
  const { isLoading, isError, error, data: hosts = [] } = hostsQuery;
  const searchParams = useSearchParams();

  const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<ZabbixHost | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Effect to handle opening the modal via query parameter
  useEffect(() => {
    const hostIdToOpen = searchParams.get('openCredsModal');
    if (hostIdToOpen && hosts.length > 0) {
      const hostToSelect = hosts.find((h) => h.hostid === hostIdToOpen);
      if (hostToSelect) {
        setSelectedHost(hostToSelect);
        setIsCredsDialogOpen(true);
      }
    }
  }, [searchParams, hosts]);

  const filteredHosts = useMemo(() => {
    return hosts.filter((host) => host.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [hosts, searchTerm]);

  const totalPages = Math.ceil(filteredHosts.length / ITEMS_PER_PAGE);

  const paginatedHosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHosts, currentPage]);

  const handleCredentialAction = (host: ZabbixHost) => {
    setSelectedHost(host);
    setIsCredsDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset to page 1 when search term changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <PageHeader title="Equipamentos Monitorados" />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Lista de Dispositivos</CardTitle>
              <CardDescription>
                Esta é a lista de todos os equipamentos (hosts) que seu usuário tem permissão para
                visualizar no Zabbix. Adicione as credenciais SSH para habilitar a execução de
                comandos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do host..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10 w-full max-w-sm"
                  />
                </div>
              </div>
              {isLoading && (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="ml-2">Carregando dispositivos do Zabbix...</p>
                </div>
              )}
              {isError && !isLoading && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Falha ao Carregar Dispositivos</AlertTitle>
                  <AlertDescription>
                    {error?.message || 'Ocorreu um erro desconhecido.'}
                  </AlertDescription>
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
                        <TableHead className="text-center">Credenciais SSH</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHosts.map((host) => (
                        <TableRow key={host.hostid}>
                          <TableCell>
                            <StatusBadge status={host.status} />
                          </TableCell>
                          <TableCell className="font-medium font-mono">{host.name}</TableCell>
                          <TableCell className="text-xs">
                            {host.groups.map((g) => g.name).join(', ')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {host.description || 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            {host.has_credentials ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCredentialAction(host)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                    Editar
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Credenciais salvas. Clique para editar.</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCredentialAction(host)}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {paginatedHosts.length === 0 && searchTerm && (
                    <div className="text-center p-4 text-muted-foreground">
                      Nenhum dispositivo encontrado para &quot;{searchTerm}&quot;.
                    </div>
                  )}
                  <DataTablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
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
        <DeviceCredentialsDialog
          isOpen={isCredsDialogOpen}
          onOpenChange={setIsCredsDialogOpen}
          host={selectedHost}
        />
      </div>
    </TooltipProvider>
  );
}
