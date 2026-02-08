'use server';

/**
 * @fileOverview AI Agent per il riassunto sonoro dei preset NUX MG-30.
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

export async function summarizePreset(input: PresetSummaryInput): Promise<PresetSummaryOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: "Sei un esperto di suoni per chitarra. Analizza i dati tecnici di un preset NUX MG-30 e descrivi il suono in 3 punti: Genere consigliato, Carattere del tono (es. caldo, tagliente), e un piccolo consiglio tecnico.",
      prompt: `Analizza questo preset:
      Nome: ${input.preset.name}
      Amplificatore: ${input.preset.ampModel}
      Effetti attivi: ${input.preset.effects?.filter((e: any) => e.enabled).map((e: any) => e.type).join(', ') || 'Nessuno'}
      
      Fornisci una risposta breve e professionale in italiano.`,
      output: { schema: PresetSummaryOutputSchema }
    });

    const output = response.output;
    if (!output) {
      throw new Error('L\'AI non ha prodotto un risultato valido.');
    }

    return output;
    
  } catch (error: any) {
    throw new Error(error.message || 'Errore durante la generazione dell\'analisi AI');
  }
}
