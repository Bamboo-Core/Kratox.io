'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Loader2, LogIn, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const loginSchema = z.object({
  email: z.string().email('login.invalidEmail'),
  password: z.string().min(1, 'login.passwordRequired'),
  rememberMe: z.boolean().default(false),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const REMEMBERED_EMAIL_KEY = 'noc-ai-remembered-email';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'success') {
      setResetSuccess(true);
      window.history.replaceState({}, '', '/login');
    }
  }, [setValue]);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setApiError(null);
    try {
      await login(data.email, data.password);

      if (data.rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      // router.replace('/dashboard');

      const user = useAuthStore.getState().user;
      if (user?.role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/dns-blocking');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setApiError('login.networkError');
        } else {
          setApiError(error.message);
        }
      } else {
        setApiError('login.unknownError');
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
            <CardTitle className="text-3xl text-white">{t('login.title')}</CardTitle>
            <CardDescription>
              {t('login.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{t(errors.email.message!)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder')}
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="rememberMe" {...register('rememberMe')} />
                  <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
                    {t('login.rememberMe')}
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600">
                  {t('login.forgotPassword')}
                </Link>
              </div>

              {resetSuccess && (
                <div className="rounded-md border border-green-500 bg-green-500/10 p-3 text-center text-sm text-green-500">
                  {t('login.resetSuccess')}
                </div>
              )}

              {apiError && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm text-destructive">
                  {t(apiError)}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {t('login.signInButton')}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 mb-4 text-muted-foreground">
                    {t('login.noAccount')}
                  </span>
                </div>
              </div>

              <Link href="/register" className="w-full mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('login.createAccount')}
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
