import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configurazione centrale di Genkit.
 * Utilizziamo l'endpoint stabile v1 per garantire la massima compatibilità e affidabilità.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      apiVersion: 'v1',
    })
  ]
});
