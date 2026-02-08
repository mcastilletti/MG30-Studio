'use server';

/**
 * @fileOverview AI Mode Flow per NUX MG-30.
 * Converte istruzioni testuali in parametri tecnici per la pedaliera.
 * Ottimizzato per Gemini 2.0 Flash Lite (compatibilità response_schema).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* =========================
   SCHEMA OUTPUT OTTIMIZZATO
   (Evitiamo unions e literals per compatibilità API Gemini)
========================= */

const EffectOutputSchema = z.object({
  type: z.enum([
    'noise-gate', 'efx', 'delay', 'reverb', 'wah', 
    'compressor', 'ir', 'sr', 'modulation', 'vol', 'eq', 'amp'
  ]).describe('Il tipo di blocco catena'),
  model: z.string().describe('Il nome tecnico del modello (es. gate, tscream, plexi100w, hall)'),
  enabled: z.boolean().describe('Stato di attivazione del blocco'),
  parameters: z.record(z.number()).describe('Mappa dei parametri (es. { "gain": 50, "tone": 30 }) con valori 0-100'),
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Un nome creativo per il preset basato sulle impostazioni'),
  explanation: z.string().describe('Breve riassunto dei parametri estratti dal testo'),
  ampModel: z.enum([
    'plexi100w', 'jcm800', 'dualrect', 'ac30', 'jazzclean', 'deluxervb', 
    'bassmate', 'tweedy', 'twinrvb', 'hiwire', 'calicrunch', 'classa15', 
    'classa30', 'plexi45', 'brit800', '1987x50w', 'slo100', 'firemanhbe', 
    'dievh4', 'vibroking', 'budda', 'mrz38', 'superrvb', 'britblues', 
    'match', 'brit2000', 'uber', 'agl', 'bassguy', 'mld', 'optimair', 'stageman'
  ]).describe('Il modello di amplificatore più adatto'),
  effects: z.array(EffectOutputSchema).describe('Lista degli effetti configurati'),
});

export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

/* =========================
   PROMPT & FLOW
========================= */

const mg30PresetPrompt = ai.definePrompt({
  name: 'mg30PresetPrompt',
  model: 'googleai/gemini-2.0-flash-lite-preview-02-05',
  input: { schema: z.object({ instructions: z.string() }) },
  output: { schema: MG30PresetOutputSchema },
  system: `Sei un assistente tecnico esperto per NUX MG-30. 
Il tuo compito è ESTRARRE i valori dei parametri dal testo fornito dall'utente e mapparli sulla struttura tecnica della pedaliera.

REGOLE DI MAPPATURA:
1. Se l'utente specifica un valore (es. "Gain a 40"), impostalo esattamente nei parametri.
2. Mappa i modelli corretti:
   - Delay: dly-analog, dly-digital, dly-tape, dly-mod
   - Reverb: room, hall, plate, spring, shimmer
   - EFX: tscream, distone, bluesdrv, morningdrv, eatdist, reddirt
   - Gate: gate
3. Se un parametro non è menzionato, usa valori di default bilanciati (es. 50).
4. Restituisci SOLO l'oggetto JSON richiesto.`,
  prompt: `Istruzioni utente: "{{instructions}}"`,
});

export async function generateMG30Preset(input: { description: string }): Promise<MG30PresetOutput> {
  const { output } = await mg30PresetPrompt({ instructions: input.description });
  if (!output) throw new Error('Impossibile interpretare le istruzioni del preset.');
  return output;
}
