'use server';

/**
 * @fileOverview AI Agent "NUX MG-30 Preset Generator"
 * Genera una configurazione completa di preset per chitarra utilizzando Genkit 1.x.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EffectSchema = z.object({
  type: z.string().describe('Tipo di effetto (es. wah, noise-gate, compressor, efx, amp, ir, modulation, delay, reverb)'),
  model: z.string().describe('ID del modello specifico'),
  enabled: z.boolean().describe('Stato attivo/disattivo'),
  parameters: z.record(z.any()).describe('Mappa parametri-valore (0-100)')
});

const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono desiderato'),
});

const MG30PresetOutputSchema = z.object({
  name: z.string().describe('Nome creativo per il preset'),
  explanation: z.string().describe('Breve spiegazione delle scelte effettuate'),
  effects: z.array(EffectSchema).describe('Lista dei blocchi della catena del segnale')
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

const generatePresetPrompt = ai.definePrompt({
  name: 'generatePresetPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: MG30PresetInputSchema },
  output: { schema: MG30PresetOutputSchema },
  system: `Sei un sound designer esperto per la pedaliera NUX MG-30.
Il tuo compito è configurare la catena del segnale in base alla descrizione dell'utente.

REGOLE TECNICHE:
- I tipi di effetto validi sono: wah, noise-gate, compressor, efx, amp, ir, modulation, delay, reverb, eq, vol, sr.
- Per 'amp' usa modelli come: plexi100w, brit800, jazzclean, deluxervb, dualrect, slo100.
- Per 'efx' usa modelli come: tscream, distone, bluesdrv, morningdrv, eatdist.
- Per 'ir' usa sempre un modello compatibile (es. ir-1960 per plexi, ir-dr112 per deluxe).
- I parametri devono essere numerici tra 0 e 100.
- Mantieni una catena logica: Gate all'inizio, Amp/IR al centro, Delay/Reverb alla fine.`,
  prompt: `Genera un preset ottimizzato per: "{{description}}"`,
});

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  try {
    const { output } = await generatePresetPrompt(input);
    if (!output) throw new Error('L\'AI non ha restituito una configurazione valida.');
    return output;
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || 'Errore durante la generazione del preset');
  }
}
