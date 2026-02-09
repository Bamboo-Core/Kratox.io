'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

import { useTranslation } from 'react-i18next';

export default function CTA() {
    const { t } = useTranslation();
    return (
        <section className="py-24 relative overflow-hidden bg-orange-950/10">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                    {t('landing.cta.title')}
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                    {t('landing.cta.subtitle')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/register">
                        <Button size="lg" className="h-14 px-10 text-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-xl shadow-orange-500/20">
                            {t('landing.cta.createAccount')}
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button variant="outline" size="lg" className="h-14 px-10 text-lg bg-background/50 backdrop-blur hover:bg-secondary hover:text-foreground">
                            {t('landing.cta.accessPlatform')}
                            <Send className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
