
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListChecks, ShieldBan, ShieldCheck, Router } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/store/auth-store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exactMatch: true },
  { href: '/devices', label: 'Dispositivos', icon: Router },
  { href: '/conditional-rules', label: 'Regras de Automação', icon: ListChecks },
  { href: '/dns-blocking', label: 'Bloqueio DNS', icon: ShieldBan },
];

const adminNavItems = [
    { href: '/admin', label: 'Administração', icon: ShieldCheck },
]

export default function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => {
        const isActive = item.exactMatch ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={{ children: item.label, side: "right", align: "center" }}
                className="w-full justify-start"
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
      {isAdmin && adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton
                        isActive={isActive}
                        tooltip={{ children: item.label, side: "right", align: "center" }}
                        className="w-full justify-start mt-2 border-t pt-2"
                        aria-label={item.label}
                    >
                        <item.icon className="h-5 w-5 shrink-0 text-primary" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
          )
      })}
    </SidebarMenu>
  );
}
