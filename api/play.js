import { json, fail, findKey, findUrl, typeOfUrl, limited, HttpError } from "./_lib.js";
import { session, findMatch } from "./_router.js";

const num = (v) => (/^\d{1,4}$/.test(v || "") ? v : undefined);
const RES = new Set(["360", "480", "720", "1080"]);
const KIND = { title: ["movies", "stream"], anime: ["anime", "anime-stream"], ch1: ["livetv", "tv1-stream"], ch2: ["livetv", "tv2-stream"] };

function extract(k, d) {
  let url, type, expiresIn = findKey(d, ["expiresIn"]);
  if (k === "title") { url = d?.url ?? findUrl(d, /^(url|link|stream|src|play)/i); type = url && typeOfUrl(url); }
  else if (k === "anime") { url = findUrl(d, /proxy/i) || findUrl(d, /^(url|stream|hls|src)/i); type = url && typeOfUrl(url); if (!url) { url = findUrl(d, /embed/i); type = "embed"; } }
  else if (k === "ch1") { url = findUrl(d, /^(url|stream|hls|src)/i); type = url && "hls"; if (!url) { url = findUrl(d, /embed/i); type = "embed"; } }
  else { url = findUrl(d, /proxy/i); type = url && "hls"; if (!url) { url = findUrl(d, /embed/i); type = "embed"; } }
  return { url, type, expiresIn: Number(expiresIn) || undefined };
}

// Returns only short-lived playback URLs. Keys never leave the server. If the item's own provider is down,
// the next provider is asked to find the same title (exact match) and play it.
export async function GET(request) {
  if (limited(request, 60)) return json({ error: "Too many requests. Please slow down a little." }, 429);
  const p = new URL(request.url).searchParams, k = p.get("k"), id = p.get("id") || "", [domain, op] = KIND[k] || [];
  if (!op) return json({ error: "Unknown kind" }, 400);
  if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Invalid id" }, 400);
  const pref = p.get("p") || "framex", title = (p.get("title") || "").slice(0, 120), year = (p.get("year") || "").slice(0, 4);
  const skip = (p.get("skip") || "").split(",").filter(Boolean).slice(0, 6);
  const country = /^[a-z]{2}$/i.test(p.get("country") || "") ? p.get("country").toLowerCase() : undefined;
  let S, last;
  try {
    S = await session(request, domain, op, { prefer: pref, skip });
    for (const prov of S.list) {
      try {
        let pid = id;
        if (prov.id !== pref) { if (!(k === "title" || k === "anime") || !title) continue; const m = await findMatch(S, prov, k === "anime" ? "anime-search" : "search", title, year); if (!m) continue; pid = m.id; }
        const d = await S.call(prov, op, { id: pid, resolution: RES.has(p.get("resolution")) ? p.get("resolution") : "1080", se: num(p.get("se")), ep: num(p.get("ep")) || (k === "anime" ? "1" : undefined), download: p.get("download") === "1" ? "1" : undefined, audio: p.get("type") === "dub" ? "dub" : "sub", country });
        const r = extract(k, d); if (!r.url) throw new HttpError(502, `${prov.id}: no playable stream returned`);
        return json({ ...r, provider: prov.id, matched: prov.id !== pref });
      } catch (e) { last = e; }
    }
    throw last || new HttpError(502, "No provider could play this");
  } catch (e) { return fail(e); } finally { await S?.done(); }
}
