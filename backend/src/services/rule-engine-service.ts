'use server';

import pool from '../config/database.js';
import { extractDomainsFromText } from '../flows/extract-domains-flow.js';
import { getFeatureFlag } from './feature-flag-service.js';
import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { executeCommandViaNetmiko } from './netmiko-service.js';
import { getZabbixHosts, getZabbixEventById } from './zabbix-service.js';
import { decrypt } from '../utils/crypto.js';
import type { ZabbixEvent, ZabbixHostInterface } from './zabbix-service.js';
import { sendWhatsappMessage } from './whatsapp-service.js';

interface AutomationRule {
    id: string;
    tenant_id: string;
    name: string;
    trigger_type: string;
    trigger_conditions: Record<string, any>;
    action_type: string;
    action_params: Record<string, any>;
    is_enabled: boolean;
}

interface AutomationTemplate {
    id: string;
    name: string;
    trigger_description: string;
    action_script: string;
}

export interface ZabbixEventPayload {
    eventid: string;
    [key: string]: any;
}

interface AutomationLogData {
  ruleName: string;
  tenantId: string;
  triggerEvent: ZabbixEvent;
  status: 'success' | 'failure';
  message: string;
}

export async function handleAutomationNotification({
    ruleName,
    tenantId: incomingTenantId, // Renomeamos para evitar confusão
    triggerEvent,
    status,
    message,
  }: AutomationLogData): Promise<void> {
    // --- INÍCIO DO BLOCO PARA HARDCODING ---
    // Força a notificação a sempre usar o tenant 'Fibra Veloz Telecom' para este teste.
    let tenantId: string;
    let hostGroupIds: string[];
  
    const isManualTest = ruleName === 'Teste Manual de Notificação';
  
    if (isManualTest) {
      console.log('[Notification] Teste manual detectado. Usando lógica de mock.');
      try {
        const tenantRes = await pool.query(`SELECT id FROM tenants WHERE name = 'Fibra Veloz Telecom' LIMIT 1`);
        if (tenantRes.rowCount === 0) {
          console.error(`[Notification] CRÍTICO: O tenant de teste 'Fibra Veloz Telecom' não foi encontrado.`);
          return;
        }
        tenantId = tenantRes.rows[0].id;
        // Para o teste, usamos um ID de grupo fixo.
        hostGroupIds = ['15'];
        console.log(`[Notification] Tenant de teste definido como 'Fibra Veloz Telecom' (ID: ${tenantId})`);
      } catch (error) {
        console.error('[Notification] Erro ao buscar o tenant de teste:', error);
        return;
      }
    } else {
      // --- Lógica de produção (para eventos reais do Zabbix) ---
      tenantId = incomingTenantId; // Usa o ID que veio no payload
      try {
        const hostId = triggerEvent.hosts?.[0]?.hostid;
        if (!hostId) {
          console.log('[Notification] Evento real não contém hostid. Abortando.');
          return;
        }
        const hosts = await getZabbixHosts(tenantId, undefined, [hostId], true);
        const host = hosts?.[0];
        if (!host) {
          console.log(`[Notification] Host com ID ${hostId} não encontrado para o tenant ${tenantId}.`);
          return;
        }
        hostGroupIds = host.groups.map(g => g.groupid);
        if (hostGroupIds.length === 0) {
          console.log(`[Notification] Host ${host.name} não pertence a nenhum grupo. Abortando.`);
          return;
        }
      } catch (error) {
        console.error('[Notification] Erro ao processar evento de produção:', error);
        return;
      }
    }
    // --- FIM DO BLOCO DE LÓGICA ---
  
  
    // A partir daqui, o código é o mesmo para teste e produção
    if (!tenantId || !hostGroupIds || hostGroupIds.length === 0) {
      console.log('[Notification] Tenant ID ou Host Group IDs estão faltando após a lógica inicial. Abortando.');
      return;
    }
  
    try {
      // Query corrigida para buscar usuários
      const userQuery = await pool.query(
        `SELECT name, phone_number FROM users 
         WHERE tenant_id = $1
         AND phone_number IS NOT NULL
         AND zabbix_hostgroup_ids && $2::text[]`, // Operador 'overlap'
        [tenantId, hostGroupIds]
      );
  
      if (userQuery.rowCount === 0) {
        console.log(`[Notification] Nenhum usuário encontrado no tenant ${tenantId} para os grupos [${hostGroupIds.join(', ')}] com telefone cadastrado.`);
        return;
      }
  
      console.log(`[Notification] Encontrados ${userQuery.rowCount} usuário(s) para notificar.`);
  
      const notificationMessage = `✅ *${ruleName}*: ${message}\n*Status*: ${status}`;
  
      for (const user of userQuery.rows) {
        console.log(`[Notification] Enviando notificação para ${user.name} (${user.phone_number})`);
        await sendWhatsappMessage(user.phone_number, notificationMessage);
      }
    } catch (error) {
      console.error('[Notification] Erro ao buscar ou notificar usuários:', error);
    }
  }
  

export async function processZabbixEvent(payload: ZabbixEventPayload) {
    console.log('--- STARTING RULE ENGINE PROCESSING ---');
    console.log('Received Payload:', payload);

    if (!payload.eventid) {
        console.warn('Webhook payload is missing "eventid". Aborting.');
        return;
    }
    
    const event = await getZabbixEventById(payload.eventid);
    if (!event) {
        console.warn(`Event with ID ${payload.eventid} not found in Zabbix. Aborting.`);
        return;
    }
    console.log(`Successfully fetched details for event: "${event.name}"`);

    const hostId = event.hosts?.[0]?.hostid;
    if (!hostId) {
        console.warn(`Event ${event.eventid} does not have an associated host. Aborting.`);
        return;
    }

    const tenantId = await findTenantIdFromHost(hostId);
    if (!tenantId) {
        console.warn(`No tenant found for host ID: ${hostId}. Aborting rule processing.`);
        return;
    }
    console.log(`Event associated with Host ID: ${hostId}, Tenant ID: ${tenantId}`);

    const richPayload: ZabbixEvent = {
        ...event,
        alert_name: event.name,
    };

    if (getFeatureFlag('scriptable_automation_templates', tenantId)) {
        console.log(`[FF ON] Using Scriptable Automation Templates for tenant ${tenantId}.`);
        await processWithTemplates(tenantId, richPayload);
    } else {
        console.log(`[FF OFF] Using legacy rule engine for tenant ${tenantId}.`);
        await processWithLegacyRules(tenantId, richPayload);
    }

    console.log('--- FINISHED RULE ENGINE PROCESSING ---');
}

const MatchTemplateSchema = z.object({
    best_match_template_id: z.string().describe("The ID of the template that best matches the alert. If no template is a good match, return 'none'."),
    reasoning: z.string().describe("A brief explanation for why this template was chosen.")
});

const matchAlertToTemplate = ai.definePrompt({
    name: "matchAlertToTemplate",
    input: { schema: z.object({ alert_name: z.string(), templates: z.array(z.object({ id: z.string(), trigger_description: z.string() })) }) },
    output: { schema: MatchTemplateSchema },
    prompt: `You are an AI assistant for a network operations center. Your job is to match an incoming Zabbix alert to the most appropriate automation template from a given list.\n\n    Analyze the alert name and compare it against the trigger description of each template. Choose the template that is the best semantic match.\n\n    Alert Name: "{{alert_name}}"\n\n    Available Templates:\n    {{#each templates}}\n    - Template ID: {{this.id}}\n      Trigger Description: "{{this.trigger_description}}"\n    {{/each}}\n\n    Your task is to identify the single best matching template ID. If none of the templates are a good fit for the alert, you MUST return 'none' as the template ID.`,
});

async function processWithTemplates(tenantId: string, payload: ZabbixEvent) {
    const templateQuery = await pool.query<AutomationTemplate>(
        `SELECT t.id, t.name, t.trigger_description, t.action_script 
         FROM automation_templates t
         JOIN tenant_template_subscriptions s ON t.id = s.template_id
         WHERE s.tenant_id = $1 AND t.is_enabled = true`,
        [tenantId]
    );
    const activeTemplates: AutomationTemplate[] = templateQuery.rows;

    if (activeTemplates.length === 0) {
        console.log(`No active automation templates for Tenant ID: ${tenantId}.`);
        return;
    }
    console.log(`Found ${activeTemplates.length} active template(s) for the tenant.`);

    try {
        const { output } = await matchAlertToTemplate({
            alert_name: payload.alert_name,
            templates: activeTemplates.map(t => ({ id: t.id, trigger_description: t.trigger_description }))
        });

        if (!output || output.best_match_template_id === 'none') {
            console.log(`AI analysis result: No suitable template found for alert "${payload.alert_name}".`);
            return;
        }

        const matchedTemplate = activeTemplates.find(t => t.id === output.best_match_template_id);
        if (!matchedTemplate) {
            console.warn(`AI returned a template ID (${output.best_match_template_id}) that was not found in the active list.`);
            return;
        }

        console.log(`Template "${matchedTemplate.name}" MATCHED with reasoning: ${output.reasoning}. Triggering action.`);
        
        await executeTemplateActionAndLog(matchedTemplate, tenantId, payload);

    } catch (aiError) {
        console.error('Error during AI template matching:', aiError);
    }
}

async function executeTemplateActionAndLog(template: AutomationTemplate, tenantId: string, payload: ZabbixEvent) {
    let status: 'success' | 'failure' = 'success';
    let message = '';
    let action_details: any = {
        reasoning: `AI matched alert to template "${template.name}".`,
        executed_script: template.action_script.split('\n')
    };

    try {
        const hostId = payload.hosts?.[0]?.hostid;
        if (!hostId) {
            throw new Error(`Host ID not found in the event payload.`);
        }

        const hostsInTenant = await getZabbixHosts(tenantId, undefined, [hostId]);
        const targetHost = hostsInTenant[0];

        if (!targetHost) {
            throw new Error(`Host '${hostId}' not found for tenant '${tenantId}'.`);
        }
        if (!targetHost.has_credentials) {
            throw new Error(`Credentials for host '${targetHost.name}' are not configured.`);
        }
        
        let targetInterface: ZabbixHostInterface | undefined = targetHost.interfaces.find(iface => iface.type === '2');
        if (!targetInterface) {
            targetInterface = targetHost.interfaces.find(iface => iface.main === '1');
        }
        const hostIp = targetInterface?.ip;
        if (!hostIp) {
            throw new Error(`Could not determine a suitable IP address for host ${targetHost.name}.`);
        }

        const credsResult = await pool.query(
            'SELECT username, encrypted_password, port, device_type FROM device_credentials WHERE host_id = $1 AND tenant_id = $2',
            [targetHost.hostid, tenantId]
        );
        const credentials = credsResult.rows[0];

        const commandOutputs = [];
        for (const command of template.action_script.split('\n').filter(Boolean)) {
            const output = await executeCommandViaNetmiko({
                host: hostIp,
                device_type: credentials.device_type,
                command: command,
                username: credentials.username,
                password: decrypt(credentials.encrypted_password),
                port: credentials.port || 22,
            });
            commandOutputs.push({ command, output });
        }

        action_details.command_results = commandOutputs;
        message = `Successfully executed ${commandOutputs.length} command(s) on ${targetHost.name}.`;

    } catch (error) {
        status = 'failure';
        message = error instanceof Error ? error.message : 'An unknown error occurred during action execution.';
        console.error(`Error executing action for template "${template.name}" (ID: ${template.id}):`, error);
    }

    try {
        const logQuery = `
            INSERT INTO automation_logs (rule_id, rule_name, tenant_id, trigger_event, action_type, action_details, status, message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await pool.query(logQuery, [null, template.name, tenantId, payload, 'run_script_from_template', action_details, status, message]);
        
        await handleAutomationNotification({
          ruleName: template.name,
          tenantId: tenantId,
          triggerEvent: payload,
          status: status,
          message: message
        });

    } catch (logError) {
        console.error(`CRITICAL: Failed to write to automation_logs table for template ${template.id}:`, logError);
    }
}

async function processWithLegacyRules(tenantId: string, payload: ZabbixEvent) {
    const activeRules = await getActiveRulesForTenant(tenantId);
    if (activeRules.length === 0) {
        console.log(`No active automation rules for Tenant ID: ${tenantId}.`);
        return;
    }
    console.log(`Found ${activeRules.length} active rule(s) for the tenant.`);

    for (const rule of activeRules) {
        if (checkConditions(rule, payload)) {
            console.log(`Rule "${rule.name}" MATCHED. Triggering action.`);
            await executeActionAndLog(rule, payload);
        } else {
            console.log(`Rule "${rule.name}" did not match.`);
        }
    }
}

async function findTenantIdFromHost(hostId: string): Promise<string | null> {
    if (!hostId) return null;

    try {
        const credsQuery = await pool.query(
            'SELECT tenant_id FROM device_credentials WHERE host_id = $1 LIMIT 1',
            [hostId]
        );
        if (credsQuery.rowCount && credsQuery.rowCount > 0) {
            return credsQuery.rows[0].tenant_id;
        }

        const host = (await getZabbixHosts('system-lookup', undefined, [hostId]))[0];
        if (!host || !host.groups || host.groups.length === 0) {
            return null;
        }

        const hostGroupIds = host.groups.map(g => g.groupid);

        const userWithGroupQuery = await pool.query(
            `SELECT tenant_id FROM users WHERE zabbix_hostgroup_ids && $1::text[] LIMIT 1`,
            [hostGroupIds]
        );

        if (userWithGroupQuery.rowCount && userWithGroupQuery.rowCount > 0) {
            return userWithGroupQuery.rows[0].tenant_id;
        }

    } catch (e) {
        console.error("Error finding tenant from host ID:", e);
        return null;
    }

    return null;
}

async function getActiveRulesForTenant(tenantId: string): Promise<AutomationRule[]> {
    const result = await pool.query<AutomationRule>(
        'SELECT * FROM automation_rules WHERE tenant_id = $1 AND is_enabled = true',
        [tenantId]
    );
    return result.rows;
}

function checkConditions(rule: AutomationRule, payload: ZabbixEvent): boolean {
    if (rule.trigger_type !== 'zabbix_alert') {
        return false;
    }

    for (const key in rule.trigger_conditions) {
        const expectedValue = rule.trigger_conditions[key];

        if (key === 'alert_name_contains') {
            if (!payload.alert_name || !payload.alert_name.toLowerCase().includes(expectedValue.toLowerCase())) {
                return false;
            }
        }
        else {
            console.warn(`Unknown condition type: ${key} in rule ${rule.id}`);
            return false;
        }
    }
    return true;
}

async function executeActionAndLog(rule: AutomationRule, payload: ZabbixEvent) {
    let status: 'success' | 'failure' = 'success';
    let message = '';
    let action_details = {};

    try {
        if (rule.action_type === 'dns_block_domain_from_alert') {
            const result = await actionBlockDomainFromAlert(rule.tenant_id, payload.alert_name);
            message = result.message;
            action_details = result.details;
        } else {
            throw new Error(`Unknown action type: ${rule.action_type}`);
        }
    } catch (error) {
        status = 'failure';
        message = error instanceof Error ? error.message : 'An unknown error occurred during action execution.';
        console.error(`Error executing action for rule "${rule.name}" (ID: ${rule.id}):`, error);
    }

    try {
        const logQuery = `
            INSERT INTO automation_logs (rule_id, rule_name, tenant_id, trigger_event, action_type, action_details, status, message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await pool.query(logQuery, [rule.id, rule.name, rule.tenant_id, payload, rule.action_type, action_details, status, message]);

        await handleAutomationNotification({
            ruleName: rule.name,
            tenantId: rule.tenant_id,
            triggerEvent: payload,
            status: status,
            message: message
        });

    } catch (logError) {
        console.error(`CRITICAL: Failed to write to automation_logs table for rule ${rule.id}:`, logError);
    }
}

async function actionBlockDomainFromAlert(tenantId: string, alertText: string) {
    console.log(`Executing action: dns_block_domain_from_alert for tenant ${tenantId}`);

    const extractionResult = await extractDomainsFromText({ text: alertText });
    const domains = extractionResult.domains;

    if (!domains || domains.length === 0) {
        return { message: 'No domains found in the alert text. Action finished.', details: { analyzedText: alertText } };
    }

    console.log(`AI extracted the following domains: ${domains.join(', ')}`);
    const blocked: string[] = [];
    const failed: string[] = [];

    for (const domain of domains) {
        try {
            await pool.query(
                'INSERT INTO blocked_domains (domain, tenant_id, source_list_id) VALUES ($1, $2, NULL) ON CONFLICT (domain, tenant_id) DO NOTHING',
                [domain, tenantId]
            );
            blocked.push(domain);
        } catch (dbError) {
            console.error(`Failed to add domain "${domain}" to blocklist for tenant ${tenantId}:`, dbError);
            failed.push(domain);
        }
    }

    return {
        message: `Blocked ${blocked.length} domain(s). Failed to block ${failed.length}.`,
        details: { blocked, failed }
    };
}
