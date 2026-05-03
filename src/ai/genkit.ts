import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione centralizzata di Genkit per Google AI Studio.
 * Assicurati di avere GOOGLE_GENAI_API_KEY impostata nel file .env.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
