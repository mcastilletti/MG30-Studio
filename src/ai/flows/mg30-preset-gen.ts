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
  parameters: z.record(z.union([z.number(), z.string()])).describe('Mappa dei parametri e valori (0-100)')
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome creativo del preset'),
  ampModel: z.string().describe('Nome breve dell\'amplificatore (es. "BRIT 800")'),
  effects: z.array(EffectSchema).describe('Catena completa degli effetti')
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  return mg30PresetGenFlow(input);
}

const promptDefinition = ai.definePrompt({
  name: 'mg30PresetPrompt',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  prompt: `Sei un esperto sound designer di chitarra per il NUX MG-30.
Il tuo compito è creare un preset perfetto basandoti sulla richiesta dell'utente: "{{{prompt}}}"

Devi restituire un oggetto JSON che segua esattamente la struttura dei preset MG-30.

REGOLE IMPORTANTI:
1. Usa solo ID modello validi per l'MG-30 (es. tscream, brit800, jazzclean, room, dly-analog).
2. I parametri devono essere numerici tra 0 e 100 per i knob standard.
3. La catena deve includere i blocchi principali in ordine logico: NG -> COMP -> EFX -> AMP -> IR -> EQ -> MOD -> DLY -> RVB.

Esempio di Amp ID: jazzclean, deluxervb, bassmate, tweedy, twinrvb, hiwire, calicrunch, plexi100w, brit800, slo100, firemanhbe, dualrect, dievh4.
Esempio di EFX ID: tscream, distone, bluesdrv, morningdrv, eatdist, reddirt.
Esempio di IR ID: ir-jz120, ir-1960, ir-gb412.`,
});

const mg30PresetGenFlow = ai.defineFlow(
  {
    name: 'mg30PresetGenFlow',
    inputSchema: MG30PresetInputSchema,
    outputSchema: MG30PresetOutputSchema,
  },
  async (input) => {
    const { output } = await promptDefinition(input);
    if (!output) throw new Error('Errore nella generazione del preset');
    return output;
  }
);
