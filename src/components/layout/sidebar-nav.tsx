'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, ShieldBan, ShieldCheck } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { useAuthStore } from '@/store/auth-store';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dns-blocking', label: 'sidebar.dnsBlocking', icon: ShieldBan, roles: ['admin', 'cliente'] },
  { href: '/licenses', label: 'userNav.licenses', icon: ListChecks, roles: ['admin', 'cliente'] },
];

const adminNavItems = [{ href: '/admin', label: 'sidebar.administration', icon: ShieldCheck }];

export default function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const role = user?.role;
  const { t } = useTranslation();

  const navItemsFiltered = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="space-y-4">
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/50 px-2 font-bold mb-2">
          {t('footer.platform')}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItemsFiltered.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={t(item.label)}
                      className={cn(
                        "w-full transition-all duration-200",
                        isActive ? "bg-orange-500 text-white hover:bg-orange-600" : "hover:bg-orange-500/10 hover:text-orange-500"
                      )}
                      aria-label={t(item.label)}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-muted-foreground group-hover:text-orange-500")} />
                      <span className="font-medium">{t(item.label)}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/50 px-2 font-bold mb-2">
            {t('sidebar.administration')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={t(item.label)}
                        className={cn(
                          "w-full transition-all duration-200",
                          isActive ? "bg-orange-500 text-white hover:bg-orange-600" : "hover:bg-orange-500/10 hover:text-orange-500 text-orange-500 font-bold"
                        )}
                        aria-label={t(item.label)}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-orange-500")} />
                        <span className="font-semibold">{t(item.label)}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </div>
  );
}