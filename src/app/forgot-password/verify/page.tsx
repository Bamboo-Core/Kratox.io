'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import LanguageSwitcher from '@/components/language-switcher';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { verifyRecoveryCode, sendRecoveryCode } from '@/services/password-recovery-service';

export default function VerifyCodePage() {
    const router = useRouter();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const { t } = useTranslation();
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const storedEmail = sessionStorage.getItem('recovery-email');
        if (!storedEmail) {
            router.replace('/forgot-password');
            return;
        }
        setEmail(storedEmail);
    }, [router]);

    const handleInputChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pastedData.length; i++) {
            newCode[i] = pastedData[i];
        }
        setCode(newCode);
        if (pastedData.length === 6) {
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setApiError('verifyCode.incompleteCode');
            return;
        }

        setApiError(null);
        setIsSubmitting(true);

        try {
            await verifyRecoveryCode(email, fullCode);
            sessionStorage.setItem('recovery-code', fullCode);
            router.push('/forgot-password/reset');
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    setApiError('verifyCode.networkError');
                } else {
                    setApiError(error.message);
                }
            } else {
                setApiError('verifyCode.unknownError');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) return;

        setIsResending(true);
        setResendSuccess(false);
        setApiError(null);

        try {
            await sendRecoveryCode(email);
            setResendSuccess(true);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            if (error instanceof Error) {
                setApiError(error.message);
            }
        } finally {
            setIsResending(false);
        }
    };

    if (!email) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md">
                <Card className="shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="flex items-center justify-center">
                            <AppLogo className="h-20 w-20" />
                        </div>
                        <CardTitle className="text-3xl text-white">{t('verifyCode.title')}</CardTitle>
                        <CardDescription>
                            {t('verifyCode.sentTo', 'Digite o código de 6 dígitos enviado para')}{' '}
                            <span className="text-orange-500 font-medium">{email}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex justify-center gap-2">
                                {code.map((digit, index) => (
                                    <Input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleInputChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-12 h-14 text-center text-2xl font-bold"
                                    />
                                ))}
                            </div>

                            {apiError && (
                                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm">
                                    {t(apiError)}
                                </div>
                            )}

                            {resendSuccess && (
                                <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-center text-sm text-green-500">
                                    {t('verifyCode.resendSuccess')}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                disabled={isSubmitting || code.join('').length !== 6}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4" />
                                )}
                                {t('verifyCode.verifyButton')}
                            </Button>

                            <div className="text-center">
                                <Button
                                    type="button"
                                    variant="link"
                                    className="text-orange-500 hover:text-orange-600"
                                    onClick={handleResendCode}
                                    disabled={isResending}
                                >
                                    {isResending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    {t('verifyCode.resendCode')}
                                </Button>
                            </div>

                            <Link href="/forgot-password" className="w-full block">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('verifyCode.backToEmail')}
                                </Button>
                            </Link>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
