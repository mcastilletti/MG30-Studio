import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { useState, type FormEvent } from "react";
import { db, functions, storage } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Flyer, Store } from "../types";

const STATUS: Record<Flyer["status"], string> = {
  uploading: "In arrivo…", processing: "Lettura in corso…", done: "Pronto", error: "Errore",
};
const parseWords = (s: string) => s.split(",").map((w) => w.trim()).filter(Boolean);
const parseUrls = (s: string) => s.split(/\s+/).map((u) => u.trim()).filter(Boolean);
const scan = (storeId?: string) => httpsCallable(functions, "scan_store")(storeId ? { storeId } : {});

export default function StoresTab({ uid }: { uid: string }) {
  const stores = useUserCollection<Store>(uid, "stores");
  const flyers = useUserCollection<Flyer>(uid, "flyers");
  const [name, setName] = useState("");
  const [urls, setUrls] = useState("");
  const [exclude, setExclude] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function run(key: string, storeId?: string) {
    setScanning(key); setErr("");
    try { await scan(storeId); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setScanning(null);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const list = parseUrls(urls);
    if (!name.trim() || !list.length) return;
    const bad = list.find((u) => !/^https?:\/\//i.test(u));
    if (bad) return setErr(`Link non valido (deve iniziare con http): ${bad}`);
    setErr("");
    const created = await addDoc(collection(db, "users", uid, "stores"), { name: name.trim(), urls: list, exclude: parseWords(exclude) });
    setName(""); setUrls(""); setExclude("");
    run(created.id, created.id);
  }

  async function removeStore(s: Store) {
    if (!confirm(`Rimuovere ${s.name} e i suoi volantini?`)) return;
    await Promise.all(flyers.filter((f) => f.storeId === s.id).map((f) => deleteDoc(doc(db, "users", uid, "flyers", f.id))));
    await deleteDoc(doc(db, "users", uid, "stores", s.id));
  }

  return (
    <section>
      <h2>Negozi</h2>
      <form onSubmit={add} className="card form">
        <input placeholder="Nome negozio (es. Coop)" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea placeholder={"Link alle pagine dei volantini, uno per riga\nhttps://www.negozio.it/volantino"} rows={3} value={urls} onChange={(e) => setUrls(e.target.value)} required />
        <input placeholder="Ignora volantini che contengono (opz., es. giocattolo, manuale, carta)" value={exclude} onChange={(e) => setExclude(e.target.value)} />
        <button className="primary">Aggiungi e cerca volantini</button>
        <small className="muted">L'app cerca i PDF in queste pagine ogni mattina. Funziona con link a PDF o pagine che li contengono; i siti con visualizzatori interattivi senza PDF scaricabile non sono leggibili (usa il caricamento manuale).</small>
        {err && <p className="error">{err}</p>}
      </form>

      {stores.length > 0 && (
        <button className="link" disabled={!!scanning} onClick={() => run("all")}>{scanning === "all" ? "Scansione…" : "↻ Scansiona tutti ora"}</button>
      )}

      {stores.map((s) => {
        const mine = flyers.filter((f) => f.storeId === s.id || (!f.storeId && f.storeName === s.name));
        return (
          <article key={s.id} className="card">
            <div className="between">
              <h3>{s.name}</h3>
              <span>
                <button className="link" disabled={!!scanning} onClick={() => run(s.id, s.id)}>{scanning === s.id ? "Scansione…" : "↻ Scansiona"}</button>
                <button className="link danger" onClick={() => removeStore(s)}>Rimuovi</button>
              </span>
            </div>
            <small>{s.urls.join(" · ")}</small>
            {!!s.exclude?.length && <small>Ignora: {s.exclude.join(", ")}</small>}
            {s.lastScanStatus && (
              <small className={s.lastScanStatus === "ok" ? "" : "error"}>
                {s.lastScanAt ? `Ultima scansione ${s.lastScanAt.toDate().toLocaleString("it-IT")}: ` : ""}{s.lastScanMessage}
              </small>
            )}
            <ul className="list">
              {mine.map((f) => (
                <li key={f.id}>
                  <div>
                    <small>{f.fileName}{f.validTo ? ` · fino al ${f.validTo}` : ""}</small>
                    <small className={f.status === "error" ? "error" : ""}>
                      {STATUS[f.status]}{f.status === "done" ? ` · ${f.offerCount ?? 0} offerte` : ""}{f.error ? ` · ${f.error}` : ""}
                    </small>
                  </div>
                  <button className="link danger" onClick={() => deleteDoc(doc(db, "users", uid, "flyers", f.id))}>Elimina</button>
                </li>
              ))}
            </ul>
            <ManualUpload uid={uid} store={s} />
          </article>
        );
      })}
      {!stores.length && <p className="muted">Nessun negozio: aggiungine uno con il link alla pagina dei suoi volantini.</p>}
    </section>
  );
}

/** Ripiego per siti non leggibili: carica a mano un PDF o una foto. */
function ManualUpload({ uid, store }: { uid: string; store: Store }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setBusy(true); setErr("");
    try {
      const flyerRef = doc(collection(db, "users", uid, "flyers"));
      await setDoc(flyerRef, { storeId: store.id, storeName: store.name, fileName: file.name, validFrom: null, validTo: null, status: "uploading", createdAt: serverTimestamp() });
      await uploadBytes(ref(storage, `flyers/${uid}/${flyerRef.id}/${file.name.replace(/[^\w.\-]+/g, "_")}`), file, { contentType: file.type });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  return (
    <details>
      <summary>Carica a mano</summary>
      <input type="file" disabled={busy} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {err && <p className="error">{err}</p>}
    </details>
  );
}

