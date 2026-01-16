'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AutomationTemplateForm from './_components/automation-template-form';

export default function NewAutomationTemplatePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Create New Automation Template">
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Page
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        <AutomationTemplateForm />
      </main>
    </div>
  );
}
