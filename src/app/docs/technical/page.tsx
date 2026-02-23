'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/_components/Header';
import Footer from '@/app/_components/Footer';
import FadeIn from '@/app/_components/FadeIn';
import {
    ChevronRight,
    Code,
    Info,
    Download,
    Terminal,
    Clock,
    ShieldCheck,
    AlertTriangle,
    HelpCircle,
    HeadphonesIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
            <h2 className="text-4xl font-bold text-white tracking-tight">{title}</h2>
        </div>
    );
}

function CodeBlock({ language, children }: { language: string; children: string }) {
    return (
        <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-border">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{language}</span>
                <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/70" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <span className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
            </div>
            <pre className="bg-black/60 text-gray-300 text-sm font-mono overflow-x-auto p-6 leading-relaxed whitespace-pre">
                <code>{children}</code>
            </pre>
        </div>
    );
}

function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-sm text-muted-foreground leading-relaxed">
            <Info size={18} className="text-orange-400 mt-0.5 flex-shrink-0" />
            <div>{children}</div>
        </div>
    );
}

function WarningBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-sm text-muted-foreground leading-relaxed">
            <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>{children}</div>
        </div>
    );
}

function StepBadge({ n }: { n: number }) {
    return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex-shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.4)]">
            {n}
        </span>
    );
}

function TroubleshootItem({ q, children }: { q: string; children: React.ReactNode }) {
    return (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <div className="flex items-start gap-3">
                <HelpCircle size={20} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="font-semibold text-white">{q}</p>
            </div>
            <div className="pl-8 text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
        </div>
    );
}

function RichText({ text }: { text: string }) {
    const parts = text.split(/(<bold>.*?<\/bold>|<code>.*?<\/code>)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('<bold>')) {
                    return (
                        <strong key={i} className="text-foreground">
                            {part.replace(/<\/?bold>/g, '')}
                        </strong>
                    );
                }
                if (part.startsWith('<code>')) {
                    return (
                        <code key={i} className="px-1 bg-muted rounded font-mono text-xs text-orange-400">
                            {part.replace(/<\/?code>/g, '')}
                        </code>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

const ALL_SECTION_IDS = ['introduction', 'prerequisites', 'url', 'script', 'test', 'cron', 'troubleshooting', 'support'];

export default function TechnicalDocsPage() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('#introduction');

    const ns = 'technicalDocsPage';

    const NAV_SECTIONS = [
        {
            title: t(`${ns}.nav.overview`),
            items: [
                { title: t(`${ns}.nav.introduction`), href: '#introduction', icon: Info },
                { title: t(`${ns}.nav.prerequisites`), href: '#prerequisites', icon: ShieldCheck },
            ],
        },
        {
            title: t(`${ns}.nav.configuration`),
            items: [
                { title: t(`${ns}.nav.url`), href: '#url', icon: Download },
                { title: t(`${ns}.nav.script`), href: '#script', icon: Terminal },
                { title: t(`${ns}.nav.test`), href: '#test', icon: Code },
                { title: t(`${ns}.nav.cron`), href: '#cron', icon: Clock },
            ],
        },
        {
            title: t(`${ns}.nav.reference`),
            items: [
                { title: t(`${ns}.nav.troubleshooting`), href: '#troubleshooting', icon: AlertTriangle },
                { title: t(`${ns}.nav.support`), href: '#support', icon: HeadphonesIcon },
            ],
        },
    ];

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

    const whyItems = t(`${ns}.intro.whyItems`, { returnObjects: true }) as string[];
    const prereqItems = t(`${ns}.prerequisites.items`, { returnObjects: true }) as Array<{
        title: string; desc: string; badge: string; badgeColor: string;
    }>;
    const scriptSteps = t(`${ns}.script.steps`, { returnObjects: true }) as string[];
    const sc = `${ns}.script.scriptComments`;
    const troubleItems = t(`${ns}.troubleshooting.items`, { returnObjects: true }) as Array<{
        q: string; answers: string[];
    }>;
    const supportItems = t(`${ns}.support.items`, { returnObjects: true }) as string[];
    const readyItems = t(`${ns}.support.readyItems`, { returnObjects: true }) as string[];

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-orange-500/30">
            <Header />

            <main className="flex-1 pt-24 pb-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-12">

                        <aside className="lg:w-72 flex-shrink-0 hidden lg:block">
                            <div className="sticky top-24 space-y-8">
                                <Link
                                    href="/docs/start"
                                    className="flex items-center gap-2 text-muted-foreground hover:text-orange-500 transition-colors mb-8 group"
                                >
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

                                    {NAV_SECTIONS.map((section, idx) => (
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
                                                                'group w-full text-left px-3 py-2 text-sm rounded-xl transition-all duration-200 flex items-center gap-3',
                                                                activeSection === item.href
                                                                    ? 'bg-orange-500/10 text-orange-500 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.2)]'
                                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                                            )}
                                                        >
                                                            <item.icon
                                                                size={16}
                                                                className={cn(
                                                                    'transition-transform duration-200 group-hover:scale-110',
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
                                    <section id="introduction" className="space-y-6 scroll-mt-28">
                                        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                            {t(`${ns}.intro.title`)}
                                        </h1>
                                        <p className="text-xl text-muted-foreground leading-relaxed">
                                            {t(`${ns}.intro.subtitle`)}
                                        </p>

                                        <div className="p-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl space-y-4">
                                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                                <Info className="text-orange-500" />
                                                {t(`${ns}.intro.whyTitle`)}
                                            </h3>
                                            <ul className="space-y-3">
                                                {Array.isArray(whyItems) && whyItems.map((item) => (
                                                    <li key={item} className="flex items-start gap-3 text-muted-foreground">
                                                        <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                            <InfoBox>
                                                <RichText text={t(`${ns}.intro.practice`)} />
                                            </InfoBox>
                                        </div>
                                    </section>

                                    <section
                                        id="prerequisites"
                                        className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30"
                                    >
                                        <SectionHeader
                                            id="prerequisites-heading"
                                            icon={ShieldCheck}
                                            color="text-green-400"
                                            bg="bg-green-500/10"
                                            border="border-green-500/20"
                                            title={t(`${ns}.prerequisites.title`)}
                                        />

                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t(`${ns}.prerequisites.intro`)}
                                        </p>

                                        <div className="grid gap-4">
                                            {Array.isArray(prereqItems) && prereqItems.map((item) => (
                                                <div
                                                    key={item.title}
                                                    className="flex items-start gap-4 p-5 bg-card rounded-2xl border border-border hover:border-muted-foreground/30 transition-colors"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="font-semibold text-white">{item.title}</span>
                                                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', item.badgeColor)}>
                                                                {item.badge}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section id="url" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <SectionHeader
                                            id="url-heading"
                                            icon={Download}
                                            color="text-blue-400"
                                            bg="bg-blue-500/10"
                                            border="border-blue-500/20"
                                            title={t(`${ns}.url.title`)}
                                        />

                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            <RichText text={t(`${ns}.url.desc`)} />
                                        </p>

                                        <InfoBox>{t(`${ns}.url.infoBox`)}</InfoBox>

                                        <CodeBlock language="url">
                                            {`https://studio-uob6.onrender.com/download/YOUR_TOKEN_HERE`}
                                        </CodeBlock>

                                        <p className="text-muted-foreground leading-relaxed">
                                            {t(`${ns}.url.testDesc`)}
                                        </p>

                                        <CodeBlock language={t(`${ns}.url.bashLabel`)}>
                                            {`${t(`${ns}.url.checkComment`)}
curl -I "https://studio-uob6.onrender.com/download/YOUR_TOKEN_HERE"

${t(`${ns}.url.downloadComment`)}
curl -fsSL "https://studio-uob6.onrender.com/download/YOUR_TOKEN_HERE" \\
  -o /tmp/kratox.list`}
                                        </CodeBlock>
                                    </section>

                                    <section id="script" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <SectionHeader
                                            id="script-heading"
                                            icon={Terminal}
                                            color="text-orange-400"
                                            bg="bg-orange-500/10"
                                            border="border-orange-500/20"
                                            title={t(`${ns}.script.title`)}
                                        />

                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            <RichText text={t(`${ns}.script.desc`)} />
                                        </p>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {Array.isArray(scriptSteps) && scriptSteps.map((label, i) => (
                                                <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                                                    <StepBadge n={i + 1} />
                                                    <span className="text-sm text-muted-foreground">{label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">
                                                {t(`${ns}.script.createAt`)}
                                                <code className="ml-2 px-2 py-0.5 bg-muted rounded text-orange-400 font-mono text-xs">
                                                    /usr/local/sbin/kratox-unbound-rpz-update.sh
                                                </code>
                                            </p>
                                        </div>

                                        <CodeBlock language={t(`${ns}.script.bashLabel`)}>
                                            {`#!/usr/bin/env bash
set -euo pipefail

${t(`${sc}.url`)}
URL="https://studio-uob6.onrender.com/download/YOUR_TOKEN_HERE"

${t(`${sc}.dest`)}
DEST_FILE="/etc/unbound/zonefiles/rpz.kratox.zone"
DEST_DIR="/etc/unbound/zonefiles"

UNBOUND_CONF="/etc/unbound/unbound.conf"
SERVICE="unbound"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

${t(`${sc}.ensureDir`)}
install -d -m 0755 "$DEST_DIR"

${t(`${sc}.download`)}
curl -fsSL \\
  --retry 3 \\
  --retry-delay 2 \\
  --retry-connrefused \\
  --connect-timeout 10 \\
  --max-time 60 \\
  "$URL" -o "$TMP"

${t(`${sc}.emptyCheck`)}
if [[ ! -s "$TMP" ]]; then
  echo "${t(`${sc}.emptyMsg`)}" >&2
  exit 1
fi

${t(`${sc}.atomic`)}
install -o root -g root -m 0644 "$TMP" "$DEST_FILE"

${t(`${sc}.validate`)}
unbound-checkconf "$UNBOUND_CONF" >/dev/null

${t(`${sc}.restart`)}
systemctl restart "$SERVICE"`}
                                        </CodeBlock>

                                        <p className="text-muted-foreground">{t(`${ns}.script.permDesc`)}</p>

                                        <CodeBlock language={t(`${ns}.script.permLabel`)}>
                                            {`sudo chmod 0755 /usr/local/sbin/kratox-unbound-rpz-update.sh`}
                                        </CodeBlock>
                                    </section>

                                    <section id="test" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <SectionHeader
                                            id="test-heading"
                                            icon={Code}
                                            color="text-purple-400"
                                            bg="bg-purple-500/10"
                                            border="border-purple-500/20"
                                            title={t(`${ns}.test.title`)}
                                        />

                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            {t(`${ns}.test.desc`)}
                                        </p>

                                        <CodeBlock language={t(`${ns}.test.bashLabel`)}>
                                            {`sudo /usr/local/sbin/kratox-unbound-rpz-update.sh`}
                                        </CodeBlock>

                                        <InfoBox>
                                            {t(`${ns}.test.infoBox`)}{' '}
                                            <code className="ml-1 px-1.5 py-0.5 bg-muted rounded text-orange-400 font-mono text-xs">
                                                ls -lh /etc/unbound/zonefiles/rpz.kratox.zone
                                            </code>
                                        </InfoBox>
                                    </section>

                                    <section id="cron" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <SectionHeader
                                            id="cron-heading"
                                            icon={Clock}
                                            color="text-teal-400"
                                            bg="bg-teal-500/10"
                                            border="border-teal-500/20"
                                            title={t(`${ns}.cron.title`)}
                                        />

                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            <RichText text={t(`${ns}.cron.desc`)} />
                                        </p>

                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">
                                                {t(`${ns}.cron.createAt`)}{' '}
                                                <code className="px-2 py-0.5 bg-muted rounded text-orange-400 font-mono text-xs">
                                                    /etc/cron.d/kratox-unbound-rpz
                                                </code>
                                            </p>
                                        </div>

                                        <CodeBlock language="cron">
                                            {`SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 * * * * root /usr/local/sbin/kratox-unbound-rpz-update.sh`}
                                        </CodeBlock>

                                        <InfoBox>
                                            <RichText text={t(`${ns}.cron.infoBox`)} />
                                        </InfoBox>
                                    </section>

                                    <section
                                        id="troubleshooting"
                                        className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30"
                                    >
                                        <SectionHeader
                                            id="troubleshooting-heading"
                                            icon={AlertTriangle}
                                            color="text-yellow-400"
                                            bg="bg-yellow-500/10"
                                            border="border-yellow-500/20"
                                            title={t(`${ns}.troubleshooting.title`)}
                                        />

                                        <div className="space-y-4">
                                            {Array.isArray(troubleItems) && troubleItems.map((item, idx) => (
                                                <TroubleshootItem key={idx} q={item.q}>
                                                    {item.answers.map((ans, ai) => {
                                                        if (idx === 1 && ai === 0) return (
                                                            <div key={ai}>
                                                                <p>{ans}</p>
                                                                <CodeBlock language="bash">
                                                                    {`ls -l /usr/local/sbin/kratox-unbound-rpz-update.sh`}
                                                                </CodeBlock>
                                                            </div>
                                                        );
                                                        if (idx === 1 && ai === 1) return (
                                                            <div key={ai}>
                                                                <p className="mt-2">{ans}</p>
                                                                <CodeBlock language="bash">
                                                                    {`systemctl status unbound`}
                                                                </CodeBlock>
                                                            </div>
                                                        );
                                                        if (idx === 2 && ai === 0) return (
                                                            <div key={ai}>
                                                                <p><RichText text={ans} /></p>
                                                                <CodeBlock language="bash">
                                                                    {`curl -I "https://studio-uob6.onrender.com/download/YOUR_TOKEN_HERE"\ncurl -v "https://studio-uob6.onrender.com/download/YOUR_TOKEN_HERE"`}
                                                                </CodeBlock>
                                                            </div>
                                                        );
                                                        if (idx === 3 && ai === 0) return (
                                                            <div key={ai}>
                                                                <p>{ans}</p>
                                                                <CodeBlock language="bash">
                                                                    {`sudo unbound-checkconf /etc/unbound/unbound.conf`}
                                                                </CodeBlock>
                                                            </div>
                                                        );
                                                        if (idx === 4) return (
                                                            <WarningBox key={ai}>
                                                                <RichText text={ans} />
                                                            </WarningBox>
                                                        );
                                                        return <p key={ai}><RichText text={ans} /></p>;
                                                    })}
                                                </TroubleshootItem>
                                            ))}
                                        </div>
                                    </section>

                                    <section id="support" className="space-y-8 scroll-mt-32 pt-16 border-t border-border/30">
                                        <SectionHeader
                                            id="support-heading"
                                            icon={HeadphonesIcon}
                                            color="text-pink-400"
                                            bg="bg-pink-500/10"
                                            border="border-pink-500/20"
                                            title={t(`${ns}.support.title`)}
                                        />

                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                            <RichText text={t(`${ns}.support.desc`)} />
                                        </p>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {Array.isArray(supportItems) && supportItems.map((item) => (
                                                <div
                                                    key={item}
                                                    className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border"
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />
                                                    <span className="text-sm text-muted-foreground">{item}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-6 bg-card/50 border border-border/50 rounded-2xl space-y-4">
                                            <h4 className="font-semibold text-white">{t(`${ns}.support.haveReady`)}</h4>
                                            <ul className="space-y-2">
                                                {Array.isArray(readyItems) && readyItems.map((item) => (
                                                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </section>
                                </div>
                                <div className="mt-20 pt-12 border-t border-border flex justify-between">
                                    <Link
                                        href="/docs/start"
                                        className="group flex items-center gap-4 text-muted-foreground hover:text-orange-500 transition-all p-4 rounded-2xl hover:bg-muted/30"
                                    >
                                        <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center group-hover:border-orange-500 group-hover:scale-110 transition-all">
                                            <ChevronRight className="rotate-180" size={18} />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                                {t('common.previous')}
                                            </span>
                                            <span className="font-bold text-white group-hover:text-orange-500 transition-colors uppercase text-sm">
                                                {t('header.nav.startGuide')}
                                            </span>
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
