import { framex, json, pickList, normalize, HttpError } from "./_lib.js";

const SECTIONS = {
  trending: "/v1/movies/trending",
  "popular-movies": "/v1/movies/popular",
  "popular-series": "/v1/series/popular",
  "latest-movies": "/v1/movies/latest",
  "latest-series": "/v1/series/latest",
};

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const q = (p.get("q") || "").trim().slice(0, 200);
  const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
  try {
    const data = q
      ? await framex("/v1/search", { q, page }, request)
      : await framex(SECTIONS[p.get("section")] ?? SECTIONS.trending, { page }, request);
    const items = pickList(data).map(normalize).filter((i) => i.id);
    // Catalogue data is not user-specific, so the CDN may cache it briefly.
    return json({ items, source: data?.source ?? null }, 200, "public, s-maxage=300, stale-while-revalidate=600");
  } catch (e) {
    return json({ error: e instanceof HttpError ? e.message : "Upstream error" }, e.status || 502);
  }
}
