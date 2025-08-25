

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
    
    // 1. Find the tenant associated with the event
    const tenantId = await findTenantIdFromHostGroup(payload.host_groups);
    if (!tenantId) {
        console.warn(`No tenant found for host groups: ${payload.host_groups}. Aborting rule processing.`);
        return;
    }
    console.log(`Event associated with Tenant ID: ${tenantId}`);

    // 2. Fetch all active rules for this tenant
    const activeRules = await getActiveRulesForTenant(tenantId);
    if (activeRules.length === 0) {
        console.log(`No active automation rules for Tenant ID: ${tenantId}.`);
        return;
    }
    console.log(`Found ${activeRules.length} active rule(s) for the tenant.`);

    // 3. Evaluate each rule against the event payload
    for (const rule of activeRules) {
        if (checkConditions(rule, payload)) {
            console.log(`Rule "${rule.name}" MATCHED. Triggering action.`);
            await executeAction(rule, payload);
        } else {
            console.log(`Rule "${rule.name}" did not match.`);
        }
    }
    console.log('--- FINISHED RULE ENGINE PROCESSING ---');
}

/**
 * Finds a tenant ID based on the Zabbix host group names.
 * Zabbix webhooks can send a list of groups as a string. We find the first user
 * associated with any of those groups and return their tenant ID.
 */
async function findTenantIdFromHostGroup(hostGroupsStr: string): Promise<string | null> {
    if (!hostGroupsStr) return null;

    const hostGroupNames = hostGroupsStr.split(',').map(name => name.trim());
    
    // This is a simplification. A more robust system might map host groups directly to tenants.
    // For now, we find a user in that group and assume the tenant.
    const userQuery = await pool.query(
        `SELECT u.tenant_id 
         FROM users u
         JOIN unnest(u.zabbix_hostgroup_ids) WITH ORDINALITY t(group_id, ord) ON TRUE
         JOIN zabbix_hostgroups_cache z ON z.groupid = t.group_id
         WHERE z.name = ANY($1::text[])
         LIMIT 1;`,
        [hostGroupNames]
    );

    if (userQuery.rowCount > 0) {
        return userQuery.rows[0].tenant_id;
    }
    return null;
}

/**
 * Fetches all enabled automation rules for a given tenant ID.
 */
async function getActiveRulesForTenant(tenantId: string): Promise<AutomationRule[]> {
    const result = await pool.query<AutomationRule>(
        'SELECT * FROM automation_rules WHERE tenant_id = $1 AND is_enabled = true',
        [tenantId]
    );
    return result.rows;
}

/**
 * Checks if the incoming Zabbix event payload matches the rule's conditions.
 */
function checkConditions(rule: AutomationRule, payload: ZabbixEventPayload): boolean {
    if (rule.trigger_type !== 'zabbix_alert') {
        return false;
    }

    for (const key in rule.trigger_conditions) {
        const expectedValue = rule.trigger_conditions[key];
        
        if (key === 'alert_name_contains') {
            if (!payload.alert_name || !payload.alert_name.toLowerCase().includes(expectedValue.toLowerCase())) {
                return false; // Condition does not match
            }
        }
        // Future conditions can be added here as `else if` blocks
        else {
            console.warn(`Unknown condition type: ${key} in rule ${rule.id}`);
            return false;
        }
    }
    return true; // All conditions matched
}

/**
 * Executes the action defined in the rule.
 */
async function executeAction(rule: AutomationRule, payload: ZabbixEventPayload) {
    try {
        if (rule.action_type === 'dns_block_domain_from_alert') {
            await actionBlockDomainFromAlert(rule.tenant_id, payload.alert_name);
        }
        // Future actions can be added here as `else if` blocks
        else {
            console.warn(`Unknown action type: ${rule.action_type} in rule ${rule.id}`);
        }
    } catch (error) {
        console.error(`Error executing action for rule "${rule.name}" (ID: ${rule.id}):`, error);
    }
}

/**
 * Action implementation: Extracts domain(s) from alert text and adds them to the blocklist.
 */
async function actionBlockDomainFromAlert(tenantId: string, alertText: string) {
    console.log(`Executing action: dns_block_domain_from_alert for tenant ${tenantId}`);
    
    // 1. Use AI to extract domains
    const extractionResult = await extractDomainsFromText({ text: alertText });
    const domains = extractionResult.domains;

    if (!domains || domains.length === 0) {
        console.log('No domains found in the alert text. Action finished.');
        return;
    }
    console.log(`AI extracted the following domains: ${domains.join(', ')}`);

    // 2. Add each domain to the blocklist
    for (const domain of domains) {
        try {
            await pool.query(
              'INSERT INTO blocked_domains (domain, tenant_id, source_list_id) VALUES ($1, $2, NULL) ON CONFLICT (domain, tenant_id) DO NOTHING',
              [domain, tenantId]
            );
            console.log(`Successfully added or confirmed "${domain}" in blocklist for tenant ${tenantId}.`);
        } catch (dbError) {
            console.error(`Failed to add domain "${domain}" to blocklist for tenant ${tenantId}:`, dbError);
        }
    }
}
