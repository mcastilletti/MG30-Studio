import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { rematch } from "../api";
import { db } from "../firebase";
import { useUserCollection } from "../hooks";
import type { CatalogOffer, Product, Store } from "../types";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
const PAGE = 100;

/** Nome adatto alla lista: toglie marca e formato dal titolo ("Latte p.s. Granarolo 1 l" → "Latte p.s."). */
function listName(o: CatalogOffer): string {
  let n = o.title;
  if (o.brand) n = n.replace(new RegExp(o.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  n = n.replace(/\b\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:kg|g|gr|l|lt|ml|cl|dl|pz)\b/gi, " ").replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|gr|l|lt|ml|cl|dl|pz)\b/gi, " ");
  return n.replace(/\s+/g, " ").trim() || o.title;
}
const EMPTY = { storeId: "", title: "", brand: "", price: "", originalPrice: "", quantity: "", validFrom: "", validTo: "" };

/** Catalogo di tutti i prodotti letti dai volantini (o inseriti a mano): cerca, correggi, aggiungi, elimina. */
export default function ProductsTab({ uid }: { uid: string }) {
  const offers = useUserCollection<CatalogOffer>(uid, "offers");
  const stores = useUserCollection<Store>(uid, "stores");
  const [q, setQ] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [hideExpired, setHideExpired] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const products = useUserCollection<Product>(uid, "products");
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  const [added, setAdded] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return offers
      .filter((o) => (!storeFilter || o.storeId === storeFilter || o.storeName === stores.find((s) => s.id === storeFilter)?.name))
      .filter((o) => !hideExpired || !o.validTo || o.validTo >= today)
      .filter((o) => { const h = norm(`${o.title} ${o.brand ?? ""} ${o.category ?? ""}`); return words.every((w) => h.includes(w)); })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [offers, stores, q, storeFilter, hideExpired, today]);

  function openNew() { setEditing(null); setForm({ ...EMPTY, storeId: storeFilter || stores[0]?.id || "" }); setErr(""); }
  function openEdit(o: CatalogOffer) {
    setEditing(o.id);
    setForm({
      storeId: o.storeId ?? stores.find((s) => s.name === o.storeName)?.id ?? "",
      title: o.title, brand: o.brand ?? "", price: String(o.price), originalPrice: o.originalPrice != null ? String(o.originalPrice) : "",
      quantity: o.quantity ?? "", validFrom: o.validFrom ?? "", validTo: o.validTo ?? "",
    });
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const price = num(form.price);
    if (!form.title.trim() || price == null || price <= 0) return setErr("Serve almeno un nome e un prezzo maggiore di zero.");
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) return setErr("La data di fine è prima di quella di inizio.");
    const store = stores.find((s) => s.id === form.storeId);
    if (!store && !editing) return setErr("Aggiungi prima un negozio nella tab Negozi.");
    const data = {
      title: form.title.trim(), brand: form.brand.trim() || null, price, originalPrice: num(form.originalPrice),
      quantity: form.quantity.trim() || null, validFrom: form.validFrom || null, validTo: form.validTo || null,
      ...(store ? { storeId: store.id, storeName: store.name } : {}),
    };
    if (editing) await updateDoc(doc(db, "users", uid, "offers", editing), data);
    else await addDoc(collection(db, "users", uid, "offers"), { ...data, category: null, notes: null, manual: true });
    setForm(null); setEditing(null); setErr("");
    rematch();
  }

  async function remove(o: CatalogOffer) {
    if (!confirm(`Eliminare "${o.title}"?`)) return;
    await deleteDoc(doc(db, "users", uid, "offers", o.id));
    rematch();
  }

  const inList = (name: string) => products.some((p) => norm(p.name) === norm(name.trim()));

  async function addToList() {
    if (!draft || !draft.name.trim() || inList(draft.name)) return;
    await addDoc(collection(db, "users", uid, "products"), { name: draft.name.trim(), keywords: [], excludes: [], maxPrice: null, unit: null });
    setAdded(`"${draft.name.trim()}" aggiunto alla lista`);
    setDraft(null);
    rematch();
  }

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <section>
      <div className="between">
        <h2>Prodotti nei volantini</h2>
        <button className="link" onClick={openNew}>+ Aggiungi a mano</button>
      </div>

      {form && (
        <form onSubmit={save} className="card form">
          <strong>{editing ? "Modifica prodotto" : "Nuovo prodotto"}</strong>
          <select value={form.storeId} onChange={set("storeId")} required={!editing}>
            <option value="">— negozio —</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="Nome prodotto" value={form.title} onChange={set("title")} required />
          <div className="row">
            <input placeholder="Marca (opz.)" value={form.brand} onChange={set("brand")} />
            <input placeholder="Formato (es. 500 g)" value={form.quantity} onChange={set("quantity")} />
          </div>
          <div className="row">
            <input placeholder="Prezzo €" inputMode="decimal" value={form.price} onChange={set("price")} required />
            <input placeholder="Prezzo pieno € (opz.)" inputMode="decimal" value={form.originalPrice} onChange={set("originalPrice")} />
          </div>
          <div className="row">
            <label>Valido dal<input type="date" value={form.validFrom} onChange={set("validFrom")} /></label>
            <label>al<input type="date" value={form.validTo} onChange={set("validTo")} /></label>
          </div>
          {err && <p className="error">{err}</p>}
          <div className="row">
            <button className="primary">{editing ? "Salva modifiche" : "Aggiungi"}</button>
            <button type="button" className="link" onClick={() => { setForm(null); setEditing(null); setErr(""); }}>Annulla</button>
          </div>
        </form>
      )}

      <div className="card form">
        <input type="search" placeholder="Cerca tra i prodotti (es. latte)" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
        <div className="row">
          <select value={storeFilter} onChange={(e) => { setStoreFilter(e.target.value); setLimit(PAGE); }}>
            <option value="">Tutti i negozi</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={hideExpired} onChange={(e) => setHideExpired(e.target.checked)} /> Nascondi scaduti</label>
        </div>
        {added && <small className="ok">✓ {added}</small>}
        <small className="muted">{shown.length} prodotti{offers.length !== shown.length ? ` (su ${offers.length})` : ""}</small>
      </div>

      <ul className="list">
        {shown.slice(0, limit).map((o) => (
          <li key={o.id} className="card">
            <div>
              <strong>{o.title}</strong>
              <small>
                {[o.storeName, o.brand, o.quantity, o.manual ? "inserito a mano" : "", o.validFrom || o.validTo ? `${o.validFrom ?? "…"} → ${o.validTo ?? "…"}` : ""].filter(Boolean).join(" · ")}
                {o.unitPrice != null ? ` · ${eur(o.unitPrice)}${o.unitLabel?.replace("€", "")}` : ""}
              </small>
            </div>
            {draft?.id === o.id && (
              <div className="draft">
                <input autoFocus value={draft.name} onChange={(e) => setDraft({ id: o.id, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addToList()} />
                <small className={inList(draft.name) ? "error" : "muted"}>{inList(draft.name) ? "Già in lista" : "Nome nella lista: i confronti cercheranno queste parole"}</small>
                <div className="row">
                  <button className="primary" disabled={!draft.name.trim() || inList(draft.name)} onClick={addToList}>Aggiungi alla lista</button>
                  <button className="link" onClick={() => setDraft(null)}>Annulla</button>
                </div>
              </div>
            )}
            <div className="price">
              {eur(o.price)}
              <button className="link" onClick={() => { setAdded(""); setDraft({ id: o.id, name: listName(o) }); }}>+ Lista</button>
              <button className="link" onClick={() => openEdit(o)}>Modifica</button>
              <button className="link danger" onClick={() => remove(o)}>Elimina</button>
            </div>
          </li>
        ))}
        {!shown.length && <p className="muted">{offers.length ? "Nessun prodotto corrisponde ai filtri." : "Ancora nessun prodotto: aggiungi un negozio e scansiona i volantini."}</p>}
      </ul>
      {shown.length > limit && <button className="link" onClick={() => setLimit(limit + PAGE)}>Mostra altri {Math.min(PAGE, shown.length - limit)}…</button>}
    </section>
  );
}
