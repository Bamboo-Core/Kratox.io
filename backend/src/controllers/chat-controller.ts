import { Request, Response } from 'express';
import { google } from '@ai-sdk/google';
import { streamText, tool, pipeDataStreamToResponse } from 'ai';
import { z } from 'zod';
import * as zabbixService from '../services/zabbix-service.js';
import { executeProbeCommand } from '../services/probe-service.js';
import { executeCommandViaNetmiko } from '../services/netmiko-service.js';
import pool from '../config/database.js';
import { decrypt } from '../utils/crypto.js';
import type { ZabbixHostInterface } from '../services/zabbix-service.js';

export async function chat(req: Request, res: Response) {
    const { messages } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(403).json({ error: 'Tenant ID missing' });
    }

    try {
        pipeDataStreamToResponse(res, {
            execute: async (dataStreamWriter) => {
                dataStreamWriter.writeData('initialized_call');

                const result = streamText({
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
                        getZabbixAlerts: tool({
                            description: 'Get active Zabbix alerts (problems).',
                            parameters: z.object({
                                tenantId: z.string().describe('The tenant ID'),
                                time_from: z.string().optional().describe('Filter alerts from this timestamp'),
                                groupids: z.array(z.string()).optional().describe('Filter by host group IDs'),
                            }),
                            execute: async ({ tenantId, time_from, groupids }: { tenantId: string, time_from?: string, groupids?: string[] }) => {
                                return await zabbixService.getZabbixAlerts(tenantId, { time_from }, groupids);
                            },
                        }),
                        getZabbixHosts: tool({
                            description: 'Get monitored hosts from Zabbix.',
                            parameters: z.object({
                                tenantId: z.string().describe('The tenant ID'),
                                groupids: z.array(z.string()).optional().describe('Filter by host group IDs'),
                                hostids: z.array(z.string()).optional().describe('Filter by host IDs'),
                            }),
                            execute: async ({ tenantId, groupids, hostids }: { tenantId: string, groupids?: string[], hostids?: string[] }) => {
                                return await zabbixService.getZabbixHosts(tenantId, groupids, hostids);
                            },
                        }),
                        executeProbeCommand: tool({
                            description: 'Execute a ping or traceroute from a probe in the network.',
                            parameters: z.object({
                                tenantId: z.string().describe('The tenant ID'),
                                command: z.enum(['ping', 'traceroute']),
                                target: z.string().describe('Target IP or domain'),
                            }),
                            execute: async ({ tenantId, command, target }: { tenantId: string, command: 'ping' | 'traceroute', target: string }) => {
                                return await executeProbeCommand(tenantId, command, target);
                            },
                        }),
                        executeDeviceCommand: tool({
                            description: 'Execute a command on a network device via SSH.',
                            parameters: z.object({
                                tenantId: z.string().describe('The tenant ID'),
                                hostId: z.string().describe('The Zabbix Host ID of the device'),
                                command: z.string().describe('The command to run'),
                            }),
                            execute: async ({ tenantId, hostId, command }: { tenantId: string, hostId: string, command: string }) => {
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
                        }),
                    },
                });

                result.mergeIntoDataStream(dataStreamWriter);
            },
            onError: (error) => {
                console.error('Chat stream error:', error);
                return 'An error occurred during the chat session.';
            },
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
