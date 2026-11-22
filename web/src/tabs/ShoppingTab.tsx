import { collection, deleteDoc, doc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { useMemo, useRef, useState } from "react";
import { rematchSoon } from "../api";
import catalog from "../data/catalog.json";
import { iconFor } from "../data/icons";
import { db } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Product, ShoppingItem } from "../types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const LONG_PRESS_MS = 480;

type Generic = { id: string; name: string; keywords: string[]; category?: string };
type Link = { id: string; favoriteIds?: string[] };
type ListEntry = ShoppingItem & { favoriteId?: string; parentId?: string };

const ITEMS = catalog.flatMap((g) => g.items.map((i) => ({ id: slug(i.name), name: i.name, keywords: i.keywords, category: g.category, icon: i.icon })));
const CATALOG_IDS = new Set(ITEMS.map((i) => i.id));
const ICON_BY_ID = new Map(ITEMS.map((i) => [i.id, i.icon]));

/** Card quadrata: tocco = aggiungi/togli, pressione prolungata (o tasto destro) = onLongPress. */
function Tile({ name, icon, on, count, linked, fav, onClick, onLongPress }: {
  name: string; icon?: string; on: boolean; count?: number; linked?: number; fav?: boolean; onClick: () => void; onLongPress?: () => void;
}) {
  const Icon = iconFor(icon);
  const timer = useRef<number>();
  const fired = useRef(false);

  const start = () => {
    if (!onLongPress) return;
    fired.current = false;
    timer.current = window.setTimeout(() => { fired.current = true; navigator.vibrate?.(15); onLongPress(); }, LONG_PRESS_MS);
  };
  const cancel = () => window.clearTimeout(timer.current);

  return (
    <button
      className={`tile ${on ? "on" : ""} ${fav ? "fav" : ""}`}
      aria-pressed={on}
      title={fav ? "Preferito agganciato: tocca per toglierlo dalla lista" : on ? "Tocca per togliere dalla lista · tieni premuto per agganciare un preferito" : "Tocca per aggiungere alla lista · tieni premuto per agganciare un preferito"}
      onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onContextMenu={(e) => { e.preventDefault(); if (onLongPress && !fired.current) { fired.current = true; cancel(); onLongPress(); } }}
      onClick={() => { if (fired.current) { fired.current = false; return; } onClick(); }}
    >
      {on && <span className="tick">✓</span>}
      {!!count && <span className="uses">×{count}</span>}
      {!!linked && <span className="links">★ {linked}</span>}
      <Icon className="icon" size={34} strokeWidth={1.6} aria-hidden />
      <span className="name">{name}</span>
      {fav && <span className="sub">preferito</span>}
    </button>
  );
}

/** Finestra per scegliere quali preferiti agganciare a un prodotto generico. */
function LinkDialog({ generic, products, selected, onSave, onClose }: {
  generic: Generic; products: Product[]; selected: string[]; onSave: (ids: string[]) => void; onClose: () => void;
}) {
  const [picked, setPicked] = useState(new Set(selected));
  const [q, setQ] = useState("");
  const words = norm(q).split(/\s+/).filter(Boolean);
  const shown = products
    .filter((p) => words.every((w) => norm(`${p.name} ${p.keywords.join(" ")}`).includes(w)))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <strong>Aggancia preferiti a «{generic.name}»</strong>
        <small className="muted">In lista vedrai il prodotto generico e, accanto, i preferiti scelti qui.</small>
        {products.length > 5 && <input type="search" placeholder="Cerca tra i preferiti…" value={q} onChange={(e) => setQ(e.target.value)} />}
        <div className="pick-list">
          {shown.map((p) => (
            <label key={p.id} className="check pick">
              <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
          {!products.length && <p className="muted">Non hai ancora preferiti: creane uno nella scheda Preferiti, poi torna qui.</p>}
          {!!products.length && !shown.length && <p className="muted">Nessun preferito corrisponde.</p>}
        </div>
        <div className="row">
          <button className="primary" onClick={() => onSave([...picked])}>{picked.size ? `Aggancia ${picked.size}` : "Salva senza preferiti"}</button>
          <button className="link" onClick={onClose}>Annulla</button>
        </div>
      </div>
    </div>
  );
}

/** Lista della spesa: card quadrate ordinate per uso. Tocco = aggiungi/togli. Pressione prolungata = aggancia preferiti. */
export default function ShoppingTab({ uid }: { uid: string }) {
  const shopping = useUserCollection<ListEntry>(uid, "shoppingList");
  const usage = useUserCollection<{ id: string; count: number }>(uid, "catalogUsage");
  const links = useUserCollection<Link>(uid, "catalogLinks");
  const products = useUserCollection<Product>(uid, "products");
  const [q, setQ] = useState("");
  const [linking, setLinking] = useState<Generic | null>(null);

  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const generics = useMemo(() => shopping.filter((s) => !s.favoriteId), [shopping]);
  const favEntries = useMemo(() => shopping.filter((s) => s.favoriteId && prodById.has(s.favoriteId)), [shopping, prodById]);
  const inList = useMemo(() => new Set(generics.map((s) => s.id)), [generics]);
  const counts = useMemo(() => new Map(usage.map((u) => [u.id, u.count])), [usage]);
  const linkMap = useMemo(
    () => new Map(links.map((l) => [l.id, (l.favoriteIds ?? []).filter((id) => prodById.has(id))])),
    [links, prodById],
  );

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

  /** "In lista": ogni generico seguito dai suoi preferiti agganciati. */
  const groups = useMemo(() => {
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "it");
    const out = [...generics].sort(byName).map((g) => ({ g, favs: favEntries.filter((f) => f.parentId === g.id).sort(byName) }));
    const orphans = favEntries.filter((f) => !f.parentId || !inList.has(f.parentId)).sort(byName);
    return { out, orphans };
  }, [generics, favEntries, inList]);
  const total = generics.length + favEntries.length;

  const favEntryRef = (g: Generic, favId: string, batch: ReturnType<typeof writeBatch>) => {
    const p = prodById.get(favId)!;
    batch.set(doc(db, "users", uid, "shoppingList", `fav_${favId}`), { name: p.name, keywords: [], favoriteId: favId, parentId: g.id, addedAt: serverTimestamp() });
  };

  const genericRef = (g: Generic, batch: ReturnType<typeof writeBatch>) => {
    batch.set(doc(db, "users", uid, "shoppingList", g.id), { name: g.name, keywords: g.keywords, category: g.category ?? null, addedAt: serverTimestamp() });
    if (CATALOG_IDS.has(g.id)) batch.set(doc(db, "users", uid, "catalogUsage", g.id), { name: g.name, count: increment(1) }, { merge: true });
  };

  async function add(g: Generic) {
    const batch = writeBatch(db);
    genericRef(g, batch);
    for (const favId of linkMap.get(g.id) ?? []) favEntryRef(g, favId, batch); // insieme al generico, i preferiti agganciati
    await batch.commit();
    rematchSoon();
  }

  async function removeGeneric(id: string) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "users", uid, "shoppingList", id));
    for (const f of shopping) if (f.parentId === id) batch.delete(doc(db, "users", uid, "shoppingList", f.id));
    await batch.commit();
    rematchSoon();
  }

  async function removeFavEntry(id: string) {
    await deleteDoc(doc(db, "users", uid, "shoppingList", id));
    rematchSoon();
  }

  async function saveLinks(g: Generic, ids: string[]) {
    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid, "catalogLinks", g.id), { favoriteIds: ids });
    if (!inList.has(g.id)) genericRef(g, batch); // agganciare un preferito mette anche il generico in lista
    for (const id of ids) favEntryRef(g, id, batch);
    for (const f of shopping) if (f.parentId === g.id && f.favoriteId && !ids.includes(f.favoriteId)) batch.delete(doc(db, "users", uid, "shoppingList", f.id));
    await batch.commit();
    setLinking(null);
    rematchSoon();
  }

  const toggle = (g: Generic) => (inList.has(g.id) ? removeGeneric(g.id) : add(g));

  const typed = q.trim();
  const customId = `custom-${slug(typed)}`;
  const canCustom = typed.length > 1 && !ITEMS.some((i) => norm(i.name) === norm(typed)) && !inList.has(customId);

  return (
    <section>
      <h2>Lista</h2>
      <input type="search" className="search" placeholder="Cerca un prodotto…" value={q} onChange={(e) => setQ(e.target.value)} />
      <small className="muted hint">Tocca per aggiungere o togliere · tieni premuto per agganciare un preferito</small>

      {total > 0 && (
        <>
          <h3 className="sub-title">In lista ({total})</h3>
          <div className="tiles">
            {groups.out.map(({ g, favs }) => (
              <div key={g.id} className="group">
                <Tile name={g.name} icon={ICON_BY_ID.get(g.id)} on linked={linkMap.get(g.id)?.length} onClick={() => removeGeneric(g.id)} onLongPress={() => setLinking(g)} />
                {favs.map((f) => <Tile key={f.id} name={f.name} icon="Star" on fav onClick={() => removeFavEntry(f.id)} />)}
              </div>
            ))}
            {groups.orphans.map((f) => <Tile key={f.id} name={f.name} icon="Star" on fav onClick={() => removeFavEntry(f.id)} />)}
          </div>
        </>
      )}

      <h3 className="sub-title">Tutti i prodotti</h3>
      {canCustom && (
        <button className="link add-custom" onClick={() => { add({ id: customId, name: typed, keywords: [] }); setQ(""); }}>
          + Aggiungi «{typed}» alla lista
        </button>
      )}
      <div className="tiles">
        {shown.map((i) => (
          <Tile key={i.id} name={i.name} icon={i.icon} on={inList.has(i.id)} count={counts.get(i.id)} linked={linkMap.get(i.id)?.length}
            onClick={() => toggle(i)} onLongPress={() => setLinking(i)} />
        ))}
      </div>
      {!shown.length && !canCustom && <p className="muted">Nessun prodotto corrisponde a «{typed}».</p>}

      {linking && (
        <LinkDialog generic={linking} products={products} selected={linkMap.get(linking.id) ?? []} onSave={(ids) => saveLinks(linking, ids)} onClose={() => setLinking(null)} />
      )}
    </section>
  );
}
