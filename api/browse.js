import { json, fail, pickList, normTitle, normChannel, normSport, nameOf, slugify, limited } from "./_lib.js";
import { runList } from "./_router.js";
import { OPS } from "./_providers.js";

const slug = (v) => (/^[\w.-]{1,80}$/.test(v || "") ? v : null);
const chip = (x) => (typeof x === "string" ? { name: x, slug: slugify(x) } : { name: nameOf(x) || x.label, slug: x.slug ?? x.code ?? x.id ?? x.path });

export async function GET(request) {
  if (limited(request, 150)) return json({ error: "Too many requests. Please slow down a little." }, 429);
  const p = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
  let op, vars = { page };
  if (p.get("q")) { op = "search"; vars = { q: p.get("q").slice(0, 200), page }; }
  else if (p.get("anime")) { op = "anime-search"; vars = { q: p.get("anime").slice(0, 100) }; }
  else if (slug(p.get("genre"))) { op = "genre"; vars = { genre: p.get("genre"), page }; }
  else if (slug(p.get("category"))) { op = "category"; vars = { category: p.get("category"), page }; }
  else if (/^[a-z]{2}$/i.test(p.get("country") || "")) { op = "tv-country"; vars = { country: p.get("country").toLowerCase() }; }
  else op = p.get("s");
  const m = OPS[op];
  if (!m || m.k === "raw") return json({ error: "Unknown section" }, 400);
  try {
    const r = await runList(request, m.d, op, vars, { accept: (d) => pickList(d).length > 0 });
    const items = [], seen = new Set();
    for (const { p: prov, data } of r.results) {
      for (const x of pickList(data)) {
        const it = m.k === "chips" ? chip(x) : m.k === "sport" ? normSport(x) : m.k === "ch1" || m.k === "ch2" ? normChannel(x, m.k, vars.country) : normTitle(x, m.k);
        if (!(it.id || it.slug)) continue;
        const key = String(it.title ?? it.name).toLowerCase() + "|" + (it.year || it.id || it.slug);
        if (seen.has(key)) continue; seen.add(key); items.push({ ...it, p: prov.id });
      }
    }
    return json({ items, kind: m.k, provider: r.results[0].p.id, providers: r.results.map((x) => x.p.id) }, 200, `public, s-maxage=${m.k === "sport" ? 15 : 45}, stale-while-revalidate=120`);
  } catch (e) { return fail(e); }
}
