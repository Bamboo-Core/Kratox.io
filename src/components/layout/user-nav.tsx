'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth-store';
import { LogOut, User, Settings, CreditCard, FileText, ShieldCheck, MonitorCheck } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function UserNav() {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src="/profile.png"
              className="object-cover"
              alt={user.name}
              data-ai-hint="profile avatar"
            />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <p className="pt-1 text-xs font-semibold leading-none text-orange-500">
              {t('userNav.tenant')}: {user.tenantName}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className="cursor-pointer transition-colors hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
          >
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>{t('userNav.profile')}</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="cursor-pointer transition-colors hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
          >
            <Link href="/licenses">
              <FileText className="mr-2 h-4 w-4" />
              <span>{t('userNav.licenses')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>{t('userNav.billing')}</span>
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('userNav.settings')}</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          {user.role === 'admin' && pathname.startsWith('/dns-blocking') && (
            <DropdownMenuItem
              asChild
              className="cursor-pointer transition-colors hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
            >
              <Link href="/admin">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </Link>
            </DropdownMenuItem>
          )}
          {user.role === 'admin' && pathname.startsWith('/admin') && (
            <DropdownMenuItem
              asChild
              className="cursor-pointer transition-colors hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
            >
              <Link href="/dns-blocking">
                <MonitorCheck className="mr-2 h-4 w-4" />
                <span>DNS Blocking</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer transition-colors hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('userNav.logout')}</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
