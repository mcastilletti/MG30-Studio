"""Parsing delle quantità ("500 g", "1,5 l", "6x33cl") e prezzo normalizzato."""
from __future__ import annotations

import re
from dataclasses import dataclass

# unità -> (unità base, fattore di conversione)
_UNITS = {
    "kg": ("g", 1000), "hg": ("g", 100), "g": ("g", 1), "gr": ("g", 1), "mg": ("g", 0.001),
    "l": ("ml", 1000), "lt": ("ml", 1000), "dl": ("ml", 100), "cl": ("ml", 10), "ml": ("ml", 1),
    "pz": ("pz", 1), "pezzi": ("pz", 1), "pz.": ("pz", 1), "cf": ("pz", 1), "uova": ("pz", 1),
    "rotoli": ("pz", 1), "capsule": ("pz", 1), "bustine": ("pz", 1),
}

_QTY_RE = re.compile(
    r"(?:(?P<mult>\d+)\s*[x×]\s*)?(?P<num>\d+(?:[.,]\d+)?)\s*(?P<unit>[a-zA-Z]+\.?)",
)


@dataclass(frozen=True)
class Quantity:
    amount: float  # in unità base
    base: str  # "g" | "ml" | "pz"


def parse_quantity(text: str | None) -> Quantity | None:
    """'6x33cl' -> 1980 ml; '1,5 kg' -> 1500 g; None se non riconoscibile."""
    if not text:
        return None
    for m in _QTY_RE.finditer(text.lower()):
        unit = _UNITS.get(m.group("unit"))
        if unit is None:
            continue
        base, factor = unit
        num = float(m.group("num").replace(",", "."))
        mult = int(m.group("mult") or 1)
        amount = num * factor * mult
        if amount > 0:
            return Quantity(amount, base)
    return None


def unit_price(price: float, qty: Quantity | None) -> tuple[float, str] | None:
    """Prezzo normalizzato: €/kg, €/l oppure €/pz."""
    if qty is None or price <= 0:
        return None
    if qty.base == "g":
        return round(price / qty.amount * 1000, 4), "€/kg"
    if qty.base == "ml":
        return round(price / qty.amount * 1000, 4), "€/l"
    return round(price / qty.amount, 4), "€/pz"
