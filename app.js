"use strict";
/* ============ core: store, data, router, shell ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const L = ["A", "B", "C", "D"];
const trl = s => String(s).toLocaleLowerCase("tr");
const fold = s => trl(s).replace(/[ıi̇]/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad2 = n => String(n).padStart(2, "0");
const fmt = (n, d = 1) => (n == null || isNaN(n)) ? "–" : Number(n).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });

const CATS = [
  { k: "fa", n: "Fonksiyonel Anatomi", w: 20 },
  { k: "fiz", n: "Egzersiz Fizyolojisi", w: 10 },
  { k: "ant", n: "Genel Antrenman Bilgisi ve Fitness", w: 30 },
  { k: "bes", n: "Beslenme", w: 10 },
  { k: "egi", n: "Eğitmenlik Becerileri", w: 10 },
  { k: "hiz", n: "Hizmet Anlayışı", w: 8 },
  { k: "olc", n: "Fitness Ölçüm ve Değerlendirme", w: 12 }
];
const CATN = Object.fromEntries(CATS.map(c => [c.k, c.n]));
/* which exam category each unit feeds */
const UCAT = { u01: "ant", u02: "fiz", u03: "fa", u04: "fiz", u05: "olc", u06: "ant", u07: "ant", u08: "egi", u09: "fa", u10: "ant", u11: "ant", u12: "ant", u13: "ant", u14: "fa", u15: "hiz", u16: "egi", u17: "bes", u18: "ant" };
const UCAT2 = { u08: "bes", u13: "fiz" };

/* ---------- persistent store (per browser) ---------- */
const KEY = "fcm-v1";
let ST = { read: {}, scroll: {}, uq: {}, ah: {}, wrong: {}, den: { st: [{}, {}, {}], done: [false, false, false], instant: false, t: [0, 0, 0] }, hist: [], last: null, theme: null, cards: {}, atq: { ok: 0, n: 0 }, star: {}, fk: {}, notes: {}, plan: {}, cfg: { fz: 1, goal: 40, exam: "" }, karma: {} };
try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) ST = Object.assign(ST, s); } catch (e) { }
ST.cfg = Object.assign({ fz: 1, goal: 40, exam: "" }, ST.cfg || {});
document.documentElement.style.setProperty("--fz", ST.cfg.fz);
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { } }, 150); }

/* ---------- theme ---------- */
function applyTheme() { if (ST.theme) document.documentElement.setAttribute("data-theme", ST.theme); else document.documentElement.removeAttribute("data-theme"); }
applyTheme();
$("#themeBtn").onclick = () => {
  const dark = ST.theme ? ST.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  ST.theme = dark ? "light" : "dark"; applyTheme(); save();
};

/* ---------- data loading (cached) ---------- */
const CACHE = {};
function getJSON(name) {
  if (!CACHE[name]) CACHE[name] = fetch("data/" + name + ".json").then(r => { if (!r.ok) throw new Error(name); return r.json(); }).catch(e => { delete CACHE[name]; throw e; });
  return CACHE[name];
}
let UNITS = [];
const unitsReady = getJSON("units").then(u => { UNITS = u; return u; });

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------- icons ---------- */
const IC = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M8 7h7"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  exam: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  atlas: '<circle cx="12" cy="5" r="2"/><path d="M12 7v6l-4 7M12 13l4 7M7 10l5-1 5 1"/>',
  proje: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  guide: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M7 10.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-5.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  wrong: '<path d="M6 6l12 12M18 6 6 18"/>',
  dict: '<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h6M8 13h4"/>',
  stats: '<path d="M4 20V12M10 20V6M16 20v-9M22 20H2"/><circle cx="16" cy="6" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  card: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v10"/>'
};
const icon = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

/* ---------- nav ---------- */
const NAV = [
  ["home", "Ana sayfa", "home", "Ana"],
  ["uniteler", "Konu anlatımı", "book", "Konular"],
  ["quiz", "Quiz merkezi", "quiz", "Quiz"],
  ["deneme", "Deneme sınavları", "exam", "Deneme"],
  ["atlas", "Hareket atlası", "atlas", "Atlas"],
  ["proje", "Bitirme projesi", "proje", "Proje"],
  ["ezber", "Ezber kartları", "card", null],
  ["sozluk", "Sözlük", "dict", null],
  ["rehber", "Final rehberi", "guide", null],
  ["istatistik", "İstatistik", "stats", null],
  ["ara", "Arama", "search", null],
  ["ayarlar", "Ayarlar ve yedek", "gear", null]
];
function navRoot(r) {
  if (/^u\d\d/.test(r)) return "uniteler";
  if (/^(quiz|test|kart|yanlis|karma|yildiz)/.test(r)) return "quiz";
  return r.split("-")[0];
}
function renderNav(route) {
  const root = navRoot(route);
  const rail = NAV.map(n => `<a href="#${n[0]}" class="${root === n[0] ? "on" : ""}">${icon(n[2])}<span>${n[1]}</span></a>`).join("");
  const um = route.match(/^u\d\d/);
  const units = UNITS.map(u => `<a href="#${u.k}" class="${ST.read[u.k] ? "done " : ""}${um && um[0] === u.k ? "on" : ""}"><i>${u.no}</i><span>${esc(shortT(u.t))}</span></a>`).join("");
  $("#rail").innerHTML = rail + `<div class="sec">Üniteler</div><div class="units">${units}</div>`;
  $("#tabbar").innerHTML = NAV.filter(n => n[3]).map(n => `<a href="#${n[0]}" class="${root === n[0] ? "on" : ""}">${icon(n[2], 22)}<span>${n[3]}</span></a>`).join("");
}
const shortT = t => t.length > 34 ? t.slice(0, 32).replace(/[ ,]+\S*$/, "") + "…" : t;

/* ---------- router ---------- */
const ROUTES = {};
let pendingScroll = null;
let leaveHook = null;
function go(r) { if (location.hash === "#" + r) route(); else location.hash = r; }
async function route() {
  if (leaveHook) { try { leaveHook(); } catch (e) { } leaveHook = null; }
  KEYS = null;
  let r = decodeURIComponent(location.hash.slice(1)) || "home";
  await unitsReady.catch(() => { });
  renderNav(r);
  const main = $("#main");
  let handler = null, arg = null;
  if (/^u\d\d(-ah|-quiz|-ozet)?$/.test(r)) { handler = ROUTES.unit; arg = r; }
  else {
    const base = r.split("-")[0];
    handler = ROUTES[base] || null; arg = r;
  }
  if (!handler) { handler = ROUTES.home; r = "home"; }
  main.innerHTML = '<div class="page"><div class="loading">Yükleniyor…</div></div>';
  try { await handler(arg, main); }
  catch (e) { console.error(e); main.innerHTML = `<div class="page"><div class="empty">Bu sayfa yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.<br><br><button class="btn" onclick="location.reload()">Yenile</button></div></div>`; }
  if (r !== "ara" && r !== "home") { ST.last = r; save(); }
  if (pendingScroll) {
    const t = pendingScroll; pendingScroll = null;
    requestAnimationFrame(() => { const el = typeof t === "string" ? document.getElementById(t) : null; if (el) el.scrollIntoView({ block: "start" }); else if (typeof t === "number") window.scrollTo(0, t); });
  } else window.scrollTo(0, 0);
  document.title = (main.querySelector("h1") ? main.querySelector("h1").textContent + " · " : "") + "Fitness Çalışma";
}
window.addEventListener("hashchange", route);

function page(main, html, cls = "") { main.innerHTML = `<div class="page ${cls}">${html}</div>`; return main.firstElementChild; }
function segNav(items, cur) { return `<nav class="seg scroll" role="tablist">${items.map(([h, l]) => `<a href="#${h}" role="tab" aria-selected="${h === cur}">${l}</a>`).join("")}</nav>`; }

/* ---------- wrong-answer notebook ---------- */
function markAnswer(id, q, ok) {
  if (ok) { const w = ST.wrong[id]; if (w) { w.s = (w.s || 0) + 1; if (w.s >= 2) delete ST.wrong[id]; } }
  else ST.wrong[id] = { q: q.q, o: q.o, a: q.a, e: q.e || "", src: q.src || "", c: q.c || "", s: 0, n: ((ST.wrong[id] || {}).n || 0) + 1 };
  ST.hist.push([Date.now(), ok ? 1 : 0, q.c || ""]); if (ST.hist.length > 3000) ST.hist = ST.hist.slice(-3000);
  save();
}

/* ---------- multiple choice card (shared) ---------- */
function mcCard({ num, tag, q, o, a, e, chosen, reveal, onPick, id, src, c }) {
  const card = document.createElement("article"); card.className = "q";
  const show = reveal && chosen != null;
  card.innerHTML = `<div class="qh"><span class="qn">${esc(num)}</span><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="qtag">${esc(tag || "")}</span>${id ? `<button type="button" class="ibtn starb ${ST.star[id] ? "on" : ""}" aria-label="Soruyu işaretle" title="Sonra tekrar etmek için işaretle">${icon("star", 18)}</button>` : ""}</span></div><p class="qt">${esc(q)}</p>`;
  if (id) $(".starb", card).onclick = ev => { if (ST.star[id]) delete ST.star[id]; else ST.star[id] = { q, o, a, e: e || "", src: src || tag || "", c: c || "" }; save(); ev.currentTarget.classList.toggle("on", !!ST.star[id]); toast(ST.star[id] ? "İşaretlendi: Quiz → İşaretlediklerim" : "İşaret kaldırıldı"); };
  const os = document.createElement("div"); os.className = "opts";
  o.forEach((txt, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "opt"; b.innerHTML = `<b>${L[i]}</b><span>${esc(txt)}</span>`;
    if (show) { b.disabled = true; if (i === a) b.classList.add("right"); else if (i === chosen) b.classList.add("wrong"); }
    else if (i === chosen) b.classList.add("sel");
    b.onclick = () => onPick && onPick(i);
    os.appendChild(b);
  });
  card.appendChild(os);
  if (show) {
    const ok = chosen === a;
    const d = document.createElement("div"); d.className = "exp " + (ok ? "ok" : "bad");
    d.innerHTML = `<strong>${chosen === -1 ? "Boş bırakıldı." : ok ? "Doğru." : "Yanlış."} Cevap ${L[a]}) ${esc(o[a])}.</strong>${e ? " " + esc(e) : ""}`;
    card.appendChild(d);
  }
  return card;
}

/* ============ units ============ */
function unitStats(k) {
  const u = UNITS.find(x => x.k === k); const s = ST.uq[k] || {}; const ans = s.ans || {};
  const n = Object.keys(ans).length; return { n, total: u ? u.nExtra : 0, ok: s.ok || 0, best: s.best || null };
}
function catPills(k) {
  const a = [UCAT[k], UCAT2[k]].filter(Boolean);
  return a.map(c => `<span class="pill">${esc(CATN[c])}</span>`).join("");
}
ROUTES.uniteler = async (r, main) => {
  const done = UNITS.filter(u => ST.read[u.k]).length;
  const cards = UNITS.map(u => {
    const s = unitStats(u.k);
    const qs = s.n ? `<span class="pill ${s.ok / s.n >= .7 ? "ok" : "warn"}">Quiz ${s.ok}/${s.total}</span>` : `<span class="pill">${u.nExtra} ekstra soru</span>`;
    return `<a class="ucard ${ST.read[u.k] ? "done" : ""}" href="#${u.k}"><span class="n">${pad2(u.no)}</span>
      <h3>${esc(u.t)}</h3>
      <span class="small muted">${u.toc.length} bölüm · ~${u.min} dk okuma${u.nOrig ? ` · ${u.nOrig} AH sorusu` : ""}</span>
      <span class="m">${qs}${ST.read[u.k] ? '<span class="pill ok">Okundu</span>' : ""}</span></a>`;
  }).join("");
  page(main, `<div class="stack">
    <div class="uhead"><span class="eyebrow">Konu anlatımı</span><h1>18 ünite, sırasıyla</h1>
    <p class="muted">Her ünitede üç sekme var: konu anlatımı, Athletic House'un orijinal quizi (cevap ve açıklamalarıyla) ve benim hazırladığım ekstra quiz. Okuduğun üniteyi işaretle, burada yeşile döner.</p>
    <div class="row"><div class="bar ok" style="flex:1;max-width:360px"><i style="width:${done / 18 * 100}%"></i></div><span class="small muted num">${done} / 18 okundu</span></div></div>
    <div class="ulist">${cards}</div>
    <a class="tile" href="#rehber" style="margin-top:6px"><span class="ic">${icon("guide")}</span><h3>Final sınav rehberi</h3><span class="muted small">18 ünitenin sınavda en çok çıkacak bilgileri, formüller, manuel hataları ve son tekrar planı tek sayfada.</span></a>
  </div>`);
};

ROUTES.unit = async (r, main) => {
  const k = r.slice(0, 3), mode = r.includes("-ah") ? "ah" : r.includes("-quiz") ? "quiz" : r.includes("-ozet") ? "ozet" : "konu";
  const d = await getJSON(k);
  const u = UNITS.find(x => x.k === k) || { no: d.no, t: d.t, nOrig: d.orig.length, nExtra: d.extra.length, min: 10 };
  const i = UNITS.findIndex(x => x.k === k), prev = UNITS[i - 1], next = UNITS[i + 1];
  const tabs = segNav([[k, "Konu anlatımı"], [k + "-ah", `AH quizi (${d.orig.length})`], [k + "-quiz", `Ekstra quiz (${d.extra.length})`], [k + "-ozet", "Sınav özeti ve notlar"]], r);
  const head = `<div class="uhead"><span class="no">Ünite ${d.no} · ${catPills(k)}</span><h1>${esc(d.t)}</h1>${tabs}</div>`;
  const foot = `<div class="unav">${prev ? `<a href="#${prev.k}"><small>← Önceki ünite</small><b>${prev.no}. ${esc(prev.t)}</b></a>` : "<span></span>"}${next ? `<a class="nx" href="#${next.k}"><small>Sonraki ünite →</small><b>${next.no}. ${esc(next.t)}</b></a>` : ""}</div>`;
  if (mode === "konu") {
    const toc = d.toc.map((t, j) => `<button data-s="s${j + 1}">${esc(t)}</button>`).join("");
    const pg = page(main, `${head}
      <details class="tocm"><summary>İçindekiler · ${d.toc.length} bölüm</summary><div class="ls">${toc}</div></details>
      <div class="readwrap" style="margin-top:18px"><article class="doc" id="doc">${d.html}</article><aside class="toc"><b>İçindekiler</b>${toc}</aside></div>
      <div class="card row between" style="margin-top:28px"><div><b>Bu üniteyi bitirdin mi?</b><div class="small muted">İşaretlersen ana sayfadaki ilerlemene sayılır.</div></div>
      <div class="row"><button class="btn ${ST.read[k] ? "plain" : ""}" id="readBtn">${ST.read[k] ? "✓ Okundu" : "Okudum olarak işaretle"}</button><a class="btn ghost" href="#${k}-quiz">Ekstra quize geç →</a></div></div>
      ${foot}`, "unit");
    $$("button[data-s]", pg).forEach(b => b.onclick = () => { const el = document.getElementById(b.dataset.s); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); const det = $(".tocm", pg); if (det) det.open = false; });
    $("#readBtn").onclick = () => { ST.read[k] = !ST.read[k]; save(); route(); };
    // highlight current section in sticky toc
    const hs = $$("#doc h2"); const tb = $$(".toc button", pg);
    const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { tb.forEach(b => b.classList.toggle("on", b.dataset.s === e.target.id)); } }); }, { rootMargin: "-20% 0px -70% 0px" }) : null;
    if (io) hs.forEach(h => io.observe(h));
    if (!pendingScroll && ST.scroll[k] > 400) pendingScroll = ST.scroll[k];
    leaveHook = () => { ST.scroll[k] = window.scrollY; save(); if (io) io.disconnect(); };
    return;
  }
  if (mode === "ozet") { const pg = page(main, `${head}<div id="oz"></div>${foot}`); await renderOzet(k, d, $("#oz", pg)); return; }
  if (mode === "ah") {
    const pg = page(main, `${head}<div id="ahbox" class="stack"></div>${foot}`);
    renderAH(k, d, $("#ahbox", pg));
    return;
  }
  const pg = page(main, `${head}<div id="qbox"></div>${foot}`);
  renderUnitQuiz(k, d, $("#qbox", pg));
};

/* ---- Athletic House original quiz: question -> answer + explanation ---- */
function renderAH(k, d, box) {
  if (!d.orig.length) {
    box.innerHTML = `<div class="empty">Bu ünitenin Athletic House quizi platformda yoktu; konu doğrudan ekstra quizle çalışılıyor.<br><br><a class="btn" href="#${k}-quiz">Ekstra quize geç</a></div>`; return;
  }
  const S = ST.ah[k] || (ST.ah[k] = {});
  const known = () => Object.values(S).filter(v => v === 1).length;
  box.innerHTML = `<div class="callout small">Athletic House platformundaki orijinal quiz soruları. Soruyu kendi kafanda cevapla, sonra <b>Cevabı göster</b>'e bas. Bildiklerini “Bildim” diye işaretle; bilemediklerin flash kart tekrarına girer.</div>
   <div class="scorebar"><div class="row between"><span class="small num" id="ahc"></span><div class="row"><button class="btn sm plain" id="ahAll">Tüm cevapları aç</button><button class="btn sm ghost" id="ahReset">Sıfırla</button></div></div><div class="bar ok"><i id="ahbar"></i></div></div>
   <div class="flash" id="ahl"></div>`;
  const list = $("#ahl", box); let g = null, allOpen = false;
  const upd = () => { $("#ahc", box).textContent = `${known()} / ${d.orig.length} bildim · ${Object.values(S).filter(v => v === 0).length} tekrar edilecek`; $("#ahbar", box).style.width = known() / d.orig.length * 100 + "%"; };
  d.orig.forEach((q, j) => {
    if (q.g && q.g !== g) { g = q.g; list.insertAdjacentHTML("beforeend", `<div class="qgroup">${esc(g)}</div>`); }
    const id = j;
    const c = document.createElement("div"); c.className = "ah";
    c.innerHTML = `<div class="qh"><span class="qn">${esc(q.n)}</span>${S[id] === 1 ? '<span class="pill ok">Bildim</span>' : S[id] === 0 ? '<span class="pill warn">Tekrar</span>' : ""}</div>
      <p class="qt">${esc(q.q)}</p>
      <div class="ans" hidden><span>Cevap: <b>${esc(q.a)}</b></span>${q.e ? `<span class="small">${esc(q.e)}</span>` : ""}</div>
      <div class="row"><button class="btn sm plain rv">Cevabı göster</button><span class="self" hidden><button class="btn sm ghost kn">Bildim</button><button class="btn sm ghost un">Bilemedim</button></span></div>`;
    const open = () => { $(".ans", c).hidden = false; $(".rv", c).hidden = true; $(".self", c).hidden = false; };
    $(".rv", c).onclick = open;
    $(".kn", c).onclick = () => { S[id] = 1; save(); c.querySelector(".qh").innerHTML = `<span class="qn">${esc(q.n)}</span><span class="pill ok">Bildim</span>`; upd(); };
    $(".un", c).onclick = () => { S[id] = 0; save(); c.querySelector(".qh").innerHTML = `<span class="qn">${esc(q.n)}</span><span class="pill warn">Tekrar</span>`; upd(); };
    c._open = open; list.appendChild(c);
  });
  $("#ahAll", box).onclick = () => { allOpen = !allOpen; $$(".ah", list).forEach(c => { if (allOpen) c._open(); else { $(".ans", c).hidden = true; $(".rv", c).hidden = false; $(".self", c).hidden = true; } }); $("#ahAll", box).textContent = allOpen ? "Cevapları gizle" : "Tüm cevapları aç"; };
  $("#ahReset", box).onclick = () => { ST.ah[k] = {}; save(); route(); };
  upd();
}

/* ---- extra quiz: interactive, instant feedback, saved ---- */
function renderUnitQuiz(k, d, box) {
  const S = ST.uq[k] || (ST.uq[k] = { ans: {}, ok: 0 });
  let filter = "all";
  box.innerHTML = `<div class="callout small">Benim hazırladığım ${d.extra.length} yeni soru. Bir şıkka basınca doğru cevap ve açıklaması hemen açılır. Yanlışların otomatik olarak <a href="#yanlis">Yanlış defterine</a> düşer.</div>
    <div class="scorebar"><div class="row between"><span class="small num" id="sc"></span>
      <div class="row"><span class="seg" id="flt"><button aria-selected="true" data-f="all">Hepsi</button><button data-f="wrong">Yanlışlar</button><button data-f="open">Cevapsız</button></span><button class="btn sm ghost" id="rst">Baştan çöz</button></div></div>
      <div class="bar"><i id="scb"></i></div></div>
    <div class="grid" id="ql"></div>
    <div id="fin"></div>`;
  const ql = $("#ql", box);
  const recount = () => { S.ok = d.extra.reduce((a, q, j) => a + (S.ans[j] === q.a ? 1 : 0), 0); };
  const upd = () => {
    const n = Object.keys(S.ans).length; recount();
    $("#sc", box).innerHTML = `<b>${S.ok}</b> doğru · ${n - S.ok} yanlış · ${d.extra.length - n} cevapsız`;
    $("#scb", box).style.width = n / d.extra.length * 100 + "%";
    if (n === d.extra.length) {
      const pc = Math.round(S.ok / n * 100); S.best = Math.max(S.best || 0, pc); save();
      $("#fin", box).innerHTML = `<div class="card row between" style="margin-top:14px"><div class="row"><span class="big">${pc}%</span><div><b>${S.ok} / ${n} doğru</b><div class="small muted">En iyi skorun: %${S.best}. ${pc >= 70 ? "70 barajının üstündesin." : "70 barajının altında, yanlışları konu anlatımından tekrar et."}</div></div></div><div class="row"><a class="btn" href="#yanlis">Yanlış defteri</a><a class="btn ghost" href="#${k}">Konuya dön</a></div></div>`;
    } else $("#fin", box).innerHTML = "";
  };
  const draw = () => {
    ql.innerHTML = ""; let g = null;
    d.extra.forEach((q, j) => {
      const ch = S.ans[j];
      if (filter === "wrong" && (ch == null || ch === q.a)) return;
      if (filter === "open" && ch != null) return;
      if (q.g && q.g !== g) { g = q.g; ql.insertAdjacentHTML("beforeend", `<div class="qgroup">${esc(g)}</div>`); }
      const c = mcCard({ id: `${k}-${q.n}`, src: `Ünite ${d.no} ekstra quiz`, c: UCAT[k], num: q.n, tag: "", q: q.q, o: q.o, a: q.a, e: q.e, chosen: ch, reveal: true, onPick: i => { if (S.ans[j] != null) return; S.ans[j] = i; markAnswer(`${k}-${q.n}`, { ...q, src: `Ünite ${d.no} ekstra quiz`, c: UCAT[k] }, i === q.a); save(); c.replaceWith(rebuild(j)); upd(); } });
      ql.appendChild(c);
    });
    if (!ql.children.length) ql.innerHTML = `<div class="empty">Bu filtrede soru yok.</div>`;
  };
  const rebuild = j => { const q = d.extra[j]; const c = mcCard({ id: `${k}-${q.n}`, src: `Ünite ${d.no} ekstra quiz`, c: UCAT[k], num: q.n, q: q.q, o: q.o, a: q.a, e: q.e, chosen: S.ans[j], reveal: true }); return c; };
  $$("#flt button", box).forEach(b => b.onclick = () => { filter = b.dataset.f; $$("#flt button", box).forEach(x => x.setAttribute("aria-selected", x === b)); draw(); });
  $("#rst", box).onclick = () => { S.ans = {}; S.ok = 0; save(); draw(); upd(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  draw(); upd();
}

/* ============ quiz hub, mixed test, flash cards, wrong notebook ============ */
async function loadAllUnits() { return Promise.all(UNITS.map(u => getJSON(u.k))); }
async function buildPool(srcUnits, srcExams, cats, srcKarma = true) {
  const pool = [];
  if (srcKarma) { const E = await getJSON("ezber"); E.karma.forEach((q, j) => { if (cats.includes(KARMA_C[j])) pool.push({ id: "k-" + (j + 1), q: q.q, o: q.o, a: q.a, e: q.e, c: KARMA_C[j], src: `Final rehberi karma, soru ${j + 1}` }); }); }
  if (srcUnits) {
    const all = await loadAllUnits();
    all.forEach(d => {
      const k = "u" + pad2(d.no); const c = UCAT[k];
      if (!cats.includes(c) && !(UCAT2[k] && cats.includes(UCAT2[k]))) return;
      d.extra.forEach(q => pool.push({ id: `${k}-${q.n}`, q: q.q, o: q.o, a: q.a, e: q.e, c, src: `Ünite ${d.no} ekstra quiz` }));
    });
  }
  if (srcExams) {
    const ex = await getJSON("exams");
    ex.exams.forEach((E, ei) => E.forEach((q, qi) => { if (cats.includes(q.c)) pool.push({ id: `d${ei + 1}-${qi + 1}`, q: q.q, o: q.o, a: q.a, e: q.e, c: q.c, src: `Deneme ${ei + 1}, soru ${qi + 1}` }); }));
  }
  return pool;
}
let SESSION = null;
try { SESSION = JSON.parse(sessionStorage.getItem("fcm-sess") || "null"); } catch (e) { }
function saveSess() { try { sessionStorage.setItem("fcm-sess", JSON.stringify(SESSION)); } catch (e) { } }

ROUTES.quiz = async (r, main) => {
  const nWrong = Object.keys(ST.wrong).length;
  const totExtra = UNITS.reduce((a, u) => a + u.nExtra, 0), totAH = UNITS.reduce((a, u) => a + u.nOrig, 0);
  const rows = UNITS.map(u => {
    const s = unitStats(u.k); const ah = ST.ah[u.k] || {}; const kn = Object.values(ah).filter(v => v === 1).length;
    return `<tr><td><a href="#${u.k}"><b>${u.no}.</b> ${esc(u.t)}</a></td>
      <td>${u.nOrig ? `<a href="#${u.k}-ah">${u.nOrig} soru</a>${kn ? ` <span class="pill ok">${kn} bildim</span>` : ""}` : '<span class="muted">—</span>'}</td>
      <td><a href="#${u.k}-quiz">${u.nExtra} soru</a> ${s.n ? `<span class="pill ${s.ok / s.n >= .7 ? "ok" : "warn"}">${s.ok}/${s.n}</span>` : ""}</td></tr>`;
  }).join("");
  const pg = page(main, `<div class="stack">
    <div class="uhead"><span class="eyebrow">Quiz merkezi</span><h1>Soru çöz, eksiğini bul</h1>
    <p class="muted">Toplam ${totAH} Athletic House sorusu, ${totExtra} ünite ekstra sorusu ve ${300} deneme sorusu. Ünite ünite çözebilir, konu karışık test oluşturabilir ya da sadece yanlışlarına çalışabilirsin.</p></div>
    <div class="tiles">
      <a class="tile" href="#yanlis"><span class="ic">${icon("wrong")}</span><h3>Yanlış defteri</h3><span class="muted small">${nWrong ? `${nWrong} soru bekliyor. Doğru cevapladıkça defterden silinir.` : "Henüz yanlışın yok. Soru çözdükçe yanlışların buraya düşer."} Bir soru üst üste 2 kez doğru bilinince çıkar.</span></a>
      <a class="tile" href="#kart"><span class="ic">${icon("card")}</span><h3>Flash kartlar</h3><span class="muted small">${totAH} Athletic House sorusu kart olarak: soruyu gör, cevabı aç, bildim/bilemedim de.</span></a>
      <a class="tile" href="#yildiz"><span class="ic">${icon("star")}</span><h3>İşaretlediklerim</h3><span class="muted small">${Object.keys(ST.star).length} soru. Sorulardaki ☆ ile işaretlediklerin.</span></a>
      <a class="tile" href="#karma"><span class="ic">${icon("guide")}</span><h3>Final rehberi: 25 karma soru</h3><span class="muted small">Rehberin son bölümündeki soru seti, açıklamalı. 20+ doğru = hazırsın.</span></a>
      <a class="tile" href="#ezber-test"><span class="ic">${icon("card")}</span><h3>Ezber testi</h3><span class="muted small">250 “bilmen gereken” bilgiden sınırsız çoktan seçmeli soru.</span></a>
      <a class="tile" href="#deneme"><span class="ic">${icon("exam")}</span><h3>100 soruluk denemeler</h3><span class="muted small">Gerçek sınav dağılımıyla 3 tam deneme, konu bazlı karne.</span></a>
    </div>
    <section class="card stack" id="builder"><h2>Karma test oluştur</h2>
      <div class="grid"><b class="small">Soru kaynağı</b><div class="row"><label class="chk"><input type="checkbox" id="sU" checked> Ünite ekstra quizleri (${totExtra})</label><label class="chk"><input type="checkbox" id="sE" checked> Deneme sınavı soruları (300)</label><label class="chk"><input type="checkbox" id="sK" checked> Final rehberi karma (25)</label></div></div>
      <div class="grid"><b class="small">Konu alanı (sınav dağılımındaki başlıklar)</b><div class="chipsel" id="cs">${CATS.map(c => `<button type="button" aria-pressed="true" data-c="${c.k}">${esc(c.n)}</button>`).join("")}</div></div>
      <div class="row"><label class="small">Soru sayısı <select id="nq"><option>10</option><option selected>20</option><option>30</option><option>50</option><option>100</option></select></label>
      <label class="chk small"><input type="checkbox" id="inst" checked> Her sorudan sonra cevabı göster</label></div>
      <div class="row"><button class="btn" id="startT">Testi başlat</button><span class="small muted" id="poolN"></span></div>
      ${SESSION && !SESSION.done ? `<div class="callout small row between"><span>Yarım kalan bir testin var (${SESSION.i}/${SESSION.qs.length}).</span><a class="btn sm" href="#test">Devam et</a></div>` : ""}
    </section>
    <section class="stack"><h2>Ünite ünite</h2>
      <div class="tw"><table><thead><tr><th>Ünite</th><th>AH quizi</th><th>Ekstra quiz</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  </div>`);
  const cats = () => $$("#cs button", pg).filter(b => b.getAttribute("aria-pressed") === "true").map(b => b.dataset.c);
  const cnt = async () => { const p = await buildPool($("#sU").checked, $("#sE").checked, cats(), $("#sK").checked); $("#poolN").textContent = `Havuzda ${p.length} soru var.`; return p; };
  $$("#cs button", pg).forEach(b => b.onclick = () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); cnt(); });
  ["sU", "sE", "sK"].forEach(id => $("#" + id).onchange = cnt);
  $("#startT").onclick = async () => {
    const p = await cnt(); if (!p.length) { toast("Önce en az bir kaynak ve konu seç."); return; }
    const n = Math.min(+$("#nq").value, p.length);
    SESSION = { qs: shuffle(p).slice(0, n), ans: [], i: 0, inst: $("#inst").checked, done: false, title: "Karma test" }; saveSess(); go("test");
  };
  cnt();
};

ROUTES.test = async (r, main) => {
  if (!SESSION) { go("quiz"); return; }
  const S = SESSION;
  const draw = () => {
    if (S.done) return drawEnd();
    const q = S.qs[S.i], ch = S.ans[S.i];
    const pg = page(main, `<div class="cardq stack">
      <div class="row between"><a href="#quiz" class="small">← Quiz merkezi</a><span class="small muted num">${S.i + 1} / ${S.qs.length}</span></div>
      <div class="bar"><i style="width:${(S.i) / S.qs.length * 100}%"></i></div>
      <div id="qc"></div>
      <div class="row between"><button class="btn plain" id="pv" ${S.i ? "" : "disabled"}>← Önceki</button>
      <button class="btn" id="nx">${S.i === S.qs.length - 1 ? "Bitir ve puanla" : "Sonraki →"}</button></div></div>`);
    const card = mcCard({ id: q.id, src: q.src, c: q.c, num: S.i + 1, tag: `${CATN[q.c] || ""} · ${q.src}`, q: q.q, o: q.o, a: q.a, e: q.e, chosen: ch, reveal: S.inst || false, onPick: i => { if (S.inst && S.ans[S.i] != null) return; S.ans[S.i] = i; if (S.inst) markAnswer(q.id, q, i === q.a); saveSess(); draw(); } });
    $("#qc", pg).appendChild(card);
    $("#pv", pg).onclick = () => { S.i--; saveSess(); draw(); };
    $("#nx", pg).onclick = () => { if (S.i === S.qs.length - 1) { if (!S.inst) S.qs.forEach((q, j) => { if (S.ans[j] != null) markAnswer(q.id, q, S.ans[j] === q.a); }); S.done = true; saveSess(); draw(); } else { S.i++; saveSess(); draw(); } window.scrollTo(0, 0); };
  };
  const drawEnd = () => {
    let ok = 0, blank = 0; const per = {};
    S.qs.forEach((q, j) => { per[q.c] = per[q.c] || { t: 0, o: 0 }; per[q.c].t++; if (S.ans[j] == null) blank++; else if (S.ans[j] === q.a) { ok++; per[q.c].o++; } });
    const pc = Math.round(ok / S.qs.length * 100);
    const rows = Object.entries(per).map(([c, p]) => { const v = Math.round(p.o / p.t * 100); return `<tr><td>${esc(CATN[c])}</td><td class="r num">${p.o} / ${p.t}</td><td style="width:40%"><div class="bar ${v >= 70 ? "ok" : ""}"><i style="width:${v}%"></i></div></td></tr>`; }).join("");
    const pg = page(main, `<div class="cardq stack">
      <div class="card stack"><span class="eyebrow">${esc(S.title)} bitti</span><div class="row"><span class="big">${pc}%</span><div><b>${ok} doğru · ${S.qs.length - ok - blank} yanlış · ${blank} boş</b><div class="small muted">${pc >= 70 ? "70 barajının üstünde." : "70 barajının altında. Yanlışlar defterine eklendi."}</div></div></div>
      <div class="tw"><table><thead><tr><th>Konu</th><th class="r">Doğru</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row"><button class="btn" id="again">Yeni test</button><a class="btn ghost" href="#yanlis">Yanlış defteri</a></div></div>
      <h2>Cevaplar</h2><div class="grid" id="rv"></div></div>`);
    S.qs.forEach((q, j) => $("#rv", pg).appendChild(mcCard({ num: j + 1, tag: q.src, q: q.q, o: q.o, a: q.a, e: q.e, chosen: S.ans[j] == null ? -1 : S.ans[j], reveal: true })));
    $("#again", pg).onclick = () => { SESSION = null; saveSess(); go("quiz"); };
  };
  draw();
};

ROUTES.yanlis = async (r, main) => {
  const ids = Object.keys(ST.wrong);
  if (!ids.length) { page(main, `<div class="uhead"><span class="eyebrow">Yanlış defteri</span><h1>Defter boş</h1></div><div class="empty">Yanlış yaptığın her soru buraya düşer. Doğru cevapladığında defterden kendiliğinden silinir.<br><br><a class="btn" href="#quiz">Soru çözmeye başla</a></div>`); return; }
  const byC = {}; ids.forEach(id => { const c = ST.wrong[id].c || "x"; byC[c] = (byC[c] || 0) + 1; });
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Yanlış defteri</span><h1>${ids.length} soru tekrar bekliyor</h1>
    <p class="muted">Bunları yanlış cevaplamıştın. Tekrar çöz: bir soru <b>üst üste 2 kez</b> doğru bilinince defterden çıkar (şansla bir kere doğru tutturmak yetmez).</p>
    <div class="row">${Object.entries(byC).map(([c, n]) => `<span class="pill">${esc(CATN[c] || "Diğer")} · ${n}</span>`).join("")}</div>
    <div class="row"><button class="btn" id="wt">Hepsini test olarak çöz</button><button class="btn ghost" id="wc">Defteri temizle</button></div></div>
    <div class="grid" id="wl"></div></div>`);
  const wl = $("#wl", pg);
  ids.forEach((id, j) => {
    const q = ST.wrong[id]; let ch = null;
    const mk = () => mcCard({ id, src: q.src, c: q.c, num: j + 1, tag: q.src + (q.s ? ` · ${q.s}/2 doğru` : ""), q: q.q, o: q.o, a: q.a, e: q.e, chosen: ch, reveal: true, onPick: i => { if (ch != null) return; ch = i; markAnswer(id, q, i === q.a); const n = mk(); c.replaceWith(n); c = n; } });
    let c = mk(); wl.appendChild(c);
  });
  $("#wt", pg).onclick = () => { SESSION = { qs: shuffle(ids.map(id => ({ id, ...ST.wrong[id] }))), ans: [], i: 0, inst: true, done: false, title: "Yanlış defteri testi" }; saveSess(); go("test"); };
  $("#wc", pg).onclick = () => { if (confirm("Yanlış defterindeki tüm sorular silinsin mi?")) { ST.wrong = {}; save(); route(); } };
};

ROUTES.kart = async (r, main) => {
  const all = await loadAllUnits();
  const withAH = all.filter(d => d.orig.length);
  const sel = r.split("-")[1] || "hepsi";
  const deck = [];
  withAH.forEach(d => { const k = "u" + pad2(d.no); if (sel !== "hepsi" && sel !== "tekrar" && sel !== k) return; d.orig.forEach((q, j) => { const v = (ST.ah[k] || {})[j]; if (sel === "tekrar" && v !== 0) return; deck.push({ k, j, no: d.no, ...q }); }); });
  const opts = [["kart", "Tümü"], ["kart-tekrar", "Bilemediklerim"], ...withAH.map(d => ["kart-u" + pad2(d.no), "Ünite " + d.no])];
  let order = shuffle(deck.map((_, i) => i)), i = 0, open = false;
  const pg = page(main, `<div class="cardq stack"><div class="uhead"><span class="eyebrow">Flash kartlar</span><h1>Athletic House soruları</h1>
    <p class="muted">Karta bas, cevap açılsın. Bildiysen “Bildim”, bilemediysen “Tekrar” de; bilemediklerin ayrı bir destede toplanır.</p></div>
    ${segNav(opts, r === "kart" ? "kart" : r)}<div id="fc"></div></div>`);
  const box = $("#fc", pg);
  const draw = () => {
    if (!deck.length) { box.innerHTML = `<div class="empty">Bu destede kart yok.${sel === "tekrar" ? " Bilemedim dediğin kart kalmamış." : ""}</div>`; return; }
    if (i >= order.length) { box.innerHTML = `<div class="card stack" style="text-align:center"><span class="big">✓</span><b>Deste bitti (${deck.length} kart).</b><button class="btn" id="re">Karıştır ve baştan</button></div>`; $("#re", box).onclick = () => { order = shuffle(order); i = 0; draw(); }; return; }
    const q = deck[order[i]];
    box.innerHTML = `<div class="row between small muted" style="margin:12px 0 8px"><span>Ünite ${q.no} · soru ${esc(q.n)}${q.g ? " · " + esc(q.g) : ""}</span><span class="num">${i + 1} / ${order.length}</span></div>
      <div class="card fcard" id="fq"><p class="qt">${esc(q.q)}</p>${open ? `<div class="a">${esc(q.a)}</div>${q.e ? `<p class="small muted">${esc(q.e)}</p>` : ""}` : '<span class="small muted">Cevabı görmek için dokun</span>'}</div>
      <div class="row between" style="margin-top:12px"><button class="btn plain" id="bk" ${i ? "" : "disabled"}>←</button>
      <div class="row">${open ? '<button class="btn ghost" id="un">Tekrar</button><button class="btn" id="kn">Bildim</button>' : '<button class="btn" id="op">Cevabı göster</button>'}</div></div>`;
    const set = v => { (ST.ah[q.k] = ST.ah[q.k] || {})[q.j] = v; save(); i++; open = false; draw(); };
    $("#fq", box).onclick = () => { open = !open; draw(); };
    if ($("#op", box)) $("#op", box).onclick = () => { open = true; draw(); };
    if ($("#kn", box)) $("#kn", box).onclick = () => set(1);
    if ($("#un", box)) $("#un", box).onclick = () => set(0);
    $("#bk", box).onclick = () => { i--; open = false; draw(); };
  };
  draw();
};

/* ============ 3 x 100 mock exams ============ */
ROUTES.deneme = async (r, main) => {
  const D = await getJSON("exams");
  const cur = Math.max(0, Math.min(2, (+r.split("-")[1] || 1) - 1));
  const S = ST.den; const ans = S.st[cur] || (S.st[cur] = {}); let filter = null;
  const tabs = segNav([["deneme-1", "Deneme 1"], ["deneme-2", "Deneme 2"], ["deneme-3", "Deneme 3"]], "deneme-" + (cur + 1));
  const dist = CATS.map(c => `<div class="r"><span>${esc(c.n)}</span><div class="bar"><i style="width:${c.w / 30 * 100}%"></i></div><b class="num">${c.w}</b></div>`).join("");
  const pg = page(main, `<div class="stack">
    <div class="uhead"><span class="eyebrow">Yazılı sınav provası</span><h1>100 soruluk deneme sınavları</h1>${tabs}</div>
    <details class="card"><summary><b>Sınav dağılımı ve kurallar</b></summary><div class="stack" style="margin-top:12px"><p class="small muted">Her deneme gerçek yazılı sınavın konu dağılımıyla hazırlandı (100 soru). İşaretlediklerin bu cihazda saklanır, istediğin zaman bırakıp dönebilirsin. Süre tutmak istersen kronometreyi başlat.</p><div class="dist">${dist}</div></div></details>
    <div class="scorebar"><div class="row between"><span class="small num" id="cnt"></span>
      <div class="row"><span class="small num muted" id="clk"></span><select id="lim" aria-label="Süre sınırı" style="padding:5px 8px;font-size:14px"><option value="0">Süre sınırı yok</option><option value="60">60 dk</option><option value="90">90 dk</option><option value="120">120 dk</option></select><button class="btn sm plain" id="tm">⏱ Başlat</button><label class="chk small"><input type="checkbox" id="ins"> Cevabı hemen göster</label><button class="btn sm" id="fin"></button></div></div>
      <div class="bar"><i id="pb"></i></div></div>
    <section id="res" class="card stack" hidden></section>
    <div class="grid" id="qs"></div></div>`);
  const E = D.exams[cur];
  const reveal = j => S.done[cur] || (S.instant && ans[j] != null);
  const prog = () => { const n = Object.keys(ans).length; $("#cnt", pg).textContent = `${n} / 100 işaretli`; $("#pb", pg).style.width = n + "%"; };
  let timer = null;
  S.lim = S.lim || [0, 0, 0];
  const clk = () => { const t = S.t[cur] || 0, L = (S.lim[cur] || 0) * 60; const show = L ? Math.max(0, L - t) : t; $("#clk", pg).textContent = (t || L) ? `${L ? "Kalan " : ""}${Math.floor(show / 60)}:${pad2(show % 60)}` : ""; $("#clk", pg).style.color = L && L - t < 300 ? "var(--bad)" : ""; };
  $("#lim", pg).value = S.lim[cur] || 0;
  $("#lim", pg).onchange = e => { S.lim[cur] = +e.target.value; save(); clk(); };
  $("#tm", pg).onclick = () => { if (S.done[cur]) return; if (timer) { clearInterval(timer); timer = null; $("#tm", pg).textContent = "⏱ Devam"; save(); } else { timer = setInterval(() => { S.t[cur] = (S.t[cur] || 0) + 1; clk(); if (S.t[cur] % 10 === 0) save(); if (S.lim[cur] && S.t[cur] >= S.lim[cur] * 60) { clearInterval(timer); timer = null; toast("Süre doldu, sınav puanlandı"); finish(true); } }, 1000); $("#tm", pg).textContent = "⏸ Durdur"; } };
  leaveHook = () => { if (timer) clearInterval(timer); save(); };
  const card = j => {
    const q = E[j];
    const c = mcCard({ id: `d${cur + 1}-${j + 1}`, src: `Deneme ${cur + 1}, soru ${j + 1}`, c: q.c, num: j + 1, tag: CATN[q.c], q: q.q, o: q.o, a: q.a, e: q.e, chosen: ans[j] == null ? (S.done[cur] ? -1 : null) : ans[j], reveal: reveal(j) || S.done[cur], onPick: i => { if (reveal(j)) return; ans[j] = i; if (S.instant) markAnswer(`d${cur + 1}-${j + 1}`, { ...q, src: `Deneme ${cur + 1}, soru ${j + 1}` }, i === q.a); save(); c.replaceWith(card(j)); prog(); } });
    return c;
  };
  const drawQs = () => { const box = $("#qs", pg); box.innerHTML = ""; E.forEach((q, j) => { if (filter === "wrong" && ans[j] === q.a) return; if (filter && filter !== "wrong" && q.c !== filter) return; box.appendChild(card(j)); }); };
  const drawRes = () => {
    const res = $("#res", pg);
    $("#fin", pg).textContent = S.done[cur] ? "Baştan çöz" : "Bitir ve puanla";
    if (!S.done[cur]) { res.hidden = true; return; }
    let ok = 0, blank = 0; const per = {}; CATS.forEach(c => per[c.k] = { t: 0, o: 0 });
    E.forEach((q, j) => { per[q.c].t++; if (ans[j] == null) blank++; else if (ans[j] === q.a) { ok++; per[q.c].o++; } });
    const rows = CATS.map(c => { const p = per[c.k], v = Math.round(p.o / p.t * 100); return `<tr><td>${esc(c.n)}</td><td class="r num">${p.o} / ${p.t}</td><td class="r num">%${v}</td><td style="width:30%"><div class="bar ${v >= 70 ? "ok" : ""}"><i style="width:${v}%"></i></div></td></tr>`; }).join("");
    res.innerHTML = `<div class="row"><span class="big">${ok}</span><div><b>doğru · ${100 - ok - blank} yanlış · ${blank} boş</b><div><span class="pill ${ok >= 70 ? "ok" : "bad"}">${ok >= 70 ? "70 barajının üstünde" : "70 barajının altında"}</span>${S.t[cur] ? ` <span class="pill">Süre ${Math.floor(S.t[cur] / 60)} dk</span>` : ""}</div></div></div>
      <div class="tw"><table><thead><tr><th>Konu</th><th class="r">Doğru</th><th class="r">Oran</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="grid"><span class="small muted">Soruları süz:</span><div class="seg" id="ff"></div></div>`;
    const ff = $("#ff", res);
    const mk = (id, l) => { const b = document.createElement("button"); b.textContent = l; b.setAttribute("aria-selected", filter === id); b.onclick = () => { filter = id; drawRes(); drawQs(); }; ff.appendChild(b); };
    mk(null, "Hepsi"); mk("wrong", "Yanlış ve boş"); CATS.forEach(c => mk(c.k, c.n));
    res.hidden = false;
  };
  $("#ins", pg).checked = !!S.instant;
  $("#ins", pg).onchange = e => { S.instant = e.target.checked; save(); drawQs(); };
  const finish = force => {
    if (S.done[cur]) return;
    S.done[cur] = true; if (!S.instant) E.forEach((q, j) => { if (ans[j] != null) markAnswer(`d${cur + 1}-${j + 1}`, { ...q, src: `Deneme ${cur + 1}, soru ${j + 1}` }, ans[j] === q.a); });
    save(); drawRes(); drawQs(); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  $("#fin", pg).onclick = () => {
    if (S.done[cur]) { if (!confirm("Bu denemedeki cevapların silinsin mi?")) return; S.st[cur] = {}; S.done[cur] = false; S.t[cur] = 0; save(); route(); return; }
    const n = Object.keys(ans).length; if (n < 100 && !confirm(`${100 - n} soru boş. Yine de bitirip puanlansın mı?`)) return;
    S.done[cur] = true; if (!S.instant) E.forEach((q, j) => { if (ans[j] != null) markAnswer(`d${cur + 1}-${j + 1}`, { ...q, src: `Deneme ${cur + 1}, soru ${j + 1}` }, ans[j] === q.a); });
    if (timer) { clearInterval(timer); timer = null; }
    save(); drawRes(); drawQs(); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  prog(); clk(); drawRes(); drawQs();
};

/* ============ movement analysis atlas ============ */
const chip = p => { const k = ["Sagittal", "Frontal", "Transvers"].find(x => p.includes(x)); return `<span class="chip ${k ? "p-" + k : "p-none"}">${esc(p)}</span>`; };
ROUTES.atlas = async (r, main) => {
  const A = await getJSON("atlas");
  const v = r.split("-")[1] || "kavram";
  const tabs = segNav([["atlas", "Önce bunu oku"], ["atlas-egzersiz", `Egzersizler (${A.EX.length})`], ["atlas-eklem", "Eklemler"], ["atlas-kas", `Kaslar (${A.MS.length})`], ["atlas-test", "Kendini test et"]], r === "atlas-kavram" ? "atlas" : r);
  const head = `<div class="uhead"><span class="eyebrow">Fonksiyonel anatomi</span><h1>Hareket analizi atlası</h1><p class="muted">Bir hareketi analiz etmek dört soruya cevap vermektir: hangi eklem, ne hareketi, hangi düzlemde, hangi kas hangi rolde.</p>${tabs}
    <div class="row small muted">Düzlem kodu: ${chip("Sagittal")} ${chip("Frontal")} ${chip("Transvers")}</div></div>`;
  if (v === "kavram") { page(main, head + `<div class="atlas-kavram doc" style="max-width:none">${A.kavram}</div>`, "wide"); return; }
  if (v === "egzersiz") {
    const regions = [...new Set(A.EX.map(e => e.b))];
    const pg = page(main, head + `<div class="stack"><div class="filters">
      <input type="search" id="q" placeholder="Hareket veya kas ara (ör. latissimus)" aria-label="Ara">
      <select id="fb" aria-label="Bölge"><option value="">Tüm bölgeler</option>${regions.map(x => `<option>${esc(x)}</option>`).join("")}</select>
      <select id="fp" aria-label="Düzlem"><option value="">Tüm düzlemler</option><option>Sagittal</option><option>Frontal</option><option>Transvers</option></select>
      <select id="fv" aria-label="Görünüm"><option value="kart">Kart görünümü</option><option value="tablo">Tek büyük tablo</option></select></div>
      <span class="small muted" id="cnt"></span><div id="exl" class="grid"></div></div>`, "wide");
    const exCard = e => `<article class="ex"><div class="exh"><div><h3>${esc(e.n)}</h3><div class="sub">${esc(e.tr)}</div></div><div class="row"><span class="tag">${esc(e.b)}</span><span class="tag">${esc(e.z)} zincir</span></div></div>
      <div class="tw"><table class="mini"><thead><tr><th>Eklem</th><th>Hareket (kaldırma fazı)</th><th>Düzlem</th></tr></thead><tbody>${e.f.map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td><td>${chip(x[2])}</td></tr>`).join("")}</tbody></table></div>
      <dl class="roles"><dt class="ag">Agonist</dt><dd>${esc(e.ag)}</dd><dt>Sinerjist</dt><dd>${esc(e.sn)}</dd><dt>Antagonist</dt><dd>${esc(e.an)}</dd><dt>Stabilizatör</dt><dd>${esc(e.st)}</dd><dt>Nötralizör</dt><dd>${esc(e.nt)}</dd><dt>Kasılma</dt><dd>${esc(e.k)}</dd></dl>
      <div class="note">${esc(e.ip)}</div></article>`;
    const exTable = list => `<div class="tw wide-t"><table><thead><tr><th>Egzersiz</th><th>Eklem: hareket</th><th>Düzlem</th><th>Agonist</th><th>Sinerjist</th><th>Antagonist</th><th>Stabilizatör</th><th>Nötralizör</th><th>Zincir</th></tr></thead><tbody>${list.map(e => `<tr><td><b>${esc(e.n)}</b><br><span class="sub">${esc(e.tr)}</span></td><td>${e.f.map(x => `${esc(x[0])}: ${esc(x[1])}`).join("<br>")}</td><td>${e.f.map(x => chip(x[2])).join("<br>")}</td><td>${esc(e.ag)}</td><td>${esc(e.sn)}</td><td>${esc(e.an)}</td><td>${esc(e.st)}</td><td>${esc(e.nt)}</td><td>${esc(e.z)}</td></tr>`).join("")}</tbody></table></div>`;
    const draw = () => {
      const q = fold($("#q").value.trim()), b = $("#fb").value, p = $("#fp").value, vw = $("#fv").value;
      const list = A.EX.filter(e => (!b || e.b === b) && (!p || e.f.some(x => x[2].includes(p))) && (!q || fold(JSON.stringify(e)).includes(q)));
      $("#cnt").textContent = `${list.length} / ${A.EX.length} hareket`;
      $("#exl").innerHTML = list.length ? (vw === "tablo" ? exTable(list) : list.map(exCard).join("")) : '<div class="empty">Bu filtreyle eşleşen hareket yok.</div>';
    };
    ["q", "fb", "fp", "fv"].forEach(id => $("#" + id).addEventListener("input", draw)); draw(); return;
  }
  if (v === "eklem") {
    page(main, head + `<div class="grid">${A.JT.map(j => `<div class="box"><div><h3>${esc(j[0])}</h3><div class="sub">${esc(j[1])}</div></div>
      <div class="tw"><table class="mini"><thead><tr><th>Hareket</th><th>Düzlem</th><th>Bu hareketi yapan kaslar</th><th>Egzersiz</th></tr></thead><tbody>${j[2].map(x => `<tr><td>${esc(x[0])}</td><td>${chip(x[1])}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`).join("")}</tbody></table></div></div>`).join("")}</div>`, "wide"); return;
  }
  if (v === "kas") {
    const pg = page(main, head + `<div class="stack"><div class="filters"><input type="search" id="mq" placeholder="Kas ara (ör. deltoid)" aria-label="Kas ara"></div>
      <div class="tw wide-t"><table><thead><tr><th>Kas</th><th>Bölge</th><th>Geçtiği eklem</th><th>Hareket ve düzlem</th><th>Egzersiz</th><th>Not</th></tr></thead><tbody id="ml"></tbody></table></div></div>`, "wide");
    const draw = () => { const q = fold($("#mq").value.trim()); const list = A.MS.filter(m => !q || fold(JSON.stringify(m)).includes(q)); $("#ml").innerHTML = list.map(m => `<tr><td><b>${esc(m[0])}</b></td><td>${esc(m[1])}</td><td>${esc(m[2])}</td><td>${m[3].map(a => `${esc(a[0])} ${chip(a[1])}`).join("<br>")}</td><td>${esc(m[4])}</td><td class="sub">${esc(m[5])}</td></tr>`).join("") || '<tr><td colspan="6">Eşleşen kas yok.</td></tr>'; };
    $("#mq").addEventListener("input", draw); draw(); return;
  }
  // self-test generated from the atlas
  const pg = page(main, head + `<div class="cardq stack"><p class="muted small">Atlas verisinden rastgele soru üretilir: bir egzersizin düzlemi, agonisti, zinciri; bir kasın hareketi. Sınırsız soru, her seferinde farklı.</p>
    <div class="row between"><span class="small num" id="as"></span><button class="btn sm ghost" id="ar">Skoru sıfırla</button></div><div id="aq"></div><button class="btn" id="an" hidden>Sonraki soru →</button></div>`);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const PL = ["Sagittal", "Frontal", "Transvers"];
  const gen = () => {
    const t = Math.floor(Math.random() * 5);
    const e = pick(A.EX);
    if (t === 0) { const f = pick(e.f); const p = PL.find(x => f[2].includes(x)); if (!p) return gen(); return { q: `${e.n} (${e.tr}) hareketinde ${trl(f[0])} ekleminin "${trl(f[1])}" hareketi hangi düzlemde olur?`, o: PL, a: PL.indexOf(p), e: `${e.n}: ${f[0]} ${trl(f[1])} → ${f[2]}. ${e.ip}` }; }
    if (t === 1) { const others = shuffle(A.EX.filter(x => x.ag !== e.ag && x.b !== e.b)).slice(0, 3).map(x => x.ag); const o = shuffle([e.ag, ...others]); return { q: `${e.n} (${e.tr}) egzersizinin agonist (ana hareket ettirici) kası hangisidir?`, o, a: o.indexOf(e.ag), e: `Sinerjist: ${e.sn}. Antagonist: ${e.an}.` }; }
    if (t === 2) { const o = ["Kapalı", "Açık"]; const z = e.z.includes("Açık") ? 1 : 0; if (!/Açık|Kapalı/.test(e.z)) return gen(); return { q: `${e.n} (${e.tr}) açık mı kapalı kinetik zincir mi?`, o: ["Kapalı kinetik zincir", "Açık kinetik zincir"], a: z, e: `Kapalı zincirde el veya ayak sabit bir yüzeye dayanır; açık zincirde uç serbesttir. Bu hareket: ${e.z}.` }; }
    if (t === 3) { const m = pick(A.MS); const mv = pick(m[3]); const others = shuffle(A.MS.filter(x => x[0] !== m[0] && !x[3].some(y => y[0] === mv[0]))).slice(0, 3).map(x => x[0]); const o = shuffle([m[0], ...others]); return { q: `Hangi kas ${trl(m[2])} ekleminde "${trl(mv[0])}" hareketini yapar?`, o, a: o.indexOf(m[0]), e: `${m[0]} (${m[1]}): ${m[3].map(x => x[0] + " – " + x[1]).join("; ")}. Örnek: ${m[4]}.` }; }
    const others = shuffle(A.EX.filter(x => x.st !== e.st)).slice(0, 3).map(x => x.st); const o = shuffle([e.st, ...others]); return { q: `${e.n} (${e.tr}) sırasında stabilizatör olarak çalışan kaslar hangisidir?`, o, a: o.indexOf(e.st), e: `Nötralizör: ${e.nt}.` };
  };
  const S = ST.atq; let cur = null;
  const upd = () => { $("#as", pg).innerHTML = S.n ? `<b>${S.ok}</b> / ${S.n} doğru (%${Math.round(S.ok / S.n * 100)})` : "Henüz soru çözülmedi"; };
  const next = () => { cur = gen(); $("#an", pg).hidden = true; draw(null); };
  const draw = ch => { const box = $("#aq", pg); box.innerHTML = ""; box.appendChild(mcCard({ num: "?", tag: "Atlas", q: cur.q, o: cur.o, a: cur.a, e: cur.e, chosen: ch, reveal: true, onPick: i => { if (ch != null) return; S.n++; if (i === cur.a) S.ok++; save(); upd(); draw(i); $("#an", pg).hidden = false; } })); };
  $("#an", pg).onclick = () => { next(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $("#ar", pg).onclick = () => { S.ok = 0; S.n = 0; save(); upd(); };
  upd(); next();
};

/* ============ bitirme projesi ============ */
/* norm helpers: classify value by ascending lower bounds -> index into labels */
function byLower(v, bounds) { let i = 0; while (i < bounds.length && v >= bounds[i]) i++; return i; }
const ageBand = (age, edges) => { let i = 0; while (i < edges.length && age >= edges[i]) i++; return Math.max(0, i - 1); };

const NORM = {
  bmi: v => v < 20 ? ["Zayıf", 3] : v < 25 ? ["Sağlıklı", 0] : v < 30 ? ["Hafif şişman", 3] : ["Şişman (obez)", 4],
  bko: (v, s) => { const b = s === "e" ? [.85, .90, .95, 1.00] : [.75, .80, .85, .90]; const L = [["Mükemmel", 0], ["Düşük risk", 1], ["Orta risk", 2], ["Yüksek risk", 3], ["Çok yüksek risk", 4]]; const i = v < b[0] ? 0 : v <= b[1] ? 1 : v <= b[2] ? 2 : v <= b[3] ? 3 : 4; return L[i]; },
  fat: (v, s, age) => {
    const M = [[10, 13, 20, 23], [11, 14, 21, 24], [13, 16, 23, 26], [14, 17, 24, 27], [15, 18, 25, 28]];
    const F = [[15, 19, 28, 31], [16, 20, 29, 32], [17, 21, 30, 33], [18, 22, 31, 34], [19, 23, 32, 35]];
    const b = (s === "e" ? M : F)[ageBand(age, [0, 30, 40, 50, 60])]; const x = Math.round(v);
    const L = [["Çok düşük", 3], ["Düşük", 0], ["Orta", 1], ["Yüksek", 3], ["Çok yüksek", 4]];
    return L[x <= b[0] ? 0 : x <= b[1] ? 1 : x <= b[2] ? 2 : x <= b[3] ? 3 : 4];
  },
  vo2: (v, s, age) => {
    const M = [[41, 45, 50, 55], [40, 43, 47, 53], [37, 41, 45, 52], [34, 37, 42, 49], [30, 34, 38, 45], [27, 30, 35, 41]];
    const F = [[35, 39, 43, 49], [33, 36, 40, 45], [31, 34, 38, 44], [24, 28, 30, 34], [25, 28, 31, 35], [23, 26, 29, 35]];
    const b = (s === "e" ? M : F)[ageBand(age, [0, 30, 40, 50, 60, 70])]; const x = Math.round(v);
    const L = [["Zayıf", 4], ["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]];
    return L[x <= b[0] ? 0 : x <= b[1] ? 1 : x <= b[2] ? 2 : x <= b[3] ? 3 : 4];
  },
  plank: (v, s) => { const b = s === "e" ? [77, 107, 128.5] : [63, 91, 121]; const L = [["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]]; return L[v < b[0] ? 0 : v < b[1] ? 1 : v <= b[2] ? 2 : 3]; },
  squat: (v, s) => { const b = s === "e" ? [30, 58, 76, 103] : [20, 36, 46, 61]; return [["Zayıf", 4], ["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]][byLower(v, b)]; },
  push: (v, s, age) => {
    const M = [[11, 19, 35, 47, 57], [10, 17, 30, 39, 48], [8, 13, 25, 34, 42], [6, 11, 21, 28, 35], [5, 9, 18, 25, 32], [3, 6, 17, 24, 31]];
    const F = [[6, 11, 21, 27, 36], [7, 12, 23, 30, 37], [5, 10, 22, 30, 38], [4, 8, 18, 25, 32], [3, 7, 15, 21, 26], [2, 5, 13, 19, 24]];
    const b = (s === "e" ? M : F)[ageBand(age, [0, 20, 30, 40, 50, 60])];
    return [["Çok kötü", 4], ["Kötü", 4], ["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]][byLower(v, b)];
  },
  situp: (v, s) => { const b = s === "e" ? [17, 20, 26, 31] : [9, 15, 21, 26]; return [["Kötü", 4], ["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]][byLower(v, b)]; },
  sr: v => [["Kötü", 4], ["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]][byLower(v, [28, 34, 46, 56])],
  grip: (v, s) => { const b = s === "e" ? [41, 48, 62, 71] : [22, 25, 38, 42]; return [["Kötü", 4], ["Ortalama altı", 3], ["Ortalama", 2], ["Ortalama üstü", 1], ["Mükemmel", 0]][byLower(v, b)]; },
  bp: (sy, di) => {
    const cs = sy < 130 ? 0 : sy < 140 ? 1 : sy < 160 ? 2 : sy < 180 ? 3 : sy < 210 ? 4 : 5;
    const cd = di < 85 ? 0 : di < 90 ? 1 : di < 100 ? 2 : di < 110 ? 3 : di < 120 ? 4 : 5;
    const L = [["Normal", 0], ["Normal üstü", 2], ["Hafif hipertansiyon", 3], ["Orta hipertansiyon", 4], ["Yüksek", 4], ["Çok yüksek", 4]];
    return L[Math.max(cs, cd)];
  },
  hr: v => v < 60 ? ["Düşük (sporcuda normal)", 1] : v <= 100 ? (v > 75 ? ["Normal, yüksek tarafta", 2] : ["Normal", 0]) : ["Yüksek (taşikardi)", 4]
};
const catTag = c => `<span class="cat c${c[1]}">${esc(c[0])}</span>`;

/* ---- test battery: what, how, result ---- */
const TESTS = [
  { id: "parq", g: "Sağlık taraması", ad: "PAR-Q (Fiziksel Aktiviteye Hazırlık Anketi)", olc: "Egzersize başlamadan önce tıbbi risk var mı?", mal: "PAR-Q formu, kalem", pr: ["Üye 7 soruluk evet/hayır anketini kendisi doldurur (kalp hastalığı, göğüs ağrısı, baş dönmesi, kemik-eklem problemi, tansiyon/kalp ilacı vb.).", "Eğitmen cevapları birlikte okur, belirsiz cevapları netleştirir.", "Form üyenin dosyasına imzalı olarak eklenir."], sonuc: "Tüm cevaplar “hayır” → teste ve programa başlanabilir. Tek bir “evet” bile varsa doktor onayı olmadan yoğun egzersiz ve maksimal test yapılmaz.", ip: "ACSM risk faktörleri de sorgulanır: yaş (erkek ≥45, kadın ≥55), aile öyküsü, sigara, hipertansiyon, kolesterol, diyabet, obezite, sedanter yaşam." },
  { id: "hr", g: "Sağlık taraması", ad: "Dinlenik nabız (KAH)", olc: "Kalp-dolaşım sisteminin dinlenme durumu; maksimal ve hedef nabız hesabının temeli", mal: "Kronometre veya nabız saati", pr: ["İdeali sabah yataktan kalkmadan; salonda en az 5 dakika oturarak dinlendikten sonra ölçülür.", "Radial (bilek) ya da karotis (boyun) atardamarından işaret ve orta parmakla.", "60 saniye sayılır (ya da 15 sn × 4)."], sonuc: "Normal aralık 60–100 atım/dk. Sedanterde ~75, dayanıklılık sporcusunda ~50. Kondisyon arttıkça düşer.", f: "Max KAH = 220 − yaş (manuel s. 106) veya 208 − 0,7 × yaş (s. 168). Hedef KAH (Karvonen) = [(Max KAH − dinlenik KAH) × şiddet] + dinlenik KAH" },
  { id: "bp", g: "Sağlık taraması", ad: "Tansiyon (kan basıncı)", olc: "Sistolik / diyastolik basınç, hipertansiyon riski", mal: "Tansiyon aleti", pr: ["Üye 5 dakika oturarak dinlenir, test öncesi 1 saat kafein almamış olmalı.", "Kol kalp hizasında, destekli; manşon dirseğin 2–3 cm üstünde.", "İki ölçüm alınıp ortalaması yazılır."], sonuc: "ACSM sınıflaması (manuel s. 106, tablodaki “>” işaretleri baskı hatası, doğrusu “<”): Normal < 130/85 · Normal üstü 130–139 / 85–89 · Hafif HT 140–159 / 90–99 · Orta HT 160–179 / 100–109 · Yüksek 180–209 / 110–119 · Çok yüksek ≥ 210 / ≥ 120.", ip: "≥ 140/90 çıkarsa programdan önce doktor onayı istenir." },
  { id: "bmi", g: "Vücut kompozisyonu", ad: "Boy, kilo ve BMI (VKİ)", olc: "Kiloya göre kabaca şişmanlık derecesi", mal: "Stadiometre (boy), baskül", pr: ["Ayakkabısız, hafif kıyafetle ölçülür.", "Boy metre cinsinden, kilo kg cinsinden yazılır."], f: "BMI = kilo (kg) / boy² (m)", sonuc: "< 20 zayıf · 20–25 sağlıklı · 25–30 hafif şişman · ≥ 30 şişman (manuel s. 107; WHO zayıf sınırını 18,5 alır).", ip: "BMI yağ ile kası ayırt edemez; kaslı sporcuda yanıltır. Bu yüzden mutlaka yağ oranıyla birlikte yorumlanır." },
  { id: "bko", g: "Vücut kompozisyonu", ad: "Bel ve kalça çevresi → Bel-kalça oranı", olc: "Yağın nerede toplandığı (abdominal/elma tipi) ve buna bağlı sağlık riski", mal: "Esnemeyen mezura", pr: ["Bel: gövdenin en dar yerinden, normal nefes vermenin sonunda, mezura yere paralel.", "Kalça: kalçanın (gluteal çıkıntının) en geniş yerinden.", "Ölçümler sağ taraftan, deriye bastırmadan alınır."], f: "BKO = bel çevresi (cm) / kalça çevresi (cm)", sonuc: "Erkek: < 0,85 mükemmel · 0,85–0,90 düşük · 0,90–0,95 orta · 0,95–1,00 yüksek · > 1,00 çok yüksek risk. Kadın: < 0,75 · 0,75–0,80 · 0,80–0,85 · 0,85–0,90 · > 0,90.", ip: "Yüksek BKO hipertansiyon, tip 2 diyabet, hiperlipidemi ve koroner kalp hastalığı riskini artırır (s. 107)." },
  { id: "sf", g: "Vücut kompozisyonu", ad: "Deri kıvrımı (skinfold) → % yağ (Sloan-Weir)", olc: "Vücut yağ yüzdesi, yağ kütlesi ve yağsız vücut kütlesi", mal: "Skinfold kaliperi, kalem (nokta işareti)", pr: ["Ölçüm sağ taraftan, üye ayakta ve gevşek.", "Deri ve yağ başparmak ve işaret parmağıyla kas dokusundan ayrılarak katlanır, kaliper 1 cm aşağıdan uygulanır, ~2 sn sonra okunur.", "Her bölge 2–3 kez ölçülür, ortalama alınır.", "Erkek: ön uyluk (kasık ile patella arası orta nokta, dikey) + subskapular (skapula alt açısının altı, 45° diyagonal).", "Kadın: suprailiak (iliak krestin üstü, 45° diyagonal) + triseps (akromion-olekranon orta noktası, dikey)."], f: "Erkek VY = 1,1043 − 0,00133 × uyluk − 0,00131 × subskapular · Kadın VY = 1,0764 − 0,00081 × suprailiak − 0,00088 × triseps · % yağ = (4,57 / VY − 4,142) × 100", sonuc: "Yaş ve cinsiyete göre çok düşük / düşük / orta / yüksek / çok yüksek (s. 108–109). Yağ kütlesi = kilo × % yağ; yağsız kütle = kilo − yağ kütlesi.", ip: "Su durumundan etkilenen biyoelektrik empedans yerine kaliper sahada daha tutarlıdır; aynı kişiyi hep aynı eğitmen ölçmeli." },
  { id: "som", g: "Vücut kompozisyonu", ad: "Somatotip (Heath-Carter)", olc: "Vücut tipi: endomorf (yağlılık) · mezomorf (kas-iskelet) · ektomorf (incelik)", mal: "Kaliper, sürgülü kaliper (çap), mezura, boy ve kilo", pr: ["4 deri kıvrımı: triseps, subskapular, supraspinal, medial baldır.", "2 çap: femur (diz) ve humerus (dirsek) bikondiler genişliği.", "2 çevre: kasılı biseps ve maksimum baldır.", "Boy ve kilo."], sonuc: "Üç sayıyla yazılır: endo.mezo.ekto. Örnek: 1.9.1 ileri derece mezomorf, 9.1.1 ileri derece endomorf, 1.1.9 ileri derece ektomorf, 4.4.3 / 4.3.4 dengeli somatotip (s. 110).", ip: "Programın dili: endomorfta kalori harcaması ve kardiyo, ektomorfta kas kütlesi ve enerji alımı öne çıkar." },
  { id: "bruce", g: "Aerobik uygunluk", ad: "Bruce koşu bandı testi", olc: "Aerobik dayanıklılık ve maksimal oksijen kapasitesi (VO₂max)", mal: "Koşu bandı, kronometre, nabız saati, bir yardımcı", pr: ["5–10 dk hafif tempo ısınma.", "Başlangıç: 2,74 km/s hız, %10 eğim.", "Her 3 dakikada hız ve eğim artırılır: 4,02 km/s %12 → 5,47 %14 → 6,76 %16 → 8,05 %18 → 8,85 %20 …", "Üye devam edemediği anda süre durdurulur ve kaydedilir (T, dakika). Maksimal nabız da yazılır."], f: "Erkek VO₂max = 14,8 − 1,379T + 0,451T² − 0,012T³ · Kadın VO₂max = 4,38T − 3,9 (T dakika; 8:30 = 8,5)", sonuc: "Yaş ve cinsiyete göre zayıf / ortalama altı / ortalama / ortalama üstü / mükemmel (s. 111).", ip: "Maksimal testtir. Sedanter, ileri yaş veya riskli üyede submaksimal Rockport yürüme testi tercih edilir. Göğüs ağrısı, baş dönmesi, solukta anormallikte test hemen durdurulur." },
  { id: "grip", g: "Kuvvet", ad: "Kavrama kuvveti", olc: "Sağ ve sol el kavrama kuvveti (genel kuvvet göstergesi)", mal: "El dinamometresi", pr: ["Dinamometre el ölçüsüne göre ayarlanır.", "Ayakta, kol düz ve gövdeden 10–15° açıda.", "Önce sağ el, sonra sol; her el için 4 deneme, ibre her seferinde sıfırlanır.", "Her elin en iyi değeri alınır."], sonuc: "Erkek sağ el: > 70 mükemmel · 62–69 ort. üstü · 48–61 ortalama · 41–47 ort. altı · < 41 kötü. Kadın sağ el: > 41 · 38–40 · 25–37 · 22–24 · < 22 (s. 113).", ip: "Manuel tablosunda sol el için 56–57 ve 22–23 gibi baskı hatası görünen aralıklar var; sağ el değerleri tutarlı." },
  { id: "plank", g: "Kuvvet", ad: "Plank testi", olc: "Statik core kuvveti ve dayanıklılığı", mal: "Kronometre, mat, bir yardımcı", pr: ["Önkollar ve ayak parmak uçları yerde, vücut düz bir çizgi.", "Ayaklar omuz genişliğinde, eller birleşik veya açık.", "Nizami tutulan süre kaydedilir; ikinci deneme yapılmaz."], sonuc: "Erkek: > 128,5 sn mükemmel · 107–128,5 ort. üstü · 77–106 ortalama · < 77 ort. altı. Kadın: > 121 · 91–121 · 63–90 · < 63 (s. 113).", ip: "Bel çukurlaşıyor ya da kalça yükseliyorsa süre durdurulur: teknik bozulduysa test biter." },
  { id: "squat", g: "Kuvvet", ad: "Statik squat (duvar squat) testi", olc: "Bacak kuvveti ve dayanıklılığı (izometrik)", mal: "Kronometre, duvar, mat", pr: ["Sırt ve kalça duvarda, ayaklar önde omuz genişliğinde.", "Dizler 90°'ye kadar inilir; dizler parmak ucunu geçmez.", "Nizami durulan süre kaydedilir; ikinci deneme yok."], sonuc: "Erkek: > 102 sn mükemmel · 76–102 ort. üstü · 58–75 ortalama · 30–57 ort. altı · < 30 zayıf. Kadın: > 60 · 46–60 · 36–45 · 20–35 · < 20 (s. 114).", ip: "Kilolu üyede vücut ağırlığı testi zorlaştırır; yorumda bunu belirt." },
  { id: "push", g: "Kuvvet", ad: "Şınav (push-up) testi · 30 sn", olc: "Göğüs, kol ve omuz kaslarının kuvveti ve dayanıklılığı", mal: "Kronometre, mat, bir yardımcı", pr: ["Tam şınav pozisyonu; dirsekler 90° olana kadar inilir, yukarıda dirsekler tam açılır.", "30 saniyede nizami tekrar sayılır; ikinci deneme yok.", "Kadınlar için dizler yerde modifiye şınav uygulanabilir."], sonuc: "Yaşa göre 6 kategori: mükemmel, ortalama üstü, ortalama, ortalama altı, kötü, çok kötü (s. 115–116). Ör. erkek 30–39: > 41 · 34–41 · 25–33 · 13–24 · 8–12 · < 8.", ip: "Yarım tekrarlar sayılmaz. Bel çöküyorsa core zayıflığı not edilir." },
  { id: "situp", g: "Kuvvet", ad: "Mekik (sit-up / crunch) testi · 30 sn", olc: "Dinamik gövde kuvveti", mal: "Minder, kronometre, bir yardımcı", pr: ["Sırtüstü, dizler 90°, tabanlar yerde, eller ensede.", "Yukarı çıkarken dirsekler dizlere değer; inişte omuzlar mindere değer.", "“Hazır, başla” komutuyla 30 sn boyunca tekrar sayılır; ikinci deneme yok."], sonuc: "Erkek: > 30 mükemmel · 26–30 ort. üstü · 20–25 ortalama · 17–19 ort. altı · < 17 kötü. Kadın: > 25 · 21–25 · 15–20 · 9–14 · < 9 (s. 117).", ip: "Boyun çekilerek yapılan tekrarlar sayılmaz." },
  { id: "sr", g: "Esneklik", ad: "Otur-uzan (sit and reach)", olc: "Bel, hamstring, gövde ve kalça esnekliği (arka zincir)", mal: "Otur-uzan sehpası (0–50 cm ölçekli; ayak tabanı 15 cm çizgisinde)", pr: ["Isınmadan sonra yerde oturulur, bacaklar tam gergin, tabanlar sehpada.", "Eller üst üste, dizler bükülmeden öne uzanılır.", "En uzak noktada 2 saniye beklenir, cm okunur. En iyi deneme yazılır."], sonuc: "> 55 cm mükemmel · 46–54 ort. üstü · 34–45 ortalama · 29–33 ort. altı · < 28 kötü (s. 118).", ip: "Sonuç “ayak ucuna göre +10 cm” diye verilmişse sehpada 15 + 10 = 25 cm demektir." },
  { id: "post", g: "Postür", ad: "Postür analizi (statik + dinamik)", olc: "Duruş bozuklukları ve kas dengesizlikleri", mal: "Çekül ipi veya postür panosu, fotoğraf", pr: ["Önden, yandan ve arkadan çekül hattına göre bakılır: kulak, omuz, kalça, diz, ayak bileği aynı hatta mı?", "Kontrol listesi: ileri baş, yuvarlak omuz, kifoz, lordoz, düz sırt, skolyoz, pelvik tilt, diz valgus/varus, düz taban.", "Dinamik: overhead squat ile dizlerin içe kaçması, gövdenin öne eğilmesi, topukların kalkması gözlenir."], sonuc: "Bulgu ve muhtemel kısa/zayıf kas yazılır. Ör. dizler içe kaçıyor → gluteus medius zayıf, adduktörler aşırı aktif.", ip: "Postür bozukluğu varsa esneklik ve düzeltici egzersizler önceliğe alınır; ağrı varsa sağlık profesyoneline yönlendirilir." },
  { id: "1mt", g: "Kuvvet", ad: "1 MT (bir maksimum tekrar) tahmini", olc: "Bir hareketteki maksimal kuvvet; yüklemenin %'si için temel", mal: "Serbest ağırlık veya makine", pr: ["Isınma setlerinden sonra 3–10 tekrar yapılabilen bir yükle tükenişe kadar tekrar yapılır.", "Yük ve tekrar sayısı formüle konur.", "Klasik 1 MT denemesi yeni başlayanda risklidir; tahmin formülü tercih edilir."], f: "1 MT = (ağırlık × tekrar × 0,0333) + ağırlık · Brzycki: 1 MT = ağırlık / (1,0278 − 0,0278 × tekrar)", sonuc: "Yüklemeler 1 MT'nin yüzdesiyle verilir: dayanıklılık ~%50, hipertrofi %60–80, maksimal kuvvet %85+.", ip: "Büyük kas ve çok eklemli hareketlerle (squat, bench press, row) yapılır." }
];

const CASE = { s: "e", age: 35, kg: 95, cm: 175, bel: 105, kal: 103, sf1: 30, sf2: 28, hr: 80, sys: "", dia: "", bm: 8, bs: 30, push: 13, squat: 50, situp: 15, plank: 25, sr: 10, srMode: "toe", gr: "", w1: "", r1: "", act: "1.45" };
let CALC = Object.assign({}, CASE, (() => { try { return JSON.parse(localStorage.getItem("fcm-calc") || "null") || {}; } catch (e) { return {}; } })());

ROUTES.proje = async (r, main) => {
  const v = r.split("-")[1] || "genel";
  const tabs = segNav([["proje", "Genel bakış"], ["proje-testler", "Testler tablosu"], ["proje-hesap", "Hesaplayıcı"], ["proje-degerlendirme", "Değerlendirme"], ["proje-program", "Program oluşturucu"], ["proje-dokuman", "Case dokümanı"]], r === "proje-genel" ? "proje" : r);
  const head = `<div class="uhead"><span class="eyebrow">Bitirme projesi</span><h1>${{ genel: "Bitirme projesi nasıl yapılır?", testler: "Test bataryası: ne ölçer, nasıl yapılır, ne sonuç verir", hesap: "Test sonuçlarını hesapla ve yorumla", degerlendirme: "Değerlendirme nasıl yazılır?", program: "Haftalık program ve birim antrenman formu", dokuman: "Case analizi: çözülmüş örnek" }[v] || "Bitirme projesi"}</h1>${tabs}</div>`;
  if (v === "dokuman") { const d = await getJSON("proje"); const toc = d.toc.map((t, j) => `<button data-s="s${j + 1}">${esc(t)}</button>`).join(""); const pg = page(main, head + `<details class="tocm"><summary>İçindekiler</summary><div class="ls">${toc}</div></details><div class="readwrap" style="margin-top:16px"><article class="doc">${d.html}</article><aside class="toc"><b>İçindekiler</b>${toc}</aside></div>`, "unit"); $$("button[data-s]", pg).forEach(b => b.onclick = () => document.getElementById(b.dataset.s).scrollIntoView({ behavior: "smooth" })); return; }
  if (v === "testler") return projeTests(main, head);
  if (v === "hesap") return projeCalc(main, head);
  if (v === "degerlendirme") return projeEval(main, head);
  if (v === "program") return projeProgram(main, head);
  page(main, head + `<div class="stack">
    <p class="doc">Bitirme projesinde sana bir vaka (case) verilir ya da kendi üyeni ölçersin. Senden istenen, Athletic House'un <b>4 Adım Modeli</b>ni baştan sona uygulaman: ölç, değerlendir, hedef koy, programı yaz. Puanı getiren şey hesap değil, her sonucu <b>norm tablosundaki kategorisiyle</b> ve <b>programa etkisiyle</b> birlikte yazabilmek.</p>
    <div class="steps4">
      <div class="card"><h3>Ölçme</h3><p class="small muted">Anamnez, PAR-Q, dinlenik nabız ve tansiyon, boy-kilo, çevre ve deri kıvrımı, aerobik test, kuvvet testleri, esneklik, postür.</p></div>
      <div class="card"><h3>Değerlendirme</h3><p class="small muted">Her sonucu norm tablosuna koy: kategori + ne anlama geliyor + programa ne getiriyor. Sonra genel değerlendirme paragrafı.</p></div>
      <div class="card"><h3>Hedef belirleme</h3><p class="small muted">Öncelik sırası (kalp-dolaşım, MSS/kassal uygunluk, postür-esneklik) ve SMART hedefler: ne, ne kadar, ne zamana kadar.</p></div>
      <div class="card"><h3>Uygulama</h3><p class="small muted">FITT ile kardiyo, kuvvet ve esneklik programı; birim antrenman (ısınma, ana bölüm, soğuma); 6–8 haftada yeniden test.</p></div>
    </div>
    <h2>Testlerin sırası (ACSM)</h2>
    <ol class="steps"><li><b>Dinlenik ölçümler:</b> dinlenik nabız, tansiyon (önce yapılır çünkü egzersiz bunları değiştirir).</li><li><b>Vücut kompozisyonu:</b> boy, kilo, BMI, çevreler, deri kıvrımı, somatotip.</li><li><b>Kalp-solunum dayanıklılığı:</b> Bruce (veya Rockport).</li><li><b>Kas kuvveti ve dayanıklılığı:</b> kavrama, plank, statik squat, şınav, mekik, 1 MT tahmini.</li><li><b>Esneklik:</b> otur-uzan (en sonda, kaslar ısınmışken).</li><li><b>Postür analizi</b> (statik + overhead squat).</li></ol>
    <div class="callout hot"><b>Test öncesi kurallar:</b> son 1 saatte çay, kahve, kola yok; test günü ağır antrenman yok; rahat kıyafet. Göğüs ağrısı, baş dönmesi, bayılma, aşırı nefes darlığında test hemen durdurulur.</div>
    <h2>Workshop vakası (çalışma örneği)</h2>
    <div class="tw"><table><thead><tr><th>Bilgi</th><th>Değer</th><th>Bilgi</th><th>Değer</th></tr></thead><tbody>
      <tr><td>Cinsiyet, yaş</td><td>Erkek, 35</td><td>Dinlenik nabız</td><td>80 atım/dk</td></tr>
      <tr><td>Kilo, boy</td><td>95 kg, 1,75 m</td><td>Bruce süresi</td><td>8:30 dk</td></tr>
      <tr><td>Bel / kalça</td><td>105 / 103 cm</td><td>Şınav (30 sn)</td><td>13</td></tr>
      <tr><td>Uyluk / subskapular</td><td>30 / 28 mm</td><td>Statik squat</td><td>50 sn</td></tr>
      <tr><td>Yaşam tarzı</td><td>Sedanter</td><td>Mekik (30 sn) · Plank</td><td>15 · 25 sn</td></tr>
      <tr><td colspan="2"></td><td>Otur-uzan</td><td>+10 cm</td></tr></tbody></table></div>
    <div class="tw"><table><thead><tr><th>Sonuç</th><th>Değer</th><th>Kategori</th></tr></thead><tbody>
      <tr><td>BMI</td><td>31,0</td><td>${catTag(["Şişman (obez)", 4])} <span class="small muted">workshop “hafif kilolu” demiş, yanlış</span></td></tr>
      <tr><td>Bel-kalça oranı</td><td>1,02</td><td>${catTag(["Çok yüksek risk", 4])}</td></tr>
      <tr><td>% yağ (Sloan-Weir)</td><td>%30,5 · yağ 29 kg</td><td>${catTag(["Çok yüksek", 4])}</td></tr>
      <tr><td>VO₂max (Bruce)</td><td>28,3 ml/kg/dk</td><td>${catTag(["Zayıf", 4])}</td></tr>
      <tr><td>Max nabız · Karvonen %60–75</td><td>185 · 143–159</td><td>Kardiyo hedef aralığı</td></tr>
      <tr><td>Şınav · squat · mekik · plank</td><td>13 · 50 sn · 15 · 25 sn</td><td>${catTag(["Ortalama altı", 3])} ${catTag(["Ortalama altı", 3])} ${catTag(["Kötü", 4])} ${catTag(["Ortalama altı", 3])}</td></tr>
      <tr><td>Otur-uzan</td><td>25 cm (sehpa)</td><td>${catTag(["Kötü", 4])}</td></tr></tbody></table></div>
    <div class="g3">
      <a class="tile" href="#proje-testler"><h3>Testler tablosu →</h3><span class="small muted">16 testin ne ölçtüğü, malzemesi, adım adım protokolü, formülü ve norm sonucu.</span></a>
      <a class="tile" href="#proje-hesap"><h3>Hesaplayıcı →</h3><span class="small muted">Değerleri gir; BMI, BKO, % yağ, VO₂max, Karvonen ve tüm kategoriler, hazır değerlendirme metni.</span></a>
      <a class="tile" href="#proje-degerlendirme"><h3>Değerlendirme →</h3><span class="small muted">Sonuç nasıl yorumlanır, öncelik nasıl seçilir, SMART hedef ve FITT programı nasıl yazılır.</span></a>
      <a class="tile" href="#proje-program"><h3>Program oluşturucu →</h3><span class="small muted">Haftalık program ve birim antrenman formu (ısınma, ana bölüm, soğuma); doldur, yazdır.</span></a>
      <a class="tile" href="#proje-dokuman"><h3>Case dokümanı →</h3><span class="small muted">Workshop vakasının tam çözümü, workshop hataları ve kendi projen için şablon.</span></a>
    </div></div>`);
};

function projeTests(main, head) {
  const groups = [...new Set(TESTS.map(t => t.g))];
  const rows = TESTS.map(t => `<tr><td><b>${esc(t.ad)}</b><br><span class="sub">${esc(t.g)}</span></td><td>${esc(t.olc)}</td><td>${esc(t.mal)}</td><td>${t.f ? `<span class="small">${esc(t.f)}</span>` : '<span class="muted">—</span>'}</td><td>${esc(t.sonuc)}</td></tr>`).join("");
  const pg = page(main, head + `<div class="stack">
    <p class="muted">Önce özet tablo, altında her testin adım adım protokolü. Norm değerleri Athletic House manuelinden (s. 104–118).</p>
    <div class="seg" id="vw"><button aria-selected="true" data-v="t">Özet tablo</button><button data-v="c">Test kartları</button></div>
    <div id="tv"><div class="tw wide-t"><table><thead><tr><th>Test</th><th>Ne ölçer?</th><th>Malzeme</th><th>Formül</th><th>Sonuç / norm</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div id="cv" class="grid" hidden>${groups.map(g => `<div class="qgroup">${esc(g)}</div>` + TESTS.filter(t => t.g === g).map(t => `<details class="tp"><summary><h4>${esc(t.ad)}</h4><span class="pill">${esc(t.g)}</span></summary><div>
      <dl class="roles"><dt class="ag">Ne ölçer</dt><dd>${esc(t.olc)}</dd><dt>Malzeme</dt><dd>${esc(t.mal)}</dd></dl>
      <b>Protokol</b><ol class="steps">${t.pr.map(p => `<li>${esc(p)}</li>`).join("")}</ol>
      ${t.f ? `<div class="callout small"><b>Formül:</b> ${esc(t.f)}</div>` : ""}
      <div><b>Sonuç ve norm:</b> ${esc(t.sonuc)}</div>${t.ip ? `<div class="note">${esc(t.ip)}</div>` : ""}</div></details>`).join("")).join("")}</div>
    <h2>Norm tabloları (yaşa bağlı olanlar)</h2>
    ${normTables()}
  </div>`, "wide");
  $$("#vw button", pg).forEach(b => b.onclick = () => { $$("#vw button", pg).forEach(x => x.setAttribute("aria-selected", x === b)); $("#tv", pg).hidden = b.dataset.v !== "t"; $("#cv", pg).hidden = b.dataset.v !== "c"; });
}
function normTables() {
  const t = (title, head, rows) => `<h3 style="margin-top:8px">${title}</h3><div class="tw"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return `<div class="g2">` +
    `<div>${t("% yağ · erkek", ["", "20–29", "30–39", "40–49", "50–59", "60+"], [["Çok yüksek", ">23", ">24", ">26", ">27", ">28"], ["Yüksek", "21–22", "22–24", "24–26", "25–27", "26–28"], ["Orta", "14–20", "15–21", "17–23", "18–24", "19–25"], ["Düşük", "11–13", "12–14", "14–16", "15–17", "16–18"], ["Çok düşük", "<11", "<12", "<14", "<15", "<16"]])}</div>` +
    `<div>${t("% yağ · kadın", ["", "20–29", "30–39", "40–49", "50–59", "60+"], [["Çok yüksek", ">31", ">32", ">33", ">34", ">35"], ["Yüksek", "29–31", "30–32", "31–33", "32–33", "33–35"], ["Orta", "20–28", "21–29", "22–30", "23–31", "24–32"], ["Düşük", "16–19", "17–20", "18–21", "19–22", "20–23"], ["Çok düşük", "<16", "<17", "<18", "<19", "<20"]])}</div>` +
    `<div>${t("VO₂max · erkek (ml/kg/dk)", ["Yaş", "Zayıf", "Ort. altı", "Ort.", "Ort. üstü", "Mükemmel"], [["20–29", "<42", "42–45", "46–50", "51–55", ">55"], ["30–39", "<41", "41–43", "44–47", "48–53", ">53"], ["40–49", "<38", "38–41", "42–45", "46–52", ">52"], ["50–59", "<35", "35–37", "38–42", "43–49", ">49"], ["60–69", "<31", "31–34", "35–38", "39–45", ">45"], ["70–79", "<28", "28–30", "31–35", "36–41", ">41"]])}</div>` +
    `<div>${t("VO₂max · kadın (ml/kg/dk)", ["Yaş", "Zayıf", "Ort. altı", "Ort.", "Ort. üstü", "Mükemmel"], [["20–29", "<36", "36–39", "40–43", "44–49", ">49"], ["30–39", "<34", "34–36", "37–40", "41–45", ">45"], ["40–49", "<32", "32–34", "35–38", "39–44", ">44"], ["50–59", "<25", "25–28", "29–30", "31–34", ">34"], ["60–69", "<26", "26–28", "29–31", "32–35", ">35"], ["70–79", "<24", "24–26", "27–29", "30–35", ">35"]])}</div>` +
    `<div>${t("Şınav 30 sn · erkek", ["Yaş", "Mük.", "Ort. üstü", "Ort.", "Ort. altı", "Kötü", "Çok kötü"], [["17–19", ">56", "47–56", "35–46", "19–34", "11–18", "<11"], ["20–29", ">47", "39–47", "30–38", "17–29", "10–16", "<10"], ["30–39", ">41", "34–41", "25–33", "13–24", "8–12", "<8"], ["40–49", ">34", "28–34", "21–27", "11–20", "6–10", "<6"], ["50–59", ">31", "25–31", "18–24", "9–17", "5–8", "<5"], ["60–65", ">30", "24–30", "17–23", "6–16", "3–5", "<3"]])}</div>` +
    `<div>${t("Şınav 30 sn · kadın", ["Yaş", "Mük.", "Ort. üstü", "Ort.", "Ort. altı", "Kötü", "Çok kötü"], [["17–19", ">35", "27–35", "21–26", "11–20", "6–10", "<6"], ["20–29", ">36", "30–36", "23–29", "12–22", "7–11", "<7"], ["30–39", ">37", "30–37", "22–29", "10–21", "5–9", "<5"], ["40–49", ">31", "25–31", "18–24", "8–17", "4–7", "<4"], ["50–59", ">25", "21–25", "15–20", "7–14", "3–6", "<3"], ["60–65", ">23", "19–23", "13–18", "5–12", "2–4", "<2"]])}</div>` +
    `<div>${t("Yaştan bağımsız testler", ["Test", "Erkek", "Kadın"], [["Plank (sn)", ">128,5 / 107–128,5 / 77–106 / <77", ">121 / 91–121 / 63–90 / <63"], ["Statik squat (sn)", ">102 / 76–102 / 58–75 / 30–57 / <30", ">60 / 46–60 / 36–45 / 20–35 / <20"], ["Mekik 30 sn", ">30 / 26–30 / 20–25 / 17–19 / <17", ">25 / 21–25 / 15–20 / 9–14 / <9"], ["Kavrama sağ el (kg)", ">70 / 62–69 / 48–61 / 41–47 / <41", ">41 / 38–40 / 25–37 / 22–24 / <22"], ["Otur-uzan (cm)", ">55 / 46–54 / 34–45 / 29–33 / <28", "aynı"]])}<p class="small muted">Sıra: mükemmel → ortalama üstü → ortalama → ortalama altı → kötü/zayıf.</p></div>` +
    `<div>${t("Tansiyon (ACSM, manuel s. 106 düzeltilmiş)", ["Durum", "Sistolik", "Diyastolik"], [["Normal", "<130", "<85"], ["Normal üstü", "130–139", "85–89"], ["Hafif hipertansiyon", "140–159", "90–99"], ["Orta hipertansiyon", "160–179", "100–109"], ["Yüksek", "180–209", "110–119"], ["Çok yüksek", "≥210", "≥120"]])}${t("BMI ve bel-kalça oranı", ["", "Değerler"], [["BMI", "<20 zayıf · 20–25 sağlıklı · 25–30 hafif şişman · ≥30 şişman"], ["BKO erkek", "<0,85 · 0,85–0,90 · 0,90–0,95 · 0,95–1,00 · >1,00"], ["BKO kadın", "<0,75 · 0,75–0,80 · 0,80–0,85 · 0,85–0,90 · >0,90"]])}</div>` +
    `</div>`;
}

/* ---- interactive calculator ---- */
function projeCalc(main, head) {
  const F = (id, label, unit, step = "any") => `<label><span>${label}${unit ? ` <span class="muted">(${unit})</span>` : ""}</span><input type="number" inputmode="decimal" step="${step}" id="c_${id}" value="${esc(CALC[id])}"></label>`;
  const pg = page(main, head + `<div class="stack">
    <div class="callout small">Alanlar workshop vakasıyla dolu geliyor. Kendi üyenin değerlerini yaz; boş bıraktığın test sonuçta görünmez. Girdiğin değerler bu cihazda saklanır.</div>
    <section class="card stack"><div class="row between"><h2>1. Üye bilgileri</h2><div class="row"><button class="btn sm ghost" id="cCase">Workshop vakasını yükle</button><button class="btn sm ghost" id="cClr">Temizle</button></div></div>
      <div class="calc">
        <label>Cinsiyet<select id="c_s"><option value="e">Erkek</option><option value="k">Kadın</option></select></label>
        ${F("age", "Yaş", "yıl", "1")}${F("kg", "Kilo", "kg")}${F("cm", "Boy", "cm")}
        <label>Aktivite düzeyi<select id="c_act"><option value="1.45">Hareketsiz yaşam (1,40–1,50)</option><option value="1.6">Haftada 3–4 kez ılımlı egzersiz (1,55–1,65)</option><option value="1.7">Haftada 4'ten fazla egzersiz (1,65–1,75)</option><option value="1.875">Haftada 6–7 kez, 1 saatten uzun (1,75–2,00)</option></select></label>
      </div></section>
    <section class="card stack"><h2>2. Sağlık ve vücut kompozisyonu</h2><div class="calc">
      ${F("hr", "Dinlenik nabız", "atım/dk", "1")}${F("sys", "Sistolik tansiyon", "mmHg", "1")}${F("dia", "Diyastolik tansiyon", "mmHg", "1")}
      ${F("bel", "Bel çevresi", "cm")}${F("kal", "Kalça çevresi", "cm")}
      <label><span><span id="l1">Ön uyluk SF</span> <span class="muted">(mm)</span></span><input type="number" inputmode="decimal" id="c_sf1" value="${esc(CALC.sf1)}"></label>
      <label><span><span id="l2">Subskapular SF</span> <span class="muted">(mm)</span></span><input type="number" inputmode="decimal" id="c_sf2" value="${esc(CALC.sf2)}"></label>
    </div></section>
    <section class="card stack"><h2>3. Performans testleri</h2><div class="calc">
      <label><span>Bruce süresi <span class="muted">(dk : sn)</span></span><span class="row" style="gap:6px;flex-wrap:nowrap"><input type="number" inputmode="numeric" id="c_bm" value="${esc(CALC.bm)}" aria-label="dakika"><input type="number" inputmode="numeric" id="c_bs" value="${esc(CALC.bs)}" aria-label="saniye"></span></label>
      ${F("push", "Şınav 30 sn", "tekrar", "1")}${F("squat", "Statik squat", "sn")}${F("situp", "Mekik 30 sn", "tekrar", "1")}${F("plank", "Plank", "sn")}
      <label><span>Otur-uzan <span class="muted">(cm)</span></span><input type="number" inputmode="decimal" id="c_sr" value="${esc(CALC.sr)}"><select id="c_srMode"><option value="toe">Ayak ucuna göre (±)</option><option value="box">Sehpa okuması</option></select></label>
      ${F("gr", "Kavrama sağ el", "kg")}
      <label><span>1 MT tahmini <span class="muted">(kg × tekrar)</span></span><span class="row" style="gap:6px;flex-wrap:nowrap"><input type="number" inputmode="decimal" id="c_w1" value="${esc(CALC.w1)}" aria-label="ağırlık"><input type="number" inputmode="numeric" id="c_r1" value="${esc(CALC.r1)}" aria-label="tekrar"></span></label>
    </div></section>
    <section class="stack" id="out"></section></div>`);
  $("#c_s").value = CALC.s; if (!["1.45", "1.6", "1.7", "1.875"].includes(String(CALC.act))) CALC.act = "1.45"; $("#c_act").value = CALC.act; $("#c_srMode").value = CALC.srMode;
  const ids = ["s", "age", "kg", "cm", "act", "hr", "sys", "dia", "bel", "kal", "sf1", "sf2", "bm", "bs", "push", "squat", "situp", "plank", "sr", "srMode", "gr", "w1", "r1"];
  const read = () => { ids.forEach(id => CALC[id] = $("#c_" + id).value); try { localStorage.setItem("fcm-calc", JSON.stringify(CALC)); } catch (e) { } };
  const num = id => { const v = CALC[id]; return v === "" || v == null || isNaN(+v) ? null : +v; };
  const calc = () => {
    read();
    const s = CALC.s, age = num("age"), kg = num("kg"), cm = num("cm"), E = s === "e";
    $("#l1").textContent = E ? "Ön uyluk SF" : "Suprailiak SF"; $("#l2").textContent = E ? "Subskapular SF" : "Triseps SF";
    const rows = []; const R = (name, val, cat, yorum, f) => rows.push({ name, val, cat, yorum, f });
    const res = {};
    if (kg && cm) { const m = cm / 100, b = kg / (m * m); res.bmi = b; R("BMI", fmt(b, 1), NORM.bmi(b), b >= 30 ? "Obezite sınıfında. Eklem yükü düşük kardiyo, beslenme koçluğu ve gerekirse diyetisyene yönlendirme." : b >= 25 ? "Fazla kilolu. Yağ oranıyla birlikte yorumla; kaslı biriyse BMI yanıltabilir." : b < 20 ? "Zayıf sınıfında (WHO sınırı 18,5). Kas kütlesi ve enerji alımı önceliklidir." : "Sağlıklı aralıkta.", `${kg} / (${fmt(m, 2)} × ${fmt(m, 2)})`); }
    const bel = num("bel"), kal = num("kal");
    if (bel && kal) { const r = bel / kal; res.bko = r; const c = NORM.bko(r, s); R("Bel-kalça oranı", fmt(r, 2), c, c[1] >= 3 ? "Yağ karın bölgesinde toplanmış (elma tipi): hipertansiyon, tip 2 diyabet, hiperlipidemi ve koroner kalp hastalığı riski artmış." : "Yağ dağılımı açısından risk düşük.", `${bel} / ${kal}`); }
    const a = num("sf1"), b2 = num("sf2");
    if (a != null && b2 != null && kg && age) {
      const vy = E ? 1.1043 - 0.00133 * a - 0.00131 * b2 : 1.0764 - 0.00081 * a - 0.00088 * b2; const pf = (4.57 / vy - 4.142) * 100; res.fat = pf;
      const fm = kg * pf / 100, lbm = kg - fm; res.fm = fm; res.lbm = lbm;
      const c = NORM.fat(pf, s, age);
      R("% yağ (Sloan-Weir)", "%" + fmt(pf, 1), c, `Yağ kütlesi ${fmt(fm, 1)} kg, yağsız kütle ${fmt(lbm, 1)} kg. ${c[1] >= 3 ? "Yağ oranı yüksek: kalori açığı + kardiyo + kassal dayanıklılık birlikte." : "Yağ oranı uygun aralıkta."}`, `VY = ${fmt(vy, 4)} → (4,57 / VY − 4,142) × 100`);
    }
    const hr = num("hr");
    if (hr && age) {
      const m1 = 220 - age, m2 = 208 - 0.7 * age, rez = m1 - hr; res.max = m1; res.rez = rez;
      R("Dinlenik nabız", hr + " atım/dk", NORM.hr(hr), hr > 75 ? "Kondisyonsuzluk göstergesi; kardiyo antrenmanıyla atım hacmi artınca 6–8 haftada birkaç atım düşmesi beklenir." : "İyi dinlenme nabzı.", "");
      R("Max nabız", `${m1} · ${fmt(m2, 0)}`, ["Hesap", 2], "220 − yaş (s. 106) ve 208 − 0,7 × yaş (s. 168). Projede hangisini kullandığını yaz.", `220 − ${age} · 208 − 0,7 × ${age}`);
    }
    const sy = num("sys"), di = num("dia");
    if (sy && di) { const c = NORM.bp(sy, di); R("Tansiyon", `${sy}/${di}`, c, c[1] >= 3 ? "Hipertansiyon aralığı: programdan önce doktor onayı al, nefes tutma (valsalva) ve baş üstü ağır yüklerden kaçın." : c[1] === 2 ? "Normal üstü: takip et, kardiyo ve kilo kaybı tansiyonu düşürür." : "Normal.", ""); }
    const bm = num("bm"), bs = num("bs") || 0;
    if (bm != null && age) {
      const T = bm + bs / 60; const v = E ? 14.8 - 1.379 * T + 0.451 * T * T - 0.012 * T * T * T : 4.38 * T - 3.9; res.vo2 = v;
      const c = NORM.vo2(v, s, age); const st = Math.min(10, Math.floor(T / 3) + 1);
      R("VO₂max (Bruce)", fmt(v, 1) + " ml/kg/dk", c, `${st}. aşamada bıraktı. ${c[1] >= 3 ? "Aerobik kapasite düşük: toparlanma yavaş, kalori harcaması sınırlı. Kardiyo öncelik 1." : "Aerobik kapasite yeterli; korumak ve geliştirmek için haftada 3–5 kardiyo."}`, E ? `14,8 − 1,379×${fmt(T, 2)} + 0,451×${fmt(T, 2)}² − 0,012×${fmt(T, 2)}³` : `4,38 × ${fmt(T, 2)} − 3,9`);
    }
    const p = num("push"); if (p != null && age) { const c = NORM.push(p, s, age); res.push = c; R("Şınav (30 sn)", p + " tekrar", c, c[1] >= 3 ? "Pectoralis major, anterior deltoid ve triceps dayanıklılığı zayıf." : "Üst vücut itme kuvveti yeterli.", ""); }
    const sq = num("squat"); if (sq != null) { const c = NORM.squat(sq, s); res.squat = c; R("Statik squat", sq + " sn", c, c[1] >= 3 ? "Quadriceps ve gluteal grubun izometrik dayanıklılığı zayıf." : "Bacak dayanıklılığı yeterli.", ""); }
    const su = num("situp"); if (su != null) { const c = NORM.situp(su, s); res.situp = c; R("Mekik (30 sn)", su + " tekrar", c, c[1] >= 3 ? "Rectus abdominis dinamik dayanıklılığı düşük." : "Dinamik gövde kuvveti yeterli.", ""); }
    const pl = num("plank"); if (pl != null) { const c = NORM.plank(pl, s); res.plank = c; R("Plank", pl + " sn", c, c[1] >= 3 ? "Transversus abdominis, multifidus ve oblikler zayıf: yük altında lumbar stabilite yetersiz. Stabilizasyon önceliği." : "Statik core yeterli.", ""); }
    const sr0 = num("sr"); if (sr0 != null) { const v = CALC.srMode === "toe" ? 15 + sr0 : sr0; const c = NORM.sr(v); res.sr = c; R("Otur-uzan", `${fmt(v, 0)} cm${CALC.srMode === "toe" ? ` (15 ${sr0 >= 0 ? "+" : "−"} ${Math.abs(sr0)})` : ""}`, c, c[1] >= 3 ? "Hamstring, bel ve kalça (arka zincir) gergin. Her seans sonunda statik germe, SMR." : "Esneklik yeterli.", ""); }
    const g = num("gr"); if (g != null) { const c = NORM.grip(g, s); res.grip = c; R("Kavrama (sağ el)", g + " kg", c, c[1] >= 3 ? "Genel kuvvet düşük." : "Genel kuvvet iyi.", ""); }
    const w1 = num("w1"), r1 = num("r1"); if (w1 && r1) { const m = w1 * r1 * 0.0333 + w1, bz = w1 / (1.0278 - 0.0278 * r1); R("1 MT tahmini", `${fmt(m, 1)} kg`, ["Hesap", 2], `Brzycki ile ${fmt(bz, 1)} kg. %50 = ${fmt(m * .5, 0)} kg, %70 = ${fmt(m * .7, 0)} kg, %80 = ${fmt(m * .8, 0)} kg.`, `${w1} × ${r1} × 0,0333 + ${w1}`); }

    const out = $("#out");
    if (!rows.length) { out.innerHTML = '<div class="empty">Sonuç görmek için en az yaş, kilo ve boyu gir.</div>'; return; }
    let html = `<h2>4. Sonuçlar ve kategoriler</h2><div class="tw"><table class="res"><thead><tr><th>Ölçüm</th><th>Sonuç</th><th>Kategori</th><th>Yorum (projeye yaz)</th></tr></thead><tbody>${rows.map(x => `<tr><td><b>${esc(x.name)}</b>${x.f ? `<div class="small muted">${esc(x.f)}</div>` : ""}</td><td>${esc(x.val)}</td><td>${catTag(x.cat)}</td><td class="small">${esc(x.yorum)}</td></tr>`).join("")}</tbody></table></div>`;
    if (res.rez != null) {
      const z = [40, 50, 60, 70, 75, 80, 85].map(pc => `<tr><td>%${pc}</td><td class="num"><b>${Math.round(res.rez * pc / 100 + hr)}</b> atım/dk</td><td class="small muted">${pc < 60 ? "Başlangıç, ısınma, yağ yakımına giriş" : pc <= 75 ? "Aerobik gelişim (yeni başlayanın hedef bandı %60–75)" : "Yüksek şiddet, interval"}</td></tr>`).join("");
      html += `<h2>5. Karvonen hedef nabız aralıkları</h2><p class="small muted">Rezerv = ${res.max} − ${hr} = ${res.rez}. Hedef = rezerv × % + ${hr}.</p><div class="tw"><table><thead><tr><th>Şiddet</th><th>Hedef nabız</th><th>Kullanım</th></tr></thead><tbody>${z}</tbody></table></div>`;
    }
    if (kg) {
      const bmh = (E ? 24.2 : 22) * kg, act = +CALC.act; const tdee = bmh * act; const cm = +CALC.cm, ag = +CALC.age; const hb = cm && ag ? (E ? 66 + 13.7 * kg + 5 * cm - 6.8 * ag : 655 + 9.6 * kg + 1.7 * cm - 4.7 * ag) : 0;
      html += `<h2>6. Enerji, su ve hedef kilo</h2><div class="g3">
        <div class="card kpi"><b>${fmt(bmh, 0)}</b><span>BMH (kcal/gün) · ${E ? "24,2" : "22"} × kilo</span></div>
        ${hb ? `<div class="card kpi"><b>${fmt(hb, 0)}</b><span>BMH · Harris-Benedict (kilo, boy, yaş)</span></div>` : ""}
        <div class="card kpi"><b>${fmt(tdee, 0)}</b><span>Günlük ihtiyaç · dolaylı BMH × ${String(CALC.act).replace(".", ",")}</span></div>
        <div class="card kpi"><b>${fmt(kg * 35 / 1000, 1)} L</b><span>Su ihtiyacı · 35 ml × kilo</span></div>
        ${res.lbm ? [25, 20].map(t => `<div class="card kpi"><b>${fmt(res.lbm / (1 - t / 100), 1)} kg</b><span>%${t} yağ için hedef kilo (yağsız kütle sabitken)</span></div>`).join("") : ""}
      </div>`;
    }
    html += `<h2>7. Hazır değerlendirme metni</h2><p class="small muted">Sonuçlara göre otomatik yazıldı. Kopyala, projene yapıştır, kendi cümlelerinle düzelt.</p><div class="report" id="rep">${esc(report(res, { s, age, kg, hr, sy, di }))}</div><div class="row"><button class="btn" id="cp">Metni kopyala</button><button class="btn ghost" onclick="window.print()">Yazdır / PDF</button></div>`;
    out.innerHTML = html;
    $("#cp").onclick = () => { const t = $("#rep").textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Kopyalandı"), () => { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Kopyalandı"); } catch (e) { } ta.remove(); }); };
  };
  ids.forEach(id => $("#c_" + id).addEventListener("input", calc));
  $("#cCase").onclick = () => { CALC = Object.assign({}, CASE); try { localStorage.setItem("fcm-calc", JSON.stringify(CALC)); } catch (e) { } route(); };
  $("#cClr").onclick = () => { CALC = { s: "e", act: "1.45", srMode: "box" }; ids.forEach(k => { if (CALC[k] == null) CALC[k] = ""; }); try { localStorage.setItem("fcm-calc", JSON.stringify(CALC)); } catch (e) { } route(); };
  calc();
}

function report(R, P) {
  const L = [], sex = P.s === "e" ? "erkek" : "kadın";
  const c = x => x ? x[0].toLocaleLowerCase("tr") : null;
  const first = [];
  first.push(`${P.age || "?"} yaşındaki ${sex} üye`);
  if (R.bmi) first.push(`BMI ${fmt(R.bmi, 1)} ile ${c(NORM.bmi(R.bmi))} sınıfındadır`);
  L.push(first.join(", ") + ".");
  const comp = [];
  if (R.fat != null) comp.push(`yağ oranı %${fmt(R.fat, 1)} ile ${c(NORM.fat(R.fat, P.s, P.age))}`);
  if (R.bko != null) comp.push(`bel-kalça oranı ${fmt(R.bko, 2)} ile ${c(NORM.bko(R.bko, P.s))}`);
  if (comp.length) L.push(`Vücut kompozisyonunda ${comp.join(", ")} kategorisindedir.` + (R.bko != null && NORM.bko(R.bko, P.s)[1] >= 3 ? " Abdominal yağlanma hipertansiyon, tip 2 diyabet ve kalp hastalığı riskini artırmaktadır." : ""));
  if (R.vo2 != null) L.push(`VO₂max ${fmt(R.vo2, 1)} ml/kg/dk ile ${c(NORM.vo2(R.vo2, P.s, P.age))} kategorisindedir.`);
  const ms = [["şınav", R.push], ["statik squat", R.squat], ["mekik", R.situp], ["plank", R.plank], ["kavrama", R.grip]].filter(x => x[1]);
  if (ms.length) { const low = ms.filter(x => x[1][1] >= 3); L.push(low.length === ms.length ? `Kas kuvveti ve dayanıklılığı testlerinin tamamı ortalamanın altındadır (${ms.map(x => x[0] + ": " + c(x[1])).join(", ")}).` : low.length ? `Kas testlerinden ${low.map(x => x[0]).join(", ")} ortalamanın altında; ${ms.filter(x => x[1][1] < 3).map(x => x[0]).join(", ")} yeterli seviyededir.` : `Kas kuvveti ve dayanıklılığı testleri ortalama ve üzerindedir.`); }
  if (R.sr) L.push(`Otur-uzan sonucu ${c(R.sr)} kategorisindedir${R.sr[1] >= 3 ? "; arka zincir (hamstring, bel, kalça) esnekliği düşüktür" : ""}.`);
  if (P.sy && P.di) { const b = NORM.bp(P.sy, P.di); L.push(`Tansiyon ${P.sy}/${P.di} mmHg ile ${c(b)} aralığındadır${b[1] >= 3 ? "; programa başlamadan doktor onayı alınmalıdır" : ""}.`); }
  else L.push("Tansiyon ölçülmediyse programdan önce mutlaka ölçülmeli ve PAR-Q doldurulmalıdır.");
  const pr = [];
  const cardioBad = (R.vo2 != null && NORM.vo2(R.vo2, P.s, P.age)[1] >= 3) || (R.bko != null && NORM.bko(R.bko, P.s)[1] >= 3) || (R.bmi >= 30);
  const muscleBad = ms.some(x => x[1][1] >= 3);
  const flexBad = R.sr && R.sr[1] >= 3;
  if (cardioBad) pr.push("kalp-dolaşım sistemi (sağlık riski nedeniyle)");
  if (muscleBad) pr.push("merkezi sinir sistemi ve kassal uygunluk (stabilizasyon ve kuvvette devamlılık)");
  if (flexBad) pr.push("postür ve esneklik");
  if (pr.length) L.push(`Athletic House modeline göre öncelik sırası: ${pr.map((x, i) => `${i + 1}) ${x}`).join(", ")}.`);
  L.push("");
  L.push("Hedefler (SMART):");
  if (R.fat != null && R.fat > 20) L.push(`• 12 hafta içinde yağ oranını %${fmt(R.fat, 1)} seviyesinden %${fmt(Math.max(R.fat - 4, 15), 1)} seviyesine indirmek (haftada 0,5–1 kg kayıp).`);
  if (R.vo2 != null && NORM.vo2(R.vo2, P.s, P.age)[1] >= 2) L.push(`• 8 hafta sonra Bruce testinde VO₂max değerini bir üst kategoriye taşımak.`);
  if (R.plank && R.plank[1] >= 3) L.push("• 6 hafta içinde plank süresini 30 saniye artırmak.");
  if (R.sr && R.sr[1] >= 3) L.push("• 8 haftada otur-uzan sonucunu 5–8 cm artırmak.");
  if (P.hr && P.hr > 75) L.push("• 8 haftada dinlenik nabzı 3–5 atım düşürmek.");
  L.push("• 6–8 hafta sonra tüm testler aynı protokolle tekrarlanacak.");
  if (R.rez != null) { L.push(""); L.push(`Kardiyo FITT: haftada 3–5 gün · Karvonen %50–60 ile başla (${Math.round(R.rez * .5 + P.hr)}–${Math.round(R.rez * .6 + P.hr)} atım/dk), 4. haftadan sonra %60–75 (${Math.round(R.rez * .6 + P.hr)}–${Math.round(R.rez * .75 + P.hr)}) · 20–30 dk'dan 45–60 dk'ya · ${R.bmi >= 30 ? "eklem yükü düşük bisiklet, eliptik, tempolu yürüyüş" : "koşu bandı, bisiklet, eliptik, kürek"}.`); }
  return L.join("\n");
}

/* ---- evaluation guide ---- */
function projeEval(main, head) {
  page(main, head + `<div class="doc" style="max-width:76ch">
  <p>Değerlendirme, ölçtüğün sayıları <b>karara</b> çevirdiğin adımdır. 4 Adım Modeli'nde ölçmeden sonra, hedef belirlemeden önce gelir. Hoca projede en çok buraya bakar: sayıyı doğru hesaplamak yetmez, o sayının ne anlama geldiğini ve programı nasıl değiştirdiğini yazman gerekir.</p>

  <h2 id="e1">1. Her sonuç için üç cümle</h2>
  <p>Her test sonucunu bu üç parçayla yaz. Workshop belgesi çoğunda sadece üçüncüsünü yazmış; sınavda ve projede üçü birlikte istenir.</p>
  <div class="tw"><table><thead><tr><th>Parça</th><th>Soru</th><th>Örnek (plank 25 sn, erkek)</th></tr></thead><tbody>
   <tr><td><b>1. Kategori</b></td><td>Norm tablosunda nereye düşüyor?</td><td>Erkek normunda &lt; 77 sn → <b>ortalama altı</b> (manuel s. 113).</td></tr>
   <tr><td><b>2. Anlamı</b></td><td>Hangi sistem, hangi kas zayıf ya da güçlü?</td><td>Transversus abdominis, multifidus ve oblikler zayıf; yük altında bel stabilitesi yetersiz.</td></tr>
   <tr><td><b>3. Programa etkisi</b></td><td>Bu sonuç programda neyi değiştiriyor?</td><td>İlk 4 hafta stabilizasyon: plank varyasyonları, dead bug, bird dog; ağır serbest ağırlık sonra.</td></tr></tbody></table></div>

  <h2 id="e2">2. Değerlendirme sırası</h2>
  <ol>
   <li><b>Güvenlik:</b> PAR-Q'da “evet” var mı? Tansiyon ≥ 140/90 mı? ACSM risk faktörleri kaç tane? Biri bile varsa doktor onayı yazılır.</li>
   <li><b>Sağlık riski:</b> BMI, bel-kalça oranı, % yağ, dinlenik nabız. Bunlar “hastalık riski” cümlesini kurar.</li>
   <li><b>Kalp-dolaşım:</b> VO₂max kategorisi ve Karvonen hedef aralığı.</li>
   <li><b>Kassal uygunluk:</b> şınav, statik squat, mekik, plank, kavrama. Hangisi en zayıf halka?</li>
   <li><b>Esneklik ve postür:</b> otur-uzan, postür bulguları.</li>
   <li><b>Genel değerlendirme paragrafı:</b> hepsini 5–7 cümlede toplar ve öncelikleri söyler.</li>
  </ol>

  <h2 id="e3">3. Öncelik nasıl seçilir?</h2>
  <p>Athletic House bireyi üç fizyolojik başlıkta değerlendirir: <b>kalp-dolaşım sistemi</b>, <b>merkezi sinir sistemi</b> (koordinasyon, denge, stabilizasyon, kassal uygunluk) ve <b>postür-esneklik</b>. Öncelik, sağlık riskine göre sıralanır.</p>
  <div class="tw"><table><thead><tr><th>Bulgu</th><th>Öncelik</th><th>Neden</th></tr></thead><tbody>
   <tr><td>BMI ≥ 30, BKO yüksek, VO₂max zayıf/ortalama altı</td><td>1 · Kalp-dolaşım</td><td>Hipertansiyon, diyabet, kalp hastalığı riski; kalori harcaması</td></tr>
   <tr><td>Plank, mekik, squat, şınav ortalama altı</td><td>2 · MSS ve kassal uygunluk</td><td>Önce stabilizasyon, sonra kuvvette devamlılık; ağır yük güvenli değil</td></tr>
   <tr><td>Otur-uzan kötü, postür bozukluğu</td><td>3 · Postür-esneklik</td><td>Her seansın sonunda germe, düzeltici egzersiz</td></tr>
   <tr><td>Postür bozukluğu ağrıyla birlikte</td><td>Önce yönlendirme</td><td>Ağrı varsa sağlık profesyoneli; eğitmen teşhis koymaz</td></tr></tbody></table></div>

  <h2 id="e4">4. Kırmızı bayraklar: ne zaman yönlendirirsin?</h2>
  <ul>
   <li>PAR-Q'da tek bir “evet” → doktor onayı.</li>
   <li>Tansiyon ≥ 140/90 → doktor onayı; ≥ 160/100 ise onay gelene kadar test ve yoğun egzersiz yok.</li>
   <li>Test sırasında göğüs ağrısı, baş dönmesi, bayılma hissi, anormal nefes darlığı → test hemen durdurulur.</li>
   <li>Obezite (BMI ≥ 30) ve beslenme sorunu → diyet listesi eğitmenin işi değildir, diyetisyene yönlendir; sen alışkanlık koçluğu yaparsın.</li>
   <li>Kronik hastalık (diyabet, kalp, ortopedik) → EQF 5 sağlık ve egzersiz uzmanı / doktor işbirliği.</li>
  </ul>

  <h2 id="e5">5. Hedef yazmak: SMART</h2>
  <div class="tw"><table><thead><tr><th>Harf</th><th>Anlamı</th><th>Kötü örnek</th><th>İyi örnek</th></tr></thead><tbody>
   <tr><td><b>S</b>pecific</td><td>Belirli</td><td>“Zayıflamak istiyor.”</td><td>“Yağ oranını düşürmek.”</td></tr>
   <tr><td><b>M</b>easurable</td><td>Ölçülebilir</td><td>“Biraz yağ kaybı.”</td><td>“%30,5'ten %26'ya.”</td></tr>
   <tr><td><b>A</b>chievable</td><td>Ulaşılabilir</td><td>“Bir ayda 15 kg.”</td><td>“Haftada 0,5–1 kg.”</td></tr>
   <tr><td><b>R</b>ealistic</td><td>Gerçekçi, kişiye uygun</td><td>“Her gün 2 saat.”</td><td>“Haftada 3 gün, 60 dk.”</td></tr>
   <tr><td><b>T</b>ime-bound</td><td>Zamanlı</td><td>“Bir gün.”</td><td>“12 hafta sonra yeniden test.”</td></tr></tbody></table></div>
  <p>Ara hedefleri norm tablosundan seç: VO₂max'ta hedef bir sonraki kategorinin alt sınırıdır (35 yaş erkek, 28,3 → ara hedef 41 “ortalama altı”). Workshop'taki “40” hedefi hâlâ “zayıf” kategorisinde kalıyor, bu yüzden yanlış.</p>

  <h2 id="e6">6. Programa çevirmek: FITT</h2>
  <div class="tw"><table><thead><tr><th></th><th>Kardiyo</th><th>Kuvvet</th><th>Esneklik</th></tr></thead><tbody>
   <tr><td><b>F</b> Sıklık</td><td>Haftada 3–5</td><td>Haftada 2–3, tüm vücut</td><td>Her seans sonunda</td></tr>
   <tr><td><b>I</b> Yoğunluk</td><td>Karvonen %40–85 (yeni başlayan %50–60 ile başlar)</td><td>1 MT'nin %'si; başlangıçta düşük yük, çok tekrar</td><td>Hafif gerginlik, ağrı yok</td></tr>
   <tr><td><b>T</b> Süre</td><td>20–60 dk</td><td>Set × tekrar ile ifade edilir</td><td>20–30 sn tutuş</td></tr>
   <tr><td><b>T</b> Tip</td><td>Büyük kas gruplu, ritmik, devamlı (obezde eklem yükü düşük: bisiklet, eliptik)</td><td>Büyük ve çok eklemli hareketler önce, küçük ve tek eklemliler sonra</td><td>Statik germe, SMR, dinamik germe ısınmada</td></tr></tbody></table></div>
  <p>Birim antrenman üç bölümdür: <b>harekete hazırlık</b> (ısınma), <b>ana bölüm</b>, <b>soğuma</b>. Program 6–8 haftada bir aynı testlerle yeniden ölçülür ve güncellenir.</p>

  <h2 id="e7">7. Genel değerlendirme paragrafı (örnek)</h2>
  <blockquote>35 yaşında, sedanter erkek üye obez (BMI 31) sınıfındadır. Yağ oranı %30,5 ile çok yüksek, bel-kalça oranı 1,02 ile çok yüksek sağlık riski göstermektedir; abdominal yağlanma hipertansiyon, tip 2 diyabet ve kalp hastalığı riskini artırmaktadır. VO₂max 28,3 ml/kg/dk ile zayıf kategoridedir. Kas dayanıklılığı testlerinin tamamı ortalamanın altındadır; en zayıf halkalar core (plank, mekik) ve esneklik (arka zincir) olarak görülmektedir. Athletic House modeline göre üç başlığın üçünde de gelişime ihtiyaç vardır: kalp-dolaşım (öncelik 1), merkezi sinir sistemi ve kassal uygunluk (öncelik 2) ve esneklik (öncelik 3). Programa başlamadan önce tansiyon ölçülmeli ve PAR-Q doldurulmalıdır.</blockquote>

  <h2 id="e8">8. Sık yapılan hatalar</h2>
  <ul>
   <li>BMI 31'i “hafif kilolu” yazmak. 30 ve üzeri <b>şişman</b>dır.</li>
   <li>Formülü yazmadan sadece sonucu yazmak (ör. “95 − 0,30 = 28,5” gibi işaret hatası). Her hesapta formül, yerine koyma ve sonuç olmalı.</li>
   <li>Kategoriyi yazıp yorum yazmamak ya da tersi.</li>
   <li>Bel-kalça oranı, şınav, squat, mekik gibi bazı testleri hiç değerlendirmemek.</li>
   <li>Ara hedefi kategori sınırını kontrol etmeden koymak.</li>
   <li>Tansiyon ve PAR-Q'yu atlamak.</li>
   <li>Yeniden test tarihini yazmamak.</li>
  </ul>

  <h2 id="e9">9. Teslim öncesi kontrol listesi</h2>
  <ul>
   <li>Üye bilgileri ve anamnez, PAR-Q</li>
   <li>Tüm ölçüm sonuçları tablo halinde (birimleriyle)</li>
   <li>Her hesap: formül → yerine koyma → sonuç (BMI, BKO, % yağ, yağ/yağsız kütle, max nabız, Karvonen, VO₂max)</li>
   <li>Her test: kategori + anlam + programa etkisi</li>
   <li>Genel değerlendirme paragrafı ve öncelik sırası</li>
   <li>SMART hedefler (kısa ve uzun vade)</li>
   <li>FITT ile kardiyo, kuvvet ve esneklik planı; birim antrenman formu</li>
   <li>Beslenme ve yaşam tarzı önerileri (koçluk sınırı içinde)</li>
   <li>Yeniden test tarihi</li>
  </ul>
  <p><a class="btn" href="#proje-hesap">Hesaplayıcıyı aç →</a></p>
  </div>`);
}

/* ============ home, rehber, search, boot ============ */
ROUTES.home = async (r, main) => {
  const read = UNITS.filter(u => ST.read[u.k]).length;
  const answered = UNITS.reduce((a, u) => a + Object.keys((ST.uq[u.k] || {}).ans || {}).length, 0);
  const correct = UNITS.reduce((a, u) => a + ((ST.uq[u.k] || {}).ok || 0), 0);
  const recent = ST.hist.slice(-100); const rp = recent.length ? Math.round(recent.reduce((a, x) => a + x[1], 0) / recent.length * 100) : null;
  const denBest = [0, 1, 2].map(i => ST.den.done[i] ? Object.entries(ST.den.st[i] || {}).length : null);
  const nWrong = Object.keys(ST.wrong).length;
  const lastName = ST.last ? (/^u\d\d/.test(ST.last) ? (() => { const u = UNITS.find(x => x.k === ST.last.slice(0, 3)); return u ? `Ünite ${u.no}: ${u.t}` : ST.last; })() : ({ quiz: "Quiz merkezi", deneme: "Deneme sınavları", atlas: "Hareket atlası", proje: "Bitirme projesi", rehber: "Final rehberi", test: "Karma test", kart: "Flash kartlar", yanlis: "Yanlış defteri" }[ST.last.split("-")[0]] || ST.last)) : null;
  const next = UNITS.find(u => !ST.read[u.k]);
  const dist = CATS.map(c => `<div class="r"><span>${esc(c.n)}</span><div class="bar"><i style="width:${c.w / 30 * 100}%"></i></div><b class="num">%${c.w}</b></div>`).join("");
  const T = (h, ic, t, d) => `<a class="tile" href="#${h}"><span class="ic">${icon(ic)}</span><h3>${t}</h3><span class="muted small">${d}</span></a>`;
  page(main, `<div class="stack">
    <section class="hero"><span class="eyebrow">Uluslararası Fitness Eğitmenliği</span><h1>Berkay, bugün neye çalışıyoruz?</h1>
      <p class="muted">Athletic House eğitiminde birlikte hazırladığımız her şey burada: 18 ünitenin konu anlatımı, orijinal ve ekstra quizler, 3 tam deneme sınavı, hareket analizi atlası ve bitirme projesi rehberi. İlerlemen bu cihazda saklanır.</p>
      <div class="row">${lastName ? `<a class="btn" href="#${ST.last}">Kaldığın yerden devam: ${esc(lastName)}</a>` : ""}${next ? `<a class="btn ${lastName ? "ghost" : ""}" href="#${next.k}">Sıradaki ünite: ${next.no}. ${esc(next.t)}</a>` : ""}</div></section>
    ${homeExtras()}
    <section class="kpis">
      <div class="card kpi"><b>${read}<span style="font-size:20px;color:var(--muted)"> / 18</span></b><span>ünite okundu</span><div class="bar ok" style="margin-top:8px"><i style="width:${read / 18 * 100}%"></i></div></div>
      <div class="card kpi"><b>${answered ? Math.round(correct / answered * 100) + "%" : "–"}</b><span>ekstra quiz doğruluğu (${answered} soru)</span></div>
      <div class="card kpi"><b>${rp == null ? "–" : rp + "%"}</b><span>son 100 cevabın doğruluğu</span></div>
      <div class="card kpi"><b>${nWrong}</b><span><a href="#yanlis">yanlış defterinde</a> bekleyen soru</span></div>
    </section>
    <section class="tiles">
      ${T("uniteler", "book", "Konu anlatımı", "18 ünite, ünite ünite. Her ünitede konu, AH quizi ve ekstra quiz sekmesi.")}
      ${T("quiz", "quiz", "Quiz merkezi", "Karma test oluştur, flash kartlarla çalış, yanlış defterini temizle.")}
      ${T("deneme", "exam", "Deneme sınavları", "Gerçek dağılımla 3 × 100 soru, konu bazlı karne." + (denBest.some(x => x != null) ? " Bitirdiğin deneme var." : ""))}
      ${T("atlas", "atlas", "Hareket analizi atlası", "47 egzersiz: eklem, hareket, düzlem, agonist, antagonist, sinerjist, stabilizatör, nötralizör.")}
      ${T("proje", "proje", "Bitirme projesi", "Testler tablosu, protokoller, norm hesaplayıcı ve değerlendirme rehberi.")}
      ${T("rehber", "guide", "Final sınav rehberi", "En çok çıkacak bilgiler, formüller, manuel hataları, son tekrar planı.")}
      ${T("ezber", "card", "Ezber kartları", "250 bilgi: tanımlar, formüller, sayılar, sık karıştırılan çiftler. Kart, liste ve test.")}
      ${T("sozluk", "dict", "Sözlük", "188 terim ve kısaltma: anatomi, fizyoloji, antrenman, ölçüm, beslenme.")}
      ${T("istatistik", "stats", "İstatistik", "Hangi konuda zayıfsın, ne çalışmalısın, son 14 gün.")}
    </section>
    <section class="card stack"><div class="row between"><h2>Yazılı sınav dağılımı</h2><span class="small muted">100 soru</span></div><div class="dist">${dist}</div>
      <p class="small muted">Ağırlığı en yüksek alan Genel Antrenman (%30), ardından Fonksiyonel Anatomi (%20). Atlas ve ünite 3, 9, 14 anatomi kısmını; ünite 1, 6, 10–13 ve 18 antrenman kısmını kapsar.</p></section>
  </div>`);
  wireHome(main);
};

ROUTES.rehber = async (r, main) => {
  const d = await getJSON("rehber");
  const toc = d.toc.map((t, j) => `<button data-s="s${j + 1}">${esc(t)}</button>`).join("");
  const pg = page(main, `<div class="uhead"><span class="eyebrow">Final sınavı</span><h1>${esc(d.t)}</h1></div>
    <details class="tocm"><summary>İçindekiler · ${d.toc.length} bölüm</summary><div class="ls">${toc}</div></details>
    <div class="readwrap" style="margin-top:16px"><article class="doc">${d.html}</article><aside class="toc"><b>İçindekiler</b>${toc}</aside></div>`, "unit");
  $$("button[data-s]", pg).forEach(b => b.onclick = () => { document.getElementById(b.dataset.s).scrollIntoView({ behavior: "smooth" }); const det = $(".tocm", pg); if (det) det.open = false; });
};

ROUTES.ara = async (r, main) => {
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Arama</span><h1>Ne arıyorsun?</h1></div>
    <input type="search" id="sq" placeholder="ör. Karvonen, rotator cuff, BKO, SAID, gluteus medius" aria-label="Ara" autofocus style="font-size:18px;padding:12px 14px">
    <div class="chipsel" id="sk"><button aria-pressed="true" data-k="konu">Konu anlatımı</button><button aria-pressed="true" data-k="soru">Sorular</button><button aria-pressed="true" data-k="atlas">Atlas, sözlük, ezber</button></div>
    <div class="small muted" id="sn"></div><div class="sres" id="sr"></div></div>`);
  const [IDX, A, EXM, GL, EZ] = await Promise.all([getJSON("search"), getJSON("atlas"), getJSON("exams"), getJSON("sozluk"), getJSON("ezber")]);
  const allU = await loadAllUnits();
  const QS = [];
  allU.forEach(d => { const k = "u" + pad2(d.no); d.extra.forEach(q => QS.push({ r: k + "-quiz", t: `Ünite ${d.no} ekstra quiz · soru ${q.n}`, x: q.q + " — " + q.o[q.a] + ". " + q.e })); d.orig.forEach(q => QS.push({ r: k + "-ah", t: `Ünite ${d.no} AH quizi · soru ${q.n}`, x: q.q + " — " + q.a + ". " + q.e })); });
  EXM.exams.forEach((E, i) => E.forEach((q, j) => QS.push({ r: "deneme-" + (i + 1), t: `Deneme ${i + 1} · soru ${j + 1}`, x: q.q + " — " + q.o[q.a] + ". " + q.e })));
  const AT = A.EX.map(e => ({ r: "atlas-egzersiz", t: `Atlas · ${e.n}`, x: [e.tr, e.ag, e.sn, e.an, e.st, e.nt, e.ip, e.f.map(f => f.join(" ")).join(", ")].join(" · ") })).concat(A.MS.map(m => ({ r: "atlas-kas", t: `Atlas kas · ${m[0]}`, x: [m[1], m[2], m[3].map(a => a.join(" ")).join(", "), m[4], m[5]].join(" · ") })));
  GL.forEach(g => AT.push({ r: "sozluk", t: `Sözlük · ${g.t}`, x: g.x }));
  EZ.facts.forEach(f => AT.push({ r: /^u\d\d$/.test(f.d) ? f.d + "-ozet" : "ezber-formul", t: `Ezber · ${f.q}`, x: f.a.replace(/<[^>]+>/g, "") }));
  IDX.forEach(i => { i.fx = fold(i.x); i.ft = fold(i.t); }); QS.forEach(i => { i.fx = fold(i.x); i.ft = fold(i.t); }); AT.forEach(i => { i.fx = fold(i.x); i.ft = fold(i.t); });
  const on = k => $(`#sk [data-k=${k}]`).getAttribute("aria-pressed") === "true";
  const snip = (txt, terms) => {
    const f = fold(txt); let p = -1; for (const t of terms) { p = f.indexOf(t); if (p >= 0) break; }
    const s = Math.max(0, p - 70), e = Math.min(txt.length, (p < 0 ? 0 : p) + 160);
    let out = esc((s ? "…" : "") + txt.slice(s, e) + (e < txt.length ? "…" : ""));
    terms.forEach(t => { if (t.length < 2) return; const re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"); });
    return out;
  };
  const hl = (html, raw) => { const words = raw.split(/\s+/).filter(w => w.length > 1); words.forEach(w => { const re = new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"); html = html.replace(re, "<mark>$1</mark>"); }); return html; };
  let tm = null;
  const run = () => {
    const raw = $("#sq").value.trim(); const terms = fold(raw).split(/\s+/).filter(Boolean);
    if (!terms.length) { $("#sr").innerHTML = ""; $("#sn").textContent = "En az bir kelime yaz. Türkçe karakter olmadan da bulur (ör. “ozet” → özet)."; return; }
    const m = arr => arr.filter(i => terms.every(t => i.fx.includes(t) || i.ft.includes(t))).map(i => ({ i, sc: terms.reduce((a, t) => a + (i.ft.includes(t) ? 5 : 0) + (i.fx.split(t).length - 1), 0) })).sort((a, b) => b.sc - a.sc);
    const res = [].concat(on("konu") ? m(IDX).map(x => ({ ...x, k: "Konu" })) : [], on("atlas") ? m(AT).map(x => ({ ...x, k: "Atlas" })) : [], on("soru") ? m(QS).map(x => ({ ...x, k: "Soru" })) : []);
    $("#sn").textContent = `${res.length} sonuç`;
    $("#sr").innerHTML = res.slice(0, 80).map((x, n) => `<a href="#${x.i.r}" data-n="${n}"><span class="row between"><span class="t">${esc(x.i.t)}</span><span class="pill">${x.k}</span></span><span class="small muted">${hl(snip(x.i.x, terms), raw)}</span></a>`).join("") || '<div class="empty">Sonuç yok. Daha kısa bir kelime dene.</div>';
    $$("#sr a").forEach(a => a.onclick = () => { const x = res[+a.dataset.n]; if (x.i.s) pendingScroll = "s" + x.i.s; });
  };
  $("#sq").addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(run, 160); });
  $$("#sk button").forEach(b => b.onclick = () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); run(); });
  $("#sq").focus(); run();
};


/* ---- home extras: countdown, goal, quick 10, daily question, last-week plan ---- */
function homeExtras() {
  const dl = daysLeft(), tc = todayCount(), g = ST.cfg.goal;
  const plan = [["Ünite 3 ve 9: kas tabloları, hareket sözlüğü", "u03"], ["Ünite 2, 4 ve 13: fizyoloji, sinir sistemi, kalp ve kardiyo", "u02"], ["Ünite 5: tüm formüller ve norm tabloları; bitirme projesi hesaplarını kendin yap", "u05"], ["Ünite 6, 12 ve 18: antrenman ilkeleri, kuvvet piramidi, program dizaynı", "u06"], ["Ünite 8, 17, 10 ve 11: motivasyon, beslenme, esneklik, postür", "u08"], ["Ünite 1, 7, 14, 15, 16 ve tüm quizleri baştan çöz", "quiz"], ["Formüller ve sayılar + karma 25 soru; yanlışlarına 10 dk bak, erken yat", "karma"]];
  return `<section class="g2">
    <div class="card stack">${dl == null ? `<div><b>Sınav tarihini girmedin</b><p class="small muted">Girersen burada geri sayım ve son hafta planı çıkar.</p></div><div><a class="btn sm ghost" href="#ayarlar">Tarih gir</a></div>` : `<div class="row"><span class="big">${Math.max(dl, 0)}</span><div><b>${dl > 0 ? "gün kaldı" : dl === 0 ? "Sınav bugün, başarılar!" : "Sınav geçti"}</b><div class="small muted">Yazılı sınav · ${new Date(ST.cfg.exam).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })}</div></div></div>`}
      <div class="goalbar"><div class="row between small"><span>Bugünkü hedef</span><span class="num">${tc} / ${g} soru</span></div><div class="bar ok"><i style="width:${Math.min(100, tc / g * 100)}%"></i></div></div>
      <div class="row"><button class="btn" id="q10">⚡ Hızlı 10 soru</button><a class="btn ghost" href="#yanlis">Yanlış defteri (${Object.keys(ST.wrong).length})</a></div></div>
    <div class="card stack" id="gq"><span class="eyebrow">Günün sorusu</span><div class="loading" style="padding:10px 0">…</div></div>
  </section>
  ${dl != null && dl >= 0 && dl <= 7 ? `<section class="card stack"><h2>Son hafta planı</h2><p class="small muted">Final rehberindeki 7 günlük tekrar. Bitirdiğin günü işaretle.</p>${plan.map((p, i) => `<label class="chk"><input type="checkbox" data-pl="${i}" ${ST.plan[i] ? "checked" : ""}> <span><b>${i + 1}. gün:</b> ${esc(p[0])} · <a href="#${p[1]}">aç</a></span></label>`).join("")}</section>` : ""}`;
}
async function wireHome(main) {
  $$("[data-pl]", main).forEach(c => c.onchange = () => { ST.plan[c.dataset.pl] = c.checked; save(); });
  const q10 = $("#q10", main);
  if (q10) q10.onclick = async () => { const p = await buildPool(true, true, CATS.map(c => c.k)); SESSION = { qs: shuffle(p).slice(0, 10), ans: [], i: 0, inst: true, done: false, title: "Hızlı 10 soru" }; saveSess(); go("test"); };
  const box = $("#gq", main); if (!box) return;
  try {
    const all = await loadAllUnits(); const pool = []; all.forEach(d => d.extra.forEach(q => pool.push({ ...q, k: "u" + pad2(d.no), no: d.no })));
    const k = todayKey(); let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const q = pool[h % pool.length]; const id = `${q.k}-${q.n}`; const key = "gq-" + k;
    const draw = () => { const ch = ST.cards[key]; box.innerHTML = '<span class="eyebrow">Günün sorusu</span>'; box.appendChild(mcCard({ id, src: `Ünite ${q.no} ekstra quiz`, c: UCAT[q.k], num: "★", tag: `Ünite ${q.no}`, q: q.q, o: q.o, a: q.a, e: q.e, chosen: ch, reveal: true, onPick: i => { if (ST.cards[key] != null) return; ST.cards[key] = i; markAnswer(id, { ...q, src: `Ünite ${q.no} ekstra quiz`, c: UCAT[q.k] }, i === q.a); save(); draw(); } })); const c = box.querySelector(".q"); c.style.border = "0"; c.style.padding = "0"; };
    draw();
  } catch (e) { box.innerHTML = ""; }
}

/* ============ extras: özet & notlar, ezber, karma, yıldızlı, sözlük, istatistik, ayarlar, program ============ */
const KARMA_C = ["olc", "olc", "fiz", "fiz", "olc", "fa", "fiz", "ant", "fiz", "olc", "olc", "fa", "ant", "ant", "ant", "fa", "olc", "bes", "olc", "fiz", "egi", "fa", "olc", "bes", "ant"];
const todayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const daysLeft = () => { if (!ST.cfg.exam) return null; const d = new Date(ST.cfg.exam + "T09:00:00"); return Math.ceil((d - new Date()) / 864e5); };
const todayCount = () => { const k = todayKey(); return ST.hist.filter(h => todayKey(h[0]) === k).length; };

/* ---- unit: exam summary + personal notes ---- */
async function renderOzet(k, d, box) {
  const E = await getJSON("ezber"); const s = E.summ[k];
  const facts = E.facts.filter(f => f.d === k);
  const fk = ST.fk; const known = facts.filter((f, i) => fk[k + "-" + E.facts.indexOf(f)] === 1).length;
  box.innerHTML = `<div class="stack">
    ${s ? `<div class="callout row between"><span>Final rehberine göre bu üniteden sınavda yaklaşık <b>${s.n} soru</b> bekleniyor.</span><a class="btn sm" href="#ezber-u${k.slice(1)}">Bu ünitenin ezber kartları (${facts.length})</a></div>
    <section class="stack"><h2>Sınavda en çok çıkacaklar</h2><div class="doc" style="max-width:none">${s.html}</div></section>` : '<div class="empty">Bu ünite için özet bulunamadı.</div>'}
    <section class="card stack"><div class="row between"><h2>Notlarım</h2><span class="small muted" id="nsv"></span></div>
      <p class="small muted">Kendi notların, hocanın vurguladıkları, takıldığın yerler. Yazdıkça bu cihaza kaydedilir; Ayarlar'daki yedeğe de dahil.</p>
      <textarea id="nt" rows="10" style="width:100%;font:inherit;font-size:16px;padding:12px;border:1px solid var(--line2);border-radius:8px;background:var(--surface);color:var(--ink);resize:vertical" placeholder="Örn: Rotator cuff = SITS. Teres major dahil değil!">${esc(ST.notes[k] || "")}</textarea></section>
    <div class="row"><span class="small muted">Ezber kartlarında bu üniteden ${known} / ${facts.length} bilgi “bildim” işaretli.</span></div></div>`;
  let t = null;
  $("#nt", box).addEventListener("input", e => { ST.notes[k] = e.target.value; clearTimeout(t); t = setTimeout(() => { save(); $("#nsv", box).textContent = "Kaydedildi"; }, 400); });
}

/* ---- ezber kartları (250 bilgi) ---- */
ROUTES.ezber = async (r, main) => {
  const E = await getJSON("ezber");
  const sel = r.split("-")[1] || "kart";
  const decks = [["hepsi", "Tüm bilgiler"], ...UNITS.map(u => ["u" + u.no, `Ünite ${u.no}`]), ["Formüller", "Formüller"], ["Ezber sayıları", "Ezber sayıları"], ["Sık karıştırılan çiftler", "Karıştırılan çiftler"], ["tekrar", "Bilemediklerim"]];
  const tabs = segNav([["ezber", "Kartlar"], ["ezber-test", "Ezber testi"], ["ezber-liste", "Liste"], ["ezber-formul", "Formüller ve sayılar"]], sel === "test" || sel === "liste" || sel === "formul" ? "ezber-" + sel : "ezber");
  const head = `<div class="uhead"><span class="eyebrow">Ezber</span><h1>Ezber kartları</h1><p class="muted">Final rehberindeki ${E.facts.length} “bilmen gereken” bilgi: ünite ünite tanımlar, formüller, sayılar ve sık karıştırılan çiftler. Kartı çevir, bildim / tekrar de.</p>${tabs}</div>`;
  const deckOf = name => E.facts.map((f, i) => ({ ...f, i })).filter(f => {
    if (name === "hepsi") return true;
    if (name === "tekrar") return ST.fk["f" + f.i] === 0;
    if (/^u\d+$/.test(name)) return f.d === "u" + pad2(+name.slice(1));
    return f.d === name;
  });
  const dname = f => /^u\d\d$/.test(f.d) ? "Ünite " + (+f.d.slice(1)) : f.d;
  if (sel === "formul") {
    page(main, head + `<div class="stack">${["Formüller", "Ezber sayıları", "Sık karıştırılan çiftler"].map(t => `<section class="stack"><h2>${t}</h2><div class="doc" style="max-width:none">${E.summ["_" + t] || ""}</div></section>`).join("")}</div>`);
    return;
  }
  if (sel === "liste") {
    const pg = page(main, head + `<div class="stack"><div class="filters"><input type="search" id="lq" placeholder="Bilgilerde ara"><select id="ld">${decks.filter(d => d[0] !== "tekrar").map(d => `<option value="${esc(d[0])}">${esc(d[1])}</option>`).join("")}</select></div><div class="tw"><table><thead><tr><th>Bilmen gereken</th><th>Cevap</th><th>Kaynak</th></tr></thead><tbody id="lb"></tbody></table></div></div>`);
    const draw = () => { const q = fold($("#lq").value.trim()); $("#lb").innerHTML = deckOf($("#ld").value).filter(f => !q || fold(f.q + " " + f.a).includes(q)).map(f => `<tr><td><b>${esc(f.q)}</b></td><td>${f.a}</td><td class="small muted">${esc(dname(f))}</td></tr>`).join("") || '<tr><td colspan="3">Sonuç yok.</td></tr>'; };
    $("#lq").oninput = draw; $("#ld").onchange = draw; draw(); return;
  }
  if (sel === "test") {
    const pg = page(main, head + `<div class="cardq stack"><p class="small muted">Rastgele bir bilgi sorulur, 4 şıktan doğru cevabı seç. Yanlış şıklar aynı bölümdeki diğer bilgilerden gelir.</p><div class="row between"><select id="td">${decks.filter(d => d[0] !== "tekrar").map(d => `<option value="${esc(d[0])}">${esc(d[1])}</option>`).join("")}</select><span class="small num" id="ts"></span></div><div id="tq"></div><button class="btn" id="tn" hidden>Sonraki →</button></div>`);
    let ok = 0, n = 0, cur;
    const strip = h => { const x = document.createElement("div"); x.innerHTML = h; return x.textContent; };
    const gen = () => { const deck = deckOf($("#td").value); const pool = deck.length >= 4 ? deck : deckOf("hepsi"); const f = pool[Math.floor(Math.random() * pool.length)]; const others = shuffle(pool.filter(x => x.a !== f.a)).slice(0, 3).map(x => strip(x.a)); const o = shuffle([strip(f.a), ...others]); return { q: `${dname(f)} · ${f.q}`, o, a: o.indexOf(strip(f.a)), f }; };
    const draw = ch => { $("#tq").innerHTML = ""; $("#tq").appendChild(mcCard({ num: "?", tag: "Ezber", q: cur.q, o: cur.o, a: cur.a, e: "", chosen: ch, reveal: true, onPick: i => { if (ch != null) return; n++; if (i === cur.a) ok++; ST.fk["f" + cur.f.i] = i === cur.a ? 1 : 0; save(); $("#ts").textContent = `${ok} / ${n} doğru`; draw(i); $("#tn").hidden = false; } })); };
    const next = () => { cur = gen(); $("#tn").hidden = true; draw(null); };
    $("#tn").onclick = next; $("#td").onchange = next; next(); return;
  }
  // flash cards
  const dk = r.split("-")[1] && r !== "ezber" ? decodeURIComponent(r.slice(6)) : "hepsi";
  const cur = decks.find(d => d[0] === dk) ? dk : "hepsi";
  const pg = page(main, head + `<div class="cardq stack"><select id="dsel" aria-label="Deste">${decks.map(d => `<option value="${esc(d[0])}" ${d[0] === cur ? "selected" : ""}>${esc(d[1])} (${deckOf(d[0]).length})</option>`).join("")}</select><div id="fc"></div></div>`);
  $("#dsel").onchange = e => go("ezber-" + e.target.value);
  const deck = shuffle(deckOf(cur)); let i = 0, open = false;
  const box = $("#fc");
  const draw = () => {
    if (!deck.length) { box.innerHTML = '<div class="empty">Bu destede kart yok.</div>'; return; }
    if (i >= deck.length) { box.innerHTML = `<div class="card stack" style="text-align:center"><span class="big">✓</span><b>Deste bitti.</b><button class="btn" id="re">Karıştır ve baştan</button></div>`; $("#re").onclick = () => { i = 0; draw(); }; return; }
    const f = deck[i]; const st = ST.fk["f" + f.i];
    box.innerHTML = `<div class="row between small muted" style="margin:6px 0 8px"><span>${esc(dname(f))}${st === 1 ? ' · <span class="pill ok">bildim</span>' : st === 0 ? ' · <span class="pill warn">tekrar</span>' : ""}</span><span class="num">${i + 1} / ${deck.length}</span></div>
      <div class="card fcard" id="fq"><p class="qt">${esc(f.q)}</p>${open ? `<div style="font-size:18px">${f.a}</div>` : '<span class="small muted">Cevabı görmek için dokun (boşluk tuşu)</span>'}</div>
      <div class="row between" style="margin-top:12px"><button class="btn plain" id="bk" ${i ? "" : "disabled"}>←</button><div class="row">${open ? '<button class="btn ghost" id="un">Tekrar</button><button class="btn" id="kn">Bildim</button>' : '<button class="btn" id="op">Cevabı göster</button>'}</div></div>`;
    const set = v => { ST.fk["f" + f.i] = v; save(); i++; open = false; draw(); };
    $("#fq").onclick = () => { open = !open; draw(); };
    if ($("#op")) $("#op").onclick = () => { open = true; draw(); };
    if ($("#kn")) $("#kn").onclick = () => set(1);
    if ($("#un")) $("#un").onclick = () => set(0);
    $("#bk").onclick = () => { i--; open = false; draw(); };
  };
  draw();
  KEYS = e => { if (e.key === " ") { e.preventDefault(); const b = $("#op") || $("#fq"); b && b.click(); } else if (e.key === "ArrowRight" || e.key === "1") { const b = $("#kn"); b && b.click(); } else if (e.key === "2") { const b = $("#un"); b && b.click(); } else if (e.key === "ArrowLeft") { const b = $("#bk"); b && !b.disabled && b.click(); } };
};

/* ---- final rehberi 25 karma soru ---- */
ROUTES.karma = async (r, main) => {
  const E = await getJSON("ezber"); const S = ST.karma;
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Final rehberi</span><h1>Karma deneme: 25 soru</h1><p class="muted">Final rehberinin son bölümündeki 25 soru, artık açıklamalı ve tıklanabilir. 20 ve üstü doğru = hazırsın; 15'in altıysa rehberin 2–4. bölümlerini bir tur daha oku.</p></div>
    <div class="scorebar"><div class="row between"><span class="small num" id="ks"></span><button class="btn sm ghost" id="kr">Baştan çöz</button></div></div><div class="grid" id="kl"></div></div>`);
  const upd = () => { const n = Object.keys(S).length; const ok = E.karma.filter((q, j) => S[j] === q.a).length; $("#ks").innerHTML = `<b>${ok}</b> doğru · ${n - ok} yanlış · ${25 - n} cevapsız${n === 25 ? ` · <span class="pill ${ok >= 20 ? "ok" : ok >= 15 ? "warn" : "bad"}">${ok >= 20 ? "Hazırsın" : ok >= 15 ? "İyi, biraz daha" : "Rehberi tekrar oku"}</span>` : ""}`; };
  const card = j => { const q = E.karma[j]; const id = "k-" + (j + 1); const c = mcCard({ id, src: "Final rehberi karma", c: KARMA_C[j], num: j + 1, tag: CATN[KARMA_C[j]], q: q.q, o: q.o, a: q.a, e: q.e, chosen: S[j], reveal: true, onPick: i => { if (S[j] != null) return; S[j] = i; markAnswer(id, { ...q, src: "Final rehberi karma, soru " + (j + 1), c: KARMA_C[j] }, i === q.a); save(); c.replaceWith(card(j)); upd(); } }); return c; };
  E.karma.forEach((q, j) => $("#kl").appendChild(card(j)));
  $("#kr").onclick = () => { ST.karma = {}; save(); route(); };
  upd();
};

/* ---- starred questions ---- */
ROUTES.yildiz = async (r, main) => {
  const ids = Object.keys(ST.star);
  if (!ids.length) { page(main, `<div class="uhead"><span class="eyebrow">İşaretlediklerim</span><h1>Henüz işaretli soru yok</h1></div><div class="empty">Herhangi bir sorunun sağ üstündeki ☆ yıldıza basınca buraya düşer. Emin olmadığın, tekrar bakmak istediğin soruları işaretle.<br><br><a class="btn" href="#quiz">Quiz merkezine dön</a></div>`); return; }
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">İşaretlediklerim</span><h1>${ids.length} işaretli soru</h1><div class="row"><button class="btn" id="yt">Test olarak çöz</button></div></div><div class="grid" id="yl"></div></div>`);
  ids.forEach((id, j) => { const q = ST.star[id]; let ch = null; const mk = () => mcCard({ id, src: q.src, c: q.c, num: j + 1, tag: q.src, q: q.q, o: q.o, a: q.a, e: q.e, chosen: ch, reveal: true, onPick: i => { if (ch != null) return; ch = i; markAnswer(id, q, i === q.a); const n = mk(); c.replaceWith(n); c = n; } }); let c = mk(); $("#yl").appendChild(c); });
  $("#yt").onclick = () => { SESSION = { qs: shuffle(ids.map(id => ({ id, ...ST.star[id] }))), ans: [], i: 0, inst: true, done: false, title: "İşaretli sorular testi" }; saveSess(); go("test"); };
};

/* ---- glossary ---- */
ROUTES.sozluk = async (r, main) => {
  const G = await getJSON("sozluk"); const cats = [...new Set(G.map(g => g.c))];
  let cat = null;
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Sözlük</span><h1>Terimler ve kısaltmalar</h1><p class="muted">${G.length} terim: anatomi, fizyoloji, antrenman, ölçüm, beslenme, eğitmenlik ve tüm kısaltmalar (FITT, SAID, EQF, PAR-Q…). Türkçe karakter olmadan da arar.</p></div>
    <input type="search" id="gq" placeholder="Terim ara (ör. eksantrik, KAHR, rotator)" style="font-size:17px;padding:11px 14px">
    <div class="chipsel" id="gc"><button aria-pressed="true" data-c="">Hepsi</button>${cats.map(c => `<button aria-pressed="false" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <div class="small muted" id="gn"></div><div class="grid" id="gl" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))"></div></div>`);
  const draw = () => { const q = fold($("#gq").value.trim()); const l = G.filter(g => (!cat || g.c === cat) && (!q || fold(g.t + " " + g.x).includes(q))); $("#gn").textContent = `${l.length} terim`; $("#gl").innerHTML = l.map(g => `<div class="card" style="padding:14px 16px;display:grid;gap:4px"><div class="row between"><b style="font-size:17px">${esc(g.t)}</b><span class="pill">${esc(g.c)}</span></div><span class="small">${esc(g.x)}</span></div>`).join("") || '<div class="empty">Bulunamadı.</div>'; };
  $("#gq").oninput = draw;
  $$("#gc button").forEach(b => b.onclick = () => { cat = b.dataset.c || null; $$("#gc button").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  draw();
};

/* ---- statistics & weak spots ---- */
ROUTES.istatistik = async (r, main) => {
  const H = ST.hist; const per = {}; CATS.forEach(c => per[c.k] = { t: 0, o: 0 });
  H.forEach(h => { if (h[2] && per[h[2]]) { per[h[2]].t++; per[h[2]].o += h[1]; } });
  const days = []; for (let i = 13; i >= 0; i--) { const k = todayKey(Date.now() - i * 864e5); const l = H.filter(h => todayKey(h[0]) === k); days.push({ k, n: l.length, o: l.reduce((a, h) => a + h[1], 0) }); }
  const mx = Math.max(10, ...days.map(d => d.n));
  const weak = CATS.filter(c => per[c.k].t >= 5).map(c => ({ ...c, p: per[c.k].o / per[c.k].t })).sort((a, b) => a.p - b.p).slice(0, 3);
  const untouched = CATS.filter(c => per[c.k].t < 5);
  const catLinks = { fa: ["u03", "u09", "u14", "atlas"], fiz: ["u02", "u04", "u13"], ant: ["u01", "u06", "u12", "u18"], bes: ["u08", "u17"], egi: ["u08", "u16"], hiz: ["u15", "u07"], olc: ["u05", "proje-testler"] };
  const lk = x => x.startsWith("u") ? `<a href="#${x}">Ünite ${+x.slice(1)}</a>` : `<a href="#${x}">${x === "atlas" ? "Atlas" : "Testler tablosu"}</a>`;
  const unitRows = UNITS.map(u => { const s = unitStats(u.k); const ah = Object.values(ST.ah[u.k] || {}); const kn = ah.filter(v => v === 1).length; return `<tr><td><a href="#${u.k}">${u.no}. ${esc(shortT(u.t))}</a></td><td>${ST.read[u.k] ? '<span class="pill ok">✓</span>' : '<span class="muted">—</span>'}</td><td class="num">${s.n ? `${s.ok}/${s.n}` : "—"}</td><td class="num">${u.nOrig ? `${kn}/${u.nOrig}` : "—"}</td><td class="num">${s.best != null ? "%" + s.best : "—"}</td></tr>`; }).join("");
  const den = [0, 1, 2].map(i => { if (!ST.den.done[i]) return null; return ST.den; });
  const D = await getJSON("exams").catch(() => null);
  const denRows = D ? [0, 1, 2].map(i => { const a = ST.den.st[i] || {}; const n = Object.keys(a).length; const ok = D.exams[i].filter((q, j) => a[j] === q.a).length; return `<tr><td><a href="#deneme-${i + 1}">Deneme ${i + 1}</a></td><td>${ST.den.done[i] ? '<span class="pill acc">bitti</span>' : n ? "devam ediyor" : "başlanmadı"}</td><td class="num">${n ? `${ok} / ${n}` : "—"}</td><td class="num">${ST.den.t[i] ? Math.floor(ST.den.t[i] / 60) + " dk" : "—"}</td></tr>`; }).join("") : "";
  const fkv = Object.values(ST.fk); const tot = H.length, okAll = H.reduce((a, h) => a + h[1], 0);
  page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">İstatistik</span><h1>Nerede güçlüsün, nerede eksiksin?</h1><p class="muted">Bu cihazda çözdüğün tüm sorulardan hesaplanır (ünite quizleri, karma testler, denemeler, yanlış defteri).</p></div>
    <section class="kpis"><div class="card kpi"><b>${tot}</b><span>toplam cevap</span></div><div class="card kpi"><b>${tot ? Math.round(okAll / tot * 100) + "%" : "–"}</b><span>genel doğruluk</span></div><div class="card kpi"><b>${todayCount()}</b><span>bugün çözülen (hedef ${ST.cfg.goal})</span></div><div class="card kpi"><b>${fkv.filter(v => v === 1).length}</b><span>ezber kartı “bildim”</span></div></section>
    <section class="card stack"><h2>Konu alanına göre doğruluk</h2><div class="dist">${CATS.map(c => { const p = per[c.k]; const v = p.t ? Math.round(p.o / p.t * 100) : 0; return `<div class="r"><span>${esc(c.n)} <span class="muted small">(${p.t})</span></span><div class="bar ${v >= 70 ? "ok" : ""}"><i style="width:${v}%"></i></div><b class="num">${p.t ? "%" + v : "–"}</b></div>`; }).join("")}</div>
      <p class="small muted">Yeşil çubuk %70 barajının üstü. Sınavdaki ağırlıklar: anatomi %20, antrenman %30, ölçüm %12…</p></section>
    <section class="card stack"><h2>Ne çalışmalısın?</h2>${weak.length ? `<ol class="steps">${weak.map(w => `<li><b>${esc(w.n)}</b> · doğruluk %${Math.round(w.p * 100)}, sınav ağırlığı %${w.w}. Bak: ${catLinks[w.k].map(lk).join(", ")}</li>`).join("")}</ol>` : '<p class="muted">En az 5 soru çözdüğün alan olunca burada en zayıf 3 alanını göstereceğim.</p>'}
      ${untouched.length ? `<p class="small muted">Henüz yeterince soru çözmediğin alanlar: ${untouched.map(c => esc(c.n)).join(", ")}. <a href="#quiz">Karma test</a> ile bunları da dene.</p>` : ""}</section>
    <section class="card stack"><h2>Son 14 gün</h2><div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;align-items:end;height:120px">${days.map(d => `<div title="${d.k}: ${d.n} soru, ${d.o} doğru" style="display:grid;align-items:end;height:100%"><div style="height:${d.n / mx * 100}%;min-height:${d.n ? 3 : 1}px;background:${d.n ? "var(--accent)" : "var(--line)"};border-radius:3px 3px 0 0;position:relative"><div style="position:absolute;bottom:0;left:0;right:0;height:${d.n ? d.o / d.n * 100 : 0}%;background:var(--ok);border-radius:3px 3px 0 0;opacity:.85"></div></div></div>`).join("")}</div>
      <div class="row between small muted"><span>${days[0].k.slice(5)}</span><span>Mavi: çözülen · Yeşil: doğru</span><span>bugün</span></div></section>
    <section class="stack"><h2>Ünite ünite</h2><div class="tw"><table><thead><tr><th>Ünite</th><th>Okundu</th><th>Ekstra quiz</th><th>AH bildim</th><th>En iyi</th></tr></thead><tbody>${unitRows}</tbody></table></div></section>
    ${denRows ? `<section class="stack"><h2>Denemeler</h2><div class="tw"><table><thead><tr><th>Deneme</th><th>Durum</th><th>Doğru</th><th>Süre</th></tr></thead><tbody>${denRows}</tbody></table></div></section>` : ""}
  </div>`);
};

/* ---- settings, backup ---- */
ROUTES.ayarlar = async (r, main) => {
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Ayarlar</span><h1>Ayarlar ve yedek</h1></div>
    <section class="card stack"><h2>Sınav ve hedef</h2><div class="calc">
      <label><span>Yazılı sınav tarihi</span><input type="date" id="sx" value="${esc(ST.cfg.exam)}" style="font:inherit;padding:9px 12px;border:1px solid var(--line2);border-radius:8px;background:var(--surface);color:var(--ink)"></label>
      <label><span>Günlük soru hedefi</span><input type="number" id="sg" min="5" step="5" value="${ST.cfg.goal}"></label></div>
      <p class="small muted">Tarihi girersen ana sayfada geri sayım ve son 7 günün tekrar planı çıkar.</p></section>
    <section class="card stack"><h2>Görünüm</h2>
      <div class="row"><span>Yazı boyutu</span><span class="seg" id="fz">${[[0.9, "Küçük"], [1, "Normal"], [1.12, "Büyük"], [1.25, "Çok büyük"]].map(([v, l]) => `<button data-v="${v}" aria-selected="${ST.cfg.fz == v}">${l}</button>`).join("")}</span></div>
      <div class="row"><span>Tema</span><span class="seg" id="th">${[["", "Cihaza göre"], ["light", "Açık"], ["dark", "Koyu"]].map(([v, l]) => `<button data-v="${v}" aria-selected="${(ST.theme || "") === v}">${l}</button>`).join("")}</span></div></section>
    <section class="card stack"><h2>İlerlemeni yedekle ve taşı</h2>
      <p class="small muted">İlerlemen (okunan üniteler, quiz cevapları, yanlış defteri, işaretli sorular, notlar, denemeler, hesaplayıcı değerleri) sadece bu tarayıcıda durur. Telefondan bilgisayara geçerken: burada <b>Yedeği indir</b>, diğer cihazda <b>Yedeği yükle</b>.</p>
      <div class="row"><button class="btn" id="bx">Yedeği indir</button><label class="btn ghost" style="cursor:pointer">Yedeği yükle<input type="file" id="bi" accept="application/json,.json" hidden></label><button class="btn plain" id="bc">Panoya kopyala</button></div>
      <details><summary class="small">Dosya yerine metinle taşı</summary><div class="stack" style="margin-top:8px"><textarea id="bt" rows="4" style="width:100%;font:13px monospace;padding:10px;border:1px solid var(--line2);border-radius:8px;background:var(--surface);color:var(--ink)" placeholder="Diğer cihazda kopyaladığın yedek metnini buraya yapıştır"></textarea><button class="btn sm" id="bl">Metinden yükle</button></div></details></section>
    <section class="card stack"><h2>Sıfırla</h2><p class="small muted">Tüm ilerlemeyi siler. Geri alınamaz, önce yedek almanı öneririm.</p><div><button class="btn plain" id="rs" style="color:var(--bad);border-color:var(--bad)">Tüm ilerlemeyi sil</button></div></section>
    <a class="tile" href="#yenilikler"><h3>Yenilikler ve eksikler listesi →</h3><span class="small muted">Sitenin analizi: neler eksikti, neler eklendi, neler hâlâ yapılamıyor.</span></a></div>`);
  $("#sx").onchange = e => { ST.cfg.exam = e.target.value; save(); toast("Sınav tarihi kaydedildi"); };
  $("#sg").onchange = e => { ST.cfg.goal = Math.max(5, +e.target.value || 40); save(); };
  $$("#fz button").forEach(b => b.onclick = () => { ST.cfg.fz = +b.dataset.v; document.documentElement.style.setProperty("--fz", ST.cfg.fz); save(); $$("#fz button").forEach(x => x.setAttribute("aria-selected", x === b)); });
  $$("#th button").forEach(b => b.onclick = () => { ST.theme = b.dataset.v || null; applyTheme(); save(); $$("#th button").forEach(x => x.setAttribute("aria-selected", x === b)); });
  const dump = () => { let calc = null; try { calc = JSON.parse(localStorage.getItem("fcm-calc") || "null"); } catch (e) { } return JSON.stringify({ app: "fitness-calisma", v: 1, at: new Date().toISOString(), st: ST, calc }); };
  const load = txt => { try { const o = JSON.parse(txt); if (o.app !== "fitness-calisma" || !o.st) throw 0; ST = Object.assign(ST, o.st); localStorage.setItem(KEY, JSON.stringify(ST)); if (o.calc) localStorage.setItem("fcm-calc", JSON.stringify(o.calc)); toast("Yedek yüklendi"); setTimeout(() => location.reload(), 700); } catch (e) { toast("Bu dosya geçerli bir yedek değil"); } };
  $("#bx").onclick = () => { const b = new Blob([dump()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `fitness-calisma-yedek-${todayKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); };
  $("#bi").onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => load(rd.result); rd.readAsText(f); };
  $("#bc").onclick = () => { const t = dump(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Yedek metni kopyalandı"), () => { $("#bt").value = t; $("details", pg).open = true; toast("Metni elle kopyala"); }); };
  $("#bl").onclick = () => load($("#bt").value);
  $("#rs").onclick = () => { if (confirm("Tüm ilerleme silinsin mi? Bu geri alınamaz.")) { try { localStorage.removeItem(KEY); localStorage.removeItem("fcm-calc"); } catch (e) { } location.hash = "home"; location.reload(); } };
};

/* ---- weekly program builder (bitirme projesi) ---- */
const PDAY = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
function defaultProgram() {
  return { ad: "", hedef: "Yağ oranını azaltmak, aerobik kapasiteyi ve core dayanıklılığını artırmak", sure: "8 hafta", gunler: [
    { gun: "Pazartesi", isinma: "5–10 dk bisiklet (%50 KAHR) + dinamik germe", ana: [["Goblet Squat", "2", "15", "Hafif", "60 sn", "Kontrollü iniş"], ["Push-up (dizler yerde)", "2", "12", "Vücut ağırlığı", "60 sn", ""], ["Seated Row", "2", "15", "%50 1MT", "60 sn", "Kürek kemikleri geri"], ["Plank", "2", "20 sn", "—", "45 sn", ""]], kardiyo: "Eliptik 20 dk, %50–60 KAHR (133–143)", soguma: "5 dk yürüyüş + statik germe (hamstring, kalça fleksörü, göğüs) 20–30 sn" },
    { gun: "Çarşamba", isinma: "5–10 dk tempolu yürüyüş + dinamik germe", ana: [["Leg Press", "2", "15", "Hafif", "60 sn", ""], ["Lat Pulldown", "2", "15", "%50 1MT", "60 sn", ""], ["Dead Bug", "2", "10/taraf", "—", "45 sn", ""]], kardiyo: "Bisiklet 25 dk, %50–60 KAHR", soguma: "Statik germe + SMR (baldır, quadriceps)" },
    { gun: "Cuma", isinma: "5–10 dk bisiklet + dinamik germe", ana: [["Step-up", "2", "12/bacak", "Vücut ağırlığı", "60 sn", ""], ["Chest Press (makine)", "2", "15", "%50 1MT", "60 sn", ""], ["Bird Dog", "2", "10/taraf", "—", "45 sn", ""]], kardiyo: "Tempolu yürüyüş (eğim %1–3) 25 dk", soguma: "Statik germe" }
  ] };
}
let PROG = (() => { try { return JSON.parse(localStorage.getItem("fcm-prog") || "null"); } catch (e) { return null; } })() || defaultProgram();
function projeProgram(main, head) {
  getJSON("atlas").then(A => { const dl = $("#exnames"); if (dl) dl.innerHTML = A.EX.map(e => `<option value="${esc(e.n)}">`).join(""); }).catch(() => { });
  const sv = () => { try { localStorage.setItem("fcm-prog", JSON.stringify(PROG)); } catch (e) { } };
  const inp = (path, v, ph = "", w = "") => `<input type="text" data-p="${path}" value="${esc(v)}" placeholder="${esc(ph)}" ${w ? `style="width:${w}"` : ""} list="${path.endsWith(".0") ? "exnames" : ""}">`;
  const draw = () => {
    const pg = page(main, head + `<datalist id="exnames"></datalist><div class="stack">
      <p class="muted noprint">Bitirme projesinin “uygulama” kısmı için haftalık program ve birim antrenman formu. Workshop vakasına uygun örnekle dolu geliyor; değiştir, gün ekle, yazdır ya da PDF olarak kaydet. Egzersiz adına yazarken atlastaki 47 hareket öneri olarak çıkar.</p>
      <section class="card stack"><div class="calc"><label><span>Üye</span>${inp("ad", PROG.ad, "Ad soyad")}</label><label style="grid-column:span 2"><span>Program hedefi</span>${inp("hedef", PROG.hedef)}</label><label><span>Süre</span>${inp("sure", PROG.sure)}</label></div></section>
      ${PROG.gunler.map((g, di) => `<section class="card stack"><div class="row between"><select data-p="gunler.${di}.gun">${PDAY.map(d => `<option ${d === g.gun ? "selected" : ""}>${d}</option>`).join("")}</select><button class="btn sm ghost noprint" data-del="${di}">Günü sil</button></div>
        <label class="stack" style="gap:4px"><b class="small">1) Harekete hazırlık (ısınma)</b>${inp(`gunler.${di}.isinma`, g.isinma)}</label>
        <b class="small">2) Ana bölüm · kuvvet</b>
        <div class="tw"><table class="prog"><thead><tr><th>Egzersiz</th><th>Set</th><th>Tekrar</th><th>Yük</th><th>Dinlenme</th><th>Not</th><th class="noprint"></th></tr></thead><tbody>${g.ana.map((x, ei) => `<tr>${x.map((v, ci) => `<td>${inp(`gunler.${di}.ana.${ei}.${ci}`, v, "", ci === 0 ? "190px" : ci === 5 ? "150px" : "80px")}</td>`).join("")}<td class="noprint"><button class="ibtn" data-rm="${di}.${ei}" aria-label="Satırı sil">✕</button></td></tr>`).join("")}</tbody></table></div>
        <div class="noprint"><button class="btn sm plain" data-add="${di}">+ Egzersiz ekle</button></div>
        <label class="stack" style="gap:4px"><b class="small">Ana bölüm · kardiyo (FITT)</b>${inp(`gunler.${di}.kardiyo`, g.kardiyo)}</label>
        <label class="stack" style="gap:4px"><b class="small">3) Soğuma</b>${inp(`gunler.${di}.soguma`, g.soguma)}</label></section>`).join("")}
      <div class="row noprint"><button class="btn plain" id="ad">+ Gün ekle</button><button class="btn" onclick="window.print()">Yazdır / PDF</button><button class="btn ghost" id="rs">Örneğe dön</button></div>
      <div class="callout small">Kontrol: büyük ve çok eklemli hareketler önce · yeni başlayana haftada 2–3 gün tüm vücut · kuvvette devamlılık için 30–90 sn dinlenme · kardiyo Karvonen bandında · her seans ısınma–ana bölüm–soğuma · 6–8 hafta sonra yeniden test.</div></div>`);
    $$("input[data-p],select[data-p]", pg).forEach(el => el.addEventListener("input", () => { const ks = el.dataset.p.split("."); let o = PROG; ks.slice(0, -1).forEach(k => o = o[k]); o[ks[ks.length - 1]] = el.value; sv(); }));
    $$("[data-add]", pg).forEach(b => b.onclick = () => { PROG.gunler[+b.dataset.add].ana.push(["", "2", "12", "", "60 sn", ""]); sv(); draw(); });
    $$("[data-rm]", pg).forEach(b => b.onclick = () => { const [d, e] = b.dataset.rm.split(".").map(Number); PROG.gunler[d].ana.splice(e, 1); sv(); draw(); });
    $$("[data-del]", pg).forEach(b => b.onclick = () => { PROG.gunler.splice(+b.dataset.del, 1); sv(); draw(); });
    $("#ad").onclick = () => { PROG.gunler.push({ gun: "Cumartesi", isinma: "", ana: [["", "2", "12", "", "60 sn", ""]], kardiyo: "", soguma: "" }); sv(); draw(); };
    $("#rs").onclick = () => { if (confirm("Program örnek haline dönsün mü?")) { PROG = defaultProgram(); sv(); draw(); } };
  };
  draw();
}

/* ---- changelog / analysis ---- */
ROUTES.yenilikler = async (r, main) => {
  const L = (t, items) => `<section class="card stack"><h2>${t}</h2><ul class="steps" style="list-style:disc">${items.map(i => `<li>${i}</li>`).join("")}</ul></section>`;
  page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Sürüm 2 · 4 Kasım 2026</span><h1>Analiz: eksikler ve eklenenler</h1><p class="muted">Siteyi baştan sona taradım. Aşağıda neyin eksik olduğu, ne eklendiği ve neyin hâlâ yapılamadığı var.</p></div>
  ${L("Tespit edilen eksikler", [
    "Final rehberindeki ünite özetleri ve 250 “bilmen gereken” bilgi sadece uzun bir sayfada duruyordu; ünite sayfasından ulaşılamıyordu ve çalışılabilir (kart/test) değildi.",
    "Rehberdeki 25 karma soru düz metindi; tıklanamıyor, puanlanmıyor, açıklaması yoktu (sadece 4 hesap açıklaması vardı).",
    "Terimler ve kısaltmalar (FITT, SAID, KAHR, EQF, PNF…) tek yerde değildi.",
    "Hangi konuda zayıf olduğunu gösteren bir istatistik yoktu; yanlış defteri tek doğru cevapta siliniyordu (şans eseri doğru da siliyordu).",
    "İlerleme sadece bir tarayıcıda duruyordu; telefon ile bilgisayar arasında taşımanın yolu yoktu.",
    "Sınav tarihine göre geri sayım, günlük hedef ve son hafta planı yoktu.",
    "Sonra tekrar bakmak için soru işaretleme ve ünite ünite kendi notlarını alma yoktu.",
    "Bitirme projesinin “uygulama” adımı (haftalık program, birim antrenman formu) için doldurulabilir bir form yoktu.",
    "Mobilde alt menüde olmayan sayfalara (rehber, arama, ayarlar) ulaşmak zordu.",
    "Klavye kısayolu, yazı boyutu ayarı ve yeni sürüm bildirimi yoktu."])}
  ${L("Bu sürümde eklenenler", [
    "<a href='#u05-ozet'>Her ünitede “Sınav özeti ve notlar” sekmesi</a>: rehberdeki en çok çıkacak bilgiler, tahmini soru sayısı ve kendi notların.",
    "<a href='#ezber'>Ezber kartları</a>: 250 bilgi, ünite ünite ve formül/sayı/karıştırılan çift desteleri; liste görünümü ve otomatik ezber testi.",
    "<a href='#karma'>Final rehberi karma 25 soru</a>: interaktif, 25'inin de açıklaması yazıldı; karma test havuzuna da eklendi.",
    "<a href='#sozluk'>Sözlük</a>: 188 terim ve kısaltma, kategoriye göre süzme; genel aramaya da dahil.",
    "<a href='#istatistik'>İstatistik</a>: konu alanına göre doğruluk, en zayıf 3 alan ve hangi üniteye bakacağın, son 14 gün grafiği, ünite ve deneme tablosu.",
    "Akıllı yanlış defteri: bir soru ancak üst üste 2 kez doğru cevaplanınca defterden çıkar.",
    "Soru işaretleme (☆) ve <a href='#yildiz'>İşaretlediklerim</a> listesi / testi.",
    "<a href='#ayarlar'>Ayarlar</a>: sınav tarihi, günlük hedef, yazı boyutu, tema, yedeği indir / yükle / panoya kopyala, sıfırlama.",
    "Ana sayfada sınav geri sayımı, bugünkü hedef çubuğu, “Hızlı 10 soru” ve “Günün sorusu”; sınava 7 gün kala son hafta planı (işaretlenebilir).",
    "<a href='#proje-program'>Bitirme projesi → Program oluşturucu</a>: haftalık program ve birim antrenman formu, atlastaki hareketlerden öneri, yazdır / PDF.",
    "Denemelerde süre sınırı (60 / 90 / 120 dk geri sayım, süre bitince otomatik puanlama).",
    "Klavye kısayolları: testte 1–4 veya A–D şık seçer, Enter / → sonraki soru; kartlarda boşluk çevirir.",
    "Mobilde menü düğmesi (☰) ile tüm sayfalara erişim; sitenin yeni sürümü yayınlanınca “yenile” bildirimi."])}
  ${L("Hâlâ yapılamayanlar (neden)", [
    "Ünite 14–18'in Athletic House quizi yok: platformda bu ünitelerin quizi verilmemişti. Bu ünitelerde ekstra quiz ve ezber kartları var.",
    "Otomatik cihazlar arası senkron: sunucu ve hesap gerektirir. Yerine yedek indir / yükle eklendi.",
    "Video derslerin kendisi: dosyalar büyük ve telif nedeniyle siteye konmadı; içerikleri ünite anlatımlarında."])}
  </div>`);
};

/* ---- keyboard shortcuts (per view hook) ---- */
let KEYS = null;
document.addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("input,textarea,select")) return;
  if (KEYS) { KEYS(e); return; }
  const r = location.hash.slice(1);
  if (/^(test|atlas-test|ezber-test)$/.test(r) || r === "") {
    const opts = $$(".q .opt:not([disabled])");
    const m = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    if (m != null && opts[m]) { opts[m].click(); return; }
    if (e.key === "Enter" || e.key === "ArrowRight") { const n = $("#nx") || $("#an") || $("#tn"); if (n && !n.hidden && !n.disabled) n.click(); }
    if (e.key === "ArrowLeft") { const p = $("#pv"); if (p && !p.disabled) p.click(); }
  }
});

/* ---- mobile menu sheet ---- */
(() => {
  const b = document.createElement("button"); b.className = "ibtn menub"; b.setAttribute("aria-label", "Menü"); b.innerHTML = icon("menu");
  $(".top .in").insertBefore(b, $(".top .sp").nextSibling);
  b.onclick = () => {
    const sh = document.createElement("div"); sh.className = "sheet";
    sh.innerHTML = `<div class="sheet-in" role="dialog" aria-label="Menü"><div class="row between"><b style="font-family:var(--display);font-size:22px">Menü</b><button class="ibtn" id="shx" aria-label="Kapat">✕</button></div>${NAV.map(n => `<a href="#${n[0]}">${icon(n[2])}<span>${n[1]}</span></a>`).join("")}<a href="#karma">${icon("quiz")}<span>Karma 25 soru</span></a><a href="#yildiz">${icon("star")}<span>İşaretlediklerim</span></a><a href="#yenilikler">${icon("guide")}<span>Yenilikler ve eksikler</span></a></div>`;
    document.body.appendChild(sh);
    const close = () => sh.remove();
    sh.onclick = e => { if (e.target === sh || e.target.closest("a") || e.target.closest("#shx")) close(); };
  };
})();

/* boot */
window.addEventListener("hashchange", () => $$(".sheet").forEach(s => s.remove()));
route();
if ("serviceWorker" in navigator && window.top === window && /^https:/.test(location.protocol) && !/claude|anthropic/.test(location.hostname)) {
  const had = !!navigator.serviceWorker.controller;
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then(reg => { setInterval(() => reg.update().catch(() => { }), 30 * 60 * 1000); }).catch(() => { }));
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!had) return;
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = 'Sitenin yeni sürümü hazır. <button class="btn sm" style="margin-left:8px">Yenile</button>';
    t.querySelector("button").onclick = () => location.reload(); document.body.appendChild(t);
  });
}
