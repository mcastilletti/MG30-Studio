'use server';

/**
 * @fileOverview Analisi sonora AI per preset MG-30.
 * Utilizza Gemini 2.0 Flash Lite via Genkit per un'analisi affidabile.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PresetSummaryInputSchema = z.object({
  preset: z.any().describe('I dati completi del preset da analizzare'),
});

const PresetSummaryOutputSchema = z.object({
  summary: z.string().describe('L\'analisi testuale divisa in 3 punti.'),
});

export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const presetSummaryPrompt = ai.definePrompt({
  name: 'presetSummaryPrompt',
  model: 'googleai/gemini-2.0-flash-lite-preview-02-05',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  system: "Sei un esperto di suoni per chitarra. Analizza i dati tecnici di un preset NUX MG-30 e descrivi il suono in 3 punti: Genere consigliato, Carattere del tono (es. caldo, tagliente), e un piccolo consiglio tecnico. Rispondi in modo conciso.",
  prompt: `Analizza questo preset:
Nome: {{{preset.name}}}
Amp: {{{preset.ampModel}}}
Effetti attivi: {{#each preset.effects}}{{#if enabled}}{{type}} ({{model}}), {{/if}}{{/each}}`,
});

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  const { output } = await presetSummaryPrompt(input);
  if (!output) throw new Error('Analisi AI fallita.');
  return output;
}
