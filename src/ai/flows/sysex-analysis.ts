'use server';

/**
 * @fileOverview SysEx analysis AI agent per NUX MG-30.
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

const analyzeSysExFlow = ai.defineFlow(
  {
    name: 'analyzeSysExFlow',
    inputSchema: AnalyzeSysExInputSchema,
    outputSchema: AnalyzeSysExOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: "Sei un MIDI engineer esperto in reverse engineering di SysEx per il NUX MG-30.",
      prompt: `Analizza questi messaggi SysEx: ${input.sysexData}
      Azione eseguita: ${input.controlDescription}
      Spiega come i messaggi mappano il parametro, l'intervallo di valori e l'offset.`,
      output: { schema: AnalyzeSysExOutputSchema }
    });

    if (!output) throw new Error('Analisi AI fallita');
    return output;
  }
);

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  return analyzeSysExFlow(input);
}
