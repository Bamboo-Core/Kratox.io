
import Image from 'next/image';
import { cn } from '@/lib/utils';
import NOC_AI_ICON from '@/components/layout/assets/NOC-AI-ICON.png';
export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src={NOC_AI_ICON}
      alt="NOC AI Logo"
      width={80}
      height={80}
      className={cn("h-16 w-16 object-contain rounded-sm", className)}
    />
  );
}
