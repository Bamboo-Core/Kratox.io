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

/**
 * Formats a phone number string to Brazilian format: +55 (DD) 99999-9999
 * @param value Raw string from input
 * @returns Formatted string
 */
export function formatPhone(value: string): string {
  if (!value) return '';
  
  // Strip the mask prefix if it exists to avoid re-processing it as part of the number
  let input = value;
  if (input.startsWith('+55')) {
    input = input.substring(3);
  }
  
  // Remove all non-digits
  let digits = input.replace(/\D/g, '');
  
  // If the user pasted a full number with country code (e.g., 5551999999999)
  // we strip the 55 if it's followed by a full 10 or 11 digit number.
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.substring(2);
  }
  
  // Limit to 11 digits (2 for DDD + 9 for number)
  digits = digits.substring(0, 11);
  
  if (digits.length === 0) {
    // If the original value started with +55 and we stripped it, return empty if no digits left
    return '';
  }
  
  if (digits.length <= 2) return `+55 (${digits}`;
  if (digits.length <= 6) return `+55 (${digits.substring(0, 2)}) ${digits.substring(2)}`;
  if (digits.length <= 10) return `+55 (${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  return `+55 (${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
}

/**
 * Removes all non-digits from a phone number string
 */
export function stripPhone(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}
