'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/_components/Header';
import Footer from '@/app/_components/Footer';
import FadeIn from '@/app/_components/FadeIn';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, Server, Shield, Code, Database, Globe, Cpu, Terminal, Lock, Sparkles, PlusCircle, Download, Link as LinkIcon } from 'lucide-react';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function TechnicalDocsPage() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('#introduction');

    const docSections = [
        {
            title: t('landing.startGuide.technicalDocs.blockingMethods.title'),
            items: [
                { title: t('landing.startGuide.technicalDocs.aiAnalysis.title'), href: '#ai-analysis', icon: Sparkles },
                { title: t('landing.startGuide.technicalDocs.manual.title'), href: '#manual', icon: PlusCircle },
                { title: t('landing.startGuide.technicalDocs.feeds.title'), href: '#feeds', icon: Shield },
            ]
        },
        {
            title: t('landing.startGuide.technicalDocs.integrations.title'),
            items: [
                { title: t('landing.startGuide.technicalDocs.export.title'), href: '#export', icon: Download },
                { title: t('landing.startGuide.technicalDocs.links.title'), href: '#links', icon: LinkIcon },
                { title: t('landing.startGuide.technicalDocs.integrations.title'), href: '#integrations', icon: Terminal },
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
        sectionIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
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
                                <Link href="/docs/start" className="flex items-center gap-2 text-muted-foreground hover:text-orange-500 transition-colors mb-8 group">
                                    <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center group-hover:border-orange-500 transition-colors">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </div>
                                    <span className="font-medium text-sm">{t('header.nav.startGuide')}</span>
                                </Link>

                                <div className="space-y-6">
                                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-white">
                                        <Code className="text-orange-500" size={24} />
                                        {t('header.nav.technicalDocs')}
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
                                                                "group w-full text-left px-3 py-2 text-sm rounded-xl transition-all duration-200 flex items-center gap-3",
                                                                activeSection === item.href
                                                                    ? "bg-orange-500/10 text-orange-500 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.2)]"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                            )}
                                                        >
                                                            <item.icon size={16} className={cn(
                                                                "transition-transform duration-200 group-hover:scale-110",
                                                                activeSection === item.href ? "text-orange-500" : "text-muted-foreground/50"
                                                            )} />
                                                            <span className="truncate">{item.title}</span>
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
                            <div className="flex flex-col gap-2">
                                {docSections.flatMap(s => s.items).map(item => (
                                    <button
                                        key={item.href}
                                        onClick={() => scrollToSection(item.href)}
                                        className={cn(
                                            "w-full text-left px-4 py-3 text-sm rounded-xl border transition-all duration-200 flex items-center gap-3",
                                            activeSection === item.href
                                                ? "bg-orange-500/5 border-orange-500/30 text-orange-500"
                                                : "bg-card border-border text-muted-foreground"
                                        )}
                                    >
                                        <item.icon size={16} />
                                        {item.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <FadeIn>
                                <div className="prose prose-invert max-w-none space-y-20">
                                    <section id="introduction" className="space-y-6 scroll-mt-28">
                                        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                            {t('landing.startGuide.technicalDocs.title')}
                                        </h1>
                                        <p className="text-xl text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.technicalDocs.subtitle')}
                                        </p>
                                    </section>

                                    <section id="ai-analysis" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                <Sparkles size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.technicalDocs.aiAnalysis.title')}</h2>
                                        </div>
                                        <div className="space-y-6">
                                            <p className="text-lg text-muted-foreground leading-relaxed">
                                                {t('landing.startGuide.technicalDocs.aiAnalysis.desc')}
                                            </p>
                                            <div className="grid md:grid-cols-3 gap-4 auto-rows-fr">
                                                {['step1', 'step2', 'step3'].map((step, i) => (
                                                    <div key={step} className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-3">
                                                        <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">{i + 1}</span>
                                                        <p className="text-sm text-muted-foreground font-medium">
                                                            {t(`landing.startGuide.technicalDocs.aiAnalysis.${step}`)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    <section id="manual" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                                                <PlusCircle size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.technicalDocs.manual.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.technicalDocs.manual.desc')}
                                        </p>
                                    </section>

                                    <section id="feeds" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                <Shield size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.technicalDocs.feeds.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.technicalDocs.feeds.desc')}
                                        </p>
                                    </section>

                                    <section id="export" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-green-500/10 text-green-500 border border-green-500/20">
                                                <Download size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.technicalDocs.export.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.technicalDocs.export.desc')}
                                        </p>
                                    </section>

                                    <section id="links" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                                <LinkIcon size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.technicalDocs.links.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.technicalDocs.links.desc')}
                                        </p>
                                    </section>

                                    <section id="integrations" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-gray-500/10 text-gray-500 border border-gray-500/20">
                                                <Terminal size={32} />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.startGuide.technicalDocs.integrations.title')}</h2>
                                        </div>
                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t('landing.startGuide.technicalDocs.integrations.desc')}
                                        </p>

                                        <div className="grid gap-6">
                                            <div className="bg-black/40 rounded-2xl p-6 border border-border">
                                                <h4 className="text-orange-500 font-bold mb-4">{t('landing.startGuide.technicalDocs.integrations.mikrotik')}</h4>
                                                <div className="font-mono text-sm overflow-x-auto">
                                                    <p className="text-muted-foreground mb-2">{t('landing.startGuide.technicalDocs.codeComments.mikrotik')}</p>
                                                    <p className="text-gray-400">/tool fetch url=&quot;https://api.kratox.io/download/mikrotik?token=YOUR_TOKEN&quot; \</p>
                                                    <p className="text-gray-400 ml-4">dst-path=&quot;kratox_block.rsc&quot;</p>
                                                    <p className="text-gray-400">/import kratox_block.rsc</p>
                                                </div>
                                            </div>

                                            <div className="bg-black/40 rounded-2xl p-6 border border-border">
                                                <h4 className="text-green-500 font-bold mb-4">{t('landing.startGuide.technicalDocs.integrations.bind')}</h4>
                                                <div className="font-mono text-sm overflow-x-auto">
                                                    <p className="text-muted-foreground mb-2">{t('landing.startGuide.technicalDocs.codeComments.rpz')}</p>
                                                    <p className="text-gray-400">zone &quot;rpz.kratox.io&quot; &#123;</p>
                                                    <p className="text-gray-400 ml-4">type slave;</p>
                                                    <p className="text-gray-400 ml-4">file &quot;/var/cache/bind/db.rpz.kratox&quot;;</p>
                                                    <p className="text-gray-400 ml-4 text-orange-400">masters &#123; 185.122.x.x; &#125;;</p>
                                                    <p className="text-gray-400">&#125;;</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="mt-20 pt-12 border-t border-border flex justify-between">
                                    <Link href="/docs/start" className="group flex items-center gap-4 text-muted-foreground hover:text-orange-500 transition-all p-4 rounded-2xl hover:bg-muted/30">
                                        <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center group-hover:border-orange-500 group-hover:scale-110 transition-all">
                                            <ChevronRight className="rotate-180" size={18} />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t('common.previous')}</span>
                                            <span className="font-bold text-white group-hover:text-orange-500 transition-colors uppercase text-sm">{t('header.nav.startGuide')}</span>
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
