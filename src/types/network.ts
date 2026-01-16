// src/types/network.ts

import type { LucideIcon } from 'lucide-react';

export interface KPI {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  trendColor: string;
}

export interface Alert {
  id: string;
  device: string;
  message: string;
  severity: 'Critical' | 'Warning' | 'Info'; // More specific type
  time: string;
  tenant: string;
}
