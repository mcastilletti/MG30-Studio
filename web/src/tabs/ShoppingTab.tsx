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
type GridItem = Generic & { icon?: string; favoriteId?: string; text: string };
type Link = { id: string; favoriteIds?: string[] };
type ListEntry = ShoppingItem & { favoriteId?: string; parentId?: string };
type Deal = { kind: "active" | "future"; productId: string; price?: number; store?: string };
type Fields = { quantity: string; description: string; notes: string };

const ITEMS = catalog.flatMap((g) => g.items.map((i) => ({ id: slug(i.name), name: i.name, keywords: i.keywords, category: g.category, icon: i.icon })));
const CATALOG_IDS = new Set(ITEMS.map((i) => i.id));
const ICON_BY_ID = new Map(ITEMS.map((i) => [i.id, i.icon]));

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

  const anyDetail = !!(f.quantity.trim() || f.description.trim() || f.notes.trim() || file);

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
        <small className="muted">Quantità, note e foto valgono solo finché il prodotto è in lista.</small>
        <label>Quantità da comprare<input value={f.quantity} onChange={set("quantity")} placeholder="es. 2, 500 g, 3 confezioni" /></label>
        <label>Descrizione<input value={f.description} onChange={set("description")} placeholder="es. senza lattosio, formato famiglia" /></label>
        <label>Note<textarea rows={3} value={f.notes} onChange={set("notes")} placeholder="es. prendere quelli in offerta, controllare la scadenza" /></label>

        {!target.fav && (
          <div className="link-box">
            <strong className="small">Preferiti agganciati</strong>
            <small className="muted">Cercando «{target.name}» compariranno anche questi preferiti, come card a parte. In lista va solo ciò che scegli tu.</small>
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
          <button className="primary" disabled={busy} onClick={save}>{busy ? "Salvo…" : !entry && anyDetail ? "Salva e aggiungi alla lista" : "Salva"}</button>
          <button className="link" disabled={busy} onClick={onClose}>Annulla</button>
        </div>
        {onRemove && <button className="link danger" disabled={busy} onClick={onRemove}>Togli dalla lista</button>}
      </div>
    </div>
  );
}

/** Lista della spesa: card quadrate ordinate per uso. Tocco = aggiungi/togli. Pressione prolungata = dettagli e preferiti. */
export default function ShoppingTab({ uid, onOffer }: { uid: string; onOffer: (productId: string) => void }) {
  const shopping = useUserCollection<ListEntry>(uid, "shoppingList");
  const usage = useUserCollection<{ id: string; count: number }>(uid, "catalogUsage");
  const links = useUserCollection<Link>(uid, "catalogLinks");
  const products = useUserCollection<Product>(uid, "products");
  const matches = useUserCollection<Match & { id: string }>(uid, "matches");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Generic | null>(null);

  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const entryById = useMemo(() => new Map(shopping.map((s) => [s.id, s])), [shopping]);
  /** Voci in lista valide (un preferito eliminato dai Preferiti sparisce anche dalla lista). */
  const entries = useMemo(() => shopping.filter((s) => !s.favoriteId || prodById.has(s.favoriteId)), [shopping, prodById]);
  const counts = useMemo(() => new Map(usage.map((u) => [u.id, u.count])), [usage]);
  const linkMap = useMemo(
    () => new Map(links.map((l) => [l.id, (l.favoriteIds ?? []).filter((id) => prodById.has(id))])),
    [links, prodById],
  );

  /** Preferiti agganciati: diventano card a sé nella griglia, trovabili cercando il generico o il loro nome. */
  const favCards = useMemo<GridItem[]>(() => {
    const parents = new Map<string, string[]>();
    for (const [gid, favIds] of linkMap) for (const fid of favIds) parents.set(fid, [...(parents.get(fid) ?? []), gid]);
    return [...parents].map(([favId, gids]) => {
      const p = prodById.get(favId)!;
      const parentText = gids.map((gid) => { const it = ITEMS.find((i) => i.id === gid); return it ? `${it.name} ${it.keywords.join(" ")}` : entryById.get(gid)?.name ?? ""; }).join(" ");
      return { id: `fav_${favId}`, favoriteId: favId, name: p.name, keywords: p.keywords, fav: true, icon: ICON_BY_ID.get(gids[0]) ?? "Star", text: `${p.name} ${p.keywords.join(" ")} ${parentText}` };
    });
  }, [linkMap, prodById, entryById]);
  const favIcon = useMemo(() => new Map(favCards.map((c) => [c.id, c.icon])), [favCards]);

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

  const sorted = useMemo<GridItem[]>(() => {
    const all: GridItem[] = [...ITEMS.map((i) => ({ ...i, text: `${i.name} ${i.keywords.join(" ")}` })), ...favCards];
    return all.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, "it"));
  }, [counts, favCards]);

  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return sorted;
    // ogni parola cercata deve essere l'inizio di una parola ("pa" → pane, pasta; non "coppa")
    return sorted.filter((i) => {
      const parts = norm(i.text).split(/[^a-z0-9]+/).filter(Boolean);
      return words.every((w) => parts.some((h) => h.startsWith(w)));
    });
  }, [sorted, q]);

  const inListSorted = useMemo(() => [...entries].sort((a, b) => a.name.localeCompare(b.name, "it")), [entries]);

  const entryRef = (id: string) => doc(db, "users", uid, "shoppingList", id);
  const countUse = (id: string, name: string, batch: ReturnType<typeof writeBatch>) => {
    if (CATALOG_IDS.has(id) || id.startsWith("fav_")) batch.set(doc(db, "users", uid, "catalogUsage", id), { name, count: increment(1) }, { merge: true });
  };
  const newEntry = (t: Generic, batch: ReturnType<typeof writeBatch>) => {
    const favId = t.id.startsWith("fav_") ? t.id.slice(4) : undefined;
    batch.set(entryRef(t.id), { name: t.name, keywords: t.keywords, category: t.category ?? null, ...(favId ? { favoriteId: favId } : {}), addedAt: serverTimestamp() }, { merge: true });
    countUse(t.id, t.name, batch);
  };
  const dropPhotoFile = (e?: ListEntry) => { if (e?.photoPath) deleteObject(ref(storage, e.photoPath)).catch(() => {}); };

  async function add(t: Generic) {
    const batch = writeBatch(db);
    newEntry(t, batch);
    await batch.commit();
    rematchSoon();
  }

  /** Togliere dalla lista cancella anche quantità, note e foto: sono informazioni solo per questo acquisto. */
  async function remove(id: string) {
    const e = entryById.get(id);
    await deleteDoc(entryRef(id));
    dropPhotoFile(e);
    rematchSoon();
  }

  async function saveDetail(t: Generic, f: Fields, linkIds: string[], file: File | null, dropPhoto: boolean) {
    const existing = entryById.get(t.id);
    const anyDetail = !!(f.quantity.trim() || f.description.trim() || f.notes.trim() || file);
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
    if (existing || anyDetail) { // i dettagli esistono solo per un prodotto in lista: se ne ha, lo aggiunge
      if (!existing) newEntry(t, batch);
      batch.set(entryRef(t.id), {
        quantity: f.quantity.trim() || null, description: f.description.trim() || null, notes: f.notes.trim() || null, photoUrl, photoPath,
      }, { merge: true });
    }
    if (!t.fav && (linkIds.length || linkMap.get(t.id)?.length)) batch.set(doc(db, "users", uid, "catalogLinks", t.id), { favoriteIds: linkIds }); // l'aggancio non mette nulla in lista
    await batch.commit();
    setDetail(null);
    rematchSoon();
  }

  const typed = q.trim();
  const customId = `custom-${slug(typed)}`;
  const canCustom = typed.length > 1 && !shown.length && !entryById.has(customId); // voce libera solo se nulla corrisponde
  const detailEntry = detail ? entryById.get(detail.id) : undefined;

  const tileFor = (t: Generic & { icon?: string }, withCount: boolean) => {
    const e = entryById.get(t.id);
    const on = !!e && (!t.fav || prodById.has(e.favoriteId ?? ""));
    const d = on ? dealFor(e) : null;
    return (
      <Tile key={t.id} name={t.name} icon={t.icon ?? favIcon.get(t.id) ?? ICON_BY_ID.get(t.id) ?? (t.fav ? "Star" : undefined)} on={on} fav={t.fav}
        count={withCount ? counts.get(t.id) : undefined} linked={t.fav ? undefined : linkMap.get(t.id)?.length}
        photo={on ? e?.photoUrl : undefined} qty={on ? e?.quantity : undefined} note={on && !!(e?.notes || e?.description)}
        deal={d} onDeal={() => d && onOffer(d.productId)}
        onClick={() => (on ? remove(t.id) : add(t))} onLongPress={() => setDetail(t)} />
    );
  };

  return (
    <section>
      <h2>Lista</h2>
      <input type="search" className="search" placeholder="Cerca un prodotto…" value={q} onChange={(e) => setQ(e.target.value)} />
      <small className="muted hint">Tocca per aggiungere o togliere · tieni premuto per quantità, note, foto e preferiti</small>

      {entries.length > 0 && (
        <>
          <h3 className="sub-title">In lista ({entries.length})</h3>
          <div className="tiles">
            {inListSorted.map((e) => tileFor({ id: e.id, name: e.name, keywords: e.keywords, category: e.category, fav: !!e.favoriteId }, false))}
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
          onRemove={detailEntry ? async () => { setDetail(null); await remove(detail.id); } : undefined}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
