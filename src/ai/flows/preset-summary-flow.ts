'use server';

export async function summarizePreset(input: { preset: any }) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY non configurata in .env.local');
  }

  try {
    console.log('🎸 Analisi preset:', input.preset.name);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analizza preset chitarra: ${input.preset.name}
Amp: ${input.preset.ampModel}
Effetti: ${input.preset.effects?.filter((e: any) => e.enabled).map((e: any) => e.type).join(', ') || 'Nessuno'}

Rispondi SOLO con 3 punti brevi:
1. Genere
2. Suono
3. Consiglio`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
            topP: 0.95,
            topK: 40
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore API Gemini:', errorText);
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!summary) {
      throw new Error('Nessuna risposta valida da Gemini');
    }

    console.log('✅ Analisi completata:', summary);
    return { summary };
    
  } catch (error: any) {
    console.error('❌ Errore completo:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(error.message || 'Errore durante l\'analisi AI del preset');
  }
}

export type PresetSummaryInput = { preset: any };
export type PresetSummaryOutput = { summary: string };