// Storage: Upstash Redis (persistent) when connected, otherwise in-memory (resets on cold start).
const URL_ = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").replace(/\/$/, "");
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
export const persistent = !!(URL_ && TOKEN);
export const storeState = (globalThis.__anvStore ||= { error: "" });
const mem = (globalThis.__anvMem ||= { kv: new Map(), h: new Map(), l: new Map() });

function memExec([op, k, ...a]) {
  switch (op) {
    case "GET": return mem.kv.get(k) ?? null;
    case "SET": mem.kv.set(k, a[0]); return "OK";
    case "DEL": mem.kv.delete(k); mem.h.delete(k); mem.l.delete(k); return 1;
    case "HINCRBY": { const h = mem.h.get(k) || mem.h.set(k, {}).get(k); h[a[0]] = (+h[a[0]] || 0) + +a[1]; return h[a[0]]; }
    case "HGETALL": return Object.entries(mem.h.get(k) || {}).flatMap(([f, v]) => [f, String(v)]);
    case "LPUSH": { const l = mem.l.get(k) || mem.l.set(k, []).get(k); l.unshift(a[0]); return l.length; }
    case "LTRIM": { const l = mem.l.get(k); if (l) mem.l.set(k, l.slice(+a[0], +a[1] + 1)); return "OK"; }
    case "LRANGE": return (mem.l.get(k) || []).slice(+a[0], +a[1] + 1);
    default: return null;
  }
}
// kv([["GET","k"],["HINCRBY","h","f",1]]) -> array of results (one network round trip)
export async function kv(cmds) {
  if (persistent) {
    try {
      const r = await fetch(`${URL_}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmds), signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      storeState.error = ""; return (await r.json()).map((x) => x.result);
    } catch (e) { storeState.error = String(e.message || e); }
  }
  return cmds.map(memExec);
}
export const toObj = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1]; return o; };
