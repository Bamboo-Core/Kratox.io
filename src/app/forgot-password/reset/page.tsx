'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/layout/app-logo';
import LanguageSwitcher from '@/components/language-switcher';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '@/services/password-recovery-service';

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'resetPassword.passwordMinLength'),
    password_confirmation: z.string().min(1, 'resetPassword.confirmationRequired'),
}).refine((data) => data.password === data.password_confirmation, {
    message: 'resetPassword.passwordMismatch',
    path: ['password_confirmation'],
});

type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const router = useRouter();
    const [apiError, setApiError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [code, setCode] = useState<string | null>(null);
    const { t } = useTranslation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormInputs>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            password_confirmation: '',
        },
    });

    useEffect(() => {
        const storedEmail = sessionStorage.getItem('recovery-email');
        const storedCode = sessionStorage.getItem('recovery-code');

        if (!storedEmail || !storedCode) {
            router.replace('/forgot-password');
            return;
        }

        setEmail(storedEmail);
        setCode(storedCode);
    }, [router]);

    const onSubmit: SubmitHandler<ResetPasswordFormInputs> = async (data) => {
        if (!email || !code) return;

        setApiError(null);

        try {
            await resetPassword(email, code, data.password, data.password_confirmation);
            sessionStorage.removeItem('recovery-email');
            sessionStorage.removeItem('recovery-code');
            router.push('/login?reset=success');
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    setApiError('resetPassword.networkError');
                } else {
                    setApiError(error.message);
                }
            } else {
                setApiError('resetPassword.unknownError');
            }
        }
    };

    if (!email || !code) {
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
                        <CardTitle className="text-3xl text-white">{t('resetPassword.title')}</CardTitle>
                        <CardDescription>
                            {t('resetPassword.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('resetPassword.passwordLabel')}</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={t('resetPassword.passwordPlaceholder')}
                                        {...register('password')}
                                        className={errors.password ? 'border-destructive' : ''}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-white hover:bg-orange-600 hover:text-white"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-destructive">{t(errors.password.message!)}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">{t('resetPassword.confirmPasswordLabel')}</Label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                                        {...register('password_confirmation')}
                                        className={errors.password_confirmation ? 'border-destructive' : ''}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-white hover:bg-orange-600 hover:text-white"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    >
                                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-sm text-destructive">{t(errors.password_confirmation.message!)}</p>
                                )}
                            </div>

                            {apiError && (
                                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm text-destructive">
                                    {t(apiError)}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <KeyRound className="h-4 w-4" />
                                )}
                                {t('resetPassword.resetButton')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
