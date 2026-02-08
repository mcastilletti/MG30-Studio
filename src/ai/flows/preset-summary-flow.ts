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

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  try {
    return await presetSummaryFlow(input);
  } catch (error) {
    console.error("Genkit Flow Error:", error);
    throw new Error('Impossibile generare il riassunto del preset');
  }
}

const summaryPrompt = ai.definePrompt({
  name: 'presetSummaryPrompt',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  prompt: `Sei un esperto sound designer di chitarra. Analizza questo preset per il NUX MG-30 e descrivine il carattere sonoro.
  
Preset Name: {{{preset.name}}}
Amp Model: {{{preset.ampModel}}}

Catena Effetti: 
{{#if preset.effects.length}}
{{#each preset.effects}}
- {{type}} ({{model}}): {{#if enabled}}Attivo{{else}}Bypass{{/if}}
{{/each}}
{{else}}
Nessun effetto aggiuntivo configurato.
{{/if}}

Il tuo compito è fornire un'analisi professionale in italiano che includa:
1. Il genere musicale ideale basato sull'amplificatore e la catena.
2. Descrizione del tono (es. "crunchy e dinamico", "ambient etereo").
3. Un consiglio pratico per l'uso.

Sii conciso, tecnico e accattivante.`,
});

const presetSummaryFlow = ai.defineFlow(
  {
    name: 'presetSummaryFlow',
    inputSchema: PresetSummaryInputSchema,
    outputSchema: PresetSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await summaryPrompt(input);
    if (!output || !output.summary) {
      throw new Error('Il modello non ha restituito un riassunto valido');
    }
    return output;
  }
);
