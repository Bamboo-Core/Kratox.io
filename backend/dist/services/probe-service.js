'use server';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeProbeCommand = executeProbeCommand;
const database_js_1 = __importDefault(require("../config/database.js"));
const axios_1 = __importDefault(require("axios"));
const feature_flag_service_js_1 = require("./feature-flag-service.js");
// Get the Probe API URL from environment variables (fallback for old logic)
const PROBE_API_URL = process.env.PROBE_API_URL;
if (!PROBE_API_URL) {
    console.warn('WARNING: PROBE_API_URL is not set. The AI diagnostic tool using probes will not work without a fallback.');
}
/**
 * Executes a command by calling the remote probe microservice.
 * This function now uses a feature flag to determine whether to use
 * a global probe URL or a tenant-specific one from the database.
 *
 * @param tenantId - The ID of the tenant whose probe should be used.
 * @param command - The command to execute ('ping' or 'traceroute').
 * @param target - The destination for the command (e.g., 'google.com').
 * @returns An object containing the command's output or an error.
 */
async function executeProbeCommand(tenantId, command, target) {
    try {
        let probeUrl;
        // Check the feature flag to decide which logic to use
        if ((0, feature_flag_service_js_1.getFeatureFlag)('tenant_specific_probes', tenantId)) {
            // --- NEW LOGIC (controlled by FF) ---
            console.log(`[Probe Service] Feature flag 'tenant_specific_probes' is ON for tenant ${tenantId}.`);
            const tenantResult = await database_js_1.default.query('SELECT probe_api_url FROM tenants WHERE id = $1', [tenantId]);
            if (tenantResult.rowCount === 0 || !tenantResult.rows[0].probe_api_url) {
                return { error: `Nenhum probe de diagnóstico foi configurado para este cliente.` };
            }
            probeUrl = tenantResult.rows[0].probe_api_url;
            console.log(`[Probe Service] Found tenant-specific probe URL: ${probeUrl}`);
        }
        else {
            // --- OLD LOGIC (fallback) ---
            console.log(`[Probe Service] Feature flag 'tenant_specific_probes' is OFF for tenant ${tenantId}. Using global fallback.`);
            probeUrl = PROBE_API_URL;
        }
        // Step 1: Check if a probe URL was determined.
        if (!probeUrl) {
            console.error(`[Probe Service] Could not determine a probe URL for tenant ${tenantId}.`);
            return { error: 'O serviço de diagnóstico (probe) não está configurado no servidor.' };
        }
        console.log(`[Probe Service] Calling probe for tenant ${tenantId} at ${probeUrl} with command: ${command} ${target}`);
        // Step 2: Make the actual API call to the Python probe service.
        const response = await axios_1.default.post(probeUrl, // Use the dynamically determined URL
        { command, target }, { headers: { 'Content-Type': 'application/json' } });
        // Step 3: Return the response from the probe service.
        if (response.data.error) {
            console.error(`[Probe Service] Probe returned an error: ${response.data.error}`);
            return { error: response.data.error };
        }
        return { output: response.data.output };
    }
    catch (error) {
        console.error(`[Probe Service] Error executing probe command for tenant ${tenantId}:`, error);
        if (axios_1.default.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                return { error: 'Não foi possível conectar ao serviço de diagnóstico (probe). Ele pode estar offline ou a URL está incorreta.' };
            }
            return { error: `Erro de comunicação com o serviço de probe: ${error.message}` };
        }
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { error: `Erro interno ao executar o comando no probe: ${message}` };
    }
}
