export const MODAL_CONTEXT = {
  "@version": 1.1,
  mw: "https://modal.world/ns#",
  schema: "https://schema.org/",
  ModalModel: "mw:ModalModel",
  World: "mw:World",
  Atom: "mw:Atom",
  Feature: "mw:GeometricFeature",
  Listing: "schema:Offer",
  worlds: { "@id": "mw:world", "@container": "@set" },
  accessibility: "mw:accessibility",
  valuation: "mw:valuation",
  formula: "mw:formula",
  latex: "mw:latex",
  sphericalStar: "mw:sphericalStar",
  vector: { "@id": "mw:dataVector", "@container": "@list" },
  gdt: { "@id": "mw:gdtFrame", "@container": "@set" },
  entities: { "@id": "mw:entity", "@container": "@graph" },
  name: "schema:name",
  price: "schema:price",
  priceCurrency: "schema:priceCurrency",
};

export type JsonEntity = {
  id: string;
  type: string;
  label: string;
  note: string;
};

export type GdtFrame = {
  id: string;
  characteristic: string;
  symbol: string;
  tolerance: string;
  datums: string;
  feature: string;
};

export type Listing = {
  id: string;
  title: string;
  price: string;
  currency: string;
  sellerEmail: string;
  blurb: string;
  createdAt: number;
};

export function buildDocument(input: {
  worlds: { id: string; valuation: Record<string, boolean>; sees: string[] }[];
  formula: string;
  latex: string;
  vector: number[];
  area: number;
  vertexCount: number;
  edgeCount: number;
  gdt: GdtFrame[];
  entities: JsonEntity[];
  listings: Listing[];
}) {
  return {
    "@context": MODAL_CONTEXT,
    "@type": "ModalModel",
    "@id": "urn:modal:studio",
    formula: input.formula,
    latex: input.latex,
    worlds: input.worlds.map((w) => ({
      "@type": "World",
      "@id": `urn:modal:world:${w.id}`,
      name: w.id,
      valuation: w.valuation,
      accessibility: w.sees.map((id) => ({ "@id": `urn:modal:world:${id}` })),
    })),
    sphericalStar: {
      "@type": "mw:SphericalStar",
      vector: input.vector,
      vertexCount: input.vertexCount,
      edgeCount: input.edgeCount,
      area: Number(input.area.toFixed(4)),
    },
    gdt: input.gdt.map((g) => ({
      "@type": "Feature",
      "@id": `urn:modal:gdt:${g.id}`,
      characteristic: g.characteristic,
      symbol: g.symbol,
      tolerance: g.tolerance,
      datums: g.datums,
      feature: g.feature,
    })),
    entities: input.entities.map((e) => ({
      "@type": e.type,
      "@id": `urn:modal:entity:${e.id}`,
      name: e.label,
      description: e.note,
    })),
    listings: input.listings.map((l) => ({
      "@type": "Listing",
      "@id": `urn:modal:listing:${l.id}`,
      name: l.title,
      price: l.price,
      priceCurrency: l.currency,
      seller: l.sellerEmail,
    })),
  };
}

export function validateDocument(doc: unknown): string[] {
  const errors: string[] = [];
  if (!doc || typeof doc !== "object") return ["Document is not an object"];
  const d = doc as Record<string, unknown>;
  if (d["@type"] !== "ModalModel") errors.push("@type must be ModalModel");
  if (!d["@context"] || typeof d["@context"] !== "object") errors.push("@context missing");
  if (!Array.isArray(d.worlds) || d.worlds.length === 0) errors.push("worlds must be a non-empty set");
  else {
    for (const w of d.worlds as Record<string, unknown>[]) {
      if (w["@type"] !== "World") errors.push("each world needs @type World");
      if (typeof w["@id"] !== "string") errors.push("each world needs an @id");
      if (!w.valuation || typeof w.valuation !== "object") errors.push("each world needs a valuation");
    }
  }
  if (typeof d.formula !== "string") errors.push("formula must be a string");
  const star = d.sphericalStar as Record<string, unknown> | undefined;
  if (!star || !Array.isArray(star.vector)) errors.push("sphericalStar.vector must be a list of numbers");
  return errors;
}

export function markovMatrix(R: boolean[][]): number[][] {
  return R.map((row) => {
    const s = row.reduce((a, b) => a + (b ? 1 : 0), 0);
    if (!s) return row.map(() => 1 / row.length);
    return row.map((b) => (b ? 1 / s : 0));
  });
}

export function stationary(P: number[][], steps = 48): number[] {
  const n = P.length;
  if (!n) return [];
  let v = Array.from({ length: n }, () => 1 / n);
  for (let s = 0; s < steps; s++) {
    const next = Array.from({ length: n }, () => 0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) next[j]! += v[i]! * P[i]![j]!;
    v = next;
  }
  return v;
}

export function nextFrom(P: number[][], i: number): number[] {
  return P[i] ? P[i]!.slice() : [];
}
