import { framex, json, fail, findKey, findUrl, typeOfUrl, HttpError, limited } from "./_lib.js";

const num = (v) => (/^\d{1,4}$/.test(v || "") ? v : undefined);
const RES = new Set(["360", "480", "720", "1080"]);

// Returns only short-lived playback URLs. The API key never leaves the server.
export async function GET(request) {
  if (limited(request, 60)) return json({ error: "Too many requests. Please slow down a little." }, 429);
  const p = new URL(request.url).searchParams;
  const k = p.get("k"), id = p.get("id") || "";
  if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Invalid id" }, 400);
  try {
    let d, url, type, expiresIn;
    if (k === "title") {
      d = await framex("/v1/stream-url", {
        subjectId: id, resolution: RES.has(p.get("resolution")) ? p.get("resolution") : "1080",
        se: num(p.get("se")), ep: num(p.get("ep")), download: p.get("download") === "1" ? "1" : undefined,
      }, request);
      url = d?.url; type = url ? typeOfUrl(url) : undefined; expiresIn = d?.expiresIn;
    } else if (k === "anime") {
      d = await framex("/v1/animev2/stream", { contentId: id, episode: num(p.get("ep")) || "1", type: p.get("type") === "dub" ? "dub" : "sub" }, request);
      url = findUrl(d, /proxy/i) || findUrl(d, /^(url|stream|hls|src)/i); type = url ? typeOfUrl(url) : undefined;
      if (!url) { url = findUrl(d, /embed/i); type = "embed"; }
      expiresIn = findKey(d, ["expiresIn"]);
    } else if (k === "ch1") {
      d = await framex(`/v1/channels/${id}/stream`, {}, request);
      url = findUrl(d, /^(url|stream|hls|src)/i); type = url ? "hls" : undefined;
      if (!url) { url = findUrl(d, /embed/i); type = "embed"; }
    } else if (k === "ch2") {
      const c = /^[a-z]{2}$/i.test(p.get("country") || "") ? p.get("country").toLowerCase() : "";
      d = await framex("/v1/channels-v2/stream", { country: c, channelId: id }, request);
      url = findUrl(d, /proxy/i); type = url ? "hls" : undefined;
      if (!url) { url = findUrl(d, /embed/i); type = "embed"; }
      expiresIn = findKey(d, ["expiresIn"]);
    } else return json({ error: "Unknown kind" }, 400);
    if (!url) throw new HttpError(502, "No playable stream returned");
    return json({ url, type, expiresIn: Number(expiresIn) || undefined });
  } catch (e) { return fail(e); }
}
