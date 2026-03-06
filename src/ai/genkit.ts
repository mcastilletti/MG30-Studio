import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Questa riga dice a Genkit di usare la chiave del tuo file .env
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
});
