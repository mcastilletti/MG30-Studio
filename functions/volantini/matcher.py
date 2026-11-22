"""Abbina le offerte estratte dai volantini ai prodotti della lista della spesa."""
from __future__ import annotations

import re
import unicodedata
from datetime import date
from difflib import SequenceMatcher
from typing import Any

from .units import parse_quantity, unit_price

_STOPWORDS = {
    "di", "da", "del", "della", "dei", "con", "senza", "per", "al", "alla", "e", "il", "lo", "la",
    "le", "i", "un", "una", "in", "a", "gusti", "vari", "assortiti", "conf", "confezione",
    "kg", "g", "gr", "hg", "mg", "l", "lt", "dl", "cl", "ml", "pz", "x",  # unità di misura
}
_TOKEN_SIMILARITY = 0.84
MAX_RESULTS_PER_PRODUCT = 6
MAX_UPCOMING_PER_PRODUCT = 3


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", text)


def tokens(text: str) -> list[str]:
    """Parole significative: via stopword e quantità ("1", "500g", "1l", "6x33cl"), che non descrivono il prodotto."""
    return [t for t in normalize(text).split() if t not in _STOPWORDS and not t[0].isdigit()]


def _stem(t: str) -> str:
    """Toglie la vocale finale per unire singolare/plurale: mela/mele, uovo/uova, biscotto/biscotti."""
    return t[:-1] if len(t) >= 4 and t[-1] in "aeio" else t


def _token_score(needle: str, haystack: list[str]) -> float:
    best = 0.0
    for h in haystack:
        if needle == h or (len(needle) >= 4 and _stem(needle) == _stem(h)):
            return 1.0
        if len(needle) >= 4 and (h.startswith(needle) or needle.startswith(h) and len(h) >= 4):
            best = max(best, 0.9)  # singolare/plurale, prefissi ("biscott" ~ "biscotti")
        else:
            best = max(best, SequenceMatcher(None, needle, h).ratio())
    return best


def match_score(product: dict[str, Any], offer: dict[str, Any]) -> float:
    """0 se il prodotto non corrisponde, altrimenti 0..1. Tutti i termini richiesti devono comparire."""
    wanted = [t for kw in (product.get("keywords") or []) for t in tokens(kw)] or tokens(product.get("name", ""))
    if not wanted:
        return 0.0
    haystack = tokens(f"{offer.get('title', '')} {offer.get('brand') or ''} {offer.get('category') or ''}")
    if not haystack:
        return 0.0
    scores = [_token_score(w, haystack) for w in wanted]
    if min(scores) < _TOKEN_SIMILARITY:
        return 0.0
    # "evita" termini che l'utente non vuole (es. "senza lattosio" -> excludes)
    for ex in (product.get("excludes") or []):
        for t in tokens(ex):
            if _token_score(t, haystack) >= 0.95:
                return 0.0
    return sum(scores) / len(scores)


def enrich_offer(offer: dict[str, Any]) -> dict[str, Any]:
    """Aggiunge quantità normalizzata e prezzo al kg/l/pz."""
    out = dict(offer)
    qty = parse_quantity(offer.get("quantity")) or parse_quantity(offer.get("title"))
    up = unit_price(float(offer["price"]), qty) if offer.get("price") else None
    out["unitPrice"], out["unitLabel"] = (up if up else (None, None))
    return out


def is_valid_on(offer: dict[str, Any], today: date) -> bool:
    """Esclude solo le offerte scadute. Quelle future restano e vengono segnalate (vedi starts_later)."""
    raw = offer.get("validTo")
    try:
        return not (raw and date.fromisoformat(raw) < today)
    except ValueError:
        return True


def starts_later(offer: dict[str, Any], today: date) -> str | None:
    """Data di inizio (ISO) se l'offerta non è ancora iniziata."""
    raw = offer.get("validFrom")
    try:
        return raw if raw and date.fromisoformat(raw) > today else None
    except ValueError:
        return None


def _sort_key(item: dict[str, Any]) -> tuple:
    # confronta per €/unità se disponibile, altrimenti per prezzo assoluto
    return (item["unitPrice"] is None, item["unitPrice"] if item["unitPrice"] is not None else item["price"])


def compute_matches(
    products: list[dict[str, Any]],
    offers: list[dict[str, Any]],
    today: date | None = None,
) -> list[dict[str, Any]]:
    """Per ogni prodotto, le migliori offerte valide oggi. `products`/`offers` includono 'id'."""
    today = today or date.today()
    enriched = [enrich_offer(o) for o in offers if is_valid_on(o, today)]
    results = []
    for p in products:
        found = []
        for o in enriched:
            score = match_score(p, o)
            if score <= 0:
                continue
            found.append({**o, "offerId": o.get("id"), "score": round(score, 3), "startsOn": starts_later(o, today)})
        if p.get("unit") and found:  # l'utente fissa l'unità (es. "kg"): confronta solo offerte comparabili
            want = {"kg": "€/kg", "l": "€/l", "pz": "€/pz"}.get(p["unit"])
            comparable = [f for f in found if f["unitLabel"] == want]
            found = comparable or found
        active = sorted((f for f in found if not f["startsOn"]), key=_sort_key)[:MAX_RESULTS_PER_PRODUCT]
        future = sorted((f for f in found if f["startsOn"]), key=lambda f: (f["startsOn"], _sort_key(f)))
        for f in active + future:
            f.pop("id", None)
        best = active[0] if active else None
        max_price = p.get("maxPrice")
        results.append({
            "productId": p["id"],
            "productName": p.get("name", ""),
            "best": best,
            "alternatives": active[1:],
            "upcoming": future[:MAX_UPCOMING_PER_PRODUCT],  # offerte non ancora iniziate, sempre segnalate
            "belowTarget": bool(best and max_price and best["price"] <= float(max_price)),
        })
    return results
