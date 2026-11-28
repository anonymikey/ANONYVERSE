import crypto from "node:crypto";
import { pickList, HttpError } from "./_lib.js";
import { kv, toObj, persistent, storeState } from "./_store.js";
import { loadConfig, saveConfig, callProvider, assertPublicUrl, safeUrl, OPS, DOMAINS } from "./_providers.js";
import { breaker } from "./_router.js";

const TOKEN = () => (process.env.ADMIN_TOKEN || "").trim();
const sig = (exp) => crypto.createHmac("sha256", TOKEN()).update("anv-admin:" + exp).digest("hex");
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const tries = (globalThis.__anvTries ||= new Map());
const PROBE = { movies: ["trending", "search"], anime: ["anime-search"], livetv: ["tv-ke", "tv-country"], sports: ["sports-live", "sports-today"] };
const PV = { page: 1, q: "man", country: "ke", id: "1", genre: "action", category: "movies" };

function authed(request) {
  if (!TOKEN()) return false;
  const m = /(?:^|;\s*)anv_admin=(\d+)\.([a-f0-9]{64})/.exec(request.headers.get("cookie") || "");
  if (!m || +m[1] < Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(m[2], "hex"), Buffer.from(sig(+m[1]), "hex"));
}
const pub = (cfg) => ({ domains: cfg.domains, providers: Object.fromEntries(Object.entries(cfg.providers).map(([id, p]) => [id, { ...p, keySet: !p.auth?.env || !!process.env[p.auth.env] }])) });

function endpoints(j) {
  const out = [];
  if (j?.paths && typeof j.paths === "object") {
    for (const [path, m] of Object.entries(j.paths)) for (const [method, o] of Object.entries(m || {})) {
      if (!/^(get|post|put|delete|patch)$/i.test(method)) continue;
      out.push({ method: method.toUpperCase(), path, summary: o.summary || o.description || "", tag: (o.tags || [])[0] || "", params: (o.parameters || []).map((x) => x.name).filter(Boolean) });
    }
    return out;
  }
  const walk = (o, d, tag) => {
    if (d > 4 || !o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach((x) => walk(x, d + 1, tag));
    const path = o.path || o.url || o.endpoint;
    if (typeof path === "string" && path.startsWith("/")) { out.push({ method: String(o.method || "GET").toUpperCase(), path, summary: o.description || o.name || "", tag: o.category || tag || "", params: (o.params || o.parameters || []).map((x) => x.name || x).filter((x) => typeof x === "string") }); return; }
    for (const [k, v] of Object.entries(o)) walk(v, d + 1, o.name || o.category || tag || k);
  };
  walk(j, 0, ""); return out;
}

async function probe(p, domain, op, request) {
  const t = Date.now();
  try { const d = await callProvider(p, op, PV, request, 8000); return { id: p.id, domain, op, ok: true, ms: Date.now() - t, count: pickList(d).length }; }
  catch (e) { return { id: p.id, domain, op, ok: false, ms: Date.now() - t, error: String(e.message).slice(0, 160), status: e.status }; }
}
async function ping(p, request) {
  const t = Date.now();
  try { await callProvider(p, p.health, {}, request, 6000, true); return { id: p.id, domain: "health", op: p.health, ok: true, ms: Date.now() - t }; }
  catch (e) { return { id: p.id, domain: "health", op: p.health, ok: false, ms: Date.now() - t, error: String(e.message).slice(0, 160), status: e.status }; }
}

export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }

async function handle(request) {
  const a = new URL(request.url).searchParams.get("a");
  const no = (d, s = 200, h = {}) => Response.json(d, { status: s, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...h } });
  try {
    if (a === "me") return no({ configured: !!TOKEN(), authed: authed(request), persistent, storeError: storeState.error });
    if (a === "login") {
      if (request.method !== "POST") return no({ error: "POST only" }, 405);
      if (!TOKEN()) return no({ error: "ADMIN_TOKEN is not set in Vercel" }, 503);
      const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
      const rec = tries.get(ip) || { n: 0, t: Date.now() };
      if (Date.now() - rec.t > 600000) { rec.n = 0; rec.t = Date.now(); }
      if (rec.n >= 8) return no({ error: "Too many attempts. Try again in 10 minutes." }, 429);
      const body = await request.json().catch(() => ({}));
      if (!crypto.timingSafeEqual(sha(body.token || ""), sha(TOKEN()))) { rec.n++; tries.set(ip, rec); await new Promise((r) => setTimeout(r, 500)); return no({ error: "Invalid token" }, 401); }
      tries.delete(ip); const exp = Date.now() + 12 * 3600 * 1000;
      return no({ ok: true }, 200, { "Set-Cookie": `anv_admin=${exp}.${sig(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` });
    }
    if (a === "logout") return no({ ok: true }, 200, { "Set-Cookie": "anv_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });
    if (!authed(request)) return no({ error: "Not signed in" }, 401);
    const post = request.method === "POST";
    if (post && request.headers.get("x-requested-with") !== "anv-admin") return no({ error: "Bad request" }, 400);
    const body = post ? await request.json().catch(() => ({})) : {};

    if (a === "state") {
      const cfg = await loadConfig(true), [h] = await kv([["GET", "anv:health"]]);
      return no({ cfg: pub(cfg), health: h ? JSON.parse(h) : null, breaker: Object.fromEntries(Object.entries(breaker).map(([k, v]) => [k, { fails: v.fails, until: v.until }])), ops: OPS, domains: DOMAINS, persistent, storeError: storeState.error, siteUrl: process.env.SITE_URL || "" });
    }
    if (a === "usage") {
      const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)).reverse();
      const r = await kv([["HGETALL", "anv:u"], ["LRANGE", "anv:log", 0, 99], ...days.map((d) => ["HGETALL", "anv:d:" + d])]);
      return no({ totals: toObj(r[0]), log: (r[1] || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean), days: days.map((d, i) => ({ day: d, ...toObj(r[2 + i]) })) });
    }
    if (a === "health" && post) {
      const cfg = await loadConfig(true), jobs = [];
      for (const p of Object.values(cfg.providers)) {
        for (const d of DOMAINS) { const op = PROBE[d].find((o) => p.ops?.[o]); if (op) jobs.push(probe(p, d, op, request)); }
        if (p.health) jobs.push(ping(p, request));
      }
      const snap = { t: Date.now(), items: await Promise.all(jobs) };
      await kv([["SET", "anv:health", JSON.stringify(snap)]]); return no(snap);
    }
    if (a === "save" && post) { const cfg = await saveConfig(body); return no({ cfg: pub(cfg) }); }
    if (a === "reset" && post) { delete breaker[body.id]; return no({ ok: true }); }
    if (a === "test" && post) {
      const cfg = await loadConfig(true), p = cfg.providers[body.provider];
      if (!p || !OPS[body.op]) return no({ error: "Unknown provider or operation" }, 400);
      const vars = { ...PV, ...(body.vars || {}) }, t = Date.now();
      try {
        const d = await callProvider(p, body.op, vars, request, 10000), list = pickList(d);
        return no({ ok: true, ms: Date.now() - t, url: safeUrl(p, body.op, vars), count: list.length, topKeys: Object.keys(d || {}).slice(0, 20), sample: JSON.stringify(list[0] ?? d, null, 1).slice(0, 1800) });
      } catch (e) { return no({ ok: false, ms: Date.now() - t, url: safeUrl(p, body.op, vars), error: e.message, status: e.status }); }
    }
    if (a === "discover" && post) {
      const base = String(body.base || "").trim().replace(/\/$/, ""); await assertPublicUrl(base);
      for (const path of ["/openapi.json", "/api-catalog.json", "/swagger.json", "/api/openapi.json"]) {
        try {
          const u = await assertPublicUrl(base + path), r = await fetch(u, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" }, redirect: "manual" });
          if (!r.ok) continue; const eps = endpoints(await r.json());
          if (eps.length) return no({ source: path, total: eps.length, endpoints: eps.slice(0, 600) });
        } catch {}
      }
      return no({ error: "No openapi.json or api-catalog.json found at that address." }, 404);
    }
    return no({ error: "Unknown action" }, 400);
  } catch (e) { return no({ error: e instanceof HttpError ? e.message : "Server error" }, e.status || 500); }
}
