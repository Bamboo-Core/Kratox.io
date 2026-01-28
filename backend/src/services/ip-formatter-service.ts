/**
 * IP Blocklist Formatter Service
 * Formats blocked IP addresses for various network equipment vendors
 */

export type EquipmentType = 'cisco' | 'juniper' | 'huawei' | 'nokia' | 'mikrotik' | 'txt';

export interface EquipmentFormat {
    id: EquipmentType;
    name: string;
    description: string;
    extension: string;
}

export const EQUIPMENT_FORMATS: EquipmentFormat[] = [
    { id: 'cisco', name: 'Cisco', description: 'Cisco IOS access-list format', extension: 'txt' },
    { id: 'juniper', name: 'Juniper', description: 'Juniper firewall filter format', extension: 'txt' },
    { id: 'huawei', name: 'Huawei', description: 'Huawei ACL configuration', extension: 'txt' },
    { id: 'nokia', name: 'Nokia', description: 'Nokia SR OS IP filter', extension: 'txt' },
    { id: 'mikrotik', name: 'MikroTik', description: 'MikroTik RouterOS address-list', extension: 'rsc' },
    { id: 'txt', name: 'Text (TXT)', description: 'Plain text list, one IP per line', extension: 'txt' },
];

/**
 * Format IPs for Cisco IOS equipment
 */
export function formatForCisco(ips: string[]): string {
    const date = new Date().toISOString();
    const header = `! Blocklist generated on ${date}\n! Total entries: ${ips.length}\nip access-list extended BLOCKLIST\n`;
    const rules = ips.map(ip => {
        // Handle CIDR notation
        if (ip.includes('/')) {
            const [addr, prefix] = ip.split('/');
            const mask = cidrToWildcard(parseInt(prefix, 10));
            return ` deny ip ${addr} ${mask} any`;
        }
        return ` deny ip host ${ip} any`;
    }).join('\n');
    return header + rules + '\n permit ip any any\n';
}

/**
 * Format IPs for Juniper equipment
 */
export function formatForJuniper(ips: string[]): string {
    const lines: string[] = [];
    ips.forEach((ip, index) => {
        const termNum = index + 1;
        lines.push(`set firewall family inet filter BLOCKLIST term BLOCK${termNum} from source-address ${ip}`);
        lines.push(`set firewall family inet filter BLOCKLIST term BLOCK${termNum} then discard`);
    });
    // Add final accept term
    lines.push('set firewall family inet filter BLOCKLIST term ACCEPT then accept');
    return lines.join('\n') + '\n';
}

/**
 * Format IPs for Huawei equipment
 */
export function formatForHuawei(ips: string[]): string {
    const header = `#\n# Blocklist generated on ${new Date().toISOString()}\n#\nacl number 3000\n`;
    const rules = ips.map((ip, index) => {
        const ruleNum = (index + 1) * 5;
        if (ip.includes('/')) {
            const [addr, prefix] = ip.split('/');
            const mask = cidrToWildcard(parseInt(prefix, 10));
            return ` rule ${ruleNum} deny ip source ${addr} ${mask}`;
        }
        return ` rule ${ruleNum} deny ip source ${ip} 0`;
    }).join('\n');
    return header + rules + '\n';
}

/**
 * Format IPs for Nokia SR OS equipment
 */
export function formatForNokia(ips: string[]): string {
    const lines: string[] = [
        '/configure filter ip-filter "BLOCKLIST" create',
        '/configure filter ip-filter "BLOCKLIST" default-action accept',
    ];

    ips.forEach((ip, index) => {
        const entryNum = (index + 1) * 10;
        lines.push(`/configure filter ip-filter "BLOCKLIST" entry ${entryNum} create`);
        lines.push(`/configure filter ip-filter "BLOCKLIST" entry ${entryNum} match src-ip ip-prefix-list "${ip}"`);
        lines.push(`/configure filter ip-filter "BLOCKLIST" entry ${entryNum} action drop`);
    });

    return lines.join('\n') + '\n';
}

/**
 * Format IPs for MikroTik RouterOS
 */
export function formatForMikrotik(ips: string[]): string {
    const header = `# Blocklist generated on ${new Date().toISOString()}\n# Total entries: ${ips.length}\n/ip firewall address-list\n`;
    const entries = ips.map(ip => `add list=blocklist address=${ip}`).join('\n');
    return header + entries + '\n';
}

/**
 * Format IPs as plain text (one per line)
 */
export function formatAsTxt(ips: string[]): string {
    return ips.join('\n') + '\n';
}

/**
 * Main formatter function - routes to appropriate equipment formatter
 */
export function formatIpsForEquipment(ips: string[], equipment: EquipmentType): string {
    switch (equipment) {
        case 'cisco':
            return formatForCisco(ips);
        case 'juniper':
            return formatForJuniper(ips);
        case 'huawei':
            return formatForHuawei(ips);
        case 'nokia':
            return formatForNokia(ips);
        case 'mikrotik':
            return formatForMikrotik(ips);
        case 'txt':
        default:
            return formatAsTxt(ips);
    }
}

/**
 * Helper: Convert CIDR prefix to wildcard mask (for Cisco/Huawei)
 */
function cidrToWildcard(prefix: number): string {
    const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
    const wildcard = ~mask >>> 0;
    return [
        (wildcard >>> 24) & 255,
        (wildcard >>> 16) & 255,
        (wildcard >>> 8) & 255,
        wildcard & 255
    ].join('.');
}
