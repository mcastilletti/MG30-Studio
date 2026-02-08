import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione globale di Genkit per NUX MG-30 Studio.
 * Utilizza il plugin Google AI configurato per l'endpoint stabile v1.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
