(() => {
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cssUrl = (u) => `url("${encodeURI(u).replace(/["\\()']/g, (c) => "%" + c.charCodeAt(0).toString(16))}")`;
const api = async (path, params = {}) => {
  const r = await fetch(path + "?" + new URLSearchParams(params));
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.status);
  return d;
};

const memo = new Map();
const getBrowse = (p) => { const k = JSON.stringify(p), m = memo.get(k); if (m && Date.now() - m.t < 60000) return m.p; const pr = api("/api/browse", p); memo.set(k, { t: Date.now(), p: pr }); pr.catch(() => memo.delete(k)); return pr; };
const RM = matchMedia("(prefers-reduced-motion: reduce)");
let heroT;

/* ---------- Icons ---------- */
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  series: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 2l4 4 4-4"/>',
  anime: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
  sports: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  list: '<path d="M6 3h12v18l-6-4-6 4z"/>', docs: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>', play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
};
const ico = (n, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const TG = (s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`;

/* ---------- Shell ---------- */
const NAV = [["home", "Home", "home"], ["movies", "Movies", "film"], ["series", "Shows", "series"], ["anime", "Anime", "anime"], ["live", "Live TV", "live"], ["sports", "Live Sports", "sports"], ["list", "My List", "list"]];
$("#nav").innerHTML = NAV.map(([id, l, i]) => `<a href="#${id}" data-r="${id}">${ico(i)}<span class="lbl">${l}</span></a>`).join("");
$("#sfoot").innerHTML = [
  ["/docs", "Documentation", ico("docs")], ["https://t.me/ANONYMIKEY", "Developer on Telegram", TG()],
  ["https://t.me/anonymiketech1", "Telegram channel", TG()], ["https://www.anonymiketech.space/", "Our website", ico("globe")],
].map(([h, l, i]) => `<a href="${h}" ${h.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${i}<span class="lbl">${l}</span></a>`).join("");
$("#searchIco").innerHTML = ico("search", 18); $("#qx").innerHTML = ico("x", 16); $("#dclose").innerHTML = ico("x", 20);
const q = $("#q"), view = $("#view");
const toast = (m) => { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.append(t); setTimeout(() => t.remove(), 2200); };
let splashDone = false;
const hideSplash = () => { if (splashDone) return; splashDone = true; $("#splash").classList.add("off"); setTimeout(() => $("#splash").remove(), 700); };
setTimeout(hideSplash, 5000);

/* ---------- Watchlist ---------- */
const WL = {
  all() { try { return JSON.parse(localStorage.getItem("anv:wl") || "[]"); } catch { return []; } },
  has(it) { return this.all().some((x) => x.k === it.k && x.id === it.id); },
  toggle(it) {
    const a = this.all(), i = a.findIndex((x) => x.k === it.k && x.id === it.id);
    if (i >= 0) a.splice(i, 1); else a.unshift({ k: it.k, id: it.id, title: it.title, p: it.p, poster: it.poster, type: it.type, year: it.year, slug: it.slug, country: it.country, media: it.media, sub: it.sub, status: it.status });
    try { localStorage.setItem("anv:wl", JSON.stringify(a)); } catch { toast("Storage is blocked in this browser"); }
    return i < 0;
  },
};
const wlBtn = (it, after) => {
  const b = document.createElement("button"); b.className = "wl";
  const paint = () => { const on = WL.has(it); b.classList.toggle("on", on); b.innerHTML = ico(on ? "check" : "plus", 18); b.setAttribute("aria-label", (on ? "Remove from" : "Add to") + " My List: " + it.title); b.title = on ? "In My List" : "Add to My List"; };
  b.onclick = (e) => { e.stopPropagation(); toast(WL.toggle(it) ? "Added to My List" : "Removed from My List"); paint(); after?.(); };
  paint(); return b;
};

/* ---------- Continue watching, search history, recently viewed ---------- */
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const CW = { all: () => lsGet("anv:cw", []), set: (a) => lsSet("anv:cw", a.slice(0, 12)) };
const RV = { all: () => lsGet("anv:rv", []), add(it) { const a = this.all().filter((x) => !(x.k === it.k && x.id === it.id)); a.unshift({ k: it.k, id: it.id, title: it.title }); lsSet("anv:rv", a.slice(0, 10)); } };
let lastRec = "";
const SH = {
  all: () => lsGet("anv:s", {}),
  save(o) { const e = Object.entries(o); if (e.length > 60) { e.sort((a, b) => b[1].c - a[1].c || b[1].t - a[1].t); o = Object.fromEntries(e.slice(0, 40)); } lsSet("anv:s", o); },
  rec(term) { // count a search; collapse partial typing ("ave" then "avengers") into one
    term = String(term).toLowerCase().trim().replace(/\s+/g, " "); if (term.length < 3) return;
    const o = this.all();
    if (lastRec && lastRec !== term && term.startsWith(lastRec) && o[lastRec] && --o[lastRec].c <= 0) delete o[lastRec];
    const e = o[term] || { c: 0, t: 0 }; e.c++; e.t = Date.now(); o[term] = e; lastRec = term; this.save(o);
  },
  top(n) { return Object.entries(this.all()).sort((a, b) => b[1].c - a[1].c || b[1].t - a[1].t).slice(0, n).map(([t, v]) => ({ t, c: v.c })); },
  recent(n) { return Object.entries(this.all()).sort((a, b) => b[1].t - a[1].t).slice(0, n).map(([t, v]) => ({ t, c: v.c })); },
  clear() { try { localStorage.removeItem("anv:s"); } catch {} },
};
const rmBtn = (it) => {
  const b = document.createElement("button"); b.className = "wl"; b.innerHTML = ico("x", 16); b.setAttribute("aria-label", "Remove from Continue watching: " + it.title); b.title = "Remove";
  b.onclick = (e) => { e.stopPropagation(); CW.set(CW.all().filter((x) => !(x.k === it.k && x.id === it.id))); const c = b.closest(".card"), sec = c?.closest("section"); c?.remove(); if (sec && !sec.querySelector(".card")) sec.remove(); };
  return b;
};

/* ---------- Cards & rows ---------- */
const isSeriesT = (it) => it.k === "title" && /series|tv|^2$/i.test(it.type || "");
const isMedia = (it) => it.k === "title" || it.k === "anime";
const art = (it, cls = "art") => {
  const ph = () => { const d = document.createElement("div"); d.className = "ph"; d.textContent = it.title; return d; };
  if (!it.poster) return ph();
  const i = new Image(); i.className = cls; i.loading = "lazy"; i.alt = ""; i.referrerPolicy = "no-referrer"; i.src = it.poster; i.onerror = () => i.replaceWith(ph()); return i;
};
const sub = (it) => it.k === "title" ? [it.year, isSeriesT(it) ? "Show" : "Movie"].filter(Boolean).join(" · ") : it.k === "anime" ? "Anime" : it.k === "sport" ? [it.sub, it.status].filter(Boolean).join(" · ") : (it.country ? it.country.toUpperCase() + " · " : "") + "Live TV";
const open = (it) => (isMedia(it) ? openDetail(it) : openPlayer(it));
function card(it, onWL) {
  const c = document.createElement("div"); c.className = "card " + (isMedia(it) ? "p" : "l"); c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", it.title);
  c.append(art(it));
  const pl = document.createElement("div"); pl.className = "play"; pl.innerHTML = `<span>${ico("play", 22)}</span>`; c.append(pl);
  if (it.k === "ch1" || it.k === "ch2" || it.live || (it.k === "sport" && /live|progress|ongoing|play/i.test(it.status))) { const l = document.createElement("span"); l.className = "live"; l.textContent = "LIVE"; c.append(l); }
  c.append(it.resume ? rmBtn(it) : wlBtn(it, () => onWL?.(c)));
  if (it.pct) { const pb = document.createElement("div"); pb.className = "pbar"; pb.innerHTML = `<i style="width:${Math.round(it.pct)}%"></i>`; c.append(pb); }
  const cap = document.createElement("div"); cap.className = "cap"; cap.innerHTML = `<b>${esc(it.title)}</b><span>${esc(it.resume?.label || sub(it))}</span>`; c.append(cap);
  c.onclick = () => (it.resume ? openPlayer(it, it.resume) : open(it)); c.onkeydown = (e) => { if (e.key === "Enter") open(it); };
  return c;
}
const sks = (n) => '<div class="sk"></div>'.repeat(n);
function autoScroll(row, dir) { // dir 1: content drifts left, -1: drifts right. Bounces at the ends.
  if (RM.matches) return;
  row.style.scrollSnapType = "none";
  const max = () => row.scrollWidth - row.clientWidth;
  if (dir < 0) row.scrollLeft = max();
  let pos = null, paused = false, vis = false, last = 0, d = dir, resume;
  const stop = () => { paused = true; clearTimeout(resume); }, go = () => { clearTimeout(resume); resume = setTimeout(() => { paused = false; pos = null; }, 2500); };
  ["pointerenter", "pointerdown", "focusin", "touchstart", "wheel"].forEach((ev) => row.addEventListener(ev, stop, { passive: true }));
  ["pointerleave", "touchend", "focusout"].forEach((ev) => row.addEventListener(ev, go, { passive: true }));
  new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(row);
  const tick = (t) => {
    if (!row.isConnected) return;
    if (vis && !paused && !document.hidden && max() > 0) {
      if (pos === null) pos = row.scrollLeft;
      pos += d * 0.045 * (Math.min(50, t - last) || 16); // about 45px per second
      const m = max(); if (pos >= m) { pos = m; d = -1; } else if (pos <= 0) { pos = 0; d = 1; }
      row.scrollLeft = pos;
    }
    last = t; requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function mkRow(title, params, o = {}) {
  const s = document.createElement("section"); s.className = "sec";
  s.innerHTML = `<h3>${esc(title)}</h3><div class="rowwrap"><button class="arr l" aria-label="Scroll left">${ico("left")}</button><div class="row">${sks(8)}</div><button class="arr r" aria-label="Scroll right">${ico("right")}</button></div>`;
  const row = s.querySelector(".row");
  s.querySelector(".l").onclick = () => row.scrollBy({ left: -row.clientWidth * 0.8, behavior: "smooth" });
  s.querySelector(".r").onclick = () => row.scrollBy({ left: row.clientWidth * 0.8, behavior: "smooth" });
  const fill = (items) => {
    if (o.filter) items = items.filter(o.filter);
    row.innerHTML = ""; if (!items.length) { s.remove(); return; }
    items.forEach((i) => { if (params?.s === "sports-live") i.live = true; row.append(card(i)); });
    o.onItems?.(items); if (o.auto) autoScroll(row, o.auto);
  };
  const load = () => {
    row.innerHTML = sks(8);
    getBrowse(params).then((d) => fill(d.items)).catch((e) => {
      if (o.optional) { s.remove(); return; }
      row.innerHTML = `<p class="msg">Couldn’t load this row (${esc(e.message)}). <button class="chip" type="button">Retry</button></p>`; row.querySelector("button").onclick = load;
    }).finally(hideSplash);
  };
  if (o.items) fill(o.items); else load();
  return s;
}

/* ---------- Views ---------- */
function startHero(hero, list) {
  hero.innerHTML = `<button class="hnav l" aria-label="Previous slide">${ico("left")}</button><button class="hnav r" aria-label="Next slide">${ico("right")}</button><div class="dots"></div>`;
  const dots = hero.querySelector(".dots"), slides = []; let idx = 0, paused = false, vis = true, x0 = null;
  list.forEach((it, i) => {
    const sl = document.createElement("div"); sl.className = "slide"; sl.style.setProperty("--art", cssUrl(it.poster));
    sl.innerHTML = `<img src="${esc(it.poster)}" alt="" referrerpolicy="no-referrer"><span class="tag">${esc(it.tag)}</span><h2>${esc(it.title)}</h2><div class="meta"><span class="pill">${esc(sub(it))}</span>${it.rating ? `<span class="pill">★ ${esc(it.rating)}</span>` : ""}</div><div class="actions"></div>`;
    const a = sl.querySelector(".actions");
    const play = document.createElement("button"); play.className = "btn"; play.innerHTML = ico("play", 18) + " Play"; play.onclick = () => (isSeriesT(it) ? openDetail(it) : openPlayer(it));
    const more = document.createElement("button"); more.className = "btn ghost"; more.innerHTML = ico("info", 18) + " More info"; more.onclick = () => openDetail(it);
    const w = wlBtn(it); w.style.cssText = "position:static;width:44px;height:44px"; a.append(play, more, w);
    hero.insertBefore(sl, dots.previousElementSibling && dots); slides.push(sl);
    const d = document.createElement("button"); d.setAttribute("aria-label", "Show slide " + (i + 1)); d.onclick = () => go(i); dots.append(d);
  });
  const go = (n) => { idx = (n + slides.length) % slides.length; slides.forEach((x, i) => { x.classList.toggle("on", i === idx); x.setAttribute("aria-hidden", i !== idx); }); [...dots.children].forEach((d, i) => d.setAttribute("aria-current", i === idx)); };
  hero.querySelector(".l").onclick = () => go(idx - 1); hero.querySelector(".r").onclick = () => go(idx + 1); go(0);
  if (!RM.matches) heroT = setInterval(() => { if (!paused && vis && !document.hidden) go(idx + 1); }, 6000);
  ["pointerenter", "focusin"].forEach((ev) => hero.addEventListener(ev, () => (paused = true)));
  ["pointerleave", "focusout"].forEach((ev) => hero.addEventListener(ev, () => (paused = false)));
  new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(hero);
  hero.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  hero.addEventListener("pointerup", (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1)); });
}
function viewHome(root) {
  root.innerHTML = `<section class="hero" id="hero" aria-roledescription="carousel" aria-label="Latest releases"><div class="dsk" style="margin:2rem;width:50%"></div></section>`;
  const hero = $("#hero");
  Promise.allSettled([getBrowse({ s: "latest-movies" }), getBrowse({ s: "latest-series" }), getBrowse({ s: "trending" })]).then(([m, sr, t]) => {
    const pick = (r, n) => (r.value?.items || []).filter((i) => i.poster).slice(0, n);
    const a = pick(m, 4), b = pick(sr, 4); let list = [];
    for (let i = 0; i < 4; i++) { if (a[i]) list.push({ ...a[i], tag: "NEW · LATEST MOVIE" }); if (b[i]) list.push({ ...b[i], tag: "NEW · LATEST SHOW" }); }
    if (list.length < 3) list = list.concat(pick(t, 5).map((i) => ({ ...i, tag: "TRENDING" })));
    if (!list.length) { hero.remove(); return; }
    startHero(hero, list);
  }).finally(hideSplash);
  const add = (...a) => root.append(mkRow(...a));
  const cw = CW.all().map((x) => ({ k: x.k, id: x.id, p: x.p, title: x.title, poster: x.poster, type: x.type, year: x.year, slug: x.slug, pct: x.dur ? Math.min(100, (x.pos / x.dur) * 100) : 0, resume: { se: x.se, ep: x.ep, max: x.max, label: x.label, type: x.audio } }));
  if (cw.length) add("Continue watching", null, { items: cw });
  add("Latest movies", { s: "latest-movies" }, { auto: -1 });
  add("Latest shows", { s: "latest-series" }, { auto: 1 });
  const top = SH.top(8);
  if (top.length) {
    const sec = document.createElement("section"); sec.className = "sec"; sec.innerHTML = `<h3>Your most searched</h3><div class="tabs" style="padding:0"></div>`;
    top.forEach(({ t, c }) => { const b = document.createElement("button"); b.className = "chip"; b.innerHTML = `${ico("search", 14)}<span>${esc(t)}</span><small>×${c}</small>`; b.onclick = () => { q.value = t; SH.rec(t); runSearch(); }; sec.lastChild.append(b); });
    root.append(sec);
  }
  top.slice(0, 2).forEach(({ t }) => add(`Because you searched “${t}”`, { q: t }, { optional: 1 }));
  add("Trending now", { s: "trending" });
  add("Live sports", { s: "sports-live" }, { optional: 1 });
  add("Live TV", { s: "tv-ke" }, { optional: 1 });
  add("Popular movies", { s: "popular-movies" });
  add("Popular shows", { s: "popular-series" });
  const rv = RV.all()[0];
  if (rv) { const w = rv.title.split(/\s+/).slice(0, 2).join(" "); if (w.length >= 3) add(`Because you watched ${rv.title}`, { q: w }, { optional: 1, filter: (i) => i.id !== rv.id }); }
  add("Coming soon", { s: "upcoming" }, { optional: 1 });
}

const VIEWS = {
  movies: { t: "Movies", tabs: [["Popular", { s: "popular-movies" }], ["Latest", { s: "latest-movies" }], ["Upcoming", { s: "upcoming" }]], chips: ["genres", "genre", "Genres"], paged: 1 },
  series: { t: "Shows", tabs: [["Popular", { s: "popular-series" }], ["Latest", { s: "latest-series" }]], chips: ["categories", "category", "Categories"], paged: 1 },
  anime: { t: "Anime", tabs: ["One Piece", "Naruto", "Bleach", "Jujutsu Kaisen", "Demon Slayer", "Attack on Titan", "Dragon Ball", "Black Clover", "Solo Leveling"].map((n) => [n, { anime: n }]) },
  live: { t: "Live TV", tabs: [["Kenya", { s: "tv-ke" }]], chips: ["countries", "country", "More countries"] },
  sports: { t: "Live Sports", tabs: [["Live now", { s: "sports-live" }], ["Today", { s: "sports-today" }], ["Replays", { s: "sports-replays" }]] },
};
function viewGrid(name, root) {
  const c = VIEWS[name]; let tab = 0, chip = null, page = 1, busy = 0; const seen = new Set();
  root.innerHTML = `<div class="tabs" id="tb"></div>${c.chips ? `<div class="tabs chips" id="cp" aria-label="${c.chips[2]}"></div>` : ""}<section class="sec"><div class="grid" id="gd"></div><p class="msg" id="gm"></p><button class="btn ghost more" id="mr" hidden>Load more</button></section>`;
  const gd = $("#gd"), gm = $("#gm"), mr = $("#mr");
  const paint = () => { [...$("#tb").children].forEach((b, i) => b.setAttribute("aria-pressed", !chip && i === tab)); [...($("#cp")?.children || [])].forEach((b) => b.setAttribute("aria-pressed", b.dataset.s === chip)); };
  c.tabs.forEach(([l], i) => { const b = document.createElement("button"); b.className = "chip"; b.textContent = l; b.onclick = () => { tab = i; chip = null; paint(); load(true); }; $("#tb").append(b); });
  async function load(reset) {
    const my = ++busy; if (reset) { page = 1; seen.clear(); gd.innerHTML = sks(12); gm.textContent = ""; mr.hidden = true; }
    const p = chip ? { [c.chips[1]]: chip } : { ...c.tabs[tab][1] }; if (c.paged) p.page = page;
    try {
      const d = await api("/api/browse", p); if (my !== busy) return; if (reset) gd.innerHTML = "";
      gd.classList.toggle("land", ["sport", "ch1", "ch2"].includes(d.kind));
      const fresh = d.items.filter((i) => !seen.has(i.k + i.id)); fresh.forEach((i) => { seen.add(i.k + i.id); if (p.s === "sports-live") i.live = true; gd.append(card(i)); });
      gm.textContent = seen.size ? "" : name === "sports" ? "No matches with streams right now. Check back soon." : "Nothing here yet."; mr.hidden = !(c.paged && fresh.length >= 8);
    } catch (e) { if (my !== busy) return; if (reset) gd.innerHTML = ""; gm.textContent = `Couldn’t load (${e.message}).`; }
  }
  mr.onclick = () => { page++; load(false); };
  if (c.chips) api("/api/browse", { s: c.chips[0] }).then((d) => d.items.slice(0, 80).forEach((x) => { const b = document.createElement("button"); b.className = "chip"; b.textContent = x.name; b.dataset.s = x.slug; b.onclick = () => { chip = chip === x.slug ? null : x.slug; paint(); load(true); }; $("#cp").append(b); })).catch(() => $("#cp")?.remove());
  paint(); load(true);
}

let qSeq = 0;
async function viewSearch(root) {
  const v = q.value.trim(), my = ++qSeq;
  if (v.length < 2) { root.innerHTML = `<div class="empty">${ico("search", 48)}<p>Type at least two letters to search.</p></div>`; return; }
  root.innerHTML = `<section class="sec"><h3>Results for “${esc(v)}”</h3><div class="grid" id="gd">${sks(10)}</div></section><div id="an"></div>`;
  const [a, b] = await Promise.allSettled([getBrowse({ q: v }), getBrowse({ anime: v })]);
  if (my !== qSeq) return;
  const gd = $("#gd"); gd.innerHTML = ""; const t = a.value?.items || [], an = b.value?.items || [];
  t.forEach((i) => gd.append(card(i)));
  if (an.length) { $("#an").innerHTML = '<section class="sec"><h3>Anime</h3><div class="grid" id="ga"></div></section>'; an.forEach((i) => $("#ga").append(card(i))); }
  if (!t.length && !an.length) gd.outerHTML = `<div class="empty">${ico("search", 48)}<p>${a.status === "rejected" ? `Search failed (${esc(a.reason.message)}).` : `No results for “${esc(v)}”. Try another spelling.`}</p></div>`;
  // related suggestions from what this user searches most
  const shown = new Set([...t, ...an].map((i) => i.id)), low = v.toLowerCase();
  const rel = SH.top(6).map((x) => x.t).find((x) => !(x.includes(low) || low.includes(x)));
  root.append(rel ? mkRow(`You may also like · because you searched “${rel}”`, { q: rel }, { filter: (i) => !shown.has(i.id), optional: 1 }) : mkRow("Trending now", { s: "trending" }, { filter: (i) => !shown.has(i.id), optional: 1 }));
}
function viewList(root = view) {
  const items = WL.all();
  if (!items.length) { root.innerHTML = `<div class="empty">${ico("list", 56)}<h3>Your list is empty</h3><p>Tap the + on any title, show, channel or match to save it here.</p></div>`; return; }
  root.innerHTML = `<section class="sec"><div class="grid" id="gd"></div></section>`;
  items.forEach((i) => $("#gd").append(card(i, (c) => { c.remove(); if (!$("#gd").children.length) viewList(); })));
}

/* ---------- Router ---------- */
let prev = "home";
const route = () => (location.hash.slice(1) || "home");
function render() {
  const r = route(), root = view; qSeq++; clearInterval(heroT);
  document.querySelectorAll("#nav a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.r === r) || a.removeAttribute("aria-current"));
  document.querySelectorAll("#nav a[aria-current]").forEach((a) => a.setAttribute("aria-current", "page"));
  $("#title").textContent = r === "search" ? "Search" : (NAV.find((n) => n[0] === r) || ["", "Home"])[1];
  if (r !== "search" && q.value) { q.value = ""; $("#qx").hidden = true; }
  const run = () => { root.innerHTML = ""; window.scrollTo(0, 0); if (r === "search") viewSearch(root); else if (r === "list") viewList(root); else if (VIEWS[r]) viewGrid(r, root); else viewHome(root); if (r !== "home") hideSplash(); };
  document.startViewTransition ? document.startViewTransition(run) : run();
}
addEventListener("hashchange", render);
const sg = $("#sg"); let qT, sT, sgi = -1;
const sgOpts = () => [...sg.querySelectorAll(".sgo")];
const hideSg = () => { sg.hidden = true; sgi = -1; };
function showSg() {
  const v = q.value.trim().toLowerCase(); let h = "";
  const row = (t, c, i) => `<button class="sgo" type="button" role="option" data-t="${esc(t)}">${ico(i, 16)}<span>${esc(t)}</span>${c ? `<small>×${c}</small>` : ""}</button>`;
  if (!v) {
    const top = SH.top(6), rec = SH.recent(5).filter((r) => !top.some((t) => t.t === r.t));
    if (top.length) h += `<div class="sgh">Your top searches</div>` + top.map((t) => row(t.t, t.c, "fire")).join("");
    if (rec.length) h += `<div class="sgh">Recent</div>` + rec.map((r) => row(r.t, 0, "clock")).join("");
    if (h) h += `<button class="sgc" type="button" data-clear>Clear search history</button>`;
  } else {
    const all = SH.all(); h = Object.keys(all).filter((t) => t.includes(v) && t !== v).sort((a, b) => all[b].c - all[a].c).slice(0, 6).map((t) => row(t, all[t].c, "clock")).join("");
  }
  sg.innerHTML = h; sg.hidden = !h; sgi = -1;
}
function runSearch() {
  clearTimeout(qT); const v = q.value.trim(); $("#qx").hidden = !v; hideSg(); if (v.length < 2) return;
  if (route() === "search") viewSearch(view); else { prev = route(); location.hash = "search"; }
}
q.addEventListener("input", () => {
  clearTimeout(qT); clearTimeout(sT); const v = q.value.trim(); $("#qx").hidden = !v; showSg();
  if (!v) { if (route() === "search") location.hash = prev; return; }
  if (v.length < 2) return;
  qT = setTimeout(runSearch, 350); sT = setTimeout(() => SH.rec(v), 1500); // counts as a real search once you pause
});
q.addEventListener("focus", showSg); q.addEventListener("blur", () => setTimeout(hideSg, 150));
sg.addEventListener("mousedown", (e) => e.preventDefault());
sg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.hasAttribute("data-clear")) { SH.clear(); showSg(); return; } q.value = b.dataset.t; SH.rec(b.dataset.t); runSearch(); });
q.addEventListener("keydown", (e) => {
  const o = sgOpts();
  if ((e.key === "ArrowDown" || e.key === "ArrowUp") && o.length) { e.preventDefault(); sgi = (sgi + (e.key === "ArrowDown" ? 1 : -1) + o.length) % o.length; o.forEach((x, i) => x.setAttribute("aria-selected", i === sgi)); }
  else if (e.key === "Enter") { e.preventDefault(); clearTimeout(sT); if (sgi >= 0 && o[sgi]) q.value = o[sgi].dataset.t; if (q.value.trim().length >= 2) SH.rec(q.value); runSearch(); }
  else if (e.key === "Escape") { if (!sg.hidden) { hideSg(); return; } q.value = ""; q.dispatchEvent(new Event("input")); q.blur(); }
});
$("#qx").onclick = () => { q.value = ""; q.dispatchEvent(new Event("input")); q.focus(); };
addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); q.focus(); } });

/* ---------- Detail ---------- */
const dlg = $("#detail"), box = $("#dbox"); let dTok = 0;
$("#dclose").onclick = () => dlg.close();
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
async function openDetail(it) {
  const tok = ++dTok;
  box.innerHTML = `<div class="dhero"><div class="ph" style="width:190px">${esc(it.title)}</div><div style="flex:1"><h2>${esc(it.title)}</h2><div class="dsk" style="width:60%"></div><div class="dsk"></div><div class="dsk" style="width:85%"></div></div></div>`;
  showD(dlg); RV.add(it);
  let d = {}; try { d = await api("/api/detail", { k: it.k, id: it.id, slug: it.slug || "", p: it.p || "", title: it.title, year: it.year || "" }); } catch (e) { d = { error: e.message }; }
  if (tok === dTok && dlg.open) renderDetail(it, d);
}
function renderDetail(it, d) {
  const seasons = d.seasons || [], series = seasons.length > 0 || isSeriesT(it) || it.k === "anime";
  const metas = [it.year || d.year, d.runtime, d.rating && "★ " + d.rating, ...(d.genres || [])].filter(Boolean);
  box.innerHTML = `<div class="dhero">${it.poster ? `<img src="${esc(it.poster)}" alt="" referrerpolicy="no-referrer">` : `<div class="ph">${esc(it.title)}</div>`}<div><h2>${esc(d.title || it.title)}</h2><div class="meta">${metas.map((m) => `<span class="pill">${esc(m)}</span>`).join("")}</div>${d.overview ? `<p class="over">${esc(d.overview)}</p>` : d.error ? `<p class="msg">More details aren’t available right now (${esc(d.error)}).</p>` : ""}<div class="actions" id="dA"></div></div></div><div class="dbody" id="dB"></div>`;
  if (it.poster) box.querySelector(".dhero").style.setProperty("--art", cssUrl(it.poster));
  const A = $("#dA"), B = $("#dB");
  const play = document.createElement("button"); play.className = "btn red"; play.innerHTML = ico("play", 18) + (series ? " Play first episode" : " Play");
  const s0 = seasons[0], e0 = s0?.eps[0];
  play.onclick = () => (series ? (e0 ? playEp(s0, e0) : openPlayer(it, { se: 1, ep: 1 })) : openPlayer(it));
  const wl = document.createElement("button"); wl.className = "btn ghost";
  const paint = () => (wl.innerHTML = WL.has(it) ? ico("check", 18) + " In My List" : ico("plus", 18) + " My List");
  wl.onclick = () => { toast(WL.toggle(it) ? "Added to My List" : "Removed from My List"); paint(); if (route() === "list") viewList(); }; paint();
  const shr = document.createElement("button"); shr.className = "btn ghost"; shr.setAttribute("aria-label", "Share"); shr.innerHTML = ico("share", 18);
  shr.onclick = async () => { try { if (navigator.share) await navigator.share({ title: it.title, text: `Watch ${it.title} on ANONYVERSE`, url: location.origin }); else { await navigator.clipboard.writeText(location.origin); toast("Link copied"); } } catch {} };
  A.append(play, wl, shr);
  let type = "sub";
  const playEp = (s, e) => openPlayer(it, { se: it.k === "anime" ? undefined : s.se, ep: e.n, type, max: s.eps[s.eps.length - 1].n, label: epLabel(it.k, s.se, e.n) });
  if (d.cast?.length) {
    B.insertAdjacentHTML("beforeend", `<h4>Cast</h4><div class="cast">${d.cast.map((p) => `<div class="who">${p.image ? `<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}" referrerpolicy="no-referrer">` : `<i>${esc(p.name[0])}</i>`}<b>${esc(p.name)}</b><span>${esc(p.character)}</span></div>`).join("")}</div>`);
    B.querySelectorAll(".who img").forEach((im) => (im.onerror = () => { const i = document.createElement("i"); i.textContent = im.alt[0] || "?"; im.replaceWith(i); }));
  }
  if (series) {
    B.insertAdjacentHTML("beforeend", `<h4>Episodes</h4><div class="eph" id="eph"></div><div class="eps" id="eps"></div>`);
    if (!seasons.length) {
      $("#eph").innerHTML = `<label>Season <input id="fs" type="number" min="1" value="1" style="width:4.5rem"></label> <label>Episode <input id="fe" type="number" min="1" value="1" style="width:4.5rem"></label> <button class="btn red" id="fg">Play</button>`;
      $("#fg").onclick = () => openPlayer(it, { se: +$("#fs").value || 1, ep: +$("#fe").value || 1, label: `S${$("#fs").value || 1} · E${$("#fe").value || 1}` });
      $("#eps").innerHTML = `<p class="msg">Episode list isn’t available for this title, so pick a season and episode above.</p>`; return;
    }
    const sel = document.createElement("select"); sel.setAttribute("aria-label", "Season");
    sel.innerHTML = seasons.map((s, i) => `<option value="${i}">${it.k === "anime" ? "Episodes" : "Season " + s.se} (${s.eps.length})</option>`).join(""); if (seasons.length > 1 || it.k !== "anime") $("#eph").append(sel);
    if (it.k === "anime" && d.hasDub) { const t = document.createElement("select"); t.setAttribute("aria-label", "Audio"); t.innerHTML = '<option value="sub">Subbed</option><option value="dub">Dubbed</option>'; t.onchange = () => (type = t.value); $("#eph").append(t); }
    const draw = () => { const s = seasons[+sel.value]; $("#eps").innerHTML = ""; s.eps.forEach((e) => { const b = document.createElement("button"); b.className = "ep"; b.innerHTML = `<span class="n">${e.n}</span>${e.image ? `<img class="th" loading="lazy" src="${esc(e.image)}" alt="" referrerpolicy="no-referrer">` : `<span class="th">${ico("play", 22)}</span>`}<div><b>${esc(e.title || "Episode " + e.n)}</b>${e.overview ? `<small>${esc(e.overview)}</small>` : ""}</div>`; b.onclick = () => playEp(s, e); $("#eps").append(b); }); };
    sel.onchange = draw; draw();
  }
}

/* ---------- Player ---------- */
const pl = $("#player"), vid = $("#vid"), frm = $("#frm"), st = $("#status"), ld = $("#ld"), pb = $("#playBtn");
let stallT, stalls = 0, lastS, nextT, cur = null, timer = null, hls = null, recovering = false, fails = 0, lastSave = 0;
const pkey = () => `anv:p:${cur.k}:${cur.id}:${cur.se || 0}-${cur.ep || 0}`;
const store = { get(k) { try { return +localStorage.getItem(k) || 0; } catch { return 0; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
const resumable = () => cur && (cur.k === "title" || cur.k === "anime");
const cwOf = () => ({ k: cur.k, id: cur.id, p: cur.p, title: cur.title, poster: cur.poster, type: cur.type, year: cur.year, slug: cur.slug, se: cur.se, ep: cur.ep, max: cur.max, label: cur.label, audio: cur.audio });
const epLabel = (k, se, ep) => `${k === "anime" ? "" : "S" + se + " · "}E${ep}`;
function saveProg() { // remembers position + feeds the Continue watching row
  if (!resumable()) return; const pos = vid.currentTime, dur = vid.duration; store.set(pkey(), pos);
  if (!isFinite(dur) || pos < 10) return;
  const a = CW.all().filter((x) => !(x.k === cur.k && x.id === cur.id)); if (dur - pos > 45) a.unshift({ ...cwOf(), pos, dur }); CW.set(a);
}
function armStall() { // if nothing loads for 15s, ask the server for the next provider
  clearTimeout(stallT); if (!lastS || lastS.type === "embed") return;
  stallT = setTimeout(() => {
    if (!cur || vid.readyState >= 2) return;
    if (++stalls > 2) { ld.classList.add("off"); st.textContent = "This source isn’t responding. Try a lower quality, another title, or tap Report."; return; }
    (cur.skip ||= []).push(lastS.provider); st.textContent = "Source is slow, trying another…"; refresh();
  }, 15000);
}
function openPlayer(it, o = {}) {
  cur = { ...it, se: o.se, ep: o.ep, audio: o.type || "sub", max: o.max, label: o.label }; fails = 0; stalls = 0; clearTimeout(stallT); pb.hidden = true; clearTimeout(nextT); if (isMedia(it)) RV.add(it);
  $("#pTitle").textContent = it.title; $("#pMeta").textContent = [o.label, sub(it)].filter(Boolean).join(" · ");
  $("#res").hidden = $("#dl").hidden = it.k !== "title"; $("#next").hidden = !(o.max && o.ep < o.max);
  showD(pl); refresh(resumable() ? store.get(pkey()) : 0);
}
async function fetchPlay() {
  if (cur.k === "sport") { if (!cur.media) throw new Error("No live stream is available for this match yet"); return { url: cur.media, type: /m3u8|hls/i.test(cur.media) ? "hls" : "file" }; }
  const p = { k: cur.k, id: cur.id, p: cur.p || "", title: cur.title, year: cur.year || "" }; if (cur.skip?.length) p.skip = cur.skip.join(","); if (cur.k === "title") p.resolution = $("#res").value;
  if (cur.se) p.se = cur.se; if (cur.ep) p.ep = cur.ep; if (cur.k === "anime") p.type = cur.audio; if (cur.country) p.country = cur.country;
  return api("/api/play", p);
}
function clean() { hls?.destroy(); hls = null; clearTimeout(timer); }
function setSource(s, pos, play) {
  hls?.destroy(); hls = null; st.textContent = "";
  if (s.type === "embed") { vid.pause(); vid.hidden = true; frm.hidden = false; frm.onload = () => ld.classList.add("off"); frm.src = s.url; return; }
  frm.hidden = true; frm.removeAttribute("src"); vid.hidden = false;
  vid.addEventListener("loadedmetadata", () => { if (pos > 0 && isFinite(vid.duration) && pos < vid.duration - 2) vid.currentTime = pos; if (play) vid.play().catch(() => { pb.innerHTML = ico("play", 18) + " Tap to play"; pb.hidden = false; ld.classList.add("off"); }); }, { once: true });
  if (s.type === "hls" && !vid.canPlayType("application/vnd.apple.mpegurl") && window.Hls?.isSupported()) {
    hls = new Hls(); hls.loadSource(s.url); hls.attachMedia(vid); hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) onFail(); });
  } else { vid.src = s.url; vid.load(); }
}
async function refresh(resumeAt) {
  if (recovering || !cur) return; recovering = true;
  const pos = resumeAt ?? (vid.currentTime || 0), play = resumeAt != null ? true : !vid.paused;
  ld.classList.remove("off"); st.textContent = "Loading stream…";
  try {
    const s = await fetchPlay(); clearTimeout(timer);
    if (s.expiresIn) timer = setTimeout(() => refresh(), Math.max(30, s.expiresIn - 90) * 1000); // refresh ~90s before expiry
    lastS = s; setSource(s, pos, play); armStall();
  } catch (e) { ld.classList.add("off"); st.textContent = `Couldn’t start playback (${e.message}).`; }
  finally { recovering = false; }
}
function onFail() { if (!cur || !(vid.getAttribute("src") || hls)) return;
  if (lastS && lastS.type === "file" && !lastS.triedHls && window.Hls?.isSupported() && /m3u8|manifest|playlist/i.test(lastS.url)) { lastS.triedHls = true; setSource({ url: lastS.url, type: "hls" }, 0, true); return; } if (++fails > 3) { ld.classList.add("off"); st.textContent = "Playback keeps failing. Try another quality or title."; return; } if (fails >= 2 && lastS?.provider) (cur.skip ||= []).push(lastS.provider); refresh(); }
vid.addEventListener("error", onFail);
vid.addEventListener("playing", () => { fails = 0; stalls = 0; clearTimeout(stallT); ld.classList.add("off"); pb.hidden = true; st.textContent = ""; });
vid.addEventListener("waiting", () => ld.classList.remove("off"));
vid.addEventListener("canplay", () => ld.classList.add("off"));
vid.addEventListener("timeupdate", () => { if (!resumable() || Date.now() - lastSave < 5000) return; lastSave = Date.now(); saveProg(); });
vid.addEventListener("ended", () => {
  if (!resumable()) return; store.del(pkey());
  const a = CW.all().filter((x) => !(x.k === cur.k && x.id === cur.id));
  if (cur.max && cur.ep < cur.max) { const ep = cur.ep + 1; a.unshift({ ...cwOf(), ep, label: epLabel(cur.k, cur.se, ep), pos: 0, dur: 0 }); st.textContent = "Next episode starting…"; clearTimeout(nextT); nextT = setTimeout(() => !$("#next").hidden && $("#next").click(), 3500); }
  CW.set(a);
});
pb.onclick = () => { pb.hidden = true; vid.play().catch(() => refresh()); };
$("#res").onchange = () => refresh();
$("#next").onclick = () => { clearTimeout(nextT); if (!vid.ended) saveProg(); cur.ep++; cur.label = epLabel(cur.k, cur.se, cur.ep); $("#pMeta").textContent = [cur.label, sub(cur)].filter(Boolean).join(" · "); $("#next").hidden = !(cur.max && cur.ep < cur.max); refresh(store.get(pkey())); };
$("#dl").onclick = async () => { try { const s = await api("/api/play", { k: cur.k, id: cur.id, resolution: $("#res").value, se: cur.se || "", ep: cur.ep || "", download: 1 }); location.href = s.url; } catch (e) { st.textContent = `Download failed (${e.message}).`; } };
$("#pip").onclick = () => document.pictureInPictureEnabled && !vid.hidden && vid.requestPictureInPicture().catch(() => {});
const closePlayer = () => pl.close();
$("#pclose").onclick = closePlayer; pl.addEventListener("click", (e) => { if (e.target === pl) closePlayer(); });
pl.addEventListener("close", () => { clearTimeout(nextT); clearTimeout(stallT); if (cur && vid.currentTime > 5) saveProg(); cur = null; clean(); vid.pause(); vid.removeAttribute("src"); vid.load(); frm.removeAttribute("src"); frm.hidden = true; vid.hidden = false; });

/* ---------- Extras: back button, footer, offline, install ---------- */
let skipBack = 0, ignorePop = 0; // the phone Back button closes the player/details first
function showD(d) { if (!d.open) { d.showModal(); history.pushState({ d: 1 }, ""); } }
[dlg, pl].forEach((d) => d.addEventListener("close", () => { if (skipBack > 0) { skipBack--; return; } ignorePop++; history.back(); }));
addEventListener("popstate", () => { if (ignorePop > 0) { ignorePop--; return; } if (pl.open) { skipBack++; pl.close(); } else if (dlg.open) { skipBack++; dlg.close(); } });
$("#pxx").innerHTML = ico("x", 20); $("#pxx").onclick = closePlayer;
$("#foot").innerHTML = `<span>© ${new Date().getFullYear()} ANONYVERSE</span><a href="/docs">Docs</a><a href="https://t.me/ANONYMIKEY" target="_blank" rel="noopener">${TG(16)} Developer</a><a href="https://t.me/anonymiketech1" target="_blank" rel="noopener">${TG(16)} Channel</a><a href="https://www.anonymiketech.space/" target="_blank" rel="noopener">${ico("globe", 16)} anonymiketech.space</a>`;
addEventListener("online", () => toast("Back online")); addEventListener("offline", () => toast("You’re offline"));
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

render();
})();
