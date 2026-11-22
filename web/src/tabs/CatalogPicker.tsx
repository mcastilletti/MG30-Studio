import { collection, doc, writeBatch } from "firebase/firestore";
import { useMemo, useState } from "react";
import { rematch } from "../api";
import catalog from "../data/catalog.json";
import { db } from "../firebase";
import type { Product } from "../types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Catalogo di prodotti generici (senza prezzi): si sceglie cosa mettere in lista, con parole chiave già pronte. */
export default function CatalogPicker({ uid, products, onClose }: { uid: string; products: Product[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const owned = useMemo(() => new Set(products.map((p) => norm(p.name))), [products]);

  const groups = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return catalog
      .filter((g) => !cat || g.category === cat)
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => { const h = norm(`${i.name} ${i.keywords.join(" ")}`); return words.every((w) => h.includes(w)); }),
      }))
      .filter((g) => g.items.length);
  }, [q, cat]);

  const toggle = (name: string) => setPicked((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });

  async function add() {
    setBusy(true);
    const batch = writeBatch(db);
    for (const g of catalog) for (const i of g.items) {
      if (picked.has(i.name) && !owned.has(norm(i.name)))
        batch.set(doc(collection(db, "users", uid, "products")), { name: i.name, keywords: i.keywords, excludes: [], maxPrice: null, unit: null });
    }
    await batch.commit();
    setBusy(false);
    rematch();
    onClose();
  }

  return (
    <div className="card form">
      <div className="between"><strong>Catalogo prodotti</strong><button className="link" onClick={onClose}>Chiudi</button></div>
      <input type="search" placeholder="Cerca (es. latte, pasta, detersivo)" value={q} onChange={(e) => setQ(e.target.value)} />
      <select value={cat} onChange={(e) => setCat(e.target.value)}>
        <option value="">Tutte le categorie</option>
        {catalog.map((g) => <option key={g.category} value={g.category}>{g.category}</option>)}
      </select>
      <div className="catalog">
        {groups.map((g) => (
          <div key={g.category}>
            <h4>{g.category}</h4>
            {g.items.map((i) => {
              const have = owned.has(norm(i.name));
              return (
                <label key={i.name} className={`check pick ${have ? "muted" : ""}`}>
                  <input type="checkbox" disabled={have} checked={have || picked.has(i.name)} onChange={() => toggle(i.name)} />
                  <span>{i.name}{have && " · già nei preferiti"}</span>
                </label>
              );
            })}
          </div>
        ))}
        {!groups.length && <p className="muted">Nessun prodotto corrisponde. Puoi aggiungerlo a mano dal modulo qui sotto.</p>}
      </div>
      <button className="primary" disabled={!picked.size || busy} onClick={add}>
        {busy ? "Aggiungo…" : picked.size ? `Aggiungi ${picked.size} ai preferiti` : "Seleziona dei prodotti"}
      </button>
    </div>
  );
}
