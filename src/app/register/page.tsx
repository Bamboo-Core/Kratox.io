'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/layout/app-logo';
import LanguageSwitcher from '@/components/language-switcher';
import { Loader2, UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LdTgGAsAAAAADv0oYC6aoNPrVdHv9YgsySi6rIG';

// Password validation matching backend rules
const passwordSchema = z.string()
  .min(8, 'register.passwordMinLength')
  .max(128, 'register.passwordMaxLength')
  .regex(/[A-Z]/, 'register.passwordUppercase')
  .regex(/[a-z]/, 'register.passwordLowercase')
  .regex(/[0-9]/, 'register.passwordNumber')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, 'register.passwordSpecial');

const registerSchema = z.object({
  name: z.string().min(2, 'register.nameMinLength').max(100, 'register.nameMaxLength'),
  email: z.string().email('register.invalidEmail'),
  phone_number: z.string().min(10, 'register.phoneMinLength').max(20, 'register.phoneMaxLength'),
  password: passwordSchema,
  password_confirmation: z.string().min(1, 'register.passwordConfirmationRequired'),
  terms: z.boolean().refine(val => val === true, {
    message: 'register.termsRequired'
  }),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'register.passwordMismatch',
  path: ['password_confirmation'],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirmation: '',
      terms: false,
    },
  });

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setApiError(null);
    setSuccessMessage(null);

    if (!recaptchaToken) {
      setApiError('register.recaptchaRequired');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/register/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'register.unknownError');
      }

      setSuccessMessage('register.success');

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setApiError('register.networkError');
        } else if (error.message.includes('already exists')) {
          setApiError('register.emailExists');
        } else {
          setApiError(error.message);
        }
      } else {
        setApiError('register.unknownError');
      }
      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
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
            <CardTitle className="text-3xl text-white">{t('register.title')}</CardTitle>
            <CardDescription>
              {t('register.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('register.nameLabel')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('register.namePlaceholder')}
                  {...register('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{t(errors.name.message!)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('register.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('register.emailPlaceholder')}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{t(errors.email.message!)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">{t('register.phoneLabel')}</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder={t('register.phonePlaceholder')}
                  {...register('phone_number')}
                  className={errors.phone_number ? 'border-destructive' : ''}
                />
                {errors.phone_number && <p className="text-sm text-destructive">{t(errors.phone_number.message!)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('register.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('register.passwordPlaceholder')}
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
                <Label htmlFor="password_confirmation">{t('register.passwordConfirmationLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password_confirmation"
                    type={showPasswordConfirmation ? 'text' : 'password'}
                    placeholder={t('register.passwordConfirmationPlaceholder')}
                    {...register('password_confirmation')}
                    className={errors.password_confirmation ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-white hover:bg-orange-600 hover:text-white"
                    onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                  >
                    {showPasswordConfirmation ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-sm text-destructive">{t(errors.password_confirmation.message!)}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    onCheckedChange={(checked) => setValue('terms', checked as boolean, { shouldValidate: true })}
                  />
                  <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    <Trans
                      i18nKey="register.termsAgreement"
                      components={[
                        <Link key="terms" href="/docs/terms" target="_blank" className="text-orange-500 hover:underline">Terms</Link>,
                        <Link key="privacy" href="/docs/privacy" target="_blank" className="text-orange-500 hover:underline">Privacy</Link>
                      ]}
                    />
                  </Label>
                </div>
                {errors.terms && <p className="text-sm text-destructive">{t(errors.terms.message!)}</p>}
              </div>

              {apiError && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm">
                  {t(apiError)}
                </div>
              )}

              {successMessage && (
                <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-center text-sm text-green-500">
                  {t(successMessage)}
                </div>
              )}

              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                  theme="dark"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isSubmitting || !!successMessage}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {t('register.submitButton')}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('register.backToLogin')}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
