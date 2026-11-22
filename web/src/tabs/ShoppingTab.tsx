import { collection, deleteDoc, doc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Camera, StickyNote } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { rematchSoon } from "../api";
import catalog from "../data/catalog.json";
import { iconFor } from "../data/icons";
import { db, storage } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Match, Product, ShoppingItem } from "../types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const LONG_PRESS_MS = 480;

type Generic = { id: string; name: string; keywords: string[]; category?: string; fav?: boolean };
type Link = { id: string; favoriteIds?: string[] };
type ListEntry = ShoppingItem & { favoriteId?: string; parentId?: string };
type Deal = { kind: "active" | "future"; productId: string; price?: number; store?: string };
type Fields = { quantity: string; description: string; notes: string };

const ITEMS = catalog.flatMap((g) => g.items.map((i) => ({ id: slug(i.name), name: i.name, keywords: i.keywords, category: g.category, icon: i.icon })));
const CATALOG_IDS = new Set(ITEMS.map((i) => i.id));
const ICON_BY_ID = new Map(ITEMS.map((i) => [i.id, i.icon]));
const hasDetails = (e?: ListEntry) => !!(e && (e.photoUrl || e.notes || e.description || (e.quantity && e.quantity.trim() !== "1")));

/** Riduce la foto (max 1024 px, JPEG) prima del caricamento: risparmia dati e rispetta l'orientamento. */
async function compress(file: File, max = 1024): Promise<Blob> {
  try {
    // alcuni browser non accettano l'opzione di orientamento: si riprova senza
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => createImageBitmap(file));
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.82));
  } catch {
    return file; // formato non decodificabile dal browser: si carica com'è
  }
}

/** Card quadrata: tocco = aggiungi/togli, pressione prolungata (o tasto destro) = dettagli. */
function Tile({ name, icon, on, count, linked, fav, photo, qty, note, deal, onDeal, onClick, onLongPress }: {
  name: string; icon?: string; on: boolean; count?: number; linked?: number; fav?: boolean; photo?: string | null; qty?: string | null;
  note?: boolean; deal?: Deal | null; onDeal?: () => void; onClick: () => void; onLongPress?: () => void;
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
  const q = qty?.trim();

  return (
    <div className={`tilebox ${deal ? `deal-${deal.kind}` : ""}`}>
      <button
        className={`tile ${on ? "on" : ""} ${fav ? "fav" : ""} ${photo ? "photo" : ""} ${deal ? "has-deal" : ""}`}
        style={photo ? { backgroundImage: `linear-gradient(#0000 30%, #000c), url("${photo}")` } : undefined}
        aria-pressed={on}
        title="Tocca per aggiungere/togliere · tieni premuto per i dettagli"
        onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
        onContextMenu={(e) => { e.preventDefault(); if (onLongPress && !fired.current) { fired.current = true; cancel(); onLongPress(); } }}
        onClick={() => { if (fired.current) { fired.current = false; return; } onClick(); }}
      >
        {on && <span className="tick">✓</span>}
        {on && q && q !== "1" ? <span className="qty">{/^\d+$/.test(q) ? `×${q}` : q}</span> : !!count && <span className="uses">×{count}</span>}
        {!photo && <Icon className="icon" size={34} strokeWidth={1.6} aria-hidden />}
        <span className="name">{name}</span>
        {fav && <span className="sub">preferito</span>}
        {(!!linked || note) && (
          <span className="meta">
            {!!linked && <span>★ {linked}</span>}
            {note && <StickyNote size={12} aria-hidden />}
          </span>
        )}
      </button>
      {deal && (
        <button className="deal-badge" onClick={onDeal} title={deal.price != null ? `${eur(deal.price)}${deal.store ? ` · ${deal.store}` : ""} — vai all'offerta` : "Vai all'offerta"}>
          {deal.kind === "active" ? "Offerta" : "Futura"}
        </button>
      )}
    </div>
  );
}

/** Scheda dettagli: quantità, descrizione, note, foto e (per i generici) preferiti agganciati. */
function DetailDialog({ target, entry, products, linked, onSave, onRemove, onClose }: {
  target: Generic; entry?: ListEntry; products: Product[]; linked: string[];
  onSave: (f: Fields, linkIds: string[], file: File | null, dropPhoto: boolean) => Promise<void>; onRemove?: () => void; onClose: () => void;
}) {
  const [f, setF] = useState<Fields>({ quantity: entry?.quantity ?? "", description: entry?.description ?? "", notes: entry?.notes ?? "" });
  const [picked, setPicked] = useState(new Set(linked));
  const [file, setFile] = useState<File | null>(null);
  const [dropPhoto, setDropPhoto] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : dropPhoto ? null : entry?.photoUrl ?? null), [file, dropPhoto, entry?.photoUrl]);
  useEffect(() => () => { if (file && preview) URL.revokeObjectURL(preview); }, [file, preview]);

  const words = norm(q).split(/\s+/).filter(Boolean);
  const shown = products.filter((p) => words.every((w) => norm(`${p.name} ${p.keywords.join(" ")}`).includes(w))).sort((a, b) => a.name.localeCompare(b.name, "it"));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const set = (k: keyof Fields) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save() {
    setBusy(true); setErr("");
    try { await onSave(f, [...picked], file, dropPhoto); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(false); }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <strong>{target.name}</strong>
        <div className="photo-row">
          <div className="thumb">{preview ? <img src={preview} alt="" /> : <Camera size={26} aria-hidden />}</div>
          <div className="photo-actions">
            <label className="link filebtn">
              {preview ? "Cambia foto" : "Aggiungi foto"}
              <input type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDropPhoto(false); e.target.value = ""; }} />
            </label>
            {preview && <button type="button" className="link danger" onClick={() => { setFile(null); setDropPhoto(true); }}>Rimuovi foto</button>}
          </div>
        </div>
        <label>Quantità da comprare<input value={f.quantity} onChange={set("quantity")} placeholder="es. 2, 500 g, 3 confezioni" /></label>
        <label>Descrizione<input value={f.description} onChange={set("description")} placeholder="es. senza lattosio, formato famiglia" /></label>
        <label>Note<textarea rows={3} value={f.notes} onChange={set("notes")} placeholder="es. prendere quelli in offerta, controllare la scadenza" /></label>

        {!target.fav && (
          <div className="link-box">
            <strong className="small">Preferiti agganciati</strong>
            <small className="muted">In lista vedrai il prodotto generico e, accanto, i preferiti scelti qui.</small>
            {products.length > 5 && <input type="search" placeholder="Cerca tra i preferiti…" value={q} onChange={(e) => setQ(e.target.value)} />}
            <div className="pick-list">
              {shown.map((p) => (
                <label key={p.id} className="check pick">
                  <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                  <span>{p.name}</span>
                </label>
              ))}
              {!products.length && <p className="muted">Non hai ancora preferiti: creane uno nella scheda Preferiti.</p>}
              {!!products.length && !shown.length && <p className="muted">Nessun preferito corrisponde.</p>}
            </div>
          </div>
        )}
        {err && <p className="error">{err}</p>}
        <div className="row">
          <button className="primary" disabled={busy} onClick={save}>{busy ? "Salvo…" : entry ? "Salva" : "Salva e aggiungi alla lista"}</button>
          <button className="link" disabled={busy} onClick={onClose}>Annulla</button>
        </div>
        {onRemove && <button className="link danger" disabled={busy} onClick={onRemove}>Togli dalla lista</button>}
      </div>
    </div>
  );
}

/** Lista della spesa: card quadrate ordinate per uso. Tocco = aggiungi/togli. Pressione prolungata = dettagli. */
export default function ShoppingTab({ uid, onOffer }: { uid: string; onOffer: (productId: string) => void }) {
  const shopping = useUserCollection<ListEntry>(uid, "shoppingList");
  const usage = useUserCollection<{ id: string; count: number }>(uid, "catalogUsage");
  const links = useUserCollection<Link>(uid, "catalogLinks");
  const products = useUserCollection<Product>(uid, "products");
  const matches = useUserCollection<Match & { id: string }>(uid, "matches");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Generic | null>(null);

  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const generics = useMemo(() => shopping.filter((s) => !s.favoriteId), [shopping]);
  const favEntries = useMemo(() => shopping.filter((s) => s.favoriteId && prodById.has(s.favoriteId)), [shopping, prodById]);
  const entryById = useMemo(() => new Map(shopping.map((s) => [s.id, s])), [shopping]);
  const inList = useMemo(() => new Set(generics.map((s) => s.id)), [generics]);
  const counts = useMemo(() => new Map(usage.map((u) => [u.id, u.count])), [usage]);
  const linkMap = useMemo(
    () => new Map(links.map((l) => [l.id, (l.favoriteIds ?? []).filter((id) => prodById.has(id))])),
    [links, prodById],
  );

  /** Offerta per una voce della lista: dal confronto con i volantini (match del generico, o del preferito omonimo). */
  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const matchByName = useMemo(() => new Map(matches.map((m) => [norm(m.productName).trim(), m])), [matches]);
  const dealFor = (e: ListEntry | undefined): Deal | null => {
    if (!e) return null;
    const m = e.favoriteId ? matchById.get(e.favoriteId) : matchById.get(`list_${e.id}`) ?? matchByName.get(norm(e.name).trim());
    if (!m) return null;
    if (m.best) return { kind: "active", productId: m.id, price: m.best.price, store: m.best.storeName };
    if (m.upcoming?.length) return { kind: "future", productId: m.id, price: m.upcoming[0].price, store: m.upcoming[0].storeName };
    return null;
  };

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

  const entryRef = (id: string) => doc(db, "users", uid, "shoppingList", id);
  const favEntryRef = (g: Generic, favId: string, batch: ReturnType<typeof writeBatch>) => {
    const p = prodById.get(favId)!;
    batch.set(entryRef(`fav_${favId}`), { name: p.name, keywords: [], favoriteId: favId, parentId: g.id, addedAt: serverTimestamp() }, { merge: true });
  };
  const genericRef = (g: Generic, batch: ReturnType<typeof writeBatch>) => {
    batch.set(entryRef(g.id), { name: g.name, keywords: g.keywords, category: g.category ?? null, addedAt: serverTimestamp() }, { merge: true });
    if (CATALOG_IDS.has(g.id)) batch.set(doc(db, "users", uid, "catalogUsage", g.id), { name: g.name, count: increment(1) }, { merge: true });
  };
  const dropPhotoFile = (e?: ListEntry) => { if (e?.photoPath) deleteObject(ref(storage, e.photoPath)).catch(() => {}); };

  async function add(g: Generic) {
    const batch = writeBatch(db);
    genericRef(g, batch);
    for (const favId of linkMap.get(g.id) ?? []) favEntryRef(g, favId, batch); // insieme al generico, i preferiti agganciati
    await batch.commit();
    rematchSoon();
  }

  async function removeGeneric(id: string) {
    const mine = [entryById.get(id), ...shopping.filter((f) => f.parentId === id)];
    if (mine.some(hasDetails) && !confirm("Questa voce ha quantità, note o foto che andranno perse. Toglierla dalla lista?")) return;
    const batch = writeBatch(db);
    batch.delete(entryRef(id));
    for (const f of shopping) if (f.parentId === id) batch.delete(entryRef(f.id));
    await batch.commit();
    mine.forEach(dropPhotoFile);
    rematchSoon();
  }

  async function removeFavEntry(id: string) {
    const e = entryById.get(id);
    if (hasDetails(e) && !confirm("Questa voce ha quantità, note o foto che andranno perse. Toglierla dalla lista?")) return;
    await deleteDoc(entryRef(id));
    dropPhotoFile(e);
    rematchSoon();
  }

  async function saveDetail(t: Generic, f: Fields, linkIds: string[], file: File | null, dropPhoto: boolean) {
    const existing = entryById.get(t.id);
    let photoUrl = existing?.photoUrl ?? null;
    let photoPath = existing?.photoPath ?? null;
    if ((file || dropPhoto) && photoPath) { dropPhotoFile(existing); photoUrl = null; photoPath = null; }
    if (file) {
      const blob = await compress(file);
      const type = blob.type || "image/jpeg";
      photoPath = `photos/${uid}/${t.id}/${Date.now()}.${type.split("/")[1] ?? "jpg"}`;
      const r = ref(storage, photoPath);
      await uploadBytes(r, blob, { contentType: type });
      photoUrl = await getDownloadURL(r);
    }
    const batch = writeBatch(db);
    if (!existing) genericRef(t, batch); // dettagli su un prodotto non ancora in lista: lo aggiunge
    batch.set(entryRef(t.id), {
      quantity: f.quantity.trim() || null, description: f.description.trim() || null, notes: f.notes.trim() || null, photoUrl, photoPath,
    }, { merge: true });
    if (!t.fav) {
      batch.set(doc(db, "users", uid, "catalogLinks", t.id), { favoriteIds: linkIds });
      for (const id of linkIds) favEntryRef(t, id, batch);
      for (const e of shopping) if (e.parentId === t.id && e.favoriteId && !linkIds.includes(e.favoriteId)) batch.delete(entryRef(e.id));
    }
    await batch.commit();
    setDetail(null);
    rematchSoon();
  }

  const toggle = (g: Generic) => (inList.has(g.id) ? removeGeneric(g.id) : add(g));
  const openFav = (f: ListEntry): Generic => ({ id: f.id, name: f.name, keywords: [], fav: true });

  const typed = q.trim();
  const customId = `custom-${slug(typed)}`;
  const canCustom = typed.length > 1 && !ITEMS.some((i) => norm(i.name) === norm(typed)) && !inList.has(customId);
  const detailEntry = detail ? entryById.get(detail.id) : undefined;

  const tileFor = (g: Generic & { icon?: string }, withCount: boolean) => {
    const e = entryById.get(g.id);
    return (
      <Tile key={g.id} name={g.name} icon={g.icon ?? ICON_BY_ID.get(g.id)} on={inList.has(g.id)} count={withCount ? counts.get(g.id) : undefined}
        linked={linkMap.get(g.id)?.length} photo={e?.photoUrl} qty={e?.quantity} note={!!(e?.notes || e?.description)}
        deal={inList.has(g.id) ? dealFor(e) : null} onDeal={() => { const d = dealFor(e); if (d) onOffer(d.productId); }}
        onClick={() => toggle(g)} onLongPress={() => setDetail(g)} />
    );
  };
  const favTile = (f: ListEntry) => {
    const d = dealFor(f);
    return (
      <Tile key={f.id} name={f.name} icon="Star" on fav photo={f.photoUrl} qty={f.quantity} note={!!(f.notes || f.description)}
        deal={d} onDeal={() => d && onOffer(d.productId)} onClick={() => removeFavEntry(f.id)} onLongPress={() => setDetail(openFav(f))} />
    );
  };

  return (
    <section>
      <h2>Lista</h2>
      <input type="search" className="search" placeholder="Cerca un prodotto…" value={q} onChange={(e) => setQ(e.target.value)} />
      <small className="muted hint">Tocca per aggiungere o togliere · tieni premuto per quantità, note, foto e preferiti</small>

      {total > 0 && (
        <>
          <h3 className="sub-title">In lista ({total})</h3>
          <div className="tiles">
            {groups.out.map(({ g, favs }) => (
              <div key={g.id} className="group">
                {tileFor(g, false)}
                {favs.map(favTile)}
              </div>
            ))}
            {groups.orphans.map(favTile)}
          </div>
        </>
      )}

      <h3 className="sub-title">Tutti i prodotti</h3>
      {canCustom && (
        <button className="link add-custom" onClick={() => { add({ id: customId, name: typed, keywords: [] }); setQ(""); }}>
          + Aggiungi «{typed}» alla lista
        </button>
      )}
      <div className="tiles">{shown.map((i) => tileFor(i, true))}</div>
      {!shown.length && !canCustom && <p className="muted">Nessun prodotto corrisponde a «{typed}».</p>}

      {detail && (
        <DetailDialog
          target={detail} entry={detailEntry} products={products} linked={linkMap.get(detail.id) ?? []}
          onSave={(f, ids, file, drop) => saveDetail(detail, f, ids, file, drop)}
          onRemove={detailEntry ? async () => { setDetail(null); await (detail.fav ? removeFavEntry(detail.id) : removeGeneric(detail.id)); } : undefined}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
