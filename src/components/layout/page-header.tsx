'use client';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { AppLogo } from './app-logo';
import { UserNav } from './user-nav';
import LanguageSwitcher from '@/components/language-switcher';

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export default function PageHeader({ title, children }: PageHeaderProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/95 py-4 px-4 shadow-sm backdrop-blur sm:px-6">
      <div className="flex items-center gap-4">
        {!pathname.startsWith('/dns-blocking') && (
          <SidebarTrigger aria-label="Toggle sidebar" className="hidden md:flex" />
        )}
        {isMobile && !pathname.startsWith('/dns-blocking') && (
          <>
            <SidebarTrigger aria-label="Toggle sidebar" />
            <AppLogo className="h-10 w-10" />
          </>
        )}
        <h1 className="text-xl md:text-2xl font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
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
