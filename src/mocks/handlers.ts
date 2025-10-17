
import { http, HttpResponse } from 'msw';

// --- Dados Mockados ---

const mockHosts = [
  {
    hostid: '10501',
    name: 'Router-SaoPaulo-Core',
    status: '0',
    description: 'Core router for SP datacenter',
    groups: [{ groupid: '15', name: 'Fibra Veloz - SP' }],
    interfaces: [{ interfaceid: '1', ip: '203.0.113.1', main: '1', type: '2' }],
    has_credentials: true,
  },
  {
    hostid: '10502',
    name: 'Router-RioJaneiro-Edge',
    status: '0',
    description: 'Edge router for RJ office',
    groups: [{ groupid: '16', name: 'Fibra Veloz - RJ' }],
    interfaces: [{ interfaceid: '2', ip: '198.51.100.5', main: '1', type: '2' }],
    has_credentials: false,
  },
  {
    hostid: '10601',
    name: 'acme-fw-01',
    status: '0',
    description: 'Main Firewall ACME Inc',
    groups: [{ groupid: '4', name: 'ACME Inc.' }],
    interfaces: [{ interfaceid: '3', ip: '192.0.2.10', main: '1', type: '1' }],
    has_credentials: true,
  },
];

const mockAlerts = [
  {
    eventid: '50123',
    name: 'High latency to Google DNS on Router-SaoPaulo-Core',
    severity: '3', // Average
    acknowledged: '0',
    clock: String(Math.floor(Date.now() / 1000 - 60 * 5)), // 5 minutes ago
    hosts: [{ hostid: '10501', name: 'Router-SaoPaulo-Core' }],
  },
  {
    eventid: '50124',
    name: 'Host acme-fw-01 is unreachable',
    severity: '5', // Disaster
    acknowledged: '0',
    clock: String(Math.floor(Date.now() / 1000 - 60 * 60 * 2)), // 2 hours ago
    hosts: [{ hostid: '10601', name: 'acme-fw-01' }],
  },
  {
    eventid: '50125',
    name: 'Packet loss detected on link to gateway 198.51.100.1',
    severity: '4', // High
    acknowledged: '0',
    clock: String(Math.floor(Date.now() / 1000 - 60 * 30)), // 30 minutes ago
    hosts: [{ hostid: '10502', name: 'Router-RioJaneiro-Edge' }],
  },
  {
    eventid: '50126',
    name: 'CPU utilization is above 90% on acme-fw-01',
    severity: '2', // Warning
    acknowledged: '1',
    clock: String(Math.floor(Date.now() / 1000 - 60 * 60 * 24)), // 1 day ago
    hosts: [{ hostid: '10601', name: 'acme-fw-01' }],
  },
];

// Define your mock API handlers here
export const handlers = [
  http.get('/api/health', (_req) => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // --- Mocks for Zabbix data ---

  http.get('/api/zabbix/alerts', (_req) => {
    return HttpResponse.json(mockAlerts);
  }),

  http.get('/api/zabbix/hosts', (_req) => {
    return HttpResponse.json(mockHosts);
  }),

  // --- Mock for DNS blocking page (for non-admin) ---
  http.get('/api/dns/blocked-domains', (_req) => {
    return HttpResponse.json([
      {
        id: 'uuid-1',
        domain: 'manual-block.com',
        blockedAt: new Date().toISOString(),
        source_list_id: null,
        source_list_name: null,
      },
      {
        id: 'uuid-2',
        domain: 'feed-block.com',
        blockedAt: new Date().toISOString(),
        source_list_id: 'uuid-list-1',
        source_list_name: 'Phishing Feed',
      },
    ]);
  }),
];
