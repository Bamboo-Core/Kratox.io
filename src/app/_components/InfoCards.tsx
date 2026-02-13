'use client';

import { CheckCircle2, Server, Globe2, ShieldAlert, Bot } from 'lucide-react';
import FadeIn from './FadeIn';

import { useTranslation } from 'react-i18next';

export default function InfoCards() {
    const { t } = useTranslation();

    const features = [
        {
            icon: <Globe2 className="w-10 h-10 text-orange-500" />,
            title: t('landing.features.dnsBlocking.title'),
            description: t('landing.features.dnsBlocking.desc')
        },
        {
            icon: <Server className="w-10 h-10 text-red-500" />,
            title: t('landing.features.ipFiltering.title'),
            description: t('landing.features.ipFiltering.desc')
        },
        {
            icon: <ShieldAlert className="w-10 h-10 text-orange-500" />,
            title: t('landing.features.compliance.title'),
            description: t('landing.features.compliance.desc')
        },
        {
            icon: <Bot className="w-10 h-10 text-red-500" />,
            title: t('landing.features.audit.title'),
            description: t('landing.features.audit.desc')
        }
    ];

    return (
        <section id="features" className="py-20 bg-muted/30">
            <div className="container mx-auto px-4">
                <FadeIn direction="up">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.features.title')}</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            {t('landing.features.subtitle')}
                        </p>
                    </div>
                </FadeIn>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <FadeIn key={index} delay={index * 100} direction="up" className="h-full">
                            <div
                                className="group h-full p-6 rounded-2xl bg-card border border-border hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 flex flex-col"
                            >
                                <div className="mb-4 p-3 rounded-xl bg-background w-fit group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}
