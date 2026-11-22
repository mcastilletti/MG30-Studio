import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useState, type FormEvent } from "react";
import { rematch } from "../api";
import { db } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Product } from "../types";
import CatalogPicker from "./CatalogPicker";

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function FavoritesTab({ uid }: { uid: string }) {
  const products = useUserCollection<Product>(uid, "products");
  const [editing, setEditing] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [excludes, setExcludes] = useState("");
  const [brands, setBrands] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [unit, setUnit] = useState("");

  function reset() {
    setEditing(null); setName(""); setKeywords(""); setExcludes(""); setBrands(""); setMaxPrice(""); setUnit("");
  }

  function edit(p: Product) {
    setEditing(p.id); setName(p.name); setKeywords(p.keywords.join(", ")); setExcludes(p.excludes.join(", ")); setBrands((p.brands ?? []).join(", "));
    setMaxPrice(p.maxPrice != null ? String(p.maxPrice) : ""); setUnit(p.unit ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const price = parseFloat(maxPrice.replace(",", "."));
    const data = {
      name: name.trim(), keywords: split(keywords), excludes: split(excludes), brands: split(brands),
      maxPrice: Number.isFinite(price) ? price : null, unit: unit || null,
    };
    if (editing) await updateDoc(doc(db, "users", uid, "products", editing), data);
    else await addDoc(collection(db, "users", uid, "products"), data);
    reset();
    rematch();
  }

  return (
    <section>
      <div className="between">
        <h2>Preferiti</h2>
        <button className="link" onClick={() => setPicker(!picker)}>{picker ? "Chiudi catalogo" : "📚 Scegli dal catalogo"}</button>
      </div>
      {picker && <CatalogPicker uid={uid} products={products} onClose={() => setPicker(false)} />}
      <form onSubmit={save} className="card form">
        <strong>{editing ? "Modifica preferito" : "Nuovo preferito"}</strong>
        <input placeholder="Prodotto (es. latte parzialmente scremato)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Parole chiave alternative, separate da virgola: ne basta una (opz.)" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        <input placeholder="Marche preferite, separate da virgola (opz.): le altre vanno in «Offerte altre marche»" value={brands} onChange={(e) => setBrands(e.target.value)} />
        <input placeholder="Escludi se contiene (es. soia, senza lattosio) (opz.)" value={excludes} onChange={(e) => setExcludes(e.target.value)} />
        <div className="row">
          <input placeholder="Prezzo obiettivo €" inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Confronta per: automatico</option>
            <option value="kg">€/kg</option>
            <option value="l">€/litro</option>
            <option value="pz">€/pezzo</option>
          </select>
        </div>
        <div className="row">
          <button className="primary">{editing ? "Salva modifiche" : "Aggiungi"}</button>
          {editing && <button type="button" className="link" onClick={reset}>Annulla</button>}
        </div>
      </form>
      <ul className="list">
        {products.map((p) => (
          <li key={p.id} className="card">
            <div>
              <strong>{p.name}</strong>
              <small>
                {[p.brands?.length ? `marche: ${p.brands.join(", ")}` : "", p.keywords.length ? `cerca: ${p.keywords.join(" oppure ")}` : "", p.excludes.length ? `escludi: ${p.excludes.join(", ")}` : "", p.maxPrice ? `obiettivo ≤ ${p.maxPrice.toFixed(2)} €` : "", p.unit ? `€/${p.unit}` : ""].filter(Boolean).join(" · ")}
              </small>
            </div>
            <span>
              <button className="link" onClick={() => edit(p)}>Modifica</button>
              <button className="link danger" onClick={async () => { await deleteDoc(doc(db, "users", uid, "products", p.id)); if (editing === p.id) reset(); rematch(); }}>Rimuovi</button>
            </span>
          </li>
        ))}
        {!products.length && <p className="muted">Nessun preferito: aggiungine uno per iniziare.</p>}
      </ul>
    </section>
  );
}
