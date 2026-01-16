/**
 * Blocklist Export Service
 * Formats blocked domains into various DNS server formats
 */

export interface BlockedDomainRow {
    domain: string;
    blockedAt: string;
    source_list_name: string | null;
}

export type ExportFormat = 'hosts' | 'unbound' | 'bind' | 'json' | 'csv';

export interface ExportResult {
    content: string;
    contentType: string;
    extension: string;
}

/**
 * Format domains as /etc/hosts file
 * Each line: 0.0.0.0 domain.com
 */
export function formatAsHosts(domains: BlockedDomainRow[], tenantName: string): ExportResult {
    const header = `# DNS Blocklist - Hosts Format
# Generated for: ${tenantName}
# Generated at: ${new Date().toISOString()}
# Total domains: ${domains.length}
#
# Usage: Append to /etc/hosts (Linux/macOS) or C:\\Windows\\System32\\drivers\\etc\\hosts (Windows)
#

`;

    const lines = domains.map(d => `0.0.0.0 ${d.domain}`).join('\n');

    return {
        content: header + lines,
        contentType: 'text/plain',
        extension: 'txt'
    };
}

/**
 * Format domains for Unbound DNS resolver
 * Each line: local-zone: "domain.com" refuse
 */
export function formatAsUnbound(domains: BlockedDomainRow[], tenantName: string): ExportResult {
    const header = `# DNS Blocklist - Unbound Format
# Generated for: ${tenantName}
# Generated at: ${new Date().toISOString()}
# Total domains: ${domains.length}
#
# Usage: Include in unbound.conf or save as separate file and use include: directive
#

server:
`;

    const lines = domains.map(d => `    local-zone: "${d.domain}" refuse`).join('\n');

    return {
        content: header + lines,
        contentType: 'text/plain',
        extension: 'conf'
    };
}

/**
 * Format domains as BIND RPZ zone file
 */
export function formatAsBind(domains: BlockedDomainRow[], tenantName: string): ExportResult {
    const serial = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 10);

    let content = `$TTL 1h
@ IN SOA localhost. root.localhost. (${serial} 1h 15m 30d 2h)
  IN NS  localhost.
;
; RPZ zone file generated for tenant: ${tenantName}
; Generated at: ${new Date().toISOString()}
; Total domains: ${domains.length}
;

`;

    domains.forEach(d => {
        content += `${d.domain} CNAME .\n`;
        content += `*.${d.domain} CNAME .\n`;
    });

    return {
        content,
        contentType: 'text/plain',
        extension: 'zone'
    };
}

/**
 * Format domains as JSON
 */
export function formatAsJson(domains: BlockedDomainRow[], tenantName: string): ExportResult {
    const data = {
        tenant: tenantName,
        generatedAt: new Date().toISOString(),
        count: domains.length,
        domains: domains.map(d => ({
            domain: d.domain,
            blockedAt: d.blockedAt,
            source: d.source_list_name || 'Manual'
        }))
    };

    return {
        content: JSON.stringify(data, null, 2),
        contentType: 'application/json',
        extension: 'json'
    };
}

/**
 * Format domains as CSV
 */
export function formatAsCsv(domains: BlockedDomainRow[], tenantName: string): ExportResult {
    const header = `# DNS Blocklist for ${tenantName}
# Generated at: ${new Date().toISOString()}
domain,blocked_at,source
`;

    const lines = domains.map(d => {
        const source = d.source_list_name || 'Manual';
        return `${d.domain},${d.blockedAt},${source}`;
    }).join('\n');

    return {
        content: header + lines,
        contentType: 'text/csv',
        extension: 'csv'
    };
}

/**
 * Main export function - routes to appropriate formatter
 */
export function formatBlocklist(
    format: ExportFormat,
    domains: BlockedDomainRow[],
    tenantName: string
): ExportResult {
    switch (format) {
        case 'hosts':
            return formatAsHosts(domains, tenantName);
        case 'unbound':
            return formatAsUnbound(domains, tenantName);
        case 'bind':
            return formatAsBind(domains, tenantName);
        case 'json':
            return formatAsJson(domains, tenantName);
        case 'csv':
            return formatAsCsv(domains, tenantName);
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

/**
 * Get available formats with descriptions
 */
export function getAvailableFormats() {
    return [
        { id: 'hosts', name: 'Hosts File', description: 'Formato padrão /etc/hosts. Compatível com Linux, macOS e Windows.', extension: 'txt' },
        { id: 'unbound', name: 'Unbound', description: 'Configuração para Unbound DNS resolver.', extension: 'conf' },
        { id: 'bind', name: 'BIND RPZ', description: 'Response Policy Zone para BIND DNS server.', extension: 'zone' },
        { id: 'json', name: 'JSON', description: 'Lista estruturada em formato JSON para integrações.', extension: 'json' },
        { id: 'csv', name: 'CSV', description: 'Formato CSV para importação em planilhas.', extension: 'csv' },
    ];
}
