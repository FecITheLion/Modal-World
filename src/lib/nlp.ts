type En =
  | { k: "atom"; name: string }
  | { k: "not" | "box" | "dia"; a: En }
  | { k: "and" | "or" | "imp" | "iff" | "xor"; a: En; b: En };

type Word = { raw: string; low: string };

function words(input: string): Word[] {
  return input
    .replace(/[.,;:!?]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, low: raw.toLowerCase() }));
}

const STOP = new Set(["a", "an", "the", "at", "world", "is", "be", "holds", "that"]);

function parseExpr(ws: Word[], min: number): { node: En; rest: Word[] } {
  let rest = ws;
  let node: En;
  if (!rest.length) throw new Error("The sentence ran out");
  const head = rest[0]!.low;
  if (head === "if") {
    const thenAt = rest.findIndex((w) => w.low === "then");
    if (thenAt < 2) throw new Error("Use “if … then …”");
    const left = parseExpr(rest.slice(1, thenAt), 0);
    const right = parseExpr(rest.slice(thenAt + 1), 0);
    return { node: { k: "imp", a: left.node, b: right.node }, rest: right.rest };
  }
  if (head === "(") {
    let depth = 0;
    let close = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i]!.low === "(") depth++;
      if (rest[i]!.low === ")") {
        depth--;
        if (depth === 0) { close = i; break; }
      }
    }
    if (close < 0) throw new Error("Missing )");
    const inner = parseExpr(rest.slice(1, close), 0);
    node = inner.node;
    rest = rest.slice(close + 1);
  } else if (head === "not" || head === "necessarily" || head === "possibly" || head === "maybe") {
    const inner = parseExpr(rest.slice(1), 5);
    const k = head === "not" ? "not" : head === "necessarily" ? "box" : "dia";
    node = { k, a: inner.node };
    rest = inner.rest;
  } else if (head === "both") {
    const inner = parseExpr(rest.slice(1), 4);
    node = inner.node;
    rest = inner.rest;
  } else {
    if (STOP.has(head) || !/^[a-z][a-z0-9]*$/i.test(rest[0]!.raw)) {
      throw new Error(`I don’t know the word “${rest[0]!.raw}”`);
    }
    node = { k: "atom", name: rest[0]!.raw.replace(/[^A-Za-z0-9]/g, "") || "P" };
    if (node.k === "atom") node = { k: "atom", name: node.name.charAt(0).toUpperCase() + node.name.slice(1).replace(/^([A-Z])(.*)$/, (_, a, b) => a + b) };
    // Keep atom as written if it already looks like P or Q
    const raw = rest[0]!.raw;
    node = { k: "atom", name: /^[A-Za-z][A-Za-z0-9]*$/.test(raw) ? (raw.length === 1 ? raw.toUpperCase() : raw) : "P" };
    rest = rest.slice(1);
  }

  const prec: Record<string, number> = { and: 4, or: 3, xor: 3, implies: 2, iff: 1 };
  for (;;) {
    const op = rest[0]?.low;
    if (!op || prec[op] === undefined || prec[op]! < min) break;
    const p = prec[op]!;
    const right = parseExpr(rest.slice(1), p + 1);
    const k = op === "and" ? "and" : op === "or" ? "or" : op === "xor" ? "xor" : op === "iff" ? "iff" : "imp";
    node = { k, a: node, b: right.node };
    rest = right.rest;
  }
  return { node, rest };
}

function emit(n: En): string {
  switch (n.k) {
    case "atom": return n.name;
    case "not": return `¬${emit(n.a)}`;
    case "box": return `□${emit(n.a)}`;
    case "dia": return `◇${emit(n.a)}`;
    case "and": return `(${emit(n.a)}∧${emit(n.b)})`;
    case "or": return `(${emit(n.a)}∨${emit(n.b)})`;
    case "xor": return `(${emit(n.a)}⊕${emit(n.b)})`;
    case "imp": return `(${emit(n.a)}→${emit(n.b)})`;
    case "iff": return `(${emit(n.a)}↔${emit(n.b)})`;
  }
}

/** Turn a short English sentence into a unicode formula. Symbolic input is returned unchanged. */
export function englishToFormula(input: string): string {
  const s = input.trim();
  if (!s) throw new Error("Type a sentence");
  if (/[¬∧∨→↔⊕□◇⊤⊥\\]/.test(s)) return s;
  const parsed = parseExpr(words(s), 0);
  if (parsed.rest.length) throw new Error(`Leftover words: ${parsed.rest.map((w) => w.raw).join(" ")}`);
  return emit(parsed.node);
}
