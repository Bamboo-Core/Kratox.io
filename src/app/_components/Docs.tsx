'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Code2, Terminal } from 'lucide-react';
import FadeIn from './FadeIn';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';

export default function Docs() {
    const { t } = useTranslation();
    return (
        <section id="docs" className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 text-center">
                <FadeIn direction="up">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('landing.docs.title')}</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
                        <Trans i18nKey="landing.docs.subtitle" components={{ span: <span className="text-red-500 font-bold" /> }} />
                    </p>
                </FadeIn>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    <FadeIn delay={0} direction="up" className="h-full">
                        <div className="bg-card p-8 rounded-2xl border border-border hover:border-gray-500 transition-colors flex flex-col items-center h-full">
                            <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6">
                                <BookOpen size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{t('landing.docs.startGuide.title')}</h3>
                            <p className="text-muted-foreground text-sm mb-6 flex-grow">
                                {t('landing.docs.startGuide.desc')}
                            </p>
                            <Link href="/docs/start" className="w-full mt-auto">
                                <Button variant="outline" className="w-full bg-background/50 backdrop-blur hover:bg-secondary hover:text-foreground">{t('landing.docs.startGuide.button')}</Button>
                            </Link>
                        </div>
                    </FadeIn>

                    <FadeIn delay={100} direction="up" className="h-full">
                        <div className="bg-card p-8 rounded-2xl border border-border hover:border-gray-500 transition-colors flex flex-col items-center h-full text-center">
                            <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                                <Terminal size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{t('landing.docs.techDocs.title')}</h3>
                            <p className="text-muted-foreground text-sm mb-6 flex-grow">
                                {t('landing.docs.techDocs.desc')}
                            </p>
                            <Link href="/docs/technical" className="w-full mt-auto">
                                <Button variant="outline" className="w-full bg-background/50 backdrop-blur hover:bg-secondary hover:text-foreground">{t('landing.docs.techDocs.button')}</Button>
                            </Link>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}
