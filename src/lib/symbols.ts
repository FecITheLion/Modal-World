import type { Tier } from "./logic";

export type SymbolEntry = {
  glyph: string;
  name: string;
  gloss: string;
  insert: string;
  group: string;
  tier: Tier;
};

const T = {
  novice: "novice" as const,
  adept: "adept" as const,
  expert: "expert" as const,
};

export const SYMBOLS: SymbolEntry[] = [
  { glyph: "¬", name: "negation", gloss: "not P: true at w iff P is false at w", insert: "¬", group: "Propositional", tier: T.novice },
  { glyph: "∧", name: "conjunction", gloss: "P and Q both true at w", insert: "∧", group: "Propositional", tier: T.novice },
  { glyph: "∨", name: "disjunction", gloss: "at least one of P, Q true at w", insert: "∨", group: "Propositional", tier: T.novice },
  { glyph: "→", name: "implication", gloss: "if P then Q at w", insert: "→", group: "Propositional", tier: T.novice },
  { glyph: "↔", name: "biconditional", gloss: "P and Q have the same truth value at w", insert: "↔", group: "Propositional", tier: T.novice },
  { glyph: "⊕", name: "exclusive or", gloss: "exactly one of P, Q is true", insert: "⊕", group: "Propositional", tier: T.novice },
  { glyph: "↑", name: "NAND (Sheffer)", gloss: "not both P and Q", insert: "¬(", group: "Propositional", tier: T.novice },
  { glyph: "↓", name: "NOR (Peirce)", gloss: "neither P nor Q", insert: "¬(", group: "Propositional", tier: T.novice },
  { glyph: "⊤", name: "verum", gloss: "true at every world", insert: "⊤", group: "Propositional", tier: T.novice },
  { glyph: "⊥", name: "falsum", gloss: "true at no world", insert: "⊥", group: "Propositional", tier: T.novice },
  { glyph: "≡", name: "equivalence", gloss: "true at exactly the same worlds", insert: "↔", group: "Propositional", tier: T.novice },

  { glyph: "□", name: "necessity", gloss: "P at every accessible world", insert: "□", group: "Alethic modal", tier: T.novice },
  { glyph: "◇", name: "possibility", gloss: "P at some accessible world", insert: "◇", group: "Alethic modal", tier: T.novice },
  { glyph: "⇒", name: "strict implication", gloss: "□(P → Q)", insert: "□(", group: "Alethic modal", tier: T.novice },
  { glyph: "Δ", name: "non-contingency", gloss: "□P ∨ □¬P", insert: "(", group: "Alethic modal", tier: T.adept },
  { glyph: "∇", name: "contingency", gloss: "◇P ∧ ◇¬P", insert: "(", group: "Alethic modal", tier: T.adept },
  { glyph: "⟨a⟩", name: "diamond (action)", gloss: "some a-successor satisfies P", insert: "◇", group: "Alethic modal", tier: T.expert },
  { glyph: "[a]", name: "box (action)", gloss: "every a-successor satisfies P", insert: "□", group: "Alethic modal", tier: T.expert },

  { glyph: "R", name: "accessibility", gloss: "wRv: v is possible relative to w", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "W", name: "set of worlds", gloss: "the domain of the model", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "V", name: "valuation", gloss: "assigns atoms to the worlds where they hold", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "⊩", name: "forces", gloss: "w ⊩ P: P holds at w", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "⊨", name: "entails", gloss: "truth in a model; semantic consequence", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "⊭", name: "does not entail", gloss: "P fails in some model or world", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "⊢", name: "proves", gloss: "derivable in the system", insert: "", group: "Frames and models", tier: T.expert },
  { glyph: "⊬", name: "does not prove", gloss: "not derivable", insert: "", group: "Frames and models", tier: T.expert },
  { glyph: "⟦ ⟧", name: "extension", gloss: "the set of worlds where P holds", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "∈", name: "member of", gloss: "w ∈ W", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "⊆", name: "subset", gloss: "every world of one set is in the other", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "∩", name: "intersection", gloss: "worlds in both extensions", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "∪", name: "union", gloss: "worlds in either extension", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "∅", name: "empty set", gloss: "no worlds", insert: "", group: "Frames and models", tier: T.adept },
  { glyph: "≈", name: "bisimulation", gloss: "worlds that agree on all modal formulas", insert: "", group: "Frames and models", tier: T.expert },

  { glyph: "∀", name: "for all", gloss: "every individual in the domain", insert: "", group: "Quantifiers and identity", tier: T.adept },
  { glyph: "∃", name: "exists", gloss: "some individual in the domain", insert: "", group: "Quantifiers and identity", tier: T.adept },
  { glyph: "∃!", name: "exists exactly one", gloss: "a unique individual", insert: "", group: "Quantifiers and identity", tier: T.adept },
  { glyph: "=", name: "identity", gloss: "the same individual across worlds", insert: "", group: "Quantifiers and identity", tier: T.adept },
  { glyph: "≠", name: "distinctness", gloss: "not the same individual", insert: "", group: "Quantifiers and identity", tier: T.adept },
  { glyph: "λ", name: "lambda", gloss: "abstracts a property from a formula", insert: "", group: "Quantifiers and identity", tier: T.expert },
  { glyph: "ι", name: "definite description", gloss: "the unique individual such that", insert: "", group: "Quantifiers and identity", tier: T.expert },

  { glyph: "K", name: "knows", gloss: "agent a knows P at all worlds they consider possible", insert: "□", group: "Epistemic", tier: T.adept },
  { glyph: "B", name: "believes", gloss: "agent a believes P", insert: "□", group: "Epistemic", tier: T.adept },
  { glyph: "E", name: "everyone knows", gloss: "every agent in the group knows P", insert: "□", group: "Epistemic", tier: T.adept },
  { glyph: "C", name: "common knowledge", gloss: "everyone knows that everyone knows, without end", insert: "□", group: "Epistemic", tier: T.expert },
  { glyph: "D", name: "distributed knowledge", gloss: "what the group knows by pooling", insert: "□", group: "Epistemic", tier: T.expert },
  { glyph: "[!]", name: "public announcement", gloss: "after P is announced truthfully", insert: "", group: "Epistemic", tier: T.expert },

  { glyph: "O", name: "obligatory", gloss: "P at every ideal world", insert: "□", group: "Deontic", tier: T.adept },
  { glyph: "P", name: "permitted", gloss: "P at some ideal world", insert: "◇", group: "Deontic", tier: T.adept },
  { glyph: "F", name: "forbidden", gloss: "O¬P", insert: "□¬", group: "Deontic", tier: T.adept },

  { glyph: "G", name: "always (future)", gloss: "P at all later times", insert: "□", group: "Temporal", tier: T.adept },
  { glyph: "F", name: "eventually", gloss: "P at some later time", insert: "◇", group: "Temporal", tier: T.adept },
  { glyph: "X", name: "next", gloss: "P at the next step", insert: "□", group: "Temporal", tier: T.adept },
  { glyph: "U", name: "until", gloss: "P holds until Q does", insert: "", group: "Temporal", tier: T.expert },
  { glyph: "H", name: "always (past)", gloss: "P at all earlier times", insert: "□", group: "Temporal", tier: T.adept },
  { glyph: "S", name: "since", gloss: "Q held since P", insert: "", group: "Temporal", tier: T.expert },
  { glyph: "A", name: "all paths", gloss: "on every branch (CTL)", insert: "□", group: "Temporal", tier: T.expert },
  { glyph: "E", name: "some path", gloss: "on some branch (CTL)", insert: "◇", group: "Temporal", tier: T.expert },
  { glyph: "W", name: "weak until", gloss: "until, or forever", insert: "", group: "Temporal", tier: T.expert },
  { glyph: "R", name: "release", gloss: "Q holds until and including when P does", insert: "", group: "Temporal", tier: T.expert },

  { glyph: ";", name: "sequence", gloss: "do a, then b", insert: "", group: "Dynamic and fixpoint", tier: T.expert },
  { glyph: "*", name: "iteration", gloss: "repeat zero or more times", insert: "", group: "Dynamic and fixpoint", tier: T.expert },
  { glyph: "?", name: "test", gloss: "continue only if P holds", insert: "", group: "Dynamic and fixpoint", tier: T.expert },
  { glyph: "μ", name: "least fixpoint", gloss: "smallest set closed under the formula", insert: "", group: "Dynamic and fixpoint", tier: T.expert },
  { glyph: "ν", name: "greatest fixpoint", gloss: "largest set consistent with the formula", insert: "", group: "Dynamic and fixpoint", tier: T.expert },

  { glyph: "∴", name: "therefore", gloss: "conclusion mark", insert: "", group: "Proof marks", tier: T.expert },
  { glyph: "∵", name: "because", gloss: "reason mark", insert: "", group: "Proof marks", tier: T.expert },
  { glyph: "□̇", name: "derivation box", gloss: "a closed proof step", insert: "", group: "Proof marks", tier: T.expert },
];

export const GROUPS = [...new Set(SYMBOLS.map((s) => s.group))];

const RANK: Record<Tier, number> = { novice: 0, adept: 1, expert: 2 };

export function tierAllows(have: Tier, need: Tier): boolean {
  return RANK[have] >= RANK[need];
}

export type SearchHit = {
  kind: "symbol" | "world" | "entity" | "listing";
  title: string;
  detail: string;
  insert?: string;
};

export function searchCatalog(
  q: string,
  extra: { worlds: string[]; entities: { label: string; type: string }[]; listings: string[] },
): SearchHit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const hits: SearchHit[] = [];
  for (const s of SYMBOLS) {
    const blob = `${s.glyph} ${s.name} ${s.gloss} ${s.group}`.toLowerCase();
    if (blob.includes(query)) {
      hits.push({ kind: "symbol", title: `${s.glyph}  ${s.name}`, detail: s.gloss, insert: s.insert || undefined });
    }
  }
  extra.worlds.forEach((w, i) => {
    if (w.toLowerCase().includes(query) || `w${i}`.includes(query)) {
      hits.push({ kind: "world", title: w, detail: "World in the current frame" });
    }
  });
  for (const e of extra.entities) {
    if (`${e.label} ${e.type}`.toLowerCase().includes(query)) {
      hits.push({ kind: "entity", title: e.label, detail: e.type });
    }
  }
  for (const title of extra.listings) {
    if (title.toLowerCase().includes(query)) {
      hits.push({ kind: "listing", title, detail: "Published on the exchange" });
    }
  }
  return hits.slice(0, 12);
}
