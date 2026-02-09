'use client';

import { Lock, FileWarning, Network } from 'lucide-react';
import Image from 'next/image';
import FadeIn from './FadeIn';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';

export default function WhyImportant() {
    const { t } = useTranslation();
    return (
        <section id="benefits" className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-950/20 pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2">
                        <FadeIn direction="right">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                <Trans i18nKey="landing.whyImportant.title" components={{ span: <span className="text-red-500" /> }} />
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                {t('landing.whyImportant.subtitle')}
                            </p>
                        </FadeIn>

                        <div className="space-y-8">
                            <FadeIn delay={100} direction="right">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                                        <FileWarning size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">{t('landing.whyImportant.legal.title')}</h3>
                                        <p className="text-muted-foreground">
                                            {t('landing.whyImportant.legal.desc')}
                                        </p>
                                    </div>
                                </div>
                            </FadeIn>

                            <FadeIn delay={200} direction="right">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                                        <Lock size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">{t('landing.whyImportant.security.title')}</h3>
                                        <p className="text-muted-foreground">
                                            {t('landing.whyImportant.security.desc')}
                                        </p>
                                    </div>
                                </div>
                            </FadeIn>

                            <FadeIn delay={300} direction="right">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                        <Network size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">{t('landing.whyImportant.integrity.title')}</h3>
                                        <p className="text-muted-foreground">
                                            {t('landing.whyImportant.integrity.desc')}
                                        </p>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
                    </div>

                    <div className="lg:w-1/2 w-full">
                        <FadeIn direction="left" delay={200}>
                            <div className="relative rounded-2xl bg-card border border-border p-2 shadow-2xl">
                                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl blur opacity-20" />
                                <div className="relative bg-background rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-border/50">
                                    <Image src="/image-lp.png?v=5" alt="Kratox Logo" fill className="object-contain" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </div>
        </section>
    );
}
