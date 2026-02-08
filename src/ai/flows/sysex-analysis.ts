'use server';

/**
 * @fileOverview A SysEx analysis AI agent.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSysExInputSchema = z.object({
  sysexData: z
    .string()
    .describe(
      'A sequence of SysEx messages captured when a control is changed on the physical hardware.'
    ),
  controlDescription: z.string().describe('A description of the control that was changed.'),
});
export type AnalyzeSysExInput = z.infer<typeof AnalyzeSysExInputSchema>;

const AnalyzeSysExOutputSchema = z.object({
  parameterMapping: z
    .string()
    .describe(
      'A description of how the SysEx messages map to the control, including the parameter, value range, and any scaling or offset.'
    ),
});
export type AnalyzeSysExOutput = z.infer<typeof AnalyzeSysExOutputSchema>;

const sysexPrompt = ai.definePrompt({
  name: 'analyzeSysExPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: AnalyzeSysExInputSchema},
  output: {schema: AnalyzeSysExOutputSchema},
  prompt: `You are an expert MIDI engineer specializing in reverse engineering SysEx messages for the NUX MG-30 multi-effects pedal.

You will be provided with a sequence of SysEx messages captured when a specific control is changed on the physical hardware. Your task is to analyze these messages and determine how they map to the control.

Here is the SysEx data:
{{sysexData}}

Here is a description of the control that was changed:
{{controlDescription}}`,
});

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  try {
    const { output } = await sysexPrompt(input);
    if (!output) throw new Error('Analisi fallita');
    return output;
  } catch (error) {
    console.error("SysEx Analysis Error:", error);
    throw new Error('Errore durante l\'analisi SysEx');
  }
}
