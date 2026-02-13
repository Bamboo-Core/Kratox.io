'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import LanguageSwitcher from '@/components/language-switcher';

// Zod schema for validation
const getProfileFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().min(2, t('profile.nameMinLength')),
      phone_number: z.string().optional(),
      password: z.string().optional(),
      passwordConfirmation: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.password && data.password.length > 0 && data.password.length < 8) {
          return false;
        }
        return true;
      },
      {
        message: t('profile.passwordMinLength'),
        path: ['password'],
      }
    )
    .refine((data) => data.password === data.passwordConfirmation, {
      message: t('profile.passwordMismatch'),
      path: ['passwordConfirmation'],
    });

type ProfileFormValues = z.infer<ReturnType<typeof getProfileFormSchema>>;

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Memoize schema so it updates when language changes
  const profileFormSchema = useMemo(() => getProfileFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone_number: user?.phone_number ?? '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone_number: user.phone_number ?? '',
        password: '',
        passwordConfirmation: '',
      });
    }
  }, [user, reset]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setIsLoading(true);

    // Create a payload with only the fields that have values
    const payload: Partial<ProfileFormValues> = {};
    if (data.name) payload.name = data.name;
    if (data.phone_number) payload.phone_number = data.phone_number;
    // Only include password if user typed one
    if (data.password) {
      payload.password = data.password;
      payload.passwordConfirmation = data.passwordConfirmation;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('profile.updateError'));
      }

      toast({ title: t('common.success'), description: t('profile.updateSuccess') });
      // Optionally, update user in auth store if backend sends back updated user
      // updateUser(result);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
          <CardDescription>
            <Trans
              i18nKey="profile.description"
              values={{ email: user?.email }}
              components={{ 1: <span className="font-semibold" /> }}
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile.nameLabel')}</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">{t('profile.phoneLabel')}</Label>
              <Input id="phone_number" {...register('phone_number')} />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <hr className="my-4" />
            <p className="text-sm text-muted-foreground">
              {t('profile.passwordChangeDescription')}
            </p>

            <div className="space-y-2">
              <Label htmlFor="password">{t('profile.newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">{t('profile.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="passwordConfirmation"
                  type={showPassword ? 'text' : 'password'}
                  {...register('passwordConfirmation')}
                />
              </div>
              {errors.passwordConfirmation && (
                <p className="text-sm text-destructive">{errors.passwordConfirmation.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('profile.saveButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
