import { framex, json, HttpError } from "./_lib.js";

const RESOLUTIONS = new Set(["360", "480", "720", "1080"]);

// Returns ONLY the short-lived signed URL (about 10 minutes). The browser then
// streams directly from FRAMEX, which keeps seeking and Range requests working.
export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const id = p.get("id") || "";
  if (!/^[\w-]{1,64}$/.test(id)) return json({ error: "Invalid id" }, 400);
  const resolution = RESOLUTIONS.has(p.get("resolution")) ? p.get("resolution") : "1080";
  const num = (v) => (/^\d{1,3}$/.test(v || "") ? v : undefined);
  try {
    const s = await framex("/v1/stream-url", {
      subjectId: id,
      resolution,
      se: num(p.get("se")),
      ep: num(p.get("ep")),
      download: p.get("download") === "1" ? "1" : undefined,
    });
    if (!s?.url) throw new HttpError(502, "No playback URL returned");
    return json({ url: s.url, expiresAt: s.expiresAt, expiresIn: s.expiresIn });
  } catch (e) {
    return json({ error: e instanceof HttpError ? e.message : "Upstream error" }, e.status || 502);
  }
}
