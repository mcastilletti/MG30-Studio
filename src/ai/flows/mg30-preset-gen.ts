'use server';

/**
 * @fileOverview AI Agent "Nux MG-30 preset"
 * 
 * Questo flow genera un preset completo per il NUX MG-30 basandosi su una descrizione del tono.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono desiderato (es. "Heavy Metal anni 80", "Blues caldo alla SRV")'),
});

const EffectSchema = z.object({
  type: z.string().describe('ID del blocco (noise-gate, compressor, efx, amp, ir, eq, modulation, delay, reverb)'),
  model: z.string().describe('ID del modello hardware'),
  enabled: z.boolean(),
  parameters: z.record(z.any()).describe('Mappa dei parametri e valori (0-100)')
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome creativo del preset'),
  ampModel: z.string().describe('Nome dell\'amplificatore'),
  effects: z.array(EffectSchema).describe('Catena completa degli effetti')
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const promptDefinition = ai.definePrompt({
  name: 'mg30PresetPrompt',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  system: `Sei un esperto sound designer di chitarra per il NUX MG-30.
  Devi generare un oggetto JSON che rappresenti una patch valida.
  Usa SOLO questi ID blocco: noise-gate, compressor, efx, amp, ir, eq, modulation, delay, reverb.
  I parametri devono essere numeri tra 0 e 100.
  Assicurati di includere tutti i blocchi nella catena.`,
  prompt: `Crea un preset professionale per: "{{{description}}}"

Esempi di modelli validi:
- AMP: jazzclean, deluxervb, plexi100w, brit800, slo100, dualrect.
- EFX: tscream, distone, bluesdrv, reddirt.
- REVERB: room, hall, plate, shimmer.`,
});

const mg30PresetGenFlow = ai.defineFlow(
  {
    name: 'mg30PresetGenFlow',
    inputSchema: MG30PresetInputSchema,
    outputSchema: MG30PresetOutputSchema,
  },
  async (input) => {
    const { output } = await promptDefinition(input);
    if (!output) {
      throw new Error('Errore: l\'AI non ha generato una configurazione valida.');
    }
    return output;
  }
);

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  return mg30PresetGenFlow(input);
}
