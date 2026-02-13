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
exports.getAllTenants = getAllTenants;
exports.createTenant = createTenant;
exports.updateTenant = updateTenant;
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.getAllBlockedDomains = getAllBlockedDomains;
exports.addBlockedDomainForTenant = addBlockedDomainForTenant;
exports.getAllBlocklists = getAllBlocklists;
exports.deleteBlocklist = deleteBlocklist;
exports.createBlocklist = createBlocklist;
exports.updateBlocklist = updateBlocklist;
exports.getAllAutomationCriteria = getAllAutomationCriteria;
exports.createAutomationCriterion = createAutomationCriterion;
exports.updateAutomationCriterion = updateAutomationCriterion;
exports.deleteAutomationCriterion = deleteAutomationCriterion;
exports.getAllAutomationActions = getAllAutomationActions;
exports.createAutomationAction = createAutomationAction;
exports.updateAutomationAction = updateAutomationAction;
exports.deleteAutomationAction = deleteAutomationAction;
exports.getAllAutomationTemplates = getAllAutomationTemplates;
exports.getAutomationTemplateById = getAutomationTemplateById;
exports.createAutomationTemplate = createAutomationTemplate;
exports.updateAutomationTemplate = updateAutomationTemplate;
exports.deleteAutomationTemplate = deleteAutomationTemplate;
exports.testWhatsapp = testWhatsapp;
exports.testAutomationLog = testAutomationLog;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_js_1 = __importDefault(require("../config/database.js"));
const zabbixService = __importStar(require("../services/zabbix-service.js"));
const whatsapp_service_js_1 = require("../services/whatsapp-service.js"); // Import do novo serviço
// --- Tenant Management ---
async function getAllTenants(req, res) {
    try {
        const result = await database_js_1.default.query('SELECT id, name, created_at, probe_api_url FROM tenants ORDER BY name ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getAllTenants:', error);
        res.status(500).json({ error: 'Failed to retrieve tenants.' });
    }
}
async function createTenant(req, res) {
    const { name, probe_api_url } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Tenant name is required.' });
    }
    try {
        const result = await database_js_1.default.query('INSERT INTO tenants (name, probe_api_url) VALUES ($1, $2) RETURNING id, name, created_at, probe_api_url', [name, probe_api_url || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A tenant with this name already exists.' });
        }
        console.error('Error in createTenant:', error);
        res.status(500).json({ error: 'Failed to create tenant.' });
    }
}
async function updateTenant(req, res) {
    const { id } = req.params;
    const { name, probe_api_url } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Tenant name is required.' });
    }
    try {
        const result = await database_js_1.default.query('UPDATE tenants SET name = $1, probe_api_url = $2 WHERE id = $3 RETURNING id, name, created_at, probe_api_url', [name, probe_api_url || null, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Tenant not found.' });
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A tenant with this name already exists.' });
        }
        console.error('Error in updateTenant:', error);
        res.status(500).json({ error: 'Failed to update tenant.' });
    }
}
// --- User Management ---
async function getAllUsers(req, res) {
    try {
        // 1. Fetch all users from the database
        const userQuery = `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.tenant_id, t.name as tenant_name, u.zabbix_hostgroup_ids, u.phone_number
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.name ASC
    `;
        const userResult = await database_js_1.default.query(userQuery);
        const users = userResult.rows;
        // 2. Fetch all Zabbix host groups to create a map
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(500).json({ error: 'Tenant context not found for Zabbix API call.' });
        }
        const hostGroups = await zabbixService.getZabbixHostGroups(tenantId);
        const hostGroupMap = new Map(hostGroups.map((hg) => [hg.groupid, hg.name]));
        // 3. Enrich users with host group names
        const enrichedUsers = users.map(user => {
            const group_ids = user.zabbix_hostgroup_ids || [];
            const zabbix_group_names = group_ids.map((id) => hostGroupMap.get(id) || `Unknown (ID: ${id})`);
            return {
                ...user,
                zabbix_group_names,
            };
        });
        res.status(200).json(enrichedUsers);
    }
    catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ error: 'Failed to retrieve users.' });
    }
}
async function getUserById(req, res) {
    const { id } = req.params;
    try {
        const query = `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.tenant_id, t.name as tenant_name, u.zabbix_hostgroup_ids, u.phone_number
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `;
        const result = await database_js_1.default.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error(`Error in getUserById for ID ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve user.' });
    }
}
async function getNocAiTenantId() {
    const tenantRes = await database_js_1.default.query("SELECT id FROM tenants WHERE name = 'NOC AI Corp' LIMIT 1");
    if (tenantRes.rowCount === 0) {
        throw new Error("Critical: 'NOC AI Corp' tenant not found.");
    }
    return tenantRes.rows[0].id;
}
async function createUser(req, res) {
    let { name, email, password, role, tenantId, zabbix_hostgroup_ids, phone_number } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields: name, email, password, role.' });
    }
    if (role !== 'admin' && !tenantId) {
        return res.status(400).json({ error: 'Missing required field: tenantId is required for non-admin users.' });
    }
    try {
        if (role === 'admin') {
            tenantId = await getNocAiTenantId();
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const query = `
      INSERT INTO users (name, email, password_hash, role, tenant_id, zabbix_hostgroup_ids, phone_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role, created_at, tenant_id, zabbix_hostgroup_ids, phone_number
    `;
        const hostgroup_ids = Array.isArray(zabbix_hostgroup_ids) ? zabbix_hostgroup_ids : [];
        const result = await database_js_1.default.query(query, [name, email, hashedPassword, role, tenantId, hostgroup_ids, phone_number || null]);
        const tenantResult = await database_js_1.default.query('SELECT name FROM tenants WHERE id = $1', [result.rows[0].tenant_id]);
        const finalUser = { ...result.rows[0], tenant_name: tenantResult.rows[0].name || 'N/A' };
        res.status(201).json(finalUser);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        console.error('Error in createUser:', error);
        res.status(500).json({ error: 'Failed to create user.' });
    }
}
async function updateUser(req, res) {
    const { id } = req.params;
    let { name, email, role, tenantId, password, zabbix_hostgroup_ids, phone_number } = req.body;
    if (!name || !email || !role) {
        return res.status(400).json({ error: 'Missing required fields: name, email, role.' });
    }
    if (role !== 'admin' && !tenantId) {
        return res.status(400).json({ error: 'Missing required field: tenantId is required for non-admin users.' });
    }
    try {
        if (role === 'admin') {
            tenantId = await getNocAiTenantId();
        }
        const hostgroup_ids = Array.isArray(zabbix_hostgroup_ids) ? zabbix_hostgroup_ids : [];
        const updates = [name, email, role, tenantId, hostgroup_ids, phone_number || null];
        let query = `
            UPDATE users
            SET name = $1, email = $2, role = $3, tenant_id = $4, zabbix_hostgroup_ids = $5, phone_number = $6
        `;
        if (password) {
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            updates.push(hashedPassword);
            query += `, password_hash = $${updates.length}`;
        }
        updates.push(id);
        query += `
            WHERE id = $${updates.length}
            RETURNING id, name, email, role, created_at, tenant_id, zabbix_hostgroup_ids, phone_number
        `;
        const result = await database_js_1.default.query(query, updates);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const tenantResult = await database_js_1.default.query('SELECT name FROM tenants WHERE id = $1', [result.rows[0].tenant_id]);
        const finalUser = { ...result.rows[0], tenant_name: tenantResult.rows[0].name || 'N/A' };
        res.status(200).json(finalUser);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        console.error('Error in updateUser:', error);
        res.status(500).json({ error: 'Failed to update user.' });
    }
}
async function deleteUser(req, res) {
    const { id } = req.params;
    try {
        const result = await database_js_1.default.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
}
// --- DNS Management (Admin) ---
async function getAllBlockedDomains(req, res) {
    try {
        const query = `
        SELECT bd.id, bd.domain, bd."blockedAt", bd.tenant_id, t.name as tenant_name
        FROM blocked_domains bd
        JOIN tenants t ON bd.tenant_id = t.id
        ORDER BY t.name, bd.domain;
    `;
        const result = await database_js_1.default.query(query);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getAllBlockedDomains:', error);
        res.status(500).json({ error: 'Failed to retrieve all blocked domains.' });
    }
}
async function addBlockedDomainForTenant(req, res) {
    const { domain, tenantId } = req.body;
    if (!domain || !tenantId) {
        return res.status(400).json({ error: 'Domain and tenantId are required.' });
    }
    try {
        const result = await database_js_1.default.query('INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) RETURNING *', [domain, tenantId]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'This domain is already in the blocklist for this tenant.' });
        }
        console.error('Error in addBlockedDomainForTenant:', error);
        res.status(500).json({ error: 'Failed to add blocked domain.' });
    }
}
// --- DNS Blocklist Management (Admin) ---
async function getAllBlocklists(req, res) {
    try {
        const result = await database_js_1.default.query('SELECT * FROM dns_blocklists ORDER BY name ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getAllBlocklists:', error);
        res.status(500).json({ error: 'Failed to retrieve blocklists.' });
    }
}
async function deleteBlocklist(req, res) {
    const { id } = req.params;
    try {
        // First, remove all tenant subscriptions to this blocklist
        await database_js_1.default.query('DELETE FROM tenant_blocklist_subscriptions WHERE blocklist_id = $1', [id]);
        // Then delete the blocklist itself
        await database_js_1.default.query('DELETE FROM dns_blocklists WHERE id = $1', [id]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteBlocklist:', error);
        res.status(500).json({ error: 'Failed to delete blocklist.' });
    }
}
async function createBlocklist(req, res) {
    const { name, description, source, domains } = req.body;
    if (!name || !domains || !Array.isArray(domains)) {
        return res.status(400).json({ error: 'Name and a list of domains are required.' });
    }
    try {
        const query = `
      INSERT INTO dns_blocklists (name, description, source, domains, updated_at) 
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`;
        const result = await database_js_1.default.query(query, [name, description, source, domains]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A blocklist with this name already exists.' });
        }
        console.error('Error in createBlocklist:', error);
        res.status(500).json({ error: 'Failed to create blocklist.' });
    }
}
async function updateBlocklist(req, res) {
    const { id } = req.params;
    const { name, description, source, domains } = req.body;
    if (!name || !domains || !Array.isArray(domains)) {
        return res.status(400).json({ error: 'Name and a list of domains are required.' });
    }
    try {
        const query = `
            UPDATE dns_blocklists 
            SET name = $1, description = $2, source = $3, domains = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING *`;
        const result = await database_js_1.default.query(query, [name, description, source, domains, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Blocklist not found.' });
        }
        // TODO: Here we should trigger a sync for all subscribed tenants
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A blocklist with this name already exists.' });
        }
        console.error('Error in updateBlocklist:', error);
        res.status(500).json({ error: 'Failed to update blocklist.' });
    }
}
async function getAllAutomationCriteria(req, res) {
    try {
        const result = await database_js_1.default.query('SELECT * FROM automation_criteria ORDER BY label ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getAllAutomationCriteria:', error);
        res.status(500).json({ error: 'Failed to retrieve automation criteria.' });
    }
}
async function createAutomationCriterion(req, res) {
    const { name, label, description, value_type } = req.body;
    if (!name || !label) {
        return res.status(400).json({ error: 'Name and label are required for criteria.' });
    }
    try {
        const query = `
            INSERT INTO automation_criteria (name, label, description, value_type)
            VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await database_js_1.default.query(query, [name, label, description, value_type || 'text']);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A criterion with this name already exists.' });
        }
        console.error('Error in createAutomationCriterion:', error);
        res.status(500).json({ error: 'Failed to create criterion.' });
    }
}
async function updateAutomationCriterion(req, res) {
    const { id } = req.params;
    const { name, label, description, value_type } = req.body;
    if (!name || !label) {
        return res.status(400).json({ error: 'Name and label are required.' });
    }
    try {
        const query = `
            UPDATE automation_criteria 
            SET name = $1, label = $2, description = $3, value_type = $4 
            WHERE id = $5 RETURNING *`;
        const result = await database_js_1.default.query(query, [name, label, description, value_type, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ error: 'Criterion not found.' });
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'A criterion with this name already exists.' });
        }
        console.error('Error in updateAutomationCriterion:', error);
        res.status(500).json({ error: 'Failed to update criterion.' });
    }
}
async function deleteAutomationCriterion(req, res) {
    const { id } = req.params;
    try {
        await database_js_1.default.query('DELETE FROM automation_criteria WHERE id = $1', [id]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteAutomationCriterion:', error);
        res.status(500).json({ error: 'Failed to delete criterion.' });
    }
}
async function getAllAutomationActions(req, res) {
    try {
        const result = await database_js_1.default.query('SELECT * FROM automation_actions ORDER BY label ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getAllAutomationActions:', error);
        res.status(500).json({ error: 'Failed to retrieve automation actions.' });
    }
}
async function createAutomationAction(req, res) {
    const { name, label, description } = req.body;
    if (!name || !label) {
        return res.status(400).json({ error: 'Name and label are required for actions.' });
    }
    try {
        const query = `
            INSERT INTO automation_actions (name, label, description)
            VALUES ($1, $2, $3) RETURNING *`;
        const result = await database_js_1.default.query(query, [name, label, description]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'An action with this name already exists.' });
        }
        console.error('Error in createAutomationAction:', error);
        res.status(500).json({ error: 'Failed to create action.' });
    }
}
async function updateAutomationAction(req, res) {
    const { id } = req.params;
    const { name, label, description } = req.body;
    if (!name || !label) {
        return res.status(400).json({ error: 'Name and label are required.' });
    }
    try {
        const query = `
            UPDATE automation_actions 
            SET name = $1, label = $2, description = $3 
            WHERE id = $4 RETURNING *`;
        const result = await database_js_1.default.query(query, [name, label, description, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ error: 'Action not found.' });
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'An action with this name already exists.' });
        }
        console.error('Error in updateAutomationAction:', error);
        res.status(500).json({ error: 'Failed to update action.' });
    }
}
async function deleteAutomationAction(req, res) {
    const { id } = req.params;
    try {
        await database_js_1.default.query('DELETE FROM automation_actions WHERE id = $1', [id]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteAutomationAction:', error);
        res.status(500).json({ error: 'Failed to delete action.' });
    }
}
// --- Automation Templates Management (Admin) ---
async function getAllAutomationTemplates(req, res) {
    try {
        const result = await database_js_1.default.query('SELECT * FROM automation_templates ORDER BY name ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error in getAllAutomationTemplates:', error);
        res.status(500).json({ error: 'Failed to retrieve automation templates.' });
    }
}
async function getAutomationTemplateById(req, res) {
    const { id } = req.params;
    try {
        const result = await database_js_1.default.query('SELECT * FROM automation_templates WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Template not found.' });
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error in getAutomationTemplateById:', error);
        res.status(500).json({ error: 'Failed to retrieve template.' });
    }
}
async function createAutomationTemplate(req, res) {
    const { name, description, trigger_description, device_vendor, action_script, tenantIds } = req.body;
    if (!name || !trigger_description || !device_vendor || !action_script) {
        return res.status(400).json({ error: 'Missing required fields for template.' });
    }
    const client = await database_js_1.default.connect();
    try {
        await client.query('BEGIN');
        const templateQuery = `
            INSERT INTO automation_templates (name, description, trigger_description, device_vendor, action_script)
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const templateResult = await client.query(templateQuery, [name, description, trigger_description, device_vendor, action_script]);
        const newTemplate = templateResult.rows[0];
        if (tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0) {
            console.log(`Subscribing tenants to new template ${newTemplate.id}:`, tenantIds);
            const subQuery = 'INSERT INTO tenant_template_subscriptions (tenant_id, template_id) SELECT unnest($1::uuid[]), $2';
            await client.query(subQuery, [tenantIds, newTemplate.id]);
        }
        await client.query('COMMIT');
        res.status(201).json(newTemplate);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createAutomationTemplate:', error);
        res.status(500).json({ error: 'Failed to create template.' });
    }
    finally {
        client.release();
    }
}
async function updateAutomationTemplate(req, res) {
    const { id } = req.params;
    const { name, description, trigger_description, device_vendor, action_script, is_enabled } = req.body;
    if (!name || !trigger_description || !device_vendor || !action_script || is_enabled === undefined) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
        const query = `
            UPDATE automation_templates 
            SET name = $1, description = $2, trigger_description = $3, device_vendor = $4, action_script = $5, is_enabled = $6, updated_at = NOW()
            WHERE id = $7 RETURNING *`;
        const result = await database_js_1.default.query(query, [name, description, trigger_description, device_vendor, action_script, is_enabled, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ error: 'Template not found.' });
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error in updateAutomationTemplate:', error);
        res.status(500).json({ error: 'Failed to update template.' });
    }
}
async function deleteAutomationTemplate(req, res) {
    const { id } = req.params;
    try {
        await database_js_1.default.query('DELETE FROM automation_templates WHERE id = $1', [id]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteAutomationTemplate:', error);
        res.status(500).json({ error: 'Failed to delete template.' });
    }
}
/**
 * Novo controller para testar o envio de mensagens do WhatsApp.
 */
async function testWhatsapp(req, res) {
    const { toNumber, message } = req.body;
    if (!toNumber || !message) {
        return res.status(400).json({ error: 'Os campos "toNumber" e "message" são obrigatórios.' });
    }
    try {
        await (0, whatsapp_service_js_1.sendWhatsappMessage)(toNumber, message);
        res.status(200).json({ success: true, message: `Mensagem de teste enviada para o provedor configurado.` });
    }
    catch (error) {
        console.error('Error in testWhatsapp controller:', error);
        const errorMessage = error instanceof Error ? error.message : 'Um erro desconhecido ocorreu.';
        res.status(500).json({ success: false, error: 'Falha ao enviar mensagem de teste.', details: errorMessage });
    }
}
/**
 * Controller para testar a criação de um log de automação e o disparo de notificação.
 * Simula um evento do Zabbix para um host do grupo 15 (ou outro especificado).
 */
async function testAutomationLog(req, res) {
    const { groupId: messageInput } = req.body;
    try {
        // 1. BUSCAR O UUID CORRETO: Em vez de usar "3", buscamos o ID real do tenant.
        const tenantRes = await database_js_1.default.query("SELECT id FROM tenants WHERE name = 'Fibra Veloz Telecom' LIMIT 1");
        if (tenantRes.rowCount === 0) {
            return res.status(404).json({
                error: "Tenant 'Fibra Veloz Telecom' não encontrado.",
                details: "Execute o script de seed do banco de dados para criar os tenants de teste."
            });
        }
        const tenantId = tenantRes.rows[0].id; // Agora temos o UUID correto.
        // 2. Criar Mocks de Host e Evento (lógica mantida)
        const targetGroupId = '15';
        const targetHost = {
            hostid: '0',
            name: 'Host de Simulação (Zabbix Bypass)'
        };
        console.log(`[Test Automation] Host simulado: ${targetHost.name} para o tenant ID: ${tenantId}`);
        const mockEvent = {
            eventid: `test-${Date.now()}`,
            objectid: `trigger-test-${Date.now()}`,
            clock: Math.floor(Date.now() / 1000).toString(),
            value: '1',
            name: `[TESTE] ${messageInput || 'Falha Crítica Simulada'}`,
            hosts: [{ hostid: targetHost.hostid, name: targetHost.name }],
            severity: '4',
        };
        // 3. Inserir o log com o UUID correto
        const logQuery = `
      INSERT INTO automation_logs (rule_id, rule_name, tenant_id, trigger_event, action_type, action_details, status, message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
        const actionDetails = {
            reasoning: 'Teste manual disparado via Painel Admin.',
            target_host: targetHost.name,
            group_id: targetGroupId,
            user_message: messageInput
        };
        const result = await database_js_1.default.query(logQuery, [
            null,
            'Teste Manual de Notificação',
            tenantId, // <<-- AQUI ESTÁ A CORREÇÃO PRINCIPAL
            mockEvent,
            'manual_test',
            actionDetails,
            'success',
            `Log de teste criado com sucesso. Mensagem: ${messageInput || 'Nenhuma'}`
        ]);
        // 4. Disparar a notificação (que agora também recebe o UUID correto)
        const { handleAutomationNotification } = await import('../services/rule-engine-service.js');
        await handleAutomationNotification({
            ruleName: 'Teste Manual de Notificação',
            tenantId: tenantId,
            triggerEvent: mockEvent,
            status: 'success',
            message: `Log de teste criado. Mensagem: ${messageInput || 'Nenhuma mensagem fornecida'}`
        });
        res.status(200).json({
            success: true,
            message: 'Log de automação simulado criado e processo de notificação iniciado.',
            logId: result.rows[0].id,
        });
    }
    catch (error) {
        console.error('Error in testAutomationLog:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
        res.status(500).json({ error: 'Falha ao simular log de automação.', details: errorMessage });
    }
}
