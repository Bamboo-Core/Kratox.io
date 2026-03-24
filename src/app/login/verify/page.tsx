'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AppLogo } from '@/components/layout/app-logo';
import LanguageSwitcher from '@/components/language-switcher';
import { Loader2, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const verifySchema = z.object({
    rememberDevice: z.boolean().default(false),
});

type VerifyFormInputs = z.infer<typeof verifySchema>;

export default function VerifyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verify2FA, resend2FA } = useAuthStore();
    const [apiError, setApiError] = useState<string | null>(null);
    const [resendSuccess, setResendSuccess] = useState(false);
    const { t } = useTranslation();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(60);
    const [isResending, setIsResending] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const mfaToken = searchParams.get('mfaToken');
    const rememberMe = searchParams.get('rememberMe') === 'true';

    useEffect(() => {
        const storedEmail = sessionStorage.getItem('login-email');
        setEmail(storedEmail || searchParams.get('email'));
    }, [searchParams]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const {
        handleSubmit,
        watch,
        setValue,
        formState: { isSubmitting },
    } = useForm<VerifyFormInputs>({
        resolver: zodResolver(verifySchema),
        defaultValues: {
            rememberDevice: false,
        },
    });

    useEffect(() => {
        if (!mfaToken) {
            router.replace('/login');
        }
    }, [mfaToken, router]);

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

    const onSubmit: SubmitHandler<VerifyFormInputs> = async (data) => {
        setApiError(null);

        if (!mfaToken) {
            setApiError('verifyLogin.sessionExpired');
            return;
        }

        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setApiError('verifyCode.incompleteCode');
            return;
        }

        try {
            await verify2FA(mfaToken, fullCode, data.rememberDevice, rememberMe);

            const user = useAuthStore.getState().user;
            if (user?.role === 'admin') {
                router.replace('/dashboard');
            } else {
                router.replace('/dns-blocking');
            }
        } catch (error) {
            if (error instanceof Error) {
                setApiError(error.message);
            } else {
                setApiError('verifyLogin.unknownError');
            }
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0 || isResending || !mfaToken) return;

        setIsResending(true);
        setApiError(null);
        setResendSuccess(false);

        try {
            await resend2FA(mfaToken);
            setResendSuccess(true);
            setResendTimer(60);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            if (error instanceof Error) {
                setApiError(error.message);
            } else {
                setApiError('verifyLogin.unknownError');
            }
        } finally {
            setIsResending(false);
        }
    };

    if (!mfaToken) return null;

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
                            {t('verifyLogin.description', 'Enviamos um código de segurança para o seu e-mail para validar seu acesso')}{' '}
                            <span className="text-orange-500 font-bold">{email || '...'}</span>
                            <br />
                            {t('verifyLogin.enterCode', 'Digite-o abaixo para continuar.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="rememberDevice"
                                    checked={watch('rememberDevice')}
                                    onCheckedChange={(checked) => setValue('rememberDevice', checked === true)}
                                />
                                <Label htmlFor="rememberDevice" className="text-sm font-normal text-muted-foreground">
                                    {t('verifyLogin.rememberDevice', 'Lembrar este dispositivo por 30 dias')}
                                </Label>
                            </div>

                            {apiError && (
                                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm">
                                    <p>{t(apiError)}</p>
                                </div>
                            )}

                            {resendSuccess && (
                                <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-center text-sm text-green-500">
                                    {t('verifyCode.resendSuccess')}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
                                disabled={isSubmitting || code.join('').length !== 6}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                )}
                                {t('verifyCode.verifyButton')}
                            </Button>

                            <div className="text-center mt-4">
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={handleResendCode}
                                    disabled={resendTimer > 0 || isResending}
                                    className="text-sm text-muted-foreground hover:text-orange-500"
                                >
                                    {resendTimer > 0
                                        ? `${t('verifyCode.resendTimerLabel').replace('{{seconds}}', String(resendTimer))}`
                                        : t('verifyCode.resendLabel')}
                                </Button>
                            </div>

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('verifyLogin.backToLogin', 'Voltar para o login')}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}


