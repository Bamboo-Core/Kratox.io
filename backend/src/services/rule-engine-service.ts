
'use server';

import pool from '../config/database.js';
import { extractDomainsFromText } from '../flows/extract-domains-flow.js';
import { getFeatureFlag } from './feature-flag-service.js';
import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { executeCommandViaNetmiko } from './netmiko-service.js';
import { getZabbixHosts } from './zabbix-service.js';
import { decrypt } from '../utils/crypto.js';
import type { ZabbixHostInterface } from './zabbix-service.js';


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

interface ZabbixEventPayload {
    host: string;
    alert_name: string;
    host_groups: string; // Comes as a comma-separated string from Zabbix
}

/**
 * Main function to process an incoming Zabbix event from a webhook.
 * This function is called asynchronously from the controller.
 */
export async function processZabbixEvent(payload: ZabbixEventPayload) {
    console.log('--- STARTING RULE ENGINE PROCESSING ---');
    console.log('Received Payload:', payload);
    
    const tenantId = await findTenantIdFromHostGroup(payload.host_groups);
    if (!tenantId) {
        console.warn(`No tenant found for host groups: ${payload.host_groups}. Aborting rule processing.`);
        return;
    }
    console.log(`Event associated with Tenant ID: ${tenantId}`);

    // Decide which processing path to take based on the feature flag
    if (getFeatureFlag('scriptable_automation_templates', tenantId)) {
        console.log(`[FF ON] Using Scriptable Automation Templates for tenant ${tenantId}.`);
        await processWithTemplates(tenantId, payload);
    } else {
        console.log(`[FF OFF] Using legacy rule engine for tenant ${tenantId}.`);
        await processWithLegacyRules(tenantId, payload);
    }
    
    console.log('--- FINISHED RULE ENGINE PROCESSING ---');
}

// --- NEW LOGIC (FF: ON) ---

const MatchTemplateSchema = z.object({
  best_match_template_id: z.string().describe("The ID of the template that best matches the alert. If no template is a good match, return 'none'."),
  reasoning: z.string().describe("A brief explanation for why this template was chosen.")
});

const matchAlertToTemplate = ai.definePrompt({
    name: "matchAlertToTemplate",
    input: { schema: z.object({ alert_name: z.string(), templates: z.array(z.object({ id: z.string(), trigger_description: z.string() })) }) },
    output: { schema: MatchTemplateSchema },
    prompt: `You are an AI assistant for a network operations center. Your job is to match an incoming Zabbix alert to the most appropriate automation template from a given list.

    Analyze the alert name and compare it against the trigger description of each template. Choose the template that is the best semantic match.

    Alert Name: "{{alert_name}}"

    Available Templates:
    {{#each templates}}
    - Template ID: {{this.id}}
      Trigger Description: "{{this.trigger_description}}"
    {{/each}}

    Your task is to identify the single best matching template ID. If none of the templates are a good fit for the alert, you MUST return 'none' as the template ID.`,
});


async function processWithTemplates(tenantId: string, payload: ZabbixEventPayload) {
    // 1. Get active templates for the tenant
    const templateQuery = await pool.query(
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

    // 2. Use AI to find the best matching template
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
        
        // 3. Execute the script from the matched template
        await executeTemplateActionAndLog(matchedTemplate, tenantId, payload);

    } catch (aiError) {
        console.error('Error during AI template matching:', aiError);
    }
}

async function executeTemplateActionAndLog(template: AutomationTemplate, tenantId: string, payload: ZabbixEventPayload) {
    let status = 'success';
    let message = '';
    let action_details: any = {
        reasoning: `AI matched alert to template "${template.name}".`,
        executed_script: template.action_script.split('\n')
    };

    try {
        const hostsInGroup = await getZabbixHosts(tenantId, payload.host_groups.split(',').map(s => s.trim()));
        const targetHost = hostsInGroup.find(h => h.name === payload.host);

        if (!targetHost) {
            throw new Error(`Host '${payload.host}' not found for tenant.`);
        }
        if (!targetHost.has_credentials) {
            throw new Error(`Credentials for host '${payload.host}' are not configured.`);
        }
        
        // **FIX:** Correctly determine the host's IP address.
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

        // Execute each command in the script
        const commandOutputs = [];
        for (const command of template.action_script.split('\n').filter(Boolean)) {
            const output = await executeCommandViaNetmiko({
                host: hostIp, // **FIX:** Use the resolved IP address.
                device_type: credentials.device_type,
                command: command,
                username: credentials.username,
                password: decrypt(credentials.encrypted_password),
                port: credentials.port || 22,
            });
            commandOutputs.push({ command, output });
        }
        
        action_details.command_results = commandOutputs;
        message = `Successfully executed ${commandOutputs.length} command(s) on ${payload.host}.`;

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
        // We pass NULL for rule_id but use the template name for rule_name
        await pool.query(logQuery, [null, template.name, tenantId, payload, 'run_script_from_template', action_details, status, message]);
    } catch (logError) {
        console.error(`CRITICAL: Failed to write to automation_logs table for template ${template.id}:`, logError);
    }
}


// --- LEGACY LOGIC (FF: OFF) ---

async function processWithLegacyRules(tenantId: string, payload: ZabbixEventPayload) {
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


async function findTenantIdFromHostGroup(hostGroupsStr: string): Promise<string | null> {
    if (!hostGroupsStr) return null;

    // Zabbix might send group names, but our DB stores IDs. This part of the logic needs to be robust.
    // For now, assuming the group name might be usable if the mapping is consistent.
    // A better approach would be to look up group IDs from names via Zabbix API if needed.
    const hostGroupNames = hostGroupsStr.split(',').map(name => name.trim());
    
    // Let's assume zabbix_hostgroup_ids contains IDs, not names. This is a potential mismatch point.
    const userQuery = await pool.query(
        `SELECT u.tenant_id 
         FROM users u
         WHERE EXISTS (
             SELECT 1
             FROM unnest(u.zabbix_hostgroup_ids) AS user_group_id
             WHERE user_group_id = ANY($1::text[])
         )
         LIMIT 1;`,
        [hostGroupNames] // This assumes hostGroupsStr contains IDs.
    );

    if (userQuery.rowCount && userQuery.rowCount > 0) {
        return userQuery.rows[0].tenant_id;
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

function checkConditions(rule: AutomationRule, payload: ZabbixEventPayload): boolean {
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


async function executeActionAndLog(rule: AutomationRule, payload: ZabbixEventPayload) {
    let status = 'success';
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
    } catch (logError) {
        console.error(`CRITICAL: Failed to write to automation_logs table for rule ${rule.id}:`, logError);
    }
}

async function actionBlockDomainFromAlert(tenantId: string, alertText: string) {
    console.log(`Executing action: dns_block_domain_from_alert for tenant ${tenantId}`);
    
    const extractionResult = await extractDomainsFromText({ text: alertText });
    const domains = extractionResult.domains;

    if (!domains || domains.length === 0) {
        return { message: 'No domains found in the alert text. Action finished.', details: { analyzedText: alertText }};
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
