'use server';

import { ai, z } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Reverse engineering MIDI SysEx con Gemini 2.5 Flash.
 */

const AnalyzeSysExInputSchema = z.object({
  sysexData: z.string().describe('Sequenza di messaggi SysEx (hex).'),
  controlDescription: z.string().describe('Descrizione dell\'azione eseguita hardware.'),
});

const AnalyzeSysExOutputSchema = z.object({
  parameterMapping: z.string().describe('Spiegazione tecnica del mapping.'),
});

export type AnalyzeSysExInput = z.infer<typeof AnalyzeSysExInputSchema>;
export type AnalyzeSysExOutput = z.infer<typeof AnalyzeSysExOutputSchema>;

const analyzeSysExPrompt = ai.definePrompt({
  name: 'analyzeSysExPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: AnalyzeSysExInputSchema },
  output: { schema: AnalyzeSysExOutputSchema },
  system: "Sei un ingegnere MIDI esperto nel reverse engineering dei protocolli NUX. Analizza i dati SysEx per identificare parametri, range di valori e offset.",
  prompt: `Analizza questi dati:
Dati SysEx: {{{sysexData}}}
Azione: {{{controlDescription}}}

Fornisci un mapping tecnico dettagliato.`,
});

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  const { output } = await analyzeSysExPrompt(input);
  if (!output) throw new Error('Analisi SysEx fallita.');
  return output;
}
