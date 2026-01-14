// app-logo.tsx
import icon from '@/components/layout/img/icon.png';
import type { LucideProps } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppLogo({ className, style }: LucideProps) {
  return (
    <div className={cn("relative shrink-0", className)} style={style}>
      <Image 
        src={icon} 
        alt="Icon" 
        fill 
        sizes="(max-width: 768px) 24px, 40px"
        priority
        className="object-contain" 
      />
    </div>
  );
}