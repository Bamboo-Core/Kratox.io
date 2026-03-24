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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { initializeFeatureFlagClient } from '@/services/feature-flag-service-client';

const AUTH_ROUTES = ['/login', '/login/verify', '/register', '/forgot-password', '/forgot-password/verify', '/forgot-password/reset'];
const ADMIN_ROUTES = ['/admin'];
const CLIENT_RESTRICTED_ROUTES = ['/dashboard', '/devices', '/conditional-rules'];
const ADMIN_RESTRICTED_ROUTES = ['/dashboard', '/devices', '/conditional-rules'];

const PUBLIC_ROUTES = ['/', '/blocked-domain', '/edit-page'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
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
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/docs');
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

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
  }, [isAuthenticated, isHydrated, isInitialized, pathname, router, user?.role]);

  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isPublicPage = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/docs');
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
    !isInitialized ||
    (!isAuthenticated && !isAuthPage && !isPublicPage) ||
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

  if (isAuthenticated && !isAuthPage && !isPublicPage) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-1">
          {!pathname.startsWith('/dns-blocking') && !pathname.startsWith('/admin') && !pathname.startsWith('/licenses') && !pathname.startsWith('/profile') && (
            <Sidebar collapsible="icon" className="border-r border-sidebar-border hidden md:flex transition-all duration-300">
              <SidebarRail />
              <SidebarHeader className="p-4 flex flex-row items-center justify-between group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center min-h-[72px]">
                <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
                  <AppLogo className="h-10 w-10 shrink-0" />
                  <h1 className="text-xl font-bold text-white whitespace-nowrap">
                    Kratox
                  </h1>
                </div>
                <div className="hidden group-data-[collapsible=icon]:block animate-in fade-in duration-300">
                  <AppLogo className="h-10 w-10" />
                </div>
                <SidebarTrigger className="hidden md:flex ml-auto group-data-[collapsible=icon]:hidden" />
              </SidebarHeader>
              <SidebarContent className="flex-1 px-2">
                <SidebarNav />
              </SidebarContent>
              <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                {/* Future: User profile / logout */}
                <div className="w-full h-8 bg-sidebar-accent/50 rounded-md animate-pulse group-data-[collapsible=icon]:w-8" />
              </SidebarFooter>
            </Sidebar>
          )}
          <SidebarInset className="flex-1 flex flex-col overflow-y-auto">{children}</SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}