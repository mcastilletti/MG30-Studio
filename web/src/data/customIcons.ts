import { createLucideIcon } from "lucide-react";

/** Icone nello stile di Lucide (24×24, solo tratto) per i prodotti che la libreria non ha. */
const dots = (...pts: [number, number][]) => pts.map(([x, y]) => `M${x} ${y}h.01`).join("");

export const Bread = createLucideIcon("Bread", [
  ["path", { d: "M4 12c0-4 3.5-7 8-7s8 3 8 7c0 .8-.4 1.5-1 1.9V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18v-4.1c-.6-.4-1-1.1-1-1.9z" }],
  ["path", { d: "m9 9 1.5 3M13 8.5l1.5 3" }],
]);

export const Tomato = createLucideIcon("Tomato", [
  ["path", { d: "M12 7c-4.5 0-8 2.7-8 6.5S7.5 20 12 20s8-2.7 8-6.5S16.5 7 12 7z" }],
  ["path", { d: "M12 7V4M9 5.5l3 1.5 3-1.5" }],
]);

export const Mushroom = createLucideIcon("Mushroom", [
  ["path", { d: "M4 12a8 7 0 0 1 16 0z" }],
  ["path", { d: "M9.5 12v5a2.5 2.5 0 0 0 5 0v-5" }],
]);

export const Pear = createLucideIcon("Pear", [
  ["path", { d: "M12 6c-1 0-1.8.6-2 1.5-.3 1.5-.2 2.2-1.5 3.3C7 12 6 13.5 6 15.5 6 18.5 8.5 21 12 21s6-2.5 6-5.5c0-2-1-3.5-2.5-4.7-1.3-1.1-1.2-1.8-1.5-3.3C13.8 6.6 13 6 12 6z" }],
  ["path", { d: "M12 6c0-1.5.5-2.5 2-3M14 3c1.5 0 2.5.5 3 1.5" }],
]);

export const Strawberry = createLucideIcon("Strawberry", [
  ["path", { d: "M12 21c-4-2-6.5-5-6.5-8.5C5.5 10.5 7 9 9 9c1.2 0 2.2.5 3 .5s1.8-.5 3-.5c2 0 3.5 1.5 3.5 3.5 0 3.5-2.5 6.5-6.5 8.5z" }],
  ["path", { d: "M8.5 9 12 6.5 15.5 9M12 6.5V4" }],
  ["path", { d: dots([9, 13], [12, 15], [15, 13], [11, 18], [13.5, 18]) }],
]);

export const Potato = createLucideIcon("Potato", [
  ["path", { d: "M5 13c-.5-3.5 2-7 6-7.5 4-.5 8 1.5 8.5 5.5.5 4-2 7.5-6.5 8C8 19.5 5.5 17 5 13z" }],
  ["path", { d: dots([9, 11], [14, 10], [12, 15], [16, 14], [8.5, 15]) }],
]);

export const Onion = createLucideIcon("Onion", [
  ["path", { d: "M12 21c-4 0-7-3-7-7 0-3 2.5-5.5 5-7.5.8-.6 1.2-1.5 2-2.5.8 1 1.2 1.9 2 2.5 2.5 2 5 4.5 5 7.5 0 4-3 7-7 7z" }],
  ["path", { d: "M12 9v12M9.5 10.5C8.5 14 9 18 11 20.5M14.5 10.5C15.5 14 15 18 13 20.5" }],
]);

export const Jar = createLucideIcon("Jar", [
  ["path", { d: "M7 3h10v3H7z" }],
  ["path", { d: "M6 6h12v1c0 1 1 1.5 1 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-8c0-1.5 1-2 1-3z" }],
  ["path", { d: "M8 12h8" }],
]);

export const SaltShaker = createLucideIcon("SaltShaker", [
  ["path", { d: "M7 11h10l-1-4H8z" }],
  ["path", { d: "M8 7l.5-4h7l.5 4" }],
  ["path", { d: "M7 11v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7" }],
  ["path", { d: dots([10, 14], [14, 14], [12, 17]) }],
]);

export const Pasta = createLucideIcon("Pasta", [
  ["path", { d: "M3 13h18a9 9 0 0 1-18 0z" }],
  ["path", { d: "M6 10c1.5-2 3 2 4.5 0S13.5 8 15 10s2.5 2 3 0" }],
  ["path", { d: "M9 7c1-1.5 2.5 1 4 0s2.5 0 3 .5" }],
]);

export const RiceBowl = createLucideIcon("RiceBowl", [
  ["path", { d: "M3 13h18a9 9 0 0 1-18 0z" }],
  ["path", { d: "M5 13c0-3.5 3-6 7-6s7 2.5 7 6" }],
  ["path", { d: dots([9, 10], [12, 9], [15, 10], [11, 11.5], [13.5, 11.5]) }],
]);

export const Tissues = createLucideIcon("Tissues", [
  ["path", { d: "M4 11h16v9H4z" }],
  ["path", { d: "M12 11c-1.5-3 1-5 3-6.5M9 11l1.5-4" }],
]);

export const Watermelon = createLucideIcon("Watermelon", [
  ["path", { d: "M3 9h18a9 9 0 0 1-18 0z" }],
  ["path", { d: "M6 9a6 6 0 0 0 12 0" }],
  ["path", { d: dots([9, 12], [12, 14], [15, 12]) }],
]);

export const Peach = createLucideIcon("Peach", [
  ["path", { d: "M12 7c-4 0-7 2.7-7 7s3 7 7 7 7-2.7 7-7-3-7-7-7z" }],
  ["path", { d: "M12 7c-1.5 2.5-1.5 8.500 0 14" }],
  ["path", { d: "M12 7c0-2 1-3.500 3.500-4" }],
]);

export const Kiwi = createLucideIcon("Kiwi", [
  ["circle", { cx: 12, cy: 12, r: 8 }],
  ["circle", { cx: 12, cy: 12, r: 3 }],
  ["path", { d: dots([12, 7], [16.500, 9], [16.500, 15], [12, 17], [7.500, 15], [7.500, 9]) }],
]);

export const Pineapple = createLucideIcon("Pineapple", [
  ["path", { d: "M7.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5v1.500c0 3.500-2 6-4.500 6s-4.500-2.500-4.500-6z" }],
  ["path", { d: "m8.500 13 7 7.500M15.500 13l-7 7.500" }],
  ["path", { d: "M12 9.500C11 7 9.500 5.500 7.500 5M12 9.500V3M12 9.500c1-2.500 2.500-4 4.500-4.500" }],
]);

export const Butter = createLucideIcon("Butter", [
  ["path", { d: "M3 11h14v8H3z" }],
  ["path", { d: "M3 11l4-4h14l-4 4M21 7v8l-4 4" }],
  ["path", { d: "M6.500 15h5" }],
]);

export const Yogurt = createLucideIcon("Yogurt", [
  ["path", { d: "M6 9h12l-1.200 10a2 2 0 0 1-2 1.800H9.200a2 2 0 0 1-2-1.800z" }],
  ["path", { d: "M5 9V6.500h14V9" }],
  ["path", { d: "M8.500 14h7" }],
]);

export const Sausage = createLucideIcon("Sausage", [
  ["rect", { x: 2, y: 9, width: 20, height: 6, rx: 3, transform: "rotate(-40 12 12)" }],
  ["path", { d: "M9 14.500l1.500 1.500M13 10.500l1.500 1.500" }],
]);

export const Squid = createLucideIcon("Squid", [
  ["path", { d: "M12 2.500c2.500 1.800 4 4.500 4 8H8c0-3.500 1.500-6.200 4-8z" }],
  ["path", { d: "M8.500 5.500 5.500 7.500M15.500 5.500l3 2" }],
  ["path", { d: "M8.500 10.500v6.500a1.500 1.500 0 0 1-3 0M11 10.500v9.500M13 10.500v9.500M15.500 10.500v6.500a1.500 1.500 0 0 0 3 0" }],
]);
