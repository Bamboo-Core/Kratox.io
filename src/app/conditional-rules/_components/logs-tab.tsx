
"use client";

import { useMemo, useState } from 'react';
import { useAutomationLogsQuery, type AutomationLog } from '@/hooks/useAutomationRules';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Info, FileJson } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';


const ITEMS_PER_PAGE = 10;

export default function LogsTab() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: logs = [], isLoading, isError, error } = useAutomationLogsQuery();

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [logs, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const isSuccess = status === 'success';
    return (
      <Badge variant={isSuccess ? 'success' : 'destructive'} className="gap-1.5">
        {isSuccess ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center"><Loader2 className="h-6 w-6 animate-spin" /> Carregando logs...</div>;
  }

  if (isError) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erro</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Nome da Regra</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><StatusBadge status={log.status} /></TableCell>
                  <TableCell className="font-medium">{log.rule_name}</TableCell>
                  <TableCell><Badge variant="secondary">{log.action_type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{log.message}</TableCell>
                  <TableCell>{new Date(log.executed_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Info className="h-4 w-4"/></Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detalhes do Log de Automação</DialogTitle>
                          <DialogDescription>
                            Dados brutos do evento que disparou a regra e os detalhes da ação executada.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><FileJson className="h-4 w-4"/>Gatilho (Zabbix Event)</h4>
                                <pre className="bg-muted text-xs p-2 rounded-md font-mono">{JSON.stringify(log.trigger_event, null, 2)}</pre>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><FileJson className="h-4 w-4"/>Detalhes da Ação</h4>
                                <pre className="bg-muted text-xs p-2 rounded-md font-mono">{JSON.stringify(log.action_details, null, 2)}</pre>
                            </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Nenhum log de automação encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}
