// Shared server helpers. Files starting with "_" are not exposed as routes on Vercel.
const BASE = "https://framex.wolvarex.com/api";

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function framex(path, params = {}, request) {
  const key = (process.env.FRAMEX_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!key) throw new HttpError(500, "FRAMEX_API_KEY is not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers = { "X-API-Key": key };
  const site = process.env.SITE_URL || (request ? new URL(request.url).origin : "");
  if (site) { headers.Origin = site.replace(/\/$/, ""); headers.Referer = headers.Origin + "/"; }
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    throw new HttpError(res.status === 401 || res.status === 403 ? 502 : res.status,
      `FRAMEX responded ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export const json = (data, status = 200, cache = "no-store") =>
  Response.json(data, { status, headers: { "Cache-Control": cache } });

export const fail = (e) => json({ error: e instanceof HttpError ? e.message : "Upstream error" }, e.status || 502);

// FRAMEX responses vary by route, so these helpers search defensively.
export function pickList(d, depth = 0) {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== "object" || depth > 2) return [];
  for (const k of ["results", "items", "subjects", "list", "channels", "matches", "countries", "data"]) {
    const found = pickList(d[k], depth + 1);
    if (found.length) return found;
  }
  return [];
}
export function findKey(o, keys, depth = 0) {
  if (!o || typeof o !== "object" || depth > 5) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  for (const v of Object.values(o)) { const r = findKey(v, keys, depth + 1); if (r !== undefined) return r; }
}
export function findUrl(o, re, depth = 0) {
  if (!o || typeof o !== "object" || depth > 5) return undefined;
  for (const [k, v] of Object.entries(o)) if (typeof v === "string" && /^https?:\/\//.test(v) && re.test(k)) return v;
  for (const v of Object.values(o)) { const r = findUrl(v, re, depth + 1); if (r) return r; }
}
export const img = (v) => (typeof v === "string" ? v : v?.url || v?.src || v?.original || null);
export const nameOf = (v) => (typeof v === "string" ? v : v?.name || v?.title || v?.teamName || "");
export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const typeOfUrl = (u) => (/\.m3u8(\?|$)/i.test(u) || /hls|m3u8/i.test(u) ? "hls" : "file");

export function normTitle(x, k = "title") {
  const p = x.poster ?? x.cover ?? x.image ?? x.coverUrl ?? x.thumbnail;
  return {
    k, id: String(x.contentId ?? x.subjectId ?? x.id ?? ""), title: x.title ?? x.name ?? "Untitled",
    year: x.year ?? String(x.releaseDate ?? "").slice(0, 4), poster: img(p),
    type: String(x.type ?? x.subjectType ?? ""), slug: x.slug ?? x.detailPath ?? "",
    rating: x.imdbRatingValue ?? x.rating ?? "",
  };
}
export function normChannel(x, k, country) {
  return {
    k, id: String(x.channelId ?? x.id ?? x.contentId ?? ""), title: x.name ?? x.title ?? "Channel",
    poster: img(x.logo ?? x.image ?? x.poster ?? x.thumbnail), country: country || "", type: "live",
  };
}
export function normSport(x) {
  const home = nameOf(x.homeTeam ?? x.home ?? x.teamA), away = nameOf(x.awayTeam ?? x.away ?? x.teamB);
  const status = String(findKey(x, ["status", "matchStatus", "state"]) ?? "");
  return {
    k: "sport", id: String(x.matchId ?? x.id ?? ""),
    title: home && away ? `${home} vs ${away}` : x.title ?? x.name ?? "Match",
    sub: nameOf(x.league ?? x.competition ?? x.tournament), status,
    poster: img(x.poster ?? x.cover ?? x.logo ?? x.leagueLogo ?? findKey(x, ["homeLogo", "logo"])),
    media: findUrl(x, /proxy|m3u8|hls|stream|media|play/i) || "", type: "sport",
  };
}

// Light per-instance rate limit (protects your FRAMEX quota from abuse).
const hits = new Map();
export function limited(request, max = 100) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  const now = Date.now(); let h = hits.get(ip);
  if (!h || now - h.t > 60000) { h = { t: now, n: 0 }; hits.set(ip, h); }
  if (hits.size > 5000) hits.clear();
  return ++h.n > max;
}
