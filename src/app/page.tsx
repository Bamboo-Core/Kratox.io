
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

/**
 * Root page component that handles redirection based on authentication status.
 * It checks if the user is authenticated from the auth store and redirects
 * to either the dashboard or the login page.
 */
export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // Start with hydration status as false on server and client initial render.
  const [isHydrated, setIsHydrated] = useState(false);

  // useEffect runs only on the client, after the component has mounted.
  useEffect(() => {
    // Now it's safe to check the hydration status and subscribe.
    setIsHydrated(useAuthStore.persist.hasHydrated());

    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    // We don't want to redirect until the store has finished loading from localStorage.
    if (isHydrated) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isHydrated, router]);

  // Display a loading spinner while checking auth status to avoid flicker.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
