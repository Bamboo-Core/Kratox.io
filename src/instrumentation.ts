
// See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
// And https://mswjs.io/docs/integrations/node#nextjs

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'development') {
    const { server } = await import('@/mocks/server');
    server.listen({ onUnhandledRequest: 'bypass' });
    console.log('MSW server instrumentation running for Node.js environment.');
  } else if (process.env.NEXT_RUNTIME === 'edge' && process.env.NODE_ENV === 'development') {
    // MSW does not support Edge runtime for server-side mocking in the same way as Node.js
    // Client-side mocks will still work.
    console.log('MSW instrumentation: Edge runtime detected, server-side mocks (msw/node) not started.');
  }
}
