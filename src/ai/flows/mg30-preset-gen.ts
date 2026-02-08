
'use server';

/**
 * @fileOverview AI Agent "Nux MG-30 preset"
 * Genera un preset completo partendo da una descrizione creativa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MG30PresetInputSchema = z.object({
  description: z.string().describe('Descrizione del suono desiderato'),
});

const EffectSchema = z.object({
  type: z.string(),
  model: z.string(),
  enabled: z.boolean(),
  parameters: z.record(z.any())
});

const MG30PresetOutputSchema = z.object({
  name: z.string(),
  ampModel: z.string(),
  effects: z.array(EffectSchema)
});

export type MG30PresetInput = z.infer<typeof MG30PresetInputSchema>;
export type MG30PresetOutput = z.infer<typeof MG30PresetOutputSchema>;

/**
 * Genera una configurazione completa per NUX MG-30.
 */
export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `Sei un sound designer esperto per la pedaliera NUX MG-30. 
      Il tuo compito è generare un preset JSON valido basato sulla descrizione dell'utente.
      
      REGOLE RIGIDE:
      1. Usa SOLO questi tipi di blocchi: noise-gate, compressor, efx, amp, ir, eq, modulation, delay, reverb.
      2. Per ogni blocco, scegli un modello verosimile (es. 'tscream' per overdrive, 'plexi100w' per amp).
      3. I parametri devono essere valori numerici tra 0 e 100.
      4. Restituisci SEMPRE tutti i blocchi della catena, abilitando solo quelli necessari per il suono richiesto.
      
      STRUTTURA OUTPUT:
      - name: Nome creativo del preset.
      - ampModel: Nome del modello di amplificatore.
      - effects: Array di oggetti con { type, model, enabled, parameters }.`,
      prompt: `Crea un preset professionale basato su questa descrizione: "${input.description}"`,
      output: { schema: MG30PresetOutputSchema }
    });

    const output = response.output;
    if (!output) {
      throw new Error('Il modello AI non ha restituito una configurazione valida.');
    }

    return output;
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    // Propaghiamo l'errore specifico per aiutare il debugging nel client
    if (error.message?.includes('API key')) {
      throw new Error('Configurazione AI incompleta: Manca la chiave API nel file .env');
    }
    throw new Error(error.message || 'Errore durante la generazione del preset AI');
  }
}
