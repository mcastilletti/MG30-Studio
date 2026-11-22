import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/** Ricalcola il confronto offerte↔prodotti dopo una modifica. */
export const rematch = () => httpsCallable(functions, "rematch")().catch(console.error);

let timer: ReturnType<typeof setTimeout> | undefined;
/** Come rematch, ma raggruppa più tocchi ravvicinati in una sola chiamata. */
export function rematchSoon(ms = 1500) {
  clearTimeout(timer);
  timer = setTimeout(rematch, ms);
}
