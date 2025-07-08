
'use client';

import { useEffect } from 'react';
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
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // We don't want to redirect until the store has finished loading from localStorage.
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Display a loading spinner while checking auth status to avoid flicker.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
