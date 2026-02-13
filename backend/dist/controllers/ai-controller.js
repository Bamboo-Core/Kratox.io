"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDomains = extractDomains;
exports.extractDomainsFromFileController = extractDomainsFromFileController;
exports.suggestAutomationRule = suggestAutomationRule;
exports.suggestCommandsForAlert = suggestCommandsForAlert;
exports.diagnoseNetwork = diagnoseNetwork;
exports.suggestScript = suggestScript;
exports.analyzeCidrController = analyzeCidrController;
const extract_domains_flow_js_1 = require("../flows/extract-domains-flow.js");
const suggest_rule_flow_js_1 = require("../flows/suggest-rule-flow.js");
const extract_domains_from_file_flow_js_1 = require("../flows/extract-domains-from-file-flow.js");
const suggest_command_flow_js_1 = require("../flows/suggest-command-flow.js");
const execute_probe_command_flow_js_1 = require("../flows/execute-probe-command-flow.js");
const suggest_automation_script_flow_js_1 = require("../flows/suggest-automation-script-flow.js");
/**
 * Handles the request to extract domains from a block of text using Genkit AI flow.
 */
async function extractDomains(req, res) {
    try {
        const validationResult = extract_domains_flow_js_1.ExtractDomainsInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body.',
                details: validationResult.error.flatten(),
            });
        }
        const { text } = validationResult.data;
        const result = await (0, extract_domains_flow_js_1.extractDomainsFromText)({ text });
        console.log('[AI Debug] extractDomains result:', JSON.stringify(result, null, 2));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in extractDomains controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to extract domains using AI.',
            details: message,
        });
    }
}
/**
 * Handles the request to extract domains from a file (e.g., PDF) using Genkit AI flow.
 */
async function extractDomainsFromFileController(req, res) {
    try {
        const validationResult = extract_domains_from_file_flow_js_1.ExtractDomainsFromFileInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body. Expecting fileDataUri.',
                details: validationResult.error.flatten(),
            });
        }
        const { fileDataUri } = validationResult.data;
        const result = await (0, extract_domains_from_file_flow_js_1.extractDomainsFromFile)({ fileDataUri });
        console.log('[AI Debug] extractDomainsFromFile result:', JSON.stringify(result, null, 2));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in extractDomainsFromFile controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to extract domains from file using AI.',
            details: message,
        });
    }
}
/**
 * Handles the request to suggest an automation rule based on a user's description.
 */
async function suggestAutomationRule(req, res) {
    try {
        const validationResult = suggest_rule_flow_js_1.SuggestRuleInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body.',
                details: validationResult.error.flatten(),
            });
        }
        const { description } = validationResult.data;
        const result = await (0, suggest_rule_flow_js_1.suggestRule)({ description });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in suggestAutomationRule controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to suggest rule using AI.',
            details: message,
        });
    }
}
/**
 * Handles the request to suggest diagnostic commands based on an alert.
 */
async function suggestCommandsForAlert(req, res) {
    try {
        const validationResult = suggest_command_flow_js_1.SuggestCommandsInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body.',
                details: validationResult.error.flatten(),
            });
        }
        const { alertMessage, deviceVendor } = validationResult.data;
        const result = await (0, suggest_command_flow_js_1.suggestCommands)({ alertMessage, deviceVendor });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in suggestCommandsForAlert controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to suggest commands using AI.',
            details: message,
        });
    }
}
/**
 * Handles a natural language request to diagnose network issues, potentially using tools.
 */
async function diagnoseNetwork(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        return res.status(403).json({ error: 'Forbidden: Tenant ID is missing.' });
    }
    try {
        const validationResult = execute_probe_command_flow_js_1.DiagnoseNetworkInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body.',
                details: validationResult.error.flatten(),
            });
        }
        // The 'objective' comes from the validated request body.
        const { objective } = validationResult.data;
        // The 'tenantId' comes securely from the authentication token.
        // We pass both to the flow.
        const result = await (0, execute_probe_command_flow_js_1.diagnoseNetworkWithTools)({ objective, tenantId });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in diagnoseNetwork controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to diagnose network issue using AI.',
            details: message,
        });
    }
}
/**
 * Handles the request to suggest an automation script.
 */
async function suggestScript(req, res) {
    try {
        const validationResult = suggest_automation_script_flow_js_1.SuggestAutomationScriptInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body.',
                details: validationResult.error.flatten(),
            });
        }
        const result = await (0, suggest_automation_script_flow_js_1.suggestAutomationScript)(validationResult.data);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in suggestScript controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to suggest script using AI.',
            details: message,
        });
    }
}
const analyze_cidr_flow_js_1 = require("../flows/analyze-cidr-flow.js");
async function analyzeCidrController(req, res) {
    try {
        const validationResult = analyze_cidr_flow_js_1.AnalyzeCidrInputSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body.',
                details: validationResult.error.flatten(),
            });
        }
        const { cidr } = validationResult.data;
        const result = await (0, analyze_cidr_flow_js_1.analyzeCidr)({ cidr });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in analyzeCidr controller:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({
            error: 'Failed to analyze CIDR using AI.',
            details: message,
        });
    }
}
