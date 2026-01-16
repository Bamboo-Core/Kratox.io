'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Router } from 'lucide-react';

interface DashboardKpiCardsProps {
  alertsBySeverity: Record<string, number>;
  hostsCount: number;
  activeAlertsCount: number;
  severityMap: {
    [key: string]: {
      text: string;
      variant: 'destructive' | 'warning' | 'default' | 'secondary' | 'orange' | 'yellow';
      level: number;
    };
  };
}

export default function DashboardKpiCards({
  alertsBySeverity,
  hostsCount,
  activeAlertsCount,
  severityMap,
}: DashboardKpiCardsProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 lg:col-span-2">
        <CardHeader>
          <CardTitle>Severidade dos Alertas</CardTitle>
          <CardDescription>
            Distribuição dos alertas por nível de severidade no período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(severityMap)
            .reverse()
            .map(([key, { text, variant }]) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={variant} className="w-32 justify-center">
                    {text}
                  </Badge>
                </div>
                <span className="font-mono font-bold text-lg text-foreground">
                  {alertsBySeverity[key] || 0}
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 lg:col-span-1">
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>Resumo dos dados atuais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center">
            <Router className="h-8 w-8 text-orange-500 mr-4" />
            <div>
              <div className="text-3xl font-bold">{hostsCount}</div>
              <p className="text-xs text-muted-foreground">Hosts Monitorados</p>
            </div>
          </div>
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-orange-500 mr-4" />
            <div>
              <div className="text-3xl font-bold">{activeAlertsCount}</div>
              <p className="text-xs text-muted-foreground">Alertas no Período</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
