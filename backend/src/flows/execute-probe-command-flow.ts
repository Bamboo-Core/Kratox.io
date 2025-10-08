
'use server';
/**
 * @fileOverview Um agente de IA que utiliza um conjunto de ferramentas para diagnosticar problemas de rede.
 *
 * - diagnoseNetworkWithTools - A função principal que orquestra o diagnóstico.
 * - executeProbeCommand - Uma ferramenta para executar `ping` ou `traceroute` a partir de um probe na rede do cliente.
 * - executeDeviceCommand - Uma ferramenta para executar comandos de diagnóstico diretamente em um dispositivo de rede via Netmiko.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { executeProbeCommand as executeProbe } from '../services/probe-service.js';
import { executeCommandViaNetmiko } from '../services/netmiko-service.js';
import type { Part } from 'genkit';
import pool from '../config/database.js';
import { decrypt } from '../utils/crypto.js';
import * as zabbixService from '../services/zabbix-service.js';
import type { ZabbixHostInterface } from '../services/zabbix-service.js';


// --- Esquema de Entrada e Saída do Fluxo Principal ---
export const DiagnoseNetworkInputSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters.'),
});
export type DiagnoseNetworkFlowInput = z.infer<typeof DiagnoseNetworkInputSchema> & {
    tenantId: string;
};

export const DiagnoseNetworkOutputSchema = z.object({
  response: z.string().describe('A resposta final, em linguagem natural, para o usuário.'),
});
export type DiagnoseNetworkOutput = z.infer<typeof DiagnoseNetworkOutputSchema>;


// --- Definição da Ferramenta #1: Probe de Rede ---
const executeProbeCommand = ai.defineTool(
  {
    name: 'executeProbeCommand',
    description: "Executa um comando de diagnóstico genérico (ping ou traceroute) a partir de um 'probe' localizado na rede do cliente para um alvo na internet. Ideal para testar a conectividade externa e latência.",
    inputSchema: z.object({
      command: z.enum(['ping', 'traceroute']).describe("O comando a ser executado."),
      target: z.string().describe("O alvo do comando, como um IP ou domínio. Ex: '8.8.8.8' ou 'google.com'."),
    }),
    outputSchema: z.object({
      output: z.string().optional(),
      error: z.string().optional(),
    }),
  },
  async (input, context) => {
    const tenantId = context?.tenantId;
    if (!tenantId) {
        return { error: "Contexto do tenant não encontrado. A ferramenta não sabe em qual rede de cliente executar." };
    }
    return executeProbe(tenantId, input.command, input.target);
  }
);

// --- Definição da Ferramenta #2: Comando em Dispositivo de Rede ---
const executeDeviceCommand = ai.defineTool(
  {
    name: 'executeDeviceCommand',
    description: "Executa um comando de diagnóstico específico (como 'show version', 'display interface brief') diretamente em um dispositivo de rede (roteador, firewall) via SSH. Use esta ferramenta quando o usuário pedir para verificar o estado ou a configuração de um equipamento específico.",
    inputSchema: z.object({
        hostId: z.string().describe("O ID do host (dispositivo) no Zabbix onde o comando será executado."),
        command: z.string().describe("O comando exato a ser executado no CLI do dispositivo."),
    }),
     outputSchema: z.object({
      output: z.string().optional(),
      error: z.string().optional(),
    }),
  },
  async (input, context) => {
    const { hostId, command } = input;
    const tenantId = context?.tenantId;
    
    if (!tenantId) {
        return { error: "Contexto do tenant não encontrado. A ferramenta não sabe a qual cliente o dispositivo pertence." };
    }

    try {
        // 1. Get host details from Zabbix
        const hosts = await zabbixService.getZabbixHosts(tenantId, undefined, [hostId]);
        const host = hosts[0];
        if (!host) {
          return { error: `Host com ID ${hostId} não encontrado no Zabbix para este tenant.` };
        }

        // 2. Determine IP address
        let targetInterface: ZabbixHostInterface | undefined = host.interfaces.find(iface => iface.type === '2');
        if (!targetInterface) {
          targetInterface = host.interfaces.find(iface => iface.main === '1');
        }
        const hostIp = targetInterface?.ip;
        if (!hostIp) {
          return { error: `Não foi possível determinar o endereço IP para o host ${host.name}.` };
        }

        // 3. Fetch credentials from DB
        const credsResult = await pool.query(
            'SELECT username, encrypted_password, port, device_type FROM device_credentials WHERE host_id = $1 AND tenant_id = $2',
            [hostId, tenantId]
        );
        if (credsResult.rowCount === 0) {
            return { error: `Credenciais para o dispositivo ${host.name} (ID: ${hostId}) não estão configuradas. O usuário precisa adicioná-las na página de Dispositivos.` };
        }
        
        const credentials = credsResult.rows[0];
        const decryptedPassword = decrypt(credentials.encrypted_password);

        // 4. Prepare payload for Netmiko service
        const payload = {
            host: hostIp,
            device_type: credentials.device_type,
            command: command,
            username: credentials.username,
            password: decryptedPassword,
            port: credentials.port || 22,
        };

        // 5. Execute command
        const output = await executeCommandViaNetmiko(payload);
        return { output };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido durante a execução do comando no dispositivo.';
        return { error };
    }
  }
);


// --- Definição do Fluxo/Agente Principal ---
const diagnoseNetworkIssuesFlow = ai.defineFlow(
  {
    name: 'diagnoseNetworkIssuesFlow',
    inputSchema: DiagnoseNetworkInputSchema.extend({ tenantId: z.string() }),
    outputSchema: DiagnoseNetworkOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `Você é um engenheiro de redes sênior e especialista em automação. Sua tarefa é diagnosticar um problema de rede descrito por um usuário, utilizando as ferramentas à sua disposição para coletar dados antes de formular uma resposta.

      **Diretrizes Cruciais para Escolha de Ferramentas:**

      1.  **Para conectividade EXTERNA (de dentro para fora):**
          - **Cenário:** O usuário quer saber se a internet está lenta, se um site (como google.com) está acessível, ou verificar latência para um IP público (como 8.8.8.8).
          - **Ferramenta a Usar:** Use **\`executeProbeCommand\`**.
          - **Exemplos de Problema:** "lentidão para acessar o Google", "o cliente não consegue abrir o site X", "verifique a latência para o DNS da Cloudflare".

      2.  **Para diagnósticos em um dispositivo de REDE INTERNO:**
          - **Cenário:** O usuário menciona um dispositivo específico (pelo nome ou ID) e quer verificar seu estado, configuração, ou logs.
          - **Ferramenta a Usar:** Use **\`executeDeviceCommand\`**.
          - **Exemplos de Problema:** "CPU alta no router-sp-01", "mostre as interfaces do firewall acme-fw", "qual a versão do IOS no switch-core?".

      **Contexto da Requisição:**
      - O ID do cliente (tenant) para esta requisição é: \`${input.tenantId}\`.
      - Se você usar a ferramenta \`executeDeviceCommand\`, você precisa do ID do host. Se o usuário mencionar um nome (ex: "router-sp-01"), você deve inferir um ID de host plausível (ex: "10501").

      **Problema a ser diagnosticado:** "${input.objective}"

      Analise o problema, escolha UMA ferramenta e use-a. Após receber o resultado, forneça uma resposta final clara e concisa em português.`,
      tools: [executeProbeCommand, executeDeviceCommand],
      context: { tenantId: input.tenantId },
    });

    const textResponse = llmResponse.text;
    if (textResponse) {
      return { response: textResponse };
    }
    
    const toolResponsePart = llmResponse.output?.content.find((p: Part) => p.toolResponse);
    if (toolResponsePart && toolResponsePart.toolResponse) {
       const toolResponse = toolResponsePart.toolResponse;
       // We create a summary of the tool's result to feed back into the AI for a final answer.
        const llmResponseAfterTool = await ai.generate({
            prompt: `A ferramenta de diagnóstico foi executada.
            
            Ferramenta utilizada: ${toolResponse.name}
            Resultado:
            \`\`\`
            ${JSON.stringify(toolResponse.output, null, 2)}
            \`\`\`

            Com base neste resultado, formule uma resposta final, em português, para o usuário que originalmente pediu para diagnosticar: "${input.objective}". Explique o que o resultado significa de forma clara.`,
        });

       return { response: llmResponseAfterTool.text };
    }

    return { response: "Não foi possível determinar uma resposta. Tente reformular a pergunta." };
  }
);

/**
 * Função exportada para ser usada pelos controllers.
 */
export async function diagnoseNetworkWithTools(input: DiagnoseNetworkFlowInput): Promise<DiagnoseNetworkOutput> {
  return diagnoseNetworkIssuesFlow(input);
}
