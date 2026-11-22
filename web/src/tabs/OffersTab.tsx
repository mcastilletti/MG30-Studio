import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { db, functions } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Match, Offer, ShoppingItem } from "../types";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function OfferLine({ o, best }: { o: Offer; best?: boolean }) {
  return (
    <div className={`offer ${best ? "best" : ""} ${o.startsOn ? "future" : ""}`}>
      <div>
        {o.brand && <span className="brand">{o.brand}</span>}
        {o.startsOn && <span className="badge future">Futura · dal {dayMonth(o.startsOn)}</span>}{" "}
        <strong>{o.storeName}</strong>
        <span> {o.title}{o.quantity ? ` · ${o.quantity}` : ""}</span>
        <small>
          {o.unitPrice != null && `${eur(o.unitPrice)} ${o.unitLabel?.replace("€", "")}`}
          {o.validTo ? ` · fino al ${o.validTo}` : ""}{o.notes ? ` · ${o.notes}` : ""}
        </small>
      </div>
      <div className="price">
        {eur(o.price)}
        {o.originalPrice ? <s>{eur(o.originalPrice)}</s> : null}
      </div>
    </div>
  );
}

export default function OffersTab({ uid, goTo, focus, onFocusDone }: { uid: string; goTo: (t: "list" | "favorites" | "stores") => void; focus?: string | null; onFocusDone?: () => void }) {
  const matches = useUserCollection<Match & { id: string }>(uid, "matches");
  const shopping = useUserCollection<ShoppingItem & { favoriteId?: string }>(uid, "shoppingList");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  // arrivo da una card della Lista: scorre fino all'offerta di quel prodotto e la evidenzia per qualche secondo
  useEffect(() => {
    if (!focus || !matches.some((m) => m.id === focus)) return;
    const el = document.getElementById(`offer-${focus}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(focus);
    onFocusDone?.();
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [focus, matches]);

  const refresh = async () => {
    setBusy(true);
    try { await httpsCallable(functions, "rematch")(); } catch (e) { console.error(e); }
    setBusy(false);
  };
  /** Voce della Lista che corrisponde a questo prodotto (preferito agganciato o voce generica). */
  const entryFor = (m: Match & { id: string }) => shopping.find((e) => e.favoriteId === m.id) ?? shopping.find((e) => `list_${e.id}` === m.id);
  const choose = (e: ShoppingItem, altBrand: "use" | "regular" | "wait" | null, o?: Offer) =>
    updateDoc(doc(db, "users", uid, "shoppingList", e.id), {
      altBrand,
      altOffer: altBrand === "use" && o
        ? { offerId: o.offerId ?? null, storeName: o.storeName, title: o.title, brand: o.brand ?? null, price: o.price, quantity: o.quantity ?? null, validTo: o.validTo ?? null, startsOn: o.startsOn ?? null }
        : null,
    });
  const hasAny = (m: Match) => !!(m.best || m.upcoming?.length || m.otherBrands?.length);
  const withOffers = matches.filter(hasAny).sort((a, b) => Number(b.belowTarget) - Number(a.belowTarget) || a.productName.localeCompare(b.productName));
  const without = matches.filter((m) => !hasAny(m));

  if (!matches.length)
    return (
      <p className="muted">
        Scegli i prodotti nella <a onClick={() => goTo("list")}>lista</a> (o tra i <a onClick={() => goTo("favorites")}>preferiti</a>) e aggiungi almeno un <a onClick={() => goTo("stores")}>negozio</a>: qui vedrai le offerte migliori.
      </p>
    );

  return (
    <section>
      <div className="between">
        <h2>Offerte migliori</h2>
        <button className="link" disabled={busy} onClick={refresh}>{busy ? "Aggiorno…" : "↻ Aggiorna confronto"}</button>
      </div>
      {withOffers.map((m) => {
        const entry = entryFor(m);
        const hasMain = !!(m.best || m.upcoming?.length);
        return (
          <article key={m.id} id={`offer-${m.id}`} className={`card ${flash === m.id ? "flash" : ""}`}>
            <h3>{m.productName} {m.inList && <span className="badge list">in lista</span>} {m.belowTarget && <span className="badge">sotto obiettivo</span>}</h3>
            {!!m.brands?.length && <small className="muted">Marche preferite: {m.brands.join(", ")}</small>}
            {m.best && <OfferLine o={m.best} best />}
            {m.upcoming?.map((u, i) => <OfferLine key={`u${i}`} o={u} />)}
            {!hasMain && !!m.brands?.length && <p className="muted nomain">Nessuna offerta delle marche preferite.</p>}
            {m.alternatives.length > 0 && (
              <details>
                <summary>Altre {m.alternatives.length} offerte</summary>
                {m.alternatives.map((o, i) => <OfferLine key={i} o={o} />)}
              </details>
            )}
            {!!m.otherBrands?.length && (
              <div className="other-brands">
                <h4 className="group-title">Offerte altre marche</h4>
                {m.otherBrands.map((o, i) => {
                  const inUse = entry?.altBrand === "use" && entry.altOffer?.offerId && entry.altOffer.offerId === o.offerId;
                  return (
                    <div key={i}>
                      <OfferLine o={o} />
                      {entry && (
                        <button className={`choice-btn ${inUse ? "on" : ""}`} onClick={() => choose(entry, "use", o)}>
                          {inUse ? "✓ Offerta in uso" : "Usa questa offerta"}
                        </button>
                      )}
                    </div>
                  );
                })}
                {entry ? (
                  <div className="choice">
                    <small className="muted">Per «{entry.name}» in lista:</small>
                    <button className={`choice-btn ${entry.altBrand === "regular" ? "on" : ""}`} onClick={() => choose(entry, "regular")}>
                      {entry.altBrand === "regular" ? "✓ " : ""}Tieni il prodotto non in offerta
                    </button>
                    <button className={`choice-btn ${entry.altBrand === "wait" ? "on" : ""}`} onClick={() => choose(entry, "wait")}>
                      {entry.altBrand === "wait" ? "✓ " : ""}In offerta solo quando c'è una marca preferita
                    </button>
                    {entry.altBrand && <button className="link" onClick={() => choose(entry, null)}>Annulla la scelta</button>}
                  </div>
                ) : (
                  <small className="muted">Metti il prodotto in Lista per scegliere se usare una di queste offerte.</small>
                )}
              </div>
            )}
          </article>
        );
      })}
      {!withOffers.length && <p className="muted">Nessuna offerta trovata per i tuoi prodotti nei volantini attivi.</p>}
      {without.length > 0 && <p className="muted">Senza offerte: {without.map((m) => m.productName).join(", ")}.</p>}
    </section>
  );
}
