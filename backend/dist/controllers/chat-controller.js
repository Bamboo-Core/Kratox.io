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
exports.chat = chat;
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
const zod_1 = require("zod");
const zabbixService = __importStar(require("../services/zabbix-service.js"));
const probe_service_js_1 = require("../services/probe-service.js");
const netmiko_service_js_1 = require("../services/netmiko-service.js");
const database_js_1 = __importDefault(require("../config/database.js"));
const crypto_js_1 = require("../utils/crypto.js");
const google = (0, google_1.createGoogleGenerativeAI)({
    apiKey: process.env.GOOGLE_API_KEY || '',
});
async function chat(req, res) {
    const { messages } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(403).json({ error: 'Tenant ID missing' });
    }
    try {
        const result = await (0, ai_1.streamText)({
            model: google('gemini-1.5-flash'),
            messages,
            system: `You are a helpful NOC assistant. You have access to Zabbix tools to check alerts, hosts, and run diagnostics.
      The tenantId for this session is: ${tenantId}.
      Always use this tenantId when calling tools.
      
      When the user asks about alerts or hosts, use the respective tools.
      When the user asks to check connectivity (ping/traceroute) to an external target, use executeProbeCommand.
      When the user asks to run a command on a specific device, use executeDeviceCommand.
      
      Be concise and helpful.`,
            tools: {
                getZabbixAlerts: {
                    description: 'Get active Zabbix alerts (problems).',
                    inputSchema: zod_1.z.object({
                        tenantId: zod_1.z.string().describe('The tenant ID'),
                        time_from: zod_1.z.string().optional().describe('Filter alerts from this timestamp'),
                        groupids: zod_1.z.array(zod_1.z.string()).optional().describe('Filter by host group IDs'),
                    }),
                    execute: async ({ tenantId, time_from, groupids }) => {
                        return await zabbixService.getZabbixAlerts(tenantId, { time_from }, groupids);
                    },
                },
                getZabbixHosts: {
                    description: 'Get monitored hosts from Zabbix.',
                    inputSchema: zod_1.z.object({
                        tenantId: zod_1.z.string().describe('The tenant ID'),
                        groupids: zod_1.z.array(zod_1.z.string()).optional().describe('Filter by host group IDs'),
                        hostids: zod_1.z.array(zod_1.z.string()).optional().describe('Filter by host IDs'),
                    }),
                    execute: async ({ tenantId, groupids, hostids }) => {
                        return await zabbixService.getZabbixHosts(tenantId, groupids, hostids);
                    },
                },
                executeProbeCommand: {
                    description: 'Execute a ping or traceroute from a probe in the network.',
                    inputSchema: zod_1.z.object({
                        tenantId: zod_1.z.string().describe('The tenant ID'),
                        command: zod_1.z.enum(['ping', 'traceroute']),
                        target: zod_1.z.string().describe('Target IP or domain'),
                    }),
                    execute: async ({ tenantId, command, target }) => {
                        return await (0, probe_service_js_1.executeProbeCommand)(tenantId, command, target);
                    },
                },
                executeDeviceCommand: {
                    description: 'Execute a command on a network device via SSH.',
                    inputSchema: zod_1.z.object({
                        tenantId: zod_1.z.string().describe('The tenant ID'),
                        hostId: zod_1.z.string().describe('The Zabbix Host ID of the device'),
                        command: zod_1.z.string().describe('The command to run'),
                    }),
                    execute: async ({ tenantId, hostId, command }) => {
                        try {
                            const hosts = await zabbixService.getZabbixHosts(tenantId, undefined, [hostId], true);
                            const host = hosts[0];
                            if (!host)
                                return { error: `Host ${hostId} not found.` };
                            let targetInterface = host.interfaces.find(iface => iface.type === '2');
                            if (!targetInterface)
                                targetInterface = host.interfaces.find(iface => iface.main === '1');
                            const hostIp = targetInterface?.ip;
                            if (!hostIp)
                                return { error: `IP not found for host ${host.name}` };
                            const credsResult = await database_js_1.default.query('SELECT username, encrypted_password, port, device_type FROM device_credentials WHERE host_id = $1', [hostId]);
                            if (credsResult.rowCount === 0)
                                return { error: 'Credentials not found.' };
                            const credentials = credsResult.rows[0];
                            const decryptedPassword = (0, crypto_js_1.decrypt)(credentials.encrypted_password);
                            const payload = {
                                host: hostIp,
                                device_type: credentials.device_type,
                                command: command,
                                username: credentials.username,
                                password: decryptedPassword,
                                port: credentials.port || 22,
                            };
                            const output = await (0, netmiko_service_js_1.executeCommandViaNetmiko)(payload);
                            return { output };
                        }
                        catch (e) {
                            return { error: e.message };
                        }
                    },
                },
            },
        });
        result.pipeTextStreamToResponse(res);
    }
    catch (error) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
        else {
            res.end();
        }
    }
}
