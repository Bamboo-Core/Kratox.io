// public/mockServiceWorker.js
// Minimal service worker for testing registration

self.addEventListener('install', (event) => {
  console.log('[Minimal SW] Install event triggered.');
  event.waitUntil(
    self.skipWaiting().then(() => {
      console.log('[Minimal SW] Skip waiting complete.');
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Minimal SW] Activate event triggered.');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[Minimal SW] Clients claimed.');
    })
  );
});

self.addEventListener('fetch', (event) => {
  console.log('[Minimal SW] Fetching:', event.request.url);
  // Do not call event.respondWith(), just let the request pass through to the network.
});

console.log('[Minimal SW] Script evaluated.');
