export type Vec3 = { x: number; y: number; z: number };

export type SphericalStar = {
  vertices: Vec3[];
  edges: [number, number][];
  triangles: [number, number, number][];
  area: number;
  radius: number;
};

function clamp(v: number[], fallback: number[]): number[] {
  const clean = v.filter((n) => Number.isFinite(n));
  return clean.length ? clean : fallback;
}

/** Fibonacci spherical star whose radii are modulated by a data vector. */
export function sphericalStar(raw: number[]): SphericalStar {
  const vector = clamp(raw, [1, 0.5, 0.8, 0.3, 0.6]);
  const maxAbs = Math.max(...vector.map((n) => Math.abs(n)), 1e-6);
  const N = Math.max(28, Math.min(160, vector.length * 14));
  const phi = Math.PI * (3 - Math.sqrt(5));
  const vertices: Vec3[] = [];
  for (let i = 0; i < N; i++) {
    const y = N === 1 ? 0 : 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const mag = 0.78 + 0.28 * (Math.abs(vector[i % vector.length]!) / maxAbs);
    vertices.push({ x: Math.cos(theta) * r * mag, y: y * mag, z: Math.sin(theta) * r * mag });
  }
  const step = Math.max(2, Math.round(Math.sqrt(N)));
  const edges: [number, number][] = [];
  const triangles: [number, number, number][] = [];
  const seen = new Set<string>();
  const addEdge = (a: number, b: number) => {
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
    if (a !== b) triangles.push([i, a, b]);
  }
  let area = 0;
  for (const [i, j, k] of triangles) {
    area += sphericalExcess(vertices[i]!, vertices[j]!, vertices[k]!);
  }
  return { vertices, edges, triangles, area: Math.abs(area), radius: 1 };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function norm(a: Vec3): Vec3 {
  const L = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / L, y: a.y / L, z: a.z / L };
}
function angle(a: Vec3, b: Vec3) {
  const d = Math.min(1, Math.max(-1, dot(norm(a), norm(b))));
  return Math.acos(d);
}

/** Girard's theorem on the unit directions of three vertices. */
function sphericalExcess(A: Vec3, B: Vec3, C: Vec3): number {
  const a = norm(A); const b = norm(B); const c = norm(C);
  const ang = (u: Vec3, v: Vec3, w: Vec3) => {
    const n1 = norm(cross(u, v));
    const n2 = norm(cross(u, w));
    return Math.acos(Math.min(1, Math.max(-1, dot(n1, n2))));
  };
  // skip degenerate
  if (angle(a, b) < 1e-3 || angle(b, c) < 1e-3 || angle(c, a) < 1e-3) return 0;
  const Aang = ang(a, b, c);
  const Bang = ang(b, a, c);
  const Cang = ang(c, a, b);
  const excess = Aang + Bang + Cang - Math.PI;
  return Number.isFinite(excess) ? excess : 0;
}

export function project(v: Vec3, yaw: number, pitch: number, scale: number, cx: number, cy: number) {
  const cyaw = Math.cos(yaw); const syaw = Math.sin(yaw);
  const x1 = v.x * cyaw + v.z * syaw;
  const z1 = -v.x * syaw + v.z * cyaw;
  const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  const y2 = v.y * cp - z1 * sp;
  const z2 = v.y * sp + z1 * cp;
  const f = 2.4 / (2.4 + z2);
  return { x: cx + x1 * scale * f, y: cy - y2 * scale * f, z: z2 };
}
