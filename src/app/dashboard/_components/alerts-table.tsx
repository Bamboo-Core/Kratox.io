
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Clock, Terminal } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { ZabbixAlert, ZabbixHost } from '@/hooks/useZabbix';
import type { SortDirection, SortKey } from '../page';
import { severityMap } from '../page';

interface AlertsTableProps {
  alerts: ZabbixAlert[];
  hostsMap: Map<string, ZabbixHost>;
  sortConfig: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  onHostClick: (host: { id: string; name: string }) => void;
  onActionClick: (alert: ZabbixAlert, host: ZabbixHost) => void;
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  const sev = severityMap[severity] || severityMap['0'];
  return (
    <Badge variant={sev.variant} className="whitespace-nowrap">
      {sev.text}
    </Badge>
  );
};

export default function AlertsTable({ alerts, hostsMap, sortConfig, onSort, onHostClick, onActionClick }: AlertsTableProps) {
  return (
     <div className="border rounded-lg shadow-lg">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[120px]">
                        <Button variant="ghost" onClick={() => onSort('severity')} className="px-1 w-full justify-start text-left">
                            Severidade
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead className="w-[40%] max-w-xs">Problema</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="w-[150px]">
                        <Button variant="ghost" onClick={() => onSort('time')} className="px-1 w-full justify-start text-left">
                            <Clock className="mr-2 h-4 w-4" />
                            Ativo Há
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                     <TableHead className="text-center w-[80px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {alerts.map((alert) => {
                    const hostId = alert.hosts?.[0]?.hostid;
                    const host = hostId ? hostsMap.get(hostId) : undefined;
                    const hostName = host?.name || alert.hosts?.[0]?.name || 'N/A';
                    
                    return (
                        <TableRow key={alert.eventid} className="hover:bg-muted/50">
                            <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                            <TableCell className="font-mono break-words max-w-xs">{alert.name}</TableCell>
                            <TableCell>
                                {hostId ? (
                                    <button onClick={() => onHostClick({ id: hostId, name: hostName })} className="font-medium text-primary hover:underline text-left">
                                      {hostName}
                                    </button>
                                ) : (
                                    hostName
                                )}
                            </TableCell>
                            <TableCell className="text-xs whitespace-normal break-words">
                                {host ? (host.groups.map(g => g.name).join(', ') || 'Sem grupo') : 'N/A'}
                            </TableCell>
                            <TableCell>
                                {formatDistanceToNow(new Date(parseInt(alert.clock) * 1000), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-center">
                                {host && (
                                  <Button variant="ghost" size="icon" onClick={() => onActionClick(alert, host)} title="Executar Comando">
                                      <Terminal className="h-4 w-4" />
                                  </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
     </div>
  );
}
