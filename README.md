# MG30 Studio

Un editor web professionale per la pedaliera multi-effetto **NUX MG-30**, potenziato dall'intelligenza artificiale.

## Funzionalità principali

- **Visual Editor**: Controllo completo dei blocchi (Wah, Amp, EFX, Delay, Reverb, ecc.) tramite MIDI.
- **AI Mode**: Estrazione automatica dei parametri da istruzioni testuali utilizzando **Gemini 2.0 Flash Lite**.
- **Preset Library**: Gestione dei 128 slot della pedaliera con funzioni di backup e sincronizzazione.
- **AI SysEx Analyzer**: Strumento per il reverse engineering dei messaggi MIDI proprietari.

## Come collegare la pedaliera

1. Collega l'MG-30 al computer tramite cavo USB.
2. Assicurati che il browser supporti le **Web MIDI API** (Chrome, Edge, Opera).
3. Apri l'app e controlla lo stato "USB MIDI ACTIVE" nella barra laterale.

## Sviluppo

Il progetto è basato su **Next.js 15**, **Genkit** per l'integrazione AI, e **Zustand** per la gestione dello stato MIDI e dei preset.

### Come pubblicare su GitHub

Per caricare questo progetto sul tuo account GitHub, segui questi passaggi dal terminale del tuo ambiente di sviluppo:

1. Crea un nuovo repository (vuoto) su [GitHub](https://github.com/new).
2. Apri il terminale nella cartella del progetto.
3. Inizializza il repository locale:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: MG30 Studio con AI Mode"
   ```
4. Collega il repository remoto (sostituisci l'URL con il tuo):
   ```bash
   git remote add origin https://github.com/mcastilletti/MG30-Studio.git
   git push -u origin main
   ```

---
*Nota: Il file `.env` è stato escluso dal caricamento per sicurezza. Ricordati di configurare le tue API KEY nel nuovo ambiente.*

