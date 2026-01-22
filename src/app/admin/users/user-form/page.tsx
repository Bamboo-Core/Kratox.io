'use client';

import UserForm from './_components/user-form';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function NewUserPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('admin.users.page.createTitle')}>
        <Button
          variant="outline"
          onClick={() => router.push('/admin')}
          className="hover:bg-orange-500 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('admin.users.page.backToAdmin')}
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        <UserForm />
      </main>
    </div>
  );
}
