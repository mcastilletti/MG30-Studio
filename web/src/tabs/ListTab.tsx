import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useState, type FormEvent } from "react";
import { db, functions } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Product } from "../types";

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const rematch = () => httpsCallable(functions, "rematch")().catch(console.error);

export default function ListTab({ uid }: { uid: string }) {
  const products = useUserCollection<Product>(uid, "products");
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [excludes, setExcludes] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [unit, setUnit] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const price = parseFloat(maxPrice.replace(",", "."));
    await addDoc(collection(db, "users", uid, "products"), {
      name: name.trim(),
      keywords: split(keywords),
      excludes: split(excludes),
      maxPrice: Number.isFinite(price) ? price : null,
      unit: unit || null,
    });
    setName(""); setKeywords(""); setExcludes(""); setMaxPrice(""); setUnit("");
    rematch();
  }

  return (
    <section>
      <h2>I prodotti che compro</h2>
      <form onSubmit={add} className="card form">
        <input placeholder="Prodotto (es. latte parzialmente scremato)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Parole chiave obbligatorie, separate da virgola (opz.)" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
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
        <button className="primary">Aggiungi</button>
      </form>
      <ul className="list">
        {products.map((p) => (
          <li key={p.id} className="card">
            <div>
              <strong>{p.name}</strong>
              <small>
                {[p.keywords.length ? `cerca: ${p.keywords.join(", ")}` : "", p.excludes.length ? `escludi: ${p.excludes.join(", ")}` : "", p.maxPrice ? `obiettivo ≤ ${p.maxPrice.toFixed(2)} €` : "", p.unit ? `€/${p.unit}` : ""].filter(Boolean).join(" · ")}
              </small>
            </div>
            <button className="link danger" onClick={async () => { await deleteDoc(doc(db, "users", uid, "products", p.id)); rematch(); }}>Rimuovi</button>
          </li>
        ))}
        {!products.length && <p className="muted">Nessun prodotto: aggiungine uno per iniziare.</p>}
      </ul>
    </section>
  );
}
