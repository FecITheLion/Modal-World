export type Tier = "novice" | "adept" | "expert";

export type Formula =
  | { k: "atom"; name: string }
  | { k: "not"; a: Formula }
  | { k: "and" | "or" | "imp" | "iff" | "xor"; a: Formula; b: Formula }
  | { k: "box" | "dia"; a: Formula }
  | { k: "top" }
  | { k: "bot" };

const RESERVED = new Set([
  "not", "and", "or", "xor", "if", "then", "iff", "implies",
  "box", "diamond", "nec", "pos", "true", "false", "top", "bot",
]);

type Tok =
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" };

function normalize(src: string): string {
  return src
    .replace(/\\Box|\\square|\\nec/g, "□")
    .replace(/\\Diamond|\\dia|\\lozenge/g, "◇")
    .replace(/\\neg|\\lnot|~/g, "¬")
    .replace(/\\land|\\wedge|&&/g, "∧")
    .replace(/\\lor|\\vee|\|\|/g, "∨")
    .replace(/\\to|\\rightarrow|\\implies|->/g, "→")
    .replace(/\\leftrightarrow|<->/g, "↔")
    .replace(/\\oplus|\\xor/g, "⊕")
    .replace(/\\top/g, "⊤")
    .replace(/\\bot|\\bottom/g, "⊥");
}

function tokenize(src: string): Tok[] {
  const s = normalize(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    if ("¬□◇∧∨→↔⊕⊤⊥".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j]!)) j++;
      out.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Unexpected “${c}” in formula`);
  }
  return out;
}

export function parseFormula(src: string): Formula {
  const toks = tokenize(src.trim());
  if (!toks.length) throw new Error("Write a formula");
  let i = 0;
  const peek = () => toks[i];
  const eat = () => toks[i++];

  function parseIff(): Formula {
    let left = parseImp();
    while (peek()?.t === "op" && (peek() as { v: string }).v === "↔") {
      eat();
      left = { k: "iff", a: left, b: parseImp() };
    }
    return left;
  }
  function parseImp(): Formula {
    let left = parseOr();
    while (peek()?.t === "op" && (peek() as { v: string }).v === "→") {
      eat();
      left = { k: "imp", a: left, b: parseOr() };
    }
    return left;
  }
  function parseOr(): Formula {
    let left = parseAnd();
    for (;;) {
      const p = peek();
      if (p?.t === "op" && (p.v === "∨" || p.v === "⊕")) {
        eat();
        left = { k: p.v === "⊕" ? "xor" : "or", a: left, b: parseAnd() };
      } else if (p?.t === "id" && (p.v.toLowerCase() === "or" || p.v.toLowerCase() === "xor")) {
        const kind = p.v.toLowerCase() === "xor" ? "xor" : "or";
        eat();
        left = { k: kind, a: left, b: parseAnd() };
      } else break;
    }
    return left;
  }
  function parseAnd(): Formula {
    let left = parseUnary();
    for (;;) {
      const p = peek();
      if (p?.t === "op" && p.v === "∧") {
        eat();
        left = { k: "and", a: left, b: parseUnary() };
      } else if (p?.t === "id" && p.v.toLowerCase() === "and") {
        eat();
        left = { k: "and", a: left, b: parseUnary() };
      } else break;
    }
    return left;
  }
  function parseUnary(): Formula {
    const p = peek();
    if (p?.t === "op" && (p.v === "¬" || p.v === "□" || p.v === "◇")) {
      eat();
      const a = parseUnary();
      if (p.v === "¬") return { k: "not", a };
      if (p.v === "□") return { k: "box", a };
      return { k: "dia", a };
    }
    if (p?.t === "id") {
      const w = p.v.toLowerCase();
      if (w === "not" || w === "box" || w === "diamond" || w === "nec" || w === "pos") {
        eat();
        const a = parseUnary();
        if (w === "not") return { k: "not", a };
        if (w === "box" || w === "nec") return { k: "box", a };
        return { k: "dia", a };
      }
    }
    return parsePrimary();
  }
  function parsePrimary(): Formula {
    const p = peek();
    if (!p) throw new Error("Formula ended early");
    if (p.t === "lp") {
      eat();
      const inner = parseIff();
      if (peek()?.t !== "rp") throw new Error("Missing )");
      eat();
      return inner;
    }
    if (p.t === "op" && p.v === "⊤") { eat(); return { k: "top" }; }
    if (p.t === "op" && p.v === "⊥") { eat(); return { k: "bot" }; }
    if (p.t === "id") {
      const w = p.v.toLowerCase();
      if (w === "true" || w === "top") { eat(); return { k: "top" }; }
      if (w === "false" || w === "bot") { eat(); return { k: "bot" }; }
      if (RESERVED.has(w)) throw new Error(`“${p.v}” is reserved`);
      eat();
      return { k: "atom", name: p.v };
    }
    throw new Error("Expected an atom or (");
  }

  const f = parseIff();
  if (i < toks.length) throw new Error("Extra tokens after formula");
  return f;
}

export function formulaUnicode(f: Formula): string {
  switch (f.k) {
    case "atom": return f.name;
    case "top": return "⊤";
    case "bot": return "⊥";
    case "not": return `¬${wrap(f.a, 5)}`;
    case "box": return `□${wrap(f.a, 5)}`;
    case "dia": return `◇${wrap(f.a, 5)}`;
    case "and": return `${wrap(f.a, 4)}∧${wrap(f.b, 4)}`;
    case "or": return `${wrap(f.a, 3)}∨${wrap(f.b, 3)}`;
    case "xor": return `${wrap(f.a, 3)}⊕${wrap(f.b, 3)}`;
    case "imp": return `${wrap(f.a, 2)}→${wrap(f.b, 2)}`;
    case "iff": return `${wrap(f.a, 1)}↔${wrap(f.b, 1)}`;
  }
}

function prec(f: Formula): number {
  switch (f.k) {
    case "iff": return 1;
    case "imp": return 2;
    case "or":
    case "xor": return 3;
    case "and": return 4;
    default: return 6;
  }
}
function wrap(f: Formula, min: number): string {
  const s = formulaUnicode(f);
  return prec(f) < min ? `(${s})` : s;
}

export function formulaLatex(f: Formula): string {
  switch (f.k) {
    case "atom": return f.name;
    case "top": return "\\top";
    case "bot": return "\\bot";
    case "not": return `\\neg ${latexWrap(f.a, 5)}`;
    case "box": return `\\Box ${latexWrap(f.a, 5)}`;
    case "dia": return `\\Diamond ${latexWrap(f.a, 5)}`;
    case "and": return `${latexWrap(f.a, 4)} \\land ${latexWrap(f.b, 4)}`;
    case "or": return `${latexWrap(f.a, 3)} \\lor ${latexWrap(f.b, 3)}`;
    case "xor": return `${latexWrap(f.a, 3)} \\oplus ${latexWrap(f.b, 3)}`;
    case "imp": return `${latexWrap(f.a, 2)} \\rightarrow ${latexWrap(f.b, 2)}`;
    case "iff": return `${latexWrap(f.a, 1)} \\leftrightarrow ${latexWrap(f.b, 1)}`;
  }
}
function latexWrap(f: Formula, min: number): string {
  const s = formulaLatex(f);
  return prec(f) < min ? `(${s})` : s;
}

export function evalAt(f: Formula, worlds: boolean[][], truths: Record<string, boolean>[], i: number): boolean {
  switch (f.k) {
    case "atom": return truths[i]?.[f.name] ?? false;
    case "top": return true;
    case "bot": return false;
    case "not": return !evalAt(f.a, worlds, truths, i);
    case "and": return evalAt(f.a, worlds, truths, i) && evalAt(f.b, worlds, truths, i);
    case "or": return evalAt(f.a, worlds, truths, i) || evalAt(f.b, worlds, truths, i);
    case "xor": return evalAt(f.a, worlds, truths, i) !== evalAt(f.b, worlds, truths, i);
    case "imp": return !evalAt(f.a, worlds, truths, i) || evalAt(f.b, worlds, truths, i);
    case "iff": return evalAt(f.a, worlds, truths, i) === evalAt(f.b, worlds, truths, i);
    case "box":
      return worlds[i]!.every((on, j) => !on || evalAt(f.a, worlds, truths, j));
    case "dia":
      return worlds[i]!.some((on, j) => on && evalAt(f.a, worlds, truths, j));
  }
}

export type FrameFacts = {
  serial: boolean;
  reflexive: boolean;
  symmetric: boolean;
  transitive: boolean;
  euclidean: boolean;
};

export function frameFacts(R: boolean[][]): FrameFacts {
  const n = R.length;
  const f: FrameFacts = { serial: true, reflexive: true, symmetric: true, transitive: true, euclidean: true };
  for (let i = 0; i < n; i++) {
    if (!R[i]!.some(Boolean)) f.serial = false;
    if (!R[i]![i]) f.reflexive = false;
    for (let j = 0; j < n; j++) if (R[i]![j]) {
      if (!R[j]![i]) f.symmetric = false;
      for (let k = 0; k < n; k++) {
        if (R[j]![k] && !R[i]![k]) f.transitive = false;
        if (R[i]![k] && !R[j]![k]) f.euclidean = false;
      }
    }
  }
  return f;
}

export function cloneR(R: boolean[][]): boolean[][] {
  return R.map((row) => row.slice());
}

export function warshall(R: boolean[][]): boolean[][] {
  const M = cloneR(R);
  const n = M.length;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      if (M[i]![k])
        for (let j = 0; j < n; j++) if (M[k]![j]) M[i]![j] = true;
  return M;
}

export type SystemId = "D" | "T" | "B" | "S4" | "S5";

export function closeFrame(R: boolean[][], sys: SystemId): boolean[][] {
  const n = R.length;
  let M = cloneR(R);
  if (sys === "D") {
    for (let i = 0; i < n; i++) if (!M[i]!.some(Boolean)) M[i]![i] = true;
  }
  if (sys === "T" || sys === "B" || sys === "S4" || sys === "S5") {
    for (let i = 0; i < n; i++) M[i]![i] = true;
  }
  if (sys === "B" || sys === "S5") {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i]![j]) M[j]![i] = true;
  }
  if (sys === "S4" || sys === "S5") M = warshall(M);
  if (sys === "S5") {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i]![j]) M[j]![i] = true;
    M = warshall(M);
  }
  return M;
}

export function chainRelation(n: number): boolean[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j === i + 1));
}

export function ringRelation(n: number): boolean[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j === (i + 1) % n));
}

export function blankRow(n: number): boolean[] {
  return Array.from({ length: n }, () => false);
}

export function resizeR(R: boolean[][], n: number): boolean[][] {
  const M = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => R[i]?.[j] ?? false),
  );
  return M;
}

const BINARY = new Set(["∧", "∨", "→", "↔", "⊕"]);
const UNARY = new Set(["¬", "□", "◇"]);

/** Turn a fragment into a closed formula: finish atoms, fill holes, balance parentheses. */
export function finishFormula(raw: string, atoms: string[]): string {
  const fallback = atoms[0] || "P";
  const s = normalize(raw);
  let out = "";
  let expect: "term" | "op" = "term";
  let depth = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (expect === "term") {
      if (c === "(") { out += "("; depth++; i++; continue; }
      if (UNARY.has(c)) { out += c; i++; continue; }
      if (c === "⊤" || c === "⊥") { out += c; expect = "op"; i++; continue; }
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1;
        while (j < s.length && /[A-Za-z0-9_]/.test(s[j]!)) j++;
        const name = s.slice(i, j);
        const exact = atoms.find((a) => a.toLowerCase() === name.toLowerCase());
        const prefix = atoms.find((a) => a.toLowerCase().startsWith(name.toLowerCase()));
        const word = name.toLowerCase();
        if (word === "not") { out += "¬"; i = j; continue; }
        if (word === "box" || word === "nec") { out += "□"; i = j; continue; }
        if (word === "diamond" || word === "pos") { out += "◇"; i = j; continue; }
        if (word === "and" || word === "or" || word === "xor" || word === "iff" || word === "implies") {
          out += fallback;
          const op = word === "and" ? "∧" : word === "or" ? "∨" : word === "xor" ? "⊕" : word === "iff" ? "↔" : "→";
          out += op;
          expect = "term";
          i = j;
          continue;
        }
        if (word === "true" || word === "top") { out += "⊤"; expect = "op"; i = j; continue; }
        if (word === "false" || word === "bot") { out += "⊥"; expect = "op"; i = j; continue; }
        out += exact ?? prefix ?? (RESERVED.has(word) ? fallback : name);
        expect = "op";
        i = j;
        continue;
      }
      i++;
      continue;
    }
    if (BINARY.has(c)) { out += c; expect = "term"; i++; continue; }
    if (c === ")" && depth > 0) { out += ")"; depth--; expect = "op"; i++; continue; }
    if (/[A-Za-z_(¬□◇⊤⊥]/.test(c)) { out += "∧"; expect = "term"; continue; }
    i++;
  }
  if (expect === "term") {
    const hole = /[∧∨→↔⊕]$/.test(out) ? (atoms[1] || fallback) : fallback;
    out += hole;
  }
  if (!out) out = fallback;
  while (depth > 0) { out += ")"; depth--; }
  return formulaUnicode(parseFormula(out));
}

export type Completion = { label: string; formula: string };

/** Next well-formed formulas: a repair of the fragment, or one connective further. */
export function completions(raw: string, atoms: string[]): Completion[] {
  const atom = atoms[1] || atoms[0] || "Q";
  const finished = finishFormula(raw, atoms);
  let current: Formula | null = null;
  try { current = parseFormula(raw.trim() ? raw : finished); } catch { current = null; }
  if (!current) {
    try { current = parseFormula(finished); } catch { return [{ label: "Finish", formula: finished }]; }
  }
  const same = formulaUnicode(current) === raw.trim() || formulaUnicode(current) === finished && formulaUnicode(current) !== raw.trim();
  const steps: Completion[] = [];
  if (formulaUnicode(current) !== raw.trim()) steps.push({ label: "Finish", formula: formulaUnicode(current) });
  const extend = (label: string, f: Formula) => steps.push({ label, formula: formulaUnicode(f) });
  const other: Formula = { k: "atom", name: atom };
  if (same || steps.length < 6) {
    extend(`∧ ${atom}`, { k: "and", a: current, b: other });
    extend(`∨ ${atom}`, { k: "or", a: current, b: other });
    extend(`→ ${atom}`, { k: "imp", a: current, b: other });
    extend(`↔ ${atom}`, { k: "iff", a: current, b: other });
    extend("□", { k: "box", a: current });
    extend("¬", { k: "not", a: current });
  }
  const seen = new Set<string>();
  return steps.filter((s) => {
    if (seen.has(s.formula) || s.formula === raw.trim()) return false;
    seen.add(s.formula);
    return true;
  }).slice(0, 6);
}
