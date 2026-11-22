import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import StoresTab from "./tabs/StoresTab";
import FavoritesTab from "./tabs/FavoritesTab";
import ShoppingTab from "./tabs/ShoppingTab";
import OffersTab from "./tabs/OffersTab";
import ProductsTab from "./tabs/ProductsTab";

type Tab = "offers" | "list" | "favorites" | "flyers" | "stores";
const TABS: [Tab, string][] = [["offers", "Offerte"], ["list", "Lista"], ["favorites", "Preferiti"], ["flyers", "Volantini"], ["stores", "Negozi"]];

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("offers");
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <p className="center">Caricamento…</p>;
  if (!user)
    return (
      <main className="center login">
        <h1>🛒 Sottocosto</h1>
        <p>Trova le offerte migliori per i prodotti che compri di solito.</p>
        <button className="primary" onClick={() => signInWithPopup(auth, googleProvider)}>
          Accedi con Google
        </button>
      </main>
    );

  return (
    <>
      <header>
        <h1>🛒 Sottocosto</h1>
        <nav>
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="link" onClick={() => signOut(auth)}>Esci</button>
      </header>
      <main>
        {tab === "offers" && <OffersTab uid={user.uid} goTo={setTab} focus={focus} onFocusDone={() => setFocus(null)} />}
        {tab === "list" && <ShoppingTab uid={user.uid} onOffer={(id) => { setFocus(id); setTab("offers"); }} />}
        {tab === "favorites" && <FavoritesTab uid={user.uid} />}
        {tab === "flyers" && <ProductsTab uid={user.uid} />}
        {tab === "stores" && <StoresTab uid={user.uid} />}
      </main>
    </>
  );
}
