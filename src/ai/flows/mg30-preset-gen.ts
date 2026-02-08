'use server';

/**
 * @fileOverview AI Agent "NUX MG-30 Preset Generator"
 * Genera una configurazione completa di preset per chitarra.
 */

import { z } from 'zod';

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

export async function generateMG30Preset(input: MG30PresetInput): Promise<MG30PresetOutput> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY non configurata');
  }

  try {
    console.log('🎸 Generazione preset:', input.description);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Sei un sound designer esperto per pedaliera NUX MG-30.

DESCRIZIONE SUONO: "${input.description}"

Genera un preset JSON con questa ESATTA struttura:

{
  "name": "Nome preset",
  "ampModel": "plexi100w",
  "effects": [
    {
      "type": "noise-gate",
      "model": "gate",
      "enabled": true,
      "parameters": {"threshold": 30, "decay": 50}
    },
    {
      "type": "overdrive",
      "model": "tscream",
      "enabled": true,
      "parameters": {"drive": 60, "tone": 55, "level": 70}
    },
    {
      "type": "delay",
      "model": "digital",
      "enabled": true,
      "parameters": {"time": 400, "feedback": 30, "mix": 25}
    },
    {
      "type": "reverb",
      "model": "hall",
      "enabled": true,
      "parameters": {"decay": 40, "mix": 20}
    }
  ]
}

REGOLE:
- Parametri sempre tra 0-100
- Modelli disponibili amp: clean, plexi100w, jcm800, dual-rect, ac30
- Effetti: gate, compressor, tscream, chorus, phaser, delay, reverb
- Usa 3-5 effetti max
- Rispondi SOLO con JSON valido, nessun testo aggiuntivo`
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 800,
            topP: 0.95,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore API Gemini:', errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error('Nessuna risposta da Gemini');
    }

    console.log('📝 Risposta raw:', textResponse);

    // Pulisci la risposta da markdown
    let jsonText = textResponse.trim();
    jsonText = jsonText.replace(/```json\n?/g, '');
    jsonText = jsonText.replace(/```\n?/g, '');
    jsonText = jsonText.trim();

    // Parsing JSON
    let preset: MG30PresetOutput;
    try {
      preset = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Errore parsing JSON:', jsonText);
      throw new Error('Risposta AI non valida. Riprova.');
    }

    // Validazione con Zod
    const validated = MG30PresetOutputSchema.parse(preset);
    
    console.log('✅ Preset generato:', validated.name);
    return validated;
    
  } catch (error: any) {
    console.error('❌ Errore generazione preset:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(error.message || 'Errore durante la generazione del preset');
  }
}