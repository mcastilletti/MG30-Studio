import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from volantini.matcher import brand_ok, compute_matches, match_score, merge_products, normalize
from volantini.parser import clean_offers, parse_flyer
from volantini.units import parse_quantity, unit_price

TODAY = date(2026, 11, 21)


def test_parse_quantity():
    assert parse_quantity("500 g").amount == 500
    assert parse_quantity("1,5 l").amount == 1500
    assert parse_quantity("6x33cl").amount == 1980
    assert parse_quantity("Pasta Barilla 500g").base == "g"
    assert parse_quantity("solo testo") is None


def test_unit_price():
    assert unit_price(1.0, parse_quantity("500 g")) == (2.0, "€/kg")
    assert unit_price(1.2, parse_quantity("1 l")) == (1.2, "€/l")
    assert unit_price(3.0, parse_quantity("6 pz")) == (0.5, "€/pz")


def test_match_tolerates_plural_and_accents():
    p = {"name": "biscotto frollino"}
    assert match_score(p, {"title": "Biscotti frollini Mulino Bianco"}) > 0
    assert match_score({"name": "caffè"}, {"title": "CAFFE' Lavazza"}) > 0
    assert match_score({"name": "latte"}, {"title": "Latte di soia"}) > 0  # contiene "latte": scelta voluta
    assert match_score({"name": "latte", "excludes": ["soia"]}, {"title": "Latte di soia"}) == 0
    assert match_score({"name": "pasta penne"}, {"title": "Pasta spaghetti 500 g"}) == 0


def test_best_offer_by_unit_price_and_validity():
    products = [{"id": "p1", "name": "pasta", "maxPrice": 1.5}]
    offers = [
        {"id": "a", "storeName": "Coop", "title": "Pasta Barilla", "quantity": "500 g", "price": 0.99},
        {"id": "b", "storeName": "Lidl", "title": "Pasta penne", "quantity": "1 kg", "price": 1.50},  # 1.50 €/kg < 1.98
        {"id": "c", "storeName": "Esselunga", "title": "Pasta", "quantity": "500 g", "price": 0.5, "validTo": "2026-11-01"},
    ]
    [res] = compute_matches(products, offers, TODAY)
    assert res["best"]["offerId"] == "b" and res["best"]["unitLabel"] == "€/kg"
    assert [a["offerId"] for a in res["alternatives"]] == ["a"]  # "c" scaduta
    assert res["belowTarget"] is True


def test_no_match():
    [res] = compute_matches([{"id": "p", "name": "salmone"}], [{"id": "a", "title": "Pasta", "price": 1}], TODAY)
    assert res["best"] is None and res["alternatives"] == []


def test_clean_and_parse_with_fake_llm():
    raw = [
        {"title": " Latte ", "price": 1.1}, {"title": "Latte", "price": 1.1},
        {"title": "", "price": 2}, {"title": "x", "price": "n/a"}, {"title": "y", "price": 0},
    ]
    assert len(clean_offers(raw)) == 1
    out = parse_flyer(b"img", "image/png", llm=lambda *_: json.dumps([{"title": "Olio", "price": 4.99}]))
    assert out[0]["title"] == "Olio"


def test_normalize():
    assert normalize("Caffè  Lavazza!") == "caffe  lavazza "


def test_retry_delay():
    from volantini.parser import _retry_delay
    assert _retry_delay(RuntimeError("429 RESOURCE_EXHAUSTED ... retryDelay: 27s")) == 28
    assert _retry_delay(RuntimeError("429 quota")) == 20
    assert _retry_delay(RuntimeError("404 NOT_FOUND")) is None


def test_future_offers_are_found_and_flagged_separately():
    products = [{"id": "p", "name": "latte"}]
    offers = [
        {"id": "now", "title": "Latte", "price": 1.5, "validTo": "2026-11-25"},
        {"id": "tomorrow", "title": "Latte", "price": 1.0, "validFrom": "2026-11-23", "validTo": "2026-11-29"},
        {"id": "spring", "title": "Latte", "price": 0.9, "validFrom": "2027-03-01", "validTo": "2027-03-07"},
    ]
    [res] = compute_matches(products, offers, TODAY)
    assert res["best"]["offerId"] == "now" and res["best"]["startsOn"] is None  # la migliore valida adesso
    assert [u["offerId"] for u in res["upcoming"]] == ["tomorrow", "spring"]  # per data di inizio
    assert res["upcoming"][0]["startsOn"] == "2026-11-23"


def test_only_future_offers():
    [res] = compute_matches([{"id": "p", "name": "latte"}],
                            [{"id": "a", "title": "Latte", "price": 1.0, "validFrom": "2026-11-23"}], TODAY)
    assert res["best"] is None and len(res["upcoming"]) == 1


def test_italian_plurals_and_attached_quantities():
    for name, title in [
        ("mela", "Mele Golden 1 kg"), ("uova", "Uovo fresco"), ("latte 1l", "Latte intero 1 l"),
        ("pasta 500g", "Pasta penne Barilla 500 g"), ("biscotti", "Biscotto frollino"), ("pomodori", "Pomodoro ciliegino"),
    ]:
        assert match_score({"name": name}, {"title": title}) > 0, (name, title)
    # niente falsi positivi
    assert match_score({"name": "mela"}, {"title": "Melone"}) == 0
    assert match_score({"name": "pasta"}, {"title": "Pastiglie lavastoviglie"}) == 0
    assert match_score({"name": "1 kg"}, {"title": "Mele 1 kg"}) == 0  # solo quantità: nessun termine utile


def test_keywords_are_alternatives_words_inside_one_keyword_are_all_required():
    p = {"name": "latte", "keywords": ["latte fresco", "latte uht", "bevanda"]}
    assert match_score(p, {"title": "Latte UHT Milbona 1 l"}) > 0      # basta la seconda voce
    assert match_score(p, {"title": "Latte fresco intero"}) > 0       # o la prima
    assert match_score(p, {"title": "Bevanda di avena"}) > 0          # o la terza
    assert match_score(p, {"title": "Latte in polvere"}) == 0         # "latte" da solo non basta: le voci hanno due parole
    assert match_score({"name": "x", "keywords": ["latte", "yogurt"]}, {"title": "Yogurt greco"}) > 0
    # le esclusioni valgono sempre
    assert match_score({"name": "x", "keywords": ["latte", "yogurt"], "excludes": ["soia"]}, {"title": "Latte di soia"}) == 0


def test_merge_favorites_and_shopping_list():
    fav = [{"id": "f1", "name": "Latte", "keywords": ["latte uht"]}]
    lst = [{"id": "a", "name": "latte", "keywords": []}, {"id": "b", "name": "Pasta", "keywords": ["spaghetti"]}]
    merged = merge_products(fav, lst)
    assert [p["id"] for p in merged] == ["f1", "list_b"]  # "latte" duplicato: vince il preferito
    assert merged[1]["inList"] is True
    [r1, r2] = compute_matches(merged, [{"id": "o", "title": "Spaghetti Barilla", "price": 1.0}], TODAY)
    assert r1["best"] is None and r2["best"]["offerId"] == "o" and r2["inList"] is True


def test_attached_favorite_counts_as_in_list_without_duplicating():
    fav = [{"id": "f1", "name": "Gocciole Pavesi", "keywords": ["gocciole"]}, {"id": "f2", "name": "Altro", "keywords": ["altro"]}]
    lst = [
        {"id": "biscotti-al-cioccolato", "name": "Biscotti al cioccolato", "keywords": ["biscotti cioccolato"]},
        {"id": "fav_f1", "name": "Gocciole Pavesi", "favoriteId": "f1", "parentId": "biscotti-al-cioccolato", "keywords": []},
    ]
    merged = merge_products(fav, lst)
    assert [p["id"] for p in merged] == ["f1", "f2", "list_biscotti-al-cioccolato"]
    assert merged[0].get("inList") is True and not merged[1].get("inList")


def test_a_word_that_merely_starts_like_another_is_not_a_match():
    assert match_score({"name": "fusilli"}, {"title": "Fusi di Ali di Tacchino Conad 750 g"}) == 0
    assert match_score({"name": "fusilli"}, {"title": "Pennette rigate, spaghetti n.5, fusilli o tortiglioni BARILLA"}) > 0
    assert match_score({"name": "riso"}, {"title": "Risotto ai funghi"}) == 0
    assert match_score({"name": "pasta"}, {"title": "Pastiglie lavastoviglie"}) == 0
    # forme tronche o con una lettera di scarto continuano a funzionare
    assert match_score({"name": "biscott"}, {"title": "Biscotti frollini"}) > 0
    assert match_score({"name": "formaggi"}, {"title": "Formaggio grattugiato"}) > 0


def test_no_fuzzy_false_friends_but_doubled_letters_are_forgiven():
    for name, title in [("pesce", "Pesche gialle 1 kg"), ("cotto", "Cotton fioc 200 pz"), ("aceto balsamico", "Balsamo capelli"),
                        ("patate", "Patatine Pringles"), ("mela", "Melone"), ("acqua gassata", "Passata di pomodoro Cirio"),
                        ("finocchi", "Fiocchi d'avena")]:
        assert match_score({"name": name}, {"title": title}) == 0, (name, title)
    assert match_score({"name": "mozzarella"}, {"title": "Mozarella di bufala"}) > 0   # refuso
    assert match_score({"name": "prosciutto cotto"}, {"title": "Prosciutto cotto alta qualità"}) > 0
    assert match_score({"name": "pesce"}, {"title": "Pesce spada"}) > 0


def test_preferred_brands_split_offers_into_main_and_other_brands():
    product = {"id": "p", "name": "Biscotti frollini", "keywords": ["biscotti frollini"], "brands": ["Pavesi", "Mulino Bianco"]}
    offers = [
        {"id": "a", "title": "Biscotti frollini Pavesi", "brand": "Pavesi", "price": 2.0, "quantity": "500 g"},
        {"id": "b", "title": "Frollini Mulino Bianco Macine biscotti frollini", "price": 1.9, "quantity": "800 g"},
        {"id": "c", "title": "Biscotti frollini Coop", "brand": "Coop", "price": 1.0, "quantity": "500 g"},
        {"id": "d", "title": "Biscotti frollini Esselunga", "price": 0.9, "quantity": "500 g", "validFrom": "2026-11-25"},
    ]
    [res] = compute_matches([product], offers, TODAY)
    assert res["best"]["offerId"] == "b"                                  # solo marche preferite (più conveniente al kg)
    assert [a["offerId"] for a in res["alternatives"]] == ["a"]
    assert [o["offerId"] for o in res["otherBrands"]] == ["c", "d"]        # altre marche, prima quelle attive
    assert res["brands"] == ["Pavesi", "Mulino Bianco"]


def test_without_preferred_brands_everything_is_main():
    [res] = compute_matches([{"id": "p", "name": "latte"}], [{"id": "a", "title": "Latte Coop", "price": 1.0}], TODAY)
    assert res["best"]["offerId"] == "a" and res["otherBrands"] == []


def test_only_other_brands_leaves_main_empty():
    p = {"id": "p", "name": "pasta", "brands": ["Barilla"]}
    [res] = compute_matches([p], [{"id": "a", "title": "Pasta De Cecco", "price": 1.0}], TODAY)
    assert res["best"] is None and res["upcoming"] == [] and [o["offerId"] for o in res["otherBrands"]] == ["a"]


def test_brand_ok_uses_title_or_brand_field():
    assert brand_ok({"brands": ["Barilla"]}, {"title": "Penne rigate", "brand": "Barilla"})
    assert brand_ok({"brands": ["Mulino Bianco"]}, {"title": "Macine Mulino Bianco 800 g"})
    assert not brand_ok({"brands": ["Mulino"]}, {"title": "Biscotti Coop"})
    assert brand_ok({"brands": []}, {"title": "qualsiasi"})
