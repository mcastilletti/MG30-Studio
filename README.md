# MG30 Studio

Un editor web professionale per la pedaliera multi-effetto **NUX MG-30**, potenziato dall'intelligenza artificiale.

## Configurazione AI (Google AI Studio)

L'app utilizza **Gemini 2.5 Flash** per il design dei suoni e l'analisi SysEx.
1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Clicca su **"Create API key"**.
3. Copia la chiave e incollala nel file `.env` alla voce `GOOGLE_GENAI_API_KEY`.

## Funzionalità principali

- **Visual Editor**: Controllo completo dei blocchi tramite MIDI e gestione delle **3 SCENE** per ogni preset.
- **AI Mode**: Generazione automatica dei parametri da testo naturale.
- **Note Brani**: Gestione scalette con accordi, posizioni chitarra e **stampa PDF A4 ottimizzata**.
- **Icona PWA**: Supporto per installazione su Android con sfondo giallo istituzionale.

## Sviluppo

Basato su **Next.js 15**, **Genkit 1.x**, e **Zustand**.
