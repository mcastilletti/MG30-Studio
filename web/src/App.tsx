import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import FlyersTab from "./tabs/FlyersTab";
import ListTab from "./tabs/ListTab";
import OffersTab from "./tabs/OffersTab";

type Tab = "offers" | "list" | "flyers";
const TABS: [Tab, string][] = [["offers", "Offerte"], ["list", "Lista"], ["flyers", "Volantini"]];

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("offers");
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
        {tab === "offers" && <OffersTab uid={user.uid} goTo={setTab} />}
        {tab === "list" && <ListTab uid={user.uid} />}
        {tab === "flyers" && <FlyersTab uid={user.uid} />}
      </main>
    </>
  );
}
