
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth-store';
import {
  useProfileMutation,
  profileFormSchema,
  type ProfileFormData,
} from '@/hooks/useProfileManagement';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function ProfileForm() {
  const { user, login } = useAuthStore();
  const { toast } = useToast();
  const profileMutation = useProfileMutation();

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      password: '',
    },
  });

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (values: ProfileFormData) => {
    // Simulate image upload for now
    if (imagePreview) {
      console.log('Simulating upload of new profile picture:', imagePreview.substring(0, 50) + '...');
      toast({
        title: 'Funcionalidade em desenvolvimento',
        description: 'O upload da imagem do perfil será salvo em breve.',
      });
    }

    profileMutation.mutate(values, {
      onSuccess: async (updatedUser) => {
        toast({ title: 'Sucesso', description: 'Seu perfil foi atualizado.' });
        if (user?.email && values.password) {
          await login(user.email, values.password);
        } else if (user?.email) {
          toast({
            title: 'Aviso',
            description:
              'Seu nome foi atualizado. As alterações serão totalmente refletidas no próximo login.',
          });
        }
        form.reset({ name: updatedUser.name, password: '' });
      },
      onError: (err: Error) => {
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message });
      },
    });
  };

  const isSubmitting = profileMutation.isPending;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle>Configurações do Perfil</CardTitle>
        <CardDescription>
          Atualize seu nome, foto e senha. Outras informações são gerenciadas pelo administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={imagePreview || 'https://placehold.co/100x100.png'}
                  alt={user.name}
                  data-ai-hint="profile avatar"
                />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label htmlFor="picture">Foto de Perfil</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="picture"
                    type="file"
                    accept="image/png, image/jpeg, image/gif"
                    className="text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormDescription>Deixe em branco para manter a senha atual.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Input value={user.tenantName} disabled />
              </div>
              <div className="space-y-2">
                <Label>Papel (Role)</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
