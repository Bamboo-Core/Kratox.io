
import { http, HttpResponse } from 'msw';

// Define your mock API handlers here
export const handlers = [
  http.get('/api/health', (_req) => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Example: Mocking a user endpoint
  http.get('/api/user/me', (_req) => {
    return HttpResponse.json({
      id: '123',
      name: 'NOC Admin',
      email: 'admin@netguard.ai',
      avatar: 'https://placehold.co/40x40.png',
    });
  }),

  // Example: Mocking alerts for the dashboard
  http.get('/api/alerts', (_req) => {
    return HttpResponse.json([
      { id: "MOCK001", device: "Router-NYC-01-Mock", message: "High CPU utilization (95%) - MOCKED", severity: "Critical", time: "1 min ago", tenant: "Tenant A" },
      { id: "MOCK002", device: "Switch-LAX-05-Mock", message: "Interface down (Gig0/1) - MOCKED", severity: "Warning", time: "10 min ago", tenant: "Tenant B" },
    ]);
  }),
];
