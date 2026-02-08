'use server';

/**
 * @fileOverview AI Agent per il riassunto dei preset NUX MG-30.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PresetSummaryInputSchema = z.object({
  preset: z.any(),
});

const PresetSummaryOutputSchema = z.object({
  summary: z.string(),
});

export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const summaryPrompt = ai.definePrompt({
  name: 'presetSummaryPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: PresetSummaryInputSchema },
  output: { schema: PresetSummaryOutputSchema },
  system: "Sei un critico di suoni di chitarra. Analizza i dati tecnici e fornisci un'opinione breve in italiano.",
  prompt: `Analizza questo preset NUX MG-30:
  Nome: {{{preset.name}}}
  Amp: {{{preset.ampModel}}}
  Descrivi il carattere sonoro in 3 punti: Genere, Tono, Consiglio.`,
});

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  try {
    const { output } = await summaryPrompt(input);
    if (!output) throw new Error('Nessun output dall\'AI');
    return output;
  } catch (error) {
    console.error("Summary Flow Error:", error);
    throw new Error('Impossibile generare l\'analisi');
  }
}
