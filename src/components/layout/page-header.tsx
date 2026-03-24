'use client';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { AppLogo } from './app-logo';
import { UserNav } from './user-nav';
import LanguageSwitcher from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export default function PageHeader({ title, children }: PageHeaderProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const isRootPage = pathname === '/dashboard' || pathname === '/dns-blocking' || pathname === '/admin';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/95 py-3 px-4 shadow-sm backdrop-blur sm:px-6 h-16">
      <div className="flex items-center gap-3">
        {!isRootPage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (pathname === '/profile') {
                router.push('/dns-blocking');
              } else {
                router.back();
              }
            }}
            aria-label="Voltar"
            className="h-8 w-8 hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        {(pathname.startsWith('/dns-blocking') || pathname.startsWith('/admin') || (isMobile && !pathname.startsWith('/licenses') && !pathname.startsWith('/profile'))) && (
          <AppLogo className="h-9 w-9" />
        )}

        <h1 className={cn(
          "font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis tracking-tight ml-1",
          pathname.startsWith('/dns-blocking') || pathname.startsWith('/admin') ? "text-lg md:text-xl" : "text-xl md:text-2xl"
        )}>
          {title}
        </h1>
      </div>
      <div className="ml-auto flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
        {children}
        <div className="hidden sm:flex items-center gap-2">
          <LanguageSwitcher />
          <UserNav />
        </div>
      </div>
      {isMobile && (
        <div className="absolute top-2 right-2 sm:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <UserNav />
        </div>
      )}
    </header>
  );
}
