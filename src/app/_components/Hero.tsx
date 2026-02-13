'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Hero() {
    const { t } = useTranslation();
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl mix-blend-screen animate-pulse" />
                <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-3xl mix-blend-screen" />
            </div>

            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                    {t('hero.titlePart1')} <span className="text-orange-500">DNS</span> {t('hero.titlePart2')} <span className="text-red-500">IP</span> {t('hero.titlePart3')}
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    {t('hero.subtitle')}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                    <Link href="/register">
                        <Button size="lg" className="h-12 px-8 text-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-lg shadow-orange-500/25">
                            {t('hero.startNow')}
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href="#features">
                        <Button variant="outline" size="lg" className="h-12 px-8 text-lg hover:bg-secondary hover:text-foreground">
                            <Activity className="mr-2 h-5 w-5" />
                            {t('hero.howItWorks')}
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
