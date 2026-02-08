'use server';

/**
 * @fileOverview SysEx analysis AI agent per NUX MG-30.
 * Reverse engineering MIDI SysEx con Genkit 1.x definePrompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeSysExInputSchema = z.object({
  sysexData: z.string().describe('Sequence of SysEx messages.'),
  controlDescription: z.string().describe('Description of the control changed.'),
});

const AnalyzeSysExOutputSchema = z.object({
  parameterMapping: z.string().describe('Technical mapping description.'),
});

export type AnalyzeSysExInput = z.infer<typeof AnalyzeSysExInputSchema>;
export type AnalyzeSysExOutput = z.infer<typeof AnalyzeSysExOutputSchema>;

const analyzeSysExPrompt = ai.definePrompt({
  name: 'analyzeSysExPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: AnalyzeSysExInputSchema },
  output: { schema: AnalyzeSysExOutputSchema },
  system: "Sei un MIDI engineer esperto in reverse engineering di SysEx per il NUX MG-30. Analizza i dati esadecimali per trovare pattern di mapping.",
  prompt: `Analizza questi messaggi SysEx: {{sysexData}}
  Azione eseguita: {{controlDescription}}
  Spiega come i messaggi mappano il parametro, l'intervallo di valori e l'offset.`,
});

const analyzeSysExFlow = ai.defineFlow(
  {
    name: 'analyzeSysExFlow',
    inputSchema: AnalyzeSysExInputSchema,
    outputSchema: AnalyzeSysExOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await analyzeSysExPrompt(input);
      if (!output) throw new Error('Analisi AI fallita');
      return output;
    } catch (error: any) {
      console.error("SysEx Analysis Flow Error:", error);
      throw new Error(error.message || 'Errore analisi SysEx');
    }
  }
);

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  return analyzeSysExFlow(input);
}
