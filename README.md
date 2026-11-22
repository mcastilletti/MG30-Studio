# Sottocosto

Indichi i negozi che frequenti con il link alle pagine dei loro volantini: l'app cerca da sola i volantini (PDF), ne estrae le offerte con **Gemini** e le confronta con la tua **lista dei prodotti abituali**, mostrando per ciascuno l'offerta più conveniente (anche al kg/litro) e quelle alternative.

- `web/` — React + TypeScript + Vite (Firebase Auth con Google, Firestore in tempo reale, Storage)
- `functions/` — Cloud Functions in **Python**: lettura volantini (`parser.py`), normalizzazione quantità/prezzo unitario (`units.py`), abbinamento prodotti↔offerte (`matcher.py`)
- Firestore/Storage rules: accesso solo ai propri dati (`users/{uid}/…`). Dalla web app si gestiscono (crea, modifica, elimina) negozi, lista della spesa e catalogo prodotti dei volantini

## Flusso
1. Tab **Lista**: card quadrate dei prodotti del catalogo, ordinate dai più usati; un tocco aggiunge alla lista, un altro toglie. Tenendo premuta una card si apre la scheda del prodotto (quantità, descrizione, note, foto: valgono solo finché è in lista) e si agganciano Preferiti al generico: diventano card a sé, trovabili cercando il generico o il loro nome. In lista va solo ciò che si sceglie. Le card con un'offerta attiva mostrano il badge "Offerta", che porta alla pagina Offerte. Le voci in lista vengono cercate nei volantini. Tab **Preferiti**: prodotti con parole chiave alternative, marche preferite (le sole proposte come offerta: le altre finiscono in «Offerte altre marche», dove dalla Lista si sceglie se usarle, ignorarle o attendere una marca preferita), esclusioni, prezzo obiettivo e unità (cercati anch'essi).
   Aggiungi i prodotti (parole chiave alternative (ne basta una), esclusioni, prezzo obiettivo, unità di confronto).
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

**Modello Gemini**: di default `gemini-3.8-flash`. Se Google lo ritira, crea `functions/.env` con `GEMINI_MODEL=<nuovo-modello>` e rifai `firebase deploy --only functions`, senza modificare il codice.

## Pubblicare da cellulare
- **Cloud Shell** (nell'app Google Cloud o su console.cloud.google.com): `cd ~/Sottocosto && ./deploy.sh` (oppure `./deploy.sh hosting` / `./deploy.sh functions`). Lo script scarica gli aggiornamenti, compila e pubblica.
- **Pulsante su GitHub**: Actions → «Pubblica su Firebase» → Run workflow. Richiede i segreti `FIREBASE_SERVICE_ACCOUNT` (chiave JSON di un account di servizio) e `WEB_ENV` (contenuto di `web/.env`); vedi `.github/workflows/deploy.yml`.

## Test
```bash
cd functions && python -m venv venv && . venv/bin/activate
pip install -r requirements-dev.txt && pytest
```
