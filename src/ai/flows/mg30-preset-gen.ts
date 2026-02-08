'use server';

/**
 * @fileOverview AI Agent "Nux MG-30 preset"
 * Genera un preset completo partendo da una descrizione creativa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono desiderato'),
});

const EffectSchema = z.object({
  type: z.string(),
  model: z.string(),
  enabled: z.boolean(),
  parameters: z.record(z.any())
});

const MG30PresetOutputSchema = z.object({
  name: z.string(),
  ampModel: z.string(),
  effects: z.array(EffectSchema)
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

/**
 * Genera una configurazione completa per NUX MG-30.
 */
export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `Sei un sound designer per NUX MG-30. Genera un preset JSON valido.
      Usa solo questi tipi: noise-gate, compressor, efx, amp, ir, eq, modulation, delay, reverb.
      Modelli suggeriti: tscream, plexi100w, deluxe-rvb, dly-analog.
      Parametri: numeri 0-100.
      Restituisci un oggetto con: name, ampModel, effects (array di oggetti con type, model, enabled, parameters).`,
      prompt: `Crea un preset professionale basato su: "${input.description}"`,
      output: { schema: MG30PresetOutputSchema }
    });

    const output = response.output;
    if (!output) {
      throw new Error('L\'AI non ha restituito una configurazione valida.');
    }

    return output;
  } catch (error: any) {
    console.error("AI Generation Error Details:", error);
    throw new Error(error.message || 'Errore durante la generazione del preset AI');
  }
}
