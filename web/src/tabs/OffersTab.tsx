import { httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { functions } from "../firebase";
import { useUserCollection } from "../hooks";
import type { Match, Offer } from "../types";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function OfferLine({ o, best }: { o: Offer; best?: boolean }) {
  return (
    <div className={`offer ${best ? "best" : ""} ${o.startsOn ? "future" : ""}`}>
      <div>
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
  const withOffers = matches.filter((m) => m.best || m.upcoming?.length).sort((a, b) => Number(b.belowTarget) - Number(a.belowTarget) || a.productName.localeCompare(b.productName));
  const without = matches.filter((m) => !m.best && !m.upcoming?.length);

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
      {withOffers.map((m) => (
        <article key={m.id} id={`offer-${m.id}`} className={`card ${flash === m.id ? "flash" : ""}`}>
          <h3>{m.productName} {m.inList && <span className="badge list">in lista</span>} {m.belowTarget && <span className="badge">sotto obiettivo</span>}</h3>
          {m.best && <OfferLine o={m.best} best />}
          {m.upcoming?.map((u, i) => <OfferLine key={`u${i}`} o={u} />)}
          {m.alternatives.length > 0 && (
            <details>
              <summary>Altre {m.alternatives.length} offerte</summary>
              {m.alternatives.map((o, i) => <OfferLine key={i} o={o} />)}
            </details>
          )}
        </article>
      ))}
      {!withOffers.length && <p className="muted">Nessuna offerta trovata per i tuoi prodotti nei volantini attivi.</p>}
      {without.length > 0 && <p className="muted">Senza offerte: {without.map((m) => m.productName).join(", ")}.</p>}
    </section>
  );
}
