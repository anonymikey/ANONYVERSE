import { framex, json, fail, pickList, normTitle, normChannel, normSport, nameOf, slugify, limited } from "./_lib.js";

const SECTIONS = {
  trending: ["/v1/movies/trending", "title"],
  "popular-movies": ["/v1/movies/popular", "title"],
  "popular-series": ["/v1/series/popular", "title"],
  "latest-movies": ["/v1/movies/latest", "title"],
  "latest-series": ["/v1/series/latest", "title"],
  upcoming: ["/v1/movies/upcoming", "title"],
  genres: ["/v1/genres", "chips"],
  categories: ["/v1/categories", "chips"],
  countries: ["/v1/channels-v2/countries", "chips"],
  "tv-ke": ["/v1/channels", "ch1"],
  "sports-live": ["/v1/sports/ongoing", "sport"],
  "sports-today": ["/v1/sports/matches", "sport"],
  "sports-replays": ["/v1/sports/replays", "sport"],
};
const slug = (v) => (/^[\w.-]{1,80}$/.test(v || "") ? v : null);

export async function GET(request) {
  if (limited(request, 150)) return json({ error: "Too many requests. Please slow down a little." }, 429);
  const p = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
  let path, kind, params = {};
  if (p.get("q")) { path = "/v1/search"; kind = "title"; params = { q: p.get("q").slice(0, 200), page }; }
  else if (p.get("anime")) { path = "/v1/animev2/search"; kind = "anime"; params = { q: p.get("anime").slice(0, 100), limit: 30 }; }
  else if (slug(p.get("genre"))) { path = `/v1/genres/${p.get("genre")}`; kind = "title"; params = { page }; }
  else if (slug(p.get("category"))) { path = `/v1/categories/${p.get("category")}`; kind = "title"; params = { page }; }
  else if (/^[a-z]{2}$/i.test(p.get("country") || "")) { path = "/v1/channels-v2/channels"; kind = "ch2"; params = { country: p.get("country").toLowerCase() }; }
  else if (SECTIONS[p.get("s")]) { [path, kind] = SECTIONS[p.get("s")]; if (kind === "title") params = { page }; }
  else return json({ error: "Unknown section" }, 400);

  try {
    const list = pickList(await framex(path, params, request));
    const country = params.country;
    const items = kind === "chips"
      ? list.map((x) => (typeof x === "string" ? { name: x, slug: slugify(x) } : { name: nameOf(x) || x.label, slug: x.slug ?? x.code ?? x.id ?? x.path })).filter((c) => c.slug && c.name)
      : list.map((x) => kind === "sport" ? normSport(x) : kind === "ch1" || kind === "ch2" ? normChannel(x, kind, country) : normTitle(x, kind)).filter((i) => i.id);
    const ttl = kind === "sport" ? 15 : 120;
    return json({ items, kind }, 200, `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`);
  } catch (e) { return fail(e); }
}
