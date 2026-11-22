"""Abbina le offerte estratte dai volantini ai prodotti della lista della spesa."""
from __future__ import annotations

import re
import unicodedata
from datetime import date
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
MAX_OTHER_BRANDS_PER_PRODUCT = 6


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


_VOWELS = set("aeiou")


def _close_prefix(a: str, b: str) -> bool:
    """Una parola è l'inizio dell'altra e le lettere in più sono solo vocali, al massimo 2 ("biscott"/"biscotti").
    "fusi" non è "fusilli", "riso" non è "risotto", "cotto" non è "cotton"."""
    short, long_ = sorted((a, b), key=len)
    extra = long_[len(short):]
    return len(short) >= 4 and long_.startswith(short) and 0 < len(extra) <= 2 and set(extra) <= _VOWELS


def _collapse(w: str) -> str:
    """Toglie le lettere doppie: "mozarella" e "mozzarella" diventano uguali."""
    return re.sub(r"(.)\1+", r"\1", w)


def _token_score(needle: str, haystack: list[str]) -> float:
    """1.0 stessa parola (anche singolare/plurale), 0.9 forma tronca, 0.88 doppia lettera mancante o in più, altrimenti 0.
    Niente somiglianze più larghe: pesce/pesche, cotto/cotton o balsamico/balsamo sono cose diverse."""
    best = 0.0
    for h in haystack:
        if needle == h or (len(needle) >= 4 and _stem(needle) == _stem(h)):
            return 1.0
        if _close_prefix(needle, h):
            best = max(best, 0.9)
        elif len(needle) >= 6 and len(h) >= 6 and _collapse(needle) == _collapse(h):
            best = max(best, 0.88)
    return best


def match_score(product: dict[str, Any], offer: dict[str, Any]) -> float:
    """0 se il prodotto non corrisponde, altrimenti 0..1.

    Le parole chiave (separate da virgola) sono ALTERNATIVE: basta che ne corrisponda una.
    Dentro una stessa voce ("latte uht") tutte le parole devono comparire.
    Senza parole chiave si usa il nome del prodotto come unica alternativa."""
    alternatives = [t for t in (tokens(kw) for kw in (product.get("keywords") or [])) if t] or [tokens(product.get("name", ""))]
    haystack = tokens(f"{offer.get('title', '')} {offer.get('brand') or ''} {offer.get('category') or ''}")
    if not haystack:
        return 0.0
    best = 0.0
    for wanted in alternatives:
        if not wanted:
            continue
        scores = [_token_score(w, haystack) for w in wanted]
        if min(scores) >= _TOKEN_SIMILARITY:
            best = max(best, sum(scores) / len(scores))
    if best == 0.0:
        return 0.0
    # termini da evitare (anche questi alternativi: ne basta uno per scartare l'offerta)
    for ex in (product.get("excludes") or []):
        for t in tokens(ex):
            if _token_score(t, haystack) >= 0.95:
                return 0.0
    return best


def brand_ok(product: dict[str, Any], offer: dict[str, Any]) -> bool:
    """Senza marche preferite ogni offerta va bene. Altrimenti la marca (anche di più parole, es. "mulino bianco")
    deve comparire nel titolo o nel campo marca dell'offerta: ne basta una."""
    brands = [b for b in (product.get("brands") or []) if tokens(b)]
    if not brands:
        return True
    haystack = tokens(f"{offer.get('brand') or ''} {offer.get('title', '')}")
    return any(all(_token_score(t, haystack) >= _TOKEN_SIMILARITY for t in tokens(b)) for b in brands)


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


def merge_products(favorites: list[dict[str, Any]], list_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Prodotti da cercare = Preferiti + voci della Lista della spesa.

    - Una voce di lista che rappresenta un preferito agganciato (`favoriteId`) non si duplica: il Preferito stesso
      risulta "in lista".
    - Se una voce generica ha lo stesso nome di un Preferito vince il Preferito (ha parole chiave e obiettivi suoi)."""
    on_list = {it["favoriteId"] for it in list_items if it.get("favoriteId")}
    merged = [{**f, "inList": True} if f.get("id") in on_list else f for f in favorites]
    seen = {normalize(f.get("name", "")).strip() for f in favorites}
    extra = []
    for it in list_items:
        key = normalize(it.get("name", "")).strip()
        if it.get("favoriteId") or not key or key in seen:
            continue
        seen.add(key)
        extra.append({**it, "id": f"list_{it['id']}", "inList": True})
    return merged + extra


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
        preferred = [f for f in found if brand_ok(p, f)]
        other = [f for f in found if not brand_ok(p, f)]  # stesso prodotto, ma di una marca non indicata
        active = sorted((f for f in preferred if not f["startsOn"]), key=_sort_key)[:MAX_RESULTS_PER_PRODUCT]
        future = sorted((f for f in preferred if f["startsOn"]), key=lambda f: (f["startsOn"], _sort_key(f)))
        other = sorted(other, key=lambda f: (f["startsOn"] is not None, _sort_key(f)))[:MAX_OTHER_BRANDS_PER_PRODUCT]
        for f in active + future + other:
            f.pop("id", None)
        best = active[0] if active else None
        max_price = p.get("maxPrice")
        results.append({
            "productId": p["id"],
            "productName": p.get("name", ""),
            "brands": p.get("brands") or [],
            "best": best,
            "alternatives": active[1:],
            "upcoming": future[:MAX_UPCOMING_PER_PRODUCT],  # offerte non ancora iniziate, sempre segnalate
            "otherBrands": other,  # "Offerte altre marche": mai mescolate alle marche preferite
            "belowTarget": bool(best and max_price and best["price"] <= float(max_price)),
            "inList": bool(p.get("inList")),
        })
    return results
