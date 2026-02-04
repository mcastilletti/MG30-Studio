// src/ai/flows/sysex-analysis.ts
'use server';

/**
 * @fileOverview A SysEx analysis AI agent.
 *
 * - analyzeSysEx - A function that handles the SysEx analysis process.
 * - AnalyzeSysExInput - The input type for the analyzeSysEx function.
 * - AnalyzeSysExOutput - The return type for the analyzeSysEx function.
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

export async function analyzeSysEx(input: AnalyzeSysExInput): Promise<AnalyzeSysExOutput> {
  return analyzeSysExFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSysExPrompt',
  input: {schema: AnalyzeSysExInputSchema},
  output: {schema: AnalyzeSysExOutputSchema},
  prompt: `You are an expert MIDI engineer specializing in reverse engineering SysEx messages for the NUX MG-30 multi-effects pedal.

You will be provided with a sequence of SysEx messages captured when a specific control is changed on the physical hardware. Your task is to analyze these messages and determine how they map to the control.

Specifically, you should identify the following:

*   The specific SysEx parameter that is being modified.
*   The range of values that the parameter can take.
*   Any scaling or offset that is applied to the parameter value.
*   A human-readable description of the parameter mapping, including the parameter name, value range, and any scaling or offset.

Here is the SysEx data:

{{sysexData}}

Here is a description of the control that was changed:

{{controlDescription}}`,
});

const analyzeSysExFlow = ai.defineFlow(
  {
    name: 'analyzeSysExFlow',
    inputSchema: AnalyzeSysExInputSchema,
    outputSchema: AnalyzeSysExOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
