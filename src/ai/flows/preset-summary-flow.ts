'use server';

/**
 * @fileOverview AI Agent per il riassunto sonoro dei preset NUX MG-30.
 * Utilizza Genkit 1.x con definePrompt per garantire la compatibilità dello schema.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PresetSummaryInputSchema = z.object({
  preset: z.any().describe('I dati completi del preset da analizzare'),
});

const PresetSummaryOutputSchema = z.object({
  summary: z.string().describe('Analisi breve del carattere sonoro'),
});

export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const summarizePresetPrompt = ai.definePrompt({
  name: 'summarizePresetPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  system: "Sei un esperto di suoni per chitarra. Analizza i dati tecnici di un preset NUX MG-30 e descrivi il suono in 3 punti: Genere consigliato, Carattere del tono (es. caldo, tagliente), e un piccolo consiglio tecnico. Rispondi in italiano professionale.",
  prompt: `Analizza questo preset:
  Nome: {{preset.name}}
  Amplificatore: {{preset.ampModel}}
  Effetti: {{#each preset.effects}}{{#if enabled}}{{type}}, {{/if}}{{/each}}`,
});

const summarizePresetFlow = ai.defineFlow(
  {
    name: 'summarizePresetFlow',
    inputSchema: PresetSummaryInputSchema,
    outputSchema: PresetSummaryOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await summarizePresetPrompt(input);
      if (!output) {
        throw new Error('L\'AI non ha prodotto un risultato valido.');
      }
      return output;
    } catch (error: any) {
      console.error("Summary Flow Error:", error);
      throw new Error(error.message || 'Errore durante la generazione dell\'analisi AI');
    }
  }
);

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  return summarizePresetFlow(input);
}
