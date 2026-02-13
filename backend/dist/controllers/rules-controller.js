"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRules = getRules;
exports.createRule = createRule;
exports.updateRule = updateRule;
exports.deleteRule = deleteRule;
exports.getAutomationTemplatesForClient = getAutomationTemplatesForClient;
exports.getMyTemplateSubscriptions = getMyTemplateSubscriptions;
exports.subscribeToTemplate = subscribeToTemplate;
exports.unsubscribeFromTemplate = unsubscribeFromTemplate;
const database_js_1 = __importDefault(require("../config/database.js"));
// GET all rules for the current tenant
async function getRules(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    try {
        const result = await database_js_1.default.query('SELECT * FROM automation_rules WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error fetching rules:', error);
        res.status(500).json({ error: 'Failed to retrieve automation rules.' });
    }
}
// POST a new rule for the current tenant
async function createRule(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    const { name, condition_type, condition_value, action_type } = req.body;
    if (!name || !condition_type || !condition_value || !action_type) {
        return res.status(400).json({ error: 'Missing required rule parameters.' });
    }
    // Hardcoded for now, as we only support one trigger and action type
    const trigger_type = 'zabbix_alert';
    const trigger_conditions = { [condition_type]: condition_value };
    const action_params = {}; // No params needed for the current action
    try {
        const query = `
      INSERT INTO automation_rules (tenant_id, name, trigger_type, trigger_conditions, action_type, action_params)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
        const result = await database_js_1.default.query(query, [tenantId, name, trigger_type, trigger_conditions, action_type, action_params]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating rule:', error);
        res.status(500).json({ error: 'Failed to create automation rule.' });
    }
}
// PUT (update) an existing rule for the current tenant
async function updateRule(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    const { id } = req.params;
    const { is_enabled } = req.body;
    if (typeof is_enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid update data. Only is_enabled can be updated.' });
    }
    try {
        const query = `
      UPDATE automation_rules
      SET is_enabled = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING *;
    `;
        const result = await database_js_1.default.query(query, [is_enabled, id, tenantId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Rule not found or you do not have permission to update it.' });
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating rule:', error);
        res.status(500).json({ error: 'Failed to update automation rule.' });
    }
}
// DELETE a rule for the current tenant
async function deleteRule(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    const { id } = req.params;
    try {
        const result = await database_js_1.default.query('DELETE FROM automation_rules WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Rule not found or you do not have permission to delete it.' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting rule:', error);
        res.status(500).json({ error: 'Failed to delete automation rule.' });
    }
}
// --- New Endpoints for Template Subscriptions ---
async function getAutomationTemplatesForClient(req, res) {
    try {
        const templates = await database_js_1.default.query('SELECT * FROM automation_templates WHERE is_enabled = true ORDER BY name ASC');
        res.status(200).json(templates.rows);
    }
    catch (error) {
        console.error('Error fetching templates for client:', error);
        res.status(500).json({ error: 'Failed to retrieve automation templates.' });
    }
}
async function getMyTemplateSubscriptions(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    try {
        const query = 'SELECT template_id FROM tenant_template_subscriptions WHERE tenant_id = $1';
        const result = await database_js_1.default.query(query, [tenantId]);
        res.status(200).json(result.rows.map(row => row.template_id));
    }
    catch (error) {
        console.error('Error fetching template subscriptions:', error);
        res.status(500).json({ error: 'Failed to retrieve subscriptions.' });
    }
}
async function subscribeToTemplate(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    const { templateId } = req.body;
    if (!templateId)
        return res.status(400).json({ error: 'Template ID is required.' });
    try {
        await database_js_1.default.query('INSERT INTO tenant_template_subscriptions (tenant_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [tenantId, templateId]);
        res.status(201).json({ message: 'Subscribed successfully.' });
    }
    catch (error) {
        console.error('Error in subscribeToTemplate:', error);
        res.status(500).json({ error: 'Failed to subscribe to template.' });
    }
}
async function unsubscribeFromTemplate(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId)
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    const { templateId } = req.params;
    try {
        await database_js_1.default.query('DELETE FROM tenant_template_subscriptions WHERE tenant_id = $1 AND template_id = $2', [tenantId, templateId]);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in unsubscribeFromTemplate:', error);
        res.status(500).json({ error: 'Failed to unsubscribe from template.' });
    }
}
