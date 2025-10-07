
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


// Input schema for the request body, only expects the objective.
export const DiagnoseNetworkInputSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters.'),
});

// The actual input for the flow includes the tenantId, which is added by the controller.
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
 */
const executeProbeCommand = ai.defineTool(
  {
    name: 'executeProbeCommand',
    description: 'Executa um comando de diagnóstico (ping ou traceroute) a partir da rede de um cliente para um alvo específico na internet. Essencial para verificar a conectividade externa do cliente.',
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
    // The `context` object contains flow-specific state, which we use to get the tenantId.
    const flowContext = context as any; // Cast to access custom context properties
    if (!flowContext?.tenantId) {
        return { error: 'Contexto do tenant não encontrado. A ferramenta não pode ser executada.' };
    }
    // Call the underlying service function, passing all necessary context.
    return executeProbe(flowContext.tenantId, input.command, input.target);
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

        Problema a ser diagnosticado: "${input.objective}"
      `,
      model: 'gemini-1.5-flash-latest', // Make sure to use a model that supports tooling
      tools: [executeProbeCommand],
      // Pass the tenantId to the tool execution context.
      context: { tenantId: input.tenantId },
    });

    const textResponse = llmResponse.text;
    if (textResponse) {
      return { response: textResponse };
    }
    
    // If there is no direct text response, it might be because the model wants to use a tool
    // or has finished using a tool. We can provide a generic response or format the tool output.
    const toolResponsePart = llmResponse.output?.content.find((p: Part) => p.toolResponse);
    if (toolResponsePart && toolResponsePart.toolResponse) {
       const toolResponse = toolResponsePart.toolResponse;
       return { response: `Resultado da ferramenta ${toolResponse.name}: \n${JSON.stringify(toolResponse.output)}` };
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
