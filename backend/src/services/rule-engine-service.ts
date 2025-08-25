
import pool from '../config/database.js';
import { extractDomainsFromText } from '../flows/extract-domains-flow.js';

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
    console.log('--- FINISHED RULE ENGINE PROCESSING ---');
}


async function findTenantIdFromHostGroup(hostGroupsStr: string): Promise<string | null> {
    if (!hostGroupsStr) return null;

    const hostGroupNames = hostGroupsStr.split(',').map(name => name.trim());
    
    const userQuery = await pool.query(
        `SELECT u.tenant_id 
         FROM users u
         WHERE EXISTS (
             SELECT 1
             FROM unnest(u.zabbix_hostgroup_ids) AS user_group_id
             WHERE user_group_id = ANY($1::text[])
         )
         LIMIT 1;`,
        [hostGroupNames]
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
