'use server';

/**
 * @fileOverview Analizzatore sonoro per preset NUX MG-30.
 * Utilizza Gemini 2.0 Flash Lite per fornire un riassunto qualitativo del tono.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PresetSummaryInputSchema = z.object({
  preset: z.any().describe('I dati completi del preset da analizzare'),
});

const PresetSummaryOutputSchema = z.object({
  summary: z.string().describe('Analisi testuale in 3 punti'),
});

export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const summarizePresetPrompt = ai.definePrompt({
  name: 'summarizePresetPrompt',
  model: 'googleai/gemini-2.0-flash-lite-preview-02-05',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  system: "Sei un esperto di suoni per chitarra. Analizza i dati tecnici di un preset NUX MG-30 e descrivi il suono in 3 punti: Genere consigliato, Carattere del tono (es. caldo, tagliente), e un piccolo consiglio tecnico.",
  prompt: `Analizza questo preset:
Nome: {{preset.name}}
Amp: {{preset.ampModel}}
Effetti: {{#each preset.effects}}{{#if enabled}}{{type}} ({{model}}), {{/if}}{{/each}}`,
});

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  const { output } = await summarizePresetPrompt(input);
  if (!output) throw new Error('Impossibile generare l\'analisi del preset.');
  return output;
}
