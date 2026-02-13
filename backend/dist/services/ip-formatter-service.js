"use strict";
/**
 * IP Blocklist Formatter Service
 * Formats blocked IP addresses for various network equipment vendors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_FORMATS = void 0;
exports.formatForCisco = formatForCisco;
exports.formatForJuniper = formatForJuniper;
exports.formatForHuawei = formatForHuawei;
exports.formatForNokia = formatForNokia;
exports.formatForMikrotik = formatForMikrotik;
exports.formatAsTxt = formatAsTxt;
exports.formatIpsForEquipment = formatIpsForEquipment;
exports.EQUIPMENT_FORMATS = [
    { id: 'default', name: 'Text (TXT)', description: 'Standard text format', extension: 'txt' },
    { id: 'cisco', name: 'Cisco', description: 'Cisco IOS access-list format', extension: 'txt' },
    { id: 'juniper', name: 'Juniper', description: 'Juniper firewall filter format', extension: 'txt' },
    { id: 'huawei', name: 'Huawei', description: 'Huawei ACL configuration', extension: 'txt' },
    { id: 'nokia', name: 'Nokia', description: 'Nokia SR OS IP filter', extension: 'txt' },
    { id: 'mikrotik', name: 'MikroTik', description: 'MikroTik RouterOS address-list', extension: 'rsc' },
    // { id: 'txt', name: 'Text (TXT)', description: 'Plain text list, one IP per line', extension: 'txt' },
];
/**
 * Format IPs for Cisco IOS equipment
 */
function formatForCisco(ips) {
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
function formatForJuniper(ips) {
    const lines = [];
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
function formatForHuawei(ips) {
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
function formatForNokia(ips) {
    const lines = [
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
function formatForMikrotik(ips) {
    const header = `# Blocklist generated on ${new Date().toISOString()}\n# Total entries: ${ips.length}\n/ip firewall address-list\n`;
    const entries = ips.map(ip => `add list=blocklist address=${ip}`).join('\n');
    return header + entries + '\n';
}
/**
 * Format IPs as plain text (one per line)
 */
function formatAsTxt(ips) {
    return ips.join('\n') + '\n';
}
/**
 * Main formatter function - routes to appropriate equipment formatter
 */
function formatIpsForEquipment(ips, equipment) {
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
        case 'default':
        default:
            return formatAsTxt(ips);
    }
}
/**
 * Helper: Convert CIDR prefix to wildcard mask (for Cisco/Huawei)
 */
function cidrToWildcard(prefix) {
    const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
    const wildcard = ~mask >>> 0;
    return [
        (wildcard >>> 24) & 255,
        (wildcard >>> 16) & 255,
        (wildcard >>> 8) & 255,
        wildcard & 255
    ].join('.');
}
