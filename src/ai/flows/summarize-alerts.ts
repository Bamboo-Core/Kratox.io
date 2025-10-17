
'use server';

/**
 * @fileOverview A flow to summarize network alerts across all tenants.
 *
 * - summarizeAlerts - A function that summarizes network alerts.
 * - SummarizeAlertsInput - The input type for the summarizeAlerts function.
 * - SummarizeAlertsOutput - The return type for the summarizeAlerts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeAlertsInputSchema = z.object({
  alerts: z
    .array(
      z.object({
        tenantId: z.string().describe('The ID of the tenant the alert belongs to.'),
        deviceId: z.string().describe('The ID of the device that triggered the alert.'),
        alertMessage: z.string().describe('The alert message.'),
        severity: z.enum(['critical', 'warning', 'info']).describe('The severity of the alert.'),
      })
    )
    .describe('A list of network alerts from all tenants.'),
});
export type SummarizeAlertsInput = z.infer<typeof SummarizeAlertsInputSchema>;

const SummarizeAlertsOutputSchema = z.object({
  summary: z.string().describe('A summary of the current network alerts across all tenants.'),
});
export type SummarizeAlertsOutput = z.infer<typeof SummarizeAlertsOutputSchema>;

export async function summarizeAlerts(input: SummarizeAlertsInput): Promise<SummarizeAlertsOutput> {
  return summarizeAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAlertsPrompt',
  input: { schema: SummarizeAlertsInputSchema },
  output: { schema: SummarizeAlertsOutputSchema },
  prompt: `You are a network operations center (NOC) engineer tasked with summarizing network alerts across multiple tenants.
  Given the following alerts, provide a concise summary of the overall network health, highlighting any critical issues and their potential impact.

  Alerts:
  {{#each alerts}}
  Tenant ID: {{this.tenantId}}
  Device ID: {{this.deviceId}}
  Alert Message: {{this.alertMessage}}
  Severity: {{this.severity}}
  ---
  {{/each}}
  `,
});

const summarizeAlertsFlow = ai.defineFlow(
  {
    name: 'summarizeAlertsFlow',
    inputSchema: SummarizeAlertsInputSchema,
    outputSchema: SummarizeAlertsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
