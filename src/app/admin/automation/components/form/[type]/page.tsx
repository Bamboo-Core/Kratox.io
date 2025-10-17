
'use client';

import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AutomationComponentForm from '../../_components/automation-component-form';

export default function NewAutomationComponentPage() {
  const router = useRouter();
  const params = useParams();
  const type = params.type as 'criterion' | 'action';
  const pageTitle = `Create New ${type === 'criterion' ? 'Criterion' : 'Action'}`;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={pageTitle}>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Page
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        <AutomationComponentForm type={type} />
      </main>
    </div>
  );
}
