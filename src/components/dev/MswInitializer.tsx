
"use client";

import { useEffect } from 'react';

export function MswInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Dynamically import and start the MSW browser worker
      import('@/mocks/browser')
        .then(({ worker }) => {
          // Start the worker.
          // It's important to call `worker.start()` separately
          // from the import, to ensure it's only called once.
          return worker.start({
            onUnhandledRequest: 'bypass', // Pass unhandled requests through
            quiet: false, // Set to true to suppress MSW's console messages
          });
        })
        .then(() => {
          console.log('MSW browser worker started.');
        })
        .catch((error) => {
          console.error('Failed to start MSW browser worker:', error);
        });
    }
  }, []);

  return null; // This component doesn't render anything
}
