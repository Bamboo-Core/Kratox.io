
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
      tenantId: z.string().describe("O ID do tenant/cliente a partir do qual o comando deve ser executado."),
    }),
    outputSchema: z.object({
      output: z.string().optional(),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    return executeProbe(input.tenantId, input.command, input.target);
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
        tenantId: z.string().describe("O ID do tenant/cliente proprietário do dispositivo."),
    }),
     outputSchema: z.object({
      output: z.string().optional(),
      error: z.string().optional(),
    }),
  },
  async ({ hostId, command, tenantId }) => {
    try {
        const payload = {
            host: '', // O host real será determinado pelo serviço netmiko a partir do hostId e tenantId
            device_type: '', // O mesmo para device_type
            username: '', // E credenciais
            password: '',
            hostId: hostId,
            command: command,
            tenantId: tenantId,
        };
        const output = await executeCommandViaNetmiko(payload);
        return { output };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error during command execution';
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

      **Diretrizes para Escolha de Ferramentas:**

      1.  **Para conectividade externa:** Se o usuário quer saber se a internet está lenta, testar um site específico (como google.com) ou verificar a latência para um IP público, use a ferramenta \`executeProbeCommand\`. Ela executa 'ping' ou 'traceroute' DE DENTRO da rede do cliente para fora.

      2.  **Para diagnósticos em um dispositivo:** Se o usuário menciona um dispositivo específico (pelo nome ou ID) e quer verificar seu estado, configuração ou logs (ex: "mostre as interfaces do router-sp-01", "qual a versão do firewall acme-fw?"), use a ferramenta \`executeDeviceCommand\`. Ela se conecta diretamente ao equipamento via SSH.

      **Contexto da Requisição:**
      - O ID do cliente (tenant) para esta requisição é: \`${input.tenantId}\`. Você **DEVE** passar este ID para o parâmetro 'tenantId' de qualquer ferramenta que usar.
      - Para a ferramenta \`executeDeviceCommand\`, você precisa do ID do host. Se o usuário mencionar um nome (ex: "router-sp-01"), você deve assumir um ID de host plausível (ex: "10501").

      **Problema a ser diagnosticado:** "${input.objective}"

      Analise o problema, escolha e use a ferramenta mais apropriada. Após receber o resultado da ferramenta, forneça uma resposta final clara e concisa em português.`,
      tools: [executeProbeCommand, executeDeviceCommand],
    });

    const textResponse = llmResponse.text;
    if (textResponse) {
      return { response: textResponse };
    }
    
    const toolResponsePart = llmResponse.output?.content.find((p: Part) => p.toolResponse);
    if (toolResponsePart && toolResponsePart.toolResponse) {
       const toolResponse = toolResponsePart.toolResponse;
       const toolResultSummary = `Resultado da ferramenta ${toolResponse.name}: \n${JSON.stringify(toolResponse.output, null, 2)}`;
       return { response: toolResultSummary };
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
