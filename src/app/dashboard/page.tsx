
"use client";

import { useState } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Server, ShieldAlert, HeartPulse, Clock, CalendarIcon } from "lucide-react";
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

// Map Zabbix severity numbers to our Badge variants and text
const severityMap: { [key: string]: { variant: "destructive" | "warning" | "default" | "secondary"; text: string; icon: React.ComponentType<{className?: string}> } } = {
  '5': { variant: "destructive", text: "Disaster", icon: ShieldAlert },
  '4': { variant: "destructive", text: "High", icon: AlertTriangle },
  '3': { variant: "warning", text: "Average", icon: AlertTriangle },
  '2': { variant: "default", text: "Warning", icon: AlertTriangle },
  '1': { variant: "secondary", text: "Information", icon: HeartPulse },
  '0': { variant: "secondary", text: "Not Classified", icon: HeartPulse },
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const sev = severityMap[severity] || severityMap['0'];
  const Icon = sev.icon;
  return <Badge variant={sev.variant}><Icon className="mr-1 h-3 w-3" />{sev.text}</Badge>;
};


export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  const { hostsQuery, alertsQuery } = useZabbixData(dateRange);

  const isLoading = hostsQuery.isLoading || alertsQuery.isLoading;
  const isError = hostsQuery.isError || alertsQuery.isError;
  const error = hostsQuery.error || alertsQuery.error;
  
  const hosts = hostsQuery.data || [];
  const alerts = alertsQuery.data || [];

  const monitoredHostsCount = hosts.length;
  const activeAlertsCount = alerts.length;
  const criticalAlertsCount = alerts.filter(a => a.severity === '5' || a.severity === '4').length;

  const kpis = [
    { title: "Hosts Monitorados", value: monitoredHostsCount, icon: Server },
    { title: "Alertas no Período", value: activeAlertsCount, icon: AlertTriangle },
    { title: "Alertas Críticos", value: criticalAlertsCount, icon: ShieldAlert, className: "text-destructive" },
  ];
  
  const handlePresetChange = (value: string) => {
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


  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard">
        <div className="flex items-center gap-2">
            <Select onValueChange={handlePresetChange} defaultValue="7days">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
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
                    onSelect={setDateRange}
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
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kpis.map((kpi, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    <kpi.icon className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${kpi.className || ''}`}>{kpi.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">Dados em tempo real do Zabbix</p>
                  </CardContent>
                </Card>
              ))}
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
                          <TableHead>Severidade</TableHead>
                          <TableHead>Host</TableHead>
                          <TableHead>Problema</TableHead>
                          <TableHead className="flex items-center gap-1"><Clock className="h-4 w-4" />Ativo Há</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.length > 0 ? alerts.map((alert) => (
                          <TableRow key={alert.eventid}>
                            <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                            <TableCell className="font-medium">
                              {/* SAFEGUARD: Check if hosts array exists and is not empty before accessing */}
                              {alert.hosts && alert.hosts.length > 0 ? alert.hosts[0].name : 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-sm">{alert.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDistanceToNow(new Date(parseInt(alert.clock) * 1000), { addSuffix: true })}
                            </TableCell>
                          </TableRow>
                        )) : (
                           <TableRow>
                               <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                   <HeartPulse className="mx-auto h-8 w-8 mb-2" />
                                   Nenhum alerta encontrado no período selecionado.
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
    </div>
  );
}

