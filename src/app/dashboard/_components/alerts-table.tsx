
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ZabbixAlert, ZabbixHost } from '@/hooks/useZabbix';
import type { SortDirection, SortKey } from '../page';
import { severityMap } from '../page';

interface AlertsTableProps {
  alerts: ZabbixAlert[];
  hostsMap: Map<string, ZabbixHost>;
  sortConfig: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  onHostClick: (host: { id: string; name: string }) => void;
}

const SeverityBadge = ({ severity, showText = true }: { severity: string, showText?: boolean }) => {
  const sev = severityMap[severity] || severityMap['0'];
  return (
    <Badge variant={sev.variant} className="whitespace-nowrap">
      {sev.text}
    </Badge>
  );
};


export default function AlertsTable({ alerts, hostsMap, sortConfig, onSort, onHostClick }: AlertsTableProps) {
  return (
     <div className="border rounded-lg shadow-lg">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[150px] min-w-[120px]">
                        <Button variant="ghost" onClick={() => onSort('severity')} className="px-1 min-w-[100px] w-full justify-start text-left">
                            Severidade
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                    <TableHead className="w-[40%] max-w-xs">Problema</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right w-[150px]">
                        <Button variant="ghost" onClick={() => onSort('time')} className="px-1 min-w-[100px] w-full justify-end">
                            <Clock className="mr-2 h-4 w-4" />
                            Ativo Há
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {alerts.map((alert) => {
                    const hostId = (alert.hosts && alert.hosts.length > 0) ? alert.hosts[0].hostid : undefined;
                    const host = hostId ? hostsMap.get(hostId) : undefined;
                    const hostName = host ? host.name : ((alert.hosts && alert.hosts.length > 0) ? alert.hosts[0].name : 'N/A');
                    
                    return (
                        <TableRow key={alert.eventid} onClick={() => hostId && onHostClick({ id: hostId, name: hostName })} className="cursor-pointer hover:bg-accent hover:text-gray-900">
                            <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                            <TableCell className="font-mono text-muted-foreground break-words max-w-xs">{alert.name}</TableCell>
                            <TableCell>
                                {hostId ? (
                                    <span className="font-medium">{hostName}</span>
                                ) : (
                                    hostName
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-normal break-words">
                                {host ? (host.groups.map(g => g.name).join(', ') || 'Sem grupo') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-right">
                                {formatDistanceToNow(new Date(parseInt(alert.clock) * 1000), { addSuffix: true })}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
     </div>
  );
}
