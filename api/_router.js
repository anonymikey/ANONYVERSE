import { callProvider, loadConfig } from "./_providers.js";
import { kv } from "./_store.js";
import { HttpError, pickList, normTitle } from "./_lib.js";

export const breaker = (globalThis.__anvCB ||= {}); // per-instance circuit breaker: 3 hard failures -> skip for 60s
const isOpen = (id) => (breaker[id]?.until || 0) > Date.now();
const hard = (st) => !st || st >= 500 || st === 401 || st === 403 || st === 429;

// Picks providers for a section/operation according to the admin's routing mode, then lets the caller try them in order.
export async function session(request, domain, op, { prefer, skip = [] } = {}) {
  const cfg = await loadConfig(), d = cfg.domains[domain];
  const eligible = Object.values(cfg.providers).filter((p) => p.enabled !== false && p.ops?.[op]);
  let list;
  if (d.mode === "manual") list = eligible.filter((p) => p.id === d.manual);
  else { list = d.order.map((id) => eligible.find((p) => p.id === id)).filter(Boolean); eligible.forEach((p) => !list.includes(p) && list.push(p)); }
  if (d.mode === "auto" && prefer) { const i = list.findIndex((p) => p.id === prefer); if (i > 0) list.unshift(...list.splice(i, 1)); }
  const keep = list.filter((p) => !skip.includes(p.id)); if (keep.length) list = keep;
  list = [...list.filter((p) => !isOpen(p.id)), ...list.filter((p) => isOpen(p.id))];
  if (!list.length) throw new HttpError(503, `No provider is enabled for ${domain}. Check the admin panel.`);
  const cmds = [], tried = [], day = new Date().toISOString().slice(0, 10);
  const track = (p, o, ok, ms, err, st) => {
    const c = (breaker[p.id] ||= { fails: 0, until: 0 });
    if (ok) { c.fails = 0; c.until = 0; } else if (hard(st) && ++c.fails >= 3) c.until = Date.now() + 60000;
    cmds.push(["HINCRBY", "anv:u", `${p.id}|${domain}|req`, 1], ["HINCRBY", `anv:d:${day}`, `${p.id}|req`, 1],
      ok ? ["HINCRBY", "anv:u", `${p.id}|${domain}|ms`, ms] : ["HINCRBY", "anv:u", `${p.id}|${domain}|err`, 1],
      ["LPUSH", "anv:log", JSON.stringify({ t: Date.now(), p: p.id, d: domain, o, ok, ms, e: err ? String(err).slice(0, 140) : undefined })]);
    if (!ok) cmds.push(["HINCRBY", `anv:d:${day}`, `${p.id}|err`, 1]);
  };
  const call = async (p, o, vars) => {
    const t = Date.now();
    try { const data = await callProvider(p, o, vars, request); track(p, o, true, Date.now() - t); return data; }
    catch (e) { track(p, o, false, Date.now() - t, e.message, e.status); tried.push({ id: p.id, error: e.message }); throw e; }
  };
  const done = async () => { if (cmds.length) { cmds.push(["LTRIM", "anv:log", 0, 99], ["EXPIRE", `anv:d:${day}`, 3456000]); await kv(cmds.splice(0)); } };
  return { cfg, mode: d.mode, list, tried, call, done };
}

const summary = (t) => ("All providers failed: " + t.map((x) => `${x.id}: ${x.error}`).join(" | ")).slice(0, 400);
// List operations: first provider that answers with data wins (auto/manual), or combine every provider (merge).
export async function runList(request, domain, op, vars, { prefer, skip, accept } = {}) {
  const S = await session(request, domain, op, { prefer, skip }); let empty = null;
  try {
    if (S.mode === "merge") {
      const rs = await Promise.allSettled(S.list.map((p) => S.call(p, op, vars).then((data) => ({ p, data }))));
      const ok = rs.filter((r) => r.status === "fulfilled").map((r) => r.value);
      if (!ok.length) throw new HttpError(502, summary(S.tried));
      return { results: ok, tried: S.tried };
    }
    for (const p of S.list) {
      try { const data = await S.call(p, op, vars); if (!accept || accept(data)) return { results: [{ p, data }], tried: S.tried }; empty ||= { results: [{ p, data }], tried: S.tried }; S.tried.push({ id: p.id, error: "returned no results" }); } catch {}
    }
    if (empty) return empty;
    throw new HttpError(502, summary(S.tried));
  } finally { await S.done(); }
}

// Finds the same title on another provider (exact title match only, so we never play the wrong movie).
export async function findMatch(S, prov, op, title, year) {
  const list = pickList(await S.call(prov, op, { q: title, page: 1 })).map((x) => normTitle(x, "title")).filter((x) => x.id);
  const n = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), t = n(title);
  return list.find((x) => n(x.title) === t && (!year || !x.year || String(x.year) === year)) || list.find((x) => n(x.title) === t) || null;
}
