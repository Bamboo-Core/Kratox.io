
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Router } from "lucide-react";

interface DashboardKpiCardsProps {
  alertsBySeverity: Record<string, number>;
  hostsCount: number;
  activeAlertsCount: number;
  severityMap: { [key: string]: { text: string, variant: "destructive" | "warning" | "default" | "secondary" } };
}

export default function DashboardKpiCards({
  alertsBySeverity,
  hostsCount,
  activeAlertsCount,
  severityMap,
}: DashboardKpiCardsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Severidade dos Alertas</CardTitle>
          <CardDescription>Distribuição dos alertas por nível de severidade.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Object.entries(severityMap).reverse().map(([key, { text, variant }]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={variant} className="w-32 justify-center">{text}</Badge>
              </div>
              <span className="font-mono font-bold text-lg text-muted-foreground">
                {alertsBySeverity[key] || 0}
              </span>
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
  );
}
