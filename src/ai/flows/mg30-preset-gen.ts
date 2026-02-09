'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * SCHEMI DI VALIDAZIONE
 */
const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono desiderato o oggetto JSON con specifiche tecniche'),
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome del preset (breve e accattivante)'),
  explanation: z.string().describe('Spiegazione professionale delle scelte di rig fatte, citando modelli e tecniche di sound design'),
  effects: z.array(z.object({
    type: z.string().describe('Tipo di blocco (wah, compressor, efx, amp, ir, modulation, delay, reverb, eq, noise-gate, vol)'),
    model: z.string().describe('ID del modello specifico basato sulla lista fornita'),
    enabled: z.boolean().describe('Stato attivo/bypass del blocco'),
    parameters: z.array(z.object({
      name: z.string().describe('ID del parametro specifico del modello'),
      value: z.number().describe('Valore numerico (solitamente 0-100, o secondo il range del parametro)')
    })).describe('Lista completa dei parametri per questo blocco')
  })).describe('Configurazione della catena (genera sempre almeno 8-10 blocchi per un suono completo)'),
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const mg30PresetPrompt = ai.definePrompt(
  {
    name: 'mg30PresetPrompt',
    model: 'googleai/gemini-2.0-flash-lite-preview-02-05', 
    input: { schema: MG30PresetInputSchema },
    output: { schema: MG30PresetOutputSchema },
    config: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
    system: `Sei un ingegnere del suono esperto in NUX MG-30. Il tuo compito è tradurre richieste (testuali o JSON) in preset pronti all'uso.
    
    REGOLE DI MAPPING MODELLI (Usa SOLO questi ID):
    - AMP: jazzclean, deluxervb, bassmate, tweedy, twinrvb, hiwire, calicrunch, classa15, classa30, plexi100w, plexi45, brit800, 1987x50w, slo100, firemanhbe, dualrect, dievh4, vibroking, match, brit2000, uber.
    - EFX: tscream (SCREAM), bluesdrv, morningdrv, reddirt, eatdist (RAT), mufffuzz, distone (DS1), rcboost, acboost, distplus, katana.
    - COMP: rose, kcomp, studiocomp.
    - MOD: mod-ce1, mod-ce2, mod-ph90, mod-uvibe, mod-tremolo, mod-flanger, mod-vibrator.
    - DLY: dly-analog, dly-digital, dly-tape, dly-mod, dly-reverse.
    - RVB: room, hall, plate, spring, shimmer.
    - IR: ir-jz120, ir-dr112, ir-1960, ir-v412, ir-gb412 (GREENBACK).
    - GATE: gate (NG).
    - EQ: eq-ge6, eq-10band, eq-para.

    DETTAGLI PARAMETRI (Range 0-100 se non specificato):
    - AMP: gain, master, bass, mid, treble, presence, bias, level.
    - EFX: drive, tone, level (o volume/output/distortion a seconda del pedale).
    - DLY: time (ms o 0-100), repeat (feedback), echo/mix/level.
    - RVB: decay, predelay, level/mix.
    - IR: mic (0-7), axis (0-2), level (-12 a 12), lowcut (20-1000), highcut (5000-20000).
    - GATE: threshold, decay.

    ISTRUZIONI:
    1. Se l'utente fornisce un "preset_goal" o "signal_chain" in formato JSON, rispettalo fedelmente mappando i nomi sui nostri ID.
    2. Configura SEMPRE la catena completa: noise-gate -> compressor -> efx -> amp -> ir -> modulation -> delay -> reverb.
    3. Imposta valori realistici per ogni parametro. Per i suoni rock "Wall of Sound", spingi su gain, master e usa IR 4x12 (es. ir-1960 o ir-gb412).`,
  },
  `Genera un preset professionale basato su questa richiesta: {{description}}. 
  Se la richiesta contiene specifiche tecniche come modelli o valori di gain/delay, usali come base prioritaria per la configurazione.`
);

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  try {
    const { output } = await mg30PresetPrompt(input);
    
    if (!output) {
       throw new Error('L\'AI ha risposto con un formato vuoto.');
    }
    
    return output;
  } catch (error) {
    console.error("Errore generazione preset:", error);
    // Preset di emergenza più completo
    return {
      name: "Emergency Rock",
      explanation: "Si è verificato un errore. Questo è un setup British Rock standard.",
      effects: [
        { type: "noise-gate", model: "gate", enabled: true, parameters: [{ name: "threshold", value: 30 }, { name: "decay", value: 50 }] },
        { type: "efx", model: "tscream", enabled: true, parameters: [{ name: "drive", value: 10 }, { name: "tone", value: 60 }, { name: "level", value: 80 }] },
        { type: "amp", model: "brit800", enabled: true, parameters: [{ name: "gain", value: 65 }, { name: "master", value: 70 }, { name: "bass", value: 50 }, { name: "mid", value: 70 }, { name: "treble", value: 60 }] },
        { type: "ir", model: "ir-1960", enabled: true, parameters: [{ name: "level", value: 0 }, { name: "mic", value: 1 }, { name: "axis", value: 0 }] },
        { type: "reverb", model: "hall", enabled: true, parameters: [{ name: "decay", value: 40 }, { name: "level", value: 30 }] }
      ]
    };
  }
}
