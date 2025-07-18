
"use client";

import { useState, useMemo } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, HeartPulse, Clock, CalendarIcon, ArrowUpDown, Router } from "lucide-react";
import { useZabbixData, useZabbixHostGroupsQuery } from "@/hooks/useZabbix";
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from "lucide-react";
import { Alert as UiAlert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { HostMetricsDialog } from './_components/host-metrics-dialog';


const severityMap: { [key: string]: { variant: "destructive" | "warning" | "default" | "secondary"; text: string; icon: LucideIcon; level: number } } = {
  '5': { variant: "destructive", text: "Disaster", icon: ShieldAlert, level: 5 },
  '4': { variant: "destructive", text: "High", icon: AlertTriangle, level: 4 },
  '3': { variant: "warning", text: "Average", icon: AlertTriangle, level: 3 },
  '2': { variant: "default", text: "Warning", icon: AlertTriangle, level: 2 },
  '1': { variant: "secondary", text: "Information", icon: HeartPulse, level: 1 },
  '0': { variant: "secondary", text: "Not Classified", icon: HeartPulse, level: 0 },
};

const SeverityBadge = ({ severity, showText = true }: { severity: string, showText?: boolean }) => {
  const sev = severityMap[severity] || severityMap['0'];
  const Icon = sev.icon;
  return (
    <Badge variant={sev.variant} className="whitespace-nowrap">
      <Icon className={cn('h-3 w-3', showText && 'mr-1')} />
      {showText && sev.text}
    </Badge>
  );
};

type SortDirection = 'asc' | 'desc' | null;
type SortKey = 'severity' | 'time';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [datePreset, setDatePreset] = useState<string>('7days');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'severity', direction: 'desc' });
  const [selectedHost, setSelectedHost] = useState<{ id: string; name: string } | null>(null);
  const [hostGroupFilter, setHostGroupFilter] = useState<string>('all'); // 'all' or a groupid

  // Data fetching hooks
  const { data: hostGroups = [], isLoading: isLoadingHostGroups } = useZabbixHostGroupsQuery(isAdmin); // Only fetch if admin
  const { alertsQuery, hostsQuery } = useZabbixData(dateRange, hostGroupFilter);

  const { isLoading: isLoadingAlerts, isError: isErrorAlerts, error: errorAlerts, data: rawAlerts = [] } = alertsQuery;
  const { isLoading: isLoadingHosts, isError: isErrorHosts, error: errorHosts, data: rawHosts = [] } = hostsQuery;
    
  const isLoading = isLoadingAlerts || isLoadingHosts || (isAdmin && isLoadingHostGroups);
  const isError = isErrorAlerts || isErrorHosts;
  const error = errorAlerts || errorHosts;

  const hostsCount = rawHosts.length;
  const activeAlertsCount = rawAlerts.length;

  // Create a map for quick host lookup
  const hostsMap = useMemo(() => {
    return new Map(rawHosts.map(host => [host.hostid, host]));
  }, [rawHosts]);
  
  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    if (value === 'custom') return;

    const now = new Date();
    switch (value) {
      case 'today':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case '7days':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case '30days':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
    }
  };

  const handleDateRangeChange = (newRange: DateRange | undefined) => {
    setDateRange(newRange);
    setDatePreset('custom'); 
  }

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key) {
        if (sortConfig.direction === 'desc') direction = 'asc';
        else if (sortConfig.direction === 'asc') direction = null; 
        else direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedAlerts = useMemo(() => {
    let filteredItems = [...rawAlerts];

    if (severityFilter !== 'all') {
      filteredItems = filteredItems.filter((alert) => alert.severity === severityFilter);
    }
    
    if (sortConfig.direction !== null) {
      filteredItems.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'severity') {
            aValue = severityMap[a.severity]?.level ?? -1;
            bValue = severityMap[b.severity]?.level ?? -1;
        } else { // time
            aValue = parseInt(a.clock);
            bValue = parseInt(b.clock);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
        // Default sort by time descending if no sort is active
        filteredItems.sort((a, b) => parseInt(b.clock) - parseInt(a.clock));
    }
    return filteredItems;
  }, [rawAlerts, sortConfig, severityFilter]);

  const alertsBySeverity = useMemo(() => {
    return rawAlerts.reduce(
        (acc, alert) => {
            const severity = alert.severity;
            if (severity in severityMap) {
                acc[severity] = (acc[severity] || 0) + 1;
            }
            return acc;
        },
        {} as Record<string, number>
    );
  }, [rawAlerts]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard">
        <div className="flex items-center gap-2 flex-wrap justify-end">
            {isAdmin && (
              <Select onValueChange={setHostGroupFilter} value={hostGroupFilter} disabled={isLoadingHostGroups}>
                  <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={isLoadingHostGroups ? 'Carregando...' : 'Filtrar Grupo'} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos os Grupos</SelectItem>
                      {hostGroups.map((hg) => (
                          <SelectItem key={hg.groupid} value={hg.groupid}>{hg.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            )}
            <Select onValueChange={setSeverityFilter} value={severityFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar Severidade" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as Severidades</SelectItem>
                    {Object.entries(severityMap).reverse().map(([key, {text}]) => (
                        <SelectItem key={key} value={key}>{text}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={handleDatePresetChange} value={datePreset}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="custom">Período Personalizado</SelectItem>
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={'outline'}
                    className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>
                        {new Date(dateRange.from).toLocaleDateString()} -{' '}
                        {new Date(dateRange.to).toLocaleDateString()}
                        </>
                    ) : (
                        new Date(dateRange.from).toLocaleDateString()
                    )
                    ) : (
                    <span>Escolha uma data</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
        </div>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        {(isLoading) && (
            <div className="space-y-6">
                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Carregando dados do Zabbix...</p>
                    </div>
                )}
            </div>
        )}
        {isError && !isLoading && (
            <UiAlert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Falha ao Carregar Dados do Zabbix</AlertTitle>
                <AlertDescription>{error?.message || 'Ocorreu um erro desconhecido.'}</AlertDescription>
            </UiAlert>
        )}

        {!isLoading && !isError && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle>Severidade dos Alertas</CardTitle>
                        <CardDescription>Distribuição dos alertas por nível de severidade.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                         {Object.entries(severityMap).reverse().map(([key, {text, variant}]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                               <div className="flex items-center gap-2">
                                <Badge variant={variant} className="w-32 justify-center">{text}</Badge>
                               </div>
                                <span className="font-mono font-bold text-lg text-muted-foreground">{(alertsBySeverity as any)[key] || 0}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                 <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Hosts Monitorados
                    </CardTitle>
                    <Router className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-3xl font-bold">{hostsCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Dados em tempo real do Zabbix
                    </p>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Alertas no Período
                    </CardTitle>
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-3xl font-bold">{activeAlertsCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Total de alertas com os filtros atuais
                    </p>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 md:grid-cols-1">
              <Card className="shadow-lg">
                 <CardHeader>
                  <CardTitle>Alertas Ativos Recentes</CardTitle>
                  <CardDescription>Problemas atuais identificados pelo Zabbix, ordenados por severidade.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
 <Table className="w-full">
                      <TableHeader>
                        <TableRow>
 <TableHead className="w-[150px] min-w-[120px]">
 <Button variant="ghost" onClick={() => handleSort('severity')} className="px-1 min-w-[100px] w-full justify-start">
 Severidade
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                             </Button>
 </TableHead>
 <TableHead className="w-[40%] max-w-xs">Problema</TableHead>
                          <TableHead className="w-[30%] max-w-xs">Host</TableHead>
                          <TableHead>Grupo</TableHead>
                          <TableHead className="text-right w-[150px]">
 <Button variant="ghost" onClick={() => handleSort('time')} className="px-1 min-w-[100px] w-full justify-end text-right">
                                <Clock className="mr-2 h-4 w-4" />
                                Ativo Há
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                           </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedAlerts.length > 0 ? (
                            filteredAndSortedAlerts.map((alert) => {
                                const hostId = (alert.hosts && alert.hosts.length > 0) ? alert.hosts[0].hostid : undefined;
                                const host = hostId ? hostsMap.get(hostId) : undefined;
                                const hostName = host ? host.name : ((alert.hosts && alert.hosts.length > 0) ? alert.hosts[0].name : 'N/A');
                                return (
                                <TableRow key={alert.eventid}>
                                    <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
 <TableCell className="font-mono text-muted-foreground whitespace-normal break-words max-w-xs">{alert.name}</TableCell>
                                    <TableCell>
                                      {hostId ? (
                                        <Button
                                          variant="link"
                                          className="p-0 h-auto font-medium"
                                          onClick={() => setSelectedHost({ id: hostId, name: hostName })}
                                        >
                                          <span className="whitespace-normal break-words">{hostName}</span>
                                        </Button>
                                      ) : (
                                        hostName
                                      )}
                                    </TableCell>
                                    <TableCell>
 <span className="text-xs text-muted-foreground whitespace-normal break-words">
                                        {host ? (host.groups.map(g => g.name).join(', ') || 'Sem grupo') : 'N/A'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-right">
                                    {formatDistanceToNow(new Date(parseInt(alert.clock) * 1000), { addSuffix: true })}
                                    </TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                           <TableRow>
                               <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                   <HeartPulse className="mx-auto h-8 w-8 mb-2" />
                                   Nenhum alerta encontrado com os filtros selecionados.
                               </TableCell>
                           </TableRow>
                        )}
                      </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
      {selectedHost && (
        <HostMetricsDialog 
            isOpen={!!selectedHost}
            onOpenChange={() => setSelectedHost(null)}
            hostId={selectedHost.id}
            hostName={selectedHost.name}
        />
      )}
    </div>
  );
}
