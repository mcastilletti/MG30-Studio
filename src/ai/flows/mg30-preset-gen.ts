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
  name: z.string().describe('Nome del preset (breve e accattivante)'),
  explanation: z.string().describe('Spiegazione professionale delle scelte di rig fatte'),
  effects: z.array(z.object({
    type: z.string().describe('Tipo di blocco (es. wah, compressor, efx, amp, ir, modulation, delay, reverb, eq, noise-gate)'),
    model: z.string().describe('ID del modello specifico basato sulla lista fornita'),
    enabled: z.boolean().describe('Se il blocco deve essere attivo'),
    parameters: z.array(z.object({
      name: z.string().describe('ID del parametro (es. gain, master, drive, tone, level, decay, repeat)'),
      value: z.number().describe('Valore da 0 a 100 (o secondo il range del parametro)')
    })).describe('Lista dei parametri settati per questo modello')
  })).describe('Configurazione completa della catena degli effetti (almeno 8 blocchi)'),
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
      temperature: 0.8,
      responseMimeType: 'application/json',
    },
    system: `Sei un esperto tecnico del NUX MG-30 e un sound designer professionista.
    Il tuo compito è generare un preset COMPLETO. Non limitarti solo all'amplificatore.
    
    REGOLE OBBLIGATORIE:
    1. Genera SEMPRE una lista che includa i blocchi: compressor, efx, amp, ir, noise-gate, modulation, delay, reverb.
    2. Per ogni blocco, scegli il modello più adatto al genere richiesto.
    3. Imposta i parametri in modo realistico (es. non mettere tutto a 50).
    4. Rendi 'enabled: true' solo i blocchi necessari per quel suono, ma configura i parametri anche per quelli spenti.
    
    MAPPA MODELLI (usa SOLO questi ID):
    - AMP: jazzclean, deluxervb, bassmate, tweedy, twinrvb, hiwire, calicrunch, classa15, classa30, plexi100w, plexi45, brit800, 1987x50w, slo100, firemanhbe, dualrect, dievh4.
    - EFX: tscream, bluesdrv, morningdrv, reddirt, eatdist, mufffuzz, distone, rcboost, acboost.
    - COMP: rose, kcomp, studiocomp.
    - MOD: mod-ce1, mod-ce2, mod-ph90, mod-uvibe, mod-tremolo.
    - DLY: dly-analog, dly-digital, dly-tape, dly-mod.
    - RVB: room, hall, plate, spring, shimmer.
    - IR: ir-jz120, ir-dr112, ir-1960, ir-v412, ir-gb412.
    - GATE: gate.

    PARAMETRI (Range 0-100):
    - AMP: gain, master, bass, mid, treble, presence.
    - EFX/DIST: drive, tone, level.
    - DLY: time, repeat, mix.
    - RVB: decay, level.
    - GATE: threshold, decay.`,
  },
  `Crea un preset professionale e articolato per questo scenario: {{description}}. Voglio un suono ricco, non limitarti ai settaggi base.`
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
      name: "Emergency Patch",
      explanation: "Si è verificato un errore nella generazione. Ecco un setup base funzionante.",
      effects: [
        { 
          type: "amp", 
          model: "brit800", 
          enabled: true, 
          parameters: [{ name: "gain", value: 60 }, { name: "master", value: 50 }, { name: "bass", value: 50 }, { name: "mid", value: 70 }, { name: "treble", value: 60 }] 
        },
        { 
          type: "noise-gate", 
          model: "gate", 
          enabled: true, 
          parameters: [{ name: "threshold", value: 30 }, { name: "decay", value: 50 }] 
        },
        { 
          type: "ir", 
          model: "ir-1960", 
          enabled: true, 
          parameters: [{ name: "level", value: 50 }] 
        }
      ]
    };
  }
}
