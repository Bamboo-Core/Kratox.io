'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAutomationTemplateById } from '@/hooks/useAutomationTemplates';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import AutomationTemplateForm from '../_components/automation-template-form';

export default function EditAutomationTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: template, isLoading, isError, error } = useAutomationTemplateById(id);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={template ? `Edit: ${template.name}` : 'Edit Template'}>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Page
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading template data...</p>
          </div>
        )}
        {isError && (
          <Alert variant="destructive" className="w-full max-w-3xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Template</AlertTitle>
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        )}
        {template && <AutomationTemplateForm template={template} />}
      </main>
    </div>
  );
}
