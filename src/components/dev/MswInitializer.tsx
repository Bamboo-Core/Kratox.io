
'use client';

import { useEffect } from 'react';

export function MswInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[MSW Initializer] Attempting to start MSW browser worker...');
      import('@/mocks/browser')
        .then(({ worker }) => {
          console.log('[MSW Initializer] Successfully imported MSW worker object:', worker);
          // Start the worker.
          // Removing 'quiet: true' or setting to 'false' makes MSW more verbose.
          return worker.start({
            onUnhandledRequest: 'bypass',
            // quiet: false, // Explicitly false or remove for default verbosity
            serviceWorker: {
              // Ensure the path is correct, default is usually fine
              url: '/mockServiceWorker.js',
            },
          });
        })
        .then((registration) => {
          // registration can be undefined if the worker is already active and controlling the page.
          if (registration) {
            console.log(
              '[MSW Initializer] MSW browser worker started. ServiceWorker registration:',
              registration
            );
          } else {
            console.warn(
              '[MSW Initializer] MSW browser worker start call completed. Registration object is undefined (this can be normal if already active). Check MSW logs for more details.'
            );
          }
          // Check if msw is now available on self in the main window context (for sanity check)
          // Note: self.msw inside the service worker is a different context.
          if ((window as any).msw) {
            console.log(
              '[MSW Initializer] window.msw object is available in main thread:',
              (window as any).msw
            );
          }
        })
        .catch((error) => {
          console.error('[MSW Initializer] Failed to start MSW browser worker:', error);
        });
    } else {
      // console.log('[MSW Initializer] Conditions not met to start MSW (not in browser or not development mode).');
    }
  }, []);

  return null; // This component doesn't render anything
}
