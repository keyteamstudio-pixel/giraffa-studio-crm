/* Giraffa Studio — CRM v3 (ruoli: admin · professionista · pr · cliente) */


(function () {
"use strict";

var cfg = window.GS_CONFIG || {};
var sb = null, user = null;
var me = { pro_id: null, cliente_id: null, ruolo: "", nome: "", email: "" };
var D = { pros: [], serv: [], cli: [], com: [], righe: [], spazi: [], task: [], ore: [], mov: [], inter: [], pren: [], membri: [], fasi: [], mat: [], pag: [], appr: [], vari: [], ev: [], comm: [], tmr: [], prog: [], lav: [] };
var CAL = 0;
var SET = { fee_default: 12 };
var TB = { pros: "professionisti", serv: "servizi", cli: "clienti", com: "commesse", righe: "righe", spazi: "spazi", task: "task", ore: "ore", mov: "movimenti", inter: "interazioni", pren: "prenotazioni", membri: "membri", fasi: "fasi", mat: "materiali", pag: "pagamenti", appr: "approvazioni", vari: "varianti", ev: "eventi", comm: "commenti", tmr: "timer", prog: "progetti", lav: "lavorazioni" };

var view = "dash", current = null, tab = "", persp = "all", search = "";
var PORT = [], STATS = null;
var EXP = {}, VISTA = "tabella", FSTATO = "", FSAL = "", DRAG = null;
var PAL = [], PALR = [], PALI = 0;
var WEEK = 0, NOTEDIT = false, NOTET = null, TICK = null;

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
function go(v, id, t) { view = v; current = id || null; tab = t || ""; search = ""; document.body.classList.remove("navopen"); window.scrollTo(0, 0); render(); }
function isAdmin() { return me.ruolo === "admin"; }
function isPR() { return me.ruolo === "pr"; }
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
var MODELLI = ["A · ognuno il suo", "B · Giraffa fattura", "C · subappalto"];
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
  var costoReale = sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); });
  var margPian = ricavo - c.cost;
  var margReale = ricavo - Math.max(c.cost, costoReale);
  var burnOre = oreStim ? Math.round(oreFatte / oreStim * 100) : null;
  var burnCosto = ricavo ? Math.round(Math.max(c.cost, costoReale) / ricavo * 100) : 0;
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
  var fee = Math.round(imp * (+k.fee || 0) / 100);
  var tot = imp + fee;
  var iva = Math.round(tot * (k.iva == null ? 22 : +k.iva) / 100);
  var prov = Math.round(tot * (+k.provvigione || 0) / 100);
  return { imp: imp, cost: cost, fee: fee, tot: tot, iva: iva, lordo: tot + iva, margine: tot - cost, mio: mio, prov: prov, opz: opz, mrr: mrr, sconto: sconto, spese: spese };
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
  if (m.data) { me.ruolo = m.data.ruolo || "professionista"; me.pro_id = m.data.pro_id; me.cliente_id = m.data.cliente_id; }
  else { me.ruolo = ""; }
  if (isCliente()) { var p = await sb.rpc("portale"); PORT = p.data || []; me.nome = "Area cliente"; return; }
  var keys = Object.keys(TB);
  var res = await Promise.all(keys.map(function (k) { return sb.from(TB[k]).select("*"); }));
  res.forEach(function (r, i) { D[keys[i]] = (r.error ? [] : (r.data || [])); });
  var s = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (s.data) SET = s.data;
  var st = await sb.rpc("studio_stats");
  STATS = st.data || null;
  var pr = me.pro_id ? by(D.pros, me.pro_id) : null;
  me.nome = pr ? pr.nome : user.email;
}
async function reload(keys) {
  await Promise.all(keys.map(async function (k) {
    var r = await sb.from(TB[k]).select("*"); if (!r.error) D[k] = r.data || [];
  }));
}
/* ---------------- nav ---------------- */
function navFor() {
  if (isPR()) return [
    { g: "Il mio lavoro" }, { k: "dash", t: "Dashboard" },
    { k: "calendario", t: "Calendario" },
    { k: "commesse", t: "I miei preventivi", c: function () { return fcom().length; } },
    { k: "progetti", t: "Progetti", c: function () { return progVisibili().length; } },
    { g: "Clienti" }, { k: "clienti", t: "I miei clienti", c: function () { return fcli().length; } },
    { g: "Soldi" }, { k: "provvigioni", t: "Provvigioni" },
    { g: "Studio" }, { k: "impostazioni", t: "Impostazioni" }
  ];
  if (isPro()) return [
    { g: "Il mio lavoro" }, { k: "dash", t: "Dashboard" },
    { k: "calendario", t: "Calendario" },
    { k: "progetti", t: "Progetti", c: function () { return progVisibili().filter(function (p) { return p.stato !== "Completato"; }).length; } },
    { k: "ore", t: "Ore & timesheet" },
    { g: "Clienti" }, { k: "clienti", t: "Clienti", c: function () { return fcli().length; } },
    { k: "commesse", t: "Preventivi", c: function () { return fcom().length; } },
    { k: "servizi", t: "I miei servizi" },
    { g: "Soldi" }, { k: "fatture", t: "Le mie fatture" },
    { g: "Studio" }, { k: "spazi", t: "Spazi & ufficio" }, { k: "impostazioni", t: "Impostazioni" }
  ];
  return [
    { g: "Lavoro" }, { k: "dash", t: "Dashboard" },
    { k: "calendario", t: "Calendario" },
    { k: "progetti", t: "Progetti", c: function () { return progVisibili().filter(function (p) { return p.stato !== "Completato"; }).length; } },
    { k: "ore", t: "Ore & timesheet" },
    { g: "Clienti" }, { k: "clienti", t: "Clienti", c: function () { return fcli().length; } },
    { k: "commesse", t: "Preventivi", c: function () { return fcom().filter(function (k) { return ["Bozza", "Preventivo"].indexOf(k.stato) > -1; }).length; } },
    { k: "pool", t: "Pool professionisti", c: function () { return D.pros.length; } },
    { k: "servizi", t: "Servizi & listino" },
    { g: "Soldi" }, { k: "fatture", t: "Fatturazione", c: function () { return fmov().filter(function (m) { return m.stato !== "Pagata"; }).length; } },
    { k: "provvigioni", t: "Provvigioni PR" }, { k: "report", t: "Report" },
    { g: "Studio" }, { k: "carico", t: "Carico di lavoro" }, { k: "spazi", t: "Spazi & ufficio" }, { k: "impostazioni", t: "Impostazioni" }
  ];
}
var RUOLO_ET = { admin: "Regia", professionista: "Professionista", pr: "PR", cliente: "Cliente" };
function buildNav() {
  var h = "", cur = { commessa: "commesse", cliente: "clienti", pro: "pool", progetto: "progetti" }[view] || view;
  navFor().forEach(function (n) {
    if (n.g) { h += '<div class="navgroup">' + n.g + "</div>"; return; }
    var c = n.c ? n.c() : null;
    h += '<button data-go="' + n.k + '" class="' + (cur === n.k ? "on" : "") + '">' + n.t + (c ? '<span class="cnt">' + c + "</span>" : "") + "</button>";
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
  el("#mename").textContent = me.nome;
  el("#meemail").innerHTML = esc(me.email) + '<br><span class="badge" style="margin-top:6px">' + esc(RUOLO_ET[me.ruolo] || "—") + "</span>";
}
function perspSel() {
  if (isCliente()) return "";
  return '<span class="faint">Mostra</span><select id="persp" style="width:auto"><option value="all"' + (persp === "all" ? " selected" : "") + '>Tutte le mie</option><option value="me"' + (persp === "me" ? " selected" : "") + '>Solo mie</option><option value="shared"' + (persp === "shared" ? " selected" : "") + ">Condivise</option></select>";
}
function head(title, sub, tools) {
  return '<div class="top"><h1>' + esc(title) + (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") + '</h1><div class="tools">' + (tools || "") + perspSel() + "</div></div>";
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
    f.push({ p: 2, c: "b-red", t: "Commessa a rischio: " + k.titolo, s: salute(k).d, k: k.id, tab: "fasi" });
  });
  var d = new Date(), dow = d.getDay();
  if (dow > 0 && dow < 6 && !fore().some(function (o) { return o.data === today(); })) {
    f.push({ p: 4, c: "", t: "Non hai ancora registrato le ore di oggi", s: "bastano trenta secondi", act: "ore" });
  }
  return f.sort(function (a, b) { return a.p - b.p; }).slice(0, 5);
}
function can(kid) { return !!by(D.com, kid); }
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

  var h = '<div class="top"><h1>Ciao ' + esc((me.nome || "").split(" ")[0]) + '<span class="sub">' + esc(oggi.charAt(0).toUpperCase() + oggi.slice(1)) + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-pal="1">⌘K  Cerca</button>' +
    '<button class="btn sm" data-new="com">+ Nuova commessa</button>' + (isPR() ? "" : '<button class="btn sm ghost" data-new="ore">+ Registra ore</button>') +
    perspSel() + "</div></div>";

  h += '<div class="grid g32">';
  h += '<div class="card"><div class="cardhead"><h2>Da guardare adesso</h2>' + (foc.length ? '<span class="badge ' + (foc[0].c || "") + '">' + foc.length + " cose</span>" : '<span class="badge b-green">tutto in ordine</span>') + "</div>";
  h += foc.length ? foc.map(function (f) {
    return '<button class="frow" ' + (f.task ? 'data-open-task="' + f.task + '"' : f.act ? 'data-new="' + f.act + '"' : 'data-open-com="' + f.k + '"') + '><span class="fdot ' + (f.c || "b-blue") + '"></span><span class="ftxt"><b>' + esc(f.t) + '</b><span class="faint">' + esc(f.s) + "</span></span><span class=\"fgo\">›</span></button>";
  }).join("") : '<div class="empty">Nessuna urgenza: puoi lavorare sereno.</div>';
  h += "</div><div>";
  h += '<div class="card ringcard">' + ring(avgAv, 104) + '<div><h2>Avanzamento medio</h2><p class="faint" style="margin-top:4px">' + attive.length + " commesse attive<br>" + (isPR() ? eur(sum(com, function (k) { return calc(k).prov; })) + " di provvigioni" : eur(pipeline) + " di pipeline") + "</p></div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Ore, ultime 8 settimane</h2><span class="faint">' + num(wk[wk.length - 1], 1) + " h questa settimana</span></div>" + spark(wk) + "</div>";
  h += "</div></div>";

  h += '<div class="grid g32" style="margin-top:18px">';
  h += '<div class="card"><div class="cardhead"><h2>Le commesse su cui sei</h2><button class="btn sm ghost" data-go="commesse">Vedi tutte</button></div>';
  h += com.length ? listCom(com.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); }).slice(0, 6)) : vuoto("Nessuna commessa ancora.", '<button class="lnk" data-new="com">Creane una</button>');
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
  if (STATS) {
    h += '<div class="card" style="margin-top:16px;background:var(--cream)"><div class="cardhead"><h2>Lo studio in numeri</h2><span class="badge">anonimo</span></div>' +
      '<div class="grid g4">' +
      kpi(String(STATS.membri || 0), "Professionisti attivi") +
      kpi(String(STATS.commesse_attive || 0), "Commesse attive nello studio") +
      kpi(String(STATS.progetti_condivisi || 0), "Progetti condivisi") +
      kpi(num(STATS.ore_mese, 1) + " h", "Ore registrate questo mese") +
      '</div><p class="faint" style="margin-top:12px">Numeri complessivi dello studio, senza nomi e senza importi per persona: nessuno vede quanto fatturano gli altri.</p></div>';
  }
  return h;
}

function listCom(list) {
  return list.map(function (k) {
    var b = budget(k), sal = salute(k), av = avanzamento(k.id);
    return '<button class="crow" data-open-com="' + k.id + '">' +
      '<span class="cring">' + ring(av == null ? 0 : av, 44) + "</span>" +
      '<span class="cmain"><b>' + esc(k.titolo) + '</b><span class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + esc(k.stato) + (k.scadenza ? " · consegna " + dshort(k.scadenza) : "") + "</span></span>" +
      '<span class="cav">' + avatars(proDi(k.id), 24) + "</span>" +
      '<span class="cval"><b>' + (isPR() ? eur(calc(k).prov) : eur(b.ricavo)) + '</b><span class="badge ' + sal.c + '">' + sal.t + "</span></span></button>";
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
  var h = '<table class="rich"><thead><tr><th style="width:26px"></th><th>Commessa</th><th>Cliente</th><th>Team</th><th>Stato</th><th>Salute</th><th style="width:104px">Avanz.</th><th>Consegna</th><th class="num">' + (isPR() ? "Provvigione" : "Valore") + "</th><th></th></tr></thead><tbody>";
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
      '<td class="num"><b>' + (isPR() ? eur(c.prov) : eur(b.ricavo)) + "</b></td>" +
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
  var tutte = fcom();
  var list = tutte.slice();
  if (search) list = list.filter(function (k) { return (k.titolo + " " + nameOf(D.cli, k.cliente_id)).toLowerCase().indexOf(search.toLowerCase()) > -1; });
  if (FSTATO) list = list.filter(function (k) { return k.stato === FSTATO; });
  if (FSAL) list = list.filter(function (k) { return salute(k).c === FSAL; });
  var val = sum(list, function (k) { return budget(k).ricavo; });

  var h = head("Preventivi", list.length + " preventivi · " + eur(val) + " di valore",
    '<input id="search" placeholder="Cerca…" style="width:180px" value="' + esc(search) + '"><button class="btn sm" data-new="com">+ Nuovo preventivo</button>');

  h += '<div class="filters">';
  h += '<div class="chips"><button class="fc' + (FSTATO ? "" : " on") + '" data-fs="">Tutti gli stati</button>' +
    STATI.map(function (s) {
      var n = tutte.filter(function (k) { return k.stato === s; }).length;
      return n ? '<button class="fc' + (FSTATO === s ? " on" : "") + '" data-fs="' + s + '">' + s + "<span>" + n + "</span></button>" : "";
    }).join("") + "</div>";
  h += '<div class="chips"><button class="fc' + (FSAL ? "" : " on") + '" data-fh="">Tutte</button>' +
    [["b-red", "A rischio"], ["b-amber", "Da tenere d'occhio"], ["b-green", "In linea"]].map(function (x) {
      var n = tutte.filter(function (k) { return salute(k).c === x[0]; }).length;
      return n ? '<button class="fc' + (FSAL === x[0] ? " on" : "") + '" data-fh="' + x[0] + '"><i class="dot ' + x[0] + '"></i>' + x[1] + "<span>" + n + "</span></button>" : "";
    }).join("") + "</div>";
  h += '<div class="seg"><button class="' + (VISTA === "tabella" ? "on" : "") + '" data-vista="tabella">Tabella</button><button class="' + (VISTA === "board" ? "on" : "") + '" data-vista="board">Board</button></div>';
  h += "</div>";

  if (!list.length) return h + '<div class="card">' + vuoto("Nessuna commessa con questi filtri.", '<button class="lnk" data-fs="">Azzera i filtri</button>') + "</div>";
  h += VISTA === "board" ? boardCom(list) : '<div class="card">' + tblCom(list.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); })) + "</div>";
  return h;
}

function vCommessa() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Commessa non trovata. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  var c = calc(k), ore = oreOf(k.id), tk = taskOf(k.id), mv = movOf(k.id), fs = fasiOf(k.id), mt = matOf(k.id), pg = pagOf(k.id), ap = apprOf(k.id);
  var oreT = sum(ore, function (o) { return o.ore; }), av = avanzamento(k.id);
  var incassato = sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; });
  var t = tab || "note";

  var b = budget(k), sal = salute(k), vr = variOf(k.id);

  var h = '<div class="top"><h1>' + esc(k.titolo) + '<span class="sub">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + esc(k.stato) + " · " + esc(k.tipo_prezzo || "Fisso") + (condivisa(k) ? " · condivisa con " + (proDi(k.id).length - 1) + " colleghi" : " · solo tua") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="commesse">← Commesse</button>' +
    '<button class="btn sm ghost" data-edit="com:' + k.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-preventivo="' + k.id + '">Preventivo</button>' +
    (isPR() ? "" : (timerMio() && timerMio().commessa_id === k.id
      ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(timerMio().iniziato) + "</span></button>"
      : '<button class="btn sm ghost" data-tstart="' + k.id + '">▶ Avvia timer</button>')) +
    '<button class="btn sm" data-portale="' + k.id + '">Anteprima cliente</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(b.ricavo), "Valore commessa", c.mrr ? eur(c.mrr) + " al mese ricorrenti" : b.extra ? eur(k.budget_importo || c.tot) + " + " + eur(b.extra) + " di varianti" : "imponibile " + eur(c.imp) + " · IVA " + eur(c.iva)) +
    kpi(av == null ? "—" : av + " %", "Avanzamento", fs.length + " fasi") +
    kpi('<span class="badge ' + sal.c + '" style="font-size:.9rem;padding:5px 12px">' + sal.t + "</span>", "Salute", sal.d) +
    kpi(vediCosti() ? eur(b.margReale) : eur(c.prov), vediCosti() ? "Margine atteso" : "La mia provvigione", vediCosti() ? "pianificato " + eur(b.margPian) : (k.provvigione || 0) + "% del totale") + "</div>";

  if (vediCosti()) {
    var bo = b.burnOre == null ? 0 : b.burnOre, bc = b.burnCosto;
    h += '<div class="card"><div class="grid g2">' +
      '<div><div class="cardhead"><h2>Consumo ore</h2><span class="faint">' + num(b.oreFatte, 1) + " / " + num(b.oreStim, 0) + " h stimate</span></div><div class=\"prog\"><i class=\"" + (bo > 100 ? "bad" : bo > 85 ? "warn" : "ok") + '" style="width:' + Math.min(100, bo) + '%"></i></div><p class="faint" style="margin-top:6px">' + bo + "% del budget ore</p></div>" +
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
  var TABS = [["fasi", "Fasi (" + fs.length + ")"], ["servizi", "Preventivo (" + righeOf(k.id).length + ")"], ["attivita", "Attività (" + tk.filter(function (z) { return z.stato !== "Fatto"; }).length + ")"], ["materiali", "Materiali (" + mt.length + ")"], ["pagamenti", "Pagamenti (" + pg.length + ")"], ["approvazioni", "Approvazioni (" + ap.filter(function (a) { return a.stato === "In attesa"; }).length + ")"], ["varianti", "Varianti (" + vr.length + ")"], ["log", "Diario"]];
  if (!isPR()) TABS.splice(3, 0, ["ore", "Ore (" + num(oreT, 1) + ")"]);
  TABS.unshift(["note", "Note"], ["discussione", "Discussione (" + D.comm.filter(function (x) { return x.commessa_id === k.id; }).length + ")"]);
  h += '<div class="card"><div class="tabs">' + TABS.map(function (x) { return '<button data-tab="' + x[0] + '" class="' + (t === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>";

  if (t === "note") {
    h += '<div class="cardhead"><h2>Note della commessa</h2><div style="display:flex;gap:8px;align-items:center"><span class="faint" id="notestat"></span><button class="btn sm ghost" data-notedit="' + (NOTEDIT ? "0" : "1") + '">' + (NOTEDIT ? "Anteprima" : "Scrivi") + "</button></div></div>";
    if (NOTEDIT) {
      h += '<textarea id="notedoc" class="doc" placeholder="# Titolo&#10;Scrivi qui il brief, gli appunti, le decisioni.&#10;- elenco&#10;- [ ] cosa da fare">' + esc(k.note_doc || "") + "</textarea>" +
        '<p class="faint" style="margin-top:10px"># titolo · - elenco · - [ ] da fare · **grassetto** · i link diventano cliccabili. Si salva da solo.</p>';
    } else {
      h += (k.note_doc && k.note_doc.trim()) ? md(k.note_doc) : vuoto("Ancora nessuna nota: qui dentro tieni brief, decisioni e cose da ricordare.", '<button class="lnk" data-notedit="1">Inizia a scrivere</button>');
    }
  }
  if (t === "discussione") {
    var cm = D.comm.filter(function (x) { return x.commessa_id === k.id; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    h += '<div class="cardhead"><h2>Discussione</h2><span class="faint">visibile solo a chi lavora sulla commessa</span></div>';
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
      h += '<div class="totali"><table><tbody>' +
        row2("Imponibile", eur(c.imp + c.sconto)) +
        (c.sconto ? row2("Sconto commerciale (" + (k.sconto || 0) + "%)", "−" + eur(c.sconto)) : "") +
        (c.fee ? row2("Coordinamento Giraffa Studio (" + (k.fee || 0) + "%)", eur(c.fee)) : "") +
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
  if (t === "ore") h += '<div class="cardhead"><h2>Ore registrate</h2><button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">+ Registra ore</button></div>' + tblOre(ore);
  if (t === "materiali") {
    h += '<div class="cardhead"><h2>Materiali della commessa</h2><button class="btn sm ghost" data-new="mat" data-ctx="' + k.id + '">+ Aggiungi materiale</button></div>';
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
      return "<tr><td>" + esc(p.nome) + "</td><td>" + (late ? '<span class="badge b-red">' + dt(p.scadenza) + "</span>" : dt(p.scadenza)) + '</td><td class="num">' + eur(p.importo) + '</td><td><span class="badge ' + (p.stato === "Incassato" ? "b-green" : "b-amber") + '">' + esc(p.stato) + '</span></td><td class="num">' + (p.stato !== "Incassato" ? '<button class="lnk" data-incassa="' + p.id + '">Incassato</button> ' : "") + '<button class="lnk" data-edit="pag:' + p.id + '">Modifica</button></td></tr>';
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
    h += '<p class="faint" style="margin-bottom:12px">Ogni richiesta fuori preventivo si registra qui: quando è approvata entra nel valore della commessa e nel budget ore, così il margine resta vero.</p>';
    h += vr.length ? '<table><thead><tr><th>Variante</th><th>Data</th><th class="num">Importo</th><th class="num">Ore</th><th>Stato</th><th></th></tr></thead><tbody>' + vr.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (v) {
      return "<tr><td><b>" + esc(v.nome) + "</b>" + (v.descrizione ? '<div class="faint">' + esc(v.descrizione) + "</div>" : "") + "</td><td>" + dt(v.data) + '</td><td class="num">' + eur(v.importo) + '</td><td class="num">' + num(v.ore, 0) + '</td><td><span class="badge ' + (v.stato === "Approvata" ? "b-green" : v.stato === "Rifiutata" ? "b-red" : "b-amber") + '">' + esc(v.stato) + '</span></td><td class="num">' + (v.stato === "Proposta" ? '<button class="lnk" data-appr-var="' + v.id + '">Approva</button> ' : "") + '<button class="lnk" data-edit="vari:' + v.id + '">Modifica</button></td></tr>';
    }).join("") + '</tbody><tfoot><tr><td colspan="2"><b>Approvate</b></td><td class="num"><b>' + eur(b.extra) + '</b></td><td class="num"><b>' + num(sum(vr.filter(function (v) { return v.stato === "Approvata"; }), function (v) { return v.ore; }), 0) + "</b></td><td colspan=\"2\"></td></tr></tfoot></table>" : vuoto("Nessuna variante: il lavoro è ancora quello concordato.", '<button class="lnk" data-new="vari" data-ctx="' + k.id + '">Registra un extra</button>');
  }
  if (t === "log") {
    var evs = evOf(k.id);
    h += '<div class="cardhead"><h2>Diario della commessa</h2><button class="btn sm ghost" data-new="ev" data-ctx="' + k.id + '">+ Aggiungi nota</button></div>';
    h += evs.length ? '<ul class="timeline">' + evs.map(function (e) {
      return "<li>" + esc(e.testo) + '<div class="when">' + dt(e.created_at) + " · " + esc(e.pro_id ? nameOf(D.pros, e.pro_id) : "sistema") + "</div></li>";
    }).join("") + "</ul>" : vuoto("Nessun evento registrato.");
  }
  h += "</div></div><div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Scheda</h3><table><tbody>' +
    row2("Cliente", '<button class="lnk" data-open-cli="' + k.cliente_id + '">' + esc(nameOf(D.cli, k.cliente_id)) + "</button>") +
    row2("Owner", esc(nameOf(D.pros, k.owner_id))) +
    row2("Regia (PM)", esc(nameOf(D.pros, k.pm_id))) +
    (k.pr_id ? row2("PR", esc(nameOf(D.pros, k.pr_id)) + " · " + (k.provvigione || 0) + "%") : "") +
    row2("Stato", '<span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + "</span>") +
    row2("Probabilità", (k.probabilita == null ? 50 : k.probabilita) + " %") +
    row2("Fatturazione", esc(k.modello || "—")) +
    row2("Periodo", dt(k.inizio) + " → " + dt(k.scadenza)) +
    row2("Note", esc(k.note || "—")) + "</tbody></table></div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Economics</h3><table><tbody>' +
    row2("Imponibile servizi", eur(c.imp)) + row2("Fee coordinamento", eur(c.fee)) +
    (b.extra ? row2("Varianti approvate", eur(b.extra)) : "") +
    row2("<b>Valore commessa</b>", "<b>" + eur(b.ricavo) + "</b>") +
    (vediCosti() ? row2("Costo pianificato", eur(b.costoPian)) + row2("Costo reale (ore)", eur(b.costoReale)) +
      row2("Margine pianificato", eur(b.margPian) + ' <span class="faint">(' + (b.ricavo ? Math.round(b.margPian / b.ricavo * 100) : 0) + "%)</span>") +
      row2("<b>Margine atteso</b>", "<b>" + eur(b.margReale) + "</b>" + ' <span class="faint">(' + (b.ricavo ? Math.round(b.margReale / b.ricavo * 100) : 0) + "%)</span>") : "") +
    (k.pr_id ? row2("Provvigione PR", eur(c.prov)) : "") +
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
function vTask() {
  var list = ftask();
  var late = list.filter(function (t) { return t.stato !== "Fatto" && t.scadenza && t.scadenza < today(); });
  var h = head("Attività", list.filter(function (t) { return t.stato !== "Fatto"; }).length + " aperte · " + late.length + " scadute", '<button class="btn sm" data-new="task">+ Nuova attività</button>');
  h += '<div class="card">' + kanban(list) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Elenco</h2></div><table><thead><tr><th>Attività</th><th>Commessa</th><th>Assegnata a</th><th>Priorità</th><th>Scadenza</th><th>Stato</th><th></th></tr></thead><tbody>';
  list.slice().sort(function (a, b) { return (a.scadenza || "9") < (b.scadenza || "9") ? -1 : 1; }).forEach(function (t) {
    h += '<tr><td><button class="lnk" data-open-task="' + t.id + '">' + esc(t.titolo) + "</button></td><td>" + esc(t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") : "—") + "</td><td>" + esc(nameOf(D.pros, t.assegnato_id)) + '</td><td><span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita || "Media") + "</span></td><td>" + (t.scadenza && t.scadenza < today() && t.stato !== "Fatto" ? '<span class="badge b-red">' + dt(t.scadenza) + "</span>" : dt(t.scadenza)) + '</td><td><span class="badge ' + (t.stato === "Fatto" ? "b-green" : t.stato === "In corso" ? "b-terra" : "") + '">' + esc(t.stato) + '</span></td><td class="num">' + (t.stato !== "Fatto" ? '<button class="lnk" data-done="' + t.id + '">Segna fatto</button>' : "") + "</td></tr>";
  });
  return h + "</tbody></table></div>";
}

/* ---------------- ore ---------------- */
function tblOre(list) {
  if (!list.length) return vuoto("Nessuna ora registrata.", '<button class="lnk" data-new="ore">Registra le prime</button>');
  var h = '<table><thead><tr><th>Data</th><th>Chi</th><th>Commessa</th><th>Descrizione</th><th class="num">Ore</th><th class="num">Valore</th><th></th></tr></thead><tbody>';
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
  var h = head("Ore & timesheet", "Registro ore " + (persp === "me" ? "personali" : "dello studio"), '<button class="btn sm" data-new="ore">+ Registra ore</button>');
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
  var righeTs = D.com.filter(function (k) {
    return ["Preventivo", "Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1 || mieOre.some(function (o) { return o.commessa_id === k.id && gg.indexOf(o.data) > -1; });
  });
  function cella(kid, g) { return sum(mieOre.filter(function (o) { return o.commessa_id === kid && o.data === g; }), function (o) { return o.ore; }); }
  var titSett = lun.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + " → " + new Date(lun.getTime() + 6 * 86400000).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

  h += '<div class="card" style="margin-top:18px"><div class="cardhead"><h2>La mia settimana</h2><div class="wknav"><button class="btn sm ghost" data-wk="-1">‹</button><span class="faint">' + titSett + '</span><button class="btn sm ghost" data-wk="1">›</button>' + (WEEK ? '<button class="btn sm ghost" data-wk="0">Oggi</button>' : "") + "</div></div>";
  h += '<p class="faint" style="margin-bottom:12px">Scrivi le ore direttamente nelle caselle: si salvano da sole.</p>';
  h += '<div class="tswrap"><table class="ts"><thead><tr><th>Commessa</th>' + nomi.map(function (n, i) { return '<th class="num' + (gg[i] === today() ? " oggi" : "") + '">' + n + "</th>"; }).join("") + '<th class="num">Tot</th></tr></thead><tbody>';
  righeTs.forEach(function (k) {
    var tot = 0;
    h += "<tr><td>" + esc(k.titolo) + '<div class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + "</div></td>";
    gg.forEach(function (g) {
      var v = cella(k.id, g); tot += v;
      h += '<td class="num"><input class="tsc' + (g === today() ? " oggi" : "") + '" inputmode="decimal" data-ts="' + k.id + "|" + g + '" value="' + (v ? num(v, 1) : "") + '" placeholder="·"></td>';
    });
    h += '<td class="num tsr" data-tsrow="' + k.id + '">' + (tot ? num(tot, 1) : "—") + "</td></tr>";
  });
  h += '</tbody><tfoot><tr><td><b>Totale</b></td>' + gg.map(function (g) {
    var t2 = sum(mieOre.filter(function (o) { return o.data === g; }), function (o) { return o.ore; });
    return '<td class="num" data-tscol="' + g + '"><b>' + (t2 ? num(t2, 1) : "—") + "</b></td>";
  }).join("") + '<td class="num" id="tstot"><b>' + num(sum(mieOre.filter(function (o) { return gg.indexOf(o.data) > -1; }), function (o) { return o.ore; }), 1) + "</b></td></tr></tfoot></table></div></div>";

  h += '<div class="grid g32" style="margin-top:18px"><div class="card"><div class="cardhead"><h2>Ritmo delle ultime 12 settimane</h2><span class="faint">ogni quadratino è un giorno</span></div>' + heatOre(list) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Andamento</h2><span class="faint">8 settimane</span></div>' + spark(settimane(list, 8)) + "</div></div>";

  var per = {}; list.forEach(function (o) { if (o.commessa_id) per[o.commessa_id] = (per[o.commessa_id] || 0) + (+o.ore || 0); });
  var pk = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; });
  h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="cardhead"><h2>Ore per commessa</h2></div>';
  h += pk.length ? '<div class="bars">' + pk.slice(0, 8).map(function (id) { return bar(nameOf(D.com, id, "titolo"), per[id], per[pk[0]], num(per[id], 1) + " h"); }).join("") + "</div>" : vuoto("—");
  h += "</div>";
  var pp = {}; list.forEach(function (o) { if (o.pro_id) pp[o.pro_id] = (pp[o.pro_id] || 0) + (+o.ore || 0); });
  var ppk = Object.keys(pp).sort(function (a, b) { return pp[b] - pp[a]; });
  h += '<div class="card"><div class="cardhead"><h2>Ore per professionista</h2></div>';
  h += ppk.length ? '<div class="bars">' + ppk.map(function (id) { return bar(nameOf(D.pros, id), pp[id], pp[ppk[0]], num(pp[id], 1) + " h"); }).join("") + "</div>" : vuoto("—");
  h += "</div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Registrazioni</h2></div>' + tblOre(list.slice(0, 60)) + "</div>";
  return h;
}

/* ---------------- carico di lavoro ---------------- */
function vCarico() {
  var h = head("Carico di lavoro", "Solo le persone che lavorano sulle tue commesse");
  var rows = D.pros.filter(function (p) { return p.tipo !== "PR"; }).map(function (p) {
    var stim = 0;
    D.righe.forEach(function (r) {
      var s = by(D.serv, r.serv_id); var pid = r.assegnato_id || (s && s.pro_id);
      var k = by(D.com, r.commessa_id);
      if (pid === p.id && k && ["Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1) stim += (+r.ore_stimate || 0);
    });
    var fatte = sum(D.ore.filter(function (o) { return o.pro_id === p.id; }), function (o) { return o.ore; });
    var tk = D.task.filter(function (t) { return t.assegnato_id === p.id && t.stato !== "Fatto"; });
    var scadute = tk.filter(function (t) { return t.scadenza && t.scadenza < today(); });
    return { p: p, stim: stim, fatte: fatte, tk: tk.length, sc: scadute.length, residuo: Math.max(0, stim - fatte) };
  }).filter(function (r) { return r.stim || r.fatte || r.tk; }).sort(function (a, b) { return b.residuo - a.residuo; });
  var mx = Math.max.apply(null, rows.map(function (r) { return r.residuo; }).concat([1]));
  h += '<div class="card"><div class="cardhead"><h2>Ore residue stimate sulle commesse attive</h2></div><div class="bars">' +
    rows.map(function (r) { return bar(r.p.nome, r.residuo, mx, num(r.residuo, 0) + " h"); }).join("") + "</div></div>";
  h += '<div class="card"><table><thead><tr><th>Professionista</th><th>Ruolo</th><th class="num">Ore stimate</th><th class="num">Ore fatte</th><th class="num">Residuo</th><th class="num">Attività aperte</th><th class="num">Scadute</th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr><td><button class="lnk" data-open-pro="' + r.p.id + '">' + esc(r.p.nome) + "</button></td><td>" + esc(r.p.ruolo || "—") + '</td><td class="num">' + num(r.stim, 0) + '</td><td class="num">' + num(r.fatte, 1) + '</td><td class="num">' + num(r.residuo, 0) + '</td><td class="num">' + r.tk + '</td><td class="num">' + (r.sc ? '<span class="badge b-red">' + r.sc + "</span>" : "0") + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  return h;
}

/* ---------------- clienti ---------------- */
function vClienti() {
  var list = fcli();
  if (search) list = list.filter(function (c) { return (c.nome + " " + (c.settore || "")).toLowerCase().indexOf(search.toLowerCase()) > -1; });
  var h = head("Clienti", list.length + " clienti · " + eur(sum(list, function (c) { return valoreCliente(c.id); })) + " di valore",
    '<input id="search" placeholder="Cerca…" style="width:160px" value="' + esc(search) + '"><button class="btn sm" data-new="cli">+ Nuovo cliente</button>');
  h += '<div class="card">' + (list.length ? '<table><thead><tr><th>Cliente</th><th>Settore</th><th>Referente</th><th>Owner</th><th>Stato</th><th class="num">Commesse</th><th class="num">Valore</th></tr></thead><tbody>' +
    list.slice().sort(function (a, b) { return valoreCliente(b.id) - valoreCliente(a.id); }).map(function (c) {
      return '<tr><td><button class="lnk" data-open-cli="' + c.id + '">' + esc(c.nome) + "</button></td><td>" + esc(c.settore || "—") + "</td><td>" + esc(c.referente || "—") + "</td><td>" + esc(nameOf(D.pros, c.owner_id)) + '</td><td><span class="badge ' + (c.stato === "Attivo" ? "b-green" : c.stato === "Lead" ? "b-amber" : "") + '">' + esc(c.stato || "Lead") + '</span></td><td class="num">' + comOfCliente(c.id).length + '</td><td class="num">' + eur(valoreCliente(c.id)) + "</td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Nessun cliente.", '<button class="lnk" data-new="cli">Aggiungine uno</button>')) + "</div>";
  return h;
}
function vCliente() {
  var c = by(D.cli, current);
  if (!c) return '<div class="card">Cliente non trovato. <button class="lnk" data-go="clienti">Torna all\'elenco</button></div>';
  var com = comOfCliente(c.id);
  var inter = D.inter.filter(function (i) { return i.cliente_id === c.id; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  var pg = D.pag.filter(function (p) { return com.some(function (k) { return k.id === p.commessa_id; }); });
  var accesso = D.membri.filter(function (m) { return m.cliente_id === c.id; })[0];

  var h = '<div class="top"><h1>' + esc(c.nome) + '<span class="sub">' + esc(c.settore || "—") + " · " + esc(c.stato || "Lead") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="clienti">← Clienti</button>' +
    '<button class="btn sm ghost" data-edit="cli:' + c.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-new="inter" data-ctx-cli="' + c.id + '">+ Nota</button>' +
    '<button class="btn sm" data-new="com" data-ctx-cli="' + c.id + '">+ Commessa</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(valoreCliente(c.id)), "Valore totale", com.length + " commesse") +
    kpi(eur(sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; })), "Incassato", eur(sum(pg.filter(function (p) { return p.stato !== "Incassato"; }), function (p) { return p.importo; })) + " da incassare") +
    kpi(String(inter.length), "Interazioni", inter[0] ? "ultima " + dt(inter[0].data) : "—") +
    kpi(accesso ? "Sì" : "No", "Accesso al portale", accesso ? esc(accesso.email || "") : "nessun utente collegato") + "</div>";

  h += '<div class="grid g32" style="margin-top:16px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Commesse</h2></div>' + (com.length ? tblCom(com) : vuoto("Nessuna commessa.")) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Scadenze di pagamento</h2></div>' + (pg.length ? '<table><thead><tr><th>Voce</th><th>Commessa</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th></tr></thead><tbody>' +
    pg.slice().sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; }).map(function (p) {
      return "<tr><td>" + esc(p.nome) + "</td><td>" + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</td><td>" + dt(p.scadenza) + '</td><td class="num">' + eur(p.importo) + '</td><td><span class="badge ' + (p.stato === "Incassato" ? "b-green" : "b-amber") + '">' + esc(p.stato) + "</span></td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Nessuna scadenza.")) + "</div>";
  h += "</div><div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Anagrafica</h3><table><tbody>' +
    row2("Referente", esc(c.referente || "—")) +
    row2("Email", c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "—") +
    row2("Telefono", esc(c.telefono || "—")) +
    row2("Sito", c.sito ? '<a href="' + esc(c.sito) + '" target="_blank" rel="noopener">' + esc(c.sito) + "</a>" : "—") +
    row2("P. IVA", esc(c.piva || "—")) + row2("Indirizzo", esc(c.indirizzo || "—")) +
    row2("Owner", esc(nameOf(D.pros, c.owner_id))) + row2("Note", esc(c.note || "—")) + "</tbody></table></div>";
  h += '<div class="card"><div class="cardhead"><h2>Diario</h2><button class="btn sm ghost" data-new="inter" data-ctx-cli="' + c.id + '">+ Aggiungi</button></div>';
  h += inter.length ? '<ul class="timeline">' + inter.map(function (i) {
    return "<li><b>" + esc(i.tipo || "Nota") + "</b> · " + esc(i.testo || "") + '<div class="when">' + dt(i.data) + " · " + esc(nameOf(D.pros, i.pro_id)) + ' · <button class="lnk" data-del="inter:' + i.id + '">elimina</button></div></li>';
  }).join("") + "</ul>" : vuoto("Nessuna interazione registrata.");
  return h + "</div></div></div>";
}
/* ---------------- pool ---------------- */
function vPool() {
  var h = head("Pool professionisti", D.pros.length + " persone · " + D.pros.filter(function (p) { return p.vetting === "Attivo"; }).length + " attive",
    '<button class="btn sm" data-new="pros">+ Nuova persona</button>');
  h += '<div class="grid g3">';
  D.pros.forEach(function (p) {
    var srv = D.serv.filter(function (s) { return s.pro_id === p.id; });
    var ore = D.ore.filter(function (o) { return o.pro_id === p.id; });
    var com = D.com.filter(function (k) { return k.owner_id === p.id || k.pm_id === p.id || k.pr_id === p.id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return r.assegnato_id === p.id || (s && s.pro_id === p.id); }); });
    h += '<div class="card"><div class="cardhead"><h2>' + esc(p.nome) + '</h2><span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span></div>" +
      '<p class="muted" style="font-size:.88rem">' + esc(p.ruolo || "—") + ' <span class="badge">' + esc(p.tipo || "Professionista") + "</span></p>" +
      '<div style="margin:10px 0">' + (p.competenze || "").split(",").filter(Boolean).map(function (x) { return '<span class="chip">' + esc(x.trim()) + "</span>"; }).join("") + "</div>" +
      "<table><tbody>" + row2("Tariffa oraria", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") + row2("Servizi a listino", srv.length) + row2("Commesse", com.length) + row2("Ore registrate", num(sum(ore, function (o) { return o.ore; }), 1) + " h") + "</tbody></table>" +
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
  var h = '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + esc(p.ruolo || "—") + '</span></h1><div class="tools"><button class="btn sm ghost" data-go="pool">← Pool</button><button class="btn sm ghost" data-edit="pros:' + p.id + '">Modifica</button></div></div>';
  h += '<div class="grid g4">' +
    kpi(String(com.length), "Commesse", D.cli.filter(function (c) { return c.owner_id === p.id; }).length + " clienti propri") +
    kpi(num(sum(ore, function (o) { return o.ore; }), 1) + " h", "Ore registrate", ore.length + " registrazioni") +
    kpi(eur(sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); })), "Valore ore", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "tariffa non impostata") +
    kpi(String(tk.filter(function (t) { return t.stato !== "Fatto"; }).length), "Attività aperte", tk.length + " totali") + "</div>";
  h += '<div class="grid g32" style="margin-top:16px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Commesse</h2></div>' + (com.length ? tblCom(com) : vuoto("—")) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Servizi a listino</h2><button class="btn sm ghost" data-new="serv" data-ctx-pro="' + p.id + '">+ Servizio</button></div>' + tblServ(srv) + "</div>";
  h += "</div><div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Anagrafica</h3><table><tbody>' +
    row2("Tipo", esc(p.tipo || "Professionista")) +
    row2("Vetting", '<span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span>") +
    row2("Email", esc(p.email || "—")) + row2("Telefono", esc(p.telefono || "—")) + row2("Città", esc(p.citta || "—")) +
    row2("P. IVA", esc(p.piva || "—")) + row2("Tariffa oraria", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") +
    row2("Competenze", esc(p.competenze || "—")) + row2("Note", esc(p.note || "—")) + "</tbody></table></div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Ultime ore</h3>' + tblOre(ore.slice(0, 8)) + "</div>";
  return h + "</div></div>";
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
  var list = isPro() || persp === "me" ? D.serv.filter(function (s) { return s.pro_id === me.pro_id; }) : D.serv;
  var cats = {};
  list.forEach(function (s) { cats[s.cat || "Altro"] = (cats[s.cat || "Altro"] || []).concat([s]); });
  var h = head(isPro() ? "I miei servizi" : "Servizi & listino", list.length + " servizi", '<button class="btn sm" data-new="serv">+ Nuovo servizio</button>');
  Object.keys(cats).sort().forEach(function (c) {
    h += '<div class="card"><div class="cardhead"><h2>' + esc(c) + '</h2><span class="faint">' + cats[c].length + " servizi</span></div>" + tblServ(cats[c]) + "</div>";
  });
  if (!list.length) h += '<div class="card">' + vuoto("Nessun servizio a listino.", '<button class="lnk" data-new="serv">Crea il primo</button>') + "</div>";
  return h;
}

/* ---------------- fatturazione ---------------- */
function tblMov(list) {
  if (!list.length) return vuoto("Nessun movimento.", '<button class="lnk" data-new="mov">Registrane uno</button>');
  var h = '<table><thead><tr><th>Numero</th><th>Tipo</th><th>Cliente</th><th>Commessa</th><th>Emessa da</th><th>Data</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th><th></th></tr></thead><tbody>';
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
  var h = head(isPro() ? "Le mie fatture" : "Fatturazione", "Movimenti attivi e passivi", '<button class="btn sm" data-new="mov">+ Nuovo movimento</button>');
  h += '<div class="grid g4">' +
    kpi(eur(inc), "Incassato", att.filter(function (m) { return m.stato === "Pagata"; }).length + " fatture pagate") +
    kpi(eur(da), "Da incassare", att.filter(function (m) { return m.stato !== "Pagata"; }).length + " aperte") +
    kpi(eur(sum(scad, function (m) { return m.importo; })), "Scaduto", scad.length + " oltre la scadenza") +
    kpi(eur(sum(pas, function (m) { return m.importo; })), "Uscite", pas.length + " movimenti passivi") + "</div>";
  if (isAdmin()) {
    var perPro = {};
    att.forEach(function (m) { if (m.pro_id) perPro[m.pro_id] = (perPro[m.pro_id] || 0) + (+m.importo || 0); });
    var pk = Object.keys(perPro).sort(function (a, b) { return perPro[b] - perPro[a]; });
    if (pk.length) h += '<div class="card"><div class="cardhead"><h2>Chi fattura quanto</h2></div><div class="bars">' + pk.map(function (id) { return bar(nameOf(D.pros, id), perPro[id], perPro[pk[0]], eur(perPro[id])); }).join("") + "</div></div>";
  }
  h += '<div class="card"><div class="cardhead"><h2>Movimenti</h2></div>' + tblMov(list) + "</div>";
  return h;
}

/* ---------------- provvigioni ---------------- */
function vProvvigioni() {
  var list = D.com.filter(function (k) { return k.pr_id && (isAdmin() || k.pr_id === me.pro_id); });
  var maturate = list.filter(function (k) { return ["In corso", "Consegna", "Chiusa"].indexOf(k.stato) > -1; });
  var h = head("Provvigioni", isPR() ? "Le tue segnalazioni e quanto ti spetta" : "Provvigioni riconosciute ai PR",
    isAdmin() ? "" : '<button class="btn sm" data-new="com">+ Nuova segnalazione</button>');
  h += '<div class="grid g3">' +
    kpi(String(list.length), "Commesse con PR", maturate.length + " già partite") +
    kpi(eur(sum(list, function (k) { return calc(k).prov; })), "Totale potenziale", "se si chiude tutto") +
    kpi(eur(sum(maturate, function (k) { return calc(k).prov; })), "Maturato", "su commesse partite") + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Dettaglio</h2></div>' + (list.length ? '<table><thead><tr><th>Commessa</th><th>Cliente</th><th>PR</th><th>Stato</th><th class="num">Totale</th><th class="num">%</th><th class="num">Provvigione</th></tr></thead><tbody>' +
    list.map(function (k) {
      var c = calc(k);
      return '<tr><td><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button></td><td>" + esc(nameOf(D.cli, k.cliente_id)) + "</td><td>" + esc(nameOf(D.pros, k.pr_id)) + '</td><td><span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + '</span></td><td class="num">' + eur(c.tot) + '</td><td class="num">' + (k.provvigione || 0) + '%</td><td class="num">' + eur(c.prov) + "</td></tr>";
    }).join("") + "</tbody></table>" : vuoto("Nessuna commessa con provvigione PR.")) + "</div>";
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
  var h = head("Report", "Numeri e andamenti");
  h += '<div class="grid g4">' +
    kpi(conv + " %", "Conversione", vinte.length + " vinte / " + perse.length + " perse") +
    kpi(totOre ? Math.round(fattOre / totOre * 100) + " %" : "—", "Ore fatturabili", num(fattOre, 1) + " h su " + num(totOre, 1) + " h") +
    kpi(eur(com.length ? sum(com, function (k) { return calc(k).tot; }) / com.length : 0), "Valore medio commessa", com.length + " commesse") +
    kpi(eur(sum(com.filter(function (k) { return k.stato !== "Persa"; }), function (k) { return calc(k).margine; })), "Margine complessivo", "su commesse non perse") + "</div>";
  h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="cardhead"><h2>Fatturato per mese</h2></div>';
  h += mk.length ? '<div class="bars">' + mk.map(function (kk) { return bar(kk, mesi[kk], Math.max.apply(null, mk.map(function (x) { return mesi[x]; })), eur(mesi[kk])); }).join("") + "</div>" : vuoto("—");
  h += '</div><div class="card"><div class="cardhead"><h2>Top clienti</h2></div>';
  h += topCli.length ? '<div class="bars">' + topCli.map(function (c) { return bar(c.nome, valoreCliente(c.id), valoreCliente(topCli[0].id) || 1, eur(valoreCliente(c.id))); }).join("") + "</div>" : vuoto("—");
  h += "</div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Marginalità per commessa</h2></div><table><thead><tr><th>Commessa</th><th>Cliente</th><th class="num">Totale</th><th class="num">Costo</th><th class="num">Margine</th><th class="num">%</th><th class="num">Ore</th><th class="num">€/h reale</th></tr></thead><tbody>';
  com.slice().sort(function (a, b) { return calc(b).margine - calc(a).margine; }).forEach(function (k) {
    var c = calc(k), o = oreTot(k.id);
    h += '<tr><td><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button></td><td>" + esc(nameOf(D.cli, k.cliente_id)) + '</td><td class="num">' + eur(c.tot) + '</td><td class="num">' + eur(c.cost) + '</td><td class="num">' + eur(c.margine) + '</td><td class="num">' + (c.tot ? Math.round(c.margine / c.tot * 100) : 0) + '%</td><td class="num">' + num(o, 1) + '</td><td class="num">' + (o ? eur(c.tot / o) : "—") + "</td></tr>";
  });
  return h + "</tbody></table></div>";
}

/* ---------------- spazi ---------------- */
function vSpazi() {
  var h = head("Spazi & ufficio", "La base fisica dello studio — in arrivo",
    isAdmin() ? '<button class="btn sm ghost" data-new="spazi">+ Nuovo spazio</button><button class="btn sm" data-new="pren">+ Prenotazione</button>' : '<button class="btn sm" data-new="pren">+ Prenotazione</button>');
  h += '<div class="card" style="background:var(--cream);border-style:dashed"><h2>Coming soon</h2><p class="muted" style="margin-top:6px">La sede è in fase di ricerca. Qui gestirai postazioni, sale riunioni e spazi partner: la struttura è già pronta, si accende quando apriamo.</p></div>';
  h += '<div class="grid g3" style="margin-top:16px">';
  D.spazi.forEach(function (s) {
    var pr = D.pren.filter(function (p) { return p.spazio_id === s.id; });
    h += '<div class="card"><div class="cardhead"><h2>' + esc(s.nome) + '</h2><span class="badge ' + (s.stato === "Attivo" ? "b-green" : "b-amber") + '">' + esc(s.stato || "—") + "</span></div><table><tbody>" +
      row2("Indirizzo", esc(s.indirizzo || "—")) + row2("Tipo", esc(s.tipo || "—")) + row2("Opzioni", esc(s.opzioni || "—")) +
      row2("Costo", esc(s.costo || "—")) + row2("Capienza", s.capienza ? s.capienza + " postazioni" : "—") +
      row2("Partner", esc(s.partner || "interno")) + row2("Prenotazioni", pr.length) +
      "</tbody></table>" + (isAdmin() ? '<div style="margin-top:12px"><button class="btn sm ghost" data-edit="spazi:' + s.id + '">Modifica</button></div>' : "") + "</div>";
  });
  h += "</div>";
  var pren = D.pren.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  h += '<div class="card"><div class="cardhead"><h2>Prenotazioni</h2><button class="btn sm ghost" data-new="pren">+ Prenota</button></div>';
  h += pren.length ? '<table><thead><tr><th>Data</th><th>Spazio</th><th>Chi</th><th>Slot</th><th>Stato</th><th></th></tr></thead><tbody>' + pren.map(function (p) {
    return "<tr><td>" + dt(p.data) + "</td><td>" + esc(nameOf(D.spazi, p.spazio_id)) + "</td><td>" + esc(nameOf(D.pros, p.pro_id)) + "</td><td>" + esc(p.slot || "—") + '</td><td><span class="badge b-green">' + esc(p.stato || "—") + '</span></td><td class="num"><button class="lnk" data-del="pren:' + p.id + '">Annulla</button></td></tr>';
  }).join("") + "</tbody></table>" : vuoto("Nessuna prenotazione: si parte quando apriamo la sede.");
  return h + "</div>";
}

/* ---------------- impostazioni ---------------- */
function vSettings() {
  var h = head("Impostazioni", "Profilo, accessi e studio");
  h += '<div class="grid g2">';
  h += '<div class="card"><h2>Il mio profilo</h2>';
  if (me.pro_id) {
    var p = by(D.pros, me.pro_id);
    h += '<table style="margin-top:12px"><tbody>' + row2("Nome", esc(p ? p.nome : "—")) + row2("Ruolo", esc(p ? p.ruolo : "—")) + row2("Permessi", esc(RUOLO_ET[me.ruolo] || "—")) + row2("Tariffa oraria", p && p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") + "</tbody></table>" +
      '<div style="margin-top:12px"><button class="btn sm ghost" data-edit="pros:' + me.pro_id + '">Modifica anagrafica</button></div>';
  } else h += '<p class="muted" style="margin-top:10px">Il tuo utente non è collegato a nessuna scheda del pool. Chiedi alla regia di collegarlo.</p>';
  h += "</div>";
  h += '<div class="card"><h2>Chi vede cosa</h2><table style="margin-top:12px"><tbody>' +
    row2("Le tue commesse", "le vedi solo tu e chi ci lavora dentro") +
    row2("Le commesse degli altri", "non le vedi: nessuno vede quanto fattura un altro") +
    row2("Le tue fatture", "private, sempre e solo tue") +
    row2("Listino servizi", "condiviso fra i membri, serve per fare preventivi insieme") +
    row2("Numeri di studio", "solo aggregati e anonimi") +
    row2("Clienti", "vedi i tuoi e quelli delle commesse condivise") +
    '</tbody></table><p class="faint" style="margin-top:10px">Questi limiti sono applicati dal database, non dalla grafica: anche interrogando direttamente il sistema non si esce da quello che ti spetta.</p></div>';
  h += '<div class="card"><h2>Cambia password</h2><form data-form="password" style="margin-top:14px"><div class="field"><label>Nuova password</label><input name="pw" type="password" placeholder="almeno 8 caratteri" autocomplete="new-password" /></div><button class="btn" type="submit">Aggiorna password</button></form><p class="faint" style="margin-top:8px">Utente connesso: ' + esc(me.email) + "</p></div>";
  if (isAdmin()) {
    h += '<div class="card"><h2>Studio</h2><form data-form="settings" style="margin-top:14px"><div class="field"><label>Fee di coordinamento predefinita (%)</label><input name="fee_default" type="number" step="1" value="' + (SET.fee_default || 0) + '" /></div><button class="btn" type="submit">Salva</button></form></div>';
    h += '<div class="card"><div class="cardhead"><h2>Membri e accessi</h2><button class="btn sm ghost" data-new="membri">+ Collega utente</button></div>' +
      '<table><thead><tr><th>Email</th><th>Ruolo</th><th>Collegato a</th><th></th></tr></thead><tbody>' +
      D.membri.map(function (m) {
        return "<tr><td>" + esc(m.email || "—") + '</td><td><span class="badge">' + esc(RUOLO_ET[m.ruolo] || m.ruolo || "—") + "</span></td><td>" + esc(m.pro_id ? nameOf(D.pros, m.pro_id) : m.cliente_id ? nameOf(D.cli, m.cliente_id) : "—") + '</td><td class="num"><button class="lnk" data-edit="membri:' + m.user_id + '">Modifica</button></td></tr>';
      }).join("") + "</tbody></table>" +
      '<p class="faint" style="margin-top:10px">Per creare un nuovo accesso: Supabase → Authentication → Users → Add user (con Auto Confirm), poi copia lo <b>User UID</b> e collegalo qui scegliendo il ruolo.</p></div>';
  }
  return h + "</div>";
}
/* ---------------- progetti ---------------- */
function vProgetti() {
  var list = progVisibili();
  if (search) list = list.filter(function (p) { return (p.nome + " " + nameOf(D.com, p.commessa_id, "titolo")).toLowerCase().indexOf(search.toLowerCase()) > -1; });
  var h = head("Progetti", list.length + " progetti in cui sei dentro",
    '<input id="search" placeholder="Cerca…" style="width:170px" value="' + esc(search) + '"><button class="btn sm" data-new="prog">+ Nuovo progetto</button>');
  if (!list.length) return h + '<div class="card">' + vuoto("Nessun progetto: si creano dentro un preventivo.", '<button class="lnk" data-go="commesse">Vai ai preventivi</button>') + "</div>";
  h += '<div class="grid g3">';
  list.forEach(function (p) {
    var k = by(D.com, p.commessa_id), lv = lavOf(p.id);
    var ore = sum(oreOfProg(p.id), function (o) { return o.ore; });
    var stim = sum(lv, function (l) { return l.ore_stimate; });
    var tk = taskOfProg(p.id).filter(function (t) { return t.stato !== "Fatto"; });
    var av = avanzProg(p);
    h += '<div class="card pcard" data-open-prog="' + p.id + '">' +
      '<div class="cardhead"><h2>' + esc(p.nome) + '</h2><span class="badge ' + (p.stato === "Completato" ? "b-green" : p.stato === "In corso" ? "b-terra" : "") + '">' + esc(p.stato || "—") + "</span></div>" +
      '<p class="faint">' + esc(k ? nameOf(D.cli, k.cliente_id) : "—") + " · " + esc(k ? k.titolo : "") + "</p>" +
      '<div style="display:flex;align-items:center;gap:16px;margin:14px 0">' + ring(av, 58) +
      '<div style="flex:1"><div class="faint">' + lv.length + " lavorazioni · " + tk.length + " attività aperte</div>" +
      '<div class="faint">' + num(ore, 1) + " h su " + num(stim, 0) + " stimate</div>" +
      '<div style="margin-top:6px">' + avatars(lv.map(function (l) { return l.pro_id; }).filter(Boolean), 24) + "</div></div></div>" +
      '<div class="pfoot"><b>' + eur(valoreProg(p.id)) + "</b>" + (p.fine ? '<span class="faint">entro ' + dshort(p.fine) + "</span>" : "") + "</div></div>";
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

  var h = '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + esc(k ? nameOf(D.cli, k.cliente_id) : "—") + (k ? ' · <button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" : "") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="progetti">← Progetti</button>' +
    '<button class="btn sm ghost" data-edit="prog:' + p.id + '">Modifica</button>' +
    '<button class="btn sm" data-new="lav" data-ctx-prog="' + p.id + '">+ Lavorazione</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(av + " %", "Avanzamento", lv.filter(function (l) { return l.stato === "Completata"; }).length + " lavorazioni su " + lv.length) +
    kpi(num(oreT, 1) + " h", "Ore lavorate", stim ? "su " + num(stim, 0) + " h stimate" : "nessuna stima") +
    kpi(eur(valoreProg(p.id)), "Valore a preventivo", righeProg(p.id).length + " voci") +
    kpi(String(tk.filter(function (x) { return x.stato !== "Fatto"; }).length), "Attività aperte", p.visibile_cliente ? "visibile al cliente" : "non condiviso") + "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div><div class="card"><div class="tabs">' +
    [["lavorazioni", "Lavorazioni (" + lv.length + ")"], ["attivita", "Attività (" + tk.filter(function (x) { return x.stato !== "Fatto"; }).length + ")"], ["materiali", "Materiali (" + mt.length + ")"], ["note", "Note"]]
      .map(function (x) { return '<button data-tab="' + x[0] + '" class="' + (t === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>";

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
        '<form class="qadd" data-qadd-lav="' + l.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi un attività a questa lavorazione" autocomplete="off"></form>' +
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
  if (t === "note") {
    h += '<div class="cardhead"><h2>Note del progetto</h2><div style="display:flex;gap:8px;align-items:center"><span class="faint" id="notestat"></span><button class="btn sm ghost" data-notedit-p="' + (NOTEDIT ? "0" : "1") + '">' + (NOTEDIT ? "Anteprima" : "Scrivi") + "</button></div></div>";
    h += NOTEDIT
      ? '<textarea id="noteprog" class="doc" placeholder="Appunti condivisi con chi lavora su questo progetto">' + esc(p.note_doc || "") + "</textarea>"
      : ((p.note_doc && p.note_doc.trim()) ? md(p.note_doc) : vuoto("Nessuna nota su questo progetto.", '<button class="lnk" data-notedit-p="1">Scrivi</button>'));
  }
  h += "</div></div><div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Scheda</h3><table><tbody>' +
    row2("Cliente", esc(k ? nameOf(D.cli, k.cliente_id) : "—")) +
    row2("Preventivo", k ? '<button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" : "—") +
    row2("Chi lo segue", p.pro_id ? avatar(p.pro_id, 24) + " " + esc(nameOf(D.pros, p.pro_id)) : "—") +
    row2("Periodo", dt(p.inizio) + " → " + dt(p.fine)) +
    row2("Condivisione", '<button class="lnk" data-visprog="' + p.id + '">' + (p.visibile_cliente ? '<span class="badge b-blue">il cliente lo vede</span>' : '<span class="badge">interno</span>') + "</button>") +
    row2("Descrizione", esc(p.descrizione || "—")) + "</tbody></table></div>";

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
  var h = '<div class="top"><h1>' + esc(l.nome) + '<span class="sub">' + (p ? '<button class="lnk" data-open-prog="' + p.id + '">' + esc(p.nome) + "</button> · " : "") + esc(k ? nameOf(D.cli, k.cliente_id) : "") + '</span></h1><div class="tools">' +
    (p ? '<button class="btn sm ghost" data-open-prog="' + p.id + '">← Progetto</button>' : "") +
    '<button class="btn sm ghost" data-edit="lav:' + l.id + '">Modifica</button>' +
    (attiva ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(tm.iniziato) + "</span></button>" : '<button class="btn sm" data-tstart-lav="' + l.id + '">▶ Avvia timer</button>') +
    "</div></div>";
  h += '<div class="grid g4">' +
    kpi(num(ore, 1) + " h", "Ore registrate", l.ore_stimate ? "su " + num(l.ore_stimate, 0) + " stimate · " + perc + "%" : "nessuna stima") +
    kpi(String(lt.filter(function (x) { return x.stato !== "Fatto"; }).length), "Attività aperte", lt.length + " in totale") +
    kpi(esc(l.stato), "Stato", l.pro_id ? nameOf(D.pros, l.pro_id) : "—") +
    kpi(dt(l.fine), "Consegna", l.inizio ? "dal " + dt(l.inizio) : "") + "</div>";
  h += '<div class="grid g32" style="margin-top:18px"><div class="card"><div class="cardhead"><h2>Attività</h2><button class="btn sm ghost" data-new="task" data-ctx-lav="' + l.id + '">Nuova in dettaglio</button></div>' +
    '<div class="checklist">' + lt.filter(function (x) { return !x.padre_id; }).map(function (x) { return riga(x, lt); }).join("") +
    '<form class="qadd" data-qadd-lav="' + l.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi un attività e premi invio" autocomplete="off"></form></div></div>';
  h += '<div class="card"><div class="cardhead"><h2>Ore</h2><button class="btn sm ghost" data-new="ore" data-ctx-lav="' + l.id + '">+ Registra</button></div>' + tblOre(lo) + "</div></div>";
  return h;
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
  var r = await sb.rpc("portale_rispondi", { a: id, esito: esito, nota: nota });
  if (r.error) { toast(r.error.message, true); return; }
  PORT = r.data || PORT;
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
    (c.fee ? row2("Coordinamento Giraffa Studio (" + (k.fee || 0) + "%)", eur(c.fee)) : "") +
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
var PROS_PRO = function () { return D.pros.filter(function (p) { return p.tipo !== "PR"; }); };
var PROS_PR = function () { return D.pros.filter(function (p) { return p.tipo === "PR"; }); };

var FORMS = {
  com: { t: "Commessa", tb: "com", f: function (r) {
    return fld("titolo", "Titolo", "text", r.titolo, true) +
      '<div class="row2">' + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) + selField("stato", "Stato", sel(STATI, r.stato || "Bozza")) + "</div>" +
      '<div class="row2">' + selField("owner_id", "Owner (chi ha il rapporto)", opt(D.pros, r.owner_id || me.pro_id)) + selField("pm_id", "Regia / PM", opt(D.pros, r.pm_id)) + "</div>" +
      '<div class="row2">' + selField("pr_id", "PR che ha portato il cliente", opt(PROS_PR(), r.pr_id)) + fld("provvigione", "Provvigione PR (%)", "number", r.provvigione == null ? 0 : r.provvigione) + "</div>" +
      '<div class="row2">' + selField("modello", "Modello di fatturazione", sel(MODELLI, r.modello)) + fld("fee", "Fee coordinamento (%)", "number", r.fee == null ? SET.fee_default : r.fee) + "</div>" +
      '<div class="row2">' + selField("tipo_prezzo", "Tipo di commessa", sel(["Fisso", "Tempo e materiali", "Retainer"], r.tipo_prezzo || "Fisso")) + fld("budget_importo", "Budget concordato (€)", "number", r.budget_importo) + "</div>" +
      '<div class="row2">' + fld("retainer_mensile", "Retainer mensile (€, se ricorrente)", "number", r.retainer_mensile) + fld("budget_ore", "Budget ore", "number", r.budget_ore) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("scadenza", "Consegna prevista", "date", r.scadenza) + "</div>" +
      '<div class="row2">' + fld("sconto", "Sconto commerciale (%)", "number", r.sconto || 0) + fld("iva", "IVA (%)", "number", r.iva == null ? 22 : r.iva) + "</div>" +
      '<div class="row2">' + fld("validita", "Validità preventivo (giorni)", "number", r.validita == null ? 30 : r.validita) + fld("probabilita", "Probabilità di chiusura (%)", "number", r.probabilita == null ? 50 : r.probabilita) + "</div>" +
      fld("condizioni", "Condizioni e tempi (compaiono sul preventivo)", "textarea", r.condizioni) +
      fld("note", "Note interne", "textarea", r.note);
  }},
  vari: { t: "Variante", tb: "vari", f: function (r) {
    return fld("nome", "Cosa cambia", "text", r.nome, true) +
      selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + fld("importo", "Importo aggiuntivo (€)", "number", r.importo) + fld("ore", "Ore aggiuntive", "number", r.ore) + "</div>" +
      '<div class="row2">' + selField("stato", "Stato", sel(["Proposta", "Approvata", "Rifiutata"], r.stato || "Proposta")) + fld("data", "Data", "date", r.data || today()) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione);
  }},
  ev: { t: "Nota di diario", tb: "ev", f: function (r) {
    return selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) +
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
  pros: { t: "Persona del pool", tb: "pros", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      '<div class="row2">' + fld("ruolo", "Ruolo", "text", r.ruolo) + selField("tipo", "Tipo", sel(["Professionista", "PR"], r.tipo || "Professionista")) + "</div>" +
      '<div class="row2">' + selField("vetting", "Vetting", sel(["In valutazione", "Attivo", "Sospeso"], r.vetting || "In valutazione")) + fld("tariffa_oraria", "Tariffa oraria (€)", "number", r.tariffa_oraria) + "</div>" +
      fld("competenze", "Competenze (separate da virgola)", "text", r.competenze) +
      '<div class="row2">' + fld("email", "Email", "email", r.email) + fld("telefono", "Telefono", "text", r.telefono) + "</div>" +
      '<div class="row2">' + fld("citta", "Città", "text", r.citta) + fld("piva", "P. IVA", "text", r.piva) + "</div>" +
      fld("note", "Note", "textarea", r.note);
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
    return fld("titolo", "Titolo", "text", r.titolo, true) +
      '<div class="row2">' + selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) + selField("assegnato_id", "Assegnata a", opt(D.pros, r.assegnato_id || me.pro_id)) + "</div>" +
      '<div class="row2">' + selField("stato", "Stato", sel(TASK_STATI, r.stato || "Da fare")) + selField("priorita", "Priorità", sel(["Bassa", "Media", "Alta"], r.priorita || "Media")) + "</div>" +
      fld("scadenza", "Scadenza", "date", r.scadenza) + fld("note", "Note", "textarea", r.note);
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
      '<div class="row2">' + selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) + "</div>" +
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
      selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + selField("stato", "Stato", sel(FASE_STATI, r.stato || "Da iniziare")) + fld("avanzamento", "Avanzamento (%)", "number", r.avanzamento == null ? 0 : r.avanzamento) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("fine", "Fine", "date", r.fine) + "</div>" +
      '<div class="row2">' + fld("ordine", "Ordine", "number", r.ordine == null ? 1 : r.ordine) + selField("visibile_cliente", "Visibile al cliente", sel(["si", "no"], r.visibile_cliente === false ? "no" : "si")) + "</div>" +
      selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progOf(r.commessa_id || current).map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("")) +
      fld("note", "Note", "textarea", r.note);
  }},
  mat: { t: "Materiale", tb: "mat", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) + fld("url", "Link (Drive, Dropbox, WeTransfer…)", "text", r.url) +
      '<div class="row2">' + selField("tipo", "Tipo", sel(TIPI_MAT, r.tipo || "Materiale")) + selField("fase_id", "Fase", opt(fasiOf(r.commessa_id || current), r.fase_id)) + "</div>" +
      '<div class="row2">' + selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) + selField("visibile_cliente", "Visibile al cliente", sel(["no", "si"], r.visibile_cliente ? "si" : "no")) + "</div>" +
      selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progOf(r.commessa_id || current).map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("")) +
      fld("note", "Note per chi lavora", "textarea", r.note);
  }},
  pag: { t: "Scadenza di pagamento", tb: "pag", f: function (r) {
    return fld("nome", "Voce (es. Acconto 40%)", "text", r.nome, true) +
      selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) +
      '<div class="row2">' + fld("importo", "Importo (€)", "number", r.importo) + fld("scadenza", "Scadenza", "date", r.scadenza) + "</div>" +
      '<div class="row2">' + selField("stato", "Stato", sel(["Da incassare", "Incassato"], r.stato || "Da incassare")) + fld("pagato_il", "Incassato il", "date", r.pagato_il) + "</div>" +
      fld("note", "Note", "text", r.note);
  }},
  appr: { t: "Richiesta di approvazione", tb: "appr", f: function (r) {
    return selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) +
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
  membri: { t: "Accesso", tb: "membri", key: "user_id", f: function (r) {
    return fld("user_id", "User UID (da Supabase → Authentication)", "text", r.user_id, true) +
      fld("email", "Email", "email", r.email) +
      selField("ruolo", "Ruolo", selKV([["admin", "Regia (vede tutto)"], ["professionista", "Professionista"], ["pr", "PR"], ["cliente", "Cliente"]], r.ruolo || "professionista")) +
      '<div class="row2">' + selField("pro_id", "Scheda del pool (professionista o PR)", opt(D.pros, r.pro_id)) + selField("cliente_id", "Cliente (solo per ruolo Cliente)", opt(D.cli, r.cliente_id)) + "</div>";
  }}
};
function modal(html) { el("#modal").innerHTML = '<div class="modal">' + html + "</div>"; }
function openForm(entity, id, ctx) {
  var F = FORMS[entity]; if (!F) return;
  var key = F.key || "id";
  var r = id ? (D[F.tb].filter(function (x) { return x[key] === id; })[0] || {}) : (ctx || {});
  modal('<form class="box" data-save="' + entity + ':' + (id || "") + '"><h2>' + (id ? "Modifica" : "Nuovo") + " · " + F.t + "</h2>" + F.f(r) +
    '<div class="actions">' + (id ? '<button type="button" class="btn danger" data-del="' + entity + ":" + id + '">Elimina</button>' : "") +
    '<button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Salva</button></div></form>');
}
async function saveForm(f) {
  var parts = f.dataset.save.split(":"), entity = parts[0], id = parts[1];
  var F = FORMS[entity], key = F.key || "id", obj = {};
  Array.prototype.forEach.call(f.elements, function (i) {
    if (!i.name) return;
    var v = i.value;
    if (["fatturabile", "visibile_cliente"].indexOf(i.name) > -1) v = (v === "si");
    else if (v === "") v = null;
    else if (i.type === "number") v = +v;
    obj[i.name] = v;
  });
  if (entity === "ev" && !obj.pro_id) obj.pro_id = me.pro_id;
  var r = id ? await sb.from(TB[F.tb]).update(obj).eq(key, id) : await sb.from(TB[F.tb]).insert(obj);
  if (r.error) { toast(r.error.message, true); return; }
  if (obj.commessa_id && entity !== "ev") await logEv(obj.commessa_id, (id ? "Modificato" : "Aggiunto") + ": " + F.t.toLowerCase() + (obj.nome ? " — " + obj.nome : obj.titolo ? " — " + obj.titolo : ""));
  await reload([F.tb, "ev"]);
  closeModal(); toast(F.t + (id ? " aggiornato" : " creato")); render();
}
async function duplica(id) {
  var k = by(D.com, id); if (!k) return;
  var titolo = prompt("Titolo della nuova commessa", k.titolo + " (copia)");
  if (!titolo) return;
  var nuovo = { titolo: titolo, cliente_id: k.cliente_id, owner_id: me.pro_id || k.owner_id, pm_id: k.pm_id, stato: "Bozza", modello: k.modello, fee: k.fee, tipo_prezzo: k.tipo_prezzo, budget_ore: k.budget_ore, probabilita: 50, note: k.note, inizio: today() };
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
  await logEv(nid, "Commessa creata dal modello “" + k.titolo + "”");
  await reload(["com", "fasi", "righe", "ev"]);
  toast("Commessa duplicata"); go("commessa", nid, "fasi");
}
async function delRow(entity, id) {
  var F = FORMS[entity], tbk = F ? F.tb : entity, key = (F && F.key) || "id";
  if (!confirm("Eliminare definitivamente?")) return;
  var r = await sb.from(TB[tbk]).delete().eq(key, id);
  if (r.error) { toast(r.error.message, true); return; }
  await reload([tbk]); closeModal();
  if ((view === "commessa" && tbk === "com") || (view === "cliente" && tbk === "cli")) { go(tbk === "com" ? "commesse" : "clienti"); return; }
  toast("Eliminato"); render();
}
function openRiga(kid, rid) {
  var r = rid ? by(D.righe, rid) : {};
  var k = kid || r.commessa_id;
  var pg = progOf(k);
  modal('<form class="box wide" data-riga-save="' + k + ":" + (rid || "") + '"><h2>' + (rid ? "Modifica voce" : "Nuova voce di preventivo") + "</h2>" +
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
    '<p class="faint">Se prendi una voce dal listino i valori si compilano da soli, poi puoi cambiarli solo per questo preventivo.</p>' +
    '<div class="actions">' + (rid ? '<button type="button" class="btn danger" data-del="righe:' + rid + '">Elimina</button>' : "") +
    '<button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Salva</button></div></form>');
}

/* ---------------- ricerca rapida ⌘K ---------------- */
function openPalette() {
  if (isCliente()) return;
  PAL = [];
  D.com.forEach(function (k) { PAL.push({ t: k.titolo, s: "Commessa · " + nameOf(D.cli, k.cliente_id), i: "◧", go: ["commessa", k.id, "note"] }); });
  D.cli.forEach(function (c) { PAL.push({ t: c.nome, s: "Cliente", i: "◐", go: ["cliente", c.id] }); });
  D.pros.forEach(function (p) { PAL.push({ t: p.nome, s: (p.tipo === "PR" ? "PR" : "Professionista") + (p.ruolo ? " · " + p.ruolo : ""), i: "◍", go: ["pro", p.id] }); });
  navFor().forEach(function (n) { if (n.k) PAL.push({ t: n.t, s: "Vai a", i: "→", go: [n.k] }); });
  [["com", "Nuova commessa"], ["ore", "Registra ore"], ["task", "Nuova attività"], ["cli", "Nuovo cliente"], ["mov", "Nuovo movimento"]].forEach(function (a) {
    PAL.push({ t: a[1], s: "Azione", i: "+", act: a[0] });
  });
  modal('<div class="box pal"><input id="palq" placeholder="Cerca una commessa, un cliente, una persona… o un\'azione" autocomplete="off" spellcheck="false"><div id="palres"></div><div class="palfoot"><span><kbd>↑</kbd><kbd>↓</kbd> muoviti</span><span><kbd>↵</kbd> apri</span><span><kbd>esc</kbd> chiudi</span></div></div>');
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
  var V = { dash: vDash, commesse: vCommesse, commessa: vCommessa, progetti: vProgetti, progetto: vProgetto, lavorazione: vLavorazione, calendario: vCalendario, clienti: vClienti, cliente: vCliente, pool: vPool, pro: vPro, servizi: vServizi, task: vTask, ore: vOre, fatture: vFatture, provvigioni: vProvvigioni, report: vReport, carico: vCarico, spazi: vSpazi, impostazioni: vSettings };
  var f = V[view] || vDash;
  el("#main").innerHTML = f();
  var s = el("#search"); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
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
  if (d.tab) { tab = d.tab; render(); return; }
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
  if (d.openTask) { openForm("task", d.openTask); return; }
  if (d.apprSi) { await apprRispondi(d.apprSi, "Approvata"); return; }
  if (d.apprNo) { await apprRispondi(d.apprNo, "Modifiche richieste"); return; }
  if (d.new) {
    var ctx = {};
    if (d.ctx) ctx.commessa_id = d.ctx;
    if (d.ctxCli) ctx.cliente_id = d.ctxCli;
    if (d.ctxPro) ctx.pro_id = d.ctxPro;
    if (d.ctxProg) { ctx.progetto_id = d.ctxProg; var pk2 = by(D.prog, d.ctxProg); if (pk2) ctx.commessa_id = pk2.commessa_id; }
    if (d.ctxLav) { var lk = by(D.lav, d.ctxLav); if (lk) { ctx.lavorazione_id = lk.id; ctx.progetto_id = lk.progetto_id; ctx.commessa_id = lk.commessa_id; } }
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
    var st2 = tt.stato === "Fatto" ? "Da fare" : "Fatto";
    var rt = await sb.from("task").update({ stato: st2 }).eq("id", tt.id);
    if (rt.error) { toast(rt.error.message, true); return; }
    if (st2 === "Fatto" && tt.commessa_id) await logEv(tt.commessa_id, "Attività completata: " + tt.titolo);
    await reload(["task", "ev"]); render(); return;
  }
  if (d.sub) {
    var padre = by(D.task, d.sub); if (!padre) return;
    var tit = prompt("Sotto-attività di “" + padre.titolo + "”");
    if (!tit) return;
    var rs2 = await sb.from("task").insert({ titolo: tit, padre_id: padre.id, commessa_id: padre.commessa_id, assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rs2.error) { toast(rs2.error.message, true); return; }
    await reload(["task"]); render(); return;
  }
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
  if (d.tstart) {
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var r5 = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: d.tstart, iniziato: new Date().toISOString() });
    if (r5.error) { toast(r5.error.message, true); return; }
    await reload(["tmr"]); toast("Timer avviato"); render(); return;
  }
  if (d.tstop) { await stopTimer(); return; }
});

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
async function salvaTs(kid, data, val) {
  var righe = D.ore.filter(function (o) { return o.pro_id === me.pro_id && o.commessa_id === kid && o.data === data; });
  var v = Math.round((parseFloat(String(val).replace(",", ".")) || 0) * 10) / 10;
  if (v <= 0) { if (righe.length) await sb.from("ore").delete().in("id", righe.map(function (x) { return x.id; })); }
  else if (righe.length) {
    await sb.from("ore").update({ ore: v }).eq("id", righe[0].id);
    if (righe.length > 1) await sb.from("ore").delete().in("id", righe.slice(1).map(function (x) { return x.id; }));
  } else {
    var p = by(D.pros, me.pro_id);
    var r = await sb.from("ore").insert({ pro_id: me.pro_id, commessa_id: kid, data: data, ore: v, tariffa: p ? p.tariffa_oraria : 0, fatturabile: true, descrizione: "Timesheet" });
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
async function uploadFile(files, kid) {
  toast("Carico " + files.length + " file…");
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var path = kid + "/" + Date.now() + "-" + f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var up = await sb.storage.from("materiali").upload(path, f);
    if (up.error) { toast(up.error.message, true); continue; }
    var est = (f.name.split(".").pop() || "").toLowerCase();
    var tipo = ["jpg", "jpeg", "png", "gif", "webp", "heic"].indexOf(est) > -1 ? "Immagine" : ["pdf"].indexOf(est) > -1 ? "Documento" : ["mp4", "mov"].indexOf(est) > -1 ? "Video" : "File";
    await sb.from("materiali").insert({ commessa_id: kid, nome: f.name, path: path, dim: f.size, tipo: tipo, visibile_cliente: false, caricato_da: me.pro_id });
  }
  await logEv(kid, "Caricati file nei materiali");
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
    await reload(["righe"]); closeModal(); toast("Servizio salvato"); render(); return;
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
  if (e.target.id === "persp") { persp = e.target.value; if (["commessa", "cliente", "pro"].indexOf(view) > -1) view = "dash"; render(); }
});
document.addEventListener("input", function (e) {
  if (e.target.id === "search") { search = e.target.value; render(); }
  if (e.target.id === "palq") renderPal(e.target.value);
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
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) await uploadFile(e.dataTransfer.files, z.dataset.kid);
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

document.addEventListener("dragstart", function (e) {
  var t = e.target.closest && e.target.closest(".tsk");
  if (!t) return;
  DRAG = t.dataset.openTask; t.classList.add("dragging");
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", DRAG); } catch (x) {} }
});
document.addEventListener("dragend", function (e) {
  var t = e.target.closest && e.target.closest(".tsk"); if (t) t.classList.remove("dragging");
  Array.prototype.forEach.call(document.querySelectorAll(".kcol.over"), function (c) { c.classList.remove("over"); });
});
document.addEventListener("dragover", function (e) {
  var c = e.target.closest && e.target.closest(".kcol");
  if (!c || !DRAG) return;
  e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  c.classList.add("over");
});
document.addEventListener("dragleave", function (e) {
  var c = e.target.closest && e.target.closest(".kcol");
  if (c && !c.contains(e.relatedTarget)) c.classList.remove("over");
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
async function start() {
  var s = await sb.auth.getSession();
  if (!s.data.session) { show("login"); return; }
  user = s.data.session.user;
  await loadAll();
  view = isCliente() ? "progetti" : "dash";
  show("app"); render();
}
async function init() {
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { show("setup"); return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  el("#logout").addEventListener("click", async function () { await sb.auth.signOut(); location.reload(); });
  var ham = el("#ham"), scrim = el("#scrim");
  if (ham) ham.addEventListener("click", function () { document.body.classList.toggle("navopen"); });
  if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("navopen"); });
  await start();
}
init();
})();
