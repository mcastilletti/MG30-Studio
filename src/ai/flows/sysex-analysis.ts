'use server';
/**
 * @fileOverview Reverse engineering MIDI SysEx con Gemini 2.5 Flash.
 */

import { ai, z } from '@/ai/genkit';

const AnalyzeSysExInputSchema = z.object({
  sysexData: z.string().describe('Sequenza di messaggi SysEx (hex).'),
  controlDescription: z.string().describe('Descrizione dell\'azione eseguita hardware.'),
});
export type AnalyzeSysExInput = z.infer<typeof AnalyzeSysExInputSchema>;

const AnalyzeSysExOutputSchema = z.object({
  parameterMapping: z.string().describe('Spiegazione tecnica del mapping.'),
});
export type AnalyzeSysExOutput = z.infer<typeof AnalyzeSysExOutputSchema>;

const prompt = ai.definePrompt({
  name: 'analyzeSysExPrompt',
  input: { schema: AnalyzeSysExInputSchema },
  output: { schema: AnalyzeSysExOutputSchema },
  prompt: `Sei un ingegnere MIDI esperto nel reverse engineering dei protocolli NUX. 
Analizza questi dati SysEx per identificare parametri, range di valori e offset.

Dati SysEx: {{{sysexData}}}
Azione: {{{controlDescription}}}

Fornisci un mapping tecnico dettagliato.`,
});

const analyzeSysExFlow = ai.defineFlow(
  {
    name: 'analyzeSysExFlow',
    inputSchema: AnalyzeSysExInputSchema,
    outputSchema: AnalyzeSysExOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Analisi SysEx fallita.');
    return output;
  }
);

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  return analyzeSysExFlow(input);
}
