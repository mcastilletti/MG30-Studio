"""Cloud Functions (Python) per l'app Sottocosto.

Dati su Firestore, tutti sotto users/{uid}:
  products/{id}  lista della spesa     stores/{id}  negozi + link alle pagine dei volantini
  flyers/{id}    volantini (trovati dallo scraping o caricati a mano, file su Storage)
  offers/{id}    offerte estratte      matches/{productId}  miglior offerta per prodotto
"""
from __future__ import annotations

import mimetypes

from firebase_admin import firestore, initialize_app, storage
from firebase_functions import firestore_fn, https_fn, options, scheduler_fn, storage_fn
from firebase_functions.params import SecretParam

from volantini.matcher import compute_matches
from volantini.parser import parse_flyer
from volantini.scraper import discover_flyers, download_pdfs

REGION = "europe-west1"  # deve coincidere con VITE_FUNCTIONS_REGION
BUCKET = "studio-7805098640-5b1fc-eu"  # bucket Storage dei volantini, creato in europe-west1 (vedi README)
GEMINI_API_KEY = SecretParam("GEMINI_API_KEY")

options.set_global_options(region=REGION, max_instances=5)
initialize_app()

ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


def _user(uid: str):
    return firestore.client().collection("users").document(uid)


def _batched_delete(refs) -> None:
    db = firestore.client()
    batch, n = db.batch(), 0
    for ref in refs:
        batch.delete(ref)
        n += 1
        if n % 400 == 0:
            batch.commit()
            batch = db.batch()
    batch.commit()


def rematch_user(uid: str) -> int:
    user = _user(uid)
    products = [{**d.to_dict(), "id": d.id} for d in user.collection("products").stream()]
    offers = [{**d.to_dict(), "id": d.id} for d in user.collection("offers").stream()]
    results = compute_matches(products, offers)
    db = firestore.client()
    existing = {d.id for d in user.collection("matches").stream()}
    batch = db.batch()
    for r in results:
        batch.set(user.collection("matches").document(r["productId"]), {**r, "updatedAt": firestore.SERVER_TIMESTAMP})
    for stale in existing - {r["productId"] for r in results}:
        batch.delete(user.collection("matches").document(stale))
    batch.commit()
    return len(results)


@https_fn.on_call()
def rematch(req: https_fn.CallableRequest) -> dict:
    """Ricalcola il confronto dopo una modifica alla lista."""
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Login richiesto")
    return {"products": rematch_user(req.auth.uid)}


@storage_fn.on_object_finalized(bucket=BUCKET, secrets=[GEMINI_API_KEY], memory=options.MemoryOption.GB_1, timeout_sec=540)
def process_flyer(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> None:
    """Si attiva su flyers/{uid}/{flyerId}/{file}: legge il volantino e salva le offerte."""
    parts = event.data.name.split("/")
    if len(parts) != 4 or parts[0] != "flyers":
        return
    _, uid, flyer_id, _fname = parts
    flyer_ref = _user(uid).collection("flyers").document(flyer_id)
    snap = flyer_ref.get()
    if not snap.exists:
        return
    mime = event.data.content_type or mimetypes.guess_type(event.data.name)[0] or ""
    if mime not in ALLOWED_MIME:
        flyer_ref.update({"status": "error", "error": f"Formato non supportato: {mime}"})
        return
    flyer_ref.update({"status": "processing", "error": None})
    try:
        data = storage.bucket(event.data.bucket).blob(event.data.name).download_as_bytes()
        offers = parse_flyer(data, mime)
        meta = snap.to_dict()
        old = _user(uid).collection("offers").where("flyerId", "==", flyer_id).stream()
        _batched_delete([d.reference for d in old])  # rielaborazione idempotente
        db = firestore.client()
        batch = db.batch()
        for i, o in enumerate(offers):
            batch.set(_user(uid).collection("offers").document(f"{flyer_id}_{i}"), {
                **o,
                "flyerId": flyer_id,
                "storeName": meta.get("storeName", ""),
                "validFrom": o.get("validFrom") or meta.get("validFrom") or None,
                "validTo": o.get("validTo") or meta.get("validTo") or None,
            })
            if (i + 1) % 400 == 0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        flyer_ref.update({"status": "done", "offerCount": len(offers)})
        rematch_user(uid)
    except Exception as exc:  # noqa: BLE001
        flyer_ref.update({"status": "error", "error": str(exc)[:300]})
        raise


@firestore_fn.on_document_deleted(document="users/{uid}/flyers/{flyerId}")
def cleanup_flyer(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
    """Elimina offerte e file collegati quando un volantino viene rimosso dall'app."""
    uid, flyer_id = event.params["uid"], event.params["flyerId"]
    _batched_delete([d.reference for d in _user(uid).collection("offers").where("flyerId", "==", flyer_id).stream()])
    for blob in storage.bucket(BUCKET).list_blobs(prefix=f"flyers/{uid}/{flyer_id}/"):
        blob.delete()
    rematch_user(uid)


def scan_store_for(uid: str, store_id: str) -> dict:
    """Cerca i PDF nelle pagine del negozio e, se nuovi o cambiati, li carica su Storage:
    da lì `process_flyer` li legge. Ritorna un riepilogo."""
    store_ref = _user(uid).collection("stores").document(store_id)
    store = store_ref.get().to_dict() or {}
    logs: list[str] = []
    urls = [u for u in store.get("urls", []) if isinstance(u, str) and u.strip()]
    new = 0
    try:
        cands = discover_flyers(urls, log=logs.append, exclude=store.get("exclude") or [])
        found = download_pdfs(cands, log=logs.append)
        bucket = storage.bucket(BUCKET)
        for f in found:
            flyer_ref = _user(uid).collection("flyers").document(f.flyer_id)
            prev = flyer_ref.get()
            if prev.exists and (prev.to_dict() or {}).get("contentHash") == f.sha256:
                continue  # già analizzato, contenuto invariato
            flyer_ref.set({
                "storeId": store_id, "storeName": store.get("name", ""), "fileName": (f.title or f.url.rsplit("/", 1)[-1])[:120],
                "sourceUrl": f.url, "contentHash": f.sha256, "validFrom": f.valid_from, "validTo": f.valid_to,
                "status": "uploading", "createdAt": firestore.SERVER_TIMESTAMP,
            })  # prima il documento, poi il file: l'upload fa partire process_flyer
            bucket.blob(f"flyers/{uid}/{f.flyer_id}/flyer.pdf").upload_from_string(f.data, content_type="application/pdf")
            new += 1
        if not urls:
            status, msg = "empty", "Nessun link configurato."
        elif not found:
            status, msg = "empty", "Nessun PDF trovato: il sito potrebbe usare un visualizzatore JavaScript. " + " ".join(logs[:2])
        else:
            status, msg = "ok", f"{len(found)} volantini trovati, {new} nuovi o aggiornati."
    except Exception as exc:  # noqa: BLE001
        status, msg = "error", str(exc)[:300]
    store_ref.set({"lastScanAt": firestore.SERVER_TIMESTAMP, "lastScanStatus": status, "lastScanMessage": msg}, merge=True)
    return {"status": status, "message": msg, "new": new}


@https_fn.on_call(timeout_sec=300, memory=options.MemoryOption.MB_512)
def scan_store(req: https_fn.CallableRequest) -> dict:
    """Scansione manuale di un negozio (storeId) o di tutti (senza storeId)."""
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Login richiesto")
    uid = req.auth.uid
    store_id = (req.data or {}).get("storeId")
    ids = [store_id] if store_id else [d.id for d in _user(uid).collection("stores").stream()]
    return {"results": {i: scan_store_for(uid, i) for i in ids}}


@scheduler_fn.on_schedule(schedule="every day 06:00", timezone=scheduler_fn.Timezone("Europe/Rome"), timeout_sec=540, memory=options.MemoryOption.MB_512)
def scan_all(event: scheduler_fn.ScheduledEvent) -> None:
    """Ogni mattina ricontrolla i siti di tutti i negozi."""
    for d in firestore.client().collection_group("stores").stream():
        try:
            scan_store_for(d.reference.parent.parent.id, d.id)
        except Exception:  # noqa: BLE001  un negozio rotto non ferma gli altri
            import logging
            logging.exception("Scansione fallita: %s", d.reference.path)
