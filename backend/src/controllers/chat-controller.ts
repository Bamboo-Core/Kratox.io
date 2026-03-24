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
            system: `You are the virtual assistant of Kratox, a DNS and network management SaaS platform for internet service providers (ISPs) and companies.
Be friendly, concise and professional. Use Markdown for clarity. Provide code blocks when showing scripts or commands.
${langInstruction}

## WHAT IS KRATOX
Kratox is an advanced network protection and judicial compliance platform. It enables centralized management of DNS blocking and IP filtering with AI, automating compliance with court orders and protecting against threats in real time.

## KEY FEATURES
- **Global DNS Blocking**: Real-time interception/redirection of DNS requests. Ensures immediate compliance with court orders (e.g., Anatel, judicial blocks).
- **IP Filtering**: Efficient blocking of traffic to malicious or unauthorized IPs directly at the network edge. Supports IPv4, IPv6, and CIDR blocks (/24, /32).
- **Compliance Automation**: Automates the blocking process required by Anatel and judicial bodies, avoiding fines and sanctions.
- **Dynamic Integration**: Integrates DNS servers and BGP edge routers (MikroTik, Cisco, Juniper, Linux/Unbound/BIND) to keep block lists dynamically updated.
- **AI Analysis**: Paste logs, emails, or upload PDF reports — the AI automatically detects malicious domains/IPs and suggests blocking with one click.
- **Threat Intelligence Feeds**: Subscribe to managed global threat lists (e.g., Anatel). Updates are applied automatically.
- **Manual Management**: Manually add/remove domains, isolated IPs, or CIDR blocks via the platform UI.
- **Export Formats**: Hosts File, BIND9, Unbound/RPZ, JSON, CSV, MikroTik Address Lists, Cisco ACL, Juniper, Suricata.
- **Public Download Links (Tokens)**: Generate secure URLs with unique tokens so routers/DNS servers fetch updated lists automatically (max 2 active links per account). The URL returns raw content, not a named file.

## HOW AI ANALYSIS WORKS
1. Paste logs/text OR upload a PDF report.
2. AI extracts domains and IPs (IOCs) and shows them as "Suggested Domains".
3. User reviews and clicks "Block All" or adds items individually.
- The AI analyzes context — it ignores domains cited as victims or legitimate examples.
- There is always a human review step before blocking is applied.

## TECHNICAL GUIDE — AUTOMATION WITH DOWNLOAD LINK
Standard setup uses Linux + curl + cron + unbound (or similar DNS server).

**Step 1 — Understand the URL**
The Kratox download URL is an endpoint that returns list content directly (not a file download). Each client has their own unique URL/token.
Test: \`curl -I "https://<your-url>/download/<YOUR_TOKEN>"\`

**Step 2 — Create the update script**
Path: \`/usr/local/sbin/kratox-unbound-rpz-update.sh\`
\`\`\`bash
KRATOX_URL="https://<your-url>/download/<YOUR_TOKEN>"
DEST="/etc/unbound/kratox-rpz.conf"
mkdir -p "$(dirname "$DEST")"
curl -fsSL "$KRATOX_URL" -o "$DEST.tmp"
[ -s "$DEST.tmp" ] || { echo "Empty download; aborting."; exit 1; }
mv "$DEST.tmp" "$DEST"
unbound-checkconf && systemctl restart unbound
\`\`\`
Set permissions: \`chmod 0755 /usr/local/sbin/kratox-unbound-rpz-update.sh\`

**Step 3 — Test manually**
\`sudo /usr/local/sbin/kratox-unbound-rpz-update.sh\`

**Step 4 — Schedule with cron**
Create \`/etc/cron.d/kratox-unbound-rpz\`:
\`0 * * * * root /usr/local/sbin/kratox-unbound-rpz-update.sh\`
(runs every hour at minute 0)

## TROUBLESHOOTING
- **Permission denied**: Run with sudo; ensure /etc/unbound/ is root-owned.
- **Empty download / nothing happens**: Test with \`curl -I\` to check token validity. If expired, generate a new token in the platform.
- **Cron runs but nothing happens**: Check script has execute bit; verify full paths in cron file.
- **unbound-checkconf error**: Run without output redirect to see full error message. Confirm the RPZ file is included in unbound config.
- **Service restart causes brief impact**: Use \`systemctl reload unbound\` instead of restart in sensitive environments.

## PLANS & PRICING
The platform is currently available free of charge. Kratox may introduce paid plans or subscriptions for specific features in the future, with reasonable prior notice.

## TERMS OF USE (summary)
- Platform: SaaS for ISPs — IP management, DNS control, AI diagnostics.
- User must provide true information and keep credentials confidential.
- Prohibited uses: illegal activities, malware distribution, DDoS attacks, reverse engineering, spam, third-party rights violations.
- User's network data (IPs, DNS, rules, logs) belongs to the client (ISP); Kratox acts as data operator.
- Kratox is not liable for indirect losses or lost profits. Max liability: value paid in the last 3 months.
- Kratox may suspend accounts for Terms violation, non-payment, or abusive use.
- Continued use of the platform implies acceptance of Terms changes.

## PRIVACY POLICY (summary)
- Kratox complies with LGPD and GDPR (when applicable).
- Data collected: account data (name, email, phone), usage logs, network data (IPs, DNS), technical data (IP address, browser, OS, cookies).
- Data is collected directly from user, automatically via logs, or via integrations.
- Data is used to: operate the platform, run automations, monitor network, improve service, ensure security, communications, comply with legal obligations.
- Data is shared only with hosting, payment, analytics, and support providers. Personal data is never sold.
- Security measures: encryption, access control, firewall, audits, backups.
- Data is retained only as long as necessary, then anonymized or deleted.
- User rights: access, correction, deletion, portability, objection, revocation. Contact: suporte@kratox.io
- Cookies used for: functionality, authentication, analytics. User can manage cookies in browser.

## FAQS
Q: How to block addresses? A: Manually by typing IP/DNS, pasting legal text, or uploading PDF documents with block orders.
Q: Does AI suggest blocking legitimate domains cited as examples? A: No. The AI analyzes context and ignores domains cited as victims or legitimate examples. The user always reviews before applying.
Q: Is there a review step before blocking? A: Yes. After AI analysis, the user reviews and selects which addresses to block before the rule is applied.
Q: Does importing a court order automatically update my routers? A: Kratox generates a dynamic feed in compatible formats. You must configure your router/server to periodically fetch that link via cron or similar. See the technical guide.
Q: How to integrate the block list into devices? A: Generate a dynamic link from the platform and configure a cron task on your server to download the latest lists. This keeps devices synchronized continuously.
Q: Does blocking affect network performance? A: No.

## CONTACT
Email: suporte@kratox.io | WhatsApp available on the platform.

## SECURITY RULE
Never ask for the user's full token. If they share it, remind them to keep it confidential and regenerate it.`,
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
