"""Cloud Functions (Python) per l'app Sottocosto.

Dati su Firestore, tutti sotto users/{uid}:
  products/{id}  lista della spesa     flyers/{id}  volantini caricati (+ file su Storage)
  offers/{id}    offerte estratte      matches/{productId}  miglior offerta per prodotto
"""
from __future__ import annotations

import mimetypes

from firebase_admin import firestore, initialize_app, storage
from firebase_functions import firestore_fn, https_fn, options, storage_fn
from firebase_functions.params import SecretParam

from volantini.matcher import compute_matches
from volantini.parser import parse_flyer

REGION = "europe-west1"  # deve coincidere con la regione del bucket Storage e con VITE_FUNCTIONS_REGION
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


@storage_fn.on_object_finalized(secrets=[GEMINI_API_KEY], memory=options.MemoryOption.GB_1, timeout_sec=540)
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
    for blob in storage.bucket().list_blobs(prefix=f"flyers/{uid}/{flyer_id}/"):
        blob.delete()
    rematch_user(uid)
