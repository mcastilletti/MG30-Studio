'use server';

/**
 * @fileOverview AI Agent per il riassunto dei preset NUX MG-30.
 * Genera una descrizione testuale del tono basata sulla catena degli effetti.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PresetSummaryInputSchema = z.object({
  preset: z.any().describe('L\'oggetto preset completo da analizzare'),
});

const PresetSummaryOutputSchema = z.object({
  summary: z.string().describe('Un riassunto creativo e tecnico del preset'),
});

export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const summaryPrompt = ai.definePrompt({
  name: 'presetSummaryPrompt',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  system: "Sei un esperto critico di suoni di chitarra. Analizza i dati tecnici e fornisci un'opinione professionale in italiano.",
  prompt: `Analizza questo preset NUX MG-30 e descrivine il carattere sonoro in modo accattivante.
  
Preset Name: {{{preset.name}}}
Amp Model: {{{preset.ampModel}}}

Catena Effetti: 
{{#if preset.effects}}
{{#each preset.effects}}
- {{type}} ({{model}}): {{#if enabled}}Attivo{{else}}Bypass{{/if}}
{{/each}}
{{/if}}

Fornisci:
1. Genere ideale.
2. Carattere del tono.
3. Un consiglio pratico.

Sii breve e tecnico.`,
});

const presetSummaryFlow = ai.defineFlow(
  {
    name: 'presetSummaryFlow',
    inputSchema: PresetSummaryInputSchema,
    outputSchema: PresetSummaryOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await summaryPrompt(input);
      if (!output || !output.summary) {
        throw new Error('Il modello non ha restituito un riassunto');
      }
      return output;
    } catch (error) {
      console.error("Summary Flow Error:", error);
      throw new Error('Impossibile generare l\'analisi del preset');
    }
  }
);

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  return presetSummaryFlow(input);
}
