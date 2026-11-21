"""Estrazione delle offerte da un volantino (PDF o immagine) con Gemini."""
from __future__ import annotations

import io
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

PAGES_PER_CHUNK = 4
DEFAULT_MODEL = "gemini-3.8-flash"  # sovrascrivibile con GEMINI_MODEL in functions/.env

PROMPT = """Sei un assistente che legge volantini promozionali di supermercati italiani.
Estrai TUTTE le offerte di prodotti alimentari e per la casa visibili nelle pagine.
Per ogni offerta restituisci:
- title: nome del prodotto come scritto (marca inclusa), es. "Latte parzialmente scremato Granarolo"
- brand: marca se presente, altrimenti null
- category: categoria generica in italiano (latte, pasta, detersivi, ...) o null
- price: prezzo finale che paga il cliente in euro (numero, punto decimale). Se c'è una promo tipo "2x1" o "3x2",
  calcola il prezzo per singola unità effettiva e spiega in notes
- originalPrice: prezzo pieno barrato, o null
- quantity: formato/peso della confezione come scritto ("500 g", "1,5 l", "6x33 cl"), o null
- discountPercent: percentuale di sconto indicata o null
- validFrom / validTo: date di validità in formato YYYY-MM-DD se indicate nel volantino, altrimenti null
- notes: condizioni (es. "con carta fedeltà", "min. 2 pezzi"), o null
Ignora pagine non commerciali, coupon generici e prodotti senza prezzo. Non inventare dati."""

_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "title": {"type": "STRING"},
            "brand": {"type": "STRING", "nullable": True},
            "category": {"type": "STRING", "nullable": True},
            "price": {"type": "NUMBER"},
            "originalPrice": {"type": "NUMBER", "nullable": True},
            "quantity": {"type": "STRING", "nullable": True},
            "discountPercent": {"type": "NUMBER", "nullable": True},
            "validFrom": {"type": "STRING", "nullable": True},
            "validTo": {"type": "STRING", "nullable": True},
            "notes": {"type": "STRING", "nullable": True},
        },
        "required": ["title", "price"],
    },
}

# funzione (bytes, mime, prompt) -> testo JSON; iniettabile nei test
LLMCall = Callable[[bytes, str, str], str]


def _gemini_call(data: bytes, mime: str, prompt: str) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    resp = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL),
        contents=[types.Part.from_bytes(data=data, mime_type=mime), prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=_SCHEMA, temperature=0
        ),
    )
    return resp.text or "[]"


def _split_pdf(data: bytes) -> list[bytes]:
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(io.BytesIO(data))
    chunks = []
    for start in range(0, len(reader.pages), PAGES_PER_CHUNK):
        writer = PdfWriter()
        for page in reader.pages[start:start + PAGES_PER_CHUNK]:
            writer.add_page(page)
        buf = io.BytesIO()
        writer.write(buf)
        chunks.append(buf.getvalue())
    return chunks or [data]


def clean_offers(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Scarta righe senza titolo/prezzo valido e deduplica (titolo+prezzo+formato)."""
    seen, out = set(), []
    for o in raw:
        try:
            title = str(o.get("title", "")).strip()
            price = float(o["price"])
        except (KeyError, TypeError, ValueError):
            continue
        if not title or price <= 0:
            continue
        key = (title.lower(), round(price, 2), (o.get("quantity") or "").lower())
        if key in seen:
            continue
        seen.add(key)
        out.append({**o, "title": title, "price": round(price, 2)})
    return out


def parse_flyer(data: bytes, mime: str, llm: LLMCall = _gemini_call) -> list[dict[str, Any]]:
    parts = [(c, "application/pdf") for c in _split_pdf(data)] if mime == "application/pdf" else [(data, mime)]

    def one(i: int) -> list[dict[str, Any]]:
        blob, m = parts[i]
        try:
            return json.loads(llm(blob, m, PROMPT))
        except Exception:  # un blocco fallito non deve perdere gli altri
            logging.exception("Errore nel blocco %d/%d del volantino", i + 1, len(parts))
            if len(parts) == 1:
                raise
            return []

    with ThreadPoolExecutor(max_workers=min(4, len(parts))) as pool:  # blocchi in parallelo, ordine conservato
        offers = [o for chunk in pool.map(one, range(len(parts))) for o in chunk]
    return clean_offers(offers)
