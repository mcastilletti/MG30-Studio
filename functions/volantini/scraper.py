"""Ricerca dei volantini (PDF) nelle pagine web dei negozi.

Limiti noti: legge solo l'HTML statico. Siti con visualizzatori JavaScript (Publitas, Issuu,
DoveConviene…) senza link diretto al PDF non vengono rilevati.
"""
from __future__ import annotations

import hashlib
import html as htmllib
import ipaddress
import json
import re
import socket
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Callable
from urllib.parse import urldefrag, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

MAX_PDF_BYTES = 30 * 1024 * 1024
MAX_SUBPAGES = 6
MAX_PDFS_PER_STORE = 10
TIMEOUT = 20
UA = "Mozilla/5.0 (compatible; SottocostoBot/1.0)"
_FLYER_HINT = re.compile(r"volantin|flyer|offert|sfoglia|promo|catalog|settimana|brochure", re.I)


class UnsafeURL(ValueError):
    pass


def assert_public_url(url: str) -> None:
    """Protezione SSRF: solo http(s) verso indirizzi IP pubblici."""
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise UnsafeURL(f"URL non valido: {url}")
    try:
        infos = socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise UnsafeURL(f"Host non risolvibile: {p.hostname}") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise UnsafeURL(f"Indirizzo non pubblico: {p.hostname}")


def _get(url: str, max_bytes: int, redirects: int = 5) -> requests.Response:
    """GET con controllo SSRF a ogni redirect e tetto alla dimensione."""
    for _ in range(redirects + 1):
        assert_public_url(url)
        resp = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT, stream=True, allow_redirects=False)
        if resp.is_redirect and resp.headers.get("location"):
            url = urljoin(url, resp.headers["location"])
            resp.close()
            continue
        resp.raise_for_status()
        buf = bytearray()
        for chunk in resp.iter_content(64 * 1024):
            buf.extend(chunk)
            if len(buf) > max_bytes:
                raise ValueError(f"File troppo grande (> {max_bytes // 1024 // 1024} MB)")
        resp._content = bytes(buf)  # noqa: SLF001
        resp.url = url
        return resp
    raise ValueError("Troppi redirect")


def fetch_text(url: str) -> str:
    return _get(url, 3 * 1024 * 1024).text


def fetch_pdf(url: str) -> bytes | None:
    """Scarica il file; None se non è un PDF."""
    data = _get(url, MAX_PDF_BYTES).content
    return data if data[:5] == b"%PDF-" else None


def parse_links(html: str, base_url: str) -> tuple[list[str], list[str]]:
    """Ritorna (link a PDF, sotto-pagine che sembrano contenere volantini)."""
    soup = BeautifulSoup(html, "html.parser")
    pdfs: list[str] = []
    pages: list[str] = []
    base_host = urlparse(base_url).hostname
    for a in soup.find_all("a", href=True):
        href = urldefrag(urljoin(base_url, a["href"].strip()))[0]
        if urlparse(href).scheme not in ("http", "https"):
            continue
        path = urlparse(href).path.lower()
        if path.endswith(".pdf"):
            if href not in pdfs:
                pdfs.append(href)
        elif urlparse(href).hostname == base_host and href != base_url and _FLYER_HINT.search(f"{path} {a.get_text(' ')}"):
            if href not in pages:
                pages.append(href)
    return pdfs, pages


@dataclass
class Candidate:
    url: str
    title: str | None = None
    valid_from: str | None = None  # ISO YYYY-MM-DD
    valid_to: str | None = None


@dataclass
class FoundPDF:
    url: str
    data: bytes
    sha256: str
    flyer_id: str  # stabile per URL (senza query): se il sito sostituisce il file, il volantino viene riletto
    title: str | None = None
    valid_from: str | None = None
    valid_to: str | None = None


def flyer_id_for(url: str) -> str:
    """Id stabile: ignora la query (molti siti ci mettono un hash di versione che cambia a ogni aggiornamento)."""
    p = urlparse(url)
    return hashlib.sha1(f"{p.scheme}://{p.netloc}{p.path}".encode()).hexdigest()[:24]


def _to_iso(v) -> str | None:
    if isinstance(v, (int, float)) and v > 1e11:  # millisecondi epoch
        return datetime.fromtimestamp(v / 1000, timezone.utc).date().isoformat()
    if isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", v[:10]):
        return v[:10]
    return None


_PDFURL_RE = re.compile(r'"pdfUrl"\s*:\s*"')


def parse_embedded_flyers(page: str, base_url: str) -> list[Candidate]:
    """Siti che incorporano i volantini come JSON nella pagina (es. Conad): oggetti con "pdfUrl",
    "title"/"feTitle", "validFrom"/"validTo"."""
    text = htmllib.unescape(page)
    dec = json.JSONDecoder()
    out: dict[str, Candidate] = {}
    for m in _PDFURL_RE.finditer(text):
        starts = [i for i in (j.start() for j in re.finditer(r'\{"', text[max(0, m.start() - 8000):m.start()]))]
        for off in reversed(starts[-40:]):  # l'oggetto che contiene pdfUrl, scartando quelli annidati
            try:
                obj, _ = dec.raw_decode(text, max(0, m.start() - 8000) + off)
            except ValueError:
                continue
            if isinstance(obj, dict) and isinstance(obj.get("pdfUrl"), str):
                url = urljoin(base_url, obj["pdfUrl"])
                out.setdefault(flyer_id_for(url), Candidate(
                    url, obj.get("feTitle") or obj.get("title"), _to_iso(obj.get("validFrom")), _to_iso(obj.get("validTo")),
                ))
                break
    return list(out.values())


def _rank(c: Candidate, today: date) -> tuple:
    """Prima i volantini in corso, poi i futuri, per data di inizio più recente."""
    vf = c.valid_from or "0000-00-00"
    active = not (c.valid_from and c.valid_from > today.isoformat())
    return (not active, "".join(chr(255 - ord(ch)) for ch in vf))


def _keep(c: Candidate, exclude: list[str], today: date) -> bool:
    if c.valid_to and c.valid_to < today.isoformat():
        return False  # scaduto
    hay = f"{c.title or ''} {c.url}".lower()
    return not any(w.strip().lower() in hay for w in exclude if w.strip())


def discover_flyers(
    start_urls: list[str],
    get_text: Callable[[str], str] = fetch_text,
    log: Callable[[str], None] = lambda _m: None,
    exclude: list[str] | None = None,
    today: date | None = None,
) -> list[Candidate]:
    """Cerca volantini (link a PDF o JSON incorporato) nelle pagine indicate e, se non ne trova,
    in alcune sotto-pagine pertinenti (profondità 1)."""
    today = today or date.today()
    found: dict[str, Candidate] = {}

    def scan_page(url: str) -> tuple[bool, list[str]]:
        page = get_text(url)
        embedded = parse_embedded_flyers(page, url)
        pdfs, subpages = parse_links(page, url)
        cands = embedded or [Candidate(u) for u in pdfs]  # i dati incorporati hanno titolo e date: preferiti
        for c in cands:
            found.setdefault(flyer_id_for(c.url), c)
        return bool(cands), subpages

    for start in start_urls:
        if urlparse(start).path.lower().endswith(".pdf"):
            found.setdefault(flyer_id_for(start), Candidate(start))
            continue
        try:
            has, subs = scan_page(start)
        except Exception as exc:  # noqa: BLE001
            log(f"{start}: {exc}")
            continue
        if not has:  # nessun volantino nella pagina: prova le sotto-pagine "volantino/offerte…"
            for sub in subs[:MAX_SUBPAGES]:
                try:
                    scan_page(sub)
                except Exception as exc:  # noqa: BLE001
                    log(f"{sub}: {exc}")
    keep = [c for c in found.values() if _keep(c, exclude or [], today)]
    keep.sort(key=lambda c: _rank(c, today))
    return keep[:MAX_PDFS_PER_STORE]


def download_pdfs(
    cands: list[Candidate],
    fetch: Callable[[str], bytes | None] = fetch_pdf,
    log: Callable[[str], None] = lambda _m: None,
) -> list[FoundPDF]:
    out = []
    for c in cands:
        try:
            data = fetch(c.url)
        except Exception as exc:  # noqa: BLE001
            log(f"{c.url}: {exc}")
            continue
        if data:
            out.append(FoundPDF(c.url, data, hashlib.sha256(data).hexdigest(), flyer_id_for(c.url), c.title, c.valid_from, c.valid_to))
    return out
