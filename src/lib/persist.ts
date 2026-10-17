import type { Database } from "sql.js";

const IDB = "modal-worlds";
const STORE = "wasm-fs";
const KEY = "studio.sqlite";

function idb(): Promise<IDBDatabase> {
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

async function idbGet(): Promise<Uint8Array | null> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const g = tx.objectStore(STORE).get(KEY);
    g.onsuccess = () => {
      const v = g.result as ArrayBuffer | Uint8Array | undefined;
      if (!v) resolve(null);
      else resolve(v instanceof Uint8Array ? v : new Uint8Array(v));
    };
    g.onerror = () => reject(g.error);
  });
}

async function idbPut(bytes: Uint8Array): Promise<void> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(bytes, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dbPromise: Promise<Database> | null = null;

export function openDatabase(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { default: initSqlJs } = await import("sql.js");
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
  }
  return dbPromise;
}

export async function readSnapshot<T>(fallback: T): Promise<T> {
  const db = await openDatabase();
  const stmt = db.prepare("SELECT v FROM kv WHERE k = ?");
  stmt.bind(["snapshot"]);
  let value: T = fallback;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    try {
      value = JSON.parse(String(row.v)) as T;
    } catch {
      value = fallback;
    }
  }
  stmt.free();
  return value;
}

export async function writeSnapshot(value: unknown, jsonld: string): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  db.run("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", [
    "snapshot",
    JSON.stringify(value),
  ]);
  db.run(
    "INSERT INTO documents (id, kind, body, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at",
    ["urn:modal:studio", "application/ld+json", jsonld, now],
  );
  await idbPut(db.export());
}

export async function fsStatus(): Promise<string> {
  const db = await openDatabase();
  const rows = db.exec("SELECT COUNT(*) FROM documents");
  const n = Number(rows[0]?.values[0]?.[0] ?? 0);
  return `WASM FS · ${n} document${n === 1 ? "" : "s"}`;
}
