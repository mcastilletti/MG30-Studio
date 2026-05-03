# MG30 Studio

Un editor web professionale per la pedaliera multi-effetto **NUX MG-30**, potenziato dall'intelligenza artificiale.

## Configurazione AI (Google AI Studio)

L'app utilizza **Gemini 2.5 Flash** tramite Genkit 1.x.
1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Clicca su **"Create API key"**.
3. Copia la chiave e incollala nel file `.env` alla voce `GOOGLE_GENAI_API_KEY`.

## Migrazione da Firebase Studio

Se il pulsante **"Move now"** è oscurato:
1. Premi `Ctrl+Shift+P` (o `Cmd+Shift+P` su Mac).
2. Digita `Zip & Download` e premi Invio.
3. Estrai il file e apri la cartella nel tuo IDE locale (es. VS Code) o caricala su un nuovo workspace di Google AI Studio.

## Funzionalità principali

- **Visual Editor**: Controllo completo dei blocchi tramite MIDI e gestione delle **3 SCENE** (CC 80) per ogni preset.
- **AI Mode**: Generazione automatica dei parametri da testo naturale utilizzando Gemini 2.5 Flash.
- **Note Brani**: Gestione scalette con accordi e stampa **PDF A4 su pagina singola** (contenuto ridotto del 30%).
- **PWA Ready**: Installabile su Android con icona a sfondo giallo (#FFD500).

## Sviluppo

Basato su **Next.js 15**, **Genkit 1.x**, e **Zustand**.
