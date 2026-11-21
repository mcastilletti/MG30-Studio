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


def urls(cands):
    return [c.url for c in cands]


def test_discover_follows_subpage_only_without_pdfs():
    pages = {
        "https://s.it/": '<a href="/volantini">Volantini</a>',
        "https://s.it/volantini": '<a href="/a.pdf">a</a><a href="/a.pdf">dup</a>',
    }
    assert urls(scraper.discover_flyers(["https://s.it/"], get_text=pages.__getitem__)) == ["https://s.it/a.pdf"]
    # link diretto a PDF: nessuna richiesta HTML
    assert urls(scraper.discover_flyers(["https://s.it/v.pdf"], get_text=lambda u: 1 / 0)) == ["https://s.it/v.pdf"]


def test_discover_survives_errors():
    def boom(_u):
        raise RuntimeError("down")
    logs = []
    assert scraper.discover_flyers(["https://s.it/"], get_text=boom, log=logs.append) == []
    assert logs


EMBEDDED = (
    '<div data-x="{&#34;items&#34;:[{&#34;title&#34;:&#34;Nazionale&#34;,&#34;validFrom&#34;:1795000000000,&#34;validTo&#34;:1796000000000,'
    '&#34;link&#34;:{&#34;href&#34;:&#34;/v/1&#34;},&#34;pdfUrl&#34;:&#34;/assets/a.pdf?_u=111&#34;},'
    '{&#34;feTitle&#34;:&#34;Catalogo giocattolo&#34;,&#34;title&#34;:&#34;x&#34;,&#34;validTo&#34;:1700000000000,&#34;pdfUrl&#34;:&#34;/assets/b.pdf&#34;},'
    '{&#34;feTitle&#34;:&#34;Manuale app&#34;,&#34;validFrom&#34;:1790000000000,&#34;validTo&#34;:1799000000000,&#34;pdfUrl&#34;:&#34;/assets/c.pdf&#34;}]}"></div>'
    '<a href="/altro.pdf">strategia fiscale</a>'
)


def test_embedded_json_flyers_with_dates():
    c = scraper.parse_embedded_flyers(EMBEDDED, "https://s.it/negozio")
    assert [x.url for x in c] == ["https://s.it/assets/a.pdf?_u=111", "https://s.it/assets/b.pdf", "https://s.it/assets/c.pdf"]
    assert c[0].title == "Nazionale" and c[0].valid_from == "2026-11-18" and c[0].valid_to == "2026-11-30"
    assert c[1].title == "Catalogo giocattolo"


def test_discover_prefers_embedded_skips_expired_and_excluded():
    from datetime import date
    out = scraper.discover_flyers(["https://s.it/negozio"], get_text=lambda u: EMBEDDED, exclude=["manuale"], today=date(2026, 11, 21))
    assert urls(out) == ["https://s.it/assets/a.pdf?_u=111"]  # b scaduto, c escluso, il link <a> ignorato


def test_flyer_id_ignores_query_hash():
    assert scraper.flyer_id_for("https://s.it/a.pdf?_u=1") == scraper.flyer_id_for("https://s.it/a.pdf?_u=2")
    assert scraper.flyer_id_for("https://s.it/a.pdf") != scraper.flyer_id_for("https://s.it/b.pdf")


def test_download_filters_non_pdf_and_hashes():
    out = scraper.download_pdfs([scraper.Candidate("https://s.it/a.pdf"), scraper.Candidate("https://s.it/b.pdf")], fetch=lambda u: b"%PDF-1" if "a" in u else None)
    assert len(out) == 1 and out[0].flyer_id == scraper.flyer_id_for("https://s.it/a.pdf") and len(out[0].sha256) == 64


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/x", "http://169.254.169.254/computeMetadata/v1/", "http://10.0.0.5/", "http://localhost/",
    "file:///etc/passwd", "ftp://example.com/a", "http://[::1]/",
])
def test_ssrf_blocked(url):
    with pytest.raises(scraper.UnsafeURL):
        scraper.assert_public_url(url)
