"""Ricerca dei volantini (PDF) nelle pagine web dei negozi.

Limiti noti: legge solo l'HTML statico. Siti con visualizzatori JavaScript (Publitas, Issuu,
DoveConviene…) senza link diretto al PDF non vengono rilevati.
"""
from __future__ import annotations

import hashlib
import ipaddress
import re
import socket
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urldefrag, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

MAX_PDF_BYTES = 30 * 1024 * 1024
MAX_SUBPAGES = 6
MAX_PDFS_PER_STORE = 5
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
class FoundPDF:
    url: str
    data: bytes
    sha256: str
    flyer_id: str  # stabile per URL: se il sito aggiorna lo stesso link, il volantino viene riletto


def flyer_id_for(url: str) -> str:
    return hashlib.sha1(url.encode()).hexdigest()[:24]


def discover_pdf_urls(
    start_urls: list[str],
    get_text: Callable[[str], str] = fetch_text,
    log: Callable[[str], None] = lambda _m: None,
) -> list[str]:
    """Cerca link a PDF nelle pagine indicate e in alcune sotto-pagine pertinenti (profondità 1)."""
    found: list[str] = []
    for start in start_urls:
        if urlparse(start).path.lower().endswith(".pdf"):
            found.append(start)
            continue
        try:
            pdfs, pages = parse_links(get_text(start), start)
        except Exception as exc:  # noqa: BLE001
            log(f"{start}: {exc}")
            continue
        found.extend(pdfs)
        if not pdfs:  # nessun PDF in home: prova le sotto-pagine "volantino/offerte…"
            for sub in pages[:MAX_SUBPAGES]:
                try:
                    found.extend(parse_links(get_text(sub), sub)[0])
                except Exception as exc:  # noqa: BLE001
                    log(f"{sub}: {exc}")
    return list(dict.fromkeys(found))[:MAX_PDFS_PER_STORE]


def download_pdfs(urls: list[str], fetch: Callable[[str], bytes | None] = fetch_pdf, log: Callable[[str], None] = lambda _m: None) -> list[FoundPDF]:
    out = []
    for u in urls:
        try:
            data = fetch(u)
        except Exception as exc:  # noqa: BLE001
            log(f"{u}: {exc}")
            continue
        if data:
            out.append(FoundPDF(u, data, hashlib.sha256(data).hexdigest(), flyer_id_for(u)))
    return out
