import { Request, Response } from 'express';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { z } from 'zod';
import * as zabbixService from '../services/zabbix-service.js';
import { executeProbeCommand } from '../services/probe-service.js';
import { executeCommandViaNetmiko } from '../services/netmiko-service.js';
import pool from '../config/database.js';
import { decrypt } from '../utils/crypto.js';
import type { ZabbixHostInterface } from '../services/zabbix-service.js';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || '',
});

const LANG_INSTRUCTIONS: Record<string, string> = {
    pt: 'Responda sempre em português.',
    'pt-BR': 'Responda sempre em português.',
    es: 'Responde siempre en español.',
    en: 'Always respond in English.',
};

function getLangInstruction(lang: string): string {
    if (LANG_INSTRUCTIONS[lang]) return LANG_INSTRUCTIONS[lang];
    const prefix = lang.split('-')[0];
    return LANG_INSTRUCTIONS[prefix] ?? 'Respond in the same language the user is writing in.';
}

export async function chatPublic(req: Request, res: Response) {
    const { messages, lang } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
    }

    const langInstruction = getLangInstruction(lang || 'pt');

    try {
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            messages,
            system: `You are the virtual assistant of Kratox, a DNS and network management platform for internet service providers (ISPs).
Help visitors with questions about the product, features, plans and how to get started.
Kratox offers: DNS blocking, IP management, network monitoring via Zabbix, automation rules and AI-powered network diagnostics.
Be friendly, concise and professional.
${langInstruction}`,
        });

        result.pipeTextStreamToResponse(res);
    } catch (error) {
        console.error('Public chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.end();
        }
    }
}

export async function chat(req: Request, res: Response) {
    const { messages } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(403).json({ error: 'Tenant ID missing' });
    }

    try {
        const result = await streamText({
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
                    inputSchema: z.object({
                        tenantId: z.string().describe('The tenant ID'),
                        time_from: z.string().optional().describe('Filter alerts from this timestamp'),
                        groupids: z.array(z.string()).optional().describe('Filter by host group IDs'),
                    }),
                    execute: async ({ tenantId, time_from, groupids }: any) => {
                        return await zabbixService.getZabbixAlerts(tenantId, { time_from }, groupids);
                    },
                },
                getZabbixHosts: {
                    description: 'Get monitored hosts from Zabbix.',
                    inputSchema: z.object({
                        tenantId: z.string().describe('The tenant ID'),
                        groupids: z.array(z.string()).optional().describe('Filter by host group IDs'),
                        hostids: z.array(z.string()).optional().describe('Filter by host IDs'),
                    }),
                    execute: async ({ tenantId, groupids, hostids }: any) => {
                        return await zabbixService.getZabbixHosts(tenantId, groupids, hostids);
                    },
                },
                executeProbeCommand: {
                    description: 'Execute a ping or traceroute from a probe in the network.',
                    inputSchema: z.object({
                        tenantId: z.string().describe('The tenant ID'),
                        command: z.enum(['ping', 'traceroute']),
                        target: z.string().describe('Target IP or domain'),
                    }),
                    execute: async ({ tenantId, command, target }: any) => {
                        return await executeProbeCommand(tenantId, command, target);
                    },
                },
                executeDeviceCommand: {
                    description: 'Execute a command on a network device via SSH.',
                    inputSchema: z.object({
                        tenantId: z.string().describe('The tenant ID'),
                        hostId: z.string().describe('The Zabbix Host ID of the device'),
                        command: z.string().describe('The command to run'),
                    }),
                    execute: async ({ tenantId, hostId, command }: any) => {
                        try {
                            const hosts = await zabbixService.getZabbixHosts(tenantId, undefined, [hostId], true);
                            const host = hosts[0];
                            if (!host) return { error: `Host ${hostId} not found.` };

                            let targetInterface: ZabbixHostInterface | undefined = host.interfaces.find(iface => iface.type === '2');
                            if (!targetInterface) targetInterface = host.interfaces.find(iface => iface.main === '1');

                            const hostIp = targetInterface?.ip;
                            if (!hostIp) return { error: `IP not found for host ${host.name}` };

                            const credsResult = await pool.query(
                                'SELECT username, encrypted_password, port, device_type FROM device_credentials WHERE host_id = $1',
                                [hostId]
                            );
                            if (credsResult.rowCount === 0) return { error: 'Credentials not found.' };

                            const credentials = credsResult.rows[0];
                            const decryptedPassword = decrypt(credentials.encrypted_password);

                            const payload = {
                                host: hostIp,
                                device_type: credentials.device_type,
                                command: command,
                                username: credentials.username,
                                password: decryptedPassword,
                                port: credentials.port || 22,
                            };

                            const output = await executeCommandViaNetmiko(payload);
                            return { output };
                        } catch (e: any) {
                            return { error: e.message };
                        }
                    },
                },
            },
        });

        result.pipeTextStreamToResponse(res);

    } catch (error) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.end();
        }
    }
}
