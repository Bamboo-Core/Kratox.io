'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/language-switcher';

export default function Header() {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navItems = [
        { label: t('header.nav.home'), href: '/' },
        { label: t('header.nav.features'), href: '/#features' },
        { label: t('header.nav.benefits'), href: '/#benefits' },
        {
            label: t('header.nav.resources'),
            href: '/#resources',
            children: [
                { label: t('header.nav.startGuide'), href: '/docs/start' },
                { label: t('header.nav.technicalDocs'), href: '/docs/technical' },
            ]
        },

    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative w-8 h-8">
                        <Image src="/icon.png?v=5" alt="Kratox Logo" fill className="object-contain" />
                    </div>
                    <span className="text-xl font-bold text-white bg-clip-text text-transparent">
                        Kratox.io
                    </span>
                </Link>
                <nav className="hidden md:flex items-center gap-8">
                    {navItems.map((item) => (
                        item.children ? (
                            <div key={item.label} className="relative group">
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-orange-500 transition-colors focus:outline-none data-[state=open]:text-orange-500">
                                        {item.label} <ChevronDown size={14} />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {item.children.map((child) => (
                                            <DropdownMenuItem key={child.label} asChild>
                                                <Link href={child.href} className="w-full cursor-pointer hover:text-orange-500 focus:bg-orange-500 focus:text-white">
                                                    {child.label}
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="text-sm font-medium text-foreground/80 hover:text-orange-500 transition-colors flex items-center gap-2"
                                target={item.label === 'Contato' ? '_blank' : undefined}
                                rel={item.label === 'Contato' ? 'noopener noreferrer' : undefined}
                            >
                                {item.label === 'Contato' && <FaWhatsapp size={16} />}
                                {item.label}
                            </Link>
                        )
                    ))}
                </nav>
                <div className="hidden md:flex items-center gap-4">
                    <LanguageSwitcher />
                    <Link href="/login">
                        <Button variant="ghost" className="hover:bg-secondary hover:text-foreground">
                            {t('header.auth.login')}
                        </Button>
                    </Link>
                    <Link href="/register">
                        <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0">
                            {t('header.auth.createAccount')}
                        </Button>
                    </Link>
                </div>
                <button
                    className="md:hidden p-2 text-foreground/80 hover:text-orange-500"
                    onClick={toggleMenu}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
            {
                isMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border p-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-5">
                        {navItems.map((item) => (
                            item.children ? (
                                <div key={item.label} className="flex flex-col gap-2">
                                    <span className="text-base font-medium text-foreground/80 px-2">{item.label}</span>
                                    <div className="pl-4 flex flex-col gap-2 border-l-2 border-border/50 ml-2">
                                        {item.children.map(child => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className="text-sm text-foreground/70 hover:text-orange-500 py-1"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="text-base font-medium text-foreground/80 hover:text-orange-500 py-2"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            )
                        ))}
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
                            <div className="flex justify-end px-2">
                                <LanguageSwitcher />
                            </div>
                            <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                                <Button variant="outline" className="w-full justify-center">
                                    {t('header.auth.login')}
                                </Button>
                            </Link>
                            <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                                <Button className="w-full justify-center bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                                    {t('header.auth.createAccount')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                )
            }
        </header >
    );
}
