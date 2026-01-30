'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/layout/app-logo';
import LanguageSwitcher from '@/components/language-switcher';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendRecoveryCode } from '@/services/password-recovery-service';

const forgotPasswordSchema = z.object({
    email: z.string().email('forgotPassword.invalidEmail'),
});

type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [apiError, setApiError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { t } = useTranslation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        getValues,
    } = useForm<ForgotPasswordFormInputs>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit: SubmitHandler<ForgotPasswordFormInputs> = async (data) => {
        setApiError(null);
        setSuccessMessage(null);

        try {
            await sendRecoveryCode(data.email);
            sessionStorage.setItem('recovery-email', data.email);
            router.push('/forgot-password/verify');
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    setApiError('forgotPassword.networkError');
                } else {
                    setApiError(error.message);
                }
            } else {
                setApiError('forgotPassword.unknownError');
            }
        }
    };

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
                        <CardTitle className="text-3xl text-white">{t('forgotPassword.title')}</CardTitle>
                        <CardDescription>
                            {t('forgotPassword.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t('forgotPassword.emailPlaceholder')}
                                    {...register('email')}
                                    className={errors.email ? 'border-destructive' : ''}
                                />
                                {errors.email && <p className="text-sm text-destructive">{t(errors.email.message!)}</p>}
                            </div>

                            {apiError && (
                                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm text-destructive">
                                    {t(apiError)}
                                </div>
                            )}

                            {successMessage && (
                                <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-center text-sm text-green-500">
                                    {t(successMessage)}
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
                                    <Mail className="h-4 w-4" />
                                )}
                                {t('forgotPassword.sendCodeButton')}
                            </Button>

                            <Link href="/login" className="w-full block">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('forgotPassword.backToLogin')}
                                </Button>
                            </Link>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
