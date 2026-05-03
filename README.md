# MG30 Studio

Un editor web professionale per la pedaliera multi-effetto **NUX MG-30**, potenziato dall'intelligenza artificiale.

## Configurazione AI (Google AI Studio)

L'app utilizza **Gemini 2.5 Flash** tramite Genkit 1.x.
1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Clicca su **"Create API key"**.
3. Copia la chiave e incollala nel file `.env` alla voce `GOOGLE_GENAI_API_KEY`.

> **Nota sulla migrazione**: Se vedi un avviso riguardante il ritiro di Firebase Studio, non preoccuparti. Questo progetto è già stato aggiornato per essere compatibile con i nuovi standard di Google AI Studio. L'app continuerà a funzionare normalmente.

## Funzionalità principali

- **Visual Editor**: Controllo completo dei blocchi tramite MIDI e gestione delle **3 SCENE** (CC 80) per ogni preset.
- **AI Mode**: Generazione automatica dei parametri da testo naturale.
- **Note Brani**: Gestione scalette con accordi, posizioni chitarra e **stampa PDF A4 su pagina singola**.
- **PWA Ready**: Installabile su Android con icona a sfondo giallo (#FFD500).

## Sviluppo

Basato su **Next.js 15**, **Genkit 1.x**, e **Zustand**.
