
"use client";

import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Server, ShieldAlert, HeartPulse, Clock } from "lucide-react";
import { useZabbixData } from "@/hooks/useZabbix";
import { Loader2 } from "lucide-react";
import { Alert as UiAlert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';

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
  const { hostsQuery, alertsQuery } = useZabbixData();

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
    { title: "Alertas Ativos", value: activeAlertsCount, icon: AlertTriangle },
    { title: "Alertas Críticos", value: criticalAlertsCount, icon: ShieldAlert, className: "text-destructive" },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
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
                              {/* Zabbix problems can have multiple hosts, we'll show the first one */}
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
                                   Nenhum alerta ativo. Bom trabalho!
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

    