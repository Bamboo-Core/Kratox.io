'use client';

import UserForm from './_components/user-form';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewUserPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Create New User">
        <Button
          variant="outline"
          onClick={() => router.push('/admin')}
          className="hover:bg-orange-500 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin List
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        <UserForm />
      </main>
    </div>
  );
}
