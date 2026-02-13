'use server';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommandOnDevice = runCommandOnDevice;
exports.saveDeviceCredentials = saveDeviceCredentials;
exports.getDeviceCredentials = getDeviceCredentials;
const zabbixService = __importStar(require("../services/zabbix-service.js"));
const netmiko_service_js_1 = require("../services/netmiko-service.js");
const database_js_1 = __importDefault(require("../config/database.js"));
const crypto_js_1 = require("../utils/crypto.js");
/**
 * Handles the request to execute a command on a network device.
 */
async function runCommandOnDevice(req, res) {
    const { hostId, command } = req.body;
    if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden: User or Tenant ID is missing.' });
    }
    const { tenantId } = req.user;
    if (!hostId || !command) {
        return res.status(400).json({ error: 'hostId and command are required.' });
    }
    try {
        // 1. Get host details from Zabbix to find its IP address
        const hosts = await zabbixService.getZabbixHosts(tenantId, undefined, [hostId]);
        const host = hosts[0];
        if (!host) {
            return res.status(404).json({ error: 'Host not found in Zabbix.' });
        }
        // --- IP Selection Logic ---
        // Zabbix interface types: 1-Agent, 2-SNMP, 3-IPMI, 4-JMX
        // Prioritize the SNMP interface (type 2) as it's most likely the management IP.
        // If not found, fall back to the main agent interface (type 1 and main=1).
        let targetInterface = host.interfaces.find(iface => iface.type === '2');
        if (!targetInterface) {
            targetInterface = host.interfaces.find(iface => iface.main === '1');
        }
        const hostIp = targetInterface?.ip;
        // --- End IP Selection Logic ---
        if (!hostIp) {
            return res.status(404).json({ error: 'Could not determine a suitable IP address for the host from Zabbix interfaces.' });
        }
        // 2. Fetch credentials for the host from our database
        const credsResult = await database_js_1.default.query('SELECT username, encrypted_password, port, device_type FROM device_credentials WHERE host_id = $1 AND tenant_id = $2', [hostId, tenantId]);
        if (credsResult.rowCount === 0) {
            return res.status(404).json({ error: 'Credentials for this device are not configured.' });
        }
        const credentials = credsResult.rows[0];
        const decryptedPassword = (0, crypto_js_1.decrypt)(credentials.encrypted_password);
        if (!credentials.device_type) {
            return res.status(400).json({ error: 'Device type is not configured for this host.' });
        }
        // 3. Prepare payload for the Netmiko service
        const payload = {
            host: hostIp,
            device_type: credentials.device_type,
            command: command,
            username: credentials.username,
            password: decryptedPassword,
            port: credentials.port || 22, // Use saved port or default to 22
        };
        // 4. Execute the command via the Netmiko service
        const result = await (0, netmiko_service_js_1.executeCommandViaNetmiko)(payload);
        // 5. Return the result
        res.status(200).json({ output: result });
    }
    catch (error) {
        console.error(`Error in runCommandOnDevice for hostId ${hostId}:`, error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: 'Failed to execute command.', details: message });
    }
}
/**
 * Saves or updates credentials for a specific device.
 */
async function saveDeviceCredentials(req, res) {
    const { hostId } = req.params;
    const { username, password, port, device_type } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    if (!username || !password || !device_type) {
        return res.status(400).json({ error: 'Username, password and device_type are required.' });
    }
    // Validate port if provided
    if (port && (isNaN(parseInt(port, 10)) || parseInt(port, 10) <= 0 || parseInt(port, 10) > 65535)) {
        return res.status(400).json({ error: 'Invalid port number provided.' });
    }
    try {
        const encryptedPassword = (0, crypto_js_1.encrypt)(password);
        const dbPort = port ? parseInt(port, 10) : null; // Store as number or NULL
        const query = `
            INSERT INTO device_credentials (host_id, tenant_id, username, encrypted_password, port, device_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (host_id, tenant_id) DO UPDATE 
            SET username = EXCLUDED.username, encrypted_password = EXCLUDED.encrypted_password, port = EXCLUDED.port, device_type = EXCLUDED.device_type, updated_at = NOW();
        `;
        await database_js_1.default.query(query, [hostId, tenantId, username, encryptedPassword, dbPort, device_type]);
        res.status(200).json({ message: 'Credentials saved successfully.' });
    }
    catch (error) {
        console.error(`Error saving credentials for hostId ${hostId}:`, error);
        res.status(500).json({ error: 'Failed to save credentials.' });
    }
}
/**
 * Gets credentials for a specific device.
 */
async function getDeviceCredentials(req, res) {
    const { hostId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    try {
        const result = await database_js_1.default.query('SELECT username, port, device_type FROM device_credentials WHERE host_id = $1 AND tenant_id = $2', [hostId, tenantId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Credentials not found for this device.' });
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error(`Error getting credentials for hostId ${hostId}:`, error);
        res.status(500).json({ error: 'Failed to retrieve credentials.' });
    }
}
