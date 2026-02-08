'use server';

/**
 * @fileOverview AI Mode Flow per NUX MG-30.
 * Converte istruzioni testuali in parametri tecnici per la pedaliera.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* =========================
   SCHEMI PARAMETRI
========================= */

const NoiseGateParams = z.object({
  threshold: z.number().min(0).max(100),
  decay: z.number().min(0).max(100),
});

const TScreamParams = z.object({
  drive: z.number().min(0).max(100),
  tone: z.number().min(0).max(100),
  level: z.number().min(0).max(100),
});

const DigitalDelayParams = z.object({
  level: z.number().min(0).max(100),
  feedback: z.number().min(0).max(100),
  time: z.number().min(0).max(100),
});

const HallReverbParams = z.object({
  decay: z.number().min(0).max(100),
  predelay: z.number().min(0).max(100),
  liveliness: z.number().min(0).max(100),
  level: z.number().min(0).max(100),
});

/* =========================
   SCHEMA OUTPUT
========================= */

const EffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('noise-gate'),
    model: z.literal('gate'),
    enabled: z.boolean(),
    parameters: NoiseGateParams,
  }),
  z.object({
    type: z.literal('efx'),
    model: z.enum(['tscream', 'distone', 'morningdrv', 'bluesdrv']),
    enabled: z.boolean(),
    parameters: TScreamParams,
  }),
  z.object({
    type: z.literal('delay'),
    model: z.literal('dly-digital'),
    enabled: z.boolean(),
    parameters: DigitalDelayParams,
  }),
  z.object({
    type: z.literal('reverb'),
    model: z.literal('hall'),
    enabled: z.boolean(),
    parameters: HallReverbParams,
  }),
]);

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Un nome creativo per il preset basato sulle impostazioni'),
  explanation: z.string().describe('Breve riassunto dei parametri estratti dal testo'),
  ampModel: z.enum(['plexi100w', 'jcm800', 'dualrect', 'ac30', 'jazzclean']).describe('Il modello di amplificatore più adatto'),
  effects: z.array(EffectSchema),
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
Il tuo compito è ESTRARRE i valori dei parametri dal testo fornito dall'utente.
REGOLE:
1. Se l'utente specifica un valore (es. "Gain a 40"), impostalo esattamente.
2. Se l'utente specifica un modello (es. "Usa il JCM800"), seleziona l'ampModel corrispondente.
3. Mappa i blocchi efx, delay, reverb e noise-gate se menzionati.
4. Per i parametri non menzionati, usa valori di default bilanciati.
5. L'output deve essere SOLO il JSON strutturato.`,
  prompt: `Istruzioni utente: "{{instructions}}"`,
});

export async function generateMG30Preset(input: { description: string }): Promise<MG30PresetOutput> {
  const { output } = await mg30PresetPrompt({ instructions: input.description });
  if (!output) throw new Error('Impossibile interpretare le istruzioni del preset.');
  return output;
}
