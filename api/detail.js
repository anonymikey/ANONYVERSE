import { framex, json, fail, pickList, findKey, img, limited } from "./_lib.js";

const arr = (v) => (Array.isArray(v) ? v : []);
const person = (x) => ({
  name: x.name ?? x.actorName ?? x.title ?? "",
  character: x.character ?? x.characterName ?? x.role ?? "",
  image: img(x.avatarUrl ?? x.avatar ?? x.image ?? x.photo ?? x.profile ?? x.headshot ?? x.cover),
});
const mins = (v) => { const n = Number(v); if (!n) return typeof v === "string" ? v : ""; const m = n > 1000 ? Math.round(n / 60) : n; return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

export async function GET(request) {
  if (limited(request, 80)) return json({ error: "Too many requests. Please slow down a little." }, 429);
  const p = new URL(request.url).searchParams;
  const id = p.get("id") || "", k = p.get("k");
  if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Invalid id" }, 400);
  try {
    if (k === "anime") {
      const d = await framex("/v1/animev2/episodes", { contentId: id }, request);
      const eps = pickList(d).map((x, i) => ({
        n: Number(x.episode ?? x.number ?? x.ep ?? x.episodeNumber ?? i + 1),
        title: x.title ?? x.name ?? "", image: img(x.image ?? x.thumbnail ?? x.cover),
        overview: x.description ?? x.overview ?? "", sub: x.hasSub !== false, dub: x.hasDub === true,
      }));
      return json({ seasons: [{ se: 1, eps }], hasDub: eps.some((e) => e.dub), cast: [], genres: [] }, 200, "public, s-maxage=300");
    }
    let slug = (p.get("slug") || "").trim();
    if (!/^[\w.-]{1,160}$/.test(slug)) {
      const r = await framex("/v1/ids/detail-path", { subjectId: id }, request);
      slug = String(findKey(r, ["detailPath", "path", "slug"]) ?? "");
    }
    if (!/^[\w.-]{1,160}$/.test(slug)) return json({ error: "Details unavailable" }, 404);
    const d = await framex(`/v1/movies/${encodeURIComponent(slug)}`, {}, request);

    const seasons = arr(findKey(d, ["seasons", "seasonList"])).map((s, i) => {
      const se = Number(s.se ?? s.season ?? s.seasonNumber ?? i + 1);
      const list = arr(s.episodes);
      const count = Number(s.maxEp ?? s.episodeCount ?? s.total ?? list.length) || 0;
      const eps = list.length
        ? list.map((x, j) => ({ n: Number(x.ep ?? x.episode ?? x.number ?? j + 1), title: x.title ?? x.name ?? "", image: img(x.image ?? x.cover ?? x.thumbnail ?? x.still), overview: x.description ?? x.overview ?? "" }))
        : Array.from({ length: count }, (_, j) => ({ n: j + 1, title: "", image: null, overview: "" }));
      return { se, eps };
    }).filter((s) => s.eps.length);

    const g = findKey(d, ["genre", "genres"]);
    const rating = findKey(d, ["imdbRatingValue", "imdbRating", "rating", "score"]);
    return json({
      title: findKey(d, ["title", "name"]) ?? "",
      overview: String(findKey(d, ["description", "overview", "synopsis", "plot", "summary"]) ?? ""),
      year: String(findKey(d, ["releaseDate", "year"]) ?? "").slice(0, 4),
      rating: rating ? String(rating) : "",
      runtime: mins(findKey(d, ["duration", "runtime"])),
      genres: (Array.isArray(g) ? g.map((x) => (typeof x === "string" ? x : x.name)) : String(g ?? "").split(/[,/]/)).map((s) => s.trim()).filter(Boolean).slice(0, 6),
      cast: arr(findKey(d, ["staffList", "cast", "casts", "actors", "staff", "credits"])).map(person).filter((c) => c.name).slice(0, 24),
      seasons,
    }, 200, "public, s-maxage=600, stale-while-revalidate=3600");
  } catch (e) { return fail(e); }
}
