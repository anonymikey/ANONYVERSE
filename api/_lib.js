// Shared server helpers. Files starting with "_" are not exposed as routes on Vercel.
const BASE = "https://framex.wolvarex.com/api";

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function framex(path, params = {}) {
  const key = process.env.FRAMEX_API_KEY;
  if (!key) throw new HttpError(500, "FRAMEX_API_KEY is not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { "X-API-Key": key }, cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status === 401 || res.status === 403 ? 502 : res.status, `FRAMEX responded ${res.status}`);
  return res.json();
}

export const json = (data, status = 200, cache = "no-store") =>
  Response.json(data, { status, headers: { "Cache-Control": cache } });

// FRAMEX list responses vary by route, so find the array defensively.
export function pickList(d, depth = 0) {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== "object" || depth > 2) return [];
  for (const k of ["results", "items", "subjects", "list", "data"]) {
    const found = pickList(d[k], depth + 1);
    if (found.length) return found;
  }
  return [];
}

// Canonical contentId first; legacy id may also be present.
export function normalize(x) {
  const img = x.poster ?? x.cover ?? x.image ?? x.coverUrl ?? x.thumbnail;
  return {
    id: String(x.contentId ?? x.subjectId ?? x.id ?? ""),
    title: x.title ?? x.name ?? "Untitled",
    year: x.year ?? String(x.releaseDate ?? "").slice(0, 4) ?? "",
    poster: typeof img === "string" ? img : img?.url ?? null,
    type: String(x.type ?? x.subjectType ?? ""),
  };
}
