import { collection, onSnapshot, query, type DocumentData } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

/** Collezione in tempo reale sotto users/{uid}/{name}. */
export function useUserCollection<T>(uid: string, name: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(
    () =>
      onSnapshot(query(collection(db, "users", uid, name)), (snap) =>
        setItems(snap.docs.map((d) => ({ ...(d.data() as DocumentData), id: d.id }) as T)),
      ),
    [uid, name],
  );
  return items;
}
