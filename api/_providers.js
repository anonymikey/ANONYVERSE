import dns from "node:dns/promises";
import net from "node:net";
import { HttpError } from "./_lib.js";
import { kv } from "./_store.js";

export const DOMAINS = ["movies", "anime", "livetv", "sports"];
const O = (d, k, v = "") => ({ d, k, v }); // d: section, k: result kind, v: variables a template may use
export const OPS = {
  trending: O("movies", "title", "page"), "popular-movies": O("movies", "title", "page"), "popular-series": O("movies", "title", "page"),
  "latest-movies": O("movies", "title", "page"), "latest-series": O("movies", "title", "page"), upcoming: O("movies", "title", "page"),
  search: O("movies", "title", "q, page"), genre: O("movies", "title", "genre, page"), category: O("movies", "title", "category, page"),
  genres: O("movies", "chips"), categories: O("movies", "chips"),
  "detail-path": O("movies", "raw", "id"), detail: O("movies", "raw", "slug, id"), stream: O("movies", "raw", "id, resolution, se, ep, download"),
  "anime-search": O("anime", "anime", "q"), "anime-episodes": O("anime", "raw", "id"), "anime-stream": O("anime", "raw", "id, ep, audio"),
  "tv-ke": O("livetv", "ch1"), "tv-country": O("livetv", "ch2", "country"), countries: O("livetv", "chips"),
  "tv1-stream": O("livetv", "raw", "id"), "tv2-stream": O("livetv", "raw", "id, country"),
  "sports-live": O("sports", "sport"), "sports-today": O("sports", "sport"), "sports-replays": O("sports", "sport"),
};

export const FRAMEX = {
  id: "framex", name: "FRAMEX", builtin: true, enabled: true, base: "https://framex.wolvarex.com/api", origin: true, health: "/healthz",
  auth: { type: "header", name: "X-API-Key", env: "FRAMEX_API_KEY" },
  ops: {
    trending: "/v1/movies/trending?page={page}", "popular-movies": "/v1/movies/popular?page={page}", "popular-series": "/v1/series/popular?page={page}",
    "latest-movies": "/v1/movies/latest?page={page}", "latest-series": "/v1/series/latest?page={page}", upcoming: "/v1/movies/upcoming",
    search: "/v1/search?q={q}&page={page}", genre: "/v1/genres/{genre}?page={page}", category: "/v1/categories/{category}?page={page}",
    genres: "/v1/genres", categories: "/v1/categories", "detail-path": "/v1/ids/detail-path?subjectId={id}", detail: "/v1/movies/{slug}",
    stream: "/v1/stream-url?subjectId={id}&resolution={resolution}&se={se}&ep={ep}&download={download}",
    "anime-search": "/v1/animev2/search?q={q}&limit=30", "anime-episodes": "/v1/animev2/episodes?contentId={id}", "anime-stream": "/v1/animev2/stream?contentId={id}&episode={ep}&type={audio}",
    "tv-ke": "/v1/channels", "tv-country": "/v1/channels-v2/channels?country={country}", countries: "/v1/channels-v2/countries",
    "tv1-stream": "/v1/channels/{id}/stream", "tv2-stream": "/v1/channels-v2/stream?country={country}&channelId={id}",
    "sports-live": "/v1/sports/ongoing", "sports-today": "/v1/sports/matches", "sports-replays": "/v1/sports/replays",
  },
};

/* ---- URL templates: {var} placeholders; a query pair is dropped when its variable is empty ---- */
export function fill(tpl, vars) {
  const [path, qs = ""] = tpl.split("?");
  const miss = (s) => [...s.matchAll(/\{(\w+)\}/g)].some((m) => vars[m[1]] === undefined || vars[m[1]] === null || vars[m[1]] === "");
  if (miss(path)) return null;
  const sub = (s) => s.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k]));
  const q = qs.split("&").filter(Boolean).filter((p) => !miss(p)).map(sub).join("&");
  return sub(path) + (q ? "?" + q : "");
}

export async function callProvider(p, op, vars, request, timeout = 9000, raw = false) {
  const tpl = raw ? op : p.ops?.[op];
  if (!tpl) throw new HttpError(501, `${p.id}: "${op}" is not mapped`);
  const rel = fill(tpl, vars || {});
  if (!rel) throw new HttpError(400, `${p.id}: missing a parameter for ${op}`);
  const url = new URL(p.base.replace(/\/$/, "") + (rel.startsWith("/") ? "" : "/") + rel);
  const headers = { Accept: "application/json" }, a = p.auth || {};
  const key = (process.env[a.env] || "").trim().replace(/^["']|["']$/g, "");
  if (a.type && a.type !== "none" && a.env) {
    if (!key) throw new HttpError(500, `${p.id}: environment variable ${a.env} is not set`);
    if (a.type === "query") url.searchParams.set(a.name || "key", key); else if (a.type === "bearer") headers.Authorization = "Bearer " + key; else headers[a.name || "X-API-Key"] = key;
  }
  if (p.origin) { const site = process.env.SITE_URL || (request ? new URL(request.url).origin : ""); if (site) { headers.Origin = site.replace(/\/$/, ""); headers.Referer = headers.Origin + "/"; } }
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout), cache: "no-store", redirect: "follow" });
  if (!res.ok) { const d = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160); throw new HttpError(res.status, `${p.id} ${res.status}${d ? ": " + d : ""}`); }
  if (raw) return { status: res.status };
  try { return await res.json(); } catch { throw new HttpError(502, `${p.id}: response was not JSON`); }
}
export const safeUrl = (p, op, vars) => { const rel = fill(p.ops?.[op] || "", vars || {}); return rel ? p.base.replace(/\/$/, "") + rel : ""; };

/* ---- SSRF protection for admin-supplied URLs ---- */
const priv4 = (ip) => /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip);
export async function assertPublicUrl(u) {
  let url; try { url = new URL(u); } catch { throw new HttpError(400, "Invalid URL"); }
  if (url.protocol !== "https:") throw new HttpError(400, "Only https:// URLs are allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => { throw new HttpError(400, "Host not found"); });
  for (const { address: a } of addrs) if (priv4(a) || /^(::1?$|f[cd]|fe80|::ffff:(10|127|192\.168|172\.(1[6-9]|2\d|3[01])|169\.254))/i.test(a)) throw new HttpError(400, "Private or local addresses are not allowed");
  return url;
}

/* ---- Config (stored in Redis, merged with built-in FRAMEX) ---- */
let cache = null;
export async function loadConfig(force) {
  if (!force && cache && Date.now() - cache.t < 15000) return cache.v;
  let st = {}; try { const [raw] = await kv([["GET", "anv:cfg"]]); if (raw) st = JSON.parse(raw); } catch {}
  const providers = { framex: { ...FRAMEX, enabled: st.providers?.framex?.enabled !== false, ops: { ...FRAMEX.ops, ...(st.providers?.framex?.ops || {}) } } };
  for (const [id, p] of Object.entries(st.providers || {})) if (id !== "framex") providers[id] = { ...p, id };
  const domains = {};
  for (const d of DOMAINS) {
    const s = st.domains?.[d] || {};
    const ids = Object.values(providers).filter((p) => Object.entries(OPS).some(([op, m]) => m.d === d && p.ops?.[op])).map((p) => p.id);
    const order = [...(s.order || []).filter((i) => ids.includes(i)), ...ids.filter((i) => !(s.order || []).includes(i))];
    domains[d] = { mode: ["auto", "manual", "merge"].includes(s.mode) ? s.mode : "auto", order, manual: ids.includes(s.manual) ? s.manual : order[0] };
  }
  const v = { providers, domains }; cache = { t: Date.now(), v }; return v;
}
async function cleanProvider(id, r) {
  if (id === "framex") return { enabled: r.enabled !== false, ops: Object.fromEntries(Object.entries(r.ops || {}).filter(([o, t]) => OPS[o] && /^\/[^\s]{0,299}$/.test(t || "") && FRAMEX.ops[o] !== t)) };
  if (!/^[a-z0-9-]{2,24}$/.test(id)) throw new HttpError(400, "Provider id: 2-24 characters, a-z 0-9 and dashes");
  const base = String(r.base || "").trim().replace(/\/$/, ""); await assertPublicUrl(base);
  const a = r.auth || {}, type = ["none", "header", "bearer", "query"].includes(a.type) ? a.type : "none";
  if (type !== "none" && !/^[A-Z][A-Z0-9_]{1,59}$/.test(a.env || "")) throw new HttpError(400, "Authentication needs an environment variable name such as MY_API_KEY");
  const ops = {};
  for (const [op, t] of Object.entries(r.ops || {})) { const s = String(t || "").trim(); if (!s || !OPS[op]) continue; if (!/^\/[^\s]{0,299}$/.test(s)) throw new HttpError(400, `Template for "${op}" must start with / and contain no spaces`); ops[op] = s; }
  return { id, name: String(r.name || id).slice(0, 40), base, enabled: r.enabled !== false, origin: !!r.origin, health: /^\/\S{0,119}$/.test(r.health || "") ? r.health : "", auth: { type, name: String(a.name || "").slice(0, 40), env: a.env || "" }, ops };
}
export async function saveConfig(input) {
  const ids = Object.keys(input.providers || {}); if (ids.length > 12) throw new HttpError(400, "Up to 12 providers");
  const providers = {}; for (const id of ids) providers[id] = await cleanProvider(id, input.providers[id]);
  providers.framex ||= { enabled: true, ops: {} };
  const domains = {}; for (const d of DOMAINS) { const s = input.domains?.[d] || {}; domains[d] = { mode: ["auto", "manual", "merge"].includes(s.mode) ? s.mode : "auto", order: (s.order || []).filter((i) => providers[i]).slice(0, 12), manual: s.manual && providers[s.manual] ? s.manual : "" }; }
  await kv([["SET", "anv:cfg", JSON.stringify({ providers, domains })]]); cache = null; return loadConfig(true);
}
