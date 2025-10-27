
"use client";

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { ZabbixAlert, ZabbixHost } from '@/hooks/useZabbix';
import { severityMap } from '@/lib/utils';

interface AlertsTableProps {
    alerts: ZabbixAlert[];
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

export default function AlertsTable({ alerts, onActionClick }: AlertsTableProps) {
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[120px]">Severidade</TableHead>
                    <TableHead className="w-[40%] max-w-xs">Problema</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="w-[150px]">
                        <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            Ativo Há
                        </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {alerts.length > 0 ? (
                    alerts.map((alert) => {
                        // Directly use the host from the alert object
                        const host = (alert.hosts && alert.hosts[0]) as ZabbixHost | undefined;

                        return (
                            <TableRow key={alert.eventid} className="hover:bg-muted/50">
                                <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                                <TableCell className="font-mono break-words max-w-xs">{alert.name}</TableCell>
                                <TableCell>
                                    {host ? (
                                        <Link
                                            href={`/devices/${host.hostid}?eventId=${alert.eventid}`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {host.name}
                                        </Link>
                                    ) : (
                                        'N/A'
                                    )}
                                </TableCell>
                                <TableCell className="text-xs whitespace-normal break-words">
                                    {host?.groups ? host.groups.map(g => g.name).join(', ') : 'N/A'}
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
