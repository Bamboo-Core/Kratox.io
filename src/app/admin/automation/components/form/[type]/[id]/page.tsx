
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminAutomationActionById, useAdminAutomationCriterionById } from '@/hooks/useAdminManagement';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import AutomationComponentForm from '../_components/automation-component-form';
import PageHeader from '@/components/layout/page-header';

export default function EditAutomationComponentPage() {
  const router = useRouter();
  const params = useParams();
  const type = params.type as 'criterion' | 'action';
  const id = params.id as string;

  const { data: criterion, isLoading: isLoadingCriterion, isError: isErrorCriterion, error: errorCriterion } = useAdminAutomationCriterionById(id, { enabled: type === 'criterion' });
  const { data: action, isLoading: isLoadingAction, isError: isErrorAction, error: errorAction } = useAdminAutomationActionById(id, { enabled: type === 'action' });

  const item = type === 'criterion' ? criterion : action;
  const isLoading = isLoadingCriterion || isLoadingAction;
  const isError = isErrorCriterion || isErrorAction;
  const error = errorCriterion || errorAction;

  const pageTitle = `Edit ${type === 'criterion' ? 'Criterion' : 'Action'}`;
  const itemLabel = item?.label || '...';

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={`${pageTitle}: ${itemLabel}`}>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Page
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading component data...</p>
          </div>
        )}
        {isError && (
          <Alert variant="destructive" className="w-full max-w-2xl">
            <AlertTitle>Error Loading Component</AlertTitle>
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        )}
        {item && <AutomationComponentForm type={type} item={item} />}
      </main>
    </div>
  );
}
