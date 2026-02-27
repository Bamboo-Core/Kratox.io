'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/_components/Header';
import Footer from '@/app/_components/Footer';
import FadeIn from '@/app/_components/FadeIn';
import {
    ChevronRight,
    FileText,
    Target,
    Activity,
    UserPlus,
    CreditCard,
    ShieldCheck,
    Lock,
    EyeOff,
    HeartPulse,
    AlertTriangle,
    LifeBuoy,
    RefreshCw,
    XOctagon,
    Mail
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

function FormattedText({ text, inline = false }: { text?: string; inline?: boolean }) {
    if (!text) return null;

    const renderParts = (str: string) => {
        const parts = str.split(/(<bold>.*?<\/bold>)/g);
        return parts.map((part, i) => {
            if (part.startsWith('<bold>')) {
                return <strong key={i} className="text-foreground font-semibold">{part.replace(/<\/?bold>/g, '')}</strong>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    if (inline) {
        return <>{renderParts(text)}</>;
    }

    return (
        <div className="space-y-4">
            {text.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-lg text-muted-foreground leading-relaxed">
                    {renderParts(paragraph)}
                </p>
            ))}
        </div>
    );
}

function SectionHeader({
    id,
    icon: Icon,
    color,
    bg,
    border,
    title,
}: {
    id: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    title: string;
}) {
    return (
        <div id={id} className="flex items-center gap-4 scroll-mt-32">
            <div className={cn('p-3 rounded-2xl border', bg, border)}>
                <Icon size={32} className={color} />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
        </div>
    );
}

const sectionIcons: Record<string, any> = {
    introduction: Target,
    description: Activity,
    registration: UserPlus,
    subscription: CreditCard,
    acceptableUse: ShieldCheck,
    intellectualProperty: Lock,
    privacy: EyeOff,
    availability: HeartPulse,
    limitation: AlertTriangle,
    indemnification: LifeBuoy,
    changes: RefreshCw,
    termination: XOctagon,
    contact: Mail
};

const ALL_SECTION_IDS = Object.keys(sectionIcons);

interface SubSectionData {
    subtitle?: string;
    content?: string;
    list?: string[];
    conclusion?: string;
}

interface SectionData {
    title?: string;
    content?: string;
    list?: string[];
    conclusion?: string;
    subsections?: SubSectionData[];
}

export default function TermsPage() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('#introduction');

    const ns = 'termsPage';

    const sectionsData = t(`${ns}.sections`, { returnObjects: true }) as Record<string, SectionData>;

    // Support for when translations are not yet loaded
    const isReady = typeof sectionsData === 'object' && sectionsData !== null;

    const NAV_SECTIONS = isReady ? [
        {
            title: t(`${ns}.title`),
            items: ALL_SECTION_IDS.map((key) => ({
                title: sectionsData[key]?.title || key,
                href: `#${key}`,
                icon: sectionIcons[key]
            })).filter(item => sectionsData[item.href.replace('#', '')]),
        },
    ] : [];

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0,
        };

        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(`#${entry.target.id}`);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);
        ALL_SECTION_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const el = document.querySelector(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (!isReady) return null;

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-orange-500/30">
            <Header />

            <main className="flex-1 pt-24 pb-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-12">

                        <aside className="lg:w-72 flex-shrink-0 hidden lg:block">
                            <div className="sticky top-24 space-y-8 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8 custom-scrollbar">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2 text-muted-foreground hover:text-orange-500 transition-colors mb-8 group"
                                >
                                    <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center group-hover:border-orange-500 transition-colors">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </div>
                                    <span className="font-medium text-sm">{t('header.nav.home')}</span>
                                </Link>

                                <div className="space-y-6">
                                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-white">
                                        <FileText className="text-orange-500" size={24} />
                                        {t(`${ns}.title`)}
                                    </h3>

                                    {NAV_SECTIONS.map((section, idx) => (
                                        <div key={idx} className="pb-2">
                                            <ul className="space-y-1">
                                                {section.items.map((item) => (
                                                    <li key={item.href}>
                                                        <button
                                                            onClick={() => scrollToSection(item.href)}
                                                            className={cn(
                                                                'group w-full text-left px-3 py-2 text-sm rounded-xl transition-all duration-200 flex items-center gap-3',
                                                                activeSection === item.href
                                                                    ? 'bg-orange-500/10 text-orange-500 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.2)]'
                                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                                            )}
                                                        >
                                                            <item.icon
                                                                size={16}
                                                                className={cn(
                                                                    'transition-transform duration-200 group-hover:scale-110 flex-shrink-0',
                                                                    activeSection === item.href
                                                                        ? 'text-orange-500'
                                                                        : 'text-muted-foreground/50',
                                                                )}
                                                            />
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
                            <div className="flex flex-col gap-2">
                                {NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => scrollToSection(item.href)}
                                        className={cn(
                                            'w-full text-left px-4 py-3 text-sm rounded-xl border transition-all duration-200 flex items-center gap-3',
                                            activeSection === item.href
                                                ? 'bg-orange-500/5 border-orange-500/30 text-orange-500'
                                                : 'bg-card border-border text-muted-foreground',
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
                                    <section className="space-y-6 scroll-mt-28">
                                        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                            {t(`${ns}.title`)}
                                        </h1>
                                        {t(`${ns}.intro`) && (
                                            <p className="text-xl text-muted-foreground leading-relaxed">
                                                {t(`${ns}.intro`)}
                                            </p>
                                        )}
                                        <p className="text-sm text-muted-foreground opacity-70">
                                            {t(`${ns}.lastUpdated`)}
                                        </p>
                                    </section>

                                    {ALL_SECTION_IDS.map((key) => {
                                        const section = sectionsData[key];
                                        if (!section) return null;
                                        const Icon = sectionIcons[key];

                                        return (
                                            <section key={key} id={key} className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                                <SectionHeader
                                                    id={`${key}-heading`}
                                                    icon={Icon}
                                                    color="text-orange-400"
                                                    bg="bg-orange-500/10"
                                                    border="border-orange-500/20"
                                                    title={section.title || ''}
                                                />

                                                {section.content && <FormattedText text={section.content} />}

                                                {section.list && section.list.length > 0 && (
                                                    <ul className="list-disc list-inside space-y-2 text-lg text-muted-foreground ml-4">
                                                        {section.list.map((item, i) => (
                                                            <li key={i}><FormattedText text={item} inline /></li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {section.subsections && section.subsections.length > 0 && (
                                                    <div className="space-y-8 pt-4">
                                                        {section.subsections.map((sub, i) => (
                                                            <div key={i} className="space-y-4">
                                                                {sub.subtitle && (
                                                                    <h3 className="text-2xl font-bold text-white tracking-tight">
                                                                        {sub.subtitle}
                                                                    </h3>
                                                                )}
                                                                {sub.content && <FormattedText text={sub.content} />}
                                                                {sub.list && sub.list.length > 0 && (
                                                                    <ul className="list-disc list-inside space-y-2 text-lg text-muted-foreground ml-4">
                                                                        {sub.list.map((item, j) => (
                                                                            <li key={j}><FormattedText text={item} inline /></li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                                {sub.conclusion && <FormattedText text={sub.conclusion} />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {section.conclusion && <FormattedText text={section.conclusion} />}
                                            </section>
                                        );
                                    })}
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
