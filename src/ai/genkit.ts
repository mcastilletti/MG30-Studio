import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configurazione centrale di Genkit.
 * Utilizziamo l'endpoint v1beta per supportare i modelli della serie Gemini 2.0 in preview.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      apiVersion: 'v1beta',
    })
  ]
});
