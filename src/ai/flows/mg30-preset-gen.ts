'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * SCHEMI DI VALIDAZIONE
 */
const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono o JSON strutturato con parametri tecnici'),
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome del preset'),
  explanation: z.string().describe('Spiegazione delle scelte effettuate'),
  effects: z.array(z.object({
    type: z.enum(['wah', 'noise-gate', 'compressor', 'efx', 'amp', 'ir', 'sr', 'modulation', 'delay', 'reverb', 'vol', 'eq']).describe('Tipo esatto del blocco hardware'),
    model: z.string().describe('ID del modello specifico'),
    enabled: z.boolean().describe('Stato attivo/bypass'),
    parameters: z.array(z.object({
      name: z.string().describe('ID del parametro'),
      value: z.number().describe('Valore (solitamente 0-100)')
    }))
  })).describe('Configurazione della catena completa'),
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const mg30PresetPrompt = ai.definePrompt(
  {
    name: 'mg30PresetPrompt',
    model: 'googleai/gemini-2.0-flash-lite', 
    input: { schema: MG30PresetInputSchema },
    output: { schema: MG30PresetOutputSchema },
    config: {
      temperature: 0.1, // Ridotta al minimo per massima fedeltà ai dati tecnici
      responseMimeType: 'application/json',
    },
    system: `Sei un traduttore tecnico rigoroso per NUX MG-30. 
    
    REGOLE MANDATORIE:
    1. Se l'input contiene un JSON con "signal_chain" o valori numerici (es. GAIN: 65), DEVI APPLICARE ESATTAMENTE QUEI VALORI senza interpretarli o modificarli.
    2. Non inventare parametri. Mappa i valori forniti sugli ID parametri esistenti.
    3. Usa SOLO questi ID Modello:
       - amp: jazzclean, deluxervb, bassmate, tweedy, twinrvb, hiwire, calicrunch, classa15, classa30, plexi100w, plexi45, brit800, 1987x50w, slo100, firemanhbe, dualrect, dievh4, vibroking, match, brit2000, uber.
       - efx: tscream, bluesdrv, morningdrv, reddirt, eatdist, mufffuzz, distone, rcboost, acboost, distplus, katana.
       - compressor: rose, kcomp, studiocomp.
       - modulation: mod-ce1, mod-ce2, mod-ph90, mod-uvibe, mod-tremolo, mod-flanger, mod-vibrator.
       - delay: dly-analog, dly-digital, dly-tape, dly-mod, dly-reverse.
       - reverb: room, hall, plate, spring, shimmer.
       - ir: ir-jz120, ir-dr112, ir-1960, ir-v412, ir-gb412.
       - noise-gate: gate.
       - eq: eq-ge6, eq-10band, eq-para.
    
    4. MAPPATURA TIPI (Usa ESATTAMENTE questi nomi nel campo 'type'):
       wah, noise-gate, compressor, efx, amp, ir, sr, modulation, delay, reverb, vol, eq.`,
  },
  `Richiesta: {{description}}
  Analizza la richiesta. Se trovi parametri specifici o un oggetto JSON, mappa fedelmente ogni valore senza alterarlo. Genera sempre una catena coerente.`
);

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  const { output } = await mg30PresetPrompt(input);
  if (!output) throw new Error('Generazione fallita: output vuoto.');
  return output;
}
