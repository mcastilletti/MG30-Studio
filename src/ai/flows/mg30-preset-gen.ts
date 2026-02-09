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
    system: `Sei un esperto NUX MG-30. Genera un preset completo basandoti sulla richiesta.
    Usa ESCLUSIVAMENTE i nomi dei modelli dell'hardware MG-30 (es. brit800, tscream, plexi100w).
    Per ogni effetto, definisci 'enabled' (true/false) e una lista di 'parameters' con valori da 0 a 100.
    I tipi validi sono: wah, noise-gate, compressor, efx, amp, ir, sr, modulation, delay, reverb, eq, vol.`,
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
