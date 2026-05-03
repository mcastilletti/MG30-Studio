# MG30 Studio

Un editor web professionale per la pedaliera multi-effetto **NUX MG-30**, potenziato dall'intelligenza artificiale.

## Migrazione a Google AI Studio (PROCEDURA DI EMERGENZA)

Se il pulsante **"Move now"** è oscurato/bloccato:
1. Premi `Ctrl+Shift+P` (o `Cmd+Shift+P` su Mac) all'interno di questo editor.
2. Digita **"Zip & Download"** e premi Invio.
3. Estrai il file .zip sul tuo computer.
4. Vai su [Google AI Studio](https://aistudio.google.com/), clicca su "Create new prompt" o importa la cartella scaricata per continuare a usare l'agente Gemini.

## Configurazione AI
L'app utilizza **Gemini 2.5 Flash** tramite Genkit 1.x.
1. Ottieni una chiave API su [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Incolla la chiave nel file `.env` alla voce `GOOGLE_GENAI_API_KEY`.

## Funzionalità principali
- **Visual Editor**: Controllo completo dei blocchi tramite MIDI e gestione delle **3 SCENE** (CC 80) per ogni preset.
- **AI Mode**: Generazione automatica dei parametri da testo naturale utilizzando Gemini 2.5 Flash.
- **Note Brani**: Gestione scalette con accordi e stampa **PDF A4 su pagina singola** (contenuto ridotto del 30% per evitare troncamenti).
- **PWA Ready**: Installabile su Android con icona a sfondo giallo (#FFD500) e modalità "maskable".

## Sviluppo
Basato su **Next.js 15**, **Genkit 1.x**, e **Zustand**.
