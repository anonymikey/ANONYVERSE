import { json, fail, pickList, findKey, img, limited, HttpError } from "./_lib.js";
import { session, findMatch } from "./_router.js";

const arr = (v) => (Array.isArray(v) ? v : []);
const person = (x) => ({ name: x.name ?? x.actorName ?? x.title ?? "", character: x.character ?? x.characterName ?? x.role ?? "", image: img(x.avatarUrl ?? x.avatar ?? x.image ?? x.photo ?? x.profile ?? x.headshot ?? x.cover) });
const mins = (v) => { const n = Number(v); if (!n) return typeof v === "string" ? v : ""; const m = n > 1000 ? Math.round(n / 60) : n; return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

function shape(d) {
  const seasons = arr(findKey(d, ["seasons", "seasonList"])).map((s, i) => {
    const se = Number(s.se ?? s.season ?? s.seasonNumber ?? i + 1), list = arr(s.episodes);
    const count = Number(s.maxEp ?? s.episodeCount ?? s.total ?? list.length) || 0;
    const eps = list.length ? list.map((x, j) => ({ n: Number(x.ep ?? x.episode ?? x.number ?? j + 1), title: x.title ?? x.name ?? "", image: img(x.image ?? x.cover ?? x.thumbnail ?? x.still), overview: x.description ?? x.overview ?? "" }))
      : Array.from({ length: count }, (_, j) => ({ n: j + 1, title: "", image: null, overview: "" }));
    return { se, eps };
  }).filter((s) => s.eps.length);
  const g = findKey(d, ["genre", "genres"]), rating = findKey(d, ["imdbRatingValue", "imdbRating", "rating", "score"]);
  return {
    title: findKey(d, ["title", "name"]) ?? "", overview: String(findKey(d, ["description", "overview", "synopsis", "plot", "summary"]) ?? ""),
    year: String(findKey(d, ["releaseDate", "year"]) ?? "").slice(0, 4), rating: rating ? String(rating) : "", runtime: mins(findKey(d, ["duration", "runtime"])),
    genres: (Array.isArray(g) ? g.map((x) => (typeof x === "string" ? x : x.name)) : String(g ?? "").split(/[,/]/)).map((s) => s.trim()).filter(Boolean).slice(0, 6),
    cast: arr(findKey(d, ["staffList", "cast", "casts", "actors", "staff", "credits"])).map(person).filter((c) => c.name).slice(0, 24), seasons,
  };
}

export async function GET(request) {
  if (limited(request, 80)) return json({ error: "Too many requests. Please slow down a little." }, 429);
  const p = new URL(request.url).searchParams, id = p.get("id") || "", anime = p.get("k") === "anime";
  const pref = p.get("p") || "framex", title = (p.get("title") || "").slice(0, 120), year = (p.get("year") || "").slice(0, 4);
  if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Invalid id" }, 400);
  let S, last;
  try {
    S = await session(request, anime ? "anime" : "movies", anime ? "anime-episodes" : "detail", { prefer: pref });
    for (const prov of S.list) {
      try {
        let pid = id, slug = (p.get("slug") || "").trim();
        if (prov.id !== pref) { if (!title) continue; const m = await findMatch(S, prov, anime ? "anime-search" : "search", title, year); if (!m) continue; pid = m.id; slug = m.slug || ""; }
        if (anime) {
          const eps = pickList(await S.call(prov, "anime-episodes", { id: pid })).map((x, i) => ({ n: Number(x.episode ?? x.number ?? x.ep ?? x.episodeNumber ?? i + 1), title: x.title ?? x.name ?? "", image: img(x.image ?? x.thumbnail ?? x.cover), overview: x.description ?? x.overview ?? "", dub: x.hasDub === true }));
          return json({ seasons: [{ se: 1, eps }], hasDub: eps.some((e) => e.dub), cast: [], genres: [], provider: prov.id }, 200, "public, s-maxage=300");
        }
        if (!/^[\w.-]{1,160}$/.test(slug) && prov.ops["detail-path"]) slug = String(findKey(await S.call(prov, "detail-path", { id: pid }), ["detailPath", "path", "slug"]) ?? "");
        return json({ ...shape(await S.call(prov, "detail", { slug, id: pid })), provider: prov.id }, 200, "public, s-maxage=300, stale-while-revalidate=1800");
      } catch (e) { last = e; }
    }
    throw last || new HttpError(404, "Details unavailable");
  } catch (e) { return fail(e); } finally { await S?.done(); }
}
