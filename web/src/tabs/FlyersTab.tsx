import { deleteDoc, doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { useState, type FormEvent } from "react";
import { db, storage } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Flyer } from "../types";

const STATUS: Record<Flyer["status"], string> = {
  uploading: "Caricamento…", processing: "Lettura in corso…", done: "Pronto", error: "Errore",
};

export default function FlyersTab({ uid }: { uid: string }) {
  const flyers = useUserCollection<Flyer>(uid, "flyers");
  const [store, setStore] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stores = [...new Set(flyers.map((f) => f.storeName))];

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || !store.trim()) return;
    setBusy(true); setErr("");
    try {
      const flyerRef = doc(collection(db, "users", uid, "flyers"));
      await setDoc(flyerRef, {
        storeName: store.trim(), fileName: file.name, validFrom: from || null, validTo: to || null,
        status: "uploading", createdAt: serverTimestamp(),
      });
      // il documento esiste già: la Cloud Function lo aggiorna quando il file è su Storage
      await uploadBytes(ref(storage, `flyers/${uid}/${flyerRef.id}/${file.name.replace(/[^\w.\-]+/g, "_")}`), file, { contentType: file.type });
      setFile(null); (e.target as HTMLFormElement).reset();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Volantini</h2>
      <form onSubmit={upload} className="card form">
        <input list="stores" placeholder="Negozio (es. Coop, Lidl)" value={store} onChange={(e) => setStore(e.target.value)} required />
        <datalist id="stores">{stores.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="row">
          <label>Valido dal<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>al<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        <button className="primary" disabled={busy}>{busy ? "Carico…" : "Carica volantino (PDF o foto)"}</button>
        {err && <p className="error">{err}</p>}
        <small className="muted">Le date servono a ignorare le offerte scadute. Se il volantino le riporta, vengono lette in automatico.</small>
      </form>
      <ul className="list">
        {flyers.map((f) => (
          <li key={f.id} className="card">
            <div>
              <strong>{f.storeName}</strong> <small>{f.fileName}</small>
              <small className={f.status === "error" ? "error" : ""}>
                {STATUS[f.status]}{f.status === "done" ? ` · ${f.offerCount ?? 0} offerte` : ""}{f.error ? ` · ${f.error}` : ""}
                {f.validTo ? ` · fino al ${f.validTo}` : ""}
              </small>
            </div>
            <button className="link danger" onClick={() => deleteDoc(doc(db, "users", uid, "flyers", f.id))}>Elimina</button>
          </li>
        ))}
        {!flyers.length && <p className="muted">Nessun volantino caricato.</p>}
      </ul>
    </section>
  );
}
