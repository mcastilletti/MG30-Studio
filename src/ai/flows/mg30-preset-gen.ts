'use server';

/**
 * @fileOverview AI Agent "Nux MG-30 preset"
 * 
 * Questo flow genera un preset completo per il NUX MG-30 basandosi su una descrizione del tono.
 * Include una gestione degli errori robusta per evitare Errori 500.
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

const promptDefinition = ai.definePrompt({
  name: 'mg30PresetPrompt',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  config: {
    temperature: 0.7,
  },
  system: `Sei un esperto sound designer per il NUX MG-30. Genera un preset in formato JSON.
  Usa solo questi blocchi: noise-gate, compressor, efx, amp, ir, eq, modulation, delay, reverb.
  Gli ID modelli devono essere minuscoli (es: jazzclean, plexi100w, tscream).
  I parametri devono essere numeri 0-100.
  Restituisci SEMPRE tutti i blocchi indicati, anche se disattivati.`,
  prompt: `Crea un preset professionale per: "{{{description}}}"`,
});

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  try {
    const { output } = await promptDefinition(input);
    if (!output) {
      throw new Error('L\'AI non ha restituito dati');
    }
    return output;
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    // Lanciamo un errore che possa essere catturato dal client con un messaggio pulito
    throw new Error(error.message || 'Errore durante la generazione del preset');
  }
}
