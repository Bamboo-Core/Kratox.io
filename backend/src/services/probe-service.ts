
'use server';

import pool from '../config/database.js';

/**
 * Simulates executing a command on a remote probe.
 * In a real-world scenario, this function would make an HTTP request
 * to the probe's API endpoint. Here, we fetch the probe URL from the DB
 * and return a mocked response.
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
    // Step 1: Find the probe URL for the given tenant.
    const probeResult = await pool.query(
      'SELECT probe_url FROM probes WHERE tenant_id = $1 LIMIT 1',
      [tenantId]
    );

    if (probeResult.rowCount === 0) {
      return { error: `Nenhum probe de diagnóstico foi configurado para este cliente.` };
    }
    const probeUrl = probeResult.rows[0].probe_url;
    console.log(`[Probe Service] Found probe for tenant ${tenantId} at ${probeUrl}. Simulating call...`);

    // Step 2: Simulate the API call to the probe.
    // In a real implementation, you would use a library like 'axios' or 'fetch' here.
    // await axios.get(`${probeUrl}/api/v1/${command}`, { params: { target } });

    // Step 3: Return a mocked, successful response based on the command.
    if (command === 'ping') {
      const mockPingOutput = `
PING ${target} (142.250.218.14): 56 data bytes
64 bytes from 142.250.218.14: icmp_seq=0 ttl=116 time=12.345 ms
64 bytes from 142.250.218.14: icmp_seq=1 ttl=116 time=12.589 ms
64 bytes from 142.250.218.14: icmp_seq=2 ttl=116 time=12.112 ms

--- ${target} ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 12.112/12.349/12.589/0.201 ms
      `.trim();
      return { output: mockPingOutput };
    }

    if (command === 'traceroute') {
      const mockTracerouteOutput = `
traceroute to ${target} (142.250.218.14), 30 hops max, 60 byte packets
 1  gateway (192.168.1.1)  1.234 ms  1.567 ms  1.890 ms
 2  some.isp.router (10.0.0.1)  8.123 ms  8.456 ms  8.789 ms
 ...
 10  final.hop.google (142.250.218.14)  12.345 ms  12.678 ms  12.901 ms
      `.trim();
      return { output: mockTracerouteOutput };
    }
    
    // This case should not be reached due to schema validation in the tool
    return { error: 'Comando desconhecido.' };

  } catch (error) {
    console.error(`[Probe Service] Error executing probe command for tenant ${tenantId}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Erro interno ao executar o comando no probe: ${message}` };
  }
}
