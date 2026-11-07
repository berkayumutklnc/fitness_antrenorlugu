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
  bone: '<path d="M8.5 8.5l7 7"/><circle cx="7" cy="5" r="2.2"/><circle cx="5" cy="7.5" r="2.2"/><circle cx="17" cy="19" r="2.2"/><circle cx="19" cy="16.5" r="2.2"/>',
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
  ["anatomi", "Anatomi kampı", "bone", null],
  ["uygulama", "Uygulamalı sınav", "atlas", null],
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
      ${["u03", "u09", "u14"].includes(k) ? `<a class="callout ok" href="#anatomi" style="display:block;margin-top:14px;text-decoration:none;color:inherit"><b>Anatomi aklında kalmıyor mu?</b> Anatomi kampında kaslara dokunarak öğren, düzlemleri animasyonla gör, "Kası bul" oyununu oyna →</a>` : ""}
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
      ${T("anatomi", "bone", "Anatomi kampı", "Dokunmalı kas ve iskelet haritası, animasyonlu düzlemler, kası bul oyunu, hareket zinciri, kutu sistemli kartlar.")}
      ${T("uygulama", "atlas", "Uygulamalı sınav", "Hoca 'omuza sagital düzlemde fleksiyon yaptır' derse: egzersiz, kaslar, Anlat → Göster → Uygulat → Düzelt metni ve pratik modu.")}
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

/* ============ Anatomi kampı: kas & iskelet haritası, yön/düzlem, oyunlar, kartlar ============ */
/* Kaynak: Ünite 3 ve 9 dokümanları (manuel s. 35–58, 132, 141–143). */
const AM = [
  // id, ad, Türkçe, görünüm (on/arka/derin), bölge, nerede, ne yapar, egzersiz, hafıza ipucu
  ["pec", "Pectoralis major", "Büyük göğüs kası", "on", "Göğüs", "Göğüs önü, yelpaze şeklinde; sternum ve klavikuladan humerusa", "Kola adduksiyon, iç rotasyon, fleksiyon; yatay adduksiyon", "Bench press, push-up, chest fly", "Pectoralis = göğüs, major = büyük. Birine sarıldığını düşün: kolları önde birleştirmek (yatay adduksiyon) tam olarak pec'in işi."],
  ["pecmin", "Pectoralis minor", "Küçük göğüs kası", "derin", "Göğüs", "Pectoralis major'un altında, derin", "Kürek kemiğini öne ve aşağı çeker", "Dips (yardımcı)", "Minor = küçük. Büyük kardeşin altına saklanmış küçük kas; omzu öne yuvarlar (kambur postürde kısalır)."],
  ["serr", "Serratus anterior", "Ön dişli kas", "on", "Göğüs", "Kaburgaların yanında, testere dişi gibi", "Kürek kemiğini öne taşır (protraksiyon), göğüs kafesine yapışık tutar", "Push-up plus, punch", "Serratus = testere. 'Boksör kası': yumruk atarken kürek kemiğini öne iten kas."],
  ["lat", "Latissimus dorsi", "Sırtın en geniş kası", "arka", "Sırt", "Bel ve alt sırttan kolun içine; V şeklini verir", "Omuz ekstansiyonu, adduksiyon ve iç rotasyon", "Lat pulldown, barfiks, row", "Latissimus = en geniş, dorsi = sırt. Barfikste seni yukarı çeken 'kanatlar'. Kolu yukarıdan aşağı-geriye çeker."],
  ["trap", "Trapezius", "Kukulya kası", "arka", "Sırt", "Boyundan sırtın ortasına elmas (trapez) şeklinde; üst, orta, alt lifler", "Üst lif: skapula elevasyonu (shrug) ve boyun ekstansiyonu; orta lif: kürekleri geri çeker; alt lif: kürekleri aşağı indirir", "Shrug (üst), face pull, row (orta)", "Adı şeklinden: trapez. Omuz silkme = üst trapez. 'Bilmiyorum' derken omuz silkersin, trapezini çalıştırırsın."],
  ["rhomb", "Rhomboidler (major, minor)", "Eşkenar dörtgen kaslar", "derin", "Sırt", "Trapezius'un altında, omurga ile kürek kemiği arası", "Kürek kemiklerini birbirine yaklaştırır (retraksiyon)", "Seated row, reverse fly", "Rhombus = eşkenar dörtgen. 'Göğsünü aç, kürek kemiklerinin arasında kalem sıkıştır' dediğinde çalışan kas."],
  ["teres", "Teres major", "Büyük yuvarlak kas", "arka", "Sırt", "Kürek kemiğinin alt köşesi", "Latissimus'a yardım: omuz ekstansiyonu, iç rotasyon", "Row, pulldown", "Teres = yuvarlak. 'Lat'ın küçük kardeşi': aynı işi yapar, kürek kemiğinin alt köşesinden başlar."],
  ["erec", "Erector spinae", "Omurgayı dikleştiren kas", "arka", "Sırt / core", "Omurga boyunca iki sütun (halat)", "Omurga ekstansiyonu, lateral fleksiyon ve rotasyon; omurgayı dik tutar", "Back extension, deadlift, superman", "Erector = dik tutan, spinae = omurga. Omurganın iki yanındaki 'halatlar'. Öne eğilirken frenler (eksantrik)."],
  ["delt", "Deltoid (ön, orta, arka)", "Omuz kası", "on", "Omuz", "Omzu saran üçgen kas; 3 baş", "Ön: omuz fleksiyonu · Orta: abduksiyon · Arka: ekstansiyon", "Front raise, lateral raise, reverse fly, shoulder press", "Delta harfi (Δ) gibi üçgen. Üç baş = üç yön: öne kaldır (ön), yana aç (orta), geri çek (arka)."],
  ["supra", "Supraspinatus", "Diken üstü kası (rotator cuff)", "derin", "Omuz", "Kürek kemiğinin üstü (spina scapula'nın üstü)", "Abduksiyonun ilk 15°'si", "–", "Supra = üstünde. Kolu yana açarken ilk 15°'yi başlatan 'marş motoru'; sonra orta deltoid devralır."],
  ["infra", "Infraspinatus ve teres minor", "Diken altı kası (rotator cuff)", "arka", "Omuz", "Kürek kemiğinin arkası", "Dış rotasyon", "Band ile dış rotasyon", "Infra = altında. Dirsek 90° yanda, ön kolu dışa açmak (kapıyı dışa açmak) = dış rotasyon."],
  ["subsc", "Subscapularis", "Kürek altı kası (rotator cuff)", "derin", "Omuz", "Kürek kemiğinin ön yüzü (kaburgalara bakan yüz)", "İç rotasyon", "Band ile iç rotasyon", "Sub = altında, scapula = kürek. Rotator cuff'ın tek iç rotatörü: 'kolunu karnına sar'."],
  ["scm", "Sternocleidomastoid", "Göğüs-köprücük-meme kası", "on", "Boyun", "Kulağın arkasından sternum ve klavikulaya çapraz", "Servikal fleksiyon, rotasyon ve lateral fleksiyon", "Boyun esnetme, izometrik çalışma", "İsim üç yapışma yerini sayar: sterno (göğüs kemiği) + cleido (köprücük) + mastoid (kulak arkası çıkıntı)."],
  ["bic", "Biceps brachii", "İki başlı kol kası (pazu)", "on", "Kol", "Üst kolun önü", "Dirsek fleksiyonu, ön kola supinasyon, omuza fleksiyon", "Biceps curl, chin-up", "Bi = 2 baş, brachii = kol. Curl yapar ve 'çorba tutar': avuç yukarı çevirme (supinasyon)."],
  ["brach", "Brachialis", "Kol kası", "derin", "Kol", "Biceps'in altında, derin", "Dirsek fleksiyonu (en güçlü fleksör)", "Hammer curl", "Biceps'in altındaki gizli işçi. Avuç ne tarafa bakarsa baksın dirseği büken asıl güç."],
  ["brrad", "Brachioradialis", "Kol-radius kası", "on", "Ön kol", "Ön kolun dış üstü", "Dirsek fleksiyonu (yarı prone el, çekiç tutuşu)", "Hammer curl, reverse curl", "Brachio (kol) + radialis (radius): kolu radiusa bağlar. Çekiç tutar gibi curl."],
  ["tri", "Triceps brachii", "Üç başlı kol kası", "arka", "Kol", "Üst kolun arkası; uzun, lateral, medial baş", "Dirsek ekstansiyonu, omuz ekstansiyonu", "Triceps pushdown, dips, overhead extension", "Tri = 3 baş. Kapıyı iterek kapatmak, şınavda kolu düzleştirmek: dirsek ekstansiyonu."],
  ["fore", "Ön kol fleksör ve ekstansörleri", "Ön kol kasları", "on", "Ön kol", "Ön kolun iç (fleksör) ve dış (ekstansör) yüzü", "Bilek ve parmak fleksiyonu / ekstansiyonu, kavrama", "Wrist curl, farmer walk", "Avuç içi tarafı büker (fleksör), el sırtı tarafı açar (ekstansör)."],
  ["rect", "Rectus abdominis", "Düz karın kası (six-pack)", "on", "Gövde / core", "Karının önü, sternumdan pubise dikey", "Omurga fleksiyonu, lateral fleksiyon, rotasyon", "Crunch, reverse crunch", "Rectus = düz, abdominis = karın. Sternumdan pubise düz şerit; crunch'ta göğsü leğene yaklaştırır."],
  ["eobl", "External oblique", "Dış eğik karın kası", "on", "Gövde / core", "Karının yanı, en yüzeyel; lifler 'elleri cebe sokma' yönünde", "Omurga fleksiyonu, lateral fleksiyon, karşı tarafa (kontralateral) rotasyon", "Russian twist, bicycle crunch, woodchop", "Ellerini ön ceplerine sok: parmakların dış eğik liflerinin yönünü gösterir. Dış eğik = karşı tarafa döndürür."],
  ["iobl", "Internal oblique", "İç eğik karın kası", "derin", "Gövde / core", "External oblique'in altında, lifleri ters yönde", "Aynı tarafa (ipsilateral) rotasyon, lateral fleksiyon", "Side plank, woodchop", "İç = İpsilateral (aynı taraf). Dış = karşı taraf. 'İç-İ' eşleşmesiyle hatırla."],
  ["tva", "Transversus abdominis", "Enine karın kası", "derin", "Gövde / core", "En derin karın kası, korse gibi yatay", "Karın içi basıncı artırır, omurgayı stabilize eder; hareket yaptırmaz", "Vacuum, dead bug, plank", "Transversus = enine. Bel korsesi / kemer gibi sarar. Hareket yaptırmaz, sıkar."],
  ["multi", "Multifidus", "Çok parçalı kas", "derin", "Gövde / core", "Omurlar arasında, en derin sırt kası", "Omurları tek tek stabilize eder", "Bird dog", "Multi = çok, fidus = parçalı. Her omuru tek tek tutan küçük kas zinciri."],
  ["ql", "Quadratus lumborum", "Dört köşe bel kası", "derin", "Gövde / core", "Belin derininde, son kaburga ile leğen arası", "Lateral fleksiyon, leğeni yukarı kaldırma", "Side plank, suitcase carry", "Quadratus = dört köşe, lumborum = bel. Tek elle valiz taşırken gövdeni dik tutan kas."],
  ["dia", "Diyafram", "Diyafram", "derin", "Gövde / core", "Akciğerlerin altında kubbe şeklinde", "Solunumun ana kası; core'un 'tavanı'", "Diyafram nefesi", "Core bir kutu: diyafram tavan, pelvik taban zemin, TVA ve obliqueler duvarlar, multifidus-erector arka duvar."],
  ["pelf", "Pelvik taban kasları", "Pelvik taban", "derin", "Gövde / core", "Leğenin tabanı", "Core'un 'tabanı'", "Kegel", "Core kutusunun zemini."],
  ["gmax", "Gluteus maximus", "Büyük kalça kası", "arka", "Kalça", "Kalçanın arkası; vücudun en büyük kası", "Kalça ekstansiyonu, dış rotasyon", "Hip thrust, squat, deadlift, lunge", "Maximus = en büyük. Merdiven çıkarken, çömelmeden kalkarken kalçayı açan (ekstansiyon) motor."],
  ["gmed", "Gluteus medius", "Orta kalça kası", "arka", "Kalça", "Kalçanın yanı, maximus'un üstü", "Kalça abduksiyonu, iç ve dış rotasyon; tek ayakta leğeni dengeler", "Side-lying leg raise, band walk, clamshell", "Medius = orta, yanda. Tek ayakta durunca leğenin düşmesini engeller; zayıfsa squat'ta diz içe kaçar."],
  ["gmin", "Gluteus minimus", "Küçük kalça kası", "derin", "Kalça", "Medius'un altında, en derin", "Abduksiyon, iç rotasyon", "Side-lying leg raise", "Minimus = en küçük. Medius'un altında, onunla aynı işi yapar."],
  ["ilio", "Iliopsoas (psoas major + iliacus)", "Kalça fleksörü", "derin", "Kalça", "Bel omurlarından ve leğenden femura; derin", "Kalça fleksiyonu (ana kalça fleksörü)", "Leg raise, knee raise", "İlio (ilium, leğen) + psoas (bel). Dizi göğsüne çeken kas; uzun oturmakta kısalır."],
  ["tfl", "Tensor fasciae latae (TFL)", "Uyluk fasyası gerici kası", "on", "Kalça", "Kalçanın ön-yanı", "Kalça fleksiyonu, abduksiyonu, iç rotasyonu", "–", "Tensor = gerici, fasciae latae = uyluğun yan fasyası. IT bandını geren küçük kas."],
  ["piri", "Derin dış rotatörler (piriformis vb.)", "Armut biçimli kas", "derin", "Kalça", "Gluteus maximus'un altında", "Kalça dış rotasyonu", "Clamshell, piriformis esnetme", "Piriformis = armut biçimli. Bacağı dışa çeviren derin kaslar."],
  ["quad", "Quadriceps", "Dört başlı uyluk kası", "on", "Uyluk", "Uyluğun önü; rectus femoris, vastus lateralis, vastus medialis, vastus intermedius", "Diz ekstansiyonu; rectus femoris ayrıca kalça fleksiyonu yapar (iki eklemi geçen tek baş)", "Squat, leg extension, lunge, leg press", "Quadri = 4 baş. Topa tekme atarken dizi düzleştiren kas. 'Vastus' = geniş: lateralis dışta, medialis içte (gözyaşı damlası)."],
  ["ham", "Hamstring (3 kas)", "Arka uyluk kasları", "arka", "Uyluk", "Uyluğun arkası; biceps femoris (dış), semitendinosus ve semimembranosus (iç)", "Diz fleksiyonu, kalça ekstansiyonu", "Leg curl, Romanian deadlift, good morning", "'Semi'ler içeride (medial), biceps femoris dışta. Topuğu kalçaya çeker (leg curl)."],
  ["add", "Adduktorlar", "İç uyluk kasları", "on", "Uyluk", "Uyluğun iç yanı (magnus, longus, brevis, gracilis, pectineus)", "Kalça adduksiyonu; magnus ayrıca iç rotasyon", "Adduction machine, sumo squat", "Add = ekle: bacağı orta hatta ekler. Bacak bacak üstüne atarken çalışırlar."],
  ["sart", "Sartorius", "Terzi kası", "on", "Uyluk", "Uyluğu çapraz geçen, vücudun en uzun kası", "Kalça fleksiyonu, abduksiyonu, dış rotasyon; diz fleksiyonu", "–", "Sartor = terzi. Bağdaş kurup oturan terzinin pozisyonu = bu kasın tüm hareketleri."],
  ["gast", "Gastrocnemius", "Baldır kası (iki başlı)", "arka", "Bacak", "Bacak arkası, yüzeyel; dizin üstünden başlar", "Ayak bileği plantar fleksiyonu; diz fleksiyonuna yardım", "Ayakta calf raise", "Gastro = karın, kneme = bacak: 'bacağın karnı'. Parmak ucuna kalkınca (plantar fleksiyon) şişen kas."],
  ["sol", "Soleus", "Pisi balığı kası", "arka", "Bacak", "Gastrocnemius'un altında, derin", "Plantar fleksiyon (diz bükükken asıl çalışan)", "Oturarak calf raise", "Solea = pisi/dil balığı, yassı. Diz bükükken gastro gevşer, iş soleus'a kalır: oturarak calf raise."],
  ["tib", "Tibialis anterior", "Ön kaval kası", "on", "Bacak", "Kaval kemiğinin önü", "Ayak bileği dorsi fleksiyonu, inversiyon", "Topuk yürüyüşü, toe raise", "Tibia (kaval) + anterior (ön). Topukla yürürken ayak ucunu kaldıran kas."],
  ["per", "Peroneuslar (fibularis)", "Kamış kemiği kasları", "on", "Bacak", "Bacağın dış yanı", "Eversiyon, plantar fleksiyona yardım", "Band ile eversiyon", "Perone = fibula. Fibula dışta → peroneus dışta → tabanı dışa çevirir (eversiyon)."]
];
const AB = [
  // id, Latince, Türkçe, tip, bilgi, ipucu
  ["cran", "Cranium", "Kafatası", "Yassı (kubbe)", "Beyni korur; kemikleri arası hareketsiz (non-sinoviyal) eklem.", "Kask gibi: yassı kemikler korur."],
  ["mand", "Mandibula", "Alt çene", "Düzensiz", "Kafatasının tek hareketli kemiği.", "Mandibula = 'çiğneyen'."],
  ["cerv", "Vertebrae cervicales", "Boyun omurları", "Düzensiz", "7 omur; lordoz (içe kavis). 1. ve 2. boyun omuru pivot eklem yapar.", "Sabah 7'de kalk: servikal 7."],
  ["clav", "Clavicula", "Köprücük kemiği", "Uzun", "Omuz kuşağı; sternum ile kürek kemiği arasında köprü.", "Clavis = anahtar: anahtar şeklinde S kemik, 'köprü' gibi uzanır."],
  ["scap", "Scapula", "Kürek kemiği", "Yassı", "Omuz kuşağı; sırtta, rotator cuff kasları buradan başlar.", "Kürek gibi yassı; kürek çekerken (row) geri gelir."],
  ["stern", "Sternum", "Göğüs kemiği", "Yassı", "Göğsün ortası; kaburgalar kıkırdakla bağlanır.", "Kravat gibi göğsün ortasında."],
  ["cost", "Costae", "Kaburgalar", "Yassı", "12 çift; arkada torakal omurlara bağlanır.", "12 çift kaburga = 12 torakal omur."],
  ["hum", "Humerus", "Pazu kemiği", "Uzun", "Üst kol; omuz (top-yuva) ve dirsek (menteşe) eklemlerine katılır.", "Dirseğe çarpınca 'humor'lu bir sızı: İngilizcesi 'funny bone'."],
  ["rad", "Radius", "Ön kolun başparmak tarafı", "Uzun", "Ön kolun dış (lateral) kemiği; supinasyon-pronasyonda ulnanın etrafında döner.", "RAdius = başpaRmAk tarafı. Radyo anteni dışarıda (lateral)."],
  ["uln", "Ulna", "Ön kolun serçe parmak tarafı", "Uzun", "Ön kolun iç (medial) kemiği; dirseğin sivri ucu.", "Ulna serçe parmak tarafında, içeride (medial)."],
  ["carp", "Ossa carpi", "El bileği kemikleri (karpal)", "Kısa", "8 kısa kemik; kondiloid el bileği eklemi.", "Kısa kemiklerin iki örneği: karpal (el bileği) ve tarsal (ayak bileği)."],
  ["mcar", "Metakarpal ve falanks", "El tarağı ve parmak kemikleri", "Uzun", "Parmak kemikleri küçük olsa da uzun kemik sayılır.", "Boyu eninden fazla = uzun kemik, ne kadar küçük olursa olsun."],
  ["lumb", "Vertebrae lumbales", "Bel omurları", "Düzensiz", "5 omur; lordoz (içe kavis). Bel ağrısının en sık bölgesi.", "Öğlen 12'de yemek (torakal 12), akşam 5'te bel ağrısı (lumbar 5)."],
  ["pelv", "Pelvis (ilium, ischium, pubis)", "Leğen kemiği", "Yassı", "Kalça eklemi (top-yuva) burada; gövdeyi bacaklara bağlar.", "İlium kanat, ischium oturma kemiği, pubis önde."],
  ["sacr", "Sacrum ve coccyx", "Sağrı ve kuyruk sokumu", "Düzensiz", "Sakrum 5 kaynaşmış omur (kifoz), koksiks 4 kaynaşmış omur.", "5 + 4 kaynaşmış."],
  ["fem", "Femur", "Uyluk kemiği", "Uzun", "Vücudun en uzun kemiği; kalça ve diz eklemleri.", "En uzun kemik = femur."],
  ["pat", "Patella", "Diz kapağı", "Susamsı", "Quadriceps tendonunun içinde; susamsı kemik.", "Susam tanesi gibi tendonun içine gömülü."],
  ["tibb", "Tibia", "Kaval kemiği", "Uzun", "Bacağın iç (medial), kalın kemiği; ağırlığı taşır.", "Tibia kalın ve içte; kavalla çalınır gibi düz."],
  ["fib", "Fibula", "Kamış kemiği", "Uzun", "Bacağın dış (lateral), ince kemiği.", "Fibula ince ve dışta: kamış gibi ince."],
  ["tars", "Tarsal ve calcaneus", "Ayak bileği ve topuk kemiği", "Kısa", "7 tarsal kemik; en büyüğü topuk kemiği calcaneus (Aşil tendonu buraya yapışır).", "Calx = topuk."],
  ["mtar", "Metatarsal ve falanks", "Ayak tarağı ve parmaklar", "Uzun", "Ayak tarağı ve parmak kemikleri.", "Meta = ötesinde: tarsalın ötesinde."]
];

/* ---- SVG şekilleri (vücudun sol yarısı; sağ yarı aynalanır, viewBox 200×460) ---- */
const SIL = "M100,6 C88,6 81,16 81,29 C81,41 87,49 92,52 L92,60 C82,64 68,66 59,70 C49,74 45,84 44,96 L41,130 C40,146 38,160 37,172 L33,208 C31,222 30,234 30,244 C28,254 27,267 32,272 C36,276 40,268 41,260 L45,240 C48,224 51,205 53,186 L57,150 C58,140 60,131 63,124 L65,150 C66,174 66,198 64,222 C62,240 62,258 64,278 L67,330 C67,350 66,370 68,394 L72,430 C70,440 63,448 69,453 L95,453 C97,446 95,439 93,431 L95,394 C96,372 96,350 96,330 L98,272 L100,264 Z";
const FRONT = {
  scm: "M86,40 L90,38 L99,62 L95,65 Z",
  trap: "M92,53 L92,60 C82,64 72,66 63,69 C70,64 82,58 92,53 Z",
  delt: "M60,71 C50,73 45,83 45,96 L47,114 C52,105 58,97 63,88 C66,81 66,74 60,71 Z",
  pec: "M98,71 L98,112 C88,117 74,115 65,105 L62,93 C63,85 67,79 72,75 C82,72 90,71 98,71 Z",
  serr: "M66,110 L73,115 L66,119 L73,124 L66,128 L72,133 L66,136 C63,127 63,118 66,110 Z",
  bic: "M48,114 C54,109 60,113 60,123 L57,154 C55,162 50,163 47,158 L45,131 C45,121 46,116 48,114 Z",
  brrad: "M45,163 C49,160 53,162 54,168 L49,200 L43,214 C41,200 41,180 45,163 Z",
  fore: "M54,170 C56,176 55,184 53,196 L46,236 L39,236 L42,216 L49,201 Z",
  rect: "M99,117 L99,214 L88,214 C86,182 86,150 87,119 Z",
  eobl: "M85,121 C85,150 84,182 86,214 L79,216 C73,206 69,194 68,182 L67,140 C70,130 76,124 85,121 Z",
  tfl: "M67,222 C69,215 75,214 77,220 L75,248 L68,250 C65,240 65,230 67,222 Z",
  sart: "M73,226 L79,223 C85,262 90,296 94,322 L90,326 C84,296 78,262 73,226 Z",
  quad: "M79,236 C85,240 86,262 84,290 L81,312 L75,312 C72,290 72,262 79,236 Z M70,250 C74,252 74,282 74,312 L72,324 C67,314 65,292 66,267 C66,258 67,252 70,250 Z M86,294 C90,302 93,313 92,325 C88,331 82,329 80,321 C80,309 82,300 86,294 Z",
  add: "M97,240 L98,268 L95,300 C91,290 88,276 86,263 C86,253 89,245 97,240 Z",
  tib: "M73,345 C77,342 81,346 81,353 L79,400 L77,425 L74,425 C73,400 71,370 73,345 Z",
  per: "M68,350 L71,348 L72,410 L70,412 C68,390 67,370 68,350 Z",
  gast: "M88,345 C93,350 94,366 92,386 L88,389 C86,370 85,356 88,345 Z"
};
const BACK = {
  trap: "M100,48 L92,54 C86,60 74,64 62,70 C70,75 80,82 87,97 L100,142 Z",
  delt: "M60,71 C50,73 45,83 45,96 L47,112 C52,104 58,96 63,88 C66,81 66,74 60,71 Z",
  infra: "M86,99 C80,95 71,92 66,97 L69,116 C77,118 85,112 86,99 Z",
  teres: "M67,119 C73,118 80,120 83,125 L68,130 C65,126 65,122 67,119 Z",
  lat: "M99,143 L99,190 C92,206 82,210 73,201 C68,182 66,152 66,132 L84,127 C89,132 94,138 99,143 Z",
  erec: "M99,150 L99,226 L92,226 C90,205 90,176 92,150 Z",
  tri: "M47,100 C54,98 60,104 60,114 L58,152 C55,160 49,160 46,155 L44,125 C44,112 45,104 47,100 Z",
  fore: "M45,163 C51,160 55,164 54,172 L46,236 L39,236 C38,210 40,180 45,163 Z",
  gmed: "M70,212 C78,206 90,207 96,213 L93,226 C85,225 77,228 69,236 C66,228 67,218 70,212 Z",
  gmax: "M99,226 L99,268 C90,276 76,276 68,266 C64,255 66,241 72,233 C80,227 90,225 99,226 Z",
  ham: "M70,277 C76,277 80,285 80,300 L78,330 L72,332 C68,312 66,292 70,277 Z M82,279 C90,277 96,283 96,296 L93,330 L82,330 C80,310 80,291 82,279 Z",
  gast: "M70,341 C76,335 84,337 86,346 L84,378 C80,384 74,384 70,376 C67,365 67,351 70,341 Z M88,341 C94,339 96,347 95,361 L92,384 C88,386 86,380 86,370 Z",
  sol: "M71,381 C75,387 82,389 92,387 L88,410 L77,410 C74,401 72,391 71,381 Z"
};
/* iskelet: sol yarı (aynalanır) + orta hat kemikleri (aynalanmaz) */
const SK_SIDE = {
  clav: "M98,72 Q80,67 62,74 L62,78 Q80,72 98,77 Z",
  scap: "M64,79 L86,83 L77,121 Z",
  cost: "M96,85 Q72,84 69,96 Q70,90 96,90 Z M96,93 Q70,92 67,106 Q69,99 96,98 Z M96,101 Q69,101 66,116 Q68,108 96,106 Z M96,109 Q69,110 66,126 Q68,117 96,114 Z M95,117 Q70,119 68,134 Q70,126 95,122 Z M94,125 Q74,128 72,140 Q74,133 94,130 Z",
  hum: "M61,79 C54,77 51,84 54,91 L50,159 C48,166 55,169 57,164 L61,93 C65,89 65,82 61,79 Z",
  rad: "M47,168 L39,237 L43,238 L51,170 Z",
  uln: "M55,167 L47,239 L51,240 L59,168 Z",
  carp: "M37,240 L52,241 L51,250 L36,249 Z",
  mcar: "M36,252 L51,253 L50,262 L42,275 L37,275 L31,262 Z",
  pelv: "M97,191 C89,182 74,178 67,186 C63,197 67,211 77,215 C83,222 90,226 97,224 L97,214 C90,214 86,208 88,200 L97,198 Z",
  fem: "M88,208 C93,208 94,218 88,221 L82,227 L87,317 L93,322 L81,326 L79,318 L73,232 C69,226 71,219 77,219 Z",
  pat: "M80,326 C80,320 89,320 89,326 C89,334 80,334 80,326 Z",
  tibb: "M82,338 L94,338 L92,428 L86,428 Z",
  fib: "M74,340 L78,340 L78,426 L75,426 Z",
  tars: "M74,430 L94,430 L96,442 L74,442 Z",
  mtar: "M73,444 L97,444 L99,453 L69,453 Z"
};
const SK_MID = {
  cran: "M100,6 C88,6 82,16 82,28 C82,36 85,41 88,44 L112,44 C115,41 118,36 118,28 C118,16 112,6 100,6 Z",
  mand: "M87,42 Q89,55 100,57 Q111,55 113,42 L110,43 Q108,51 100,52 Q92,51 90,43 Z",
  cerv: "M96,58 h8 v3 h-8 Z M96,62 h8 v3 h-8 Z M96,66 h8 v3 h-8 Z",
  stern: "M96,78 L104,78 L103,120 L100,126 L97,120 Z",
  lumb: "M95,148 h10 v6 h-10 Z M95,156 h10 v6 h-10 Z M95,164 h10 v6 h-10 Z M95,172 h10 v6 h-10 Z M95,180 h10 v6 h-10 Z",
  sacr: "M93,190 L107,190 L104,212 L100,220 L96,212 Z"
};

/* yön terimleri */
const ADIR = [
  ["Anterior (ventral)", "Ön", "Tibialis anterior: bacağın önündeki kas"],
  ["Posterior (dorsal)", "Arka", "Latissimus dorsi: sırttaki kas"],
  ["Superior", "Üst", "Baş, göğse göre superior"],
  ["Inferior", "Alt", "Diz, kalçaya göre inferior"],
  ["Medial", "İç yan (orta hatta yakın)", "Vastus medialis: uyluğun iç yanı"],
  ["Lateral", "Dış yan", "Vastus lateralis: uyluğun dış yanı"],
  ["Proksimal", "Gövdeye yakın", "Dirsek, bileğe göre proksimal"],
  ["Distal", "Gövdeden uzak", "Bilek, dirseğe göre distal"],
  ["Superficialis / Profundus", "Yüzeyel / Derin", "Gastrocnemius yüzeyel, soleus derin"],
  ["Dexter / Sinister", "Sağ / Sol", "Kişinin kendi sağı-solu (karşıdakinin değil)"]
];
const ADQ = [
  ["Göğüs kası (pectoralis), sırt kaslarına göre ___ bulunur.", "Anterior", "ap"],
  ["Latissimus dorsi, rectus abdominis'e göre ___ bulunur.", "Posterior", "ap"],
  ["Kalp, omurgaya göre ___.", "Anterior", "ap"],
  ["Topuk kemiği (calcaneus) ayağın ___ ucundadır.", "Posterior", "ap"],
  ["Tibialis anterior bacağın ___ yüzündedir.", "Anterior", "ap"],
  ["Baş, göğse göre ___.", "Superior", "si"],
  ["Diz, kalçaya göre ___.", "Inferior", "si"],
  ["Göbek, göğüs kemiğine göre ___.", "Inferior", "si"],
  ["Trapezius'un boyuna yakın üst lifleri, alt liflerine göre ___.", "Superior", "si"],
  ["Burun, gözlere göre ___.", "Medial", "ml"],
  ["Anatomik duruşta başparmak, serçe parmağa göre ___.", "Lateral", "ml"],
  ["Vastus medialis uyluğun ___ yanındadır.", "Medial", "ml"],
  ["Fibula, tibiaya göre ___.", "Lateral", "ml"],
  ["Ulna, radiusa göre ___.", "Medial", "ml"],
  ["Sternum, kaburgalara göre ___.", "Medial", "ml"],
  ["Peroneuslar bacağın ___ yanındadır.", "Lateral", "ml"],
  ["Dirsek, bileğe göre ___.", "Proksimal", "pd"],
  ["Ayak bileği, dize göre ___.", "Distal", "pd"],
  ["Omuz, dirseğe göre ___.", "Proksimal", "pd"],
  ["Parmak uçları, el bileğine göre ___.", "Distal", "pd"],
  ["Uyluk kemiğinin kalçaya bakan ucu ___ uçtur.", "Proksimal", "pd"],
  ["Soleus, gastrocnemius'a göre ___ yerleşir.", "Derin (profundus)", "sp"],
  ["External oblique, internal oblique'e göre ___.", "Yüzeyel (superficialis)", "sp"]
];
const ADSET = { ap: ["Anterior", "Posterior", "Medial", "Superior"], si: ["Superior", "Inferior", "Proksimal", "Lateral"], ml: ["Medial", "Lateral", "Anterior", "Distal"], pd: ["Proksimal", "Distal", "Superior", "Medial"], sp: ["Yüzeyel (superficialis)", "Derin (profundus)", "Medial", "Posterior"] };

/* hareket sözlüğü: ad, anlam, düzlem, kendin dene */
const AMOV = [
  ["Fleksiyon", "Bükme; eklem açısı küçülür", "Sagital", "Dirseği bük, kolu öne kaldır, dizi göğsüne çek"],
  ["Ekstansiyon", "Germe; eklem açısı büyür", "Sagital", "Dirseği düzleştir, kolu geriye götür"],
  ["Abduksiyon", "Orta hattan uzaklaştırma", "Frontal", "Kolu ya da bacağı yana aç"],
  ["Adduksiyon", "Orta hatta yaklaştırma", "Frontal", "Yana açılan kolu geri indir"],
  ["Lateral fleksiyon", "Gövdeyi ya da boynu yana eğme", "Frontal", "Kulağını omzuna yaklaştır"],
  ["Rotasyon (iç/dış)", "Kendi ekseni etrafında döndürme", "Horizontal", "Dirsek 90° yanda, ön kolu dışa aç"],
  ["Pronasyon", "Ön kolu içe çevirme, avuç aşağı", "Horizontal", "Avucunu yere çevir"],
  ["Supinasyon", "Ön kolu dışa çevirme, avuç yukarı", "Horizontal", "Avucunu tavana çevir (çorba tutar)"],
  ["Dorsi fleksiyon", "Ayak ucunu yukarı kaldırma", "Sagital", "Topuğa bas, parmak uçları yukarı"],
  ["Plantar fleksiyon", "Ayak ucunu aşağı bastırma", "Sagital", "Parmak ucuna kalk (calf raise)"],
  ["İnversiyon", "Ayak tabanını içe çevirme", "Frontal", "Tabanını diğer ayağa baktır"],
  ["Eversiyon", "Ayak tabanını dışa çevirme", "Frontal", "Tabanını dışa baktır"],
  ["Elevasyon", "Yukarı kaldırma", "Frontal", "Omuz silk (shrug)"],
  ["Depresyon", "Aşağı bastırma", "Frontal", "Omuzları aşağı indir"],
  ["Yatay adduksiyon", "Yana açık kolu önde birleştirme", "Horizontal", "Chest fly: kollar önde buluşur"],
  ["Yatay abduksiyon", "Önde duran kolu yana açma", "Horizontal", "Reverse fly"],
  ["Retraksiyon", "Kürek kemiklerini geri çekme", "Horizontal", "Kürekleri birbirine sıkıştır (row)"],
  ["Protraksiyon", "Kürek kemiklerini öne taşıma", "Horizontal", "Push-up plus, yumruk uzatma"],
  ["Sirkumduksiyon", "Fleksiyon, ekstansiyon, abduksiyon, adduksiyonun birleşimi; daire çizme", "Birden fazla", "Kolunla havada daire çiz"]
];
/* egzersiz → eklem, hareket, düzlem, kas (ok: doğru sayılabilecek diğer kaslar) */
const ACH = [
  ["Front raise", "Omuz", "Fleksiyon", "Sagital", "Deltoid (ön)", ["Pectoralis major", "Biceps brachii"]],
  ["Straight-arm pulldown", "Omuz", "Ekstansiyon", "Sagital", "Latissimus dorsi", ["Deltoid (arka)", "Triceps brachii", "Teres major"]],
  ["Lateral raise", "Omuz", "Abduksiyon", "Frontal", "Deltoid (orta)", ["Supraspinatus"]],
  ["Lat pulldown", "Omuz", "Adduksiyon", "Frontal", "Latissimus dorsi", ["Pectoralis major", "Biceps brachii", "Teres major"]],
  ["Band ile iç rotasyon", "Omuz", "İç rotasyon", "Horizontal", "Subscapularis", ["Latissimus dorsi", "Pectoralis major"]],
  ["Band ile dış rotasyon", "Omuz", "Dış rotasyon", "Horizontal", "Infraspinatus", ["Teres minor"]],
  ["Chest fly", "Omuz", "Yatay adduksiyon", "Horizontal", "Pectoralis major", ["Deltoid (ön)"]],
  ["Reverse fly", "Omuz", "Yatay abduksiyon", "Horizontal", "Deltoid (arka)", ["Rhomboidler", "Trapezius"]],
  ["Shrug", "Kürek kemiği", "Elevasyon", "Frontal", "Trapezius", []],
  ["Kürekleri sıkma (row sonu)", "Kürek kemiği", "Retraksiyon", "Horizontal", "Rhomboidler", ["Trapezius"]],
  ["Push-up plus", "Kürek kemiği", "Protraksiyon", "Horizontal", "Serratus anterior", ["Pectoralis minor"]],
  ["Biceps curl", "Dirsek", "Fleksiyon", "Sagital", "Biceps brachii", ["Brachialis", "Brachioradialis"]],
  ["Triceps pushdown", "Dirsek", "Ekstansiyon", "Sagital", "Triceps brachii", []],
  ["Avucu tavana çevirme", "Ön kol (radioulnar)", "Supinasyon", "Horizontal", "Biceps brachii", []],
  ["Crunch", "Omurga", "Fleksiyon", "Sagital", "Rectus abdominis", ["External oblique", "Internal oblique"]],
  ["Back extension", "Omurga", "Ekstansiyon", "Sagital", "Erector spinae", ["Multifidus", "Gluteus maximus", "Hamstring"]],
  ["Side bend", "Omurga", "Lateral fleksiyon", "Frontal", "Quadratus lumborum", ["External oblique", "Internal oblique", "Erector spinae", "Rectus abdominis"]],
  ["Russian twist", "Omurga", "Rotasyon", "Horizontal", "External oblique", ["Internal oblique", "Rectus abdominis"]],
  ["Knee raise", "Kalça", "Fleksiyon", "Sagital", "Iliopsoas", ["Quadriceps", "TFL", "Sartorius"]],
  ["Hip thrust", "Kalça", "Ekstansiyon", "Sagital", "Gluteus maximus", ["Hamstring"]],
  ["Side-lying leg raise", "Kalça", "Abduksiyon", "Frontal", "Gluteus medius", ["Gluteus minimus", "TFL", "Sartorius"]],
  ["Adduction machine", "Kalça", "Adduksiyon", "Frontal", "Adduktorlar", []],
  ["Clamshell", "Kalça", "Dış rotasyon", "Horizontal", "Derin dış rotatörler", ["Gluteus maximus", "Gluteus medius", "Sartorius"]],
  ["Leg curl", "Diz", "Fleksiyon", "Sagital", "Hamstring", ["Gastrocnemius", "Sartorius"]],
  ["Leg extension", "Diz", "Ekstansiyon", "Sagital", "Quadriceps", []],
  ["Topuk yürüyüşü / toe raise", "Ayak bileği", "Dorsi fleksiyon", "Sagital", "Tibialis anterior", []],
  ["Ayakta calf raise", "Ayak bileği", "Plantar fleksiyon", "Sagital", "Gastrocnemius", ["Soleus", "Peroneuslar"]],
  ["Oturarak calf raise", "Ayak bileği", "Plantar fleksiyon", "Sagital", "Soleus", ["Gastrocnemius", "Peroneuslar"]],
  ["Band ile tabanı dışa çevirme", "Ayak bileği", "Eversiyon", "Frontal", "Peroneuslar", []]
];
const AKAS = ["Deltoid (ön)", "Deltoid (orta)", "Deltoid (arka)", "Pectoralis major", "Latissimus dorsi", "Trapezius", "Rhomboidler", "Serratus anterior", "Subscapularis", "Infraspinatus", "Supraspinatus", "Biceps brachii", "Triceps brachii", "Brachialis", "Rectus abdominis", "External oblique", "Erector spinae", "Quadratus lumborum", "Iliopsoas", "Gluteus maximus", "Gluteus medius", "Adduktorlar", "Derin dış rotatörler", "Hamstring", "Quadriceps", "Tibialis anterior", "Gastrocnemius", "Soleus", "Peroneuslar", "Teres major"];
const AEKLEM = ["Omuz", "Kürek kemiği", "Dirsek", "Ön kol (radioulnar)", "Omurga", "Kalça", "Diz", "Ayak bileği"];
/* isim çözücü */
const AROOT = [
  ["Musculus (M.)", "Kas"], ["Maximus / Medius / Minimus", "En büyük / Orta / En küçük"], ["Major / Minor", "Daha büyük / Daha küçük"],
  ["Longus / Brevis", "Uzun / Kısa"], ["Magnus", "Büyük"], ["Rectus", "Düz"], ["Obliquus", "Eğik"], ["Transversus", "Enine"],
  ["Biceps / Triceps / Quadriceps", "2 / 3 / 4 başlı"], ["Brachii", "Kol"], ["Femoris", "Uyluk"], ["Abdominis", "Karın"],
  ["Pectoralis", "Göğüs"], ["Dorsi", "Sırt"], ["Latissimus", "En geniş"], ["Gluteus", "Kalça (kaba et)"], ["Erector", "Dik tutan"],
  ["Spinae", "Omurga"], ["Serratus", "Testere dişli"], ["Anterior / Posterior", "Ön / Arka"], ["Lateralis / Medialis", "Dış / İç"],
  ["Supra / Infra / Sub", "Üstünde / Altında / Altında (önünde)"], ["Tensor", "Gerici"], ["Vastus", "Geniş"], ["Teres", "Yuvarlak"]
];
const ANAME = [
  ["Gluteus maximus", "Kalçanın en büyük kası"], ["Gluteus medius", "Kalçanın orta kası"], ["Rectus abdominis", "Düz karın kası"],
  ["Rectus femoris", "Düz uyluk kası"], ["Biceps femoris", "Uyluğun iki başlı kası"], ["Biceps brachii", "Kolun iki başlı kası"],
  ["Triceps brachii", "Kolun üç başlı kası"], ["Latissimus dorsi", "Sırtın en geniş kası"], ["Pectoralis major", "Büyük göğüs kası"],
  ["Pectoralis minor", "Küçük göğüs kası"], ["Erector spinae", "Omurgayı dik tutan kas"], ["Transversus abdominis", "Enine karın kası"],
  ["External oblique", "Dış eğik karın kası"], ["Serratus anterior", "Öndeki testere dişli kas"], ["Tibialis anterior", "Kaval kemiğinin önündeki kas"],
  ["Vastus lateralis", "Uyluğun dış yanındaki geniş kas"], ["Vastus medialis", "Uyluğun iç yanındaki geniş kas"], ["Adductor longus", "Uzun yaklaştırıcı kas"],
  ["Adductor magnus", "Büyük yaklaştırıcı kas"], ["Teres major", "Büyük yuvarlak kas"], ["Supraspinatus", "Kürek kemiği çıkıntısının üstündeki kas"],
  ["Infraspinatus", "Kürek kemiği çıkıntısının altındaki kas"], ["Quadriceps femoris", "Uyluğun dört başlı kası"], ["Tensor fasciae latae", "Uyluk fasyasını geren kas"]
];

/* etiket bağlantı noktaları (sol yarı koordinatları) */
const ANCH = {
  on: { scm: [93, 52], trap: [74, 64], delt: [52, 88], pec: [82, 94], serr: [67, 123], bic: [53, 135], rect: [93, 165], eobl: [76, 178], brrad: [47, 182], fore: [45, 218], tfl: [70, 234], quad: [77, 262], add: [92, 262], sart: [86, 290], gast: [90, 365], tib: [76, 380], per: [69, 398] },
  arka: { trap: [86, 80], delt: [52, 86], infra: [76, 104], teres: [72, 124], tri: [52, 128], lat: [80, 165], erec: [95, 200], fore: [46, 200], gmed: [80, 218], gmax: [84, 250], ham: [76, 305], gast: [76, 360], sol: [82, 398] },
  iskelet: { cran: [92, 20], mand: [95, 52], cerv: [99, 63], clav: [76, 72], stern: [99, 100], scap: [72, 95], cost: [80, 112], hum: [56, 125], lumb: [99, 165], sacr: [99, 200], pelv: [74, 195], rad: [44, 205], uln: [52, 215], carp: [44, 245], mcar: [40, 262], fem: [80, 270], pat: [84, 327], fib: [76, 380], tibb: [89, 390], tars: [84, 436], mtar: [84, 449] }
};
function labelLayer(view) {
  const A = ANCH[view]; const nm = id => { const m = view === "iskelet" ? ABI[id] : AMI[id]; return m ? m[1].replace(/ \(.*\)$/, "") : id; };
  const L2 = Object.entries(A).sort((a, b) => a[1][1] - b[1][1]); let last = -99;
  return L2.map(([id, [x, y]]) => { const ly = Math.max(y, last + 13); last = ly; return `<g class="lb" data-id="${id}"><polyline points="${x},${y} 18,${ly} 10,${ly}" class="lbl-l"/><circle cx="${x}" cy="${y}" r="1.6" class="lbl-d"/><text x="8" y="${ly + 3}" text-anchor="end" class="lbl-t">${esc(nm(id))}</text></g>`; }).join("");
}
/* ---- yardımcılar ---- */
const AMI = Object.fromEntries(AM.map(m => [m[0], m]));
const ABI = Object.fromEntries(AB.map(b => [b[0], b]));
function anSt() { ST.anat = Object.assign({ box: {}, best: {} }, ST.anat || {}); return ST.anat; }
function bodySvg(view, opt = {}) {
  const shapes = view === "on" ? FRONT : view === "arka" ? BACK : SK_SIDE;
  const cls = view === "iskelet" ? "bn" : "ms";
  const side = Object.entries(shapes).map(([id, d]) => `<path class="${cls}" data-id="${id}" d="${d}"/>`).join("");
  const mid = view === "iskelet" ? Object.entries(SK_MID).map(([id, d]) => `<path class="bn" data-id="${id}" d="${d}"/>`).join("") : "";
  const back = view === "arka" ? '<path class="spine" d="M100,60 L100,226"/>' : "";
  const lbl = view === "iskelet" ? "" : `<text x="8" y="14" class="svlbl">${view === "on" ? "ÖN" : "ARKA"}</text>`;
  const vb = opt.labels ? "-112 0 312 460" : "0 0 200 460";
  return `<svg class="body ${view === "iskelet" ? "skel" : ""} ${opt.labels ? "lbls" : ""}" viewBox="${vb}" role="img" aria-label="${view === "iskelet" ? "İskelet" : "Kas haritası " + view}">
    ${lbl}<path class="sil" d="${SIL}"/><path class="sil" transform="translate(200 0) scale(-1 1)" d="${SIL}"/>
    <g>${side}</g><g transform="translate(200 0) scale(-1 1)">${side}</g>${mid}${back}${opt.labels ? labelLayer(view) : ""}</svg>`;
}
function anOpts(ans, pool, n = 4) { return shuffle([ans, ...shuffle(pool.filter(x => x !== ans)).slice(0, n - 1)]); }
function anTabs(r) {
  return segNav([["anatomi", "Başla"], ["anatomi-kas", "Kas haritası"], ["anatomi-kemik", "İskelet"], ["anatomi-yon", "Yön ve düzlem"], ["anatomi-zincir", "Hareket zinciri"], ["anatomi-isim", "İsim çözücü"], ["anatomi-kart", "Kartlar"]], r);
}
function boxCount(prefix) { const S = anSt(); return Object.entries(S.box).filter(([k, v]) => k.startsWith(prefix) && v >= 3).length; }

/* ---- ana sayfa ---- */
ROUTES.anatomi = async (r, main) => {
  const sub = r.split("-")[1] || "";
  const fn = { "": anHome, kas: anMap, kemik: anSkel, yon: anYon, zincir: anZincir, isim: anIsim, kart: anKart }[sub] || anHome;
  fn(r, main);
};
function anHome(r, main) {
  const S = anSt(); const b = S.best;
  const prog = [["Kaslar", boxCount("m:"), AM.length, "anatomi-kart"], ["Kemikler", boxCount("b:"), AB.length, "anatomi-kart"], ["Terimler", boxCount("t:"), ADIR.length + AMOV.length, "anatomi-kart"]];
  page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>Kaslar, kemikler, yönler: oynayarak öğren</h1>
    <p class="lead">Anatomi ezberle değil, bağlantıyla öğrenilir. Bir kasın adı çoğu zaman yerini ve işini zaten söyler. Burada her şeyi dört adımda bağlıyoruz: <b>isim → yer → hareket → egzersiz</b>.</p></div>
    ${anTabs(r)}
    <section class="kpis">${prog.map(p => `<a class="card kpi" href="#${p[3]}"><b>${p[1]}/${p[2]}</b><span>${p[0]} öğrenildi (kartta 3. kutuya çıkan)</span></a>`).join("")}<div class="card kpi"><b>${b.bul != null ? b.bul + "/10" : "–"}</b><span>"Kası bul" en iyi skor</span></div></section>
    <section class="card stack"><h2>7 günlük anatomi planı (günde 20 dakika)</h2>
      <ol class="steps">
        <li><b>1. gün · Dil:</b> <a href="#anatomi-isim">İsim çözücü</a>'deki 25 Latince kökü öğren, sonra isim oyununu oyna. "Gluteus maximus = kalçanın en büyüğü" dediğin an isim ezberi yarıya iner.</li>
        <li><b>2. gün · Yön ve düzlem:</b> <a href="#anatomi-yon">Yön ve düzlem</a> sayfasındaki animasyonları izle, her hareketi <b>kendin yap</b>. Sonra yön testini %80'in üstüne çıkar.</li>
        <li><b>3. gün · Ön yüz kasları:</b> <a href="#anatomi-kas">Kas haritası</a>nda ön yüzü keşfet: her kasa dokun, ipucunu oku, kendi vücudunda o kası kasıp eliyle yokla.</li>
        <li><b>4. gün · Arka yüz ve derin kaslar:</b> Arka yüz + derin kas listesi (rotator cuff, core kutusu, iliopsoas). Sonra "Kası bul" oyununu 10/10 yapana kadar oyna.</li>
        <li><b>5. gün · İskelet:</b> <a href="#anatomi-kemik">İskelet</a>: 21 kemik, omurga sayıları (7-12-5-5-4) ve kemik tipleri.</li>
        <li><b>6. gün · Hareket zinciri:</b> <a href="#anatomi-zincir">Hareket zinciri</a>: egzersizi gör, eklemi, hareketi, düzlemi ve kası sırayla bul. Quizdeki fotoğraf sorularının hepsi bu kalıp.</li>
        <li><b>Uygulamalı sınava hazırlık:</b> <a href="#uygulama">Uygulamalı sınav</a> bölümünde her eklem hareketi için hangi egzersizi yaptıracağın ve üyeye nasıl öğreteceğin var.</li>
        <li><b>7. gün · Tekrar:</b> <a href="#anatomi-kart">Kartlar</a>da kutu sistemiyle tekrar et, sonra <a href="#u03-quiz">Ünite 3</a> ve <a href="#u09-quiz">Ünite 9</a> quizlerini çöz.</li>
      </ol>
      <p class="small muted">Sonraki günlerde her gün 5 dakika kart, 5 dakika "Kası bul", 5 dakika hareket zinciri yeterli.</p></section>
    <section class="grid2" style="align-items:start">
      <div class="card stack"><h2>Neden aklında kalmıyor?</h2><p>Çünkü kas listesi birbirinden kopuk isimler gibi geliyor. Beyin kopuk bilgiyi atar, <b>bağlı</b> bilgiyi tutar. Her kası şu üç soruyla bağla:</p>
        <ol class="steps"><li><b>Nerede?</b> Haritada gör, kendi vücudunda dokun.</li><li><b>Ne yapar?</b> Hareketi kendin yap, kası kasılırken hisset.</li><li><b>Hangi egzersiz?</b> Salonda o makineyi gözünün önüne getir.</li></ol></div>
      <div class="card stack"><h2>En çok işe yarayan 6 ipucu</h2><ul>
        <li><b>Kas çiftleri:</b> Her öndeki kasın arkada tersini yapan bir eşi var: pec ↔ lat, biceps ↔ triceps, rectus abdominis ↔ erector spinae, iliopsoas ↔ gluteus max, quadriceps ↔ hamstring, tibialis anterior ↔ gastrocnemius.</li>
        <li><b>Düzlemler:</b> <b>S</b>agital = <b>S</b>elam ver (öne-arkaya), <b>F</b>rontal = <b>F</b>il kanadı (yana), <b>H</b>orizontal = <b>H</b>alay dönüşü (dönme).</li>
        <li><b>Rotator cuff = SİTS:</b> Supraspinatus, İnfraspinatus, Teres minor, Subscapularis.</li>
        <li><b>Omurga 7-12-5-5-4:</b> Sabah 7 kahvaltı, öğlen 12 yemek, akşam 5 çay; sakrum 5 ve koksiks 4 kaynaşmış.</li>
        <li><b>Radius başparmak tarafında,</b> ulna serçe tarafında. <b>Tibia kalın ve içte,</b> fibula ince ve dışta.</li>
        <li><b>Hareketin adı eklemle söylenir:</b> "fleksiyon" değil, "kalça fleksiyonu". Quiz şıklarında yanlış eklem tuzağına dikkat.</li></ul></div>
    </section></div>`);
}

/* ---- kas haritası + oyunlar ---- */
function anMap(r, main) {
  let view = "on", mode = "kesfet", sel = null, game = null, labels = true;
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>Kas haritası</h1><p class="muted">Bir kasa dokun: yeri, işi, egzersizi ve hafıza ipucu çıkar. Sonra oyun modlarıyla kendini sına.</p></div>
    ${anTabs(r)}
    <div class="row wrap"><div class="chipsel" id="mv"><button data-v="on" aria-pressed="true">Ön yüz</button><button data-v="arka" aria-pressed="false">Arka yüz</button></div>
    <div class="chipsel" id="mm"><button data-m="kesfet" aria-pressed="true">Keşfet</button><button data-m="bul" aria-pressed="false">Oyun: Kası bul</button><button data-m="ne" aria-pressed="false">Oyun: Bu hangi kas?</button></div><div class="chipsel"><button id="lt" aria-pressed="true">Etiketler</button></div></div>
    <div class="anwrap"><div class="anfig" id="fig"></div><div class="stack" id="side"></div></div>
    <section class="card stack"><h2>Tüm kaslar</h2><p class="small muted">Gri olanlar derin kaslar: haritada görünmez, üstteki kasın altında yer alır.</p><div class="chipsel wrap" id="ml"></div></section></div>`);
  const fig = $("#fig", pg), side = $("#side", pg);
  const onMap = id => !!(view === "on" ? FRONT : BACK)[id];
  const viewOf = id => FRONT[id] ? "on" : BACK[id] ? "arka" : null;
  const drawFig = () => { fig.innerHTML = bodySvg(view, { labels: labels && mode === "kesfet" }); $$("g.lb", fig).forEach(g => g.onclick = () => tap(g.dataset.id)); $$("path.ms", fig).forEach(p => p.onclick = () => tap(p.dataset.id)); mark(); };
  const mark = () => { $$("path.ms", fig).forEach(p => { p.classList.toggle("sel", p.dataset.id === sel); p.classList.remove("ok", "bad"); }); $$("g.lb", fig).forEach(g => g.classList.toggle("sel", g.dataset.id === sel)); };
  const card = m => `<div class="card stack ancard"><div><span class="pill">${esc(m[4])}</span> ${m[3] === "derin" ? '<span class="pill">derin kas</span>' : ""}</div><h2 style="margin:0">${esc(m[1])}</h2><div class="muted">${esc(m[2])}</div>
    <dl class="andl"><dt>Nerede?</dt><dd>${esc(m[5])}</dd><dt>Ne yapar?</dt><dd>${esc(m[6])}</dd><dt>Egzersiz</dt><dd>${esc(m[7])}</dd></dl><div class="callout ok"><b>Aklında kalsın:</b> ${esc(m[8])}</div></div>`;
  const showInfo = () => {
    if (mode !== "kesfet") return;
    side.innerHTML = sel ? card(AMI[sel]) : `<div class="card stack"><h2>Nasıl kullanılır?</h2><p>Haritada bir kasa dokun ya da aşağıdaki listeden seç. Ön ve arka yüz arasında geçiş yap. Her kasta <b>kendi vücudunda dene</b>: kası kas, eliyle yokla.</p><p class="small muted">Çiftleri birlikte öğren: pec ↔ lat, biceps ↔ triceps, quadriceps ↔ hamstring.</p></div>`;
  };
  const setView = v => { view = v; $$("#mv button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); drawFig(); };
  const pick = id => { sel = id; const v = viewOf(id); if (v && v !== view) setView(v); else mark(); showInfo(); if (window.innerWidth < 900) side.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  $("#ml").innerHTML = AM.map(m => `<button data-id="${m[0]}" class="${m[3] === "derin" ? "deep" : ""}" aria-pressed="false">${esc(m[1])}</button>`).join("");
  $$("#ml button").forEach(b => b.onclick = () => { if (mode !== "kesfet") setMode("kesfet"); pick(b.dataset.id); });
  /* oyunlar: sadece haritada görünen kaslar */
  const visible = AM.filter(m => FRONT[m[0]] || BACK[m[0]]);
  const newGame = () => { game = { qs: shuffle(visible).slice(0, 10), i: 0, ok: 0, lock: false }; ask(); };
  const ask = () => {
    if (game.i >= game.qs.length) { const S = anSt(); const k = mode === "bul" ? "bul" : "ne"; if (S.best[k] == null || game.ok > S.best[k]) S.best[k] = game.ok; save();
      side.innerHTML = `<div class="card stack"><h2>Bitti: ${game.ok}/10</h2><p>${game.ok >= 9 ? "Harika, bu kasları biliyorsun." : game.ok >= 7 ? "İyi gidiyor. Yanlış yaptıklarını Keşfet modunda bir kez daha oku." : "Önce Keşfet modunda her kasın ipucunu oku, sonra tekrar dene."}</p><button class="btn" id="again">Tekrar oyna</button></div>`; $("#again").onclick = newGame; return; }
    const m = game.qs[game.i]; game.lock = false; sel = null;
    const v = viewOf(m[0]); if (v !== view) setView(v); else mark();
    if (mode === "bul") side.innerHTML = `<div class="card stack"><div class="small muted">Soru ${game.i + 1}/10 · Doğru ${game.ok}</div><h2 style="margin:0">Bul: ${esc(m[1])}</h2><div class="muted">${esc(m[2])} · ${esc(m[4])}</div><p class="small">Haritada bu kasa dokun.</p><div id="fb"></div></div>`;
    else {
      sel = m[0]; mark();
      const opts = anOpts(m[1], visible.map(x => x[1]));
      side.innerHTML = `<div class="card stack"><div class="small muted">Soru ${game.i + 1}/10 · Doğru ${game.ok}</div><h2 style="margin:0">Haritada işaretli kas hangisi?</h2><div class="opts">${opts.map((o, i) => `<button class="opt" data-o="${esc(o)}"><b>${L[i]}</b><span>${esc(o)}</span></button>`).join("")}</div><div id="fb"></div></div>`;
      $$(".opt", side).forEach(b => b.onclick = () => { if (game.lock) return; game.lock = true; const ok = b.dataset.o === m[1]; if (ok) game.ok++; $$(".opt", side).forEach(x => { x.disabled = true; if (x.dataset.o === m[1]) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); }); fb(m, ok); });
    }
  };
  const fb = (m, ok) => { $("#fb").innerHTML = `<div class="callout ${ok ? "ok" : "hot"}"><b>${ok ? "Doğru!" : "Yanlış."}</b> ${esc(m[1])}: ${esc(m[6])}<br><span class="small">${esc(m[8])}</span></div><button class="btn" id="nx">Sonraki</button>`; $("#nx").onclick = () => { game.i++; ask(); }; $("#nx").focus(); };
  const tap = id => {
    if (mode === "kesfet") { pick(id); return; }
    if (mode === "bul" && game && !game.lock && game.i < game.qs.length) {
      const m = game.qs[game.i]; game.lock = true; const ok = id === m[0]; if (ok) game.ok++;
      $$("path.ms", fig).forEach(p => { if (p.dataset.id === m[0]) p.classList.add("ok"); else if (p.dataset.id === id && !ok) p.classList.add("bad"); });
      fb(m, ok);
    }
  };
  const setMode = m => { mode = m; $$("#mm button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m)); sel = null; drawFig(); if (m === "kesfet") { game = null; showInfo(); } else newGame(); };
  $("#lt").onclick = () => { labels = !labels; $("#lt").setAttribute("aria-pressed", labels); if (mode !== "kesfet") toast("Etiketler oyun sırasında gizli"); drawFig(); };
  $$("#mv button").forEach(b => b.onclick = () => { if (mode !== "kesfet") return toast("Oyun sırasında yüz otomatik değişir"); setView(b.dataset.v); });
  $$("#mm button").forEach(b => b.onclick = () => setMode(b.dataset.m));
  drawFig(); showInfo();
}

/* ---- iskelet ---- */
function anSkel(r, main) {
  let mode = "kesfet", sel = null, game = null, labels = true;
  const spine = [["Servikal (boyun)", 7, "Lordoz (içe)", "#2457A6"], ["Torakal (sırt)", 12, "Kifoz (dışa); kaburgalar buraya bağlanır", "#8F5A00"], ["Lumbar (bel)", 5, "Lordoz (içe)", "#1E7650"], ["Sakrum", "5 kaynaşmış", "Kifoz", "#B8452A"], ["Koksiks", "4 kaynaşmış", "–", "#5A655F"]];
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>İskelet: bilmen gereken 21 kemik</h1><p class="muted">Yetişkin iskeleti yaklaşık 206 kemik. Sınav bunlardan ünitedeki 20 kadarını soruyor. Kemiğe dokun ya da oyunla sına.</p></div>
    ${anTabs(r)}
    <div class="chipsel" id="mm"><button data-m="kesfet" aria-pressed="true">Keşfet</button><button data-m="bul" aria-pressed="false">Oyun: Kemiği bul</button><button data-m="ne" aria-pressed="false">Oyun: Bu hangi kemik?</button><button id="lt" aria-pressed="true">Etiketler</button></div>
    <div class="anwrap"><div class="anfig" id="fig"></div><div class="stack" id="side"></div></div>
    <section class="grid2" style="align-items:start">
      <div class="card stack"><h2>Omurga: 7 · 12 · 5 · 5 · 4</h2>
        <svg viewBox="0 0 160 300" class="spinesv" role="img" aria-label="Omurga yandan görünüm">
          <path d="M70,10 C82,40 82,60 70,75" stroke="#2457A6"/><path d="M70,75 C50,110 50,150 72,175" stroke="#8F5A00"/><path d="M72,175 C86,195 86,220 74,232" stroke="#1E7650"/><path d="M74,232 C60,250 62,268 72,280" stroke="#B8452A"/><path d="M72,280 C76,286 78,290 76,295" stroke="#5A655F"/>
          <text x="92" y="45">Servikal 7</text><text x="10" y="125">Torakal</text><text x="10" y="140">12</text><text x="92" y="208">Lumbar 5</text><text x="88" y="262">Sakrum 5</text><text x="88" y="294">Koksiks 4</text>
          <text x="2" y="290" class="ax">← ön</text><text x="120" y="12" class="ax">arka →</text></svg>
        <div class="tw"><table><thead><tr><th>Bölge</th><th>Omur</th><th>Kavis</th></tr></thead><tbody>${spine.map(s => `<tr><td><b style="color:${s[3]}">${s[0]}</b></td><td>${s[1]}</td><td>${s[2]}</td></tr>`).join("")}</tbody></table></div>
        <p class="small"><b>Hafıza:</b> Sabah 7 kahvaltı, öğlen 12 yemek, akşam 5 çay. Lordoz = <b>L</b>umbar ve servikal içe; kifoz = sırt kamburu dışa.</p></div>
      <div class="card stack"><h2>Kemik tipleri</h2><div class="tw"><table><thead><tr><th>Tip</th><th>Örnek</th></tr></thead><tbody>
        <tr><td><b>Uzun</b> (boy > en)</td><td>Humerus, femur, tibia, parmak kemikleri</td></tr><tr><td><b>Kısa</b></td><td>Karpal (el bileği), tarsal (ayak bileği)</td></tr>
        <tr><td><b>Yassı</b></td><td>Kafatası kubbesi, kaburga, kürek kemiği, sternum, kalça kemiği</td></tr><tr><td><b>Düzensiz</b></td><td>Omurlar, alt ve üst çene</td></tr>
        <tr><td><b>Susamsı</b></td><td>Patella (tendon içinde)</td></tr><tr><td><b>Havalı</b></td><td>Alın kemiği, üst çene</td></tr></tbody></table></div>
        <h3>Eklem tipleri</h3><ul><li><b>Top-yuva:</b> omuz, kalça (3 düzlem, en hareketli)</li><li><b>Menteşe:</b> dirsek, diz (sadece fleksiyon-ekstansiyon)</li><li><b>Pivot:</b> radioulnar, 1.-2. boyun omuru (dönme)</li><li><b>Kondiloid:</b> el bileği · <b>Eyer:</b> başparmak tabanı · <b>Kayma:</b> el-ayak bileği kemikleri arası</li></ul>
        <p class="small"><b>Tendon</b> kası kemiğe, <b>ligament</b> kemiği kemiğe bağlar. "Tendon = Tutar kası", "Ligament = Lego gibi kemikleri birleştirir".</p></div>
    </section>
    <section class="card stack"><h2>Tüm kemikler</h2><div class="chipsel wrap" id="ml">${AB.map(b => `<button data-id="${b[0]}" aria-pressed="false">${esc(b[1])}</button>`).join("")}</div></section></div>`);
  const fig = $("#fig", pg), side = $("#side", pg);
  const mark = () => { $$("path.bn", fig).forEach(p => { p.classList.toggle("sel", p.dataset.id === sel); p.classList.remove("ok", "bad"); }); $$("g.lb", fig).forEach(g => g.classList.toggle("sel", g.dataset.id === sel)); };
  const drawFig = () => { fig.innerHTML = bodySvg("iskelet", { labels: labels && mode === "kesfet" }); $$("path.bn, g.lb", fig).forEach(p => p.onclick = () => tapB(p.dataset.id)); mark(); };
  const info = () => { if (mode !== "kesfet") return; const b = sel && ABI[sel]; side.innerHTML = b ? `<div class="card stack ancard"><span class="pill">${esc(b[3])} kemik</span><h2 style="margin:0">${esc(b[1])}</h2><div class="muted">${esc(b[2])}</div><p>${esc(b[4])}</p><div class="callout ok"><b>Aklında kalsın:</b> ${esc(b[5])}</div></div>` : `<div class="card stack"><h2>Kemiğe dokun</h2><p>Kürek kemiği (scapula) aslında arkada; burada ön görünümün arkasında soluk çizildi. Kafatası, sternum ve omurga orta hatta.</p><p class="small muted">Anatomik duruş: avuçlar öne bakar, bu yüzden radius dışta (başparmak tarafı).</p></div>`; };
  const pick = id => { sel = id; mark(); info(); if (window.innerWidth < 900) side.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  const ask = () => {
    if (game.i >= game.qs.length) { const S = anSt(); S.best["k" + mode] = Math.max(S.best["k" + mode] || 0, game.ok); save(); side.innerHTML = `<div class="card stack"><h2>Bitti: ${game.ok}/10</h2><button class="btn" id="again">Tekrar oyna</button></div>`; $("#again").onclick = newGame; return; }
    const b = game.qs[game.i]; game.lock = false; sel = null; mark();
    if (mode === "bul") side.innerHTML = `<div class="card stack"><div class="small muted">Soru ${game.i + 1}/10 · Doğru ${game.ok}</div><h2 style="margin:0">Bul: ${esc(b[1])}</h2><div class="muted">${esc(b[2])}</div><div id="fb"></div></div>`;
    else { sel = b[0]; mark(); const opts = anOpts(b[1], AB.map(x => x[1]));
      side.innerHTML = `<div class="card stack"><div class="small muted">Soru ${game.i + 1}/10 · Doğru ${game.ok}</div><h2 style="margin:0">İşaretli kemik hangisi?</h2><div class="opts">${opts.map((o, i) => `<button class="opt" data-o="${esc(o)}"><b>${L[i]}</b><span>${esc(o)}</span></button>`).join("")}</div><div id="fb"></div></div>`;
      $$(".opt", side).forEach(x => x.onclick = () => { if (game.lock) return; game.lock = true; const ok = x.dataset.o === b[1]; if (ok) game.ok++; $$(".opt", side).forEach(y => { y.disabled = true; if (y.dataset.o === b[1]) y.classList.add("right"); else if (y === x) y.classList.add("wrong"); }); fb(b, ok); }); }
  };
  const fb = (b, ok) => { $("#fb").innerHTML = `<div class="callout ${ok ? "ok" : "hot"}"><b>${ok ? "Doğru!" : "Yanlış."}</b> ${esc(b[1])} = ${esc(b[2])}. <span class="small">${esc(b[5])}</span></div><button class="btn" id="nx">Sonraki</button>`; $("#nx").onclick = () => { game.i++; ask(); }; };
  const newGame = () => { game = { qs: shuffle(AB).slice(0, 10), i: 0, ok: 0 }; ask(); };
  const setMode = m => { mode = m; $$("#mm button[data-m]").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m)); sel = null; drawFig(); if (m === "kesfet") { game = null; info(); } else newGame(); };
  $("#lt").onclick = () => { labels = !labels; $("#lt").setAttribute("aria-pressed", labels); if (mode !== "kesfet") toast("Etiketler oyun sırasında gizli"); drawFig(); };
  const tapB = id => {
    if (mode === "kesfet") return pick(id);
    if (mode === "bul" && game && !game.lock && game.i < game.qs.length) { const b = game.qs[game.i]; game.lock = true; const ok = id === b[0]; if (ok) game.ok++; $$("path.bn", fig).forEach(q => { if (q.dataset.id === b[0]) q.classList.add("ok"); else if (q.dataset.id === id && !ok) q.classList.add("bad"); }); fb(b, ok); }
  };
  $$("#mm button[data-m]").forEach(b => b.onclick = () => setMode(b.dataset.m));
  $$("#ml button").forEach(b => b.onclick = () => { if (mode !== "kesfet") setMode("kesfet"); pick(b.dataset.id); });
  drawFig(); info();
}

/* ---- yön ve düzlem ---- */
function anYon(r, main) {
  const stick = (anim) => anim;
  const pg = page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>Yönler, düzlemler ve hareketler</h1><p class="muted">Bütün anatomi dili <b>anatomik duruşa</b> göre konuşur: ayakta dik, yüz öne, kollar yanda, <b>avuç içleri ve ayaklar öne</b>.</p></div>
    ${anTabs(r)}
    <section class="card stack"><h2>1. Yön terimleri</h2><p class="small muted">Bir terime dokun, figürde ok olarak görünsün.</p>
      <div class="anwrap"><div class="anfig"><svg class="body" viewBox="0 0 200 460" id="dirsv"><path class="sil" d="${SIL}"/><path class="sil" transform="translate(200 0) scale(-1 1)" d="${SIL}"/><line x1="100" y1="0" x2="100" y2="460" class="midl"/><text x="104" y="456" class="ax">orta hat</text><g id="arr"></g></svg></div>
      <div class="stack"><div class="chipsel wrap" id="dl">${ADIR.slice(0, 8).map((d, i) => `<button data-i="${i}" aria-pressed="false">${esc(d[0])}</button>`).join("")}</div><div id="dinfo" class="callout">Bir terim seç.</div>
      <div class="tw"><table><thead><tr><th>Terim</th><th>Anlam</th><th>Örnek</th></tr></thead><tbody>${ADIR.map(d => `<tr><td><b>${esc(d[0])}</b></td><td>${esc(d[1])}</td><td class="small">${esc(d[2])}</td></tr>`).join("")}</tbody></table></div>
      <p class="small"><b>Hafıza:</b> <b>Pro</b>ksimal = <b>pro</b>je merkezine yakın (gövde), <b>Dis</b>tal = <b>dis</b>tant (uzak). <b>Med</b>ial = <b>med</b>ya ortası. <b>Lat</b>eral = <b>lat</b>a (yana) açılır.</p></div></div></section>
    <section class="card stack"><h2>2. Üç hareket düzlemi</h2>
      <div class="g3 planes">
        <div class="plane sag"><svg viewBox="0 0 120 140" aria-label="Sagital düzlem animasyonu: yandan kol fleksiyonu"><rect x="2" y="2" width="116" height="136" rx="10" class="pbg"/><circle cx="60" cy="24" r="10" class="stk"/><line x1="60" y1="34" x2="60" y2="88" class="stk"/><line x1="60" y1="88" x2="52" y2="130" class="stk"/><line x1="60" y1="88" x2="66" y2="130" class="stk"/><g class="armS"><line x1="60" y1="44" x2="60" y2="84" class="stk arm"/></g><text x="8" y="132" class="ax">yandan</text></svg>
          <h3>Sagital = <u>S</u>elam ver</h3><p class="small">Vücudu <b>sağ-sol</b> ikiye böler. Hareket <b>öne-arkaya</b>.</p><p class="small"><b>Hareketler:</b> fleksiyon, ekstansiyon, dorsi/plantar fleksiyon.</p><p class="small"><b>Egzersiz:</b> biceps curl, squat, lunge, front raise, crunch, leg curl.</p></div>
        <div class="plane fro"><svg viewBox="0 0 120 140" aria-label="Frontal düzlem animasyonu: önden kol abduksiyonu"><rect x="2" y="2" width="116" height="136" rx="10" class="pbg"/><circle cx="60" cy="24" r="10" class="stk"/><line x1="60" y1="34" x2="60" y2="88" class="stk"/><line x1="60" y1="88" x2="50" y2="130" class="stk"/><line x1="60" y1="88" x2="70" y2="130" class="stk"/><g class="armF1"><line x1="54" y1="44" x2="54" y2="84" class="stk arm"/></g><g class="armF2"><line x1="66" y1="44" x2="66" y2="84" class="stk arm"/></g><text x="8" y="132" class="ax">önden</text></svg>
          <h3>Frontal = <u>F</u>il kanadı</h3><p class="small">Vücudu <b>ön-arka</b> ikiye böler. Hareket <b>yana</b>.</p><p class="small"><b>Hareketler:</b> abduksiyon, adduksiyon, lateral fleksiyon, elevasyon/depresyon, inversiyon/eversiyon.</p><p class="small"><b>Egzersiz:</b> lateral raise, lat pulldown, side lunge, jumping jack, side bend, shrug.</p></div>
        <div class="plane tra"><svg viewBox="0 0 120 140" aria-label="Horizontal düzlem animasyonu: üstten gövde rotasyonu"><rect x="2" y="2" width="116" height="136" rx="10" class="pbg"/><g class="rotH"><ellipse cx="60" cy="70" rx="40" ry="13" class="stk"/><circle cx="60" cy="70" r="9" class="stk"/><path d="M60,52 l-5,8 h10 Z" class="nose"/></g><text x="8" y="132" class="ax">üstten</text></svg>
          <h3>Horizontal (transvers) = <u>H</u>alay dönüşü</h3><p class="small">Vücudu <b>üst-alt</b> ikiye böler. Hareket <b>dönme</b>.</p><p class="small"><b>Hareketler:</b> iç/dış rotasyon, pronasyon/supinasyon, yatay add./abd., retraksiyon/protraksiyon.</p><p class="small"><b>Egzersiz:</b> Russian twist, wood chop, chest fly, reverse fly, band rotasyon.</p></div>
      </div>
      <div class="callout"><b>Kural:</b> Düzlemi önce bul, adı kendiliğinden gelir. Sagitalde öne giden = fleksiyon, geriye = ekstansiyon. Frontalde dışa = abduksiyon, içe = adduksiyon. <b>Diz istisna:</b> diz bükülünce topuk geriye gider ama bu da diz fleksiyonu. Düzlemler kişiyle birlikte döner.</div></section>
    <section class="card stack"><h2>3. Hareket sözlüğü</h2><p class="small muted">Her satırı oku ve <b>kendin dene</b> sütunundakini gerçekten yap. Hareketi bedenine öğretmek, ezberden 3 kat kalıcı.</p>
      <div class="tw"><table><thead><tr><th>Hareket</th><th>Anlamı</th><th>Düzlem</th><th>Kendin dene</th></tr></thead><tbody>${AMOV.map(m => `<tr><td><b>${esc(m[0])}</b></td><td>${esc(m[1])}</td><td>${plChip(m[2])}</td><td class="small">${esc(m[3])}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="card stack"><h2>4. Kendini sına</h2><div class="chipsel" id="qm"><button data-m="y" aria-pressed="true">Yön testi</button><button data-m="d" aria-pressed="false">Hareket → düzlem</button></div><div id="qz"></div></section></div>`);
  /* yön okları */
  const AR = {
    0: [[100, 140, 100, 140, "Anterior: figür bize bakıyor; ön yüz = gördüğün taraf. (Tibialis anterior, rectus abdominis önde.)", "dot"]],
    1: [[100, 140, 100, 140, "Posterior: figürün arkası, bizden uzak taraf (gluteus, hamstring, latissimus).", "x"]],
    2: [[150, 120, 150, 30, "Superior: başa doğru, yukarı."]],
    3: [[150, 300, 150, 420, "Inferior: ayağa doğru, aşağı."]],
    4: [[30, 200, 92, 200, "Medial: orta hatta doğru (içe)."]],
    5: [[92, 200, 30, 200, "Lateral: orta hattan uzağa (dışa)."]],
    6: [[38, 240, 56, 90, "Proksimal: gövdeye, uzvun başladığı yere doğru."]],
    7: [[56, 90, 38, 240, "Distal: gövdeden uzağa, uzvun ucuna doğru."]]
  };
  $$("#dl button").forEach(b => b.onclick = () => {
    $$("#dl button").forEach(x => x.setAttribute("aria-pressed", x === b));
    const a = AR[b.dataset.i][0];
    $("#arr").innerHTML = a[5] === "dot" ? `<circle cx="100" cy="140" r="14" class="arw"/><circle cx="100" cy="140" r="4" class="arwf"/>` : a[5] === "x" ? `<circle cx="100" cy="140" r="14" class="arw"/><path d="M92,132 L108,148 M108,132 L92,148" class="arw"/>` : `<line x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}" class="arw" marker-end="url(#ah)"/>`;
    if (!$("#ah")) $("#dirsv").insertAdjacentHTML("afterbegin", '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" class="arwf"/></marker></defs>');
    $("#dinfo").textContent = a[4];
  });
  /* testler */
  let qm = "y";
  const run = () => {
    const items = qm === "y" ? shuffle(ADQ).slice(0, 10).map(q => ({ q: q[0], a: q[1], o: shuffle(ADSET[q[2]]) })) : shuffle(AMOV.filter(m => m[2] !== "Birden fazla")).slice(0, 10).map(m => ({ q: `${m[0]} (${m[1].toLocaleLowerCase("tr")}) hangi düzlemde olur?`, a: m[2], o: ["Sagital", "Frontal", "Horizontal"] }));
    let i = 0, ok = 0;
    const show = () => {
      if (i >= items.length) { $("#qz").innerHTML = `<div class="callout ${ok >= 8 ? "ok" : "hot"}"><b>${ok}/10.</b> ${ok >= 8 ? "Bu konu tamam." : "Tabloyu bir kez daha oku, hareketleri kendin yaparak tekrar dene."}</div><button class="btn" id="qr">Yeni 10 soru</button>`; $("#qr").onclick = run; return; }
      const it = items[i];
      $("#qz").innerHTML = `<div class="small muted">Soru ${i + 1}/10 · Doğru ${ok}</div><p style="font-size:18px;margin:6px 0">${esc(it.q)}</p><div class="opts">${it.o.map((o, j) => `<button class="opt" data-o="${esc(o)}"><b>${L[j]}</b><span>${esc(o)}</span></button>`).join("")}</div><div id="qf"></div>`;
      $$("#qz .opt").forEach(b => b.onclick = () => { const good = b.dataset.o === it.a; if (good) ok++; $$("#qz .opt").forEach(x => { x.disabled = true; if (x.dataset.o === it.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); }); $("#qf").innerHTML = `<button class="btn" id="qn" style="margin-top:8px">Sonraki</button>`; $("#qn").onclick = () => { i++; show(); }; });
    };
    show();
  };
  $$("#qm button").forEach(b => b.onclick = () => { qm = b.dataset.m; $$("#qm button").forEach(x => x.setAttribute("aria-pressed", x === b)); run(); });
  run();
}
function plChip(p) { const c = { Sagital: "sag", Frontal: "fro", Horizontal: "tra" }[p]; return c ? `<span class="pill pl-${c}">${p}</span>` : `<span class="pill">${esc(p)}</span>`; }

/* ---- hareket zinciri ---- */
function anZincir(r, main) {
  page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>Hareket zinciri: egzersiz → eklem → hareket → düzlem → kas</h1><p class="muted">Quizdeki fotoğraf sorularının hepsi bu kalıp. Her egzersizde 4 adımı sırayla çöz. Kaldırma (yukarı) fazına göre düşün; indirirken aynı kas eksantrik çalışır.</p></div>
    ${anTabs(r)}<div id="zc"></div>
    <section class="card stack"><h2>Fotoğraftan hareket bulma yöntemi</h2><ol class="steps"><li><b>Hangi eklem?</b> Hareket eden uzvun bağlı olduğu eklem (kol hareket ettiyse omuz).</li><li><b>Hangi yön?</b> Öne-geriye = sagital, yana = frontal, dönme = horizontal.</li><li><b>Hangi isim?</b> Sagitalde öne = fleksiyon, geriye = ekstansiyon; frontalde dışa = abduksiyon, içe = adduksiyon.</li><li><b>Hangi kas?</b> Hareketin <b>tersinde</b> duran kas değil, hareketi yapan taraftaki kas: kolu öne kaldıran öndeki deltoid.</li></ol>
    <p class="small">Daha fazla egzersiz analizi için <a href="#atlas">Hareket atlası</a>.</p></section></div>`);
  let qs = shuffle(ACH).slice(0, 10), i = 0, step = 0, score = 0, tot = 0;
  const STEPS = [["Hangi eklem hareket ediyor?", 1], ["Hangi hareket?", 2], ["Hangi düzlemde?", 3], ["Ana (agonist) kas hangisi?", 4]];
  const optsFor = (q, s) => {
    if (s === 1) return anOpts(q[1], AEKLEM);
    if (s === 2) { const pool = [...new Set(ACH.map(x => x[2]))]; return anOpts(q[2], pool); }
    if (s === 3) return ["Sagital", "Frontal", "Horizontal"];
    return anOpts(q[4], AKAS.filter(k => !q[5].includes(k)));
  };
  const draw = () => {
    if (i >= qs.length) { const S = anSt(); S.best.zincir = Math.max(S.best.zincir || 0, score); save(); $("#zc").innerHTML = `<div class="card stack"><h2>Bitti: ${score}/${tot} adım doğru</h2><p>${score / tot >= .85 ? "Fotoğraf sorularına hazırsın." : "Yanlış adımlarda genelde eklem ya da düzlem karışıyor. Yön ve düzlem sayfasındaki animasyonlara bir kez daha bak."}</p><button class="btn" id="zr">Yeni 10 egzersiz</button></div>`; $("#zr").onclick = () => { qs = shuffle(ACH).slice(0, 10); i = 0; step = 0; score = 0; tot = 0; draw(); }; return; }
    const q = qs[i]; const done = [];
    for (let s = 0; s < step; s++) done.push(`<span class="pill ok">${esc(q[STEPS[s][1]])}</span>`);
    const st = STEPS[step]; const opts = optsFor(q, st[1]); const ans = q[st[1]];
    $("#zc").innerHTML = `<div class="card stack"><div class="small muted">Egzersiz ${i + 1}/10 · Adım ${step + 1}/4 · Doğru ${score}/${tot}</div><h2 style="margin:0">${esc(q[0])}</h2><div class="row wrap">${done.join('<span class="muted">→</span>')}</div>
      <p style="font-size:18px;margin:4px 0"><b>${st[0]}</b></p><div class="opts">${opts.map((o, j) => `<button class="opt" data-o="${esc(o)}"><b>${L[j]}</b><span>${st[1] === 3 ? plChip(o) : esc(o)}</span></button>`).join("")}</div><div id="zf"></div></div>`;
    $$("#zc .opt").forEach(b => b.onclick = () => {
      const ok = b.dataset.o === ans; tot++; if (ok) score++;
      $$("#zc .opt").forEach(x => { x.disabled = true; if (x.dataset.o === ans) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
      const last = step === 3; const extra = last && q[5].length ? ` Yardımcı kaslar: ${q[5].join(", ")}.` : "";
      $("#zf").innerHTML = `${last ? `<div class="callout ok"><b>${esc(q[0])}:</b> ${esc(q[1])} ${esc(q[2].toLocaleLowerCase("tr"))}, ${esc(q[3])} düzlem, agonist ${esc(q[4])}.${esc(extra)}</div>` : ""}<button class="btn" id="zn" style="margin-top:8px">${last ? "Sonraki egzersiz" : "Sonraki adım"}</button>`;
      $("#zn").onclick = () => { if (last) { i++; step = 0; } else step++; draw(); };
    });
  };
  draw();
}

/* ---- isim çözücü ---- */
function anIsim(r, main) {
  page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>İsim çözücü: Latince kökler</h1><p class="muted">25 kökü bilen, kas isimlerinin çoğunu ezberlemeden çözer. Önce tabloyu oku, sonra oyunu oyna.</p></div>
    ${anTabs(r)}
    <section class="grid2" style="align-items:start"><div class="card stack"><h2>Kök sözlüğü</h2><div class="tw"><table><thead><tr><th>Kök</th><th>Anlamı</th></tr></thead><tbody>${AROOT.map(x => `<tr><td><b>${esc(x[0])}</b></td><td>${esc(x[1])}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="card stack"><h2>Oyun: ismi çöz</h2><div id="iz"></div>
      <h3>Kendi ismini parçala</h3><p class="small muted">Bir kas adı yaz, kökleri bulayım (ör. "vastus medialis").</p><input id="ip" type="search" placeholder="Kas adı"><div id="io" class="small"></div></div></section></div>`);
  let qs = shuffle(ANAME).slice(0, 10), i = 0, ok = 0;
  const draw = () => {
    if (i >= qs.length) { const S = anSt(); S.best.isim = Math.max(S.best.isim || 0, ok); save(); $("#iz").innerHTML = `<div class="callout ${ok >= 8 ? "ok" : "hot"}"><b>${ok}/10</b></div><button class="btn" id="ir">Tekrar</button>`; $("#ir").onclick = () => { qs = shuffle(ANAME).slice(0, 10); i = 0; ok = 0; draw(); }; return; }
    const q = qs[i]; const opts = anOpts(q[1], ANAME.map(x => x[1]));
    $("#iz").innerHTML = `<div class="small muted">Soru ${i + 1}/10 · Doğru ${ok}</div><p style="font-size:20px;margin:4px 0"><b>${esc(q[0])}</b> ne demek?</p><div class="opts">${opts.map((o, j) => `<button class="opt" data-o="${esc(o)}"><b>${L[j]}</b><span>${esc(o)}</span></button>`).join("")}</div><div id="if"></div>`;
    $$("#iz .opt").forEach(b => b.onclick = () => { const g = b.dataset.o === q[1]; if (g) ok++; $$("#iz .opt").forEach(x => { x.disabled = true; if (x.dataset.o === q[1]) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); }); $("#if").innerHTML = `<div class="small" style="margin-top:6px">${decode(q[0])}</div><button class="btn" id="in" style="margin-top:8px">Sonraki</button>`; $("#in").onclick = () => { i++; draw(); }; });
  };
  const RMAP = [["maximus", "en büyük"], ["medius", "orta"], ["minimus", "en küçük"], ["major", "büyük"], ["minor", "küçük"], ["longus", "uzun"], ["brevis", "kısa"], ["magnus", "büyük"], ["rectus", "düz"], ["oblique", "eğik"], ["obliquus", "eğik"], ["transversus", "enine"], ["biceps", "iki başlı"], ["triceps", "üç başlı"], ["quadriceps", "dört başlı"], ["brachii", "kol"], ["brachialis", "kol"], ["femoris", "uyluk"], ["abdominis", "karın"], ["pectoralis", "göğüs"], ["dorsi", "sırt"], ["latissimus", "en geniş"], ["gluteus", "kalça"], ["erector", "dik tutan"], ["spinae", "omurga"], ["serratus", "testere dişli"], ["anterior", "ön"], ["posterior", "arka"], ["lateralis", "dış yan"], ["medialis", "iç yan"], ["tensor", "gerici"], ["vastus", "geniş"], ["teres", "yuvarlak"], ["tibialis", "kaval kemiği"], ["supraspinatus", "diken üstü"], ["infraspinatus", "diken altı"], ["subscapularis", "kürek altı"], ["adductor", "yaklaştırıcı"], ["external", "dış"], ["internal", "iç"], ["fasciae", "fasya"], ["latae", "geniş/yan"], ["radialis", "radius"], ["deltoideus", "delta biçimli"], ["deltoid", "delta biçimli"], ["trapezius", "trapez biçimli"], ["sartorius", "terzi"], ["soleus", "pisi balığı (yassı)"], ["gastrocnemius", "bacağın karnı"], ["peroneus", "fibula"], ["quadratus", "dört köşe"], ["lumborum", "bel"]];
  const decode = s => s.split(/\s+/).map(w => { const f = RMAP.find(x => x[0] === w.toLowerCase()); return `<b>${esc(w)}</b> = ${f ? esc(f[1]) : "?"}`; }).join(" · ");
  $("#ip").oninput = e => { const v = e.target.value.trim(); $("#io").innerHTML = v ? decode(v) : ""; };
  draw();
}

/* ---- aralıklı tekrar kartları (Leitner) ---- */
function anKart(r, main) {
  const deck = [
    ...AM.map(m => ({ id: "m:" + m[0], g: "Kas", f: m[1], fs: "Nerede, ne yapar, hangi egzersiz?", b: `<b>${esc(m[2])}</b><br><b>Nerede:</b> ${esc(m[5])}<br><b>Ne yapar:</b> ${esc(m[6])}<br><b>Egzersiz:</b> ${esc(m[7])}<div class="callout ok small" style="margin-top:8px">${esc(m[8])}</div>` })),
    ...AB.map(b => ({ id: "b:" + b[0], g: "Kemik", f: b[1], fs: "Türkçesi ve özelliği?", b: `<b>${esc(b[2])}</b> · ${esc(b[3])} kemik<br>${esc(b[4])}<div class="callout ok small" style="margin-top:8px">${esc(b[5])}</div>` })),
    ...ADIR.map((d, i) => ({ id: "t:d" + i, g: "Yön", f: d[0], fs: "Anlamı?", b: `<b>${esc(d[1])}</b><br>${esc(d[2])}` })),
    ...AMOV.map((m, i) => ({ id: "t:m" + i, g: "Hareket", f: m[0], fs: "Anlamı ve düzlemi?", b: `<b>${esc(m[1])}</b><br>Düzlem: ${plChip(m[2])}<br><span class="small">Kendin dene: ${esc(m[3])}</span>` }))
  ];
  const S = anSt(); let grp = "", cur = null, open = false;
  page(main, `<div class="stack"><div class="uhead"><span class="eyebrow">Anatomi kampı</span><h1>Kartlar: kutu sistemiyle tekrar</h1><p class="muted">Bildiğin kart bir üst kutuya çıkar ve daha seyrek gelir. Bilemediğin 1. kutuya döner ve sık gelir. 3. kutuya çıkan "öğrenildi" sayılır.</p></div>
    ${anTabs(r)}
    <div class="chipsel" id="kg">${["", "Kas", "Kemik", "Yön", "Hareket"].map(g => `<button data-g="${g}" aria-pressed="${g === ""}">${g || "Hepsi"}</button>`).join("")}</div>
    <div id="kb" class="row wrap small"></div><div id="kc"></div></div>`);
  const pickCard = () => {
    const l = deck.filter(c => !grp || c.g === grp);
    const w = l.map(c => { const b = S.box[c.id] || 0; return { c, w: [6, 5, 3, 1.5, .7, .3][Math.min(b, 5)] }; });
    let t = Math.random() * w.reduce((a, x) => a + x.w, 0);
    for (const x of w) { t -= x.w; if (t <= 0 && x.c !== cur) return x.c; }
    return w[0].c;
  };
  const stats = () => { const l = deck.filter(c => !grp || c.g === grp); const n = [0, 0, 0, 0, 0, 0]; l.forEach(c => n[Math.min(S.box[c.id] || 0, 5)]++); $("#kb").innerHTML = n.map((v, i) => `<span class="pill ${i >= 3 ? "ok" : ""}">${i === 0 ? "Yeni" : i + ". kutu"}: ${v}</span>`).join(""); };
  const draw = () => {
    stats();
    $("#kc").innerHTML = `<div class="card stack ankart"><div class="row between"><span class="pill">${esc(cur.g)}</span><span class="small muted">kutu ${S.box[cur.id] || 0}</span></div><div class="kf">${esc(cur.f)}</div><div class="small muted">${esc(cur.fs)}</div>
      ${open ? `<div class="kbk">${cur.b}</div><div class="row"><button class="btn ghost" id="kn">✗ Bilemedim</button><button class="btn" id="ky">✓ Bildim</button></div>` : `<button class="btn" id="ko">Cevabı göster (boşluk)</button>`}</div>`;
    if (open) { $("#ky").onclick = () => ans(true); $("#kn").onclick = () => ans(false); } else $("#ko").onclick = () => { open = true; draw(); };
  };
  const ans = ok => { S.box[cur.id] = ok ? Math.min((S.box[cur.id] || 0) + 1, 5) : 1; save(); cur = pickCard(); open = false; draw(); };
  $$("#kg button").forEach(b => b.onclick = () => { grp = b.dataset.g; $$("#kg button").forEach(x => x.setAttribute("aria-pressed", x === b)); cur = pickCard(); open = false; draw(); });
  KEYS = e => { if (e.key === " ") { e.preventDefault(); if (!open) { open = true; draw(); } } else if (open && (e.key === "1" || e.key === "ArrowLeft")) ans(false); else if (open && (e.key === "2" || e.key === "ArrowRight")) ans(true); };
  cur = pickCard(); draw();
}

/* ============ Uygulamalı sınav: eklem hareketi → egzersiz → Anlat, Göster, Uygulat, Geri bildirim ============ */
/* Öğretim sırası manuel s. 76–77 ve 136–138 (Ünite 16). Eklem-düzlem-kas bilgisi Ünite 3, 9, 14 ve atlas. */
const UY = [
  /* bölge, eklem, hareket, düzlem, egzersiz, alternatifler, agonist, yardımcı, göster açısı, anlat, kurulum[], uygulama[], hatalar[[hata, düzeltme komutu]], kolaylaştır/zorlaştır */
  ["Üst ekstremite", "Omuz", "Fleksiyon", "Sagital", "Dumbbell front raise", "Kablo veya band ile front raise, plate front raise",
    "Deltoid (ön)", "Pectoralis major (üst/klaviküler lifler), biceps brachii", "Yandan",
    "Bu hareketin adı front raise. Omuz ekleminde, sagital düzlemde fleksiyon yaptırır: kolu öne doğru kaldırırız. Ana çalışan kas omzun ön kısmı, ön deltoid. Günlük hayatta kolunu öne uzatıp bir şey kaldırmanı kolaylaştırır.",
    ["Ayaklar kalça genişliğinde, dizler hafif bükük", "Dumbbell'lar uyluğun önünde, avuçlar uyluğa bakıyor", "Göğüs dik, karın hafif sıkı, omuzlar aşağıda"],
    ["Dirsek hafif bükük kalsın, kolu öne doğru omuz hizasına kadar kaldır", "Bir saniye dur, 2–3 saniyede kontrollü indir", "Kaldırırken nefes ver, indirirken al"],
    [["Gövdeyi geriye atıp sallanarak kaldırmak", "Gövden sabit, sadece kollar hareket etsin. Ağırlığı azaltalım."], ["Omuzları kulaklara doğru kaldırmak (üst trapez devreye giriyor)", "Omuzların aşağıda, boynun uzun."], ["Omuz hizasının çok üstüne çıkmak", "Göz hizasında dur."], ["Kolu hızla düşürmek", "İnerken 2–3 saniye say, frenle."]],
    "Kolaylaştır: tek kol, hafif ağırlık veya ağırlıksız. Zorlaştır: tempo yavaşlat, tepe noktada 2 sn bekle."],
  ["Üst ekstremite", "Omuz", "Ekstansiyon", "Sagital", "Straight-arm pulldown (kablo veya band)", "Band ile kol düz aşağı çekiş, dumbbell pullover (ekstansiyon fazı)",
    "Latissimus dorsi", "Teres major, deltoid (arka), triceps brachii (uzun baş)", "Yandan",
    "Bu straight-arm pulldown. Omuz ekleminde sagital düzlemde ekstansiyon yaptırır: önde yukarıda duran kolu düz şekilde aşağı ve geriye getiririz. Ana kas sırtın en geniş kası latissimus dorsi.",
    ["Kablonun karşısında, bir adım geride dur", "Kalçadan hafif öne eğil, sırt düz", "Barı omuz genişliğinde tut, kollar önde ve yukarıda, dirsekler hafif bükük"],
    ["Kolları düz tutarak barı uyluklarına kadar çek", "Sonda kürek kemiklerini aşağı bastır, sırtını sık", "Kontrollü geri bırak; çekerken nefes ver"],
    [["Dirsekleri büküp hareketi triceps pushdown'a çevirmek", "Kolların sabit bir çubuk gibi, dirsek açısı değişmesin."], ["Belin çukurlaşması", "Karnını sık, kaburgalar aşağı."], ["Gövdeyle sallanmak", "Gövde sabit, sadece kollar hareket etsin."]],
    "Kolaylaştır: hafif band, daha kısa hareket açıklığı. Zorlaştır: daha yavaş eksantrik, tek kol."],
  ["Üst ekstremite", "Omuz", "Abduksiyon", "Frontal", "Dumbbell lateral raise", "Kablo lateral raise, band lateral raise; shoulder press (abduksiyon + dirsek ekstansiyonu)",
    "Deltoid (orta), supraspinatus (ilk 15°)", "Trapezius (üst), serratus anterior (skapulayı döndürür)", "Önden",
    "Bu lateral raise. Omuz ekleminde frontal düzlemde abduksiyon yaptırır: kolu yana, vücudun orta hattından uzaklaştırırız. Ana kas omzun orta kısmı, orta deltoid. Hareketin ilk 15 derecesini rotator cuff'tan supraspinatus başlatır.",
    ["Ayaklar kalça genişliğinde, dizler hafif bükük", "Dumbbell'lar yanlarda, avuçlar içe bakıyor", "Göğüs dik, omuzlar aşağıda"],
    ["Dirsekler hafif bükük, kolları yana omuz hizasına kadar kaldır", "Dirsek ve el aynı yükseklikte, serçe parmak tarafı yukarı değil, avuç yere baksın", "Kontrollü indir; kaldırırken nefes ver"],
    [["Omuzları kulaklara kaldırmak (shrug'a çevirmek)", "Omuzların aşağıda, boynun uzun. Ağırlığı azaltalım."], ["Omuz hizasının üstüne çıkmak", "Omuz hizasında dur, uçaktan kanat gibi."], ["Gövdeyle sallanarak kaldırmak", "Gövde sabit, karın sıkı."], ["Bilekleri dirsekten yukarı kaldırmak", "Dirsekler yukarıyı göstersin, eller dirsekleri takip etsin."]],
    "Kolaylaştır: dirsekler 90° bükük, hafif ağırlık. Zorlaştır: tepe noktada 2 sn bekleme, yavaş indirme."],
  ["Üst ekstremite", "Omuz", "Adduksiyon", "Frontal", "Lat pulldown (geniş tutuş, önden)", "Band ile pulldown, destekli barfiks",
    "Latissimus dorsi", "Teres major, pectoralis major, biceps brachii, rhomboidler", "Önden veya yandan",
    "Bu lat pulldown. Omuz ekleminde frontal düzlemde adduksiyon yaptırır: yukarıda yana açık kolları vücudun orta hattına doğru aşağı çekeriz. Ana kas latissimus dorsi; dirsek de fleksiyon yapar, biceps yardım eder.",
    ["Diz pedini uyluklara oturacak şekilde ayarla", "Barı omuz genişliğinden biraz geniş tut", "Göğüs yukarı, gövde çok az geride"],
    ["Önce kürek kemiklerini aşağı indir, sonra barı göğsünün üstüne çek", "Dirsekleri aşağı ve yanlara, cebine doğru götür", "Kontrollü yukarı bırak, kollar tam uzasın; çekerken nefes ver"],
    [["Barı ensenin arkasına çekmek", "Barı göğsünün önüne çek, omzun güvende kalsın."], ["Gövdeyle geriye sallanarak çekmek", "Gövden sabit, sadece kollar ve sırt çalışsın."], ["Omuzların kulaklara kalkması", "Önce omuzları aşağı, sonra çek."], ["Yukarıda kolları tam uzatmamak", "Yukarıda tamamen uzan, sırtın gerilsin."]],
    "Kolaylaştır: hafif ağırlık, band. Zorlaştır: yavaş eksantrik, aşağıda 1 sn sıkma."],
  ["Üst ekstremite", "Omuz", "İç rotasyon", "Horizontal", "Band veya kablo ile iç rotasyon", "Yan yatarak dumbbell iç rotasyon",
    "Subscapularis", "Latissimus dorsi, pectoralis major, teres major", "Önden",
    "Bu band ile iç rotasyon. Omuz ekleminde horizontal (transvers) düzlemde iç rotasyon yaptırır: dirsek gövdenin yanında sabitken ön kolu karnına doğru çeviririz. Ana kas rotator cuff'tan subscapularis. Omuzu stabilize etmek için yapılır.",
    ["Bandı dirsek hizasında, çalışan kolun tarafına bağla", "Yan dur, dirsek 90° bükük ve gövdeye yapışık; arasına havlu sıkıştırabilirsin", "Ön kol dışarıyı gösteriyor"],
    ["Dirseği yerinden oynatmadan ön kolu karnına doğru çevir", "Yavaşça başlangıca dön", "Hafif yük, 12–15 tekrar"],
    [["Dirseğin gövdeden açılması", "Dirseğin gövdene yapışık, havluyu düşürme."], ["Gövdeyi döndürerek çekmek", "Göbeğin önü göstersin, sadece ön kol dönsün."], ["Ağır band kullanmak", "Bu küçük bir kas, hafif bandla kontrollü yap."]],
    "Kolaylaştır: daha kısa açıklık. Zorlaştır: kol 90° yana açık pozisyonda (90/90) yap."],
  ["Üst ekstremite", "Omuz", "Dış rotasyon", "Horizontal", "Band veya kablo ile dış rotasyon", "Yan yatarak dumbbell dış rotasyon, face pull",
    "Infraspinatus, teres minor", "Deltoid (arka)", "Önden",
    "Bu band ile dış rotasyon. Omuz ekleminde horizontal düzlemde dış rotasyon yaptırır: dirsek gövdenin yanında sabitken ön kolu dışarı açarız, kapıyı dışa açar gibi. Ana kaslar rotator cuff'tan infraspinatus ve teres minor. Omuz sağlığı ve postür için çok önemli.",
    ["Bandı dirsek hizasında, çalışan kolun ters tarafına bağla", "Dirsek 90° bükük ve gövdeye yapışık, arasında havlu", "Ön kol karnının önünde"],
    ["Dirseği oynatmadan ön kolu dışarı aç", "Kürek kemiği hafif geride", "Yavaşça geri getir; 12–15 tekrar"],
    [["Dirseğin gövdeden ayrılması", "Havluyu sıkıştır, dirsek yerinde."], ["Bileği kırarak hareket ettirmek", "Bilek düz, ön kolla birlikte dönsün."], ["Gövdeyi döndürmek", "Göğsün önü göstersin."]],
    "Kolaylaştır: yan yatarak ağırlıksız. Zorlaştır: 90/90 pozisyonda, yavaş tempo."],
  ["Üst ekstremite", "Omuz", "Yatay adduksiyon", "Horizontal", "Dumbbell fly (bench'te)", "Pec deck, cable crossover; push-up ve bench press (yatay add. + dirsek ext.)",
    "Pectoralis major", "Deltoid (ön), coracobrachialis", "Yandan veya önden",
    "Bu dumbbell fly. Omuz ekleminde horizontal düzlemde yatay adduksiyon yaptırır: yana açık kolları göğsün önünde birleştiririz, birine sarılır gibi. Ana kas büyük göğüs kası pectoralis major.",
    ["Bench'e sırt üstü yat, ayaklar yerde, kürek kemikleri geride ve bench'e basık", "Dumbbell'lar göğsün üstünde, avuçlar birbirine bakıyor", "Dirsekler hafif bükük ve bu açı sabit kalacak"],
    ["Kolları yana, göğüs hizasına kadar yay çizerek aç", "Göğüste gerilmeyi hissedince aynı yaydan yukarı getir", "Yukarıda göğsünü sık; kaldırırken nefes ver"],
    [["Kolları omuz hizasının çok altına indirmek", "Dirsekler göğüs hizasında dursun, omzunu koru."], ["Dirsekleri büküp press'e çevirmek", "Dirsek açısı sabit, kucaklar gibi aç-kapa."], ["Kürek kemiklerinin bench'ten kalkması", "Kürek kemiklerini arka cebine koy, sabit tut."]],
    "Kolaylaştır: hafif dumbbell, kısa açıklık veya pec deck makinesi. Zorlaştır: yavaş eksantrik."],
  ["Üst ekstremite", "Omuz", "Yatay abduksiyon", "Horizontal", "Reverse fly (öne eğilerek dumbbell veya makine)", "Band pull-apart, reverse pec deck",
    "Deltoid (arka)", "Rhomboidler, trapezius (orta), infraspinatus, teres minor", "Yandan",
    "Bu reverse fly. Omuz ekleminde horizontal düzlemde yatay abduksiyon yaptırır: önde duran kolları yana açarız. Ana kas omzun arka kısmı arka deltoid; kürek kemiklerini birbirine yaklaştıran rhomboidler ve orta trapez yardım eder. Kambur postüre karşı çok iyi.",
    ["Dizler hafif bükük, kalçadan öne eğil, sırt düz", "Dumbbell'lar omuzların altında sarkıyor, avuçlar birbirine bakıyor", "Boyun nötr, bakış yere"],
    ["Dirsekler hafif bükük, kolları yana omuz hizasına kadar aç", "Sonda kürek kemiklerini sık", "Kontrollü indir; açarken nefes ver"],
    [["Sırtın yuvarlanması", "Göğsün yere doğru açık, sırt düz."], ["Gövdeyi kaldırarak sallanmak", "Gövden sabit, sadece kollar."], ["Omuzları kulaklara kaldırmak", "Omuzlar aşağıda."]],
    "Kolaylaştır: band pull-apart ayakta. Zorlaştır: tepe noktada 2 sn bekleme."],
  ["Üst ekstremite", "Kürek kemiği (skapula)", "Elevasyon", "Frontal", "Dumbbell shrug", "Barbell shrug, trap bar shrug",
    "Trapezius (üst lifler)", "Levator scapulae", "Önden",
    "Bu shrug, omuz silkme. Kürek kemiğinde frontal düzlemde elevasyon yaptırır: omuzları kulaklara doğru kaldırırız. Ana kas trapeziusun üst lifleri.",
    ["Ayaklar kalça genişliğinde, dumbbell'lar yanlarda", "Kollar düz ve gevşek", "Göğüs dik, baş nötr"],
    ["Omuzlarını kulaklarına doğru dik yukarı kaldır", "Tepede 1 sn sık", "Yavaşça aşağı indir; kaldırırken nefes ver"],
    [["Omuzları döndürmek (çevirmek)", "Sadece yukarı-aşağı, asansör gibi."], ["Dirsekleri bükerek çekmek", "Kolların halat gibi gevşek ve düz."], ["Başı öne uzatmak", "Çenen hafif içeride, baş dik."]],
    "Kolaylaştır: ağırlıksız. Zorlaştır: tepe noktada 2–3 sn bekleme."],
  ["Üst ekstremite", "Kürek kemiği (skapula)", "Depresyon", "Frontal", "Skapular pulldown (lat pulldown makinesinde kollar düz)", "Skapular dips (paralel barda kollar düz), band ile",
    "Trapezius (alt lifler)", "Latissimus dorsi, pectoralis minor", "Önden veya arkadan",
    "Bu skapular pulldown. Kürek kemiğinde frontal düzlemde depresyon yaptırır: omuzları kulaklardan uzaklaştırıp aşağı bastırırız. Ana kas trapeziusun alt lifleri. Dirsek hiç bükülmez.",
    ["Lat pulldown makinesine otur, barı omuz genişliğinden geniş tut", "Kollar tamamen düz, omuzlar kulaklara doğru kalkmış (başlangıç)"],
    ["Kolları bükmeden sadece omuzları aşağı bastır", "Kürek kemiklerini arka cebine sok", "Yavaşça yukarı bırak; aşağı bastırırken nefes ver"],
    [["Dirsekleri bükmek", "Kolların düz, hareket sadece omuzdan."], ["Gövdeyle geriye yaslanmak", "Gövden dik ve sabit."]],
    "Kolaylaştır: hafif ağırlık, kısa açıklık. Zorlaştır: aşağıda 2 sn bekleme."],
  ["Üst ekstremite", "Kürek kemiği (skapula)", "Retraksiyon", "Horizontal", "Seated cable row (oturarak kürek çekiş)", "Band pull-apart, face pull, one-arm dumbbell row",
    "Rhomboidler, trapezius (orta lifler)", "Latissimus dorsi, deltoid (arka), biceps brachii", "Yandan",
    "Bu seated row. Kürek kemiklerini birbirine yaklaştırır, yani retraksiyon yaptırır (horizontal düzlem); aynı anda omuz ekstansiyonu ve dirsek fleksiyonu da olur. Ana kaslar rhomboidler ve orta trapez, yardımcı latissimus dorsi. Kambur duruşa karşı en iyi hareketlerden biri.",
    ["Makineye otur, ayaklar platformda, dizler hafif bükük", "Kolu tut, sırt dik, göğüs yukarı", "Kollar önde uzanmış, kürek kemikleri ayrık"],
    ["Önce kürek kemiklerini birbirine yaklaştır, sonra kolu karnına çek", "Dirsekler gövdeye yakın, geriye", "Sonda 1 sn sık, kontrollü bırak; çekerken nefes ver"],
    [["Gövdeyle geriye sallanmak", "Gövden dik ve sabit, sadece kollar ve kürekler."], ["Omuzların öne yuvarlanması ve kulaklara kalkması", "Göğüs yukarı, omuzlar aşağı ve geride."], ["Sırtın yuvarlanması", "Kalçadan dik otur, göğsünü öne ver."]],
    "Kolaylaştır: hafif ağırlık veya band pull-apart. Zorlaştır: tek kol, 2 sn bekleme."],
  ["Üst ekstremite", "Kürek kemiği (skapula)", "Protraksiyon", "Horizontal", "Push-up plus (şınavın sonunda kürekleri ayırma)", "Serratus punch (band veya kablo ile yumruk uzatma), duvarda push-up plus",
    "Serratus anterior", "Pectoralis minor", "Yandan",
    "Bu push-up plus. Kürek kemiğinde horizontal düzlemde protraksiyon yaptırır: kürek kemiklerini öne, göğüs kafesinin etrafına doğru taşırız. Ana kas serratus anterior, yani boksör kası. Kürek kemiğini göğüs kafesine yapışık tutar.",
    ["Şınav pozisyonu: eller omuz altında, vücut düz bir tahta", "Kolay versiyon: duvarda veya dizler yerde"],
    ["Kollar düz kalsın, göğsünü yere doğru hafifçe bırak (kürekler yaklaşır)", "Sonra yeri iterek sırtını tavana doğru yuvarla (kürekler ayrılır)", "İterken nefes ver"],
    [["Dirsekleri bükmek", "Kolların düz, hareket sadece kürek kemiklerinden."], ["Belin çökmesi", "Karnını sık, vücudun tahta gibi."], ["Başı düşürmek", "Boynun gövdenle aynı çizgide."]],
    "Kolaylaştır: duvarda veya dizler yerde. Zorlaştır: tam şınav + plus, tek kol serratus punch."],
  ["Üst ekstremite", "Dirsek", "Fleksiyon", "Sagital", "Dumbbell biceps curl", "Barbell curl, hammer curl (brachioradialis), kablo curl",
    "Biceps brachii", "Brachialis, brachioradialis", "Yandan",
    "Bu biceps curl. Dirsek ekleminde sagital düzlemde fleksiyon yaptırır: dirseği bükerek ağırlığı omuza doğru getiririz. Ana kas kolun önündeki iki başlı kas biceps brachii; altındaki brachialis ve ön koldaki brachioradialis yardım eder. Kaldırırken konsantrik, indirirken eksantrik çalışır.",
    ["Ayaklar kalça genişliğinde, dizler hafif bükük", "Dumbbell'lar yanlarda, avuçlar öne bakıyor", "Dirsekler gövdenin yanında, omuzlar aşağıda"],
    ["Dirseği yerinde tutarak ağırlığı omuza doğru kaldır", "Tepede biceps'i sık", "2–3 saniyede kontrollü indir, kol tamamen uzasın; kaldırırken nefes ver"],
    [["Gövdeyle sallanarak kaldırmak", "Gövden sabit, ağırlığı azaltalım."], ["Dirseklerin öne kayması", "Dirsekler gövdenin yanına yapışık."], ["Aşağıda kolu tam uzatmamak", "Aşağıda kolunu tamamen aç."], ["Bileği bükmek", "Bileğin düz, ön kolla tek parça."]],
    "Kolaylaştır: tek kol, oturarak, hafif ağırlık. Zorlaştır: yavaş eksantrik (3–4 sn), tepede bekleme."],
  ["Üst ekstremite", "Dirsek", "Ekstansiyon", "Sagital", "Triceps pushdown (kablo)", "Overhead triceps extension, bench dips, kickback",
    "Triceps brachii", "Anconeus", "Yandan",
    "Bu triceps pushdown. Dirsek ekleminde sagital düzlemde ekstansiyon yaptırır: bükülü dirseği düzleştiririz. Ana kas kolun arkasındaki üç başlı kas triceps brachii.",
    ["Kablonun karşısında dur, ayaklar kalça genişliğinde", "Barı avuçlar aşağı bakacak şekilde tut", "Dirsekler gövdenin yanında, 90° bükük, gövde çok hafif öne"],
    ["Dirsekleri oynatmadan barı uyluklara kadar it", "Altta kolunu tamamen düzleştir, triceps'i sık", "Kontrollü 90°'ye geri gel; iterken nefes ver"],
    [["Dirseklerin öne-arkaya oynaması", "Dirsekler gövdene vidalı gibi sabit."], ["Gövdeyle bastırmak", "Gövden sabit, sadece ön kol hareket etsin."], ["Altta kolu tam açmamak", "Altta kolunu tamamen düzleştir."]],
    "Kolaylaştır: band ile. Zorlaştır: tek kol, yavaş eksantrik."],
  ["Üst ekstremite", "Ön kol (radioulnar eklem)", "Supinasyon / pronasyon", "Horizontal", "Dumbbell ile ön kol çevirme (supinasyon-pronasyon)", "Çekiç veya tek ucu ağır dumbbell ile çevirme",
    "Supinasyon: supinator, biceps brachii · Pronasyon: pronator teres, pronator quadratus", "–", "Önden",
    "Bu ön kol çevirme hareketi. Radioulnar eklemde horizontal düzlemde olur. Avucu yukarı çevirmek supinasyon (çorba kasesi tutar gibi), aşağı çevirmek pronasyon. Supinasyonu supinator ve biceps, pronasyonu pronator teres yapar.",
    ["Otur, ön kolunu uyluğuna koy, el dizin ötesinde boşta", "Hafif dumbbell'ı ortasından değil bir ucundan tut, dirsek 90°"],
    ["Avucunu yavaşça tavana çevir (supinasyon)", "Sonra yere çevir (pronasyon)", "Ön kol uylukta sabit, sadece döner"],
    [["Omuzdan döndürmek", "Dirseğin ve ön kolun uylukta sabit, sadece el döner."], ["Hızlı ve kontrolsüz çevirmek", "Yavaş, 2 saniyede çevir."]],
    "Kolaylaştır: ağırlıksız. Zorlaştır: dumbbell'ı daha uçtan tut (kaldıraç uzar)."],
  ["Üst ekstremite", "El bileği", "Fleksiyon / ekstansiyon", "Sagital", "Wrist curl ve reverse wrist curl", "Bileğe band ile, farmer walk (kavrama)",
    "Fleksiyon: ön kol fleksörleri · Ekstansiyon: ön kol ekstansörleri", "–", "Yandan",
    "Bu wrist curl. El bileğinde sagital düzlemde olur. Avuç yukarıyken bileği bükmek fleksiyon, ön kolun iç yüzündeki fleksörleri çalıştırır. Avuç aşağıyken bileği kaldırmak ekstansiyon (reverse wrist curl), dış yüzdeki ekstansörleri çalıştırır.",
    ["Otur, ön kolları uyluklara koy, bilekler dizin ötesinde", "Hafif dumbbell; avuç yukarı (fleksiyon) veya aşağı (ekstansiyon)"],
    ["Sadece bileği bükerek dumbbell'ı yukarı kaldır", "Yavaş indir", "15–20 tekrar"],
    [["Ön kolu uyluktan kaldırmak", "Ön kolun uylukta sabit, sadece bilek hareket etsin."], ["Ağır yükle yarım hareket", "Hafif yük, tam açıklık."]],
    "Kolaylaştır: ağırlıksız. Zorlaştır: tempo yavaşlat."],
  ["Gövde", "Omurga", "Fleksiyon", "Sagital", "Crunch (mekik)", "Reverse crunch, kablo crunch",
    "Rectus abdominis", "External ve internal oblique", "Yandan",
    "Bu crunch. Omurgada sagital düzlemde fleksiyon yaptırır: göğsü leğene doğru yaklaştırıp gövdeyi büküyoruz. Ana kas düz karın kası rectus abdominis.",
    ["Sırt üstü yat, dizler bükük, ayaklar yerde", "Eller kulakların yanında veya göğüste çapraz", "Belin yere yakın, nötr"],
    ["Karnını sık, göğsünü leğenine doğru yuvarla; kürek kemikleri yerden kalksın", "Tepede 1 sn sık", "Yavaşça geri yat; kalkarken nefes ver"],
    [["Elleriyle başı çekmek", "Ellerin sadece destek; çenenle göğsün arasında bir yumruk boşluk olsun."], ["Tamamen oturuşa kalkmak (kalça fleksörleri devreye giriyor)", "Sadece kürek kemiklerini kaldır, kısa hareket."], ["Hızlı ve momentumla yapmak", "Yavaş, karın sıkılı."]],
    "Kolaylaştır: kollar uzanmış öne. Zorlaştır: kollar baş üstünde, ağırlık plakası göğüste."],
  ["Gövde", "Omurga", "Ekstansiyon", "Sagital", "Back extension (hiperekstansiyon sehpası)", "Yüzüstü superman, bird dog (stabilizasyon)",
    "Erector spinae", "Gluteus maximus, hamstring, multifidus", "Yandan",
    "Bu back extension. Omurgada sagital düzlemde ekstansiyon yaptırır: öne bükülmüş gövdeyi düz hale getiririz. Ana kas omurganın iki yanındaki erector spinae; kalçadan gluteus maximus ve hamstring yardım eder.",
    ["Sehpayı kalça kemiği pedin hemen üstünde kalacak şekilde ayarla", "Ayaklar sabit, kollar göğüste çapraz", "Başlangıçta gövde öne sarkık, sırt düz"],
    ["Gövdeyi bacaklarınla düz bir çizgiye gelene kadar kaldır", "Kalçanı sık", "Kontrollü in; kalkarken nefes ver"],
    [["Yukarıda aşırı geriye bükülmek (bel ağrısı riski)", "Bacaklarınla düz çizgide dur, fazlası yok."], ["Hızlı ve sallanarak yapmak", "Yavaş, kontrollü."], ["Boynu geriye atmak", "Bakışın yere, boynun gövdenle aynı çizgide."]],
    "Kolaylaştır: yerde superman, kısa açıklık. Zorlaştır: göğüste plaka."],
  ["Gövde", "Omurga", "Lateral fleksiyon", "Frontal", "Dumbbell side bend (yana eğilme)", "Kablo side bend, side plank (izometrik)",
    "Quadratus lumborum, external ve internal oblique", "Erector spinae, rectus abdominis", "Önden",
    "Bu side bend. Omurgada frontal düzlemde lateral fleksiyon yaptırır: gövdeyi yana eğeriz. Ana kaslar karşı taraftaki oblikler ve quadratus lumborum.",
    ["Ayaklar kalça genişliğinde, tek elde dumbbell", "Diğer el başın arkasında veya belde", "Göğüs dik"],
    ["Dumbbell tarafına doğru yavaşça yana eğil", "Karşı taraftaki kasları kullanarak dik konuma geri gel", "Gelirken nefes ver; iki tarafı da çalış"],
    [["Öne veya arkaya eğilmek", "Sadece yana, iki duvar arasında sıkışmış gibi."], ["Kalçayı yana kaydırmak", "Kalçan sabit, hareket bel ve gövdeden."], ["Çok ağır yük", "Hafif yük, kontrollü hareket."]],
    "Kolaylaştır: ağırlıksız. Zorlaştır: side plank'ta kalça indir-kaldır."],
  ["Gövde", "Omurga", "Rotasyon", "Horizontal", "Kablo wood chop (odun kesme)", "Russian twist, band ile rotasyon, Pallof press (anti-rotasyon)",
    "External oblique (karşı taraf), internal oblique (aynı taraf)", "Rectus abdominis, erector spinae", "Önden",
    "Bu wood chop. Omurgada horizontal düzlemde rotasyon yaptırır: gövdeyi kendi ekseni etrafında döndürürüz. Ana kaslar oblikler: dış oblik karşı tarafa, iç oblik aynı tarafa döndürür.",
    ["Kablonun yanında dur, ayaklar omuz genişliğinde, dizler hafif bükük", "Kolu iki elle tut, kollar uzanmış", "Karın sıkı"],
    ["Kolu çapraz şekilde, gövdeni döndürerek karşı tarafa çek", "Ayaklar yere basıyor, arka ayak hafif dönebilir", "Kontrollü geri dön; çekerken nefes ver"],
    [["Sadece kollarla çekmek", "Gücü gövdeden ver, göğsün kolu takip etsin."], ["Belden aşırı bükülmek", "Omurga uzun, dönme göğüs kafesinden."], ["Hızlı ve kontrolsüz dönmek", "Yavaş ve kontrollü."]],
    "Kolaylaştır: band ile, kısa açıklık. Zorlaştır: tek diz yerde (yarım diz çökme) pozisyonu."],
  ["Alt ekstremite", "Kalça", "Fleksiyon", "Sagital", "Sırt üstü leg raise (bacak kaldırma)", "Ayakta knee raise, asılı diz çekiş, yürüyüşte high knees",
    "Iliopsoas", "Rectus femoris, TFL, sartorius", "Yandan",
    "Bu leg raise. Kalça ekleminde sagital düzlemde fleksiyon yaptırır: bacağı öne-yukarı kaldırırız, dizi göğse yaklaştırır gibi. Ana kas derindeki kalça fleksörü iliopsoas, yardımcı rectus femoris.",
    ["Sırt üstü yat, eller kalçanın yanında veya altında", "Belini yere bastır, karın sıkı", "Bacaklar düz veya dizler hafif bükük"],
    ["Bacakları belini yerden kaldırmadan yukarı kaldır", "Yavaşça indir, yere değmeden dur", "Kaldırırken nefes ver"],
    [["Belin yerden kalkıp çukurlaşması", "Belini yere yapıştır; gerekirse dizleri bük."], ["Bacakları hızla düşürmek", "3 saniyede indir, frenle."], ["Başı ve omuzları kaldırmak", "Başın yerde, boyun rahat."]],
    "Kolaylaştır: dizler bükük, tek bacak. Zorlaştır: düz bacak, asılı leg raise."],
  ["Alt ekstremite", "Kalça", "Ekstansiyon", "Sagital", "Glute bridge (kalça köprüsü)", "Hip thrust, donkey kick, Romanian deadlift (RDL)",
    "Gluteus maximus", "Hamstring, adductor magnus", "Yandan",
    "Bu glute bridge. Kalça ekleminde sagital düzlemde ekstansiyon yaptırır: bükülü kalçayı açarak kalçayı yukarı kaldırırız. Ana kas vücudun en büyük kası gluteus maximus; arka uyluk hamstring yardım eder.",
    ["Sırt üstü yat, dizler bükük, ayaklar kalça genişliğinde yerde", "Topuklar kalçaya bir karış mesafede", "Kollar yanda, karın sıkı"],
    ["Topuklarından iterek kalçanı yukarı kaldır; omuz-kalça-diz düz çizgi", "Tepede kalçanı 1–2 sn sık", "Yavaş indir; kaldırırken nefes ver"],
    [["Belden aşırı kavis yapmak (hareket belden geliyor)", "Kaburgalar aşağı, kalçanı sıkarak kalk; düz çizgide dur."], ["Dizlerin içe kapanması", "Dizlerini dışa it."], ["Ayak uçlarından itmek", "Topuklarından it."]],
    "Kolaylaştır: kısa açıklık. Zorlaştır: tek bacak, hip thrust (sırt bench'te, barla)."],
  ["Alt ekstremite", "Kalça", "Abduksiyon", "Frontal", "Yan yatarak bacak kaldırma (side-lying leg raise)", "Hip abduction makinesi, band ile yan adım (band walk), clamshell",
    "Gluteus medius", "Gluteus minimus, TFL", "Önden veya arkadan",
    "Bu side-lying leg raise. Kalça ekleminde frontal düzlemde abduksiyon yaptırır: bacağı yana, orta hattan uzaklaştırırız. Ana kas kalçanın yanındaki gluteus medius. Tek ayakta durunca leğeni dengeler; zayıfsa squat'ta diz içe kaçar.",
    ["Yan yat, alttaki bacak hafif bükük, üstteki düz", "Kalçalar üst üste, gövde ve bacak düz çizgi", "Üst ayak ucu öne veya hafif aşağı bakıyor"],
    ["Üst bacağı düz şekilde yukarı, yaklaşık 30–45° kaldır", "Topuk hafif önde yol göstersin", "Yavaş indir; kaldırırken nefes ver"],
    [["Bacağı öne getirmek (kalça fleksörleri devreye giriyor)", "Bacağın gövdenle aynı çizgide, hafif geride."], ["Kalçanın arkaya yuvarlanması", "Üst kalçan öne baksın, devrilme."], ["Ayak ucunu tavana çevirmek", "Ayak ucun öne baksın."]],
    "Kolaylaştır: kısa açıklık. Zorlaştır: diz üstüne band, tepede 2 sn bekleme."],
  ["Alt ekstremite", "Kalça", "Adduksiyon", "Frontal", "Hip adduction makinesi", "Yan yatarak alt bacağı kaldırma, Copenhagen plank, sumo squat",
    "Adduktorlar (adductor magnus, longus, brevis, gracilis)", "Pectineus", "Önden",
    "Bu hip adduction makinesi. Kalça ekleminde frontal düzlemde adduksiyon yaptırır: yana açık bacakları orta hatta doğru kapatırız. Ana kaslar uyluğun iç yanındaki adduktorlar.",
    ["Makineye otur, pedler dizlerin iç tarafında", "Açıklığı rahat gerilme hissedeceğin yere ayarla", "Sırt dik, tutamaçları tut"],
    ["Bacaklarını birbirine doğru kapat", "Ortada 1 sn sık", "Yavaşça aç; kapatırken nefes ver"],
    [["Ağırlığı hızla bırakmak", "Açarken frenle, 2–3 saniye."], ["Gövdeyle öne eğilmek", "Sırtın dik, gövde sabit."], ["Aşırı açıklıktan başlamak", "Rahat gerilme noktasından başla."]],
    "Kolaylaştır: hafif ağırlık, kısa açıklık. Zorlaştır: yavaş eksantrik."],
  ["Alt ekstremite", "Kalça", "Dış rotasyon", "Horizontal", "Clamshell (istiridye)", "Ayakta band ile dış rotasyon",
    "Derin dış rotatörler (piriformis vb.), gluteus maximus", "Gluteus medius (arka lifler), sartorius", "Önden",
    "Bu clamshell. Kalça ekleminde horizontal düzlemde dış rotasyon yaptırır: ayaklar birlikteyken üstteki dizi istiridye kabuğu gibi açarız. Ana kaslar derin dış rotatörler ve gluteus maximus, yardımcı gluteus medius.",
    ["Yan yat, kalça ve dizler yaklaşık 45° bükük", "Ayaklar üst üste, baş kolun üstünde", "Kalçalar üst üste, karın sıkı"],
    ["Ayaklar ayrılmadan üst dizi tavana doğru aç", "Kalçanı geriye devirme", "Yavaş kapat; açarken nefes ver"],
    [["Kalçanın arkaya devrilmesi", "Üst kalçan öne doğru, sadece diz açılsın."], ["Ayakların ayrılması", "Ayakların birbirine yapışık."], ["Hızlı yapmak", "Yavaş, tepede 1 sn bekle."]],
    "Kolaylaştır: kısa açıklık. Zorlaştır: diz üstüne mini band."],
  ["Alt ekstremite", "Kalça", "İç rotasyon", "Horizontal", "Oturarak band ile kalça iç rotasyonu", "Yan yatarak ters clamshell (ayağı kaldırma)",
    "Gluteus medius ve minimus (ön lifler), TFL", "Adductor magnus", "Önden",
    "Bu oturarak kalça iç rotasyonu. Kalça ekleminde horizontal düzlemde iç rotasyon yaptırır: diz sabitken ayağı dışarı açarak uyluğu içe çeviririz. Ana kaslar gluteus medius ve minimusun ön lifleri ve TFL.",
    ["Sandalyeye dik otur, dizler 90°", "Bandı ayak bileğine tak, diğer ucu dış tarafta sabit", "Dizler kalça genişliğinde ve yerinde"],
    ["Dizini oynatmadan ayağını dışarı doğru götür", "Yavaşça geri getir", "12–15 tekrar"],
    [["Dizin yerinden kayması", "Dizin yerinde, sadece alt bacak açılır."], ["Gövdeyi yana eğmek", "Gövden dik ve sabit."]],
    "Kolaylaştır: bandsız. Zorlaştır: daha güçlü band."],
  ["Alt ekstremite", "Diz", "Fleksiyon", "Sagital", "Leg curl (yatarak veya oturarak makine)", "Band ile leg curl, top üstünde hamstring curl",
    "Hamstring (biceps femoris, semitendinosus, semimembranosus)", "Gastrocnemius, sartorius, gracilis", "Yandan",
    "Bu leg curl. Diz ekleminde sagital düzlemde fleksiyon yaptırır: topuğu kalçaya doğru getiririz. Ana kaslar arka uyluk hamstring kasları. Dikkat: diz fleksiyonunda topuk geriye gider ama bu yine fleksiyondur.",
    ["Makineye yüzüstü yat, diz kapağı pedin hemen dışında, eklem makinenin dönme ekseniyle hizalı", "Ped aşil tendonunun hemen üstünde", "Kalça pede basık, tutamaçları tut"],
    ["Topukları kalçaya doğru çek", "Tepede 1 sn sık", "2–3 sn'de kontrollü indir; çekerken nefes ver"],
    [["Kalçanın pedden kalkması", "Kalçanı pede bastır, karnını sık."], ["Ağırlığı hızla bırakmak", "İnerken frenle."], ["Dizi makine ekseniyle hizalamamak", "Diz eklemi makinenin dönme noktasıyla aynı hizada."]],
    "Kolaylaştır: tek bacak hafif yük. Zorlaştır: yavaş eksantrik, tek bacak."],
  ["Alt ekstremite", "Diz", "Ekstansiyon", "Sagital", "Leg extension (makine)", "Band ile diz ekstansiyonu; squat ve lunge (kalça + diz ekstansiyonu)",
    "Quadriceps (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius)", "–", "Yandan",
    "Bu leg extension. Diz ekleminde sagital düzlemde ekstansiyon yaptırır: bükülü dizi düzleştiririz, topa tekme atar gibi. Ana kas uyluğun önündeki dört başlı quadriceps.",
    ["Makineye otur, sırt destekte, diz eklemi makinenin dönme ekseniyle hizalı", "Ped ayak bileğinin hemen üstünde", "Tutamaçları tut, kalça koltukta"],
    ["Dizlerini düzleştirerek pedi yukarı kaldır", "Tepede uyluğunu 1 sn sık", "Kontrollü indir; kaldırırken nefes ver"],
    [["Kalçanın koltuktan kalkması", "Tutamaçları çek, kalçan koltukta."], ["Ağırlığı hızla düşürmek", "İnerken 2–3 sn frenle."], ["Tepede dizi sertçe kilitlemek", "Yumuşak düzleş, kilitleme."]],
    "Kolaylaştır: tek bacak, hafif yük, kısa açıklık. Zorlaştır: tepede 2 sn bekleme."],
  ["Alt ekstremite", "Ayak bileği", "Plantar fleksiyon", "Sagital", "Ayakta calf raise (parmak ucuna kalkma)", "Oturarak calf raise (soleus), leg press'te calf raise",
    "Gastrocnemius, soleus", "Peroneuslar, tibialis posterior", "Yandan",
    "Bu calf raise. Ayak bileğinde sagital düzlemde plantar fleksiyon yaptırır: parmak ucuna kalkarız. Ana kaslar baldırdaki gastrocnemius ve soleus. Diz bükükken (oturarak) iş daha çok soleus'a kalır.",
    ["Basamağın kenarına ayak ucuyla bas, topuklar boşta", "Duvara veya tutamağa hafif tutun", "Dizler düz ama kilitli değil"],
    ["Parmak uçlarına olabildiğince yüksel", "Tepede 1 sn bekle", "Topukları basamak hizasının altına kontrollü indir; kalkarken nefes ver"],
    [["Zıplayarak, hızlı yapmak", "Yavaş: 1 sn çık, 1 sn bekle, 2 sn in."], ["Ayak bileğinin dışa kayması", "Ağırlık başparmak ve ikinci parmak üzerinde."], ["Yarım açıklık", "Tam yüksel, tam in."]],
    "Kolaylaştır: düz zeminde, iki ayak. Zorlaştır: tek ayak, elde dumbbell."],
  ["Alt ekstremite", "Ayak bileği", "Dorsi fleksiyon", "Sagital", "Toe raise (ayak ucunu kaldırma) / topuk yürüyüşü", "Band ile dorsi fleksiyon (otururken)",
    "Tibialis anterior", "Ayak parmak ekstansörleri", "Yandan",
    "Bu toe raise. Ayak bileğinde sagital düzlemde dorsi fleksiyon yaptırır: topuklar yerdeyken ayak uçlarını yukarı kaldırırız. Ana kas kaval kemiğinin önündeki tibialis anterior.",
    ["Sırtını duvara yasla, topuklar duvardan bir ayak mesafede", "Dizler düz, ağırlık topuklarda"],
    ["Ayak uçlarını olabildiğince yukarı kaldır", "Yavaşça indir, yere değmeden tekrar kaldır", "15–20 tekrar"],
    [["Kalçayı geriye itmek", "Sırtın ve kalçan duvarda."], ["Hızlı ve yarım yapmak", "Tam yukarı, yavaş in."]],
    "Kolaylaştır: oturarak. Zorlaştır: topuk yürüyüşü, band."],
  ["Alt ekstremite", "Ayak bileği", "İnversiyon / eversiyon", "Frontal", "Band ile inversiyon ve eversiyon (otururken)", "Denge tahtasında çalışma",
    "İnversiyon: tibialis anterior ve posterior · Eversiyon: peroneuslar", "–", "Önden",
    "Bu band ile ayak bileği hareketi. Ayak bileğinde frontal düzlemde olur. Tabanı içe çevirmek inversiyon (tibialis anterior ve posterior), dışa çevirmek eversiyon (peroneuslar). Ayak bileği burkulmasından korunmak için yapılır.",
    ["Yere otur, bacak uzanmış, topuk yerde", "Bandı ayağın ön kısmına tak, diğer ucu yanda sabit"],
    ["Bacağı döndürmeden sadece tabanı içe (inversiyon) veya dışa (eversiyon) çevir", "Yavaş geri dön", "15 tekrar, iki yön"],
    [["Bacağı kalçadan döndürmek", "Diz kapağın tavana baksın, sadece ayak döner."], ["Hızlı yapmak", "Yavaş ve kontrollü."]],
    "Kolaylaştır: bandsız. Zorlaştır: güçlü band, denge tahtası."],
  ["Çok eklemli (bonus)", "Kalça + diz + ayak bileği", "Ekstansiyon (kalkış)", "Sagital", "Goblet squat", "Bodyweight squat, back squat, leg press",
    "Quadriceps, gluteus maximus", "Hamstring, adduktorlar, soleus; stabilizatör: erector spinae, core, gluteus medius", "Yandan (diz takibi için önden de)",
    "Bu goblet squat. Kalça ve dizde sagital düzlemde fleksiyonla inip ekstansiyonla kalkarız; ayak bileği iniş sırasında dorsi fleksiyona gider. Ana kaslar quadriceps ve gluteus maximus. İnişte eksantrik, kalkışta konsantrik çalışırlar. Merdiven çıkmak, sandalyeden kalkmak gibi günlük hareketleri kolaylaştırır.",
    ["Ayaklar omuz genişliğinde, ayak uçları hafif dışa", "Dumbbell'ı göğsünün önünde dikey tut, dirsekler aşağı", "Göğüs dik, karın sıkı"],
    ["Kalçanı geriye gönder ve sandalyeye oturur gibi in", "Uyluklar yere paralele kadar ya da tekniğin bozulmadığı yere kadar", "Topuklarından iterek kalk; kalkarken nefes ver"],
    [["Dizlerin içe çökmesi (valgus)", "Dizlerini dışa it, ayak uçlarını takip etsin."], ["Topukların kalkması", "Ağırlık topuklarda, ayak tabanının tamamı yerde."], ["Sırtın yuvarlanması, göğsün düşmesi", "Göğüs yukarı, dumbbell'ı göğsüne yapıştır."], ["Kalçanın önce kalkması", "Göğüs ve kalça aynı anda kalksın."]],
    "Kolaylaştır: sandalyeye otur-kalk (box squat). Zorlaştır: daha ağır yük, yavaş eksantrik."],
  ["Çok eklemli (bonus)", "Kalça", "Abduksiyon / adduksiyon", "Frontal", "Lateral (side) lunge", "Band walk, sumo squat",
    "Adduktorlar, gluteus medius; çalışan bacakta quadriceps ve gluteus maximus", "Hamstring", "Önden",
    "Bu side lunge. Yana adım atarken kalça frontal düzlemde abduksiyona gider; geri dönerken adduktorlar bacağı içeri çeker. Çalışan bacakta diz ve kalça bükülür. Frontal düzlemi göstermek için en iyi çok eklemli hareket.",
    ["Ayaklar bitişik, ayakta dik dur", "Eller göğüs önünde"],
    ["Bir bacakla geniş bir adım yana at", "Adım attığın bacağın kalçasını geri gönderip dizini bük, diğer bacak düz", "Topuktan iterek başlangıca dön; dönerken nefes ver"],
    [["Dizin ayak ucunu geçip içe kaçması", "Dizin ayak ucun yönünde, ikinci parmağın üstünde."], ["Gövdenin fazla öne düşmesi", "Göğüs dik, kalça geride."], ["Topuğun kalkması", "Tüm taban yerde."]],
    "Kolaylaştır: kısa adım, sığ iniş. Zorlaştır: elde dumbbell (goblet)."]
];

const UYB = ["Üst ekstremite", "Gövde", "Alt ekstremite", "Çok eklemli (bonus)"];
/* hocanın sorabileceği farklı cümle kalıpları */
function uySoru(x) {
  const b = x[0].startsWith("Çok") ? "Alt ekstremitede" : x[0] === "Gövde" ? "Gövdede" : x[0] + "de";
  const ek = x[1].replace(/ \(.*\)$/, "");
  const h = x[2].toLocaleLowerCase("tr");
  const T = [
    `${b} ${ek.toLocaleLowerCase("tr")} eklemine ${x[3].toLocaleLowerCase("tr")} düzlemde ${h} yaptıran bir hareket söyle ve üyeye yaptır.`,
    `${ek}: ${x[3].toLocaleLowerCase("tr")} düzlemde ${h}. Bunu hangi egzersizle çalıştırırsın? Anlat, göster, uygulat.`,
    `Üyene ${ek.toLocaleLowerCase("tr")} için ${h} hareketini öğret. Hangi düzlemde, hangi kas çalışıyor?`
  ];
  return T[Math.floor(Math.random() * T.length)];
}
function uyCard(x, open = false) {
  return `<details class="card uyc" ${open ? "open" : ""}><summary><div class="row between" style="gap:8px"><div><span class="small muted">${esc(x[0])} · ${esc(x[1])}</span><div class="uyh"><b>${esc(x[2])}</b> ${plChip(x[3])}</div><div>→ <b>${esc(x[4])}</b></div></div><span class="pill acc">${esc(x[6].split(/[,·(]/)[0].trim())}</span></div></summary>
    <div class="stack" style="margin-top:12px">
      <dl class="andl"><dt>Eklem</dt><dd>${esc(x[1])}</dd><dt>Hareket</dt><dd>${esc(x[2])}</dd><dt>Düzlem</dt><dd>${plChip(x[3])}</dd><dt>Agonist</dt><dd><b>${esc(x[6])}</b></dd><dt>Yardımcı</dt><dd>${esc(x[7])}</dd><dt>Alternatif</dt><dd>${esc(x[5])}</dd></dl>
      <div class="uystep"><span class="uyn">1</span><div><b>ANLAT</b> <span class="small muted">(işitsel: adı, eklem, düzlem, kas, neden)</span><p class="uyq">"${esc(x[9])}"</p></div></div>
      <div class="uystep"><span class="uyn">2</span><div><b>GÖSTER</b> <span class="small muted">(görsel)</span><p>Üyeyi <b>${esc(x[8].toLocaleLowerCase("tr"))}</b> görebileceği yere al. Konuşmadan, gerçek tempoda 2–3 tekrar yap. "Şimdi bir izle" de, sonra göster.</p></div></div>
      <div class="uystep"><span class="uyn">3</span><div><b>UYGULAT</b> <span class="small muted">(kinestetik: hafif yük, 5–8 tekrar)</span><p><b>Başlangıç pozisyonu:</b></p><ul>${x[10].map(c => `<li>${esc(c)}</li>`).join("")}</ul><p><b>Hareket:</b></p><ul>${x[11].map(c => `<li>${esc(c)}</li>`).join("")}</ul><p class="small">Sonra sor: "Nerede hissettin?" (Doğru cevap: ${esc(x[6].split(/[·(]/)[0].trim())}.)</p></div></div>
      <div class="uystep"><span class="uyn">4</span><div><b>GERİ BİLDİRİM / DÜZELT</b> <span class="small muted">(tek seferde tek düzeltme, olumlu dil)</span>
        <div class="tw"><table><thead><tr><th>Görürsen (hata)</th><th>De ki (düzeltme)</th></tr></thead><tbody>${x[12].map(h => `<tr><td>${esc(h[0])}</td><td><b>"${esc(h[1])}"</b></td></tr>`).join("")}</tbody></table></div>
        <p class="small">Önce olumlu bir şey söyle, sonra tek düzeltme, sonra cesaretlendir: <i>"Güzel, gövden çok sabit. Bir sonrakinde ${esc(x[12][0][1].replace(/\.$/, "").toLocaleLowerCase("tr"))}. Harika gidiyorsun."</i></p></div></div>
      <p class="small"><b>Modifikasyon:</b> ${esc(x[13])}</p>
    </div></details>`;
}

ROUTES.uygulama = async (r, main) => {
  const sub = r.split("-")[1] || "";
  const tabs = segNav([["uygulama", "Sınav formatı"], ["uygulama-kart", "Hareket kartları"], ["uygulama-hoca", "Hoca soruyor (pratik)"]], r);
  const head = (t, d) => `<div class="uhead"><span class="eyebrow">Uygulamalı sınav</span><h1>${t}</h1><p class="muted">${d}</p></div>${tabs}`;
  if (sub === "kart") {
    let b = "";
    const pg = page(main, `<div class="stack">${head("Eklem eklem hareket kartları", `${UY.length} soru tipi. Her kartta egzersiz, kaslar ve Anlat → Göster → Uygulat → Düzelt metni. Karta dokun, açılsın.`)}
      <div class="chipsel" id="ub"><button data-b="" aria-pressed="true">Hepsi</button>${UYB.map(x => `<button data-b="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join("")}</div>
      <input type="search" id="uq" placeholder="Ara: ör. abduksiyon, frontal, lat, diz">
      <div class="stack" id="ul"></div></div>`);
    const draw = () => { const q = fold($("#uq").value.trim()); const l = UY.filter(x => (!b || x[0] === b) && (!q || fold(x.slice(0, 8).join(" ")).includes(q))); $("#ul").innerHTML = l.map(x => uyCard(x)).join("") || '<div class="empty">Bulunamadı.</div>'; };
    $$("#ub button").forEach(x => x.onclick = () => { b = x.dataset.b; $$("#ub button").forEach(y => y.setAttribute("aria-pressed", y === x)); draw(); });
    $("#uq").oninput = draw; draw(); return;
  }
  if (sub === "hoca") {
    let bolge = "", cur = null, t0 = 0, tm = null;
    page(main, `<div class="stack">${head("Hoca soruyor: pratik yap", "Rastgele bir soru gelir. Süreyi başlat, sesli olarak cevabını ver (mümkünse bir arkadaşın ya da aynanın karşısında), sonra cevabı aç ve karşılaştır.")}
      <div class="chipsel" id="hb"><button data-b="" aria-pressed="true">Hepsi</button>${UYB.map(x => `<button data-b="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join("")}</div>
      <div class="card stack uyhoca"><div class="row between"><span class="eyebrow">Hoca</span><span class="big num" id="ht">0:00</span></div><p class="uyask" id="hq"></p>
        <div class="row"><button class="btn" id="ha">Cevabı göster</button><button class="btn ghost" id="hn">Yeni soru</button></div>
        <p class="small muted">Cevabında 5 şey olmalı: <b>1)</b> egzersizin adı, <b>2)</b> eklem + hareket + düzlem + ana kas, <b>3)</b> gösterim, <b>4)</b> başlangıç pozisyonu ve 2–3 komut, <b>5)</b> en az bir hatayı yakalayıp düzeltme.</p></div>
      <div id="hc"></div></div>`);
    const tick = () => { const s = Math.floor((Date.now() - t0) / 1000); const el = $("#ht"); if (!el) { clearInterval(tm); return; } el.textContent = `${Math.floor(s / 60)}:${pad2(s % 60)}`; };
    const next = () => { const l = UY.filter(x => !bolge || x[0] === bolge); let n; do { n = l[Math.floor(Math.random() * l.length)]; } while (l.length > 1 && n === cur); cur = n; $("#hq").textContent = uySoru(cur); $("#hc").innerHTML = ""; t0 = Date.now(); clearInterval(tm); tm = setInterval(tick, 1000); tick(); };
    $("#ha").onclick = () => { clearInterval(tm); $("#hc").innerHTML = uyCard(cur, true); $("#hc").scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("#hn").onclick = next;
    $$("#hb button").forEach(x => x.onclick = () => { bolge = x.dataset.b; $$("#hb button").forEach(y => y.setAttribute("aria-pressed", y === x)); next(); });
    leaveHook = () => clearInterval(tm);
    next(); return;
  }
  const ex = UY[0];
  const rows = UYB.map(b => UY.filter(x => x[0] === b).map(x => `<tr><td class="small muted">${esc(b === "Çok eklemli (bonus)" ? "Bonus" : b)}</td><td><b>${esc(x[1].replace(/ \(.*\)$/, ""))}</b></td><td>${esc(x[2])}</td><td>${plChip(x[3])}</td><td>${esc(x[4])}</td><td class="small">${esc(x[6])}</td></tr>`).join("")).join("");
  page(main, `<div class="stack">${head("Uygulamalı sınav: hareketi öğret", "Hoca bir eklem, düzlem ve hareket söyler; sen o hareketi yaptıran egzersizi bulur, üyeye anlatır, gösterir, uygulatır ve düzeltirsin.")}
    <section class="card stack"><h2>Soru nasıl gelir, nasıl çözülür?</h2>
      <div class="callout"><b>Örnek soru:</b> "Üst ekstremitede omuza sagital düzlemde fleksiyon yaptıran hareket nedir? Üyeye yaptır."</div>
      <ol class="steps"><li><b>Soruyu parçala:</b> Eklem = omuz. Düzlem = sagital (öne-arkaya). Hareket = fleksiyon (kolu öne kaldırmak).</li>
        <li><b>Egzersizi bul:</b> Kolu öne kaldıran egzersiz = <b>front raise</b>. Ana kas = <b>ön deltoid</b>. (Takılırsan: <a href="#uygulama-kart">kartlar</a> ya da aşağıdaki tablo.)</li>
        <li><b>Hocaya cevabı söyle:</b> "Omuz fleksiyonu için dumbbell front raise yaptıracağım. Sagital düzlemde, agonist ön deltoid."</li>
        <li><b>Üyeye 4 adımı uygula:</b> Anlat → Göster → Uygulat → Geri bildirim (manuel s. 76–77, 137).</li></ol></section>
    <section class="card stack"><h2>4 adım: manuelin altın sıralaması</h2>
      <div class="g2">
        <div class="uystep"><span class="uyn">1</span><div><b>ANLAT</b> (işitsel)<p class="small">Hareketin adı, hangi eklem, hangi düzlem, hangi kas, neden yapıyoruz, 1–2 kilit nokta. Kısa ve basit dil.</p></div></div>
        <div class="uystep"><span class="uyn">2</span><div><b>GÖSTER</b> (görsel)<p class="small">Üyeyi doğru açıya al: squat, row, curl gibi sagital hareketlerde <b>yandan</b>; lateral raise, lunge gibi frontal hareketlerde <b>önden</b>. Gösterirken konuşma. Doğru tempoda 2–3 tekrar.</p></div></div>
        <div class="uystep"><span class="uyn">3</span><div><b>UYGULAT</b> (kinestetik)<p class="small">Hafif yükle ya da yüksüz, 5–8 tekrar. Önce başlangıç pozisyonunu kur, sonra 2–3 kısa komut ver. "Nerede hissettin?" diye sor.</p></div></div>
        <div class="uystep"><span class="uyn">4</span><div><b>GERİ BİLDİRİM</b> (en önemli adım)<p class="small">Manuel: "Geri bildirim olmazsa öğrenme gerçekleşmez." Tek seferde tek düzeltme, olumlu dil ("dizlerini dışa it", "içe çökertme" değil), gerekirse tekrar göster.</p></div></div>
      </div></section>
    <section class="card stack"><h2>Örnek: baştan sona sınav konuşması</h2>
      <div class="uydia">
        <p><span class="pill">Hoca</span> Üst ekstremitede omuza sagital düzlemde fleksiyon yaptıran hareket nedir, yaptır.</p>
        <p><span class="pill acc">Sen → hoca</span> Omuz fleksiyonu için dumbbell front raise yaptıracağım. Sagital düzlemde bir hareket, agonist kas ön deltoid; pectoralis majorun üst lifleri ve biceps yardım ediyor.</p>
        <p><span class="pill ok">Sen → üye</span> Merhaba, bugün front raise öğreneceğiz. ${esc(ex[9].replace(/^Bu hareketin adı front raise\. /, ""))}</p>
        <p><span class="pill ok">Sen → üye</span> Şimdi önce ben yapayım, yandan izle. <i>(Üyeyi yana al, konuşmadan 2–3 tekrar göster.)</i></p>
        <p><span class="pill ok">Sen → üye</span> Şimdi sen dene. ${esc(ex[10].join(". "))}. ${esc(ex[11].join(". "))}. 6 tekrar yapalım.</p>
        <p><span class="pill ok">Sen → üye</span> <i>(Üye gövdeyle sallanıyor.)</i> Güzel, kolların çok düzgün kalkıyor. Bir sonrakinde gövden sabit kalsın, sadece kolların hareket etsin. ... İşte bu, harika! Nerede hissettin? <i>(Omzumun önünde.)</i> Evet, tam orayı çalıştırıyoruz.</p>
      </div>
      <p class="small muted">Jüri genelde şunlara bakar: doğru egzersiz seçimi, eklem-düzlem-kas bilgisi, gösterim açısı, net ve kısa komutlar, hatayı görüp düzeltme, güvenlik (ısınma ve yük seçimi), üyeyle iletişim (göz teması, isimle hitap, cesaretlendirme).</p></section>
    <section class="grid2" style="align-items:start">
      <div class="card stack"><h2>Altın kurallar</h2><ul>
        <li><b>Hareketin adını eklemle söyle:</b> "fleksiyon" değil, "omuz fleksiyonu".</li>
        <li><b>Güvenlik önce:</b> Başlamadan "Bir ağrın ya da sakatlığın var mı?" diye sor. İlk denemede hafif yük.</li>
        <li><b>Komutlar 2–4 kelime:</b> "Göğüs yukarı", "dirsekler sabit", "topuklardan it".</li>
        <li><b>Dışsal odak:</b> "Kalça ekstansiyonunu tamamla" değil, "yeri it ve kalk".</li>
        <li><b>Olumlu dil:</b> Ne yapmaması gerektiğini değil, ne yapması gerektiğini söyle.</li>
        <li><b>Nefes:</b> Zorlanırken (konsantrik faz) nefes ver, dönüşte (eksantrik) al.</li>
        <li><b>Dokunsal ipucu:</b> Kasa dokunmadan önce izin al: "Omzuna dokunabilir miyim?"</li>
        <li><b>Tempo:</b> 1–2 sn kaldır, 2–3 sn indir.</li></ul></div>
      <div class="card stack"><h2>Düzleme göre hızlı hatırlatma</h2>
        <p>${plChip("Sagital")} öne-arkaya: fleksiyon, ekstansiyon, dorsi/plantar fleksiyon. <b>Göster: yandan.</b></p>
        <p>${plChip("Frontal")} yana: abduksiyon, adduksiyon, lateral fleksiyon, elevasyon/depresyon, inversiyon/eversiyon. <b>Göster: önden.</b></p>
        <p>${plChip("Horizontal")} dönme: iç/dış rotasyon, supinasyon/pronasyon, yatay add./abd., retraksiyon/protraksiyon. <b>Göster: önden veya üstten açıyla.</b></p>
        <p class="small">Düzlemleri animasyonla görmek için: <a href="#anatomi-yon">Anatomi kampı → Yön ve düzlem</a>.</p></div></section>
    <section class="card stack"><h2>Tüm soru tipleri: tek tablo</h2><p class="small muted">Sınavdan önce bu tabloyu ezberle. Ayrıntı ve konuşma metni için <a href="#uygulama-kart">hareket kartları</a>.</p>
      <div class="tw"><table><thead><tr><th>Bölge</th><th>Eklem</th><th>Hareket</th><th>Düzlem</th><th>Egzersiz</th><th>Ana kas</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row"><a class="btn" href="#uygulama-hoca">Pratik yap: hoca soruyor →</a><button class="btn ghost" onclick="window.print()">Tabloyu yazdır</button></div></section></div>`);
};

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
