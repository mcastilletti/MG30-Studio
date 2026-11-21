import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from volantini import scraper

HOME = """<html><body>
<a href="/files/volantino-settimana.pdf">Scarica</a>
<a href="https://cdn.example.com/x/promo.PDF#page=1">Promo</a>
<a href="/chi-siamo">Chi siamo</a>
<a href="/volantini">Sfoglia i volantini</a>
<a href="mailto:a@b.it">mail</a>
</body></html>"""


def test_parse_links():
    pdfs, pages = scraper.parse_links(HOME, "https://shop.example.com/")
    assert pdfs == ["https://shop.example.com/files/volantino-settimana.pdf", "https://cdn.example.com/x/promo.PDF"]
    assert pages == ["https://shop.example.com/volantini"]


def test_discover_follows_subpage_only_without_pdfs():
    pages = {
        "https://s.it/": '<a href="/volantini">Volantini</a>',
        "https://s.it/volantini": '<a href="/a.pdf">a</a><a href="/a.pdf">dup</a>',
    }
    assert scraper.discover_pdf_urls(["https://s.it/"], get_text=pages.__getitem__) == ["https://s.it/a.pdf"]
    # link diretto a PDF: nessuna richiesta HTML
    assert scraper.discover_pdf_urls(["https://s.it/v.pdf"], get_text=lambda u: 1 / 0) == ["https://s.it/v.pdf"]


def test_discover_survives_errors():
    def boom(_u):
        raise RuntimeError("down")
    logs = []
    assert scraper.discover_pdf_urls(["https://s.it/"], get_text=boom, log=logs.append) == []
    assert logs


def test_download_filters_non_pdf_and_hashes():
    out = scraper.download_pdfs(["https://s.it/a.pdf", "https://s.it/b.pdf"], fetch=lambda u: b"%PDF-1" if "a" in u else None)
    assert len(out) == 1 and out[0].flyer_id == scraper.flyer_id_for("https://s.it/a.pdf") and len(out[0].sha256) == 64


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/x", "http://169.254.169.254/computeMetadata/v1/", "http://10.0.0.5/", "http://localhost/",
    "file:///etc/passwd", "ftp://example.com/a", "http://[::1]/",
])
def test_ssrf_blocked(url):
    with pytest.raises(scraper.UnsafeURL):
        scraper.assert_public_url(url)
