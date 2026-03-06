'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

const isServer = typeof window === 'undefined';

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'pt',
        supportedLngs: ['pt', 'en', 'es'],
        load: 'languageOnly',
        debug: process.env.NODE_ENV === 'development',
        interpolation: {
            escapeValue: false,
        },
        backend: {
            loadPath: isServer
                ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/locales/{{lng}}/{{ns}}.json`
                : '/locales/{{lng}}/{{ns}}.json',
        },
        detection: {
            order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
            caches: ['localStorage', 'cookie'],
        },
        react: {
            useSuspense: false,
        }
    });

export default i18n;
