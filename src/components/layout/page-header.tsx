
"use client";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppLogo } from "./app-logo";
import { UserNav } from "./user-nav";

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode; 
};

export default function PageHeader({ title, children }: PageHeaderProps) {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 shadow-sm backdrop-blur sm:px-6">
      {isMobile && (
        <>
          <SidebarTrigger aria-label="Toggle sidebar" />
          <AppLogo className="h-6 w-6" />
        </>
      )}
      <h1 className="text-xl md:text-2xl font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {children}
        <UserNav />
      </div>
    </header>
  );
}
