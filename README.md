# Volantini

Carichi i volantini (PDF o foto) dei negozi che frequenti, l'app ne estrae le offerte con **Gemini** e le confronta con la tua **lista dei prodotti abituali**, mostrando per ciascuno l'offerta più conveniente (anche al kg/litro) e quelle alternative.

- `web/` — React + TypeScript + Vite (Firebase Auth con Google, Firestore in tempo reale, Storage)
- `functions/` — Cloud Functions in **Python**: lettura volantini (`parser.py`), normalizzazione quantità/prezzo unitario (`units.py`), abbinamento prodotti↔offerte (`matcher.py`)
- Firestore/Storage rules: accesso solo ai propri dati (`users/{uid}/…`)

## Flusso
1. Tab **Lista**: aggiungi i prodotti (parole chiave, esclusioni, prezzo obiettivo, unità di confronto).
2. Tab **Volantini**: scegli negozio, validità e carica il file → su Storage `flyers/{uid}/{id}/file`.
3. `process_flyer` (trigger Storage) legge il file a blocchi di 4 pagine con Gemini, salva le offerte e ricalcola i confronti.
4. Tab **Offerte**: miglior offerta per prodotto, ordinata per prezzo al kg/l/pz; scadute ignorate.

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
**Regione**: le funzioni usano `europe-west1` (`REGION` in `functions/main.py`, `VITE_FUNCTIONS_REGION` nel web). Il bucket Storage deve essere nella stessa regione/area (es. `eur3`), altrimenti cambia entrambe.

## Test
```bash
cd functions && python -m venv venv && . venv/bin/activate
pip install -r requirements-dev.txt && pytest
```
