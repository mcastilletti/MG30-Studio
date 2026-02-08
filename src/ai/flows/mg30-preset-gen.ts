'use server';

/**
 * @fileOverview AI Agent "Nux MG-30 preset"
 * 
 * Questo flow genera un preset completo per il NUX MG-30 basandosi su una descrizione del tono.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MG30PresetInputSchema = z.object({
  prompt: z.string().describe('Descrizione del suono desiderato (es. "Heavy Metal anni 80", "Blues caldo alla SRV")'),
});

const EffectSchema = z.object({
  type: z.enum(['noise-gate', 'compressor', 'efx', 'amp', 'ir', 'eq', 'modulation', 'delay', 'reverb']),
  model: z.string().describe('ID del modello (es. "tscream", "brit800", "jazzclean")'),
  enabled: z.boolean(),
  parameters: z.record(z.any()).describe('Mappa dei parametri e valori (0-100)')
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome creativo del preset'),
  ampModel: z.string().describe('Nome breve dell\'amplificatore (es. "BRIT 800")'),
  effects: z.array(EffectSchema).describe('Catena completa degli effetti')
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const promptDefinition = ai.definePrompt({
  name: 'mg30PresetPrompt',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  system: `Sei un esperto sound designer di chitarra specializzato nel NUX MG-30.
  Devi rispondere SEMPRE con un oggetto JSON valido che rispetti lo schema richiesto.
  Usa solo questi ID per i tipi di effetto: noise-gate, compressor, efx, amp, ir, eq, modulation, delay, reverb.`,
  prompt: `Crea un preset perfetto per questa richiesta: "{{{prompt}}}"

REGOLE TECNICHE:
1. Usa solo ID modello validi (es. tscream, brit800, jazzclean, room, dly-analog).
2. I parametri devono essere numerici tra 0 e 100.
3. La catena DEVE includere: NG -> COMP -> EFX -> AMP -> IR -> EQ -> MOD -> DLY -> RVB.

Esempio Amp: jazzclean, deluxervb, bassmate, plexi100w, brit800, slo100, dualrect.
Esempio EFX: tscream, distone, bluesdrv, morningdrv, eatdist, reddirt.
Esempio IR: ir-jz120, ir-1960, ir-gb412.`,
});

const mg30PresetGenFlow = ai.defineFlow(
  {
    name: 'mg30PresetGenFlow',
    inputSchema: MG30PresetInputSchema,
    outputSchema: MG30PresetOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await promptDefinition(input);
      if (!output) throw new Error('Il modello non ha restituito output');
      return output;
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw new Error('Errore durante la generazione del suono con AI');
    }
  }
);

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  return mg30PresetGenFlow(input);
}
