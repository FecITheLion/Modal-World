import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as katex } from "../_libs/katex.mjs";
import { a as ResponsiveContainer, i as Bar, n as YAxis, o as Tooltip, r as XAxis, t as BarChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-ve46h94U.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RESERVED = /* @__PURE__ */ new Set([
	"not",
	"and",
	"or",
	"xor",
	"if",
	"then",
	"iff",
	"implies",
	"box",
	"diamond",
	"nec",
	"pos",
	"true",
	"false",
	"top",
	"bot"
]);
function normalize(src) {
	return src.replace(/\\Box|\\square|\\nec/g, "□").replace(/\\Diamond|\\dia|\\lozenge/g, "◇").replace(/\\neg|\\lnot|~/g, "¬").replace(/\\land|\\wedge|&&/g, "∧").replace(/\\lor|\\vee|\|\|/g, "∨").replace(/\\to|\\rightarrow|\\implies|->/g, "→").replace(/\\leftrightarrow|<->/g, "↔").replace(/\\oplus|\\xor/g, "⊕").replace(/\\top/g, "⊤").replace(/\\bot|\\bottom/g, "⊥");
}
function tokenize(src) {
	const s = normalize(src);
	const out = [];
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (/\s/.test(c)) {
			i++;
			continue;
		}
		if (c === "(") {
			out.push({ t: "lp" });
			i++;
			continue;
		}
		if (c === ")") {
			out.push({ t: "rp" });
			i++;
			continue;
		}
		if ("¬□◇∧∨→↔⊕⊤⊥".includes(c)) {
			out.push({
				t: "op",
				v: c
			});
			i++;
			continue;
		}
		if (/[A-Za-z_]/.test(c)) {
			let j = i + 1;
			while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
			out.push({
				t: "id",
				v: s.slice(i, j)
			});
			i = j;
			continue;
		}
		throw new Error(`Unexpected “${c}” in formula`);
	}
	return out;
}
function parseFormula(src) {
	const toks = tokenize(src.trim());
	if (!toks.length) throw new Error("Write a formula");
	let i = 0;
	const peek = () => toks[i];
	const eat = () => toks[i++];
	function parseIff() {
		let left = parseImp();
		while (peek()?.t === "op" && peek().v === "↔") {
			eat();
			left = {
				k: "iff",
				a: left,
				b: parseImp()
			};
		}
		return left;
	}
	function parseImp() {
		let left = parseOr();
		while (peek()?.t === "op" && peek().v === "→") {
			eat();
			left = {
				k: "imp",
				a: left,
				b: parseOr()
			};
		}
		return left;
	}
	function parseOr() {
		let left = parseAnd();
		for (;;) {
			const p = peek();
			if (p?.t === "op" && (p.v === "∨" || p.v === "⊕")) {
				eat();
				left = {
					k: p.v === "⊕" ? "xor" : "or",
					a: left,
					b: parseAnd()
				};
			} else if (p?.t === "id" && (p.v.toLowerCase() === "or" || p.v.toLowerCase() === "xor")) {
				const kind = p.v.toLowerCase() === "xor" ? "xor" : "or";
				eat();
				left = {
					k: kind,
					a: left,
					b: parseAnd()
				};
			} else break;
		}
		return left;
	}
	function parseAnd() {
		let left = parseUnary();
		for (;;) {
			const p = peek();
			if (p?.t === "op" && p.v === "∧") {
				eat();
				left = {
					k: "and",
					a: left,
					b: parseUnary()
				};
			} else if (p?.t === "id" && p.v.toLowerCase() === "and") {
				eat();
				left = {
					k: "and",
					a: left,
					b: parseUnary()
				};
			} else break;
		}
		return left;
	}
	function parseUnary() {
		const p = peek();
		if (p?.t === "op" && (p.v === "¬" || p.v === "□" || p.v === "◇")) {
			eat();
			const a = parseUnary();
			if (p.v === "¬") return {
				k: "not",
				a
			};
			if (p.v === "□") return {
				k: "box",
				a
			};
			return {
				k: "dia",
				a
			};
		}
		if (p?.t === "id") {
			const w = p.v.toLowerCase();
			if (w === "not" || w === "box" || w === "diamond" || w === "nec" || w === "pos") {
				eat();
				const a = parseUnary();
				if (w === "not") return {
					k: "not",
					a
				};
				if (w === "box" || w === "nec") return {
					k: "box",
					a
				};
				return {
					k: "dia",
					a
				};
			}
		}
		return parsePrimary();
	}
	function parsePrimary() {
		const p = peek();
		if (!p) throw new Error("Formula ended early");
		if (p.t === "lp") {
			eat();
			const inner = parseIff();
			if (peek()?.t !== "rp") throw new Error("Missing )");
			eat();
			return inner;
		}
		if (p.t === "op" && p.v === "⊤") {
			eat();
			return { k: "top" };
		}
		if (p.t === "op" && p.v === "⊥") {
			eat();
			return { k: "bot" };
		}
		if (p.t === "id") {
			const w = p.v.toLowerCase();
			if (w === "true" || w === "top") {
				eat();
				return { k: "top" };
			}
			if (w === "false" || w === "bot") {
				eat();
				return { k: "bot" };
			}
			if (RESERVED.has(w)) throw new Error(`“${p.v}” is reserved`);
			eat();
			return {
				k: "atom",
				name: p.v
			};
		}
		throw new Error("Expected an atom or (");
	}
	const f = parseIff();
	if (i < toks.length) throw new Error("Extra tokens after formula");
	return f;
}
function formulaUnicode(f) {
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
function prec(f) {
	switch (f.k) {
		case "iff": return 1;
		case "imp": return 2;
		case "or":
		case "xor": return 3;
		case "and": return 4;
		default: return 6;
	}
}
function wrap(f, min) {
	const s = formulaUnicode(f);
	return prec(f) < min ? `(${s})` : s;
}
function formulaLatex(f) {
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
function latexWrap(f, min) {
	const s = formulaLatex(f);
	return prec(f) < min ? `(${s})` : s;
}
function evalAt(f, worlds, truths, i) {
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
		case "box": return worlds[i].every((on, j) => !on || evalAt(f.a, worlds, truths, j));
		case "dia": return worlds[i].some((on, j) => on && evalAt(f.a, worlds, truths, j));
	}
}
function frameFacts(R) {
	const n = R.length;
	const f = {
		serial: true,
		reflexive: true,
		symmetric: true,
		transitive: true,
		euclidean: true
	};
	for (let i = 0; i < n; i++) {
		if (!R[i].some(Boolean)) f.serial = false;
		if (!R[i][i]) f.reflexive = false;
		for (let j = 0; j < n; j++) if (R[i][j]) {
			if (!R[j][i]) f.symmetric = false;
			for (let k = 0; k < n; k++) {
				if (R[j][k] && !R[i][k]) f.transitive = false;
				if (R[i][k] && !R[j][k]) f.euclidean = false;
			}
		}
	}
	return f;
}
function cloneR(R) {
	return R.map((row) => row.slice());
}
function warshall(R) {
	const M = cloneR(R);
	const n = M.length;
	for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (M[i][k]) {
		for (let j = 0; j < n; j++) if (M[k][j]) M[i][j] = true;
	}
	return M;
}
function closeFrame(R, sys) {
	const n = R.length;
	let M = cloneR(R);
	if (sys === "D") {
		for (let i = 0; i < n; i++) if (!M[i].some(Boolean)) M[i][i] = true;
	}
	if (sys === "T" || sys === "B" || sys === "S4" || sys === "S5") for (let i = 0; i < n; i++) M[i][i] = true;
	if (sys === "B" || sys === "S5") {
		for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i][j]) M[j][i] = true;
	}
	if (sys === "S4" || sys === "S5") M = warshall(M);
	if (sys === "S5") {
		for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i][j]) M[j][i] = true;
		M = warshall(M);
	}
	return M;
}
function chainRelation(n) {
	return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j === i + 1));
}
function ringRelation(n) {
	return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j === (i + 1) % n));
}
var BINARY = /* @__PURE__ */ new Set([
	"∧",
	"∨",
	"→",
	"↔",
	"⊕"
]);
var UNARY = /* @__PURE__ */ new Set([
	"¬",
	"□",
	"◇"
]);
/** Turn a fragment into a closed formula: finish atoms, fill holes, balance parentheses. */
function finishFormula(raw, atoms) {
	const fallback = atoms[0] || "P";
	const s = normalize(raw);
	let out = "";
	let expect = "term";
	let depth = 0;
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (/\s/.test(c)) {
			i++;
			continue;
		}
		if (expect === "term") {
			if (c === "(") {
				out += "(";
				depth++;
				i++;
				continue;
			}
			if (UNARY.has(c)) {
				out += c;
				i++;
				continue;
			}
			if (c === "⊤" || c === "⊥") {
				out += c;
				expect = "op";
				i++;
				continue;
			}
			if (/[A-Za-z_]/.test(c)) {
				let j = i + 1;
				while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
				const name = s.slice(i, j);
				const exact = atoms.find((a) => a.toLowerCase() === name.toLowerCase());
				const prefix = atoms.find((a) => a.toLowerCase().startsWith(name.toLowerCase()));
				const word = name.toLowerCase();
				if (word === "not") {
					out += "¬";
					i = j;
					continue;
				}
				if (word === "box" || word === "nec") {
					out += "□";
					i = j;
					continue;
				}
				if (word === "diamond" || word === "pos") {
					out += "◇";
					i = j;
					continue;
				}
				if (word === "and" || word === "or" || word === "xor" || word === "iff" || word === "implies") {
					out += fallback;
					out += word === "and" ? "∧" : word === "or" ? "∨" : word === "xor" ? "⊕" : word === "iff" ? "↔" : "→";
					expect = "term";
					i = j;
					continue;
				}
				if (word === "true" || word === "top") {
					out += "⊤";
					expect = "op";
					i = j;
					continue;
				}
				if (word === "false" || word === "bot") {
					out += "⊥";
					expect = "op";
					i = j;
					continue;
				}
				out += exact ?? prefix ?? (RESERVED.has(word) ? fallback : name);
				expect = "op";
				i = j;
				continue;
			}
			i++;
			continue;
		}
		if (BINARY.has(c)) {
			out += c;
			expect = "term";
			i++;
			continue;
		}
		if (c === ")" && depth > 0) {
			out += ")";
			depth--;
			expect = "op";
			i++;
			continue;
		}
		if (/[A-Za-z_(¬□◇⊤⊥]/.test(c)) {
			out += "∧";
			expect = "term";
			continue;
		}
		i++;
	}
	if (expect === "term") {
		const hole = /[∧∨→↔⊕]$/.test(out) ? atoms[1] || fallback : fallback;
		out += hole;
	}
	if (!out) out = fallback;
	while (depth > 0) {
		out += ")";
		depth--;
	}
	return formulaUnicode(parseFormula(out));
}
/** Next well-formed formulas: a repair of the fragment, or one connective further. */
function completions(raw, atoms) {
	const atom = atoms[1] || atoms[0] || "Q";
	const finished = finishFormula(raw, atoms);
	let current = null;
	try {
		current = parseFormula(raw.trim() ? raw : finished);
	} catch {
		current = null;
	}
	if (!current) try {
		current = parseFormula(finished);
	} catch {
		return [{
			label: "Finish",
			formula: finished
		}];
	}
	const same = formulaUnicode(current) === raw.trim() || formulaUnicode(current) === finished && formulaUnicode(current) !== raw.trim();
	const steps = [];
	if (formulaUnicode(current) !== raw.trim()) steps.push({
		label: "Finish",
		formula: formulaUnicode(current)
	});
	const extend = (label, f) => steps.push({
		label,
		formula: formulaUnicode(f)
	});
	const other = {
		k: "atom",
		name: atom
	};
	if (same || steps.length < 6) {
		extend(`∧ ${atom}`, {
			k: "and",
			a: current,
			b: other
		});
		extend(`∨ ${atom}`, {
			k: "or",
			a: current,
			b: other
		});
		extend(`→ ${atom}`, {
			k: "imp",
			a: current,
			b: other
		});
		extend(`↔ ${atom}`, {
			k: "iff",
			a: current,
			b: other
		});
		extend("□", {
			k: "box",
			a: current
		});
		extend("¬", {
			k: "not",
			a: current
		});
	}
	const seen = /* @__PURE__ */ new Set();
	return steps.filter((s) => {
		if (seen.has(s.formula) || s.formula === raw.trim()) return false;
		seen.add(s.formula);
		return true;
	}).slice(0, 6);
}
function words(input) {
	return input.replace(/[.,;:!?]/g, " ").trim().split(/\s+/).filter(Boolean).map((raw) => ({
		raw,
		low: raw.toLowerCase()
	}));
}
var STOP = /* @__PURE__ */ new Set([
	"a",
	"an",
	"the",
	"at",
	"world",
	"is",
	"be",
	"holds",
	"that"
]);
function parseExpr(ws, min) {
	let rest = ws;
	let node;
	if (!rest.length) throw new Error("The sentence ran out");
	const head = rest[0].low;
	if (head === "if") {
		const thenAt = rest.findIndex((w) => w.low === "then");
		if (thenAt < 2) throw new Error("Use “if … then …”");
		const left = parseExpr(rest.slice(1, thenAt), 0);
		const right = parseExpr(rest.slice(thenAt + 1), 0);
		return {
			node: {
				k: "imp",
				a: left.node,
				b: right.node
			},
			rest: right.rest
		};
	}
	if (head === "(") {
		let depth = 0;
		let close = -1;
		for (let i = 0; i < rest.length; i++) {
			if (rest[i].low === "(") depth++;
			if (rest[i].low === ")") {
				depth--;
				if (depth === 0) {
					close = i;
					break;
				}
			}
		}
		if (close < 0) throw new Error("Missing )");
		node = parseExpr(rest.slice(1, close), 0).node;
		rest = rest.slice(close + 1);
	} else if (head === "not" || head === "necessarily" || head === "possibly" || head === "maybe") {
		const inner = parseExpr(rest.slice(1), 5);
		node = {
			k: head === "not" ? "not" : head === "necessarily" ? "box" : "dia",
			a: inner.node
		};
		rest = inner.rest;
	} else if (head === "both") {
		const inner = parseExpr(rest.slice(1), 4);
		node = inner.node;
		rest = inner.rest;
	} else {
		if (STOP.has(head) || !/^[a-z][a-z0-9]*$/i.test(rest[0].raw)) throw new Error(`I don’t know the word “${rest[0].raw}”`);
		node = {
			k: "atom",
			name: rest[0].raw.replace(/[^A-Za-z0-9]/g, "") || "P"
		};
		if (node.k === "atom") node = {
			k: "atom",
			name: node.name.charAt(0).toUpperCase() + node.name.slice(1).replace(/^([A-Z])(.*)$/, (_, a, b) => a + b)
		};
		const raw = rest[0].raw;
		node = {
			k: "atom",
			name: /^[A-Za-z][A-Za-z0-9]*$/.test(raw) ? raw.length === 1 ? raw.toUpperCase() : raw : "P"
		};
		rest = rest.slice(1);
	}
	const prec = {
		and: 4,
		or: 3,
		xor: 3,
		implies: 2,
		iff: 1
	};
	for (;;) {
		const op = rest[0]?.low;
		if (!op || prec[op] === void 0 || prec[op] < min) break;
		const p = prec[op];
		const right = parseExpr(rest.slice(1), p + 1);
		node = {
			k: op === "and" ? "and" : op === "or" ? "or" : op === "xor" ? "xor" : op === "iff" ? "iff" : "imp",
			a: node,
			b: right.node
		};
		rest = right.rest;
	}
	return {
		node,
		rest
	};
}
function emit(n) {
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
function englishToFormula(input) {
	const s = input.trim();
	if (!s) throw new Error("Type a sentence");
	if (/[¬∧∨→↔⊕□◇⊤⊥\\]/.test(s)) return s;
	const parsed = parseExpr(words(s), 0);
	if (parsed.rest.length) throw new Error(`Leftover words: ${parsed.rest.map((w) => w.raw).join(" ")}`);
	return emit(parsed.node);
}
var MODAL_CONTEXT = {
	"@version": 1.1,
	mw: "https://modal.world/ns#",
	schema: "https://schema.org/",
	ModalModel: "mw:ModalModel",
	World: "mw:World",
	Atom: "mw:Atom",
	Feature: "mw:GeometricFeature",
	Listing: "schema:Offer",
	worlds: {
		"@id": "mw:world",
		"@container": "@set"
	},
	accessibility: "mw:accessibility",
	valuation: "mw:valuation",
	formula: "mw:formula",
	latex: "mw:latex",
	sphericalStar: "mw:sphericalStar",
	vector: {
		"@id": "mw:dataVector",
		"@container": "@list"
	},
	gdt: {
		"@id": "mw:gdtFrame",
		"@container": "@set"
	},
	entities: {
		"@id": "mw:entity",
		"@container": "@graph"
	},
	name: "schema:name",
	price: "schema:price",
	priceCurrency: "schema:priceCurrency"
};
function buildDocument(input) {
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
			accessibility: w.sees.map((id) => ({ "@id": `urn:modal:world:${id}` }))
		})),
		sphericalStar: {
			"@type": "mw:SphericalStar",
			vector: input.vector,
			vertexCount: input.vertexCount,
			edgeCount: input.edgeCount,
			area: Number(input.area.toFixed(4))
		},
		gdt: input.gdt.map((g) => ({
			"@type": "Feature",
			"@id": `urn:modal:gdt:${g.id}`,
			characteristic: g.characteristic,
			symbol: g.symbol,
			tolerance: g.tolerance,
			datums: g.datums,
			feature: g.feature
		})),
		entities: input.entities.map((e) => ({
			"@type": e.type,
			"@id": `urn:modal:entity:${e.id}`,
			name: e.label,
			description: e.note
		})),
		listings: input.listings.map((l) => ({
			"@type": "Listing",
			"@id": `urn:modal:listing:${l.id}`,
			name: l.title,
			price: l.price,
			priceCurrency: l.currency,
			seller: l.sellerEmail
		}))
	};
}
function validateDocument(doc) {
	const errors = [];
	if (!doc || typeof doc !== "object") return ["Document is not an object"];
	const d = doc;
	if (d["@type"] !== "ModalModel") errors.push("@type must be ModalModel");
	if (!d["@context"] || typeof d["@context"] !== "object") errors.push("@context missing");
	if (!Array.isArray(d.worlds) || d.worlds.length === 0) errors.push("worlds must be a non-empty set");
	else for (const w of d.worlds) {
		if (w["@type"] !== "World") errors.push("each world needs @type World");
		if (typeof w["@id"] !== "string") errors.push("each world needs an @id");
		if (!w.valuation || typeof w.valuation !== "object") errors.push("each world needs a valuation");
	}
	if (typeof d.formula !== "string") errors.push("formula must be a string");
	const star = d.sphericalStar;
	if (!star || !Array.isArray(star.vector)) errors.push("sphericalStar.vector must be a list of numbers");
	return errors;
}
function markovMatrix(R) {
	return R.map((row) => {
		const s = row.reduce((a, b) => a + (b ? 1 : 0), 0);
		if (!s) return row.map(() => 1 / row.length);
		return row.map((b) => b ? 1 / s : 0);
	});
}
function stationary(P, steps = 48) {
	const n = P.length;
	if (!n) return [];
	let v = Array.from({ length: n }, () => 1 / n);
	for (let s = 0; s < steps; s++) {
		const next = Array.from({ length: n }, () => 0);
		for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) next[j] += v[i] * P[i][j];
		v = next;
	}
	return v;
}
function nextFrom(P, i) {
	return P[i] ? P[i].slice() : [];
}
function clamp(v, fallback) {
	const clean = v.filter((n) => Number.isFinite(n));
	return clean.length ? clean : fallback;
}
/** Fibonacci spherical star whose radii are modulated by a data vector. */
function sphericalStar(raw) {
	const vector = clamp(raw, [
		1,
		.5,
		.8,
		.3,
		.6
	]);
	const maxAbs = Math.max(...vector.map((n) => Math.abs(n)), 1e-6);
	const N = Math.max(28, Math.min(160, vector.length * 14));
	const phi = Math.PI * (3 - Math.sqrt(5));
	const vertices = [];
	for (let i = 0; i < N; i++) {
		const y = N === 1 ? 0 : 1 - i / (N - 1) * 2;
		const r = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = phi * i;
		const mag = .78 + .28 * (Math.abs(vector[i % vector.length]) / maxAbs);
		vertices.push({
			x: Math.cos(theta) * r * mag,
			y: y * mag,
			z: Math.sin(theta) * r * mag
		});
	}
	const step = Math.max(2, Math.round(Math.sqrt(N)));
	const edges = [];
	const triangles = [];
	const seen = /* @__PURE__ */ new Set();
	const addEdge = (a, b) => {
		const k = a < b ? `${a}:${b}` : `${b}:${a}`;
		if (seen.has(k) || a === b) return;
		seen.add(k);
		edges.push([a, b]);
	};
	for (let i = 0; i < N; i++) {
		const a = (i + 1) % N;
		const b = (i + step) % N;
		addEdge(i, a);
		addEdge(i, b);
		if (a !== b) triangles.push([
			i,
			a,
			b
		]);
	}
	let area = 0;
	for (const [i, j, k] of triangles) area += sphericalExcess(vertices[i], vertices[j], vertices[k]);
	return {
		vertices,
		edges,
		triangles,
		area: Math.abs(area),
		radius: 1
	};
}
function dot(a, b) {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x
	};
}
function norm(a) {
	const L = Math.hypot(a.x, a.y, a.z) || 1;
	return {
		x: a.x / L,
		y: a.y / L,
		z: a.z / L
	};
}
function angle(a, b) {
	const d = Math.min(1, Math.max(-1, dot(norm(a), norm(b))));
	return Math.acos(d);
}
/** Girard's theorem on the unit directions of three vertices. */
function sphericalExcess(A, B, C) {
	const a = norm(A);
	const b = norm(B);
	const c = norm(C);
	const ang = (u, v, w) => {
		const n1 = norm(cross(u, v));
		const n2 = norm(cross(u, w));
		return Math.acos(Math.min(1, Math.max(-1, dot(n1, n2))));
	};
	if (angle(a, b) < .001 || angle(b, c) < .001 || angle(c, a) < .001) return 0;
	const Aang = ang(a, b, c);
	const Bang = ang(b, a, c);
	const Cang = ang(c, a, b);
	const excess = Aang + Bang + Cang - Math.PI;
	return Number.isFinite(excess) ? excess : 0;
}
function project(v, yaw, pitch, scale, cx, cy) {
	const cyaw = Math.cos(yaw);
	const syaw = Math.sin(yaw);
	const x1 = v.x * cyaw + v.z * syaw;
	const z1 = -v.x * syaw + v.z * cyaw;
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	const y2 = v.y * cp - z1 * sp;
	const z2 = v.y * sp + z1 * cp;
	const f = 2.4 / (2.4 + z2);
	return {
		x: cx + x1 * scale * f,
		y: cy - y2 * scale * f,
		z: z2
	};
}
var IDB = "modal-worlds";
var STORE = "wasm-fs";
var KEY = "studio.sqlite";
function idb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(IDB, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function idbGet() {
	const db = await idb();
	return new Promise((resolve, reject) => {
		const g = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
		g.onsuccess = () => {
			const v = g.result;
			if (!v) resolve(null);
			else resolve(v instanceof Uint8Array ? v : new Uint8Array(v));
		};
		g.onerror = () => reject(g.error);
	});
}
async function idbPut(bytes) {
	const db = await idb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(bytes, KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
var dbPromise = null;
function openDatabase() {
	if (!dbPromise) dbPromise = (async () => {
		const { default: initSqlJs } = await import("../_libs/sql.js.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
		const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
		const saved = await idbGet().catch(() => null);
		const db = saved ? new SQL.Database(saved) : new SQL.Database();
		db.run(`
        CREATE TABLE IF NOT EXISTS kv (
          k TEXT PRIMARY KEY,
          v TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          body TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
		return db;
	})();
	return dbPromise;
}
async function readSnapshot(fallback) {
	const stmt = (await openDatabase()).prepare("SELECT v FROM kv WHERE k = ?");
	stmt.bind(["snapshot"]);
	let value = fallback;
	if (stmt.step()) {
		const row = stmt.getAsObject();
		try {
			value = JSON.parse(String(row.v));
		} catch {
			value = fallback;
		}
	}
	stmt.free();
	return value;
}
async function writeSnapshot(value, jsonld) {
	const db = await openDatabase();
	const now = Date.now();
	db.run("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", ["snapshot", JSON.stringify(value)]);
	db.run("INSERT INTO documents (id, kind, body, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at", [
		"urn:modal:studio",
		"application/ld+json",
		jsonld,
		now
	]);
	await idbPut(db.export());
}
async function fsStatus() {
	const rows = (await openDatabase()).exec("SELECT COUNT(*) FROM documents");
	const n = Number(rows[0]?.values[0]?.[0] ?? 0);
	return `WASM FS · ${n} document${n === 1 ? "" : "s"}`;
}
var T = {
	novice: "novice",
	adept: "adept",
	expert: "expert"
};
var SYMBOLS = [
	{
		glyph: "¬",
		name: "negation",
		gloss: "not P: true at w iff P is false at w",
		insert: "¬",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "∧",
		name: "conjunction",
		gloss: "P and Q both true at w",
		insert: "∧",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "∨",
		name: "disjunction",
		gloss: "at least one of P, Q true at w",
		insert: "∨",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "→",
		name: "implication",
		gloss: "if P then Q at w",
		insert: "→",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "↔",
		name: "biconditional",
		gloss: "P and Q have the same truth value at w",
		insert: "↔",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "⊕",
		name: "exclusive or",
		gloss: "exactly one of P, Q is true",
		insert: "⊕",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "↑",
		name: "NAND (Sheffer)",
		gloss: "not both P and Q",
		insert: "¬(",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "↓",
		name: "NOR (Peirce)",
		gloss: "neither P nor Q",
		insert: "¬(",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "⊤",
		name: "verum",
		gloss: "true at every world",
		insert: "⊤",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "⊥",
		name: "falsum",
		gloss: "true at no world",
		insert: "⊥",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "≡",
		name: "equivalence",
		gloss: "true at exactly the same worlds",
		insert: "↔",
		group: "Propositional",
		tier: T.novice
	},
	{
		glyph: "□",
		name: "necessity",
		gloss: "P at every accessible world",
		insert: "□",
		group: "Alethic modal",
		tier: T.novice
	},
	{
		glyph: "◇",
		name: "possibility",
		gloss: "P at some accessible world",
		insert: "◇",
		group: "Alethic modal",
		tier: T.novice
	},
	{
		glyph: "⇒",
		name: "strict implication",
		gloss: "□(P → Q)",
		insert: "□(",
		group: "Alethic modal",
		tier: T.novice
	},
	{
		glyph: "Δ",
		name: "non-contingency",
		gloss: "□P ∨ □¬P",
		insert: "(",
		group: "Alethic modal",
		tier: T.adept
	},
	{
		glyph: "∇",
		name: "contingency",
		gloss: "◇P ∧ ◇¬P",
		insert: "(",
		group: "Alethic modal",
		tier: T.adept
	},
	{
		glyph: "⟨a⟩",
		name: "diamond (action)",
		gloss: "some a-successor satisfies P",
		insert: "◇",
		group: "Alethic modal",
		tier: T.expert
	},
	{
		glyph: "[a]",
		name: "box (action)",
		gloss: "every a-successor satisfies P",
		insert: "□",
		group: "Alethic modal",
		tier: T.expert
	},
	{
		glyph: "R",
		name: "accessibility",
		gloss: "wRv: v is possible relative to w",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "W",
		name: "set of worlds",
		gloss: "the domain of the model",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "V",
		name: "valuation",
		gloss: "assigns atoms to the worlds where they hold",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "⊩",
		name: "forces",
		gloss: "w ⊩ P: P holds at w",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "⊨",
		name: "entails",
		gloss: "truth in a model; semantic consequence",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "⊭",
		name: "does not entail",
		gloss: "P fails in some model or world",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "⊢",
		name: "proves",
		gloss: "derivable in the system",
		insert: "",
		group: "Frames and models",
		tier: T.expert
	},
	{
		glyph: "⊬",
		name: "does not prove",
		gloss: "not derivable",
		insert: "",
		group: "Frames and models",
		tier: T.expert
	},
	{
		glyph: "⟦ ⟧",
		name: "extension",
		gloss: "the set of worlds where P holds",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "∈",
		name: "member of",
		gloss: "w ∈ W",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "⊆",
		name: "subset",
		gloss: "every world of one set is in the other",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "∩",
		name: "intersection",
		gloss: "worlds in both extensions",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "∪",
		name: "union",
		gloss: "worlds in either extension",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "∅",
		name: "empty set",
		gloss: "no worlds",
		insert: "",
		group: "Frames and models",
		tier: T.adept
	},
	{
		glyph: "≈",
		name: "bisimulation",
		gloss: "worlds that agree on all modal formulas",
		insert: "",
		group: "Frames and models",
		tier: T.expert
	},
	{
		glyph: "∀",
		name: "for all",
		gloss: "every individual in the domain",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.adept
	},
	{
		glyph: "∃",
		name: "exists",
		gloss: "some individual in the domain",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.adept
	},
	{
		glyph: "∃!",
		name: "exists exactly one",
		gloss: "a unique individual",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.adept
	},
	{
		glyph: "=",
		name: "identity",
		gloss: "the same individual across worlds",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.adept
	},
	{
		glyph: "≠",
		name: "distinctness",
		gloss: "not the same individual",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.adept
	},
	{
		glyph: "λ",
		name: "lambda",
		gloss: "abstracts a property from a formula",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.expert
	},
	{
		glyph: "ι",
		name: "definite description",
		gloss: "the unique individual such that",
		insert: "",
		group: "Quantifiers and identity",
		tier: T.expert
	},
	{
		glyph: "K",
		name: "knows",
		gloss: "agent a knows P at all worlds they consider possible",
		insert: "□",
		group: "Epistemic",
		tier: T.adept
	},
	{
		glyph: "B",
		name: "believes",
		gloss: "agent a believes P",
		insert: "□",
		group: "Epistemic",
		tier: T.adept
	},
	{
		glyph: "E",
		name: "everyone knows",
		gloss: "every agent in the group knows P",
		insert: "□",
		group: "Epistemic",
		tier: T.adept
	},
	{
		glyph: "C",
		name: "common knowledge",
		gloss: "everyone knows that everyone knows, without end",
		insert: "□",
		group: "Epistemic",
		tier: T.expert
	},
	{
		glyph: "D",
		name: "distributed knowledge",
		gloss: "what the group knows by pooling",
		insert: "□",
		group: "Epistemic",
		tier: T.expert
	},
	{
		glyph: "[!]",
		name: "public announcement",
		gloss: "after P is announced truthfully",
		insert: "",
		group: "Epistemic",
		tier: T.expert
	},
	{
		glyph: "O",
		name: "obligatory",
		gloss: "P at every ideal world",
		insert: "□",
		group: "Deontic",
		tier: T.adept
	},
	{
		glyph: "P",
		name: "permitted",
		gloss: "P at some ideal world",
		insert: "◇",
		group: "Deontic",
		tier: T.adept
	},
	{
		glyph: "F",
		name: "forbidden",
		gloss: "O¬P",
		insert: "□¬",
		group: "Deontic",
		tier: T.adept
	},
	{
		glyph: "G",
		name: "always (future)",
		gloss: "P at all later times",
		insert: "□",
		group: "Temporal",
		tier: T.adept
	},
	{
		glyph: "F",
		name: "eventually",
		gloss: "P at some later time",
		insert: "◇",
		group: "Temporal",
		tier: T.adept
	},
	{
		glyph: "X",
		name: "next",
		gloss: "P at the next step",
		insert: "□",
		group: "Temporal",
		tier: T.adept
	},
	{
		glyph: "U",
		name: "until",
		gloss: "P holds until Q does",
		insert: "",
		group: "Temporal",
		tier: T.expert
	},
	{
		glyph: "H",
		name: "always (past)",
		gloss: "P at all earlier times",
		insert: "□",
		group: "Temporal",
		tier: T.adept
	},
	{
		glyph: "S",
		name: "since",
		gloss: "Q held since P",
		insert: "",
		group: "Temporal",
		tier: T.expert
	},
	{
		glyph: "A",
		name: "all paths",
		gloss: "on every branch (CTL)",
		insert: "□",
		group: "Temporal",
		tier: T.expert
	},
	{
		glyph: "E",
		name: "some path",
		gloss: "on some branch (CTL)",
		insert: "◇",
		group: "Temporal",
		tier: T.expert
	},
	{
		glyph: "W",
		name: "weak until",
		gloss: "until, or forever",
		insert: "",
		group: "Temporal",
		tier: T.expert
	},
	{
		glyph: "R",
		name: "release",
		gloss: "Q holds until and including when P does",
		insert: "",
		group: "Temporal",
		tier: T.expert
	},
	{
		glyph: ";",
		name: "sequence",
		gloss: "do a, then b",
		insert: "",
		group: "Dynamic and fixpoint",
		tier: T.expert
	},
	{
		glyph: "*",
		name: "iteration",
		gloss: "repeat zero or more times",
		insert: "",
		group: "Dynamic and fixpoint",
		tier: T.expert
	},
	{
		glyph: "?",
		name: "test",
		gloss: "continue only if P holds",
		insert: "",
		group: "Dynamic and fixpoint",
		tier: T.expert
	},
	{
		glyph: "μ",
		name: "least fixpoint",
		gloss: "smallest set closed under the formula",
		insert: "",
		group: "Dynamic and fixpoint",
		tier: T.expert
	},
	{
		glyph: "ν",
		name: "greatest fixpoint",
		gloss: "largest set consistent with the formula",
		insert: "",
		group: "Dynamic and fixpoint",
		tier: T.expert
	},
	{
		glyph: "∴",
		name: "therefore",
		gloss: "conclusion mark",
		insert: "",
		group: "Proof marks",
		tier: T.expert
	},
	{
		glyph: "∵",
		name: "because",
		gloss: "reason mark",
		insert: "",
		group: "Proof marks",
		tier: T.expert
	},
	{
		glyph: "□̇",
		name: "derivation box",
		gloss: "a closed proof step",
		insert: "",
		group: "Proof marks",
		tier: T.expert
	}
];
var GROUPS = [...new Set(SYMBOLS.map((s) => s.group))];
var RANK = {
	novice: 0,
	adept: 1,
	expert: 2
};
function tierAllows(have, need) {
	return RANK[have] >= RANK[need];
}
function searchCatalog(q, extra) {
	const query = q.trim().toLowerCase();
	if (!query) return [];
	const hits = [];
	for (const s of SYMBOLS) if (`${s.glyph} ${s.name} ${s.gloss} ${s.group}`.toLowerCase().includes(query)) hits.push({
		kind: "symbol",
		title: `${s.glyph}  ${s.name}`,
		detail: s.gloss,
		insert: s.insert || void 0
	});
	extra.worlds.forEach((w, i) => {
		if (w.toLowerCase().includes(query) || `w${i}`.includes(query)) hits.push({
			kind: "world",
			title: w,
			detail: "World in the current frame"
		});
	});
	for (const e of extra.entities) if (`${e.label} ${e.type}`.toLowerCase().includes(query)) hits.push({
		kind: "entity",
		title: e.label,
		detail: e.type
	});
	for (const title of extra.listings) if (title.toLowerCase().includes(query)) hits.push({
		kind: "listing",
		title,
		detail: "Published on the exchange"
	});
	return hits.slice(0, 12);
}
var SEED = {
	tier: "novice",
	atoms: ["P", "Q"],
	truths: [
		{
			P: true,
			Q: true
		},
		{
			P: true,
			Q: false
		},
		{
			P: true,
			Q: true
		}
	],
	R: [
		[
			false,
			true,
			true
		],
		[
			false,
			false,
			true
		],
		[
			false,
			false,
			false
		]
	],
	formula: "□P",
	merchant: "",
	vectorText: "1, 0.45, 0.8, 0.25, 0.62, 0.9",
	gdt: [],
	listings: [],
	entities: []
};
var FACT_KEYS = [
	"serial",
	"reflexive",
	"symmetric",
	"transitive",
	"euclidean"
];
var SYSTEMS = [
	"D",
	"T",
	"B",
	"S4",
	"S5"
];
var GDT_CHARS = [
	{
		id: "flatness",
		symbol: "⏥",
		name: "Flatness"
	},
	{
		id: "straightness",
		symbol: "⏤",
		name: "Straightness"
	},
	{
		id: "circularity",
		symbol: "○",
		name: "Circularity"
	},
	{
		id: "cylindricity",
		symbol: "⌭",
		name: "Cylindricity"
	},
	{
		id: "perpendicularity",
		symbol: "⊥",
		name: "Perpendicularity"
	},
	{
		id: "parallelism",
		symbol: "∥",
		name: "Parallelism"
	},
	{
		id: "position",
		symbol: "⌖",
		name: "Position"
	},
	{
		id: "profile",
		symbol: "⌒",
		name: "Profile of a surface"
	}
];
function parseVector(text) {
	const nums = text.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
	return nums.length ? nums : [1];
}
function Studio() {
	const [snap, setSnap] = (0, import_react.useState)(SEED);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("Opening WASM FS…");
	const [src, setSrc] = (0, import_react.useState)(null);
	const [query, setQuery] = (0, import_react.useState)("");
	const [tab, setTab] = (0, import_react.useState)("logic");
	const [openGroups, setOpenGroups] = (0, import_react.useState)({
		Propositional: true,
		"Alethic modal": true
	});
	const [nlp, setNlp] = (0, import_react.useState)("necessarily P and possibly Q");
	const [nlpMsg, setNlpMsg] = (0, import_react.useState)("");
	const [atomName, setAtomName] = (0, import_react.useState)("");
	const [entity, setEntity] = (0, import_react.useState)({
		type: "Agent",
		label: "",
		note: ""
	});
	const [listing, setListing] = (0, import_react.useState)({
		title: "S5 lecture frame",
		price: "4.00",
		blurb: "Three worlds, transitive."
	});
	const [bid, setBid] = (0, import_react.useState)({});
	const [gdtDraft, setGdtDraft] = (0, import_react.useState)({
		characteristic: "position",
		tolerance: "0.05",
		datums: "A",
		feature: "star-shell"
	});
	const [yaw, setYaw] = (0, import_react.useState)(.6);
	const [pitch, setPitch] = (0, import_react.useState)(.35);
	const drag = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		let live = true;
		readSnapshot(SEED).then((saved) => {
			if (!live) return;
			setSnap({
				...SEED,
				...saved,
				atoms: saved.atoms?.length ? saved.atoms : SEED.atoms
			});
			setReady(true);
		}).catch(() => {
			if (live) setReady(true);
		});
		return () => {
			live = false;
		};
	}, []);
	const vector = (0, import_react.useMemo)(() => parseVector(snap.vectorText), [snap.vectorText]);
	const star = (0, import_react.useMemo)(() => sphericalStar(vector), [vector]);
	const parsed = (0, import_react.useMemo)(() => {
		try {
			return {
				formula: parseFormula(snap.formula),
				error: ""
			};
		} catch (err) {
			return {
				formula: null,
				error: err instanceof Error ? err.message : "Bad formula"
			};
		}
	}, [snap.formula]);
	const offers = (0, import_react.useMemo)(() => {
		try {
			return completions(snap.formula, snap.atoms);
		} catch {
			return [];
		}
	}, [snap.formula, snap.atoms]);
	const latex = parsed.formula ? formulaLatex(parsed.formula) : "";
	const unicode = parsed.formula ? formulaUnicode(parsed.formula) : snap.formula;
	const katexHtml = (0, import_react.useMemo)(() => {
		if (!latex) return "";
		try {
			return katex.renderToString(latex, {
				throwOnError: false,
				displayMode: false
			});
		} catch {
			return "";
		}
	}, [latex]);
	const truths = snap.truths;
	const values = (0, import_react.useMemo)(() => {
		if (!parsed.formula) return truths.map(() => false);
		return truths.map((_, i) => evalAt(parsed.formula, snap.R, truths, i));
	}, [
		parsed.formula,
		snap.R,
		truths
	]);
	const boxP = (0, import_react.useMemo)(() => {
		try {
			const f = parseFormula("□P");
			return truths.map((_, i) => evalAt(f, snap.R, truths, i));
		} catch {
			return truths.map(() => false);
		}
	}, [snap.R, truths]);
	const diaP = (0, import_react.useMemo)(() => {
		try {
			const f = parseFormula("◇P");
			return truths.map((_, i) => evalAt(f, snap.R, truths, i));
		} catch {
			return truths.map(() => false);
		}
	}, [snap.R, truths]);
	const facts = (0, import_react.useMemo)(() => frameFacts(snap.R), [snap.R]);
	const P = (0, import_react.useMemo)(() => markovMatrix(snap.R), [snap.R]);
	const pi = (0, import_react.useMemo)(() => stationary(P), [P]);
	const doc = (0, import_react.useMemo)(() => buildDocument({
		worlds: snap.truths.map((valuation, i) => ({
			id: `w${i}`,
			valuation,
			sees: snap.R[i].map((on, j) => on ? `w${j}` : "").filter(Boolean)
		})),
		formula: unicode,
		latex,
		vector,
		area: star.area,
		vertexCount: star.vertices.length,
		edgeCount: star.edges.length,
		gdt: snap.gdt,
		entities: snap.entities,
		listings: snap.listings
	}), [
		snap,
		unicode,
		latex,
		vector,
		star
	]);
	const schemaErrors = (0, import_react.useMemo)(() => validateDocument(doc), [doc]);
	const hits = (0, import_react.useMemo)(() => searchCatalog(query, {
		worlds: snap.truths.map((_, i) => `w${i}`),
		entities: snap.entities.map((e) => ({
			label: e.label,
			type: e.type
		})),
		listings: snap.listings.map((l) => l.title)
	}), [
		query,
		snap.truths,
		snap.entities,
		snap.listings
	]);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const handle = window.setTimeout(() => {
			writeSnapshot(snap, JSON.stringify(doc)).then(() => fsStatus()).then(setStatus).catch(() => setStatus("WASM FS · save failed"));
		}, 350);
		return () => window.clearTimeout(handle);
	}, [
		snap,
		doc,
		ready
	]);
	(0, import_react.useEffect)(() => {
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
		const scale = Math.min(w, h) * .34;
		const pts = star.vertices.map((v) => project(v, yaw, pitch, scale, w / 2, h / 2));
		const order = star.edges.map(([a, b]) => ({
			a,
			b,
			z: (pts[a].z + pts[b].z) / 2
		})).sort((p, q) => p.z - q.z);
		for (const e of order) {
			const A = pts[e.a];
			const B = pts[e.b];
			ctx.strokeStyle = e.z > 0 ? "#3c4ec4" : "#b7b4c6";
			ctx.globalAlpha = e.z > 0 ? .9 : .35;
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
	}, [
		star,
		yaw,
		pitch,
		tab
	]);
	function patch(partial) {
		setSnap((s) => ({
			...s,
			...partial
		}));
	}
	function toggleAtom(i, atom) {
		setSnap((s) => ({
			...s,
			truths: s.truths.map((row, idx) => idx === i ? {
				...row,
				[atom]: !row[atom]
			} : row)
		}));
	}
	function onWorldClick(i) {
		if (src === null) {
			setSrc(i);
			return;
		}
		if (src === i) {
			setSrc(null);
			return;
		}
		setSnap((s) => {
			const R = cloneR(s.R);
			R[src][i] = !R[src][i];
			return {
				...s,
				R
			};
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
			return {
				...s,
				truths,
				R
			};
		});
	}
	function removeWorld(i) {
		if (snap.truths.length <= 1) return;
		setSnap((s) => ({
			...s,
			truths: s.truths.filter((_, idx) => idx !== i),
			R: s.R.filter((_, idx) => idx !== i).map((row) => row.filter((_, idx) => idx !== i))
		}));
		setSrc(null);
	}
	function addAtom() {
		const name = atomName.trim().replace(/[^A-Za-z0-9_]/g, "");
		if (!name || snap.atoms.includes(name)) return;
		setSnap((s) => ({
			...s,
			atoms: [...s.atoms, name],
			truths: s.truths.map((row) => ({
				...row,
				[name]: false
			}))
		}));
		setAtomName("");
	}
	function insert(text) {
		if (!text) return;
		patch({ formula: snap.formula + text });
	}
	function take(formula) {
		patch({ formula });
	}
	const tier = snap.tier;
	const chart = pi.map((p, i) => ({
		world: `w${i}`,
		p: Number(p.toFixed(3))
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mr-auto",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-serif text-xl leading-none",
								children: "Modal worlds"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: status
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative w-full min-w-0 sm:w-72 sm:flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "sr-only",
									htmlFor: "search",
									children: "Search the Modal Index"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "search",
									value: query,
									onChange: (e) => setQuery(e.target.value),
									placeholder: "Modal Index — symbols, worlds, entities",
									className: "w-full rounded-full border border-line bg-card px-4 py-2 text-sm outline-none focus:border-accent"
								}),
								hits.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "absolute left-0 right-0 top-11 z-30 max-h-72 overflow-auto rounded-card border border-line bg-card shadow-lg",
									children: hits.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent-soft",
										onClick: () => {
											if (h.insert) insert(h.insert);
											setQuery("");
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm",
											children: h.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs text-muted",
											children: [
												h.kind,
												" · ",
												h.detail
											]
										})]
									}) }, `${h.kind}-${h.title}-${i}`))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex rounded-full border border-line bg-card p-1",
							role: "group",
							"aria-label": "Experience",
							children: [
								"novice",
								"adept",
								"expert"
							].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => patch({ tier: t }),
								className: `rounded-full px-3 py-1.5 text-sm capitalize ${tier === t ? "bg-accent text-on-accent" : "text-muted"}`,
								children: t
							}, t))
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto grid min-w-0 max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "min-w-0 rounded-card border border-line bg-card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: addWorld,
									className: "rounded-full border border-line px-3 py-2 text-sm",
									children: "+ world"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded-full border border-line px-3 py-2 text-sm",
									children: ["atom set: ", snap.atoms.join(" ")]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ml-auto flex flex-wrap gap-1",
									children: [SYSTEMS.map((sys) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !tierAllows(tier, "adept"),
										onClick: () => patch({ R: closeFrame(snap.R, sys) }),
										className: "rounded-lg border border-line px-2.5 py-2 text-sm",
										children: sys
									}, sys)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => patch({ R: snap.R.map((row) => row.map(() => false)) }),
										className: "rounded-lg border border-line px-2.5 py-2 text-sm",
										children: "clear R"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex w-full gap-3 overflow-x-auto pb-2",
							children: snap.truths.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: `min-w-52 flex-1 rounded-card border p-3 ${src === i ? "border-accent bg-accent-soft" : "border-line"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-2 flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => onWorldClick(i),
											className: "font-mono text-sm",
											children: ["w", i]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											"aria-label": `Remove world w${i}`,
											onClick: () => removeWorld(i),
											className: "text-muted",
											children: "×"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mb-3 flex flex-wrap gap-2",
										children: snap.atoms.map((atom) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => toggleAtom(i, atom),
											className: `rounded-lg px-2.5 py-1 font-mono text-sm ${row[atom] ? "bg-chip text-on-accent" : "border border-line text-ink"}`,
											children: atom
										}, atom))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "font-mono text-sm",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: boxP[i] ? "text-good" : "text-bad",
												children: ["□P ", boxP[i] ? "✓" : "✗"]
											}),
											"  ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: diaP[i] ? "text-good" : "text-bad",
												children: ["◇P ", diaP[i] ? "✓" : "✗"]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: ["R → ", snap.R[i].map((on, j) => on ? `w${j}` : "").filter(Boolean).join(", ") || "∅"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 font-mono text-sm",
										children: [
											unicode || "—",
											" ",
											parsed.formula ? values[i] ? "✓" : "✗" : ""
										]
									})
								]
							}, i))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: "Tap a world, then another, to toggle R. Tap an atom to flip its truth."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap gap-2",
							children: [
								FACT_KEYS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: `rounded-full border px-3 py-1 text-sm ${facts[k] ? "border-good text-good" : "border-line text-muted"}`,
									children: [
										facts[k] ? "✓" : "○",
										" ",
										k
									]
								}, k)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !tierAllows(tier, "adept"),
									onClick: () => patch({ R: chainRelation(snap.truths.length) }),
									className: "rounded-full border border-line px-3 py-1 text-sm",
									children: "chain"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !tierAllows(tier, "adept"),
									onClick: () => patch({ R: ringRelation(snap.truths.length) }),
									className: "rounded-full border border-line px-3 py-1 text-sm",
									children: "ring"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "min-w-0 rounded-card border border-line bg-card p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-2 px-1 text-sm font-medium",
						children: "Symbols"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-[34rem] space-y-2 overflow-auto pr-1",
						children: GROUPS.map((group) => {
							const items = SYMBOLS.filter((s) => s.group === group);
							const locked = items.every((s) => !tierAllows(tier, s.tier));
							const open = !!openGroups[group];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-b border-line pb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "flex w-full items-center justify-between py-1 text-left text-sm",
									onClick: () => setOpenGroups((g) => ({
										...g,
										[group]: !g[group]
									})),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										open ? "▾" : "▸",
										" ",
										group
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted",
										children: [items.length, locked ? " · locked" : ""]
									})]
								}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-2",
									children: [items.filter((s) => tierAllows(tier, s.tier)).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => insert(s.insert),
										className: "rounded-lg border border-line px-2 py-2 text-left hover:border-accent",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-base text-accent",
												children: s.glyph
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-2 text-sm",
												children: s.name
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-0.5 block text-xs text-muted",
												children: s.gloss
											})
										]
									}, `${group}-${s.name}`)), locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: "Raise the tier to read this group."
									})]
								})]
							}, group);
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto max-w-6xl px-4 pb-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-3 flex gap-2 overflow-x-auto",
					children: [
						["logic", "Logic"],
						["markov", "Markov"],
						["geometry", "Spherical star"],
						["exchange", "Exchange"],
						["schema", "JSON-LD"]
					].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTab(id),
						className: `rounded-full px-4 py-2 text-sm ${tab === id ? "bg-accent text-on-accent" : "border border-line bg-card"}`,
						children: label
					}, id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-card border border-line bg-card p-4",
					children: [
						tab === "logic" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 md:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-sm text-muted",
									htmlFor: "formula",
									children: "Formula · unicode"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "formula",
									value: snap.formula,
									onChange: (e) => patch({ formula: e.target.value }),
									onKeyDown: (e) => {
										if (e.key === "Tab" && offers[0]) {
											e.preventDefault();
											take(offers[0].formula);
										}
									},
									className: "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono outline-none focus:border-accent"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 flex flex-wrap gap-2",
									children: offers.map((offer) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => take(offer.formula),
										className: "rounded-full border border-line px-3 py-1 font-mono text-sm hover:border-accent",
										children: [
											offer.label,
											" ",
											offer.formula
										]
									}, offer.label + offer.formula))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted",
									children: "Tab takes the first completion. A fragment such as □(P→ is closed before the next connective is offered."
								}),
								parsed.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm text-bad",
									children: parsed.error
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm text-muted",
									children: "LaTeX"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-sm",
									children: latex || "—"
								}),
								katexHtml && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2",
									dangerouslySetInnerHTML: { __html: katexHtml }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-3 text-sm",
									children: [
										"Holds at ",
										values.map((v, i) => v ? `w${i}` : "").filter(Boolean).join(", ") || "no world",
										"."
									]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-sm text-muted",
									htmlFor: "nlp",
									children: "Plain language"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									id: "nlp",
									value: nlp,
									onChange: (e) => setNlp(e.target.value),
									rows: 3,
									className: "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mt-2 rounded-full bg-accent px-4 py-2 text-sm text-on-accent",
									onClick: () => {
										try {
											const next = englishToFormula(nlp);
											patch({ formula: next });
											setNlpMsg(next);
										} catch (err) {
											setNlpMsg(err instanceof Error ? err.message : "Could not read that");
										}
									},
									children: "Read into formula"
								}),
								nlpMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 font-mono text-sm",
									children: nlpMsg
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-xs text-muted",
									children: "Try “if P then Q”, “not both P and Q”, “necessarily P and possibly Q”."
								}),
								tierAllows(tier, "expert") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: atomName,
										onChange: (e) => setAtomName(e.target.value),
										placeholder: "New atom",
										className: "w-full rounded-lg border border-line px-3 py-2 text-sm"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: addAtom,
										className: "rounded-lg border border-line px-3 py-2 text-sm",
										children: "Add"
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-4 text-sm text-muted",
									children: "Expert tier adds atoms and named entities."
								})
							] })]
						}),
						tab === "markov" && (tierAllows(tier, "adept") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 md:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-medium",
									children: "Transition chain"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-sm text-muted",
									children: "Each row of R, normalized. A world with no successor jumps uniformly."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "overflow-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
										className: "w-full text-left font-mono text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-1" }), P.map((_, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
											className: "p-1",
											children: ["w", j]
										}, j))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: P.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
											className: "p-1",
											children: ["w", i]
										}), row.map((cell, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "p-1",
											children: cell.toFixed(2)
										}, j))] }, i)) })]
									})
								}),
								src !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm",
									children: [
										"Next from w",
										src,
										": ",
										nextFrom(P, src).map((p, i) => `w${i} ${(p * 100).toFixed(0)}%`).join(" · ")
									]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "h-56",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "mb-2 text-sm font-medium",
									children: "Stationary mass"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "85%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
										data: chart,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "world",
												stroke: "var(--color-muted)",
												fontSize: 12
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												stroke: "var(--color-muted)",
												fontSize: 12
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
												dataKey: "p",
												fill: "var(--color-accent)",
												radius: 4
											})
										]
									})
								})]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Locked, { need: "Adept" })),
						tab === "geometry" && (tierAllows(tier, "expert") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
									ref: canvasRef,
									className: "h-80 w-full rounded-lg border border-line bg-paper",
									onPointerDown: (e) => {
										drag.current = {
											x: e.clientX,
											y: e.clientY,
											yaw,
											pitch
										};
										e.target.setPointerCapture(e.pointerId);
									},
									onPointerMove: (e) => {
										if (!drag.current) return;
										setYaw(drag.current.yaw + (e.clientX - drag.current.x) * .01);
										setPitch(drag.current.pitch + (e.clientY - drag.current.y) * .01);
									},
									onPointerUp: () => {
										drag.current = null;
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted",
									children: [
										star.vertices.length,
										" vertices · ",
										star.edges.length,
										" edges · spherical area ",
										star.area.toFixed(3),
										" sr. Drag to turn the star."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "mt-3 block text-sm text-muted",
									htmlFor: "vector",
									children: "Data vector"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "vector",
									value: snap.vectorText,
									onChange: (e) => patch({ vectorText: e.target.value }),
									className: "mt-1 w-full rounded-lg border border-line px-3 py-2 font-mono text-sm"
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-medium",
									children: "GD&T on the shell"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "mt-2 block text-xs text-muted",
									children: "Characteristic"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: gdtDraft.characteristic,
									onChange: (e) => setGdtDraft({
										...gdtDraft,
										characteristic: e.target.value
									}),
									className: "mt-1 w-full rounded-lg border border-line bg-card px-2 py-2 text-sm",
									children: GDT_CHARS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: c.id,
										children: [
											c.symbol,
											" ",
											c.name
										]
									}, c.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "mt-2 block text-xs text-muted",
									children: "Tolerance"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: gdtDraft.tolerance,
									onChange: (e) => setGdtDraft({
										...gdtDraft,
										tolerance: e.target.value
									}),
									className: "mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "mt-2 block text-xs text-muted",
									children: "Datums"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: gdtDraft.datums,
									onChange: (e) => setGdtDraft({
										...gdtDraft,
										datums: e.target.value
									}),
									className: "mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mt-3 rounded-full bg-accent px-4 py-2 text-sm text-on-accent",
									onClick: () => {
										const spec = GDT_CHARS.find((c) => c.id === gdtDraft.characteristic);
										patch({ gdt: [...snap.gdt, {
											id: `${Date.now()}`,
											characteristic: spec.name,
											symbol: spec.symbol,
											tolerance: gdtDraft.tolerance,
											datums: gdtDraft.datums,
											feature: gdtDraft.feature
										}] });
									},
									children: "Attach frame"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-3 space-y-2",
									children: snap.gdt.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "flex items-center justify-between rounded-lg border border-line px-2 py-2 font-mono text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											g.symbol,
											" ",
											g.tolerance,
											" ",
											g.datums,
											" · ",
											g.characteristic
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => patch({ gdt: snap.gdt.filter((x) => x.id !== g.id) }),
											className: "text-muted",
											children: "×"
										})]
									}, g.id))
								})
							] })]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Locked, { need: "Expert" })),
						tab === "exchange" && (tierAllows(tier, "expert") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-6 md:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-medium",
									children: "Publish this model"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: listing.title,
									onChange: (e) => setListing({
										...listing,
										title: e.target.value
									}),
									className: "mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm",
									placeholder: "Title"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: listing.price,
									onChange: (e) => setListing({
										...listing,
										price: e.target.value
									}),
									className: "mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm",
									placeholder: "Price"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: listing.blurb,
									onChange: (e) => setListing({
										...listing,
										blurb: e.target.value
									}),
									rows: 2,
									className: "mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "mt-2 block text-xs text-muted",
									htmlFor: "merchant",
									children: "PayPal merchant email"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "merchant",
									value: snap.merchant,
									onChange: (e) => patch({ merchant: e.target.value }),
									placeholder: "seller@studio.example",
									className: "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mt-3 rounded-full bg-accent px-4 py-2 text-sm text-on-accent",
									onClick: () => {
										if (!listing.title.trim()) return;
										patch({ listings: [{
											id: `${Date.now()}`,
											title: listing.title.trim(),
											price: listing.price || "0.00",
											currency: "USD",
											sellerEmail: snap.merchant.trim(),
											blurb: listing.blurb,
											createdAt: Date.now()
										}, ...snap.listings] });
									},
									children: "List on the exchange"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-sm font-medium",
											children: "Named entities"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-2 flex flex-wrap gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												value: entity.type,
												onChange: (e) => setEntity({
													...entity,
													type: e.target.value
												}),
												className: "rounded-lg border border-line bg-card px-2 py-2 text-sm",
												children: [
													"Agent",
													"Object",
													"Atom",
													"Feature",
													"World"
												].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: t }, t))
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: entity.label,
												onChange: (e) => setEntity({
													...entity,
													label: e.target.value
												}),
												placeholder: "Label",
												className: "min-w-32 flex-1 rounded-lg border border-line px-2 py-2 text-sm"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: entity.note,
											onChange: (e) => setEntity({
												...entity,
												note: e.target.value
											}),
											placeholder: "Note",
											className: "mt-2 w-full rounded-lg border border-line px-2 py-2 text-sm"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "mt-2 rounded-full border border-line px-4 py-2 text-sm",
											onClick: () => {
												if (!entity.label.trim()) return;
												patch({ entities: [...snap.entities, {
													id: `${Date.now()}`,
													type: entity.type,
													label: entity.label.trim(),
													note: entity.note
												}] });
												setEntity({
													...entity,
													label: "",
													note: ""
												});
											},
											children: "Create entity"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
											className: "mt-2 space-y-1 text-sm",
											children: snap.entities.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												className: "flex justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													e.type,
													" · ",
													e.label
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													className: "text-muted",
													onClick: () => patch({ entities: snap.entities.filter((x) => x.id !== e.id) }),
													children: "×"
												})]
											}, e.id))
										})
									]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "space-y-3",
								children: [snap.listings.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
									className: "text-sm text-muted",
									children: "Nothing listed yet. A listing stores the model beside a PayPal checkout."
								}), snap.listings.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "rounded-lg border border-line p-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
												className: "font-medium",
												children: item.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-sm",
												children: ["$", item.price]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-muted",
											children: item.blurb
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-2 flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: bid[item.id] ?? "",
												onChange: (e) => setBid({
													...bid,
													[item.id]: e.target.value
												}),
												placeholder: "Ad bid",
												className: "w-28 rounded-lg border border-line px-2 py-1.5 text-sm"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "rounded-lg border border-line px-3 py-1.5 text-sm",
												onClick: () => {
													const amount = bid[item.id]?.trim();
													if (!amount) return;
													patch({ entities: [...snap.entities, {
														id: `bid-${item.id}-${Date.now()}`,
														type: "Advert",
														label: `${amount} on ${item.title}`,
														note: "Advertising exchange bid"
													}] });
												},
												children: "Place bid"
											})]
										}),
										item.sellerEmail.includes("@") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
											className: "mt-2",
											action: "https://www.paypal.com/cgi-bin/webscr",
											method: "post",
											target: "_blank",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "hidden",
													name: "cmd",
													value: "_xclick"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "hidden",
													name: "business",
													value: item.sellerEmail
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "hidden",
													name: "item_name",
													value: item.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "hidden",
													name: "amount",
													value: item.price
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "hidden",
													name: "currency_code",
													value: item.currency
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "submit",
													className: "rounded-full bg-accent px-4 py-2 text-sm text-on-accent",
													children: "Pay with PayPal"
												})
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 text-xs text-muted",
											children: "Add a PayPal merchant email before checkout. Card numbers never touch this studio."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "mt-2 text-sm text-muted",
											onClick: () => patch({ listings: snap.listings.filter((x) => x.id !== item.id) }),
											children: "Remove"
										})
									]
								}, item.id))]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Locked, { need: "Expert" })),
						tab === "schema" && (tierAllows(tier, "adept") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: schemaErrors.length ? schemaErrors.join(" · ") : "Valid against the ModalModel schema."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-3 max-h-96 overflow-auto rounded-lg bg-paper p-3 font-mono text-xs",
							children: JSON.stringify(doc, null, 2)
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Locked, { need: "Adept" }))
					]
				})]
			})
		]
	});
}
function Locked({ need }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "text-sm text-muted",
		children: [
			"This bench opens at ",
			need,
			". Use the tier switch in the header — nothing is deleted when you go back."
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Studio, {});
}
//#endregion
export { Home as component };
