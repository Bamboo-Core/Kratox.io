'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Loader2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import Link from 'next/link';
import FadeIn from './FadeIn';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

export default function Contact() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        message: ''
    });

    const validateContent = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(com|net|org|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum|br|io|co|uk|xyz|tech|online|site|app|dev))\b/i;
        const fileRegex = /\b[\w-]+\.(zip|rar|7z|exe|dll|bin|iso|dmg|tar|gz|pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|bmp|svg|mp4|mp3|wav|avi|bat|sh|cmd|vbs)\b/i;

        if (urlRegex.test(content)) {
            return { valid: false, errorKey: 'landing.contact.form.errors.linksNotAllowed' };
        }
        if (fileRegex.test(content)) {
            return { valid: false, errorKey: 'landing.contact.form.errors.filesNotAllowed' };
        }
        return { valid: true };
    };

    const extractEmailInfo = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, errorKey: 'landing.contact.form.errors.invalidEmailFormat' };
        }

        const parts = email.split('@');
        return {
            valid: true,
            info: {
                localPart: parts[0],
                domain: parts[1],
                length: email.length,
                timestamp: new Date().toISOString()
            }
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const contentValidation = validateContent(formData.message);
        if (!contentValidation.valid) {
            toast({
                title: t('landing.contact.form.errorTitle'),
                description: t(contentValidation.errorKey!),
                variant: "destructive",
            });
            return;
        }

        const emailValidation = extractEmailInfo(formData.email);
        if (!emailValidation.valid) {
            toast({
                title: t('landing.contact.form.errorTitle'),
                description: t(emailValidation.errorKey!),
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("https://formsubmit.co/ajax/support@kratox.io", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    _subject: `Novo contato de ${formData.name} - ${formData.company}`,
                    _template: "table",
                    _captcha: "false",
                    block_email_info: JSON.stringify(emailValidation.info)
                })
            });

            if (response.ok) {
                toast({
                    title: t('landing.contact.form.successTitle'),
                    description: t('landing.contact.form.successDesc'),
                    variant: "default",
                });
                setFormData({ name: '', company: '', email: '', message: '' });
            } else {
                throw new Error("Falha no envio");
            }
        } catch (error) {
            toast({
                title: t('landing.contact.form.errorTitle'),
                description: t('landing.contact.form.errorDesc'),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <section id="contact" className="py-20 border-t border-border/50">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-12">
                    <div className="md:w-1/2">
                        <FadeIn direction="right">
                            <h2 className="text-3xl font-bold mb-4">{t('landing.contact.title')}</h2>
                            <p className="text-muted-foreground mb-8">
                                {t('landing.contact.subtitle')}
                            </p>
                        </FadeIn>

                        <div className="space-y-6">
                            <FadeIn delay={100} direction="right">
                                <a
                                    href="https://wa.me/00000000000"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 group hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500/20 transition-colors">
                                        <FaWhatsapp size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground group-hover:text-orange-500 transition-colors">{t('landing.contact.whatsapp')}</h4>
                                        <p className="text-muted-foreground text-sm">+00 (00) 00000-0000</p>
                                    </div>
                                </a>
                            </FadeIn>

                            <FadeIn delay={200} direction="right">
                                <a href="mailto:email@email.com" className="flex items-center gap-4 group hover:opacity-80 transition-opacity cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500/20 transition-colors">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground group-hover:text-orange-500 transition-colors">{t('landing.contact.email')}</h4>
                                        <p className="text-muted-foreground text-sm">support@kratox.io</p>
                                    </div>
                                </a>
                            </FadeIn>
                        </div>
                    </div>

                    <div className="md:w-1/2">
                        <FadeIn direction="left" delay={200}>
                            <div className="bg-card p-8 rounded-2xl border border-border">
                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t('landing.contact.form.name')}</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full p-3 rounded-lg bg-background border border-border focus:border-orange-500 outline-none transition-colors"
                                                placeholder={t('landing.contact.form.namePlaceholder')}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t('landing.contact.form.company')}</label>
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className="w-full p-3 rounded-lg bg-background border border-border focus:border-orange-500 outline-none transition-colors"
                                                placeholder={t('landing.contact.form.companyPlaceholder')}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('landing.contact.form.email')}</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full p-3 rounded-lg bg-background border border-border focus:border-orange-500 outline-none transition-colors"
                                            placeholder={t('landing.contact.form.emailPlaceholder')}
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('landing.contact.form.message')}</label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="w-full p-3 rounded-lg bg-background border border-border focus:border-orange-500 outline-none transition-colors min-h-[120px]"
                                            placeholder={t('landing.contact.form.messagePlaceholder')}
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t('landing.contact.form.submitting')}
                                            </>
                                        ) : (
                                            t('landing.contact.form.submit')
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </div>
        </section>
    );
}
