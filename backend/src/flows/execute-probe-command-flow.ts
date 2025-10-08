
'use server';
/**
 * @fileOverview A flow to diagnose network issues using tools.
 *
 * - diagnoseNetworkWithTools - A function that handles the network diagnosis process.
 * - executeProbeCommand - A Genkit tool to run commands on a remote probe.
 */

import { ai } from '../config/genkit.js';
import { z } from 'zod';
import { executeProbeCommand as executeProbe } from '../services/probe-service.js';
import type { Part } from 'genkit';


// The input for the flow includes the tenantId, which is added by the controller.
export const DiagnoseNetworkInputSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters.'),
});
export type DiagnoseNetworkFlowInput = z.infer<typeof DiagnoseNetworkInputSchema> & {
    tenantId: string;
};

// Output for the main flow
export const DiagnoseNetworkOutputSchema = z.object({
  response: z.string().describe('The final, user-facing answer from the AI.'),
});
export type DiagnoseNetworkOutput = z.infer<typeof DiagnoseNetworkOutputSchema>;

/**
 * Defines a tool that the AI can use to execute commands on a remote network probe.
 * The tenantId is now an explicit input to the tool.
 */
const executeProbeCommand = ai.defineTool(
  {
    name: 'executeProbeCommand',
    description: 'Executa um comando de diagnóstico (ping ou traceroute) a partir da rede de um cliente para um alvo específico na internet. Essencial para verificar a conectividade externa do cliente.',
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
    // The tenantId now comes directly from the tool's input, provided by the flow.
    return executeProbe(input.tenantId, input.command, input.target);
  }
);


/**
 * Defines the main flow for diagnosing network issues.
 * This flow is equipped with the `executeProbeCommand` tool.
 */
const diagnoseNetworkIssuesFlow = ai.defineFlow(
  {
    name: 'diagnoseNetworkIssuesFlow',
    inputSchema: DiagnoseNetworkInputSchema.extend({ tenantId: z.string() }), // The flow itself needs the tenantId
    outputSchema: DiagnoseNetworkOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `Você é um engenheiro de redes sênior. Sua tarefa é diagnosticar um problema de rede descrito pelo usuário.
        Use as ferramentas disponíveis para coletar informações e, em seguida, forneça uma resposta clara e concisa em português.

        O ID do cliente (tenant) para esta requisição é: ${input.tenantId}. Você DEVE passar este ID para o parâmetro 'tenantId' de qualquer ferramenta que usar.

        Problema a ser diagnosticado: "${input.objective}"
      `,
      tools: [executeProbeCommand],
    });

    const textResponse = llmResponse.text;
    if (textResponse) {
      return { response: textResponse };
    }
    
    // If there is no direct text response, it might be because the model has finished using a tool.
    // We can format the tool output to provide a meaningful response.
    const toolResponsePart = llmResponse.output?.content.find((p: Part) => p.toolResponse);
    if (toolResponsePart && toolResponsePart.toolResponse) {
       const toolResponse = toolResponsePart.toolResponse;
       // Create a summary of the tool's output to send back to the user.
       const toolResultSummary = `Resultado da ferramenta ${toolResponse.name}: \n${JSON.stringify(toolResponse.output, null, 2)}`;
       return { response: toolResultSummary };
    }

    return { response: "Não foi possível determinar uma resposta. Tente reformular a pergunta." };
  }
);

/**
 * Exported wrapper function to be used by controllers.
 * It invokes the Genkit flow.
 */
export async function diagnoseNetworkWithTools(input: DiagnoseNetworkFlowInput): Promise<DiagnoseNetworkOutput> {
  return diagnoseNetworkIssuesFlow(input);
}
