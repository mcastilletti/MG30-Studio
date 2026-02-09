'use server';

/**
 * @fileOverview Analisi sonora AI per preset MG-30.
 * Utilizza Gemini 2.0 Flash Lite per un'analisi dettagliata.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// Assicurati che nel file genkit.ts sia configurato il plugin googleAI
import { gemini20FlashLite } from '@genkit-ai/googleai'; 

const PresetSummaryInputSchema = z.object({
  preset: z.any().describe('I dati completi del preset da analizzare'),
});

const PresetSummaryOutputSchema = z.object({
  summary: z.string().describe("L'analisi testuale divisa in 3 punti."),
});

export type PresetSummaryInput = z.infer<typeof PresetSummaryInputSchema>;
export type PresetSummaryOutput = z.infer<typeof PresetSummaryOutputSchema>;

const presetSummaryPrompt = ai.definePrompt(
  {
    name: 'presetSummaryPrompt',
    // Usa il riferimento diretto al modello se disponibile nel tuo setup genkit
    model: 'googleai/gemini-2.0-flash-lite', 
    input: { schema: PresetSummaryInputSchema },
    output: { schema: PresetSummaryOutputSchema },
    config: {
      temperature: 0.7,
    },
    system: `Sei un esperto di suoni per chitarra e hardware NUX MG-30. 
    Analizza i dati tecnici e descrivi il suono in 3 punti secchi: 
    1. Genere consigliato. 
    2. Carattere del tono (es. caldo, tagliente). 
    3. Un consiglio tecnico specifico per l'MG-30. 
    Rispondi in modo conciso in italiano.`,
  },
  `Analizza questo preset:
  Nome: {{preset.name}}
  Amp: {{preset.ampModel}}
  Effetti attivi: {{#each preset.effects}}{{#if this.enabled}}{{this.type}} ({{this.model}}), {{/if}}{{/each}}`
);

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  try {
    const { output } = await presetSummaryPrompt(input);
    if (!output) throw new Error('Analisi AI fallita.');
    return output;
  } catch (error) {
    console.error("Errore durante l'analisi del preset:", error);
    throw new Error('Impossibile generare il riepilogo.');
  }
}