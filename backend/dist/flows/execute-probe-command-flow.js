'use server';
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
exports.DiagnoseNetworkOutputSchema = exports.DiagnoseNetworkInputSchema = void 0;
exports.diagnoseNetworkWithTools = diagnoseNetworkWithTools;
/**
 * @fileOverview Um agente de IA que utiliza um conjunto de ferramentas para diagnosticar problemas de rede.
 *
 * - diagnoseNetworkWithTools - A função principal que orquestra o diagnóstico.
 * - listAvailableDevices - Uma ferramenta para listar os dispositivos disponíveis no tenant.
 * - executeProbeCommand - Uma ferramenta para executar `ping` ou `traceroute` a partir de um probe na rede do cliente.
 * - executeDeviceCommand - Uma ferramenta para executar comandos de diagnóstico diretamente em um dispositivo de rede via Netmiko.
 */
const genkit_js_1 = require("../config/genkit.js");
const zod_1 = require("zod");
const probe_service_js_1 = require("../services/probe-service.js");
const netmiko_service_js_1 = require("../services/netmiko-service.js");
const database_js_1 = __importDefault(require("../config/database.js"));
const crypto_js_1 = require("../utils/crypto.js");
const zabbixService = __importStar(require("../services/zabbix-service.js"));
exports.DiagnoseNetworkInputSchema = zod_1.z.object({
    objective: zod_1.z.string().min(10, 'Objective must be at least 10 characters.'),
});
exports.DiagnoseNetworkOutputSchema = zod_1.z.object({
    response: zod_1.z.string().describe('A resposta final, em linguagem natural, para o usuário.'),
});
const listAvailableDevices = genkit_js_1.ai.defineTool({
    name: 'listAvailableDevices',
    description: 'Lista todos os dispositivos de rede (roteadores, firewalls, switches) disponíveis para o tenant. Use esta ferramenta PRIMEIRO quando o usuário mencionar um dispositivo pelo nome para descobrir o ID correto (hostId) do dispositivo antes de executar comandos nele.',
    inputSchema: zod_1.z.object({
        tenantId: zod_1.z.string().describe('O ID do tenant para o qual listar os dispositivos.'),
    }),
    outputSchema: zod_1.z.object({
        devices: zod_1.z
            .array(zod_1.z.object({
            hostId: zod_1.z.string(),
            name: zod_1.z.string(),
            ip: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            hasCredentials: zod_1.z.boolean(),
        }))
            .describe('Lista de dispositivos disponíveis.'),
        error: zod_1.z.string().optional(),
    }),
}, async (input) => {
    console.log('[listAvailableDevices] Chamada recebida:', JSON.stringify(input, null, 2));
    try {
        const hosts = await zabbixService.getZabbixHosts(input.tenantId, undefined, undefined, true);
        console.log(`[listAvailableDevices] Encontrados ${hosts.length} dispositivos para tenant ${input.tenantId}`);
        const devices = hosts.map((host) => {
            let ip;
            const snmpInterface = host.interfaces.find((iface) => iface.type === '2');
            if (snmpInterface) {
                ip = snmpInterface.ip;
            }
            else {
                const mainInterface = host.interfaces.find((iface) => iface.main === '1');
                ip = mainInterface?.ip;
            }
            return {
                hostId: host.hostid,
                name: host.name,
                ip,
                description: host.description || undefined,
                hasCredentials: host.has_credentials ?? false,
            };
        });
        console.log(`[listAvailableDevices] Retornando ${devices.length} dispositivos`);
        return { devices };
    }
    catch (e) {
        const error = e instanceof Error ? e.message : 'Erro ao listar dispositivos.';
        console.error('[listAvailableDevices] Erro:', error);
        return { devices: [], error };
    }
});
// --- Definição da Ferramenta #1: Probe de Rede ---
const executeProbeCommand = genkit_js_1.ai.defineTool({
    name: 'executeProbeCommand',
    description: "Executa um comando de diagnóstico genérico (ping ou traceroute) a partir de um 'probe' localizado na rede do cliente para um alvo na internet. Ideal para testar a conectividade externa e latência.",
    inputSchema: zod_1.z.object({
        command: zod_1.z.enum(['ping', 'traceroute']).describe('O comando a ser executado.'),
        target: zod_1.z
            .string()
            .describe("O alvo do comando, como um IP ou domínio. Ex: '8.8.8.8' ou 'google.com'."),
        tenantId: zod_1.z.string().describe('O ID do tenant para o qual este comando deve ser executado.'),
    }),
    outputSchema: zod_1.z.object({
        output: zod_1.z.string().optional(),
        error: zod_1.z.string().optional(),
    }),
}, async (input) => {
    console.log('[executeProbeCommand] Chamada recebida:', JSON.stringify(input, null, 2));
    // Passa todos os parâmetros para a função de serviço
    const result = await (0, probe_service_js_1.executeProbeCommand)(input.tenantId, input.command, input.target);
    console.log('[executeProbeCommand] Resultado:', JSON.stringify(result, null, 2));
    return result;
});
// --- Definição da Ferramenta #2: Comando em Dispositivo de Rede ---
const executeDeviceCommand = genkit_js_1.ai.defineTool({
    name: 'executeDeviceCommand',
    description: "Executa um comando de diagnóstico específico (como 'show version', 'display interface brief') diretamente em um dispositivo de rede (roteador, firewall) via SSH. Use esta ferramenta quando o usuário pedir para verificar o estado ou a configuração de um equipamento específico.",
    inputSchema: zod_1.z.object({
        hostId: zod_1.z
            .string()
            .describe('O ID do host (dispositivo) no Zabbix onde o comando será executado.'),
        command: zod_1.z.string().describe('O comando exato a ser executado no CLI do dispositivo.'),
        tenantId: zod_1.z.string().describe('O ID do tenant ao qual o dispositivo pertence.'),
    }),
    outputSchema: zod_1.z.object({
        output: zod_1.z.string().optional(),
        error: zod_1.z.string().optional(),
    }),
}, async (input) => {
    const { hostId, command, tenantId } = input;
    console.log('[executeDeviceCommand] Chamada recebida:', JSON.stringify(input, null, 2));
    try {
        // 1. Get host details from Zabbix
        // Since this tool is for a specific device, we should consider if the user is an admin
        // For simplicity, we assume the initial permission check was done, but an admin needs to see all tenants.
        // The service call now handles the isAdmin logic. For a tool, we might need a way to pass this context.
        // Let's assume the tenantId is sufficient for now and the service handles finding the host.
        const hosts = await zabbixService.getZabbixHosts(tenantId, undefined, [hostId], true); // Pass isAdmin=true to search all
        const host = hosts[0];
        if (!host) {
            return { error: `Host com ID ${hostId} não encontrado.` };
        }
        // 2. Determine IP address
        let targetInterface = host.interfaces.find((iface) => iface.type === '2');
        if (!targetInterface) {
            targetInterface = host.interfaces.find((iface) => iface.main === '1');
        }
        const hostIp = targetInterface?.ip;
        if (!hostIp) {
            return { error: `Não foi possível determinar o endereço IP para o host ${host.name}.` };
        }
        // 3. Fetch credentials from DB
        const credsResult = await database_js_1.default.query('SELECT username, encrypted_password, port, device_type FROM device_credentials WHERE host_id = $1', [hostId]);
        if (credsResult.rowCount === 0) {
            return {
                error: `Credenciais para o dispositivo ${host.name} (ID: ${hostId}) não estão configuradas. O usuário precisa adicioná-las na página de Dispositivos.`,
            };
        }
        const credentials = credsResult.rows[0];
        const decryptedPassword = (0, crypto_js_1.decrypt)(credentials.encrypted_password);
        if (!credentials.device_type) {
            return {
                error: `O tipo de dispositivo (device_type) para ${host.name} não está configurado.`,
            };
        }
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
        console.log('[executeDeviceCommand] Executando comando via Netmiko:', JSON.stringify({ ...payload, password: '***' }, null, 2));
        const output = await (0, netmiko_service_js_1.executeCommandViaNetmiko)(payload);
        console.log('[executeDeviceCommand] Resultado:', output?.substring(0, 200) + '...');
        return { output };
    }
    catch (e) {
        const error = e instanceof Error
            ? e.message
            : 'Erro desconhecido durante a execução do comando no dispositivo.';
        return { error };
    }
});
// --- Definição do Fluxo/Agente Principal ---
const diagnoseNetworkIssuesFlow = genkit_js_1.ai.defineFlow({
    name: 'diagnoseNetworkIssuesFlow',
    inputSchema: exports.DiagnoseNetworkInputSchema.extend({ tenantId: zod_1.z.string() }),
    outputSchema: exports.DiagnoseNetworkOutputSchema,
}, async (input) => {
    console.log('[diagnoseNetworkIssuesFlow] ========== INÍCIO DO FLUXO ==========');
    console.log('[diagnoseNetworkIssuesFlow] Input recebido:', JSON.stringify(input, null, 2));
    const llmResponse = await genkit_js_1.ai.generate({
        prompt: `Você é um engenheiro de redes sênior e especialista em automação. Sua tarefa é diagnosticar um problema de rede descrito por um usuário, utilizando as ferramentas à sua disposição para coletar dados antes de formular uma resposta.

      **Contexto da Requisição:**
      - O ID do cliente (tenantId) para esta requisição é: \`${input.tenantId}\`.
      - **IMPORTANTE:** Você DEVE incluir este \`tenantId\` em todas as chamadas de ferramenta que você fizer.

      **Diretrizes Cruciais para Escolha de Ferramentas:**

      0.  **SEMPRE liste os dispositivos primeiro quando o usuário mencionar um dispositivo:**
          - **Cenário:** O usuário menciona qualquer dispositivo pelo nome (ex: "router-sp-01", "firewall principal", etc.)
          - **Ferramenta a Usar:** Use **\`listAvailableDevices\`** PRIMEIRO para descobrir o ID correto (hostId) do dispositivo.
          - **NUNCA invente ou adivinhe IDs de dispositivos.** Sempre consulte a lista real usando esta ferramenta.

      1.  **Para conectividade EXTERNA (de dentro para fora):**
          - **Cenário:** O usuário quer saber se a internet está lenta, se um site (como google.com) está acessível, ou verificar latência para um IP público (como 8.8.8.8).
          - **Ferramenta a Usar:** Use **\`executeProbeCommand\`**.
          - **Exemplos de Problema:** "lentidão para acessar o Google", "o cliente não consegue abrir o site X", "verifique a latência para o DNS da Cloudflare".

      2.  **Para diagnósticos em um dispositivo de REDE INTERNO:**
          - **Cenário:** O usuário menciona um dispositivo específico (pelo nome ou ID) e quer verificar seu estado, configuração, ou logs.
          - **Procedimento:** 
            1. PRIMEIRO use \`listAvailableDevices\` para encontrar o hostId correto.
            2. DEPOIS use \`executeDeviceCommand\` com o hostId encontrado.
          - **Exemplos de Problema:** "CPU alta no router-sp-01", "mostre as interfaces do firewall acme-fw", "qual a versão do IOS no switch-core?".
          - Se não encontrar o dispositivo mencionado na lista, informe ao usuário quais dispositivos estão disponíveis.

      **Problema a ser diagnosticado:** "${input.objective}"

      Analise o problema, use as ferramentas necessárias (sempre passando o \`tenantId\`), e forneça uma resposta final clara e concisa em português.`,
        tools: [listAvailableDevices, executeProbeCommand, executeDeviceCommand],
    });
    console.log('[diagnoseNetworkIssuesFlow] LLM Response recebida');
    console.log('[diagnoseNetworkIssuesFlow] Tool requests:', JSON.stringify(llmResponse.toolRequests, null, 2));
    const textResponse = llmResponse.text;
    if (textResponse) {
        console.log('[diagnoseNetworkIssuesFlow] Resposta de texto direta:', textResponse.substring(0, 200) + '...');
        return { response: textResponse };
    }
    const toolResponsePart = llmResponse.output?.content.find((p) => p.toolResponse);
    if (toolResponsePart && toolResponsePart.toolResponse) {
        const toolResponse = toolResponsePart.toolResponse;
        // We create a summary of the tool's result to feed back into the AI for a final answer.
        const llmResponseAfterTool = await genkit_js_1.ai.generate({
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
    return { response: 'Não foi possível determinar uma resposta. Tente reformular a pergunta.' };
});
/**
 * Função exportada para ser usada pelos controllers.
 */
async function diagnoseNetworkWithTools(input) {
    return diagnoseNetworkIssuesFlow(input);
}
