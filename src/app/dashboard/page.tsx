
"use client";

import { useState, useMemo } from 'react';
import PageHeader from "@/components/layout/page-header";
import { useZabbixData, useZabbixHostGroupsQuery } from "@/hooks/useZabbix";
import { useAuthStore } from '@/store/auth-store';
import { Loader2, AlertTriangle, HeartPulse } from "lucide-react";
import { Alert as UiAlert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { HostMetricsDialog } from './_components/host-metrics-dialog';
import DashboardKpiCards from './_components/dashboard-kpi-cards';
import DashboardFilters from './_components/dashboard-filters';
import AlertsTable from './_components/alerts-table';
import { Skeleton } from '@/components/ui/skeleton';

export type SortDirection = 'asc' | 'desc' | null;
export type SortKey = 'severity' | 'time';

export const severityMap: { [key: string]: { variant: "destructive" | "warning" | "default" | "secondary"; text: string; level: number } } = {
  '5': { variant: "destructive", text: "Disaster", level: 5 },
  '4': { variant: "destructive", text: "High", level: 4 },
  '3': { variant: "warning", text: "Average", level: 3 },
  '2': { variant: "default", text: "Warning", level: 2 },
  '1': { variant: "secondary", text: "Information", level: 1 },
  '0': { variant: "secondary", text: "Not Classified", level: 0 },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [hostGroupFilter, setHostGroupFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'severity', direction: 'desc' });
  const [selectedHost, setSelectedHost] = useState<{ id: string; name: string } | null>(null);

  // Data fetching hooks
  const { data: hostGroups = [], isLoading: isLoadingHostGroups } = useZabbixHostGroupsQuery(isAdmin);
  const { alertsQuery, hostsQuery } = useZabbixData(dateRange, hostGroupFilter);

  const { isLoading: isLoadingAlerts, isError: isErrorAlerts, error: errorAlerts, data: rawAlerts = [] } = alertsQuery;
  const { isLoading: isLoadingHosts, isError: isErrorHosts, error: errorHosts, data: rawHosts = [] } = hostsQuery;
    
  const isLoading = isLoadingAlerts || isLoadingHosts || (isAdmin && isLoadingHostGroups);
  const isError = isErrorAlerts || isErrorHosts;
  const error = errorAlerts || errorHosts;

  // Memoized derived state
  const hostsMap = useMemo(() => new Map(rawHosts.map(host => [host.hostid, host])), [rawHosts]);

  const filteredAndSortedAlerts = useMemo(() => {
    let filteredItems = rawAlerts.filter(alert => severityFilter === 'all' || alert.severity === severityFilter);
    
    if (sortConfig.direction !== null) {
      filteredItems.sort((a, b) => {
        let aValue = sortConfig.key === 'severity' ? (severityMap[a.severity]?.level ?? -1) : parseInt(a.clock);
        let bValue = sortConfig.key === 'severity' ? (severityMap[b.severity]?.level ?? -1) : parseInt(b.clock);
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      filteredItems.sort((a, b) => parseInt(b.clock) - parseInt(a.clock));
    }
    return filteredItems;
  }, [rawAlerts, sortConfig, severityFilter]);

  const alertsBySeverity = useMemo(() => {
    return rawAlerts.reduce((acc, alert) => {
      const severity = alert.severity;
      if (severity in severityMap) {
        acc[severity] = (acc[severity] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [rawAlerts]);


  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else if (sortConfig.direction === 'asc') direction = null; 
      else direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard">
        <DashboardFilters
          isAdmin={isAdmin}
          hostGroups={hostGroups}
          isLoadingHostGroups={isLoadingHostGroups}
          hostGroupFilter={hostGroupFilter}
          setHostGroupFilter={setHostGroupFilter}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          dateRange={dateRange}
          setDateRange={setDateRange}
          severityMap={severityMap}
        />
      </PageHeader>
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
        
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-[120px] w-full" />
            </div>
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : isError ? null : (
            <>
              <DashboardKpiCards
                alertsBySeverity={alertsBySeverity}
                hostsCount={rawHosts.length}
                activeAlertsCount={rawAlerts.length}
                severityMap={severityMap}
              />
              <AlertsTable
                alerts={filteredAndSortedAlerts}
                hostsMap={hostsMap}
                sortConfig={sortConfig}
                onSort={handleSort}
                onHostClick={(host) => setSelectedHost(host)}
              />
              {filteredAndSortedAlerts.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <HeartPulse className="mx-auto h-8 w-8 mb-2" />
                  Nenhum alerta encontrado com os filtros selecionados.
                </div>
              )}
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
