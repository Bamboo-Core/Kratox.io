'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, ShieldBan, ShieldCheck, Router } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuthStore } from '@/store/auth-store';
import { useTranslation } from 'react-i18next';

{
  /*
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exactMatch: true },
  { href: '/devices', label: 'Dispositivos', icon: Router },
  { href: '/conditional-rules', label: 'Regras de Automação', icon: ListChecks },
  { href: '/dns-blocking', label: 'Bloqueio DNS', icon: ShieldBan, adminOnly: false },
]; 
*/
}

const navItems = [
  { href: '/dns-blocking', label: 'sidebar.dnsBlocking', icon: ShieldBan, roles: ['admin', 'cliente'] },
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
    <SidebarMenu className="p-2">
      {navItemsFiltered.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={{ children: t(item.label), side: 'right', align: 'center' }}
                className="w-full justify-start"
                aria-label={t(item.label)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{t(item.label)}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
      {isAdmin &&
        adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={{ children: t(item.label), side: 'right', align: 'center' }}
                  className="w-full justify-start mt-2 border-t pt-2"
                  aria-label={t(item.label)}
                >
                  <item.icon className="h-5 w-5 shrink-0 text-orange-500" />
                  <span className="group-data-[collapsible=icon]:hidden">{t(item.label)}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
    </SidebarMenu>
  );
}