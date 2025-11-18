
'use client';

import { getFeatureFlag } from '@/services/feature-flag-service-client';
import { useAuthStore } from '@/store/auth-store';
import { useSyncExternalStore } from 'react';
import { subject } from '@/services/feature-flag-service-client';

// This is a simplified implementation. A robust solution might use
// React Context and a provider to avoid direct import of the Split client.
export const useFeatureFlag = (featureName: string): boolean => {
  // --- FORCED FOR TESTING ---
  if (featureName === 'scriptable_automation_templates') {
    return true;
  }
  // --- END FORCED FOR TESTING ---

  const { user } = useAuthStore();
  const key = user?.tenantId || 'anonymous';

  // useSyncExternalStore is the recommended way to subscribe to external,
  // mutable data sources like the Split SDK client.
  const treatment = useSyncExternalStore(
    (callback) => {
      subject.subscribe(callback);
      return () => subject.unsubscribe(callback);
    },
    () => getFeatureFlag(featureName, key),
    () => 'off' // Default value for server-side rendering
  );

  return treatment === 'on';
};
