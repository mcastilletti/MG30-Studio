import { useUserCollection } from "../hooks";
import type { Match, Offer } from "../types";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

function OfferLine({ o, best }: { o: Offer; best?: boolean }) {
  return (
    <div className={`offer ${best ? "best" : ""}`}>
      <div>
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

export default function OffersTab({ uid, goTo }: { uid: string; goTo: (t: "list" | "flyers") => void }) {
  const matches = useUserCollection<Match & { id: string }>(uid, "matches");
  const withOffers = matches.filter((m) => m.best).sort((a, b) => Number(b.belowTarget) - Number(a.belowTarget) || a.productName.localeCompare(b.productName));
  const without = matches.filter((m) => !m.best);

  if (!matches.length)
    return (
      <p className="muted">
        Aggiungi i prodotti alla <a onClick={() => goTo("list")}>lista</a> e carica almeno un <a onClick={() => goTo("flyers")}>volantino</a>: qui vedrai le offerte migliori.
      </p>
    );

  return (
    <section>
      <h2>Offerte migliori</h2>
      {withOffers.map((m) => (
        <article key={m.id} className="card">
          <h3>{m.productName} {m.belowTarget && <span className="badge">sotto obiettivo</span>}</h3>
          <OfferLine o={m.best!} best />
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
