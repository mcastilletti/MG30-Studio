import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione globale di Genkit per NUX MG-30 Studio.
 * Utilizza il plugin Google AI configurato tramite GOOGLE_GENAI_API_KEY.
 * Forza l'uso dell'endpoint stabile v1.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
});
