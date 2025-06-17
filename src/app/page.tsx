
"use client"; // Required for useQuery hook

import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Wifi, Server, Users, Loader2 } from "lucide-react";
import type { KPI, Alert as AlertType } from "@/types/network";
import { useQuery } from "@tanstack/react-query";

const kpis: KPI[] = [
  { title: "Network Uptime", value: "99.98%", icon: Wifi, trend: "+0.02%", trendColor: "text-green-500" },
  { title: "Active Critical Alerts", value: "3", icon: AlertTriangle, trend: "+1", trendColor: "text-red-500" },
  { title: "Devices Monitored", value: "1,250", icon: Server, trend: "+50", trendColor: "text-blue-500" },
  { title: "Tenants Active", value: "42", icon: Users, trend: "+2", trendColor: "text-green-500" },
];

const SeverityBadge = ({ severity }: { severity?: AlertType["severity"] }) => {
  // Default to 'info' if severity is undefined, null, or not one of the expected strings.
  // This also handles cases where severity might be an empty string.
  const currentSeverity = typeof severity === 'string' && severity.trim() !== '' ? severity.toLowerCase() : 'info';

  switch (currentSeverity) {
    case "critical":
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Critical</Badge>;
    case "warning":
      return <Badge variant="warning"><AlertTriangle className="mr-1 h-3 w-3" />Warning</Badge>;
    // "info" or any other unexpected value will fall into default
    default:
      return <Badge variant="default"><Info className="mr-1 h-3 w-3" />Info</Badge>;
  }
};

async function fetchAlerts(): Promise<AlertType[]> {
  const response = await fetch('/api/alerts');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

export default function DashboardPage() {
  const { data: alerts, isLoading, isError, error } = useQuery<AlertType[], Error>({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <kpi.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpi.value}</div>
                <p className={`text-xs ${kpi.trendColor} mt-1`}>{kpi.trend} from last period</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-1">
          <Card className="shadow-lg">
             <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest network events and notifications.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isLoading && (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading alerts...</p>
                </div>
              )}
              {isError && (
                <div className="text-destructive-foreground bg-destructive p-4 rounded-md">
                  <p>Error fetching alerts: {error?.message || "Unknown error"}</p>
                </div>
              )}
              {!isLoading && !isError && alerts && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                        <TableCell className="font-medium">{alert.device}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-xs">{alert.message}</TableCell>
                        <TableCell className="text-muted-foreground">{alert.tenant}</TableCell>
                        <TableCell className="text-muted-foreground">{alert.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!isLoading && !isError && (!alerts || alerts.length === 0) && (
                <p className="py-4 text-center text-muted-foreground">No alerts to display.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
