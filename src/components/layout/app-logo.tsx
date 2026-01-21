import type { HTMLAttributes } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppLogo({ className, style }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative shrink-0', className)} style={style}>
      <Image
        src="/icon.png"
        alt="Icon"
        fill
        sizes="(max-width: 768px) 24px, 40px"
        priority
        className="object-contain"
      />
    </div>
  );
}