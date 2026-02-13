'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/_components/Header';
import Footer from '@/app/_components/Footer';
import FadeIn from '@/app/_components/FadeIn';
import { Button } from '@/components/ui/button';
import { ChevronRight, PlayCircle, Shield, Ban, ListChecks, Download, Link as LinkIcon, Info, Sparkles, FileText, Type, PlusCircle, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';

export default function StartGuidePage() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('#welcome');

    const docSections = [
        {
            title: t('common.view'),
            items: [
                { title: t('landing.startGuide.whatIs.title'), href: '#welcome', icon: Info },
                { title: t('landing.startGuide.dnsBlocking.title'), href: '#dns-blocking', icon: Shield },
                { title: t('landing.startGuide.ipBlocking.title'), href: '#ip-filtering', icon: Ban },
            ]
        },
        {
            title: t('header.nav.features'),
            items: [
                { title: t('landing.startGuide.lists.title'), href: '#lists', icon: ListChecks },
                { title: t('landing.startGuide.export.title'), href: '#export', icon: Download },
                { title: t('landing.startGuide.links.title'), href: '#links', icon: LinkIcon },
            ]
        }
    ];

    useEffect(() => {
        const sectionIds = docSections.flatMap(s => s.items.map(i => i.href.replace('#', '')));

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };

        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(`#${entry.target.id}`);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);

        sectionIds.forEach((id: string) => {
            const element = document.getElementById(id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [docSections]);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.querySelector(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-orange-500/30">
            <Header />

            <main className="flex-1 pt-24 pb-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-12">
                        <aside className="lg:w-72 flex-shrink-0 hidden lg:block">
                            <div className="sticky top-24 space-y-8">
                                <div className="space-y-6">
                                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-white">
                                        <PlayCircle className="text-orange-500" size={24} />
                                        {t('header.nav.startGuide')}
                                    </h3>
                                    {docSections.map((section, idx) => (
                                        <div key={idx} className="pb-2">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 pl-2 opacity-70">
                                                {section.title}
                                            </h4>
                                            <ul className="space-y-1">
                                                {section.items.map((item) => (
                                                    <li key={item.href}>
                                                        <button
                                                            onClick={() => scrollToSection(item.href)}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2",
                                                                activeSection === item.href
                                                                    ? "bg-orange-500/10 text-orange-500 font-semibold shadow-sm border border-orange-500/20"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                            )}
                                                        >
                                                            <item.icon size={16} className={activeSection === item.href ? "text-orange-500" : "text-muted-foreground"} />
                                                            {item.title}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        <div className="lg:hidden mb-12">
                            <label className="block text-sm font-medium text-muted-foreground mb-2 px-1">
                                {t('common.search')}
                            </label>
                            <select
                                className="w-full bg-card border border-border rounded-xl p-3 text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                                onChange={(e) => scrollToSection(e.target.value)}
                                value={activeSection}
                            >
                                {docSections.flatMap(s => s.items).map(item => (
                                    <option key={item.href} value={item.href}>{item.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 min-w-0">
                            <FadeIn>
                                <div className="prose prose-invert max-w-none space-y-20">
                                    <section id="welcome" className="space-y-6 scroll-mt-28">
                                        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                            {t('landing.startGuide.title')}
                                        </h1>
                                        <p className="text-xl text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.subtitle')}
                                        </p>
                                        <div className="p-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl">
                                            <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                                                <Info className="text-orange-500" />
                                                {t('landing.startGuide.whatIs.title')}
                                            </h3>
                                            <p className="text-muted-foreground text-lg leading-relaxed">
                                                <Trans i18nKey={t('landing.startGuide.whatIs.desc')} components={{
                                                    span: <span className="text-red-500" />
                                                }} />
                                            </p>
                                        </div>
                                    </section>

                                    <section id="dns-blocking" className="space-y-8 scroll-mt-28 border-t border-border/30 pt-16">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                <Shield size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.dnsBlocking.title')}</h2>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-8 items-center">
                                            <div className="space-y-4">
                                                <p className="text-lg text-muted-foreground leading-relaxed">
                                                    {t('landing.startGuide.dnsBlocking.desc')}
                                                </p>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        { label: t('landing.startGuide.features.pdf'), icon: FileText, color: "text-blue-500" },
                                                        { label: t('landing.startGuide.features.text'), icon: Type, color: "text-purple-500" },
                                                        { label: t('landing.startGuide.features.manual'), icon: PlusCircle, color: "text-green-500" },
                                                        { label: t('landing.startGuide.features.oneClick'), icon: MousePointerClick, color: "text-orange-500" }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                                                            <item.icon className={cn("text-xl w-5 h-5", item.color)} />
                                                            <span className="text-sm font-medium text-gray-300">{item.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-card to-muted/20 rounded-2xl border border-border p-8 shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4">
                                                    <Sparkles className="text-orange-500 animate-pulse" size={24} />
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <div className="h-2 w-2/3 bg-orange-500/20 rounded-full overflow-hidden">
                                                            <div className="h-full w-full bg-orange-500 animate-progress" />
                                                        </div>
                                                        <p className="text-xs text-orange-500 font-mono tracking-tighter uppercase font-bold">{t('landing.startGuide.aiAnalysis.analyzing')}</p>
                                                    </div>
                                                    <div className="p-4 bg-background/50 rounded-xl border border-border/50 space-y-3">
                                                        <p className="text-xs text-muted-foreground italic">{t('dnsBlocking.suggestions.title')}</p>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between p-2 bg-red-500/5 border border-red-500/20 rounded-md">
                                                                <span className="text-xs font-mono text-red-400">evil.com</span>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2 bg-red-500/5 border border-red-500/20 rounded-md">
                                                                <span className="text-xs font-mono text-red-400">malware.net</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section id="ip-filtering" className="space-y-8 scroll-mt-28 border-t border-border/30 pt-16">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                                                <Ban size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.ipBlocking.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed max-w-4xl">
                                            {t('landing.startGuide.ipBlocking.desc')}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[
                                                { title: t('landing.startGuide.ipFeatures.cidr.title'), desc: t('landing.startGuide.ipFeatures.cidr.desc') },
                                                { title: t('landing.startGuide.ipFeatures.ai.title'), desc: t('landing.startGuide.ipFeatures.ai.desc') },
                                                { title: t('landing.startGuide.ipFeatures.sync.title'), desc: t('landing.startGuide.ipFeatures.sync.desc') }
                                            ].map((feature, i) => (
                                                <div key={i} className="bg-card p-5 rounded-xl border border-border hover:bg-muted/30 transition-colors group">
                                                    <h4 className="font-bold text-white mb-1 group-hover:text-orange-500 transition-colors uppercase text-xs tracking-wider">{feature.title}</h4>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section id="lists" className="space-y-8 scroll-mt-28 border-t border-border/30 pt-16">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                                <ListChecks size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.lists.title')}</h2>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500/5 to-transparent p-1 rounded-2xl border border-purple-500/10">
                                            <div className="bg-card/80 p-8 rounded-2xl">
                                                <p className="text-lg text-muted-foreground leading-relaxed">
                                                    {t('landing.startGuide.lists.desc')}
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    <section id="export" className="space-y-8 scroll-mt-28 border-t border-border/30 pt-16">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                <Download size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.export.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            <Trans i18nKey="landing.startGuide.export.desc" components={{
                                                span: <span className="text-red-500" />
                                            }} />
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            {["MikroTik", "Cisco (ACL)", "Juniper", "BIND/RPZ", "Suricata", "Hosts File"].map(format => (
                                                <span key={format} className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-full border border-border">
                                                    {format}
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    <section id="links" className="space-y-8 scroll-mt-28 border-t border-border/30 pt-16">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-green-500/10 text-green-500 border border-green-500/20">
                                                <LinkIcon size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.links.title')}</h2>
                                        </div>
                                        <div className="relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-green-500/5 blur-3xl rounded-full opacity-50 transition-opacity group-hover:opacity-100" />
                                            <div className="relative bg-card/50 p-8 border border-border/50 rounded-2xl">
                                                <p className="text-lg text-muted-foreground leading-relaxed">
                                                    {t('landing.startGuide.links.desc')}
                                                </p>
                                                <div className="mt-8 flex items-center justify-center p-4 bg-muted/50 rounded-xl border border-dashed border-green-500/30">
                                                    <span className="text-green-500 font-mono text-xs md:text-sm break-all">
                                                        https://kratox.io/download/blocklist.txt?token=9e8...c2a&format=mikrotik
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="mt-32 pt-12 border-t border-border flex flex-col sm:flex-row justify-between gap-6">
                                    <Link href="/" className="group flex items-center gap-4 text-muted-foreground hover:text-orange-500 transition-all p-4 rounded-2xl hover:bg-orange-500/5">
                                        <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center group-hover:border-orange-500 transition-colors">
                                            <ChevronRight className="rotate-180" size={20} />
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">{t('common.previous')}</span>
                                            <span className="text-lg font-bold">{t('header.nav.home')}</span>
                                        </div>
                                    </Link>
                                    <Link href="/docs/technical" className="group flex items-center gap-4 text-muted-foreground hover:text-orange-500 transition-all p-4 rounded-2xl hover:bg-orange-500/5 text-right">
                                        <div className="sm:text-right flex-grow">
                                            <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground/60">{t('common.next')}</span>
                                            <span className="text-lg font-bold">{t('header.nav.technicalDocs')}</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center group-hover:border-orange-500 transition-colors">
                                            <ChevronRight size={20} />
                                        </div>
                                    </Link>
                                </div>
                            </FadeIn>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
