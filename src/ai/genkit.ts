
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione globale di Genkit.
 * Utilizziamo googleAI puntando agli endpoint stabili (v1) tramite l'SDK aggiornato.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
});
