
'use client';

import PageHeader from '@/components/layout/page-header';
import ProfileForm from './_components/profile-form';

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Meu Perfil" />
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        <ProfileForm />
      </main>
    </div>
  );
}
