"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutomationLogs = getAutomationLogs;
const database_js_1 = __importDefault(require("../config/database.js"));
async function getAutomationLogs(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    try {
        const result = await database_js_1.default.query('SELECT * FROM automation_logs WHERE tenant_id = $1 ORDER BY executed_at DESC', [tenantId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error fetching automation logs:', error);
        res.status(500).json({ error: 'Failed to retrieve automation logs.' });
    }
}
