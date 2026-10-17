import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  chainRelation,
  cloneR,
  closeFrame,
  completions,
  evalAt,
  formulaLatex,
  formulaUnicode,
  frameFacts,
  parseFormula,
  ringRelation,
  type Formula,
  type SystemId,
  type Tier,
} from "@/lib/logic";
import { englishToFormula } from "@/lib/nlp";
import {
  buildDocument,
  markovMatrix,
  nextFrom,
  stationary,
  validateDocument,
  type GdtFrame,
  type JsonEntity,
  type Listing,
} from "@/lib/jsonld";
import { project, sphericalStar } from "@/lib/sphere";
import { fsStatus, readSnapshot, writeSnapshot } from "@/lib/persist";
import { GROUPS, SYMBOLS, searchCatalog, tierAllows } from "@/lib/symbols";

type Snap = {
  tier: Tier;
  atoms: string[];
  truths: Record<string, boolean>[];
  R: boolean[][];
  formula: string;
  merchant: string;
  vectorText: string;
  gdt: GdtFrame[];
  listings: Listing[];
  entities: JsonEntity[];
};

const SEED: Snap = {
  tier: "novice",
  atoms: ["P", "Q"],
  truths: [
    { P: true, Q: true },
    { P: true, Q: false },
    { P: true, Q: true },
  ],
  R: [
    [false, true, true],
    [false, false, true],
    [false, false, false],
  ],
  formula: "□P",
  merchant: "",
  vectorText: "1, 0.45, 0.8, 0.25, 0.62, 0.9",
  gdt: [],
  listings: [],
  entities: [],
};

const FACT_KEYS = ["serial", "reflexive", "symmetric", "transitive", "euclidean"] as const;
const SYSTEMS: SystemId[] = ["D", "T", "B", "S4", "S5"];
const GDT_CHARS = [
  { id: "flatness", symbol: "⏥", name: "Flatness" },
  { id: "straightness", symbol: "⏤", name: "Straightness" },
  { id: "circularity", symbol: "○", name: "Circularity" },
  { id: "cylindricity", symbol: "⌭", name: "Cylindricity" },
  { id: "perpendicularity", symbol: "⊥", name: "Perpendicularity" },
  { id: "parallelism", symbol: "∥", name: "Parallelism" },
  { id: "position", symbol: "⌖", name: "Position" },
  { id: "profile", symbol: "⌒", name: "Profile of a surface" },
];

function parseVector(text: string): number[] {
  const nums = text.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  return nums.length ? nums : [1];
}

export function Studio() {
  const [snap, setSnap] = useState<Snap>(SEED);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Opening WASM FS…");
  const [src, setSrc] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"logic" | "markov" | "geometry" | "exchange" | "schema">("logic");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Propositional: true,
    "Alethic modal": true,
  });
  const [nlp, setNlp] = useState("necessarily P and possibly Q");
  const [nlpMsg, setNlpMsg] = useState("");
  const [atomName, setAtomName] = useState("");
  const [entity, setEntity] = useState({ type: "Agent", label: "", note: "" });
  const [listing, setListing] = useState({ title: "S5 lecture frame", price: "4.00", blurb: "Three worlds, transitive." });
  const [bid, setBid] = useState<Record<string, string>>({});
  const [gdtDraft, setGdtDraft] = useState({ characteristic: "position", tolerance: "0.05", datums: "A", feature: "star-shell" });
  const [yaw, setYaw] = useState(0.6);
  const [pitch, setPitch] = useState(0.35);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let live = true;
    readSnapshot(SEED)
      .then((saved) => {
        if (!live) return;
        setSnap({ ...SEED, ...saved, atoms: saved.atoms?.length ? saved.atoms : SEED.atoms });
        setReady(true);
      })
      .catch(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  const vector = useMemo(() => parseVector(snap.vectorText), [snap.vectorText]);
  const star = useMemo(() => sphericalStar(vector), [vector]);

  const parsed = useMemo(() => {
    try {
      return { formula: parseFormula(snap.formula) as Formula, error: "" };
    } catch (err) {
      return { formula: null as Formula | null, error: err instanceof Error ? err.message : "Bad formula" };
    }
  }, [snap.formula]);

  const offers = useMemo(() => {
    try { return completions(snap.formula, snap.atoms); } catch { return []; }
  }, [snap.formula, snap.atoms]);

  const latex = parsed.formula ? formulaLatex(parsed.formula) : "";
  const unicode = parsed.formula ? formulaUnicode(parsed.formula) : snap.formula;
  const katexHtml = useMemo(() => {
    if (!latex) return "";
    try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }); }
    catch { return ""; }
  }, [latex]);

  const truths = snap.truths;
  const values = useMemo(() => {
    if (!parsed.formula) return truths.map(() => false);
    return truths.map((_, i) => evalAt(parsed.formula!, snap.R, truths, i));
  }, [parsed.formula, snap.R, truths]);

  const boxP = useMemo(() => {
    try {
      const f = parseFormula("□P");
      return truths.map((_, i) => evalAt(f, snap.R, truths, i));
    } catch { return truths.map(() => false); }
  }, [snap.R, truths]);
  const diaP = useMemo(() => {
    try {
      const f = parseFormula("◇P");
      return truths.map((_, i) => evalAt(f, snap.R, truths, i));
    } catch { return truths.map(() => false); }
  }, [snap.R, truths]);

  const facts = useMemo(() => frameFacts(snap.R), [snap.R]);
  const P = useMemo(() => markovMatrix(snap.R), [snap.R]);
  const pi = useMemo(() => stationary(P), [P]);
  const doc = useMemo(() => buildDocument({
    worlds: snap.truths.map((valuation, i) => ({
      id: `w${i}`,
      valuation,
      sees: snap.R[i]!.map((on, j) => (on ? `w${j}` : "")).filter(Boolean),
    })),
    formula: unicode,
    latex,
    vector,
    area: star.area,
    vertexCount: star.vertices.length,
    edgeCount: star.edges.length,
    gdt: snap.gdt,
    entities: snap.entities,
    listings: snap.listings,
  }), [snap, unicode, latex, vector, star]);
  const schemaErrors = useMemo(() => validateDocument(doc), [doc]);
  const hits = useMemo(() => searchCatalog(query, {
    worlds: snap.truths.map((_, i) => `w${i}`),
    entities: snap.entities.map((e) => ({ label: e.label, type: e.type })),
    listings: snap.listings.map((l) => l.title),
  }), [query, snap.truths, snap.entities, snap.listings]);

  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(() => {
      writeSnapshot(snap, JSON.stringify(doc))
        .then(() => fsStatus())
        .then(setStatus)
        .catch(() => setStatus("WASM FS · save failed"));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [snap, doc, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tab !== "geometry") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f7f6fb";
    ctx.fillRect(0, 0, w, h);
    const scale = Math.min(w, h) * 0.34;
    const pts = star.vertices.map((v) => project(v, yaw, pitch, scale, w / 2, h / 2));
    const order = star.edges
      .map(([a, b]) => ({ a, b, z: (pts[a]!.z + pts[b]!.z) / 2 }))
      .sort((p, q) => p.z - q.z);
    for (const e of order) {
      const A = pts[e.a]!;
      const B = pts[e.b]!;
      ctx.strokeStyle = e.z > 0 ? "#3c4ec4" : "#b7b4c6";
      ctx.globalAlpha = e.z > 0 ? 0.9 : 0.35;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    pts.forEach((p, i) => {
      if (i % 4) return;
      ctx.fillStyle = p.z > 0 ? "#2c3ca8" : "#9aa0c8";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.z > 0 ? 2.4 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [star, yaw, pitch, tab]);

  function patch(partial: Partial<Snap>) {
    setSnap((s) => ({ ...s, ...partial }));
  }

  function toggleAtom(i: number, atom: string) {
    setSnap((s) => ({
      ...s,
      truths: s.truths.map((row, idx) => (idx === i ? { ...row, [atom]: !row[atom] } : row)),
    }));
  }

  function onWorldClick(i: number) {
    if (src === null) { setSrc(i); return; }
    if (src === i) { setSrc(null); return; }
    setSnap((s) => {
      const R = cloneR(s.R);
      R[src]![i] = !R[src]![i];
      return { ...s, R };
    });
    setSrc(null);
  }

  function addWorld() {
    if (snap.truths.length >= 12) return;
    setSnap((s) => {
      const truths = [...s.truths, Object.fromEntries(s.atoms.map((a) => [a, false]))];
      const n = truths.length;
      const R = s.R.map((row) => [...row, false]);
      R.push(Array.from({ length: n }, () => false));
      return { ...s, truths, R };
    });
  }

  function removeWorld(i: number) {
    if (snap.truths.length <= 1) return;
    setSnap((s) => ({
      ...s,
      truths: s.truths.filter((_, idx) => idx !== i),
      R: s.R.filter((_, idx) => idx !== i).map((row) => row.filter((_, idx) => idx !== i)),
    }));
    setSrc(null);
  }

  function addAtom() {
    const name = atomName.trim().replace(/[^A-Za-z0-9_]/g, "");
    if (!name || snap.atoms.includes(name)) return;
    setSnap((s) => ({
      ...s,
      atoms: [...s.atoms, name],
      truths: s.truths.map((row) => ({ ...row, [name]: false })),
    }));
    setAtomName("");
  }

  function insert(text: string) {
    if (!text) return;
    patch({ formula: snap.formula + text });
  }

  function take(formula: string) {
    patch({ formula });
  }

  const tier = snap.tier;
  const chart = pi.map((p, i) => ({ world: `w${i}`, p: Number(p.toFixed(3)) }));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="font-serif text-xl leading-none">Modal worlds</p>
            <p className="text-sm text-muted">{status}</p>
          </div>
          <div className="relative w-full min-w-0 sm:w-72 sm:flex-1">
            <label className="sr-only" htmlFor="search">Search the Modal Index</label>
            <input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Modal Index — symbols, worlds, entities"
              className="w-full rounded-full border border-line bg-card px-4 py-2 text-sm outline-none focus:border-accent"
            />
            {hits.length > 0 && (
              <ul className="absolute left-0 right-0 top-11 z-30 max-h-72 overflow-auto rounded-card border border-line bg-card shadow-lg">
                {hits.map((h, i) => (
                  <li key={`${h.kind}-${h.title}-${i}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent-soft"
                      onClick={() => { if (h.insert) insert(h.insert); setQuery(""); }}
                    >
                      <span className="text-sm">{h.title}</span>
                      <span className="text-xs text-muted">{h.kind} · {h.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex rounded-full border border-line bg-card p-1" role="group" aria-label="Experience">
            {(["novice", "adept", "expert"] as Tier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ tier: t })}
                className={`rounded-full px-3 py-1.5 text-sm capitalize ${tier === t ? "bg-accent text-on-accent" : "text-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-card border border-line bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addWorld} className="rounded-full border border-line px-3 py-2 text-sm">+ world</button>
            <span className="rounded-full border border-line px-3 py-2 text-sm">atom set: {snap.atoms.join(" ")}</span>
            <div className="ml-auto flex flex-wrap gap-1">
              {SYSTEMS.map((sys) => (
                <button key={sys} type="button" disabled={!tierAllows(tier, "adept")} onClick={() => patch({ R: closeFrame(snap.R, sys) })} className="rounded-lg border border-line px-2.5 py-2 text-sm">{sys}</button>
              ))}
              <button type="button" onClick={() => patch({ R: snap.R.map((row) => row.map(() => false)) })} className="rounded-lg border border-line px-2.5 py-2 text-sm">clear R</button>
            </div>
          </div>
          <div className="flex w-full gap-3 overflow-x-auto pb-2">
            {snap.truths.map((row, i) => (
              <article key={i} className={`min-w-52 flex-1 rounded-card border p-3 ${src === i ? "border-accent bg-accent-soft" : "border-line"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <button type="button" onClick={() => onWorldClick(i)} className="font-mono text-sm">w{i}</button>
                  <button type="button" aria-label={`Remove world w${i}`} onClick={() => removeWorld(i)} className="text-muted">×</button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {snap.atoms.map((atom) => (
                    <button key={atom} type="button" onClick={() => toggleAtom(i, atom)} className={`rounded-lg px-2.5 py-1 font-mono text-sm ${row[atom] ? "bg-chip text-on-accent" : "border border-line text-ink"}`}>{atom}</button>
                  ))}
                </div>
                <p className="font-mono text-sm">
                  <span className={boxP[i] ? "text-good" : "text-bad"}>□P {boxP[i] ? "✓" : "✗"}</span>
                  {"  "}
                  <span className={diaP[i] ? "text-good" : "text-bad"}>◇P {diaP[i] ? "✓" : "✗"}</span>
                </p>
                <p className="mt-1 text-sm text-muted">R → {snap.R[i]!.map((on, j) => (on ? `w${j}` : "")).filter(Boolean).join(", ") || "∅"}</p>
                <p className="mt-1 font-mono text-sm">{unicode || "—"} {parsed.formula ? (values[i] ? "✓" : "✗") : ""}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">Tap a world, then another, to toggle R. Tap an atom to flip its truth.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FACT_KEYS.map((k) => (
              <span key={k} className={`rounded-full border px-3 py-1 text-sm ${facts[k] ? "border-good text-good" : "border-line text-muted"}`}>{facts[k] ? "✓" : "○"} {k}</span>
            ))}
            <button type="button" disabled={!tierAllows(tier, "adept")} onClick={() => patch({ R: chainRelation(snap.truths.length) })} className="rounded-full border border-line px-3 py-1 text-sm">chain</button>
            <button type="button" disabled={!tierAllows(tier, "adept")} onClick={() => patch({ R: ringRelation(snap.truths.length) })} className="rounded-full border border-line px-3 py-1 text-sm">ring</button>
          </div>
        </section>

        <aside className="min-w-0 rounded-card border border-line bg-card p-3">
          <h2 className="mb-2 px-1 text-sm font-medium">Symbols</h2>
          <div className="max-h-[34rem] space-y-2 overflow-auto pr-1">
            {GROUPS.map((group) => {
              const items = SYMBOLS.filter((s) => s.group === group);
              const locked = items.every((s) => !tierAllows(tier, s.tier));
              const open = !!openGroups[group];
              return (
                <div key={group} className="border-b border-line pb-2">
                  <button type="button" className="flex w-full items-center justify-between py-1 text-left text-sm" onClick={() => setOpenGroups((g) => ({ ...g, [group]: !g[group] }))}>
                    <span>{open ? "▾" : "▸"} {group}</span>
                    <span className="text-muted">{items.length}{locked ? " · locked" : ""}</span>
                  </button>
                  {open && (
                    <div className="grid grid-cols-1 gap-2">
                      {items.filter((s) => tierAllows(tier, s.tier)).map((s) => (
                        <button key={`${group}-${s.name}`} type="button" onClick={() => insert(s.insert)} className="rounded-lg border border-line px-2 py-2 text-left hover:border-accent">
                          <span className="font-mono text-base text-accent">{s.glyph}</span>
                          <span className="ml-2 text-sm">{s.name}</span>
                          <span className="mt-0.5 block text-xs text-muted">{s.gloss}</span>
                        </button>
                      ))}
                      {locked && <p className="text-xs text-muted">Raise the tier to read this group.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {([
            ["logic", "Logic"],
            ["markov", "Markov"],
            ["geometry", "Spherical star"],
            ["exchange", "Exchange"],
            ["schema", "JSON-LD"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm ${tab === id ? "bg-accent text-on-accent" : "border border-line bg-card"}`}>{label}</button>
          ))}
        </div>
        <div className="rounded-card border border-line bg-card p-4">
          {tab === "logic" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted" htmlFor="formula">Formula · unicode</label>
                <input
                  id="formula"
                  value={snap.formula}
                  onChange={(e) => patch({ formula: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && offers[0]) {
                      e.preventDefault();
                      take(offers[0].formula);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono outline-none focus:border-accent"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {offers.map((offer) => (
                    <button key={offer.label + offer.formula} type="button" onClick={() => take(offer.formula)} className="rounded-full border border-line px-3 py-1 font-mono text-sm hover:border-accent">
                      {offer.label} {offer.formula}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">Tab takes the first completion. A fragment such as □(P→ is closed before the next connective is offered.</p>
                {parsed.error && <p className="mt-2 text-sm text-bad">{parsed.error}</p>}
                <p className="mt-3 text-sm text-muted">LaTeX</p>
                <p className="font-mono text-sm">{latex || "—"}</p>
                {katexHtml && <div className="mt-2" dangerouslySetInnerHTML={{ __html: katexHtml }} />}
                <p className="mt-3 text-sm">Holds at {values.map((v, i) => (v ? `w${i}` : "")).filter(Boolean).join(", ") || "no world"}.</p>
              </div>
              <div>
                <label className="text-sm text-muted" htmlFor="nlp">Plain language</label>
                <textarea id="nlp" value={nlp} onChange={(e) => setNlp(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent" />
                <button
                  type="button"
                  className="mt-2 rounded-full bg-accent px-4 py-2 text-sm text-on-accent"
                  onClick={() => {
                    try {
                      const next = englishToFormula(nlp);
                      patch({ formula: next });
                      setNlpMsg(next);
                    } catch (err) {
                      setNlpMsg(err instanceof Error ? err.message : "Could not read that");
                    }
                  }}
                >
                  Read into formula
                </button>
                {nlpMsg && <p className="mt-2 font-mono text-sm">{nlpMsg}</p>}
                <p className="mt-3 text-xs text-muted">Try “if P then Q”, “not both P and Q”, “necessarily P and possibly Q”.</p>
                {tierAllows(tier, "expert") ? (
                  <div className="mt-4 flex gap-2">
                    <input value={atomName} onChange={(e) => setAtomName(e.target.value)} placeholder="New atom" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
                    <button type="button" onClick={addAtom} className="rounded-lg border border-line px-3 py-2 text-sm">Add</button>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">Expert tier adds atoms and named entities.</p>
                )}
              </div>
            </div>
          )}

          {tab === "markov" && (
            tierAllows(tier, "adept") ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium">Transition chain</h3>
                  <p className="mb-2 text-sm text-muted">Each row of R, normalized. A world with no successor jumps uniformly.</p>
                  <div className="overflow-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead><tr><th className="p-1" />{P.map((_, j) => <th key={j} className="p-1">w{j}</th>)}</tr></thead>
                      <tbody>
                        {P.map((row, i) => (
                          <tr key={i}><th className="p-1">w{i}</th>{row.map((cell, j) => <td key={j} className="p-1">{cell.toFixed(2)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {src !== null && <p className="mt-2 text-sm">Next from w{src}: {nextFrom(P, src).map((p, i) => `w${i} ${(p * 100).toFixed(0)}%`).join(" · ")}</p>}
                </div>
                <div className="h-56">
                  <h3 className="mb-2 text-sm font-medium">Stationary mass</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chart}>
                      <XAxis dataKey="world" stroke="var(--color-muted)" fontSize={12} />
                      <YAxis stroke="var(--color-muted)" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="p" fill="var(--color-accent)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : <Locked need="Adept" />
          )}

          {tab === "geometry" && (
            tierAllows(tier, "expert") ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                  <canvas
                    ref={canvasRef}
                    className="h-80 w-full rounded-lg border border-line bg-paper"
                    onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, yaw, pitch }; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); }}
                    onPointerMove={(e) => {
                      if (!drag.current) return;
                      setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.01);
                      setPitch(drag.current.pitch + (e.clientY - drag.current.y) * 0.01);
                    }}
                    onPointerUp={() => { drag.current = null; }}
                  />
                  <p className="mt-2 text-sm text-muted">{star.vertices.length} vertices · {star.edges.length} edges · spherical area {star.area.toFixed(3)} sr. Drag to turn the star.</p>
                  <label className="mt-3 block text-sm text-muted" htmlFor="vector">Data vector</label>
                  <input id="vector" value={snap.vectorText} onChange={(e) => patch({ vectorText: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-mono text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">GD&T on the shell</h3>
                  <label className="mt-2 block text-xs text-muted">Characteristic</label>
                  <select value={gdtDraft.characteristic} onChange={(e) => setGdtDraft({ ...gdtDraft, characteristic: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-2 text-sm">
                    {GDT_CHARS.map((c) => <option key={c.id} value={c.id}>{c.symbol} {c.name}</option>)}
                  </select>
                  <label className="mt-2 block text-xs text-muted">Tolerance</label>
                  <input value={gdtDraft.tolerance} onChange={(e) => setGdtDraft({ ...gdtDraft, tolerance: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
                  <label className="mt-2 block text-xs text-muted">Datums</label>
                  <input value={gdtDraft.datums} onChange={(e) => setGdtDraft({ ...gdtDraft, datums: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm" />
                  <button
                    type="button"
                    className="mt-3 rounded-full bg-accent px-4 py-2 text-sm text-on-accent"
                    onClick={() => {
                      const spec = GDT_CHARS.find((c) => c.id === gdtDraft.characteristic)!;
                      patch({
                        gdt: [...snap.gdt, { id: `${Date.now()}`, characteristic: spec.name, symbol: spec.symbol, tolerance: gdtDraft.tolerance, datums: gdtDraft.datums, feature: gdtDraft.feature }],
                      });
                    }}
                  >
                    Attach frame
                  </button>
                  <ul className="mt-3 space-y-2">
                    {snap.gdt.map((g) => (
                      <li key={g.id} className="flex items-center justify-between rounded-lg border border-line px-2 py-2 font-mono text-sm">
                        <span>{g.symbol} {g.tolerance} {g.datums} · {g.characteristic}</span>
                        <button type="button" onClick={() => patch({ gdt: snap.gdt.filter((x) => x.id !== g.id) })} className="text-muted">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : <Locked need="Expert" />
          )}

          {tab === "exchange" && (
            tierAllows(tier, "expert") ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium">Publish this model</h3>
                  <input value={listing.title} onChange={(e) => setListing({ ...listing, title: e.target.value })} className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm" placeholder="Title" />
                  <input value={listing.price} onChange={(e) => setListing({ ...listing, price: e.target.value })} className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm" placeholder="Price" />
                  <textarea value={listing.blurb} onChange={(e) => setListing({ ...listing, blurb: e.target.value })} rows={2} className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                  <label className="mt-2 block text-xs text-muted" htmlFor="merchant">PayPal merchant email</label>
                  <input id="merchant" value={snap.merchant} onChange={(e) => patch({ merchant: e.target.value })} placeholder="seller@studio.example" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                  <button
                    type="button"
                    className="mt-3 rounded-full bg-accent px-4 py-2 text-sm text-on-accent"
                    onClick={() => {
                      if (!listing.title.trim()) return;
                      patch({
                        listings: [{ id: `${Date.now()}`, title: listing.title.trim(), price: listing.price || "0.00", currency: "USD", sellerEmail: snap.merchant.trim(), blurb: listing.blurb, createdAt: Date.now() }, ...snap.listings],
                      });
                    }}
                  >
                    List on the exchange
                  </button>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium">Named entities</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select value={entity.type} onChange={(e) => setEntity({ ...entity, type: e.target.value })} className="rounded-lg border border-line bg-card px-2 py-2 text-sm">
                        {["Agent", "Object", "Atom", "Feature", "World"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <input value={entity.label} onChange={(e) => setEntity({ ...entity, label: e.target.value })} placeholder="Label" className="min-w-32 flex-1 rounded-lg border border-line px-2 py-2 text-sm" />
                    </div>
                    <input value={entity.note} onChange={(e) => setEntity({ ...entity, note: e.target.value })} placeholder="Note" className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-sm" />
                    <button
                      type="button"
                      className="mt-2 rounded-full border border-line px-4 py-2 text-sm"
                      onClick={() => {
                        if (!entity.label.trim()) return;
                        patch({ entities: [...snap.entities, { id: `${Date.now()}`, type: entity.type, label: entity.label.trim(), note: entity.note }] });
                        setEntity({ ...entity, label: "", note: "" });
                      }}
                    >
                      Create entity
                    </button>
                    <ul className="mt-2 space-y-1 text-sm">
                      {snap.entities.map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <span>{e.type} · {e.label}</span>
                          <button type="button" className="text-muted" onClick={() => patch({ entities: snap.entities.filter((x) => x.id !== e.id) })}>×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <ul className="space-y-3">
                  {snap.listings.length === 0 && <li className="text-sm text-muted">Nothing listed yet. A listing stores the model beside a PayPal checkout.</li>}
                  {snap.listings.map((item) => (
                    <li key={item.id} className="rounded-lg border border-line p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-medium">{item.title}</h4>
                        <span className="font-mono text-sm">${item.price}</span>
                      </div>
                      <p className="text-sm text-muted">{item.blurb}</p>
                      <div className="mt-2 flex gap-2">
                        <input value={bid[item.id] ?? ""} onChange={(e) => setBid({ ...bid, [item.id]: e.target.value })} placeholder="Ad bid" className="w-28 rounded-lg border border-line px-2 py-1.5 text-sm" />
                        <button
                          type="button"
                          className="rounded-lg border border-line px-3 py-1.5 text-sm"
                          onClick={() => {
                            const amount = bid[item.id]?.trim();
                            if (!amount) return;
                            patch({ entities: [...snap.entities, { id: `bid-${item.id}-${Date.now()}`, type: "Advert", label: `${amount} on ${item.title}`, note: "Advertising exchange bid" }] });
                          }}
                        >
                          Place bid
                        </button>
                      </div>
                      {item.sellerEmail.includes("@") ? (
                        <form className="mt-2" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                          <input type="hidden" name="cmd" value="_xclick" />
                          <input type="hidden" name="business" value={item.sellerEmail} />
                          <input type="hidden" name="item_name" value={item.title} />
                          <input type="hidden" name="amount" value={item.price} />
                          <input type="hidden" name="currency_code" value={item.currency} />
                          <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm text-on-accent">Pay with PayPal</button>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs text-muted">Add a PayPal merchant email before checkout. Card numbers never touch this studio.</p>
                      )}
                      <button type="button" className="mt-2 text-sm text-muted" onClick={() => patch({ listings: snap.listings.filter((x) => x.id !== item.id) })}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <Locked need="Expert" />
          )}

          {tab === "schema" && (
            tierAllows(tier, "adept") ? (
              <div>
                <p className="text-sm">{schemaErrors.length ? schemaErrors.join(" · ") : "Valid against the ModalModel schema."}</p>
                <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-paper p-3 font-mono text-xs">{JSON.stringify(doc, null, 2)}</pre>
              </div>
            ) : <Locked need="Adept" />
          )}
        </div>
      </section>
    </div>
  );
}

function Locked({ need }: { need: string }) {
  return <p className="text-sm text-muted">This bench opens at {need}. Use the tier switch in the header — nothing is deleted when you go back.</p>;
}
