'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * SCHEMI DI VALIDAZIONE
 */
const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono desiderato'),
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome del preset'),
  explanation: z.string().describe('Spiegazione delle scelte fatte'),
  effects: z.array(z.object({
    type: z.string().describe('Tipo di blocco (es. amp, efx, delay, ecc.)'),
    model: z.string().describe('ID del modello specifico'),
    enabled: z.boolean().describe('Se il blocco deve essere attivo'),
    parameters: z.array(z.object({
      name: z.string().describe('ID del parametro (es. gain, master, drive)'),
      value: z.number().describe('Valore da 0 a 100')
    })).describe('Lista dei parametri settati')
  })).describe('Configurazione della catena degli effetti'),
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
    system: `Sei un esperto NUX MG-30. Genera un preset completo basandoti sulla richiesta dell'utente.
    
    MAPPA I MODELLI USANDO QUESTI ID:
    - AMP: jazzclean (Roland JC120), deluxervb (Fender Deluxe), plexi100w (Marshall Plexi), brit800 (JCM800), hiwire (Hiwatt), dualrect (Mesa Rectifier), dievh4 (Diezel).
    - EFX: tscream (Tube Screamer), bluesdrv (Blues Driver), morningdrv (Morning Glory), reddirt (Red Dirt), eatdist (Rat), mufffuzz (Big Muff).
    - MOD: mod-ce1 (Chorus CE-1), mod-ce2 (Chorus CE-2), mod-ph90 (Phase 90).
    - DLY: dly-analog (Analog Delay), dly-digital (Digital Delay), dly-tape (Tape Echo).
    - RVB: room, hall, plate, spring, shimmer.
    - IR: ir-jz120, ir-dr112, ir-1960, ir-v412.

    PARAMETRI:
    - Valori sempre tra 0 e 100.
    - Per AMP usa: gain, master, bass, mid, treble, presence.
    - Per EFX usa: drive (o gain/distortion), tone, level.
    - Per DLY usa: time, repeat, mix (o level).
    - Per RVB usa: decay, level.

    Rispondi sempre in JSON includendo TUTTI i blocchi della catena, settando 'enabled' a true solo per quelli necessari.`,
  },
  `Crea un preset dettagliato per questo suono: {{description}}`
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
    return {
      name: "Default Tone",
      explanation: "Errore durante la generazione.",
      effects: [
        { 
          type: "amp", 
          model: "brit800", 
          enabled: true, 
          parameters: [{ name: "gain", value: 50 }, { name: "master", value: 50 }] 
        }
      ]
    };
  }
}
