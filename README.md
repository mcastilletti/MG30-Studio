# Sottocosto

Indichi i negozi che frequenti con il link alle pagine dei loro volantini: l'app cerca da sola i volantini (PDF), ne estrae le offerte con **Gemini** e le confronta con la tua **lista dei prodotti abituali**, mostrando per ciascuno l'offerta più conveniente (anche al kg/litro) e quelle alternative.

- `web/` — React + TypeScript + Vite (Firebase Auth con Google, Firestore in tempo reale, Storage)
- `functions/` — Cloud Functions in **Python**: lettura volantini (`parser.py`), normalizzazione quantità/prezzo unitario (`units.py`), abbinamento prodotti↔offerte (`matcher.py`)
- Firestore/Storage rules: accesso solo ai propri dati (`users/{uid}/…`)

## Flusso
1. Tab **Lista**: aggiungi i prodotti (parole chiave, esclusioni, prezzo obiettivo, unità di confronto).
2. Tab **Negozi**: aggiungi nome e link alle pagine dei volantini. `scan_all` (ogni giorno alle 06:00, Europe/Rome) e il pulsante "Scansiona" cercano i link a PDF nella pagina (e in alcune sotto-pagine tipo "volantino/offerte"), scaricano quelli nuovi o cambiati (confronto SHA-256) e li salvano su Storage `flyers/{uid}/{id}/`. Come ripiego si può caricare un file a mano.
3. `process_flyer` (trigger Storage) legge il file a blocchi di 4 pagine con Gemini, salva le offerte e ricalcola i confronti.
4. Tab **Offerte**: miglior offerta per prodotto, ordinata per prezzo al kg/l/pz; scadute ignorate.

**Cosa legge lo scraping**: link a PDF nella pagina e volantini incorporati come JSON (formato usato per esempio da conad.it, con titolo e date di validità). Un filtro per negozio permette di ignorare volantini per parola (es. catalogo giocattoli, manuali). Non esegue JavaScript.

**Limiti dello scraping**: legge solo HTML statico. I siti che mostrano il volantino con un visualizzatore JavaScript (Publitas, Issuu, DoveConviene…) senza link diretto al PDF non vengono rilevati: in quel caso la scansione lo segnala e si usa il caricamento manuale. Le richieste sono limitate a indirizzi pubblici (protezione SSRF), 30 MB per PDF, max 5 PDF per negozio. Verifica che i termini d'uso dei siti consentano la lettura automatica.

## Setup
```bash
# 1. Progetto Firebase: .firebaserc punta a studio-3261187179-ec15d (quello già nel repo).
#    Per usarne un altro: firebase use --add
#    Abilita: Authentication (Google), Firestore, Storage, piano Blaze (richiesto dalle Functions).
# 2. Web
cd web && cp .env.example .env   # compila con la config SDK del progetto
npm install && npm run dev
# 3. Chiave Gemini (Secret Manager) e deploy
firebase functions:secrets:set GEMINI_API_KEY
npm --prefix web run build
firebase deploy
```
**Regione**: funzioni (`REGION` in `functions/main.py`, `VITE_FUNCTIONS_REGION` nel web) e bucket Storage dei volantini sono in `europe-west1`. Il bucket predefinito del progetto non si può spostare: crea un bucket aggiuntivo in Firebase Console → Storage → Aggiungi bucket, con il nome in `BUCKET` (`functions/main.py`) e lo stesso in `storageBucket` / `firebase.json`.

## Test
```bash
cd functions && python -m venv venv && . venv/bin/activate
pip install -r requirements-dev.txt && pytest
```
