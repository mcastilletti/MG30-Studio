import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/** Ricalcola il confronto offerte↔lista dopo una modifica. */
export const rematch = () => httpsCallable(functions, "rematch")().catch(console.error);
