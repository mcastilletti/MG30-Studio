export interface Product {
  id: string;
  name: string;
  keywords: string[];
  excludes: string[];
  /** Marche preferite: le sole proposte come offerta; le altre vanno in "Offerte altre marche". */
  brands?: string[];
  maxPrice: number | null;
  unit: "kg" | "l" | "pz" | null;
}

export interface Store {
  id: string;
  name: string;
  urls: string[];
  exclude?: string[];
  lastScanStatus?: "ok" | "empty" | "error";
  lastScanMessage?: string;
  lastScanAt?: { toDate(): Date } | null;
}

export interface Flyer {
  id: string;
  storeName: string;
  storeId?: string;
  sourceUrl?: string;
  fileName: string;
  validFrom: string | null;
  validTo: string | null;
  status: "uploading" | "processing" | "done" | "error";
  error?: string | null;
  offerCount?: number;
}

export interface Offer {
  offerId?: string;
  storeName: string;
  title: string;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  quantity?: string | null;
  unitPrice: number | null;
  unitLabel: string | null;
  validTo?: string | null;
  startsOn?: string | null;
  notes?: string | null;
}

/** Prodotto/offerta nel catalogo (letto da un volantino o inserito a mano). */
export interface CatalogOffer extends Offer {
  id: string;
  flyerId?: string;
  storeId?: string | null;
  category?: string | null;
  validFrom?: string | null;
  manual?: boolean;
}

export interface Match {
  productId: string;
  productName: string;
  best: Offer | null;
  alternatives: Offer[];
  upcoming?: Offer[];
  brands?: string[];
  otherBrands?: Offer[];
  inList?: boolean;
  belowTarget: boolean;
}

/** Voce della lista della spesa (si aggiunge e si toglie con un tocco). */
export interface ShoppingItem {
  id: string;
  name: string;
  keywords: string[];
  category?: string;
  /** Dettagli della voce in lista. */
  quantity?: string | null;
  description?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  photoPath?: string | null;
  /** Scelta sulle offerte di altre marche (solo finché la voce è in lista). */
  altBrand?: "use" | "regular" | "wait" | null;
  altOffer?: Partial<Offer> | null;
}
