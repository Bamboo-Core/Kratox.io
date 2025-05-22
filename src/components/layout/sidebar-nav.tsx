
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TerminalSquare, ListChecks, Sparkles } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exactMatch: true },
  { href: '/command-execution', label: 'Commands', icon: TerminalSquare },
  { href: '/conditional-rules', label: 'Rules Engine', icon: ListChecks },
  { href: '/ai-suggestions', label: 'AI Suggestions', icon: Sparkles },
];

export default function SidebarNav() {
  const pathname = usePathname();

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
    </SidebarMenu>
  );
}
