'use server';

/**
 * @fileOverview AI Agent "NUX MG-30 Preset Generator"
 * Genera una configurazione completa utilizzando definePrompt di Genkit 1.x.
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

const generatePresetPrompt = ai.definePrompt({
  name: 'generatePresetPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  system: `Sei un sound designer esperto per la pedaliera NUX MG-30. 
  Il tuo compito è generare un preset JSON valido basato sulla descrizione dell'utente.
  
  REGOLE RIGIDE:
  1. Usa QUESTI blocchi in questo ordine: wah, noise-gate, compressor, efx, amp, ir, sr, modulation, delay, reverb, vol.
  2. Scegli modelli verosimili (es. 'tscream' per overdrive, 'plexi100w' per amp).
  3. I parametri devono essere tra 0 e 100.
  4. Restituisci SEMPRE tutti i blocchi della catena.`,
  prompt: `Crea un preset professionale basato su questa descrizione: "{{description}}"`,
});

const mg30PresetFlow = ai.defineFlow(
  {
    name: 'mg30PresetFlow',
    inputSchema: MG30PresetInputSchema,
    outputSchema: MG30PresetOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await generatePresetPrompt(input);
      if (!output) {
        throw new Error('Il modello AI non ha restituito una configurazione valida.');
      }
      return output;
    } catch (error: any) {
      console.error("Preset Gen Flow Error:", error);
      throw new Error(error.message || 'Errore generazione preset');
    }
  }
);

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  return mg30PresetFlow(input);
}
