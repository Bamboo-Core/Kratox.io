
"use client";

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ZabbixHostGroup, ZabbixHost } from '@/hooks/useZabbix';

interface DashboardFiltersProps {
  isAdmin: boolean;
  hosts: ZabbixHost[];
  hostGroups: ZabbixHostGroup[];
  isLoadingHostGroups: boolean;
  hostGroupFilter: string;
  setHostGroupFilter: (value: string) => void;
  hostFilter: string;
  setHostFilter: (value: string) => void;
  severityFilter: string;
  setSeverityFilter: (value: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  severityMap: { [key: string]: { variant: string; text: string; level: number } };
}

export default function DashboardFilters({
  isAdmin,
  hosts,
  hostGroups,
  isLoadingHostGroups,
  hostGroupFilter,
  setHostGroupFilter,
  hostFilter,
  setHostFilter,
  severityFilter,
  setSeverityFilter,
  dateRange,
  setDateRange,
  severityMap,
}: DashboardFiltersProps) {
    const [datePreset, setDatePreset] = useState<string>('7days');

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

    return (
        <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
            {isAdmin && (
                <Select onValueChange={setHostGroupFilter} value={hostGroupFilter} disabled={isLoadingHostGroups}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
             <Select onValueChange={setHostFilter} value={hostFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar Host" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Hosts</SelectItem>
                    {hosts.map((host) => (
                        <SelectItem key={host.hostid} value={host.hostid}>{host.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={setSeverityFilter} value={severityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar Severidade" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as Severidades</SelectItem>
                    {Object.entries(severityMap).reverse().map(([key, { text }]) => (
                        <SelectItem key={key} value={key}>{text}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={handleDatePresetChange} value={datePreset}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                        className={cn('w-full sm:w-[240px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
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
    );
}
