/* Giraffa Studio — CRM v3 (ruoli: admin · professionista · pr · cliente) */













(function () {
"use strict";

var cfg = window.GS_CONFIG || {};
var sb = null, user = null;
var me = { pro_id: null, cliente_id: null, ruolo: "", nome: "", email: "", perm: { spazi: false, studio: false, accessi: false } };
var D = { pros: [], serv: [], cli: [], com: [], righe: [], spazi: [], task: [], ore: [], mov: [], inter: [], pren: [], membri: [], fasi: [], mat: [], pag: [], appr: [], vari: [], ev: [], comm: [], tmr: [], prog: [], lav: [], priv: [], dip: [], viste: [], modelli: [] };
var CAL = 0;
var PLINK = null;
var SET = { fee_default: 12 };
var TB = { pros: "professionisti", serv: "servizi", cli: "clienti", com: "commesse", righe: "righe", spazi: "spazi", task: "task", ore: "ore", mov: "movimenti", inter: "interazioni", pren: "prenotazioni", membri: "membri", fasi: "fasi", mat: "materiali", pag: "pagamenti", appr: "approvazioni", vari: "varianti", ev: "eventi", comm: "commenti", tmr: "timer", prog: "progetti", lav: "lavorazioni", port: "portali", forn: "fornitori", priv: "pro_privato", dip: "task_dip", viste: "viste", modelli: "modelli" };

var view = "dash", current = null, tab = "", persp = "all", search = "";
var PORT = [], STATS = null;
var EXP = {}, VISTA = "tabella", FSTATO = "", FSAL = "", DRAG = null;
var PAL = [], PALR = [], PALI = 0;
var WEEK = 0, NOTEDIT = false, NOTET = null, TICK = null, TSEXTRA = [];

/* ---------------- helpers ---------------- */
function el(s) { return document.querySelector(s); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function eur(n) { return "€ " + Math.round(+n || 0).toLocaleString("it-IT"); }
function num(n, d) { var v = +n || 0; return v.toLocaleString("it-IT", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function dt(s) { if (!s) return "—"; var d = new Date(s); return isNaN(d) ? "—" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }); }
function dshort(s) { if (!s) return "—"; var d = new Date(s); return isNaN(d) ? "—" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }); }
function iso(d) { return d.toISOString().slice(0, 10); }
function today() { return iso(new Date()); }
function days(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }
function by(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
function nameOf(arr, id, f) { var o = by(arr, id); return o ? o[f || "nome"] : "—"; }
function sum(arr, f) { var t = 0; arr.forEach(function (x) { t += (+f(x) || 0); }); return t; }
function toast(msg, isErr) { var t = document.createElement("div"); t.className = "toast" + (isErr ? " err" : ""); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800); }
function show(id) { ["setup", "login", "app", "splash"].forEach(function (x) { var n = el("#" + x); if (n) n.classList.toggle("hide", x !== id); }); }
function closeModal() { el("#modal").innerHTML = ""; }

/* ---------------- percorsi (ogni pagina ha il suo indirizzo) ---------------- */
var ROUTING = false, FCTX = null, FDIRTY = false, FBACK = null;
function hashOf(v, id, t) { return "#/" + (v || "dash") + (id ? "/" + id : t ? "/-" : "") + (t ? "/" + t : ""); }
function inForm() { return view === "nuovo" || view === "mod"; }
function go(v, id, t) {
  if (FDIRTY && inForm() && v !== view) {
    if (!confirm("Hai modifiche non salvate su questo modulo. Vuoi uscire senza salvare?")) return;
  }
  FDIRTY = false;
  view = v; current = id || null; tab = t || ""; search = "";
  document.body.classList.remove("navopen"); window.scrollTo(0, 0);
  ROUTING = true;
  try { location.hash = hashOf(v, id, t); } catch (e) {}
  ROUTING = false;
  render();
}
function leggiHash() {
  var h = location.hash || "";
  if (h.indexOf("#/") !== 0 || /^#\/p\//i.test(h)) return false;
  var p = h.slice(2).split("/");
  if (!p[0]) return false;
  view = p[0]; current = p[1] && p[1] !== "-" ? decodeURIComponent(p[1]) : null; tab = p[2] ? decodeURIComponent(p[2]) : "";
  return true;
}
window.addEventListener("hashchange", function () {
  if (ROUTING || PLINK || !user) return;
  if (!leggiHash()) return;
  FDIRTY = false; search = ""; window.scrollTo(0, 0); render();
});
/* Non esiste più una regia che vede tutto: solo responsabilità sulle aree comuni */
function puo(p) { return !!(me.perm && me.perm[p]); }
function isAdmin() { return puo("accessi"); }
function isPR() { return false; }
function isPro() { return me.ruolo === "professionista"; }
function isCliente() { return me.ruolo === "cliente"; }
function vediCosti() { return !isPR(); }

var STATI = ["Bozza", "Preventivo", "Approvata", "In corso", "Consegna", "Chiusa", "Persa"];
var STATO_COL = { Bozza: "", Preventivo: "b-amber", Approvata: "b-blue", "In corso": "b-terra", Consegna: "b-blue", Chiusa: "b-green", Persa: "b-red" };
var TASK_STATI = ["Da fare", "In corso", "In review", "Fatto"];
var FASE_STATI = ["Da iniziare", "In corso", "In attesa cliente", "Completata"];
var FASE_COL = { "Da iniziare": "", "In corso": "b-terra", "In attesa cliente": "b-amber", Completata: "b-green" };
var PRIO_COL = { Alta: "b-red", Media: "b-amber", Bassa: "" };
var MOV_COL = { Pagata: "b-green", Emessa: "b-blue", "Da emettere": "b-amber", Insoluta: "b-red" };
var APPR_COL = { Approvata: "b-green", "In attesa": "b-amber", "Modifiche richieste": "b-red" };
var TIPI_MAT = ["Brief", "Riferimenti", "Cartella", "Bozza", "Consegna", "Contratto", "Altro"];

/* ---------------- calcoli ---------------- */
function righeOf(k) { return D.righe.filter(function (r) { return r.commessa_id === k; }); }
function fasiOf(k) { return D.fasi.filter(function (f) { return f.commessa_id === k; }).sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); }); }
function matOf(k) { return D.mat.filter(function (m) { return m.commessa_id === k; }); }
function pagOf(k) { return D.pag.filter(function (p) { return p.commessa_id === k; }); }
function apprOf(k) { return D.appr.filter(function (a) { return a.commessa_id === k; }); }
function oreOf(k) { return D.ore.filter(function (o) { return o.commessa_id === k; }); }
function taskOf(k) { return D.task.filter(function (t) { return t.commessa_id === k; }); }
function movOf(k) { return D.mov.filter(function (m) { return m.commessa_id === k; }); }
function oreTot(k) { return sum(oreOf(k), function (o) { return o.ore; }); }
function comOfCliente(c) { return D.com.filter(function (k) { return k.cliente_id === c; }); }
function variOf(k) { return D.vari.filter(function (v) { return v.commessa_id === k; }); }
function evOf(k) { return D.ev.filter(function (e) { return e.commessa_id === k; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }
function proDi(k) {
  var s = {};
  var c = by(D.com, k);
  if (c && c.owner_id) s[c.owner_id] = 1;
  righeOf(k).forEach(function (r) { var sv = by(D.serv, r.serv_id); var p = r.assegnato_id || (sv && sv.pro_id); if (p) s[p] = 1; });
  return Object.keys(s);
}
function condivisa(k) { return proDi(k.id).length > 1; }

/* budget, consumo e salute della commessa */
function budget(k) {
  var c = calc(k);
  var vApp = variOf(k.id).filter(function (v) { return v.stato === "Approvata"; });
  var extra = sum(vApp, function (v) { return v.importo; });
  var ricavo = (+k.budget_importo || c.tot) + extra;
  var oreStim = sum(righeOf(k.id), function (r) { return r.ore_stimate; }) + sum(vApp, function (v) { return v.ore; });
  var ore = oreOf(k.id);
  var oreFatte = sum(ore, function (o) { return o.ore; });
  var costoReale = c.cost;
  var margPian = ricavo - c.cost;
  var margReale = ricavo - c.cost;
  var burnOre = oreStim ? Math.round(oreFatte / oreStim * 100) : null;
  var burnCosto = ricavo ? Math.round(c.cost / ricavo * 100) : 0;
  return { ricavo: ricavo, extra: extra, oreStim: oreStim, oreFatte: oreFatte, costoPian: c.cost, costoReale: costoReale, margPian: margPian, margReale: margReale, burnOre: burnOre, burnCosto: burnCosto, varianti: vApp.length };
}
function salute(k) {
  if (["Chiusa", "Persa", "Bozza"].indexOf(k.stato) > -1) return { c: "", t: "—", d: "" };
  var b = budget(k), av = avanzamento(k.id), motivi = [];
  var rosso = false, giallo = false;
  if (k.scadenza && k.scadenza < today()) { rosso = true; motivi.push("consegna scaduta"); }
  if (b.burnOre != null && b.burnOre > 110) { rosso = true; motivi.push("ore oltre la stima"); }
  if (b.margReale < 0) { rosso = true; motivi.push("margine negativo"); }
  if (!rosso) {
    if (b.burnOre != null && b.burnOre > 85) { giallo = true; motivi.push("budget ore quasi esaurito"); }
    if (k.scadenza && days(k.scadenza, today()) <= 7 && (av == null || av < 70)) { giallo = true; motivi.push("consegna vicina"); }
    if (apprOf(k.id).some(function (a) { return a.stato === "In attesa" && days(today(), a.richiesta_il) > 7; })) { giallo = true; motivi.push("cliente fermo da oltre una settimana"); }
  }
  return rosso ? { c: "b-red", t: "A rischio", d: motivi.join(" · ") } : giallo ? { c: "b-amber", t: "Da tenere d'occhio", d: motivi.join(" · ") } : { c: "b-green", t: "In linea", d: "tutto sotto controllo" };
}
function gantt(k) {
  var fs = fasiOf(k.id); if (!fs.length) return "";
  var date = [];
  fs.forEach(function (f) { if (f.inizio) date.push(f.inizio); if (f.fine) date.push(f.fine); });
  if (k.inizio) date.push(k.inizio); if (k.scadenza) date.push(k.scadenza);
  if (!date.length) return "";
  var min = date.slice().sort()[0], max = date.slice().sort()[date.length - 1];
  var span = Math.max(1, days(max, min));
  var oggi = Math.round(days(today(), min) / span * 100);
  var h = '<div class="gantt"><div class="gwrap">';
  fs.forEach(function (f) {
    var a = f.inizio || min, b = f.fine || max;
    var left = Math.max(0, Math.round(days(a, min) / span * 100));
    var w = Math.max(2, Math.round(days(b, a) / span * 100));
    h += '<div class="grow"><div class="glab">' + esc(f.nome) + '</div><div class="gtrack"><div class="gbar ' + (f.stato === "Completata" ? "ok" : f.stato === "In corso" ? "" : "soft") + '" style="left:' + left + "%;width:" + Math.min(100 - left, w) + '%"><i style="width:' + (f.avanzamento || 0) + '%"></i></div></div></div>';
  });
  h += "</div><div class=\"faint\" style=\"margin-top:8px\">" + dt(min) + " → " + dt(max) + (oggi >= 0 && oggi <= 100 ? " · oggi al " + oggi + "% del percorso" : "") + "</div></div>";
  return h;
}
async function logEv(kid, testo) {
  if (!kid) return;
  await sb.from("eventi").insert({ commessa_id: kid, pro_id: me.pro_id, testo: testo });
}

/* ---------------- atomi visivi ---------------- */
var AVC = ["#d2552e", "#3a6ea8", "#3f7d55", "#a8761b", "#7d5ba6", "#b8455a", "#2f8f8f"];
function avatar(id, size) {
  var p = by(D.pros, id), n = p ? p.nome : "—", s = size || 26;
  var ini = n.split(" ").filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join("").toUpperCase();
  var hh = 0; for (var i = 0; i < n.length; i++) hh = (hh * 31 + n.charCodeAt(i)) % 9973;
  return '<span class="av" title="' + esc(n) + '" style="background:' + AVC[hh % AVC.length] + ";width:" + s + "px;height:" + s + "px;font-size:" + Math.round(s * 0.38) + 'px">' + esc(ini) + "</span>";
}
function avatars(ids, size) {
  if (!ids.length) return '<span class="faint">—</span>';
  return '<span class="avs">' + ids.slice(0, 4).map(function (id) { return avatar(id, size || 24); }).join("") +
    (ids.length > 4 ? '<span class="av more" style="width:' + (size || 24) + "px;height:" + (size || 24) + 'px">+' + (ids.length - 4) + "</span>" : "") + "</span>";
}
function ring(p, size) {
  var s = size || 78, r = (s - 9) / 2, C = 2 * Math.PI * r, v = Math.max(0, Math.min(100, +p || 0));
  var col = v >= 100 ? "var(--green)" : v >= 50 ? "var(--terra)" : v > 0 ? "var(--amber)" : "var(--sand)";
  return '<svg class="ring" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + " " + s + '">' +
    '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="var(--sand)" stroke-width="7"/>' +
    '<circle class="pr" style="--full:' + C.toFixed(1) + '" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - v / 100)).toFixed(1) + '" transform="rotate(-90 ' + s / 2 + " " + s / 2 + ')"/>' +
    '<text x="50%" y="50%" text-anchor="middle" dy=".35em" class="ringtxt" style="font-size:' + Math.round(s * 0.26) + 'px">' + Math.round(v) + "%</text></svg>";
}
var SPK = 0;
function spark(vals) {
  var w = 240, h = 52, id = "sg" + (++SPK);
  var mx = Math.max.apply(null, vals.concat([1]));
  var step = vals.length > 1 ? w / (vals.length - 1) : w;
  var pts = vals.map(function (v, i) { return (i * step).toFixed(1) + "," + (h - (v / mx) * (h - 8) - 4).toFixed(1); });
  return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--terra)" stop-opacity=".25"/><stop offset="100%" stop-color="var(--terra)" stop-opacity="0"/></linearGradient></defs>' +
    '<polygon points="0,' + h + " " + pts.join(" ") + " " + w + "," + h + '" fill="url(#' + id + ')"/>' +
    '<polyline points="' + pts.join(" ") + '" fill="none" stroke="var(--terra)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function settimane(list, n) {
  var out = [], oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  for (var w = n - 1; w >= 0; w--) {
    var b = new Date(oggi.getTime() - w * 7 * 86400000), a = new Date(b.getTime() - 6 * 86400000);
    var ai = iso(a), bi = iso(b);
    out.push(sum(list.filter(function (o) { return o.data >= ai && o.data <= bi; }), function (o) { return o.ore; }));
  }
  return out;
}
function heatOre(list) {
  var map = {};
  list.forEach(function (o) { map[o.data] = (map[o.data] || 0) + (+o.ore || 0); });
  var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  var start = new Date(oggi.getTime() - 83 * 86400000);
  start = new Date(start.getTime() - ((start.getDay() + 6) % 7) * 86400000);
  var cols = [], mesi = [];
  for (var w = 0; w < 12; w++) {
    var cells = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start.getTime() + (w * 7 + i) * 86400000), k = iso(d), v = map[k] || 0;
      var l = v === 0 ? 0 : v < 2 ? 1 : v < 4 ? 2 : v < 7 ? 3 : 4;
      cells.push('<i class="hc l' + l + '" title="' + dt(k) + " · " + num(v, 1) + ' h"></i>');
    }
    var m = new Date(start.getTime() + w * 7 * 86400000).toLocaleDateString("it-IT", { month: "short" });
    mesi.push('<span>' + (w === 0 || m !== mesi._l ? m : "") + "</span>"); mesi._l = m;
    cols.push('<div class="hcol">' + cells.join("") + "</div>");
  }
  return '<div class="heat">' + cols.join("") + '</div><div class="heatleg"><span class="faint">meno</span><i class="hc l0"></i><i class="hc l1"></i><i class="hc l2"></i><i class="hc l3"></i><i class="hc l4"></i><span class="faint">più</span></div>';
}
/* ---------------- note in stile documento ---------------- */
function inline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(https?:\/\/[^\s&lt;]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function md(t) {
  var out = [], lista = false, ci = 0;
  (t || "").split("\n").forEach(function (raw) {
    var l = esc(raw);
    var ck = l.match(/^- \[( |x|X)\] (.*)$/);
    if (ck) {
      if (lista) { out.push("</ul>"); lista = false; }
      var on = ck[1] !== " ";
      out.push('<div class="mdck"><button class="ck' + (on ? " on" : "") + '" data-ck="' + (ci++) + '"></button><span' + (on ? ' class="done"' : "") + ">" + inline(ck[2]) + "</span></div>");
      return;
    }
    var li = l.match(/^[-*] (.*)$/);
    if (li) { if (!lista) { out.push("<ul>"); lista = true; } out.push("<li>" + inline(li[1]) + "</li>"); return; }
    if (lista) { out.push("</ul>"); lista = false; }
    var hh = l.match(/^(#{1,3}) (.*)$/);
    if (hh) { out.push('<div class="mdh h' + hh[1].length + '">' + inline(hh[2]) + "</div>"); return; }
    if (!l.trim()) { out.push('<div class="mdsp"></div>'); return; }
    out.push("<p>" + inline(l) + "</p>");
  });
  if (lista) out.push("</ul>");
  return '<div class="md">' + out.join("") + "</div>";
}
function toggleCk(testo, idx) {
  var i = -1;
  return (testo || "").split("\n").map(function (l) {
    if (/^- \[( |x|X)\] /.test(l)) {
      i++;
      if (i === idx) return /^- \[ \]/.test(l) ? l.replace(/^- \[ \]/, "- [x]") : l.replace(/^- \[[xX]\]/, "- [ ]");
    }
    return l;
  }).join("\n");
}

/* ---------------- tempo ---------------- */
function lunedi(off) { var d = new Date(); d.setHours(0, 0, 0, 0); var wd = (d.getDay() + 6) % 7; return new Date(d.getTime() - (wd - (off || 0) * 7) * 86400000); }
function timerMio() { return D.tmr.filter(function (t) { return t.pro_id === me.pro_id; })[0]; }
function durata(iso0) {
  var s = Math.max(0, Math.floor((Date.now() - new Date(iso0).getTime()) / 1000));
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + "h " : "") + (m < 10 ? "0" : "") + m + "m";
}
function prossimo(k) {
  var out = [];
  var ap = apprOf(k.id).filter(function (a) { return a.stato === "In attesa"; })[0];
  if (ap) out.push({ i: "attesa", t: "In attesa: " + ap.tipo, d: "richiesta il " + dt(ap.richiesta_il) });
  var f = fasiOf(k.id).filter(function (x) { return x.stato !== "Completata"; })[0];
  if (f) out.push({ i: "fase", t: "Fase in corso: " + f.nome, d: (f.avanzamento || 0) + "% · entro il " + dt(f.fine) });
  var p = pagOf(k.id).filter(function (x) { return x.stato !== "Incassato"; }).sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; })[0];
  if (p) out.push({ i: "pag", t: p.nome + " · " + eur(p.importo), d: "scade il " + dt(p.scadenza) });
  var t = taskOf(k.id).filter(function (x) { return x.stato !== "Fatto" && x.scadenza; }).sort(function (a, b) { return a.scadenza < b.scadenza ? -1 : 1; })[0];
  if (t) out.push({ i: "task", t: t.titolo, d: "entro il " + dt(t.scadenza) });
  return out;
}

function progOf(k) { return D.prog.filter(function (p) { return p.commessa_id === k; }).sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); }); }
function lavOf(pid) { return D.lav.filter(function (l) { return l.progetto_id === pid; }).sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); }); }
function taskOfLav(lid) { return D.task.filter(function (t) { return t.lavorazione_id === lid; }); }
function oreOfLav(lid) { return D.ore.filter(function (o) { return o.lavorazione_id === lid; }); }
function taskOfProg(pid) { var ids = lavOf(pid).map(function (l) { return l.id; }); return D.task.filter(function (t) { return t.progetto_id === pid || ids.indexOf(t.lavorazione_id) > -1; }); }
function oreOfProg(pid) { var ids = lavOf(pid).map(function (l) { return l.id; }); return D.ore.filter(function (o) { return o.progetto_id === pid || ids.indexOf(o.lavorazione_id) > -1; }); }
function matOfProg(pid) { return D.mat.filter(function (m) { return m.progetto_id === pid; }); }
function righeProg(pid) { return D.righe.filter(function (r) { return r.progetto_id === pid; }); }
function valoreProg(pid) { return sum(righeProg(pid).filter(function (r) { return !r.opzionale; }), function (r) { return rigaCalc(r).prezzo; }); }
function avanzProg(p) {
  var lv = lavOf(p.id);
  if (!lv.length) return p.avanzamento || 0;
  var fatte = lv.filter(function (l) { return l.stato === "Completata"; }).length;
  var incorso = lv.filter(function (l) { return l.stato === "In corso"; }).length;
  return Math.round((fatte + incorso * 0.5) / lv.length * 100);
}
function progVisibili() {
  return D.prog.filter(function (p) { return by(D.com, p.commessa_id); }).sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); });
}
function rigaCalc(r) {
  var s = r.serv_id ? by(D.serv, r.serv_id) : null;
  var pu = r.prezzo_unit != null ? +r.prezzo_unit : (s ? +s.prezzo || 0 : 0);
  var cu = r.costo_unit != null ? +r.costo_unit : (s ? +s.costo || 0 : 0);
  var q = +r.qty || 1, cic = r.ricorrente ? Math.max(1, +r.cicli || 1) : 1;
  var sc = (+r.sconto || 0) / 100;
  var prezzo = Math.round(pu * q * cic * (1 - sc));
  var costo = Math.round(cu * q * cic);
  if (r.tipo === "Sconto") { prezzo = -Math.abs(prezzo); costo = 0; }
  return { pu: pu, cu: cu, q: q, cic: cic, sc: sc, prezzo: prezzo, costo: costo,
    unita: r.unita || (s ? s.unita : "") || "", nome: r.nome || (s ? s.nome : "Riga"),
    pro: r.assegnato_id || (s ? s.pro_id : null), cat: s ? s.cat : (r.tipo || "") };
}
function calc(k) {
  var imp = 0, cost = 0, mio = 0, opz = 0, mrr = 0, spese = 0;
  righeOf(k.id).forEach(function (r) {
    var rc = rigaCalc(r);
    if (r.opzionale) { opz += rc.prezzo; return; }
    imp += rc.prezzo; cost += rc.costo;
    if (r.tipo === "Trasferta" || r.tipo === "Spesa") spese += rc.prezzo;
    if (r.ricorrente) mrr += Math.round(rc.pu * rc.q * (1 - rc.sc) / (r.periodo === "Annuale" ? 12 : 1));
    if (me.pro_id && rc.pro === me.pro_id) mio += rc.costo;
  });
  var sconto = Math.round(imp * (+k.sconto || 0) / 100);
  imp = imp - sconto;
  var fee = 0;
  var tot = imp;
  var iva = Math.round(tot * (k.iva == null ? 22 : +k.iva) / 100);
  return { imp: imp, cost: cost, fee: fee, tot: tot, iva: iva, lordo: tot + iva, margine: tot - cost, mio: mio, opz: opz, mrr: mrr, sconto: sconto, spese: spese };
}
function avanzamento(k) {
  var f = fasiOf(k); if (!f.length) return null;
  return Math.round(sum(f, function (x) { return x.avanzamento; }) / f.length);
}
function valoreCliente(c) { return sum(comOfCliente(c).filter(function (k) { return k.stato !== "Persa"; }), function (k) { return calc(k).tot; }); }

function isMineCom(k) { return me.pro_id && (k.owner_id === me.pro_id || k.pm_id === me.pro_id || k.pr_id === me.pro_id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return r.assegnato_id === me.pro_id || (s && s.pro_id === me.pro_id); })); }
function mio(row, kind) {
  if (persp === "all") return true;
  if (!me.pro_id) return false;
  if (persp === "shared") {
    if (kind === "com") return condivisa(row);
    if (kind === "cli") return comOfCliente(row.id).some(condivisa);
    if (kind === "ore" || kind === "task") return row.commessa_id && condivisa({ id: row.commessa_id });
    return true;
  }
  if (kind === "com") return !condivisa(row) && isMineCom(row);
  if (kind === "cli") return row.owner_id === me.pro_id;
  if (kind === "ore") return row.pro_id === me.pro_id;
  if (kind === "task") return row.assegnato_id === me.pro_id;
  if (kind === "mov") return row.pro_id === me.pro_id;
  return true;
}
function fcom() { return D.com.filter(function (k) { return mio(k, "com"); }); }
function fcli() { return D.cli.filter(function (c) { return mio(c, "cli"); }); }
function fore() { return D.ore.filter(function (o) { return mio(o, "ore"); }); }
function ftask() { return D.task.filter(function (t) { return mio(t, "task"); }); }
function fmov() { return D.mov.filter(function (m) { return mio(m, "mov"); }); }

/* ---------------- caricamento ---------------- */
async function loadAll() {
  me.email = user.email;
  var m = await sb.from("membri").select("*").eq("user_id", user.id).maybeSingle();
  if (m.data) {
    me.ruolo = m.data.ruolo || "professionista"; me.pro_id = m.data.pro_id; me.cliente_id = m.data.cliente_id;
    me.perm = { spazi: !!m.data.perm_spazi, studio: !!m.data.perm_studio, accessi: !!m.data.perm_accessi };
  } else { me.ruolo = ""; me.perm = { spazi: false, studio: false, accessi: false }; }
  if (isCliente()) { var p = await sb.rpc("portale"); PORT = p.data || []; me.nome = "Area cliente"; return; }
  var keys = Object.keys(TB);
  var res = await Promise.all(keys.map(function (k) { return sb.from(TB[k]).select("*"); }));
  res.forEach(function (r, i) { D[keys[i]] = (r.error ? [] : (r.data || [])); });
  var s = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (s.data) SET = s.data;
  var st = await sb.rpc("studio_stats");
  STATS = st.data || null;
  mieiDatiPersonali();
  var pr = me.pro_id ? by(D.pros, me.pro_id) : null;
  me.nome = pr ? pr.nome : user.email;
}
async function reload(keys) {
  await Promise.all(keys.map(async function (k) {
    var r = await sb.from(TB[k]).select("*"); if (!r.error) D[k] = r.data || [];
  }));
  if (keys.indexOf("pros") > -1 || keys.indexOf("priv") > -1) mieiDatiPersonali();
}
/* La tariffa oraria e le note personali vivono in una tabella che vede solo il proprietario.
   Le riattacco alla mia scheda così il resto dell'app le trova dove se le aspetta. */
function mieiDatiPersonali() {
  var pr = me.pro_id ? by(D.pros, me.pro_id) : null;
  var pv = (D.priv || []).filter(function (x) { return x.pro_id === me.pro_id; })[0];
  if (pr) { pr.tariffa_oraria = pv ? pv.tariffa_oraria : null; pr.note = pv ? pv.note : null; }
}

/* ---------------- nav ---------------- */
/* Il menu: quattro zone. I numeri contano solo cose che ti aspettano. */
function navFor() {
  return [
    { g: "Lavoro", n: "quello che stai facendo" },
    { k: "dash", t: "La mia giornata", d: "Cosa guardare adesso" },
    { k: "calendario", t: "Calendario", d: "Scadenze e consegne sul mese" },
    { k: "progetti", t: "Progetti", d: "Progetti aperti in cui sei dentro", c: function () { return progVisibili().filter(function (p) { return p.stato !== "Completato"; }).length; } },
    { k: "task", t: "Attività", d: "Attività aperte assegnate a te", c: function () { return ftask().filter(function (t) { return t.stato !== "Fatto" && t.assegnato_id === me.pro_id; }).length; } },
    { k: "ore", t: "Ore & timesheet", d: "La tua settimana, ora per ora" },
    { k: "carico", t: "Il mio carico", d: "Quanto lavoro hai davanti" },
    { g: "Profilo", n: "come ti vedono i colleghi" },
    { k: "profilo", t: "Il mio profilo", d: "La tua scheda e quanto è completa" },
    { k: "servizi", t: "I miei servizi", d: "Il tuo listino: è così che ti trovano", c: function () { return D.serv.filter(function (x) { return x.pro_id === me.pro_id; }).length; } },
    { g: "Amministrazione", n: "i tuoi soldi e i tuoi clienti" },
    { k: "amm", t: "Quadro amministrativo", d: "Fatturato, incassi, pipeline" },
    { k: "clienti", t: "Clienti", d: "I tuoi clienti", c: function () { return fcli().length; } },
    { k: "commesse", t: "Preventivi", d: "Preventivi ancora da chiudere", c: function () { return fcom().filter(function (k) { return ["Bozza", "Preventivo"].indexOf(k.stato) > -1; }).length; } },
    { k: "fatture", t: "Fatture", d: "Fatture non ancora pagate", c: function () { return fmov().filter(function (m) { return m.stato !== "Pagata"; }).length; } },
    { k: "report", t: "Report", d: "Numeri e andamenti" },
    { g: "Studio", n: "quello che è di tutti" },
    { k: "studio", t: "Bacheca", d: "Cosa condividiamo" },
    { k: "pool", t: "Professionisti", d: "Chi c'è e cosa sa fare" },
    { k: "fornitori", t: "Fornitori", d: "La rubrica dello studio" },
    { k: "spazi", t: "Coworking & spazi", d: "Sale e postazioni" },
    { k: "impostazioni", t: "Impostazioni", d: "Il tuo accesso e le regole" }
  ];
}
var RUOLO_ET = { admin: "Professionista", professionista: "Professionista", pr: "Professionista", cliente: "Cliente" };
function permEt() {
  var l = [];
  if (puo("spazi")) l.push("spazi");
  if (puo("studio")) l.push("studio");
  if (puo("accessi")) l.push("accessi");
  return l.length ? "cura: " + l.join(" · ") : "";
}
function buildNav() {
  var vv = view;
  if (vv === "nuovo" || vv === "mod") { var fs = FSEZ[current]; vv = fs ? fs[0] : "dash"; }
  if (vv === "riga") vv = "commesse";
  var h = "", cur = { commessa: "commesse", cliente: "clienti", pro: "pool", progetto: "progetti", lavorazione: "progetti", attivita: "task", riga: "commesse" }[vv] || vv;
  h += '<button class="cerca" data-pal="1" title="Cerca ovunque (⌘K)"><span>Cerca…</span><kbd>⌘K</kbd></button>';
  navFor().forEach(function (n) {
    if (n.g) { h += '<div class="navgroup"><span>' + esc(n.g) + "</span>" + (n.n ? '<i title="' + esc(n.n) + '">' + esc(n.n) + "</i>" : "") + "</div>"; return; }
    var c = n.c ? n.c() : null;
    h += '<button data-go="' + n.k + '" class="' + (cur === n.k ? "on" : "") + '" title="' + esc(n.d || n.t) + '"><span class="nt">' + esc(n.t) + "</span>" +
      (c ? '<span class="cnt">' + c + "</span>" : "") + "</button>";
  });
  var tm = timerMio();
  if (tm) {
    h = '<button class="timerchip" data-tstop="1"><span class="pulse"></span><span class="tc"><b>' + esc(nameOf(D.com, tm.commessa_id, "titolo")) + '</b><span id="timerlbl">' + durata(tm.iniziato) + "</span></span><span class=\"stopi\">■</span></button>" + h;
  }
  el("#nav").innerHTML = h;
  clearInterval(TICK);
  if (tm) TICK = setInterval(function () {
    var t2 = timerMio(); if (!t2) { clearInterval(TICK); return; }
    Array.prototype.forEach.call(document.querySelectorAll("#timerlbl"), function (n) { n.textContent = durata(t2.iniziato); });
  }, 15000);
  el("#mename").innerHTML = (me.pro_id ? avatar(me.pro_id, 26) : "") + "<span>" + esc(me.nome) + "</span>";
  el("#meemail").innerHTML = esc(me.email) + (permEt() ? '<br><span class="cura">' + esc(permEt()) + "</span>" : "");
}
/* il filtro "di chi" vive dentro la barra dei preventivi, non su ogni pagina */
/* percorso: [testo] oppure [testo, vista, id, scheda] */
function crumbs(items) {
  return '<nav class="crumbs">' + items.map(function (c, i) {
    var last = i === items.length - 1;
    var txt = esc(c[0] || "");
    if (last || !c[1]) return '<span class="' + (last ? "qui" : "") + '">' + txt + "</span>" + (last ? "" : '<span class="sep">›</span>');
    return '<button class="cr" data-route="' + esc(c[1] + "|" + (c[2] || "") + "|" + (c[3] || "")) + '">' + txt + '</button><span class="sep">›</span>';
  }).join("") + "</nav>";
}
function gruppoDi(v) {
  var n = navFor(), g = "";
  for (var i = 0; i < n.length; i++) { if (n[i].g) g = n[i].g; if (n[i].k === v) return g; }
  return "";
}
function etichettaDi(v) {
  var n = navFor();
  for (var i = 0; i < n.length; i++) if (n[i].k === v) return n[i].t;
  return "";
}
/* ---- barra unica di viste e filtri, uguale in tutte le sezioni ---- */
var FS = {
  com: { stato: "", salute: "", cli: "", cerca: "" },
  prog: { stato: "", cli: "", pro: "", cerca: "" },
  cli: { stato: "", owner: "", cerca: "" },
  mov: { tipo: "", stato: "", anno: "", cerca: "" },
  serv: { cat: "", chi: "", cerca: "" },
  forn: { cat: "", cerca: "" },
  pool: { cat: "", cerca: "" }
};
function opzioni(list, val) {
  return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (val === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
}
function fsel(amb, campo, list) { return '<select data-f="' + amb + "|" + campo + '">' + opzioni(list, FS[amb][campo]) + "</select>"; }
function fcerca(amb, ph) { return '<input id="fcerca" data-f="' + amb + '|cerca" placeholder="' + esc(ph || "Cerca…") + '" value="' + esc(FS[amb].cerca) + '">'; }
function fchip(attr, on, label) { return '<button class="chipbtn' + (on ? " on" : "") + '" ' + attr + ">" + esc(label) + "</button>"; }
/* tabs: [chiave, etichetta] · rotta: vista da usare nel percorso */
function barraViste(tabs, attiva, rotta, filtri) {
  return '<div class="vbar">' +
    (tabs && tabs.length ? '<div class="vtabs">' + tabs.map(function (v) {
      return '<button data-route="' + esc(rotta + "|-|" + v[0]) + '" class="' + (attiva === v[0] ? "on" : "") + '">' + esc(v[1]) + "</button>";
    }).join("") + "</div>" : "") +
    (filtri ? '<div class="vfilt">' + filtri + "</div>" : "") + "</div>";
}
function elencoCat(list, campo) {
  var c = {};
  list.forEach(function (x) { if (x[campo]) c[x[campo]] = 1; });
  return Object.keys(c).sort().map(function (x) { return [x, x]; });
}
/* riga di elenco uguale ovunque: titolo, sottotitolo, badge, azione */
function rigaEl(rotta, titolo, sub, meta) {
  return '<div class="trow">' +
    '<button class="ttit" data-route="' + esc(rotta) + '"><b>' + esc(titolo) + "</b>" + (sub ? '<span class="faint"> · ' + sub + "</span>" : "") + "</button>" +
    '<span class="tmeta">' + (meta || "") + "</span></div>";
}
/* campo che si salva appena lo cambi */
function qcampo(tb, id, campo, etichetta, controllo) {
  return '<div class="qfield"><label>' + esc(etichetta) + "</label>" + controllo + "</div>";
}
function qsel(tb, id, campo, list, val) { return '<select data-qset="' + tb + "|" + campo + "|" + id + '">' + list + "</select>"; }
function qinput(tb, id, campo, tipo, val, extra) { return '<input type="' + tipo + '" data-qset="' + tb + "|" + campo + "|" + id + '" value="' + esc(val == null ? "" : val) + '"' + (extra || "") + ">"; }

/* schede interne di una scheda: [chiave, etichetta, conteggio] */
function schede(list, attiva, vista, id) {
  return '<div class="tabs">' + list.map(function (x) {
    return '<button data-route="' + esc(vista + "|" + (id || "") + "|" + x[0]) + '" class="' + (attiva === x[0] ? "on" : "") + '">' + esc(x[1]) +
      (x[2] != null ? '<span class="cnt">' + x[2] + "</span>" : "") + "</button>";
  }).join("") + "</div>";
}
function head(title, sub, tools) {
  var g = gruppoDi(view);
  var via = g ? crumbs([[g], [title]]) : "";
  return via + '<div class="top"><h1>' + esc(title) + (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") + '</h1><div class="tools">' + (tools || "") + "</div></div>";
}
function kpi(v, l, d) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + l + "</div>" + (d ? '<div class="d">' + d + "</div>" : "") + "</div>"; }
function bar(label, val, max, right) {
  var w = max ? Math.min(100, Math.round(val / max * 100)) : 0;
  return '<div class="barrow"><div>' + esc(label) + '</div><div class="track"><i style="width:' + w + '%"></i></div><div class="num">' + right + "</div></div>";
}
function prog(p) { return '<div class="prog"><i class="' + (p >= 100 ? "ok" : p >= 50 ? "" : "warn") + '" style="width:' + Math.min(100, p || 0) + '%"></i></div>'; }
function row2(a, b) { return '<tr><td class="muted" style="width:44%">' + a + "</td><td>" + b + "</td></tr>"; }
function vuoto(txt, azione) { return '<div class="empty">' + esc(txt) + (azione ? " " + azione : "") + "</div>"; }

/* ---------------- dashboard interna ---------------- */
function focusItems(com, tk) {
  var f = [];
  D.appr.filter(function (a) { return a.stato === "In attesa" && can(a.commessa_id); }).forEach(function (a) {
    var g = days(today(), a.richiesta_il);
    f.push({ p: g > 7 ? 1 : 3, c: g > 7 ? "b-red" : "b-amber", t: "Il cliente non ha ancora risposto su “" + a.tipo + "”", s: nameOf(D.com, a.commessa_id, "titolo") + " · da " + g + " giorni", k: a.commessa_id, tab: "approvazioni" });
  });
  D.pag.filter(function (p) { return p.stato !== "Incassato" && p.scadenza && p.scadenza < today() && can(p.commessa_id); }).forEach(function (p) {
    f.push({ p: 0, c: "b-red", t: "Pagamento scaduto: " + eur(p.importo), s: nameOf(D.com, p.commessa_id, "titolo") + " · " + p.nome + " · scaduto il " + dt(p.scadenza), k: p.commessa_id, tab: "pagamenti" });
  });
  tk.filter(function (t) { return t.stato !== "Fatto" && t.scadenza && t.scadenza <= today(); }).forEach(function (t) {
    f.push({ p: t.scadenza < today() ? 1 : 2, c: t.scadenza < today() ? "b-red" : "b-amber", t: t.titolo, s: (t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") + " · " : "") + (t.scadenza < today() ? "scaduta il " : "scade ") + dt(t.scadenza), task: t.id });
  });
  com.filter(function (k) { return salute(k).c === "b-red"; }).forEach(function (k) {
    f.push({ p: 2, c: "b-red", t: "Lavoro a rischio: " + k.titolo, s: salute(k).d, k: k.id, tab: "fasi" });
  });
  var d = new Date(), dow = d.getDay();
  if (dow > 0 && dow < 6 && !fore().some(function (o) { return o.data === today(); })) {
    f.push({ p: 4, c: "", t: "Non hai ancora registrato le ore di oggi", s: "bastano trenta secondi", act: "ore" });
  }
  return f.sort(function (a, b) { return a.p - b.p; }).slice(0, 5);
}
function can(kid) { return !!by(D.com, kid); }
function bannerProfilo() {
  if (isCliente() || !me.ruolo) return "";
  var p = me.pro_id ? by(D.pros, me.pro_id) : null;
  if (!p) return "";
  var mancano = [];
  if (!p.tariffa_oraria) mancano.push("tariffa oraria");
  if (!p.competenze) mancano.push("competenze");
  if (!p.piva) mancano.push("partita IVA");
  if (!D.serv.some(function (x) { return x.pro_id === p.id; })) mancano.push("i tuoi servizi nel listino");
  if (!mancano.length) return "";
  return '<div class="card" style="border-left:3px solid var(--terra);margin-bottom:16px"><div class="cardhead"><h2>Completa il tuo profilo</h2>' +
    '<button class="btn sm ghost" data-edit="pros:' + p.id + '">Apri il profilo</button></div>' +
    '<p class="faint">Manca ancora: ' + mancano.join(", ") + ". Serve per calcolare i compensi e per farti trovare dai colleghi." +
    (mancano.indexOf("i tuoi servizi nel listino") > -1 ? ' <button class="lnk" data-go="servizi">Aggiungi un servizio</button>' : "") + "</p></div>";
}
function vDash() {
  var com = fcom(), cli = fcli(), ore = fore(), tk = ftask(), mov = fmov();
  var aperte = com.filter(function (k) { return ["Preventivo", "Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; });
  var pipeline = sum(aperte, function (k) { return calc(k).tot; });
  var d = new Date(), m0 = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  var oreMese = ore.filter(function (o) { return o.data >= m0; });
  var urgenti = tk.filter(function (t) { return t.stato !== "Fatto" && t.scadenza && days(t.scadenza, today()) <= 7; }).sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; });
  var attesa = D.appr.filter(function (a) { return a.stato === "In attesa"; });
  var pagAperti = D.pag.filter(function (p) { return p.stato === "Da incassare"; });
  var scaduti = pagAperti.filter(function (p) { return p.scadenza && p.scadenza < today(); });

  var attive = com.filter(function (k) { return ["Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; });
  var avgAv = attive.length ? Math.round(sum(attive, function (k) { return avanzamento(k.id) || 0; }) / attive.length) : 0;
  var wk = settimane(ore, 8), foc = focusItems(com, tk);
  var oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  var h = bannerProfilo() + '<div class="top"><h1>Ciao ' + esc((me.nome || "").split(" ")[0]) + '<span class="sub">' + esc(oggi.charAt(0).toUpperCase() + oggi.slice(1)) + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-pal="1">⌘K  Cerca</button>' +
    '<button class="btn sm" data-new="com">+ Nuovo preventivo</button>' + '<button class="btn sm ghost" data-new="ore">+ Registra ore</button>' + "</div></div>";

  h += '<div class="grid g32">';
  h += '<div class="card"><div class="cardhead"><h2>Da guardare adesso</h2>' + (foc.length ? '<span class="badge ' + (foc[0].c || "") + '">' + foc.length + " cose</span>" : '<span class="badge b-green">tutto in ordine</span>') + "</div>";
  h += foc.length ? foc.map(function (f) {
    return '<button class="frow" ' + (f.task ? 'data-open-task="' + f.task + '"' : f.act ? 'data-new="' + f.act + '"' : 'data-open-com="' + f.k + '"') + '><span class="fdot ' + (f.c || "b-blue") + '"></span><span class="ftxt"><b>' + esc(f.t) + '</b><span class="faint">' + esc(f.s) + "</span></span><span class=\"fgo\">›</span></button>";
  }).join("") : '<div class="empty">Nessuna urgenza: puoi lavorare sereno.</div>';
  h += "</div><div>";
  h += '<div class="card ringcard">' + ring(avgAv, 104) + '<div><h2>Avanzamento medio</h2><p class="faint" style="margin-top:4px">' + attive.length + " lavori attivi<br>" + (eur(pipeline) + " di pipeline") + "</p></div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Ore, ultime 8 settimane</h2><span class="faint">' + num(wk[wk.length - 1], 1) + " h questa settimana</span></div>" + spark(wk) + "</div>";
  h += "</div></div>";

  h += '<div class="grid g32" style="margin-top:18px">';
  h += '<div class="card"><div class="cardhead"><h2>I lavori su cui sei</h2><button class="btn sm ghost" data-go="commesse">Vedi tutte</button></div>';
  h += com.length ? listCom(com.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); }).slice(0, 6)) : vuoto("Nessun preventivo ancora.", '<button class="lnk" data-new="com">Creane una</button>');
  h += "</div><div>";

  var per = {}; STATI.forEach(function (s) { per[s] = com.filter(function (k) { return k.stato === s; }); });
  var mxp = Math.max.apply(null, STATI.map(function (s) { return sum(per[s], function (k) { return calc(k).tot; }); }).concat([1]));
  h += '<div class="card"><div class="cardhead"><h2>Pipeline</h2><span class="faint">' + eur(pipeline) + " aperti</span></div><div class=\"funnel\">";
  STATI.forEach(function (s) {
    if (!per[s].length) return;
    var v = sum(per[s], function (k) { return calc(k).tot; });
    h += '<div class="frow2"><span class="badge ' + (STATO_COL[s] || "") + '">' + s + '</span><span class="ftrack"><i style="width:' + Math.max(4, Math.round(v / mxp * 100)) + '%"></i></span><span class="fnum">' + eur(v) + "</span></div>";
  });
  h += "</div></div>";

  if (!isPR()) {
    var inc = sum(D.pag.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; });
    var da = sum(pagAperti, function (p) { return p.importo; });
    var sc = sum(scaduti, function (p) { return p.importo; });
    var tot = Math.max(1, inc + da);
    h += '<div class="card"><div class="cardhead"><h2>Incassi</h2><button class="btn sm ghost" data-go="fatture">Fatture</button></div>' +
      '<div class="stack"><i class="s1" style="width:' + Math.round(inc / tot * 100) + '%"></i><i class="s2" style="width:' + Math.round((da - sc) / tot * 100) + '%"></i><i class="s3" style="width:' + Math.round(sc / tot * 100) + '%"></i></div>' +
      '<div class="legend"><span><i class="s1"></i>Incassato ' + eur(inc) + "</span><span><i class=\"s2\"></i>Da incassare " + eur(da - sc) + "</span>" + (sc ? '<span><i class="s3"></i>Scaduto ' + eur(sc) + "</span>" : "") + "</div></div>";
  }
  h += "</div></div>";
  return h;
}

function listCom(list) {
  return list.map(function (k) {
    var b = budget(k), sal = salute(k), av = avanzamento(k.id);
    return '<button class="crow" data-open-com="' + k.id + '">' +
      '<span class="cring">' + ring(av == null ? 0 : av, 44) + "</span>" +
      '<span class="cmain"><b>' + esc(k.titolo) + '</b><span class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + esc(k.stato) + (k.scadenza ? " · consegna " + dshort(k.scadenza) : "") + "</span></span>" +
      '<span class="cav">' + avatars(proDi(k.id), 24) + "</span>" +
      '<span class="cval"><b>' + eur(b.ricavo) + '</b><span class="badge ' + sal.c + '">' + sal.t + "</span></span></button>";
  }).join("");
}
function boardCom(list) {
  var h = '<div class="board">';
  STATI.filter(function (s) { return s !== "Persa" || list.some(function (k) { return k.stato === s; }); }).forEach(function (s) {
    var items = list.filter(function (k) { return k.stato === s; });
    if (!items.length) return;
    h += '<div class="bcol"><h3>' + s + "<span>" + items.length + "</span></h3>";
    items.forEach(function (k) {
      var b = budget(k), sal = salute(k), av = avanzamento(k.id) || 0;
      h += '<div class="bcard" data-open-com="' + k.id + '"><div class="bt">' + esc(k.titolo) + "</div>" +
        '<div class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + "</div>" +
        prog(av) +
        '<div class="bmeta"><span>' + avatars(proDi(k.id), 22) + "</span><b>" + eur(b.ricavo) + "</b></div>" +
        '<div class="bmeta"><span class="badge ' + sal.c + '">' + sal.t + "</span><span class=\"faint\">" + (k.scadenza ? dshort(k.scadenza) : "—") + "</span></div></div>";
    });
    h += "</div>";
  });
  return h + "</div>";
}
function tblCom(list) {
  var h = '<table class="rich"><thead><tr><th style="width:26px"></th><th>Preventivo</th><th>Cliente</th><th>Chi ci lavora</th><th>Stato</th><th>Salute</th><th style="width:104px">Avanz.</th><th>Consegna</th><th class="num">' + (isPR() ? "Valore" : "Valore") + "</th><th></th></tr></thead><tbody>";
  list.forEach(function (k) {
    var c = calc(k), av = avanzamento(k.id), sal = salute(k), b = budget(k), ap = EXP[k.id];
    h += '<tr class="' + (ap ? "expon" : "") + '"><td><button class="caret' + (ap ? " on" : "") + '" data-exp="' + k.id + '">›</button></td>' +
      '<td><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" + (condivisa(k) ? ' <span class="chip">condivisa</span>' : "") + "</td>" +
      "<td>" + esc(nameOf(D.cli, k.cliente_id)) + "</td>" +
      "<td>" + avatars(proDi(k.id), 24) + "</td>" +
      '<td><span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + "</span></td>" +
      '<td><span class="badge ' + sal.c + '">' + sal.t + "</span></td>" +
      "<td>" + (av == null ? '<span class="faint">—</span>' : '<span class="faint">' + av + "%</span>" + prog(av)) + "</td>" +
      "<td>" + (k.scadenza ? (k.scadenza < today() && ["Chiusa", "Persa"].indexOf(k.stato) < 0 ? '<span class="badge b-red">' + dshort(k.scadenza) + "</span>" : dt(k.scadenza)) : "—") + "</td>" +
      '<td class="num"><b>' + eur(b.ricavo) + "</b></td>" +
      '<td class="num"><button class="lnk" data-duplica="' + k.id + '">Duplica</button></td></tr>';
    if (ap) {
      var px = prossimo(k);
      h += '<tr class="expr"><td></td><td colspan="9"><div class="expgrid">' +
        '<div><h3>Prossimi passi</h3>' + (px.length ? px.map(function (p) { return '<div class="pstep"><b>' + esc(p.t) + '</b><span class="faint">' + esc(p.d) + "</span></div>"; }).join("") : '<span class="faint">Nulla in programma.</span>') + "</div>" +
        '<div><h3>Numeri</h3><div class="pstep"><b>' + num(b.oreFatte, 1) + " / " + num(b.oreStim, 0) + ' h</b><span class="faint">ore fatte sul budget</span></div>' +
        (vediCosti() ? '<div class="pstep"><b>' + eur(b.margReale) + '</b><span class="faint">margine atteso</span></div>' : "") + "</div>" +
        '<div><h3>Scorciatoie</h3><div class="qbtns"><button class="btn sm ghost" data-open-com="' + k.id + '">Apri</button><button class="btn sm ghost" data-preventivo="' + k.id + '">Preventivo</button><button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">Ore</button><button class="btn sm ghost" data-new="task" data-ctx="' + k.id + '">Attività</button></div></div>' +
        "</div></td></tr>";
    }
  });
  return h + "</tbody></table>";
}
/* ---------------- commesse ---------------- */
function vCommesse() {
  var vista = tab || "lista";
  var tutte = fcom();
  var f = FS.com;
  var list = tutte.filter(function (k) {
    if (f.stato && k.stato !== f.stato) return false;
    if (f.salute && salute(k).c !== f.salute) return false;
    if (f.cli && k.cliente_id !== f.cli) return false;
    if (f.cerca && (k.titolo + " " + nameOf(D.cli, k.cliente_id)).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var val = sum(list, function (k) { return budget(k).ricavo; });
  var h = head("Preventivi", list.length + " preventivi · " + eur(val) + " di valore",
    '<button class="btn sm" data-new="com">+ Nuovo preventivo</button>');
  h += barraViste([["lista", "Lista"], ["bacheca", "Bacheca"], ["timeline", "Timeline"]], vista, "commesse",
    fcerca("com", "Cerca un preventivo o un cliente…") +
    fsel("com", "stato", [["", "Ogni stato"]].concat(STATI.map(function (s) { return [s, s]; }))) +
    fsel("com", "salute", [["", "Ogni salute"], ["b-green", "In linea"], ["b-amber", "Da tenere d'occhio"], ["b-red", "A rischio"]]) +
    fsel("com", "cli", [["", "Ogni cliente"]].concat(fcli().map(function (c) { return [c.id, c.nome]; }))) +
    '<select data-persp="1">' + opzioni([["all", "Miei e condivisi"], ["me", "Solo miei"], ["shared", "Solo condivisi"]], persp) + "</select>" +
    (f.stato || f.salute || f.cli || f.cerca ? '<button class="lnk mini" data-f-reset="com">azzera</button>' : ""));

  if (!list.length) return h + '<div class="card">' + vuoto("Nessun preventivo con questi filtri.", '<button class="lnk" data-f-reset="com">Azzera i filtri</button>') + "</div>";
  if (vista === "bacheca") return h + boardCom(list);
  if (vista === "timeline") {
    var conDate = list.filter(function (k) { return k.inizio || k.scadenza; });
    if (!conDate.length) return h + '<div class="card">' + vuoto("Nessun preventivo con date: metti inizio e consegna per vederli sulla timeline.") + "</div>";
    var tutteD = conDate.map(function (k) { return k.inizio || k.scadenza; }).concat(conDate.map(function (k) { return k.scadenza || k.inizio; })).sort();
    var da = new Date(tutteD[0]), a = new Date(tutteD[tutteD.length - 1]);
    da.setDate(da.getDate() - 5); a.setDate(a.getDate() + 5);
    var giorni = Math.max(14, Math.round((a - da) / 86400000));
    var testa = [];
    for (var i = 0; i <= giorni; i += Math.max(7, Math.round(giorni / 12))) {
      var dd = new Date(da.getTime() + i * 86400000);
      testa.push('<span style="left:' + (i / giorni * 100) + '%">' + dshort(iso(dd)) + "</span>");
    }
    return h + '<div class="card"><div class="cardhead"><h2>Timeline dei lavori</h2><span class="faint">da ' + dshort(iso(da)) + " a " + dshort(iso(a)) + '</span></div><div class="tlhead">' + testa.join("") + "</div>" +
      conDate.slice().sort(function (x, y) { return (x.inizio || x.scadenza) < (y.inizio || y.scadenza) ? -1 : 1; }).map(function (k) {
        var i1 = new Date(k.inizio || k.scadenza), i2 = new Date(k.scadenza || k.inizio);
        var x = Math.max(0, (i1 - da) / 86400000 / giorni * 100);
        var w = Math.max(2.5, ((i2 - i1) / 86400000 + 1) / giorni * 100);
        var sal = salute(k);
        return '<div class="tlrow"><div class="tlname" data-open-com="' + k.id + '">' + esc(k.titolo) + "</div>" +
          '<div class="tltrack"><button class="tlbar ' + (k.stato === "Chiusa" ? "ok" : sal.c === "b-red" ? "bad" : "") + '" style="left:' + x + "%;width:" + w + '%" data-open-com="' + k.id + '">' + esc(nameOf(D.cli, k.cliente_id)) + "</button></div></div>";
      }).join("") + "</div>";
  }
  return h + '<div class="card">' + tblCom(list.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); })) + "</div>";
}

function vCommessa() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Preventivo non trovato. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  var c = calc(k), ore = oreOf(k.id), tk = taskOf(k.id), mv = movOf(k.id), fs = fasiOf(k.id), mt = matOf(k.id), pg = pagOf(k.id), ap = apprOf(k.id);
  var oreT = sum(ore, function (o) { return o.ore; }), av = avanzamento(k.id);
  var incassato = sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; });
  var t = tab || "note";

  var b = budget(k), sal = salute(k), vr = variOf(k.id);

  var h = crumbs([["Amministrazione"], ["Preventivi", "commesse"], [k.titolo]]);
  h += '<div class="top"><h1>' + esc(k.titolo) + '<span class="sub">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + esc(k.stato) + " · " + esc(k.tipo_prezzo || "Fisso") + (condivisa(k) ? " · condivisa con " + (proDi(k.id).length - 1) + " colleghi" : " · solo tua") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-edit="com:' + k.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-preventivo="' + k.id + '">Preventivo</button>' +
    (isPR() ? "" : (timerMio() && timerMio().commessa_id === k.id
      ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(timerMio().iniziato) + "</span></button>"
      : '<button class="btn sm ghost" data-tstart="' + k.id + '">▶ Avvia timer</button>')) +
    (["Approvata", "In corso"].indexOf(k.stato) > -1 && !isPR() && !isCliente() ? '<button class="btn sm" data-avvia="' + k.id + '">⚡ Avvia il lavoro</button>' : "") +
    '<button class="btn sm" data-portale="' + k.id + '">Anteprima cliente</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(b.ricavo), "Valore del lavoro", c.mrr ? eur(c.mrr) + " al mese ricorrenti" : b.extra ? eur(k.budget_importo || c.tot) + " + " + eur(b.extra) + " di varianti" : "imponibile " + eur(c.imp) + " · IVA " + eur(c.iva)) +
    kpi(av == null ? "—" : av + " %", "Avanzamento", fs.length + " fasi") +
    kpi('<span class="badge ' + sal.c + '" style="font-size:.9rem;padding:5px 12px">' + sal.t + "</span>", "Salute", sal.d) +
    kpi(vediCosti() ? eur(b.margReale) : num(b.oreFatte, 1) + " h", vediCosti() ? "Margine atteso" : "Ore registrate", vediCosti() ? "pianificato " + eur(b.margPian) : "su " + num(b.oreStim, 0) + " stimate") + "</div>";

  if (vediCosti()) {
    var bo = b.burnOre == null ? 0 : b.burnOre, bc = b.burnCosto;
    h += '<div class="card"><div class="grid g2">' +
      '<div><div class="cardhead"><h2>Le mie ore</h2><span class="faint">' + num(b.oreFatte, 1) + " / " + num(b.oreStim, 0) + " h stimate in totale</span></div><div class=\"prog\"><i class=\"" + (bo > 100 ? "bad" : bo > 85 ? "warn" : "ok") + '" style="width:' + Math.min(100, bo) + '%"></i></div><p class="faint" style="margin-top:6px">' + bo + "% delle ore stimate · quelle dei colleghi sono private</p></div>" +
      '<div><div class="cardhead"><h2>Costo sul valore</h2><span class="faint">' + eur(Math.max(b.costoPian, b.costoReale)) + " su " + eur(b.ricavo) + "</span></div><div class=\"prog\"><i class=\"" + (bc > 90 ? "bad" : bc > 70 ? "warn" : "ok") + '" style="width:' + Math.min(100, bc) + '%"></i></div><p class="faint" style="margin-top:6px">' + bc + "% del valore va ai professionisti</p></div>" +
      "</div></div>";
  }

  var px = prossimo(k);
  if (px.length) {
    h += '<div class="steps">' + px.map(function (p, i) {
      return '<div class="step"><span class="sn">' + (i + 1) + "</span><div><b>" + esc(p.t) + '</b><span class="faint">' + esc(p.d) + "</span></div></div>";
    }).join("") + "</div>";
  }

  h += '<div class="grid g32" style="margin-top:18px"><div>';
  var TABS = [["fasi", "Fasi", fs.length], ["servizi", "Preventivo", righeOf(k.id).length], ["attivita", "Attività", tk.filter(function (z) { return z.stato !== "Fatto"; }).length], ["materiali", "Materiali", mt.length], ["pagamenti", "Pagamenti", pg.length], ["approvazioni", "Approvazioni", ap.filter(function (a) { return a.stato === "In attesa"; }).length], ["varianti", "Varianti", vr.length], ["log", "Diario"]];
  if (!isPR()) TABS.splice(3, 0, ["ore", "Ore", num(oreT, 1)]);
  TABS.unshift(["note", "Note"], ["discussione", "Discussione", D.comm.filter(function (x) { return x.commessa_id === k.id; }).length]);
  h += '<div class="card">' + schede(TABS, t, "commessa", k.id);

  if (t === "note") {
    h += '<div class="cardhead"><h2>Note del lavoro</h2><div style="display:flex;gap:8px;align-items:center"><span class="faint" id="notestat"></span><button class="btn sm ghost" data-notedit="' + (NOTEDIT ? "0" : "1") + '">' + (NOTEDIT ? "Anteprima" : "Scrivi") + "</button></div></div>";
    if (NOTEDIT) {
      h += '<textarea id="notedoc" class="doc" placeholder="# Titolo&#10;Scrivi qui il brief, gli appunti, le decisioni.&#10;- elenco&#10;- [ ] cosa da fare">' + esc(k.note_doc || "") + "</textarea>" +
        '<p class="faint" style="margin-top:10px"># titolo · - elenco · - [ ] da fare · **grassetto** · i link diventano cliccabili. Si salva da solo.</p>';
    } else {
      h += (k.note_doc && k.note_doc.trim()) ? md(k.note_doc) : vuoto("Ancora nessuna nota: qui dentro tieni brief, decisioni e cose da ricordare.", '<button class="lnk" data-notedit="1">Inizia a scrivere</button>');
    }
  }
  if (t === "discussione") {
    var cm = D.comm.filter(function (x) { return x.commessa_id === k.id; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    h += '<div class="cardhead"><h2>Discussione</h2><span class="faint">la vede solo chi lavora su questo preventivo</span></div>';
    h += cm.length ? '<div class="chat">' + cm.map(function (c) {
      return '<div class="msg"><div>' + avatar(c.pro_id, 32) + '</div><div class="mbody"><div class="mhead"><b>' + esc(nameOf(D.pros, c.pro_id)) + '</b><span class="faint">' + dt(c.created_at) + "</span>" + (c.pro_id === me.pro_id ? ' <button class="lnk" data-del="comm:' + c.id + '">elimina</button>' : "") + "</div>" + md(c.testo) + "</div></div>";
    }).join("") + "</div>" : vuoto("Nessun messaggio. Scrivi il primo qui sotto.");
    h += '<form data-chat="' + k.id + '" class="chatbox"><textarea name="testo" placeholder="Scrivi un messaggio al team…" required></textarea><button class="btn sm" type="submit">Invia</button></form>';
  }
  if (t === "fasi") {
    h += '<div class="cardhead"><h2>Fasi del lavoro</h2><button class="btn sm ghost" data-new="fasi" data-ctx="' + k.id + '">+ Nuova fase</button></div>';
    h += fs.length ? '<table><thead><tr><th>Fase</th><th>Stato</th><th>Periodo</th><th style="width:150px">Avanzamento</th><th>Cliente</th><th></th></tr></thead><tbody>' + fs.map(function (f) {
      return "<tr><td><b>" + esc(f.nome) + "</b>" + (f.note ? '<div class="faint">' + esc(f.note) + "</div>" : "") + '</td><td><span class="badge ' + (FASE_COL[f.stato] || "") + '">' + esc(f.stato) + "</span></td><td>" + dshort(f.inizio) + " → " + dshort(f.fine) + "</td><td>" + (f.avanzamento || 0) + "%" + prog(f.avanzamento) + '</td><td>' + (f.visibile_cliente ? '<span class="badge b-blue">visibile</span>' : '<span class="faint">interna</span>') + '</td><td class="num"><button class="lnk" data-edit="fasi:' + f.id + '">Modifica</button></td></tr>';
    }).join("") + "</tbody></table>" + gantt(k) : vuoto("Nessuna fase: dividi il lavoro in passaggi così il cliente vede l'avanzamento.", '<button class="lnk" data-new="fasi" data-ctx="' + k.id + '">Aggiungi la prima fase</button>');
  }
  if (t === "servizi") {
    var pg = progOf(k.id), rr = righeOf(k.id);
    h += '<div class="cardhead"><h2>Preventivo</h2><div style="display:flex;gap:8px"><button class="btn sm ghost" data-new="prog" data-ctx="' + k.id + '">+ Progetto</button><button class="btn sm ghost" data-riga="' + k.id + '">+ Riga</button></div></div>';
    if (!rr.length) h += vuoto("Il preventivo è vuoto: crea i progetti (sito, foto, social…) e aggiungi le righe.", '<button class="lnk" data-riga="' + k.id + '">Aggiungi la prima riga</button>');
    var gruppi = pg.map(function (p) { return { p: p, r: rr.filter(function (x) { return x.progetto_id === p.id && !x.opzionale; }) }; });
    var senza = rr.filter(function (x) { return !x.progetto_id && !x.opzionale; });
    if (senza.length) gruppi.push({ p: { id: null, nome: "Altre voci" }, r: senza });
    gruppi.forEach(function (g) {
      if (!g.r.length && !g.p.id) return;
      var sub = sum(g.r, function (x) { return rigaCalc(x).prezzo; });
      var subc = sum(g.r, function (x) { return rigaCalc(x).costo; });
      h += '<div class="pgroup"><div class="pghead"><div><b>' + esc(g.p.nome) + "</b>" + (g.p.pro_id ? " " + avatar(g.p.pro_id, 22) : "") + (g.p.stato ? ' <span class="badge">' + esc(g.p.stato) + "</span>" : "") + "</div><div>" +
        (vediCosti() ? '<span class="faint">costo ' + eur(subc) + "</span> · " : "") + "<b>" + eur(sub) + "</b>" +
        (g.p.id ? ' <button class="lnk mini2" data-edit="prog:' + g.p.id + '">modifica</button>' : "") + "</div></div>";
      h += g.r.length ? '<table><thead><tr><th>Voce</th><th>Chi</th><th class="num">Q.tà</th><th class="num">Prezzo un.</th>' + (vediCosti() ? '<th class="num">Compenso</th>' : "") + '<th class="num">Totale</th><th></th></tr></thead><tbody>' +
        g.r.map(function (r) {
          var rc = rigaCalc(r);
          var oreR = sum(ore.filter(function (o) { return o.pro_id === rc.pro; }), function (o) { return o.ore; });
          return "<tr><td><b>" + esc(rc.nome) + "</b>" + (r.tipo && r.tipo !== "Servizio" ? ' <span class="badge b-amber">' + esc(r.tipo) + "</span>" : "") +
            (r.descrizione ? '<div class="faint">' + esc(r.descrizione) + "</div>" : "") +
            (r.ricorrente ? '<div class="faint">' + esc(r.periodo || "Mensile") + " × " + (r.cicli || 1) + "</div>" : "") +
            (r.ore_stimate ? '<div class="faint">' + num(r.ore_stimate, 0) + " h stimate · " + num(oreR, 1) + " fatte</div>" : "") + "</td>" +
            "<td>" + (rc.pro ? avatar(rc.pro, 24) : '<span class="faint">—</span>') + "</td>" +
            '<td class="num">' + num(rc.q, rc.q % 1 ? 1 : 0) + '<div class="faint">' + esc(rc.unita || "") + "</div></td>" +
            '<td class="num">' + eur(rc.pu) + (r.sconto ? '<div class="faint">−' + r.sconto + "%</div>" : "") + "</td>" +
            (vediCosti() ? '<td class="num">' + eur(rc.costo) + "</td>" : "") +
            '<td class="num"><b>' + eur(rc.prezzo) + "</b></td>" +
            '<td class="num"><button class="lnk" data-riga-edit="' + r.id + '">Modifica</button></td></tr>';
        }).join("") + "</tbody></table>" : '<div class="empty" style="padding:12px 2px">Nessuna voce in questo progetto. <button class="lnk" data-riga="' + k.id + '">Aggiungine una</button></div>';
      h += "</div>";
    });
    var opzR = rr.filter(function (x) { return x.opzionale; });
    if (opzR.length) {
      h += '<div class="pgroup opz"><div class="pghead"><div><b>Opzioni</b> <span class="faint">non incluse nel totale</span></div><div><b>' + eur(c.opz) + "</b></div></div><table><tbody>" +
        opzR.map(function (r) {
          var rc = rigaCalc(r);
          return "<tr><td><b>" + esc(rc.nome) + "</b>" + (r.descrizione ? '<div class="faint">' + esc(r.descrizione) + "</div>" : "") + '</td><td class="num">' + num(rc.q, 0) + " " + esc(rc.unita) + '</td><td class="num"><b>' + eur(rc.prezzo) + '</b></td><td class="num"><button class="lnk" data-riga-edit="' + r.id + '">Modifica</button></td></tr>';
        }).join("") + "</tbody></table></div>";
    }
    if (rr.length) {
      var perPro = {};
      rr.filter(function (x) { return !x.opzionale && x.tipo !== "Sconto"; }).forEach(function (x) {
        var cc = rigaCalc(x), pid = cc.pro || k.owner_id;
        perPro[pid] = (perPro[pid] || 0) + cc.prezzo;
      });
      var pids = Object.keys(perPro);
      if (pids.length > 1) {
        h += '<div class="card" style="margin-top:14px;background:var(--cream)"><div class="cardhead"><h2>Chi fattura cosa</h2><span class="faint">ognuno emette la sua fattura al cliente</span></div>' +
          '<table><tbody>' + pids.sort(function (a, b) { return perPro[b] - perPro[a]; }).map(function (pid) {
            return "<tr><td>" + avatar(pid, 20) + " " + esc(nameOf(D.pros, pid)) + '</td><td class="num">' + eur(perPro[pid]) + "</td></tr>";
          }).join("") + "</tbody></table></div>";
      }
      h += '<div class="totali"><table><tbody>' +
        row2("Imponibile", eur(c.imp + c.sconto)) +
        (c.sconto ? row2("Sconto commerciale (" + (k.sconto || 0) + "%)", "−" + eur(c.sconto)) : "") +
        row2("<b>Totale imponibile</b>", "<b>" + eur(c.tot) + "</b>") +
        row2("IVA " + (k.iva == null ? 22 : k.iva) + "%", eur(c.iva)) +
        row2("<b>Totale con IVA</b>", "<b>" + eur(c.lordo) + "</b>") +
        (c.mrr ? row2("Di cui ricorrente", eur(c.mrr) + " al mese") : "") +
        (c.spese ? row2("Di cui spese e trasferte", eur(c.spese)) : "") +
        "</tbody></table></div>";
    }
  }
  if (t === "attivita") {
    h += '<div class="cardhead"><h2>Attività</h2><button class="btn sm ghost" data-new="task" data-ctx="' + k.id + '">Apri in dettaglio</button></div>';
    var radici = tk.filter(function (x) { return !x.padre_id; });
    h += '<div class="checklist">' + radici.map(function (x) { return riga(x, tk); }).join("") +
      '<form class="qadd" data-qadd="' + k.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi un\'attività e premi invio" autocomplete="off"></form></div>';
  }
  if (t === "ore") {
    h += '<p class="faint" style="margin-bottom:10px">Il registro ore è personale: qui vedi solo le tue.</p>';
    var daFatt = ore.filter(function (o) { return o.fatturabile && !o.movimento_id; });
    var valDaFatt = sum(daFatt, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); });
    h += '<div class="cardhead"><h2>Ore registrate</h2><span>' + (daFatt.length && vediCosti() ? '<button class="btn sm ghost" data-fattore="' + k.id + '">Fattura ' + num(sum(daFatt, function (o) { return o.ore; }), 1) + " h · " + eur(valDaFatt) + "</button> " : "") + '<button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">+ Registra ore</button></span></div>' + tblOre(ore);
  }
  if (t === "materiali") {
    h += '<div class="cardhead"><h2>Materiali del lavoro</h2><button class="btn sm ghost" data-new="mat" data-ctx="' + k.id + '">+ Aggiungi materiale</button></div>';
    h += '<div class="drop" id="drop" data-kid="' + k.id + '"><b>Trascina qui i file</b><span class="faint">oppure <label class="lnk">scegli dal computer<input type="file" id="fileinp" multiple style="display:none"></label> · o aggiungi un link con il pulsante qui sopra</span></div>';
    h += mt.length ? '<table><thead><tr><th>Materiale</th><th>Tipo</th><th>Fase</th><th>Visibilità</th><th>Data</th><th></th></tr></thead><tbody>' + mt.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).map(function (m) {
      var nome = m.path ? '<button class="lnk" data-file="' + m.id + '">' + esc(m.nome) + "</button>" + (m.dim ? ' <span class="faint">' + (m.dim > 1048576 ? (m.dim / 1048576).toFixed(1) + " MB" : Math.round(m.dim / 1024) + " KB") + "</span>" : "") : m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.nome) + "</a>" : esc(m.nome);
      return "<tr><td>" + nome + (m.note ? '<div class="faint">' + esc(m.note) + "</div>" : "") + '</td><td><span class="badge">' + esc(m.tipo || "—") + "</span></td><td>" + esc(m.fase_id ? nameOf(D.fasi, m.fase_id) : "—") + '</td><td><button class="lnk" data-vis="' + m.id + '">' + (m.visibile_cliente ? '<span class="badge b-blue">cliente</span>' : '<span class="badge">solo studio</span>') + '</button></td><td class="faint">' + dshort(m.created_at) + '</td><td class="num"><button class="lnk" data-edit="mat:' + m.id + '">Modifica</button></td></tr>';
    }).join("") + "</tbody></table>" : "";
  }
  if (t === "pagamenti") {
    h += '<div class="cardhead"><h2>Scadenzario pagamenti</h2><button class="btn sm ghost" data-new="pag" data-ctx="' + k.id + '">+ Nuova scadenza</button></div>';
    h += pg.length ? '<table><thead><tr><th>Voce</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th><th></th></tr></thead><tbody>' + pg.slice().sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; }).map(function (p) {
      var late = p.stato === "Da incassare" && p.scadenza && p.scadenza < today();
      return "<tr><td>" + esc(p.nome) + "</td><td>" + (late ? '<span class="badge b-red">' + dt(p.scadenza) + "</span>" : dt(p.scadenza)) + '</td><td class="num">' + eur(p.importo) + '</td><td><span class="badge ' + (p.stato === "Incassato" ? "b-green" : "b-amber") + '">' + esc(p.stato) + '</span></td><td class="num">' + (fattDi(p.id) ? '<span class="badge b-blue">' + esc(fattDi(p.id).numero || "fattura") + "</span> " : '<button class="lnk" data-fattpag="' + p.id + '">Genera fattura</button> ') + (p.stato !== "Incassato" ? '<button class="lnk" data-incassa="' + p.id + '">Incassato</button> ' : "") + '<button class="lnk" data-edit="pag:' + p.id + '">Modifica</button></td></tr>';
    }).join("") + '</tbody><tfoot><tr><td colspan="2"><b>Totale piano</b></td><td class="num"><b>' + eur(sum(pg, function (p) { return p.importo; })) + "</b></td><td colspan=\"2\"></td></tr></tfoot></table>" : vuoto("Nessun piano di pagamento.", '<button class="lnk" data-new="pag" data-ctx="' + k.id + '">Crea acconto e saldo</button>');
  }
  if (t === "approvazioni") {
    h += '<div class="cardhead"><h2>Approvazioni del cliente</h2><button class="btn sm ghost" data-new="appr" data-ctx="' + k.id + '">+ Chiedi approvazione</button></div>';
    h += ap.length ? '<table><thead><tr><th>Cosa</th><th>Fase</th><th>Richiesta</th><th>Risposta</th><th>Esito</th></tr></thead><tbody>' + ap.slice().sort(function (a, b) { return a.richiesta_il < b.richiesta_il ? 1 : -1; }).map(function (a) {
      return "<tr><td>" + esc(a.tipo) + (a.note ? '<div class="faint">' + esc(a.note) + "</div>" : "") + "</td><td>" + esc(a.fase_id ? nameOf(D.fasi, a.fase_id) : "—") + "</td><td>" + dt(a.richiesta_il) + "</td><td>" + dt(a.risposto_il) + '</td><td><span class="badge ' + (APPR_COL[a.stato] || "") + '">' + esc(a.stato) + "</span></td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Nessuna approvazione richiesta.", '<button class="lnk" data-new="appr" data-ctx="' + k.id + '">Chiedi la prima</button>');
  }
  if (t === "varianti") {
    h += '<div class="cardhead"><h2>Varianti e lavori extra</h2><button class="btn sm ghost" data-new="vari" data-ctx="' + k.id + '">+ Nuova variante</button></div>';
    h += '<p class="faint" style="margin-bottom:12px">Ogni richiesta fuori preventivo si registra qui: quando è approvata entra nel valore del lavoro e nel budget ore, così il margine resta vero.</p>';
    h += vr.length ? '<table><thead><tr><th>Variante</th><th>Data</th><th class="num">Importo</th><th class="num">Ore</th><th>Stato</th><th></th></tr></thead><tbody>' + vr.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (v) {
      return "<tr><td><b>" + esc(v.nome) + "</b>" + (v.descrizione ? '<div class="faint">' + esc(v.descrizione) + "</div>" : "") + "</td><td>" + dt(v.data) + '</td><td class="num">' + eur(v.importo) + '</td><td class="num">' + num(v.ore, 0) + '</td><td><span class="badge ' + (v.stato === "Approvata" ? "b-green" : v.stato === "Rifiutata" ? "b-red" : "b-amber") + '">' + esc(v.stato) + '</span></td><td class="num">' + (v.stato === "Proposta" ? '<button class="lnk" data-appr-var="' + v.id + '">Approva</button> ' : "") + '<button class="lnk" data-edit="vari:' + v.id + '">Modifica</button></td></tr>';
    }).join("") + '</tbody><tfoot><tr><td colspan="2"><b>Approvate</b></td><td class="num"><b>' + eur(b.extra) + '</b></td><td class="num"><b>' + num(sum(vr.filter(function (v) { return v.stato === "Approvata"; }), function (v) { return v.ore; }), 0) + "</b></td><td colspan=\"2\"></td></tr></tfoot></table>" : vuoto("Nessuna variante: il lavoro è ancora quello concordato.", '<button class="lnk" data-new="vari" data-ctx="' + k.id + '">Registra un extra</button>');
  }
  if (t === "log") {
    var evs = evOf(k.id);
    h += '<div class="cardhead"><h2>Diario del lavoro</h2><button class="btn sm ghost" data-new="ev" data-ctx="' + k.id + '">+ Aggiungi nota</button></div>';
    h += evs.length ? '<ul class="timeline">' + evs.map(function (e) {
      return "<li>" + esc(e.testo) + '<div class="when">' + dt(e.created_at) + " · " + esc(e.pro_id ? nameOf(D.pros, e.pro_id) : "sistema") + "</div></li>";
    }).join("") + "</ul>" : vuoto("Nessun evento registrato.");
  }
  h += "</div></div><div>";
  h += '<div class="card"><h3 style="margin-bottom:14px">Scheda</h3>' +
    qcampo("com", k.id, "stato", "Stato", qsel("com", k.id, "stato", sel(STATI, k.stato || "Bozza"))) +
    qcampo("com", k.id, "cliente_id", "Cliente", qsel("com", k.id, "cliente_id", opt(D.cli, k.cliente_id))) +
    '<div class="row2">' +
      qcampo("com", k.id, "inizio", "Inizio", qinput("com", k.id, "inizio", "date", k.inizio)) +
      qcampo("com", k.id, "scadenza", "Consegna", qinput("com", k.id, "scadenza", "date", k.scadenza)) +
    "</div>" +
    '<div class="row2">' +
      qcampo("com", k.id, "probabilita", "Probabilità (%)", qinput("com", k.id, "probabilita", "number", k.probabilita == null ? 50 : k.probabilita, ' step="5" min="0" max="100"')) +
      qcampo("com", k.id, "owner_id", "Chi lo segue", qsel("com", k.id, "owner_id", opt(D.pros, k.owner_id))) +
    "</div>" +
    '<table><tbody>' +
    row2("Cliente", '<button class="lnk" data-open-cli="' + k.cliente_id + '">' + esc(nameOf(D.cli, k.cliente_id)) + "</button>") +
    (k.pr_id ? row2("Portato da", esc(nameOf(D.pros, k.pr_id))) : "") +
    row2("Fatturazione", "Ognuno fattura la sua parte al cliente") +
    row2("Note", esc(k.note || "—")) + "</tbody></table>" +
    '<div style="margin-top:12px"><button class="btn sm ghost" data-edit="com:' + k.id + '">Apri il modulo completo</button></div></div>';

  h += '<div class="card"><h3 style="margin-bottom:12px">Economics</h3><table><tbody>' +
    row2("Imponibile servizi", eur(c.imp)) +
    (b.extra ? row2("Varianti approvate", eur(b.extra)) : "") +
    row2("<b>Valore del lavoro</b>", "<b>" + eur(b.ricavo) + "</b>") +
    (vediCosti() ? row2("Costo pianificato", eur(b.costoPian)) + row2("Costo reale (ore)", eur(b.costoReale)) +
      row2("Margine pianificato", eur(b.margPian) + ' <span class="faint">(' + (b.ricavo ? Math.round(b.margPian / b.ricavo * 100) : 0) + "%)</span>") +
      row2("<b>Margine atteso</b>", "<b>" + eur(b.margReale) + "</b>" + ' <span class="faint">(' + (b.ricavo ? Math.round(b.margReale / b.ricavo * 100) : 0) + "%)</span>") : "") +

    (me.pro_id ? row2("Il mio compenso", eur(c.mio)) : "") +
    row2("Ore stimate / fatte", num(b.oreStim, 0) + " h / " + num(b.oreFatte, 1) + " h") +
    (b.oreFatte ? row2("€/h reale sul valore", eur(b.ricavo / b.oreFatte)) : "") +
    (k.tipo_prezzo === "Retainer" && k.retainer_mensile ? row2("Retainer mensile", eur(k.retainer_mensile)) : "") +
    "</tbody></table></div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Chi ci lavora</h3>';
  var perPro = {};
  righeOf(k.id).forEach(function (r) { var s = by(D.serv, r.serv_id); var pid = r.assegnato_id || (s && s.pro_id); if (pid) perPro[pid] = (perPro[pid] || 0) + (+r.ore_stimate || 0); });
  ore.forEach(function (o) { if (o.pro_id && perPro[o.pro_id] == null) perPro[o.pro_id] = 0; });
  var pk = Object.keys(perPro);
  h += pk.length ? '<div class="bars">' + pk.map(function (pid) {
    var reali = sum(ore.filter(function (o) { return o.pro_id === pid; }), function (o) { return o.ore; });
    return bar(nameOf(D.pros, pid), reali, Math.max(1, perPro[pid], reali), num(reali, 1) + " / " + num(perPro[pid], 0) + " h");
  }).join("") + "</div>" : vuoto("Nessuno assegnato.");
  return h + "</div></div></div>";
}
/* ---------------- attività ---------------- */
function riga(x, tutte, liv) {
  var figli = tutte.filter(function (y) { return y.padre_id === x.id; });
  var fatto = x.stato === "Fatto";
  var late = x.scadenza && x.scadenza < today() && !fatto;
  var h = '<div class="cri" style="padding-left:' + ((liv || 0) * 26) + 'px">' +
    '<button class="ck' + (fatto ? " on" : "") + '" data-tck="' + x.id + '"></button>' +
    '<span class="ctxt' + (fatto ? " done" : "") + '" data-open-task="' + x.id + '">' + esc(x.titolo) + "</span>" +
    '<span class="cmeta">' + (x.scadenza ? '<span class="badge ' + (late ? "b-red" : "") + '">' + dshort(x.scadenza) + "</span>" : "") +
    (x.assegnato_id ? avatar(x.assegnato_id, 22) : "") +
    '<button class="lnk mini" data-sub="' + x.id + '">+ sotto</button></span></div>';
  h += figli.map(function (f) { return riga(f, tutte, (liv || 0) + 1); }).join("");
  return h;
}
function kanban(list) {
  var h = '<div class="kanban">';
  TASK_STATI.forEach(function (s) {
    var items = list.filter(function (t) { return t.stato === s; });
    h += '<div class="kcol" data-stato="' + s + '"><h3>' + s + "<span>" + items.length + "</span></h3>";
    items.forEach(function (t) {
      var late = t.scadenza && t.scadenza < today() && t.stato !== "Fatto";
      h += '<div class="tsk" draggable="true" data-open-task="' + t.id + '">' +
        '<div class="tsktop">' + esc(t.titolo) + (t.assegnato_id ? avatar(t.assegnato_id, 22) : "") + "</div>" +
        '<div class="meta"><span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita || "Media") + "</span><span>" + (t.scadenza ? (late ? '<span class="badge b-red">' + dshort(t.scadenza) + "</span>" : dshort(t.scadenza)) : "") + "</span></div>" +
        (t.commessa_id ? '<div class="meta"><span class="faint">' + esc(nameOf(D.com, t.commessa_id, "titolo")) + "</span></div>" : "") + "</div>";
    });
    h += '<div class="kdrop">rilascia qui</div></div>';
  });
  return h + '</div><p class="faint" style="margin-top:12px">Trascina un\'attività da una colonna all\'altra per cambiarle stato.</p>';
}
/* ---------------- attività: viste, filtri, raggruppamenti ---------------- */
var TF = { stato: "aperte", pro: "", prog: "", prio: "", cerca: "", scadute: false };
var TGROUP = "progetto", TSORT = "scadenza";

function taskFiltrate() {
  var l = ftask();
  if (TF.stato === "aperte") l = l.filter(function (t) { return t.stato !== "Fatto"; });
  else if (TF.stato === "fatte") l = l.filter(function (t) { return t.stato === "Fatto"; });
  if (TF.pro) l = l.filter(function (t) { return t.assegnato_id === (TF.pro === "io" ? me.pro_id : TF.pro); });
  if (TF.prog) l = l.filter(function (t) { return t.progetto_id === TF.prog; });
  if (TF.prio) l = l.filter(function (t) { return (t.priorita || "Media") === TF.prio; });
  if (TF.scadute) l = l.filter(function (t) { return t.scadenza && t.scadenza < today() && t.stato !== "Fatto"; });
  if (TF.cerca) {
    var q = TF.cerca.toLowerCase();
    l = l.filter(function (t) { return (t.titolo + " " + (t.descrizione || "") + " " + (t.etichette || "")).toLowerCase().indexOf(q) > -1; });
  }
  return l.slice().sort(ordinaTask);
}
function ordinaTask(a, b) {
  if (TSORT === "scadenza") return (a.scadenza || "9999-99") < (b.scadenza || "9999-99") ? -1 : 1;
  if (TSORT === "priorita") { var P = { Alta: 0, Media: 1, Bassa: 2 }; return (P[a.priorita] == null ? 1 : P[a.priorita]) - (P[b.priorita] == null ? 1 : P[b.priorita]); }
  if (TSORT === "titolo") return (a.titolo || "").localeCompare(b.titolo || "");
  return (a.ordine || 0) - (b.ordine || 0) || ((a.created_at || "") < (b.created_at || "") ? -1 : 1);
}
function chiaveGruppo(t) {
  if (TGROUP === "progetto") return t.progetto_id ? nameOf(D.prog, t.progetto_id) : t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") : "Senza progetto";
  if (TGROUP === "stato") return t.stato || "Da fare";
  if (TGROUP === "persona") return t.assegnato_id ? nameOf(D.pros, t.assegnato_id) : "Non assegnata";
  if (TGROUP === "priorita") return t.priorita || "Media";
  if (TGROUP === "scadenza") {
    if (!t.scadenza) return "Senza data";
    if (t.scadenza < today()) return "In ritardo";
    if (t.scadenza === today()) return "Oggi";
    if (t.scadenza <= iso(new Date(Date.now() + 7 * 86400000))) return "Questa settimana";
    return "Più avanti";
  }
  if (TGROUP === "sezione") return t.sezione || "Senza sezione";
  return "Tutte";
}
function barraTask(vista) {
  var opts = function (list, val) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (val === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); };
  var progetti = [["", "Tutti i progetti"]].concat(progVisibili().map(function (p) { return [p.id, p.nome]; }));
  var persone = [["", "Chiunque"], ["io", "Assegnate a me"]].concat(D.pros.map(function (p) { return [p.id, p.nome]; }));
  return '<div class="vbar">' +
    '<div class="vtabs">' + [["lista", "Lista"], ["bacheca", "Bacheca"], ["calendario", "Calendario"], ["timeline", "Timeline"], ["mie", "Le mie cose"]].map(function (v) {
      return '<button data-route="task|-|' + v[0] + '" class="' + (vista === v[0] ? "on" : "") + '">' + v[1] + "</button>";
    }).join("") + "</div>" +
    '<div class="vfilt">' +
    '<input id="tcerca" placeholder="Cerca fra le attività…" value="' + esc(TF.cerca) + '">' +
    '<select data-tf="stato">' + opts([["aperte", "Aperte"], ["tutte", "Tutte"], ["fatte", "Fatte"]], TF.stato) + "</select>" +
    '<select data-tf="pro">' + opts(persone, TF.pro) + "</select>" +
    '<select data-tf="prog">' + opts(progetti, TF.prog) + "</select>" +
    '<select data-tf="prio">' + opts([["", "Ogni priorità"], ["Alta", "Alta"], ["Media", "Media"], ["Bassa", "Bassa"]], TF.prio) + "</select>" +
    '<button class="chipbtn' + (TF.scadute ? " on" : "") + '" data-tf-scadute="1">Solo in ritardo</button>' +
    (vista === "lista" || vista === "bacheca" ? '<span class="vsep"></span><span class="faint">Raggruppa</span><select data-tg="1">' +
      opts([["progetto", "Progetto"], ["stato", "Stato"], ["persona", "Persona"], ["priorita", "Priorità"], ["scadenza", "Scadenza"], ["sezione", "Sezione"], ["nessuno", "Niente"]], TGROUP) + "</select>" : "") +
    (vista === "lista" ? '<span class="faint">Ordina</span><select data-ts="1">' +
      opts([["scadenza", "Scadenza"], ["priorita", "Priorità"], ["titolo", "Titolo"], ["ordine", "Manuale"]], TSORT) + "</select>" : "") +
    (D.viste.length ? '<span class="vsep"></span><select data-vista-apri="1"><option value="">Viste salvate…</option>' +
      D.viste.filter(function (v) { return v.ambito === "task"; }).map(function (v) { return '<option value="' + v.id + '">' + esc(v.nome) + "</option>"; }).join("") + "</select>" : "") +
    '<button class="lnk mini" data-vista-salva="1">Salva questa vista</button>' +
    "</div></div>";
}
function rigaTaskLista(t) {
  var fatto = t.stato === "Fatto";
  var late = t.scadenza && t.scadenza < today() && !fatto;
  var sub = D.task.filter(function (x) { return x.padre_id === t.id; });
  var subFatte = sub.filter(function (x) { return x.stato === "Fatto"; }).length;
  var bloccata = D.dip.filter(function (d) { return d.task_id === t.id; }).some(function (d) { var b = by(D.task, d.blocca_id); return b && b.stato !== "Fatto"; });
  return '<div class="trow' + (fatto ? " fatta" : "") + '">' +
    '<button class="ck' + (fatto ? " on" : "") + '" data-tck="' + t.id + '" title="Segna fatta"></button>' +
    '<button class="ttit" data-open-task="' + t.id + '">' + esc(t.titolo) +
      (sub.length ? '<span class="faint"> · ' + subFatte + "/" + sub.length + " sotto-attività</span>" : "") +
      (bloccata ? ' <span class="badge b-amber">bloccata</span>' : "") + "</button>" +
    '<span class="tmeta">' +
      (t.stimate ? '<span class="faint">' + num(t.stimate, 1) + " h</span>" : "") +
      '<span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita || "Media") + "</span>" +
      (t.scadenza ? '<span class="badge ' + (late ? "b-red" : "") + '">' + dshort(t.scadenza) + "</span>" : '<span class="faint">—</span>') +
      (t.assegnato_id ? avatar(t.assegnato_id, 22) : '<span class="av vuoto">?</span>') +
    "</span></div>";
}
function vistaLista(list) {
  if (!list.length) return '<div class="card">' + vuoto("Nessuna attività con questi filtri.", '<button class="lnk" data-tf-reset="1">Azzera i filtri</button>') + "</div>";
  if (TGROUP === "nessuno") return '<div class="card tlist">' + list.map(rigaTaskLista).join("") + "</div>";
  var g = {};
  list.forEach(function (t) { var k = chiaveGruppo(t); (g[k] = g[k] || []).push(t); });
  var ordine = Object.keys(g).sort();
  if (TGROUP === "scadenza") { var pref = ["In ritardo", "Oggi", "Questa settimana", "Più avanti", "Senza data"]; ordine = pref.filter(function (x) { return g[x]; }); }
  if (TGROUP === "stato") ordine = TASK_STATI.filter(function (x) { return g[x]; });
  if (TGROUP === "priorita") ordine = ["Alta", "Media", "Bassa"].filter(function (x) { return g[x]; });
  return ordine.map(function (k) {
    var aperte = g[k].filter(function (t) { return t.stato !== "Fatto"; }).length;
    return '<div class="card tgroup"><div class="cardhead"><h2>' + esc(k) + '</h2><span class="faint">' + aperte + " aperte su " + g[k].length + "</span></div>" +
      '<div class="tlist">' + g[k].map(rigaTaskLista).join("") + "</div></div>";
  }).join("");
}
function vistaBacheca(list) {
  var col = [], titolo = {};
  if (TGROUP === "stato" || TGROUP === "nessuno") { col = TASK_STATI; }
  else {
    var s = {};
    list.forEach(function (t) { s[chiaveGruppo(t)] = 1; });
    col = Object.keys(s).sort();
  }
  var perStato = (TGROUP === "stato" || TGROUP === "nessuno");
  var h = '<div class="kanban">';
  col.forEach(function (c) {
    var items = list.filter(function (t) { return (perStato ? (t.stato || "Da fare") : chiaveGruppo(t)) === c; });
    h += '<div class="kcol"' + (perStato ? ' data-stato="' + esc(c) + '"' : "") + '><h3>' + esc(c) + "<span>" + items.length + "</span></h3>";
    items.forEach(function (t) {
      var late = t.scadenza && t.scadenza < today() && t.stato !== "Fatto";
      h += '<div class="tsk"' + (perStato ? ' draggable="true"' : "") + ' data-open-task="' + t.id + '">' +
        '<div class="tsktop">' + esc(t.titolo) + (t.assegnato_id ? avatar(t.assegnato_id, 22) : "") + "</div>" +
        '<div class="meta"><span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita || "Media") + "</span><span>" +
        (t.scadenza ? (late ? '<span class="badge b-red">' + dshort(t.scadenza) + "</span>" : dshort(t.scadenza)) : "") + "</span></div>" +
        (t.progetto_id || t.commessa_id ? '<div class="meta"><span class="faint">' + esc(t.progetto_id ? nameOf(D.prog, t.progetto_id) : nameOf(D.com, t.commessa_id, "titolo")) + "</span></div>" : "") + "</div>";
    });
    h += perStato ? '<div class="kdrop">rilascia qui</div>' : "";
    h += "</div>";
  });
  h += "</div>";
  return '<div class="card">' + h + (perStato ? '<p class="faint" style="margin-top:12px">Trascina una scheda da una colonna all\'altra per cambiare stato.</p>' : "") + "</div>";
}
function vistaCalendarioTask(list) {
  var base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + CAL);
  var anno = base.getFullYear(), mese = base.getMonth();
  var primo = new Date(anno, mese, 1), ultimo = new Date(anno, mese + 1, 0);
  var start = new Date(primo); start.setDate(1 - ((primo.getDay() + 6) % 7));
  var celle = [];
  for (var i = 0; i < 42; i++) {
    var d = new Date(start.getTime() + i * 86400000), k = iso(d);
    var items = list.filter(function (t) { return t.scadenza === k; });
    celle.push('<div class="calday' + (d.getMonth() !== mese ? " out" : "") + (k === today() ? " today" : "") + '" data-day="' + k + '">' +
      '<div class="caltop"><span>' + d.getDate() + "</span>" + (items.length ? '<span class="calore">' + items.length + "</span>" : "") + "</div>" +
      items.slice(0, 3).map(function (t) {
        var late = t.scadenza < today() && t.stato !== "Fatto";
        return '<div class="calev ' + (t.stato === "Fatto" ? "b-green" : late ? "b-red" : PRIO_COL[t.priorita] || "b-blue") + '" data-open-task="' + t.id + '" title="' + esc(t.titolo) + '">' + esc(t.titolo) + "</div>";
      }).join("") + (items.length > 3 ? '<div class="faint" style="font-size:.72rem">+' + (items.length - 3) + " altro</div>" : "") + "</div>");
  }
  var etichettaMese = primo.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  return '<div class="card"><div class="cardhead"><h2>' + etichettaMese.charAt(0).toUpperCase() + etichettaMese.slice(1) +
    '</h2><span class="wknav"><button class="btn sm ghost" data-cal="-1">‹</button><button class="btn sm ghost" data-cal="0">Oggi</button><button class="btn sm ghost" data-cal="1">›</button></span></div>' +
    '<div class="cal"><div class="caldow">lun</div><div class="caldow">mar</div><div class="caldow">mer</div><div class="caldow">gio</div><div class="caldow">ven</div><div class="caldow">sab</div><div class="caldow">dom</div>' +
    celle.join("") + '</div><p class="faint" style="margin-top:10px">Clicca un giorno per creare un\'attività con quella scadenza.</p></div>';
}
function vistaTimeline(list) {
  var con = list.filter(function (t) { return t.scadenza || t.inizio; });
  if (!con.length) return '<div class="card">' + vuoto("Nessuna attività con date: metti un inizio o una scadenza per vederla sulla timeline.") + "</div>";
  var date = con.map(function (t) { return t.inizio || t.scadenza; }).concat(con.map(function (t) { return t.scadenza || t.inizio; })).sort();
  var da = new Date(date[0]), a = new Date(date[date.length - 1]);
  da.setDate(da.getDate() - 3); a.setDate(a.getDate() + 3);
  var giorni = Math.max(7, Math.round((a - da) / 86400000));
  var mesi = [], cur = "";
  for (var i = 0; i <= giorni; i += 7) {
    var d = new Date(da.getTime() + i * 86400000);
    var m = d.toLocaleDateString("it-IT", { month: "short" });
    mesi.push('<span style="left:' + (i / giorni * 100) + '%">' + (m !== cur ? m + " " : "") + d.getDate() + "</span>");
    cur = m;
  }
  var righe = con.slice().sort(function (x, y) { return (x.inizio || x.scadenza) < (y.inizio || y.scadenza) ? -1 : 1; }).map(function (t) {
    var i1 = new Date(t.inizio || t.scadenza), i2 = new Date(t.scadenza || t.inizio);
    var x = Math.max(0, (i1 - da) / 86400000 / giorni * 100);
    var w = Math.max(2.2, ((i2 - i1) / 86400000 + 1) / giorni * 100);
    var late = t.scadenza && t.scadenza < today() && t.stato !== "Fatto";
    return '<div class="tlrow"><div class="tlname" data-open-task="' + t.id + '">' + esc(t.titolo) + "</div>" +
      '<div class="tltrack"><button class="tlbar ' + (t.stato === "Fatto" ? "ok" : late ? "bad" : "") + '" style="left:' + x + "%;width:" + w + '%" data-open-task="' + t.id + '">' +
      esc(t.assegnato_id ? nameOf(D.pros, t.assegnato_id).split(" ")[0] : "") + "</button></div></div>";
  }).join("");
  return '<div class="card"><div class="cardhead"><h2>Timeline</h2><span class="faint">da ' + dshort(iso(da)) + " a " + dshort(iso(a)) + "</span></div>" +
    '<div class="tlhead">' + mesi.join("") + "</div>" + righe + "</div>";
}
function vistaMie(list) {
  var mie = list.filter(function (t) { return t.assegnato_id === me.pro_id && t.stato !== "Fatto"; });
  var sett = iso(new Date(Date.now() + 7 * 86400000));
  var gruppi = [
    ["oggi", "Oggi e in ritardo", mie.filter(function (t) { return t.scadenza && t.scadenza <= today(); })],
    ["settimana", "Questa settimana", mie.filter(function (t) { return t.scadenza && t.scadenza > today() && t.scadenza <= sett; })],
    ["dopo", "Più avanti", mie.filter(function (t) { return t.scadenza && t.scadenza > sett; })],
    ["senza", "Senza data", mie.filter(function (t) { return !t.scadenza; })]
  ];
  return '<div class="grid g4-1">' + gruppi.map(function (g) {
    return '<div class="card mcol" data-quando="' + g[0] + '"><div class="cardhead"><h2>' + g[1] + '</h2><span class="faint">' + g[2].length + "</span></div>" +
      '<div class="tlist">' + (g[2].length ? g[2].map(function (t) {
        return '<div class="trow" draggable="true" data-open-task="' + t.id + '">' +
          '<button class="ck" data-tck="' + t.id + '"></button>' +
          '<button class="ttit" data-open-task="' + t.id + '">' + esc(t.titolo) + "</button>" +
          '<span class="tmeta"><span class="faint">' + (t.progetto_id ? esc(nameOf(D.prog, t.progetto_id)) : t.commessa_id ? esc(nameOf(D.com, t.commessa_id, "titolo")) : "") + "</span></span></div>";
      }).join("") : vuoto("Niente qui.")) + "</div></div>";
  }).join("") + '</div><p class="faint" style="margin-top:12px">Trascina un\'attività in un\'altra colonna per spostarne la scadenza: oggi, entro la settimana, fra due settimane o nessuna data.</p>';
}
function vTask() {
  var vista = tab || "lista";
  var tutte = ftask();
  var aperte = tutte.filter(function (t) { return t.stato !== "Fatto"; });
  var late = aperte.filter(function (t) { return t.scadenza && t.scadenza < today(); });
  var list = taskFiltrate();
  var h = head("Attività", aperte.length + " aperte · " + late.length + " in ritardo · " + tutte.length + " in tutto",
    '<button class="btn sm ghost" data-modelli="1">Modelli</button><button class="btn sm" data-new="task">+ Nuova attività</button>');
  h += barraTask(vista);
  if (vista === "bacheca") h += vistaBacheca(list);
  else if (vista === "calendario") h += vistaCalendarioTask(list);
  else if (vista === "timeline") h += vistaTimeline(list);
  else if (vista === "mie") h += vistaMie(tutte);
  else h += vistaLista(list);
  return h;
}

/* Quando chiudi un'attività ricorrente ne nasce subito la prossima */
async function prossimaRicorrenza(t) {
  var giorni = t.ricorrenza === "settimanale" ? 7 : t.ricorrenza === "quindicinale" ? 14 : t.ricorrenza === "mensile" ? 30 : 0;
  if (!giorni) return;
  var base = t.scadenza ? new Date(t.scadenza) : new Date();
  var nuova = new Date(base.getTime() + giorni * 86400000);
  if (t.ricorrenza_fino && iso(nuova) > t.ricorrenza_fino) return;
  var r = await sb.from("task").insert({
    titolo: t.titolo, descrizione: t.descrizione, commessa_id: t.commessa_id, progetto_id: t.progetto_id,
    lavorazione_id: t.lavorazione_id, assegnato_id: t.assegnato_id, stato: "Da fare", priorita: t.priorita,
    scadenza: iso(nuova), stimate: t.stimate, sezione: t.sezione, etichette: t.etichette,
    ricorrenza: t.ricorrenza, ricorrenza_fino: t.ricorrenza_fino, origine_id: t.origine_id || t.id
  });
  if (!r.error) toast("Prossima occorrenza creata per il " + dt(iso(nuova)));
}

/* Modelli: una struttura di lavoro pronta da far nascere in un clic */
function apriModelli() {
  var miei = D.modelli.filter(function (m) { return m.pro_id === me.pro_id || m.condiviso; });
  modal('<div class="box wide"><h2>Modelli di lavoro</h2>' +
    '<p class="faint" style="margin-bottom:14px">Un modello è un elenco di lavorazioni e attività con le scadenze contate dal giorno di partenza. Lo applichi a un progetto e nasce tutto insieme.</p>' +
    (miei.length ? '<table><thead><tr><th>Modello</th><th>Voci</th><th>Di chi</th><th></th></tr></thead><tbody>' + miei.map(function (m) {
      return "<tr><td><b>" + esc(m.nome) + "</b>" + (m.descrizione ? '<div class="faint">' + esc(m.descrizione) + "</div>" : "") + "</td><td>" + (m.voci || []).length +
        "</td><td>" + (m.pro_id === me.pro_id ? "tuo" : esc(nameOf(D.pros, m.pro_id))) + (m.condiviso ? ' <span class="badge">condiviso</span>' : "") +
        '</td><td class="num"><button class="lnk" data-mod-usa="' + m.id + '">Applica a un progetto</button>' +
        (m.pro_id === me.pro_id ? ' · <button class="lnk" data-del="modelli:' + m.id + '">elimina</button>' : "") + "</td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Nessun modello ancora.")) +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Chiudi</button><button class="btn" data-mod-nuovo="1">Crea un modello da un progetto</button></div></div>');
}
async function creaModelloDaProgetto() {
  var pg = progVisibili();
  if (!pg.length) { toast("Non hai progetti da cui partire", true); return; }
  var elenco = pg.map(function (p, i) { return (i + 1) + ") " + p.nome; }).join("\n");
  var scelta = prompt("Da quale progetto vuoi ricavare il modello?\n" + elenco, "1");
  var p = pg[(+scelta || 1) - 1]; if (!p) return;
  var nome = prompt("Come si chiama il modello?", p.nome);
  if (!nome) return;
  var inizio = p.inizio ? new Date(p.inizio) : new Date(p.created_at || Date.now());
  var voci = [];
  lavOf(p.id).forEach(function (l) {
    voci.push({ tipo: "lavorazione", nome: l.nome, giorni: l.fine ? Math.max(0, Math.round((new Date(l.fine) - inizio) / 86400000)) : null, ore: l.ore_stimate || null });
  });
  D.task.filter(function (t) { return t.progetto_id === p.id; }).forEach(function (t) {
    voci.push({ tipo: "attivita", nome: t.titolo, giorni: t.scadenza ? Math.max(0, Math.round((new Date(t.scadenza) - inizio) / 86400000)) : null, ore: t.stimate || null, sezione: t.sezione || null, lavorazione: t.lavorazione_id ? nameOf(D.lav, t.lavorazione_id) : null });
  });
  if (!voci.length) { toast("Quel progetto non ha ancora lavorazioni o attività", true); return; }
  var r = await sb.from("modelli").insert({ pro_id: me.pro_id, nome: nome, descrizione: "Ricavato da " + p.nome, voci: voci });
  if (r.error) { toast(r.error.message, true); return; }
  await reload(["modelli"]); closeModal(); toast("Modello creato con " + voci.length + " voci"); render();
}
async function applicaModello(mid) {
  var m = by(D.modelli, mid); if (!m) return;
  var pg = progVisibili();
  if (!pg.length) { toast("Crea prima un progetto a cui applicarlo", true); return; }
  var elenco = pg.map(function (p, i) { return (i + 1) + ") " + p.nome; }).join("\n");
  var scelta = prompt("A quale progetto lo applico?\n" + elenco, "1");
  var p = pg[(+scelta || 1) - 1]; if (!p) return;
  var da = prompt("Da che giorno parte? (aaaa-mm-gg)", today());
  if (!da) return;
  var base = new Date(da);
  var mappaLav = {};
  for (var i = 0; i < (m.voci || []).length; i++) {
    var v = m.voci[i];
    var quando = v.giorni == null ? null : iso(new Date(base.getTime() + v.giorni * 86400000));
    if (v.tipo === "lavorazione") {
      var rl = await sb.from("lavorazioni").insert({ progetto_id: p.id, commessa_id: p.commessa_id, nome: v.nome, pro_id: me.pro_id, stato: "Da iniziare", ore_stimate: v.ore || 0, inizio: da, fine: quando, ordine: i + 1 }).select().single();
      if (!rl.error) mappaLav[v.nome] = rl.data.id;
    } else {
      await sb.from("task").insert({
        titolo: v.nome, commessa_id: p.commessa_id, progetto_id: p.id,
        lavorazione_id: v.lavorazione ? mappaLav[v.lavorazione] || null : null,
        assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media", scadenza: quando, stimate: v.ore || null, sezione: v.sezione || null
      });
    }
  }
  await reload(["lav", "task"]);
  closeModal(); toast("Modello applicato a " + p.nome); go("progetto", p.id, "lavorazioni");
}

/* ---------------- scheda dell'attività ---------------- */
function campoRapido(id, campo, etichetta, controllo) {
  return '<div class="qfield"><label>' + esc(etichetta) + "</label>" + controllo + "</div>";
}
function vAttivita() {
  var t = by(D.task, current);
  if (!t) return '<div class="card">Attività non trovata. <button class="lnk" data-route="task">Torna all\'elenco</button></div>';
  var sub = D.task.filter(function (x) { return x.padre_id === t.id; }).sort(ordinaTask);
  var subFatte = sub.filter(function (x) { return x.stato === "Fatto"; }).length;
  var padre = t.padre_id ? by(D.task, t.padre_id) : null;
  var prog = t.progetto_id ? by(D.prog, t.progetto_id) : null;
  var com = t.commessa_id ? by(D.com, t.commessa_id) : null;
  var comm = D.comm.filter(function (c) { return c.task_id === t.id; }).sort(function (a, b) { return (a.created_at || "") < (b.created_at || "") ? -1 : 1; });
  var files = D.mat.filter(function (m) { return m.task_id === t.id; });
  var ore = D.ore.filter(function (o) { return o.task_id === t.id; });
  var oreT = sum(ore, function (o) { return o.ore; });
  var bloccanti = D.dip.filter(function (d) { return d.task_id === t.id; }).map(function (d) { return by(D.task, d.blocca_id); }).filter(Boolean);
  var bloccate = D.dip.filter(function (d) { return d.blocca_id === t.id; }).map(function (d) { return by(D.task, d.task_id); }).filter(Boolean);
  var apre = bloccanti.filter(function (b) { return b.stato !== "Fatto"; });
  var fatto = t.stato === "Fatto";
  var late = t.scadenza && t.scadenza < today() && !fatto;
  var tm = timerMio(), attivo = tm && tm.task_id === t.id;

  var via = [["Lavoro"], ["Attività", "task"]];
  if (prog) via.push([prog.nome, "progetto", prog.id, "attivita"]);
  if (padre) via.push([padre.titolo, "attivita", padre.id, ""]);
  via.push([t.titolo]);

  var h = crumbs(via);
  h += '<div class="top"><h1 class="' + (fatto ? "done" : "") + '">' + esc(t.titolo) + '<span class="sub">' +
    (prog ? esc(prog.nome) + " · " : "") + (com ? esc(nameOf(D.cli, com.cliente_id)) : "attività personale") + "</span></h1><div class=\"tools\">" +
    '<button class="btn sm ' + (fatto ? "ghost" : "") + '" data-tck="' + t.id + '">' + (fatto ? "Riapri" : "✓ Segna fatta") + "</button>" +
    (attivo ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(tm.iniziato) + "</span></button>"
      : '<button class="btn sm ghost" data-tstart-task="' + t.id + '">▶ Timer</button>') +
    '<button class="btn sm ghost" data-new="ore" data-ctx-task="' + t.id + '">+ Ore</button>' +
    '<button class="btn sm ghost" data-dupl-task="' + t.id + '">Duplica</button>' +
    '<button class="btn sm ghost" data-edit="task:' + t.id + '">Modifica tutto</button></div></div>';

  if (apre.length) {
    h += '<div class="card" style="border-left:3px solid var(--amber);margin-bottom:16px"><b>In attesa di ' + apre.length + (apre.length === 1 ? " attività" : " attività") + "</b>" +
      '<p class="faint" style="margin-top:6px">' + apre.map(function (b) { return '<button class="lnk" data-open-task="' + b.id + '">' + esc(b.titolo) + "</button>"; }).join(" · ") + "</p></div>";
  }

  h += '<div class="grid g32"><div>';

  h += '<div class="card"><div class="cardhead"><h2>Descrizione</h2><span class="faint" id="tstat"></span></div>' +
    '<textarea id="tdesc" class="doc" placeholder="Cosa va fatto, come, con quali riferimenti. Si salva da solo.">' + esc(t.descrizione || "") + "</textarea></div>";

  h += '<div class="card"><div class="cardhead"><h2>Sotto-attività</h2><span class="faint">' + subFatte + " / " + sub.length + "</span></div>" +
    '<div class="tlist">' + sub.map(function (x) {
      var lx = x.scadenza && x.scadenza < today() && x.stato !== "Fatto";
      return '<div class="trow' + (x.stato === "Fatto" ? " fatta" : "") + '">' +
        '<button class="ck' + (x.stato === "Fatto" ? " on" : "") + '" data-tck="' + x.id + '"></button>' +
        '<button class="ttit" data-open-task="' + x.id + '">' + esc(x.titolo) + "</button>" +
        '<span class="tmeta">' + (x.scadenza ? '<span class="badge ' + (lx ? "b-red" : "") + '">' + dshort(x.scadenza) + "</span>" : "") +
        (x.assegnato_id ? avatar(x.assegnato_id, 22) : "") + "</span></div>";
    }).join("") + "</div>" +
    '<form class="qadd" data-qadd-sub="' + t.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi una sotto-attività" autocomplete="off"></form></div>';

  h += '<div class="card"><div class="cardhead"><h2>Discussione</h2><span class="faint">' + comm.length + "</span></div>";
  h += comm.length ? '<ul class="timeline">' + comm.map(function (c) {
    return "<li>" + avatar(c.pro_id, 22) + " <b>" + esc(nameOf(D.pros, c.pro_id)) + "</b> · " + esc(c.testo || "") +
      '<div class="when">' + dt(c.created_at) + "</div></li>";
  }).join("") + "</ul>" : vuoto("Nessun commento.");
  h += '<form class="qadd" data-comm-task="' + t.id + '"><input name="testo" placeholder="Scrivi un commento…" autocomplete="off"><button class="btn sm" type="submit">Invia</button></form></div>';

  h += '<div class="card"><div class="cardhead"><h2>Allegati</h2><button class="btn sm ghost" data-new="mat" data-ctx-task="' + t.id + '">+ Allega link</button></div>';
  h += files.length ? "<table><tbody>" + files.map(function (m) {
    return "<tr><td>" + (m.path ? '<button class="lnk" data-file="' + m.id + '">' + esc(m.nome) + "</button>" : m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.nome) + "</a>" : esc(m.nome)) +
      '</td><td class="faint">' + dshort(m.created_at) + '</td><td class="num"><button class="lnk" data-del="mat:' + m.id + '">elimina</button></td></tr>';
  }).join("") + "</tbody></table>" : vuoto("Nessun allegato.");
  h += '<div class="drop" id="drop" data-tid="' + t.id + '"' + (t.commessa_id ? ' data-kid="' + t.commessa_id + '"' : "") + '><b>Trascina qui i file</b><span class="faint">oppure <label class="lnk">scegli dal computer<input type="file" id="fileinp" multiple style="display:none"></label></span></div>';
  h += "</div>";

  h += "</div><div>";

  h += '<div class="card"><h3 style="margin-bottom:14px">Dettagli</h3>' +
    campoRapido(t.id, "stato", "Stato", '<select data-qset="task|stato|' + t.id + '">' + sel(TASK_STATI, t.stato || "Da fare") + "</select>") +
    campoRapido(t.id, "assegnato_id", "Assegnata a", '<select data-qset="task|assegnato_id|' + t.id + '"><option value="">— nessuno —</option>' + opt(D.pros, t.assegnato_id) + "</select>") +
    campoRapido(t.id, "priorita", "Priorità", '<select data-qset="task|priorita|' + t.id + '">' + sel(["Bassa", "Media", "Alta"], t.priorita || "Media") + "</select>") +
    '<div class="row2">' +
      campoRapido(t.id, "inizio", "Inizio", '<input type="date" data-qset="task|inizio|' + t.id + '" value="' + esc(t.inizio || "") + '">') +
      campoRapido(t.id, "scadenza", "Scadenza", '<input type="date" data-qset="task|scadenza|' + t.id + '" value="' + esc(t.scadenza || "") + '">') +
    "</div>" +
    '<div class="row2">' +
      campoRapido(t.id, "stimate", "Ore stimate", '<input type="number" step="0.5" data-qset="task|stimate|' + t.id + '" value="' + (t.stimate == null ? "" : t.stimate) + '">') +
      campoRapido(t.id, "etichette", "Etichette", '<input type="text" data-qset="task|etichette|' + t.id + '" value="' + esc(t.etichette || "") + '" placeholder="urgente, cliente">') +
    "</div>" +
    campoRapido(t.id, "progetto_id", "Progetto", '<select data-qset="task|progetto_id|' + t.id + '"><option value="">— nessuno —</option>' +
      progVisibili().map(function (p) { return '<option value="' + p.id + '"' + (t.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + " · " + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</option>"; }).join("") + "</select>") +
    campoRapido(t.id, "lavorazione_id", "Lavorazione", '<select data-qset="task|lavorazione_id|' + t.id + '"><option value="">— nessuna —</option>' +
      D.lav.filter(function (l) { return !t.progetto_id || l.progetto_id === t.progetto_id; }).map(function (l) { return '<option value="' + l.id + '"' + (t.lavorazione_id === l.id ? " selected" : "") + ">" + esc(l.nome) + "</option>"; }).join("") + "</select>") +
    campoRapido(t.id, "sezione", "Sezione", '<input type="text" data-qset="task|sezione|' + t.id + '" value="' + esc(t.sezione || "") + '" placeholder="es. Prima consegna">') +
    campoRapido(t.id, "ricorrenza", "Si ripete", '<select data-qset="task|ricorrenza|' + t.id + '">' +
      selKV([["", "no, una volta sola"], ["settimanale", "ogni settimana"], ["quindicinale", "ogni due settimane"], ["mensile", "ogni mese"]], t.ricorrenza || "") + "</select>") +
    (t.ricorrenza ? '<p class="faint">Quando la segni fatta, ne nasce subito la prossima con la scadenza spostata in avanti.</p>' : "") +
    "</div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Tempo</h3><table><tbody>' +
    row2("Stimate", t.stimate ? num(t.stimate, 1) + " h" : "—") +
    row2("Registrate da te", num(oreT, 1) + " h") +
    row2("Scostamento", t.stimate ? (oreT > t.stimate ? '<span class="badge b-red">+' + num(oreT - t.stimate, 1) + " h</span>" : '<span class="badge b-green">' + num(t.stimate - oreT, 1) + " h residue</span>") : "—") +
    "</tbody></table>" + (ore.length ? tblOre(ore.slice(0, 6)) : "") + "</div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Dipendenze</h3>' +
    '<p class="faint" style="margin-bottom:8px">Bloccata da</p>' +
    (bloccanti.length ? '<div class="tlist">' + bloccanti.map(function (b) {
      return '<div class="trow"><span class="badge ' + (b.stato === "Fatto" ? "b-green" : "b-amber") + '">' + esc(b.stato) + '</span><button class="ttit" data-open-task="' + b.id + '">' + esc(b.titolo) + '</button><button class="lnk mini" data-dip-via="' + t.id + "|" + b.id + '">togli</button></div>';
    }).join("") + "</div>" : '<p class="faint">Niente.</p>') +
    '<form class="qadd" data-dip-add="' + t.id + '"><select name="blocca"><option value="">Aggiungi un blocco…</option>' +
      ftask().filter(function (x) { return x.id !== t.id && !bloccanti.some(function (b) { return b.id === x.id; }); }).slice(0, 60)
        .map(function (x) { return '<option value="' + x.id + '">' + esc(x.titolo) + "</option>"; }).join("") + '</select><button class="btn sm" type="submit">Aggiungi</button></form>' +
    (bloccate.length ? '<p class="faint" style="margin:12px 0 6px">Blocca</p><div class="tlist">' + bloccate.map(function (b) {
      return '<div class="trow"><button class="ttit" data-open-task="' + b.id + '">' + esc(b.titolo) + "</button></div>";
    }).join("") + "</div>" : "") + "</div>";

  return h + "</div></div>";
}

/* ---------------- ore ---------------- */
function tblOre(list) {
  if (!list.length) return vuoto("Nessuna ora registrata.", '<button class="lnk" data-new="ore">Registra le prime</button>');
  var h = '<table><thead><tr><th>Data</th><th>Chi</th><th>Preventivo</th><th>Descrizione</th><th class="num">Ore</th><th class="num">Valore</th><th></th></tr></thead><tbody>';
  list.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).forEach(function (o) {
    h += "<tr><td>" + dt(o.data) + "</td><td>" + esc(nameOf(D.pros, o.pro_id)) + "</td><td>" + esc(o.commessa_id ? nameOf(D.com, o.commessa_id, "titolo") : "—") + "</td><td>" + esc(o.descrizione || "—") + (o.fatturabile ? "" : ' <span class="badge">non fatturabile</span>') + '</td><td class="num">' + num(o.ore, 1) + '</td><td class="num">' + eur((+o.ore || 0) * (+o.tariffa || 0)) + '</td><td class="num"><button class="lnk" data-edit="ore:' + o.id + '">Modifica</button></td></tr>';
  });
  return h + "</tbody></table>";
}
function vOre() {
  var list = fore();
  var d = new Date(), m0 = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  var mese = list.filter(function (o) { return o.data >= m0; });
  var sett = list.filter(function (o) { return days(today(), o.data) < 7 && days(today(), o.data) >= 0; });
  var fatt = mese.filter(function (o) { return o.fatturabile; });
  var totMese = sum(mese, function (o) { return o.ore; });
  var h = head("Ore & timesheet", "Il tuo registro ore: lo vedi solo tu, serve a te per tararti e per i clienti gestiti a ore", '<button class="btn sm" data-new="ore">+ Registra ore</button>');
  h += '<div class="grid g4">' +
    kpi(num(totMese, 1) + " h", "Questo mese", num(sum(sett, function (o) { return o.ore; }), 1) + " h negli ultimi 7 giorni") +
    kpi(num(sum(fatt, function (o) { return o.ore; }), 1) + " h", "Fatturabili", totMese ? Math.round(sum(fatt, function (o) { return o.ore; }) / totMese * 100) + "% del totale" : "—") +
    kpi(eur(sum(fatt, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); })), "Valore del mese", "alle tariffe orarie") +
    kpi(num(sum(list, function (o) { return o.ore; }), 1) + " h", "Totale storico", list.length + " registrazioni") + "</div>";
  var lun = lunedi(WEEK), gg = [], nomi = [];
  for (var gi = 0; gi < 7; gi++) {
    var dd = new Date(lun.getTime() + gi * 86400000);
    gg.push(iso(dd));
    nomi.push(dd.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "") + " " + dd.getDate());
  }
  var mieOre = D.ore.filter(function (o) { return o.pro_id === me.pro_id; });
  var settPrec = gg.map(function (g) { return iso(new Date(new Date(g).getTime() - 7 * 86400000)); });
  var righeTs = D.lav.filter(function (l) {
    if (TSEXTRA.indexOf(l.id) > -1) return true;
    if (mieOre.some(function (o) { return o.lavorazione_id === l.id && gg.indexOf(o.data) > -1; })) return true;
    if (l.stato === "Completata") return false;
    if (l.pro_id === me.pro_id) return true;
    /* righe suggerite: dove hai messo ore nelle ultime due settimane */
    return mieOre.some(function (o) { return o.lavorazione_id === l.id && days(today(), o.data) <= 14 && days(today(), o.data) >= 0; });
  });
  function cella(lid, g) { return sum(mieOre.filter(function (o) { return o.lavorazione_id === lid && o.data === g; }), function (o) { return o.ore; }); }
  var titSett = lun.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + " → " + new Date(lun.getTime() + 6 * 86400000).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

  var oreSettPrec = sum(mieOre.filter(function (o) { return settPrec.indexOf(o.data) > -1; }), function (o) { return o.ore; });
  h += '<div class="card" style="margin-top:18px"><div class="cardhead"><h2>La mia settimana</h2><div class="wknav"><button class="btn sm ghost" data-wk="-1">‹</button><span class="faint">' + titSett + '</span><button class="btn sm ghost" data-wk="1">›</button>' + (WEEK ? '<button class="btn sm ghost" data-wk="0">Oggi</button>' : "") +
    (oreSettPrec ? '<button class="btn sm ghost" data-tscopy="1" title="Ricrea le stesse righe e le stesse ore della settimana precedente">Copia settimana scorsa</button>' : "") + "</div></div>";
  h += '<p class="faint" style="margin-bottom:12px">Scrivi le ore nelle caselle: si salvano da sole. Ti muovi con le frecce, <b>Invio</b> scende di una riga, <b>Tab</b> passa al giorno dopo.</p>';
  h += '<div class="tswrap"><table class="ts"><thead><tr><th>Lavorazione</th>' + nomi.map(function (n, i) { return '<th class="num' + (gg[i] === today() ? " oggi" : "") + '">' + n + "</th>"; }).join("") + '<th class="num">Tot</th><th class="num">Stima</th></tr></thead><tbody>';
  righeTs.forEach(function (l, ri) {
    var tot = 0;
    var fatteL = sum(oreOfLav(l.id), function (o) { return o.ore; });
    var res = l.ore_stimate ? Math.max(0, (+l.ore_stimate || 0) - fatteL) : null;
    h += "<tr><td>" + esc(l.nome) + '<div class="faint">' + esc(nameOf(D.prog, l.progetto_id)) + " · " + esc(nameOf(D.com, l.commessa_id, "titolo")) + "</div></td>";
    gg.forEach(function (g, ci) {
      var v = cella(l.id, g); tot += v;
      h += '<td class="num"><input class="tsc' + (g === today() ? " oggi" : "") + '" inputmode="decimal" data-ts="' + l.id + "|" + g + '" data-rc="' + ri + "|" + ci + '" value="' + (v ? num(v, 1) : "") + '" placeholder="·"></td>';
    });
    h += '<td class="num tsr" data-tsrow="' + l.id + '">' + (tot ? num(tot, 1) : "—") + "</td>" +
      '<td class="num faint">' + (l.ore_stimate ? num(fatteL, 1) + " / " + num(l.ore_stimate, 0) + (res === 0 ? ' <span class="badge b-red">finite</span>' : "") : "—") + "</td></tr>";
  });
  h += '</tbody><tfoot><tr><td><b>Totale</b></td>' + gg.map(function (g) {
    var t2 = sum(mieOre.filter(function (o) { return o.data === g; }), function (o) { return o.ore; });
    return '<td class="num" data-tscol="' + g + '"><b>' + (t2 ? num(t2, 1) : "—") + "</b></td>";
  }).join("") + '<td class="num" id="tstot"><b>' + num(sum(mieOre.filter(function (o) { return gg.indexOf(o.data) > -1; }), function (o) { return o.ore; }), 1) + "</b></td><td></td></tr></tfoot></table></div>";
  var candidate = D.lav.filter(function (l) { return righeTs.indexOf(l) === -1; });
  if (candidate.length) {
    h += '<form class="qadd" data-tsadd="1" style="margin-top:12px"><select name="lav"><option value="">Aggiungi una riga…</option>' +
      candidate.map(function (l) { return '<option value="' + l.id + '">' + esc(l.nome) + " · " + esc(nameOf(D.prog, l.progetto_id)) + "</option>"; }).join("") +
      '</select><button class="btn sm ghost" type="submit">Aggiungi</button></form>';
  }
  h += "</div>";

  /* ore fatturabili non ancora messe in fattura */
  var daFatt = {};
  mieOre.filter(function (o) { return o.fatturabile !== false && !o.movimento_id && o.commessa_id; }).forEach(function (o) {
    var e = daFatt[o.commessa_id] = daFatt[o.commessa_id] || { ore: 0, val: 0 };
    e.ore += (+o.ore || 0); e.val += (+o.ore || 0) * (+o.tariffa || 0);
  });
  var dfk = Object.keys(daFatt).filter(function (k) { return daFatt[k].ore > 0; });
  if (dfk.length) {
    h += '<div class="card" style="margin-top:16px"><div class="cardhead"><h2>Ore da fatturare</h2><span class="faint">' +
      num(sum(dfk.map(function (k) { return daFatt[k]; }), function (x) { return x.ore; }), 1) + " h · " + eur(sum(dfk.map(function (k) { return daFatt[k]; }), function (x) { return x.val; })) + "</span></div>" +
      '<table><thead><tr><th>Preventivo</th><th>Cliente</th><th class="num">Ore</th><th class="num">Valore</th><th class="num"></th></tr></thead><tbody>' +
      dfk.map(function (k) {
        var kk = by(D.com, k);
        return '<tr><td><button class="lnk" data-open-com="' + k + '">' + esc(nameOf(D.com, k, "titolo")) + "</button></td><td>" + esc(kk ? nameOf(D.cli, kk.cliente_id) : "—") +
          '</td><td class="num">' + num(daFatt[k].ore, 1) + '</td><td class="num">' + eur(daFatt[k].val) + '</td><td class="num"><button class="lnk" data-fattore="' + k + '">Genera fattura</button></td></tr>';
      }).join("") + '</tbody></table><p class="faint" style="margin-top:10px">Genera una fattura da queste ore: le righe usate restano collegate al movimento e spariscono da qui.</p></div>';
  }

  h += '<div class="grid g32" style="margin-top:18px"><div class="card"><div class="cardhead"><h2>Ritmo delle ultime 12 settimane</h2><span class="faint">ogni quadratino è un giorno</span></div>' + heatOre(list) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Andamento</h2><span class="faint">8 settimane</span></div>' + spark(settimane(list, 8)) + "</div></div>";

  var per = {}; list.forEach(function (o) { if (o.commessa_id) per[o.commessa_id] = (per[o.commessa_id] || 0) + (+o.ore || 0); });
  var pk = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; });
  h += '<div class="card" style="margin-top:16px"><div class="cardhead"><h2>Le tue ore per lavoro</h2></div>';
  h += pk.length ? '<div class="bars">' + pk.slice(0, 8).map(function (id) { return bar(nameOf(D.com, id, "titolo"), per[id], per[pk[0]], num(per[id], 1) + " h"); }).join("") + "</div>" : vuoto("—");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Registrazioni</h2></div>' + tblOre(list.slice(0, 60)) + "</div>";
  return h;
}

/* ---------------- quadro amministrativo ---------------- */
function vAmm() {
  var com = fcom(), cli = fcli(), mov = fmov();
  var d = new Date(), anno = d.getFullYear();
  var aperte = com.filter(function (k) { return ["Preventivo", "Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; });
  var inviati = com.filter(function (k) { return k.stato === "Preventivo"; });
  var vinti = com.filter(function (k) { return ["Approvata", "In corso", "Consegna", "Chiusa"].indexOf(k.stato) > -1; });
  var persi = com.filter(function (k) { return k.stato === "Persa"; });
  var tassoVinc = (vinti.length + persi.length) ? Math.round(vinti.length / (vinti.length + persi.length) * 100) : null;
  var fatturato = sum(mov.filter(function (m) { return m.tipo === "Attiva" && String(m.data || "").slice(0, 4) === String(anno); }), function (m) { return m.importo; });
  var daIncassare = sum(mov.filter(function (m) { return m.tipo === "Attiva" && m.stato !== "Pagata"; }), function (m) { return m.importo; });
  var scadute = mov.filter(function (m) { return m.tipo === "Attiva" && m.stato !== "Pagata" && m.scadenza && m.scadenza < today(); });
  var pagAperti = D.pag.filter(function (p) { return p.stato === "Da incassare" && can(p.commessa_id); });
  var h = head("Quadro amministrativo", "Clienti, preventivi e denaro: il tuo, solo il tuo",
    '<button class="btn sm ghost" data-new="cli">+ Cliente</button><button class="btn sm" data-new="com">+ Preventivo</button>');
  h += '<div class="grid g4">' +
    kpi(eur(fatturato), "Fatturato " + anno, mov.filter(function (m) { return m.tipo === "Attiva"; }).length + " fatture emesse") +
    kpi(eur(daIncassare), "Da incassare", scadute.length ? scadute.length + " già scadute" : "nessuna scaduta") +
    kpi(eur(sum(aperte, function (k) { return calc(k).tot; })), "Pipeline aperta", aperte.length + " preventivi in gioco") +
    kpi(tassoVinc == null ? "—" : tassoVinc + " %", "Preventivi vinti", vinti.length + " vinti · " + persi.length + " persi") + "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Da incassare</h2><button class="btn sm ghost" data-go="fatture">Tutte le fatture</button></div>';
  var apertiMov = mov.filter(function (m) { return m.tipo === "Attiva" && m.stato !== "Pagata"; }).sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; });
  h += apertiMov.length ? '<table><thead><tr><th>Numero</th><th>Cliente</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th></tr></thead><tbody>' +
    apertiMov.slice(0, 10).map(function (m) {
      var late = m.scadenza && m.scadenza < today();
      return "<tr><td>" + esc(m.numero || "—") + "</td><td>" + esc(nameOf(D.cli, m.cliente_id)) + "</td><td>" + (late ? '<span class="badge b-red">' + dt(m.scadenza) + "</span>" : dt(m.scadenza)) + '</td><td class="num">' + eur(m.importo) + '</td><td><span class="badge ' + (m.stato === "Pagata" ? "b-green" : "b-amber") + '">' + esc(m.stato) + "</span></td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Niente da incassare.");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Preventivi da seguire</h2><button class="btn sm ghost" data-go="commesse">Tutti</button></div>';
  h += inviati.length ? '<div class="checklist">' + inviati.map(function (k) {
    var g = days(today(), k.created_at ? String(k.created_at).slice(0, 10) : today());
    return '<div class="cri"><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button><span class=\"faint\"> · " + esc(nameOf(D.cli, k.cliente_id)) + " · " + eur(calc(k).tot) + (g > 7 ? ' · <b class="neg">inviato ' + g + " giorni fa</b>" : "") + "</span></div>";
  }).join("") + "</div>" : vuoto("Nessun preventivo in attesa di risposta.");
  h += "</div></div><div>";
  h += '<div class="card"><div class="cardhead"><h2>Scadenze di pagamento</h2></div>';
  h += pagAperti.length ? '<ul class="timeline">' + pagAperti.slice().sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; }).slice(0, 8).map(function (p) {
    return "<li><b>" + eur(p.importo) + "</b> · " + esc(p.nome) + '<div class="faint">' + esc(nameOf(D.com, p.commessa_id, "titolo")) + " · " + dt(p.scadenza) + "</div></li>";
  }).join("") + "</ul>" : vuoto("Nessuna scadenza aperta.");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>I tuoi clienti</h2><button class="btn sm ghost" data-go="clienti">Vedi tutti</button></div>';
  h += cli.length ? '<div class="checklist">' + cli.slice(0, 8).map(function (c) {
    return '<div class="cri"><button class="lnk" data-open-cli="' + c.id + '">' + esc(c.nome) + '</button><span class="faint"> · ' + eur(valoreCliente(c.id)) + "</span></div>";
  }).join("") + "</div>" : vuoto("Nessun cliente ancora.");
  h += "</div></div></div>";
  return h;
}

/* ---------------- profilo personale ---------------- */
function vProfilo() {
  var p = me.pro_id ? by(D.pros, me.pro_id) : null;
  if (!p) return '<div class="card">' + vuoto("Il tuo utente non è collegato a nessuna scheda del pool.") + "</div>";
  current = p.id;
  return vPro();
}

/* ---------------- bacheca dello studio ---------------- */
function vStudio() {
  var h = head("Bacheca dello studio", "Quello che condividiamo davvero: persone, competenze, fornitori, spazi");
  var attivi = D.pros.filter(function (x) { return x.vetting !== "Sospeso"; });
  var conServizi = D.pros.filter(function (x) { return D.serv.some(function (s) { return s.pro_id === x.id; }); });
  h += '<div class="grid g4">' +
    kpi(String(attivi.length), "Professionisti", conServizi.length + " con servizi a listino") +
    kpi(String(D.serv.filter(function (s) { return s.attivo !== false; }).length), "Servizi disponibili", "da usare nei tuoi preventivi") +
    kpi(String(D.forn.length), "Fornitori segnalati", "consigliati dai colleghi") +
    kpi(String((STATS && STATS.categorie) || 0), "Categorie coperte", "competenze diverse nello studio") + "</div>";
  h += '<div class="card" style="background:var(--cream);margin-top:16px"><div class="cardhead"><h2>Cosa resta tuo</h2><span class="badge">applicato dal database</span></div>' +
    '<p class="faint">Clienti, preventivi, fatture, ore e tariffe sono dentro il tuo spazio: nessun collega li vede, nemmeno chi cura le aree comuni. ' +
    'Un collega entra solo nel singolo lavoro in cui lo coinvolgi, e vede quel lavoro, non il resto del tuo studio. Qui sopra c\'è tutto ciò che invece è di tutti.</p></div>';

  h += '<div class="grid g32" style="margin-top:18px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Cosa sanno fare i colleghi</h2><button class="btn sm ghost" data-go="servizi">Vai al listino</button></div>';
  var cats = {};
  D.serv.filter(function (s) { return s.attivo !== false && s.pro_id !== me.pro_id; }).forEach(function (s) { (cats[s.cat || "Altro"] = cats[s.cat || "Altro"] || []).push(s); });
  var ck = Object.keys(cats).sort();
  h += ck.length ? ck.map(function (c) {
    return '<div style="margin-bottom:14px"><div class="glab" style="margin-bottom:6px">' + esc(c) + "</div>" + cats[c].slice(0, 6).map(function (s) {
      return '<div class="cri"><b>' + esc(s.nome) + '</b><span class="faint"> · ' + esc(nameOf(D.pros, s.pro_id)) + " · " + eur(s.prezzo) + (s.unita ? " / " + esc(s.unita) : "") + "</span></div>";
    }).join("") + "</div>";
  }).join("") : vuoto("Nessun servizio dei colleghi, per ora.");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Fornitori consigliati</h2><button class="btn sm ghost" data-go="fornitori">Tutti</button></div>';
  h += D.forn.length ? '<div class="checklist">' + D.forn.slice(0, 6).map(function (f) {
    return '<div class="cri"><b>' + esc(f.nome) + '</b><span class="faint"> · ' + esc(f.categoria || "—") + (f.consigliato_da ? " · da " + esc(nameOf(D.pros, f.consigliato_da)) : "") + "</span></div>";
  }).join("") + "</div>" : vuoto("Nessun fornitore segnalato.", '<button class="lnk" data-new="forn">Segnalane uno</button>');
  h += "</div></div><div>";
  h += '<div class="card"><div class="cardhead"><h2>Chi c\'è</h2><button class="btn sm ghost" data-go="pool">Il pool</button></div>';
  h += '<div class="checklist">' + attivi.slice(0, 10).map(function (x) {
    return '<div class="cri">' + avatar(x.id, 22) + ' <button class="lnk" data-open-pro="' + x.id + '">' + esc(x.nome) + '</button><span class="faint"> · ' + esc(x.ruolo || "—") + "</span></div>";
  }).join("") + "</div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Spazi</h2><button class="btn sm ghost" data-go="spazi">Prenota</button></div>';
  h += D.spazi.length ? '<div class="checklist">' + D.spazi.map(function (x) {
    return '<div class="cri"><b>' + esc(x.nome) + '</b><span class="faint"> · ' + esc(x.stato || "—") + (x.partner ? " · " + esc(x.partner) : "") + "</span></div>";
  }).join("") + "</div>" : vuoto("Nessuno spazio ancora.");
  h += "</div></div></div>";
  return h;
}

/* ---------------- fornitori condivisi ---------------- */
function vFornitori() {
  var ff = FS.forn, q = (ff.cerca || "").toLowerCase();
  var list = D.forn.filter(function (f) {
    if (ff.cat && (f.categoria || "Altro") !== ff.cat) return false;
    return !q || (f.nome + " " + (f.categoria || "") + " " + (f.citta || "") + " " + (f.note || "")).toLowerCase().indexOf(q) > -1;
  });
  var h = head("Fornitori condivisi", "La rubrica dello studio: tipografie, stampatori, service, consulenti. Chi lo segnala risponde della segnalazione.",
    '<button class="btn sm" data-new="forn">+ Segnala fornitore</button>');
  h += barraViste(null, "", "fornitori",
    fcerca("forn", "Cerca per nome, categoria, città…") +
    fsel("forn", "cat", [["", "Ogni categoria"]].concat(elencoCat(D.forn, "categoria"))) +
    (ff.cat || ff.cerca ? '<button class="lnk mini" data-f-reset="forn">azzera</button>' : ""));
  var cats = {};
  list.forEach(function (f) { (cats[f.categoria || "Altro"] = cats[f.categoria || "Altro"] || []).push(f); });
  var ck = Object.keys(cats).sort();
  if (!list.length) return h + '<div class="card">' + vuoto("Nessun fornitore in rubrica.", '<button class="lnk" data-new="forn">Segnala il primo</button>') + "</div>";
  ck.forEach(function (c) {
    h += '<div class="card"><div class="cardhead"><h2>' + esc(c) + "</h2><span class=\"faint\">" + cats[c].length + "</span></div>";
    h += '<table><thead><tr><th>Fornitore</th><th>Referente</th><th>Contatti</th><th>Città</th><th>Segnalato da</th><th></th></tr></thead><tbody>' +
      cats[c].map(function (f) {
        return "<tr><td><b>" + esc(f.nome) + "</b>" + (f.note ? '<div class="faint">' + esc(f.note) + "</div>" : "") + "</td><td>" + esc(f.referente || "—") + "</td><td>" +
          (f.email ? '<a href="mailto:' + esc(f.email) + '">' + esc(f.email) + "</a>" : "") + (f.telefono ? '<div class="faint">' + esc(f.telefono) + "</div>" : "") +
          (f.sito ? '<div><a href="' + esc(f.sito) + '" target="_blank" rel="noopener">sito</a></div>' : "") + "</td><td>" + esc(f.citta || "—") + "</td><td>" +
          (f.consigliato_da ? avatar(f.consigliato_da, 20) + " " + esc(nameOf(D.pros, f.consigliato_da)) : "—") + '</td><td class="num"><button class="lnk" data-edit="forn:' + f.id + '">Modifica</button></td></tr>';
      }).join("") + "</tbody></table></div>";
  });
  return h;
}

/* ---------------- carico di lavoro ---------------- */
/* Il mio carico: solo il mio lavoro. Le ore e le stime degli altri non passano di qui. */
function vCarico() {
  var mieLav = D.lav.filter(function (l) { return l.pro_id === me.pro_id && l.stato !== "Completata"; });
  var mieRighe = D.righe.filter(function (r) {
    var s = by(D.serv, r.serv_id);
    var k = by(D.com, r.commessa_id);
    return (r.assegnato_id === me.pro_id || (s && s.pro_id === me.pro_id)) && k && ["Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1;
  });
  var stim = sum(mieLav, function (l) { return l.ore_stimate; });
  var stimRighe = sum(mieRighe, function (r) { return r.ore_stimate; });
  var fatte = sum(D.ore.filter(function (o) { return o.pro_id === me.pro_id; }), function (o) { return o.ore; });
  var fatteAttive = sum(D.ore.filter(function (o) { return o.pro_id === me.pro_id && mieLav.some(function (l) { return l.id === o.lavorazione_id; }); }), function (o) { return o.ore; });
  var residuo = Math.max(0, stim - fatteAttive);
  var mieTask = D.task.filter(function (t) { return t.assegnato_id === me.pro_id && t.stato !== "Fatto"; });
  var scadute = mieTask.filter(function (t) { return t.scadenza && t.scadenza < today(); });
  var settimana = iso(new Date(Date.now() + 7 * 86400000));

  var h = head("Il mio carico", "Quanto lavoro hai davanti nelle prossime settimane. Solo il tuo: il carico degli altri è loro.");
  h += '<div class="grid g4">' +
    kpi(num(residuo, 0) + " h", "Ore ancora da fare", num(fatteAttive, 1) + " h fatte su " + num(stim, 0) + " h stimate") +
    kpi(String(mieLav.length), "Lavorazioni aperte", mieRighe.length + " voci di preventivo assegnate a te") +
    kpi(String(mieTask.length), "Attività aperte", scadute.length ? scadute.length + " già scadute" : "nessuna scaduta") +
    kpi(num(stimRighe, 0) + " h", "Stimate a preventivo", "sui lavori approvati e in corso") + "</div>";

  var perProgetto = {};
  mieLav.forEach(function (l) {
    var fatteL = sum(oreOfLav(l.id), function (o) { return o.ore; });
    var res = Math.max(0, (+l.ore_stimate || 0) - fatteL);
    var pn = l.progetto_id ? nameOf(D.prog, l.progetto_id) : "Senza progetto";
    perProgetto[pn] = (perProgetto[pn] || 0) + res;
  });
  var pk = Object.keys(perProgetto).filter(function (x) { return perProgetto[x] > 0; }).sort(function (a, b) { return perProgetto[b] - perProgetto[a]; });
  var mx = Math.max.apply(null, pk.map(function (x) { return perProgetto[x]; }).concat([1]));

  h += '<div class="grid g32" style="margin-top:18px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Ore residue per progetto</h2></div>' +
    (pk.length ? '<div class="bars">' + pk.map(function (x) { return bar(x, perProgetto[x], mx, num(perProgetto[x], 0) + " h"); }).join("") + "</div>"
      : vuoto("Nessuna stima aperta: aggiungi le ore stimate alle tue lavorazioni per vedere il carico.")) + "</div>";

  h += '<div class="card"><div class="cardhead"><h2>Le tue lavorazioni aperte</h2><button class="btn sm ghost" data-go="progetti">Vai ai progetti</button></div>';
  h += mieLav.length ? '<table><thead><tr><th>Lavorazione</th><th>Progetto</th><th>Consegna</th><th class="num">Stimate</th><th class="num">Fatte</th><th class="num">Residuo</th></tr></thead><tbody>' +
    mieLav.slice().sort(function (a, b) { return (a.fine || "9999") < (b.fine || "9999") ? -1 : 1; }).map(function (l) {
      var f = sum(oreOfLav(l.id), function (o) { return o.ore; });
      var res = Math.max(0, (+l.ore_stimate || 0) - f);
      var late = l.fine && l.fine < today();
      return '<tr><td><button class="lnk" data-open-lav="' + l.id + '">' + esc(l.nome) + "</button></td><td>" + esc(l.progetto_id ? nameOf(D.prog, l.progetto_id) : "—") + "</td><td>" +
        (late ? '<span class="badge b-red">' + dt(l.fine) + "</span>" : dt(l.fine)) + '</td><td class="num">' + num(l.ore_stimate, 0) + '</td><td class="num">' + num(f, 1) + '</td><td class="num">' + num(res, 0) + "</td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Nessuna lavorazione aperta assegnata a te.");
  h += "</div></div><div>";

  h += '<div class="card"><div class="cardhead"><h2>Nei prossimi 7 giorni</h2></div>';
  var prossime = mieTask.filter(function (t) { return t.scadenza && t.scadenza <= settimana; }).sort(function (a, b) { return a.scadenza < b.scadenza ? -1 : 1; });
  h += prossime.length ? '<div class="checklist">' + prossime.map(function (t) {
    return '<div class="cri"><b>' + esc(t.titolo) + '</b><span class="faint"> · ' + (t.scadenza < today() ? "scaduta il " : "entro ") + dt(t.scadenza) + (t.commessa_id ? " · " + esc(nameOf(D.com, t.commessa_id, "titolo")) : "") + "</span></div>";
  }).join("") + "</div>" : vuoto("Niente in scadenza questa settimana.");
  h += "</div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">In sintesi</h3><table><tbody>' +
    row2("Ore registrate in tutto", num(fatte, 1) + " h") +
    row2("Media a settimana (12 sett.)", num(sum(settimane(D.ore.filter(function (o) { return o.pro_id === me.pro_id; }), 12), function (x) { return x; }) / 12, 1) + " h") +
    row2("Attività scadute", scadute.length ? '<span class="badge b-red">' + scadute.length + "</span>" : "0") +
    row2("Lavorazioni senza stima", mieLav.filter(function (l) { return !l.ore_stimate; }).length) +
    '</tbody></table><p class="faint" style="margin-top:10px">Serve a te per tararti: nessun altro vede questi numeri.</p></div>';
  return h + "</div></div>";
}

/* ---------------- clienti ---------------- */
function vClienti() {
  var vista = tab || "lista";
  var f = FS.cli;
  var list = fcli().filter(function (c) {
    if (f.stato && (c.stato || "Lead") !== f.stato) return false;
    if (f.owner && c.owner_id !== (f.owner === "io" ? me.pro_id : f.owner)) return false;
    if (f.cerca && (c.nome + " " + (c.settore || "") + " " + (c.referente || "")).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var h = head("Clienti", list.length + " clienti · " + eur(sum(list, function (c) { return valoreCliente(c.id); })) + " di valore",
    '<button class="btn sm" data-new="cli">+ Nuovo cliente</button>');
  h += barraViste([["lista", "Lista"], ["schede", "Schede"]], vista, "clienti",
    fcerca("cli", "Cerca un cliente…") +
    fsel("cli", "stato", [["", "Ogni stato"], ["Lead", "Lead"], ["Attivo", "Attivo"], ["Dormiente", "Dormiente"], ["Chiuso", "Chiuso"]]) +
    fsel("cli", "owner", [["", "Ogni owner"], ["io", "Miei"]].concat(D.pros.map(function (p) { return [p.id, p.nome]; }))) +
    (f.stato || f.owner || f.cerca ? '<button class="lnk mini" data-f-reset="cli">azzera</button>' : ""));
  if (!list.length) return h + '<div class="card">' + vuoto("Nessun cliente con questi filtri.", '<button class="lnk" data-new="cli">Aggiungine uno</button>') + "</div>";

  var ordinati = list.slice().sort(function (a, b) { return valoreCliente(b.id) - valoreCliente(a.id); });
  if (vista === "schede") {
    return h + '<div class="grid g3">' + ordinati.map(function (c) {
      var com = comOfCliente(c.id);
      var att = com.filter(function (k) { return ["Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; });
      return '<div class="card pcard" data-route="cliente|' + c.id + '|anagrafica">' +
        '<div class="cardhead"><h2>' + esc(c.nome) + '</h2><span class="badge ' + (c.stato === "Attivo" ? "b-green" : c.stato === "Lead" ? "b-amber" : "") + '">' + esc(c.stato || "Lead") + "</span></div>" +
        '<p class="faint">' + esc(c.settore || "—") + (c.referente ? " · " + esc(c.referente) : "") + "</p>" +
        "<table><tbody>" + row2("Preventivi", com.length + (att.length ? " · " + att.length + " attivi" : "")) +
        row2("Valore", eur(valoreCliente(c.id))) + row2("Owner", esc(nameOf(D.pros, c.owner_id))) + "</tbody></table></div>";
    }).join("") + "</div>";
  }
  return h + '<div class="card tlist">' + ordinati.map(function (c) {
    return rigaEl("cliente|" + c.id + "|anagrafica", c.nome,
      esc(c.settore || "—") + (c.referente ? " · " + esc(c.referente) : ""),
      '<span class="faint">' + comOfCliente(c.id).length + " preventivi</span>" +
      '<span class="badge ' + (c.stato === "Attivo" ? "b-green" : c.stato === "Lead" ? "b-amber" : "") + '">' + esc(c.stato || "Lead") + "</span>" +
      "<b>" + eur(valoreCliente(c.id)) + "</b>" + (c.owner_id ? avatar(c.owner_id, 22) : ""));
  }).join("") + "</div>";
}
function vCliente() {
  var c = by(D.cli, current);
  if (!c) return '<div class="card">Cliente non trovato. <button class="lnk" data-go="clienti">Torna all\'elenco</button></div>';
  var com = comOfCliente(c.id);
  var inter = D.inter.filter(function (i) { return i.cliente_id === c.id; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  var pg = D.pag.filter(function (p) { return com.some(function (k) { return k.id === p.commessa_id; }); });
  var accesso = D.membri.filter(function (m) { return m.cliente_id === c.id; })[0];
  var pl = D.port.filter(function (x) { return x.cliente_id === c.id; })[0];

  var h = crumbs([["Amministrazione"], ["Clienti", "clienti"], [c.nome]]);
  h += '<div class="top"><h1>' + esc(c.nome) + '<span class="sub">' + esc(c.settore || "—") + " · " + esc(c.stato || "Lead") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="clienti">← Clienti</button>' +
    '<button class="btn sm ghost" data-edit="cli:' + c.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-new="inter" data-ctx-cli="' + c.id + '">+ Nota</button>' +
    '<button class="btn sm" data-new="com" data-ctx-cli="' + c.id + '">+ Preventivo</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(valoreCliente(c.id)), "Valore totale", com.length + " preventivi") +
    kpi(eur(sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; })), "Incassato", eur(sum(pg.filter(function (p) { return p.stato !== "Incassato"; }), function (p) { return p.importo; })) + " da incassare") +
    kpi(String(inter.length), "Interazioni", inter[0] ? "ultima " + dt(inter[0].data) : "—") +
    kpi(pl ? (pl.attivo ? "Attivo" : "Sospeso") : accesso ? "Con account" : "No", "Accesso al portale", pl ? (pl.pwd_hash ? "link con password" : "manca la password") : accesso ? esc(accesso.email || "") : "nessun accesso") + "</div>";

  var prg = D.prog.filter(function (p) { return com.some(function (k) { return k.id === p.commessa_id; }); });
  var fat = D.mov.filter(function (m) { return m.cliente_id === c.id || com.some(function (k) { return k.id === m.commessa_id; }); });
  var t = tab || "anagrafica";
  h += schede([
    ["anagrafica", "Anagrafica"],
    ["preventivi", "Preventivi", com.length],
    ["progetti", "Progetti", prg.length],
    ["fatture", "Fatture", fat.length],
    ["scadenze", "Scadenze", pg.filter(function (p) { return p.stato !== "Incassato"; }).length],
    ["diario", "Diario", inter.length],
    ["portale", "Portale"]
  ], t, "cliente", c.id);

  if (t === "anagrafica") {
    h += '<div class="grid g2"><div class="card"><h3 style="margin-bottom:12px">Dati del cliente</h3><table><tbody>' +
      row2("Referente", esc(c.referente || "—")) +
      row2("Email", c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "—") +
      row2("Telefono", esc(c.telefono || "—")) +
      row2("Sito", c.sito ? '<a href="' + esc(c.sito) + '" target="_blank" rel="noopener">' + esc(c.sito) + "</a>" : "—") +
      row2("P. IVA", esc(c.piva || "—")) + row2("Indirizzo", esc(c.indirizzo || "—")) +
      row2("Settore", esc(c.settore || "—")) + row2("Stato", '<span class="badge">' + esc(c.stato || "Lead") + "</span>") +
      row2("Owner", esc(nameOf(D.pros, c.owner_id))) + row2("Note", esc(c.note || "—")) +
      '</tbody></table><div style="margin-top:14px"><button class="btn sm ghost" data-edit="cli:' + c.id + '">Modifica l\'anagrafica</button></div></div>' +
      '<div class="card"><h3 style="margin-bottom:14px">Cambia al volo</h3>' +
      qcampo("cli", c.id, "stato", "Stato", qsel("cli", c.id, "stato", sel(["Lead", "Attivo", "Dormiente", "Chiuso"], c.stato || "Lead"))) +
      qcampo("cli", c.id, "owner_id", "Owner", qsel("cli", c.id, "owner_id", opt(D.pros, c.owner_id))) +
      qcampo("cli", c.id, "referente", "Referente", qinput("cli", c.id, "referente", "text", c.referente)) +
      '<div class="row2">' + qcampo("cli", c.id, "email", "Email", qinput("cli", c.id, "email", "email", c.email)) +
      qcampo("cli", c.id, "telefono", "Telefono", qinput("cli", c.id, "telefono", "text", c.telefono)) + "</div></div>" +
      '<div class="card"><h3 style="margin-bottom:12px">In sintesi</h3><table><tbody>' +
      row2("Preventivi", com.length + " · " + com.filter(function (k) { return ["In corso", "Approvata"].indexOf(k.stato) > -1; }).length + " attivi") +
      row2("Progetti", prg.length) +
      row2("Fatturato", eur(sum(fat.filter(function (m) { return m.tipo === "Attiva"; }), function (m) { return m.importo; }))) +
      row2("Da incassare", eur(sum(pg.filter(function (p) { return p.stato !== "Incassato"; }), function (p) { return p.importo; }))) +
      row2("Ultima interazione", inter[0] ? dt(inter[0].data) + " · " + esc(inter[0].tipo || "Nota") : "—") +
      "</tbody></table></div></div>";
  }
  if (t === "preventivi") {
    h += '<div class="card"><div class="cardhead"><h2>Preventivi e lavori</h2><button class="btn sm" data-new="com" data-ctx-cli="' + c.id + '">+ Nuovo preventivo</button></div>' +
      (com.length ? tblCom(com) : vuoto("Nessun preventivo per questo cliente.", '<button class="lnk" data-new="com" data-ctx-cli="' + c.id + '">Creane uno</button>')) + "</div>";
  }
  if (t === "progetti") {
    h += '<div class="card"><div class="cardhead"><h2>Progetti</h2></div>' + (prg.length ? '<table><thead><tr><th>Progetto</th><th>Preventivo</th><th>Chi lo segue</th><th>Stato</th><th>Consegna</th><th class="num"></th></tr></thead><tbody>' +
      prg.map(function (p) {
        return '<tr><td><b>' + esc(p.nome) + "</b></td><td>" + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</td><td>" + esc(nameOf(D.pros, p.pro_id)) + '</td><td><span class="badge">' + esc(p.stato || "—") + "</span></td><td>" + dt(p.fine) + '</td><td class="num"><button class="lnk" data-open-prog="' + p.id + '">Apri</button></td></tr>';
      }).join("") + "</tbody></table>" : vuoto("Nessun progetto aperto per questo cliente.")) + "</div>";
  }
  if (t === "fatture") {
    h += '<div class="card"><div class="cardhead"><h2>Fatture e movimenti</h2><button class="btn sm ghost" data-new="mov" data-ctx-cli="' + c.id + '">+ Movimento</button></div>' +
      (fat.length ? tblMov(fat) : vuoto("Nessuna fattura per questo cliente.")) + "</div>";
  }
  if (t === "scadenze") {
    h += '<div class="card"><div class="cardhead"><h2>Scadenze di pagamento</h2></div>' + (pg.length ? '<table><thead><tr><th>Voce</th><th>Preventivo</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th></tr></thead><tbody>' +
      pg.slice().sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; }).map(function (p) {
        var late = p.stato !== "Incassato" && p.scadenza && p.scadenza < today();
        return "<tr><td>" + esc(p.nome) + '</td><td><button class="lnk" data-open-com="' + p.commessa_id + '">' + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</button></td><td>" + (late ? '<span class="badge b-red">' + dt(p.scadenza) + "</span>" : dt(p.scadenza)) + '</td><td class="num">' + eur(p.importo) + '</td><td><span class="badge ' + (p.stato === "Incassato" ? "b-green" : "b-amber") + '">' + esc(p.stato) + "</span></td></tr>";
      }).join("") + '</tbody><tfoot><tr><td colspan="3"><b>Da incassare</b></td><td class="num"><b>' + eur(sum(pg.filter(function (p) { return p.stato !== "Incassato"; }), function (p) { return p.importo; })) + "</b></td><td></td></tr></tfoot></table>" : vuoto("Nessuna scadenza registrata.")) + "</div>";
  }
  if (t === "diario") {
    h += '<div class="card"><div class="cardhead"><h2>Diario del rapporto</h2><button class="btn sm ghost" data-new="inter" data-ctx-cli="' + c.id + '">+ Aggiungi nota</button></div>';
    h += inter.length ? '<ul class="timeline">' + inter.map(function (i) {
      return "<li><b>" + esc(i.tipo || "Nota") + "</b> · " + esc(i.testo || "") + '<div class="when">' + dt(i.data) + " · " + esc(nameOf(D.pros, i.pro_id)) + ' · <button class="lnk" data-del="inter:' + i.id + '">elimina</button></div></li>';
    }).join("") + "</ul>" : vuoto("Nessuna interazione registrata.", '<button class="lnk" data-new="inter" data-ctx-cli="' + c.id + '">Scrivi la prima</button>');
    h += "</div>";
  }
  if (t === "portale") {
    h += '<div class="card"><div class="cardhead"><h2>Accesso al portale</h2></div>';
    if (!pl) {
      h += '<p class="faint" style="margin-bottom:10px">Crei un link con password da mandare al cliente: vedrà solo i suoi progetti, le fasi condivise, i materiali e le scadenze. Nessun account da registrare.</p>' +
        '<button class="btn sm" data-portnew="' + c.id + '">Crea il link di accesso</button>';
    } else {
      var url = location.origin + location.pathname + "#/p/" + pl.token;
      h += '<div class="field"><label>Link per il cliente</label><input readonly value="' + esc(url) + '" onclick="this.select()"></div>' +
        '<p class="faint" style="margin:-6px 0 12px">' + (pl.pwd_hash ? "Password impostata" : '<b class="neg">Password non impostata: il link non funziona</b>') +
        (pl.ultimo_accesso ? " · ultimo accesso " + dshort(pl.ultimo_accesso) : " · mai usato") + "</p>" +
        '<div class="tools"><button class="btn sm ghost" data-portcopy="' + esc(url) + '">Copia link</button>' +
        '<button class="btn sm ghost" data-portpwd="' + pl.id + '">' + (pl.pwd_hash ? "Cambia password" : "Imposta password") + "</button>" +
        '<button class="btn sm ghost" data-portoff="' + pl.id + '|' + (pl.attivo ? "0" : "1") + '">' + (pl.attivo ? "Sospendi" : "Riattiva") + "</button></div>";
    }
    h += "</div>";
  }
  return h;
}

/* ---------------- pool ---------------- */
function vPool() {
  var f = FS.pool, q = (f.cerca || "").toLowerCase();
  var elenco = D.pros.filter(function (p) {
    if (f.cat && !D.serv.some(function (s) { return s.pro_id === p.id && (s.cat || "Altro") === f.cat; })) return false;
    return !q || (p.nome + " " + (p.ruolo || "") + " " + (p.competenze || "") + " " + (p.citta || "")).toLowerCase().indexOf(q) > -1;
  });
  var h = head("Professionisti", elenco.length + " persone · " + D.pros.filter(function (p) { return p.vetting === "Attivo"; }).length + " attive",
    (puo("accessi") ? '<button class="btn sm" data-new="pros">+ Nuova persona</button>' : ""));
  h += barraViste(null, "", "pool",
    fcerca("pool", "Cerca per nome, competenza, città…") +
    fsel("pool", "cat", [["", "Ogni categoria di servizio"]].concat(elencoCat(D.serv, "cat"))) +
    (f.cat || f.cerca ? '<button class="lnk mini" data-f-reset="pool">azzera</button>' : ""));
  if (!elenco.length) return h + '<div class="card">' + vuoto("Nessun professionista con questi filtri.", '<button class="lnk" data-f-reset="pool">Azzera i filtri</button>') + "</div>";
  h += '<div class="grid g3">';
  elenco.forEach(function (p) {
    var srv = D.serv.filter(function (s) { return s.pro_id === p.id; });
    var ore = D.ore.filter(function (o) { return o.pro_id === p.id; });
    var com = D.com.filter(function (k) { return k.owner_id === p.id || k.pm_id === p.id || k.pr_id === p.id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return r.assegnato_id === p.id || (s && s.pro_id === p.id); }); });
    h += '<div class="card"><div class="cardhead"><h2>' + esc(p.nome) + '</h2><span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span></div>" +
      '<p class="muted" style="font-size:.88rem">' + esc(p.ruolo || "—") + "</p>" +
      '<div style="margin:10px 0">' + (p.competenze || "").split(",").filter(Boolean).map(function (x) { return '<span class="chip">' + esc(x.trim()) + "</span>"; }).join("") + "</div>" +
      "<table><tbody>" + (p.id === me.pro_id ? row2("Tariffa oraria", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") : "") + row2("Servizi a listino", srv.length) + row2("Lavori insieme a te", com.length) + (p.id === me.pro_id ? row2("Ore registrate", num(sum(ore, function (o) { return o.ore; }), 1) + " h") : "") + "</tbody></table>" +
      '<div style="margin-top:12px;display:flex;gap:8px"><button class="btn sm ghost" data-open-pro="' + p.id + '">Scheda</button><button class="btn sm ghost" data-edit="pros:' + p.id + '">Modifica</button></div></div>';
  });
  return h + "</div>";
}
function vPro() {
  var p = by(D.pros, current);
  if (!p) return '<div class="card">Non trovato. <button class="lnk" data-go="pool">Torna al pool</button></div>';
  var srv = D.serv.filter(function (s) { return s.pro_id === p.id; });
  var ore = D.ore.filter(function (o) { return o.pro_id === p.id; });
  var tk = D.task.filter(function (t) { return t.assegnato_id === p.id; });
  var com = D.com.filter(function (k) { return k.owner_id === p.id || k.pm_id === p.id || k.pr_id === p.id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return r.assegnato_id === p.id || (s && s.pro_id === p.id); }); });
  var h = (view === "profilo" ? crumbs([["Profilo"], ["Il mio profilo"]]) : crumbs([["Studio"], ["Professionisti", "pool"], [p.nome]]));
  h += '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + esc(p.ruolo || "—") + '</span></h1><div class="tools">' + (view === "profilo" ? "" : '<button class="btn sm ghost" data-go="pool">← Professionisti</button>') + '<button class="btn sm ghost" data-edit="pros:' + p.id + '">Modifica</button></div></div>';
  var mio = p.id === me.pro_id;
  h += '<div class="grid g4">' +
    kpi(String(com.length), mio ? "I tuoi lavori" : "Lavori insieme a te", mio ? D.cli.filter(function (c) { return c.owner_id === p.id; }).length + " clienti tuoi" : "solo quelli che condividete") +
    kpi(mio ? num(sum(ore, function (o) { return o.ore; }), 1) + " h" : "—", mio ? "Ore registrate" : "Ore", mio ? ore.length + " registrazioni" : "private, le vede solo chi le registra") +
    kpi(mio ? eur(sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); })) : String(srv.length), mio ? "Valore delle tue ore" : "Servizi a listino", mio ? (p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "tariffa non impostata") : "puoi metterli nei tuoi preventivi") +
    kpi(String(tk.filter(function (t) { return t.stato !== "Fatto"; }).length), "Attività aperte", "sui lavori che vedi") + "</div>";
  var t = tab || "scheda";
  var TP = [["scheda", "Scheda"], ["servizi", "Servizi", srv.length], ["lavori", "Lavori", com.length]];
  if (mio) TP.push(["ore", "Ore", num(sum(ore, function (o) { return o.ore; }), 1)]);
  h += schede(TP, t, view === "profilo" ? "profilo" : "pro", view === "profilo" ? "" : p.id);

  if (t === "scheda") {
    h += '<div class="grid g2"><div class="card"><h3 style="margin-bottom:12px">Anagrafica</h3><table><tbody>' +
      row2("Vetting", '<span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span>") +
      row2("Email", esc(p.email || "—")) + row2("Telefono", esc(p.telefono || "—")) + row2("Città", esc(p.citta || "—")) +
      row2("P. IVA", esc(p.piva || "—")) + (mio ? row2("Tariffa oraria", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") : "") +
      row2("Competenze", (p.competenze || "").split(",").filter(Boolean).map(function (x) { return '<span class="chip">' + esc(x.trim()) + "</span>"; }).join("") || "—") +
      row2("Note", esc(p.note || "—")) +
      '</tbody></table><div style="margin-top:14px"><button class="btn sm ghost" data-edit="pros:' + p.id + '">Modifica la scheda</button></div></div>';
    if (mio) {
      var voci = [
        ["Tariffa oraria", !!p.tariffa_oraria, "serve per capire quanto ti costa un lavoro"],
        ["Competenze", !!p.competenze, "è così che i colleghi ti trovano"],
        ["Partita IVA", !!p.piva, "serve sui documenti"],
        ["Città", !!p.citta, "per i lavori in zona"],
        ["Servizi a listino", srv.length > 0, "i colleghi possono metterli nei loro preventivi"]
      ];
      var fatte = voci.filter(function (v) { return v[1]; }).length;
      h += '<div class="card"><h3 style="margin-bottom:6px">Quanto è completo il tuo profilo</h3>' +
        '<p class="faint" style="margin-bottom:12px">' + fatte + " voci su " + voci.length + " · più è completo, più è probabile che un collega ti inserisca in un suo preventivo.</p>" +
        prog(Math.round(fatte / voci.length * 100)) +
        '<table style="margin-top:14px"><tbody>' + voci.map(function (v) {
          return row2((v[1] ? '<span class="badge b-green">ok</span> ' : '<span class="badge b-amber">manca</span> ') + esc(v[0]), '<span class="faint">' + esc(v[2]) + "</span>");
        }).join("") + "</tbody></table>" +
        '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm ghost" data-edit="pros:' + p.id + '">Completa la scheda</button>' +
        '<button class="btn sm ghost" data-new="serv" data-ctx-pro="' + p.id + '">+ Aggiungi un servizio</button></div></div>';
    } else {
      h += '<div class="card"><h3 style="margin-bottom:12px">Come lavorarci insieme</h3><table><tbody>' +
        row2("Servizi a listino", srv.length) +
        row2("Prezzi", srv.length ? eur(Math.min.apply(null, srv.map(function (s) { return +s.prezzo || 0; }))) + " – " + eur(Math.max.apply(null, srv.map(function (s) { return +s.prezzo || 0; }))) : "—") +
        row2("Categorie", (srv.map(function (s) { return s.cat; }).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(", ")) || "—") +
        '</tbody></table><p class="faint" style="margin-top:12px">Puoi inserire i suoi servizi in un tuo preventivo: resti tu l\'interlocutore del cliente.</p></div>';
    }
    h += "</div>";
  }
  if (t === "servizi") {
    h += '<div class="card"><div class="cardhead"><h2>Servizi a listino</h2>' + (mio ? '<button class="btn sm" data-new="serv" data-ctx-pro="' + p.id + '">+ Nuovo servizio</button>' : "") + "</div>" + tblServ(srv) + "</div>";
  }
  if (t === "lavori") {
    h += '<div class="card"><div class="cardhead"><h2>Lavori</h2></div>' + (com.length ? tblCom(com) : vuoto("Nessun lavoro condiviso con te.")) + "</div>";
  }
  if (t === "ore" && mio) {
    h += '<div class="card"><div class="cardhead"><h2>Le tue ore</h2><button class="btn sm ghost" data-go="ore">Apri il timesheet</button></div>' + tblOre(ore.slice(0, 40)) + "</div>";
  }
  return h;
}

/* ---------------- servizi ---------------- */
function tblServ(list) {
  if (!list.length) return vuoto("Nessun servizio.", '<button class="lnk" data-new="serv">Aggiungine uno</button>');
  var h = '<table><thead><tr><th>Servizio</th><th>Categoria</th><th>Professionista</th><th>Unità</th>' + (vediCosti() ? '<th class="num">Costo</th>' : "") + '<th class="num">Prezzo</th>' + (vediCosti() ? '<th class="num">Margine</th>' : "") + "<th></th></tr></thead><tbody>";
  list.forEach(function (s) {
    var m = (+s.prezzo || 0) - (+s.costo || 0);
    h += "<tr><td>" + esc(s.nome) + (s.descrizione ? '<div class="faint">' + esc(s.descrizione) + "</div>" : "") + "</td><td>" + esc(s.cat || "—") + "</td><td>" + esc(nameOf(D.pros, s.pro_id)) + "</td><td>" + esc(s.unita || "—") + "</td>" +
      (vediCosti() ? '<td class="num">' + eur(s.costo) + "</td>" : "") + '<td class="num">' + eur(s.prezzo) + "</td>" +
      (vediCosti() ? '<td class="num">' + eur(m) + ' <span class="faint">' + (s.prezzo ? Math.round(m / s.prezzo * 100) : 0) + "%</span></td>" : "") +
      '<td class="num"><button class="lnk" data-edit="serv:' + s.id + '">Modifica</button></td></tr>';
  });
  return h + "</tbody></table>";
}
function vServizi() {
  var f = FS.serv;
  if (!f.chi) f.chi = "io";
  var base = f.chi === "io" ? D.serv.filter(function (s) { return s.pro_id === me.pro_id; })
    : f.chi === "altri" ? D.serv.filter(function (s) { return s.pro_id !== me.pro_id; }) : D.serv;
  var list = base.filter(function (s) {
    if (f.cat && (s.cat || "Altro") !== f.cat) return false;
    if (f.cerca && (s.nome + " " + (s.cat || "") + " " + (s.descrizione || "")).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var h = head("I miei servizi", list.length + " servizi · " + (f.chi === "io" ? "il tuo listino" : "quello che sanno fare gli altri"),
    '<button class="btn sm" data-new="serv">+ Nuovo servizio</button>');
  h += barraViste(null, "", "servizi",
    fcerca("serv", "Cerca un servizio…") +
    fsel("serv", "chi", [["io", "I miei"], ["altri", "Dei colleghi"], ["tutti", "Tutti"]]) +
    fsel("serv", "cat", [["", "Ogni categoria"]].concat(elencoCat(D.serv, "cat"))) +
    (f.cat || f.cerca ? '<button class="lnk mini" data-f-reset="serv">azzera</button>' : ""));
  if (!list.length) return h + '<div class="card">' + vuoto(f.chi === "io" ? "Nessun servizio a listino: è così che i colleghi ti trovano." : "Nessun servizio con questi filtri.", '<button class="lnk" data-new="serv">Crea il primo</button>') + "</div>";
  var cats = {};
  list.forEach(function (s) { cats[s.cat || "Altro"] = (cats[s.cat || "Altro"] || []).concat([s]); });
  Object.keys(cats).sort().forEach(function (c) {
    h += '<div class="card"><div class="cardhead"><h2>' + esc(c) + '</h2><span class="faint">' + cats[c].length + " servizi</span></div>" + tblServ(cats[c]) + "</div>";
  });
  return h;
}

/* ---------------- fatturazione ---------------- */
function tblMov(list) {
  if (!list.length) return vuoto("Nessun movimento.", '<button class="lnk" data-new="mov">Registrane uno</button>');
  var h = '<table><thead><tr><th>Numero</th><th>Tipo</th><th>Cliente</th><th>Preventivo</th><th>Emessa da</th><th>Data</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th><th></th></tr></thead><tbody>';
  list.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).forEach(function (m) {
    var late = m.stato !== "Pagata" && m.scadenza && m.scadenza < today();
    h += "<tr><td>" + esc(m.numero || "—") + '</td><td><span class="badge ' + (m.tipo === "Attiva" ? "b-green" : "b-amber") + '">' + esc(m.tipo) + "</span></td><td>" + esc(m.cliente_id ? nameOf(D.cli, m.cliente_id) : "—") + "</td><td>" + esc(m.commessa_id ? nameOf(D.com, m.commessa_id, "titolo") : "—") + "</td><td>" + esc(nameOf(D.pros, m.pro_id)) + "</td><td>" + dt(m.data) + "</td><td>" + (late ? '<span class="badge b-red">' + dt(m.scadenza) + "</span>" : dt(m.scadenza)) + '</td><td class="num">' + eur(m.importo) + '</td><td><span class="badge ' + (MOV_COL[m.stato] || "") + '">' + esc(m.stato) + '</span></td><td class="num">' + (m.stato !== "Pagata" ? '<button class="lnk" data-pay="' + m.id + '">Incassata</button> ' : "") + '<button class="lnk" data-edit="mov:' + m.id + '">Modifica</button></td></tr>';
  });
  return h + "</tbody></table>";
}
function vFatture() {
  var list = fmov();
  var att = list.filter(function (m) { return m.tipo === "Attiva"; }), pas = list.filter(function (m) { return m.tipo === "Passiva"; });
  var inc = sum(att.filter(function (m) { return m.stato === "Pagata"; }), function (m) { return m.importo; });
  var da = sum(att.filter(function (m) { return m.stato !== "Pagata"; }), function (m) { return m.importo; });
  var scad = att.filter(function (m) { return m.stato !== "Pagata" && m.scadenza && m.scadenza < today(); });
  var f = FS.mov;
  var filtrate = list.filter(function (m) {
    if (f.tipo && m.tipo !== f.tipo) return false;
    if (f.stato && m.stato !== f.stato) return false;
    if (f.anno && (m.data || "").slice(0, 4) !== f.anno) return false;
    if (f.cerca && ((m.numero || "") + " " + nameOf(D.cli, m.cliente_id) + " " + nameOf(D.com, m.commessa_id, "titolo")).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var anni = {}; list.forEach(function (m) { if (m.data) anni[m.data.slice(0, 4)] = 1; });
  var h = head("Le mie fatture", "Movimenti attivi e passivi: sono tuoi e li vedi solo tu", '<button class="btn sm" data-new="mov">+ Nuovo movimento</button>');
  h += barraViste(null, "", "fatture",
    fcerca("mov", "Cerca numero, cliente, preventivo…") +
    fsel("mov", "tipo", [["", "Entrate e uscite"], ["Attiva", "Solo entrate"], ["Passiva", "Solo uscite"]]) +
    fsel("mov", "stato", [["", "Ogni stato"], ["Da emettere", "Da emettere"], ["Emessa", "Emessa"], ["Pagata", "Pagata"], ["Insoluta", "Insoluta"]]) +
    fsel("mov", "anno", [["", "Ogni anno"]].concat(Object.keys(anni).sort().reverse().map(function (a) { return [a, a]; }))) +
    (f.tipo || f.stato || f.anno || f.cerca ? '<button class="lnk mini" data-f-reset="mov">azzera</button>' : ""));
  h += '<div class="grid g4">' +
    kpi(eur(inc), "Incassato", att.filter(function (m) { return m.stato === "Pagata"; }).length + " fatture pagate") +
    kpi(eur(da), "Da incassare", att.filter(function (m) { return m.stato !== "Pagata"; }).length + " aperte") +
    kpi(eur(sum(scad, function (m) { return m.importo; })), "Scaduto", scad.length + " oltre la scadenza") +
    kpi(eur(sum(pas, function (m) { return m.importo; })), "Uscite", pas.length + " movimenti passivi") + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Movimenti</h2><span class="faint">' + filtrate.length + " di " + list.length + "</span></div>" +
    (filtrate.length ? tblMov(filtrate) : vuoto("Nessun movimento con questi filtri.", '<button class="lnk" data-f-reset="mov">Azzera i filtri</button>')) + "</div>";
  return h;
}

/* ---------------- report ---------------- */
function vReport() {
  var com = fcom(), ore = fore(), mov = fmov();
  var vinte = com.filter(function (k) { return ["Approvata", "In corso", "Consegna", "Chiusa"].indexOf(k.stato) > -1; });
  var perse = com.filter(function (k) { return k.stato === "Persa"; });
  var conv = (vinte.length + perse.length) ? Math.round(vinte.length / (vinte.length + perse.length) * 100) : 0;
  var mesi = {};
  mov.filter(function (m) { return m.tipo === "Attiva"; }).forEach(function (m) { var kk = (m.data || "").slice(0, 7); if (kk) mesi[kk] = (mesi[kk] || 0) + (+m.importo || 0); });
  var mk = Object.keys(mesi).sort();
  var topCli = fcli().slice().sort(function (a, b) { return valoreCliente(b.id) - valoreCliente(a.id); }).slice(0, 8);
  var fattOre = sum(ore.filter(function (o) { return o.fatturabile; }), function (o) { return o.ore; });
  var totOre = sum(ore, function (o) { return o.ore; });
  var h = head("Report", "Come vanno i tuoi lavori: conversione, marginalità, andamento");
  h += '<div class="grid g4">' +
    kpi(conv + " %", "Preventivi vinti", vinte.length + " vinti · " + perse.length + " persi") +
    kpi(totOre ? Math.round(fattOre / totOre * 100) + " %" : "—", "Ore fatturabili", num(fattOre, 1) + " h su " + num(totOre, 1) + " registrate") +
    kpi(eur(com.length ? sum(com, function (k) { return calc(k).tot; }) / com.length : 0), "Valore medio", com.length + " preventivi") +
    kpi(eur(sum(com.filter(function (k) { return k.stato !== "Persa"; }), function (k) { return calc(k).margine; })), "Margine complessivo", "sui lavori non persi") + "</div>";
  h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="cardhead"><h2>Incassi per mese</h2></div>';
  h += mk.length ? '<div class="bars">' + mk.map(function (kk) { return bar(kk, mesi[kk], Math.max.apply(null, mk.map(function (x) { return mesi[x]; })), eur(mesi[kk])); }).join("") + "</div>" : vuoto("—");
  h += '</div><div class="card"><div class="cardhead"><h2>Top clienti</h2></div>';
  h += topCli.length ? '<div class="bars">' + topCli.map(function (c) { return bar(c.nome, valoreCliente(c.id), valoreCliente(topCli[0].id) || 1, eur(valoreCliente(c.id))); }).join("") + "</div>" : vuoto("—");
  h += "</div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Marginalità per lavoro</h2></div><table><thead><tr><th>Preventivo</th><th>Cliente</th><th class="num">Totale</th><th class="num">Compensi</th><th class="num">Margine</th><th class="num">%</th><th class="num">Ore</th><th class="num">€/h reale</th></tr></thead><tbody>';
  com.slice().sort(function (a, b) { return calc(b).margine - calc(a).margine; }).forEach(function (k) {
    var c = calc(k), o = oreTot(k.id);
    h += '<tr><td><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button></td><td>" + esc(nameOf(D.cli, k.cliente_id)) + '</td><td class="num">' + eur(c.tot) + '</td><td class="num">' + eur(c.cost) + '</td><td class="num">' + eur(c.margine) + '</td><td class="num">' + (c.tot ? Math.round(c.margine / c.tot * 100) : 0) + '%</td><td class="num">' + num(o, 1) + '</td><td class="num">' + (o ? eur(c.tot / o) : "—") + "</td></tr>";
  });
  return h + "</tbody></table></div>";
}

/* ---------------- spazi ---------------- */
function vSpazi() {
  var oggi = today();
  var prossime = D.pren.filter(function (p) { return p.data >= oggi; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
  var passate = D.pren.filter(function (p) { return p.data < oggi; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  var mie = D.pren.filter(function (p) { return p.pro_id === me.pro_id && p.data >= oggi; });
  var attivi = D.spazi.filter(function (x) { return x.stato === "Attivo"; });

  var h = head("Coworking & spazi", attivi.length ? attivi.length + " spazi attivi · " + prossime.length + " prenotazioni in arrivo" : "La sede è in cerca: qui dentro c'è già tutto pronto",
    (puo("spazi") ? '<button class="btn sm ghost" data-new="spazi">+ Nuovo spazio</button>' : "") + '<button class="btn sm" data-new="pren">+ Prenota</button>');

  h += '<div class="grid g4">' +
    kpi(String(D.spazi.length), "Spazi in elenco", attivi.length + " attivi") +
    kpi(String(prossime.length), "Prenotazioni in arrivo", mie.length + " tue") +
    kpi(String(sum(D.spazi, function (x) { return +x.capienza || 0; })), "Postazioni", "capienza totale") +
    kpi(String(D.spazi.filter(function (x) { return x.partner && x.partner !== "interno"; }).length), "Spazi partner", "fuori sede") + "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Prenotazioni in arrivo</h2><button class="btn sm ghost" data-new="pren">+ Prenota</button></div>';
  h += prossime.length ? '<table><thead><tr><th>Quando</th><th>Spazio</th><th>Chi</th><th>Slot</th><th class="num"></th></tr></thead><tbody>' + prossime.map(function (p) {
    var mia = p.pro_id === me.pro_id;
    return "<tr><td>" + dt(p.data) + (p.data === oggi ? ' <span class="badge b-terra">oggi</span>' : "") + "</td><td>" + esc(nameOf(D.spazi, p.spazio_id)) + "</td><td>" +
      (p.pro_id ? avatar(p.pro_id, 22) + " " + esc(nameOf(D.pros, p.pro_id)) : "—") + "</td><td>" + esc(p.slot || "—") +
      '</td><td class="num">' + (mia || puo("spazi") ? '<button class="lnk" data-del="pren:' + p.id + '">Annulla</button>' : "") + "</td></tr>";
  }).join("") + "</tbody></table>" : vuoto("Nessuna prenotazione in arrivo.", '<button class="lnk" data-new="pren">Prenota una postazione</button>');
  h += "</div>";
  if (passate.length) {
    h += '<div class="card"><div class="cardhead"><h2>Già passate</h2><span class="faint">' + passate.length + "</span></div>" +
      '<table><tbody>' + passate.slice(0, 8).map(function (p) {
        return "<tr><td>" + dt(p.data) + "</td><td>" + esc(nameOf(D.spazi, p.spazio_id)) + "</td><td>" + esc(nameOf(D.pros, p.pro_id)) + "</td><td>" + esc(p.slot || "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  h += "</div><div>";

  D.spazi.forEach(function (x) {
    var pr = D.pren.filter(function (p) { return p.spazio_id === x.id && p.data >= oggi; });
    var righe = [["Dove", x.indirizzo], ["Tipo", x.tipo], ["Formule", x.opzioni], ["Costo", x.costo],
      ["Postazioni", x.capienza ? x.capienza : null], ["Partner", x.partner && x.partner !== "interno" ? x.partner : null],
      ["Referente", x.referente]].filter(function (r) { return r[1]; });
    h += '<div class="card"><div class="cardhead"><h2>' + esc(x.nome) + '</h2><span class="badge ' + (x.stato === "Attivo" ? "b-green" : "b-amber") + '">' + esc(x.stato || "—") + "</span></div>" +
      "<table><tbody>" + righe.map(function (r) { return row2(r[0], esc(String(r[1]))); }).join("") +
      row2("In arrivo", pr.length ? pr.length + " prenotazioni" : "nessuna") + "</tbody></table>" +
      '<div style="margin-top:12px;display:flex;gap:8px"><button class="btn sm ghost" data-new="pren">Prenota qui</button>' +
      (puo("spazi") ? '<button class="btn sm ghost" data-edit="spazi:' + x.id + '">Modifica</button>' : "") + "</div></div>";
  });
  if (!D.spazi.length) h += '<div class="card">' + vuoto("Nessuno spazio in elenco.", puo("spazi") ? '<button class="lnk" data-new="spazi">Aggiungi il primo</button>' : "") + "</div>";
  return h + "</div></div>";
}

function vSettings() {
  var h = head("Impostazioni", "Il tuo accesso, le regole di visibilità e — se le curi — le persone");
  h += '<div class="grid g2">';
  h += '<div class="card"><h2>Il mio profilo</h2>';
  if (me.pro_id) {
    var p = by(D.pros, me.pro_id);
    h += '<table style="margin-top:12px"><tbody>' + row2("Nome", esc(p ? p.nome : "—")) + row2("Ruolo", esc(p ? p.ruolo : "—")) +
      row2("Tariffa oraria", p && p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h <span class=\"faint\">— la vedi solo tu</span>" : "—") +
      row2("Aree comuni che curi", permEt() ? esc(permEt().replace("cura: ", "")) : "nessuna") + "</tbody></table>" +
      '<div style="margin-top:12px;display:flex;gap:8px"><button class="btn sm ghost" data-edit="pros:' + me.pro_id + '">Modifica la scheda</button><button class="btn sm ghost" data-go="profilo">Apri il profilo</button></div>';
  } else h += '<p class="muted" style="margin-top:10px">Il tuo utente non è ancora collegato a una scheda. Chiedi a chi gestisce gli accessi di collegarlo.</p>';
  h += "</div>";
  h += '<div class="card"><h2>Il tuo spazio e quello comune</h2>' +
    '<p class="faint" style="margin:8px 0 12px">Ogni professionista è un contenitore chiuso. Si apre solo sul singolo lavoro che decide di condividere.</p>' +
    '<table><tbody>' +
    row2("<b>Solo tuo</b>", "clienti, preventivi, progetti, fatture, ore, tariffa oraria, note personali") +
    row2("<b>Condiviso su invito</b>", "il singolo lavoro in cui coinvolgi un collega: quel lavoro e basta, non il cliente né il resto") +
    row2("<b>Di tutti</b>", "profili e competenze, servizi a listino, fornitori segnalati, spazi") +
    row2("Le ore", "nessuno vede le tue, tu non vedi quelle di nessuno — nemmeno in aggregato") +
    row2("Chi cura le aree comuni", "può modificare spazi, impostazioni o accessi, non può entrare nei dati di nessuno") +
    '</tbody></table><p class="faint" style="margin-top:10px">Sono regole del database, non della grafica: anche interrogando il sistema direttamente non si esce da quello che ti spetta.</p></div>';
  h += '<div class="card"><h2>Cambia password</h2><form data-form="password" style="margin-top:14px"><div class="field"><label>Nuova password</label><input name="pw" type="password" placeholder="almeno 8 caratteri" autocomplete="new-password" /></div><button class="btn" type="submit">Aggiorna password</button></form><p class="faint" style="margin-top:8px">Utente connesso: ' + esc(me.email) + "</p></div>";
  if (puo("accessi")) {
    h += '<div class="card"><div class="cardhead"><h2>Persone e accessi</h2><button class="btn sm ghost" data-new="membri">+ Collega utente</button></div>' +
      '<table><thead><tr><th>Email</th><th>Tipo</th><th>Collegato a</th><th>Cura</th><th></th></tr></thead><tbody>' +
      D.membri.map(function (m) {
        var pm = [];
        if (m.perm_spazi) pm.push("spazi");
        if (m.perm_studio) pm.push("studio");
        if (m.perm_accessi) pm.push("accessi");
        return "<tr><td>" + esc(m.email || "—") + '</td><td><span class="badge">' + esc(RUOLO_ET[m.ruolo] || m.ruolo || "—") + "</span></td><td>" +
          esc(m.pro_id ? nameOf(D.pros, m.pro_id) : m.cliente_id ? nameOf(D.cli, m.cliente_id) : "—") + "</td><td>" +
          (pm.length ? pm.map(function (x) { return '<span class="chip">' + x + "</span>"; }).join(" ") : '<span class="faint">—</span>') +
          '</td><td class="num"><button class="lnk" data-edit="membri:' + m.user_id + '">Modifica</button></td></tr>';
      }).join("") + "</tbody></table>" +
      '<p class="faint" style="margin-top:10px">I permessi valgono solo sulle aree comuni: chi li ha può sistemare spazi, dati dello studio o accessi. Nessun permesso apre i dati di un altro professionista.</p></div>';
  }
  return h + "</div>";
}
/* ---------------- progetti ---------------- */
function vProgetti() {
  var vista = tab || "schede";
  var f = FS.prog;
  var list = progVisibili().filter(function (p) {
    var k = by(D.com, p.commessa_id);
    if (f.stato && (p.stato || "") !== f.stato) return false;
    if (f.cli && (!k || k.cliente_id !== f.cli)) return false;
    if (f.pro && p.pro_id !== (f.pro === "io" ? me.pro_id : f.pro)) return false;
    if (f.cerca && (p.nome + " " + nameOf(D.com, p.commessa_id, "titolo")).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var h = head("Progetti", list.length + " progetti in cui sei dentro",
    '<button class="btn sm" data-new="prog">+ Nuovo progetto</button>');
  h += barraViste([["schede", "Schede"], ["lista", "Lista"], ["bacheca", "Bacheca"]], vista, "progetti",
    fcerca("prog", "Cerca un progetto…") +
    fsel("prog", "stato", [["", "Ogni stato"], ["Da iniziare", "Da iniziare"], ["In corso", "In corso"], ["In attesa cliente", "In attesa cliente"], ["Completato", "Completato"]]) +
    fsel("prog", "cli", [["", "Ogni cliente"]].concat(fcli().map(function (c) { return [c.id, c.nome]; }))) +
    fsel("prog", "pro", [["", "Chiunque"], ["io", "Seguiti da me"]].concat(D.pros.map(function (p) { return [p.id, p.nome]; }))) +
    (f.stato || f.cli || f.pro || f.cerca ? '<button class="lnk mini" data-f-reset="prog">azzera</button>' : ""));
  if (!list.length) return h + '<div class="card">' + vuoto("Nessun progetto con questi filtri: i progetti nascono dentro un preventivo.", '<button class="lnk" data-go="commesse">Vai ai preventivi</button>') + "</div>";

  if (vista === "lista") {
    return h + '<div class="card tlist">' + list.map(function (p) {
      var k = by(D.com, p.commessa_id), lv = lavOf(p.id);
      var tk = taskOfProg(p.id).filter(function (t) { return t.stato !== "Fatto"; });
      return rigaEl("progetto|" + p.id + "|lavorazioni", p.nome,
        esc(k ? nameOf(D.cli, k.cliente_id) : "—") + " · " + lv.length + " lavorazioni · " + tk.length + " attività aperte",
        '<span class="faint">' + num(avanzProg(p), 0) + "%</span>" +
        '<span class="badge ' + (p.stato === "Completato" ? "b-green" : p.stato === "In corso" ? "b-terra" : "") + '">' + esc(p.stato || "—") + "</span>" +
        (p.fine ? '<span class="badge ' + (p.fine < today() && p.stato !== "Completato" ? "b-red" : "") + '">' + dshort(p.fine) + "</span>" : "") +
        (p.pro_id ? avatar(p.pro_id, 22) : ""));
    }).join("") + "</div>";
  }
  if (vista === "bacheca") {
    var stati = ["Da iniziare", "In corso", "In attesa cliente", "Completato"];
    return h + '<div class="card"><div class="kanban">' + stati.map(function (s) {
      var items = list.filter(function (p) { return (p.stato || "Da iniziare") === s; });
      return '<div class="kcol"><h3>' + s + "<span>" + items.length + "</span></h3>" + items.map(function (p) {
        var k = by(D.com, p.commessa_id);
        return '<div class="tsk" data-open-prog="' + p.id + '"><div class="tsktop">' + esc(p.nome) + (p.pro_id ? avatar(p.pro_id, 22) : "") + "</div>" +
          '<div class="meta"><span class="faint">' + esc(k ? nameOf(D.cli, k.cliente_id) : "") + "</span><span>" + (p.fine ? dshort(p.fine) : "") + "</span></div>" +
          prog(avanzProg(p)) + "</div>";
      }).join("") + "</div>";
    }).join("") + "</div></div>";
  }
  h += '<div class="grid g3">';
  list.forEach(function (p) {
    var k = by(D.com, p.commessa_id), lv = lavOf(p.id);
    var ore = sum(oreOfProg(p.id), function (o) { return o.ore; });
    var stim = sum(lv, function (l) { return l.ore_stimate; });
    var tk = taskOfProg(p.id).filter(function (t) { return t.stato !== "Fatto"; });
    var av = avanzProg(p);
    var late = p.fine && p.fine < today() && p.stato !== "Completato";
    h += '<div class="card pcard" data-route="progetto|' + p.id + '|lavorazioni">' +
      '<div class="pctop"><div><h2>' + esc(k ? nameOf(D.cli, k.cliente_id) : "Senza cliente") + '</h2>' +
      '<div class="pcsub">' + esc(p.nome) + (k ? " · " + esc(k.titolo) : "") + "</div></div>" +
      '<span class="badge ' + (p.stato === "Completato" ? "b-green" : p.stato === "In corso" ? "b-terra" : p.stato === "In attesa cliente" ? "b-amber" : "") + '">' + esc(p.stato || "—") + "</span></div>" +
      '<div class="pcbody">' + ring(av, 62) +
      "<table><tbody>" +
      row2("Lavorazioni", lv.length + (tk.length ? ' · <span class="faint">' + tk.length + " attività aperte</span>" : "")) +
      row2("Ore", num(ore, 1) + " h" + (stim ? ' <span class="faint">su ' + num(stim, 0) + " stimate</span>" : "")) +
      row2("Consegna", p.fine ? (late ? '<span class="badge b-red">' + dt(p.fine) + "</span>" : dt(p.fine)) : "—") +
      "</tbody></table></div>" +
      '<div class="pfoot"><span>' + (p.pro_id ? avatar(p.pro_id, 24) + " " + esc(nameOf(D.pros, p.pro_id).split(" ")[0]) : '<span class="faint">nessuno</span>') + "</span>" +
      "<b>" + eur(valoreProg(p.id)) + "</b></div></div>";
  });
  return h + "</div>";
}

function vProgetto() {
  var p = by(D.prog, current);
  if (!p) return '<div class="card">Progetto non trovato. <button class="lnk" data-go="progetti">Torna ai progetti</button></div>';
  var k = by(D.com, p.commessa_id);
  var lv = lavOf(p.id), tk = taskOfProg(p.id), ore = oreOfProg(p.id), mt = matOfProg(p.id);
  var oreT = sum(ore, function (o) { return o.ore; }), stim = sum(lv, function (l) { return l.ore_stimate; });
  var av = avanzProg(p), t = tab || "lavorazioni";
  var tm = timerMio();

  var h = crumbs([["Lavoro"], ["Progetti", "progetti"], [p.nome]]);
  h += '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + esc(k ? nameOf(D.cli, k.cliente_id) : "—") + (k ? ' · <button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" : "") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-edit="prog:' + p.id + '">Modifica</button>' +
    '<button class="btn sm" data-new="lav" data-ctx-prog="' + p.id + '">+ Lavorazione</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(av + " %", "Avanzamento", lv.filter(function (l) { return l.stato === "Completata"; }).length + " lavorazioni su " + lv.length) +
    kpi(num(oreT, 1) + " h", "Ore lavorate", stim ? "su " + num(stim, 0) + " h stimate" : "nessuna stima") +
    kpi(eur(valoreProg(p.id)), "Valore a preventivo", righeProg(p.id).length + " voci") +
    kpi(String(tk.filter(function (x) { return x.stato !== "Fatto"; }).length), "Attività aperte", p.visibile_cliente ? "visibile al cliente" : "non condiviso") + "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div><div class="card">' +
    schede([["lavorazioni", "Lavorazioni", lv.length], ["attivita", "Attività", tk.filter(function (x) { return x.stato !== "Fatto"; }).length], ["materiali", "Materiali", mt.length], ["ore", "Ore", num(oreT, 1)], ["note", "Note"]], t, "progetto", p.id);

  if (t === "lavorazioni") {
    h += '<div class="cardhead"><h2>Lavorazioni</h2><button class="btn sm ghost" data-new="lav" data-ctx-prog="' + p.id + '">+ Lavorazione</button></div>';
    h += lv.length ? lv.map(function (l) {
      var lo = sum(oreOfLav(l.id), function (o) { return o.ore; });
      var lt = taskOfLav(l.id), aperte = lt.filter(function (x) { return x.stato !== "Fatto"; });
      var perc = l.ore_stimate ? Math.min(100, Math.round(lo / l.ore_stimate * 100)) : 0;
      var attiva = tm && tm.lavorazione_id === l.id;
      return '<div class="lav"><div class="lavtop"><div><b>' + esc(l.nome) + '</b> <span class="badge ' + (l.stato === "Completata" ? "b-green" : l.stato === "In corso" ? "b-terra" : "") + '">' + esc(l.stato) + "</span>" +
        (l.descrizione ? '<div class="faint">' + esc(l.descrizione) + "</div>" : "") + "</div><div>" + (l.pro_id ? avatar(l.pro_id, 26) : "") + "</div></div>" +
        '<div class="lavbar"><span class="faint">' + num(lo, 1) + " h" + (l.ore_stimate ? " / " + num(l.ore_stimate, 0) + " h" : "") + "</span>" + prog(perc) + "</div>" +
        '<div class="lavact"><span class="faint">' + aperte.length + " attività aperte su " + lt.length + "</span><span>" +
        (attiva ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(tm.iniziato) + "</span></button>"
          : '<button class="btn sm ghost" data-tstart-lav="' + l.id + '">▶ Timer</button>') +
        '<button class="btn sm ghost" data-new="ore" data-ctx-lav="' + l.id + '">+ Ore</button>' +
        '<button class="btn sm ghost" data-open-lav="' + l.id + '">Apri</button>' +
        '<button class="btn sm ghost" data-edit="lav:' + l.id + '">Modifica</button></span></div>' +
        (aperte.length ? '<div class="checklist" style="margin-top:10px">' + aperte.slice(0, 4).map(function (x) { return riga(x, lt); }).join("") + "</div>" : "") +
        '<form class="qadd" data-qadd-lav="' + l.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi un\'attività a questa lavorazione" autocomplete="off"></form>' +
        "</div>";
    }).join("") : vuoto("Nessuna lavorazione: qui dentro spezzi il progetto nei lavori veri (es. Programmazione backend).", '<button class="lnk" data-new="lav" data-ctx-prog="' + p.id + '">Crea la prima</button>');
  }
  if (t === "attivita") {
    h += '<div class="cardhead"><h2>Tutte le attività del progetto</h2></div>';
    h += tk.length ? '<div class="checklist">' + tk.filter(function (x) { return !x.padre_id; }).map(function (x) { return riga(x, tk); }).join("") + "</div>" : vuoto("Nessuna attività.");
  }
  if (t === "materiali") {
    h += '<div class="cardhead"><h2>Materiali del progetto</h2><button class="btn sm ghost" data-new="mat" data-ctx="' + p.commessa_id + '">+ Aggiungi</button></div>';
    h += '<div class="drop" id="drop" data-kid="' + p.commessa_id + '"><b>Trascina qui i file</b><span class="faint">oppure <label class="lnk">scegli dal computer<input type="file" id="fileinp" multiple style="display:none"></label></span></div>';
    h += mt.length ? "<table><tbody>" + mt.map(function (m) {
      return "<tr><td>" + (m.path ? '<button class="lnk" data-file="' + m.id + '">' + esc(m.nome) + "</button>" : m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.nome) + "</a>" : esc(m.nome)) + '</td><td><span class="badge">' + esc(m.tipo || "") + '</span></td><td class="num"><button class="lnk" data-vis="' + m.id + '">' + (m.visibile_cliente ? '<span class="badge b-blue">cliente</span>' : '<span class="badge">solo studio</span>') + "</button></td></tr>";
    }).join("") + "</tbody></table>" : "";
  }
  if (t === "ore") {
    h += '<div class="cardhead"><h2>Le mie ore su questo progetto</h2><button class="btn sm ghost" data-new="ore" data-ctx-prog="' + p.id + '">+ Registra ore</button></div>';
    h += '<p class="faint" style="margin-bottom:12px">Le ore sono private: vedi solo le tue, servono a te per capire quanto ti costa davvero un lavoro.</p>';
    h += ore.length ? tblOre(ore) : vuoto("Nessuna ora registrata su questo progetto.", '<button class="lnk" data-new="ore" data-ctx-prog="' + p.id + '">Registra le prime</button>');
  }
  if (t === "note") {
    h += '<div class="cardhead"><h2>Note del progetto</h2><div style="display:flex;gap:8px;align-items:center"><span class="faint" id="notestat"></span><button class="btn sm ghost" data-notedit-p="' + (NOTEDIT ? "0" : "1") + '">' + (NOTEDIT ? "Anteprima" : "Scrivi") + "</button></div></div>";
    h += NOTEDIT
      ? '<textarea id="noteprog" class="doc" placeholder="Appunti condivisi con chi lavora su questo progetto">' + esc(p.note_doc || "") + "</textarea>"
      : ((p.note_doc && p.note_doc.trim()) ? md(p.note_doc) : vuoto("Nessuna nota su questo progetto.", '<button class="lnk" data-notedit-p="1">Scrivi</button>'));
  }
  h += "</div></div><div>";

  h += '<div class="card"><h3 style="margin-bottom:14px">Scheda</h3>' +
    qcampo("prog", p.id, "stato", "Stato", qsel("prog", p.id, "stato", sel(["Da iniziare", "In corso", "In attesa cliente", "Completato"], p.stato || "Da iniziare"))) +
    qcampo("prog", p.id, "pro_id", "Chi lo segue", qsel("prog", p.id, "pro_id", opt(D.pros, p.pro_id))) +
    '<div class="row2">' +
      qcampo("prog", p.id, "inizio", "Inizio", qinput("prog", p.id, "inizio", "date", p.inizio)) +
      qcampo("prog", p.id, "fine", "Consegna", qinput("prog", p.id, "fine", "date", p.fine)) +
    "</div>" +
    qcampo("prog", p.id, "visibile_cliente", "Il cliente lo vede", qsel("prog", p.id, "visibile_cliente", sel(["si", "no"], p.visibile_cliente === false ? "no" : "si"))) +
    "<table><tbody>" +
    row2("Cliente", esc(k ? nameOf(D.cli, k.cliente_id) : "—")) +
    row2("Preventivo", k ? '<button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" : "—") +
    row2("Descrizione", esc(p.descrizione || "—")) + "</tbody></table>" +
    '<div style="margin-top:12px"><button class="btn sm ghost" data-edit="prog:' + p.id + '">Apri il modulo completo</button></div></div>';

  h += '<div class="card"><h3 style="margin-bottom:12px">Chi ci lavora</h3>';
  var perPro = {};
  lv.forEach(function (l) { if (l.pro_id) perPro[l.pro_id] = (perPro[l.pro_id] || 0) + sum(oreOfLav(l.id), function (o) { return o.ore; }); });
  var pk = Object.keys(perPro);
  h += pk.length ? '<div class="bars">' + pk.map(function (id) { return bar(nameOf(D.pros, id), perPro[id], Math.max.apply(null, pk.map(function (x) { return perPro[x]; }).concat([1])), num(perPro[id], 1) + " h"); }).join("") + "</div>" : vuoto("Nessuno assegnato.");
  h += "</div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Ultime ore</h3>' + tblOre(ore.slice(0, 8)) + "</div>";
  return h + "</div></div>";
}

function vLavorazione() {
  var l = by(D.lav, current);
  if (!l) return '<div class="card">Lavorazione non trovata. <button class="lnk" data-go="progetti">Torna ai progetti</button></div>';
  var p = by(D.prog, l.progetto_id), k = by(D.com, l.commessa_id);
  var lt = taskOfLav(l.id), lo = oreOfLav(l.id);
  var ore = sum(lo, function (o) { return o.ore; });
  var perc = l.ore_stimate ? Math.min(100, Math.round(ore / l.ore_stimate * 100)) : 0;
  var tm = timerMio(), attiva = tm && tm.lavorazione_id === l.id;
  var h = crumbs(p ? [["Lavoro"], ["Progetti", "progetti"], [p.nome, "progetto", p.id, "lavorazioni"], [l.nome]] : [["Lavoro"], ["Progetti", "progetti"], [l.nome]]);
  h += '<div class="top"><h1>' + esc(l.nome) + '<span class="sub">' + (p ? '<button class="lnk" data-open-prog="' + p.id + '">' + esc(p.nome) + "</button> · " : "") + esc(k ? nameOf(D.cli, k.cliente_id) : "") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-edit="lav:' + l.id + '">Modifica</button>' +
    (attiva ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(tm.iniziato) + "</span></button>" : '<button class="btn sm" data-tstart-lav="' + l.id + '">▶ Avvia timer</button>') +
    "</div></div>";
  h += '<div class="grid g4">' +
    kpi(num(ore, 1) + " h", "Ore registrate", l.ore_stimate ? "su " + num(l.ore_stimate, 0) + " stimate · " + perc + "%" : "nessuna stima") +
    kpi(String(lt.filter(function (x) { return x.stato !== "Fatto"; }).length), "Attività aperte", lt.length + " in totale") +
    kpi(esc(l.stato), "Stato", l.pro_id ? nameOf(D.pros, l.pro_id) : "—") +
    kpi(dt(l.fine), "Consegna", l.inizio ? "dal " + dt(l.inizio) : "") + "</div>";
  var t = tab || "attivita";
  h += schede([["attivita", "Attività", lt.filter(function (x) { return x.stato !== "Fatto"; }).length], ["ore", "Ore", num(ore, 1)], ["materiali", "Materiali", D.mat.filter(function (m) { return m.lavorazione_id === l.id; }).length]], t, "lavorazione", l.id);

  h += '<div class="grid g32"><div>';
  if (t === "attivita") {
    h += '<div class="card"><div class="cardhead"><h2>Attività</h2><button class="btn sm ghost" data-new="task" data-ctx-lav="' + l.id + '">Nuova in dettaglio</button></div>' +
      '<div class="tlist">' + lt.filter(function (x) { return !x.padre_id; }).map(rigaTaskLista).join("") + "</div>" +
      '<form class="qadd" data-qadd-lav="' + l.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi un\'attività a questa lavorazione" autocomplete="off"></form></div>';
  }
  if (t === "ore") {
    h += '<div class="card"><div class="cardhead"><h2>Ore su questa lavorazione</h2><button class="btn sm ghost" data-new="ore" data-ctx-lav="' + l.id + '">+ Registra</button></div>' +
      '<p class="faint" style="margin-bottom:12px">Vedi solo le tue: le ore di chi altro ci lavora restano sue.</p>' + tblOre(lo) + "</div>";
  }
  if (t === "materiali") {
    var ml = D.mat.filter(function (m) { return m.lavorazione_id === l.id; });
    h += '<div class="card"><div class="cardhead"><h2>Materiali</h2><button class="btn sm ghost" data-new="mat" data-ctx-lav="' + l.id + '">+ Aggiungi</button></div>' +
      (ml.length ? "<table><tbody>" + ml.map(function (m) {
        return "<tr><td>" + (m.path ? '<button class="lnk" data-file="' + m.id + '">' + esc(m.nome) + "</button>" : esc(m.nome)) + '</td><td class="faint">' + dshort(m.created_at) + "</td></tr>";
      }).join("") + "</tbody></table>" : vuoto("Nessun materiale su questa lavorazione.")) + "</div>";
  }
  h += "</div><div>";

  h += '<div class="card"><h3 style="margin-bottom:14px">Scheda</h3>' +
    qcampo("lav", l.id, "stato", "Stato", qsel("lav", l.id, "stato", sel(["Da iniziare", "In corso", "In attesa", "Completata"], l.stato || "Da iniziare"))) +
    qcampo("lav", l.id, "pro_id", "Chi la esegue", qsel("lav", l.id, "pro_id", opt(D.pros, l.pro_id))) +
    '<div class="row2">' +
      qcampo("lav", l.id, "inizio", "Inizio", qinput("lav", l.id, "inizio", "date", l.inizio)) +
      qcampo("lav", l.id, "fine", "Consegna", qinput("lav", l.id, "fine", "date", l.fine)) +
    "</div>" +
    qcampo("lav", l.id, "ore_stimate", "Ore stimate", qinput("lav", l.id, "ore_stimate", "number", l.ore_stimate, ' step="0.5"')) +
    "<table><tbody>" +
    row2("Progetto", p ? '<button class="lnk" data-open-prog="' + p.id + '">' + esc(p.nome) + "</button>" : "—") +
    row2("Preventivo", k ? '<button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" : "—") +
    row2("Consumo", l.ore_stimate ? perc + "% delle ore stimate" : "—") +
    row2("Descrizione", esc(l.descrizione || "—")) + "</tbody></table>" +
    '<div style="margin-top:12px"><button class="btn sm ghost" data-edit="lav:' + l.id + '">Apri il modulo completo</button></div></div>';
  if (l.ore_stimate) h += '<div class="card"><h3 style="margin-bottom:10px">Stima contro consuntivo</h3>' + prog(perc) + '<p class="faint" style="margin-top:8px">' + num(ore, 1) + " h fatte su " + num(l.ore_stimate, 0) + " stimate" + (ore > l.ore_stimate ? " · sforato di " + num(ore - l.ore_stimate, 1) + " h" : " · restano " + num(l.ore_stimate - ore, 1) + " h") + "</p></div>";
  return h + "</div></div>";
}

/* ---------------- calendario ---------------- */
function eventiDi(g) {
  var out = [];
  ftask().forEach(function (t) { if (t.scadenza === g && t.stato !== "Fatto") out.push({ c: "b-amber", t: t.titolo, s: "attività", act: 'data-open-task="' + t.id + '"' }); });
  D.fasi.forEach(function (f) { if (f.fine === g) out.push({ c: "b-blue", t: f.nome, s: "fine fase", act: 'data-open-com="' + f.commessa_id + '"' }); });
  D.lav.forEach(function (l) { if (l.fine === g && l.stato !== "Completata") out.push({ c: "b-terra", t: l.nome, s: "consegna lavorazione", act: 'data-open-lav="' + l.id + '"' }); });
  D.pag.forEach(function (p) { if (p.scadenza === g && p.stato !== "Incassato") out.push({ c: "b-red", t: eur(p.importo) + " · " + p.nome, s: "pagamento", act: 'data-open-com="' + p.commessa_id + '"' }); });
  D.pren.forEach(function (r) { if (r.data === g) out.push({ c: "b-green", t: nameOf(D.spazi, r.spazio_id), s: r.slot || "prenotazione", act: 'data-go="spazi"' }); });
  return out;
}
function vCalendario() {
  var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  var base = new Date(oggi.getFullYear(), oggi.getMonth() + CAL, 1);
  var mese = base.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  var start = new Date(base); start.setDate(1 - ((base.getDay() + 6) % 7));
  var h = head("Calendario", mese.charAt(0).toUpperCase() + mese.slice(1),
    '<div class="wknav"><button class="btn sm ghost" data-cal="-1">‹</button>' + (CAL ? '<button class="btn sm ghost" data-cal="0">Oggi</button>' : "") + '<button class="btn sm ghost" data-cal="1">›</button></div>');

  h += '<div class="card"><div class="cal">';
  ["lun", "mar", "mer", "gio", "ven", "sab", "dom"].forEach(function (d) { h += '<div class="caldow">' + d + "</div>"; });
  for (var i = 0; i < 42; i++) {
    var d = new Date(start.getTime() + i * 86400000), g = iso(d);
    var fuori = d.getMonth() !== base.getMonth();
    var ev = eventiDi(g);
    var oreG = sum(fore().filter(function (o) { return o.data === g; }), function (o) { return o.ore; });
    h += '<div class="calday' + (fuori ? " out" : "") + (g === today() ? " today" : "") + '" data-day="' + g + '">' +
      '<div class="caltop"><span>' + d.getDate() + "</span>" + (oreG ? '<span class="calore">' + num(oreG, 1) + " h</span>" : "") + "</div>" +
      ev.slice(0, 3).map(function (e) { return '<div class="calev ' + e.c + '" ' + e.act + ' title="' + esc(e.s + ": " + e.t) + '">' + esc(e.t) + "</div>"; }).join("") +
      (ev.length > 3 ? '<div class="faint" style="font-size:.72rem">+' + (ev.length - 3) + " altro</div>" : "") +
      "</div>";
  }
  h += "</div></div>";

  var prossimi = [];
  for (var j = 0; j < 14; j++) {
    var dd = iso(new Date(oggi.getTime() + j * 86400000));
    eventiDi(dd).forEach(function (e) { prossimi.push({ g: dd, e: e }); });
  }
  h += '<div class="grid g2" style="margin-top:18px"><div class="card"><div class="cardhead"><h2>Prossimi 14 giorni</h2></div>';
  h += prossimi.length ? '<ul class="timeline">' + prossimi.slice(0, 12).map(function (x) {
    return "<li><b " + x.e.act + ' style="cursor:pointer">' + esc(x.e.t) + '</b><div class="when">' + esc(x.e.s) + " · " + dt(x.g) + "</div></li>";
  }).join("") + "</ul>" : vuoto("Niente in programma.");
  h += '</div><div class="card"><div class="cardhead"><h2>Come si legge</h2></div><div class="legend" style="flex-direction:column;gap:10px;align-items:flex-start">' +
    '<span><i style="background:var(--amber)"></i>Attività da fare</span>' +
    '<span><i style="background:var(--terra)"></i>Consegna di una lavorazione</span>' +
    '<span><i style="background:var(--blue)"></i>Fine di una fase</span>' +
    '<span><i style="background:var(--red)"></i>Pagamento in scadenza</span>' +
    '<span><i style="background:var(--green)"></i>Prenotazione di uno spazio</span>' +
    '</div><p class="faint" style="margin-top:12px">Clicca un giorno vuoto per creare un attività con quella scadenza.</p></div></div>';
  return h;
}

/* ---------------- portale cliente ---------------- */
function vCliProgetti() {
  var h = '<div class="top"><h1>I miei progetti<span class="sub">Tutto quello che stiamo facendo per te</span></h1></div>';
  if (!PORT.length) return h + '<div class="card">' + vuoto("Non ci sono ancora progetti attivi.") + "</div>";
  var attesa = [];
  PORT.forEach(function (p) { (p.approvazioni || []).forEach(function (a) { if (a.stato === "In attesa") attesa.push({ p: p, a: a }); }); });
  if (attesa.length) {
    h += '<div class="card" style="border-color:var(--terra)"><div class="cardhead"><h2>Serve la tua conferma</h2></div>' +
      attesa.map(function (x) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-soft)"><div><b>' + esc(x.a.tipo) + "</b> · " + esc(x.p.titolo) + '<div class="faint">' + esc(x.a.note || "") + " · richiesta il " + dt(x.a.richiesta) + '</div></div><div style="display:flex;gap:8px"><button class="btn sm ghost" data-appr-no="' + x.a.id + '">Chiedi modifiche</button><button class="btn sm" data-appr-si="' + x.a.id + '">Approva</button></div></div>';
      }).join("") + "</div>";
  }
  PORT.forEach(function (p) {
    var fasi = p.fasi || [], av = fasi.length ? Math.round(fasi.reduce(function (t, f) { return t + (f.avanzamento || 0); }, 0) / fasi.length) : null;
    h += '<div class="card"><div class="cardhead"><h2>' + esc(p.titolo) + '</h2><span class="badge ' + (STATO_COL[p.stato] || "") + '">' + esc(p.stato) + "</span></div>" +
      '<div class="grid g3">' + kpi(av == null ? "—" : av + " %", "Avanzamento") + kpi(dt(p.scadenza), "Consegna prevista") + kpi(eur(p.totale), "Valore concordato") + "</div>" +
      (av == null ? "" : '<div style="margin-top:14px">' + prog(av) + "</div>") +
      '<div style="margin-top:16px"><button class="btn sm" data-open-prog="' + p.id + '">Apri il progetto</button></div></div>';
  });
  return h;
}
function vCliProgetto() {
  var p = null; PORT.forEach(function (x) { if (x.id === current) p = x; });
  if (!p) return '<div class="card">Progetto non trovato. <button class="lnk" data-go="progetti">Torna ai progetti</button></div>';
  var fasi = p.fasi || [], av = fasi.length ? Math.round(fasi.reduce(function (t, f) { return t + (f.avanzamento || 0); }, 0) / fasi.length) : null;
  var h = '<div class="top"><h1>' + esc(p.titolo) + '<span class="sub">' + esc(p.stato) + '</span></h1><div class="tools"><button class="btn sm ghost" data-go="progetti">← I miei progetti</button></div></div>';
  h += '<div class="grid g4">' + kpi(av == null ? "—" : av + " %", "Avanzamento", fasi.length + " fasi") + kpi(dt(p.inizio), "Inizio") + kpi(dt(p.scadenza), "Consegna prevista") + kpi(eur(p.totale), "Valore concordato") + "</div>";
  h += '<div class="grid g32" style="margin-top:16px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>A che punto siamo</h2></div>';
  h += fasi.length ? fasi.map(function (f) {
    return '<div style="padding:12px 0;border-bottom:1px solid var(--line-soft)"><div style="display:flex;justify-content:space-between;gap:10px"><b>' + esc(f.nome) + '</b><span class="badge ' + (FASE_COL[f.stato] || "") + '">' + esc(f.stato) + "</span></div>" + prog(f.avanzamento) + '<div class="faint" style="margin-top:6px">' + dt(f.inizio) + " → " + dt(f.fine) + " · " + (f.avanzamento || 0) + "%</div></div>";
  }).join("") : vuoto("Le fasi verranno pubblicate a breve.");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Materiali condivisi</h2></div>';
  h += (p.materiali || []).length ? '<table><tbody>' + p.materiali.map(function (m) {
    return "<tr><td>" + (m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.nome) + "</a>" : esc(m.nome)) + (m.note ? '<div class="faint">' + esc(m.note) + "</div>" : "") + '</td><td><span class="badge">' + esc(m.tipo || "—") + '</span></td><td class="num faint">' + dshort(m.data) + "</td></tr>";
  }).join("") + "</tbody></table>" : vuoto("Nessun materiale condiviso per ora.");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Approvazioni</h2></div>';
  h += (p.approvazioni || []).length ? (p.approvazioni).map(function (a) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-soft)"><div><b>' + esc(a.tipo) + '</b><div class="faint">' + esc(a.note || "") + " · " + dt(a.richiesta) + "</div></div>" +
      (a.stato === "In attesa" ? '<div style="display:flex;gap:8px"><button class="btn sm ghost" data-appr-no="' + a.id + '">Chiedi modifiche</button><button class="btn sm" data-appr-si="' + a.id + '">Approva</button></div>' : '<span class="badge ' + (APPR_COL[a.stato] || "") + '">' + esc(a.stato) + "</span>") + "</div>";
  }).join("") : vuoto("Nessuna approvazione richiesta.");
  h += "</div></div><div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Cosa comprende</h3><table><tbody>' + (p.servizi || []).map(function (s) {
    return "<tr><td>" + esc(s.nome) + '<div class="faint">a cura di ' + esc(s.cura || "Giraffa Studio") + '</div></td><td class="num">' + eur(s.prezzo) + "</td></tr>";
  }).join("") + "</tbody></table></div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Pagamenti</h3><table><tbody>' + (p.pagamenti || []).map(function (pg) {
    return "<tr><td>" + esc(pg.nome) + '<div class="faint">' + dt(pg.scadenza) + '</div></td><td class="num">' + eur(pg.importo) + '</td><td class="num"><span class="badge ' + (pg.stato === "Incassato" ? "b-green" : "b-amber") + '">' + esc(pg.stato) + "</span></td></tr>";
  }).join("") + "</tbody></table></div>";
  if (p.note) h += '<div class="card"><h3 style="margin-bottom:8px">Note</h3><p class="muted">' + esc(p.note) + "</p></div>";
  return h + "</div></div>";
}
function buildNavCliente() {
  el("#nav").innerHTML = '<div class="navgroup">Area cliente</div><button data-go="progetti" class="' + (view === "progetti" || view === "progetto" ? "on" : "") + '">I miei progetti<span class="cnt">' + PORT.length + "</span></button>";
  el("#mename").textContent = "Area cliente";
  el("#meemail").innerHTML = esc(me.email) + '<br><span class="badge" style="margin-top:6px">Cliente</span>';
}
async function apprRispondi(id, esito) {
  var nota = esito === "Modifiche richieste" ? prompt("Cosa vuoi far modificare?") : null;
  if (esito === "Modifiche richieste" && nota === null) return;
  var r = PLINK
    ? await sb.rpc("portale_link_rispondi", { tok: PLINK.tok, pwd: PLINK.pwd, a: id, esito: esito, nota: nota })
    : await sb.rpc("portale_rispondi", { a: id, esito: esito, nota: nota });
  if (r.error) { toast(r.error.message, true); return; }
  PORT = (PLINK ? (r.data && r.data.progetti) : r.data) || PORT;
  toast(esito === "Approvata" ? "Approvato, grazie!" : "Richiesta inviata allo studio");
  render();
}

/* ---------------- preventivo / anteprima ---------------- */
function docHead(k, titolo) {
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start"><i class="mark" style="height:52px"></i><div style="text-align:right"><h2>' + titolo + '</h2><div class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + dt(today()) + "</div></div></div>";
}
function openPreventivo(id) {
  var k = by(D.com, id); if (!k) return;
  var c = calc(k), rr = righeOf(k.id), pgt = progOf(k.id), pg = pagOf(k.id);
  var corpo = "";
  var gruppi = pgt.map(function (p) { return { p: p, r: rr.filter(function (x) { return x.progetto_id === p.id && !x.opzionale; }) }; });
  var senza = rr.filter(function (x) { return !x.progetto_id && !x.opzionale; });
  if (senza.length) gruppi.push({ p: { nome: "Altre voci" }, r: senza });
  gruppi.forEach(function (g) {
    if (!g.r.length) return;
    corpo += '<h3 style="margin:22px 0 8px">' + esc(g.p.nome) + (g.p.pro_id ? ' <span class="faint">· a cura di ' + esc(nameOf(D.pros, g.p.pro_id)) + "</span>" : "") + "</h3>" +
      '<table><thead><tr><th>Voce</th><th class="num">Q.tà</th><th class="num">Prezzo un.</th><th class="num">Importo</th></tr></thead><tbody>' +
      g.r.map(function (r) {
        var rc = rigaCalc(r);
        return "<tr><td><b>" + esc(rc.nome) + "</b>" + (r.descrizione ? '<div class="faint">' + esc(r.descrizione) + "</div>" : "") +
          (r.ricorrente ? '<div class="faint">' + esc(r.periodo || "Mensile") + ", per " + (r.cicli || 1) + (r.periodo === "Annuale" ? " anni" : " mesi") + "</div>" : "") +
          '</td><td class="num">' + num(rc.q, rc.q % 1 ? 1 : 0) + " " + esc(rc.unita || "") + '</td><td class="num">' + eur(rc.pu) + (r.sconto ? " −" + r.sconto + "%" : "") + '</td><td class="num">' + eur(rc.prezzo) + "</td></tr>";
      }).join("") +
      '</tbody><tfoot><tr><td colspan="3"><b>Totale ' + esc(g.p.nome) + '</b></td><td class="num"><b>' + eur(sum(g.r, function (x) { return rigaCalc(x).prezzo; })) + "</b></td></tr></tfoot></table>";
  });
  var opzR = rr.filter(function (x) { return x.opzionale; });
  modal('<div class="box wide">' + docHead(k, "Preventivo") +
    '<h2 style="margin-top:22px">' + esc(k.titolo) + "</h2>" + (k.note ? '<p class="muted">' + esc(k.note) + "</p>" : "") +
    corpo +
    '<table style="margin-top:20px"><tbody>' +
    row2("Imponibile", eur(c.imp + c.sconto)) +
    (c.sconto ? row2("Sconto commerciale (" + (k.sconto || 0) + "%)", "−" + eur(c.sconto)) : "") +

    row2("<b>Totale imponibile</b>", "<b>" + eur(c.tot) + "</b>") +
    row2("IVA " + (k.iva == null ? 22 : k.iva) + "%", eur(c.iva)) +
    row2("<b>Totale</b>", "<b>" + eur(c.lordo) + "</b>") +
    (c.mrr ? row2("Di cui ricorrente", eur(c.mrr) + " al mese") : "") +
    "</tbody></table>" +
    (opzR.length ? '<h3 style="margin:22px 0 8px">Opzioni, se le vorrete attivare</h3><table><tbody>' + opzR.map(function (r) {
      var rc = rigaCalc(r);
      return "<tr><td>" + esc(rc.nome) + (r.descrizione ? '<div class="faint">' + esc(r.descrizione) + "</div>" : "") + '</td><td class="num">' + eur(rc.prezzo) + "</td></tr>";
    }).join("") + "</tbody></table>" : "") +
    (pg.length ? '<h3 style="margin:22px 0 8px">Piano di pagamento</h3><table><tbody>' + pg.map(function (p) { return "<tr><td>" + esc(p.nome) + '</td><td class="faint">' + dt(p.scadenza) + '</td><td class="num">' + eur(p.importo) + "</td></tr>"; }).join("") + "</tbody></table>" : "") +
    (k.condizioni ? '<h3 style="margin:22px 0 8px">Condizioni</h3>' + md(k.condizioni) : "") +
    '<p class="faint" style="margin-top:16px">Validità ' + (k.validita == null ? 30 : k.validita) + " giorni. Ogni professionista opera con la propria partita IVA sotto il coordinamento di Giraffa Studio.</p>" +
    '<div class="actions noprint"><button class="btn ghost" data-close>Chiudi</button><button class="btn" onclick="window.print()">Stampa / PDF</button></div></div>');
}
function openPortale(id) {
  var k = by(D.com, id); if (!k) return;
  var c = calc(k), fs = fasiOf(k.id), mt = matOf(k.id).filter(function (m) { return m.visibile_cliente; }), pg = pagOf(k.id);
  modal('<div class="box wide">' + docHead(k, "Stato lavori") +
    '<h2 style="margin-top:22px">' + esc(k.titolo) + '</h2><p class="muted">' + esc(k.note || "") + "</p>" +
    '<div class="grid g3" style="margin-top:16px">' + kpi(esc(k.stato), "Stato") + kpi((avanzamento(k.id) || 0) + " %", "Avanzamento") + kpi(eur(c.tot), "Valore concordato") + "</div>" +
    '<h3 style="margin:20px 0 8px">Fasi</h3>' + (fs.length ? "<table><tbody>" + fs.filter(function (f) { return f.visibile_cliente; }).map(function (f) { return "<tr><td>" + esc(f.nome) + '</td><td class="num">' + (f.avanzamento || 0) + '%</td><td class="num"><span class="badge ' + (FASE_COL[f.stato] || "") + '">' + esc(f.stato) + "</span></td></tr>"; }).join("") + "</tbody></table>" : vuoto("—")) +
    '<h3 style="margin:20px 0 8px">Materiali condivisi</h3>' + (mt.length ? "<table><tbody>" + mt.map(function (m) { return "<tr><td>" + esc(m.nome) + '</td><td class="faint">' + esc(m.tipo || "") + "</td></tr>"; }).join("") + "</tbody></table>" : vuoto("—")) +
    '<h3 style="margin:20px 0 8px">Pagamenti</h3>' + (pg.length ? "<table><tbody>" + pg.map(function (p) { return "<tr><td>" + esc(p.nome) + '</td><td class="faint">' + dt(p.scadenza) + '</td><td class="num">' + eur(p.importo) + '</td><td class="num">' + esc(p.stato) + "</td></tr>"; }).join("") + "</tbody></table>" : vuoto("—")) +
    '<p class="faint" style="margin-top:14px">È quello che vede il cliente dal suo accesso: nessun costo interno, nessun margine.</p>' +
    '<div class="actions noprint"><button class="btn ghost" data-close>Chiudi</button><button class="btn" onclick="window.print()">Stampa / PDF</button></div></div>');
}
/* ---------------- form engine ---------------- */
function opt(list, val, f) { return '<option value=""></option>' + list.map(function (o) { return '<option value="' + o.id + '"' + (val === o.id ? " selected" : "") + ">" + esc(o[f || "nome"]) + "</option>"; }).join(""); }
function sel(list, val) { return list.map(function (o) { return '<option value="' + esc(o) + '"' + (val === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join(""); }
function selKV(list, val) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (val === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); }
function fld(n, l, t, v, req) {
  if (t === "textarea") return '<div class="field"><label>' + l + '</label><textarea name="' + n + '">' + esc(v || "") + "</textarea></div>";
  return '<div class="field"><label>' + l + '</label><input name="' + n + '" type="' + t + '"' + (t === "number" ? ' step="any"' : "") + (req ? " required" : "") + ' value="' + esc(v == null ? "" : v) + '" /></div>';
}
function selField(n, l, html) { return '<div class="field"><label>' + l + "</label><select name=\"" + n + '">' + html + "</select></div>"; }
var PROS_PRO = function () { return D.pros; };
var PROS_PR = function () { return D.pros; };

var FORMS = {
  com: { t: "Preventivo", tb: "com", f: function (r) {
    return fld("titolo", "Titolo", "text", r.titolo, true) +
      '<div class="row2">' + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) + selField("stato", "Stato", sel(STATI, r.stato || "Bozza")) + "</div>" +
      '<div class="row2">' + selField("owner_id", "Owner (chi ha il rapporto)", opt(D.pros, r.owner_id || me.pro_id)) + selField("pm_id", "Regia / PM", opt(D.pros, r.pm_id)) + "</div>" +
      selField("pr_id", "Chi ha portato il cliente", opt(D.pros, r.pr_id)) +

      '<div class="row2">' + selField("tipo_prezzo", "Come si paga il lavoro", sel(["Fisso", "Tempo e materiali", "Retainer"], r.tipo_prezzo || "Fisso")) + fld("budget_importo", "Budget concordato (€)", "number", r.budget_importo) + "</div>" +
      '<div class="row2">' + fld("retainer_mensile", "Retainer mensile (€, se ricorrente)", "number", r.retainer_mensile) + fld("budget_ore", "Budget ore", "number", r.budget_ore) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("scadenza", "Consegna prevista", "date", r.scadenza) + "</div>" +
      '<div class="row2">' + fld("sconto", "Sconto commerciale (%)", "number", r.sconto || 0) + fld("iva", "IVA (%)", "number", r.iva == null ? 22 : r.iva) + "</div>" +
      '<div class="row2">' + fld("validita", "Validità preventivo (giorni)", "number", r.validita == null ? 30 : r.validita) + fld("probabilita", "Probabilità di chiusura (%)", "number", r.probabilita == null ? 50 : r.probabilita) + "</div>" +
      fld("condizioni", "Condizioni e tempi (compaiono sul preventivo)", "textarea", r.condizioni) +
      fld("note", "Note interne", "textarea", r.note);
  }},
  vari: { t: "Variante", tb: "vari", f: function (r) {
    return fld("nome", "Cosa cambia", "text", r.nome, true) +
      selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + fld("importo", "Importo aggiuntivo (€)", "number", r.importo) + fld("ore", "Ore aggiuntive", "number", r.ore) + "</div>" +
      '<div class="row2">' + selField("stato", "Stato", sel(["Proposta", "Approvata", "Rifiutata"], r.stato || "Proposta")) + fld("data", "Data", "date", r.data || today()) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione);
  }},
  ev: { t: "Nota di diario", tb: "ev", f: function (r) {
    return selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) +
      fld("testo", "Cosa è successo", "textarea", r.testo);
  }},
  cli: { t: "Cliente", tb: "cli", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      '<div class="row2">' + fld("settore", "Settore", "text", r.settore) + selField("stato", "Stato", sel(["Lead", "Attivo", "Dormiente", "Chiuso"], r.stato || "Lead")) + "</div>" +
      '<div class="row2">' + fld("referente", "Referente", "text", r.referente) + fld("email", "Email", "email", r.email) + "</div>" +
      '<div class="row2">' + fld("telefono", "Telefono", "text", r.telefono) + fld("sito", "Sito web", "text", r.sito) + "</div>" +
      '<div class="row2">' + fld("piva", "P. IVA", "text", r.piva) + selField("owner_id", "Owner", opt(D.pros, r.owner_id || me.pro_id)) + "</div>" +
      fld("indirizzo", "Indirizzo", "text", r.indirizzo) + fld("note", "Note", "textarea", r.note);
  }},
  pros: { t: "Professionista", tb: "pros", priv: ["tariffa_oraria", "note"], f: function (r) {
    var mio = r.id === me.pro_id || !r.id;
    return '<div class="fgroup"><h3>Scheda visibile ai colleghi</h3>' +
      fld("nome", "Nome", "text", r.nome, true) +
      '<div class="row2">' + fld("ruolo", "Cosa fai (es. Fotografo, Sviluppatore)", "text", r.ruolo) + selField("vetting", "Stato", sel(["In valutazione", "Attivo", "Sospeso"], r.vetting || "In valutazione")) + "</div>" +
      fld("competenze", "Competenze (separate da virgola)", "text", r.competenze) +
      '<div class="row2">' + fld("email", "Email", "email", r.email) + fld("telefono", "Telefono", "text", r.telefono) + "</div>" +
      '<div class="row2">' + fld("citta", "Città", "text", r.citta) + fld("piva", "P. IVA", "text", r.piva) + "</div></div>" +
      (mio ? '<div class="fgroup priv"><h3>Solo tuo <span class="badge">privato</span></h3>' +
        '<p class="faint" style="margin-bottom:12px">Questi due campi stanno in una tabella che risponde solo a te: nessun collega può leggerli, nemmeno interrogando il sistema.</p>' +
        fld("tariffa_oraria", "Tariffa oraria (€)", "number", r.tariffa_oraria) +
        fld("note", "Note personali", "textarea", r.note) + "</div>" : "");
  }},
  serv: { t: "Servizio", tb: "serv", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      selField("pro_id", "Professionista", opt(PROS_PRO(), r.pro_id || me.pro_id)) +
      '<div class="row2">' + fld("cat", "Categoria (Foto, Web, Social…)", "text", r.cat) + selField("tipo_unita", "Si vende a", sel(["Forfait", "Giornata", "Mezza giornata", "Ora", "Mese", "Anno", "A consumo"], r.tipo_unita || "Forfait")) + "</div>" +
      '<div class="row2">' + fld("unita", "Come si chiama l unità (progetto, shooting, mese…)", "text", r.unita) + fld("min_qty", "Quantità minima", "number", r.min_qty == null ? 1 : r.min_qty) + "</div>" +
      '<div class="row2">' + selField("ricorrente", "Ricorrente", sel(["no", "si"], r.ricorrente ? "si" : "no")) + selField("periodo", "Periodo", sel(["Mensile", "Annuale"], r.periodo || "Mensile")) + "</div>" +
      '<div class="row2">' + fld("costo", "Compenso al professionista (€)", "number", r.costo) + fld("prezzo", "Prezzo al cliente (€)", "number", r.prezzo) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione);
  }},
  prog: { t: "Progetto", tb: "prog", f: function (r) {
    return fld("nome", "Nome del progetto (Sito, Foto, Social…)", "text", r.nome, true) +
      selField("commessa_id", "Preventivo di riferimento", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + selField("pro_id", "Chi lo segue", opt(PROS_PRO(), r.pro_id || me.pro_id)) + selField("stato", "Stato", sel(["Da iniziare", "In corso", "In attesa cliente", "Completato"], r.stato || "Da iniziare")) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("fine", "Consegna", "date", r.fine) + "</div>" +
      '<div class="row2">' + fld("ordine", "Ordine", "number", r.ordine == null ? 1 : r.ordine) + selField("visibile_cliente", "Visibile al cliente", sel(["si", "no"], r.visibile_cliente === false ? "no" : "si")) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione) +
      fld("note", "Note interne", "textarea", r.note);
  }},
  lav: { t: "Lavorazione", tb: "lav", f: function (r) {
    return fld("nome", "Nome della lavorazione (es. Programmazione backend)", "text", r.nome, true) +
      '<div class="row2">' + selField("progetto_id", "Progetto", D.prog.map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + " · " + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</option>"; }).join("")) +
      selField("pro_id", "Chi la esegue", opt(PROS_PRO(), r.pro_id || me.pro_id)) + "</div>" +
      '<div class="row2">' + selField("stato", "Stato", sel(["Da iniziare", "In corso", "In attesa", "Completata"], r.stato || "Da iniziare")) + fld("ore_stimate", "Ore stimate", "number", r.ore_stimate == null ? 0 : r.ore_stimate) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("fine", "Consegna", "date", r.fine) + "</div>" +
      '<div class="row2">' + fld("ordine", "Ordine", "number", r.ordine == null ? 1 : r.ordine) + selField("visibile_cliente", "Visibile al cliente", sel(["no", "si"], r.visibile_cliente ? "si" : "no")) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione);
  }},
  task: { t: "Attività", tb: "task", f: function (r) {
    return '<div class="fgroup"><h3>Cosa</h3>' +
      fld("titolo", "Titolo", "text", r.titolo, true) +
      fld("descrizione", "Descrizione", "textarea", r.descrizione) +
      '<div class="row2">' + selField("stato", "Stato", sel(TASK_STATI, r.stato || "Da fare")) + selField("priorita", "Priorità", sel(["Bassa", "Media", "Alta"], r.priorita || "Media")) + "</div></div>" +
      '<div class="fgroup"><h3>Dove e chi</h3>' +
      selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progVisibili().map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + " · " + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</option>"; }).join("")) +
      '<div class="row2">' + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + selField("assegnato_id", "Assegnata a", opt(D.pros, r.assegnato_id || me.pro_id)) + "</div>" +
      '<div class="row2">' + fld("sezione", "Sezione", "text", r.sezione) + fld("etichette", "Etichette", "text", r.etichette) + "</div></div>" +
      '<div class="fgroup"><h3>Quando</h3>' +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("scadenza", "Scadenza", "date", r.scadenza) + "</div>" +
      '<div class="row2">' + fld("stimate", "Ore stimate", "number", r.stimate) + selField("ricorrenza", "Si ripete", selKV([["", "no"], ["settimanale", "ogni settimana"], ["quindicinale", "ogni due settimane"], ["mensile", "ogni mese"]], r.ricorrenza || "")) + "</div></div>" +
      fld("note", "Note", "textarea", r.note);
  }},
  ore: { t: "Ore", tb: "ore", f: function (r) {
    var p = me.pro_id ? by(D.pros, me.pro_id) : null;
    return selField("lavorazione_id", "Lavorazione", '<option value="">— nessuna —</option>' + D.lav.map(function (l) {
      return '<option value="' + l.id + '"' + (r.lavorazione_id === l.id ? " selected" : "") + ">" + esc(nameOf(D.prog, l.progetto_id)) + " · " + esc(l.nome) + "</option>";
    }).join("")) +
      '<div class="row2">' + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + selField("pro_id", "Chi", opt(PROS_PRO(), r.pro_id || me.pro_id)) + "</div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + fld("ore", "Ore", "number", r.ore) + "</div>" +
      '<div class="row2">' + fld("tariffa", "Tariffa oraria (€)", "number", r.tariffa == null ? (p ? p.tariffa_oraria : 0) : r.tariffa) + selField("fatturabile", "Fatturabile", sel(["si", "no"], r.fatturabile === false ? "no" : "si")) + "</div>" +
      fld("descrizione", "Descrizione", "text", r.descrizione);
  }},
  mov: { t: "Movimento", tb: "mov", f: function (r) {
    return '<div class="row2">' + selField("tipo", "Tipo", sel(["Attiva", "Passiva"], r.tipo || "Attiva")) + selField("stato", "Stato", sel(["Da emettere", "Emessa", "Pagata", "Insoluta"], r.stato || "Da emettere")) + "</div>" +
      '<div class="row2">' + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) + "</div>" +
      selField("pro_id", "Emessa da", opt(D.pros, r.pro_id || me.pro_id)) +
      '<div class="row2">' + fld("numero", "Numero", "text", r.numero) + fld("importo", "Importo (€)", "number", r.importo) + "</div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + fld("scadenza", "Scadenza", "date", r.scadenza) + "</div>" +
      fld("note", "Note", "text", r.note);
  }},
  inter: { t: "Nota sul cliente", tb: "inter", f: function (r) {
    return '<div class="row2">' + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) + selField("tipo", "Tipo", sel(["Nota", "Chiamata", "Email", "Meeting"], r.tipo || "Nota")) + "</div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + selField("pro_id", "Chi", opt(D.pros, r.pro_id || me.pro_id)) + "</div>" +
      fld("testo", "Testo", "textarea", r.testo);
  }},
  fasi: { t: "Fase", tb: "fasi", f: function (r) {
    return fld("nome", "Nome della fase", "text", r.nome, true) +
      selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + selField("stato", "Stato", sel(FASE_STATI, r.stato || "Da iniziare")) + fld("avanzamento", "Avanzamento (%)", "number", r.avanzamento == null ? 0 : r.avanzamento) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("fine", "Fine", "date", r.fine) + "</div>" +
      '<div class="row2">' + fld("ordine", "Ordine", "number", r.ordine == null ? 1 : r.ordine) + selField("visibile_cliente", "Visibile al cliente", sel(["si", "no"], r.visibile_cliente === false ? "no" : "si")) + "</div>" +
      selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progOf(r.commessa_id || current).map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("")) +
      fld("note", "Note", "textarea", r.note);
  }},
  mat: { t: "Materiale", tb: "mat", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) + fld("url", "Link (Drive, Dropbox, WeTransfer…)", "text", r.url) +
      '<div class="row2">' + selField("tipo", "Tipo", sel(TIPI_MAT, r.tipo || "Materiale")) + selField("fase_id", "Fase", opt(fasiOf(r.commessa_id || current), r.fase_id)) + "</div>" +
      '<div class="row2">' + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + selField("visibile_cliente", "Visibile al cliente", sel(["no", "si"], r.visibile_cliente ? "si" : "no")) + "</div>" +
      selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progOf(r.commessa_id || current).map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("")) +
      fld("note", "Note per chi lavora", "textarea", r.note);
  }},
  pag: { t: "Scadenza di pagamento", tb: "pag", f: function (r) {
    return fld("nome", "Voce (es. Acconto 40%)", "text", r.nome, true) +
      selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + fld("importo", "Importo (€)", "number", r.importo) + fld("scadenza", "Scadenza", "date", r.scadenza) + "</div>" +
      '<div class="row2">' + selField("stato", "Stato", sel(["Da incassare", "Incassato"], r.stato || "Da incassare")) + fld("pagato_il", "Incassato il", "date", r.pagato_il) + "</div>" +
      fld("note", "Note", "text", r.note);
  }},
  appr: { t: "Richiesta di approvazione", tb: "appr", f: function (r) {
    return selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + selField("tipo", "Cosa deve approvare", sel(["Preventivo", "Bozza", "Consegna", "Fase"], r.tipo || "Bozza")) + selField("fase_id", "Fase", opt(fasiOf(r.commessa_id || current), r.fase_id)) + "</div>" +
      '<div class="row2">' + fld("richiesta_il", "Richiesta il", "date", r.richiesta_il || today()) + selField("stato", "Stato", sel(["In attesa", "Approvata", "Modifiche richieste"], r.stato || "In attesa")) + "</div>" +
      fld("note", "Messaggio per il cliente", "textarea", r.note);
  }},
  spazi: { t: "Spazio", tb: "spazi", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) + fld("indirizzo", "Indirizzo", "text", r.indirizzo) +
      '<div class="row2">' + fld("tipo", "Tipo", "text", r.tipo) + fld("capienza", "Capienza", "number", r.capienza) + "</div>" +
      '<div class="row2">' + fld("opzioni", "Opzioni", "text", r.opzioni) + fld("costo", "Costo", "text", r.costo) + "</div>" +
      '<div class="row2">' + fld("partner", "Partner", "text", r.partner) + selField("stato", "Stato", sel(["Coming soon", "Attivo", "Chiuso"], r.stato || "Coming soon")) + "</div>" +
      fld("referente", "Referente", "text", r.referente);
  }},
  pren: { t: "Prenotazione", tb: "pren", f: function (r) {
    return '<div class="row2">' + selField("spazio_id", "Spazio", opt(D.spazi, r.spazio_id)) + selField("pro_id", "Chi", opt(D.pros, r.pro_id || me.pro_id)) + "</div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + selField("slot", "Slot", sel(["Giornata", "Mattina", "Pomeriggio", "Sala riunioni"], r.slot || "Giornata")) + "</div>" +
      fld("note", "Note", "text", r.note);
  }},
  forn: { t: "Fornitore", tb: "forn", f: function (r) {
    return '<div class="row2">' + fld("nome", "Nome", "text", r.nome, true) + fld("categoria", "Categoria (es. Tipografia)", "text", r.categoria) + "</div>" +
      '<div class="row2">' + fld("referente", "Referente", "text", r.referente) + fld("citta", "Città", "text", r.citta) + "</div>" +
      '<div class="row2">' + fld("email", "Email", "email", r.email) + fld("telefono", "Telefono", "text", r.telefono) + "</div>" +
      fld("sito", "Sito", "text", r.sito) +
      fld("note", "Perché lo consigli", "text", r.note) +
      selField("consigliato_da", "Segnalato da", opt(D.pros, r.consigliato_da || me.pro_id));
  }},
  membri: { t: "Accesso", tb: "membri", key: "user_id", f: function (r) {
    return '<div class="fgroup"><h3>Chi entra</h3>' +
      fld("user_id", "User UID (da Supabase → Authentication)", "text", r.user_id, true) +
      fld("email", "Email", "email", r.email) +
      selField("ruolo", "Tipo di accesso", selKV([["professionista", "Professionista — ha il suo spazio di lavoro"], ["cliente", "Cliente — solo il portale del suo progetto"]], r.ruolo === "cliente" ? "cliente" : "professionista")) +
      '<div class="row2">' + selField("pro_id", "Scheda del professionista", opt(D.pros, r.pro_id)) + selField("cliente_id", "Cliente (solo per accesso cliente)", opt(D.cli, r.cliente_id)) + "</div></div>" +
      '<div class="fgroup"><h3>Aree comuni che può curare</h3>' +
      '<p class="faint" style="margin-bottom:12px">Riguardano solo ciò che è di tutti. Nessuno di questi permessi apre i clienti, i preventivi, le fatture o le ore di un altro professionista.</p>' +
      '<div class="row2">' + selField("perm_spazi", "Spazi e prenotazioni", sel(["no", "si"], r.perm_spazi ? "si" : "no")) +
      selField("perm_studio", "Dati dello studio e fornitori", sel(["no", "si"], r.perm_studio ? "si" : "no")) + "</div>" +
      selField("perm_accessi", "Accessi delle persone", sel(["no", "si"], r.perm_accessi ? "si" : "no")) + "</div>";
  }}
};
function modal(html) { el("#modal").innerHTML = '<div class="modal">' + html + "</div>"; }

/* Micro-azioni: restano in finestra rapida. Tutto il resto è una pagina vera. */
var RAPIDI = { ore: 1, pren: 1, ev: 1, inter: 1, mat: 1, appr: 1 };
/* Sezione di appartenenza di ogni modulo: serve per il percorso e per il ritorno */
var FSEZ = {
  com: ["commesse", "Preventivi"], cli: ["clienti", "Clienti"], pros: ["pool", "Professionisti"],
  serv: ["servizi", "I miei servizi"], prog: ["progetti", "Progetti"], lav: ["progetti", "Progetti"],
  mov: ["fatture", "Fatture"], forn: ["fornitori", "Fornitori"], spazi: ["spazi", "Coworking & spazi"],
  membri: ["impostazioni", "Impostazioni"], fasi: ["commesse", "Preventivi"], pag: ["commesse", "Preventivi"],
  vari: ["commesse", "Preventivi"], appr: ["commesse", "Preventivi"], righe: ["commesse", "Preventivi"],
  task: ["task", "Attività"], ore: ["ore", "Ore & timesheet"], inter: ["clienti", "Clienti"], modelli: ["task", "Attività"],
  mat: ["commesse", "Preventivi"], ev: ["commesse", "Preventivi"], pren: ["spazi", "Coworking & spazi"]
};
var FDETT = { com: ["commessa", "servizi"], cli: ["cliente", ""], prog: ["progetto", "lavorazioni"], lav: ["lavorazione", ""], pros: ["pro", ""], task: ["attivita", ""] };

function openForm(entity, id, ctx) {
  var F = FORMS[entity]; if (!F) return;
  if (RAPIDI[entity]) { openFormRapido(entity, id, ctx); return; }
  FCTX = ctx || null;
  FBACK = [view, current, tab];
  go(id ? "mod" : "nuovo", entity, id || "");
}
function openFormRapido(entity, id, ctx) {
  var F = FORMS[entity]; if (!F) return;
  var key = F.key || "id";
  var r = id ? (D[F.tb].filter(function (x) { return x[key] === id; })[0] || {}) : (ctx || {});
  modal('<form class="box" data-save="' + entity + ':' + (id || "") + '"><h2>' + (id ? "Modifica" : "Nuovo") + " · " + F.t + "</h2>" + F.f(r) +
    '<div class="actions">' + (id ? '<button type="button" class="btn danger" data-del="' + entity + ":" + id + '">Elimina</button>' : "") +
    '<button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Salva</button></div></form>');
}
/* Pagina intera di compilazione: percorso, titolo, campi, barra azioni fissa */
function vForm() {
  var entity = current, id = tab || "";
  var F = FORMS[entity];
  if (!F) return '<div class="card">Modulo non disponibile. <button class="lnk" data-route="dash">Torna alla dashboard</button></div>';
  var key = F.key || "id";
  var r = id ? (D[F.tb].filter(function (x) { return x[key] === id; })[0] || {}) : (FCTX || {});
  if (id && !r[key]) return '<div class="card">Scheda non trovata. <button class="lnk" data-route="' + (FSEZ[entity] ? FSEZ[entity][0] : "dash") + '">Torna all\'elenco</button></div>';
  var sez = FSEZ[entity] || ["dash", "Giraffa Studio"];
  var titolo = id ? (r.nome || r.titolo || F.t) : "Nuovo · " + F.t.toLowerCase();
  var via = [[gruppoDi(sez[0]) || "Lavoro"], [sez[1], sez[0]]];
  if (id && FDETT[entity]) via.push([r.nome || r.titolo || F.t, FDETT[entity][0], id, FDETT[entity][1]]);
  via.push([id ? "Modifica" : "Nuovo"]);

  return '<div class="formpage">' + crumbs(via) +
    '<div class="top"><h1>' + esc(titolo) + '<span class="sub">' + esc(id ? "Stai modificando · " + F.t : F.t) + "</span></h1></div>" +
    '<form class="fpage" data-page="1" data-save="' + entity + ":" + (id || "") + '">' +
    '<div class="card">' + F.f(r) + "</div>" +
    '<div class="actionbar">' +
    (id ? '<button type="button" class="btn danger" data-del="' + entity + ":" + id + '">Elimina</button>' : "") +
    '<span class="grow"></span><span class="faint" id="fstat"></span>' +
    '<button type="button" class="btn ghost" data-annulla="1">Annulla</button>' +
    '<button class="btn" type="submit">' + (id ? "Salva le modifiche" : "Crea " + F.t.toLowerCase()) + "</button></div></form></div>";
}
function tornaIndietro() {
  FDIRTY = false;
  if (FBACK && FBACK[0] && FBACK[0] !== "nuovo" && FBACK[0] !== "mod") { var b = FBACK; FBACK = null; go(b[0], b[1], b[2]); return; }
  var s = FSEZ[current];
  go(s ? s[0] : "dash");
}
function dopoSalva(entity, id) {
  var det = FDETT[entity];
  if (det && id) { go(det[0], id, det[1]); return; }
  if (FBACK && FBACK[0] && FBACK[0] !== "nuovo" && FBACK[0] !== "mod") { var b = FBACK; FBACK = null; go(b[0], b[1], b[2]); return; }
  var s = FSEZ[entity];
  go(s ? s[0] : "dash");
}
async function saveForm(f) {
  var parts = f.dataset.save.split(":"), entity = parts[0], id = parts[1];
  var F = FORMS[entity], key = F.key || "id", obj = {};
  var BOOL = ["fatturabile", "visibile_cliente", "perm_spazi", "perm_studio", "perm_accessi"];
  Array.prototype.forEach.call(f.elements, function (i) {
    if (!i.name) return;
    var v = i.value;
    if (BOOL.indexOf(i.name) > -1) v = (v === "si");
    else if (v === "") v = null;
    else if (i.type === "number") v = +v;
    obj[i.name] = v;
  });
  /* I campi privati non passano dalla tabella condivisa */
  var privati = null;
  if (F.priv) {
    privati = {};
    F.priv.forEach(function (c) { if (c in obj) { privati[c] = obj[c]; delete obj[c]; } });
  }
  if (entity === "ev" && !obj.pro_id) obj.pro_id = me.pro_id;
  var inPagina = !!f.dataset.page;
  var btn = f.querySelector('button[type="submit"]'), lbl = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Salvo…"; }
  var r = id ? await sb.from(TB[F.tb]).update(obj).eq(key, id).select().single() : await sb.from(TB[F.tb]).insert(obj).select().single();
  if (r.error) { if (btn) { btn.disabled = false; btn.textContent = lbl; } toast(r.error.message, true); return; }
  var nid = (r.data && r.data[key]) || id;
  if (privati && Object.keys(privati).length && nid === me.pro_id) {
    privati.pro_id = nid; privati.aggiornato = new Date().toISOString();
    var rp = await sb.from("pro_privato").upsert(privati, { onConflict: "pro_id" });
    if (rp.error) toast("Scheda salvata, ma i dati personali no: " + rp.error.message, true);
    else await reload(["priv"]);
  }
  if (obj.commessa_id && entity !== "ev") await logEv(obj.commessa_id, (id ? "Modificato" : "Aggiunto") + ": " + F.t.toLowerCase() + (obj.nome ? " — " + obj.nome : obj.titolo ? " — " + obj.titolo : ""));
  await reload([F.tb, "ev"]);
  closeModal(); toast(F.t + (id ? " aggiornato" : " creato"));
  if (inPagina) { FDIRTY = false; dopoSalva(entity, nid); return; }
  render();
}
async function duplica(id) {
  var k = by(D.com, id); if (!k) return;
  var titolo = prompt("Titolo del nuovo preventivo", k.titolo + " (copia)");
  if (!titolo) return;
  var nuovo = { titolo: titolo, cliente_id: k.cliente_id, owner_id: me.pro_id || k.owner_id, pm_id: k.pm_id, stato: "Bozza", tipo_prezzo: k.tipo_prezzo, budget_ore: k.budget_ore, probabilita: 50, note: k.note, inizio: today() };
  var r = await sb.from("commesse").insert(nuovo).select().single();
  if (r.error) { toast(r.error.message, true); return; }
  var nid = r.data.id, base = new Date();
  var fs = fasiOf(k.id).map(function (f, i) {
    return { commessa_id: nid, nome: f.nome, ordine: f.ordine || i + 1, stato: "Da iniziare", avanzamento: 0, visibile_cliente: f.visibile_cliente, inizio: iso(new Date(base.getTime() + i * 10 * 86400000)), fine: iso(new Date(base.getTime() + (i + 1) * 10 * 86400000)) };
  });
  if (fs.length) await sb.from("fasi").insert(fs);
  var mappa = {};
  var pgs = progOf(k.id);
  for (var pi = 0; pi < pgs.length; pi++) {
    var np = await sb.from("progetti").insert({ commessa_id: nid, nome: pgs[pi].nome, pro_id: pgs[pi].pro_id, stato: "Da iniziare", ordine: pgs[pi].ordine }).select().single();
    if (!np.error) mappa[pgs[pi].id] = np.data.id;
  }
  var rg = righeOf(k.id).map(function (x) {
    return { commessa_id: nid, progetto_id: mappa[x.progetto_id] || null, serv_id: x.serv_id, tipo: x.tipo, nome: x.nome, descrizione: x.descrizione,
      qty: x.qty, unita: x.unita, prezzo_unit: x.prezzo_unit, costo_unit: x.costo_unit, sconto: x.sconto, opzionale: x.opzionale,
      ricorrente: x.ricorrente, periodo: x.periodo, cicli: x.cicli, ore_stimate: x.ore_stimate, assegnato_id: x.assegnato_id, stato: "Da iniziare" };
  });
  if (rg.length) await sb.from("righe").insert(rg);
  await logEv(nid, "Preventivo creato dal modello “" + k.titolo + "”");
  await reload(["com", "fasi", "righe", "ev"]);
  toast("Preventivo duplicato"); go("commessa", nid, "fasi");
}
async function delRow(entity, id) {
  var F = FORMS[entity], tbk = F ? F.tb : entity, key = (F && F.key) || "id";
  if (!confirm("Eliminare definitivamente?")) return;
  var r = await sb.from(TB[tbk]).delete().eq(key, id);
  if (r.error) { toast(r.error.message, true); return; }
  await reload([tbk]); closeModal();
  FDIRTY = false;
  if (inForm() || view === "riga") { var s = FSEZ[entity] || FSEZ[tbk]; toast("Eliminato"); FBACK = null; go(s ? s[0] : "dash"); return; }
  if ((view === "commessa" && tbk === "com") || (view === "cliente" && tbk === "cli")) { go(tbk === "com" ? "commesse" : "clienti"); return; }
  toast("Eliminato"); render();
}
function openRiga(kid, rid) {
  var r = rid ? by(D.righe, rid) : null;
  var k = kid || (r && r.commessa_id);
  if (!k) return;
  FBACK = [view, current, tab];
  go("riga", k, rid || "");
}
function vRiga() {
  var k = current, rid = tab || "";
  var kk = by(D.com, k);
  if (!kk) return '<div class="card">Preventivo non trovato. <button class="lnk" data-route="commesse">Torna all\'elenco</button></div>';
  var r = rid ? (by(D.righe, rid) || {}) : {};
  var pg = progOf(k);
  return '<div class="formpage">' +
    crumbs([["Amministrazione"], ["Preventivi", "commesse"], [kk.titolo, "commessa", kk.id, "servizi"], [rid ? "Modifica voce" : "Nuova voce"]]) +
    '<div class="top"><h1>' + esc(rid ? (r.nome || "Voce di preventivo") : "Nuova voce di preventivo") + '<span class="sub">' + esc(kk.titolo) + "</span></h1></div>" +
    '<form class="fpage" data-page="1" data-riga-save="' + k + ":" + (rid || "") + '"><div class="card">' +
    '<div class="row2">' + selField("tipo", "Tipo di voce", sel(["Servizio", "Trasferta", "Spesa", "Sconto"], r.tipo || "Servizio")) +
    selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + pg.map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("")) + "</div>" +
    selField("serv_id", "Prendi dal listino (facoltativo)", '<option value="">— voce libera —</option>' + D.serv.map(function (s) {
      return '<option value="' + s.id + '"' + (r.serv_id === s.id ? " selected" : "") + ">" + esc(s.nome) + " · " + esc(nameOf(D.pros, s.pro_id)) + " · " + eur(s.prezzo) + (s.unita ? " / " + esc(s.unita) : "") + "</option>";
    }).join("")) +
    fld("nome", "Come appare sul preventivo", "text", r.nome) +
    fld("descrizione", "Descrizione per il cliente", "textarea", r.descrizione) +
    '<div class="row2">' + fld("qty", "Quantità", "number", r.qty == null ? 1 : r.qty) + selField("unita", "Unità", sel(["", "progetto", "giornata", "mezza giornata", "ora", "mese", "anno", "scatto", "post", "trasferta", "km", "pezzo"], r.unita || "")) + "</div>" +
    '<div class="row2">' + fld("prezzo_unit", "Prezzo unitario al cliente (€)", "number", r.prezzo_unit) + fld("costo_unit", "Compenso unitario al professionista (€)", "number", r.costo_unit) + "</div>" +
    '<div class="row2">' + fld("sconto", "Sconto su questa voce (%)", "number", r.sconto || 0) + selField("opzionale", "Voce opzionale", sel(["no", "si"], r.opzionale ? "si" : "no")) + "</div>" +
    '<div class="row2">' + selField("ricorrente", "Ricorrente", sel(["no", "si"], r.ricorrente ? "si" : "no")) + selField("periodo", "Periodo", sel(["Mensile", "Annuale"], r.periodo || "Mensile")) + "</div>" +
    '<div class="row2">' + fld("cicli", "Per quanti mesi/anni", "number", r.cicli == null ? 1 : r.cicli) + fld("ore_stimate", "Ore stimate", "number", r.ore_stimate == null ? 0 : r.ore_stimate) + "</div>" +
    '<div class="row2">' + selField("assegnato_id", "Chi la esegue", opt(PROS_PRO(), r.assegnato_id)) + selField("stato", "Stato", sel(["Da iniziare", "In corso", "Consegnato"], r.stato || "Da iniziare")) + "</div>" +
    '<p class="faint">Se prendi una voce dal listino i valori si compilano da soli, poi puoi cambiarli solo per questo preventivo.</p></div>' +
    '<div class="actionbar">' + (rid ? '<button type="button" class="btn danger" data-del="righe:' + rid + '">Elimina</button>' : "") +
    '<span class="grow"></span><button type="button" class="btn ghost" data-annulla="1">Annulla</button>' +
    '<button class="btn" type="submit">' + (rid ? "Salva la voce" : "Aggiungi al preventivo") + "</button></div></form></div>";
}

/* ---------------- ricerca rapida ⌘K ---------------- */
function openPalette() {
  if (isCliente()) return;
  PAL = [];
  D.com.forEach(function (k) { PAL.push({ t: k.titolo, s: "Preventivo · " + nameOf(D.cli, k.cliente_id), i: "◧", go: ["commessa", k.id, "note"] }); });
  D.cli.forEach(function (c) { PAL.push({ t: c.nome, s: "Cliente", i: "◐", go: ["cliente", c.id] }); });
  D.pros.forEach(function (p) { PAL.push({ t: p.nome, s: "Professionista" + (p.ruolo ? " · " + p.ruolo : ""), i: "◍", go: ["pro", p.id] }); });
  navFor().forEach(function (n) { if (n.k) PAL.push({ t: n.t, s: "Vai a", i: "→", go: [n.k] }); });
  [["com", "Nuovo preventivo"], ["ore", "Registra ore"], ["task", "Nuova attività"], ["cli", "Nuovo cliente"], ["mov", "Nuovo movimento"]].forEach(function (a) {
    PAL.push({ t: a[1], s: "Azione", i: "+", act: a[0] });
  });
  modal('<div class="box pal"><input id="palq" placeholder="Cerca un preventivo, un cliente, una persona… o un\'azione" autocomplete="off" spellcheck="false"><div id="palres"></div><div class="palfoot"><span><kbd>↑</kbd><kbd>↓</kbd> muoviti</span><span><kbd>↵</kbd> apri</span><span><kbd>esc</kbd> chiudi</span></div></div>');
  renderPal("");
  var q = el("#palq"); if (q) q.focus();
}
function renderPal(q) {
  q = (q || "").toLowerCase();
  PALR = PAL.filter(function (x) { return (x.t + " " + x.s).toLowerCase().indexOf(q) > -1; }).slice(0, 7);
  PALI = 0;
  var r = el("#palres"); if (!r) return;
  r.innerHTML = PALR.length ? PALR.map(function (x, i) {
    return '<button class="palitem' + (i === 0 ? " on" : "") + '" data-pal-i="' + i + '"><span class="pi">' + x.i + '</span><span class="pt"><b>' + esc(x.t) + '</b><span class="faint">' + esc(x.s) + "</span></span></button>";
  }).join("") : '<div class="empty" style="padding:16px 4px">Nessun risultato</div>';
}
function palMove(d) {
  if (!PALR.length) return;
  PALI = (PALI + d + PALR.length) % PALR.length;
  Array.prototype.forEach.call(document.querySelectorAll(".palitem"), function (n, i) { n.classList.toggle("on", i === PALI); });
}
function palGo(i) {
  var x = PALR[i]; if (!x) return;
  closeModal();
  if (x.act) { openForm(x.act); return; }
  go.apply(null, x.go);
}

/* ---------------- render ---------------- */
function render() {
  if (isCliente()) {
    buildNavCliente();
    el("#main").innerHTML = (view === "progetto" ? vCliProgetto : vCliProgetti)();
    return;
  }
  if (!me.ruolo) {
    el("#nav").innerHTML = "";
    el("#main").innerHTML = '<div class="card"><h2>Accesso non ancora abilitato</h2><p class="muted" style="margin-top:8px">Il tuo utente esiste ma non è stato collegato a nessun ruolo. Chiedi alla regia di Giraffa Studio di abilitarti.</p></div>';
    return;
  }
  buildNav();
  var V = { attivita: vAttivita, dash: vDash, commesse: vCommesse, commessa: vCommessa, progetti: vProgetti, progetto: vProgetto, lavorazione: vLavorazione, calendario: vCalendario, clienti: vClienti, cliente: vCliente, pool: vPool, pro: vPro, servizi: vServizi, task: vTask, ore: vOre, fatture: vFatture, report: vReport, carico: vCarico, spazi: vSpazi, amm: vAmm, studio: vStudio, fornitori: vFornitori, profilo: vProfilo, impostazioni: vSettings, nuovo: vForm, mod: vForm, riga: vRiga };
  var f = V[view] || vDash;
  el("#main").innerHTML = f();
  var s = el("#search") || el("#tcerca") || el("#fcerca");
  if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  countUp();
}

/* numeri che salgono */
function countUp() {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  Array.prototype.forEach.call(document.querySelectorAll(".kpi .v"), function (n) {
    var txt = n.textContent.trim();
    var m = txt.match(/^(\D*?)([\d.]+(?:,\d+)?)(\D*)$/);
    if (!m) return;
    var pre = m[1], post = m[3];
    var raw = m[2], dec = raw.indexOf(",") > -1 ? raw.split(",")[1].length : 0;
    var target = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    if (!isFinite(target) || target === 0) return;
    var t0 = performance.now(), dur = 750;
    function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      n.textContent = pre + (target * e).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
      if (p < 1) requestAnimationFrame(step);
    }
    n.textContent = pre + (0).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
    requestAnimationFrame(step);
  });
}

/* ---------------- eventi ---------------- */
document.addEventListener("click", async function (e) {
  var t = e.target.closest("button, [data-open-task], [data-open-com], [data-open-prog], [data-open-lav], [data-day], [data-close]");
  if (!t) return;
  var d = t.dataset || {};
  if (t.hasAttribute("data-close")) { closeModal(); return; }
  if (d.palI !== undefined) { palGo(+d.palI); return; }
  if (d.pal) { openPalette(); return; }
  if (t.hasAttribute("data-fs")) { FSTATO = d.fs || ""; render(); return; }
  if (t.hasAttribute("data-fh")) { FSAL = d.fh || ""; render(); return; }
  if (d.vista) { VISTA = d.vista; render(); return; }
  if (d.exp) { EXP[d.exp] = !EXP[d.exp]; render(); return; }
  if (d.go) { go(d.go); return; }
  if (d.route) { var rq = d.route.split("|"); go(rq[0], rq[1] || null, rq[2] || ""); return; }
  if (d.annulla) { tornaIndietro(); return; }
  if (d.tab) { go(view, current, d.tab); return; }
  if (d.openCom) { go("commessa", d.openCom, "servizi"); return; }
  if (d.openProg) { go("progetto", d.openProg, "lavorazioni"); return; }
  if (d.openLav) { go("lavorazione", d.openLav); return; }
  if (d.cal !== undefined) { CAL = d.cal === "0" ? 0 : CAL + (+d.cal); render(); return; }
  if (d.day) { openForm("task", null, { scadenza: d.day }); return; }
  if (d.noteditP) { NOTEDIT = d.noteditP === "1"; render(); return; }
  if (d.visprog) {
    var pv = by(D.prog, d.visprog); if (!pv) return;
    var rvp = await sb.from("progetti").update({ visibile_cliente: !pv.visibile_cliente }).eq("id", pv.id);
    if (rvp.error) { toast(rvp.error.message, true); return; }
    await reload(["prog"]); toast(!pv.visibile_cliente ? "Il cliente ora vede questo progetto" : "Progetto reso interno"); render(); return;
  }
  if (d.tstartLav) {
    var lw = by(D.lav, d.tstartLav); if (!lw) return;
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var rtl = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: lw.commessa_id, progetto_id: lw.progetto_id, lavorazione_id: lw.id, iniziato: new Date().toISOString() });
    if (rtl.error) { toast(rtl.error.message, true); return; }
    await reload(["tmr"]); toast("Timer avviato su " + lw.nome); render(); return;
  }
  if (d.openCli) { go("cliente", d.openCli); return; }
  if (d.openPro) { go("pro", d.openPro); return; }
  if (d.openProg) { go("progetto", d.openProg); return; }
  if (d.openTask) { go("attivita", d.openTask); return; }
  if (d.apprSi) { await apprRispondi(d.apprSi, "Approvata"); return; }
  if (d.apprNo) { await apprRispondi(d.apprNo, "Modifiche richieste"); return; }
  if (d.new) {
    var ctx = {};
    if (d.ctx) ctx.commessa_id = d.ctx;
    if (d.ctxCli) ctx.cliente_id = d.ctxCli;
    if (d.ctxPro) ctx.pro_id = d.ctxPro;
    if (d.ctxProg) { ctx.progetto_id = d.ctxProg; var pk2 = by(D.prog, d.ctxProg); if (pk2) ctx.commessa_id = pk2.commessa_id; }
    if (d.ctxLav) { var lk = by(D.lav, d.ctxLav); if (lk) { ctx.lavorazione_id = lk.id; ctx.progetto_id = lk.progetto_id; ctx.commessa_id = lk.commessa_id; } }
    if (d.ctxTask) { var tk8 = by(D.task, d.ctxTask); if (tk8) { ctx.task_id = tk8.id; ctx.lavorazione_id = tk8.lavorazione_id; ctx.progetto_id = tk8.progetto_id; ctx.commessa_id = tk8.commessa_id; } }
    openForm(d.new, null, ctx); return;
  }
  if (d.edit) { var p = d.edit.split(":"); openForm(p[0], p.slice(1).join(":")); return; }
  if (d.del) { var q = d.del.split(":"); await delRow(q[0], q.slice(1).join(":")); return; }
  if (d.riga) { openRiga(d.riga); return; }
  if (d.rigaEdit) { openRiga(null, d.rigaEdit); return; }
  if (d.preventivo) { openPreventivo(d.preventivo); return; }
  if (d.portale) { openPortale(d.portale); return; }
  if (d.done) {
    var r1 = await sb.from("task").update({ stato: "Fatto" }).eq("id", d.done);
    if (r1.error) { toast(r1.error.message, true); return; }
    await reload(["task"]); toast("Attività completata"); render(); return;
  }
  if (d.pay) {
    var r2 = await sb.from("movimenti").update({ stato: "Pagata" }).eq("id", d.pay);
    if (r2.error) { toast(r2.error.message, true); return; }
    await reload(["mov"]); toast("Segnata come incassata"); render(); return;
  }
  if (d.avvia) { await avviaLavoro(d.avvia); return; }
  if (d.fattpag) { await fatturaScadenza(d.fattpag); return; }
  if (d.fattore) { await fatturaOre(d.fattore); return; }
  if (d.portnew) {
    var tok = "";
    var alfa = "abcdefghijkmnopqrstuvwxyz23456789";
    for (var ti = 0; ti < 22; ti++) tok += alfa[Math.floor(Math.random() * alfa.length)];
    var rp = await sb.from("portali").insert({ cliente_id: d.portnew, token: tok, attivo: true }).select();
    if (rp.error) { toast(rp.error.message, true); return; }
    await reload(["port"]);
    toast("Link creato: ora imposta la password");
    render();
    var pwd0 = prompt("Scegli la password da comunicare al cliente (almeno 6 caratteri):");
    if (pwd0) {
      var rq = await sb.rpc("portale_pwd", { pid: rp.data[0].id, pwd: pwd0 });
      if (rq.error) toast(rq.error.message, true); else { await reload(["port"]); toast("Password impostata"); render(); }
    }
    return;
  }
  if (d.portpwd) {
    var pwd1 = prompt("Nuova password del portale (almeno 6 caratteri):");
    if (!pwd1) return;
    var rr = await sb.rpc("portale_pwd", { pid: d.portpwd, pwd: pwd1 });
    if (rr.error) { toast(rr.error.message, true); return; }
    await reload(["port"]); toast("Password aggiornata"); render(); return;
  }
  if (d.portoff) {
    var pp = d.portoff.split("|");
    var ro = await sb.from("portali").update({ attivo: pp[1] === "1" }).eq("id", pp[0]);
    if (ro.error) { toast(ro.error.message, true); return; }
    await reload(["port"]); toast(pp[1] === "1" ? "Accesso riattivato" : "Accesso sospeso"); render(); return;
  }
  if (d.portcopy) {
    try { await navigator.clipboard.writeText(d.portcopy); toast("Link copiato"); }
    catch (e) { toast("Copia manualmente dal campo", true); }
    return;
  }
  if (d.incassa) {
    var pgm = by(D.pag, d.incassa);
    var r3 = await sb.from("pagamenti").update({ stato: "Incassato", pagato_il: today() }).eq("id", d.incassa);
    if (r3.error) { toast(r3.error.message, true); return; }
    if (pgm) await logEv(pgm.commessa_id, "Incassato: " + pgm.nome + " (" + eur(pgm.importo) + ")");
    await reload(["pag", "ev"]); toast("Pagamento incassato"); render(); return;
  }
  if (d.apprVar) {
    var vv = by(D.vari, d.apprVar);
    var r4 = await sb.from("varianti").update({ stato: "Approvata", approvata_il: today() }).eq("id", d.apprVar);
    if (r4.error) { toast(r4.error.message, true); return; }
    if (vv) await logEv(vv.commessa_id, "Variante approvata: " + vv.nome + " (+" + eur(vv.importo) + ", +" + num(vv.ore, 0) + " h)");
    await reload(["vari", "ev"]); toast("Variante approvata: budget aggiornato"); render(); return;
  }
  if (d.duplica) { await duplica(d.duplica); return; }
  if (d.notedit) { NOTEDIT = d.notedit === "1"; render(); return; }
  if (d.ck !== undefined) {
    var kk = by(D.com, current); if (!kk) return;
    var nuovo = toggleCk(kk.note_doc, +d.ck);
    kk.note_doc = nuovo;
    var rc = await sb.from("commesse").update({ note_doc: nuovo }).eq("id", kk.id);
    if (rc.error) { toast(rc.error.message, true); return; }
    render(); return;
  }
  if (d.tck) {
    var tt = by(D.task, d.tck); if (!tt) return;
    var fattoOra = tt.stato !== "Fatto";
    var st2 = fattoOra ? "Fatto" : "Da fare";
    var rt = await sb.from("task").update({ stato: st2, completata_il: fattoOra ? new Date().toISOString() : null }).eq("id", tt.id);
    if (rt.error) { toast(rt.error.message, true); return; }
    if (fattoOra && tt.commessa_id) await logEv(tt.commessa_id, "Attività completata: " + tt.titolo);
    if (fattoOra && tt.ricorrenza) await prossimaRicorrenza(tt);
    await reload(["task", "ev"]); render(); return;
  }
  if (d.dipVia) {
    var dv = d.dipVia.split("|");
    var rdv = await sb.from("task_dip").delete().eq("task_id", dv[0]).eq("blocca_id", dv[1]);
    if (rdv.error) { toast(rdv.error.message, true); return; }
    await reload(["dip"]); render(); return;
  }
  if (d.duplTask) {
    var td = by(D.task, d.duplTask); if (!td) return;
    var copia = {
      titolo: td.titolo + " (copia)", descrizione: td.descrizione, commessa_id: td.commessa_id, progetto_id: td.progetto_id,
      lavorazione_id: td.lavorazione_id, assegnato_id: td.assegnato_id, stato: "Da fare", priorita: td.priorita,
      scadenza: td.scadenza, inizio: td.inizio, stimate: td.stimate, sezione: td.sezione, etichette: td.etichette
    };
    var rdt = await sb.from("task").insert(copia).select().single();
    if (rdt.error) { toast(rdt.error.message, true); return; }
    await reload(["task"]); toast("Attività duplicata"); go("attivita", rdt.data.id); return;
  }
  if (d.tstartTask) {
    var tk9 = by(D.task, d.tstartTask); if (!tk9) return;
    if (!me.pro_id) { toast("Il tuo utente non è collegato a una scheda", true); return; }
    var rtt = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: tk9.commessa_id, progetto_id: tk9.progetto_id, lavorazione_id: tk9.lavorazione_id, task_id: tk9.id, iniziato: new Date().toISOString() });
    if (rtt.error) { toast(rtt.error.message, true); return; }
    await reload(["tmr"]); toast("Timer avviato"); render(); return;
  }
  if (d.fReset) {
    var vuoto0 = { com: { stato: "", salute: "", cli: "", cerca: "" }, prog: { stato: "", cli: "", pro: "", cerca: "" }, cli: { stato: "", owner: "", cerca: "" },
      mov: { tipo: "", stato: "", anno: "", cerca: "" }, serv: { cat: "", chi: "io", cerca: "" }, forn: { cat: "", cerca: "" }, pool: { cat: "", cerca: "" } };
    if (vuoto0[d.fReset]) FS[d.fReset] = vuoto0[d.fReset];
    render(); return;
  }
  if (d.tfScadute) { TF.scadute = !TF.scadute; render(); return; }
  if (d.tfReset) { TF = { stato: "aperte", pro: "", prog: "", prio: "", cerca: "", scadute: false }; render(); return; }
  if (d.vistaSalva) {
    if (!me.pro_id) { toast("Serve una scheda collegata", true); return; }
    var nomeV = prompt("Come si chiama questa vista?", "La mia vista");
    if (!nomeV) return;
    var rvs = await sb.from("viste").insert({ pro_id: me.pro_id, ambito: "task", nome: nomeV, config: { TF: TF, TGROUP: TGROUP, TSORT: TSORT, vista: tab || "lista" } });
    if (rvs.error) { toast(rvs.error.message, true); return; }
    await reload(["viste"]); toast("Vista salvata"); render(); return;
  }
  if (d.modelli) { apriModelli(); return; }
  if (d.modNuovo) { await creaModelloDaProgetto(); return; }
  if (d.modUsa) { await applicaModello(d.modUsa); return; }
  if (d.sub) { go("attivita", d.sub); return; }
  if (d.file) {
    var mf = by(D.mat, d.file); if (!mf || !mf.path) return;
    var sg = await sb.storage.from("materiali").createSignedUrl(mf.path, 120);
    if (sg.error) { toast(sg.error.message, true); return; }
    window.open(sg.data.signedUrl, "_blank"); return;
  }
  if (d.vis) {
    var mv2 = by(D.mat, d.vis); if (!mv2) return;
    var rv = await sb.from("materiali").update({ visibile_cliente: !mv2.visibile_cliente }).eq("id", mv2.id);
    if (rv.error) { toast(rv.error.message, true); return; }
    await reload(["mat"]); toast(!mv2.visibile_cliente ? "Ora è visibile al cliente" : "Ora è solo interno"); render(); return;
  }
  if (d.wk !== undefined) { WEEK = d.wk === "0" ? 0 : WEEK + (+d.wk); render(); return; }
  if (d.tscopy) {
    var lunC = lunedi(WEEK), nuoveC = [];
    for (var gi9 = 0; gi9 < 7; gi9++) {
      var gC = iso(new Date(lunC.getTime() + gi9 * 86400000));
      var pC = iso(new Date(lunC.getTime() + (gi9 - 7) * 86400000));
      D.ore.filter(function (o) { return o.pro_id === me.pro_id && o.data === pC; }).forEach(function (o) {
        var gia = D.ore.some(function (x) { return x.pro_id === me.pro_id && x.data === gC && x.lavorazione_id === o.lavorazione_id; });
        if (gia) return;
        nuoveC.push({ pro_id: me.pro_id, lavorazione_id: o.lavorazione_id, progetto_id: o.progetto_id, commessa_id: o.commessa_id, data: gC, ore: o.ore, tariffa: o.tariffa, fatturabile: o.fatturabile, descrizione: o.descrizione });
      });
    }
    if (!nuoveC.length) { toast("Niente da copiare: la settimana scorsa è vuota o è già stata copiata"); return; }
    if (!confirm("Copio " + nuoveC.length + " registrazioni dalla settimana scorsa?")) return;
    var rcp = await sb.from("ore").insert(nuoveC);
    if (rcp.error) { toast(rcp.error.message, true); return; }
    await reload(["ore"]); toast(nuoveC.length + " registrazioni copiate"); render(); return;
  }
  if (d.tstart) {
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var r5 = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: d.tstart, iniziato: new Date().toISOString() });
    if (r5.error) { toast(r5.error.message, true); return; }
    await reload(["tmr"]); toast("Timer avviato"); render(); return;
  }
  if (d.tstop) { await stopTimer(); return; }
});

function fattDi(pagId) { return D.mov.filter(function (m) { return m.pagamento_id === pagId; })[0] || null; }
function prossimoNumero() {
  var anno = new Date().getFullYear();
  var n = 0;
  D.mov.forEach(function (m) {
    var x = /FT\/(\d{4})\/(\d+)/.exec(m.numero || "");
    if (x && +x[1] === anno && +x[2] > n) n = +x[2];
  });
  return "FT/" + anno + "/" + String(n + 1).padStart(3, "0");
}
async function fatturaScadenza(pagId) {
  var pg = by(D.pag, pagId); if (!pg) return;
  var k = by(D.com, pg.commessa_id); if (!k) return;
  if (fattDi(pagId)) { toast("Questa scadenza ha già una fattura"); return; }
  var r = await sb.from("movimenti").insert({
    tipo: "Attiva", commessa_id: k.id, cliente_id: k.cliente_id, pro_id: k.owner_id,
    numero: prossimoNumero(), data: today(), scadenza: pg.scadenza,
    importo: pg.importo, iva: k.iva == null ? 22 : k.iva, stato: "Da emettere",
    note: pg.nome, pagamento_id: pagId
  }).select();
  if (r.error) { toast(r.error.message, true); return; }
  await logEv(k.id, "Fattura " + (r.data && r.data[0] ? r.data[0].numero : "") + " da “" + pg.nome + "” · " + eur(pg.importo));
  await reload(["mov", "ev"]);
  toast("Fattura " + (r.data && r.data[0] ? r.data[0].numero : "") + " creata");
  render();
}
async function fatturaOre(kid) {
  var k = by(D.com, kid); if (!k) return;
  var lista = oreOf(kid).filter(function (o) { return o.fatturabile && !o.movimento_id; });
  if (!lista.length) { toast("Nessuna ora da fatturare"); return; }
  var tot = Math.round(sum(lista, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); }));
  var h = num(sum(lista, function (o) { return o.ore; }), 1);
  if (!confirm("Creo una fattura da " + eur(tot) + " per " + h + " h non ancora fatturate?")) return;
  var r = await sb.from("movimenti").insert({
    tipo: "Attiva", commessa_id: k.id, cliente_id: k.cliente_id, pro_id: k.owner_id,
    numero: prossimoNumero(), data: today(), scadenza: iso(new Date(Date.now() + 30 * 86400000)),
    importo: tot, iva: k.iva == null ? 22 : k.iva, stato: "Da emettere",
    note: "Consuntivo ore: " + h + " h"
  }).select();
  if (r.error) { toast(r.error.message, true); return; }
  var mid = r.data && r.data[0] ? r.data[0].id : null;
  if (mid) await sb.from("ore").update({ movimento_id: mid }).in("id", lista.map(function (o) { return o.id; }));
  await logEv(k.id, "Fattura " + (r.data[0] || {}).numero + " su consuntivo di " + h + " h · " + eur(tot));
  await reload(["mov", "ore", "ev"]);
  toast("Fattura creata su " + h + " h");
  render();
}
async function avviaLavoro(kid) {
  var k = by(D.com, kid); if (!k) return;
  var righe = righeOf(kid).filter(function (r) { return !r.opzionale && r.tipo !== "Sconto"; });
  if (!righe.length) { toast("Il preventivo non ha righe da avviare"); return; }
  var creatiP = 0, creatiL = 0, saltati = 0;
  var progs = progOf(kid);
  var generale = null;
  for (var i = 0; i < righe.length; i++) {
    var r = righe[i], cc = rigaCalc(r);
    var pid = r.progetto_id;
    if (!pid) {
      if (!generale) {
        var pg0 = progs.filter(function (x) { return x.nome === "Generale"; })[0];
        if (pg0) generale = pg0.id;
        else {
          var np = await sb.from("progetti").insert({ commessa_id: kid, nome: "Generale", pro_id: k.owner_id, stato: "In corso", ordine: 99 }).select();
          if (np.error) { toast(np.error.message, true); return; }
          generale = np.data[0].id; creatiP++;
        }
      }
      pid = generale;
    }
    var gia = D.lav.filter(function (l) { return l.progetto_id === pid && l.nome === cc.nome; })[0];
    if (gia) { saltati++; continue; }
    var nl = await sb.from("lavorazioni").insert({
      progetto_id: pid, commessa_id: kid, nome: cc.nome,
      descrizione: r.descrizione || null, pro_id: cc.pro || k.owner_id,
      stato: "Da iniziare", ore_stimate: r.ore_stimate || null,
      inizio: k.inizio || null, fine: k.scadenza || null, ordine: i + 1
    });
    if (nl.error) { toast(nl.error.message, true); return; }
    creatiL++;
  }
  if (k.stato === "Approvata") await sb.from("commesse").update({ stato: "In corso" }).eq("id", kid);
  await logEv(kid, "Lavoro avviato: " + creatiL + " lavorazioni" + (creatiP ? " e " + creatiP + " progetto" : "") + (saltati ? " (" + saltati + " già presenti)" : ""));
  await reload(["prog", "lav", "com", "ev"]);
  toast(creatiL ? "Create " + creatiL + " lavorazioni" : "Tutte le lavorazioni erano già presenti");
  render();
}
async function stopTimer() {
  var tm = timerMio(); if (!tm) return;
  var ore = Math.round((Date.now() - new Date(tm.iniziato).getTime()) / 360000) / 10;
  await sb.from("timer").delete().eq("pro_id", me.pro_id);
  if (ore >= 0.1) {
    var p = by(D.pros, me.pro_id);
    var r = await sb.from("ore").insert({ pro_id: me.pro_id, commessa_id: tm.commessa_id, progetto_id: tm.progetto_id || null, lavorazione_id: tm.lavorazione_id || null, data: today(), ore: ore, tariffa: p ? p.tariffa_oraria : 0, fatturabile: true, descrizione: tm.lavorazione_id ? nameOf(D.lav, tm.lavorazione_id) : "Sessione di lavoro" });
    if (r.error) { toast(r.error.message, true); }
    else toast("Registrate " + num(ore, 1) + " h");
  } else toast("Sessione troppo breve, non registrata");
  await reload(["tmr", "ore"]); render();
}
async function salvaTs(lid, data, val) {
  var lav = by(D.lav, lid);
  var righe = D.ore.filter(function (o) { return o.pro_id === me.pro_id && o.lavorazione_id === lid && o.data === data; });
  var v = Math.round((parseFloat(String(val).replace(",", ".")) || 0) * 10) / 10;
  if (v <= 0) { if (righe.length) await sb.from("ore").delete().in("id", righe.map(function (x) { return x.id; })); }
  else if (righe.length) {
    await sb.from("ore").update({ ore: v }).eq("id", righe[0].id);
    if (righe.length > 1) await sb.from("ore").delete().in("id", righe.slice(1).map(function (x) { return x.id; }));
  } else {
    var p = by(D.pros, me.pro_id);
    var r = await sb.from("ore").insert({ pro_id: me.pro_id, lavorazione_id: lid, progetto_id: lav ? lav.progetto_id : null, commessa_id: lav ? lav.commessa_id : null, data: data, ore: v, tariffa: p ? p.tariffa_oraria : 0, fatturabile: true, descrizione: lav ? lav.nome : "Timesheet" });
    if (r.error) { toast(r.error.message, true); return; }
  }
  await reload(["ore"]);
  totaliTs();
}
function totaliTs() {
  var mie = D.ore.filter(function (o) { return o.pro_id === me.pro_id; });
  var tot = 0;
  Array.prototype.forEach.call(document.querySelectorAll("[data-tsrow]"), function (n) {
    var kid = n.dataset.tsrow, t = 0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-ts^="' + kid + '|"]'), function (i) {
      t += parseFloat(String(i.value).replace(",", ".")) || 0;
    });
    n.textContent = t ? num(t, 1) : "—";
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-tscol]"), function (n) {
    var g = n.dataset.tscol;
    var t = sum(mie.filter(function (o) { return o.data === g; }), function (o) { return o.ore; });
    n.innerHTML = "<b>" + (t ? num(t, 1) : "—") + "</b>";
    tot += t;
  });
  var g = el("#tstot"); if (g) g.innerHTML = "<b>" + num(tot, 1) + "</b>";
}
async function uploadFile(files, kid, tid) {
  toast("Carico " + files.length + " file…");
  var cartella = kid || tid || "personali";
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var path = cartella + "/" + Date.now() + "-" + f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var up = await sb.storage.from("materiali").upload(path, f);
    if (up.error) { toast(up.error.message, true); continue; }
    var est = (f.name.split(".").pop() || "").toLowerCase();
    var tipo = ["jpg", "jpeg", "png", "gif", "webp", "heic"].indexOf(est) > -1 ? "Immagine" : ["pdf"].indexOf(est) > -1 ? "Documento" : ["mp4", "mov"].indexOf(est) > -1 ? "Video" : "File";
    await sb.from("materiali").insert({ commessa_id: kid || null, task_id: tid || null, nome: f.name, path: path, dim: f.size, tipo: tipo, visibile_cliente: false, caricato_da: me.pro_id });
  }
  if (kid) await logEv(kid, "Caricati file nei materiali");
  await reload(["mat", "ev"]); toast("File caricati"); render();
}

document.addEventListener("submit", async function (e) {
  var f = e.target;
  if (f.id === "loginform") { e.preventDefault(); return doLogin(f); }
  if (f.dataset.save) { e.preventDefault(); return saveForm(f); }
  if (f.dataset.rigaSave) {
    e.preventDefault();
    var pp = f.dataset.rigaSave.split(":"), kid = pp[0], rid = pp[1];
    var obj = {
      commessa_id: kid,
      serv_id: f.serv_id.value || null,
      progetto_id: f.progetto_id.value || null,
      tipo: f.tipo.value,
      nome: f.nome.value || null,
      descrizione: f.descrizione.value || null,
      qty: parseFloat(String(f.qty.value).replace(",", ".")) || 1,
      unita: f.unita.value || null,
      prezzo_unit: f.prezzo_unit.value === "" ? null : parseFloat(String(f.prezzo_unit.value).replace(",", ".")),
      costo_unit: f.costo_unit.value === "" ? null : parseFloat(String(f.costo_unit.value).replace(",", ".")),
      sconto: +f.sconto.value || 0,
      opzionale: f.opzionale.value === "si",
      ricorrente: f.ricorrente.value === "si",
      periodo: f.periodo.value,
      cicli: +f.cicli.value || 1,
      ore_stimate: +f.ore_stimate.value || 0,
      assegnato_id: f.assegnato_id.value || null,
      stato: f.stato.value
    };
    if (!obj.nome && obj.serv_id) { var sv = by(D.serv, obj.serv_id); if (sv) obj.nome = sv.nome; }
    if (obj.prezzo_unit == null && obj.serv_id) { var sv2 = by(D.serv, obj.serv_id); if (sv2) { obj.prezzo_unit = sv2.prezzo; obj.costo_unit = obj.costo_unit == null ? sv2.costo : obj.costo_unit; } }
    var r = rid ? await sb.from("righe").update(obj).eq("id", rid) : await sb.from("righe").insert(obj);
    if (r.error) { toast(r.error.message, true); return; }
    await reload(["righe"]); closeModal(); toast("Voce salvata");
    if (f.dataset.page) { FDIRTY = false; FBACK = null; go("commessa", kid, "servizi"); return; }
    render(); return;
  }
  if (f.dataset.tsadd) {
    e.preventDefault();
    var lid9 = f.lav.value; if (!lid9) return;
    if (TSEXTRA.indexOf(lid9) === -1) TSEXTRA.push(lid9);
    render(); return;
  }
  if (f.dataset.qaddSub) {
    e.preventDefault();
    var tsub = f.titolo.value.trim(); if (!tsub) return;
    var pd = by(D.task, f.dataset.qaddSub); if (!pd) return;
    var rqs = await sb.from("task").insert({ titolo: tsub, padre_id: pd.id, commessa_id: pd.commessa_id, progetto_id: pd.progetto_id, lavorazione_id: pd.lavorazione_id, assegnato_id: pd.assegnato_id || me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rqs.error) { toast(rqs.error.message, true); return; }
    f.titolo.value = ""; await reload(["task"]); render(); return;
  }
  if (f.dataset.commTask) {
    e.preventDefault();
    var testo = f.testo.value.trim(); if (!testo) return;
    var rct = await sb.from("commenti").insert({ task_id: f.dataset.commTask, pro_id: me.pro_id, testo: testo });
    if (rct.error) { toast(rct.error.message, true); return; }
    f.testo.value = ""; await reload(["comm"]); render(); return;
  }
  if (f.dataset.dipAdd) {
    e.preventDefault();
    var bl = f.blocca.value; if (!bl) return;
    var rda = await sb.from("task_dip").insert({ task_id: f.dataset.dipAdd, blocca_id: bl });
    if (rda.error) { toast(rda.error.message, true); return; }
    await reload(["dip"]); render(); return;
  }
  if (f.dataset.qaddLav) {
    e.preventDefault();
    var titl = f.titolo.value.trim(); if (!titl) return;
    var lv2 = by(D.lav, f.dataset.qaddLav);
    var rql = await sb.from("task").insert({ titolo: titl, commessa_id: lv2 ? lv2.commessa_id : null, progetto_id: lv2 ? lv2.progetto_id : null, lavorazione_id: f.dataset.qaddLav, assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rql.error) { toast(rql.error.message, true); return; }
    f.titolo.value = "";
    await reload(["task"]); render();
    return;
  }
  if (f.dataset.qadd) {
    e.preventDefault();
    var tit = f.titolo.value.trim(); if (!tit) return;
    var rq = await sb.from("task").insert({ titolo: tit, commessa_id: f.dataset.qadd, assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rq.error) { toast(rq.error.message, true); return; }
    f.titolo.value = "";
    await reload(["task"]); render();
    var inp = document.querySelector(".qadd input"); if (inp) inp.focus();
    return;
  }
  if (f.dataset.chat) {
    e.preventDefault();
    var tx = f.testo.value.trim(); if (!tx) return;
    var rch = await sb.from("commenti").insert({ commessa_id: f.dataset.chat, pro_id: me.pro_id, testo: tx });
    if (rch.error) { toast(rch.error.message, true); return; }
    f.testo.value = "";
    await reload(["comm"]); render();
    return;
  }
  if (f.dataset.form === "settings") {
    e.preventDefault();
    var v = +f.fee_default.value || 0;
    var rs = await sb.from("settings").update({ fee_default: v }).eq("id", 1);
    if (rs.error) { toast(rs.error.message, true); return; }
    SET.fee_default = v; toast("Impostazioni salvate"); return;
  }
  if (f.dataset.form === "password") {
    e.preventDefault();
    var pw = f.pw.value || "";
    if (pw.length < 8) { toast("La password deve avere almeno 8 caratteri", true); return; }
    var rp = await sb.auth.updateUser({ password: pw });
    if (rp.error) { toast(rp.error.message, true); return; }
    f.pw.value = ""; toast("Password aggiornata"); return;
  }
});

document.addEventListener("change", function (e) {
  if (e.target.dataset && e.target.dataset.persp) { persp = e.target.value; render(); }
});
document.addEventListener("input", function (e) {
  if (e.target.closest && e.target.closest("form.fpage")) {
    FDIRTY = true;
    var fst = el("#fstat"); if (fst) fst.textContent = "modifiche non salvate";
  }
  if (e.target.id === "search") { search = e.target.value; render(); }
  if (e.target.id === "palq") renderPal(e.target.value);
  if (e.target.id === "tdesc") {
    var vald = e.target.value, tid9 = current, std = el("#tstat");
    if (std) std.textContent = "scrivo…";
    clearTimeout(NOTET);
    NOTET = setTimeout(async function () {
      var rd9 = await sb.from("task").update({ descrizione: vald }).eq("id", tid9);
      var t9 = by(D.task, tid9); if (t9) t9.descrizione = vald;
      var s9 = el("#tstat"); if (s9) s9.textContent = rd9.error ? "errore" : "salvato";
      setTimeout(function () { var s8 = el("#tstat"); if (s8) s8.textContent = ""; }, 2200);
    }, 800);
  }
  if (e.target.id === "tcerca") { TF.cerca = e.target.value; render(); }
  if (e.target.id === "fcerca" && e.target.dataset.f) { var fq = e.target.dataset.f.split("|"); if (FS[fq[0]]) { FS[fq[0]].cerca = e.target.value; render(); } }
  if (e.target.id === "noteprog") {
    var valp = e.target.value, pid = current, stp = el("#notestat");
    if (stp) stp.textContent = "scrivo…";
    clearTimeout(NOTET);
    NOTET = setTimeout(async function () {
      var rp2 = await sb.from("progetti").update({ note_doc: valp }).eq("id", pid);
      var pp2 = by(D.prog, pid); if (pp2) pp2.note_doc = valp;
      var s4 = el("#notestat"); if (s4) s4.textContent = rp2.error ? "errore" : "salvato";
      setTimeout(function () { var s5 = el("#notestat"); if (s5) s5.textContent = ""; }, 2200);
    }, 800);
  }
  if (e.target.id === "notedoc") {
    var val = e.target.value, kid = current, st = el("#notestat");
    if (st) st.textContent = "scrivo…";
    clearTimeout(NOTET);
    NOTET = setTimeout(async function () {
      var r = await sb.from("commesse").update({ note_doc: val }).eq("id", kid);
      var k2 = by(D.com, kid); if (k2) k2.note_doc = val;
      var s2 = el("#notestat"); if (s2) s2.textContent = r.error ? "errore" : "salvato";
      setTimeout(function () { var s3 = el("#notestat"); if (s3) s3.textContent = ""; }, 2200);
    }, 800);
  }
});

document.addEventListener("change", async function (e) {
  /* campo a modifica immediata su qualsiasi scheda: tabella|campo|id */
  if (e.target.dataset && e.target.dataset.qset) {
    var pz = e.target.dataset.qset.split("|"), tbk = pz[0], campo = pz[1], rid = pz[2];
    var val = e.target.value;
    var BOOLQ = ["visibile_cliente", "fatturabile", "opzionale", "ricorrente"];
    if (BOOLQ.indexOf(campo) > -1) val = (val === "si");
    else if (val === "") val = null;
    else if (e.target.type === "number") val = +val;
    var patch = {}; patch[campo] = val;
    if (tbk === "task") {
      if (campo === "progetto_id" && val) { var pg9 = by(D.prog, val); if (pg9) patch.commessa_id = pg9.commessa_id; }
      if (campo === "lavorazione_id" && val) { var lv9 = by(D.lav, val); if (lv9) { patch.progetto_id = lv9.progetto_id; patch.commessa_id = lv9.commessa_id; } }
      if (campo === "stato" && val === "Fatto") patch.completata_il = new Date().toISOString();
    }
    var rq = await sb.from(TB[tbk]).update(patch).eq("id", rid);
    if (rq.error) { toast(rq.error.message, true); return; }
    await reload([tbk]); toast("Salvato"); render(); return;
  }
  /* filtri di sezione: ambito|campo */
  if (e.target.dataset && e.target.dataset.f) {
    var fz = e.target.dataset.f.split("|");
    if (FS[fz[0]]) { FS[fz[0]][fz[1]] = e.target.value; render(); }
    return;
  }
  if (e.target.dataset && e.target.dataset.tf) { TF[e.target.dataset.tf] = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.tg) { TGROUP = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.ts) { TSORT = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.vistaApri) {
    var vv9 = by(D.viste, e.target.value); if (!vv9) return;
    var cfg = vv9.config || {};
    if (cfg.TF) TF = cfg.TF;
    if (cfg.TGROUP) TGROUP = cfg.TGROUP;
    if (cfg.TSORT) TSORT = cfg.TSORT;
    go("task", null, cfg.vista || "lista"); return;
  }
  if (e.target.classList && e.target.classList.contains("tsc")) {
    var p = e.target.dataset.ts.split("|");
    await salvaTs(p[0], p[1], e.target.value);
    return;
  }
  if (e.target.id === "fileinp" && e.target.files && e.target.files.length) {
    var dz = el("#drop");
    await uploadFile(e.target.files, dz ? dz.dataset.kid : current);
}
});

document.addEventListener("dragover", function (e) {
  var z = e.target.closest && e.target.closest("#drop");
  if (z) { e.preventDefault(); z.classList.add("over"); }
});
document.addEventListener("dragleave", function (e) {
  var z = e.target.closest && e.target.closest("#drop");
  if (z) z.classList.remove("over");
});
document.addEventListener("drop", async function (e) {
  var z = e.target.closest && e.target.closest("#drop");
  if (!z) return;
  e.preventDefault(); z.classList.remove("over");
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) await uploadFile(e.dataTransfer.files, z.dataset.kid, z.dataset.tid);
});

document.addEventListener("keydown", function (e) {
  var pal = el("#palq");
  if (pal) {
    if (e.key === "ArrowDown") { e.preventDefault(); palMove(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); palMove(-1); return; }
    if (e.key === "Enter") { e.preventDefault(); palGo(PALI); return; }
  }
  if (e.key === "Escape") { closeModal(); return; }
  if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); return; }
  var tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (el("#app").classList.contains("hide")) return;
  if (e.key === "/") { e.preventDefault(); var s = el("#search"); if (s) s.focus(); else openPalette(); return; }
  if (e.key === "n" && !e.metaKey && !e.ctrlKey && !isCliente()) { e.preventDefault(); openForm("com"); return; }
  if (e.key === "o" && !e.metaKey && !e.ctrlKey && !isCliente() && !isPR()) { e.preventDefault(); openForm("ore"); return; }
});

/* Griglia ore: ci si muove con le frecce, Invio scende */
document.addEventListener("keydown", function (e) {
  var c = e.target;
  if (!c.classList || !c.classList.contains("tsc") || !c.dataset.rc) return;
  var p = c.dataset.rc.split("|"), r = +p[0], k = +p[1], dr = 0, dk = 0;
  if (e.key === "ArrowDown" || e.key === "Enter") dr = 1;
  else if (e.key === "ArrowUp") dr = -1;
  else if (e.key === "ArrowLeft" && c.selectionStart === 0) dk = -1;
  else if (e.key === "ArrowRight" && c.selectionStart === c.value.length) dk = 1;
  else return;
  var n = document.querySelector('.tsc[data-rc="' + (r + dr) + "|" + (k + dk) + '"]');
  if (!n) return;
  e.preventDefault(); n.focus(); n.select();
});
document.addEventListener("dragstart", function (e) {
  var t = e.target.closest && e.target.closest(".tsk, .trow[draggable]");
  if (!t) return;
  DRAG = t.dataset.openTask; t.classList.add("dragging");
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", DRAG); } catch (x) {} }
});
document.addEventListener("dragend", function (e) {
  var t = e.target.closest && e.target.closest(".tsk"); if (t) t.classList.remove("dragging");
  Array.prototype.forEach.call(document.querySelectorAll(".kcol.over"), function (c) { c.classList.remove("over"); });
});
document.addEventListener("dragover", function (e) {
  var c = e.target.closest && e.target.closest(".kcol, .mcol");
  if (!c || !DRAG) return;
  e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  c.classList.add("over");
});
document.addEventListener("dragleave", function (e) {
  var c = e.target.closest && e.target.closest(".kcol, .mcol");
  if (c && !c.contains(e.relatedTarget)) c.classList.remove("over");
});
/* Le mie cose: trascini fra Oggi / Settimana / Più avanti / Senza data e cambia la scadenza */
document.addEventListener("drop", async function (e) {
  var col = e.target.closest && e.target.closest(".mcol");
  if (!col || !DRAG) return;
  e.preventDefault(); col.classList.remove("over");
  var idm = DRAG; DRAG = null;
  var quando = col.dataset.quando;
  var nuova = quando === "oggi" ? today()
    : quando === "settimana" ? iso(new Date(Date.now() + 3 * 86400000))
    : quando === "dopo" ? iso(new Date(Date.now() + 14 * 86400000)) : null;
  var rm9 = await sb.from("task").update({ scadenza: nuova }).eq("id", idm);
  if (rm9.error) { toast(rm9.error.message, true); return; }
  await reload(["task"]); toast(nuova ? "Spostata al " + dt(nuova) : "Scadenza tolta"); render();
});
document.addEventListener("drop", async function (e) {
  var c = e.target.closest && e.target.closest(".kcol");
  if (!c || !DRAG) return;
  e.preventDefault(); c.classList.remove("over");
  var id = DRAG, st = c.dataset.stato; DRAG = null;
  var t = by(D.task, id);
  if (!t || t.stato === st) return;
  var r = await sb.from("task").update({ stato: st }).eq("id", id);
  if (r.error) { toast(r.error.message, true); return; }
  if (t.commessa_id && st === "Fatto") await logEv(t.commessa_id, "Attività completata: " + t.titolo);
  await reload(["task", "ev"]); toast("Spostata in “" + st + "”"); render();
});

/* ---------------- auth ---------------- */
async function doLogin(f) {
  var err = el("#loginerr"); err.classList.add("hide");
  var r = await sb.auth.signInWithPassword({ email: f.email.value, password: f.password.value });
  if (r.error) { err.textContent = r.error.message; err.classList.remove("hide"); return; }
  await start();
}
async function portaleDaLink(tok) {
  var box = el("#login");
  box.classList.remove("hide");
  el("#splash").classList.add("hide");
  box.innerHTML = '<form class="authcard" id="portform">' +
    '<div class="brandmark"><i class="mark"></i></div>' +
    "<h2>Area cliente</h2><p>Inserisci la password che ti ha dato lo studio.</p>" +
    '<div class="field"><label>Password</label><input type="password" name="pwd" required autocomplete="current-password"></div>' +
    '<div class="err hide" id="porterr"></div>' +
    '<button class="btn" style="width:100%;padding:12px" type="submit">Entra</button></form>';
  el("#portform").addEventListener("submit", async function (e) {
    e.preventDefault();
    var pwd = e.target.pwd.value, err = el("#porterr"), btn = e.target.querySelector("button");
    err.classList.add("hide"); btn.disabled = true; btn.textContent = "Verifico…";
    var r = await sb.rpc("portale_link", { tok: tok, pwd: pwd });
    if (r.error) {
      err.textContent = /Password/.test(r.error.message) ? "Password errata." : "Link non valido o scaduto.";
      err.classList.remove("hide"); btn.disabled = false; btn.textContent = "Entra"; return;
    }
    PLINK = { tok: tok, pwd: pwd };
    PORT = (r.data && r.data.progetti) || [];
    me.ruolo = "cliente";
    me.nome = (r.data && r.data.cliente && r.data.cliente.nome) || "Area cliente";
    me.email = "";
    view = "progetti";
    show("app"); render();
  });
}
async function start() {
  var pm = /^#\/p\/([a-z0-9]+)/i.exec(location.hash || "");
  if (pm) { await portaleDaLink(pm[1]); return; }
  var s = await sb.auth.getSession();
  if (!s.data.session) { show("login"); return; }
  user = s.data.session.user;
  await loadAll();
  var daUrl = leggiHash();
  if (!daUrl || isCliente()) { view = isCliente() ? "progetti" : "dash"; current = null; tab = ""; }
  if (!isCliente()) { ROUTING = true; try { location.hash = hashOf(view, current, tab); } catch (e) {} ROUTING = false; }
  show("app"); render();
}
async function init() {
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { show("setup"); return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  el("#logout").addEventListener("click", async function () {
    if (PLINK) { location.hash = ""; location.reload(); return; }
    await sb.auth.signOut(); location.reload();
  });
  var ham = el("#ham"), scrim = el("#scrim");
  if (ham) ham.addEventListener("click", function () { document.body.classList.toggle("navopen"); });
  if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("navopen"); });
  await start();
}
init();
})();
