
"use client";

import { useState, useMemo } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Server, ShieldAlert, HeartPulse, Clock, CalendarIcon, ArrowUpDown, ListTree, AreaChart } from "lucide-react";
import { useZabbixData } from "@/hooks/useZabbix";
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
import { HostMetricsDialog } from './_components/host-metrics-dialog';

// Map Zabbix severity numbers to our Badge variants and text
const severityMap: { [key: string]: { variant: "destructive" | "warning" | "default" | "secondary"; text: string; icon: React.ComponentType<{className?: string}>; level: number } } = {
  '5': { variant: "destructive", text: "Disaster", icon: ShieldAlert, level: 5 },
  '4': { variant: "destructive", text: "High", icon: AlertTriangle, level: 4 },
  '3': { variant: "warning", text: "Average", icon: AlertTriangle, level: 3 },
  '2': { variant: "default", text: "Warning", icon: AlertTriangle, level: 2 },
  '1': { variant: "secondary", text: "Information", icon: HeartPulse, level: 1 },
  '0': { variant: "secondary", text: "Not Classified", icon: HeartPulse, level: 0 },
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const sev = severityMap[severity] || severityMap['0'];
  const Icon = sev.icon;
  return <Badge variant={sev.variant}><Icon className="mr-1 h-3 w-3" />{sev.text}</Badge>;
};

type SortDirection = 'asc' | 'desc' | null;

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [preset, setPreset] = useState<string>('7days');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortConfig, setSortConfig = useState<{ key: 'severity' | 'time'; direction: SortDirection }>({ key: 'severity', direction: 'desc' });
  
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<{ id: string; name: string } | null>(null);

  const { hostsQuery, alertsQuery } = useZabbixData(dateRange);

  const isLoading = hostsQuery.isLoading || alertsQuery.isLoading;
  const isError = hostsQuery.isError || alertsQuery.isError;
  const error = hostsQuery.error || alertsQuery.error;
  
  const hosts = hostsQuery.data || [];
  const rawAlerts = alertsQuery.data || [];

  const hostMap = useMemo(() => {
    return new Map(hosts.map(host => [host.hostid, host.name]));
  }, [hosts]);

  const monitoredHostsCount = hosts.length;
  const activeAlertsCount = rawAlerts.length;
  
  // Calculate counts for each severity level
  const alertCountsBySeverity = useMemo(() => {
    const counts = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, '0': 0 };
    rawAlerts.forEach(alert => {
      if (counts.hasOwnProperty(alert.severity)) {
        // @ts-ignore
        counts[alert.severity]++;
      }
    });
    return counts;
  }, [rawAlerts]);

  const kpis = [
    { title: "Hosts Monitorados", value: monitoredHostsCount, icon: Server },
    { title: "Alertas no Período", value: activeAlertsCount, icon: AlertTriangle },
  ];
  
  const handlePresetChange = (value: string) => {
    setPreset(value);
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
    setPreset('custom'); // Switch to custom when a date is picked manually
  }

  const handleSort = (key: 'severity' | 'time') => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key) {
        if (sortConfig.direction === 'desc') direction = 'asc';
        else if (sortConfig.direction === 'asc') direction = null; // Reset sort
        else direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedAlerts = useMemo(() => {
    let filteredItems = [...rawAlerts];

    // Apply severity filter
    if (severityFilter !== 'all') {
      filteredItems = filteredItems.filter(alert => alert.severity === severityFilter);
    }
    
    // Apply sorting
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
        // Default sort when reset: by time descending (most recent first)
        filteredItems.sort((a, b) => parseInt(b.clock) - parseInt(a.clock));
    }
    return filteredItems;
  }, [rawAlerts, sortConfig, severityFilter]);

  const handleViewMetricsClick = (host: { id: string; name: string }) => {
    setSelectedHost(host);
    setIsMetricsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard">
        <div className="flex items-center gap-2">
            <Select onValueChange={setSeverityFilter} value={severityFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por Severidade" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as Severidades</SelectItem>
                    {Object.entries(severityMap).reverse().map(([key, {text}]) => (
                        <SelectItem key={key} value={key}>{text}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={handlePresetChange} value={preset}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a preset" />
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
                    variant={"outline"}
                    className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>
                        {new Date(dateRange.from).toLocaleDateString()} -{" "}
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
        {(isLoading || isError) && (
            <div className="space-y-6">
                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Carregando dados do Zabbix...</p>
                    </div>
                )}
                {isError && !isLoading && (
                    <UiAlert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Falha ao Carregar Dados do Zabbix</AlertTitle>
                        <AlertDescription>{error?.message || 'Ocorreu um erro desconhecido.'}</AlertDescription>
                    </UiAlert>
                )}
            </div>
        )}

        {!isLoading && !isError && (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Detalhamento de Alertas</CardTitle>
                        <ListTree className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm pt-4">
                        {Object.entries(alertCountsBySeverity).reverse().map(([severity, count]) => {
                            const sev = severityMap[severity];
                            if (!sev) return null;
                            return (
                            <div key={severity} className="flex items-center justify-between">
                                <span className="flex items-center"><Badge variant={sev.variant} className="mr-2 w-28 justify-center py-1 text-xs">{sev.text}</Badge></span>
                                <span className="font-bold text-lg">{count}</span>
                            </div>
                            )
                        })}
                        </div>
                    </CardContent>
                </Card>

                {/* Side Column */}
                <div className="lg:col-span-1 space-y-6">
                    {kpis.map((kpi, index) => (
                    <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                        <kpi.icon className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                        <div className={`text-3xl font-bold`}>{kpi.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">Dados em tempo real do Zabbix</p>
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 md:grid-cols-1">
              <Card className="shadow-lg">
                 <CardHeader>
                  <CardTitle>Alertas Ativos Recentes</CardTitle>
                  <CardDescription>Problemas atuais identificados pelo Zabbix, ordenados por severidade.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                           <TableHead>
                             <Button variant="ghost" onClick={() => handleSort('severity')} className="px-1">
                                Severidade
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                             </Button>
                           </TableHead>
                          <TableHead>Host</TableHead>
                          <TableHead>Problema</TableHead>
                          <TableHead>
                            <Button variant="ghost" onClick={() => handleSort('time')} className="px-1">
                                <Clock className="mr-2 h-4 w-4" />
                                Ativo Há
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                           </TableHead>
                           <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedAlerts.length > 0 ? filteredAndSortedAlerts.map((alert) => {
                          const firstHostInfo = alert.hosts && alert.hosts[0];
                          const hostId = firstHostInfo?.hostid;
                          const hostName = hostId ? hostMap.get(hostId) || firstHostInfo?.name || 'N/A' : 'N/A';
                          
                          return (
                          <TableRow key={alert.eventid}>
                            <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                            <TableCell className="font-medium">
                              {hostName}
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-sm">{alert.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDistanceToNow(new Date(parseInt(alert.clock) * 1000), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-right">
                                {hostId && hostName !== 'N/A' && (
                                    <Button variant="outline" size="sm" onClick={() => handleViewMetricsClick({ id: hostId, name: hostName })}>
                                        <AreaChart className="mr-2 h-4 w-4" />
                                        Métricas
                                    </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        )}) : (
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
            isOpen={isMetricsDialogOpen}
            onOpenChange={setIsMetricsDialogOpen}
            hostId={selectedHost.id}
            hostName={selectedHost.name}
        />
      )}
    </div>
  );
}
