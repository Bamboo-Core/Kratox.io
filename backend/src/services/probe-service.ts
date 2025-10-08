
'use server';

import pool from '../config/database.js';
import axios from 'axios';

// Get the Probe API URL from environment variables
const PROBE_API_URL = process.env.PROBE_API_URL;

if (!PROBE_API_URL) {
  console.warn('WARNING: PROBE_API_URL is not set. The AI diagnostic tool using probes will not work.');
}


/**
 * Executes a command by calling the remote probe microservice.
 *
 * @param tenantId - The ID of the tenant whose probe should be used.
 * @param command - The command to execute ('ping' or 'traceroute').
 * @param target - The destination for the command (e.g., 'google.com').
 * @returns An object containing the command's output or an error.
 */
export async function executeProbeCommand(
  tenantId: string,
  command: 'ping' | 'traceroute',
  target: string
): Promise<{ output?: string; error?: string }> {
  try {
    // Step 1: Check if the probe service is configured.
    if (!PROBE_API_URL) {
      console.error(`[Probe Service] Attempted to run command for tenant ${tenantId} but PROBE_API_URL is not set.`);
      return { error: 'O serviço de diagnóstico (probe) não está configurado no servidor.' };
    }

    // Step 2: In a multi-probe environment, we would look up the specific probe URL for the tenant.
    // For now, we assume a single, globally defined probe service.
    // const probeResult = await pool.query('SELECT probe_url FROM probes WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    // if (probeResult.rowCount === 0) {
    //   return { error: `Nenhum probe de diagnóstico foi configurado para este cliente.` };
    // }
    // const probeUrlForTenant = probeResult.rows[0].probe_url;

    console.log(`[Probe Service] Calling probe for tenant ${tenantId} at ${PROBE_API_URL} with command: ${command} ${target}`);

    // Step 3: Make the actual API call to the Python probe service.
    const response = await axios.post<{ output?: string; error?: string }>(
      `${PROBE_API_URL}/execute-probe`,
      { command, target },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    // Step 4: Return the response from the probe service.
    if (response.data.error) {
      console.error(`[Probe Service] Probe returned an error: ${response.data.error}`);
      return { error: response.data.error };
    }

    return { output: response.data.output };

  } catch (error) {
    console.error(`[Probe Service] Error executing probe command for tenant ${tenantId}:`, error);
    
    if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
            return { error: 'Não foi possível conectar ao serviço de diagnóstico (probe). Ele pode estar offline ou a URL está incorreta.' };
        }
        return { error: `Erro de comunicação com o serviço de probe: ${error.message}` };
    }

    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Erro interno ao executar o comando no probe: ${message}` };
  }
}
