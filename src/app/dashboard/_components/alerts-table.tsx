
"use client";

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Clock, Sparkles } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { ZabbixAlert, ZabbixHost } from '@/hooks/useZabbix';
import type { SortDirection, SortKey } from '../page';
import { severityMap } from '@/lib/utils';

interface AlertsTableProps {
    alerts: ZabbixAlert[];
    hostsMap: Map<string, ZabbixHost>;
    sortConfig: { key: SortKey; direction: SortDirection };
    onSort: (key: SortKey) => void;
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

export default function AlertsTable({ alerts, hostsMap, sortConfig, onSort, onActionClick }: AlertsTableProps) {
    return (
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
                {alerts.length > 0 ? (
                    alerts.map((alert) => {
                        const hostId = alert.hosts?.[0]?.hostid;
                        const host = hostId ? hostsMap.get(hostId) : undefined;
                        const hostName = host?.name || alert.hosts?.[0]?.name || 'N/A';

                        return (
                            <TableRow key={alert.eventid} className="hover:bg-muted/50">
                                <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                                <TableCell className="font-mono break-words max-w-xs">{alert.name}</TableCell>
                                <TableCell>
                                    {hostId ? (
                                        <Link
                                            href={`/devices/${hostId}?eventId=${alert.eventid}`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {hostName}
                                        </Link>
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
                                        <Button variant="ghost" size="icon" onClick={() => onActionClick(alert, host)} title="Diagnosticar com IA">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Nenhum alerta para exibir nesta página.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
