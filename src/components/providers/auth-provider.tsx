
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
  SidebarRail,
} from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { initializeFeatureFlagClient } from '@/services/feature-flag-service-client'; // New Import

const AUTH_ROUTES = ['/login']; // Publicly accessible routes
const ADMIN_ROUTES = ['/admin']; // Admin-only routes

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Initialize Split.io client SDK on auth state change
  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      const splitKey = process.env.NEXT_PUBLIC_SPLIT_CLIENT_SDK_KEY;
      if (splitKey) {
        initializeFeatureFlagClient(splitKey, user.tenantId);
      } else {
        console.error(
          'Split.io client-side SDK key is not defined. Feature flags will not work on the client.'
        );
      }
    }
  }, [isAuthenticated, user?.tenantId]);

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is loaded

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

    // Redirect to login if not authenticated and not on a public route
    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login');
      return;
    }

    // Redirect to dashboard if authenticated and on a login page
    if (isAuthenticated && isAuthRoute) {
      router.replace('/dashboard');
      return;
    }

    // Redirect to dashboard if trying to access admin route without admin role
    if (isAuthenticated && isAdminRoute && user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router, user?.role]);

  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isAdminPageWithoutPerms =
    ADMIN_ROUTES.some((route) => pathname.startsWith(route)) && user?.role !== 'admin';

  // Show a loader during initial auth check or if redirecting
  if (isLoading || (!isAuthenticated && !isAuthPage) || (isAuthenticated && isAdminPageWithoutPerms)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If authenticated and not on a login page, show the main app layout
  if (isAuthenticated && !isAuthPage) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border hidden md:flex">
            <SidebarRail />
            <SidebarHeader className="p-4 flex items-center gap-2 justify-center group-data-[collapsible=icon]:justify-start">
              <AppLogo />
              <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden whitespace-nowrap">
                NOC AI
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
