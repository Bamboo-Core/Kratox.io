"use client";

import { EditButton } from "./EditButton";
import Image from "next/image";
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from 'react-i18next';

export function BlockedDomainContent({
    customTranslations,
    customIcon,
    customBackgroundColor,
    customTextColor,
    customFooterText,
    isPreview = false,
    previewLang
}: {
    customTranslations?: {
        [key: string]: {
            title?: string;
            subtitle?: string;
            code?: string;
        }
    };
    customIcon?: string;
    customBackgroundColor?: string;
    customTextColor?: string;
    customFooterText?: string;
    isPreview?: boolean;
    previewLang?: string;
}) {
    const isBilling = process.env.NEXT_PUBLIC_BILLING_ACCESS;
    const { t, i18n } = useTranslation();
    const currentLang = previewLang || i18n.language?.split('-')[0] || 'en';
    const getText = (key: 'title' | 'subtitle' | 'code') => {
        const transKey = `accessForbidden.${key}`;

        if (customTranslations?.[currentLang]?.[key]) {
            return customTranslations[currentLang][key];
        }

        if (!isPreview && customTranslations?.['en']?.[key]) {
            return customTranslations['en'][key];
        }

        return t(transKey, { lng: currentLang });
    };

    const titleText = getText('title');
    const subtitleText = getText('subtitle');
    const footerText = customFooterText !== undefined ? customFooterText : "Kratox";

    return (
        <div
            className="flex flex-col h-screen"
            style={customBackgroundColor ? { backgroundColor: customBackgroundColor } : undefined}
        >
            <header
                className="flex justify-end w-full mt-4 px-8 gap-4"
                style={customTextColor ? { color: customTextColor } : undefined}
            >
                {!isPreview && isBilling === 'true' ?
                    <EditButton />
                    : null}
                <LanguageSwitcher />
            </header>
            <main className="flex flex-col items-center justify-center h-full pb-20 gap-6">
                <div className="flex flex-col relative items-center justify-center p-8 bg-white/5 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-sm">
                    {customIcon ? (
                        <img
                            src={customIcon}
                            alt="Icon"
                            className="drop-shadow-lg w-[80px] h-[80px] object-contain"
                        />
                    ) : (
                        <Image
                            src="/icon.png"
                            alt="Icon"
                            width={80}
                            height={80}
                            className="drop-shadow-lg"
                        />
                    )}
                    {footerText && (
                        <p
                            className="text-muted-foreground text-center max-w-md mt-2 break-all"
                            style={customTextColor ? { color: customTextColor } : undefined}
                        >
                            {footerText}
                        </p>
                    )}
                </div>
                <h1
                    className="text-4xl font-bold tracking-tight text-foreground"
                    style={customTextColor ? { color: customTextColor } : undefined}
                >
                    {titleText}
                </h1>
                <p
                    className="text-muted-foreground text-center max-w-md"
                    style={customTextColor ? { color: customTextColor } : undefined}
                >
                    {subtitleText}
                </p>
            </main>
        </div>
    );
}
