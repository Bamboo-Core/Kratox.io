
"use client";

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { ZabbixHistoryPoint } from '@/hooks/useZabbix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MetricChartProps {
  itemName: string;
  itemUnits: string;
  historyData: ZabbixHistoryPoint[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const formatNumber = (num: number, units: string) => {
    if (units.toLowerCase().includes('bps')) {
        const tiers = [
            { value: 1e9, symbol: " Gbps" },
            { value: 1e6, symbol: " Mbps" },
            { value: 1e3, symbol: " kbps" },
        ];
        const tier = tiers.find(t => num >= t.value);
        if (tier) {
            return (num / tier.value).toFixed(2) + tier.symbol;
        }
    }
    return `${num.toLocaleString()} ${units}`;
};


export default function MetricChart({ itemName, itemUnits, historyData, isLoading, isError, error }: MetricChartProps) {
  
  const chartData = useMemo(() => {
    return historyData?.map(point => ({
      ...point,
      // Convert Unix timestamp (seconds) to milliseconds for Date object
      timestamp: parseInt(point.clock, 10) * 1000,
      value: parseFloat(point.value),
    })) || [];
  }, [historyData]);

  const yAxisFormatter = (value: number) => {
    if (itemUnits.toLowerCase().includes('bps')) {
        const tiers = [
            { value: 1e9, symbol: "G" },
            { value: 1e6, symbol: "M" },
            { value: 1e3, symbol: "k" },
        ];
        const tier = tiers.find(t => value >= t.value);
         if (tier) {
            return `${(value / tier.value).toFixed(1)}${tier.symbol}`;
        }
    }
    return value.toLocaleString();
  }


  return (
    <Card className="shadow-lg mt-4">
        <CardHeader>
            <CardTitle>Histórico da Métrica: {itemName}</CardTitle>
            <CardDescription>Visualização dos dados coletados nas últimas 24 horas.</CardDescription>
        </CardHeader>
        <CardContent className="h-96">
            {isLoading && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mr-4" />
                    Carregando dados do gráfico...
                </div>
            )}
            {isError && !isLoading && (
                 <div className="flex items-center justify-center h-full">
                    <Alert variant="destructive" className="w-auto">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Falha ao Carregar Dados do Gráfico</AlertTitle>
                        <AlertDescription>{error?.message || "Ocorreu um erro desconhecido."}</AlertDescription>
                    </Alert>
                </div>
            )}
            {!isLoading && !isError && chartData.length > 0 && (
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm')}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                    />
                    <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickFormatter={yAxisFormatter}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))'
                        }}
                        labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy HH:mm:ss')}
                        formatter={(value: number) => [formatNumber(value, itemUnits), itemName]}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="value"
                        name={itemUnits || "Valor"}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 8 }}
                    />
                    </LineChart>
                </ResponsiveContainer>
            )}
             {!isLoading && !isError && chartData.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum dado histórico encontrado para esta métrica no período selecionado.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
