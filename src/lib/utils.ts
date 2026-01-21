import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const severityMap: {
  [key: string]: {
    variant: 'destructive' | 'warning' | 'default' | 'secondary' | 'orange' | 'yellow';
    text: string;
    level: number;
  };
} = {
  '5': { variant: 'destructive', text: 'Disaster', level: 5 },
  '4': { variant: 'destructive', text: 'High', level: 4 },
  '3': { variant: 'orange', text: 'Average', level: 3 },
  '2': { variant: 'yellow', text: 'Warning', level: 2 },
  '1': { variant: 'secondary', text: 'Information', level: 1 },
  '0': { variant: 'secondary', text: 'Not Classified', level: 0 },
};
