'use client';

import { useTranslation } from 'react-i18next';

export default function AppFooter() {
    const { t } = useTranslation();

    return (
        <footer className="py-6 border-t border-border">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <a href="/docs/start" className="hover:text-orange-400 transition-colors">{t('header.nav.startGuide')}</a>
                <a href="/docs/technical" className="hover:text-orange-400 transition-colors">{t('footer.documentation')}</a>
                <a href="/docs/terms" className="hover:text-orange-400 transition-colors">{t('footer.terms')}</a>
                <a href="/docs/privacy" className="hover:text-orange-400 transition-colors">{t('footer.privacy')}</a>
                <a href="https://wa.me/00000000000" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">{t('footer.contact')}</a>
            </div>
        </footer>
    );
}
