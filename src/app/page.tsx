
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, BarChart3, Wifi, Server, Users } from "lucide-react";
import type { KPI, Alert as AlertType } from "@/types/network"; // Updated import

const kpis: KPI[] = [
  { title: "Network Uptime", value: "99.98%", icon: Wifi, trend: "+0.02%", trendColor: "text-green-500" },
  { title: "Active Critical Alerts", value: "3", icon: AlertTriangle, trend: "+1", trendColor: "text-red-500" },
  { title: "Devices Monitored", value: "1,250", icon: Server, trend: "+50", trendColor: "text-blue-500" },
  { title: "Tenants Active", value: "42", icon: Users, trend: "+2", trendColor: "text-green-500" },
];

const alerts: AlertType[] = [
  { id: "ALT001", device: "Router-NYC-01", message: "High CPU utilization (95%)", severity: "Critical", time: "2 min ago", tenant: "Tenant A" },
  { id: "ALT002", device: "Switch-LAX-05", message: "Interface down (Gig0/1)", severity: "Warning", time: "15 min ago", tenant: "Tenant B" },
  { id: "ALT003", device: "Firewall-DAL-02", message: "New firmware available", severity: "Info", time: "1 hour ago", tenant: "Tenant C" },
  { id: "ALT004", device: "AP-CHI-112", message: "High memory usage (88%)", severity: "Warning", time: "3 hours ago", tenant: "Tenant A" },
  { id: "ALT005", device: "Server-SFO-DB01", message: "Disk space low (15% free)", severity: "Critical", time: "5 hours ago", tenant: "Tenant D" },
];


const SeverityBadge = ({ severity }: { severity: AlertType["severity"] }) => { // Use AlertType["severity"]
  switch (severity.toLowerCase()) {
    case "critical":
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Critical</Badge>;
    case "warning":
      return <Badge variant="warning"><AlertTriangle className="mr-1 h-3 w-3" />Warning</Badge>;
    default: // Info
      return <Badge variant="default"><Info className="mr-1 h-3 w-3" />Info</Badge>;
  }
};

export default function DashboardPage() {
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
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
