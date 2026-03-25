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
import { Separator } from '@/components/ui/separator';
import { 
    Loader2, 
    Eye, 
    EyeOff, 
    User, 
    Phone, 
    Lock, 
    Mail, 
    ShieldCheck, 
    UserCircle,
    Save
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import PageHeader from '@/components/layout/page-header';
import FadeIn from '@/app/_components/FadeIn';
import { cn, formatPhone, stripPhone } from '@/lib/utils';

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
      phone_number: formatPhone(user?.phone_number ?? ''),
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone_number: formatPhone(user.phone_number ?? ''),
        password: '',
        passwordConfirmation: '',
      });
    }
  }, [user, reset]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setIsLoading(true);

    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.phone_number) payload.phone_number = stripPhone(data.phone_number);
    if (data.password) {
      payload.password = data.password;
      payload.passwordConfirmation = data.passwordConfirmation;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
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
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <PageHeader title={t('profile.title')} />

        <main className="flex-1 p-4 md:p-8 flex justify-center overflow-y-auto relative z-10">
            <FadeIn className="w-full max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Summary Card */}
                    <div className="lg:col-span-4">
                        <Card className="bg-card/40 backdrop-blur-md border-border/40 shadow-xl overflow-hidden group h-full flex flex-col">
                            <div className="h-2 w-full bg-orange-500/50"></div>
                            <CardHeader className="text-center pt-8">
                                <div className="mx-auto w-24 h-24 rounded-full bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-500">
                                    <span className="text-3xl font-bold text-orange-500">{userInitials}</span>
                                </div>
                                <CardTitle className="text-2xl font-bold truncate px-2">{user?.name}</CardTitle>
                                <CardContent className="p-0 pt-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground">
                                        <Mail size={12} className="text-orange-500" />
                                        {user?.email}
                                    </div>
                                </CardContent>
                            </CardHeader>
                            <CardContent className="p-6 pt-2 flex flex-col">
                                <div className="space-y-6">
                                    <Separator className="bg-white/5" />
                                    <div className="space-y-4">
                                        {user?.role === 'admin' && (
                                          <div className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">{t('userNav.tenant')}</span>
                                              <span className="text-gray-300 font-medium">{user?.tenantName || 'Kratox'}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className="flex items-center gap-1.5 text-green-500 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                Ativo
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-10 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-sm text-muted-foreground flex items-center gap-3">
                                    <ShieldCheck size={18} className="text-orange-500 shrink-0" />
                                    <span>Suas informações de perfil são protegidas por criptografia de ponta a ponta e autenticação segura.</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Form Card */}
                    <div className="lg:col-span-8">
                        <Card className="bg-card/40 backdrop-blur-md border-border/40 shadow-xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                                    <UserCircle size={20} className="text-orange-500" />
                                    {t('profile.title')}
                                </CardTitle>
                                <CardDescription className="text-base">
                                    <Trans
                                        i18nKey="profile.description"
                                        values={{ email: user?.email }}
                                        components={{ 1: <span className="font-semibold text-orange-500/80" /> }}
                                    />
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                    {/* Personal Info Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-500/70 mb-2">
                                            <User size={14} />
                                            Informações Pessoais
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-gray-300 ml-1">{t('profile.nameLabel')}</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        id="name" 
                                                        className="pl-10 bg-white/5 border-white/10 focus:border-orange-500/50 transition-colors h-11" 
                                                        {...register('name')} 
                                                    />
                                                </div>
                                                {errors.name && <p className="text-xs text-destructive mt-1 ml-1">{errors.name.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone_number" className="text-gray-300 ml-1">{t('profile.phoneLabel')}</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        id="phone_number" 
                                                        className="pl-10 bg-white/5 border-white/10 focus:border-orange-500/50 transition-colors h-11"
                                                        {...register('phone_number', {
                                                            onChange: (e) => {
                                                                e.target.value = formatPhone(e.target.value);
                                                            }
                                                        })} 
                                                    />
                                                </div>
                                                {errors.phone_number && (
                                                    <p className="text-xs text-destructive mt-1 ml-1">{errors.phone_number.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-white/5" />

                                    {/* Security Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-500/70 mb-2">
                                                <Lock size={14} />
                                                Segurança
                                            </div>
                                            <span className="text-[10px] text-muted-foreground italic">{t('profile.passwordChangeDescription')}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="password">{t('profile.newPasswordLabel')}</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-orange-500/50 transition-colors h-11"
                                                        {...register('password')}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-orange-500/10 text-muted-foreground hover:text-orange-500"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                {errors.password && (
                                                    <p className="text-xs text-destructive mt-1 ml-1">{errors.password.message}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="passwordConfirmation">{t('profile.confirmPasswordLabel')}</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="passwordConfirmation"
                                                        type={showPassword ? 'text' : 'password'}
                                                        className="pl-10 bg-white/5 border-white/10 focus:border-orange-500/50 transition-colors h-11"
                                                        {...register('passwordConfirmation')}
                                                    />
                                                </div>
                                                {errors.passwordConfirmation && (
                                                    <p className="text-xs text-destructive mt-1 ml-1">{errors.passwordConfirmation.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button 
                                            type="submit" 
                                            className="w-full md:w-auto min-w-[160px] bg-orange-500 hover:bg-orange-600 h-11 font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95" 
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="mr-2 h-4 w-4" />
                                            )}
                                            {t('profile.saveButton')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </FadeIn>
        </main>
    </div>
  );
}
