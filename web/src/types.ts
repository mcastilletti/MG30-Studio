export interface Product {
  id: string;
  name: string;
  keywords: string[];
  excludes: string[];
  maxPrice: number | null;
  unit: "kg" | "l" | "pz" | null;
}

export interface Store {
  id: string;
  name: string;
  urls: string[];
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
  notes?: string | null;
}

export interface Match {
  productId: string;
  productName: string;
  best: Offer | null;
  alternatives: Offer[];
  belowTarget: boolean;
}
