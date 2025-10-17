
'use client';

import { useParams, useRouter } from 'next/navigation';
import UserForm from '../_components/user-form';
import PageHeader from '@/components/layout/page-header';
import { useUserByIdQuery } from '@/hooks/useUserManagement';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : undefined;

  const { data: user, isLoading, isError, error } = useUserByIdQuery(id);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={user ? `Edit: ${user.name}` : 'Edit User'}>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin List
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading user data...</p>
          </div>
        )}
        {isError && (
          <Alert variant="destructive" className="w-full max-w-2xl">
            <AlertTitle>Error Loading User</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {user && <UserForm user={user} />}
      </main>
    </div>
  );
}
