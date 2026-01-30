'use client';

import { useEffect, useState } from 'react';
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
import { initializeFeatureFlagClient } from '@/services/feature-flag-service-client';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/forgot-password/verify', '/forgot-password/reset'];
const ADMIN_ROUTES = ['/admin']; 
const CLIENT_RESTRICTED_ROUTES = ['/dashboard', '/devices', '/conditional-rules']; 
const ADMIN_RESTRICTED_ROUTES = ['/dashboard', '/devices', '/conditional-rules']; 

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const [isHydrated, setIsHydrated] = useState(false);

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
    setIsHydrated(useAuthStore.persist.hasHydrated());

    const unsub = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login');
      return;
    }

    {
    }

    if (isAuthenticated && isAuthRoute) {
      router.replace('/dns-blocking');
      return;
    }

    if (isAuthenticated && isAdminRoute && user?.role !== 'admin') {
      router.replace('/dns-blocking');
      return;
    }

    const isRestrictedForClient = CLIENT_RESTRICTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isAuthenticated && pathname.startsWith('/dashboard')) {
      router.replace('/dns-blocking');
      return;
    }
    if (isAuthenticated && pathname.startsWith('/devices')) {
      router.replace('/dns-blocking');
      return;
    }
    if (isAuthenticated && pathname.startsWith('/conditional-rules')) {
      router.replace('/dns-blocking');
      return;
    }

    if (isAuthenticated && isRestrictedForClient && user?.role === 'cliente') {
      router.replace('/dns-blocking');
      return;
    }

    const isRestrictedForAdmin = ADMIN_RESTRICTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isAuthenticated && isRestrictedForAdmin && user?.role === 'admin') {
      router.replace('/admin');
      return;
    }
  }, [isAuthenticated, isHydrated, pathname, router, user?.role]);

  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isAdminPageWithoutPerms =
    ADMIN_ROUTES.some((route) => pathname.startsWith(route)) && user?.role !== 'admin';
  const isClientRestrictedPage =
    CLIENT_RESTRICTED_ROUTES.some((route) => pathname.startsWith(route)) &&
    user?.role === 'cliente';
  const isAdminRestrictedPage =
    ADMIN_RESTRICTED_ROUTES.some((route) => pathname.startsWith(route)) &&
    user?.role === 'admin';

  if (
    !isHydrated ||
    (!isAuthenticated && !isAuthPage) ||
    (isAuthenticated && isAdminPageWithoutPerms) ||
    (isAuthenticated && isClientRestrictedPage) ||
    (isAuthenticated && isAdminRestrictedPage)
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (isAuthenticated && !isAuthPage) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border hidden md:flex">
            <SidebarRail />
            <SidebarHeader className="p-4 flex items-center transition-all duration-300 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
              <AppLogo className="h-12 w-12 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 transition-all duration-300" />
              <h1 className="text-xl font-semibold text-white group-data-[collapsible=icon]:hidden overflow-hidden whitespace-nowrap">
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

  return <>{children}</>;
}