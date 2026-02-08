
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione globale di Genkit.
 * Il plugin googleAI cercherà automaticamente GOOGLE_GENAI_API_KEY 
 * o GEMINI_API_KEY nel file .env.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
});
