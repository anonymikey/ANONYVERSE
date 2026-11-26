// TEMPORARY: delete this file after troubleshooting.
// Shows only whether a key is set, its last 6 characters (same as the FRAMEX dashboard preview)
// and the site origin this deployment sends to FRAMEX. It never reveals the key.
export function GET(request) {
  const key = (process.env.FRAMEX_API_KEY || "").trim();
  return Response.json({
    keySet: key.length > 0,
    keyLast6: key ? key.slice(-6) : null,
    originSent: process.env.SITE_URL || new URL(request.url).origin,
  }, { headers: { "Cache-Control": "no-store" } });
}
