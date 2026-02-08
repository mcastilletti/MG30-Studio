import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione globale di Genkit per NUX MG-30 Studio.
 * Utilizza il plugin Google AI configurato per l'endpoint stabile v1 tramite GOOGLE_GENAI_API_KEY.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
});
