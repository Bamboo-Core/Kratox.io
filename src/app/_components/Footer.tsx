'use client';

import Link from 'next/link';
import Image from 'next/image';

import { useTranslation } from 'react-i18next';

export default function Footer() {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-card border-t border-border pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-8 md:gap-12 mb-12">
                    <div className="col-span-3 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="relative w-8 h-8">
                                <Image src="/icon.png?v=5" alt="Kratox Logo" fill className="object-contain" />
                            </div>
                            <span className="text-xl font-bold text-white bg-clip-text text-transparent">
                                Kratox.io
                            </span>
                        </Link>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto md:mx-0">
                            {t('footer.description')}
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h4 className="font-bold mb-4">{t('footer.platform')}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#features" className="hover:text-orange-400">{t('footer.features')}</Link></li>
                            <li><Link href="#benefits" className="hover:text-orange-400">{t('footer.benefits')}</Link></li>
                        </ul>
                    </div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h4 className="font-bold mb-4">{t('footer.support')}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/docs" className="hover:text-orange-400">{t('footer.documentation')}</Link></li>
                            <li>
                                <a
                                    href="https://wa.me/00000000000"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-orange-400 flex items-center justify-center md:justify-start gap-2"
                                >
                                    {t('footer.contact')}
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h4 className="font-bold mb-4">{t('footer.legal')}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/privacy" className="hover:text-orange-400">{t('footer.privacy')}</Link></li>
                            <li><Link href="/terms" className="hover:text-orange-400">{t('footer.terms')}</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <p>&copy; {currentYear} Kratox.io. {t('footer.rights')}</p>
                </div>
            </div>
        </footer>
    );
}
