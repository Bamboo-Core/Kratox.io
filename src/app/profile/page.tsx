'use client';

import { useState, useEffect } from 'react';
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

// Zod schema for validation
const profileFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
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
      message: 'Password must be at least 8 characters',
      path: ['password'],
    }
  )
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords don't match",
    path: ['passwordConfirmation'],
  });

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        throw new Error(result.error || 'Something went wrong');
      }

      toast({ title: 'Success', description: 'Profile updated successfully.' });
      // Optionally, update user in auth store if backend sends back updated user
      // updateUser(result);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>
            Update your personal information. Your email is{' '}
            <span className="font-semibold">{user?.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" {...register('phone_number')} />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <hr className="my-4" />
            <p className="text-sm text-muted-foreground">
              To change your password, enter a new one below. Otherwise, leave these fields blank.
            </p>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
              <Label htmlFor="passwordConfirmation">Confirm New Password</Label>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
