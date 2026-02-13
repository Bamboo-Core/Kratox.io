"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedIps = getBlockedIps;
exports.addBlockedIp = addBlockedIp;
exports.removeBlockedIp = removeBlockedIp;
exports.updateBlockedIp = updateBlockedIp;
exports.removeAllBlockedIps = removeAllBlockedIps;
exports.getIpExportFormats = getIpExportFormats;
exports.exportBlockedIps = exportBlockedIps;
const database_js_1 = __importDefault(require("../config/database.js"));
const node_net_1 = require("node:net");
const ip_formatter_service_js_1 = require("../services/ip-formatter-service.js");
const isValidIpOrCidr = (input) => {
    if ((0, node_net_1.isIP)(input) !== 0)
        return true;
    const [ip, prefix] = input.split('/');
    if (!ip || !prefix)
        return false;
    const prefixNum = parseInt(prefix, 10);
    if (isNaN(prefixNum))
        return false;
    if ((0, node_net_1.isIPv4)(ip)) {
        return prefixNum >= 0 && prefixNum <= 32;
    }
    if ((0, node_net_1.isIPv6)(ip)) {
        return prefixNum >= 0 && prefixNum <= 128;
    }
    return false;
};
const ipToLong = (ip) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};
const longToIp = (long) => {
    return [
        (long >>> 24) & 255,
        (long >>> 16) & 255,
        (long >>> 8) & 255,
        long & 255
    ].join('.');
};
const normalizeCidr = (input) => {
    return input.trim();
};
async function getBlockedIps(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const result = await database_js_1.default.query('SELECT *, ip_address as domain FROM blocked_ips WHERE tenant_id = $1 ORDER BY "blockedAt" DESC', [tenantId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getBlockedIps:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to retrieve blocked IPs.', details: message });
    }
}
async function addBlockedIp(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const { ip } = req.body;
        if (!ip || typeof ip !== 'string') {
            return res.status(400).json({ error: 'IP address or CIDR is required and must be a string.' });
        }
        if (!isValidIpOrCidr(ip)) {
            return res.status(400).json({ error: 'Invalid format. Must be a valid IP address or CIDR range.' });
        }
        const normalizedIp = normalizeCidr(ip);
        const result = await database_js_1.default.query('INSERT INTO blocked_ips (ip_address, tenant_id) VALUES ($1, $2) RETURNING *', [normalizedIp, tenantId]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error in addBlockedIp:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        // Handle potential unique constraint violation
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res
                .status(409)
                .json({ error: 'This IP address is already in the blocklist for this tenant.' });
        }
        res.status(500).json({ error: 'Failed to add blocked IP.', details: message });
    }
}
// DELETE handler to remove a blocked IP
async function removeBlockedIp(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const { id } = req.params;
        const result = await database_js_1.default.query('DELETE FROM blocked_ips WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (result.rowCount && result.rowCount > 0) {
            res.status(204).send();
        }
        else {
            res.status(404).json({ error: 'IP with the specified ID not found for this tenant.' });
        }
    }
    catch (error) {
        console.error('Error in removeBlockedIp:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to remove blocked IP.', details: message });
    }
}
// PUT handler to update a blocked IP
async function updateBlockedIp(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const { id } = req.params;
        const { ip } = req.body;
        if (!ip || typeof ip !== 'string') {
            return res.status(400).json({ error: 'IP address or CIDR is required and must be a string.' });
        }
        if (!isValidIpOrCidr(ip)) {
            return res.status(400).json({ error: 'Invalid format. Must be a valid IP address or CIDR range.' });
        }
        const normalizedIp = normalizeCidr(ip);
        const result = await database_js_1.default.query('UPDATE blocked_ips SET ip_address = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *', [normalizedIp, id, tenantId]);
        if (result.rowCount && result.rowCount > 0) {
            res.status(200).json(result.rows[0]);
        }
        else {
            res.status(404).json({ error: 'IP with the specified ID not found for this tenant.' });
        }
    }
    catch (error) {
        console.error('Error in updateBlockedIp:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res
                .status(409)
                .json({ error: 'This IP address is already in the blocklist for this tenant.' });
        }
        res.status(500).json({ error: 'Failed to update blocked IP.', details: message });
    }
}
async function removeAllBlockedIps(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        await database_js_1.default.query('DELETE FROM blocked_ips WHERE tenant_id = $1', [tenantId]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in removeAllBlockedIps:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to remove all blocked IPs.', details: message });
    }
}
// --- IP Export Functions ---
/**
 * Get available equipment export formats
 */
async function getIpExportFormats(req, res) {
    res.status(200).json(ip_formatter_service_js_1.EQUIPMENT_FORMATS);
}
/**
 * Export blocked IPs in equipment-specific format
 */
async function exportBlockedIps(req, res) {
    try {
        const tenantId = req.user?.tenantId || req.query.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
        }
        const equipment = req.query.equipment;
        if (!equipment) {
            return res.status(400).json({ error: 'Parameter "equipment" is required.' });
        }
        const validEquipments = ip_formatter_service_js_1.EQUIPMENT_FORMATS.map(f => f.id);
        if (!validEquipments.includes(equipment)) {
            return res.status(400).json({
                error: `Invalid equipment type. Valid options: ${validEquipments.join(', ')}`
            });
        }
        // Fetch all blocked IPs for the tenant
        const result = await database_js_1.default.query('SELECT ip_address FROM blocked_ips WHERE tenant_id = $1 ORDER BY ip_address', [tenantId]);
        const ips = result.rows.map(row => row.ip_address);
        // Format using the appropriate formatter
        const content = (0, ip_formatter_service_js_1.formatIpsForEquipment)(ips, equipment);
        // Get extension for the equipment type
        const formatInfo = ip_formatter_service_js_1.EQUIPMENT_FORMATS.find(f => f.id === equipment);
        const extension = formatInfo?.extension || 'txt';
        // Set response headers
        const timestamp = new Date().toISOString().split('T')[0];
        res.header('Content-Type', 'text/plain; charset=utf-8');
        res.header('Content-Disposition', `inline; filename="blocklist_${equipment}_ip_${timestamp}.${extension}"`);
        res.send(content);
    }
    catch (error) {
        console.error('Error in exportBlockedIps:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to export blocked IPs.', details: message });
    }
}
