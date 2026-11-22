import { collection, deleteDoc, doc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { useMemo, useState } from "react";
import { rematchSoon } from "../api";
import catalog from "../data/catalog.json";
import { iconFor } from "../data/icons";
import { db } from "../firebase";
import { useUserCollection } from "../hooks";
import type { ShoppingItem } from "../types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ITEMS = catalog.flatMap((g) => g.items.map((i) => ({ id: slug(i.name), name: i.name, keywords: i.keywords, category: g.category, icon: i.icon })));
const ICON_BY_ID = new Map(ITEMS.map((i) => [i.id, i.icon]));
const CATALOG_IDS = new Set(ITEMS.map((i) => i.id));

function Tile({ name, icon, on, count, onClick }: { name: string; icon?: string; on: boolean; count?: number; onClick: () => void }) {
  const Icon = iconFor(icon);
  return (
    <button className={`tile ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on} title={on ? "Tocca per togliere dalla lista" : "Tocca per aggiungere alla lista"}>
      {on && <span className="tick">✓</span>}
      {!!count && <span className="uses">×{count}</span>}
      <Icon className="icon" size={34} strokeWidth={1.6} aria-hidden />
      <span className="name">{name}</span>
    </button>
  );
}

/** Lista della spesa: card quadrate, ordinate dai prodotti messi in lista più spesso. Un tocco aggiunge, un altro toglie. */
export default function ShoppingTab({ uid }: { uid: string }) {
  const shopping = useUserCollection<ShoppingItem>(uid, "shoppingList");
  const usage = useUserCollection<{ id: string; count: number }>(uid, "catalogUsage");
  const [q, setQ] = useState("");

  const inList = useMemo(() => new Set(shopping.map((s) => s.id)), [shopping]);
  const counts = useMemo(() => new Map(usage.map((u) => [u.id, u.count])), [usage]);

  const sorted = useMemo(
    () => [...ITEMS].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, "it")),
    [counts],
  );

  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return sorted;
    // ogni parola cercata deve essere l'inizio di una parola del prodotto ("pa" → pane, pasta; non "coppa")
    return sorted.filter((i) => {
      const parts = norm(`${i.name} ${i.keywords.join(" ")}`).split(/[^a-z0-9]+/).filter(Boolean);
      return words.every((w) => parts.some((h) => h.startsWith(w)));
    });
  }, [sorted, q]);

  const mine = useMemo(() => [...shopping].sort((a, b) => a.name.localeCompare(b.name, "it")), [shopping]);

  async function add(item: { id: string; name: string; keywords: string[]; category?: string }) {
    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid, "shoppingList", item.id), {
      name: item.name, keywords: item.keywords, category: item.category ?? null, addedAt: serverTimestamp(),
    });
    if (CATALOG_IDS.has(item.id)) batch.set(doc(db, "users", uid, "catalogUsage", item.id), { name: item.name, count: increment(1) }, { merge: true });
    await batch.commit();
    rematchSoon();
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "users", uid, "shoppingList", id));
    rematchSoon();
  }

  const toggle = (item: { id: string; name: string; keywords: string[]; category?: string }) => (inList.has(item.id) ? remove(item.id) : add(item));

  const typed = q.trim();
  const customId = `custom-${slug(typed)}`;
  const canCustom = typed.length > 1 && !ITEMS.some((i) => norm(i.name) === norm(typed)) && !inList.has(customId);

  return (
    <section>
      <h2>Lista</h2>
      <input type="search" className="search" placeholder="Cerca un prodotto…" value={q} onChange={(e) => setQ(e.target.value)} />

      {mine.length > 0 && (
        <>
          <h3 className="sub">In lista ({mine.length})</h3>
          <div className="tiles">
            {mine.map((s) => <Tile key={s.id} name={s.name} icon={ICON_BY_ID.get(s.id)} on onClick={() => remove(s.id)} />)}
          </div>
        </>
      )}

      <h3 className="sub">Tutti i prodotti</h3>
      {canCustom && (
        <button className="link add-custom" onClick={() => { add({ id: customId, name: typed, keywords: [] }); setQ(""); }}>
          + Aggiungi «{typed}» alla lista
        </button>
      )}
      <div className="tiles">
        {shown.map((i) => <Tile key={i.id} name={i.name} icon={i.icon} on={inList.has(i.id)} count={counts.get(i.id)} onClick={() => toggle(i)} />)}
      </div>
      {!shown.length && !canCustom && <p className="muted">Nessun prodotto corrisponde a «{typed}».</p>}
    </section>
  );
}
