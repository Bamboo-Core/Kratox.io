'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import { AppLogo } from '@/components/layout/app-logo';

const AUTH_ROUTES = ['/login']; // Publicly accessible routes

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is loaded

    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login');
    } else if (isAuthenticated && isAuthRoute) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || (!isAuthenticated && !AUTH_ROUTES.includes(pathname))) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If authenticated and not on a login page, show the main app layout
  if (isAuthenticated && !AUTH_ROUTES.includes(pathname)) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border hidden md:flex">
            <SidebarHeader className="p-4 flex items-center gap-2 justify-center group-data-[collapsible=icon]:justify-start">
              <AppLogo />
              <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden whitespace-nowrap">
                NetGuard AI
              </h1>
            </SidebarHeader>
            <SidebarContent className="flex-1">
              <SidebarNav />
            </SidebarContent>
            <SidebarFooter className="p-2">{/* Future: User profile / logout */}</SidebarFooter>
          </Sidebar>
          <SidebarInset className="flex-1 flex flex-col overflow-y-auto">{children}</SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Otherwise, render the children (e.g., the login page) without the main layout
  return <>{children}</>;
}
