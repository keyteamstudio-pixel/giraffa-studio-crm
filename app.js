/* Giraffa Studio — CRM v3 (ruoli: admin · professionista · pr · cliente) */













(function () {
"use strict";

var cfg = window.GS_CONFIG || {};
/* la versione che sta girando: la stessa che c'è nel tag script di index.html */
var APPVER = (function () {
  var s = document.querySelector('script[src*="app.js"]');
  var m = s && s.getAttribute("src").match(/v=(\d+)/);
  return m ? "v" + m[1] : "v?";
})();
var sb = null, user = null;
var me = { pro_id: null, cliente_id: null, ruolo: "", nome: "", email: "", perm: { spazi: false, studio: false, accessi: false } };
var D = { pros: [], serv: [], cli: [], com: [], righe: [], spazi: [], task: [], ore: [], inter: [], pren: [], membri: [], fasi: [], mat: [], pag: [], appr: [], vari: [], ev: [], comm: [], tmr: [], prog: [], lav: [], priv: [], dip: [], viste: [], modelli: [], caltok: [], ana: [],
  prof: [], post: [], risp: [], reaz: [], ag: [], iscr: [], can: [], msg: [], lett: [], costi: [], mprev: [], inc: [], pcfg: [], gconn: [], impg: [], mconn: [] };
var CAL = 0;
var COMVISTA = "lista";
var PLINK = null;
var SET = { fee_default: 12 };
var TB = { pros: "professionisti", serv: "servizi", cli: "clienti", com: "commesse", righe: "righe", spazi: "spazi", task: "task", ore: "ore", inter: "interazioni", pren: "prenotazioni", membri: "membri", fasi: "fasi", mat: "materiali", pag: "pagamenti", appr: "approvazioni", vari: "varianti", ev: "eventi", comm: "commenti", tmr: "timer", prog: "progetti", lav: "lavorazioni", port: "portali", forn: "fornitori", priv: "pro_privato", dip: "task_dip", viste: "viste", modelli: "modelli", caltok: "cal_token", ana: "analisi", set: "settings",
  prof: "professioni", post: "post", risp: "post_risp", reaz: "post_reaz", ag: "agenda", iscr: "iscrizioni", can: "canali", msg: "messaggi", lett: "letture", costi: "costi", riu: "riunioni", rich: "richieste_sito", mprev: "modelli_prev", inc: "incarichi", pcfg: "prenota_cfg", gconn: "google_conn", impg: "impegni_google", mconn: "mail_conn" };

/* Alcune colonne non devono mai arrivare nel browser: dei portali si legge tutto tranne la password. */
var COLONNE = { port: "id,cliente_id,token,attivo,scadenza,ultimo_accesso,created_at,ha_pwd", gconn: "pro_id,email,scopes,created_at,updated_at,sync_at,errore", mconn: "pro_id,email,utente,imap_host,imap_port,smtp_host,smtp_port,cartella_inviati,created_at,updated_at,errore" };
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
/* La data è quella dell'orologio di chi guarda, non quella di Greenwich: alle 23
   a Verona è ancora oggi. */
function iso(d) { var m = d.getMonth() + 1, g = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (g < 10 ? "0" : "") + g; }
function isoUTC(d) { return d.toISOString().slice(0, 10); }
function today() { return iso(new Date()); }
function days(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }
function by(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
function nameOf(arr, id, f) { var o = by(arr, id); return o ? o[f || "nome"] : "—"; }
function sum(arr, f) { var t = 0; arr.forEach(function (x) { t += (+f(x) || 0); }); return t; }
function toast(msg, isErr) { var t = document.createElement("div"); t.className = "toast" + (isErr ? " err" : ""); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800); }
function show(id) { ["setup", "login", "app", "splash", "pub"].forEach(function (x) { var n = el("#" + x); if (n) n.classList.toggle("hide", x !== id); }); }
function closeModal() { el("#modal").innerHTML = ""; CHATOP = false; }

/* ---------------- percorsi (ogni pagina ha il suo indirizzo) ---------------- */
var ROUTING = false, FCTX = null, FDIRTY = false, FBACK = null;
function hashOf(v, id, t) { return "#/" + (v || "dash") + (id ? "/" + id : t ? "/-" : "") + (t ? "/" + t : ""); }
function inForm() { return view === "nuovo" || view === "mod"; }
function inFormNome(v) { return v === "nuovo" || v === "mod"; }
function go(v, id, t) {
  if (FDIRTY && inForm() && v !== view) {
    if (!confirm("Hai modifiche non salvate su questo modulo. Vuoi uscire senza salvare?")) return;
  }
  FDIRTY = false;
  if (v !== "task") PANEL = null;
  /* cambiare scheda dentro la stessa pagina non è cambiare pagina: niente salto
     in cima e niente voce in più nella cronologia */
  var stessa = v === view && (id || null) === current;
  view = v; current = id || null; tab = t || ""; search = "";
  document.body.classList.remove("navopen");
  if (!stessa) window.scrollTo(0, 0);
  ROUTING = true;
  try { if (stessa && history.replaceState) history.replaceState(null, "", hashOf(v, id, t)); else location.hash = hashOf(v, id, t); } catch (e) {}
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

/* Il preventivo ha quattro momenti e basta: lo scrivi, lo mandi, te lo accettano,
   lo chiudi. "Perso" non e' un quinto momento, e' la porta di servizio: serve
   perche' un preventivo rifiutato deve poter sparire dai conti aperti. */
var STATI = ["Bozza", "Inviato", "Accettato", "Completato", "Perso"];
var STATO_COL = { Bozza: "", Inviato: "b-amber", Accettato: "b-terra", Completato: "b-green", Perso: "b-red" };
var STATI_APERTI = ["Bozza", "Inviato"];              /* ancora da decidere */
var STATI_VINTI = ["Accettato", "Completato"];        /* il cliente ha detto si */
var STATI_CHIUSI = ["Completato", "Perso"];           /* non si muovono piu' */
var STATO_DATA = { Inviato: "inviato_il", Accettato: "accettato_il", Completato: "completato_il" };
var STATO_SPIEGA = {
  Bozza: "Lo stai ancora scrivendo. Non l'ha visto nessuno.",
  Inviato: "È uscito al cliente. Da qui si aspetta una risposta.",
  Accettato: "Il cliente ha detto sì: da qui nascono progetti e attività.",
  Completato: "Il lavoro è finito e consegnato.",
  Perso: "Il cliente ha detto no, o non ha più risposto."
};
var TASK_STATI = ["Da fare", "In corso", "In review", "Fatto"];
var FASE_STATI = ["Da iniziare", "In corso", "In attesa cliente", "Completata"];
var FASE_COL = { "Da iniziare": "", "In corso": "b-terra", "In attesa cliente": "b-amber", Completata: "b-green" };
var PRIO_COL = { Alta: "b-red", Media: "b-amber", Bassa: "" };
var MOV_COL = { Pagata: "b-green", Emessa: "b-blue", "Da emettere": "b-amber", Insoluta: "b-red" };
var APPR_COL = { Approvata: "b-green", "In attesa": "b-amber", "Modifiche richieste": "b-red" };
var TIPI_MAT = ["Cartella condivisa", "Brief", "Riferimenti", "Bozza", "Consegna", "Contratto", "Altro"];

/* ---------------- calcoli ---------------- */
function righeOf(k) { return D.righe.filter(function (r) { return r.commessa_id === k; }); }
function fasiOf(k) { return D.fasi.filter(function (f) { return f.commessa_id === k; }).sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); }); }
function matOf(k) { return D.mat.filter(function (m) { return m.commessa_id === k; }); }
function pagOf(k) { return D.pag.filter(function (p) { return p.commessa_id === k; }); }
function apprOf(k) { return D.appr.filter(function (a) { return a.commessa_id === k; }); }
function oreOf(k) { return D.ore.filter(function (o) { return o.commessa_id === k; }); }
function taskOf(k) { return D.task.filter(function (t) { return t.commessa_id === k; }); }
function oreTot(k) { return sum(oreOf(k), function (o) { return o.ore; }); }
function comOfCliente(c) { return D.com.filter(function (k) { return k.cliente_id === c; }); }
function variOf(k) { return D.vari.filter(function (v) { return v.commessa_id === k; }); }
function evOf(k) { return D.ev.filter(function (e) { return e.commessa_id === k; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }
/* Ogni nome che sta per una scheda si clicca e porta lì. Sempre. */
function lnkCli(id, cls) { return id ? '<button class="' + (cls || "lnk") + '" data-open-cli="' + id + '">' + esc(nameOf(D.cli, id)) + "</button>" : ""; }
function lnkCom(id, cls) { return id ? '<button class="' + (cls || "lnk") + '" data-open-com="' + id + '">' + esc(nameOf(D.com, id, "titolo")) + "</button>" : ""; }
function lnkProg(id, cls) { return id ? '<button class="' + (cls || "lnk") + '" data-open-prog="' + id + '">' + esc(nameOf(D.prog, id)) + "</button>" : ""; }
function lnkPro(id, cls) { return id ? '<button class="' + (cls || "lnk") + '" data-open-pro="' + id + '">' + esc(nameOf(D.pros, id)) + "</button>" : ""; }
/* Quello che il lavoro costa a chi lo fa: strumenti, abbonamenti, fornitori,
   budget pubblicitario. Un canone vale per tutti i suoi mesi. */
function costiOf(k) { return D.costi.filter(function (c) { return c.commessa_id === k; }); }
function costiProg(pid) { return D.costi.filter(function (c) { return c.progetto_id === pid; }); }
function costoVal(c) { return (+c.importo || 0) * (c.ricorrente ? Math.max(1, +c.cicli || 1) : 1); }
function costiTot(list) { return sum(list, costoVal); }
var TIPI_COSTO = ["Strumento", "Abbonamento", "Materiale", "Fornitore", "Advertising", "Altro"];
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
  /* i costi vivi del lavoro: quelli non ribaltati al cliente mangiano il margine */
  var costiVivi = costiTot(costiOf(k.id).filter(function (x) { return !x.ribaltato; }));
  /* le ore registrate valgono più del piano: se ho lavorato più del previsto, il costo reale lo dice */
  var costoOre = sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); });
  var costoReale = Math.max(c.cost, costoOre) + costiVivi;
  var margPian = ricavo - c.cost;
  var margReale = ricavo - costoReale;
  var burnOre = oreStim ? Math.round(oreFatte / oreStim * 100) : null;
  var burnCosto = ricavo ? Math.round(costoReale / ricavo * 100) : 0;
  return { ricavo: ricavo, extra: extra, oreStim: oreStim, oreFatte: oreFatte, costoPian: c.cost, costoReale: costoReale, costi: costiVivi, margPian: margPian, margReale: margReale, burnOre: burnOre, burnCosto: burnCosto, varianti: vApp.length };
}
function salute(k) {
  if (STATI_CHIUSI.concat(["Bozza"]).indexOf(k.stato) > -1) return { c: "", t: "—", d: "" };
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
/* Un grafico che si legge: scala a sinistra, settimane sotto, un punto per ogni
   valore e il numero che compare passandoci sopra. */
function graficoOre(vals, ette) {
  var w = 300, h = 96, pad = 6;
  var mx = Math.max.apply(null, vals.concat([1]));
  var passo = Math.pow(10, Math.floor(Math.log(mx) / Math.LN10));
  var tacca = Math.ceil(mx / passo / 2) * passo * 2 || 1;
  var step = vals.length > 1 ? w / (vals.length - 1) : w;
  var y = function (v) { return h - (v / tacca) * (h - pad * 2) - pad; };
  var pts = vals.map(function (v, i) { return (i * step).toFixed(1) + "," + y(v).toFixed(1); });
  var id = "go" + (++SPK);
  var g = '<div class="chart"><div class="cy"><span>' + num(tacca, tacca % 1 ? 1 : 0) + " h</span><span>" + num(tacca / 2, (tacca / 2) % 1 ? 1 : 0) + " h</span><span>0 h</span></div>" +
    '<div class="cplot"><svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--terra)" stop-opacity=".14"/><stop offset="100%" stop-color="var(--terra)" stop-opacity="0"/></linearGradient></defs>' +
    '<line class="gl" x1="0" y1="' + pad + '" x2="' + w + '" y2="' + pad + '"/>' +
    '<line class="gl" x1="0" y1="' + (h / 2) + '" x2="' + w + '" y2="' + (h / 2) + '"/>' +
    '<line class="gl" x1="0" y1="' + (h - pad) + '" x2="' + w + '" y2="' + (h - pad) + '"/>' +
    '<polygon points="0,' + h + " " + pts.join(" ") + " " + w + "," + h + '" fill="url(#' + id + ')"/>' +
    '<polyline points="' + pts.join(" ") + '" fill="none" stroke="var(--terra)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
    "</svg>" +
    '<div class="cpts">' + vals.map(function (v, i) {
      return '<span class="cpt' + (i === vals.length - 1 ? " ora" : "") + '" style="left:' + (i / Math.max(1, vals.length - 1) * 100) + "%;top:" + (y(v) / h * 100) + '%"><em>' +
        num(v, 1) + " h · " + esc(ette[i]) + "</em></span>";
    }).join("") + "</div></div>" +
    '<div class="cx">' + ette.map(function (e, i) {
      return i % 2 === 0 || i === ette.length - 1 ? "<span>" + esc(e) + "</span>" : "<span></span>";
    }).join("") + "</div></div>";
  return g;
}
function settimane(list, n, salta) {
  var out = [], oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  var off = (salta || 0) * 7 * 86400000;
  for (var w = n - 1; w >= 0; w--) {
    var b = new Date(oggi.getTime() - off - w * 7 * 86400000), a = new Date(b.getTime() - 6 * 86400000);
    var ai = iso(a), bi = iso(b);
    out.push(sum(list.filter(function (o) { return o.data >= ai && o.data <= bi; }), function (o) { return o.ore; }));
  }
  return out;
}
/* le etichette delle stesse settimane: il lunedì di ciascuna */
function ettSettimane(n) {
  var out = [], oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  for (var w = n - 1; w >= 0; w--) {
    var b = new Date(oggi.getTime() - w * 7 * 86400000), a = new Date(b.getTime() - 6 * 86400000);
    out.push(a.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }).replace(".", ""));
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
/* A che punto è un progetto lo dicono le cose fatte, non le ore: le attività
   chiuse su quelle aperte. Se non ha attività, vale quello che si è scritto
   a mano sulla scheda. */
function avanzProg(p) {
  if (p.stato === "Completato") return 100;
  var tk = taskOfProg(p.id).filter(function (t) { return !t.padre_id; });
  if (tk.length) {
    var fatte = tk.filter(function (t) { return t.stato === "Fatto"; }).length;
    var incorso = tk.filter(function (t) { return t.stato === "In corso"; }).length;
    return Math.round((fatte + incorso * 0.5) / tk.length * 100);
  }
  var lv = lavOf(p.id);
  if (!lv.length) return p.avanzamento || 0;
  var f2 = lv.filter(function (l) { return l.stato === "Completata"; }).length;
  var c2 = lv.filter(function (l) { return l.stato === "In corso"; }).length;
  return Math.round((f2 + c2 * 0.5) / lv.length * 100);
}
/* Un progetto sta su tre gambe possibili: un preventivo, un cliente, o nessuno
   dei due (lavoro dello studio). Il cliente si legge da lì, in quest'ordine. */
function cliDiProg(p) {
  if (!p) return "";
  var k = p.commessa_id ? by(D.com, p.commessa_id) : null;
  return (k && k.cliente_id) || p.cliente_id || "";
}
function progVisibili() {
  return D.prog.slice().sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); });
}
/* Tutto il lavoro di un cliente: quello nato dai suoi preventivi e quello
   attaccato a lui direttamente. */
function progOfCliente(cid) { return D.prog.filter(function (p) { return cliDiProg(p) === cid; }); }
/* Il prezzo appartiene alla riga, non al listino: quando la riga nasce il
   database ci copia dentro il prezzo di quel momento, e da lì non si muove
   più. Cambiare il listino non tocca i numeri di un lavoro già fatto. */
function rigaCalc(r) {
  var s = r.serv_id ? by(D.serv, r.serv_id) : null;
  var pu = +r.prezzo_unit || 0;
  var cu = +r.costo_unit || 0;
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
/* Una misura sola: le attività fatte dentro i progetti. Le fasi restano solo
   per chi le usa ancora e non ha progetti. */
function avanzamento(kid) {
  var k = by(D.com, kid);
  if (k && k.stato === "Completato") return 100;
  var pg = progOf(kid);
  if (pg.length) return Math.round(sum(pg, avanzProg) / pg.length);
  var f = fasiOf(kid); if (!f.length) return null;
  return Math.round(sum(f, function (x) { return x.avanzamento; }) / f.length);
}
function riuOf(kid) { return D.riu.filter(function (r) { return r.commessa_id === kid; }).sort(function (a, b) { return (a.data + (a.ora || "")) < (b.data + (b.ora || "")) ? 1 : -1; }); }
function matOfRiu(rid) { return D.mat.filter(function (m) { return m.riunione_id === rid; }); }
/* Gli errori del database in italiano, per chi non deve sapere cos'è un JWT. */
function erroreUmano(e) {
  var m = String((e && e.message) || e || "");
  var c = e && e.code;
  if (/Invalid login credentials/i.test(m)) return "Email o password sbagliate.";
  if (/Email not confirmed/i.test(m)) return "L'email non è ancora confermata: guarda la posta.";
  if (/JWT|expired|token/i.test(m)) return "La sessione è scaduta: ricarica la pagina e rientra.";
  if (/row-level security|permission denied|42501/i.test(m) || c === "42501") return "Non hai i permessi per questa modifica.";
  if (/progetti_uno_per_nome/.test(m)) return "In questo lavoro c'è già un progetto con lo stesso nome: dagliene uno diverso.";
  if (c === "23505" || /duplicate key/i.test(m)) return "Esiste già una voce uguale.";
  if (c === "23503" || /foreign key/i.test(m)) return "C'è qualcosa di collegato a questa voce: toglilo prima.";
  if (c === "23502" || /not-null|null value/i.test(m)) return "Manca un campo obbligatorio.";
  if (/invalid input syntax/i.test(m)) return "Un valore non è nel formato giusto: controlla numeri e date.";
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return "Non riesco a raggiungere il server: controlla la connessione e riprova.";
  if (/già prenotat/i.test(m)) return "Quello spazio è già prenotato in quel momento.";
  if (/does not exist|PGRST|schema cache/i.test(m)) return "Il CRM e il database non sono allineati: ricarica la pagina.";
  return m || "Qualcosa è andato storto.";
}
function femm(t) { var w = String(t || "").split(" ")[0]; return /[aà]$/.test(w) || /ione$/.test(w) || w === "Fase" || w === "Variante"; }
function dettoFatto(t, mod) {
  if (t === "Ore") return "Ore " + (mod ? "aggiornate" : "registrate");
  return t + (mod ? (femm(t) ? " aggiornata" : " aggiornato") : (femm(t) ? " creata" : " creato"));
}
/* Il valore di un preventivo è uno solo, ovunque: quanto vale il lavoro con le varianti approvate. */
function valore(k) { return budget(k).ricavo; }
function valoreCliente(c) { return sum(comOfCliente(c).filter(function (k) { return k.stato !== "Perso"; }), valore); }

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
  return true;
}
function fcom() { return D.com.filter(function (k) { return mio(k, "com"); }); }
function fcli() { return D.cli.filter(function (c) { return mio(c, "cli"); }); }
function fore() { return D.ore.filter(function (o) { return mio(o, "ore"); }); }
function ftask() { return D.task.filter(function (t) { return mio(t, "task"); }); }

/* ---------------- caricamento ---------------- */
async function loadAll() {
  me.email = user.email;
  var m = await sb.from("membri").select("*").eq("user_id", user.id).maybeSingle();
  if (m.error) toast("Non riesco a leggere il tuo profilo: " + erroreUmano(m.error), true);
  if (m.data) {
    me.ruolo = m.data.ruolo || "professionista"; me.pro_id = m.data.pro_id; me.cliente_id = m.data.cliente_id;
    me.perm = { spazi: !!m.data.perm_spazi, studio: !!m.data.perm_studio, accessi: !!m.data.perm_accessi };
  } else { me.ruolo = ""; me.perm = { spazi: false, studio: false, accessi: false }; }
  if (isCliente()) { var p = await sb.rpc("portale"); PORT = p.data || []; me.nome = "Area cliente"; return; }
  var keys = Object.keys(TB);
  var res = await Promise.all(keys.map(function (k) { return sb.from(TB[k]).select(COLONNE[k] || "*"); }));
  /* se una tabella non risponde lo devi sapere: dati vuoti e dati negati non sono
     la stessa cosa, e confonderli fa prendere decisioni sbagliate */
  var rotte = [];
  res.forEach(function (r, i) {
    if (r.error) rotte.push(TB[keys[i]]);
    D[keys[i]] = (r.error ? [] : (r.data || []));
  });
  if (rotte.length) toast("Non riesco a leggere: " + rotte.join(", ") + ". Quello che vedi è incompleto.", true);
  SET = D.set[0] || SET;
  var st = await sb.rpc("studio_stats");
  if (st.error) toast("Riepilogo dello studio non disponibile: " + erroreUmano(st.error), true);
  STATS = st.data || null;
  mieiDatiPersonali();
  var pr = me.pro_id ? by(D.pros, me.pro_id) : null;
  me.nome = pr ? pr.nome : user.email;
}
/* Dopo un salvataggio andato a buon fine la riga la aggiorno qui, in memoria,
   invece di riscaricare tutta la tabella: il database ha già la stessa cosa.
   Una modifica costa un viaggio solo, e lo schermo si rinfresca subito. */
function applicaLocale(tbk, id, patch) {
  var r = by(D[tbk] || [], id);
  if (!r) return false;
  Object.keys(patch).forEach(function (c) { r[c] = patch[c]; });
  return true;
}
/* Il modo di far sembrare veloce una cosa che veloce non è: scrivo subito sullo
   schermo e mando la modifica mentre tu continui a lavorare. Se il database
   dice di no, rimetto com'era e te lo dico. */
async function salvaSubito(tbk, id, patch) {
  var riga = by(D[tbk] || [], id), prima = {};
  if (riga) {
    Object.keys(patch).forEach(function (c) { prima[c] = riga[c]; });
    applicaLocale(tbk, id, patch);
    render();
  }
  var r = await sb.from(TB[tbk]).update(patch).eq("id", id);
  if (r.error) {
    if (riga) { applicaLocale(tbk, id, prima); render(); }
    toast(erroreUmano(r.error), true);
    return false;
  }
  if (!riga) await reload([tbk]);
  return true;
}
async function reload(keys) {
  await Promise.all(keys.map(async function (k) {
    var r = await sb.from(TB[k]).select(COLONNE[k] || "*"); if (!r.error) D[k] = r.data || [];
  }));
  if (keys.indexOf("pros") > -1 || keys.indexOf("priv") > -1) mieiDatiPersonali();
}
/* La tariffa oraria e le note personali vivono in una tabella che vede solo il proprietario.
   Le riattacco alla mia scheda così il resto dell'app le trova dove se le aspetta. */
function mieiDatiPersonali() {
  var pr = me.pro_id ? by(D.pros, me.pro_id) : null;
  var pv = (D.priv || []).filter(function (x) { return x.pro_id === me.pro_id; })[0];
  if (pr) {
    pr.tariffa_oraria = pv ? pv.tariffa_oraria : null;
    pr.note = pv ? pv.note : null;
    pr.iban = pv ? pv.iban : null;
    pr.condizioni = pv ? pv.condizioni : null;
    pr.logo = pv ? pv.logo : null;
    pr.firma = pv ? pv.firma : null;
  }
}

/* ---------------- nav ---------------- */
/* Il menu: quattro zone. I numeri contano solo cose che ti aspettano. */
/* Tre zone e basta: quello che fai oggi, i clienti, lo studio. Niente frasi di
   spiegazione sotto i titoli — un menu si legge, non si studia — ed etichette
   di una parola dove la parola basta. Quello che riguarda solo te (profilo,
   listino, impostazioni) sta sotto il tuo nome, in fondo, come in ogni app. */
/* Il menu si mette al passo di chi lo usa. La figura professionale dice quali
   parti del gestionale le servono davvero — un fotografo vive di progetti e
   materiali, un commercialista di calendario e scadenze — e quelle salgono in
   cima alla loro zona. Non sparisce niente: cambia solo l'ordine, perché un
   menu che nasconde le cose è un menu che si combatte. */
function navOrdina(v) {
  var f = miaFigura(), mod = f && f.moduli && f.moduli.length ? f.moduli : null;
  if (!mod) return v;
  var out = [], blocco = [];
  function scarica() {
    blocco.sort(function (a, b) {
      var ia = mod.indexOf(a.k), ib = mod.indexOf(b.k);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    out = out.concat(blocco); blocco = [];
  }
  v.forEach(function (n) { if (n.g) { scarica(); out.push(n); } else blocco.push(n); });
  scarica();
  return out;
}
function navFor() {
  return navOrdina([
    { g: "Lavoro" },
    { k: "dash", t: "Oggi", d: "Cosa guardare adesso", c: function () { return (D.rich || []).filter(function (r) { return r.stato === "Nuova"; }).length; } },
    { k: "calendario", t: "Calendario", d: "Scadenze e consegne sul mese" },
    { k: "riunioni", t: "Riunioni", d: "Videocall, appunti, decisioni", c: function () { return D.riu.filter(function (r) { return r.data >= today() && r.stato !== "Annullata"; }).length; } },
    { k: "progetti", t: "Progetti", d: "Progetti aperti in cui sei dentro", c: function () { return progVisibili().filter(function (p) { return p.stato !== "Completato" && p.stato !== "Sospeso"; }).length; } },
    { k: "task", t: "Attività", d: "Attività aperte assegnate a te", c: function () { return ftask().filter(function (t) { return t.stato !== "Fatto" && t.assegnato_id === me.pro_id; }).length; } },
    { k: "ore", t: "Ore", d: "La tua settimana, ora per ora" },
    { k: "carico", t: "Carico", d: "Quanto lavoro hai davanti" },
    { g: "Clienti" },
    { k: "clienti", t: "Clienti", d: "I tuoi clienti", c: function () { return fcli().length; } },
    { k: "posta", t: "Posta", d: "La tua Gmail, con i clienti accanto", c: function () { return GM.nonLetti || 0; } },
    { k: "commesse", t: "Preventivi", d: "I tuoi e quelli dello studio", c: function () { return fcom().filter(function (k) { return STATI_APERTI.indexOf(k.stato) > -1; }).length; } },
    { k: "amm", t: "Amministrazione", d: "Incassi, scadenze, preventivi in gioco" },
    { k: "report", t: "Report", d: "Numeri e andamenti" },
    { g: "Studio" },
    { k: "studio", t: "Bacheca", d: "Cosa succede nello studio", c: function () { return D.post.filter(function (p) { return p.fissato; }).length; } },
    { k: "eventi", t: "Eventi", d: "Workshop, riunioni, formazione", c: function () { return agendaFutura().length; } },
    { k: "chat", t: "Chat", d: "I canali dello studio", c: function () { return nonLettiTot(); } },
    { k: "pool", t: "Professionisti", d: "Chi c'è e cosa sa fare" },
    { k: "fornitori", t: "Fornitori", d: "La rubrica dello studio" },
    { k: "spazi", t: "Spazi", d: "Sale, postazioni e prenotazioni" }
  ]);
}
/* Le tue cose, dentro il menu del tuo nome. */
function navMio() {
  return [
    { k: "profilo", t: "Il mio profilo", d: "La tua scheda e quanto è completa" },
    { k: "servizi", t: "Il mio listino", d: "È così che i colleghi ti trovano", c: function () { return D.serv.filter(function (x) { return x.pro_id === me.pro_id; }).length; } },
    { k: "impostazioni", t: "Impostazioni", d: "Il tuo accesso e le regole" }
  ].concat(puoSistema() ? [{ k: "sistema", t: "Sistema", d: "Come sta il CRM, pezzo per pezzo" }] : []);
}
/* Le quattro zone si aprono e si chiudono. Quella dove stai lavorando resta sempre
   aperta, così non ti ritrovi mai davanti a un menu che non dice dove sei. */
var NAVAP = null;
function navAperti() {
  if (!NAVAP) { try { NAVAP = JSON.parse(localStorage.getItem("gs_nav") || "{}"); } catch (e) { NAVAP = {}; } }
  return NAVAP;
}
function navToggle(g) {
  var a = navAperti();
  a[g] = a[g] === false;
  try { localStorage.setItem("gs_nav", JSON.stringify(a)); } catch (e) { }
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
  var h = "", cur = { commessa: "commesse", cliente: "clienti", pro: "pool", progetto: "progetti", lavorazione: "progetti", attivita: "task", riga: "commesse", documento: "commesse", importa: "commesse", professioni: "profilo", riunione: "riunioni" }[vv] || vv;
  h += '<button class="cerca" data-pal="1" title="Cerca ovunque (⌘K)"><span>Cerca o esegui un\'azione…</span><kbd>⌘K</kbd></button>';
  h += '<button class="cerca chiedi" data-chiedi="1" title="Fai una domanda sui tuoi dati"><span>Chiedi…</span></button>';
  var ap = navAperti(), qui = gruppoDi(cur), gr = null, gsub = "", buf = "";
  var zona = 0;
  function chiudiZona() {
    if (gr === null) return;
    var aperta = ap[gr] !== false || gr === qui;
    var pri = zona++ === 0 ? " pri" : "";
    h += '<button class="navtit' + pri + (aperta ? " ap" : "") + '" data-navg="' + esc(gr) + '"' +
      ' aria-expanded="' + (aperta ? "true" : "false") + '"><span>' + esc(gr) + "</span>" +
      '<em class="chev"></em></button>' +
      '<div class="navsec' + pri + (aperta ? "" : " chiusa") + '">' + buf + "</div>";
    buf = "";
  }
  navFor().forEach(function (n) {
    if (n.g) { chiudiZona(); gr = n.g; gsub = n.n || ""; return; }
    var c = n.c ? n.c() : null;
    buf += '<button data-go="' + n.k + '" class="' + (cur === n.k ? "on" : "") + (c ? " conta" : "") + '" title="' + esc(n.d || n.t) + '"><span class="nt">' + esc(n.t) + "</span>" +
      (c ? '<span class="cnt">' + c + "</span>" : "") + "</button>";
  });
  chiudiZona();
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
  var ruoloEt = puoSistema() ? "Amministratore" : (RUOLO_ET[me.ruolo] || "Professionista");
  el("#mename").innerHTML = (me.pro_id ? avatar(me.pro_id, 30) : "") +
    '<span class="mnome"><span>' + esc(me.nome) + '</span><span class="mruolo">' + esc(ruoloEt) + "</span></span>";
  var mio = navMio(), suMe = mio.some(function (x) { return x.k === cur; });
  el("#mebtn").className = "mebtn" + (suMe ? " on" : "");
  el("#memenu").innerHTML =
    '<div class="meinfo">' + esc(me.email) + (permEt() ? '<span class="cura">' + esc(permEt()) + "</span>" : "") + "</div>" +
    mio.map(function (x) {
      var c = x.c ? x.c() : null;
      return '<button data-go="' + x.k + '" class="' + (cur === x.k ? "on" : "") + '" title="' + esc(x.d || x.t) + '"><span class="nt">' + esc(x.t) + "</span>" +
        (c ? '<span class="cnt">' + c + "</span>" : "") + "</button>";
    }).join("") +
    '<button data-esci="1" class="meesci"><span class="nt">Esci</span></button>';
}
/* il menu del proprio nome si apre e si chiude, e si chiude da solo se clicchi altrove */
/* Il menu si riduce a una striscia di icone e si riallarga; la scelta resta. */
function navMini(v) {
  var ora = v === undefined ? !document.body.classList.contains("navmini") : !!v;
  document.body.classList.toggle("navmini", ora);
  try { localStorage.setItem("gs_mini", ora ? "1" : "0"); } catch (e) { }
  var b = el("#sidetog"); if (b) b.title = ora ? "Allarga il menu" : "Riduci il menu";
}
function meMenu(apri) {
  var m = el("#memenu"), b = el("#mebtn");
  if (!m || !b) return;
  var ora = apri === undefined ? m.classList.contains("chiusa") : apri;
  m.classList.toggle("chiusa", !ora);
  b.setAttribute("aria-expanded", ora ? "true" : "false");
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
  var m = navMio();
  for (var j = 0; j < m.length; j++) if (m[j].k === v) return "Profilo";
  if (v === "professioni") return "Profilo";
  return "";
}
function etichettaDi(v) {
  var n = navFor().concat(navMio());
  for (var i = 0; i < n.length; i++) if (n[i].k === v) return n[i].t;
  return "";
}
/* ---- barra unica di viste e filtri, uguale in tutte le sezioni ---- */
var FS = {
  com: { stato: "", salute: "", cli: "", cerca: "" },
  prog: { stato: "", cli: "", pro: "", cerca: "" },
  cli: { stato: "", owner: "", cerca: "" },
  serv: { cat: "", chi: "", cerca: "" },
  prof: { cat: "", cerca: "" },
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
      return '<button data-route="' + esc(rotta + "|-|" + v[0]) + '" class="' + (attiva === v[0] ? "on" : "") + '">' + esc(v[1]) +
        (v[2] != null ? '<span class="cnt">' + v[2] + "</span>" : "") + "</button>";
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
  fcli().filter(function (c) { return c.richiamo && c.richiamo <= today() && c.stato !== "Chiuso"; }).forEach(function (c) {
    f.push({ p: 2, c: "b-amber", t: "Risentire " + c.nome, s: (c.richiamo_nota ? c.richiamo_nota + " · " : "") + (c.richiamo < today() ? "era per il " + dt(c.richiamo) : "oggi"), cli: c.id });
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
  /* un promemoria, non un cartellone: una riga sola */
  return '<div class="avviso"><span class="avico"></span><span class="avtxt"><b>Completa il tuo profilo</b>' +
    '<span>Manca ancora: ' + esc(mancano.join(", ")) + ". Serve per calcolare i compensi e per farti trovare dai colleghi." +
    (mancano.indexOf("i tuoi servizi nel listino") > -1 ? ' <button class="lnk" data-go="servizi">Aggiungi un servizio</button>' : "") + "</span></span>" +
    '<button class="btn sm ghost" data-edit="pros:' + p.id + '">Apri il profilo</button></div>';
}
/* ---------------- suggerimenti sul posto ----------------
   Il CRM guarda i dati e si accorge di quello che manca: te lo propone con un
   sì e un no, e non fa mai niente da solo. Se dici no, non te lo richiede più. */
var PROPNO = null;
function propScartate() {
  if (!PROPNO) { try { PROPNO = JSON.parse(localStorage.getItem("gs_prop") || "{}"); } catch (e) { PROPNO = {}; } }
  return PROPNO;
}
function propScarta(id) {
  var s = propScartate(); s[id] = 1;
  try { localStorage.setItem("gs_prop", JSON.stringify(s)); } catch (e) { }
}
function propRipristina() {
  PROPNO = {}; try { localStorage.removeItem("gs_prop"); } catch (e) { }
}
/* dove: "dash" per tutte, oppure l'id di una commessa per quelle sue */
function proposte(dove) {
  var no = propScartate(), out = [];
  function agg(p) { if (!no[p.id]) out.push(p); }
  var com = fcom().filter(function (k) { return dove === "dash" || k.id === dove; });

  com.forEach(function (k) {
    var c = calc(k), nome = k.titolo || "senza titolo";
    /* un lavoro approvato senza scadenze di pagamento è un lavoro che non sai quando incassi */
    if (["Accettato"].indexOf(k.stato) > -1 && c.tot > 0 && !pagOf(k.id).length) {
      agg({ id: "pag50-" + k.id, ico: "€", t: "«" + nome + "» vale " + eur(c.tot) + " e non ha nessuna scadenza di pagamento.",
        s: "Posso creare due scadenze da metà: una alla firma, una alla consegna.", si: "Crea le due scadenze", az: "pag50|" + k.id });
    }
    /* un preventivo scaduto continua a stare in pipeline e falsa i conti */
    if (k.stato === "Inviato") {
      var gg = k.validita == null ? 30 : +k.validita;
      var fine = new Date(dataDoc(k)); fine.setDate(fine.getDate() + gg);
      if (days(today(), iso(fine)) > 0) {
        agg({ id: "scad-" + k.id + "-" + iso(fine), ico: "!", t: "«" + nome + "» è scaduto il " + dt(iso(fine)) + ".",
          s: "Finché resta in stato Preventivo continua a contare nella pipeline.", si: "Rinnovalo da oggi", az: "rinnova|" + k.id });
      }
    }
    /* i prezzi che non tornano col tuo listino: o è uno sconto voluto, o è una svista */
    righeOf(k.id).forEach(function (r) {
      if (!r.nome || r.prezzo_unit == null) return;
      var chiave = String(r.nome).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (chiave.length < 6) return;
      var s = D.serv.filter(function (x) {
        return x.pro_id === me.pro_id && String(x.nome || "").toLowerCase().replace(/[^a-z0-9]/g, "") === chiave;
      })[0];
      if (!s || s.prezzo == null || Math.abs(+s.prezzo - +r.prezzo_unit) < 0.01) return;
      agg({ id: "listino-" + r.id + "-" + s.prezzo, ico: "≠", t: "Nel tuo listino «" + s.nome + "» sta a " + eur(s.prezzo) + ", in «" + nome + "» l'hai messo a " + eur(r.prezzo_unit) + ".",
        s: "Se è uno sconto voluto va benissimo, dimmi solo di no.", si: "Allinea al listino", az: "allinea|" + r.id + "|" + s.prezzo });
    });
    /* lavoro in corso su cui non segni ore: o è fermo, o le ore le stai perdendo */
    if (["Accettato"].indexOf(k.stato) > -1) {
      var mie = fore().filter(function (o) { return o.commessa_id === k.id; }).map(function (o) { return o.data; }).sort();
      var ultima = mie[mie.length - 1];
      var quanti = ultima ? days(today(), ultima) : days(today(), (k.created_at || today()).slice(0, 10));
      if (quanti >= 21) {
        agg({ id: "ore-" + k.id + "-" + (ultima || "mai"), ico: "◷", t: "Su «" + nome + "» " + (ultima ? "non registri ore da " + quanti + " giorni." : "non hai mai registrato ore."),
          s: "O il lavoro è fermo, o quelle ore le stai regalando.", si: "Apri le ore", az: "vai|ore||" });
      }
    }
  });

  /* le scadenze già passate e non incassate */
  D.pag.filter(function (p) { return p.stato === "Da incassare" && p.scadenza && p.scadenza < today(); })
    .forEach(function (p) {
      var k = by(D.com, p.commessa_id); if (!k || (dove !== "dash" && k.id !== dove)) return;
      agg({ id: "scaduto-" + p.id, ico: "€", t: "«" + esc0(p.nome) + "» di " + eur(p.importo) + " era scaduto il " + dt(p.scadenza) + ".",
        s: nameOf(D.cli, k.cliente_id) + " · " + (k.titolo || ""), si: "Apri i pagamenti", az: "vai|commessa|" + k.id + "|pagamenti" });
    });

  /* clienti a cui manca quello che serve per lavorarci davvero */
  if (dove === "dash") {
    fcli().forEach(function (c) {
      var suoi = fcom().filter(function (k) { return k.cliente_id === c.id; });
      if (!suoi.length) return;
      if (!c.email) {
        agg({ id: "mail-" + c.id, ico: "@", t: "Di " + esc0(c.nome) + " non hai l'email.",
          s: "Senza non gli mandi il preventivo né gli apri il portale.", si: "Apri la scheda", az: "vai|cliente|" + c.id + "|anagrafica" });
      }
      if (!c.piva && suoi.some(function (k) { return STATI_VINTI.indexOf(k.stato) > -1; })) {
        agg({ id: "piva-" + c.id, ico: "#", t: "Per fatturare a " + esc0(c.nome) + " ti serve la partita IVA.",
          s: "Il lavoro è già partito e in anagrafica non c'è.", si: "Apri la scheda", az: "vai|cliente|" + c.id + "|anagrafica" });
      }
    });
  }
  return out;
}
function esc0(s) { return String(s == null ? "" : s); }
/* Le richieste arrivate dal sito: un cliente che vuole un preventivo, un
   professionista che vuole entrare. Da qui diventano un cliente o una scheda. */
function cardRichieste() {
  var nuove = (D.rich || []).filter(function (r) { return r.stato === "Nuova"; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
  if (!nuove.length) return "";
  var h = '<div class="card" style="border-color:var(--terra)"><div class="cardhead"><h2>Richieste dal sito</h2><span class="badge b-amber">' + nuove.length + (nuove.length === 1 ? " nuova" : " nuove") + "</span></div>";
  h += nuove.map(function (r) {
    var tipo = r.tipo === "candidatura" ? "Vuole entrare nello studio" : r.tipo === "preventivo" ? "Chiede un preventivo" : "Scrive";
    var chi = esc(r.nome) + (r.azienda ? " · " + esc(r.azienda) : "") + (r.mestiere ? " · " + esc(r.mestiere) : "") + (r.citta ? " · " + esc(r.citta) : "");
    var contatti = '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + "</a>" + (r.telefono ? ' · <a href="tel:' + esc(String(r.telefono).replace(/\s+/g, "")) + '">' + esc(r.telefono) + "</a>" : "") + (r.portfolio ? ' · <a href="' + esc(r.portfolio) + '" target="_blank" rel="noopener">il suo lavoro</a>' : "");
    return '<div class="rich"><div class="richtop"><b>' + tipo + "</b><span class=\"faint\">" + dt(String(r.created_at).slice(0, 10)) + "</span></div>" +
      "<div>" + chi + "</div><div class=\"faint\">" + contatti + "</div>" +
      (r.messaggio ? '<p class="richmsg">' + esc(r.messaggio) + "</p>" : "") +
      '<div class="richaz">' + (r.tipo === "candidatura"
        ? (puo("accessi") ? '<button class="btn sm" data-rich-pro="' + r.id + '">Crea la scheda nello studio</button>' : "")
        : '<button class="btn sm" data-rich-cli="' + r.id + '">Crea il cliente</button>') +
      '<a class="btn sm ghost" href="mailto:' + esc(r.email) + '?subject=' + encodeURIComponent("Re: la tua richiesta a Giraffa Studio") + '">Rispondi</a>' +
      '<button class="lnk mini" data-rich-ok="' + r.id + '">Segna come gestita</button></div></div>';
  }).join("");
  return h + "</div>";
}
function cardProposte(dove) {
  var p = proposte(dove);
  if (!p.length) return "";
  return '<div class="card prop"><div class="cardhead"><h2>Ti propongo</h2>' +
    '<span class="badge b-amber">' + p.length + (p.length === 1 ? " cosa" : " cose") + "</span></div>" +
    p.slice(0, 6).map(function (x) {
      return '<div class="propr"><span class="propi">' + esc(x.ico) + "</span>" +
        '<span class="propt"><b>' + esc(x.t) + '</b><span class="faint">' + esc(x.s) + "</span></span>" +
        '<span class="propa"><button class="lnk" data-prop-no="' + esc(x.id) + '">No</button>' +
        '<button class="btn sm" data-prop-si="' + esc(x.az) + '" data-prop-id="' + esc(x.id) + '">' + esc(x.si) + "</button></span></div>";
    }).join("") + "</div>";
}
async function faiProposta(az, id) {
  var p = String(az).split("|");
  if (p[0] === "vai") { go(p[1], p[2] || null, p[3] || ""); return; }
  if (p[0] === "pag50") {
    var k = by(D.com, p[1]); if (!k) return;
    var tot = calc(k).tot, meta = Math.round(tot * 100 / 2) / 100;
    var r = await sb.from("pagamenti").insert([
      { commessa_id: k.id, nome: "Acconto 50% alla firma", importo: meta, stato: "Da incassare" },
      { commessa_id: k.id, nome: "Saldo 50% alla consegna", importo: Math.round((tot - meta) * 100) / 100, stato: "Da incassare" }
    ]);
    if (r.error) { toast(erroreUmano(r.error), true); return; }
    await reload(["pag"]); propScarta(id); toast("Due scadenze create"); render(); return;
  }
  if (p[0] === "rinnova") {
    var r2 = await sb.from("commesse").update({ data: today() }).eq("id", p[1]);
    if (r2.error) { toast(erroreUmano(r2.error), true); return; }
    await reload(["com"]); toast("Preventivo rinnovato da oggi"); render(); return;
  }
  if (p[0] === "allinea") {
    var r3 = await sb.from("righe").update({ prezzo_unit: +p[2] }).eq("id", p[1]);
    if (r3.error) { toast(erroreUmano(r3.error), true); return; }
    await reload(["righe"]); propScarta(id); toast("Prezzo allineato al listino"); render(); return;
  }
}
function vDash() {
  var com = fcom(), cli = fcli(), ore = fore(), tk = ftask();
  var aperte = com.filter(function (k) { return ["Inviato", "Accettato"].indexOf(k.stato) > -1; });
  var pipeline = sum(aperte, valore);
  var d = new Date(), m0 = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  var oreMese = ore.filter(function (o) { return o.data >= m0; });
  var urgenti = tk.filter(function (t) { return t.stato !== "Fatto" && t.scadenza && days(t.scadenza, today()) <= 7; }).sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; });
  var attesa = D.appr.filter(function (a) { return a.stato === "In attesa"; });
  var pagAperti = D.pag.filter(function (p) { return p.stato === "Da incassare"; });
  var scaduti = pagAperti.filter(function (p) { return p.scadenza && p.scadenza < today(); });

  var attive = com.filter(function (k) { return ["Accettato"].indexOf(k.stato) > -1; });
  var avgAv = attive.length ? Math.round(sum(attive, function (k) { return avanzamento(k.id) || 0; }) / attive.length) : 0;
  var wk = settimane(ore, 8), foc = focusItems(com, tk);
  var oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  var h = bannerProfilo() + '<div class="top"><h1>Ciao ' + esc((me.nome || "").split(" ")[0]) + '<span class="sub">' + esc(oggi.charAt(0).toUpperCase() + oggi.slice(1)) + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-pal="1">⌘K  Cerca</button>' +
    '<button class="btn sm" data-new="com">+ Nuovo preventivo</button>' + '<button class="btn sm ghost" data-new="ore">+ Registra ore</button>' + "</div></div>";

  h += cardRichieste();
  h += cardProposte("dash");
  h += '<div class="grid g32">';
  h += '<div class="card"><div class="cardhead"><h2>Da guardare adesso</h2>' + (foc.length ? '<span class="badge ' + (foc[0].c || "") + '">' + foc.length + (foc.length === 1 ? " cosa" : " cose") + "</span>" : '<span class="badge b-green">tutto in ordine</span>') + "</div>";
  h += foc.length ? foc.map(function (f) {
    return '<button class="frow" ' + (f.task ? 'data-open-task="' + f.task + '"' : f.cli ? 'data-open-cli="' + f.cli + '"' : f.act ? 'data-new="' + f.act + '"' : 'data-open-com="' + f.k + '"') + '><span class="fdot ' + (f.c || "b-blue") + '"></span><span class="ftxt"><b>' + esc(f.t) + '</b><span class="faint">' + esc(f.s) + "</span></span><span class=\"fgo\">›</span></button>";
  }).join("") : '<div class="empty">Nessuna urgenza: puoi lavorare sereno.</div>';
  h += "</div><div>";
  h += '<div class="card ringcard">' + ring(avgAv, 104) + '<div><h2>Avanzamento medio</h2><p class="faint" style="margin-top:4px">' + attive.length + " lavori attivi<br>" + (eur(pipeline) + " di pipeline") + "</p></div></div>";
  var wkPrima = settimane(ore, 8, 8);
  var tot8 = sum(wk, function (x) { return x; }), tot8p = sum(wkPrima, function (x) { return x; });
  var delta = tot8p ? Math.round((tot8 - tot8p) / tot8p * 100) : null;
  h += '<div class="card"><div class="cardhead"><h2>Ore, ultime 8 settimane</h2><span class="faint">' + num(wk[wk.length - 1], 1) + " h questa settimana</span></div>" +
    graficoOre(wk, ettSettimane(8)) +
    '<p class="cfoot">' + (delta == null
      ? '<span class="faint">nessun confronto: non ci sono ore prima di queste 8 settimane</span>'
      : '<span class="dlt ' + (delta >= 0 ? "su" : "giu") + '">' + (delta >= 0 ? "▲" : "▼") + " " + Math.abs(delta) + ' %</span><span class="faint">rispetto alle 8 settimane precedenti (' + num(tot8, 0) + " h contro " + num(tot8p, 0) + " h)</span>") + "</p></div>";
  h += "</div></div>";

  h += '<div class="grid g32" style="margin-top:18px">';
  h += '<div class="card"><div class="cardhead"><h2>I lavori su cui sei</h2><button class="btn sm ghost" data-go="commesse">Vedi tutte</button></div>';
  h += com.length ? listCom(com.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); }).slice(0, 6)) : vuoto("Nessun preventivo ancora.", '<button class="lnk" data-new="com">Creane una</button>');
  h += "</div><div>";

  var per = {}; STATI.forEach(function (s) { per[s] = com.filter(function (k) { return k.stato === s; }); });
  var mxp = Math.max.apply(null, STATI.map(function (s) { return sum(per[s], valore); }).concat([1]));
  h += '<div class="card"><div class="cardhead"><h2>Preventivi per momento</h2><span class="faint">' + eur(pipeline) + " in attesa</span></div><div class=\"funnel\">";
  STATI.forEach(function (s) {
    if (!per[s].length) return;
    var v = sum(per[s], valore);
    h += '<div class="frow2"><span class="badge ' + (STATO_COL[s] || "") + '">' + s + '</span><span class="ftrack"><i class="' + (STATO_COL[s] || "") + '" style="width:' + Math.max(4, Math.round(v / mxp * 100)) + '%"></i></span><span class="fnum">' + eur(v) + "</span></div>";
  });
  h += "</div></div>";

  if (!isPR()) {
    var inc = sum(D.pag.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; });
    var da = sum(pagAperti, function (p) { return p.importo; });
    var sc = sum(scaduti, function (p) { return p.importo; });
    var tot = Math.max(1, inc + da);
    h += '<div class="card"><div class="cardhead"><h2>Incassi</h2><button class="btn sm ghost" data-go="amm">Quadro</button></div>' +
      '<div class="stack"><i class="s1" style="width:' + Math.round(inc / tot * 100) + '%"></i><i class="s2" style="width:' + Math.round((da - sc) / tot * 100) + '%"></i><i class="s3" style="width:' + Math.round(sc / tot * 100) + '%"></i></div>' +
      '<div class="legend"><span><i class="s1"></i>Incassato <b>' + eur(inc) + "</b></span><span><i class=\"s2\"></i>Da incassare <b>" + eur(da - sc) + "</b></span>" + (sc ? '<span><i class="s3"></i>Scaduto <b>' + eur(sc) + "</b></span>" : "") + "</div></div>";
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
  STATI.filter(function (s) { return s !== "Perso" || list.some(function (k) { return k.stato === s; }); }).forEach(function (s) {
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
      "<td>" + lnkCli(k.cliente_id) + "</td>" +
      "<td>" + avatars(proDi(k.id), 24) + "</td>" +
      '<td><span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + "</span></td>" +
      '<td><span class="badge ' + sal.c + '">' + sal.t + "</span></td>" +
      "<td>" + (av == null ? '<span class="faint">—</span>' : '<span class="faint">' + av + "%</span>" + prog(av)) + "</td>" +
      "<td>" + (k.scadenza ? (k.scadenza < today() && STATI_CHIUSI.indexOf(k.stato) < 0 ? '<span class="badge b-red">' + dshort(k.scadenza) + "</span>" : dt(k.scadenza)) : "—") + "</td>" +
      '<td class="num"><b>' + eur(b.ricavo) + "</b></td>" +
      '<td class="num"><button class="lnk" data-duplica="' + k.id + '">Duplica</button></td></tr>';
    if (ap) {
      var px = prossimo(k);
      h += '<tr class="expr"><td></td><td colspan="9"><div class="expgrid">' +
        '<div><h3>Prossimi passi</h3>' + (px.length ? px.map(function (p) { return '<div class="pstep"><b>' + esc(p.t) + '</b><span class="faint">' + esc(p.d) + "</span></div>"; }).join("") : '<span class="faint">Nulla in programma.</span>') + "</div>" +
        '<div><h3>Numeri</h3><div class="pstep"><b>' + num(b.oreFatte, 1) + " / " + num(b.oreStim, 0) + ' h</b><span class="faint">ore fatte sul budget</span></div>' +
        (vediCosti() ? '<div class="pstep"><b>' + eur(b.margReale) + '</b><span class="faint">margine atteso</span></div>' : "") + "</div>" +
        '<div><h3>Scorciatoie</h3><div class="qbtns"><button class="btn sm ghost" data-open-com="' + k.id + '">Apri</button><button class="btn sm ghost" data-route="documento|' + k.id + '|">Documento</button><button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">Ore</button><button class="btn sm ghost" data-new="task" data-ctx="' + k.id + '">Attività</button></div></div>' +
        "</div></td></tr>";
    }
  });
  return h + "</tbody></table>";
}
/* ---------------- commesse ---------------- */
function vCommesse() {
  var quali = tab || "personali";
  if (["personali", "studio", "tutti"].indexOf(quali) === -1) quali = "personali";
  var vista = COMVISTA;
  var tutte = fcom();
  var f = FS.com;
  var list = tutte.filter(function (k) {
    if (quali !== "tutti" && ambitoCom(k) !== (quali === "studio" ? "studio" : "personale")) return false;
    if (f.stato && k.stato !== f.stato) return false;
    if (f.salute && salute(k).c !== f.salute) return false;
    if (f.cli && k.cliente_id !== f.cli) return false;
    if (f.cerca && (k.titolo + " " + nameOf(D.cli, k.cliente_id)).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var nPers = tutte.filter(function (k) { return ambitoCom(k) === "personale"; }).length;
  var nStud = tutte.length - nPers;
  var val = sum(list, function (k) { return budget(k).ricavo; });
  var h = head("Preventivi", list.length + " preventivi · " + eur(val) + " di valore",
    '<button class="btn sm ghost" data-route="importa|-|">Importa</button>' +
    '<button class="btn sm ghost" data-new="com" data-ctx-amb="studio">+ Dello studio</button>' +
    '<button class="btn sm" data-new="com" data-ctx-amb="personale">+ Tuo</button>');
  h += barraViste([["personali", "Tuoi", nPers], ["studio", "Dello studio", nStud], ["tutti", "Tutti", tutte.length]], quali, "commesse",
    '<select data-comvista="1" title="Come li vuoi vedere">' + opzioni([["lista", "Lista"], ["bacheca", "Bacheca"], ["timeline", "Timeline"]], vista) + "</select>" +
    fcerca("com", "Cerca un preventivo o un cliente…") +
    fsel("com", "stato", [["", "Ogni stato"]].concat(STATI.map(function (s) { return [s, s]; }))) +
    fsel("com", "salute", [["", "Ogni salute"], ["b-green", "In linea"], ["b-amber", "Da tenere d'occhio"], ["b-red", "A rischio"]]) +
    fsel("com", "cli", [["", "Ogni cliente"]].concat(fcli().map(function (c) { return [c.id, c.nome]; }))) +
    '<select data-persp="1">' + opzioni([["all", "Miei e condivisi"], ["me", "Solo miei"], ["shared", "Solo condivisi"]], persp) + "</select>" +
    (f.stato || f.salute || f.cli || f.cerca ? '<button class="lnk mini" data-f-reset="com">azzera</button>' : ""));

  if (quali !== "tutti") {
    h += '<p class="faint" style="margin:-4px 0 12px">' + (quali === "studio"
      ? "Escono a nome Giraffa Studio, con la sua intestazione e la serie <b>S/" + new Date().getFullYear() + "</b>. Dentro possono lavorare più professionisti, ognuno con la sua partita IVA."
      : "Escono a nome tuo, con la tua intestazione e la serie <b>P/" + new Date().getFullYear() + "</b>. Sono affari tuoi: nessun collega li vede.") + "</p>";
  }
  if (!list.length) {
    var vTxt = (f.stato || f.salute || f.cli || f.cerca) ? "Nessun preventivo con questi filtri."
      : quali === "studio" ? "Nessun preventivo dello studio, per ora."
      : quali === "personali" ? "Nessun preventivo tuo, per ora."
      : "Ancora nessun preventivo.";
    return h + '<div class="card">' + vuoto(vTxt, (f.stato || f.salute || f.cli || f.cerca)
      ? '<button class="lnk" data-f-reset="com">Azzera i filtri</button>'
      : '<button class="lnk" data-new="com" data-ctx-amb="' + (quali === "studio" ? "studio" : "personale") + '">Creane uno</button>') + "</div>";
  }
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
          '<div class="tltrack"><button class="tlbar ' + (k.stato === "Completato" ? "ok" : sal.c === "b-red" ? "bad" : "") + '" style="left:' + x + "%;width:" + w + '%" data-open-com="' + k.id + '">' + esc(nameOf(D.cli, k.cliente_id)) + "</button></div></div>";
      }).join("") + "</div>";
  }
  return h + '<div class="card">' + tblCom(list.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); })) + "</div>";
}

/* Il ciclo in testa al preventivo: dove sta adesso, che giorno ci è passato, e
   il passo successivo a portata di clic. Un preventivo non è una voce in una
   tendina: è una storia con quattro momenti, e va vista come tale. */
var CICLO = ["Bozza", "Inviato", "Accettato", "Completato"];
function cicloBar(k) {
  var i = CICLO.indexOf(k.stato), perso = k.stato === "Perso";
  var h = '<div class="card ciclo"><div class="csteps' + (perso ? " perso" : "") + '">';
  CICLO.forEach(function (st, j) {
    var cl = perso ? (j === 0 ? "fatto" : "") : (j < i ? "fatto" : j === i ? "qui" : "");
    var dd = st === "Bozza" ? dataDoc(k) : k[STATO_DATA[st]];
    h += '<div class="cstep ' + cl + '"><i></i><b>' + st + "</b><span>" + (dd ? dt(dd) : "—") + "</span></div>";
  });
  h += "</div><div class=\"cazioni\"><span class=\"faint\">" +
    esc(perso ? STATO_SPIEGA.Perso : (STATO_SPIEGA[k.stato] || "")) + "</span><span class=\"cbtn\">";
  var pross = perso ? null : CICLO[i + 1];
  /* se il preventivo è di qualche settimana fa, il giorno del passaggio non è
     oggi: si propone la data del documento e la si corregge lì */
  var vecchio = dataDoc(k) < iso(new Date(Date.now() - 14 * 86400000));
  if (pross) h += '<label class="cquando"><span>il</span><input type="date" data-ciclodata="' + k.id + '" value="' + (vecchio ? dataDoc(k) : today()) + '"></label>';
  if (pross) h += '<button class="btn sm" data-ciclo="' + k.id + "|" + pross + '">' +
    (pross === "Inviato" ? "L\'ho mandato al cliente" : pross === "Accettato" ? "Il cliente ha accettato" : "Il lavoro è finito") + "</button>";
  if (!perso && k.stato !== "Completato") h += '<button class="btn sm ghost" data-ciclo="' + k.id + '|Perso">Perso</button>';
  if (perso) h += '<button class="btn sm ghost" data-ciclo="' + k.id + '|Bozza">Riaprilo</button>';
  return h + "</span></div></div>";
}
function tabellaCosti(list, ctxAttr) {
  var h = list.length ? '<table><thead><tr><th>Cosa</th><th>Tipo</th><th>Quando</th><th class="num">Importo</th><th>Al cliente</th><th></th></tr></thead><tbody>' +
    list.slice().sort(function (a, b) { return (a.data || "") < (b.data || "") ? 1 : -1; }).map(function (c) {
      return "<tr><td><b>" + esc(c.nome) + "</b>" + (c.progetto_id && !ctxAttr.progetto ? '<div class="faint">' + esc(nameOf(D.prog, c.progetto_id)) + "</div>" : "") +
        (c.fornitore_id ? '<div class="faint">' + esc(nameOf(D.forn, c.fornitore_id)) + "</div>" : "") + (c.note ? '<div class="faint">' + esc(c.note) + "</div>" : "") +
        (c.url ? '<div><a href="' + esc(c.url) + '" target="_blank" rel="noopener">apri</a></div>' : "") + "</td>" +
        "<td>" + esc(c.tipo || "—") + "</td><td>" + dt(c.data) + "</td>" +
        '<td class="num"><b>' + eur(costoVal(c)) + "</b>" + (c.ricorrente ? '<div class="faint">' + Math.max(1, +c.cicli || 1) + " × " + eur(c.importo) + (c.periodo === "Annuale" ? " l'anno" : " al mese") + "</div>" : "") + "</td>" +
        "<td>" + (c.ribaltato ? '<span class="badge b-blue">addebitato</span>' : '<span class="faint">a carico tuo</span>') + "</td>" +
        '<td class="num"><button class="lnk" data-edit="costi:' + c.id + '">Modifica</button></td></tr>';
    }).join("") + '</tbody><tfoot><tr><td colspan="3"><b>Totale</b> <span class="faint">· di cui a carico tuo ' + eur(costiTot(list.filter(function (x) { return !x.ribaltato; }))) + '</span></td><td class="num"><b>' + eur(costiTot(list)) + "</b></td><td colspan=\"2\"></td></tr></tfoot></table>"
    : vuoto("Nessun costo registrato. Strumenti, abbonamenti, fornitori, budget pubblicitario: quello che esce di tasca per questo lavoro.", '<button class="lnk" data-new="costi" ' + ctxAttr.attr + '>Registra il primo</button>');
  return h;
}
function vCommessa() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Preventivo non trovato. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  var c = calc(k), ore = oreOf(k.id), tk = taskOf(k.id), fs = fasiOf(k.id), mt = matOf(k.id), pg = pagOf(k.id), ap = apprOf(k.id);
  var oreT = sum(ore, function (o) { return o.ore; }), av = avanzamento(k.id);
  var incassato = sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; });
  var t = tab || "note";

  var b = budget(k), sal = salute(k), vr = variOf(k.id);

  var h = crumbs([[gruppoDi("commesse") || "Clienti"], ["Preventivi", "commesse"], [k.titolo]]);
  h += '<div class="top"><h1>' + esc(k.titolo) + '<span class="sub">' + lnkCli(k.cliente_id) + " · " + esc(k.stato) + " · " + esc(k.tipo_prezzo || "Fisso") + (condivisa(k) ? " · condivisa con " + (proDi(k.id).length - 1) + " colleghi" : " · solo tua") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-edit="com:' + k.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-route="documento|' + k.id + '|">Documento</button>' +
    (isPR() ? "" : (timerMio() && timerMio().commessa_id === k.id
      ? '<button class="btn sm stop" data-tstop="1">■ Ferma <span id="timerlbl">' + durata(timerMio().iniziato) + "</span></button>"
      : '<button class="btn sm ghost" data-tstart="' + k.id + '">▶ Avvia timer</button>')) +
    (["Accettato"].indexOf(k.stato) > -1 && !k.avviato && !isPR() && !isCliente() ? '<button class="btn sm" data-avvia="' + k.id + '">⚡ Apri il lavoro</button>' : "") +
    '<button class="btn sm ghost" data-route="prospetto|' + k.id + '|ore">Prospetti</button>' +
    '<button class="btn sm" data-portale="' + k.id + '">Anteprima cliente</button></div></div>';

  h += cicloBar(k);

  /* Le proprietà in cima, come una pagina di Notion: si cambiano sul posto. */
  var aperto = STATI_APERTI.indexOf(k.stato) > -1;
  h += '<div class="card props"><div class="pgrid">' +
    qcampo("com", k.id, "stato", "Stato", qsel("com", k.id, "stato", sel(STATI, k.stato || "Bozza"))) +
    qcampo("com", k.id, "cliente_id", "Cliente", qsel("com", k.id, "cliente_id", opt(D.cli, k.cliente_id))) +
    qcampo("com", k.id, "owner_id", "Chi lo segue", qsel("com", k.id, "owner_id", opt(D.pros, k.owner_id))) +
    qcampo("com", k.id, "inizio", "Inizio", qinput("com", k.id, "inizio", "date", k.inizio)) +
    qcampo("com", k.id, "scadenza", "Consegna", qinput("com", k.id, "scadenza", "date", k.scadenza)) +
    (aperto && k.stato !== "Accettato" ? qcampo("com", k.id, "probabilita", "Probabilità (%)", qinput("com", k.id, "probabilita", "number", k.probabilita == null ? 50 : k.probabilita, ' step="5" min="0" max="100"')) : "") +
    '<div class="qfield ro"><label>Valore</label><b>' + eur(b.ricavo) + "</b>" + (c.mrr ? '<span class="faint">' + eur(c.mrr) + " al mese</span>" : "") + "</div>" +
    '<div class="qfield ro"><label>Avanzamento</label><b>' + (av == null ? "—" : av + " %") + "</b>" + (av == null ? "" : prog(av)) + "</div>" +
    '<div class="qfield ro"><label>Salute</label><span class="badge ' + sal.c + '">' + sal.t + '</span><span class="faint">' + esc(sal.d || "") + "</span></div>" +
    (k.pr_id ? '<div class="qfield ro"><label>Portato da</label><b>' + esc(nameOf(D.pros, k.pr_id)) + "</b></div>" : "") +
    "</div></div>";
  h += cardProposte(k.id);
  var riu = riuOf(k.id);
  var TABS = [["note", "Note"], ["discussione", "Discussione", D.comm.filter(function (x) { return x.commessa_id === k.id; }).length], ["materiali", "Allegati", mt.length],
    ["attivita", "Attività", tk.filter(function (z) { return z.stato !== "Fatto"; }).length], ["riunioni", "Riunioni", riu.length],
    ["servizi", "Preventivo", righeOf(k.id).length], ["incarico", "Incarico", incOf(k.id).filter(function (i) { return i.stato !== "Annullata"; }).length || null], ["numeri", "Numeri"], ["pagamenti", "Pagamenti", pg.length], ["costi", "Costi", costiOf(k.id).length]];
  if (!isPR()) TABS.push(["ore", "Ore", num(oreT, 1)]);
  TABS.push(["approvazioni", "Approvazioni", ap.filter(function (a) { return a.stato === "In attesa"; }).length], ["varianti", "Varianti", vr.length]);
  if (fs.length) TABS.push(["fasi", "Fasi", fs.length]);
  TABS.push(["log", "Diario"]);
  h += '<div class="card">' + schede(TABS, t, "commessa", k.id);
  if (t === "riunioni") {
    h += '<div class="cardhead"><h2>Riunioni su questo lavoro</h2><button class="btn sm ghost" data-new="riu" data-ctx="' + k.id + '">+ Riunione</button></div>';
    h += riu.length ? riu.map(rigaRiunione).join("") : vuoto("Nessuna riunione ancora. Quando ne fissi una, qui trovi ordine del giorno, appunti e decisioni.", '<button class="lnk" data-new="riu" data-ctx="' + k.id + '">Fissa la prima</button>');
  }
  if (t === "numeri") {
  h += '<div class="grid g4">' +
    kpi(eur(b.ricavo), "Valore del lavoro", c.mrr ? eur(c.mrr) + " al mese ricorrenti" : b.extra ? eur(k.budget_importo || c.tot) + " + " + eur(b.extra) + " di varianti" : "imponibile " + eur(c.imp) + " · IVA " + eur(c.iva)) +
    kpi(av == null ? "—" : av + " %", "Avanzamento", progOf(k.id).length + " progetti") +
    kpi('<span class="badge ' + sal.c + '" style="font-size:.9rem;padding:5px 12px">' + sal.t + "</span>", "Salute", sal.d) +
    kpi(vediCosti() ? eur(b.margReale) : num(b.oreFatte, 1) + " h", vediCosti() ? "Margine atteso" : "Ore registrate", vediCosti() ? "pianificato " + eur(b.margPian) : "su " + num(b.oreStim, 0) + " stimate") + "</div>";

  if (vediCosti()) {
    var bo = b.burnOre == null ? 0 : b.burnOre, bc = b.burnCosto;
    h += '<div class="card"><div class="grid g2">' +
      '<div><div class="cardhead"><h2>Le mie ore</h2><span class="faint">' + num(b.oreFatte, 1) + " / " + num(b.oreStim, 0) + " h stimate in totale</span></div><div class=\"prog\"><i class=\"" + (bo > 100 ? "bad" : bo > 85 ? "warn" : "ok") + '" style="width:' + Math.min(100, bo) + '%"></i></div><p class="faint" style="margin-top:6px">' + bo + "% delle ore stimate · quelle dei colleghi sono private</p></div>" +
      '<div><div class="cardhead"><h2>Costo sul valore</h2><span class="faint">' + eur(Math.max(b.costoPian, b.costoReale)) + " su " + eur(b.ricavo) + "</span></div><div class=\"prog\"><i class=\"" + (bc > 90 ? "bad" : bc > 70 ? "warn" : "ok") + '" style="width:' + Math.min(100, bc) + '%"></i></div><p class="faint" style="margin-top:6px">' + bc + "% del valore va in compensi" + (b.costi ? " e costi (" + eur(b.costi) + " di strumenti e spese)" : "") + "</p></div>" +
      "</div></div>";
  }

  var px = prossimo(k);
  if (px.length) {
    h += '<div class="steps">' + px.map(function (p, i) {
      return '<div class="step"><span class="sn">' + (i + 1) + "</span><div><b>" + esc(p.t) + '</b><span class="faint">' + esc(p.d) + "</span></div></div>";
    }).join("") + "</div>";
  }

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
    (k.tipo_prezzo === "Retainer" && k.retainer_mensile ? row2("Canone mensile", eur(k.retainer_mensile)) : "") +
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
  }

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
    h += foglioA4(k, { dentro: true });
  }
  if (t === "incarico") h += schedaIncarico(k);
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
    h += '<div class="cardhead"><h2>Ore registrate</h2><span>' + (daFatt.length ? '<span class="faint">da fatturare: ' + num(sum(daFatt, function (o) { return o.ore; }), 1) + " h · " + eur(valDaFatt) + "</span> " : "") + '<button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">+ Registra ore</button></span></div>' + tblOre(ore);
  }
  if (t === "materiali") {
    h += '<div class="cardhead"><h2>Materiali del lavoro</h2><div style="display:flex;gap:8px"><button class="btn sm ghost" data-link="' + ctxAll(k.id) + '">+ Link</button><button class="btn sm ghost" data-new="mat" data-ctx="' + k.id + '">+ Materiale</button></div></div>';
    h += zonaAllegati(ctxAll(k.id));
    h += tabellaAllegati(mt, { fase: true });
  }
  if (t === "pagamenti") {
    h += '<div class="cardhead"><h2>Scadenzario pagamenti</h2><button class="btn sm ghost" data-new="pag" data-ctx="' + k.id + '">+ Nuova scadenza</button></div>';
    h += pg.length ? '<table><thead><tr><th>Voce</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th><th></th></tr></thead><tbody>' + pg.slice().sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; }).map(function (p) {
      var late = p.stato === "Da incassare" && p.scadenza && p.scadenza < today();
      return "<tr><td>" + esc(p.nome) + "</td><td>" + (late ? '<span class="badge b-red">' + dt(p.scadenza) + "</span>" : dt(p.scadenza)) + '</td><td class="num">' + eur(p.importo) + '</td><td><span class="badge ' + (p.stato === "Incassato" ? "b-green" : "b-amber") + '">' + esc(p.stato) + '</span></td><td class="num">' + (p.stato !== "Incassato" ? '<button class="lnk" data-incassa="' + p.id + '">Incassato</button> ' : "") + '<button class="lnk" data-edit="pag:' + p.id + '">Modifica</button></td></tr>';
    }).join("") + '</tbody><tfoot><tr><td colspan="2"><b>Totale piano</b></td><td class="num"><b>' + eur(sum(pg, function (p) { return p.importo; })) + "</b></td><td colspan=\"2\"></td></tr></tfoot></table>" : vuoto("Nessun piano di pagamento.", '<button class="lnk" data-new="pag" data-ctx="' + k.id + '">Crea acconto e saldo</button>');
  }
  if (t === "costi") {
    var cst = costiOf(k.id);
    h += '<div class="cardhead"><h2>Costi del lavoro</h2><span class="faint" style="margin-right:auto">' + (cst.length ? eur(costiTot(cst.filter(function (x) { return !x.ribaltato; }))) + " a carico tuo, il margine ne tiene conto" : "") + '</span><button class="btn sm ghost" data-new="costi" data-ctx="' + k.id + '">+ Registra un costo</button></div>';
    h += tabellaCosti(cst, { attr: 'data-ctx="' + k.id + '"' });
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
  return h + "</div>";
}
/* ---------------- riunioni ----------------
   Uno strumento pratico: prima della riunione il link e l'ordine del giorno,
   durante gli appunti, dopo le decisioni e i prossimi passi, che con un clic
   diventano attività dentro il lavoro giusto. */
var RF = { cerca: "" };
function oraRiu(r) { return r.ora ? r.ora.slice(0, 5) + (r.fine ? "–" + r.fine.slice(0, 5) : "") : ""; }
function rigaRiunione(r) {
  var oggi = today();
  var sub = dt(r.data) + (oraRiu(r) ? " · " + oraRiu(r) : "") + " · " + esc(r.tipo || "Videocall") + (r.cliente_id ? " · " + lnkCli(r.cliente_id) : "");
  var meta = (r.stato === "Tenuta" ? '<span class="badge b-green">tenuta</span>' : r.stato === "Annullata" ? '<span class="badge b-red">annullata</span>' : r.data < oggi ? '<span class="badge b-amber">da chiudere</span>' : r.data === oggi ? '<span class="badge b-blue">oggi</span>' : "") +
    (r.partecipanti || []).map(function (p) { return avatar(p, 22); }).join("") +
    (r.link && r.stato !== "Annullata" && r.data >= oggi ? ' <a class="btn sm" href="' + esc(r.link) + '" target="_blank" rel="noopener">Entra</a>' : "");
  return rigaEl("riunione|" + r.id + "|", r.titolo, sub, meta);
}
function vRiunioni() {
  var oggi = today(), q = RF.cerca.toLowerCase();
  var tutte = D.riu.filter(function (r) { return !q || (r.titolo + " " + (r.note || "") + " " + (r.decisioni || "") + " " + nameOf(D.cli, r.cliente_id) + " " + nameOf(D.com, r.commessa_id, "titolo")).toLowerCase().indexOf(q) > -1; });
  var pros = tutte.filter(function (r) { return r.data >= oggi && r.stato !== "Annullata"; }).sort(function (a, b) { return (a.data + (a.ora || "")) < (b.data + (b.ora || "")) ? -1 : 1; });
  var pass = tutte.filter(function (r) { return r.data < oggi || r.stato === "Annullata"; }).sort(function (a, b) { return (a.data + (a.ora || "")) < (b.data + (b.ora || "")) ? 1 : -1; });
  var vista = tab === "passate" ? "passate" : "prossime", lista = vista === "passate" ? pass : pros;
  var h = head("Riunioni", "Videocall e incontri: link, ordine del giorno, appunti, decisioni, prossimi passi", '<button class="btn sm" data-new="riu">+ Riunione</button>');
  h += barraViste([["prossime", "Prossime", pros.length], ["passate", "Passate", pass.length]], vista, "riunioni",
    '<input id="fcerca" data-rf="cerca" placeholder="Cerca per titolo, cliente, appunti…" value="' + esc(RF.cerca) + '">');
  var daChiudere = pass.filter(function (r) { return r.stato !== "Tenuta" && r.stato !== "Annullata"; });
  if (vista === "prossime" && daChiudere.length) h += '<div class="card" style="border-color:var(--terra)"><div class="cardhead"><h2>Da chiudere</h2><span class="faint">riunioni passate senza decisioni segnate</span></div>' + daChiudere.slice(0, 5).map(rigaRiunione).join("") + "</div>";
  h += '<div class="card">' + (lista.length ? lista.map(rigaRiunione).join("") : vuoto(vista === "passate" ? "Nessuna riunione passata." : "Nessuna riunione in programma.", '<button class="lnk" data-new="riu">Fissane una</button>')) + "</div>";
  return h;
}
function vRiunione() {
  var r = by(D.riu, current);
  if (!r) return '<div class="card">Riunione non trovata. <button class="lnk" data-route="riunioni">Torna alle riunioni</button></div>';
  var oggi = today(), mia = r.pro_id === me.pro_id;
  var h = crumbs([[gruppoDi("riunioni") || "Lavoro"], ["Riunioni", "riunioni"], [r.titolo]]);
  h += '<div class="top"><h1>' + esc(r.titolo) + '<span class="sub">' + dt(r.data) + (oraRiu(r) ? " · " + oraRiu(r) : "") + " · " + esc(r.tipo || "Videocall") +
    (r.cliente_id ? " · " + lnkCli(r.cliente_id) : "") + (r.commessa_id ? " · " + lnkCom(r.commessa_id) : "") + (r.progetto_id ? " · " + lnkProg(r.progetto_id) : "") + '</span></h1><div class="tools">' +
    (r.link ? '<a class="btn sm" href="' + esc(r.link) + '" target="_blank" rel="noopener">Entra nella videocall</a>' : "") +
    (r.stato !== "Tenuta" ? '<button class="btn sm ghost" data-riu-stato="' + r.id + '|Tenuta">Segna come tenuta</button>' : '<button class="btn sm ghost" data-riu-stato="' + r.id + '|Programmata">Riapri</button>') +
    (r.stato !== "Annullata" && r.stato !== "Tenuta" ? '<button class="btn sm ghost" data-riu-stato="' + r.id + '|Annullata">Annulla</button>' : "") +
    (gconnMia() && r.stato !== "Annullata" ? (r.gcal_event_id ? '<button class="btn sm ghost" data-gcal-metti="' + r.id + '" title="Rimanda a Google le modifiche">Aggiorna su Google</button><button class="btn sm ghost" data-gcal-via="' + r.id + '">Togli da Google</button>' : '<button class="btn sm ghost" data-gcal-metti="' + r.id + '">Metti in Google Calendar</button>') : "") +
    '<button class="btn sm ghost" data-edit="riu:' + r.id + '">Modifica</button>' +
    (mia ? '<button class="btn sm danger" data-del="riu:' + r.id + '">Elimina</button>' : "") + "</div></div>";
  h += '<div class="card props"><div class="pgrid">' +
    qcampo("riu", r.id, "data", "Giorno", qinput("riu", r.id, "data", "date", r.data)) +
    qcampo("riu", r.id, "ora", "Dalle", qinput("riu", r.id, "ora", "time", r.ora ? r.ora.slice(0, 5) : "")) +
    qcampo("riu", r.id, "fine", "Alle", qinput("riu", r.id, "fine", "time", r.fine ? r.fine.slice(0, 5) : "")) +
    qcampo("riu", r.id, "tipo", "Come", qsel("riu", r.id, "tipo", sel(["Videocall", "In presenza", "Telefonata"], r.tipo || "Videocall"))) +
    qcampo("riu", r.id, "link", "Link videocall", qinput("riu", r.id, "link", "text", r.link)) +
    qcampo("riu", r.id, "luogo", "Dove", qinput("riu", r.id, "luogo", "text", r.luogo)) +
    qcampo("riu", r.id, "cliente_id", "Cliente", qsel("riu", r.id, "cliente_id", opt(D.cli, r.cliente_id))) +
    qcampo("riu", r.id, "commessa_id", "Preventivo", qsel("riu", r.id, "commessa_id", opt(D.com, r.commessa_id, "titolo"))) +
    qcampo("riu", r.id, "progetto_id", "Progetto", qsel("riu", r.id, "progetto_id", '<option value=""></option>' + progOf(r.commessa_id).map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join(""))) +
    qcampo("riu", r.id, "registrazione", "Registrazione (link)", qinput("riu", r.id, "registrazione", "text", r.registrazione)) +
    '<div class="qfield ro"><label>Chi c\'è</label>' + avatar(r.pro_id, 22) + (r.partecipanti || []).map(function (p) { return avatar(p, 22); }).join("") + (r.esterni ? '<span class="faint"> · ' + esc(r.esterni) + "</span>" : "") + "</div>" +
    "</div></div>";
  var box = function (campo, titolo, sotto, ph) {
    return '<div class="card"><div class="cardhead"><h2>' + titolo + '</h2><span class="faint">' + sotto + "</span></div>" +
      '<textarea class="doc" data-autosave="riu|' + campo + "|" + r.id + '" placeholder="' + esc(ph) + '">' + esc(r[campo] || "") + "</textarea></div>";
  };
  h += cardRegistra(r);
  h += '<p class="faint" style="margin:-6px 0 12px">Si salva da solo mentre scrivi. <span id="notestat"></span></p>';
  h += '<div class="riugrid">' +
    box("ordine_giorno", "Ordine del giorno", "prima", "- Cosa dobbiamo decidere\n- Cosa mostrare") +
    box("note", "Appunti", "durante", "Quello che viene detto, così com'è") +
    box("decisioni", "Decisioni", "dopo", "Cosa abbiamo deciso, una per riga") +
    '<div class="card"><div class="cardhead"><h2>Prossimi passi</h2><button class="btn sm ghost" data-riu-task="' + r.id + '">Crea le attività</button></div>' +
    '<textarea class="doc" data-autosave="riu|prossimi|' + r.id + '" placeholder="Una riga per ogni cosa da fare: con un clic diventano attività dentro il lavoro">' + esc(r.prossimi || "") + "</textarea>";
  var nate = D.task.filter(function (t) { return t.origine_id === r.id; });
  if (nate.length) h += '<div class="checklist" style="margin-top:10px">' + nate.map(function (x) { return riga(x, nate); }).join("") + "</div>";
  h += "</div></div>";
  var ctx = ctxAll(r.commessa_id, r.progetto_id, "", "", r.id), mt = matOfRiu(r.id);
  h += '<div class="card"><div class="cardhead"><h2>Allegati</h2><div style="display:flex;gap:8px"><button class="btn sm ghost" data-link="' + esc(ctx) + '">+ Link</button></div></div>' + zonaAllegati(ctx) + tabellaAllegati(mt, {}) + "</div>";
  return h;
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
/* La pagina Attività è una lista sola: chi guardo (io o tutti) e quale scheda è aperta di lato */
var PANEL = null, TV = { chi: "io" };
try { TV.chi = localStorage.getItem("gs_task_chi") || "io"; } catch (e) {}

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
    '<div class="vtabs">' + [["oggi", "‹ Elenco"], ["bacheca", "Bacheca"], ["calendario", "Calendario"], ["timeline", "Timeline"]].map(function (v) {
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
    (vista === "lista" ? '<span class="faint">Ordina</span><select data-tsordina="1">' +
      opts([["scadenza", "Scadenza"], ["priorita", "Priorità"], ["titolo", "Titolo"], ["ordine", "Manuale"]], TSORT) + "</select>" : "") +
    (D.viste.length ? '<span class="vsep"></span><select data-vista-apri="1"><option value="">Viste salvate…</option>' +
      D.viste.filter(function (v) { return v.ambito === "task"; }).map(function (v) { return '<option value="' + v.id + '">' + esc(v.nome) + "</option>"; }).join("") + "</select>" : "") +
    '<button class="lnk mini" data-vista-salva="1">Salva questa vista</button>' +
    "</div></div>";
}
/* Un'attività da sola non dice niente: "Posizionamento" per chi? dentro cosa?
   Sotto il titolo sta la sua strada — cliente, preventivo, progetto — tolto
   quello per cui la lista è già raggruppata. A destra le cose che cambiano:
   stato, scadenza, chi la fa. */
function stradaTask(t) {
  var k = t.commessa_id ? by(D.com, t.commessa_id) : null;
  var cli = t.cliente_id || (k && k.cliente_id);
  var pezzi = [];
  if (cli) pezzi.push(lnkCli(cli, "lnk mini2"));
  if (k && TGROUP !== "progetto") pezzi.push(lnkCom(k.id, "lnk mini2"));
  if (t.progetto_id && TGROUP !== "progetto") pezzi.push(lnkProg(t.progetto_id, "lnk mini2"));
  if (t.sezione && TGROUP === "progetto" && t.sezione !== nameOf(D.prog, t.progetto_id)) pezzi.push(esc(t.sezione));
  return pezzi.filter(Boolean).join(" · ");
}
function rigaTaskLista(t) {
  var fatto = t.stato === "Fatto";
  var late = t.scadenza && t.scadenza < today() && !fatto;
  var sub = D.task.filter(function (x) { return x.padre_id === t.id; });
  var subFatte = sub.filter(function (x) { return x.stato === "Fatto"; }).length;
  var bloccata = D.dip.filter(function (d) { return d.task_id === t.id; }).some(function (d) { var b = by(D.task, d.blocca_id); return b && b.stato !== "Fatto"; });
  var strada = stradaTask(t);
  return '<div class="trow' + (fatto ? " fatta" : "") + '">' +
    '<button class="ck' + (fatto ? " on" : "") + '" data-tck="' + t.id + '" title="Segna fatta"></button>' +
    '<button class="ttit" data-open-task="' + t.id + '"><span class="tt1">' + esc(t.titolo) +
      (sub.length ? '<span class="faint"> · ' + subFatte + "/" + sub.length + " sotto-attività</span>" : "") +
      (bloccata ? ' <span class="badge b-amber">bloccata</span>' : "") + "</span>" +
      "</button>" + (strada ? '<span class="tt2">' + strada + "</span>" : "") +
    '<span class="tmeta">' +
      (t.stato === "In corso" ? '<span class="badge b-terra">in corso</span>' : t.stato === "In review" ? '<span class="badge b-blue">in review</span>' : "") +
      (t.priorita && t.priorita !== "Media" ? '<span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita) + "</span>" : "") +
      (t.scadenza ? '<span class="badge ' + (late ? "b-red" : "") + '" title="Scadenza">' + (late ? "in ritardo · " : "entro ") + dshort(t.scadenza) + "</span>" : "") +
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
    var sotto = "";
    if (TGROUP === "progetto") {
      var t0 = g[k][0], k0 = t0.commessa_id ? by(D.com, t0.commessa_id) : null;
      var cli0 = t0.cliente_id || (k0 && k0.cliente_id);
      sotto = [cli0 ? lnkCli(cli0, "lnk mini2") : "", k0 && k0.titolo !== k ? lnkCom(k0.id, "lnk mini2") : ""].filter(Boolean).join(" · ");
    }
    return '<div class="card tgroup"><div class="cardhead"><h2>' + esc(k) + (sotto ? '<span class="sub">' + sotto + "</span>" : "") + '</h2><span class="faint">' + aperte + " aperte su " + g[k].length + "</span></div>" +
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
/* ---------------- Attività: una lista sola ----------------
   Oggi (in ritardo, oggi, senza data), Prossimi giorni, Tutte per progetto, Fatte.
   Si aggiunge scrivendo una riga: la data, la persona (@) e il progetto (#) li
   capisce dal testo. Data e persona si cambiano dalla riga; il resto in un
   pannello di lato. Bacheca, calendario e timeline restano sotto «Altre viste». */
function ordT(a, b) {
  var P = { Alta: 0, Media: 1, Bassa: 2 }, sa = a.scadenza || "9999", sb9 = b.scadenza || "9999";
  if (sa !== sb9) return sa < sb9 ? -1 : 1;
  var pa = P[a.priorita] == null ? 1 : P[a.priorita], pb = P[b.priorita] == null ? 1 : P[b.priorita];
  if (pa !== pb) return pa - pb;
  return ((a.ordine || 0) - (b.ordine || 0)) || ((a.created_at || "") < (b.created_at || "") ? -1 : 1);
}
var GG = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"], GGL = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
var MM = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
function giornoPiu(n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); }
function etichettaGiorno(k) {
  if (!k) return "senza data";
  if (k === today()) return "Oggi";
  if (k === giornoPiu(1)) return "Domani";
  var d = new Date(k + "T12:00:00");
  var fra = Math.round((d - new Date(today() + "T12:00:00")) / 86400000);
  var base = GG[d.getDay()] + " " + d.getDate() + " " + MM[d.getMonth()];
  if (fra < 0) return base;
  if (fra < 7) return GGL[d.getDay()].charAt(0).toUpperCase() + GGL[d.getDay()].slice(1) + " " + d.getDate();
  return base + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "");
}
function etichettaBreve(k) {
  if (!k) return "data";
  if (k === today()) return "oggi";
  if (k === giornoPiu(1)) return "domani";
  var d = new Date(k + "T12:00:00");
  return GG[d.getDay()] + " " + d.getDate() + (d.getMonth() !== new Date().getMonth() ? " " + MM[d.getMonth()] : "");
}
/* «bozza sito Lucchi ven @Goffredo !» → titolo, scadenza, persona, progetto, priorità */
function capisciTask(testo, ctx) {
  var t = " " + testo + " ", r = { titolo: "", stato: "Da fare", priorita: "Media", assegnato_id: me.pro_id, creato_da: me.pro_id }, come = [];
  ctx = ctx || "";
  if (/\s!+\s/.test(t)) { r.priorita = "Alta"; t = t.replace(/\s!+\s/g, " "); come.push("priorità alta"); }
  var mp = t.match(/\s@(\S+)/);
  if (mp) {
    var q = mp[1].toLowerCase();
    var per = D.pros.filter(function (p) { return (p.nome || "").toLowerCase().indexOf(q) === 0; })[0] ||
      D.pros.filter(function (p) { return (p.nome || "").toLowerCase().indexOf(q) > -1; })[0];
    if (per) { r.assegnato_id = per.id; t = t.replace(mp[0], " "); }
  }
  var mh = t.match(/\s#(\S+)/);
  if (mh) {
    var q2 = mh[1].toLowerCase().replace(/[_-]/g, " ");
    var pg = progVisibili().filter(function (p) { return (p.nome || "").toLowerCase().indexOf(q2) > -1; })[0];
    if (pg) { r.progetto_id = pg.id; t = t.replace(mh[0], " "); }
    else { var cl = D.cli.filter(function (c) { return (c.nome || "").toLowerCase().indexOf(q2) > -1; })[0]; if (cl) { r.cliente_id = cl.id; t = t.replace(mh[0], " "); } }
  }
  /* la data: parole, giorni della settimana, «fra 3 giorni», 12/9, 12 set */
  var oggi = new Date(today() + "T12:00:00");
  var md = t.match(/\s(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\s/);
  if (md) {
    var y = md[3] ? (+md[3] < 100 ? 2000 + +md[3] : +md[3]) : oggi.getFullYear();
    var dd = new Date(y, +md[2] - 1, +md[1], 12);
    if (!md[3] && dd < oggi) dd.setFullYear(y + 1);
    if (!isNaN(dd)) { r.scadenza = iso(dd); t = t.replace(md[0], " "); }
  }
  if (!r.scadenza) {
    var mm = t.match(/\s(\d{1,2}) (gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-zà]*\s/i);
    if (mm) {
      var d2 = new Date(oggi.getFullYear(), MM.indexOf(mm[2].toLowerCase()), +mm[1], 12);
      if (d2 < oggi) d2.setFullYear(d2.getFullYear() + 1);
      r.scadenza = iso(d2); t = t.replace(mm[0], " ");
    }
  }
  if (!r.scadenza) {
    var mg = t.match(/\s(?:fra|tra) (\d+) (giorni|giorno|settimane|settimana)\s/i);
    if (mg) { r.scadenza = giornoPiu(+mg[1] * (/sett/i.test(mg[2]) ? 7 : 1)); t = t.replace(mg[0], " "); }
  }
  if (!r.scadenza) {
    var mw = t.match(/\s(oggi|domani|dopodomani|stasera|fine mese|settimana prossima|prossima settimana|lun(?:ed[iì])?|mar(?:ted[iì])?|mer(?:coled[iì])?|gio(?:ved[iì])?|ven(?:erd[iì])?|sab(?:ato)?|dom(?:enica)?)\s/i);
    if (mw) {
      var w = mw[1].toLowerCase();
      if (w === "oggi" || w === "stasera") r.scadenza = today();
      else if (w === "domani") r.scadenza = giornoPiu(1);
      else if (w === "dopodomani") r.scadenza = giornoPiu(2);
      else if (w === "fine mese") { var fm = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0, 12); r.scadenza = iso(fm); }
      else if (/settimana/.test(w)) { r.scadenza = giornoPiu(((8 - oggi.getDay()) % 7) || 7); }
      else {
        var gi = GG.indexOf(w.slice(0, 3));
        if (gi > -1) { var diff = (gi - oggi.getDay() + 7) % 7; r.scadenza = giornoPiu(diff); }
      }
      if (r.scadenza) t = t.replace(mw[0], " ");
    }
  }
  r.titolo = t.replace(/\s+/g, " ").trim();
  /* il progetto o il cliente lo riconosco anche senza #, se il nome è nel testo */
  if (!r.progetto_id && !r.cliente_id && ctx.indexOf("prog:") !== 0) {
    var low = " " + r.titolo.toLowerCase().replace(/[^\wàèéìòù ]+/g, " ") + " ", best = null;
    /* basta il nome intero o la sua prima parola (se ha almeno 4 lettere): «Borsari» trova «Borsari Gioielli» */
    var trova = function (nome) {
      var n = (nome || "").toLowerCase(), prima = n.split(" ")[0];
      if (n.length >= 4 && low.indexOf(" " + n + " ") > -1) return n;
      if (prima.length >= 4 && low.indexOf(" " + prima + " ") > -1) return prima;
      return null;
    };
    progVisibili().forEach(function (p) { var n = trova(p.nome); if (n && (!best || n.length > best.n.length)) best = { n: n, p: p }; });
    if (best) r.progetto_id = best.p.id;
    else {
      var bc = null;
      D.cli.forEach(function (c) { var n = trova(c.nome); if (n && (!bc || n.length > bc.n.length)) bc = { n: n, c: c }; });
      if (bc) r.cliente_id = bc.c.id;
    }
  }
  if (ctx.indexOf("prog:") === 0 && !r.progetto_id) r.progetto_id = ctx.slice(5);
  if (r.progetto_id) { var pg2 = by(D.prog, r.progetto_id); if (pg2) { r.commessa_id = pg2.commessa_id; var k2 = by(D.com, pg2.commessa_id); if (k2 && !r.cliente_id) r.cliente_id = k2.cliente_id; } }
  if (!r.scadenza && ctx === "oggi") r.scadenza = today();
  if (!r.scadenza && ctx === "prossimi") r.scadenza = giornoPiu(1);
  var h = [];
  h.push(r.scadenza ? etichettaGiorno(r.scadenza) : "senza data");
  h.push(r.assegnato_id === me.pro_id ? "io" : nameOf(D.pros, r.assegnato_id));
  if (r.progetto_id) h.push(nameOf(D.prog, r.progetto_id)); else if (r.cliente_id) h.push(nameOf(D.cli, r.cliente_id));
  if (r.priorita === "Alta") h.push("priorità alta");
  return { riga: r, hint: r.titolo ? "→ " + h.map(esc).join(" · ") : "" };
}
function scriviTask(ctx, segnaposto) {
  return '<form class="qnew" data-qnew="' + esc(ctx) + '" autocomplete="off"><span class="qplus">+</span>' +
    '<input id="tnuova" name="t" placeholder="' + esc(segnaposto || "Scrivi un\'attività e premi Invio · es. «bozza sito Lucchi ven @Goffredo»") + '" autocomplete="off">' +
    '<span class="qhint" id="qhint"></span></form>';
}
function taskDiChi(list) {
  if (TV.chi !== "io") return list;
  return list.filter(function (t) { return !t.assegnato_id || t.assegnato_id === me.pro_id; });
}
function rigaT(t, o) {
  o = o || {};
  var fatto = t.stato === "Fatto";
  var late = t.scadenza && t.scadenza < today() && !fatto;
  var k = t.commessa_id ? by(D.com, t.commessa_id) : null;
  var cli = t.cliente_id || (k && k.cliente_id);
  var pezzi = [];
  if (cli) pezzi.push(lnkCli(cli, "lnk mini2"));
  if (!o.noProg) { if (t.progetto_id) pezzi.push(lnkProg(t.progetto_id, "lnk mini2")); else if (k) pezzi.push(lnkCom(k.id, "lnk mini2")); }
  if (t.padre_id) { var pd = by(D.task, t.padre_id); if (pd) pezzi.push("↳ " + esc(pd.titolo)); }
  var sub = D.task.filter(function (x) { return x.padre_id === t.id; });
  var subFatte = sub.filter(function (x) { return x.stato === "Fatto"; }).length;
  return '<div class="trow' + (fatto ? " fatta" : "") + (PANEL === t.id ? " sel" : "") + '" draggable="true" data-open-task="' + t.id + '">' +
    '<button class="ck' + (fatto ? " on" : "") + '" data-tck="' + t.id + '" title="' + (fatto ? "Riapri" : "Segna fatta") + '"></button>' +
    '<button class="ttit" data-open-task="' + t.id + '"><span class="tt1">' + (t.priorita === "Alta" && !fatto ? '<i class="tprio" title="Priorità alta"></i>' : "") + esc(t.titolo) +
      (sub.length ? '<span class="faint"> · ' + subFatte + "/" + sub.length + "</span>" : "") +
      (t.stato === "In corso" ? ' <span class="badge b-terra">in corso</span>' : t.stato === "In review" ? ' <span class="badge b-blue">in review</span>' : "") + "</span>" +
      (pezzi.length ? '<span class="tt2">' + pezzi.join(" · ") + "</span>" : "") + "</button>" +
    '<span class="tmeta">' +
      (o.noData ? "" : '<button class="tchip' + (late ? " late" : "") + (t.scadenza ? "" : " vuoto") + '" data-tdata="' + t.id + '" title="Cambia la scadenza">' + (late ? "in ritardo · " : "") + etichettaBreve(t.scadenza) + "</button>") +
      '<button class="tav" data-tchi="' + t.id + '" title="Chi la fa">' + (t.assegnato_id ? avatar(t.assegnato_id, 22) : '<span class="av vuoto" style="width:22px;height:22px;font-size:11px">?</span>') + "</button>" +
    "</span></div>";
}
function gruppoT(titolo, list, attr, o, cls) {
  if (!list.length) return "";
  return '<div class="card tgroup' + (cls ? " " + cls : "") + '"' + (attr || "") + '><div class="cardhead"><h2>' + titolo + '</h2><span class="faint">' + list.length + "</span></div>" +
    '<div class="tlist">' + list.map(function (t) { return rigaT(t, o); }).join("") + "</div></div>";
}
function vistaOggi(mie, tutte) {
  var ritardo = mie.filter(function (t) { return t.scadenza && t.scadenza < today(); }).sort(ordT);
  var oggi = mie.filter(function (t) { return t.scadenza === today(); }).sort(ordT);
  var senza = mie.filter(function (t) { return !t.scadenza; }).sort(ordT);
  var fatteOggi = tutte.filter(function (t) { return t.stato === "Fatto" && (t.completata_il || "").slice(0, 10) === today() && (TV.chi !== "io" || t.assegnato_id === me.pro_id); });
  var h = "";
  if (!ritardo.length && !oggi.length) h += '<div class="card"><div class="empty">' + (senza.length ? "Niente con scadenza oggi. Qui sotto quello che non ha ancora un giorno: trascinane una su «Oggi» o scrivila qui sopra." : "Niente per oggi. Scrivi qui sopra la prima cosa da fare, o guarda i prossimi giorni.") + "</div></div>";
  h += gruppoT("In ritardo", ritardo);
  h += '<div class="card tgroup mcol" data-giorno="' + today() + '"><div class="cardhead"><h2>Oggi</h2><span class="faint">' + oggi.length + "</span></div>" +
    '<div class="tlist">' + (oggi.length ? oggi.map(function (t) { return rigaT(t, { noData: true }); }).join("") : '<div class="tdrop">Trascina qui quello che vuoi fare oggi.</div>') + "</div></div>";
  h += gruppoT("Senza data", senza, ' data-quando="senza"', null, "mcol");
  if (fatteOggi.length) h += '<div class="card tgroup fatte"><div class="cardhead"><h2>Fatte oggi</h2><span class="faint">' + fatteOggi.length + "</span></div><div class=\"tlist\">" + fatteOggi.map(function (t) { return rigaT(t, { noData: true }); }).join("") + "</div></div>";
  return h;
}
function vistaProssimi(mie) {
  var h = "", tot = 0;
  for (var i = 1; i <= 14; i++) {
    var g = giornoPiu(i);
    var items = mie.filter(function (t) { return t.scadenza === g; }).sort(ordT);
    if (!items.length && i > 1) continue;
    tot += items.length;
    h += '<div class="card tgroup mcol" data-giorno="' + g + '"><div class="cardhead"><h2>' + etichettaGiorno(g) + (i === 1 ? ' <span class="sub">' + GG[new Date(g + "T12:00:00").getDay()] + " " + new Date(g + "T12:00:00").getDate() + "</span>" : "") + '</h2><span class="faint">' + items.length + "</span></div>" +
      '<div class="tlist">' + (items.length ? items.map(function (t) { return rigaT(t, { noData: true }); }).join("") : '<div class="tdrop">Niente per domani. Trascina qui, o scrivi sopra.</div>') + "</div></div>";
  }
  var dopo = mie.filter(function (t) { return t.scadenza && t.scadenza > giornoPiu(14); }).sort(ordT);
  tot += dopo.length;
  h += gruppoT("Più avanti", dopo);
  var senza = mie.filter(function (t) { return !t.scadenza; }).sort(ordT);
  h += gruppoT("Senza data", senza, ' data-quando="senza"', null, "mcol");
  if (!tot && !senza.length) h = '<div class="card"><div class="empty">Nessuna scadenza nei prossimi giorni.</div></div>' + h;
  return h;
}
function vistaTutte(aperte) {
  var list = aperte;
  if (TF.cerca) { var q = TF.cerca.toLowerCase(); list = list.filter(function (t) { return (t.titolo + " " + (t.descrizione || "")).toLowerCase().indexOf(q) > -1; }); }
  var h = '<div class="tcerca"><input id="tcerca" placeholder="Cerca fra le attività aperte…" value="' + esc(TF.cerca) + '"></div>';
  if (!list.length) return h + '<div class="card"><div class="empty">' + (TF.cerca ? "Niente con questo testo." : "Nessuna attività aperta.") + "</div></div>";
  var g = {}, nomi = {};
  list.forEach(function (t) {
    var k = t.progetto_id ? "p" + t.progetto_id : t.commessa_id ? "k" + t.commessa_id : t.cliente_id ? "c" + t.cliente_id : "z";
    (g[k] = g[k] || []).push(t);
    nomi[k] = t.progetto_id ? nameOf(D.prog, t.progetto_id) : t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") : t.cliente_id ? nameOf(D.cli, t.cliente_id) : "Senza progetto";
  });
  var ordine = Object.keys(g).sort(function (a, b) { if (a === "z") return 1; if (b === "z") return -1; return nomi[a].localeCompare(nomi[b]); });
  return h + ordine.map(function (k) {
    var t0 = g[k][0], k0 = t0.commessa_id ? by(D.com, t0.commessa_id) : null, cli0 = t0.cliente_id || (k0 && k0.cliente_id);
    var sotto = k !== "z" && k.charAt(0) !== "c" && cli0 ? '<span class="sub">' + lnkCli(cli0, "lnk mini2") + "</span>" : "";
    return '<div class="card tgroup"><div class="cardhead"><h2>' + esc(nomi[k]) + sotto + '</h2><span class="faint">' + g[k].length + "</span></div>" +
      '<div class="tlist">' + g[k].slice().sort(ordT).map(function (t) { return rigaT(t, { noProg: k.charAt(0) !== "z" && k.charAt(0) !== "c" }); }).join("") + "</div></div>";
  }).join("");
}
function vistaFatte(tutte) {
  var da = giornoPiu(-30);
  var list = tutte.filter(function (t) { return t.stato === "Fatto" && (t.completata_il || t.created_at || "").slice(0, 10) >= da && (TV.chi !== "io" || t.assegnato_id === me.pro_id); })
    .sort(function (a, b) { return (a.completata_il || "") < (b.completata_il || "") ? 1 : -1; });
  if (!list.length) return '<div class="card"><div class="empty">Niente di fatto negli ultimi 30 giorni.</div></div>';
  var g = {}, ord = [];
  list.forEach(function (t) { var k = (t.completata_il || "").slice(0, 10) || "—"; if (!g[k]) { g[k] = []; ord.push(k); } g[k].push(t); });
  return ord.map(function (k) { return gruppoT(k === "—" ? "Senza data" : etichettaGiorno(k), g[k], "", { noData: true }); }).join("");
}
/* Il pannello di lato: le cose che cambiano spesso, senza lasciare la lista */
function pannelloTask(id) {
  var t = by(D.task, id); if (!t) return "";
  var sub = D.task.filter(function (x) { return x.padre_id === t.id; }).sort(ordT);
  var comm = D.comm.filter(function (c) { return c.task_id === t.id; }).sort(function (a, b) { return (a.created_at || "") < (b.created_at || "") ? -1 : 1; });
  var fatto = t.stato === "Fatto";
  var k = t.commessa_id ? by(D.com, t.commessa_id) : null, cli = t.cliente_id || (k && k.cliente_id);
  return '<aside class="tpanel" id="tpanel">' +
    '<div class="tphead"><button class="ck' + (fatto ? " on" : "") + '" data-tck="' + t.id + '"></button>' +
    '<input class="tptit' + (fatto ? " done" : "") + '" data-qset="task|titolo|' + t.id + '" value="' + esc(t.titolo) + '">' +
    '<button class="tpx" data-tpanel-close="1" title="Chiudi (Esc)">✕</button></div>' +
    '<div class="tpbody">' +
    (cli || k ? '<div class="tpstrada">' + [cli ? lnkCli(cli, "lnk mini2") : "", k ? lnkCom(k.id, "lnk mini2") : "", t.progetto_id ? lnkProg(t.progetto_id, "lnk mini2") : ""].filter(Boolean).join(" · ") + "</div>" : "") +
    '<div class="tpgrid">' +
      '<div class="qfield"><label>Scadenza</label><input type="date" data-qset="task|scadenza|' + t.id + '" value="' + esc(t.scadenza || "") + '"></div>' +
      '<div class="qfield"><label>Chi la fa</label><select data-qset="task|assegnato_id|' + t.id + '"><option value="">— nessuno —</option>' + opt(D.pros, t.assegnato_id) + "</select></div>" +
      '<div class="qfield"><label>Progetto</label><select data-qset="task|progetto_id|' + t.id + '"><option value="">— nessuno —</option>' +
        progVisibili().map(function (p) { return '<option value="' + p.id + '"' + (t.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + " · " + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</option>"; }).join("") + "</select></div>" +
      '<div class="qfield"><label>Priorità</label><select data-qset="task|priorita|' + t.id + '">' + sel(["Bassa", "Media", "Alta"], t.priorita || "Media") + "</select></div>" +
      '<div class="qfield"><label>Stato</label><select data-qset="task|stato|' + t.id + '">' + sel(TASK_STATI, t.stato || "Da fare") + "</select></div>" +
      '<div class="qfield"><label>Ore stimate</label><input type="number" step="0.5" data-qset="task|stimate|' + t.id + '" value="' + (t.stimate == null ? "" : t.stimate) + '"></div>' +
    "</div>" +
    '<div class="qfield"><label>Note <span class="faint" id="tstat"></span></label><textarea id="tdesc" data-tid="' + t.id + '" rows="4" placeholder="Cosa va fatto, riferimenti, cosa serve. Si salva da solo.">' + esc(t.descrizione || "") + "</textarea></div>" +
    '<div class="tpsez"><h3>Sotto-attività <span class="faint">' + sub.filter(function (x) { return x.stato === "Fatto"; }).length + "/" + sub.length + "</span></h3>" +
      '<div class="tlist">' + sub.map(function (x) {
        return '<div class="trow' + (x.stato === "Fatto" ? " fatta" : "") + '"><button class="ck' + (x.stato === "Fatto" ? " on" : "") + '" data-tck="' + x.id + '"></button><button class="ttit" data-open-task="' + x.id + '">' + esc(x.titolo) + "</button>" +
          '<span class="tmeta">' + (x.scadenza ? '<span class="badge">' + etichettaBreve(x.scadenza) + "</span>" : "") + "</span></div>";
      }).join("") + "</div>" +
      '<form class="qadd" data-qadd-sub="' + t.id + '"><button class="ck" type="button" disabled></button><input name="titolo" placeholder="Aggiungi una sotto-attività" autocomplete="off"></form></div>' +
    '<div class="tpsez"><h3>Commenti <span class="faint">' + comm.length + "</span></h3>" +
      (comm.length ? '<ul class="timeline">' + comm.map(function (c) { return "<li>" + avatar(c.pro_id, 20) + " <b>" + esc(nameOf(D.pros, c.pro_id)) + "</b> · " + esc(c.testo || "") + '<div class="when">' + dt(c.created_at) + "</div></li>"; }).join("") + "</ul>" : "") +
      '<form class="qadd" data-comm-task="' + t.id + '"><input name="testo" placeholder="Scrivi un commento…" autocomplete="off"><button class="btn sm" type="submit">Invia</button></form></div>' +
    '<div class="tpfoot"><button class="lnk" data-route="attivita|' + t.id + '|">Scheda completa</button> · <button class="lnk" data-dupl-task="' + t.id + '">Duplica</button> · <button class="lnk" data-del="task:' + t.id + '">Elimina</button></div>' +
    "</div></aside>";
}
function vTask() {
  var vista = tab || "oggi";
  if (vista === "lista" || vista === "mie") vista = "tutte";
  var alt = ["bacheca", "calendario", "timeline"].indexOf(vista) > -1;
  var tutte = ftask();
  var aperte = tutte.filter(function (t) { return t.stato !== "Fatto"; });
  var mie = taskDiChi(aperte);
  var ritardo = mie.filter(function (t) { return t.scadenza && t.scadenza < today(); }).length;
  var oggi = mie.filter(function (t) { return t.scadenza === today(); }).length;
  var sub = (ritardo ? ritardo + " in ritardo · " : "") + oggi + " per oggi · " + mie.length + " aperte" + (TV.chi === "io" ? "" : " nello studio");
  var h = head("Attività", sub,
    '<span class="vtabs mini"><button data-tv="io" class="' + (TV.chi === "io" ? "on" : "") + '">Le mie</button><button data-tv="tutti" class="' + (TV.chi === "tutti" ? "on" : "") + '">Tutti</button></span>' +
    '<select class="altre" data-tvista="1"><option value="">Altre viste…</option><option value="bacheca">Bacheca</option><option value="calendario">Calendario</option><option value="timeline">Timeline</option><option value="modelli">Modelli di lavoro</option></select>' +
    '<button class="btn sm ghost" data-new="task">Nuova in dettaglio</button>');
  if (alt) {
    var list = taskFiltrate();
    h += barraTask(vista);
    if (vista === "bacheca") h += vistaBacheca(list);
    else if (vista === "calendario") h += vistaCalendarioTask(list);
    else h += vistaTimeline(list);
    return h;
  }
  var pross = mie.filter(function (t) { return t.scadenza && t.scadenza > today(); }).length;
  h += '<div class="vbar"><div class="vtabs">' + [["oggi", "Oggi", ritardo + oggi], ["prossimi", "Prossimi giorni", pross], ["tutte", "Tutte", mie.length], ["fatte", "Fatte", null]].map(function (v) {
    return '<button data-route="task|-|' + v[0] + '" class="' + (vista === v[0] ? "on" : "") + '">' + v[1] + (v[2] ? ' <span class="cnt">' + v[2] + "</span>" : "") + "</button>";
  }).join("") + "</div></div>";
  if (vista !== "fatte") h += scriviTask(vista, vista === "oggi" ? "Cosa devi fare oggi? Scrivi e premi Invio · «bozza sito Lucchi ven @Goffredo»" : vista === "prossimi" ? "Scrivi con il giorno · «call Borsari mer», «consegna 12/9»" : "Scrivi un\'attività e premi Invio · «#Sito Lucchi bozza home ven»");
  h += '<div class="tmain' + (PANEL ? " con-pannello" : "") + '">';
  if (vista === "oggi") h += vistaOggi(mie, tutte);
  else if (vista === "prossimi") h += vistaProssimi(mie);
  else if (vista === "fatte") h += vistaFatte(tutte);
  else h += vistaTutte(mie);
  h += "</div>";
  if (PANEL) h += pannelloTask(PANEL);
  return h;
}
/* popover piccolo, ancorato a un bottone: date rapide, persone */
function apriPop(anc, html) {
  chiudiPop();
  var p = document.createElement("div"); p.id = "pop"; p.className = "pop"; p.innerHTML = html;
  document.body.appendChild(p);
  var r = anc.getBoundingClientRect(), w = p.offsetWidth, hh = p.offsetHeight;
  var left = Math.min(r.left, window.innerWidth - w - 8), top = r.bottom + 6;
  if (top + hh > window.innerHeight - 8) top = Math.max(8, r.top - hh - 6);
  p.style.left = Math.max(8, left) + "px"; p.style.top = top + "px";
}
function chiudiPop() { var p = el("#pop"); if (p) p.remove(); }
function popData(t) {
  var lun = giornoPiu(((8 - new Date(today() + "T12:00:00").getDay()) % 7) || 7);
  return '<div class="popt">Scadenza</div>' +
    '<button data-tset="' + t.id + '|scadenza|' + today() + '">Oggi</button>' +
    '<button data-tset="' + t.id + '|scadenza|' + giornoPiu(1) + '">Domani</button>' +
    '<button data-tset="' + t.id + '|scadenza|' + lun + '">Lunedì prossimo</button>' +
    '<button data-tset="' + t.id + '|scadenza|' + giornoPiu(7) + '">Fra una settimana</button>' +
    '<button data-tset="' + t.id + '|scadenza|">Nessuna data</button>' +
    '<input type="date" data-tsetdate="' + t.id + '" value="' + esc(t.scadenza || "") + '">';
}
function popChi(t) {
  return '<div class="popt">Chi la fa</div>' + D.pros.map(function (p) {
    return '<button data-tset="' + t.id + '|assegnato_id|' + p.id + '"' + (t.assegnato_id === p.id ? ' class="on"' : "") + ">" + avatar(p.id, 20) + " " + esc(p.nome) + "</button>";
  }).join("") + '<button data-tset="' + t.id + '|assegnato_id|">Nessuno</button>';
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
  if (r.error) { toast(erroreUmano(r.error), true); return; }
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
    (prog ? lnkProg(prog.id) + " · " : "") + (com ? lnkCli(com.cliente_id) + " · " + lnkCom(com.id) : "attività personale") + "</span></h1><div class=\"tools\">" +
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

  h += '<div class="card"><div class="cardhead"><h2>Allegati</h2><button class="btn sm ghost" data-link="' + ctxAll(t.commessa_id, t.progetto_id, t.lavorazione_id, t.id) + '">+ Link</button></div>';
  h += tabellaAllegati(files, { tipo: false });
  h += zonaAllegati(ctxAll(t.commessa_id, t.progetto_id, t.lavorazione_id, t.id));
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
  var h = head("Le tue ore", "Il tuo registro ore: lo vedi solo tu, serve a te per tararti e per i clienti gestiti a ore", '<button class="btn sm" data-new="ore">+ Registra ore</button>');
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
    h += "<tr><td>" + esc(l.nome) + '<div class="faint">' + lnkProg(l.progetto_id, "lnk mini2") + " · " + lnkCom(l.commessa_id, "lnk mini2") + "</div></td>";
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
          '</td><td class="num">' + num(daFatt[k].ore, 1) + '</td><td class="num">' + eur(daFatt[k].val) + '</td><td class="num"><button class="lnk" data-open-com="' + k + '">Apri</button></td></tr>';
      }).join("") + '</tbody></table><p class="faint" style="margin-top:10px">Il promemoria di cosa hai da fatturare: la fattura vera la fai col tuo gestionale fiscale.</p></div>';
  }

  h += '<div class="grid g32" style="margin-top:18px"><div class="card"><div class="cardhead"><h2>Ritmo delle ultime 12 settimane</h2><span class="faint">ogni quadratino è un giorno</span></div>' + heatOre(list) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Andamento</h2><span class="faint">8 settimane</span></div>' + graficoOre(settimane(list, 8), ettSettimane(8)) + "</div></div>";

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
  var com = fcom(), cli = fcli();
  var d = new Date(), anno = d.getFullYear();
  var aperte = com.filter(function (k) { return ["Inviato", "Accettato"].indexOf(k.stato) > -1; });
  var inviati = com.filter(function (k) { return k.stato === "Inviato"; });
  var vinti = com.filter(function (k) { return STATI_VINTI.indexOf(k.stato) > -1; });
  var persi = com.filter(function (k) { return k.stato === "Perso"; });
  var tassoVinc = (vinti.length + persi.length) ? Math.round(vinti.length / (vinti.length + persi.length) * 100) : null;
  var pagMiei = D.pag.filter(function (p) { return can(p.commessa_id); });
  var incassato = sum(pagMiei.filter(function (p) { return p.stato === "Incassato" && String(p.pagato_il || p.scadenza || "").slice(0, 4) === String(anno); }), function (p) { return p.importo; });
  var pagAperti = pagMiei.filter(function (p) { return p.stato !== "Incassato"; });
  var daIncassare = sum(pagAperti, function (p) { return p.importo; });
  var scadute = pagAperti.filter(function (p) { return p.scadenza && p.scadenza < today(); });
  var h = head("Quadro amministrativo", "Clienti, preventivi e denaro: il tuo, solo il tuo",
    '<button class="btn sm ghost" data-new="cli">+ Cliente</button><button class="btn sm" data-new="com">+ Preventivo</button>');
  h += '<div class="grid g4">' +
    kpi(eur(incassato), "Incassato " + anno, pagMiei.filter(function (p) { return p.stato === "Incassato"; }).length + " scadenze saldate") +
    kpi(eur(daIncassare), "Da incassare", scadute.length ? scadute.length + " già scadute" : "nessuna scaduta") +
    kpi(eur(sum(aperte, valore)), "Preventivi in gioco", aperte.length + " in attesa di risposta") +
    kpi(tassoVinc == null ? "—" : tassoVinc + " %", "Preventivi vinti", vinti.length + " vinti · " + persi.length + " persi") + "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Da incassare</h2><button class="btn sm ghost" data-go="analisi">Analisi cliente</button></div>';
  var apertiPag = pagAperti.slice().sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; });
  h += apertiPag.length ? '<table><thead><tr><th>Voce</th><th>Cliente</th><th>Scadenza</th><th class="num">Importo</th><th class="num"></th></tr></thead><tbody>' +
    apertiPag.slice(0, 10).map(function (p) {
      var k = by(D.com, p.commessa_id);
      var late = p.scadenza && p.scadenza < today();
      return "<tr><td>" + esc(p.nome) + '<div class="faint">' + esc(k ? k.titolo : "") + "</div></td><td>" + esc(k ? nameOf(D.cli, k.cliente_id) : "—") + "</td><td>" +
        (late ? '<span class="badge b-red">' + dt(p.scadenza) + "</span>" : dt(p.scadenza)) + '</td><td class="num">' + eur(p.importo) +
        '</td><td class="num"><button class="lnk" data-incassa="' + p.id + '">Incassato</button></td></tr>';
    }).join("") + "</tbody></table>" : vuoto("Niente da incassare.");
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Preventivi da seguire</h2><button class="btn sm ghost" data-go="commesse">Tutti</button></div>';
  h += inviati.length ? '<div class="checklist">' + inviati.map(function (k) {
    var g = days(today(), k.created_at ? String(k.created_at).slice(0, 10) : today());
    return '<div class="cri"><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button><span class=\"faint\"> · " + esc(nameOf(D.cli, k.cliente_id)) + " · " + eur(valore(k)) + (g > 7 ? ' · <b class="neg">inviato ' + g + " giorni fa</b>" : "") + "</span></div>";
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

/* ---------------- figure professionali ----------------
   Il database sa che mestiere fai. Non per etichettarti, ma perché un fotografo
   e un avvocato non usano lo stesso gestionale: uno vende servizi e giornate,
   l'altro pratiche e ore; uno apre sopralluogo-shooting-selezione, l'altro
   colloquio-studio-atto-udienze. La figura porta con sé quattro cose: l'unità
   con cui vende, il modo in cui misura il lavoro, le voci tipiche del suo
   listino e le attività tipo di un suo lavoro. Nessun mestiere è escluso: se
   manca, si aggiunge al catalogo e da lì in poi vale per tutti. */
function professione(pid) { return pid ? by(D.prof, pid) : null; }
/* Le attività tipo si scrivono come si scriverebbero su un foglio: una per riga,
   e dopo i due punti le ore. Nessuno deve imparare una sintassi per dire
   "sopralluogo, quattro ore". */
function attivitaTxt(arr) {
  return (arr || []).map(function (a) {
    var n = a.n || a.nome || "";
    var o = a.o == null ? a.ore : a.o;
    return o == null || o === "" ? n : n + " : " + o;
  }).join("\n");
}
function attivitaDaTxt(txt) {
  return String(txt || "").split("\n").map(function (r) { return r.trim(); }).filter(Boolean).map(function (r) {
    var i = r.lastIndexOf(":");
    if (i < 0) return { n: r, o: null };
    var ore = r.slice(i + 1).trim().replace(",", ".");
    if (!ore || isNaN(+ore)) return { n: r, o: null };
    return { n: r.slice(0, i).trim(), o: +ore };
  }).filter(function (a) { return a.n; });
}
function miaFigura() { return figuraDi(me.pro_id); }
function figureAttive() { return D.prof.filter(function (f) { return f.attiva !== false; }); }
function quantiCon(pid) { return D.pros.filter(function (x) { return x.professione_id === pid; }).length; }
function MISURA_ET(m) {
  return { ore: "a ore", progetto: "a progetto", quantita: "a quantità", ricorrente: "a canone" }[m] || "a progetto";
}
/* La tendina delle figure, raggruppata per famiglia: cercare "Fabbro" fra
   novantotto voci in fila non è cercare, è frugare. */
function optProf(val) {
  var g = {};
  figureAttive().forEach(function (f) { (g[f.categoria] = g[f.categoria] || []).push(f); });
  return '<option value="">— nessuna figura —</option>' + Object.keys(g).sort().map(function (c) {
    return '<optgroup label="' + esc(c) + '">' + g[c].map(function (f) {
      return '<option value="' + f.id + '"' + (val === f.id ? " selected" : "") + ">" + esc(f.nome) + "</option>";
    }).join("") + "</optgroup>";
  }).join("");
}
function schedaFigura(f, aperta) {
  var att = f.attivita || [], sv = f.servizi || [], n = quantiCon(f.id);
  var h = '<div class="figc' + (aperta ? " ap" : "") + '"><button class="figt" data-fig="' + f.id + '"><b>' + esc(f.nome) + "</b>" +
    '<span class="faint">' + esc(f.unita) + " · " + MISURA_ET(f.misura) + "</span>" +
    (n ? '<span class="cnt">' + n + "</span>" : "") + '<em class="chev"></em></button>';
  if (aperta) {
    h += '<div class="figb"><div class="grid g2">' +
      '<div><div class="glab">Attività tipo di un suo lavoro</div><ol class="fontil">' +
      (att.length ? att.map(function (a) { return "<li>" + esc(a.n || a.nome) + (a.o ? ' <span class="faint">' + a.o + " h</span>" : "") + "</li>"; }).join("") : "<li class=\"faint\">Ancora nessuna</li>") +
      "</ol></div>" +
      '<div><div class="glab">Voci tipiche del suo listino</div><ul class="fontil">' +
      (sv.length ? sv.map(function (x) { return "<li>" + esc(x.n || x.nome) + ' <span class="faint">/ ' + esc(x.u || x.unita || "") + "</span></li>"; }).join("") : "<li class=\"faint\">Ancora nessuna</li>") +
      "</ul></div></div>";
    var chi = D.pros.filter(function (x) { return x.professione_id === f.id; });
    if (chi.length) h += '<div class="glab" style="margin-top:10px">Nello studio</div><div class="checklist">' +
      chi.map(function (x) { return '<div class="cri">' + avatar(x.id, 20) + ' <button class="lnk" data-open-pro="' + x.id + '">' + esc(x.nome) + "</button></div>"; }).join("") + "</div>";
    if (miaFigura() && miaFigura().id === f.id) h += '<p class="faint" style="margin-top:10px">È la tua figura: da qui arrivano le attività che nascono quando un tuo preventivo viene accettato.</p>';
    h += "</div>";
  }
  return h + "</div>";
}
var FIGAP = null;
function vProfessioni() {
  var f = FS.prof || (FS.prof = { cat: "", cerca: "" });
  var q = (f.cerca || "").toLowerCase();
  var list = figureAttive().filter(function (x) {
    if (f.cat && x.categoria !== f.cat) return false;
    if (!q) return true;
    var testo = x.nome + " " + x.categoria + " " + (x.servizi || []).map(function (s) { return s.n; }).join(" ") + " " + (x.attivita || []).map(function (a) { return a.n; }).join(" ");
    return testo.toLowerCase().indexOf(q) > -1;
  });
  var mia = miaFigura();
  var h = crumbs([["Profilo"], ["Il mio profilo", "profilo"], ["Figure professionali"]]) +
    '<div class="top"><h1>Figure professionali<span class="sub">' + D.prof.length + " mestieri nel catalogo · " + D.pros.filter(function (x) { return x.professione_id; }).length + ' colleghi collegati a una figura</span></h1><div class="tools">' +
    (mia ? '<span class="badge b-terra">la tua: ' + esc(mia.nome) + "</span>" : '<button class="btn sm" data-edit="pros:' + (me.pro_id || "") + '">Scegli la tua</button>') + "</div></div>";
  h += '<p class="faint" style="margin:-4px 0 14px">Il catalogo è aperto: qui dentro c\'è il mestiere di chiunque, dall\'architetto al tappezziere. Ogni figura porta con sé la sua unità di misura, le voci tipiche del suo listino e le attività che aprono un suo lavoro. È da qui che il gestionale capisce come lavori.</p>';
  h += barraViste(null, "", "professioni",
    fcerca("prof", "Cerca un mestiere, un servizio, un'attività…") +
    fsel("prof", "cat", [["", "Ogni famiglia"]].concat(elencoCat(D.prof, "categoria"))) +
    (f.cat || f.cerca ? '<button class="lnk mini" data-f-reset="prof">azzera</button>' : ""));
  if (!list.length) return h + '<div class="card">' + vuoto("Nessuna figura con questi filtri.", '<button class="lnk" data-f-reset="prof">Azzera</button>') + "</div>";
  var g = {};
  list.forEach(function (x) { (g[x.categoria] = g[x.categoria] || []).push(x); });
  Object.keys(g).sort().forEach(function (c) {
    h += '<div class="card"><div class="cardhead"><h2>' + esc(c) + '</h2><span class="faint">' + g[c].length + " figure</span></div>" +
      g[c].map(function (x) { return schedaFigura(x, FIGAP === x.id); }).join("") + "</div>";
  });
  return h;
}
/* Il listino tipo della tua figura: un clic e le voci entrano nel tuo listino,
   con la tua unità di misura già a posto. I prezzi li metti tu: nessuno può
   sapere quanto vale il tuo lavoro. */
async function prendiListino() {
  var f = miaFigura();
  if (!f) { toast("Prima scegli la tua figura professionale dal profilo", true); return; }
  var gia = D.serv.filter(function (s) { return s.pro_id === me.pro_id; }).map(function (s) { return s.nome; });
  var nuovi = (f.servizi || []).filter(function (x) { return gia.indexOf(x.n || x.nome) < 0; }).map(function (x) {
    return { pro_id: me.pro_id, professione_id: f.id, nome: x.n || x.nome, cat: f.categoria,
      unita: x.u || x.unita || f.unita, tipo_unita: "Forfait", attivo: true, min_qty: 1 };
  });
  if (!nuovi.length) { toast("Il tuo listino ha già tutte le voci tipiche"); return; }
  var r = await sb.from("servizi").insert(nuovi);
  if (r.error) { toast(erroreUmano(r.error), true); return; }
  await reload(["serv"]);
  toast("Aggiunte " + nuovi.length + " voci: ora mettici i tuoi prezzi");
  render();
}

/* ---------------- la parte viva dello studio ----------------
   Un collettivo non è un elenco di partite IVA che condividono un logo. È gente
   che si parla, che si passa lavoro, che una sera fa un workshop. Questa parte
   del CRM non serve a fatturare: serve a far esistere lo studio anche quando
   nessuno ha un preventivo aperto. Sta su un piano tutto suo — nessun cliente
   entra qui, e nessun dato di lavoro esce di qua. */
function proNome(id) { return id ? nameOf(D.pros, id) : "Qualcuno"; }
function quando(iso) {
  if (!iso) return "";
  var d = new Date(iso), m = (Date.now() - d.getTime()) / 60000;
  if (m < 1) return "adesso";
  if (m < 60) return Math.floor(m) + " min fa";
  if (m < 24 * 60) return Math.floor(m / 60) + " h fa";
  if (m < 48 * 60) return "ieri";
  return dt(iso.slice(0, 10));
}
function oraIt(t) { return t ? String(t).slice(0, 5) : ""; }
function rispDi(pid) { return D.risp.filter(function (r) { return r.post_id === pid; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }); }
function reazDi(pid) { return D.reaz.filter(function (r) { return r.post_id === pid; }); }
function hoReagito(pid) { return D.reaz.some(function (r) { return r.post_id === pid && r.pro_id === me.pro_id; }); }
function postOrdinati() {
  return D.post.slice().sort(function (a, b) {
    if (!!a.fissato !== !!b.fissato) return a.fissato ? -1 : 1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}
var POSTAP = null;
var POSTTIPI = ["Messaggio", "Annuncio", "Domanda", "Vittoria"];
function scrivi(dove) {
  return '<form class="scrivi" data-post="' + (dove || "studio") + '">' +
    (me.pro_id ? avatar(me.pro_id, 34) : "") +
    '<div class="scrivic"><textarea name="testo" rows="2" placeholder="Che si dice? Un annuncio, una domanda ai colleghi, una cosa andata bene…" required></textarea>' +
    '<div class="scrivib"><select name="tipo">' + sel(POSTTIPI, "Messaggio") + "</select>" +
    '<button class="btn sm" type="submit">Pubblica</button></div></div></form>';
}
function unPost(p, compatto) {
  var rr = rispDi(p.id), rz = reazDi(p.id), mio = p.pro_id === me.pro_id;
  var h = '<div class="post' + (p.fissato ? " fisso" : "") + '">' +
    '<div class="posth">' + avatar(p.pro_id, 32) +
    '<div><b>' + esc(proNome(p.pro_id)) + "</b>" +
    '<span class="faint">' + esc(quando(p.created_at)) + (p.tipo && p.tipo !== "Messaggio" ? " · " + esc(p.tipo.toLowerCase()) : "") + (p.fissato ? " · in evidenza" : "") + "</span></div>" +
    (mio || puo("studio") ? '<span class="postaz"><button class="lnk mini" data-postfix="' + p.id + '">' + (p.fissato ? "togli" : "fissa") + '</button><button class="lnk mini" data-postvia="' + p.id + '">elimina</button></span>' : "") +
    "</div>";
  h += '<p class="postt">' + esc(p.testo).replace(/\n/g, "<br>") + "</p>";
  h += '<div class="postp"><button class="lnk mini' + (hoReagito(p.id) ? " on" : "") + '" data-postlike="' + p.id + '">' +
    (hoReagito(p.id) ? "★" : "☆") + " " + (rz.length || "") + '</button><button class="lnk mini" data-postap="' + p.id + '">' +
    (rr.length ? rr.length + (rr.length === 1 ? " risposta" : " risposte") : "rispondi") + "</button></div>";
  if (!compatto && (POSTAP === p.id || rr.length)) {
    h += '<div class="postr">' + rr.map(function (r) {
      return '<div class="rispo">' + avatar(r.pro_id, 22) + '<div><b>' + esc(proNome(r.pro_id)) + '</b> <span class="faint">' + esc(quando(r.created_at)) + "</span><br>" + esc(r.testo).replace(/\n/g, "<br>") + "</div></div>";
    }).join("");
    if (POSTAP === p.id) h += '<form class="qadd" data-risp="' + p.id + '"><input name="testo" placeholder="Scrivi una risposta…" autocomplete="off" required><button class="btn sm" type="submit">Invia</button></form>';
    h += "</div>";
  }
  return h + "</div>";
}
/* ---- eventi e workshop ---- */
function agendaFutura() {
  var og = today();
  return D.ag.filter(function (e) { return (e.data || "") >= og; }).sort(function (a, b) { return (a.data + (a.ora || "")) < (b.data + (b.ora || "")) ? -1 : 1; });
}
function agendaPassata() {
  var og = today();
  return D.ag.filter(function (e) { return (e.data || "") < og; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
}
function iscrittiA(eid) { return D.iscr.filter(function (i) { return i.agenda_id === eid && i.stato !== "Non ci sono"; }); }
function miaIscrizione(eid) { return D.iscr.filter(function (i) { return i.agenda_id === eid && i.pro_id === me.pro_id; })[0]; }
function unEvento(e, compatto) {
  var isc = iscrittiA(e.id), mia = miaIscrizione(e.id);
  var pieno = e.posti && isc.length >= e.posti && (!mia || mia.stato === "Non ci sono");
  var h = '<div class="ev1"><div class="evd"><b>' + esc(dshort(e.data)) + "</b><span>" + esc(oraIt(e.ora) || "—") + "</span></div>" +
    '<div class="evc"><div class="evt"><b>' + esc(e.titolo) + '</b><span class="badge ' + (e.tipo === "Workshop" ? "b-terra" : e.tipo === "Formazione" ? "b-blue" : "") + '">' + esc(e.tipo) + "</span></div>" +
    '<div class="faint">' + [e.luogo || (e.spazio_id ? nameOf(D.spazi, e.spazio_id) : ""), e.relatore_id ? "con " + proNome(e.relatore_id) : "", e.posti ? isc.length + " su " + e.posti + " posti" : isc.length ? isc.length + " partecipanti" : ""].filter(Boolean).join(" · ") + "</div>";
  if (!compatto && e.descrizione) h += '<p class="evx">' + esc(e.descrizione).replace(/\n/g, "<br>") + "</p>";
  if (!compatto && isc.length) h += '<div class="evi">' + isc.slice(0, 12).map(function (i) { return avatar(i.pro_id, 22); }).join("") + "</div>";
  h += '<div class="evb">' +
    (mia && mia.stato === "Ci sono"
      ? '<span class="badge b-green">ci sei</span><button class="lnk mini" data-evno="' + e.id + '">non ci sono più</button>'
      : pieno ? '<span class="badge b-amber">posti esauriti</span>'
      : '<button class="btn sm ghost" data-evsi="' + e.id + '">Ci sono</button>') +
    (e.pro_id === me.pro_id || puo("studio") ? '<button class="lnk mini" data-edit="ag:' + e.id + '">modifica</button>' : "") +
    "</div></div></div>";
  return h;
}
function vEventi() {
  var fut = agendaFutura(), pas = agendaPassata();
  var quali = tab || "prossimi";
  var h = head("Eventi e workshop", fut.length + " in arrivo · " + pas.length + " già fatti",
    '<button class="btn sm" data-new="ag">+ Organizza qualcosa</button>');
  h += '<p class="faint" style="margin:-4px 0 14px">Riunioni, workshop, formazione, aperitivi. Chi organizza scrive qui, gli altri dicono se ci sono. È il calendario dello studio, non quello dei clienti.</p>';
  h += barraViste([["prossimi", "In arrivo", fut.length], ["passati", "Già fatti", pas.length]], quali, "eventi", "");
  var list = quali === "passati" ? pas : fut;
  if (!list.length) return h + '<div class="card">' + vuoto(quali === "passati" ? "Ancora niente alle spalle." : "Niente in programma. Organizza tu la prima cosa.", '<button class="lnk" data-new="ag">Organizza qualcosa</button>') + "</div>";
  var mesi = {};
  list.forEach(function (e) { (mesi[String(e.data).slice(0, 7)] = mesi[String(e.data).slice(0, 7)] || []).push(e); });
  Object.keys(mesi).sort(function (a, b) { return quali === "passati" ? (a < b ? 1 : -1) : (a < b ? -1 : 1); }).forEach(function (m) {
    h += '<div class="card"><div class="cardhead"><h2>' + esc(meseEt(m)) + '</h2><span class="faint">' + mesi[m].length + "</span></div>" +
      mesi[m].map(function (e) { return unEvento(e); }).join("") + "</div>";
  });
  return h;
}
function meseEt(ym) {
  var p = String(ym).split("-");
  return (MESI_IT[+p[1] - 1] || "").replace(/^./, function (c) { return c.toUpperCase(); }) + " " + p[0];
}
/* ---- chat a canali ---- */
function msgDi(cid) { return D.msg.filter(function (m) { return m.canale_id === cid; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }); }
function nonLetti(cid) {
  var l = D.lett.filter(function (x) { return x.canale_id === cid && x.pro_id === me.pro_id; })[0];
  var da = l ? l.letto_il : "";
  return D.msg.filter(function (m) { return m.canale_id === cid && m.pro_id !== me.pro_id && (!da || m.created_at > da); }).length;
}
function nonLettiTot() { return D.can.reduce(function (n, c) { return n + nonLetti(c.id); }, 0); }
function canaleCorrente() {
  var c = current && by(D.can, current);
  if (c) return c;
  return D.can.slice().sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); })[0] || null;
}
function vChat() {
  var c = canaleCorrente();
  var h = head("Chat dello studio", D.can.length + " canali · " + D.msg.length + " messaggi",
    (puo("studio") ? '<button class="btn sm ghost" data-new="can">+ Nuovo canale</button>' : ""));
  if (!c) return h + '<div class="card">' + vuoto("Nessun canale ancora.") + "</div>";
  h += '<div class="chatw"><div class="chatl">' + D.can.slice().sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); }).map(function (x) {
    var n = nonLetti(x.id);
    return '<button class="' + (x.id === c.id ? "on" : "") + '" data-route="chat|' + x.id + '|"># ' + esc(x.nome) + (n ? '<span class="cnt">' + n + "</span>" : "") + "</button>";
  }).join("") + "</div><div class=\"chatm\"><div class=\"chatmh\"><b># " + esc(c.nome) + "</b><span class=\"faint\">" + esc(c.descrizione || "") + "</span></div>";
  var mm = msgDi(c.id);
  h += '<div class="chatms">' + (mm.length ? mm.slice(-60).map(function (m) {
    return '<div class="msg' + (m.pro_id === me.pro_id ? " mio" : "") + '">' + avatar(m.pro_id, 26) +
      '<div><b>' + esc(proNome(m.pro_id)) + '</b> <span class="faint">' + esc(quando(m.created_at)) + "</span><br>" + esc(m.testo).replace(/\n/g, "<br>") + "</div></div>";
  }).join("") : '<p class="faint" style="padding:20px">Ancora nessun messaggio. Comincia tu.</p>') + "</div>";
  h += '<form class="qadd" data-msg="' + c.id + '"><input name="testo" placeholder="Scrivi in #' + esc(c.nome) + '…" autocomplete="off" required><button class="btn sm" type="submit">Invia</button></form>';
  return h + "</div></div>";
}

/* ---------------- bacheca dello studio ---------------- */
/* La prima cosa che vedi dello studio non sono i numeri: è cosa succede. Chi ha
   scritto, cosa c'è in calendario, chi sta parlando in chat. I numeri vengono
   dopo, perché servono, ma non sono la ragione per cui si sta insieme. */
function vStudio() {
  var attivi = D.pros.filter(function (x) { return x.vetting !== "Sospeso"; });
  var fut = agendaFutura();
  var wk = fut.filter(function (e) { return e.tipo === "Workshop" || e.tipo === "Formazione"; });
  var nl = nonLettiTot();
  var settimana = iso(new Date(Date.now() + 7 * 86400000));
  var conFigura = D.pros.filter(function (x) { return x.professione_id; }).length;

  var h = head("Lo studio", attivi.length + " persone · " + D.post.length + " messaggi in bacheca · " + fut.length + " cose in calendario",
    '<button class="btn sm ghost" data-go="chat">Chat' + (nl ? " (" + nl + ")" : "") + '</button>' +
    '<button class="btn sm" data-new="ag">+ Organizza qualcosa</button>');
  h += '<div class="grid g4">' +
    kpi(String(attivi.length), "Siamo in", conFigura + " con una figura professionale") +
    kpi(String(fut.filter(function (e) { return e.data <= settimana; }).length), "Questa settimana", fut.length + " cose in calendario in tutto") +
    kpi(String(wk.length), "Workshop e formazione", wk.length ? "il prossimo " + dshort(wk[0].data) : "niente in programma") +
    kpi(String(nl), "Messaggi da leggere", D.can.length + " canali aperti") + "</div>";

  h += '<div class="grid g32" style="margin-top:16px"><div>';
  /* la bacheca */
  h += '<div class="card"><div class="cardhead"><h2>Bacheca</h2><span class="faint">quello che ci diciamo</span></div>';
  h += scrivi("studio");
  var pp = postOrdinati();
  h += pp.length ? '<div class="posts">' + pp.slice(0, 12).map(function (p) { return unPost(p); }).join("") + "</div>"
    : vuoto("Ancora niente in bacheca. Scrivi tu la prima cosa: un annuncio, una domanda, un lavoro andato bene.");
  h += "</div>";
  /* cosa sanno fare i colleghi */
  h += '<div class="card"><div class="cardhead"><h2>Cosa sanno fare i colleghi</h2><button class="btn sm ghost" data-go="professioni">Per mestiere</button></div>';
  var cats = {};
  D.serv.filter(function (s) { return s.attivo !== false && s.pro_id !== me.pro_id; }).forEach(function (s) { (cats[s.cat || "Altro"] = cats[s.cat || "Altro"] || []).push(s); });
  var ck = Object.keys(cats).sort();
  h += ck.length ? ck.map(function (c) {
    return '<div style="margin-bottom:14px"><div class="glab" style="margin-bottom:6px">' + esc(c) + "</div>" + cats[c].slice(0, 6).map(function (s) {
      return '<div class="cri"><b>' + esc(s.nome) + '</b><span class="faint"> · ' + esc(nameOf(D.pros, s.pro_id)) + " · " + eur(s.prezzo) + (s.unita ? " / " + esc(s.unita) : "") + "</span></div>";
    }).join("") + "</div>";
  }).join("") : vuoto("Nessun servizio dei colleghi, per ora.");
  h += "</div></div><div>";

  /* in calendario */
  h += '<div class="card"><div class="cardhead"><h2>In calendario</h2><button class="btn sm ghost" data-go="eventi">Tutti</button></div>';
  h += fut.length ? fut.slice(0, 5).map(function (e) { return unEvento(e, true); }).join("")
    : vuoto("Niente in programma.", '<button class="lnk" data-new="ag">Organizza qualcosa</button>');
  h += "</div>";
  /* la chat, di sbieco */
  var ultimi = D.msg.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 4);
  h += '<div class="card"><div class="cardhead"><h2>In chat</h2><button class="btn sm ghost" data-go="chat">Apri' + (nl ? " (" + nl + ")" : "") + "</button></div>";
  h += ultimi.length ? '<div class="checklist">' + ultimi.map(function (m) {
    var c = by(D.can, m.canale_id);
    return '<div class="cri">' + avatar(m.pro_id, 20) + " <b>" + esc(proNome(m.pro_id)) + '</b> <span class="faint">in #' + esc(c ? c.nome : "?") + " · " + esc(quando(m.created_at)) + "</span><div>" + esc(m.testo.slice(0, 90)) + (m.testo.length > 90 ? "…" : "") + "</div></div>";
  }).join("") + "</div>" : vuoto("Nessun messaggio ancora.");
  h += "</div>";
  /* chi c'è */
  h += '<div class="card"><div class="cardhead"><h2>Chi c\'è</h2><button class="btn sm ghost" data-go="pool">Tutti</button></div>';
  h += '<div class="checklist">' + attivi.slice(0, 10).map(function (x) {
    var f = x.professione_id ? by(D.prof, x.professione_id) : null;
    return '<div class="cri">' + avatar(x.id, 22) + ' <button class="lnk" data-open-pro="' + x.id + '">' + esc(x.nome) + '</button><span class="faint"> · ' + esc(f ? f.nome : (x.ruolo || "—")) + "</span></div>";
  }).join("") + "</div></div>";
  /* fornitori e spazi, dove sono sempre stati */
  h += '<div class="card"><div class="cardhead"><h2>Fornitori</h2><button class="btn sm ghost" data-go="fornitori">Tutti</button></div>';
  h += D.forn.length ? '<div class="checklist">' + D.forn.slice(0, 5).map(function (f) {
    return '<div class="cri"><b>' + esc(f.nome) + '</b><span class="faint"> · ' + esc(f.categoria || "—") + "</span></div>";
  }).join("") + "</div>" : vuoto("Nessun fornitore segnalato.", '<button class="lnk" data-new="forn">Segnalane uno</button>');
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Spazi</h2><button class="btn sm ghost" data-go="spazi">Prenota</button></div>';
  h += D.spazi.length ? '<div class="checklist">' + D.spazi.map(function (x) {
    return '<div class="cri"><b>' + esc(x.nome) + '</b><span class="faint"> · ' + esc(x.stato || "—") + "</span></div>";
  }).join("") + "</div>" : vuoto("Nessuno spazio ancora.");
  h += "</div></div></div>";

  h += '<div class="card" style="background:var(--cream);margin-top:16px"><div class="cardhead"><h2>Cosa resta tuo</h2><span class="badge">applicato dal database</span></div>' +
    '<p class="faint">Clienti, preventivi, pagamenti, ore e tariffe stanno dentro il tuo spazio: nessun collega li vede, nemmeno chi cura le aree comuni. ' +
    'Un collega entra solo nel singolo lavoro in cui lo coinvolgi. Questa pagina è l\'altro piano dell\'edificio: qui c\'è solo quello che è di tutti, e nessun cliente ci mette piede.</p></div>';
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
    return (r.assegnato_id === me.pro_id || (s && s.pro_id === me.pro_id)) && k && ["Accettato"].indexOf(k.stato) > -1;
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
      var att = com.filter(function (k) { return ["Accettato"].indexOf(k.stato) > -1; });
      return '<div class="card pcard" data-route="cliente|' + c.id + '|anagrafica">' +
        '<div class="cardhead"><h2>' + esc(c.nome) + '</h2><span class="badge ' + (c.stato === "Attivo" ? "b-green" : c.stato === "Lead" ? "b-amber" : "") + '">' + esc(c.stato || "Lead") + "</span></div>" +
        '<p class="faint">' + esc(c.settore || "—") + (c.referente ? " · " + esc(c.referente) : "") + "</p>" +
        "<table><tbody>" + row2("Preventivi", com.length + (att.length ? " · " + att.length + " attivi" : "")) +
        row2("Valore", eur(valoreCliente(c.id))) + row2("Chi lo segue", esc(nameOf(D.pros, c.owner_id))) + "</tbody></table></div>";
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

  var h = crumbs([[gruppoDi("clienti") || "Clienti"], ["Clienti", "clienti"], [c.nome]]);
  h += '<div class="top"><h1>' + esc(c.nome) + '<span class="sub">' + esc(c.settore || "—") + " · " + esc(c.stato || "Lead") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="clienti">← Clienti</button>' +
    '<button class="btn sm ghost" data-anadi="' + c.id + '">Analisi online</button>' +
    '<button class="btn sm ghost" data-edit="cli:' + c.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-new="inter" data-ctx-cli="' + c.id + '">+ Nota</button>' +
    '<button class="btn sm ghost" data-new="prog" data-ctx-cli="' + c.id + '">+ Progetto</button>' +
    '<button class="btn sm" data-new="com" data-ctx-cli="' + c.id + '">+ Preventivo</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(valoreCliente(c.id)), "Valore totale", com.length + " preventivi") +
    kpi(eur(sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; })), "Incassato", eur(sum(pg.filter(function (p) { return p.stato !== "Incassato"; }), function (p) { return p.importo; })) + " da incassare") +
    kpi(String(inter.length), "Interazioni", inter[0] ? "ultima " + dt(inter[0].data) : "—") +
    kpi(pl ? (pl.attivo ? "Attivo" : "Sospeso") : accesso ? "Con account" : "No", "Accesso al portale", pl ? (pl.ha_pwd ? "link con password" : "manca la password") : accesso ? esc(accesso.email || "") : "nessun accesso") + "</div>";

  var prg = progOfCliente(c.id);
  var t = tab || "anagrafica";
  h += schede([
    ["anagrafica", "Anagrafica"],
    ["preventivi", "Preventivi", com.length],
    ["progetti", "Progetti", prg.length],
    ["scadenze", "Scadenze", pg.filter(function (p) { return p.stato !== "Incassato"; }).length],
    ["diario", "Diario", inter.length],
    ["email", "Email"],
    ["portale", "Portale"]
  ], t, "cliente", c.id);
  if (t === "email") h += schedaEmailCliente(c);

  if (t === "anagrafica") {
    h += '<div class="grid g2"><div class="card"><h3 style="margin-bottom:12px">Dati del cliente</h3><table><tbody>' +
      row2("Referente", esc(c.referente || "—")) +
      row2("Email", c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "—") +
      row2("Telefono", c.telefono ? '<a href="tel:' + esc(String(c.telefono).replace(/\s+/g, "")) + '">' + esc(c.telefono) + "</a>" : "—") +
      row2("Sito", c.sito ? '<a href="' + esc(c.sito) + '" target="_blank" rel="noopener">' + esc(c.sito) + "</a>" : "—") +
      row2("P. IVA", esc(c.piva || "—")) + row2("Indirizzo", esc(c.indirizzo || "—")) +
      row2("Settore", esc(c.settore || "—")) + row2("Stato", '<span class="badge">' + esc(c.stato || "Lead") + "</span>") +
      row2("Chi lo segue", esc(nameOf(D.pros, c.owner_id))) + row2("Note", esc(c.note || "—")) +
      '</tbody></table><div style="margin-top:14px"><button class="btn sm ghost" data-edit="cli:' + c.id + '">Modifica l\'anagrafica</button></div></div>' +
      '<div class="card"><h3 style="margin-bottom:14px">Cambia al volo</h3>' +
      qcampo("cli", c.id, "stato", "Stato", qsel("cli", c.id, "stato", sel(["Lead", "Attivo", "Dormiente", "Chiuso"], c.stato || "Lead"))) +
      qcampo("cli", c.id, "owner_id", "Chi lo segue", qsel("cli", c.id, "owner_id", opt(D.pros, c.owner_id))) +
      '<div class="row2">' + qcampo("cli", c.id, "richiamo", "Da risentire il", qinput("cli", c.id, "richiamo", "date", c.richiamo)) +
      qcampo("cli", c.id, "richiamo_nota", "Per cosa", qinput("cli", c.id, "richiamo_nota", "text", c.richiamo_nota)) + "</div>" +
      qcampo("cli", c.id, "referente", "Referente", qinput("cli", c.id, "referente", "text", c.referente)) +
      '<div class="row2">' + qcampo("cli", c.id, "email", "Email", qinput("cli", c.id, "email", "email", c.email)) +
      qcampo("cli", c.id, "telefono", "Telefono", qinput("cli", c.id, "telefono", "text", c.telefono)) + "</div></div>" +
      '<div class="card"><h3 style="margin-bottom:12px">In sintesi</h3><table><tbody>' +
      row2("Preventivi", com.length + " · " + com.filter(function (k) { return ["Accettato"].indexOf(k.stato) > -1; }).length + " attivi") +
      row2("Progetti", prg.length) +
      row2("Incassato", eur(sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; }))) +
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
        '<p class="faint" style="margin:-6px 0 12px">' + (pl.ha_pwd ? "Password impostata" : '<b class="neg">Password non impostata: il link non funziona</b>') +
        (pl.ultimo_accesso ? " · ultimo accesso " + dshort(pl.ultimo_accesso) : " · mai usato") + "</p>" +
        '<div class="tools"><button class="btn sm ghost" data-portcopy="' + esc(url) + '">Copia link</button>' +
        '<button class="btn sm ghost" data-portpwd="' + pl.id + '">' + (pl.ha_pwd ? "Cambia password" : "Imposta password") + "</button>" +
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
    if (!q) return true;
    var fig = p.professione_id ? by(D.prof, p.professione_id) : null;
    var testo = (p.nome + " " + (p.ruolo || "") + " " + (p.competenze || "") + " " + (p.citta || "") + " " + (fig ? fig.nome + " " + (fig.categoria || "") : "") + " " +
      D.serv.filter(function (s) { return s.pro_id === p.id; }).map(function (s) { return s.nome + " " + (s.cat || ""); }).join(" ")).toLowerCase();
    return testo.indexOf(q) > -1;
  });
  var conServizi = elenco.filter(function (p) { return D.serv.some(function (s) { return s.pro_id === p.id; }); });
  var h = head("Professionisti", "Cerca chi ti serve e porta i suoi servizi dentro un tuo preventivo: il cliente resta tuo",
    (puo("accessi") ? '<button class="btn sm ghost" data-new="pros">+ Nuova persona</button>' : "") + '<button class="btn sm" data-go="servizi">Il mio listino</button>');
  h += barraViste(null, "", "pool",
    fcerca("pool", "Cerca una competenza, un servizio, una città…") +
    fsel("pool", "cat", [["", "Ogni categoria"]].concat(elencoCat(D.serv, "cat"))) +
    (f.cat || f.cerca ? '<button class="lnk mini" data-f-reset="pool">azzera</button>' : ""));

  if (!elenco.length) return h + '<div class="card">' + vuoto("Nessuno con questi criteri.", '<button class="lnk" data-f-reset="pool">Azzera la ricerca</button>') + "</div>";
  if (f.cerca || f.cat) h += '<p class="faint" style="margin:-6px 0 14px">' + elenco.length + " persone · " + conServizi.length + " con servizi che corrispondono</p>";

  h += elenco.slice().sort(function (a, b) {
    var sa = D.serv.filter(function (x) { return x.pro_id === a.id; }).length;
    var sb = D.serv.filter(function (x) { return x.pro_id === b.id; }).length;
    return sb - sa;
  }).map(function (p) {
    var mio = p.id === me.pro_id;
    var srv = D.serv.filter(function (x) { return x.pro_id === p.id && (!f.cat || (x.cat || "Altro") === f.cat); });
    var comp = (p.competenze || "").split(",").filter(Boolean);
    return '<div class="card espl">' +
      '<div class="esptop">' + avatar(p.id, 44) +
      '<div class="espchi"><h2>' + esc(p.nome) + (mio ? ' <span class="badge">tu</span>' : "") + "</h2>" +
      '<div class="faint">' + esc(p.ruolo || (p.professione_id ? nameOf(D.prof, p.professione_id) : "—")) + (p.citta ? " · " + esc(p.citta) : "") +
      (p.email ? ' · <a href="mailto:' + esc(p.email) + '">' + esc(p.email) + "</a>" : "") + (p.telefono ? ' · <a href="tel:' + esc(String(p.telefono).replace(/\s+/g, "")) + '">' + esc(p.telefono) + "</a>" : "") + "</div>" +
      '<div style="margin-top:7px">' + comp.map(function (c) { return '<span class="chip">' + esc(c.trim()) + "</span>"; }).join("") + "</div></div>" +
      '<div class="espazioni"><span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span>" +
      '<button class="btn sm ghost" data-route="pro|' + p.id + '|scheda">Scheda</button></div></div>' +
      (srv.length ? '<div class="esplist">' + srv.map(function (x) {
        return '<div class="esprow"><span class="espnome"><b>' + esc(x.nome) + "</b>" +
          (x.cat ? ' <span class="chip">' + esc(x.cat) + "</span>" : "") +
          (x.descrizione ? '<span class="faint"> · ' + esc(x.descrizione.slice(0, 70)) + "</span>" : "") + "</span>" +
          '<span class="espprezzo">' + eur(x.prezzo) + (x.unita ? '<i class="faint"> / ' + esc(x.unita) + "</i>" : "") + "</span>" +
          '<button class="btn sm" data-serv-add="' + x.id + '">+ al preventivo</button></div>';
      }).join("") + "</div>"
        : '<p class="faint" style="margin-top:12px">' + (mio ? "Non hai ancora messo servizi a listino: è così che i colleghi ti trovano." : "Nessun servizio a listino, per ora.") +
          (mio ? ' <button class="lnk" data-new="serv">Aggiungine uno</button>' : "") + "</p>") +
      "</div>";
  }).join("");
  return h;
}
/* portare un servizio di un collega dentro un proprio preventivo */
/* ---------------- allegati: file caricati e link, nello stesso elenco ----------------
   Un link a una cartella condivisa vale quanto un file: sta nella stessa lista,
   con scritto dove porta, e ha lo stesso interruttore di visibilità al cliente. */
var DOMINI = {
  "drive.google.com": "Google Drive", "docs.google.com": "Google Docs", "dropbox.com": "Dropbox",
  "wetransfer.com": "WeTransfer", "we.tl": "WeTransfer", "figma.com": "Figma", "notion.so": "Notion",
  "onedrive.live.com": "OneDrive", "sharepoint.com": "SharePoint", "icloud.com": "iCloud",
  "youtube.com": "YouTube", "youtu.be": "YouTube", "vimeo.com": "Vimeo", "canva.com": "Canva",
  "github.com": "GitHub", "miro.com": "Miro", "loom.com": "Loom"
};
function dominioDi(u) {
  try {
    var h = new URL(u).hostname.replace(/^www\./, "");
    var k = Object.keys(DOMINI).filter(function (d) { return h === d || h.indexOf("." + d) > -1; })[0];
    return k ? DOMINI[k] : h;
  } catch (e) { return ""; }
}
function nomeDaUrl(u) {
  try {
    var p = new URL(u);
    var ultimo = decodeURIComponent(p.pathname.split("/").filter(Boolean).pop() || "");
    if (ultimo && ultimo.length < 60 && !/^[0-9a-f-]{20,}$/i.test(ultimo)) return ultimo.replace(/[-_+]/g, " ");
    return dominioDi(u) || p.hostname;
  } catch (e) { return ""; }
}
function urlValido(u) {
  try { var p = new URL(u); return p.protocol === "http:" || p.protocol === "https:"; } catch (e) { return false; }
}
/* contesto di un allegato: preventivo|progetto|lavorazione|attività, come stringa */
function ctxAll(kid, pid, lid, tid, rid) { return [kid || "", pid || "", lid || "", tid || "", rid || ""].join("|"); }
function ctxLeggi(s) { var p = String(s || "").split("|"); return { commessa_id: p[0] || null, progetto_id: p[1] || null, lavorazione_id: p[2] || null, task_id: p[3] || null, riunione_id: p[4] || null }; }

/* la zona per trascinare, con accanto il pulsante per incollare un link */
function zonaAllegati(ctx) {
  return '<div class="drop" id="drop" data-ctx-all="' + esc(ctx) + '">' +
    "<b>Trascina qui i file</b>" +
    '<span class="faint">oppure <label class="lnk">scegli dal computer<input type="file" id="fileinp" multiple style="display:none"></label>' +
    ' · <button class="lnk" data-link="' + esc(ctx) + '">incolla un link</button></span>' +
    '<span class="faint dropsub">vale anche trascinare qui un indirizzo dal browser</span></div>';
}
/* una riga sola per file e link, così si leggono allo stesso modo */
function rigaAllegato(m, opz) {
  var o = opz || {};
  var nome = m.path
    ? '<button class="lnk" data-file="' + m.id + '">' + esc(m.nome) + "</button>"
    : m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.nome) + "</a>" : esc(m.nome);
  var sotto = m.path
    ? (m.dim ? (m.dim > 1048576 ? (m.dim / 1048576).toFixed(1) + " MB" : Math.round(m.dim / 1024) + " KB") : "")
    : (m.url ? dominioDi(m.url) : "");
  return '<tr><td><span class="allx' + (m.path ? " file" : " link") + '"></span></td>' +
    "<td>" + nome +
    (sotto ? '<div class="faint">' + esc(sotto) + "</div>" : "") +
    (m.note ? '<div class="faint">' + esc(m.note) + "</div>" : "") + "</td>" +
    (o.tipo === false ? "" : '<td><span class="badge">' + esc(m.tipo || (m.path ? "File" : "Link")) + "</span></td>") +
    (o.fase ? "<td>" + esc(m.fase_id ? nameOf(D.fasi, m.fase_id) : "—") + "</td>" : "") +
    '<td><button class="lnk" data-vis="' + m.id + '">' + (m.visibile_cliente ? '<span class="badge b-blue">cliente</span>' : '<span class="badge">solo studio</span>') + "</button></td>" +
    '<td class="faint">' + dshort(m.created_at) + "</td>" +
    '<td class="num"><button class="lnk" data-edit="mat:' + m.id + '">Modifica</button> <button class="lnk" data-del="mat:' + m.id + '">elimina</button></td></tr>';
}
function tabellaAllegati(list, opz) {
  var o = opz || {};
  if (!list.length) return vuoto("Ancora niente qui: trascina un file o incolla il link di una cartella condivisa.");
  return '<table class="alleg"><thead><tr><th></th><th>Nome</th>' + (o.tipo === false ? "" : "<th>Tipo</th>") +
    (o.fase ? "<th>Fase</th>" : "") + "<th>Visibilità</th><th>Data</th><th></th></tr></thead><tbody>" +
    list.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })
      .map(function (m) { return rigaAllegato(m, o); }).join("") + "</tbody></table>";
}
function apriLink(ctx, url) {
  modal('<form class="box" data-link-save="' + esc(ctx) + '"><h2>Aggiungi un link</h2>' +
    '<p class="faint" style="margin-bottom:14px">Una cartella condivisa, un WeTransfer, un Figma, la pagina di un fornitore. Sta insieme ai file e vale come loro.</p>' +
    fld("url", "Indirizzo", "text", url || "", true) +
    fld("nome", "Come si chiama", "text", url ? nomeDaUrl(url) : "") +
    '<div class="row2">' + selField("tipo", "Tipo", sel(TIPI_MAT, "Cartella condivisa")) +
    selField("visibile_cliente", "Visibile al cliente", sel(["no", "si"], "no")) + "</div>" +
    fld("note", "Note", "text", "") +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Aggiungi</button></div></form>');
  setTimeout(function () {
    var f = document.querySelector("[data-link-save]"); if (!f) return;
    f.url.addEventListener("input", function () {
      if (!f.nome.value.trim() && urlValido(f.url.value)) f.nome.value = nomeDaUrl(f.url.value);
    });
    f.url.focus();
  }, 60);
}
async function salvaLink(ctx, dati) {
  if (!urlValido(dati.url)) { toast("L'indirizzo non sembra valido: deve iniziare con http:// o https://", true); return false; }
  var riga = ctxLeggi(ctx);
  riga.url = dati.url.trim();
  riga.nome = (dati.nome || "").trim() || nomeDaUrl(dati.url) || dati.url;
  riga.tipo = dati.tipo || "Cartella condivisa";
  riga.note = dati.note || null;
  riga.visibile_cliente = !!dati.visibile_cliente;
  riga.caricato_da = me.pro_id;
  var r = await sb.from("materiali").insert(riga);
  if (r.error) { toast(erroreUmano(r.error), true); return false; }
  if (riga.commessa_id) await logEv(riga.commessa_id, "Aggiunto link: " + riga.nome);
  await reload(["mat", "ev"]);
  toast("Link aggiunto");
  return true;
}

function apriAggiungiServizio(sid) {
  var x = by(D.serv, sid); if (!x) return;
  var miei = fcom().filter(function (k) { return ["Bozza", "Inviato", "Accettato"].indexOf(k.stato) > -1; });
  if (!miei.length) { toast("Non hai preventivi aperti: creane uno e poi torna qui", true); return; }
  modal('<form class="box" data-serv-add-save="' + sid + '"><h2>Aggiungi al preventivo</h2>' +
    '<p class="faint" style="margin-bottom:14px">' + esc(x.nome) + " di " + esc(nameOf(D.pros, x.pro_id)) +
    ". Il compenso concordato resta suo, il prezzo al cliente lo decidi tu.</p>" +
    selField("commessa_id", "In quale preventivo", opt(miei, "", "titolo")) +
    '<div class="row2">' + fld("qty", "Quantità", "number", x.min_qty == null ? 1 : x.min_qty) +
    fld("prezzo_unit", "Prezzo al cliente (€)", "number", x.prezzo) + "</div>" +
    fld("costo_unit", "Compenso al collega (€)", "number", x.costo) +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Aggiungi</button></div></form>');
}

function vPro() {
  var p = by(D.pros, current);
  if (!p) return '<div class="card">Non trovato. <button class="lnk" data-go="pool">Torna al pool</button></div>';
  var srv = D.serv.filter(function (s) { return s.pro_id === p.id; });
  var ore = D.ore.filter(function (o) { return o.pro_id === p.id; });
  var tk = D.task.filter(function (t) { return t.assegnato_id === p.id; });
  var com = D.com.filter(function (k) { return k.owner_id === p.id || k.pm_id === p.id || k.pr_id === p.id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return r.assegnato_id === p.id || (s && s.pro_id === p.id); }); });
  var h = (view === "profilo" ? crumbs([["Profilo"], ["Il mio profilo"]]) : crumbs([["Studio"], ["Professionisti", "pool"], [p.nome]]));
  var fig = p.professione_id ? by(D.prof, p.professione_id) : null;
  h += '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + esc(fig ? fig.nome : (p.ruolo || "—")) + (fig && p.ruolo && p.ruolo !== fig.nome ? " · " + esc(p.ruolo) : "") + '</span></h1><div class="tools">' + (view === "profilo" ? "" : '<button class="btn sm ghost" data-go="pool">← Professionisti</button>') + '<button class="btn sm ghost" data-edit="pros:' + p.id + '">Modifica</button></div></div>';
  var mio = p.id === me.pro_id;
  if (mio) {
    h += fig
      ? '<div class="card" style="background:var(--cream)"><div class="cardhead"><h2>Come lavori tu</h2><button class="btn sm ghost" data-go="professioni">Il catalogo dei mestieri</button></div>' +
        '<p class="faint" style="margin-bottom:10px">Sei un <b>' + esc(fig.nome) + '</b>: vendi <b>' + MISURA_ET(fig.misura) + '</b>, la tua unità naturale è <b>' + esc(fig.unita) + '</b>. Quando un tuo preventivo viene accettato, da ogni voce nascono queste attività — poi le sposti come vuoi.</p>' +
        '<ol class="fontil">' + (fig.attivita || []).map(function (a) { return "<li>" + esc(a.n || a.nome) + (a.o ? ' <span class="faint">' + a.o + " h</span>" : "") + "</li>"; }).join("") + "</ol>" +
        '<div style="margin-top:12px"><button class="btn sm ghost" data-listino="1">Porta le voci tipiche nel tuo listino</button></div></div>'
      : '<div class="card" style="background:var(--cream)"><div class="cardhead"><h2>Che mestiere fai?</h2><button class="btn sm" data-edit="pros:' + p.id + '">Scegli la tua figura</button></div><p class="faint">Il catalogo ha ' + D.prof.length + ' mestieri, dall\'architetto al tappezziere. Scegliendo il tuo, il gestionale si mette al tuo passo: menu nell\'ordine che ti serve, unità di misura giusta, voci di listino già pronte e attività che nascono da sole quando un preventivo viene accettato.</p></div>';
  }
  h += '<div class="grid g4">' +
    kpi(String(com.length), mio ? "I tuoi lavori" : "Lavori insieme a te", mio ? D.cli.filter(function (c) { return c.owner_id === p.id; }).length + " clienti tuoi" : "solo quelli che condividete") +
    kpi(mio ? num(sum(ore, function (o) { return o.ore; }), 1) + " h" : "—", mio ? "Ore registrate" : "Ore", mio ? ore.length + " registrazioni" : "private, le vede solo chi le registra") +
    kpi(mio ? eur(sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); })) : String(srv.length), mio ? "Valore delle tue ore" : "Servizi a listino", mio ? (p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "tariffa non impostata") : "puoi metterli nei tuoi preventivi") +
    kpi(String(tk.filter(function (t) { return t.stato !== "Fatto"; }).length), "Attività aperte", "sui lavori che vedi") + "</div>";
  var t = tab || "scheda";
  var TP = [["scheda", "Scheda"], ["servizi", "Servizi", srv.length], ["lavori", "Lavori", com.length]];
  if (mio) TP.push(["ore", "Ore", num(sum(ore, function (o) { return o.ore; }), 1)], ["prenota", "Prenota una call", pcfgMia() && pcfgMia().attivo ? "on" : null], ["email", "Email e calendario", postaConn() ? "on" : null]);
  h += schede(TP, t, view === "profilo" ? "profilo" : "pro", view === "profilo" ? "" : p.id);
  if (t === "prenota" && mio) h += schedaPrenota(p);
  if (t === "email" && mio) h += schedaEmail(p);

  if (t === "scheda" && mio) {
    h += '<div class="card"><div class="cardhead"><h2>Come esci sul foglio</h2><span class="faint">logo e firma finiscono sui tuoi preventivi, e la firma anche su quelli dello studio che mandi tu</span></div>' +
      '<div class="grid g2">' +
      '<div class="imgbox"><div class="glab">Il tuo logo</div>' + (p.logo ? '<img src="' + esc(p.logo) + '" alt="">' : '<div class="imgvuoto">nessun logo</div>') +
        '<div class="imgaz"><label class="btn sm ghost">Carica<input type="file" accept="image/*" data-imgup="logo" style="display:none"></label>' + (p.logo ? '<button class="lnk mini" data-imgvia="logo">togli</button>' : "") + "</div></div>" +
      '<div class="imgbox"><div class="glab">La tua firma</div>' + (p.firma ? '<img src="' + esc(p.firma) + '" alt="">' : '<div class="imgvuoto">nessuna firma</div>') +
        '<div class="imgaz"><label class="btn sm ghost">Carica<input type="file" accept="image/*" data-imgup="firma" style="display:none"></label>' + (p.firma ? '<button class="lnk mini" data-imgvia="firma">togli</button>' : "") + "</div>" +
        '<p class="faint" style="margin-top:8px">Una foto della firma su carta bianca va benissimo: la ritaglio e la metto sul foglio.</p></div>' +
      "</div></div>";
  }
  if (t === "scheda") {
    h += '<div class="grid g2"><div class="card"><h3 style="margin-bottom:12px">Anagrafica</h3><table><tbody>' +
      row2("Nello studio", '<span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span>") +
      row2("Email", p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + "</a>" : "—") + row2("Telefono", p.telefono ? '<a href="tel:' + esc(String(p.telefono).replace(/\s+/g, "")) + '">' + esc(p.telefono) + "</a>" : "—") + row2("Città", esc(p.citta || "—")) +
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
    h += '<div class="card"><div class="cardhead"><h2>Le tue ore</h2><button class="btn sm ghost" data-go="ore">Apri le ore</button></div>' + tblOre(ore.slice(0, 40)) + "</div>";
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
  var mia = miaFigura();
  var h = head("I miei servizi", list.length + " servizi · " + (f.chi === "io" ? "il tuo listino" : "quello che sanno fare gli altri"),
    (mia ? '<button class="btn sm ghost" data-listino="1">Prendi le voci tipiche da ' + esc(mia.nome) + "</button>" : "") +
    '<button class="btn sm" data-new="serv">+ Nuovo servizio</button>');
  if (!mia) h += '<div class="card" style="background:var(--cream)"><div class="cardhead"><h2>Che mestiere fai?</h2><button class="btn sm" data-go="profilo">Scegli la tua figura</button></div><p class="faint">Scegli la tua figura professionale e il gestionale si mette al tuo passo: unità di misura giusta, voci tipiche già pronte, e le attività di un tuo lavoro che nascono da sole quando un preventivo viene accettato.</p></div>';
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
function vReport() {
  var com = fcom(), ore = fore();
  var pagMiei = D.pag.filter(function (p) { return can(p.commessa_id); });
  var vinte = com.filter(function (k) { return STATI_VINTI.indexOf(k.stato) > -1; });
  var perse = com.filter(function (k) { return k.stato === "Perso"; });
  var conv = (vinte.length + perse.length) ? Math.round(vinte.length / (vinte.length + perse.length) * 100) : 0;
  var mesi = {};
  pagMiei.filter(function (p) { return p.stato === "Incassato"; }).forEach(function (p) { var kk = String(p.pagato_il || p.scadenza || "").slice(0, 7); if (kk) mesi[kk] = (mesi[kk] || 0) + (+p.importo || 0); });
  var mk = Object.keys(mesi).sort();
  var topCli = fcli().slice().sort(function (a, b) { return valoreCliente(b.id) - valoreCliente(a.id); }).slice(0, 8);
  var fattOre = sum(ore.filter(function (o) { return o.fatturabile; }), function (o) { return o.ore; });
  var totOre = sum(ore, function (o) { return o.ore; });
  var h = head("Report", "Come vanno i tuoi lavori: conversione, marginalità, andamento");
  h += '<div class="grid g4">' +
    kpi(conv + " %", "Preventivi vinti", vinte.length + " vinti · " + perse.length + " persi") +
    kpi(totOre ? Math.round(fattOre / totOre * 100) + " %" : "—", "Ore fatturabili", num(fattOre, 1) + " h su " + num(totOre, 1) + " registrate") +
    kpi(eur(com.length ? sum(com, valore) / com.length : 0), "Valore medio", com.length + " preventivi") +
    kpi(eur(sum(com.filter(function (k) { return k.stato !== "Perso"; }), function (k) { return budget(k).margReale; })), "Margine complessivo", "sui lavori non persi, con ore e costi") + "</div>";
  h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="cardhead"><h2>Incassi per mese</h2></div>';
  h += mk.length ? '<div class="bars">' + mk.map(function (kk) { return bar(kk, mesi[kk], Math.max.apply(null, mk.map(function (x) { return mesi[x]; })), eur(mesi[kk])); }).join("") + "</div>" : vuoto("—");
  h += '</div><div class="card"><div class="cardhead"><h2>Top clienti</h2></div>';
  h += topCli.length ? '<div class="bars">' + topCli.map(function (c) { return bar(c.nome, valoreCliente(c.id), valoreCliente(topCli[0].id) || 1, eur(valoreCliente(c.id))); }).join("") + "</div>" : vuoto("—");
  h += "</div></div>";
  h += '<div class="card"><div class="cardhead"><h2>Marginalità per lavoro</h2></div><table><thead><tr><th>Preventivo</th><th>Cliente</th><th class="num">Totale</th><th class="num">Compensi</th><th class="num">Margine</th><th class="num">%</th><th class="num">Ore</th><th class="num">€/h reale</th></tr></thead><tbody>';
  com.slice().sort(function (a, b) { return budget(b).margReale - budget(a).margReale; }).forEach(function (k) {
    var c = calc(k), b9 = budget(k), o = oreTot(k.id);
    c = { tot: b9.ricavo, cost: b9.costoReale, margine: b9.margReale };
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

/* Le immagini del sito pubblico: loghi dei clienti, delle collaborazioni, dei
   partner e le foto delle persone. Si caricano da qui e il sito le mostra da solo,
   col nome del file che il sito si aspetta. */
var SITO_IMG = null;
function slugFile(n) { return String(n).toLowerCase().replace(/\.(png|jpe?g|svg|webp)$/i, function (m) { return m; }).replace(/[^a-z0-9.\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function cardImmaginiSito() {
  var cart = [["clients", "Con chi hanno collaborato i nostri professionisti", "lucchi.png, cna-veneto.png, gieffe.png, naturasi.png, noleggio-lorini.png, miola.png, acqua-adv.png, borsari.png, carboni-adv.png, buglioni.png, al-calmiere.svg, 4you.png, logo-flame.png, petit-blanche.svg, la-staffa.png, sport-center-verona.svg — per aggiungerne uno nuovo, dimmelo e lo metto nel sito"], ["partner", "Partner e coworking", "un file per partner, nome libero"], ["people", "Foto delle persone", "nicola.jpg, goffredo.jpg (quadrate, almeno 400 px)"], ["foto", "Foto dello studio", "nomi liberi"]];
  var h = '<div class="card" id="imgsito"><div class="cardhead"><h2>Immagini del sito</h2><span class="faint">giraffastudio.it le legge da qui</span></div>' +
    '<p class="faint" style="margin:-4px 0 14px">PNG o SVG con sfondo trasparente per i loghi, JPG per le foto. Il nome del file conta: il sito cerca quelli scritti accanto a ogni cartella.</p>';
  cart.forEach(function (c) {
    var lista = SITO_IMG ? SITO_IMG.filter(function (f) { return f.cartella === c[0]; }) : null;
    h += '<div class="imgcart"><div class="imgcarth"><b>' + c[1] + '</b><span class="faint">' + esc(c[2]) + "</span>" +
      '<label class="btn sm ghost">Carica<input type="file" multiple accept="image/*,.svg" data-sitoup="' + c[0] + '" style="display:none"></label></div>' +
      (lista === null ? '<p class="faint">…</p>' : lista.length ? '<div class="imgfiles">' + lista.map(function (f) {
        return '<div class="imgfile"><img src="' + IMG_SITO + c[0] + "/" + encodeURIComponent(f.name) + '" alt=""><span>' + esc(f.name) + '</span><button class="lnk mini" data-sitovia="' + c[0] + "/" + esc(f.name) + '">togli</button></div>';
      }).join("") + "</div>" : '<p class="faint">Ancora niente qui.</p>') + "</div>";
  });
  if (SITO_IMG === null) caricaListaSito();
  return h + "</div>";
}
var IMG_SITO = "https://uxeuqyzlikkbkpraeoen.supabase.co/storage/v1/object/public/sito/";
async function caricaListaSito() {
  var out = [];
  for (var i = 0; i < 5; i++) {
    var cart = ["clients", "partner", "people", "foto"][i];
    var r = await sb.storage.from("sito").list(cart, { limit: 200 });
    (r.data || []).forEach(function (f) { if (f.name && f.name !== ".emptyFolderPlaceholder") out.push({ cartella: cart, name: f.name }); });
  }
  SITO_IMG = out;
  if (view === "impostazioni") render();
}
async function caricaImmaginiSito(cart, files) {
  var ok = 0;
  for (var i = 0; i < files.length; i++) {
    var f = files[i], nome = slugFile(f.name);
    if (f.size > 3000000) { toast(f.name + " è troppo grande (max 3 MB)", true); continue; }
    var up = await sb.storage.from("sito").upload(cart + "/" + nome, f, { upsert: true, contentType: f.type || undefined, cacheControl: "3600" });
    if (up.error) toast(f.name + ": " + erroreUmano(up.error), true); else ok++;
  }
  if (ok) toast(ok === 1 ? "Immagine caricata" : ok + " immagini caricate");
  SITO_IMG = null; render();
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
  if (puo("studio")) {
    h += cardImmaginiSito();
    h += '<div class="card"><h2>Carta intestata dello studio</h2>' +
      '<p class="faint" style="margin:8px 0 14px">Questi dati vanno in testa ai preventivi che escono a nome dello studio, quelli dove lavorano più professionisti.</p>' +
      '<div class="imgbox" style="margin-bottom:14px"><div class="glab">Il logo dello studio</div>' + (SET.studio_logo ? '<img src="' + esc(SET.studio_logo) + '" alt="">' : '<div class="imgvuoto">si usa il marchio Giraffa</div>') +
        '<div class="imgaz"><label class="btn sm ghost">Carica<input type="file" accept="image/*" data-imgup="studio_logo" style="display:none"></label>' + (SET.studio_logo ? '<button class="lnk mini" data-imgvia="studio_logo">togli</button>' : "") + "</div></div>" +
      '<div class="grid g2">' +
      qcampo("set", 1, "studio_nome", "Ragione sociale", qinput("set", 1, "studio_nome", "text", SET.studio_nome, ' placeholder="Giraffa Studio"')) +
      qcampo("set", 1, "studio_piva", "P. IVA", qinput("set", 1, "studio_piva", "text", SET.studio_piva)) +
      qcampo("set", 1, "studio_indirizzo", "Indirizzo", qinput("set", 1, "studio_indirizzo", "text", SET.studio_indirizzo, ' placeholder="Via, numero — Verona"')) +
      qcampo("set", 1, "studio_email", "Email", qinput("set", 1, "studio_email", "text", SET.studio_email)) +
      qcampo("set", 1, "studio_telefono", "Telefono", qinput("set", 1, "studio_telefono", "text", SET.studio_telefono)) +
      qcampo("set", 1, "studio_sito", "Sito", qinput("set", 1, "studio_sito", "text", SET.studio_sito, ' placeholder="giraffastudio.it"')) +
      "</div>" +
      qcampo("set", 1, "studio_iban", "IBAN", qinput("set", 1, "studio_iban", "text", SET.studio_iban)) +
      '<div class="qfield"><label>Condizioni standard</label><textarea data-qset="set|studio_condizioni|1" rows="4" placeholder="Tempi, modalità di pagamento, cosa serve dal cliente, cosa non è compreso.">' + esc(SET.studio_condizioni || "") + "</textarea></div>" +
      '<p class="faint" style="margin-top:8px">Si salvano da soli. Le condizioni compaiono già scritte in ogni nuovo preventivo dello studio: dentro al documento le puoi cambiare caso per caso.</p></div>';
  }
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
  var vista = tab || "percliente";
  var f = FS.prog;
  var list = progVisibili().filter(function (p) {
    var cidP = cliDiProg(p);
    if (f.stato && (p.stato || "") !== f.stato) return false;
    if (f.cli && cidP !== f.cli) return false;
    if (f.pro && p.pro_id !== (f.pro === "io" ? me.pro_id : f.pro)) return false;
    if (f.cerca && (p.nome + " " + (p.commessa_id ? nameOf(D.com, p.commessa_id, "titolo") : "") + " " + (cidP ? nameOf(D.cli, cidP) : "")).toLowerCase().indexOf(f.cerca.toLowerCase()) === -1) return false;
    return true;
  });
  var h = head("Progetti", list.length + " progetti in cui sei dentro",
    '<button class="btn sm" data-new="prog">+ Nuovo progetto</button>');
  h += barraViste([["percliente", "Per cliente"], ["elenco", "Elenco"], ["bacheca", "Bacheca"]], vista, "progetti",
    fcerca("prog", "Cerca un progetto…") +
    fsel("prog", "stato", [["", "Ogni stato"], ["Da iniziare", "Da iniziare"], ["In corso", "In corso"], ["In attesa cliente", "In attesa cliente"], ["Sospeso", "Sospeso"], ["Completato", "Completato"]]) +
    fsel("prog", "cli", [["", "Ogni cliente"]].concat(fcli().map(function (c) { return [c.id, c.nome]; }))) +
    fsel("prog", "pro", [["", "Chiunque"], ["io", "Seguiti da me"]].concat(D.pros.map(function (p) { return [p.id, p.nome]; }))) +
    (f.stato || f.cli || f.pro || f.cerca ? '<button class="lnk mini" data-f-reset="prog">azzera</button>' : ""));
  if (!list.length) return h + '<div class="card">' + vuoto("Nessun progetto con questi filtri: i progetti nascono dentro un preventivo.", '<button class="lnk" data-go="commesse">Vai ai preventivi</button>') + "</div>";

  function rigaProg(p) {
    var lv = lavOf(p.id);
    var ore = sum(oreOfProg(p.id), function (o) { return o.ore; });
    var stim = sum(lv, function (l) { return l.ore_stimate; });
    var tkTutte = taskOfProg(p.id).filter(function (t) { return !t.padre_id; });
    var tk = tkTutte.filter(function (t) { return t.stato !== "Fatto"; });
    var late = p.fine && p.fine < today() && p.stato !== "Completato";
    var pal = p.stato === "Completato" ? "b-green" : p.stato === "In corso" ? "b-terra" : p.stato === "In attesa cliente" ? "b-amber" : p.stato === "Sospeso" ? "b-red" : "";
    return '<div class="prow" data-route="progetto|' + p.id + '|lavorazioni">' +
      '<span class="pdot ' + pal + '"></span>' +
      '<span class="pnome">' + esc(p.nome) + "</span>" +
      '<span class="pstato badge ' + pal + '">' + esc(p.stato || "—") + "</span>" +
      '<span class="pav">' + prog(avanzProg(p)) + '<i>' + num(avanzProg(p), 0) + "%</i></span>" +
      '<span class="pore">' + (ore ? num(ore, 1) + " h" : '<i class="faint">—</i>') + "</span>" +
      '<span class="pattivita">' + (tkTutte.length ? (tkTutte.length - tk.length) + " su " + tkTutte.length + " fatte" : '<i class="faint">—</i>') + "</span>" +
      '<span class="pdata">' + (p.fine ? (late ? '<b class="neg">' + dshort(p.fine) + "</b>" : dshort(p.fine)) : "—") + "</span>" +
      '<span class="pchi">' + (p.pro_id ? avatar(p.pro_id, 22) : "") + "</span></div>";
  }
  if (vista === "percliente") {
    var perCli = {};
    list.forEach(function (p) {
      var cid = cliDiProg(p);
      (perCli[cid] = perCli[cid] || []).push(p);
    });
    var chiavi = Object.keys(perCli).sort(function (a, b) { return nameOf(D.cli, a).localeCompare(nameOf(D.cli, b)); });
    return h + chiavi.map(function (cid) {
      var pg = perCli[cid];
      var val = sum(pg, function (p) { return valoreProg(p.id); });
      var lavori = {};
      pg.forEach(function (p) { if (p.commessa_id) lavori[p.commessa_id] = 1; });
      var aperti = pg.filter(function (p) { return p.stato !== "Completato"; }).length;
      return '<div class="card cgroup"><div class="cardhead">' +
        "<h2>" + (cid ? '<button class="lnk" data-route="cliente|' + cid + '|progetti">' + esc(nameOf(D.cli, cid)) + "</button>" : "Senza cliente") + "</h2>" +
        '<span class="faint">' + pg.length + (pg.length === 1 ? " progetto" : " progetti") + (aperti !== pg.length ? " · " + aperti + " aperti" : "") + " · " + eur(val) + "</span></div>" +
        '<div class="faint" style="margin:-4px 0 10px">' + Object.keys(lavori).map(function (kid) {
          return '<button class="lnk mini2" data-route="commessa|' + kid + '|servizi">' + esc(nameOf(D.com, kid, "titolo")) + "</button>";
        }).join(" · ") + "</div>" +
        '<div class="plist">' + pg.slice().sort(function (a, b) { return (a.fine || "9999") < (b.fine || "9999") ? -1 : 1; }).map(rigaProg).join("") + "</div></div>";
    }).join("");
  }
  if (vista === "elenco") {
    return h + '<div class="card"><div class="plist">' +
      list.slice().sort(function (a, b) { return (a.fine || "9999") < (b.fine || "9999") ? -1 : 1; }).map(function (p) {
        var cidE = cliDiProg(p);
        return rigaProg(p).replace('<span class="pnome">', '<span class="pnome">' + esc(cidE ? nameOf(D.cli, cidE) + " · " : ""));
      }).join("") + "</div></div>";
  }
  if (vista === "bacheca") {
    var stati = ["Da iniziare", "In corso", "In attesa cliente", "Completato"];
    return h + '<div class="card"><div class="kanban">' + stati.map(function (s) {
      var items = list.filter(function (p) { return (p.stato || "Da iniziare") === s; });
      return '<div class="kcol"><h3>' + s + "<span>" + items.length + "</span></h3>" + items.map(function (p) {
        var cidB = cliDiProg(p);
        return '<div class="tsk" data-open-prog="' + p.id + '"><div class="tsktop">' + esc(p.nome) + (p.pro_id ? avatar(p.pro_id, 22) : "") + "</div>" +
          '<div class="meta"><span class="faint">' + esc(cidB ? nameOf(D.cli, cidB) : "lavoro dello studio") + "</span><span>" + (p.fine ? dshort(p.fine) : "") + "</span></div>" +
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
  h += '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + (k ? lnkCli(k.cliente_id) : "—") + (k ? " · " + lnkCom(k.id) : "") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-visprog="' + p.id + '">' + (p.visibile_cliente ? "Nascondi al cliente" : "Mostra al cliente") + "</button>" +
    '<button class="btn sm ghost" data-edit="prog:' + p.id + '">Modifica</button>' +
    '<button class="btn sm" data-new="lav" data-ctx-prog="' + p.id + '">+ Lavorazione</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(av + " %", "Avanzamento", lv.filter(function (l) { return l.stato === "Completata"; }).length + " lavorazioni su " + lv.length) +
    kpi(eur(costiTot(costiProg(p.id).filter(function (x) { return !x.ribaltato; }))), "Costi a carico tuo", costiProg(p.id).length + (costiProg(p.id).length === 1 ? " costo registrato" : " costi registrati") + (oreT ? " · " + num(oreT, 1) + " h lavorate" : "")) +
    kpi(eur(valoreProg(p.id)), "Valore a preventivo", righeProg(p.id).length + " voci") +
    kpi(String(tk.filter(function (x) { return x.stato !== "Fatto"; }).length), "Attività aperte", p.visibile_cliente ? "visibile al cliente" : "non condiviso") + "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div><div class="card">' +
    schede([["lavorazioni", "Lavorazioni", lv.length], ["attivita", "Attività", tk.filter(function (x) { return x.stato !== "Fatto"; }).length], ["costi", "Costi", costiProg(p.id).length], ["materiali", "Materiali", mt.length], ["ore", "Ore", num(oreT, 1)], ["note", "Note"]], t, "progetto", p.id);

  if (t === "costi") {
    var cp = costiProg(p.id);
    h += '<div class="cardhead"><h2>Costi di questo progetto</h2><span class="faint" style="margin-right:auto">' + (cp.length ? eur(costiTot(cp.filter(function (x) { return !x.ribaltato; }))) + " a carico tuo su " + eur(valoreProg(p.id)) + " di valore" : "") + '</span><button class="btn sm ghost" data-new="costi" data-ctx-prog="' + p.id + '">+ Registra un costo</button></div>';
    h += tabellaCosti(cp, { progetto: true, attr: 'data-ctx-prog="' + p.id + '"' });
  }

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
    h += '<div class="cardhead"><h2>Attività del progetto</h2></div>';
    h += scriviTask("prog:" + p.id, "Aggiungi un\'attività a questo progetto · «bozza home ven @Goffredo»");
    h += tk.length ? '<div class="checklist">' + tk.filter(function (x) { return !x.padre_id; }).map(function (x) { return riga(x, tk); }).join("") + "</div>" : "";
  }
  if (t === "materiali") {
    h += '<div class="cardhead"><h2>Materiali del progetto</h2><div style="display:flex;gap:8px"><button class="btn sm ghost" data-link="' + ctxAll(p.commessa_id, p.id) + '">+ Link</button><button class="btn sm ghost" data-new="mat" data-ctx="' + p.commessa_id + '">+ Materiale</button></div></div>';
    h += zonaAllegati(ctxAll(p.commessa_id, p.id));
    h += tabellaAllegati(mt);
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
    qcampo("prog", p.id, "stato", "Stato", qsel("prog", p.id, "stato", sel(["Da iniziare", "In corso", "In attesa cliente", "Sospeso", "Completato"], p.stato || "Da iniziare"))) +
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
  D.riu.forEach(function (r) { if (r.data === g && r.stato !== "Annullata") out.push({ c: "b-blue", t: (r.ora ? r.ora.slice(0, 5) + " " : "") + r.titolo, s: "riunione", act: 'data-route="riunione|' + r.id + '|"' }); });
  D.ag.forEach(function (e) { if (e.data === g) out.push({ c: "b-green", t: (e.ora ? e.ora.slice(0, 5) + " " : "") + e.titolo, s: (e.tipo || "evento").toLowerCase() + " dello studio", act: 'data-route="eventi|-|prossimi"' }); });
  (D.impg || []).forEach(function (e) {
    if (e.pro_id !== me.pro_id || giornoImpg(e.inizio) !== g) return;
    /* le riunioni del CRM già mandate a Google non vanno mostrate due volte */
    if (D.riu.some(function (r) { return r.gcal_event_id && "g_" + r.gcal_event_id === e.id; })) return;
    out.push({ c: "gcal", t: (e.tutto_il_giorno ? "" : oraImpg(e.inizio) + " ") + e.titolo, s: "Google Calendar", act: "" });
  });
  return out;
}
function vCalendario() {
  var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  var settimana = tab === "settimana";
  var base = new Date(oggi.getFullYear(), oggi.getMonth() + CAL, 1);
  var mese = base.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  var start = new Date(base); start.setDate(1 - ((base.getDay() + 6) % 7));
  var lun = new Date(oggi); lun.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7) + CAL * 7);
  var titolo = settimana ? "Settimana dal " + dt(iso(lun)) : mese.charAt(0).toUpperCase() + mese.slice(1);
  var h = head("Calendario", titolo,
    '<div class="wknav"><button class="btn sm ghost" data-cal="-1">‹</button>' + (CAL ? '<button class="btn sm ghost" data-cal="0">Oggi</button>' : "") + '<button class="btn sm ghost" data-cal="1">›</button></div>');
  h += barraViste([["mese", "Mese"], ["settimana", "Settimana"]], settimana ? "settimana" : "mese", "calendario");

  if (settimana) {
    h += '<div class="card"><div class="week">';
    for (var w = 0; w < 7; w++) {
      var dw = new Date(lun.getTime() + w * 86400000), gw = iso(dw), evw = eventiDi(gw);
      var oreW = sum(fore().filter(function (o) { return o.data === gw; }), function (o) { return o.ore; });
      h += '<div class="wday' + (gw === today() ? " today" : "") + '" data-day="' + gw + '"><div class="caltop"><span>' + ["lun", "mar", "mer", "gio", "ven", "sab", "dom"][w] + " " + dw.getDate() + "</span>" + (oreW ? '<span class="calore">' + num(oreW, 1) + " h</span>" : "") + "</div>" +
        (evw.length ? evw.map(function (e) { return '<div class="calev ' + e.c + '" ' + e.act + ' title="' + esc(e.s) + '">' + esc(e.t) + "</div>"; }).join("") : '<div class="faint" style="font-size:.78rem">—</div>') + "</div>";
    }
    h += "</div></div>";
  } else {
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
  }

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
    '<span><i style="background:var(--green)"></i>Prenotazione di uno spazio, evento dello studio</span>' +
    '<span><i style="background:var(--blue)"></i>Riunione</span>' +
    '</div><p class="faint" style="margin-top:12px">Clicca un giorno vuoto per creare un’attività con quella scadenza.</p></div></div>';
  h += cardIscrizione();
  return h;
}
/* Il calendario si porta fuori: un indirizzo segreto, personale, che Google o Apple
   leggono da soli ogni paio d'ore. Nessuno può risalire dal link a nient'altro. */
function urlIcs() {
  var t = (D.caltok || [])[0];
  if (!t || !t.token) return "";
  return String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/ics/" + t.token + ".ics";
}
function cardIscrizione() {
  var u = urlIcs();
  var h = '<div class="card" style="margin-top:18px"><div class="cardhead"><h2>Portalo nel tuo calendario</h2>' +
    (u ? '<button class="btn sm ghost" data-cal-nuovo="1">Rigenera il link</button>' : "") + "</div>";
  if (!u) {
    h += '<p class="faint">Crea il tuo indirizzo personale: da lì Google Calendar, Apple Calendario o Outlook leggono da soli le tue scadenze, le tue lavorazioni e le tue prenotazioni.</p>' +
      '<div style="margin-top:14px"><button class="btn" data-cal-nuovo="1">Crea il mio link</button></div></div>';
    return h;
  }
  h += '<div class="linkbox"><input type="text" readonly value="' + esc(u) + '" id="icslink"><button class="btn sm" data-cal-copia="1">Copia</button></div>' +
    '<div class="grid g2" style="margin-top:16px">' +
    '<div class="passi"><b>Google Calendar</b><ol><li>Apri Google Calendar sul computer.</li><li>Nella colonna a sinistra, accanto ad <i>Altri calendari</i>, clicca <b>+</b>.</li><li>Scegli <b>Da URL</b>, incolla il link e conferma.</li></ol></div>' +
    '<div class="passi"><b>iPhone, Mac, Outlook</b><ol><li>iPhone: Impostazioni › Calendario › Account › Aggiungi account › Altro › <b>Aggiungi calendario con sottoscrizione</b>.</li><li>Mac: Calendario › File › <b>Nuova sottoscrizione calendario</b>.</li><li>Outlook: Calendario › Aggiungi calendario › <b>Iscriviti dal Web</b>.</li></ol></div>' +
    "</div>" +
    '<p class="faint" style="margin-top:14px">Il link è personale e va tenuto per te: chi ce l’ha vede i titoli dei tuoi impegni. Se ti sfugge di mano, rigeneralo: il vecchio smette di funzionare all’istante. Gli aggiornamenti arrivano da soli, di solito entro poche ore.</p>' +
    "</div>";
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
  /* le ore le vede solo se sono state condivise, e sempre e solo aggregate */
  if (p.mostra_ore && (p.ore_area || []).length) {
    h += '<div class="card"><div class="cardhead"><h2>Ore dedicate</h2><span class="badge">' + num(p.ore_totali, 1) + " ore</span></div>";
    h += "<table><tbody>" + p.ore_area.map(function (a) {
      var q = p.ore_totali ? Math.round(a.ore / p.ore_totali * 100) : 0;
      return "<tr><td>" + esc(a.area) + '</td><td class="num">' + num(a.ore, 1) + ' h</td><td style="width:38%">' + prog(q) + "</td></tr>";
    }).join("") + "</tbody></table>";
    h += '<p class="faint" style="margin-top:10px">Il tempo che il lavoro ha richiesto finora, per area.</p></div>';
  }
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
  el("#memenu").innerHTML = '<div class="meinfo">' + esc(me.email) + '<span class="badge" style="margin-top:6px">Cliente</span></div>' +
    '<button data-esci="1" class="meesci"><span class="nt">Esci</span></button>';
}
async function apprRispondi(id, esito) {
  var nota = esito === "Modifiche richieste" ? prompt("Cosa vuoi far modificare?") : null;
  if (esito === "Modifiche richieste" && nota === null) return;
  var r = PLINK
    ? await sb.rpc("portale_link_rispondi", { tok: PLINK.tok, pwd: PLINK.pwd, a: id, esito: esito, nota: nota })
    : await sb.rpc("portale_rispondi", { a: id, esito: esito, nota: nota });
  if (r.error) { toast(erroreUmano(r.error), true); return; }
  PORT = (PLINK ? (r.data && r.data.progetti) : r.data) || PORT;
  toast(esito === "Approvata" ? "Approvato, grazie!" : "Richiesta inviata allo studio");
  render();
}

/* ---------------- preventivo / anteprima ---------------- */
/* ---------------- importare un preventivo già fatto ----------------
   Il documento lo apre il browser; il testo (e le pagine come immagini, se è una
   scansione o una foto) vanno a una funzione sul server, che le passa a OpenAI e
   ridà indietro dei campi puliti. La chiave OpenAI sta solo là dentro, mai qui.
   Quello che viene capito te lo faccio vedere prima di creare qualsiasi cosa,
   perché un preventivo indovinato male è peggio di uno scritto a mano. */
var IMP = null;
var PDFJS = null;
async function caricaPdfJs() {
  if (PDFJS) return PDFJS;
  await new Promise(function (ok, no) {
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = ok; s.onerror = function () { no(new Error("libreria non raggiungibile")); };
    document.head.appendChild(s);
  });
  var lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  PDFJS = lib;
  return lib;
}
/* rimette insieme le righe: il PDF dà pezzetti sparsi, li raggruppo per altezza */
async function testoDelPdf(file) {
  var lib = await caricaPdfJs();
  var buf = await file.arrayBuffer();
  var pdf = await lib.getDocument({ data: buf }).promise;
  var righe = [];
  for (var p = 1; p <= pdf.numPages; p++) {
    var pag = await pdf.getPage(p);
    var tc = await pag.getTextContent();
    var per = {};
    tc.items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var y = Math.round(it.transform[5]);
      var chiave = Math.round(y / 3) * 3;
      (per[chiave] = per[chiave] || []).push({ x: it.transform[4], t: it.str });
    });
    Object.keys(per).map(Number).sort(function (a, b) { return b - a; }).forEach(function (y) {
      var testo = per[y].sort(function (a, b) { return a.x - b.x; }).map(function (x) { return x.t; }).join(" ");
      testo = testo.replace(/\s+/g, " ").trim();
      if (testo) righe.push(testo);
    });
  }
  return righe;
}
/* le pagine come immagini: serve quando dentro il PDF non c'è testo, cioè
   quando qualcuno ha scansionato un foglio invece di esportarlo */
async function immaginiDelPdf(file, max) {
  var lib = await caricaPdfJs();
  var buf = await file.arrayBuffer();
  var pdf = await lib.getDocument({ data: buf }).promise;
  var out = [], n = Math.min(pdf.numPages, max || 4);
  for (var p = 1; p <= n; p++) {
    var pag = await pdf.getPage(p);
    var base = pag.getViewport({ scale: 1 });
    var vp = pag.getViewport({ scale: Math.min(1500 / base.width, 2) });
    var cv = document.createElement("canvas");
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    await pag.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    out.push(cv.toDataURL("image/jpeg", 0.7));
  }
  return out;
}
function eImmagine(file) {
  return /^image\//.test(file.type || "") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
}
function dataUrlDi(file) {
  return new Promise(function (ok, no) {
    var fr = new FileReader();
    fr.onload = function () { ok(fr.result); };
    fr.onerror = function () { no(new Error("non riesco ad aprire il file")); };
    fr.readAsDataURL(file);
  });
}
/* la lettura vera la fa OpenAI, ma dietro una funzione sul server: la chiave
   non passa mai da qui, e chiamare la funzione può farlo solo chi è dentro */
async function leggeIlServer(dati) {
  var s = await sb.auth.getSession();
  var ses = s && s.data ? s.data.session : null;
  if (!ses) throw new Error("la sessione è scaduta, rientra e riprova");
  var r = await fetch(String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/leggi-preventivo", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + ses.access_token },
    body: JSON.stringify(dati)
  });
  var j = null;
  try { j = await r.json(); } catch (e) { }
  if (r.status === 501) { var em = new Error("chiave non configurata"); em.chiaveMancante = true; throw em; }
  if (!r.ok) throw new Error((j && (j.errore || j.messaggio)) || "il server ha risposto " + r.status);
  if (!j) throw new Error("risposta vuota dal server");
  return j;
}
/* i numeri all'italiana: 1.234,56 è milleduecentotrentaquattro e cinquantasei */
function numIt(s) {
  if (s == null) return null;
  var t = String(s).replace(/[€\s ]/g, "");
  if (!/[\d]/.test(t)) return null;
  if (t.indexOf(",") > -1) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, "");
  else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, "");
  var n = parseFloat(t);
  return isNaN(n) ? null : n;
}
var RE_CODA = /(?:€\s*)?-?\d[\d.,]*\s*(?:€|%)?\s*$/;
var SALTA = /^(totale|imponibile|iva|subtotale|sconto|arrotondamento|acconto|saldo|spett|spettabile|preventivo|offerta|data|numero|pag(ina)?\b|iban|banca|firma|condizioni|validit|note|oggetto|descrizione|quantit|prezzo|importo|cliente|destinatario|via|viale|piazza|corso|c\.so|tel|cell|email|e-mail|pec)/i;
var SALTA_DENTRO = /(p\.?\s?iva|c\.?\s?f\.?|codice fiscale|iban|@|tel\.|cell\.|www\.|https?:)/i;
/* stacca dalla coda della riga i numeri, uno alla volta, e restituisce
   il testo pulito insieme ai numeri trovati nell'ordine in cui stavano */
function staccaNumeri(riga) {
  var testo = riga, numeri = [], g = 0;
  while (g++ < 5) {
    var m = testo.match(RE_CODA);
    if (!m || !m[0].trim()) break;
    var grezzo = m[0].trim();
    if (/%\s*$/.test(grezzo)) { testo = testo.slice(0, m.index).trim(); continue; }
    numeri.unshift(grezzo);
    testo = testo.slice(0, m.index).replace(/[\s.·•\-–|:]+$/, "").trim();
    if (!testo) break;
  }
  return { testo: testo, numeri: numeri };
}
function sembraSoldi(t) {
  var n = numIt(t);
  if (n == null) return false;
  if (/[.,]\d{2}\s*€?\s*$/.test(t)) return true;
  return n >= 50 && n % 1 === 0;
}
function leggiPreventivo(righe) {
  var testo = righe.join("\n");
  var out = { righe: [], cliente: "", numero: "", data: "", iva: null, totale: null, imponibile: null, scontoImporto: null, titolo: "" };

  /* numero e data */
  var m = testo.match(/(?:preventivo|offerta|documento)\s*(?:n[.°ro]*\s*)?[:#]?\s*([A-Za-z0-9][A-Za-z0-9\/\-\._]{1,18})/i);
  if (m && /\d/.test(m[1]) && !/^(del|di|per|al|n)$/i.test(m[1])) out.numero = m[1];
  var d = testo.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (d) {
    var anno = d[3].length === 2 ? "20" + d[3] : d[3];
    out.data = anno + "-" + ("0" + d[2]).slice(-2) + "-" + ("0" + d[1]).slice(-2);
  }
  var iv = testo.match(/IVA[^\d%]{0,12}(\d{1,2})\s*%/i) || testo.match(/(\d{1,2})\s*%\s*IVA/i);
  if (iv) out.iva = +iv[1];

  /* il cliente: dopo "Spett.le", oppure dopo "Cliente:" */
  for (var i = 0; i < righe.length; i++) {
    var r = righe[i];
    var sp = r.match(/spett(?:\.?le|abile)?\.?\s*[:,]?\s*(.+)/i);
    var cand = sp ? sp[1].replace(/^[.\s:,]+/, "").trim() : "";
    if (cand.length > 2 && !/^(le|abile)$/i.test(cand)) { out.cliente = cand; break; }
    if (/^spett/i.test(r) && righe[i + 1]) { out.cliente = righe[i + 1].trim(); break; }
    var cl = r.match(/^\s*(?:cliente|destinatario)\s*[:\-]\s*(.+)/i);
    if (cl) { out.cliente = cl[1].trim(); break; }
  }
  if (out.cliente) out.cliente = out.cliente.replace(/\s*[-–]\s*(p\.?\s?iva|c\.?f\.?).*$/i, "").trim();

  /* oggetto del lavoro */
  var og = testo.match(/ogg?etto\s*[:\-]\s*(.+)/i);
  if (og) out.titolo = og[1].trim().slice(0, 90);

  /* totali dichiarati, per il controllo */
  righe.forEach(function (r) {
    var sc = r.match(/sconto[^\d-]{0,24}(-?[\d., ]+)/i);
    if (sc) { var vs = numIt(sc[1]); if (vs != null && vs !== 0) out.scontoImporto = Math.abs(vs); }
    var im = r.match(/imponibile[^\d-]{0,20}([\d., ]+)/i);
    if (im) out.imponibile = numIt(im[1]);
    var to = r.match(/totale(?:\s+documento|\s+generale|\s+da\s+pagare|\s+ivato)?[^\d-]{0,20}([\d., ]+)/i);
    if (to) { var v = numIt(to[1]); if (v != null && (out.totale == null || v > out.totale)) out.totale = v; }
  });

  /* le voci: righe con del testo e almeno un importo in coda */
  righe.forEach(function (r0) {
    if (SALTA.test(r0) || SALTA_DENTRO.test(r0)) return;
    /* code di cortesia dopo il prezzo: "450,00 al mese", "12,00 cad." */
    var r = r0.replace(/\s*(al mese|\/\s*mese|mensili?|cad(auno)?\.?|\bciascuno\b|iva esclusa|\+\s*iva|oltre iva)\s*$/i, "").trim();
    var st = staccaNumeri(r);
    if (!st.numeri.length) return;
    var testoVoce = st.testo;
    if (testoVoce.length < 3) return;
    if ((testoVoce.match(/[a-zàèéìòùA-ZÀÈÉÌÒÙ]/g) || []).length < 4) return;
    if (!st.numeri.some(sembraSoldi)) return;
    var v = st.numeri.slice(-3).map(numIt).filter(function (x) { return x != null; });
    var qta = 1, prezzo = null;
    if (v.length >= 3) { qta = v[0] > 0 && v[0] < 10000 && v[0] % 1 === 0 ? v[0] : 1; prezzo = v[1]; }
    else if (v.length === 2) {
      if (v[0] === v[1]) { qta = 1; prezzo = v[0]; }
      else if (v[0] % 1 === 0 && v[0] > 0 && v[0] <= 1000 && Math.abs(v[0] * v[1] - v[1]) > 0.01 && Math.abs(v[0] * v[1] - v[v.length - 1]) < 0.02) { qta = v[0]; prezzo = v[1]; }
      else if (v[0] !== 0 && v[1] > v[0] && Math.abs(v[1] / v[0] - Math.round(v[1] / v[0])) < 0.005) { qta = Math.round(v[1] / v[0]); prezzo = v[0]; }
      else { qta = 1; prezzo = v[1]; }
    } else { qta = 1; prezzo = v[0]; }
    if (prezzo == null || prezzo === 0) return;
    out.righe.push({ nome: testoVoce.slice(0, 120), qty: qta, prezzo_unit: Math.round(prezzo * 100) / 100 });
  });

  /* se una voce coincide col totale è la riga del totale, non un servizio */
  if (out.totale != null && out.righe.length > 1) {
    out.righe = out.righe.filter(function (r) { return Math.abs(r.qty * r.prezzo_unit - out.totale) > 0.02; });
  }
  return out;
}
function clienteSimile(nome) {
  if (!nome) return null;
  var n = nome.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!n) return null;
  var trovato = null;
  fcli().forEach(function (c) {
    var k = String(c.nome || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!k) return;
    if (k === n || k.indexOf(n) > -1 || n.indexOf(k) > -1) trovato = trovato || c;
  });
  return trovato;
}
async function importaPdf(file) {
  if (!file) return;
  var ePdf = /pdf$/i.test(file.name || "") || file.type === "application/pdf";
  if (!ePdf && !eImmagine(file)) { toast("Posso leggere un PDF, una scansione o una foto del preventivo", true); return; }
  if (file.size > 20 * 1024 * 1024) { toast("Il file pesa troppo: sopra i 20 MB non ce la faccio", true); return; }

  toast("Apro il documento…");
  var righe = [], immagini = [];
  try {
    if (ePdf) {
      try { righe = await testoDelPdf(file); } catch (e) { righe = []; }
      /* poco testo vuol dire scansione: allora mando le pagine come immagini */
      if (righe.join("").replace(/\s/g, "").length < 120) {
        try { immagini = await immaginiDelPdf(file, 4); } catch (e) { }
      }
    } else {
      immagini = [await dataUrlDi(file)];
    }
  } catch (e) { toast("Non riesco ad aprire il documento: " + e.message, true); return; }
  if (!righe.length && !immagini.length) { toast("Dentro questo documento non c'è niente da leggere", true); return; }

  var letto = null, fonte = "";
  try {
    toast(immagini.length ? "Sto guardando le pagine…" : "Sto leggendo il preventivo…");
    var ai = await leggeIlServer({ nome: file.name, testo: righe, immagini: immagini });
    letto = {
      righe: ai.righe || [], cliente: ai.cliente || "", numero: ai.numero || "", data: ai.data || "",
      iva: ai.iva == null ? null : +ai.iva, totale: ai.totale, imponibile: ai.imponibile,
      scontoImporto: ai.scontoImporto, titolo: ai.titolo || "",
      premessa: ai.premessa || "", chiusura: ai.chiusura || "", condizioni: ai.condizioni || "",
      validita: ai.validita, sezioni: ai.sezioni || [], pagamenti: ai.pagamenti || [],
      referente: ai.cliente_referente || "", piva: ai.cliente_piva || "",
      indirizzo: ai.cliente_indirizzo || "", email: ai.cliente_email || ""
    };
    fonte = "openai";
  } catch (e) {
    if (!righe.length) {
      toast(e.chiaveMancante
        ? "Per leggere una scansione o una foto serve la chiave OpenAI su Supabase. Senza, riesco a leggere solo i PDF con del testo dentro."
        : "Lettura non riuscita: " + e.message, true);
      return;
    }
    letto = leggiPreventivo(righe);
    fonte = e.chiaveMancante ? "locale" : "ripiego";
    toast(e.chiaveMancante
      ? "Letto qui in locale: la chiave OpenAI non è ancora configurata"
      : "OpenAI non ha risposto (" + e.message + "), ho letto qui in locale", true);
  }

  var cl = clienteSimile(letto.cliente);
  IMP = {
    file: file, testo: righe, immagini: immagini.length, fonte: fonte, letto: letto,
    cliente_id: cl ? cl.id : "", cliente_nome: letto.cliente || "",
    titolo: letto.titolo || file.name.replace(/\.[a-z0-9]+$/i, ""),
    numero: letto.numero || "", data: letto.data || today(),
    iva: letto.iva == null ? 22 : letto.iva,
    righe: (letto.righe || []).map(function (r) {
      return { nome: r.nome, descrizione: r.descrizione || "", qty: r.qty, prezzo_unit: r.prezzo_unit,
        ricorrente: !!r.ricorrente, periodo: r.periodo || (r.ricorrente ? "Mensile" : null), cicli: r.cicli || null,
        inizio: null, stato: "Da iniziare", nota_prezzo: r.nota_prezzo || null };
    }), sconto: 0, mostraTesto: false,
    /* dove sta davvero: un preventivo importato spesso è già stato accettato,
       a volte è già finito. Da qui partono date, conti e attività. */
    stato: "Inviato", accettato_il: letto.data || today(), completato_il: "",
    /* le parti discorsive: quello che il preventivo prometteva, non solo quanto costava */
    premessa: letto.premessa || "", chiusura: letto.chiusura || "", condizioni: letto.condizioni || "",
    validita: letto.validita == null ? 30 : letto.validita,
    sezioni: (letto.sezioni || []).slice(),
    pagamenti: (letto.pagamenti || []).slice(),
    anag: { referente: letto.referente || "", piva: letto.piva || "", indirizzo: letto.indirizzo || "", email: letto.email || "" },
    salvaAnag: true, creaPag: true, tieniSez: true
  };
  /* se sul documento c'era uno sconto, lo riporto in percentuale così i conti tornano */
  var somma = sum(IMP.righe, function (r) { return (+r.qty || 0) * (+r.prezzo_unit || 0); });
  if (letto.scontoImporto && somma > 0) IMP.sconto = Math.round(letto.scontoImporto / somma * 1000) / 10;
  else if (letto.imponibile != null && somma > letto.imponibile + 0.5) IMP.sconto = Math.round((1 - letto.imponibile / somma) * 1000) / 10;
  go("importa");
}
function vImporta() {
  var h = crumbs([[gruppoDi("commesse") || "Clienti"], ["Preventivi", "commesse"], ["Importa"]]);
  h += '<div class="top"><h1>Importa un preventivo<span class="sub">Da un PDF, una scansione o una foto</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-route="commesse|-|personali">Torna ai preventivi</button></div></div>';

  if (!IMP) {
    h += '<div class="card"><div class="drop" id="drop" data-imp="1"><b>Trascina qui il preventivo</b>' +
      '<span class="faint">oppure <label class="lnk">scegli dal computer<input type="file" id="impinp" accept="application/pdf,.pdf,image/*" style="display:none"></label></span>' +
      '<span class="faint dropsub">PDF, scansione o foto — va bene anche storta</span></div>' +
      '<p class="faint">Il documento passa da OpenAI, che lo legge per tirarne fuori cliente, voci e importi. ' +
      "Quello che arriva dall'API non viene usato per addestrare i loro modelli. " +
      "Prima di creare qualsiasi cosa ti faccio vedere cosa ha capito, e puoi correggere tutto.</p></div>";
    return h;
  }

  var lordo = sum(IMP.righe, function (r) { return (+r.qty || 0) * (+r.prezzo_unit || 0) * (r.ricorrente ? Math.max(1, +r.cicli || 12) : 1); });
  var sconto = Math.round(lordo * (+IMP.sconto || 0) / 100);
  var tot = lordo - sconto;
  var iva = Math.round(tot * (+IMP.iva || 0) / 100);
  var scarto = IMP.letto.totale != null ? Math.round((tot + iva - IMP.letto.totale) * 100) / 100 : null;

  var comeLetto = IMP.fonte === "openai"
    ? (IMP.immagini ? "letto da OpenAI guardando le pagine" : "letto da OpenAI")
    : IMP.fonte === "ripiego" ? "letto qui in locale, OpenAI non ha risposto" : "letto qui in locale";
  h += '<div class="card"><div class="cardhead"><h2>Cosa ho capito</h2><span class="faint">' + esc(IMP.file.name) + " · " + comeLetto + "</span></div>";
  h += '<p class="faint" style="margin-bottom:16px">Controlla e correggi: finché non premi il pulsante in fondo non viene creato niente.</p>';
  h += '<div class="grid g2">' +
    '<div class="field"><label>Cliente</label><select data-imp-set="cliente_id"><option value="">— crea un cliente nuovo —</option>' +
    fcli().map(function (c) { return '<option value="' + c.id + '"' + (IMP.cliente_id === c.id ? " selected" : "") + ">" + esc(c.nome) + "</option>"; }).join("") + "</select>" +
    (IMP.cliente_id ? "" : '<input type="text" data-imp-set="cliente_nome" value="' + esc(IMP.cliente_nome) + '" placeholder="Nome del cliente nuovo" style="margin-top:8px">') +
    (IMP.cliente_id ? '<p class="faint" style="margin-top:6px">Riconosciuto dal documento: ' + esc(IMP.cliente_nome || "—") + "</p>" : "") + "</div>" +
    '<div class="field"><label>Titolo del preventivo</label><input type="text" data-imp-set="titolo" value="' + esc(IMP.titolo) + '"></div>' +
    "</div>";
  h += '<div class="grid g4">' +
    '<div class="field"><label>Numero</label><input type="text" data-imp-set="numero" value="' + esc(IMP.numero) + '"></div>' +
    '<div class="field"><label>Data</label><input type="date" data-imp-set="data" value="' + esc(IMP.data) + '"></div>' +
    '<div class="field"><label>Sconto %</label><input type="number" step="0.1" data-imp-set="sconto" value="' + (IMP.sconto || 0) + '"></div>' +
    '<div class="field"><label>IVA %</label><input type="number" data-imp-set="iva" value="' + (IMP.iva == null ? "" : IMP.iva) + '"></div>' +
    "</div></div>";

  h += '<div class="card"><div class="cardhead"><h2>Voci trovate</h2><button class="btn sm ghost" data-imp-riga="new">+ Aggiungi voce</button></div>';
  h += IMP.righe.length
    ? '<table><thead><tr><th>Voce</th><th class="num" style="width:90px">Q.tà</th><th class="num" style="width:130px">Prezzo</th><th class="num" style="width:120px">Importo</th><th></th></tr></thead><tbody>' +
      IMP.righe.map(function (r, i) {
        var cic = r.ricorrente ? Math.max(1, +r.cicli || 12) : 1;
        var mod = attivitaTipo({ nome: r.nome, descrizione: r.descrizione, assegnato_id: me.pro_id });
        return '<tr><td><input type="text" data-imp-riga="' + i + '|nome" value="' + esc(r.nome) + '">' +
          (r.nota_prezzo ? '<div class="faint">' + esc(r.nota_prezzo) + "</div>" : "") + "</td>" +
          '<td class="num"><input type="number" step="0.5" data-imp-riga="' + i + '|qty" value="' + (r.qty == null ? "" : r.qty) + '"></td>' +
          '<td class="num"><input type="number" step="0.01" data-imp-riga="' + i + '|prezzo_unit" value="' + (r.prezzo_unit == null ? "" : r.prezzo_unit) + '"></td>' +
          '<td class="num"><b>' + eur((+r.qty || 0) * (+r.prezzo_unit || 0) * cic) + "</b>" + (r.ricorrente ? '<div class="faint">' + cic + " × " + eur((+r.qty || 0) * (+r.prezzo_unit || 0)) + "</div>" : "") + "</td>" +
          '<td class="num"><button class="lnk" data-imp-riga="' + i + '|togli">togli</button></td></tr>' +
          '<tr class="impdett"><td colspan="5"><div class="impopz">' +
          '<label>Si ripete <select data-imp-riga="' + i + '|periodo">' + selKV([["", "no, una tantum"], ["Mensile", "ogni mese"], ["Annuale", "ogni anno"]], r.ricorrente ? (r.periodo || "Mensile") : "") + "</select></label>" +
          (r.ricorrente ? '<label>per <input type="number" min="1" data-imp-riga="' + i + '|cicli" value="' + (r.cicli || 12) + '" style="width:64px"> ' + (r.periodo === "Annuale" ? "anni" : "mesi") + "</label>" +
            '<label>dal <input type="date" data-imp-riga="' + i + '|inizio" value="' + esc(r.inizio || "") + '" title="Vuoto = dalla data di accettazione"></label>' : "") +
          '<label>Stato <select data-imp-riga="' + i + '|stato">' + sel(["Da iniziare", "In corso", "Consegnato"], r.stato || "Da iniziare") + "</select></label>" +
          '<span class="faint">attività: ' + esc(mod.da ? "da " + mod.da : "generiche") + "</span>" +
          "</div></td></tr>";
      }).join("") + "</tbody></table>" +
      '<p class="faint" style="margin-top:8px">Un canone si ripete: metti quanti mesi e da quando. Se il prezzo è cambiato lungo il contratto, fai due voci con due date. «Consegnato» vuol dire già fatto: nasce chiuso, senza attività finte.</p>'
    : vuoto("Non è stata riconosciuta nessuna voce. Aggiungile a mano, oppure apri il testo qui sotto e copia da lì.");
  h += '<table class="dtot" style="margin-top:14px"><tbody>' +
    (sconto ? row2("Somma delle voci", eur(lordo)) + row2("Sconto " + IMP.sconto + "%", "−" + eur(sconto)) : "") +
    row2("Imponibile", eur(tot)) +
    row2("IVA " + (IMP.iva || 0) + "%", eur(iva)) +
    row2('<b class="big">Totale</b>', '<b class="big">' + eur(tot + iva) + "</b>") +
    (IMP.letto.totale != null ? row2("Totale scritto sul documento", eur(IMP.letto.totale)) : "") +
    "</tbody></table>";
  if (scarto !== null && Math.abs(scarto) > 0.5) {
    h += '<p class="impnota"><b>Attenzione:</b> il totale che viene fuori dalle voci è di ' + eur(Math.abs(scarto)) +
      (scarto > 0 ? " più alto" : " più basso") + ' di quello scritto sul documento. Probabilmente una voce è stata letta male, oppure c\'è uno sconto che non ho visto.</p>';
  }
  h += "</div>";

  h += cardStatoImport();
  h += cardTestoImport();
  h += cardPagImport(tot);
  h += cardAnagImport();

  if (IMP.testo.length) {
    h += '<div class="card"><div class="cardhead"><h2>Il testo del documento</h2><span class="faint" style="margin-right:auto">' + IMP.testo.length + " righe</span>" +
      '<button class="btn sm ghost" data-imp-testo="1">' + (IMP.mostraTesto ? "Nascondi" : "Mostra") + "</button></div>";
    h += IMP.mostraTesto
      ? '<pre class="imptesto">' + esc(IMP.testo.join("\n")) + "</pre>"
      : '<p class="faint">Se qualcosa manca, aprilo e copia da qui: è tutto quello che c\'era scritto nel documento.</p>';
    h += "</div>";
  } else {
    h += '<div class="card"><div class="cardhead"><h2>Il testo del documento</h2></div>' +
      '<p class="faint">Dentro non c\'era testo da copiare: è una scansione o una foto, ' +
      "ed è stata letta guardando le pagine (" + IMP.immagini + (IMP.immagini === 1 ? " pagina" : " pagine") + "). " +
      "Controlla i numeri con più attenzione del solito.</p></div>";
  }

  h += '<div class="fpage"><div class="actionbar">' +
    '<span class="faint grow">' + esc(riepilogoImport()) + "</span>" +
    '<button class="btn ghost" data-imp-annulla="1">Ricomincia</button>' +
    '<button class="btn" data-imp-crea="1">Crea il preventivo</button></div></div>';
  return h;
}
/* Dove sta il preventivo. Se lo importi vecchio, dimmi com'è andata: così i
   conti, le scadenze e le attività partono da lì e non da oggi. */
function cardStatoImport() {
  var st = IMP.stato || "Inviato";
  var h = '<div class="card"><div class="cardhead"><h2>Dove sta questo preventivo</h2><span class="faint">' + esc(STATO_SPIEGA[st] || "") + "</span></div>";
  h += '<div class="grid g3">' +
    '<div class="field"><label>Stato</label><select data-imp-set="stato">' + sel(STATI, st) + "</select></div>" +
    (STATI_VINTI.indexOf(st) > -1 ? '<div class="field"><label>Accettato il</label><input type="date" data-imp-set="accettato_il" value="' + esc(IMP.accettato_il || "") + '"></div>' : "") +
    (st === "Completato" ? '<div class="field"><label>Finito il</label><input type="date" data-imp-set="completato_il" value="' + esc(IMP.completato_il || "") + '"></div>' : "") +
    "</div>";
  h += '<p class="faint">' + (STATI_VINTI.indexOf(st) > -1
    ? "Dalla data di accettazione partono i canoni e le attività: i mesi già passati nascono già fatti, il mese in corso nasce aperto, il resto in programma."
    : "Se il cliente ha già detto sì, mettilo qui: altrimenti resta un preventivo in attesa e lo accetti dopo dalla sua scheda.") + "</p></div>";
  return h;
}
/* quanto vale ogni scadenza: sulla voce a cui si riferisce se ce l'ha
   («Sito web: 50% alla conferma»), altrimenti sul totale */
function impRigaSimile(nomeVoce) {
  var n = String(nomeVoce || "").toLowerCase();
  if (!n) return null;
  return IMP.righe.filter(function (r) {
    var rn = String(r.nome || "").toLowerCase();
    return rn && (rn.indexOf(n) > -1 || n.indexOf(rn) > -1 || rn.split(" ")[0] === n.split(" ")[0]);
  })[0] || null;
}
function impPagImporti(tot) {
  return (IMP.pagamenti || []).map(function (p) {
    var riga = p.voce ? impRigaSimile(p.voce) : null;
    var base = riga ? (+riga.qty || 0) * (+riga.prezzo_unit || 0) * (1 - (+IMP.sconto || 0) / 100) : tot;
    var v = p.importo != null ? +p.importo : (p.percentuale != null ? Math.round(base * p.percentuale) / 100 : null);
    return { nome: p.nome + (riga ? " — " + riga.nome : ""), percentuale: p.percentuale, importo: v, voce: riga ? riga.nome : null };
  });
}
/* i canoni: una scadenza al mese, con la data, dalla partenza per tutti i cicli */
function impCanoni() {
  var out = [], partenza = IMP.accettato_il || IMP.data || today();
  IMP.righe.forEach(function (r) {
    if (!r.ricorrente || !(+r.prezzo_unit)) return;
    var n = Math.max(1, +r.cicli || 12), da = r.inizio || partenza, mensile = r.periodo !== "Annuale";
    for (var m = 0; m < n; m++) {
      var d = mensile ? aggMesi(da, m) : iso(new Date(new Date(da + "T00:00:00").setFullYear(new Date(da + "T00:00:00").getFullYear() + m)));
      out.push({ nome: (r.nome + " — " + (mensile ? meseEt(d.slice(0, 7)) : d.slice(0, 4))).slice(0, 140),
        importo: Math.round((+r.qty || 1) * (+r.prezzo_unit) * (1 - (+IMP.sconto || 0) / 100)), scadenza: d });
    }
  });
  return out;
}
function riepilogoImport() {
  var pezzi = [IMP.cliente_id ? "il preventivo" : "il cliente e il preventivo"];
  if (IMP.righe.length) pezzi.push(IMP.righe.length + (IMP.righe.length === 1 ? " voce" : " voci"));
  if (IMP.tieniSez && IMP.sezioni.length) pezzi.push(IMP.sezioni.length + (IMP.sezioni.length === 1 ? " sezione di testo" : " sezioni di testo"));
  if (IMP.creaPag && IMP.pagamenti.length) pezzi.push(IMP.pagamenti.length + " scadenze di pagamento");
  var nc = IMP.creaCanoni !== false ? impCanoni().length : 0;
  if (nc) pezzi.push(nc + " canoni");
  if (STATI_VINTI.indexOf(IMP.stato) > -1) pezzi.push("i progetti e le attività (è già accettato)");
  return "Verranno creati: " + pezzi.join(", ") + ". Il documento resta allegato.";
}
/* Il testo del preventivo: la parte che spiega, che è quella che il cliente
   legge davvero. Qui si controlla prima di portarla dentro. */
function cardTestoImport() {
  var h = '<div class="card"><div class="cardhead"><h2>Il testo del preventivo</h2>' +
    '<label class="chk"><input type="checkbox" data-imp-flag="tieniSez"' + (IMP.tieniSez ? " checked" : "") + "> tieni le sezioni</label></div>";
  h += '<div class="field"><label>Premessa</label><textarea data-imp-set="premessa" rows="4" placeholder="Il testo di apertura del documento">' + esc(IMP.premessa || "") + "</textarea></div>";
  if (IMP.sezioni.length) {
    h += '<div class="impsez">' + IMP.sezioni.map(function (s, i) {
      return '<div class="impsr"><div class="impst"><b>' + esc(s.t) + '</b><span class="badge ' + (s.d === "dopo" ? "b-amber" : "b-blue") + '">' +
        (s.d === "dopo" ? "dopo i prezzi" : "prima dei prezzi") + "</span>" +
        '<button class="lnk mini2" data-imp-sez="' + i + '|togli">togli</button></div>' +
        (s.x ? '<p class="faint">' + esc(s.x.length > 220 ? s.x.slice(0, 220) + "…" : s.x) + "</p>" : "") +
        (s.v.length ? "<ul>" + s.v.slice(0, 6).map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("") +
          (s.v.length > 6 ? '<li class="faint">e altre ' + (s.v.length - 6) + "</li>" : "") + "</ul>" : "") + "</div>";
    }).join("") + "</div>";
  } else {
    h += '<p class="faint">Nessuna sezione discorsiva: questo documento era solo una tabella di prezzi.</p>';
  }
  h += '<div class="grid g2" style="margin-top:14px">' +
    '<div class="field"><label>Condizioni</label><textarea data-imp-set="condizioni" rows="3" placeholder="Condizioni generali, note legali">' + esc(IMP.condizioni || "") + "</textarea></div>" +
    '<div class="field"><label>Chiusura</label><textarea data-imp-set="chiusura" rows="3" placeholder="La frase finale">' + esc(IMP.chiusura || "") + "</textarea></div>" +
    "</div></div>";
  return h;
}
function cardPagImport(tot) {
  var pg = impPagImporti(tot);
  var h = '<div class="card"><div class="cardhead"><h2>Come si paga</h2>' +
    (IMP.pagamenti.length ? '<label class="chk"><input type="checkbox" data-imp-flag="creaPag"' + (IMP.creaPag ? " checked" : "") + "> crea le scadenze</label>" : "") + "</div>";
  h += pg.length
    ? "<table><thead><tr><th>Quando</th><th class=\"num\" style=\"width:110px\">Quota</th><th class=\"num\" style=\"width:130px\">Importo</th><th></th></tr></thead><tbody>" +
      pg.map(function (p, i) {
        return "<tr><td>" + esc(p.nome) + '</td><td class="num">' + (p.percentuale != null ? p.percentuale + " %" : "—") + "</td>" +
          '<td class="num"><b>' + (p.importo == null ? "—" : eur(p.importo)) + "</b></td>" +
          '<td class="num"><button class="lnk" data-imp-pag="' + i + '|togli">togli</button></td></tr>';
      }).join("") + "</tbody></table>" +
      '<p class="faint" style="margin-top:10px">Le date non ci sono sul documento: queste scadenze nascono senza data e le metti tu dal quadro amministrativo.</p>'
    : '<p class="faint">Il documento non dice come si paga.</p>';
  var can = impCanoni();
  if (can.length) {
    h += '<div class="cardhead" style="margin-top:16px"><h2>I canoni</h2><label class="chk"><input type="checkbox" data-imp-flag="creaCanoni"' + (IMP.creaCanoni !== false ? " checked" : "") + "> crea una scadenza al mese</label></div>";
    h += '<p class="faint">' + can.length + " scadenze, dal " + dt(can[0].scadenza) + " al " + dt(can[can.length - 1].scadenza) + ", per " + eur(can.reduce(function (n, c) { return n + c.importo; }, 0)) + " in tutto. " +
      (IMP.accettato_il ? "Partono dalla data di accettazione" : "Partono dalla data del documento") + ", o dalla data che hai messo sulla voce.</p>";
  }
  return h + "</div>";
}
/* Quello che il documento dice del cliente e che in anagrafica manca. */
function cardAnagImport() {
  var cl = IMP.cliente_id ? by(D.cli, IMP.cliente_id) : null;
  var campi = [["referente", "Referente"], ["piva", "Partita IVA"], ["indirizzo", "Indirizzo"], ["email", "Email"]];
  var nuovi = campi.filter(function (c) { return IMP.anag[c[0]] && (!cl || !cl[c[0]]); });
  if (!nuovi.length) return "";
  return '<div class="card"><div class="cardhead"><h2>Dati del cliente trovati sul documento</h2>' +
    '<label class="chk"><input type="checkbox" data-imp-flag="salvaAnag"' + (IMP.salvaAnag ? " checked" : "") + "> salvali in anagrafica</label></div>" +
    '<table><tbody>' + nuovi.map(function (c) {
      return "<tr><td>" + c[1] + "</td><td><b>" + esc(IMP.anag[c[0]]) + "</b></td></tr>";
    }).join("") + "</tbody></table>" +
    '<p class="faint" style="margin-top:10px">' + (cl ? "In anagrafica questi campi sono vuoti: vengono riempiti, niente viene sovrascritto." : "Il cliente è nuovo: nasce già con questi dati.") + "</p></div>";
}
async function creaDaImport() {
  if (!IMP) return;
  if (!IMP.righe.length && !confirm("Non c'è nessuna voce. Creo lo stesso il preventivo vuoto?")) return;
  var cid = IMP.cliente_id;
  var anag = IMP.salvaAnag ? IMP.anag : {};
  if (!cid) {
    var nome = (IMP.cliente_nome || "").trim();
    if (!nome) { toast("Dimmi come si chiama il cliente, oppure scegline uno dall'elenco", true); return; }
    var nuovo = { nome: nome, owner_id: me.pro_id, stato: "Attivo" };
    ["referente", "piva", "indirizzo", "email"].forEach(function (c) { if (anag[c]) nuovo[c] = anag[c]; });
    var rc = await sb.from("clienti").insert(nuovo).select().single();
    if (rc.error) { toast(erroreUmano(rc.error), true); return; }
    cid = rc.data.id;
  } else if (IMP.salvaAnag) {
    /* riempio solo i buchi: quello che c'è già non si tocca */
    var vecchio = by(D.cli, cid) || {}, tappi = {};
    ["referente", "piva", "indirizzo", "email"].forEach(function (c) { if (anag[c] && !vecchio[c]) tappi[c] = anag[c]; });
    if (Object.keys(tappi).length) {
      var ru = await sb.from("clienti").update(tappi).eq("id", cid);
      if (ru.error) toast("Anagrafica non aggiornata: " + erroreUmano(ru.error), true);
    }
  }
  var rk = await sb.from("commesse").insert({
    titolo: (IMP.titolo || "Preventivo importato").slice(0, 140),
    cliente_id: cid, owner_id: me.pro_id, pm_id: me.pro_id, stato: IMP.stato || "Inviato", inviato_il: IMP.data || today(),
    accettato_il: STATI_VINTI.indexOf(IMP.stato) > -1 ? (IMP.accettato_il || IMP.data || today()) : null,
    completato_il: IMP.stato === "Completato" ? (IMP.completato_il || today()) : null,
    ambito: IMP.ambito || "personale",
    numero: IMP.numero || null, data: IMP.data || today(), iva: IMP.iva == null ? 22 : +IMP.iva, sconto: +IMP.sconto || 0,
    premessa: IMP.premessa || null, condizioni: IMP.condizioni || null, chiusura: IMP.chiusura || null,
    validita: IMP.validita == null ? 30 : +IMP.validita,
    sezioni: IMP.tieniSez ? (IMP.sezioni || []) : [],
    note: "Importato da " + IMP.file.name
  }).select().single();
  if (rk.error) { toast(erroreUmano(rk.error), true); return; }
  var kid = rk.data.id;
  if (IMP.righe.length) {
    var righe = IMP.righe.map(function (r, i) {
      return { commessa_id: kid, tipo: "Servizio", nome: (r.nome || "Voce").slice(0, 200),
        descrizione: r.descrizione || null,
        qty: +r.qty || 1, prezzo_unit: +r.prezzo_unit || 0, assegnato_id: me.pro_id, ordine: i + 1,
        ricorrente: !!r.ricorrente, periodo: r.ricorrente ? (r.periodo || "Mensile") : null, cicli: r.ricorrente ? Math.max(1, +r.cicli || 12) : 1,
        inizio: r.inizio || null, stato: r.stato || "Da iniziare", nota_prezzo: r.nota_prezzo || null };
    });
    var rr = await sb.from("righe").insert(righe);
    if (rr.error) toast("Preventivo creato, ma le voci no: " + erroreUmano(rr.error), true);
  }
  /* le scadenze: senza data, perché il documento dice «alla firma», non «il 12» */
  if (IMP.creaPag && IMP.pagamenti.length) {
    var lordoP = sum(IMP.righe, function (r) { return (+r.qty || 0) * (+r.prezzo_unit || 0) * (r.ricorrente ? Math.max(1, +r.cicli || 12) : 1); });
    var totP = lordoP - Math.round(lordoP * (+IMP.sconto || 0) / 100);
    var rp = await sb.from("pagamenti").insert(impPagImporti(totP).map(function (p) {
      return { commessa_id: kid, nome: p.nome.slice(0, 140), importo: p.importo, stato: "Da incassare" };
    }));
    if (rp.error) toast("Preventivo creato, ma le scadenze no: " + erroreUmano(rp.error), true);
  }
  var canoni = IMP.creaCanoni !== false ? impCanoni() : [];
  if (canoni.length) {
    var rcan = await sb.from("pagamenti").insert(canoni.map(function (c) {
      var passato = c.scadenza && fineMese(c.scadenza) < today();
      return { commessa_id: kid, nome: c.nome, importo: c.importo, scadenza: fineMese(c.scadenza), stato: passato ? "Incassato" : "Da incassare", pagato_il: passato ? fineMese(c.scadenza) : null };
    }));
    if (rcan.error) toast("Preventivo creato, ma i canoni no: " + erroreUmano(rcan.error), true);
  }
  /* il documento di partenza resta attaccato: serve per controllare cosa avevi promesso */
  try {
    var path = kid + "/" + Date.now() + "-" + IMP.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var up = await sb.storage.from("materiali").upload(path, IMP.file);
    if (!up.error) await sb.from("materiali").insert({ commessa_id: kid, nome: IMP.file.name, path: path,
      dim: IMP.file.size, tipo: "Contratto", visibile_cliente: false, caricato_da: me.pro_id, note: "Il preventivo originale da cui è stato importato" });
  } catch (e) { }
  await logEv(kid, "Importato da " + IMP.file.name);
  await reload(["com", "righe", "cli", "mat", "ev", "pag"]);
  var giaVinto = STATI_VINTI.indexOf(IMP.stato) > -1;
  IMP = null;
  if (giaVinto) {
    var fL = await apriIlLavoro(kid);
    toast("Preventivo importato. " + esitoLavoro(fL));
  } else toast("Preventivo importato");
  go("commessa", kid, "servizi");
}

/* ---------------- preventivo impaginato ----------------
   Personale o dello studio: lo decide chi ci lavora dentro. Se le righe sono solo
   tue esce a tuo nome, se ci sono colleghi esce a nome Giraffa Studio. Puoi sempre
   forzarlo a mano dal documento. */
function ambitoCom(k) {
  if (k.ambito === "personale" || k.ambito === "studio") return k.ambito;
  var chi = {};
  righeOf(k.id).forEach(function (r) { var p = rigaCalc(r).pro; if (p) chi[p] = 1; });
  if (k.owner_id) chi[k.owner_id] = 1;
  if (k.pm_id) chi[k.pm_id] = 1;
  return Object.keys(chi).length > 1 ? "studio" : "personale";
}
function ambitoEt(a) { return a === "studio" ? "Preventivo dello studio" : "Preventivo personale"; }
/* chi emette il documento: lo studio oppure il singolo professionista */
function emittente(k) {
  if (ambitoCom(k) === "studio") {
    var mio = (D.priv || []).filter(function (x) { return x.pro_id === me.pro_id; })[0] || {};
    return { nome: SET.studio_nome || "Giraffa Studio", piva: SET.studio_piva, indirizzo: SET.studio_indirizzo,
      email: SET.studio_email, tel: SET.studio_telefono, sito: SET.studio_sito, iban: SET.studio_iban,
      condizioni: SET.studio_condizioni, studio: true, logo: SET.studio_logo || null,
      /* sul preventivo dello studio firma chi lo manda: la firma è la sua */
      firma: mio.firma || null, firmatario: me.nome };
  }
  var p = by(D.pros, k.owner_id || me.pro_id) || {};
  var pv = (D.priv || []).filter(function (x) { return x.pro_id === p.id; })[0] || {};
  return { nome: p.nome || me.nome, piva: p.piva, indirizzo: p.indirizzo || p.citta,
    email: p.email, tel: p.telefono, sito: p.sito, iban: pv.iban, condizioni: pv.condizioni, studio: false,
    logo: pv.logo || null, firma: pv.firma || null, firmatario: p.nome };
}
/* La data che sta sul documento. Se importi un preventivo di marzo, quello
   resta un preventivo di marzo: la data in cui l'hai messo dentro il CRM non
   c'entra niente con la data che il cliente ha visto. */
/* Il PDF si chiama come il preventivo, non «Giraffa Studio — CRM» */
function nomeFile(k) {
  var cl = by(D.cli, k.cliente_id);
  return ((k.numero || numeroDoc(k)) + " " + (cl ? cl.nome : "") + " " + (k.titolo || "")).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}
/* L'email al cliente, già scritta: chi manda deve solo allegare il PDF */
function testoMailPreventivo(k, cl) {
  var em = emittente(k), c = calc(k);
  var corpo = "Gentile " + (cl.referente || cl.nome || "") + ",\n\n" +
    "come concordato le invio il preventivo «" + (k.titolo || "") + "» (n. " + (k.numero || numeroDoc(k)) + "), per un totale di " + eur(c.tot) + " + IVA." +
    (k.validita ? " Il preventivo è valido " + k.validita + " giorni." : "") + "\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\n" + (em.nome || "");
  return { oggetto: "Preventivo " + (k.numero || numeroDoc(k)) + " — " + (k.titolo || ""), testo: corpo };
}
function mailtoPreventivo(k, cl) {
  var m = testoMailPreventivo(k, cl);
  return "mailto:" + encodeURIComponent(cl.email || "") + "?subject=" + encodeURIComponent(m.oggetto) + "&body=" + encodeURIComponent(m.testo);
}
/* Sezioni tipiche per mestiere: si aggiungono in un colpo e poi si riscrivono sul foglio */
var SEZ_PRESET = [
  [/foto|video|ripres|shooting/i, [["Cosa comprende il servizio", "prima", ["Sopralluogo e brief", "Riprese o shooting", "Selezione e post-produzione", "Consegna dei file in alta risoluzione"]], ["Diritti d'uso", "dopo", ["Uso su sito e canali social del cliente", "Uso stampa e pubblicitario da concordare"]], ["Tempi di consegna", "dopo", ["Anteprime entro 5 giorni lavorativi", "Consegna finale entro 15 giorni"]]]],
  [/sito|web|e-?commerce|sviluppo|software|app\b/i, [["Come lavoreremo", "prima", ["Analisi e struttura delle pagine", "Design e approvazione delle bozze", "Sviluppo e caricamento dei contenuti", "Test, formazione e messa online"]], ["Cosa serve da parte tua", "prima", ["Testi e immagini definitivi", "Accessi a dominio e hosting", "Un referente per le approvazioni"]], ["Dopo la consegna", "dopo", ["30 giorni di assistenza inclusa", "Manutenzione e aggiornamenti a canone, se richiesti"]]]],
  [/social|contenut|comunicazion|adv|ads|campagn|marketing/i, [["Cosa comprende", "prima", ["Piano editoriale mensile", "Creazione e pubblicazione dei contenuti", "Gestione della community", "Report mensile dei risultati"]], ["Budget pubblicitario", "dopo", ["Il budget delle campagne è a parte e si paga direttamente alla piattaforma"]], ["Durata e disdetta", "dopo", ["Contratto mensile rinnovabile", "Disdetta con 30 giorni di preavviso"]]]],
  [/avvocat|legal|consulen|commercial|fiscal|notai/i, [["Oggetto dell'incarico", "prima", ["Analisi della situazione e dei documenti", "Parere scritto", "Assistenza nei rapporti con le controparti"]], ["Cosa non è compreso", "dopo", ["Spese vive, bolli e diritti", "Attività giudiziale, da preventivare a parte"]]]],
  [/architett|interni|arred|design|progett/i, [["Fasi del progetto", "prima", ["Rilievo e concept", "Progetto preliminare", "Progetto definitivo ed esecutivo", "Assistenza al cantiere"]], ["Esclusioni", "dopo", ["Pratiche edilizie e oneri comunali", "Direzione lavori, da preventivare a parte"]]]],
  [/psicolog|terap|coach|formazion|corso|docen/i, [["Come si svolge", "prima", ["Primo incontro conoscitivo", "Incontri della durata di 50 minuti", "Materiale di supporto fra un incontro e l'altro"]], ["Regole", "dopo", ["Gli incontri disdetti con meno di 24 ore di preavviso si pagano", "I pagamenti sono mensili"]]]],
  [/artigian|falegn|sart|restaur|produzion|stamp/i, [["Il lavoro", "prima", ["Misure e scelta dei materiali", "Realizzazione in laboratorio", "Consegna e montaggio"]], ["Materiali e tempi", "dopo", ["I materiali sono compresi salvo diversa indicazione", "Tempi di realizzazione: da concordare all'accettazione"]]]],
  [/tradu|test|copy|scritt|editor/i, [["Cosa comprende", "prima", ["Traduzione o scrittura del testo", "Una revisione inclusa", "Consegna in formato editabile"]], ["Conteggio", "dopo", ["Il prezzo si intende a cartella di 1500 caratteri spazi inclusi"]]]]
];
function presetSezioni(k) {
  var fig = miaFigura ? miaFigura() : null;
  var testo = ((fig ? fig.nome + " " + (fig.categoria || "") : "") + " " + (by(D.pros, me.pro_id) || {}).ruolo + " " + righeOf(k.id).map(function (r) { return rigaCalc(r).nome; }).join(" ")).toLowerCase();
  for (var i = 0; i < SEZ_PRESET.length; i++) if (SEZ_PRESET[i][0].test(testo)) return SEZ_PRESET[i][1];
  return [["Cosa comprende", "prima", ["", ""]], ["Condizioni", "dopo", ["Pagamento: 50% all'accettazione, 50% alla consegna", "Il preventivo è valido 30 giorni"]]];
}
function dataDoc(k) {
  return (k && k.data) || String((k && k.created_at) || today()).slice(0, 10);
}
/* Due serie separate, perché sono due cose separate: quello che esce a tuo nome
   e quello che esce a nome dello studio. P/2026/001 e S/2026/001 non si toccano
   mai, e il numero si congela il giorno in cui il preventivo parte. */
function serieDi(k) { return ambitoCom(k) === "studio" ? "S" : "P"; }
function numeroDoc(k) {
  if (k.numero) return k.numero;
  var anno = dataDoc(k).slice(0, 4), sr = serieDi(k);
  var miei = D.com.filter(function (x) { return dataDoc(x).slice(0, 4) === anno && serieDi(x) === sr; })
    .sort(function (a, b) {
      var da = dataDoc(a), db = dataDoc(b);
      if (da !== db) return da < db ? -1 : 1;
      return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
    });
  var i = miei.map(function (x) { return x.id; }).indexOf(k.id);
  return sr + "/" + anno + "/" + String((i < 0 ? miei.length : i) + 1).padStart(3, "0");
}
/* Le date scritte a mano: 12/03/2026, 2026-03-12, «12 marzo 2026». */
var MESI_IT = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function dataIt(s) {
  var t = String(s || "").trim().toLowerCase();
  if (!t) return null;
  var m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  m = t.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})$/);
  if (m) {
    var a = m[3].length === 2 ? "20" + m[3] : m[3];
    return a + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  }
  m = t.match(/^(\d{1,2})\s+([a-zàèéìòù]+)\.?\s+(\d{4})$/);
  if (m) {
    var mi = -1;
    MESI_IT.forEach(function (nm, j) { if (nm.indexOf(m[2].slice(0, 3)) === 0) mi = j; });
    if (mi > -1) return m[3] + "-" + ("0" + (mi + 1)).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  }
  return null;
}
/* testo che si riscrive sul posto: tabella|campo|id */
function ed(tb, id, campo, val, vuotoTxt, cls) {
  return '<span class="ed' + (cls ? " " + cls : "") + '" contenteditable="true" spellcheck="false"' +
    ' data-ed="' + tb + "|" + campo + "|" + id + '" data-vuoto="' + esc(vuotoTxt || "—") + '">' +
    esc(val == null || val === "" ? "" : val) + "</span>";
}
function edBlocco(tb, id, campo, val, vuotoTxt) {
  return '<div class="edb" contenteditable="true" spellcheck="false" data-ed="' + tb + "|" + campo + "|" + id +
    '" data-multi="1" data-vuoto="' + esc(vuotoTxt || "") + '">' + esc(val == null ? "" : val) + "</div>";
}
/* ---------------- sezioni discorsive del preventivo ----------------
   Un preventivo serio non è solo una tabella: è anche quello che prometti,
   quello che escludi e quando si paga. Sta tutto in un campo solo, in ordine,
   e si riscrive direttamente sul foglio come il resto. */
function sezioniDi(k) {
  var s = k && k.sezioni;
  if (typeof s === "string") { try { s = JSON.parse(s); } catch (e) { s = []; } }
  return Array.isArray(s) ? s : [];
}
async function salvaSezioni(kid, ss) {
  var pulite = ss.map(function (s) {
    return { t: (s.t || "").trim(), d: s.d === "dopo" ? "dopo" : "prima", x: (s.x || "").trim(),
      v: (s.v || []).map(function (v) { return (v || "").trim(); }).filter(Boolean) };
  }).filter(function (s) { return s.t || s.x || s.v.length; });
  return await salvaSubito("com", kid, { sezioni: pulite });
}
function edSez(kid, i, campo, val, vuotoTxt, multi) {
  return '<span class="ed' + (multi ? " edb" : "") + '" contenteditable="true" spellcheck="false" data-sez="' + kid + "|" + i + "|" + campo +
    '"' + (multi ? ' data-multi="1"' : "") + ' data-vuoto="' + esc(vuotoTxt || "—") + '">' + esc(val == null ? "" : val) + "</span>";
}
function bloccoSezioni(k, dove) {
  var ss = sezioniDi(k), h = "";
  ss.forEach(function (s, i) {
    if ((s.d === "dopo" ? "dopo" : "prima") !== dove) return;
    h += '<div class="dsez dsezt"><div class="dsh"><b>' + edSez(k.id, i, "t", s.t, "Titolo della sezione") + "</b>" +
      '<span class="noprint dsezc"><select data-sezdove="' + k.id + "|" + i + '">' +
      opzioni([["prima", "prima dei prezzi"], ["dopo", "dopo i prezzi"]], s.d === "dopo" ? "dopo" : "prima") + "</select>" +
      '<button class="lnk mini2" data-sezmuovi="' + k.id + "|" + i + '|-1" title="Sposta su">↑</button><button class="lnk mini2" data-sezmuovi="' + k.id + "|" + i + '|1" title="Sposta giù">↓</button>' +
      '<button class="lnk mini2" data-sezvia="' + k.id + "|" + i + '">togli</button></span></div>';
    h += '<div class="dtx">' + edSez(k.id, i, "x", s.x, "Il testo di questa sezione, se serve", true) + "</div>";
    var voci = s.v || [];
    h += '<ul class="dul">' + voci.map(function (v, j) {
      return "<li>" + edSez(k.id, i, "v" + j, v, "voce") +
        '<button class="lnk mini2 noprint" data-sezvoce="' + k.id + "|" + i + "|" + j + '|via">×</button></li>';
    }).join("") + "</ul>";
    h += '<div class="noprint"><button class="lnk mini2" data-sezvoce="' + k.id + "|" + i + '|new">+ aggiungi una voce</button></div></div>';
  });
  h += '<div class="noprint dsezadd"><button class="lnk mini2" data-seznuova="' + k.id + "|" + dove + '">+ aggiungi una sezione di testo ' +
    (dove === "dopo" ? "dopo i prezzi" : "prima dei prezzi") + "</button></div>";
  return h;
}
/* ---------------- il preventivo è il foglio ----------------
   Si crea, si scrive, si importa e si gestisce sempre qui: un A4 dove ogni
   testo si riscrive sul posto, le voci si aggiungono in riga, i blocchi si
   tolgono e si rimettono, e da un modello (standard dello studio o tuo) nasce
   tutto in un colpo. */
var DOCNUOVO = null, CAMBIACLI = null, INCVEDI = null;
function opzDoc(k) { var o = k && k.doc_opzioni; if (typeof o === "string") { try { o = JSON.parse(o); } catch (e) { o = {}; } } return o && typeof o === "object" ? o : {}; }
function nascosto(k, key) { return (opzDoc(k).nascosti || []).indexOf(key) > -1; }
var BLOCCHI = [["premessa", "Premessa"], ["pagamenti", "Come si paga"], ["opzioni", "Voci opzionali"], ["condizioni", "Condizioni"], ["chiusura", "Chiusura"], ["firme", "Firme"], ["pie", "Nota sulla validità"]];
function bloccoVia(kid, key) { return '<button class="lnk mini2 noprint dvia" data-blocco="' + kid + "|" + key + '|via" title="Togli questo blocco dal foglio">togli</button>'; }
function modelliPrev() {
  return D.mprev.slice().sort(function (a, b) {
    var ra = a.standard ? 0 : a.pro_id === me.pro_id ? 1 : 2, rb = b.standard ? 0 : b.pro_id === me.pro_id ? 1 : 2;
    return ra - rb || (a.nome || "").localeCompare(b.nome || "");
  });
}
async function nuovoPreventivo(ctx) {
  ctx = ctx || {};
  var r = await sb.from("commesse").insert({ titolo: "Nuovo preventivo", cliente_id: ctx.cliente_id || null, owner_id: me.pro_id, stato: "Bozza",
    ambito: ctx.ambito || "auto", data: today(), validita: 30, iva: 22, sezioni: [], tipo_prezzo: "Fisso" }).select().single();
  if (r.error) { toast(erroreUmano(r.error), true); return; }
  await reload(["com"]);
  DOCNUOVO = r.data.id;
  go("commessa", r.data.id, "servizi");
}
/* applicare un modello: sezioni e voci si aggiungono, i testi fissi solo se sono vuoti */
async function applicaModelloPrev(kid, mid) {
  var k = by(D.com, kid), m = by(D.mprev, mid); if (!k || !m) return;
  var c = m.contenuto || {}; if (typeof c === "string") { try { c = JSON.parse(c); } catch (e) { c = {}; } }
  var patch = {};
  if (c.titolo && (!k.titolo || k.titolo === "Nuovo preventivo")) patch.titolo = c.titolo;
  ["premessa", "condizioni", "chiusura"].forEach(function (f) { if (c[f] && !k[f]) patch[f] = c[f]; });
  if (c.validita != null && k.validita == null) patch.validita = c.validita;
  if (c.iva != null && k.iva == null) patch.iva = c.iva;
  if (c.sezioni && c.sezioni.length) {
    var gia = sezioniDi(k).map(function (x) { return (x.t || "").toLowerCase(); });
    var nuove = c.sezioni.filter(function (x) { return gia.indexOf((x.t || "").toLowerCase()) < 0; }).map(function (x) { return { t: x.t || "", d: x.d === "dopo" ? "dopo" : "prima", x: x.x || "", v: (x.v || []).slice() }; });
    if (nuove.length) patch.sezioni = sezioniDi(k).concat(nuove);
  }
  if (c.nascosti && c.nascosti.length) { var o = opzDoc(k); patch.doc_opzioni = Object.assign({}, o, { nascosti: (o.nascosti || []).concat(c.nascosti.filter(function (x) { return (o.nascosti || []).indexOf(x) < 0; })) }); }
  if (Object.keys(patch).length) { var r1 = await sb.from("commesse").update(patch).eq("id", kid); if (r1.error) { toast(erroreUmano(r1.error), true); return; } }
  if (c.voci && c.voci.length) {
    var n0 = righeOf(kid).length;
    var righe = c.voci.map(function (v, i) {
      return { commessa_id: kid, nome: v.nome || "Voce", descrizione: v.descrizione || null, qty: v.qty || 1, unita: v.unita || null,
        prezzo_unit: v.prezzo_unit || 0, costo_unit: v.costo_unit || null, opzionale: !!v.opzionale, ricorrente: !!v.ricorrente,
        periodo: v.periodo || null, cicli: v.cicli || null, assegnato_id: me.pro_id, ordine: n0 + i + 1, tipo: "Servizio" };
    });
    var r2 = await sb.from("righe").insert(righe); if (r2.error) { toast(erroreUmano(r2.error), true); return; }
  }
  DOCNUOVO = null; closeModal();
  await reload(["com", "righe"]); toast("Modello «" + m.nome + "» applicato"); render();
}
function contenutoDaFoglio(k) {
  return { titolo: k.titolo, premessa: k.premessa || "", condizioni: k.condizioni || "", chiusura: k.chiusura || "", validita: k.validita, iva: k.iva,
    sezioni: sezioniDi(k), nascosti: opzDoc(k).nascosti || [],
    voci: righeOf(k.id).slice().sort(function (a, b) { return (a.ordine || 0) - (b.ordine || 0); }).map(function (r) {
      var rc = rigaCalc(r);
      return { nome: rc.nome, descrizione: r.descrizione || "", qty: rc.q, unita: rc.unita, prezzo_unit: rc.pu, costo_unit: r.costo_unit, opzionale: !!r.opzionale, ricorrente: !!r.ricorrente, periodo: r.periodo, cicli: r.cicli };
    }) };
}
function apriModelliPrev(kid) {
  var k = by(D.com, kid); if (!k) return;
  var lista = modelliPrev();
  var gruppo = function (tit, arr) {
    if (!arr.length) return "";
    return '<p class="faint" style="margin:12px 0 4px;font-weight:600">' + tit + "</p>" + arr.map(function (m) {
      var c = m.contenuto || {};
      return '<div class="mprow"><div><b>' + esc(m.nome) + "</b>" + (m.descrizione ? '<div class="faint">' + esc(m.descrizione) + "</div>" : "") +
        '<div class="faint">' + ((c.sezioni || []).length) + " sezioni · " + ((c.voci || []).length) + " voci" + (m.pro_id && m.pro_id !== me.pro_id ? " · di " + esc(nameOf(D.pros, m.pro_id)) : "") + "</div></div>" +
        '<div class="mpact"><button class="btn sm" data-mprev-usa="' + kid + "|" + m.id + '">Applica</button>' +
        (m.pro_id === me.pro_id || (puo("studio") && !m.pro_id) ? '<button class="lnk mini2" data-del="mprev:' + m.id + '">elimina</button>' : "") + "</div></div>";
    }).join("");
  };
  modal('<div class="box wide"><h2>Modelli di preventivo</h2>' +
    '<p class="faint" style="margin-bottom:6px">Un modello porta sul foglio sezioni, voci e testi: poi riscrivi quello che vuoi. Sezioni e voci si aggiungono a quelle che ci sono già; premessa, condizioni e chiusura solo se sono vuote.</p>' +
    gruppo("Standard dello studio", lista.filter(function (m) { return m.standard; })) +
    gruppo("I miei", lista.filter(function (m) { return !m.standard && m.pro_id === me.pro_id; })) +
    gruppo("Condivisi dai colleghi", lista.filter(function (m) { return !m.standard && m.pro_id !== me.pro_id; })) +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Chiudi</button><button class="btn" data-mprev-salva="' + kid + '">Salva questo foglio come modello</button></div></div>');
}
function apriSalvaModello(kid) {
  var k = by(D.com, kid); if (!k) return;
  modal('<div class="box"><h2>Salva come modello</h2><form data-mprev-form="' + kid + '">' +
    fld("nome", "Nome del modello", "text", k.titolo === "Nuovo preventivo" ? "" : k.titolo, true) +
    fld("descrizione", "Per cosa lo userai", "text", "") +
    '<label class="chk"><input type="checkbox" name="condiviso" value="si"><span>Condiviso con lo studio</span></label>' +
    (puo("studio") ? '<label class="chk"><input type="checkbox" name="standard" value="si"><span>Modello standard dello studio (lo vedono tutti fra i primi)</span></label>' : "") +
    '<p class="faint" style="margin-top:8px">Salvo titolo, premessa, sezioni, voci (con prezzi), condizioni, chiusura, validità e IVA. Non salvo il cliente.</p>' +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Salva</button></div></form></div>');
}
/* ---------------- Google: posta e calendario ----------------
   Il professionista collega il suo account Google dal profilo. Il refresh token
   resta sul server (la colonna non è nemmeno leggibile dal browser): il CRM parla
   solo con la funzione «google», che a sua volta parla con Gmail e Calendar.
   Qui c'è la posta con i clienti accanto, il composer che scrive dal proprio
   indirizzo, le riunioni che finiscono in Google Calendar (con la Meet) e gli
   impegni di Google che compaiono nel calendario del CRM. */
var GM = { chiave: "", lista: [], page: null, caric: false, errore: "", cerca: "", filtro: "inbox", msg: null, msgCaric: "", nonLetti: 0, cli: {} };
var DOMINI_GENERICI = /^(gmail|googlemail|hotmail|outlook|live|yahoo|libero|virgilio|icloud|me|tin|alice|tiscali|pec|legalmail|fastwebnet|email)\./i;
function gconnMia() { return (D.gconn || []).filter(function (g) { return g.pro_id === me.pro_id; })[0] || null; }
function mconnMia() { return (D.mconn || []).filter(function (g) { return g.pro_id === me.pro_id; })[0] || null; }
/* La casella collegata, qualunque sia: Google (con calendario) o una casella IMAP/SMTP */
function postaConn() {
  var g = gconnMia(); if (g) return { tipo: "google", email: g.email, errore: g.errore };
  var m = mconnMia(); if (m) return { tipo: "imap", email: m.email, errore: m.errore };
  return null;
}
async function chiamaImap(dati) {
  var s = await sb.auth.getSession(); var ses = s && s.data ? s.data.session : null;
  if (!ses) throw new Error("la sessione è scaduta, rientra e riprova");
  var r = await fetch(String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/posta-imap", {
    method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + ses.access_token }, body: JSON.stringify(dati)
  });
  var j = null; try { j = await r.json(); } catch (e) { }
  if (r.status === 409) { await reload(["mconn"]); throw new Error("la casella non è collegata: vai nel profilo, scheda «Email e calendario»"); }
  if (!r.ok) throw new Error((j && j.errore) || "il server ha risposto " + r.status);
  return j || {};
}
/* Una chiamata sola per la posta: va dove è collegata la casella */
function chiamaPosta(dati) { var c = postaConn(); return c && c.tipo === "imap" ? chiamaImap(dati) : chiamaGoogle(dati); }
/* La lista: Google vuole una query alla Gmail, l'IMAP vuole cartella + parole + indirizzi.
   Qui li preparo tutti e due, ognuno legge il suo. */
function richiestaLista(filtro, cerca, indirizzi, max, pageToken) {
  var q, ind = indirizzi || [];
  if (ind.length) q = "{" + ind.map(function (e) { return "from:" + e + " to:" + e; }).join(" ") + "}";
  else q = filtro === "sent" ? "in:sent" : filtro === "unread" ? "is:unread in:inbox" : "in:inbox";
  if (cerca) q += " " + cerca;
  return { azione: "mail_list", q: q.trim(), cartella: filtro === "sent" ? "sent" : "inbox", nonLette: filtro === "unread", cerca: cerca || "", indirizzi: ind, max: max || 30, pageToken: pageToken || null };
}
var CASELLE = [
  ["ovh", "OVH", "ssl0.ovh.net", "ssl0.ovh.net"],
  ["aruba", "Aruba", "imaps.aruba.it", "smtps.aruba.it"],
  ["arubapec", "Aruba PEC", "imaps.pec.aruba.it", "smtps.pec.aruba.it"],
  ["register", "Register.it", "imap.register.it", "smtp.register.it"],
  ["libero", "Libero", "imapmail.libero.it", "smtp.libero.it"],
  ["outlook", "Outlook.com / Hotmail", "outlook.office365.com", "smtp-mail.outlook.com"],
  ["altro", "Altro (metto io i server)", "", ""]
];
function apriFormCasella() {
  modal('<div class="box"><h2>Collega una casella email</h2><p class="faint" style="margin-bottom:10px">Funziona con qualsiasi casella che parla IMAP e SMTP (OVH, Aruba, Register, PEC, hosting vari). La password viene cifrata nel database e usata solo dal server per leggere e inviare: nel browser non passa mai. Se il tuo provider ha le «password per app», usa quella.</p>' +
    '<form data-imap-collega="1">' +
    '<div class="field"><label>Provider</label><select name="preset" data-imap-preset="1">' + CASELLE.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + "</option>"; }).join("") + "</select></div>" +
    '<div class="row2"><div class="field"><label>Indirizzo email</label><input name="email" type="email" required placeholder="nome@azienda.it" autocomplete="off"></div><div class="field"><label>Password</label><input name="password" type="password" required autocomplete="new-password"></div></div>' +
    '<div class="field"><label>Utente (se diverso dall\'email)</label><input name="utente" placeholder="di solito è l\'email stessa" autocomplete="off"></div>' +
    '<div class="row2"><div class="field"><label>Server in entrata (IMAP)</label><input name="imap_host" required value="ssl0.ovh.net"></div><div class="field"><label>Porta IMAP</label><input name="imap_port" value="993" readonly></div></div>' +
    '<div class="row2"><div class="field"><label>Server in uscita (SMTP)</label><input name="smtp_host" required value="ssl0.ovh.net"></div><div class="field"><label>Porta SMTP</label><select name="smtp_port"><option value="465">465 (TLS)</option><option value="587">587 (STARTTLS)</option></select></div></div>' +
    '<p class="faint" style="font-size:12px">Microsoft 365 / Exchange aziendale non accetta più le password su IMAP: per quelle serve un collegamento a parte, dimmelo.</p>' +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Prova e collega</button></div></form></div>');
}
async function chiamaGoogle(dati) {
  var s = await sb.auth.getSession(); var ses = s && s.data ? s.data.session : null;
  if (!ses) throw new Error("la sessione è scaduta, rientra e riprova");
  var r = await fetch(String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/google", {
    method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + ses.access_token }, body: JSON.stringify(dati)
  });
  var j = null; try { j = await r.json(); } catch (e) { }
  if (r.status === 501) throw new Error("Google non è ancora configurato nel progetto (servono GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET tra i secret)");
  if (r.status === 409) { await reload(["gconn"]); throw new Error("Google non è collegato: vai nel profilo, scheda «Email e calendario»"); }
  if (!r.ok) throw new Error((j && j.errore) || "il server ha risposto " + r.status);
  return j || {};
}
async function collegaGoogle() {
  toast("Ti porto da Google…");
  var j = await chiamaGoogle({ azione: "auth_url", ritorno: location.origin + location.pathname + "#/profilo/-/email" });
  if (j.url) location.href = j.url;
}
/* Si rifà da solo all'apertura se l'ultima volta è di più di un quarto d'ora fa */
var SYNC_IN = false;
async function sincronizzaCal(silenzioso) {
  var g = gconnMia(); if (!g || SYNC_IN) return;
  if (silenzioso && g.sync_at && Date.now() - new Date(g.sync_at).getTime() < 15 * 60000) return;
  SYNC_IN = true;
  try {
    await chiamaGoogle({ azione: "cal_sync" });
    await reload(["impg", "gconn"]);
    if (!silenzioso) toast("Calendario aggiornato");
    if (view === "calendario" || view === "dash" || view === "profilo") render();
  } catch (e) { if (!silenzioso) toast(String(e && e.message || e), true); }
  SYNC_IN = false;
}
function giornoImpg(ts) { if (!ts) return ""; var d = new Date(ts); return isNaN(d) ? "" : iso(d); }
function oraImpg(ts) { var d = new Date(ts); return isNaN(d) ? "" : d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
function soloEmail(s) { var m = /<([^>]+)>/.exec(s || ""); return (m ? m[1] : String(s || "")).trim().toLowerCase(); }
function soloNome(s) { var m = /^\s*"?([^"<]*?)"?\s*<[^>]+>/.exec(s || ""); var n = m ? m[1].trim() : ""; return n || soloEmail(s); }
/* Chi è: prima l'indirizzo esatto, poi il dominio dell'azienda (non quelli di tutti) */
function clienteDaEmail(addr) {
  var e = soloEmail(addr); if (!e) return null;
  var dom = e.split("@")[1] || "";
  var c = D.cli.filter(function (x) { return x.email && String(x.email).trim().toLowerCase() === e; })[0];
  if (c) return c;
  if (!dom || DOMINI_GENERICI.test(dom)) return null;
  return D.cli.filter(function (x) { return x.email && String(x.email).toLowerCase().split("@")[1] === dom; })[0] ||
    D.cli.filter(function (x) { return x.sito && String(x.sito).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] === dom; })[0] || null;
}
function clienteDelMessaggio(m) { return clienteDaEmail(m.inviato ? m.a : m.da) || clienteDaEmail(m.inviato ? m.da : m.a) || clienteDaEmail(m.cc); }
function dataMail(ts) {
  var d = new Date(ts); if (isNaN(d)) return "";
  return iso(d) === today() ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
function queryPosta() { return GM.filtro + "|" + GM.cerca.trim(); }
function emailClienti() { return D.cli.map(function (c) { return c.email && String(c.email).trim(); }).filter(Boolean).slice(0, 40); }
/* Carica la lista una volta per chiave (filtro + ricerca); se cambia, ricarica */
function caricaPosta(chiave, q, altro) {
  if (GM.caric) return;
  GM.caric = true; GM.errore = ""; GM.chiave = chiave;
  var ind = GM.filtro === "clienti" ? emailClienti() : [];
  chiamaPosta(richiestaLista(GM.filtro, GM.cerca.trim(), ind, 30, altro ? GM.page : null)).then(function (j) {
    GM.lista = altro ? GM.lista.concat(j.messaggi || []) : (j.messaggi || []);
    GM.page = j.pageToken || null;
    if (chiave === "inbox|") GM.nonLetti = GM.lista.filter(function (m) { return m.nonLetto; }).length;
    GM.caric = false; render();
  }, function (e) { GM.errore = String(e && e.message || e); GM.caric = false; GM.lista = altro ? GM.lista : []; render(); });
}
async function apriMessaggio(id) {
  if (GM.msg && GM.msg.id === id) return;
  GM.msgCaric = id; GM.msg = null; render();
  try {
    var m = await chiamaPosta({ azione: "mail_get", id: id });
    GM.msg = m;
    GM.lista.forEach(function (x) { if (x.id === id && x.nonLetto) { x.nonLetto = false; GM.nonLetti = Math.max(0, GM.nonLetti - 1); } });
    var inCli = Object.keys(GM.cli); inCli.forEach(function (k) { (GM.cli[k].lista || []).forEach(function (x) { if (x.id === id) x.nonLetto = false; }); });
  } catch (e) { toast(String(e && e.message || e), true); }
  GM.msgCaric = ""; render();
}
function rigaMail(m, cls) {
  var c = clienteDelMessaggio(m), chi = m.inviato ? "a " + soloNome(m.a) : soloNome(m.da);
  return '<button class="mrow' + (m.nonLetto ? " nl" : "") + (GM.msg && GM.msg.id === m.id ? " on" : "") + (cls || "") + '" data-gmail-apri="' + esc(m.id) + '">' +
    '<span class="mchi">' + esc(chi) + (c ? '<span class="badge b-terra mcli">' + esc(c.nome) + "</span>" : "") + '</span><span class="mdata">' + esc(dataMail(m.data)) + "</span>" +
    '<span class="mogg">' + esc(m.oggetto || "(senza oggetto)") + '</span><span class="msnip">' + esc(m.snippet || "") + "</span></button>";
}
function lettore() {
  if (GM.msgCaric) return '<div class="mread"><div class="empty">Apro il messaggio…</div></div>';
  var m = GM.msg; if (!m) return '<div class="mread"><div class="empty">Scegli un messaggio a sinistra.</div></div>';
  var c = clienteDelMessaggio(m), gia = D.inter.some(function (i) { return i.gmail_id === m.id; });
  var mittente = soloEmail(m.inviato ? m.a : m.da);
  var h = '<div class="mread"><div class="mhead"><h2>' + esc(m.oggetto || "(senza oggetto)") + "</h2>" +
    '<div class="faint">Da <b>' + esc(m.da) + "</b>" + (m.a ? " · a " + esc(m.a) : "") + (m.cc ? " · cc " + esc(m.cc) : "") + " · " + dtOra(m.data) + "</div>" +
    '<div class="macts">' +
    '<button class="btn sm" data-gmail-rispondi="' + esc(m.id) + '">Rispondi</button>' +
    (c ? (gia ? '<span class="badge b-green">nel diario di ' + esc(c.nome) + "</span>" : '<button class="btn sm ghost" data-gmail-diario="' + esc(m.id) + '">Salva nel diario di ' + esc(c.nome) + "</button>") + lnkCli(c.id, "btn sm ghost") :
      '<button class="btn sm ghost" data-gmail-lead="' + esc(m.id) + '" title="' + esc(mittente) + '">Crea un cliente da ' + esc(soloNome(m.inviato ? m.a : m.da)) + "</button>") +
    (postaConn() && postaConn().tipo === "google" ? '<a class="btn sm ghost" target="_blank" rel="noopener" href="https://mail.google.com/mail/u/0/#all/' + esc(m.threadId || m.id) + '">Apri in Gmail</a>' : "") + "</div></div>";
  if (m.allegati && m.allegati.length) h += '<div class="mall">' + m.allegati.map(function (a) { return '<span class="badge">' + esc(a.nome) + ' <span class="faint">' + Math.round((a.dim || 0) / 1024) + " KB</span></span>"; }).join(" ") + ' <span class="faint">· gli allegati li scarichi da Gmail</span></div>';
  h += '<div class="mbody">' + esc(m.testo || m.snippet || "").replace(/\n{3,}/g, "\n\n") + "</div></div>";
  return h;
}
function vPosta() {
  var g = postaConn();
  var h = crumbs([[gruppoDi("posta") || "Clienti"], ["Posta"]]);
  h += '<div class="top"><h1>Posta<span class="sub">' + (g ? esc(g.email || "") : "non collegata") + '</span></h1><div class="tools">' +
    (g ? '<button class="btn sm ghost" data-gmail-ricarica="1">Aggiorna</button><button class="btn sm" data-gmail-scrivi="1">Nuova email</button>' : "") + "</div></div>";
  if (!g) return h + '<div class="card"><div class="empty" style="padding:24px 8px"><b>La tua posta, qui dentro, con i clienti accanto.</b><p class="faint" style="margin:8px 0 14px">Collega la tua casella: leggi e rispondi da qui, ogni email si aggancia al cliente giusto, i preventivi e le lettere d\'incarico partono dal tuo indirizzo. Con Google anche le riunioni finiscono nel tuo calendario con la Meet già dentro.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn" data-gconn-collega="1">Collega Google</button><button class="btn ghost" data-imap-form="1">Collega un\'altra casella</button></div></div></div>';
  var chiave = queryPosta();
  if (GM.chiave !== chiave && !GM.caric) caricaPosta(chiave, chiave);
  var chip = function (k, et) { return '<button class="chipbtn' + (GM.filtro === k ? " on" : "") + '" data-gmail-filtro="' + k + '">' + et + "</button>"; };
  h += '<div class="posta"><div class="mlist"><form class="mcerca" data-gmail-cerca="1"><input name="q" placeholder="Cerca nella posta… (come in Gmail)" value="' + esc(GM.cerca) + '"><button class="btn sm ghost" type="submit">Cerca</button></form>' +
    '<div class="mchips">' + chip("inbox", "In arrivo") + chip("unread", "Non lette") + chip("clienti", "Clienti") + chip("sent", "Inviate") + "</div>";
  if (GM.errore) h += '<div class="empty neg">' + esc(GM.errore) + "</div>";
  else if (GM.caric && !GM.lista.length) h += '<div class="empty">Carico la posta…</div>';
  else if (!GM.lista.length) h += '<div class="empty">Niente qui.</div>';
  else h += GM.lista.map(function (m) { return rigaMail(m); }).join("") + (GM.page ? '<button class="lnk" style="margin:10px" data-gmail-altro="1">' + (GM.caric ? "Carico…" : "Altre email") + "</button>" : "");
  h += "</div>" + lettore() + "</div>";
  return h;
}
/* La scheda Email del cliente: solo lo scambio con lui */
function schedaEmailCliente(c) {
  var g = postaConn();
  if (!g) return '<div class="card"><div class="empty">Per vedere qui le email con ' + esc(c.nome) + ' collega la tua casella dal profilo. <button class="lnk" data-route="profilo|-|email">Vai</button></div></div>';
  if (!c.email) return '<div class="card"><div class="empty">Questo cliente non ha un indirizzo email in anagrafica. <button class="lnk" data-edit="cli:' + c.id + '">Aggiungilo</button></div></div>';
  var e = String(c.email).trim(), st = GM.cli[c.id];
  if (!st) {
    st = GM.cli[c.id] = { lista: [], caric: true, errore: "" };
    chiamaPosta(richiestaLista("inbox", "", [e], 40, null)).then(function (j) { st.lista = j.messaggi || []; st.caric = false; render(); }, function (x) { st.errore = String(x && x.message || x); st.caric = false; render(); });
  }
  var h = '<div class="card"><div class="cardhead"><h2>Email con ' + esc(c.nome) + '</h2><div style="display:flex;gap:8px"><button class="btn sm ghost" data-gmail-clivia="' + c.id + '">Aggiorna</button><button class="btn sm" data-gmail-scrivi="1" data-ctx-cli="' + c.id + '">Scrivi a ' + esc(e) + "</button></div></div>";
  if (st.errore) h += '<div class="empty neg">' + esc(st.errore) + "</div>";
  else if (st.caric) h += '<div class="empty">Cerco le email con ' + esc(e) + "…</div>";
  else if (!st.lista.length) h += vuoto("Nessuna email con questo indirizzo.");
  else h += '<div class="posta incli"><div class="mlist">' + st.lista.map(function (m) { return rigaMail(m); }).join("") + "</div>" + (GM.msg && st.lista.some(function (m) { return m.id === GM.msg.id; }) || GM.msgCaric ? lettore() : '<div class="mread"><div class="empty">Apri un messaggio per leggerlo qui.</div></div>') + "</div>";
  return h + "</div>";
}
/* Profilo: collegare, controllare, scollegare */
function schedaEmail(p) {
  var g = gconnMia(), m = mconnMia();
  if (!g && m) {
    return '<div class="card" style="background:' + (m.errore ? "var(--red-soft, #fbeae5)" : "var(--green-soft)") + ';border-color:transparent"><div class="cardhead"><h2>' + esc(m.email) + '</h2>' +
      '<div style="display:flex;gap:8px"><button class="btn sm ghost" data-go="posta">Apri la posta</button><button class="btn sm ghost" data-imap-form="1">Cambia password o server</button><button class="btn sm ghost" data-imap-via="1">Scollega</button></div></div>' +
      (m.errore ? '<p class="neg"><b>L\'ultima volta la casella ha risposto male:</b> ' + esc(m.errore) + "</p>" : "") +
      '<p class="faint">Casella IMAP/SMTP collegata il ' + dt(m.created_at) + " · in entrata " + esc(m.imap_host) + ":" + m.imap_port + " · in uscita " + esc(m.smtp_host) + ":" + m.smtp_port + (m.cartella_inviati ? " · le email inviate finiscono in «" + esc(m.cartella_inviati) + "»" : "") + "</p>" +
      '<p class="faint" style="margin-top:6px">La password è cifrata nel database e la usa solo il server. Se la cambi sul provider, aggiornala qui. Il calendario non si sincronizza con una casella IMAP: per quello serve Google, oppure il link ICS del CRM nel tuo calendario.</p></div>';
  }
  if (!g) {
    return '<div class="card" style="background:var(--cream)"><div class="empty" style="padding:24px 8px"><b>Collega la tua casella email.</b><p class="faint" style="margin:8px 0 14px">Cosa cambia: la posta la leggi e la scrivi dal CRM, agganciata ai clienti; preventivi e lettere d\'incarico partono dal tuo indirizzo. <b>Con Google</b> in più le riunioni vanno in Google Calendar con la Meet, i tuoi impegni compaiono nel calendario del CRM e bloccano il link «Prenota una call»; il CRM non conserva la password, Google dà un permesso revocabile. <b>Con un\'altra casella</b> (OVH, Aruba, PEC, hosting) hai la posta, non il calendario; la password resta cifrata nel database.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn" data-gconn-collega="1">Collega Google</button><button class="btn ghost" data-imap-form="1">Collega un\'altra casella</button></div></div></div>';
  }
  var imp = (D.impg || []).filter(function (e) { return e.pro_id === me.pro_id && giornoImpg(e.inizio) >= today(); });
  var h = '<div class="card" style="background:' + (g.errore ? "var(--red-soft, #fbeae5)" : "var(--green-soft)") + ';border-color:transparent"><div class="cardhead"><h2>' + esc(g.email || "Account collegato") + "</h2>" +
    '<div style="display:flex;gap:8px"><button class="btn sm ghost" data-gcal-sync="1">Aggiorna il calendario</button><button class="btn sm ghost" data-go="posta">Apri la posta</button><button class="btn sm ghost" data-gconn-via="1">Scollega</button></div></div>' +
    (g.errore ? '<p class="neg"><b>Google ha risposto male l\'ultima volta:</b> ' + esc(g.errore) + '. Se continua, scollega e ricollega.</p>' : "") +
    '<p class="faint">Collegato il ' + dt(g.created_at) + (g.sync_at ? " · calendario aggiornato " + dtOra(g.sync_at) : " · calendario mai aggiornato") + " · " + imp.length + " impegni di Google nei prossimi 60 giorni</p>" +
    '<p class="faint" style="margin-top:6px">Permessi dati: leggere e scrivere la posta, creare eventi nel calendario. Il permesso vive su Google: se lo togli da lì, qui basta scollegare.</p></div>';
  if (imp.length) h += '<div class="card"><div class="cardhead"><h2>I prossimi impegni da Google</h2><span class="faint">solo tuoi, nessun altro li vede</span></div><ul class="timeline">' +
    imp.slice(0, 8).map(function (e) { return "<li><b>" + esc(e.titolo) + '</b><div class="when">' + dt(e.inizio) + (e.tutto_il_giorno ? " · tutto il giorno" : " · " + oraImpg(e.inizio) + "–" + oraImpg(e.fine)) + "</div></li>"; }).join("") + "</ul></div>";
  return h;
}
/* Il composer: una finestra sola per rispondere, scrivere a un cliente, mandare
   un preventivo o una lettera. Se c'è un cliente, la mail finisce nel suo diario. */
function apriComposer(o) {
  var g = postaConn(); if (!g) { toast("Prima collega la tua casella dal profilo", true); return; }
  var c = o.cliente_id ? by(D.cli, o.cliente_id) : clienteDaEmail(o.a);
  modal('<div class="box wide"><h2>' + (o.inReplyTo ? "Rispondi" : "Nuova email") + '</h2><p class="faint" style="margin-bottom:10px">Parte da <b>' + esc(g.email || "") + "</b>" + (o.nota ? " · " + esc(o.nota) : "") + "</p>" +
    '<form data-gmail-invia="1">' +
    '<input type="hidden" name="threadId" value="' + esc(o.threadId || "") + '"><input type="hidden" name="inReplyTo" value="' + esc(o.inReplyTo || "") + '"><input type="hidden" name="references" value="' + esc(o.references || "") + '">' +
    '<input type="hidden" name="cliente_id" value="' + esc(c ? c.id : "") + '"><input type="hidden" name="dopo" value="' + esc(o.dopo || "") + '">' +
    '<div class="row2"><div class="field"><label>A</label><input name="a" required value="' + esc(o.a || "") + '" placeholder="nome@azienda.it"></div><div class="field"><label>Cc</label><input name="cc" value="' + esc(o.cc || "") + '"></div></div>' +
    '<div class="field"><label>Oggetto</label><input name="oggetto" required value="' + esc(o.oggetto || "") + '"></div>' +
    '<div class="field"><label>Testo</label><textarea name="testo" rows="12" class="doc">' + esc(o.testo || "") + "</textarea></div>" +
    (c ? '<label class="chk"><input type="checkbox" name="diario" checked><span>Segna nel diario di ' + esc(c.nome) + "</span></label>" : "") +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Invia</button></div></form></div>');
  setTimeout(function () { var t = el("#modal textarea"); if (t && !o.a) { var a = el("#modal input[name=a]"); if (a) a.focus(); } else if (t) t.focus(); }, 50);
}
function testoQuotato(m) {
  return "\n\n\nIl " + dtOra(m.data) + " " + (m.da || "") + " ha scritto:\n" + String(m.testo || m.snippet || "").split("\n").map(function (r) { return "> " + r; }).join("\n");
}
async function segnaNelDiario(m, cid, extra) {
  var r = await sb.from("interazioni").insert({ cliente_id: cid, tipo: "Email", data: iso(new Date(m.data || Date.now())), pro_id: me.pro_id, gmail_id: m.id,
    testo: (m.inviato ? "Inviata: " : "Ricevuta: ") + (m.oggetto || "(senza oggetto)") + (extra ? " — " + extra : "") + "\n" + String(m.snippet || m.testo || "").slice(0, 400) });
  if (r.error) { if (/duplicate|unique/i.test(r.error.message || "")) return true; toast(erroreUmano(r.error), true); return false; }
  await reload(["inter"]); return true;
}
/* Le riunioni del CRM in Google Calendar: invitati = cliente + esterni + colleghi */
async function mettiInGoogle(rid) {
  var r = by(D.riu, rid); if (!r) return;
  var inv = [];
  var cl = r.cliente_id ? by(D.cli, r.cliente_id) : null; if (cl && cl.email) inv.push(cl.email);
  (r.esterni || "").split(/[,;\s]+/).forEach(function (x) { if (/@/.test(x)) inv.push(x); });
  (r.partecipanti || []).forEach(function (pid) { var p = by(D.pros, pid); if (p && p.email) inv.push(p.email); });
  var j = await chiamaGoogle({ azione: "cal_insert", riunione: { data: r.data, ora: r.ora, fine: r.fine, titolo: r.titolo, ordine_giorno: r.ordine_giorno, luogo: r.luogo, invitati: inv.join(" "), link: r.link, meet: (r.tipo || "Videocall") === "Videocall" ? "si" : "no", gcal_event_id: r.gcal_event_id || null,
    note_crm: "Dal CRM Giraffa Studio" + (cl ? " · " + cl.nome : "") } });
  var patch = { gcal_event_id: j.id };
  if (!r.link && j.link) patch.link = j.link;
  var u = await sb.from("riunioni").update(patch).eq("id", r.id);
  if (u.error) { toast(erroreUmano(u.error), true); return; }
  await reload(["riu"]); sincronizzaCal(true);
  toast(r.gcal_event_id ? "Aggiornata su Google" : ("In Google Calendar" + (inv.length ? ", inviti mandati a " + inv.length : "") + (patch.link ? " · Meet creata" : "")));
  render();
}

/* ---------------- prenota una call ----------------
   Ogni professionista ha un link pubblico (#/a/nome) con le sue finestre della
   settimana. Chi prenota sceglie giorno e ora fra quelli liberi (le riunioni già
   fissate contano), lascia nome ed email, e la riunione nasce nel calendario con
   il link della videocall. Niente account, niente Calendly. */
function pcfgMia() { return D.pcfg.filter(function (c) { return c.pro_id === me.pro_id; })[0] || null; }
function slugDa(nome) { return String(nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }
var GIORNI_SETT = [["1", "Lunedì"], ["2", "Martedì"], ["3", "Mercoledì"], ["4", "Giovedì"], ["5", "Venerdì"], ["6", "Sabato"], ["7", "Domenica"]];
function finestreTxt(arr) { return (arr || []).map(function (w) { return w[0] + "-" + w[1]; }).join(", "); }
function finestreDaTxt(t) {
  var out = [];
  String(t || "").split(/[,;]/).forEach(function (p) {
    var m = /^\s*(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(p);
    if (!m) return;
    var a = ("0" + m[1]).slice(-2) + ":" + (m[2] || "00"), b = ("0" + m[3]).slice(-2) + ":" + (m[4] || "00");
    if (a < b) out.push([a, b]);
  });
  return out;
}
function linkPrenota(c) { return location.origin + location.pathname + "#/a/" + c.slug; }
function schedaPrenota(p) {
  var c = pcfgMia();
  if (!c) {
    return '<div class="empty" style="padding:24px 8px"><b>Un link per farti prenotare una call.</b><p class="faint" style="margin:8px 0 14px">Tu decidi in quali orari sei disponibile; chi apre il link sceglie un\'ora libera, lascia nome ed email e la riunione compare nel tuo calendario con la videocall. Le riunioni che hai già fissate non si possono sovrapporre.</p><button class="btn" data-pcfg-attiva="1">Prepara il mio link</button></div>';
  }
  var url = linkPrenota(c), sett = c.settimana || {};
  var f = function (campo, et, ctrl, aiuto) { return '<div class="qfield"><label>' + et + "</label>" + ctrl + (aiuto ? '<div class="faint" style="font-size:12px;margin-top:3px">' + aiuto + "</div>" : "") + "</div>"; };
  var h = '<div class="card" style="background:' + (c.attivo ? "var(--green-soft)" : "var(--cream)") + ';border-color:transparent"><div class="cardhead"><h2>' + (c.attivo ? "Il tuo link è attivo" : "Il link è spento") + '</h2>' +
    '<label class="chk"><input type="checkbox" data-pcfg="attivo"' + (c.attivo ? " checked" : "") + '><span>accetta prenotazioni</span></label></div>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><code style="font-size:13px">' + esc(url) + '</code><button class="btn sm ghost" data-copia="' + esc(url) + '">Copia</button><a class="btn sm ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Apri</a></div>' +
    '<p class="faint" style="margin-top:8px">Mettilo nella firma delle email, sul sito, nei messaggi: chi lo apre vede solo gli orari liberi.</p></div>';
  h += '<div class="card"><div class="grid g2">' +
    f("slug", "Indirizzo del link", '<input data-pcfg="slug" value="' + esc(c.slug || "") + '">', "solo lettere, numeri e trattini: crm.giraffastudio.it/#/a/<b>" + esc(c.slug || "") + "</b>") +
    f("videocall", "Link della videocall", '<input data-pcfg="videocall" value="' + esc(c.videocall || "") + '" placeholder="https://meet.google.com/xxx-xxxx-xxx">', "la tua stanza fissa (Google Meet, Zoom…): finisce nella riunione e nella conferma") +
    f("durata", "Durata di una call (minuti)", '<input type="number" data-pcfg="durata" value="' + (c.durata || 30) + '" min="10" max="180" step="5">') +
    f("buffer", "Pausa fra una call e l\'altra (minuti)", '<input type="number" data-pcfg="buffer" value="' + (c.buffer || 0) + '" min="0" max="120" step="5">') +
    f("anticipo_ore", "Preavviso minimo (ore)", '<input type="number" data-pcfg="anticipo_ore" value="' + (c.anticipo_ore || 24) + '" min="0" max="240">', "nessuno può prenotare fra meno di queste ore") +
    f("orizzonte_giorni", "Quanto avanti si può prenotare (giorni)", '<input type="number" data-pcfg="orizzonte_giorni" value="' + (c.orizzonte_giorni || 30) + '" min="1" max="120">') +
    "</div>" +
    f("intro", "Due righe per chi prenota", '<textarea data-pcfg="intro" rows="2" placeholder="Es. Una call di 30 minuti per capire il progetto e dirti se e come posso aiutarti.">' + esc(c.intro || "") + "</textarea>") +
    "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Quando sei disponibile</h2><span class="faint">orari di Verona · scrivi le fasce come «9-13, 14-18»; lascia vuoto il giorno in cui non ci sei</span></div><div class="grid g2">' +
    GIORNI_SETT.map(function (g) { return f("g" + g[0], g[1], '<input data-pcfg-giorno="' + g[0] + '" value="' + esc(finestreTxt(sett[g[0]])) + '" placeholder="es. 9-13, 14-18">'); }).join("") + "</div></div>";
  var pren = D.riu.filter(function (r) { return r.origine === "prenota" && r.pro_id === me.pro_id; }).sort(function (a, b) { return (a.data + a.ora) < (b.data + b.ora) ? 1 : -1; }).slice(0, 12);
  h += '<div class="card"><div class="cardhead"><h2>Prenotate dal link</h2><span class="faint">' + pren.length + "</span></div>" + (pren.length ? pren.map(rigaRiunione).join("") : vuoto("Nessuna prenotazione ancora.")) + "</div>";
  return h;
}
async function salvaPcfg(patch) {
  var c = pcfgMia(); if (!c) return false;
  var r = await sb.from("prenota_cfg").update(patch).eq("pro_id", me.pro_id);
  if (r.error) { toast(erroreUmano(r.error), true); return false; }
  Object.assign(c, patch); return true;
}
function icsTesto(x) {
  var d = String(x.data).replace(/-/g, ""), a = String(x.ora).replace(":", "") + "00", b = String(x.fine).replace(":", "") + "00";
  var uid = (x.id || Date.now()) + "@giraffastudio.it";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Giraffa Studio//CRM//IT", "BEGIN:VEVENT", "UID:" + uid,
    "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    "DTSTART;TZID=Europe/Rome:" + d + "T" + a, "DTEND;TZID=Europe/Rome:" + d + "T" + b,
    "SUMMARY:Call con " + String(x.con || "").replace(/[,;]/g, " "),
    (x.videocall ? "LOCATION:" + x.videocall : "LOCATION:Videocall"),
    (x.videocall ? "DESCRIPTION:Link videocall: " + x.videocall : "DESCRIPTION:Call fissata da crm.giraffastudio.it"),
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
async function paginaPrenota(slug) {
  var box = el("#pub"); show("pub"); el("#splash").classList.add("hide");
  box.innerHTML = '<div class="pubwrap"><p class="faint">Cerco gli orari liberi…</p></div>';
  var r = await sb.rpc("prenota_info", { s: slug });
  if (r.error || !r.data) { box.innerHTML = '<div class="pubwrap"><div class="authcard"><div class="brandmark"><i class="mark"></i></div><h2>Link non attivo</h2><p>Questo link non esiste o le prenotazioni sono chiuse. Chiedi un nuovo link a chi te l\'ha mandato.</p></div></div>'; return; }
  var info = r.data, giorni = info.giorni || [], scelto = giorni.length ? giorni[0].data : null, ora = null;
  var disegna = function () {
    var g = giorni.filter(function (x) { return x.data === scelto; })[0];
    box.innerHTML = '<div class="pubwrap prenota"><div class="pubhead"><div class="brandmark"><i class="mark"></i></div><div><b>Prenota una call con ' + esc(info.nome) + "</b><div class=\"faint\">" + esc(info.ruolo || "") + (info.ruolo ? " · " : "") + info.durata + " minuti" + (info.videocall ? " · in videocall" : "") + "</div></div></div>" +
      (info.intro ? '<p class="pintro">' + esc(info.intro) + "</p>" : "") +
      (!giorni.length ? '<div class="card"><div class="empty">Non ci sono orari liberi nei prossimi giorni. Riprova fra qualche giorno o scrivi direttamente.</div></div>' :
      '<div class="card"><h3>Scegli il giorno</h3><div class="chips pgiorni">' + giorni.slice(0, 21).map(function (x) { return '<button class="chipbtn' + (x.data === scelto ? " on" : "") + '" data-pg="' + x.data + '">' + etichettaGiornoPub(x.data) + "</button>"; }).join("") + "</div>" +
      '<h3 style="margin-top:16px">A che ora</h3><div class="chips pore">' + ((g && g.slot) || []).map(function (o) { return '<button class="chipbtn' + (o === ora ? " on" : "") + '" data-po="' + o + '">' + o + "</button>"; }).join("") + "</div>" +
      (ora ? '<form id="prenform" style="margin-top:18px"><div class="grid g2">' +
        '<div class="field"><label>Nome e cognome</label><input name="nome" required minlength="2" autocomplete="name"></div>' +
        '<div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div>' +
        '<div class="field"><label>Telefono (se vuoi)</label><input name="tel" autocomplete="tel"></div>' +
        '<div class="field"><label>Di cosa vuoi parlare</label><input name="note" placeholder="due parole, così arrivo preparato"></div></div>' +
        '<div class="err hide" id="prenerr"></div>' +
        '<div class="actions" style="justify-content:flex-start"><button class="btn" type="submit">Conferma ' + etichettaGiornoPub(scelto) + " alle " + ora + '</button></div>' +
        '<p class="faint" style="margin-top:8px">Nessun account: riceverai subito il riepilogo con il link della videocall da salvare in calendario.</p></form>' : '<p class="faint" style="margin-top:14px">Scegli un orario per continuare.</p>') + "</div>") +
      '<p class="faint" style="text-align:center;margin:24px 0">Giraffa Studio · crm.giraffastudio.it</p></div>';
    box.querySelectorAll("[data-pg]").forEach(function (b) { b.addEventListener("click", function () { scelto = b.dataset.pg; ora = null; disegna(); }); });
    box.querySelectorAll("[data-po]").forEach(function (b) { b.addEventListener("click", function () { ora = b.dataset.po; disegna(); var f = el("#prenform"); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" }); }); });
    var f = el("#prenform");
    if (f) f.addEventListener("submit", async function (e) {
      e.preventDefault();
      var err = el("#prenerr"), btn = f.querySelector("button[type=submit]"); err.classList.add("hide"); btn.disabled = true; btn.textContent = "Prenoto…";
      var rc = await sb.rpc("prenota_conferma", { s: slug, giorno: scelto, ora_i: ora + ":00", nome: f.nome.value.trim(), email: f.email.value.trim(), tel: f.tel.value.trim(), note: f.note.value.trim() });
      if (rc.error) { err.textContent = (rc.error.message || "").replace(/^[^:]*: /, "") || "Non sono riuscito a prenotare."; err.classList.remove("hide"); btn.disabled = false; btn.textContent = "Riprova"; if (/disponibile/.test(err.textContent)) { var r2 = await sb.rpc("prenota_info", { s: slug }); if (r2.data) { giorni = r2.data.giorni || []; ora = null; } } return; }
      var x = rc.data;
      var ics = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsTesto(x));
      box.innerHTML = '<div class="pubwrap prenota"><div class="card" style="max-width:640px;margin:40px auto;text-align:center"><div class="brandmark"><i class="mark"></i></div><h2>Prenotato</h2>' +
        '<p style="margin:10px 0 4px"><b>' + etichettaGiornoPub(x.data) + " dalle " + x.ora + " alle " + x.fine + "</b></p><p class=\"faint\">con " + esc(x.con) + (x.videocall ? " · in videocall" : "") + "</p>" +
        (x.videocall ? '<p style="margin:14px 0"><a class="btn" href="' + esc(x.videocall) + '" target="_blank" rel="noopener">Link della videocall</a></p><p class="faint">Salvalo: è lo stesso link che troverai nel calendario.</p>' : "") +
        '<p style="margin-top:14px"><a class="btn ghost" download="call-' + esc(x.data) + '.ics" href="' + ics + '">Aggiungi al calendario (.ics)</a></p>' +
        '<p class="faint" style="margin-top:18px">Se devi spostare o annullare, rispondi a ' + esc(x.con) + '.</p></div></div>';
    });
  };
  disegna();
}
function etichettaGiornoPub(k) {
  var d = new Date(k + "T12:00:00");
  return ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][d.getDay()] + " " + d.getDate() + " " + ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"][d.getMonth()];
}

/* ---------------- riunione registrata e trascritta ----------------
   Premi Registra, parli, premi Ferma: l'audio va in pezzi da un quarto d'ora in
   un bucket privato, la funzione lo trascrive e lo cancella, e dal testo escono
   appunti, decisioni e prossimi passi già pronti da mettere nella riunione.
   Vale anche per una registrazione fatta col telefono: la carichi da file. */
var REC = null;
function cardRegistra(r) {
  var attiva = REC && REC.riu === r.id;
  var h = '<div class="card reccard"><div class="cardhead"><h2>Registra e trascrivi</h2><span class="faint">' + (r.trascrizione ? "trascritta" : "l\'audio non resta da nessuna parte: solo il testo") + "</span></div>";
  if (attiva) {
    h += '<div class="recon"><span class="recdot"></span> <b id="reclbl">' + durataRec() + "</b> · in registrazione" + (REC.busy ? " · carico…" : "") + '<button class="btn sm stop" data-rec-stop="1" style="margin-left:auto">■ Ferma e trascrivi</button></div>';
  } else if (REC && REC.lavora && REC.riu === r.id) {
    h += '<div class="recon"><span class="busy"></span> ' + esc(REC.stato || "Trascrivo…") + "</div>";
  } else {
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-rec-start="' + r.id + '">● Registra</button>' +
      '<label class="btn sm ghost" style="cursor:pointer">Carica un audio<input type="file" accept="audio/*,video/webm" data-rec-file="' + r.id + '" style="display:none"></label>' +
      (r.trascrizione ? '<button class="btn sm ghost" data-rec-riassumi="' + r.id + '">Rifai appunti dalla trascrizione</button><button class="lnk mini2" data-rec-vedi="' + r.id + '">' + (RECVEDI === r.id ? "nascondi" : "leggi") + " la trascrizione</button>" : "") + "</div>";
    if (r.trascrizione && RECVEDI === r.id) h += '<div class="trascr">' + esc(r.trascrizione) + "</div>";
  }
  return h + "</div>";
}
var RECVEDI = null;
function durataRec() { if (!REC || !REC.t0) return "0:00"; var s = Math.floor((Date.now() - REC.t0) / 1000); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
async function recStart(rid) {
  if (REC) { toast("C'è già una registrazione in corso", true); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Questo browser non sa registrare: usa Chrome o Safari aggiornati", true); return; }
  var stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { toast("Serve il permesso del microfono", true); return; }
  var mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0] || "";
  REC = { riu: rid, stream: stream, mime: mime, parti: [], t0: Date.now(), n: 0, busy: false, lavora: false };
  var avvia = function () {
    var mr; try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }); } catch (e) { mr = new MediaRecorder(stream); }
    var pezzi = [];
    mr.ondataavailable = function (e) { if (e.data && e.data.size) pezzi.push(e.data); };
    mr.onstop = function () { if (pezzi.length) REC.parti.push(new Blob(pezzi, { type: mr.mimeType || mime || "audio/webm" })); if (REC && REC.fine) REC.fine(); };
    mr.start(1000); REC.mr = mr;
    /* ogni quarto d'ora chiudo un pezzo e ne apro un altro: file piccoli, trascrizione sicura */
    REC.tm = setTimeout(function () { if (REC && REC.mr === mr && mr.state === "recording") { mr.stop(); avvia(); } }, 15 * 60 * 1000);
  };
  avvia();
  REC.tick = setInterval(function () { var l = el("#reclbl"); if (l) l.textContent = durataRec(); }, 1000);
  render();
}
async function recStop() {
  if (!REC || !REC.mr) return;
  var R = REC; clearTimeout(R.tm); clearInterval(R.tick);
  await new Promise(function (ok) { R.fine = ok; if (R.mr.state !== "inactive") R.mr.stop(); else ok(); });
  R.stream.getTracks().forEach(function (t) { t.stop(); });
  R.lavora = true; R.mr = null; render();
  await trascriviParti(R.riu, R.parti);
}
async function trascriviParti(rid, parti) {
  var r = by(D.riu, rid); if (!r) { REC = null; render(); return; }
  var testi = [];
  try {
    for (var i = 0; i < parti.length; i++) {
      REC.stato = "Carico l'audio " + (i + 1) + " di " + parti.length + "…"; render();
      var tp = parti[i].type || "", nm = parti[i].name || "";
      var ext = /wav/.test(tp) ? "wav" : /mpeg|mp3/.test(tp) ? "mp3" : /mp4|m4a|aac/.test(tp) ? "m4a" : /ogg|opus/.test(tp) ? "ogg" : /webm/.test(tp) ? "webm" : (/\.(wav|mp3|m4a|ogg|webm|mp4|flac)$/i.exec(nm) || [0, "webm"])[1].toLowerCase();
      var path = "riunioni/" + rid + "/" + Date.now() + "-" + i + "." + ext;
      var up = await sb.storage.from("audio").upload(path, parti[i], { contentType: parti[i].type || "audio/webm" });
      if (up.error) throw new Error(erroreUmano(up.error));
      REC.stato = "Trascrivo " + (i + 1) + " di " + parti.length + " (ci vuole circa un minuto ogni dieci di audio)…"; render();
      var j = await chiamaTrascrizione({ azione: "trascrivi", path: path });
      testi.push(j.testo || "");
    }
    var testo = testi.join("\n").trim();
    if (!testo) throw new Error("non ho sentito niente: audio vuoto");
    var tutto = (r.trascrizione ? r.trascrizione + "\n\n— — —\n\n" : "") + testo;
    await sb.from("riunioni").update({ trascrizione: tutto }).eq("id", rid); r.trascrizione = tutto;
    REC.stato = "Preparo appunti, decisioni e prossimi passi…"; render();
    await riassumiRiunione(rid, testo);
  } catch (e) {
    toast("Registrazione: " + (e && e.message ? e.message : e), true);
  }
  REC = null; render();
}
async function chiamaTrascrizione(dati) {
  var s = await sb.auth.getSession(); var ses = s && s.data ? s.data.session : null;
  if (!ses) throw new Error("la sessione è scaduta, rientra e riprova");
  var r = await fetch(String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/trascrivi-riunione", {
    method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + ses.access_token }, body: JSON.stringify(dati)
  });
  var j = null; try { j = await r.json(); } catch (e) { }
  if (r.status === 501) throw new Error("la chiave OpenAI non è configurata nel progetto");
  if (!r.ok) throw new Error((j && j.errore) || "il server ha risposto " + r.status);
  return j || {};
}
async function riassumiRiunione(rid, testo) {
  var r = by(D.riu, rid); if (!r) return;
  var j = await chiamaTrascrizione({ azione: "riassumi", testo: testo || r.trascrizione || "", titolo: r.titolo });
  var pross = (j.prossimi || []).map(function (p) { return "- " + p.titolo + (p.chi ? " (" + p.chi + ")" : "") + (p.quando ? " · " + p.quando : ""); }).join("\n");
  modal('<div class="box wide"><h2>Dalla registrazione</h2><p class="faint" style="margin-bottom:10px">Leggi e correggi: con «Metti nella riunione» finiscono negli appunti, nelle decisioni e nei prossimi passi (in coda a quello che c\'è già).</p>' +
    '<form data-rec-metti="' + rid + '"><div class="riugrid">' +
    '<div><label class="faint">Appunti</label><textarea name="note" class="doc" rows="8">' + esc(j.appunti || "") + "</textarea></div>" +
    '<div><label class="faint">Decisioni</label><textarea name="decisioni" class="doc" rows="8">' + esc(j.decisioni || "") + "</textarea></div>" +
    '<div style="grid-column:1/-1"><label class="faint">Prossimi passi (una riga per attività)</label><textarea name="prossimi" class="doc" rows="5">' + esc(pross) + "</textarea></div></div>" +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Lascia stare</button><button class="btn" type="submit">Metti nella riunione</button></div></form></div>');
}

/* ---------------- lettera d'incarico ----------------
   Dal preventivo accettato nasce la lettera: una fotografia di parti, oggetto,
   importi e regole, scritta con articoli che si riscrivono sul posto. Il cliente
   la firma da un link (#/f/codice): nome, firma col dito o col mouse, ora,
   indirizzo e impronta del testo. Firmata, non si tocca più: si fa una versione nuova. */
function incOf(kid) { return D.inc.filter(function (i) { return i.commessa_id === kid; }).sort(function (a, b) { return (a.created_at || "") < (b.created_at || "") ? 1 : -1; }); }
function testoIncarico(k) {
  var em = emittente(k), cl = by(D.cli, k.cliente_id) || {}, c = calc(k), pg = pagOf(k), rr = righeOf(k.id);
  var voci = rr.filter(function (r) { return !r.opzionale; }).map(function (r) { return rigaCalc(r).nome; }).filter(Boolean);
  var pagam = pg.length ? pg.map(function (p) { return (p.nome || "quota") + ": " + eur(p.importo) + (p.scadenza ? " entro il " + dt(p.scadenza) : ""); }).join("; ") : "come da condizioni del preventivo";
  var tempi = (k.inizio ? "Inizio delle attività: " + dt(k.inizio) + ". " : "") + (k.scadenza ? "Consegna prevista: " + dt(k.scadenza) + ". " : "") + "Eventuali variazioni ai tempi saranno concordate per iscritto.";
  var chi = em.studio ? em.nome + " (di seguito «lo Studio»), che coordina i professionisti incaricati, ciascuno operante con la propria partita IVA" : em.nome + (em.piva ? ", P. IVA " + em.piva : "") + " (di seguito «il Professionista»)";
  return {
    emittente: { nome: em.nome || "", piva: em.piva || "", indirizzo: em.indirizzo || "", email: em.email || "", tel: em.tel || "", studio: !!em.studio, logo: em.logo || null, firma: em.firma || null, firmatario: em.firmatario || "" },
    cliente: { nome: k.intestatario || cl.nome || "", referente: cl.referente || "", indirizzo: cl.indirizzo || "", piva: cl.piva || "", email: cl.email || "" },
    preventivo: { titolo: k.titolo, numero: k.numero || numeroDoc(k), data: dataDoc(k), totale: c.tot, lordo: c.lordo, iva: k.iva == null ? 22 : k.iva },
    data: today(),
    intro: "Con la presente " + (k.intestatario || cl.nome || "il Cliente") + " (di seguito «il Cliente») affida a " + chi + " l'incarico descritto di seguito, alle condizioni che seguono.",
    articoli: [
      { t: "Oggetto dell'incarico", x: "L'incarico ha per oggetto «" + k.titolo + "», come descritto nel preventivo n. " + (k.numero || numeroDoc(k)) + " del " + dt(dataDoc(k)) + ", che il Cliente dichiara di aver letto e accettato e che forma parte integrante della presente lettera." + (voci.length ? " In sintesi: " + voci.join("; ") + "." : "") },
      { t: "Corrispettivo e pagamenti", x: "Il corrispettivo è di " + eur(c.tot) + " oltre IVA " + (k.iva == null ? 22 : k.iva) + "% (" + eur(c.lordo) + " IVA inclusa). Pagamenti: " + pagam + ". In caso di ritardo nei pagamenti le attività potranno essere sospese fino alla regolarizzazione." },
      { t: "Tempi", x: tempi },
      { t: "Cosa serve dal Cliente", x: "Il Cliente si impegna a fornire tempestivamente materiali, informazioni e accessi necessari, e a indicare un referente per le approvazioni. I ritardi nella consegna di quanto richiesto fanno slittare di pari tempo le scadenze." },
      { t: "Proprietà intellettuale e diritti d'uso", x: "I diritti d'uso su quanto realizzato passano al Cliente con il saldo del corrispettivo, nei limiti e per gli usi indicati nel preventivo. Bozze, file di lavoro e materiali non scelti restano di chi li ha prodotti, che potrà citare il lavoro nel proprio portfolio salvo diverso accordo scritto." },
      { t: "Riservatezza e dati personali", x: "Le parti trattano come riservate le informazioni scambiate per l'incarico. I dati personali sono trattati nel rispetto del Regolamento (UE) 2016/679 per le sole finalità dell'incarico." },
      { t: "Recesso", x: "Ciascuna parte può recedere con comunicazione scritta e preavviso di 15 giorni. In tal caso è dovuto il compenso per il lavoro svolto fino a quel momento e gli acconti versati non sono restituiti." },
      { t: "Legge applicabile e foro", x: "La presente lettera è regolata dalla legge italiana. Per ogni controversia è competente il Foro di Verona." }
    ],
    chiusura: "Letto, confermato e sottoscritto per accettazione."
  };
}
async function creaIncarico(kid) {
  var k = by(D.com, kid); if (!k) return;
  var n = incOf(kid).length + 1;
  var r = await sb.from("incarichi").insert({ commessa_id: kid, cliente_id: k.cliente_id || null, numero: (k.numero || numeroDoc(k)) + "-I" + n, testo: testoIncarico(k), creato_da: me.pro_id, stato: "Bozza" }).select().single();
  if (r.error) { toast(erroreUmano(r.error), true); return; }
  await reload(["inc"]); toast("Lettera d'incarico pronta: leggila e riscrivi quello che vuoi"); render();
}
function linkFirma(i) { return location.origin + location.pathname + "#/f/" + i.token; }
function edInc(i, campo, val, vuotoTxt, multi) {
  if (i.stato === "Firmata" || i.stato === "Annullata") return multi ? '<div class="dtx">' + esc(val || "") + "</div>" : esc(val || "");
  return '<span class="ed' + (multi ? " edb" : "") + '" contenteditable="true" spellcheck="false" data-inc="' + i.id + "|" + campo + '"' + (multi ? ' data-multi="1"' : "") + ' data-vuoto="' + esc(vuotoTxt || "—") + '">' + esc(val == null ? "" : val) + "</span>";
}
/* la lettera sul foglio: la stessa per chi la scrive e per chi la firma */
function letteraHTML(i, o) {
  o = o || {};
  var t = i.testo || {}, em = t.emittente || {}, cl = t.cliente || {}, pv = t.preventivo || {};
  var firmata = i.stato === "Firmata";
  var h = '<div class="a4 lettera"><div class="dtop">' +
    '<div class="dmitt">' + (em.logo ? '<img class="dlogo" src="' + esc(em.logo) + '" alt="">' : '<i class="mark"></i>') + "<div><b>" + esc(em.nome || "—") + "</b>" +
    (em.indirizzo ? "<span>" + esc(em.indirizzo) + "</span>" : "") + (em.piva ? "<span>P. IVA " + esc(em.piva) + "</span>" : "") + (em.email ? "<span>" + esc(em.email) + "</span>" : "") + "</div></div>" +
    '<div class="ddoc"><h2>' + edInc(i, "titolo", i.titolo, "Lettera d'incarico") + "</h2><table><tbody>" +
    "<tr><td>Rif.</td><td>" + esc(i.numero || "") + "</td></tr>" +
    "<tr><td>Data</td><td>" + dt(t.data || i.created_at) + "</td></tr>" +
    "<tr><td>Preventivo</td><td>n. " + esc(pv.numero || "") + " del " + dt(pv.data) + "</td></tr>" +
    "</tbody></table></div></div>";
  h += '<div class="ddest"><span class="lb">Tra</span><b>' + esc(em.nome || "") + "</b>" + (em.piva ? "<div>P. IVA " + esc(em.piva) + "</div>" : "") + (em.indirizzo ? "<div>" + esc(em.indirizzo) + "</div>" : "") + "</div>" +
    '<div class="ddest"><span class="lb">e</span><b>' + esc(cl.nome || "") + "</b>" + (cl.referente ? "<div>" + esc(cl.referente) + "</div>" : "") + (cl.indirizzo ? "<div>" + esc(cl.indirizzo) + "</div>" : "") + (cl.piva ? "<div>P. IVA " + esc(cl.piva) + "</div>" : "") + "</div>";
  h += '<div class="dpre">' + edInc(i, "intro", t.intro, "Premessa", true) + "</div>";
  (t.articoli || []).forEach(function (a, j) {
    h += '<div class="dsez dsezt"><div class="dsh"><b>Art. ' + (j + 1) + " — " + edInc(i, "a" + j + ".t", a.t, "Titolo") + "</b>" +
      (firmata || i.stato === "Annullata" || o.pubblico ? "" : '<span class="noprint dsezc"><button class="lnk mini2" data-incart="' + i.id + "|" + j + '|-1">↑</button><button class="lnk mini2" data-incart="' + i.id + "|" + j + '|1">↓</button><button class="lnk mini2" data-incart="' + i.id + "|" + j + '|via">togli</button></span>') + "</div>" +
      '<div class="dtx">' + edInc(i, "a" + j + ".x", a.x, "Testo dell'articolo", true) + "</div></div>";
  });
  if (!firmata && i.stato !== "Annullata" && !o.pubblico) h += '<div class="noprint dsezadd"><button class="lnk mini2" data-incart="' + i.id + '|new|0">+ aggiungi un articolo</button></div>';
  h += '<div class="dchiusa">' + edInc(i, "chiusura", t.chiusura, "Chiusura", true) + "</div>";
  h += '<div class="dfirme"><div><span class="lb">Per ' + esc(em.nome || "") + "</span>" + (em.firma ? '<img class="dfirmaimg" src="' + esc(em.firma) + '" alt="">' : "") + "<i></i>" + (em.firmatario ? '<span class="dnota">' + esc(em.firmatario) + "</span>" : "") + "</div>" +
    '<div><span class="lb">Per ' + esc(cl.nome || "il Cliente") + "</span>" + (firmata ? '<img class="dfirmaimg" src="' + esc(i.firma_img) + '" alt="firma">' : "") + "<i></i>" + (firmata ? '<span class="dnota">' + esc(i.firma_nome) + " · firmato il " + dtOra(i.firmata_il) + "</span>" : '<span class="dnota faint">firma dal link</span>') + "</div></div>";
  if (firmata) h += '<p class="dpie">Documento firmato elettronicamente il ' + dtOra(i.firmata_il) + " da " + esc(i.firma_nome) + ". Impronta del testo (SHA-256): " + esc((i.firma_hash || "").slice(0, 32)) + "…</p>";
  return h + "</div>";
}
function dtOra(s) { if (!s) return "—"; var d = new Date(s); return isNaN(d) ? "—" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) + " alle " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
function schedaIncarico(k) {
  var lista = incOf(k.id), i = (INCVEDI && by(D.inc, INCVEDI) && by(D.inc, INCVEDI).commessa_id === k.id ? by(D.inc, INCVEDI) : lista[0]), cl = by(D.cli, k.cliente_id) || {};
  var h = "";
  if (!i) {
    return '<div class="empty" style="padding:24px 8px"><b>Nessuna lettera d\'incarico ancora.</b><p class="faint" style="margin:8px 0 14px">Dal preventivo ' + (k.stato === "Accettato" || k.stato === "Completato" ? "accettato" : "(meglio dopo l\'accettazione)") + ' nasce la lettera: parti, oggetto, corrispettivo, tempi e regole, già scritte. Poi la mandi con un link e il cliente firma dal telefono.</p><button class="btn" data-inc-nuovo="' + k.id + '">Prepara la lettera d\'incarico</button></div>';
  }
  var url = linkFirma(i);
  var st = { Bozza: "b-amber", Inviata: "b-blue", Firmata: "b-green", Annullata: "" }[i.stato] || "";
  h += '<div class="docbar noprint"><div class="dbleft"><span class="badge ' + st + '">' + esc(i.stato) + (i.stato === "Firmata" ? " il " + dt(i.firmata_il) : i.stato === "Inviata" && i.inviata_il ? " il " + dt(i.inviata_il) : "") + "</span>" +
    (lista.length > 1 ? '<select data-inc-vedi="1">' + lista.map(function (x, n) { return '<option value="' + x.id + '"' + (x.id === i.id ? " selected" : "") + ">" + esc(x.numero || ("versione " + (lista.length - n))) + " · " + esc(x.stato) + "</option>"; }).join("") + "</select>" : "") +
    (i.stato === "Firmata" || i.stato === "Annullata" ? "" : '<span class="faint">clicca un testo per riscriverlo</span>') + "</div>" +
    '<div class="dbright">' +
    (i.stato === "Firmata" ? '<button class="btn sm ghost" data-inc-nuovo="' + k.id + '">Nuova versione</button>' :
      i.stato === "Annullata" ? '<button class="btn sm ghost" data-inc-nuovo="' + k.id + '">Nuova lettera</button>' :
      '<button class="btn sm ghost" data-inc-link="' + i.id + '" title="' + esc(url) + '">Copia il link per la firma</button>' +
      (cl.telefono ? '<a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(cl.telefono).replace(/\D/g, "").replace(/^0/, "39")) + '?text=' + esc(encodeURIComponent("Ciao " + (cl.referente || cl.nome || "") + ", ti mando la lettera d'incarico per «" + k.titolo + "»: la puoi leggere e firmare da qui " + url)) + '" data-inc-inviata="' + i.id + '">WhatsApp</a>' : "") +
      (cl.email ? (postaConn() ? '<button class="btn sm ghost" data-gmail-inc="' + i.id + '">Email</button>' : '<a class="btn sm ghost" href="mailto:' + esc(cl.email) + "?subject=" + esc(encodeURIComponent("Lettera d'incarico — " + k.titolo)) + "&body=" + esc(encodeURIComponent("Gentile " + (cl.referente || cl.nome || "") + ",\n\nle invio la lettera d'incarico per «" + k.titolo + "». La può leggere e firmare da questo link:\n" + url + "\n\nResto a disposizione.\n" + (me.nome || ""))) + '" data-inc-inviata="' + i.id + '">Email</a>') : "") +
      '<button class="btn sm ghost" data-inc-annulla="' + i.id + '">Annulla</button>') +
    '<button class="btn sm" data-stampa="' + esc((i.numero || "Incarico") + " " + (cl.nome || "") + " " + (k.titolo || "")) + '">Stampa / PDF</button></div></div>';
  if (i.stato === "Firmata") h += '<div class="card" style="background:var(--green-soft);border-color:transparent;margin-bottom:14px"><b>Firmata da ' + esc(i.firma_nome) + "</b> il " + dtOra(i.firmata_il) + (i.firma_ip ? ' <span class="faint">· da ' + esc(i.firma_ip) + "</span>" : "") + '<div class="faint" style="margin-top:4px">Il testo è sigillato con la sua impronta: se serve cambiare qualcosa, fai una nuova versione.</div></div>';
  return h + letteraHTML(i, {});
}
/* la pagina che vede il cliente dal link: la lettera e il riquadro per firmare */
async function paginaFirma(tok) {
  var box = el("#pub"); show("pub"); el("#splash").classList.add("hide");
  box.innerHTML = '<div class="pubwrap"><p class="faint">Carico la lettera…</p></div>';
  var r = await sb.rpc("incarico_leggi", { tok: tok });
  if (r.error || !r.data) { box.innerHTML = '<div class="pubwrap"><div class="authcard"><div class="brandmark"><i class="mark"></i></div><h2>Link non valido</h2><p>Questa lettera non esiste o non è più disponibile. Chiedi a chi te l\'ha mandata un nuovo link.</p></div></div>'; return; }
  var i = r.data;
  var disegna = function () {
    var firmata = i.stato === "Firmata";
    box.innerHTML = '<div class="pubwrap"><div class="pubhead noprint"><div class="brandmark"><i class="mark"></i></div><div><b>' + esc((i.testo && i.testo.emittente && i.testo.emittente.nome) || "Giraffa Studio") + "</b><div class=\"faint\">" + (firmata ? "Lettera firmata. Puoi scaricarla o stamparla." : "Leggi la lettera e, se sei d'accordo, firmala qui sotto.") + "</div></div>" +
      '<button class="btn sm ghost" data-stampa="' + esc(i.numero || "Lettera d\'incarico") + '">Stampa / PDF</button></div>' +
      letteraHTML(i, { pubblico: true }) +
      (firmata ? '<div class="card noprint" style="max-width:820px;margin:16px auto 40px;text-align:center"><b>Grazie, è tutto firmato.</b><div class="faint">Firmato da ' + esc(i.firma_nome) + " il " + dtOra(i.firmata_il) + ". Conserva una copia con «Stampa / PDF».</div></div>" :
        '<form class="card firmabox noprint" id="firmaform" style="max-width:820px;margin:16px auto 40px"><h2>Firma per accettazione</h2>' +
        '<div class="field"><label>Nome e cognome di chi firma</label><input name="nome" required minlength="3" autocomplete="name" placeholder="Es. Maria Rossi"></div>' +
        '<label style="display:block;margin:10px 0 6px;font-size:13px;color:var(--soft)">Firma qui sotto, col dito o col mouse</label>' +
        '<div class="firmapad"><canvas id="firmacv" width="1200" height="400"></canvas><button type="button" class="lnk mini2" id="firmapulisci">cancella</button></div>' +
        '<label class="chk" style="margin-top:12px"><input type="checkbox" name="ok" required><span>Ho letto la lettera d\'incarico e il preventivo a cui si riferisce e li accetto.</span></label>' +
        '<div class="err hide" id="firmaerr"></div>' +
        '<div class="actions"><button class="btn" type="submit">Firma e conferma</button></div>' +
        '<p class="faint" style="margin-top:10px">Registriamo nome, ora, indirizzo di rete e un\'impronta del testo, così la firma è verificabile.</p></form>') +
      '<p class="faint noprint" style="text-align:center;margin-bottom:30px">Giraffa Studio · crm.giraffastudio.it</p></div>';
    if (firmata) return;
    var cv = el("#firmacv"), ctx = cv.getContext("2d"), giu = false, tratti = 0, last = null;
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1b1a18";
    var pos = function (e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
    cv.addEventListener("pointerdown", function (e) { giu = true; last = pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener("pointermove", function (e) { if (!giu) return; var p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; tratti++; e.preventDefault(); });
    var su = function () { giu = false; }; cv.addEventListener("pointerup", su); cv.addEventListener("pointercancel", su); cv.addEventListener("pointerleave", su);
    el("#firmapulisci").addEventListener("click", function () { ctx.clearRect(0, 0, cv.width, cv.height); tratti = 0; });
    el("#firmaform").addEventListener("submit", async function (e) {
      e.preventDefault();
      var err = el("#firmaerr"), btn = e.target.querySelector("button[type=submit]"); err.classList.add("hide");
      if (tratti < 8) { err.textContent = "Disegna la tua firma nel riquadro."; err.classList.remove("hide"); return; }
      btn.disabled = true; btn.textContent = "Registro la firma…";
      var img = cv.toDataURL("image/png");
      var rf = await sb.rpc("incarico_firma", { tok: tok, nome: e.target.nome.value.trim(), img: img });
      if (rf.error) { err.textContent = (rf.error.message || "").replace(/^[^:]*: /, "") || "Non sono riuscito a registrare la firma."; err.classList.remove("hide"); btn.disabled = false; btn.textContent = "Firma e conferma"; return; }
      i = rf.data; disegna(); window.scrollTo(0, 0);
    });
  };
  disegna();
}
function vDocumento() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Preventivo non trovato. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  return crumbs([[gruppoDi("commesse") || "Clienti"], ["Preventivi", "commesse"], [k.titolo, "commessa", k.id, "servizi"], ["Documento"]]) + foglioA4(k, {});
}
function foglioA4(k, o) {
  o = o || {};
  var amb = ambitoCom(k), em = emittente(k), cl = by(D.cli, k.cliente_id) || {};
  var c = calc(k), rr = righeOf(k.id), pgt = progOf(k.id), pg = pagOf(k.id);
  var nas = opzDoc(k).nascosti || [];
  var h = '<div class="docbar noprint">' +
    '<div class="dbleft"><span class="badge ' + (amb === "studio" ? "b-blue" : "b-amber") + '">' + ambitoEt(amb) + "</span>" +
    '<select data-qset="com|ambito|' + k.id + '" title="Chi emette questo preventivo">' +
    opzioni([["auto", "Deciso dalle righe"], ["personale", "Sempre personale"], ["studio", "Sempre dello studio"]], k.ambito || "auto") + "</select>" +
    '<span class="faint">clicca qualsiasi testo per riscriverlo</span></div>' +
    '<div class="dbright">' +
    '<button class="btn sm ghost" data-mprev-apri="' + k.id + '">Modelli</button>' +
    (nas.length ? '<select class="altre" data-blocco-mostra="' + k.id + '"><option value="">Rimetti un blocco…</option>' + BLOCCHI.filter(function (b) { return nas.indexOf(b[0]) > -1; }).map(function (b) { return '<option value="' + b[0] + '">' + b[1] + "</option>"; }).join("") + "</select>" : "") +
    (cl.email ? (postaConn() ? '<button class="btn sm ghost" data-gmail-prev="' + k.id + '">Invia per email</button>' : '<a class="btn sm ghost" href="' + esc(mailtoPreventivo(k, cl)) + '">Invia per email</a>') : "") +
    (k.stato === "Bozza" ? '<button class="btn sm ghost" data-del="com:' + k.id + '" title="Elimina questa bozza">Elimina bozza</button>' : '<button class="btn sm ghost" data-route="commessa|' + k.id + '|incarico">Incarico' + (incOf(k.id).some(function (i) { return i.stato === "Firmata"; }) ? " ✓" : "") + "</button>") +
    '<button class="btn sm" data-stampa="' + esc(nomeFile(k)) + '">Stampa / PDF</button></div></div>';

  if (DOCNUOVO === k.id || (!rr.length && !sezioniDi(k).length && !k.premessa)) {
    var mm = modelliPrev();
    h += '<div class="card dmodelli noprint"><div class="cardhead"><h2>Da dove parti?</h2><span class="faint">un modello mette sezioni e voci sul foglio, poi riscrivi tutto come vuoi</span></div><div class="chips">' +
      mm.map(function (m) { return '<button class="chipbtn" data-mprev-usa="' + k.id + "|" + m.id + '" title="' + esc(m.descrizione || "") + '">' + (m.standard ? "" : m.pro_id === me.pro_id ? "★ " : "⇅ ") + esc(m.nome) + "</button>"; }).join("") +
      '<button class="chipbtn" data-mprev-bianco="' + k.id + '">Foglio bianco</button></div></div>';
  }

  h += '<div class="a4"><div class="dtop">' +
    '<div class="dmitt">' + (em.logo ? '<img class="dlogo" src="' + esc(em.logo) + '" alt="">' : '<i class="mark"></i>') + "<div><b>" + esc(em.nome || "—") + "</b>" +
    (em.indirizzo ? "<span>" + esc(em.indirizzo) + "</span>" : "") +
    (em.piva ? "<span>P. IVA " + esc(em.piva) + "</span>" : "") +
    (em.email ? "<span>" + esc(em.email) + "</span>" : "") +
    (em.tel ? "<span>" + esc(em.tel) + "</span>" : "") +
    (em.sito ? "<span>" + esc(em.sito) + "</span>" : "") +
    (em.studio ? "" : '<span class="faint">professionista di Giraffa Studio</span>') +
    "</div></div>" +
    '<div class="ddoc"><h2>Preventivo</h2><table><tbody>' +
    "<tr><td>Numero</td><td>" + (k.numero ? ed("com", k.id, "numero", k.numero) : k.stato === "Bozza" ? '<span class="faint" title="Il numero definitivo arriva quando lo segni come inviato">' + esc(numeroDoc(k)) + " (bozza)</span>" : ed("com", k.id, "numero", numeroDoc(k))) + "</td></tr>" +
    "<tr><td>Data</td><td>" + ed("com", k.id, "data", dt(dataDoc(k)), "la data del documento") + "</td></tr>" +
    "<tr><td>Validità</td><td>" + ed("com", k.id, "validita", k.validita == null ? 30 : k.validita, "30", "n") + " giorni</td></tr>" +
    "</tbody></table></div></div>";

  h += '<div class="ddest"><span class="lb">Spettabile' + (cl.id ? ' <button class="lnk mini2 noprint" data-cambiacli="' + k.id + '">cambia cliente</button>' : "") + "</span>";
  if (!cl.id || CAMBIACLI === k.id) {
    h += '<div class="noprint dcli"><select data-qset="com|cliente_id|' + k.id + '"><option value="">— scegli il cliente —</option>' + opt(fcli().length ? fcli() : D.cli, k.cliente_id) + '<option value="__nuovo">＋ nuovo cliente…</option></select>' + (cl.id ? ' <button class="lnk mini2" data-cambiacli="0">annulla</button>' : "") + "</div>";
  }
  h += "<b>" + ed("com", k.id, "intestatario", k.intestatario || cl.nome, cl.id ? "Intestazione (es. Spett.le La Staffa Srl)" : "Intestazione, se diversa dal nome del cliente") + "</b>" +
    (cl.id ? "<div>" + ed("cli", cl.id, "referente", cl.referente, "alla cortese attenzione di…") + "</div>" +
      "<div>" + ed("cli", cl.id, "indirizzo", cl.indirizzo, "indirizzo") + "</div>" +
      "<div>" + ed("cli", cl.id, "piva", cl.piva, "partita IVA") + " · " + ed("cli", cl.id, "email", cl.email, "email") + "</div>" : "") +
    "</div>";

  h += '<h1 class="dtit">' + ed("com", k.id, "titolo", k.titolo, "Titolo del preventivo") + "</h1>";
  if (!nascosto(k, "premessa")) h += '<div class="dpre">' + edBlocco("com", k.id, "premessa", k.premessa, "Due righe di premessa: cosa ci siamo detti, cosa proponiamo, perché.") + bloccoVia(k.id, "premessa") + "</div>";
  h += bloccoSezioni(k, "prima");

  var gruppi = pgt.map(function (p) { return { p: p, r: rr.filter(function (x) { return x.progetto_id === p.id && !x.opzionale; }) }; });
  var senza = rr.filter(function (x) { return !x.progetto_id && !x.opzionale; });
  if (senza.length || !pgt.length) gruppi.push({ p: { id: null, nome: "Voci" }, r: senza });
  gruppi.forEach(function (g) {
    if (!g.r.length && g.p.id) return;
    h += '<div class="dsez"><div class="dsh"><b>' + esc(g.p.nome) + "</b>" +
      (g.p.pro_id && amb === "studio" ? '<span class="faint">a cura di ' + esc(nameOf(D.pros, g.p.pro_id)) + "</span>" : "") + "</div>";
    h += '<table class="dtab"><thead><tr><th>Voce</th><th class="num">Q.tà</th><th class="num">Prezzo</th><th class="num">Importo</th><th class="noprint"></th></tr></thead><tbody>' +
      g.r.map(function (r) {
        var rc = rigaCalc(r);
        return "<tr><td><b>" + ed("righe", r.id, "nome", rc.nome, "Nome della voce") + "</b>" +
          '<div class="dnota">' + ed("righe", r.id, "descrizione", r.descrizione, "che cosa comprende") + "</div>" +
          (r.ricorrente ? '<div class="dnota">' + esc(r.periodo || "Mensile") + ", per " + (r.cicli || 1) + (r.periodo === "Annuale" ? " anni" : " mesi") + "</div>" : "") + "</td>" +
          '<td class="num">' + ed("righe", r.id, "qty", rc.q, "1", "n") + " " + esc(rc.unita || "") + "</td>" +
          '<td class="num">' + ed("righe", r.id, "prezzo_unit", rc.pu, "0", "n") + " €" + (r.sconto ? '<div class="dnota">−' + r.sconto + "%</div>" : "") + "</td>" +
          '<td class="num"><b>' + eur(rc.prezzo) + "</b></td>" +
          '<td class="num noprint"><button class="lnk mini2" data-riga-edit="' + r.id + '" title="Chi la fa, compenso, opzionale, ricorrenza">dettagli</button> <button class="lnk mini2" data-del="righe:' + r.id + '">togli</button></td></tr>';
      }).join("") + "</tbody></table>" +
      '<div class="noprint" style="margin:6px 0 0"><button class="lnk mini2" data-rigainline="' + k.id + "|" + (g.p.id || "") + '">+ aggiungi una voce</button></div></div>';
  });
  h += '<div class="noprint dsezadd"><button class="lnk mini2" data-new="prog" data-ctx="' + k.id + '">+ aggiungi un gruppo di voci (un progetto: sito, foto, social…)</button></div>';

  h += '<table class="dtot"><tbody>' +
    row2("Imponibile", eur(c.imp + c.sconto)) +
    row2("Sconto " + ed("com", k.id, "sconto", k.sconto || 0, "0", "n") + "%", c.sconto ? "−" + eur(c.sconto) : '<span class="noprint faint">nessuno</span>') +
    row2("<b>Totale imponibile</b>", "<b>" + eur(c.tot) + "</b>") +
    row2("IVA " + ed("com", k.id, "iva", k.iva == null ? 22 : k.iva, "22", "n") + "%", eur(c.iva)) +
    row2('<b class="big">Totale</b>', '<b class="big">' + eur(c.lordo) + "</b>") +
    (c.mrr ? row2("di cui ricorrente", eur(c.mrr) + " al mese") : "") +
    "</tbody></table>";

  var opzR = rr.filter(function (x) { return x.opzionale; });
  if (opzR.length && !nascosto(k, "opzioni")) {
    h += '<div class="dsez"><div class="dsh"><b>Se le vorrete attivare</b><span class="faint">non incluse nel totale</span>' + bloccoVia(k.id, "opzioni") + "</div>" +
      '<table class="dtab"><tbody>' + opzR.map(function (r) {
        var rc = rigaCalc(r);
        return "<tr><td>" + ed("righe", r.id, "nome", rc.nome) + '<div class="dnota">' + ed("righe", r.id, "descrizione", r.descrizione, "") + '</div></td><td class="num">' + eur(rc.prezzo) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  if (pg.length && !nascosto(k, "pagamenti")) {
    h += '<div class="dsez"><div class="dsh"><b>Come si paga</b>' + bloccoVia(k.id, "pagamenti") + '</div><table class="dtab"><tbody>' +
      pg.map(function (p) {
        return "<tr><td>" + ed("pag", p.id, "nome", p.nome, "descrizione") + "</td><td>" + (p.scadenza ? dt(p.scadenza) : "") + '</td><td class="num">' + eur(p.importo) + "</td></tr>";
      }).join("") + "</tbody></table>" +
      (em.iban ? '<p class="dnota">Bonifico su IBAN ' + esc(em.iban) + "</p>" : "") + "</div>";
  }

  h += bloccoSezioni(k, "dopo");

  if (!nascosto(k, "condizioni")) h += '<div class="dsez"><div class="dsh"><b>Condizioni</b>' + bloccoVia(k.id, "condizioni") + "</div>" +
    edBlocco("com", k.id, "condizioni", k.condizioni || em.condizioni || "", "Tempi, modalità, cosa serve da parte vostra, cosa non è compreso.") + "</div>";
  if (!nascosto(k, "chiusura")) h += '<div class="dchiusa">' + edBlocco("com", k.id, "chiusura", k.chiusura, "Una riga di chiusura: restiamo a disposizione, buon lavoro, a presto.") + bloccoVia(k.id, "chiusura") + "</div>";

  if (!nascosto(k, "firme")) h += '<div class="dfirme"><div><span class="lb">Per ' + esc(em.nome || "noi") + "</span>" +
    (em.firma ? '<img class="dfirmaimg" src="' + esc(em.firma) + '" alt="">' : "") + "<i></i>" +
    (em.firmatario && em.studio ? '<span class="dnota">' + esc(em.firmatario) + "</span>" : "") + "</div>" +
    '<div><span class="lb">Per accettazione</span><i></i>' + bloccoVia(k.id, "firme") + "</div></div>";
  if (!em.logo || !em.firma) h += '<p class="dnota noprint">' + (!em.logo ? (em.studio ? "Lo studio non ha ancora un logo caricato: si mette dalle Impostazioni. " : "Non hai ancora caricato il tuo logo. ") : "") +
    (!em.firma ? "Senza la tua firma il foglio esce con la riga vuota: la carichi dal tuo profilo." : "") + "</p>";
  var gg = k.validita == null ? 30 : +k.validita;
  var scade = new Date(dataDoc(k)); scade.setDate(scade.getDate() + gg);
  if (!nascosto(k, "pie")) h += '<p class="dpie">Preventivo valido ' + gg + " giorni dalla data di emissione, quindi fino al " + dt(iso(scade)) + "." +
    (amb === "studio" ? " Ogni professionista opera con la propria partita IVA sotto il coordinamento di " + esc(em.nome || "Giraffa Studio") + "." : "") + bloccoVia(k.id, "pie") + "</p>";
  h += "</div>";
  return h;
}
/* ---------------- l'assistente ----------------
   Una barra dove scrivi in italiano. I dati non escono mai tutti: gliene mando
   un riassunto, senza tariffe né costi interni. Se propone di fare qualcosa,
   la fa solo dopo che hai premuto tu. */
var CHAT = [], CHATOP = false, CHATBUSY = false;
function datiPerAssistente() {
  var d = {
    oggi: today(),
    io: { nome: me.nome, ruolo: me.ruolo },
    clienti: fcli().map(function (c) {
      return { id: c.id, nome: c.nome, settore: c.settore, stato: c.stato, referente: c.referente, email: c.email, piva: c.piva };
    }),
    preventivi: fcom().map(function (k) {
      var c = calc(k);
      return { id: k.id, titolo: k.titolo, cliente: nameOf(D.cli, k.cliente_id), stato: k.stato,
        data: dataDoc(k), numero: k.numero, valore: c.tot, avanzamento: avanzamento(k.id),
        inizio: k.inizio, scadenza: k.scadenza };
    }),
    progetti: D.prog.map(function (p) {
      return { id: p.id, nome: p.nome, preventivo: nameOf(D.com, p.commessa_id, "titolo"), stato: p.stato, avanzamento: p.avanzamento, fine: p.fine };
    }),
    attivita: ftask().filter(function (t) { return t.stato !== "Fatto"; }).map(function (t) {
      return { id: t.id, titolo: t.titolo, stato: t.stato, priorita: t.priorita, scadenza: t.scadenza,
        preventivo: t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") : null };
    }),
    ore_per_preventivo: (function () {
      var m = {};
      fore().forEach(function (o) { var k = o.commessa_id ? nameOf(D.com, o.commessa_id, "titolo") : "senza preventivo"; m[k] = Math.round(((m[k] || 0) + (+o.ore || 0)) * 10) / 10; });
      return m;
    })(),
    ore_per_mese: (function () {
      var m = {};
      fore().forEach(function (o) { var k = String(o.data || "").slice(0, 7); if (k) m[k] = Math.round(((m[k] || 0) + (+o.ore || 0)) * 10) / 10; });
      return m;
    })(),
    pagamenti: D.pag.filter(function (p) { return can(p.commessa_id); }).map(function (p) {
      return { nome: p.nome, preventivo: nameOf(D.com, p.commessa_id, "titolo"), cliente: nameOf(D.cli, (by(D.com, p.commessa_id) || {}).cliente_id), importo: p.importo, scadenza: p.scadenza, stato: p.stato, incassato_il: p.pagato_il };
    }),
    incassi_per_mese: (function () {
      var m = {};
      D.pag.filter(function (p) { return p.stato === "Incassato" && can(p.commessa_id); }).forEach(function (p) { var k = String(p.pagato_il || p.scadenza || "").slice(0, 7); if (k) m[k] = (m[k] || 0) + (+p.importo || 0); });
      return m;
    })(),
    riunioni: D.riu.filter(function (r) { return r.data >= today(); }).map(function (r) { return { titolo: r.titolo, data: r.data, ora: r.ora, cliente: nameOf(D.cli, r.cliente_id), link: r.link }; }),
    clienti_da_risentire: fcli().filter(function (c) { return c.richiamo; }).map(function (c) { return { nome: c.nome, quando: c.richiamo, perche: c.richiamo_nota }; })
  };
  return d;
}
async function chiediAssistente(domanda) {
  var s = await sb.auth.getSession();
  var ses = s && s.data ? s.data.session : null;
  if (!ses) throw new Error("la sessione è scaduta, rientra e riprova");
  var r = await fetch(String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/assistente", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + ses.access_token },
    body: JSON.stringify({ modo: "chat", domanda: domanda, dati: datiPerAssistente() })
  });
  var j = null; try { j = await r.json(); } catch (e) { }
  if (r.status === 501) throw new Error("la chiave OpenAI non è configurata su Supabase");
  if (!r.ok) throw new Error((j && j.errore) || "il server ha risposto " + r.status);
  return j;
}
function boxAssistente() {
  var h = '<div class="box wide assbox"><div class="asstop"><b>Chiedi</b>' +
    '<span class="faint">Risponde sui tuoi dati. Non fa niente senza il tuo sì.</span>' +
    '<button class="x" data-close>×</button></div>';
  h += '<div class="asslog" id="asslog">';
  if (!CHAT.length) {
    h += '<div class="assvuoto"><p>Per esempio:</p><ul>' +
      ['<li><button class="lnk" data-chatdemo="Quante ore ho fatto in tutto e su cosa?">Quante ore ho fatto in tutto e su cosa?</button></li>',
       '<li><button class="lnk" data-chatdemo="Quali preventivi sono ancora da chiudere e quanto valgono?">Quali preventivi sono ancora da chiudere e quanto valgono?</button></li>',
       '<li><button class="lnk" data-chatdemo="Cosa scade nei prossimi sette giorni?">Cosa scade nei prossimi sette giorni?</button></li>',
       '<li><button class="lnk" data-chatdemo="Chi mi deve dei soldi?">Chi mi deve dei soldi?</button></li>'].join("") + "</ul></div>";
  }
  CHAT.forEach(function (m, i) {
    if (m.io) { h += '<div class="assm mio">' + esc(m.io) + "</div>"; return; }
    h += '<div class="assm lui">' + esc(m.lui || "").split("\n").map(esc0).join("<br>") + "</div>";
    if (m.az && !m.fatta) {
      h += '<div class="assaz"><span>' + esc(m.az.descrizione || "Vuoi che lo faccia?") + "</span>" +
        '<button class="lnk" data-chatno="' + i + '">No</button>' +
        '<button class="btn sm" data-chatsi="' + i + '">Sì, fallo</button></div>';
    }
  });
  if (CHATBUSY) h += '<div class="assm lui attesa">sto guardando…</div>';
  h += "</div>";
  h += '<form class="assform" data-ask="1"><input type="text" name="q" placeholder="Scrivi la tua domanda…" autocomplete="off"' + (CHATBUSY ? " disabled" : "") + '>' +
    '<button class="btn" type="submit"' + (CHATBUSY ? " disabled" : "") + ">Chiedi</button></form>";
  return h + "</div>";
}
function apriAssistente() { CHATOP = true; modal(boxAssistente()); }
/* Si ridisegna la scatola, non la finestra: se si sostituisse tutto il contenuto
   di #modal sparirebbe il velo fisso e la chat finirebbe in fondo alla pagina. */
function aggiornaAssistente() {
  if (!CHATOP) return;
  var b = document.querySelector("#modal .assbox");
  if (b) b.outerHTML = boxAssistente(); else modal(boxAssistente());
}
async function mandaDomanda(q) {
  if (!q || CHATBUSY) return;
  CHAT.push({ io: q }); CHATBUSY = true; aggiornaAssistente();
  try {
    var r = await chiediAssistente(q);
    CHAT.push({ lui: r.risposta || "—", az: r.azione || null });
  } catch (e) {
    CHAT.push({ lui: "Non ce l'ho fatta: " + e.message });
  }
  CHATBUSY = false; aggiornaAssistente();
  var lg = el("#asslog"); if (lg) lg.scrollTop = lg.scrollHeight;
  var inp = document.querySelector(".assform input"); if (inp) inp.focus();
}
async function faiAzioneChat(i) {
  var m = CHAT[i]; if (!m || !m.az) return;
  var a = m.az;
  if (a.tipo === "vai") {
    m.fatta = true; CHATOP = false; closeModal();
    go(a.vista || "dash", a.id || null, a.scheda || "");
    return;
  }
  if (a.tipo === "crea_attivita") {
    var r = await sb.from("task").insert({
      titolo: (a.titolo || "Nuova attività").slice(0, 200), stato: "Da fare", priorita: "Media",
      assegnato_id: me.pro_id, commessa_id: a.commessa_id || null, scadenza: a.scadenza || null
    });
    if (r.error) { toast(erroreUmano(r.error), true); return; }
    await reload(["task"]); m.fatta = true; toast("Attività creata"); aggiornaAssistente(); render(); return;
  }
  if (a.tipo === "crea_cliente") {
    var r2 = await sb.from("clienti").insert({ nome: (a.titolo || "Nuovo cliente").slice(0, 140), owner_id: me.pro_id, stato: "Attivo" });
    if (r2.error) { toast(erroreUmano(r2.error), true); return; }
    await reload(["cli"]); m.fatta = true; toast("Cliente creato"); aggiornaAssistente(); render(); return;
  }
}

/* ---------------- analisi di un cliente dai dati pubblici ----------------
   Quello che di un'azienda è pubblico sul web, messo in ordine e con le fonti
   accanto. Non sono visure: sono pagine trovate in rete, da verificare. */
var ANA = { piva: "", nome: "", cliente_id: "", busy: false, err: "" };
async function cercaAnalisi() {
  var s = await sb.auth.getSession();
  var ses = s && s.data ? s.data.session : null;
  if (!ses) throw new Error("la sessione è scaduta, rientra e riprova");
  var r = await fetch(String(cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/assistente", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + ses.access_token },
    body: JSON.stringify({ modo: "analisi", piva: ANA.piva, nome: ANA.nome })
  });
  var j = null; try { j = await r.json(); } catch (e) { }
  if (r.status === 501) throw new Error("la chiave OpenAI non è configurata su Supabase");
  if (!r.ok) throw new Error((j && j.errore) || "il server ha risposto " + r.status);
  return j;
}
function analisiDi(cid) {
  return D.ana.filter(function (a) { return a.cliente_id === cid; })
    .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })[0] || null;
}
function vAnalisi() {
  var h = crumbs([[gruppoDi("amm") || "Clienti"], ["Amministrazione", "amm"], ["Analisi cliente"]]);
  h += '<div class="top"><h1>Analisi cliente<span class="sub">Quello che di un\'azienda è pubblico online</span></h1></div>';

  h += '<div class="card"><div class="grid g32"><div>';
  h += '<div class="grid g2">' +
    '<div class="field"><label>Cliente in anagrafica</label><select data-ana="cliente_id"><option value="">— scrivo io la partita IVA —</option>' +
    fcli().map(function (c) { return '<option value="' + c.id + '"' + (ANA.cliente_id === c.id ? " selected" : "") + ">" + esc(c.nome) + "</option>"; }).join("") + "</select></div>" +
    '<div class="field"><label>Partita IVA</label><input type="text" data-ana="piva" value="' + esc(ANA.piva) + '" placeholder="02812740237"></div>' +
    "</div>";
  h += '<div class="field"><label>Nome o ragione sociale</label><input type="text" data-ana="nome" value="' + esc(ANA.nome) + '" placeholder="Carboni ADV Srl"></div>';
  h += '<div style="display:flex;gap:12px;align-items:center;margin-top:6px">' +
    '<button class="btn" data-anacerca="1"' + (ANA.busy ? " disabled" : "") + ">" + (ANA.busy ? "Sto cercando…" : "Cerca online") + "</button>" +
    '<span class="faint">Una ricerca costa qualche centesimo e ci mette una ventina di secondi.</span></div>';
  h += "</div><div>";
  h += '<div class="avviso"><span class="avico">!</span><span class="avtxt"><b>Non sono visure.</b> Qui esce quello che è pubblico sul web: siti, notizie, elenchi. ' +
    "Bilanci, soci e protesti stanno sul Registro Imprese e sono a pagamento. Prima di usare questi dati per decidere, controllali alla fonte.</span></div>";
  h += "</div></div></div>";

  if (ANA.err) h += '<div class="card"><h2>Non ce l\'ho fatta</h2><p class="muted" style="margin-top:8px">' + esc(ANA.err) + "</p></div>";

  var a = ANA.cliente_id ? analisiDi(ANA.cliente_id) : (D.ana.slice().sort(function (x, y) { return x.created_at < y.created_at ? 1 : -1; })[0] || null);
  if (a) h += schedaAnalisi(a);
  else if (!ANA.busy && !ANA.err) h += '<div class="card">' + vuoto("Nessuna analisi ancora. Scegli un cliente o scrivi una partita IVA, poi premi «Cerca online».") + "</div>";
  return h;
}
function schedaAnalisi(a) {
  var d = a.dati || {};
  if (typeof d === "string") { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  var h = '<div class="card"><div class="cardhead"><h2>' + esc(d.ragione_sociale || a.nome || "Scheda") + "</h2>" +
    '<span class="faint">cercata il ' + dt(a.created_at) + '</span><button class="lnk" data-anaelimina="' + a.id + '">elimina</button></div>';
  if (!d.trovata) {
    h += '<p class="faint">Non è stato trovato niente di attendibile su questa partita IVA. Meglio così che una scheda sbagliata.</p></div>';
    return h;
  }
  h += '<p style="margin-bottom:16px">' + esc(d.sintesi || "") + "</p>";
  h += '<table class="dtot" style="margin:0 0 16px"><tbody>' +
    (d.forma ? row2("Forma", esc(d.forma)) : "") +
    (d.stato ? row2("Stato", esc(d.stato)) : "") +
    (d.sede ? row2("Sede", esc(d.sede)) : "") +
    (d.attivita ? row2("Attività", esc(d.attivita)) : "") +
    (d.dimensione ? row2("Dimensione", esc(d.dimensione)) : "") +
    (d.sito ? row2("Sito", '<a href="' + esc(d.sito) + '" target="_blank" rel="noopener noreferrer">' + esc(d.sito) + "</a>") : "") +
    ((d.contatti || []).length ? row2("Contatti", esc(d.contatti.join(" · "))) : "") +
    "</tbody></table>";
  if ((d.segnali || []).length) {
    h += '<div class="cardhead" style="margin-top:6px"><h2>Da guardare</h2></div>';
    h += (d.segnali || []).map(function (s) {
      return '<div class="propr"><span class="propi" style="background:' + (s.tipo === "buono" ? "var(--green-soft);color:var(--green)" : "var(--amber-soft);color:var(--amber)") + '">' +
        (s.tipo === "buono" ? "+" : "!") + '</span><span class="propt"><b>' + esc(s.cosa) + "</b>" +
        (s.url ? '<a class="faint" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(dominioDi(s.url) || s.url) + "</a>" : "") + "</span></div>";
    }).join("");
  }
  if ((d.notizie || []).length) {
    h += '<div class="cardhead" style="margin-top:18px"><h2>Notizie e articoli</h2></div><table><tbody>' +
      d.notizie.map(function (n) {
        return "<tr><td><a href=\"" + esc(n.url) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(n.titolo) + "</b></a>" +
          '<div class="faint">' + esc(n.cosa || "") + "</div></td><td class=\"faint num\">" + esc(n.quando || "") + "</td></tr>";
      }).join("") + "</tbody></table>";
  }
  if ((d.fonti || []).length) {
    h += '<div class="cardhead" style="margin-top:18px"><h2>Da dove viene</h2></div><ul class="fontil">' +
      d.fonti.map(function (f) {
        return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.titolo || f.url) + "</a> <span class=\"faint\">" + esc(dominioDi(f.url) || "") + "</span></li>";
      }).join("") + "</ul>";
  }
  return h + "</div>";
}
/* ---------------- sistema ----------------
   Il quadro tecnico per chi tiene in piedi la baracca: quanto pesa ogni cosa,
   cosa si è rotto, quanto è costata l'AI, e i controlli di integrità. Lo vede
   solo chi cura gli accessi. */
var DIAG = null, DIAGERR = "";
function puoSistema() { return me.ruolo === "admin" || (me.perm && me.perm.accessi); }
function peso(b) {
  var n = +b || 0;
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(0) + " kB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}
/* quello che si rompe nel browser finisce in un registro, così lo vedi */
var ULTERR = "";
async function segnaErrore(msg, dett) {
  try {
    var chiave = String(msg).slice(0, 120);
    if (chiave === ULTERR) return;
    ULTERR = chiave;
    if (!sb || !user) return;
    await sb.from("errori").insert({
      pagina: location.hash || "/", messaggio: String(msg).slice(0, 500),
      dettaglio: String(dett || "").slice(0, 2000),
      agente: navigator.userAgent.slice(0, 200), versione: APPVER
    });
  } catch (e) { }
}
async function caricaDiagnostica() {
  DIAG = null; DIAGERR = "";
  var r = await sb.rpc("diagnostica");
  if (r.error) { DIAGERR = r.error.message; return; }
  DIAG = r.data || null;
}
function vSistema() {
  if (!puoSistema()) return '<div class="card"><h2>Non è roba tua</h2><p class="muted" style="margin-top:8px">Questa parte la vede solo chi cura gli accessi dello studio.</p></div>';
  var h = crumbs([["Profilo"], ["Sistema"]]);
  h += '<div class="top"><h1>Sistema<span class="sub">Come sta il CRM, pezzo per pezzo</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-diagpulisci="1">Svuota il registro errori</button>' +
    '<button class="btn sm" data-diag="1">Ricontrolla adesso</button></div></div>';

  if (DIAGERR) return h + '<div class="card"><h2>Non riesco a leggere</h2><p class="muted" style="margin-top:8px">' + esc(DIAGERR) + "</p></div>";
  if (!DIAG) return h + '<div class="card"><p class="faint">Premi «Ricontrolla adesso» per leggere lo stato del sistema.</p></div>';

  var d = DIAG;
  var rotti = (d.integrita || []).filter(function (x) { return +x.quanti > 0; });
  var senzaRls = (d.rls || []).filter(function (x) { return !x.attiva || !+x.regole; });

  h += '<div class="grid g4">' +
    kpi(peso(d.database && d.database.peso), "Database", "di cui dati tuoi " + peso((d.tabelle || []).reduce(function (n, t) { return n + (+t.peso || 0); }, 0)) + " · il resto è il motore PostgreSQL") +
    kpi(peso(d.archivio && d.archivio.peso), "Archivio file", ((d.archivio && d.archivio.file) || 0) + " file") +
    kpi(String(d.errori_totali || 0), "Errori registrati", (d.errori || []).length ? "ultimo " + dshort((d.errori[0] || {}).created_at) : "nessuno") +
    kpi(String((d.ai && d.ai.chiamate) || 0), "Chiamate AI", ((d.ai && d.ai.ultimi7) || 0) + " negli ultimi 7 giorni") +
    "</div>";

  h += '<div class="grid g32" style="margin-top:18px"><div>';

  h += '<div class="card"><div class="cardhead"><h2>Controlli di integrità</h2>' +
    (rotti.length ? '<span class="badge b-red">' + rotti.length + " da guardare</span>" : '<span class="badge b-green">tutto a posto</span>') + "</div>";
  h += '<table><tbody>' + (d.integrita || []).map(function (x) {
    var n = +x.quanti;
    return "<tr><td>" + esc(x.controllo) + '</td><td class="num"><span class="badge ' + (n ? "b-red" : "b-green") + '">' + n + "</span></td></tr>";
  }).join("") + "</tbody></table></div>";

  h += '<div class="card"><div class="cardhead"><h2>Peso delle tabelle</h2><span class="faint">' + (d.tabelle || []).length + " tabelle</span></div>";
  h += '<table><thead><tr><th>Tabella</th><th class="num">Righe</th><th class="num">Peso</th></tr></thead><tbody>' +
    (d.tabelle || []).map(function (t) {
      return "<tr><td>" + esc(t.nome) + '</td><td class="num">' + t.righe + '</td><td class="num">' + peso(t.peso) + "</td></tr>";
    }).join("") + "</tbody></table></div>";

  h += '<div class="card"><div class="cardhead"><h2>Errori dell\'applicazione</h2>' +
    ((d.errori || []).length ? '<span class="badge b-amber">ultimi ' + d.errori.length + "</span>" : "") + "</div>";
  h += (d.errori || []).length
    ? '<table><thead><tr><th>Quando</th><th>Dove</th><th>Cosa</th><th>Versione</th></tr></thead><tbody>' +
      d.errori.map(function (e) {
        return "<tr><td class=\"faint\">" + dshort(e.created_at) + "</td><td class=\"faint\">" + esc(e.pagina || "—") + "</td><td>" + esc(e.messaggio) + "</td><td class=\"faint\">" + esc(e.versione || "—") + "</td></tr>";
      }).join("") + "</tbody></table>"
    : '<p class="faint">Nessun errore registrato. Da quando c\'è questo registro, niente si è rotto.</p>';
  h += "</div>";

  h += "</div><div>";

  h += '<div class="card"><div class="cardhead"><h2>Chi vede cosa</h2>' +
    (senzaRls.length ? '<span class="badge b-red">' + senzaRls.length + " senza protezione</span>" : '<span class="badge b-green">tutte protette</span>') + "</div>";
  h += '<table><tbody>' + (d.rls || []).map(function (r) {
    return "<tr><td>" + esc(r.tabella) + '</td><td class="num"><span class="badge ' + (r.attiva && +r.regole ? "b-green" : "b-red") + '">' + (r.attiva ? r.regole + (+r.regole === 1 ? " regola" : " regole") : "aperta") + "</span></td></tr>";
  }).join("") + "</tbody></table>" +
    '<p class="faint" style="margin-top:10px">Ogni tabella deve avere la sicurezza accesa e almeno una regola: senza, i dati sarebbero leggibili da chiunque abbia la chiave pubblica.</p></div>';

  var ai = d.ai || {};
  h += '<div class="card"><div class="cardhead"><h2>Consumi AI</h2></div>';
  h += '<table class="dtot" style="margin:0"><tbody>' +
    row2("Chiamate", (ai.chiamate || 0) + " (" + (ai.ok || 0) + " riuscite)") +
    row2("Token in ingresso", num(ai.token_in || 0, 0)) +
    row2("Token in uscita", num(ai.token_out || 0, 0)) +
    row2("Tempo medio", Math.round((ai.ms_medi || 0) / 100) / 10 + " s") +
    "</tbody></table>";
  h += (d.ai_ultime || []).length
    ? '<table style="margin-top:14px"><thead><tr><th>Quando</th><th>Cosa</th><th>Esito</th><th class="num">Token</th></tr></thead><tbody>' +
      d.ai_ultime.map(function (a) {
        return "<tr><td class=\"faint\">" + dshort(a.created_at) + "</td><td>" + esc(a.funzione) + '<div class="faint">' + esc(a.dettaglio || "") + "</div></td>" +
          '<td><span class="badge ' + (a.esito === "ok" ? "b-green" : "b-red") + '">' + esc(a.esito || "") + '</span></td><td class="num">' + ((+a.token_in || 0) + (+a.token_out || 0)) + "</td></tr>";
      }).join("") + "</tbody></table>"
    : '<p class="faint" style="margin-top:10px">Nessuna chiamata registrata.</p>';
  h += "</div>";

  h += '<div class="card"><div class="cardhead"><h2>Questa installazione</h2></div><table class="dtot" style="margin:0"><tbody>' +
    row2("Versione applicazione", esc(APPVER)) +
    row2("Indirizzo", esc(location.host)) +
    row2("Progetto Supabase", esc(String(cfg.SUPABASE_URL || "").replace(/^https?:\/\//, "").split(".")[0])) +
    row2("Membri", ((d.utenti || {}).membri || 0) + " (" + ((d.utenti || {}).auth || 0) + " account)") +
    row2("Letto il", dt(d.quando) + " alle " + String(d.quando || "").slice(11, 16)) +
    "</tbody></table>" +
    '<p class="faint" style="margin-top:10px">I dati stanno su Supabase in Europa. Le copie di sicurezza le fa Supabase in automatico.</p></div>';

  h += "</div></div>";
  return h;
}
/* ---------------- prospetti da dare al cliente ----------------
   Due fogli: quante ore ci sono andate, e a che punto siamo. Si stampano, si
   scaricano in Excel, e con un interruttore si fanno vedere nel portale. */
function scarica(nome, testo, tipo) {
  var b = new Blob(["\ufeff" + testo], { type: (tipo || "text/csv") + ";charset=utf-8" });
  var u = URL.createObjectURL(b), a = document.createElement("a");
  a.href = u; a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 400);
}
/* Excel italiano vuole il punto e virgola, e la virgola nei decimali */
function csv(righe) {
  return righe.map(function (r) {
    return r.map(function (c) {
      var s = c == null ? "" : String(c);
      if (typeof c === "number") s = String(c).replace(".", ",");
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(";");
  }).join("\r\n");
}
function oreDi(kid, da, al) {
  return D.ore.filter(function (o) {
    return o.commessa_id === kid && (!da || o.data >= da) && (!al || o.data <= al);
  }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
}
var PRO_DA = "", PRO_AL = "", PRO_DETT = true;
function vProspetto() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Preventivo non trovato. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  var t = tab || "ore", em = emittente(k), cl = by(D.cli, k.cliente_id) || {};
  var h = crumbs([["Clienti"], ["Preventivi", "commesse"], [k.titolo, "commessa", k.id, "servizi"], ["Prospetto"]]);

  h += '<div class="docbar noprint"><div class="dbleft">' +
    '<div class="seg2">' +
    '<button class="' + (t === "ore" ? "on" : "") + '" data-route="prospetto|' + k.id + '|ore">Ore</button>' +
    '<button class="' + (t === "stato" ? "on" : "") + '" data-route="prospetto|' + k.id + '|stato">Stato lavori</button></div>' +
    (t === "ore"
      ? '<label class="chk"><input type="checkbox" data-qset="com|mostra_ore|' + k.id + '" value="si"' + (k.mostra_ore ? " checked" : "") + "> visibile al cliente</label>"
      : '<label class="chk"><input type="checkbox" data-qset="com|mostra_stato|' + k.id + '" value="si"' + (k.mostra_stato ? " checked" : "") + "> visibile al cliente</label>") +
    "</div>" +
    '<div class="dbright"><button class="btn sm ghost" data-route="commessa|' + k.id + '|servizi">Torna al preventivo</button>' +
    '<button class="btn sm ghost" data-proscarica="' + t + "|" + k.id + '">Scarica per Excel</button>' +
    '<button class="btn sm" data-stampa="1">Stampa / PDF</button></div></div>';

  if (t === "ore") {
    h += '<div class="prfiltri noprint"><label>Dal <input type="date" data-profil="da" value="' + esc(PRO_DA) + '"></label>' +
      '<label>Al <input type="date" data-profil="al" value="' + esc(PRO_AL) + '"></label>' +
      '<label class="chk"><input type="checkbox" data-profil="dett"' + (PRO_DETT ? " checked" : "") + "> mostra il dettaglio giorno per giorno</label></div>";
  }

  h += '<div class="a4">' + prospettoTesta(k, em, cl, t === "ore" ? "Riepilogo ore" : "Stato lavori");
  h += t === "ore" ? prospettoOre(k) : prospettoStato(k);
  h += '<p class="dpie">' + (t === "ore"
    ? "Le ore sono quelle registrate nel gestionale di " + esc(em.nome || "Giraffa Studio") + " al " + dt(today()) + "."
    : "Fotografia al " + dt(today()) + ". Gli importi sono quelli concordati, IVA esclusa.") + "</p>";
  h += "</div>";
  return h;
}
function prospettoTesta(k, em, cl, titolo) {
  return '<div class="dtop">' +
    '<div class="dmitt"><i class="mark"></i><div><b>' + esc(em.nome || "—") + "</b>" +
    (em.indirizzo ? "<span>" + esc(em.indirizzo) + "</span>" : "") +
    (em.piva ? "<span>P. IVA " + esc(em.piva) + "</span>" : "") +
    (em.email ? "<span>" + esc(em.email) + "</span>" : "") + "</div></div>" +
    '<div class="ddoc"><h2>' + esc(titolo) + "</h2><table><tbody>" +
    "<tr><td>Cliente</td><td>" + esc(cl.nome || "—") + "</td></tr>" +
    "<tr><td>Lavoro</td><td>" + esc(k.titolo || "—") + "</td></tr>" +
    "<tr><td>Al</td><td>" + dt(today()) + "</td></tr></tbody></table></div></div>" +
    '<h1 class="dtit">' + esc(k.titolo || "—") + "</h1>";
}
function prospettoOre(k) {
  var list = oreDi(k.id, PRO_DA, PRO_AL);
  if (!list.length) return '<p class="dpre">Nessuna ora registrata' + (PRO_DA || PRO_AL ? " nel periodo scelto" : "") + ".</p>";
  var tot = sum(list, function (o) { return +o.ore || 0; });
  var perProg = {}, perPro = {};
  list.forEach(function (o) {
    var pk = o.progetto_id || "-", nk = o.pro_id || "-";
    perProg[pk] = (perProg[pk] || 0) + (+o.ore || 0);
    perPro[nk] = (perPro[nk] || 0) + (+o.ore || 0);
  });
  var h = '<div class="dsez"><div class="dsh"><b>Per area di lavoro</b><span class="faint">' + num(tot, 1) + " ore in tutto</span></div>" +
    '<table class="dtab"><tbody>' + Object.keys(perProg).map(function (pk) {
      return "<tr><td>" + esc(pk === "-" ? "Non assegnate a un progetto" : nameOf(D.prog, pk)) + '</td><td class="num">' + num(perProg[pk], 1) + " h</td>" +
        '<td class="num">' + Math.round(perProg[pk] / tot * 100) + " %</td></tr>";
    }).join("") + "</tbody></table></div>";
  if (Object.keys(perPro).length > 1) {
    h += '<div class="dsez"><div class="dsh"><b>Per persona</b></div><table class="dtab"><tbody>' +
      Object.keys(perPro).map(function (nk) {
        return "<tr><td>" + esc(nk === "-" ? "—" : nameOf(D.pros, nk)) + '</td><td class="num">' + num(perPro[nk], 1) + " h</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  if (PRO_DETT) {
    h += '<div class="dsez"><div class="dsh"><b>Giorno per giorno</b></div>' +
      '<table class="dtab"><thead><tr><th>Data</th><th>Chi</th><th>Cosa</th><th class="num">Ore</th></tr></thead><tbody>' +
      list.map(function (o) {
        return "<tr><td>" + dt(o.data) + "</td><td>" + esc(nameOf(D.pros, o.pro_id)) + "</td><td>" + esc(o.descrizione || "—") + '</td><td class="num">' + num(o.ore, 1) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  h += '<table class="dtot"><tbody>' + row2('<b class="big">Totale ore</b>', '<b class="big">' + num(tot, 1) + "</b>") + "</tbody></table>";
  return h;
}
function prospettoStato(k) {
  var c = calc(k), fs = fasiOf(k.id), pg = pagOf(k.id), pgt = progOf(k.id);
  var h = '<div class="dpre">' + esc(k.note || "") + "</div>";
  h += '<div class="dsez"><div class="dsh"><b>A che punto siamo</b><span class="faint">' + (avanzamento(k.id) || 0) + " % complessivo</span></div>";
  h += pgt.length
    ? '<table class="dtab"><thead><tr><th>Area</th><th>Stato</th><th class="num">Avanzamento</th></tr></thead><tbody>' +
      pgt.map(function (p) {
        return "<tr><td>" + esc(p.nome) + "</td><td>" + esc(p.stato || "—") + '</td><td class="num">' + (p.avanzamento == null ? "—" : p.avanzamento + " %") + "</td></tr>";
      }).join("") + "</tbody></table>"
    : fs.length
      ? '<table class="dtab"><tbody>' + fs.map(function (f) {
        return "<tr><td>" + esc(f.nome) + "</td><td>" + esc(f.stato || "") + '</td><td class="num">' + (f.avanzamento || 0) + " %</td></tr>";
      }).join("") + "</tbody></table>"
      : '<p class="dnota">Nessuna fase o area definita.</p>';
  h += "</div>";
  if (pg.length) {
    var inc = sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return +p.importo || 0; });
    h += '<div class="dsez"><div class="dsh"><b>Pagamenti</b></div><table class="dtab"><thead><tr><th>Voce</th><th>Scadenza</th><th class="num">Importo</th><th>Stato</th></tr></thead><tbody>' +
      pg.map(function (p) {
        return "<tr><td>" + esc(p.nome) + "</td><td>" + (p.scadenza ? dt(p.scadenza) : "—") + '</td><td class="num">' + eur(p.importo) + "</td><td>" + esc(p.stato || "") + "</td></tr>";
      }).join("") + "</tbody></table>" +
      '<table class="dtot"><tbody>' + row2("Incassato", eur(inc)) + row2("Ancora da incassare", eur(c.tot - inc)) + "</tbody></table></div>";
  }
  h += '<table class="dtot"><tbody>' + row2('<b class="big">Valore concordato</b>', '<b class="big">' + eur(c.tot) + "</b>") + "</tbody></table>";
  return h;
}
function scaricaProspetto(tipo, kid) {
  var k = by(D.com, kid); if (!k) return;
  var cl = by(D.cli, k.cliente_id) || {}, righe = [];
  var base = String(k.titolo || "prospetto").replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
  if (tipo === "ore") {
    var list = oreDi(k.id, PRO_DA, PRO_AL);
    righe.push(["Riepilogo ore"], [cl.nome || "", k.titolo || ""], []);
    righe.push(["Data", "Chi", "Progetto", "Cosa", "Ore"]);
    list.forEach(function (o) {
      righe.push([o.data, nameOf(D.pros, o.pro_id), o.progetto_id ? nameOf(D.prog, o.progetto_id) : "", o.descrizione || "", +o.ore || 0]);
    });
    righe.push([], ["", "", "", "Totale", sum(list, function (o) { return +o.ore || 0; })]);
    scarica("ore-" + base + ".csv", csv(righe));
    return;
  }
  var c = calc(k);
  righe.push(["Stato lavori"], [cl.nome || "", k.titolo || ""], []);
  righe.push(["Area", "Stato", "Avanzamento %"]);
  progOf(k.id).forEach(function (p) { righe.push([p.nome, p.stato || "", p.avanzamento == null ? "" : +p.avanzamento]); });
  righe.push([], ["Voce", "Scadenza", "Importo", "Stato"]);
  pagOf(k.id).forEach(function (p) { righe.push([p.nome, p.scadenza || "", +p.importo || 0, p.stato || ""]); });
  righe.push([], ["Valore concordato", "", c.tot]);
  scarica("stato-" + base + ".csv", csv(righe));
}
function docHead(k, titolo) {
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start"><i class="mark" style="height:52px"></i><div style="text-align:right"><h2>' + titolo + '</h2><div class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + dt(today()) + "</div></div></div>";
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
    var nuovo = !r.id;
    return fld("titolo", "Titolo", "text", r.titolo, true) +
      '<div class="row2">' + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) +
      (nuovo ? fld("nuovo_cliente", "Oppure un cliente nuovo: scrivi il nome", "text", "") : selField("stato", "Stato", sel(STATI, r.stato || "Bozza"))) + "</div>" +
      '<div class="row2">' + selField("ambito", "A nome di chi esce", selKV([["personale", "Tuo — con la tua partita IVA, serie P/anno"], ["studio", "Dello studio — a nome Giraffa Studio, serie S/anno"]], r.ambito === "studio" ? "studio" : "personale")) +
      selField("owner_id", "Chi lo segue", opt(D.pros, r.owner_id || me.pro_id)) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("scadenza", "Consegna prevista", "date", r.scadenza) + "</div>" +
      '<details class="fmore"' + (nuovo ? "" : " open") + "><summary>Altro: chi coordina, IVA, sconto, validità, condizioni, note</summary>" +
      '<div class="row2">' + selField("pm_id", "Chi coordina (se non sei tu)", opt(D.pros, r.pm_id)) + selField("pr_id", "Chi ha portato il cliente", opt(D.pros, r.pr_id)) + "</div>" +
      '<div class="row2">' + selField("tipo_prezzo", "Come si paga il lavoro", selKV([["Fisso", "Prezzo fisso"], ["Tempo e materiali", "A ore e spese"], ["Retainer", "Canone mensile"]], r.tipo_prezzo || "Fisso")) + fld("budget_importo", "Budget concordato (€)", "number", r.budget_importo) + "</div>" +
      '<div class="row2">' + fld("retainer_mensile", "Canone mensile (€, se ricorrente)", "number", r.retainer_mensile) + fld("budget_ore", "Ore previste in tutto", "number", r.budget_ore) + "</div>" +
      '<div class="row2">' + fld("sconto", "Sconto commerciale (%)", "number", r.sconto || 0) + fld("iva", "IVA (%)", "number", r.iva == null ? 22 : r.iva) + "</div>" +
      '<div class="row2">' + fld("validita", "Validità del preventivo (giorni)", "number", r.validita == null ? 30 : r.validita) + fld("probabilita", "Quante probabilità che si chiuda (%)", "number", r.probabilita == null ? 50 : r.probabilita) + "</div>" +
      fld("condizioni", "Condizioni e tempi (compaiono sul foglio)", "textarea", r.condizioni) +
      fld("note", "Note interne", "textarea", r.note) + "</details>";
  }},
  riu: { t: "Riunione", tb: "riu", f: function (r) {
    var part = r.partecipanti || [];
    return fld("titolo", "Di cosa si parla", "text", r.titolo, true) +
      '<div class="row2">' + selField("tipo", "Come", sel(["Videocall", "In presenza", "Telefonata"], r.tipo || "Videocall")) + fld("data", "Giorno", "date", r.data || today(), true) + "</div>" +
      '<div class="row2">' + fld("ora", "Dalle", "time", r.ora) + fld("fine", "Alle", "time", r.fine) + "</div>" +
      '<div class="row2">' + fld("link", "Link della videocall (Meet, Zoom, Teams…)", "text", r.link) + fld("luogo", "Dove, se di persona", "text", r.luogo) + "</div>" +
      '<div class="row2">' + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + "</div>" +
      selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progVisibili().map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + " · " + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</option>"; }).join("")) +
      '<div class="field"><label>Colleghi che partecipano</label><div class="chks">' + D.pros.filter(function (p) { return p.id !== me.pro_id; }).map(function (p) {
        return '<label class="chk"><input type="checkbox" name="part_' + p.id + '" value="1"' + (part.indexOf(p.id) > -1 ? " checked" : "") + "> " + esc(p.nome) + "</label>";
      }).join("") + "</div></div>" +
      fld("esterni", "Chi c'è dall'esterno (nomi, email)", "text", r.esterni) +
      fld("ordine_giorno", "Ordine del giorno", "textarea", r.ordine_giorno);
  }},
  ag: { t: "Evento", tb: "ag", f: function (r) {
    return fld("titolo", "Cosa succede", "text", r.titolo, true) +
      '<div class="row2">' + selField("tipo", "Che cosa è", sel(["Evento", "Workshop", "Riunione", "Formazione", "Aperitivo"], r.tipo || "Evento")) + fld("data", "Giorno", "date", r.data || today(), true) + "</div>" +
      '<div class="row2">' + fld("ora", "Dalle", "time", r.ora) + fld("fine", "Alle", "time", r.fine) + "</div>" +
      '<div class="row2">' + fld("luogo", "Dove (indirizzo o stanza)", "text", r.luogo) + selField("spazio_id", "Oppure uno spazio dello studio", opt(D.spazi, r.spazio_id)) + "</div>" +
      '<div class="row2">' + selField("relatore_id", "Chi lo tiene", opt(PROS_PRO(), r.relatore_id)) + fld("posti", "Posti (vuoto = illimitati)", "number", r.posti) + "</div>" +
      fld("costo", "Costo a persona (€, vuoto = gratis)", "number", r.costo) +
      fld("descrizione", "Di cosa si tratta", "textarea", r.descrizione);
  }},
  can: { t: "Canale", tb: "can", f: function (r) {
    return fld("nome", "Nome del canale (senza cancelletto)", "text", r.nome, true) +
      fld("descrizione", "Di cosa si parla qui", "text", r.descrizione) +
      fld("ordine", "Posizione nell elenco", "number", r.ordine == null ? 100 : r.ordine);
  }},
  prof: { t: "Figura professionale", tb: "prof", f: function (r) {
    return fld("nome", "Come si chiama il mestiere", "text", r.nome, true) +
      '<div class="row2">' + fld("categoria", "Famiglia (Design, Diritto, Artigianato…)", "text", r.categoria, true) + fld("unita", "Unità naturale (progetto, ora, pezzo…)", "text", r.unita || "progetto") + "</div>" +
      selField("misura", "Come vende il lavoro", selKV([["ore", "A ore"], ["progetto", "A progetto"], ["quantita", "A quantità"], ["ricorrente", "A canone"]], r.misura || "progetto")) +
      '<div class="field"><label>Attività tipo, una per riga</label><textarea name="attivita_txt" rows="6" placeholder="Sopralluogo : 4&#10;Esecuzione : 20&#10;Consegna : 2">' + esc(attivitaTxt(r.attivita)) + "</textarea></div>" +
      fld("descrizione", "In una riga, cosa fa", "text", r.descrizione);
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
      '<div class="row2">' + fld("piva", "P. IVA", "text", r.piva) + selField("owner_id", "Chi lo segue", opt(D.pros, r.owner_id || me.pro_id)) + "</div>" +
      fld("indirizzo", "Indirizzo", "text", r.indirizzo) + fld("note", "Note", "textarea", r.note);
  }},
  pros: { t: "Professionista", tb: "pros", priv: ["tariffa_oraria", "note", "iban", "condizioni"], f: function (r) {
    var mio = r.id === me.pro_id || !r.id;
    return '<div class="fgroup"><h3>Scheda visibile ai colleghi</h3>' +
      fld("nome", "Nome", "text", r.nome, true) +
      '<div class="row2">' + fld("ruolo", "Cosa fai (es. Fotografo, Sviluppatore)", "text", r.ruolo) + selField("vetting", "Stato", sel(["In valutazione", "Attivo", "Sospeso"], r.vetting || "In valutazione")) + "</div>" +
      '<div class="field"><label>Figura professionale</label><select name="professione_id">' + optProf(r.professione_id) + '</select><p class="faint" style="margin-top:6px">Da qui il gestionale capisce come lavori: l\'unità con cui vendi, le voci tipiche del tuo listino e le attività che nascono quando un preventivo viene accettato. Se il tuo mestiere non c\'è, si aggiunge al catalogo.</p></div>' +
      fld("competenze", "Competenze (separate da virgola)", "text", r.competenze) +
      '<div class="row2">' + fld("email", "Email", "email", r.email) + fld("telefono", "Telefono", "text", r.telefono) + "</div>" +
      '<div class="row2">' + fld("citta", "Città", "text", r.citta) + fld("piva", "P. IVA", "text", r.piva) + "</div></div>" +
      (mio ? '<div class="fgroup"><h3>Come esci sui tuoi preventivi</h3>' +
        '<p class="faint" style="margin-bottom:12px">Questi dati finiscono in testa ai preventivi personali, quelli che porti avanti da solo.</p>' +
        '<div class="row2">' + fld("indirizzo", "Indirizzo (via, città)", "text", r.indirizzo) + fld("sito", "Sito", "text", r.sito) + "</div>" +
        fld("iban", "IBAN", "text", r.iban) +
        fld("condizioni", "Le tue condizioni standard", "textarea", r.condizioni) + "</div>" : "") +
      (mio ? '<div class="fgroup priv"><h3>Solo tuo <span class="badge">privato</span></h3>' +
        '<p class="faint" style="margin-bottom:12px">Questi campi stanno in una tabella che risponde solo a te: nessun collega può leggerli, nemmeno interrogando il sistema.</p>' +
        fld("tariffa_oraria", "Tariffa oraria (€)", "number", r.tariffa_oraria) +
        fld("note", "Note personali", "textarea", r.note) + "</div>" : "");
  }},
  serv: { t: "Servizio", tb: "serv", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      selField("pro_id", "Professionista", opt(PROS_PRO(), r.pro_id || me.pro_id)) +
      '<div class="field"><label>Figura professionale</label><select name="professione_id">' + optProf(r.professione_id || (miaFigura() || {}).id) + "</select></div>" +
      '<div class="field"><label>Attività tipo, una per riga</label><textarea name="attivita_txt" rows="5" placeholder="Sopralluogo : 4&#10;Shooting : 8&#10;Post produzione : 10">' + esc(attivitaTxt(r.attivita)) + '</textarea><p class="faint" style="margin-top:6px">Quando un preventivo con questa voce viene accettato, da qui nascono le attività. Le ore dopo i due punti sono la stima. Se lasci vuoto valgono quelle della figura professionale.</p></div>' +
      '<div class="row2">' + fld("cat", "Categoria (Foto, Web, Social…)", "text", r.cat) + selField("tipo_unita", "Si vende a", sel(["Forfait", "Giornata", "Mezza giornata", "Ora", "Mese", "Anno", "A consumo"], r.tipo_unita || "Forfait")) + "</div>" +
      '<div class="row2">' + fld("unita", "Come si chiama l unità (progetto, shooting, mese…)", "text", r.unita) + fld("min_qty", "Quantità minima", "number", r.min_qty == null ? 1 : r.min_qty) + "</div>" +
      '<div class="row2">' + selField("ricorrente", "Ricorrente", sel(["no", "si"], r.ricorrente ? "si" : "no")) + selField("periodo", "Periodo", sel(["Mensile", "Annuale"], r.periodo || "Mensile")) + "</div>" +
      '<div class="row2">' + fld("costo", "Compenso al professionista (€)", "number", r.costo) + fld("prezzo", "Prezzo al cliente (€)", "number", r.prezzo) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione);
  }},
  prog: { t: "Progetto", tb: "prog", f: function (r) {
    return fld("nome", "Nome del progetto (Sito, Foto, Social…)", "text", r.nome, true) +
      '<div class="row2">' + selField("cliente_id", "Cliente", opt(D.cli, r.cliente_id)) +
      selField("commessa_id", "Preventivo, se nasce da uno", opt(D.com, r.commessa_id, "titolo")) + "</div>" +
      '<p class="faint" style="margin:-6px 0 12px;font-size:12.5px">Un progetto può stare su un preventivo, su un cliente, o su nessuno dei due: in quel caso è lavoro dello studio. Se scegli un preventivo, il cliente lo prende da lì.</p>' +
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
    var aperte = D.task.filter(function (t) { return t.stato !== "Fatto" && (!r.progetto_id || t.progetto_id === r.progetto_id) && (!r.commessa_id || t.commessa_id === r.commessa_id); });
    return '<div class="row2">' + selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + progVisibili().map(function (p) {
      return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + " · " + esc(nameOf(D.com, p.commessa_id, "titolo")) + "</option>";
    }).join("")) + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + "</div>" +
      '<div class="row2">' + selField("task_id", "Attività (se vuoi)", '<option value="">— nessuna —</option>' + aperte.map(function (t) {
        return '<option value="' + t.id + '"' + (r.task_id === t.id ? " selected" : "") + ">" + esc(t.titolo) + "</option>";
      }).join("")) + selField("lavorazione_id", "Lavorazione (se vuoi)", '<option value="">— nessuna —</option>' + D.lav.filter(function (l) { return !r.progetto_id || l.progetto_id === r.progetto_id; }).map(function (l) {
        return '<option value="' + l.id + '"' + (r.lavorazione_id === l.id ? " selected" : "") + ">" + esc(nameOf(D.prog, l.progetto_id)) + " · " + esc(l.nome) + "</option>";
      }).join("")) + "</div>" +
      selField("pro_id", "Chi", opt(PROS_PRO(), r.pro_id || me.pro_id)) +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + fld("ore", "Ore", "number", r.ore) + "</div>" +
      '<div class="row2">' + fld("tariffa", "Tariffa oraria (€)", "number", r.tariffa == null ? (p ? p.tariffa_oraria : 0) : r.tariffa) + selField("fatturabile", "Fatturabile", sel(["si", "no"], r.fatturabile === false ? "no" : "si")) + "</div>" +
      fld("descrizione", "Descrizione", "text", r.descrizione);
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
  costi: { t: "Costo", tb: "costi", f: function (r) {
    return fld("nome", "Cosa (es. plugin, licenza, foto stock, budget Meta)", "text", r.nome, true) +
      '<div class="row2">' + selField("tipo", "Tipo", sel(TIPI_COSTO, r.tipo || "Strumento")) + fld("data", "Quando", "date", r.data || today()) + "</div>" +
      '<div class="row2">' + selField("commessa_id", "Preventivo", opt(D.com, r.commessa_id, "titolo")) + selField("progetto_id", "Progetto", opt(D.prog.filter(function (x) { return !r.commessa_id || x.commessa_id === r.commessa_id; }), r.progetto_id)) + "</div>" +
      '<div class="row2">' + fld("importo", "Importo (€)", "number", r.importo) + selField("ricorrente", "Si ripete", sel(["no", "si"], r.ricorrente ? "si" : "no")) + "</div>" +
      '<div class="row2">' + selField("periodo", "Periodo", sel(["Mensile", "Annuale"], r.periodo || "Mensile")) + fld("cicli", "Per quanti periodi", "number", r.cicli == null ? 1 : r.cicli) + "</div>" +
      '<div class="row2">' + selField("ribaltato", "Addebitato al cliente", sel(["no", "si"], r.ribaltato ? "si" : "no")) + selField("fornitore_id", "Fornitore", opt(D.forn, r.fornitore_id)) + "</div>" +
      fld("url", "Link (fattura, abbonamento, ricevuta)", "text", r.url) +
      fld("note", "Note", "text", r.note);
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
var RAPIDI = { ore: 1, pren: 1, ev: 1, inter: 1, mat: 1, appr: 1, costi: 1 };
/* Sezione di appartenenza di ogni modulo: serve per il percorso e per il ritorno */
var FSEZ = {
  com: ["commesse", "Preventivi"], cli: ["clienti", "Clienti"], pros: ["pool", "Professionisti"],
  serv: ["servizi", "I miei servizi"], prog: ["progetti", "Progetti"], lav: ["progetti", "Progetti"],
  forn: ["fornitori", "Fornitori"], spazi: ["spazi", "Coworking & spazi"],
  ag: ["eventi", "Eventi e workshop"], can: ["chat", "Chat dello studio"], prof: ["professioni", "Figure professionali"],
  membri: ["impostazioni", "Impostazioni"], fasi: ["commesse", "Preventivi"], pag: ["commesse", "Preventivi"], costi: ["commesse", "Preventivi"],
  vari: ["commesse", "Preventivi"], appr: ["commesse", "Preventivi"], righe: ["commesse", "Preventivi"],
  task: ["task", "Attività"], ore: ["ore", "Le tue ore"], inter: ["clienti", "Clienti"], modelli: ["task", "Attività"],
  mat: ["commesse", "Preventivi"], ev: ["commesse", "Preventivi"], pren: ["spazi", "Coworking & spazi"], riu: ["riunioni", "Riunioni"]
};
var FDETT = { com: ["commessa", "note"], cli: ["cliente", ""], prog: ["progetto", "lavorazioni"], lav: ["lavorazione", ""], pros: ["pro", ""], task: ["attivita", ""], riu: ["riunione", ""] };

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
  var BOOL = ["fatturabile", "visibile_cliente", "perm_spazi", "perm_studio", "perm_accessi", "ricorrente", "ribaltato"];
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
  if (entity === "task" && !id) obj.creato_da = me.pro_id;
  /* le caselle dei partecipanti diventano un elenco */
  if (entity === "riu") {
    var part = [];
    Object.keys(obj).forEach(function (c) { if (c.indexOf("part_") === 0) { var on = f.querySelector('[name="' + c + '"]'); if (on && on.checked) part.push(c.slice(5)); delete obj[c]; } });
    obj.partecipanti = part;
    if (!obj.pro_id) obj.pro_id = me.pro_id;
    if (obj.progetto_id && !obj.commessa_id) { var pgr = by(D.prog, obj.progetto_id); if (pgr) obj.commessa_id = pgr.commessa_id; }
    if (obj.commessa_id && !obj.cliente_id) { var kr = by(D.com, obj.commessa_id); if (kr) obj.cliente_id = kr.cliente_id; }
  }
  /* il cliente nuovo nasce sul posto, senza uscire dal modulo */
  if ("nuovo_cliente" in obj) {
    var nc = (obj.nuovo_cliente || "").trim(); delete obj.nuovo_cliente;
    if (nc && !obj.cliente_id) {
      var gia = D.cli.filter(function (c) { return (c.nome || "").toLowerCase() === nc.toLowerCase(); })[0];
      if (gia) obj.cliente_id = gia.id;
      else {
        var rc = await sb.from("clienti").insert({ nome: nc, stato: "Lead", owner_id: me.pro_id }).select().single();
        if (rc.error) { toast("Non riesco a creare il cliente: " + erroreUmano(rc.error), true); return; }
        await reload(["cli"]); obj.cliente_id = rc.data.id;
      }
    }
  }
  if (entity === "com" && !obj.cliente_id) { toast("Scegli un cliente, o scrivi il nome di uno nuovo.", true); return; }
  if (entity === "pren" && obj.spazio_id && obj.data) {
    var occupata = D.pren.filter(function (p) { return p.id !== id && p.spazio_id === obj.spazio_id && p.data === obj.data && p.stato !== "Annullata" && (p.slot === "Giornata" || obj.slot === "Giornata" || p.slot === obj.slot); })[0];
    if (occupata) { toast("«" + nameOf(D.spazi, obj.spazio_id) + "» è già prenotata quel giorno (" + esc(occupata.slot || "giornata") + ", " + nameOf(D.pros, occupata.pro_id) + "). Scegli un altro momento.", true); return; }
  }
  if (obj.task_id && !obj.progetto_id) { var tk0 = by(D.task, obj.task_id); if (tk0) { obj.progetto_id = tk0.progetto_id; if (!obj.commessa_id) obj.commessa_id = tk0.commessa_id; } }
  if (entity === "ev" && !obj.pro_id) obj.pro_id = me.pro_id;
  if (entity === "ag" && !obj.pro_id) obj.pro_id = me.pro_id;
  if (entity === "costi" && !obj.pro_id) obj.pro_id = me.pro_id;
  if ("attivita_txt" in obj) { obj.attivita = attivitaDaTxt(obj.attivita_txt); delete obj.attivita_txt; }
  /* Chi apre una lavorazione o un'attività sceglie il progetto, non il preventivo:
     il preventivo lo ricavo io risalendo la catena. Senza, il database rifiuta la
     riga perché non capisce a quale lavoro appartiene. */
  if (!obj.commessa_id && obj.lavorazione_id) {
    var lv0 = by(D.lav, obj.lavorazione_id);
    if (lv0) { obj.commessa_id = lv0.commessa_id; if (!obj.progetto_id) obj.progetto_id = lv0.progetto_id; }
  }
  if (!obj.commessa_id && obj.progetto_id) {
    var pg0 = by(D.prog, obj.progetto_id);
    if (pg0) obj.commessa_id = pg0.commessa_id;
  }
  if (!obj.commessa_id && obj.fase_id) {
    var fa0 = by(D.fasi, obj.fase_id);
    if (fa0) obj.commessa_id = fa0.commessa_id;
  }
  var inPagina = !!f.dataset.page;
  var btn = f.querySelector('button[type="submit"]'), lbl = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "Salvo…"; }
  var r = id ? await sb.from(TB[F.tb]).update(obj).eq(key, id).select().single() : await sb.from(TB[F.tb]).insert(obj).select().single();
  if (r.error) { if (btn) { btn.disabled = false; btn.textContent = lbl; } toast(erroreUmano(r.error), true); return; }
  var nid = (r.data && r.data[key]) || id;
  if (privati && Object.keys(privati).length && nid === me.pro_id) {
    privati.pro_id = nid; privati.aggiornato = new Date().toISOString();
    var rp = await sb.from("pro_privato").upsert(privati, { onConflict: "pro_id" });
    if (rp.error) toast("Scheda salvata, ma i dati personali no: " + erroreUmano(rp.error), true);
    else await reload(["priv"]);
  }
  if (obj.commessa_id && entity !== "ev") await logEv(obj.commessa_id, (id ? "Modificato" : "Aggiunto") + ": " + F.t.toLowerCase() + (obj.nome ? " — " + obj.nome : obj.titolo ? " — " + obj.titolo : ""));
  await reload([F.tb, "ev"]);
  closeModal(); toast(dettoFatto(F.t, !!id));
  if (inPagina) { FDIRTY = false; dopoSalva(entity, nid); return; }
  render();
}
function duplica(id) {
  var k = by(D.com, id); if (!k) return;
  modal('<form class="box" data-dupl-form="' + k.id + '"><h2>Duplica «' + esc(k.titolo) + '»</h2>' +
    '<p class="faint" style="margin:-6px 0 14px">Copio voci, progetti, testi, sezioni, IVA, sconto e validità. Le date ripartono da oggi.</p>' +
    fld("titolo", "Titolo del nuovo preventivo", "text", k.titolo + " (copia)", true) +
    selField("cliente_id", "Per quale cliente", opt(D.cli, k.cliente_id)) +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Crea la copia</button></div></form>');
}
async function duplicaDavvero(id, titolo, cliente_id) {
  var k = by(D.com, id); if (!k) return;
  var nuovo = { titolo: titolo, cliente_id: cliente_id || k.cliente_id, owner_id: me.pro_id || k.owner_id, pm_id: k.pm_id, pr_id: k.pr_id, stato: "Bozza", tipo_prezzo: k.tipo_prezzo, budget_ore: k.budget_ore, budget_importo: k.budget_importo, retainer_mensile: k.retainer_mensile, probabilita: 50, note: k.note, inizio: today(),
    ambito: k.ambito, iva: k.iva, sconto: k.sconto, validita: k.validita, condizioni: k.condizioni, premessa: k.premessa, chiusura: k.chiusura, sezioni: sezioniDi(k), mostra_ore: k.mostra_ore, mostra_stato: k.mostra_stato };
  var r = await sb.from("commesse").insert(nuovo).select().single();
  if (r.error) { toast(erroreUmano(r.error), true); return; }
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
  await reload(["com", "fasi", "righe", "prog", "ev"]);
  closeModal(); toast("Preventivo duplicato"); go("commessa", nid, "servizi");
}
async function delRow(entity, id) {
  var F = FORMS[entity], tbk = F ? F.tb : entity, key = (F && F.key) || "id";
  if (!confirm("Eliminare definitivamente?")) return;
  var r = await sb.from(TB[tbk]).delete().eq(key, id);
  if (r.error) {
    /* il database difende la storia: un cliente con preventivi non si butta via */
    if (r.error.code === "23503" && tbk === "cli") {
      toast("Questo cliente ha ancora dei preventivi. Spostali o eliminali prima, oppure mettilo come «Chiuso» per toglierlo di mezzo senza perdere niente.", true);
      return;
    }
    if (r.error.code === "23503") { toast("Non si può eliminare: ci sono altre cose collegate. Toglile prima.", true); return; }
    toast(erroreUmano(r.error), true); return;
  }
  await reload([tbk]); closeModal();
  FDIRTY = false;
  if (inForm() || view === "riga") {
    var s = FSEZ[entity] || FSEZ[tbk]; toast("Eliminato");
    var det = FDETT[entity], b = FBACK; FBACK = null;
    /* torno da dove ero, a meno che fosse proprio la scheda appena eliminata */
    if (b && b[0] && !inFormNome(b[0]) && !(det && b[0] === det[0] && b[1] === id)) { go(b[0], b[1], b[2]); return; }
    go(s ? s[0] : "dash"); return;
  }
  if ((view === "commessa" && tbk === "com") || (view === "cliente" && tbk === "cli")) { go(tbk === "com" ? "commesse" : "clienti"); return; }
  /* cancellata la scheda su cui ero: torno al suo elenco, non a una pagina vuota */
  var dett = FDETT[entity];
  if (dett && view === dett[0] && current === id) { toast("Eliminato"); go((FSEZ[entity] || ["dash"])[0]); return; }
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
    crumbs([[gruppoDi("commesse") || "Clienti"], ["Preventivi", "commesse"], [kk.titolo, "commessa", kk.id, "servizi"], [rid ? "Modifica voce" : "Nuova voce"]]) +
    '<div class="top"><h1>' + esc(rid ? (r.nome || "Voce di preventivo") : "Nuova voce di preventivo") + '<span class="sub">' + esc(kk.titolo) + "</span></h1></div>" +
    '<form class="fpage" data-page="1" data-riga-save="' + k + ":" + (rid || "") + '"><div class="card">' +
    '<div class="row2">' + selField("tipo", "Tipo di voce", sel(["Servizio", "Trasferta", "Spesa", "Sconto"], r.tipo || "Servizio")) +
    selField("progetto_id", "Progetto", '<option value="">— nessuno —</option>' + pg.map(function (p) { return '<option value="' + p.id + '"' + (r.progetto_id === p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("")) + "</div>" +
    selField("serv_id", "Prendi dal listino (facoltativo)", '<option value="">— voce libera —</option>' + D.serv.map(function (s) {
      return '<option value="' + s.id + '"' + (r.serv_id === s.id ? " selected" : "") + ">" + esc(s.nome) + " · " + esc(nameOf(D.pros, s.pro_id)) + " · " + eur(s.prezzo) + (s.unita ? " / " + esc(s.unita) : "") + "</option>";
    }).join("")) +
    fld("nome", "Come appare sul preventivo", "text", r.nome) +
    fld("descrizione", "Descrizione per il cliente", "textarea", r.descrizione) +
    '<div class="row2">' + fld("qty", "Quantità", "number", r.qty == null ? 1 : r.qty) + fld("unita", "Unità (progetto, ora, mese, seduta, cartella…)", "text", r.unita) + "</div>" +
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
  D.riu.forEach(function (r) { PAL.push({ t: r.titolo, s: "Riunione · " + dt(r.data), i: "◷", go: ["riunione", r.id] }); });
  navFor().forEach(function (n) { if (n.k) PAL.push({ t: n.t, s: "Vai a", i: "→", go: [n.k] }); });
  [["com", "Nuovo preventivo"], ["ore", "Registra ore"], ["task", "Nuova attività"], ["riu", "Nuova riunione"], ["cli", "Nuovo cliente"], ["serv", "Nuovo servizio"]].forEach(function (a) {
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
  if (x.act === "com") { nuovoPreventivo({}); return; }
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
  var V = { riunioni: vRiunioni, riunione: vRiunione, attivita: vAttivita, dash: vDash, commesse: vCommesse, commessa: vCommessa, progetti: vProgetti, progetto: vProgetto, lavorazione: vLavorazione, calendario: vCalendario, clienti: vClienti, cliente: vCliente, pool: vPool, pro: vPro, servizi: vServizi, task: vTask, ore: vOre, report: vReport, carico: vCarico, spazi: vSpazi, amm: vAmm, studio: vStudio, fornitori: vFornitori, profilo: vProfilo, posta: vPosta, impostazioni: vSettings, nuovo: vForm, mod: vForm, riga: vRiga, documento: vDocumento, importa: vImporta, prospetto: vProspetto, sistema: vSistema, analisi: vAnalisi, professioni: vProfessioni, eventi: vEventi, chat: vChat };
  var f = V[view] || vDash;
  el("#main").innerHTML = f();
  var s = el("#search") || el("#tcerca") || el("#fcerca");
  if (s && window.innerWidth > 760 && !("ontouchstart" in window)) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  if (view === "chat") { var cms = el(".chatms"); if (cms) cms.scrollTop = cms.scrollHeight; segnaLetto(); }
  countUp();
}

/* Entrare in un canale vuol dire averlo letto. Segno la lettura senza ridisegnare
   tutta la pagina: basta aggiornare il pallino nel menu. */
var LETTOBUSY = "";
async function segnaLetto() {
  var c = canaleCorrente();
  if (!c || !me.pro_id || LETTOBUSY === c.id || !nonLetti(c.id)) return;
  LETTOBUSY = c.id;
  var r = await sb.from("letture").upsert({ canale_id: c.id, pro_id: me.pro_id, letto_il: new Date().toISOString() }, { onConflict: "canale_id,pro_id" });
  LETTOBUSY = "";
  if (r.error) return;
  await reload(["lett"]);
  buildNav();
}

/* Logo e firma: l'immagine viene ridotta qui nel browser e salvata come testo,
   così sta nella riga privata del professionista (o nelle impostazioni dello
   studio) e stampa sempre, anche fra un anno. */
function immagineRidotta(file, maxLato) {
  return new Promise(function (ok, no) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var sc = Math.min(1, maxLato / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/png"));
    };
    img.onerror = function () { URL.revokeObjectURL(url); no(new Error("Immagine non leggibile")); };
    img.src = url;
  });
}
async function caricaImmagine(cosa, file) {
  var dati;
  try { dati = await immagineRidotta(file, cosa === "firma" ? 600 : 800); } catch (e) { toast(e.message, true); return; }
  if (dati.length > 400000) { toast("Immagine troppo pesante anche dopo la riduzione: prova un file più semplice", true); return; }
  await salvaImmagine(cosa, dati);
}
async function salvaImmagine(cosa, dati) {
  if (cosa === "studio_logo") {
    var rs = await sb.from("settings").update({ studio_logo: dati }).eq("id", SET.id || 1);
    if (rs.error) { toast(erroreUmano(rs.error), true); return; }
    await reload(["set"]); SET = D.set[0] || SET;
  } else {
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var patch = { pro_id: me.pro_id, aggiornato: new Date().toISOString() }; patch[cosa] = dati;
    var rp = await sb.from("pro_privato").upsert(patch, { onConflict: "pro_id" });
    if (rp.error) { toast(erroreUmano(rp.error), true); return; }
    await reload(["priv"]);
  }
  toast(dati ? "Salvato" : "Tolto");
  render();
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
/* Un clic solo: finché la prima azione non ha finito, la seconda uguale non parte. */
var INCORSO = {};
var GUARDIA = ["avvia", "impCrea", "ciclo", "incassa", "tck", "apprVar", "tstart", "tstop", "tstartTask", "tstartLav", "propSi", "portnew", "riuTask", "riuStato", "duplTask", "dupl", "richCli", "richPro", "richOk"];
document.addEventListener("click", function (e) {
  var t = e.target.closest("button, [data-open-task], [data-open-com], [data-open-prog], [data-open-lav], [data-day], [data-close]");
  if (!t) return;
  var d = t.dataset || {}, chiave = "";
  for (var gi = 0; gi < GUARDIA.length; gi++) if (d[GUARDIA[gi]] !== undefined) { chiave = GUARDIA[gi] + ":" + d[GUARDIA[gi]]; break; }
  if (chiave) {
    if (INCORSO[chiave]) { e.preventDefault(); return; }
    INCORSO[chiave] = 1; t.classList.add("busy");
    var fine = function () { delete INCORSO[chiave]; t.classList.remove("busy"); };
    var pr = clicApp(e, t, d);
    if (pr && pr.then) pr.then(fine, function (err) { fine(); toast(erroreUmano(err), true); }); else fine();
    return;
  }
  var p2 = clicApp(e, t, d);
  if (p2 && p2.catch) p2.catch(function (err) { toast(erroreUmano(err), true); });
});
async function clicApp(e, t, d) {
  if (t.hasAttribute("data-close")) { closeModal(); return; }
  if (d.palI !== undefined) { palGo(+d.palI); return; }
  if (d.pal) { openPalette(); return; }
  if (t.hasAttribute("data-fs")) { FSTATO = d.fs || ""; render(); return; }
  if (t.hasAttribute("data-fh")) { FSAL = d.fh || ""; render(); return; }
  if (d.exp) { EXP[d.exp] = !EXP[d.exp]; render(); return; }
  if (d.go) { meMenu(false); go(d.go); return; }
  if (d.route) { var rq = d.route.split("|"); go(rq[0], rq[1] || null, rq[2] || ""); return; }
  if (d.annulla) { tornaIndietro(); return; }
  if (d.openCom) { go("commessa", d.openCom, "servizi"); return; }
  if (d.openProg) { go("progetto", d.openProg, "lavorazioni"); return; }
  if (d.openLav) { go("lavorazione", d.openLav); return; }
  if (d.cal !== undefined) { CAL = d.cal === "0" ? 0 : CAL + (+d.cal); render(); return; }
  if (d.navg) { navToggle(d.navg); buildNav(); return; }
  if (d.link) { apriLink(d.link); return; }
  if (d.impTesto) { IMP.mostraTesto = !IMP.mostraTesto; render(); return; }
  if (d.impAnnulla) { IMP = null; render(); return; }
  if (d.impCrea) { await creaDaImport(); return; }
  if (d.impRiga) {
    if (d.impRiga === "new") { IMP.righe.push({ nome: "", qty: 1, prezzo_unit: 0 }); render(); return; }
    var pz9 = d.impRiga.split("|");
    if (pz9[1] === "togli") { IMP.righe.splice(+pz9[0], 1); render(); return; }
    return;
  }
  if (d.anadi) {
    var cA = by(D.cli, d.anadi);
    ANA = { piva: (cA && cA.piva) || "", nome: (cA && cA.nome) || "", cliente_id: d.anadi, busy: false, err: "" };
    go("analisi"); return;
  }
  if (d.chiedi) { apriAssistente(); return; }
  if (d.chatdemo) { await mandaDomanda(d.chatdemo); return; }
  if (d.chatsi) { await faiAzioneChat(+d.chatsi); return; }
  if (d.chatno) { if (CHAT[+d.chatno]) CHAT[+d.chatno].fatta = true; aggiornaAssistente(); return; }
  if (d.anacerca) {
    if (!ANA.piva && !ANA.nome) { toast("Serve almeno la partita IVA o il nome", true); return; }
    ANA.busy = true; ANA.err = ""; render();
    try {
      var dati = await cercaAnalisi();
      var ins = await sb.from("analisi").insert({
        cliente_id: ANA.cliente_id || null, piva: ANA.piva || null,
        nome: dati.ragione_sociale || ANA.nome || null, dati: dati, creata_da: me.pro_id
      });
      if (ins.error) toast("Trovata, ma non salvata: " + erroreUmano(ins.error), true);
      await reload(["ana"]);
      toast(dati.trovata ? "Analisi pronta" : "Non ho trovato niente di attendibile", !dati.trovata);
    } catch (e) { ANA.err = e.message; }
    ANA.busy = false; render(); return;
  }
  if (d.anaelimina) {
    if (!confirm("Elimino questa analisi?")) return;
    var rae = await sb.from("analisi").delete().eq("id", d.anaelimina);
    if (rae.error) { toast(erroreUmano(rae.error), true); return; }
    await reload(["ana"]); toast("Eliminata"); render(); return;
  }
  if (d.diag) { toast("Leggo il sistema…"); await caricaDiagnostica(); render(); return; }
  if (d.diagpulisci) {
    if (!confirm("Svuoto il registro degli errori? Non si torna indietro.")) return;
    var rdp = await sb.from("errori").delete().gte("created_at", "1970-01-01");
    if (rdp.error) { toast(erroreUmano(rdp.error), true); return; }
    await caricaDiagnostica(); toast("Registro svuotato"); render(); return;
  }
  if (d.proscarica) { var pp = d.proscarica.split("|"); scaricaProspetto(pp[0], pp[1]); return; }
  if (d.propNo) { propScarta(d.propNo); render(); return; }
  if (d.propSi) { await faiProposta(d.propSi, d.propId); return; }
  if (d.sidetog) { navMini(); return; }
  if (d.mebtn) { meMenu(); return; }
  if (d.esci) {
    if (PLINK) { location.hash = ""; location.reload(); return; }
    await sb.auth.signOut(); location.reload(); return;
  }
  if (d.pcfgAttiva) {
    var pp = by(D.pros, me.pro_id) || {};
    var rp = await sb.from("prenota_cfg").insert({ pro_id: me.pro_id, slug: slugDa(pp.nome) || ("pro-" + String(me.pro_id).slice(0, 6)), attivo: false }).select().single();
    if (rp.error) { toast(erroreUmano(rp.error), true); return; }
    await reload(["pcfg"]); toast("Link pronto: controlla gli orari e accendilo"); render(); return;
  }
  if (d.copia) { try { await navigator.clipboard.writeText(d.copia); toast("Copiato"); } catch (x) { prompt("Copia", d.copia); } return; }
  if (d.recStart) { await recStart(d.recStart); return; }
  if (d.recStop) { await recStop(); return; }
  if (d.recVedi) { RECVEDI = RECVEDI === d.recVedi ? null : d.recVedi; render(); return; }
  if (d.recRiassumi) { var rr7 = by(D.riu, d.recRiassumi); if (!rr7 || !rr7.trascrizione) return; toast("Preparo gli appunti…"); try { await riassumiRiunione(rr7.id, rr7.trascrizione); } catch (e) { toast(String(e && e.message || e), true); } return; }
  if (d.gconnCollega) { try { await collegaGoogle(); } catch (e) { toast(String(e && e.message || e), true); } return; }
  if (d.imapForm) { apriFormCasella(); var mc0 = mconnMia(); if (mc0) { var fm0 = el("#modal form"); if (fm0) { fm0.preset.value = "altro"; fm0.email.value = mc0.email; fm0.utente.value = mc0.utente !== mc0.email ? mc0.utente : ""; fm0.imap_host.value = mc0.imap_host; fm0.smtp_host.value = mc0.smtp_host; fm0.smtp_port.value = String(mc0.smtp_port); } } return; }
  if (d.imapVia) {
    if (!confirm("Scollegare la casella? La password viene cancellata dal database.")) return;
    try { await chiamaImap({ azione: "scollega" }); } catch (e) { toast(String(e && e.message || e), true); return; }
    GM = { chiave: "", lista: [], page: null, caric: false, errore: "", cerca: "", filtro: "inbox", msg: null, msgCaric: "", nonLetti: 0, cli: {} };
    await reload(["mconn"]); toast("Casella scollegata"); render(); return;
  }
  if (d.gconnVia) {
    if (!confirm("Scollegare Google? La posta e il calendario spariscono dal CRM (su Google resta tutto).")) return;
    try { await chiamaGoogle({ azione: "scollega" }); } catch (e) { toast(String(e && e.message || e), true); return; }
    GM = { chiave: "", lista: [], page: null, caric: false, errore: "", cerca: "", filtro: "inbox", msg: null, msgCaric: "", nonLetti: 0, cli: {} };
    await reload(["gconn", "impg"]); toast("Scollegato"); render(); return;
  }
  if (d.gcalSync) { toast("Aggiorno il calendario…"); await sincronizzaCal(false); render(); return; }
  if (d.gcalMetti) { toast("Mando a Google…"); try { await mettiInGoogle(d.gcalMetti); } catch (e) { toast(String(e && e.message || e), true); } return; }
  if (d.gcalVia) {
    var rg = by(D.riu, d.gcalVia); if (!rg || !rg.gcal_event_id) return;
    try { await chiamaGoogle({ azione: "cal_delete", id: rg.gcal_event_id }); } catch (e) { toast(String(e && e.message || e), true); return; }
    await salvaSubito("riu", rg.id, { gcal_event_id: null }); sincronizzaCal(true); toast("Tolta da Google Calendar"); return;
  }
  if (d.gmailApri) { if (view !== "posta" && view !== "cliente") go("posta"); await apriMessaggio(d.gmailApri); return; }
  if (d.gmailFiltro) { GM.filtro = d.gmailFiltro; GM.msg = null; render(); return; }
  if (d.gmailRicarica) { GM.chiave = ""; GM.msg = null; GM.cli = {}; render(); return; }
  if (d.gmailAltro) { if (GM.page && !GM.caric) caricaPosta(GM.chiave, GM.chiave, true); render(); return; }
  if (d.gmailClivia) { delete GM.cli[d.gmailClivia]; render(); return; }
  if (d.gmailScrivi) {
    var cc0 = d.ctxCli ? by(D.cli, d.ctxCli) : null;
    apriComposer({ a: cc0 ? cc0.email : "", cliente_id: cc0 ? cc0.id : "" }); return;
  }
  if (d.gmailRispondi) {
    var mr = GM.msg; if (!mr || mr.id !== d.gmailRispondi) return;
    var aR = mr.inviato ? mr.a : mr.da, oggR = /^re:/i.test(mr.oggetto || "") ? mr.oggetto : "Re: " + (mr.oggetto || "");
    apriComposer({ a: soloEmail(aR), oggetto: oggR, testo: testoQuotato(mr), threadId: mr.threadId, inReplyTo: mr.messageId, references: mr.references, cliente_id: (clienteDelMessaggio(mr) || {}).id || "" }); return;
  }
  if (d.gmailDiario) {
    var md = GM.msg; if (!md || md.id !== d.gmailDiario) return;
    var cd = clienteDelMessaggio(md); if (!cd) return;
    if (await segnaNelDiario(md, cd.id)) { toast("Nel diario di " + cd.nome); render(); } return;
  }
  if (d.gmailLead) {
    var ml = GM.msg; if (!ml || ml.id !== d.gmailLead) return;
    var addr = soloEmail(ml.inviato ? ml.a : ml.da), nomeL = prompt("Nome del cliente", soloNome(ml.inviato ? ml.a : ml.da)); if (!nomeL) return;
    var ins = await sb.from("clienti").insert({ nome: nomeL.trim(), email: addr, stato: "Lead", owner_id: me.pro_id, referente: soloNome(ml.inviato ? ml.a : ml.da) }).select().single();
    if (ins.error) { toast(erroreUmano(ins.error), true); return; }
    await reload(["cli"]); await segnaNelDiario(ml, ins.data.id); toast("Cliente creato: " + nomeL); render(); return;
  }
  if (d.gmailPrev) {
    var kp = by(D.com, d.gmailPrev), clp = kp ? by(D.cli, kp.cliente_id) : null; if (!kp || !clp) return;
    var mp = testoMailPreventivo(kp, clp), plp = D.port.filter(function (x) { return x.cliente_id === clp.id && x.attivo; })[0];
    var tp = mp.testo; if (plp && plp.ha_pwd) tp = tp.replace("\n\nResto a disposizione", "\nLo trova anche nella sua area riservata: " + location.origin + location.pathname + "#/p/" + plp.token + "\n\nResto a disposizione");
    apriComposer({ a: clp.email, oggetto: mp.oggetto, testo: tp, cliente_id: clp.id, dopo: "prev:" + kp.id, nota: "il PDF non si allega da qui: mandalo con «Stampa / PDF» se serve, o fai leggere il preventivo dal portale" }); return;
  }
  if (d.gmailInc) {
    var ig = by(D.inc, d.gmailInc), kg = ig ? by(D.com, ig.commessa_id) : null, cg = kg ? by(D.cli, kg.cliente_id) : null; if (!ig || !kg || !cg) return;
    var urlG = linkFirma(ig);
    apriComposer({ a: cg.email, oggetto: "Lettera d'incarico — " + kg.titolo, testo: "Gentile " + (cg.referente || cg.nome || "") + ",\n\nle invio la lettera d'incarico per «" + kg.titolo + "». La può leggere e firmare da questo link:\n" + urlG + "\n\nResto a disposizione.\n" + (me.nome || ""), cliente_id: cg.id, dopo: "inc:" + ig.id }); return;
  }
  if (d.incNuovo) { await creaIncarico(d.incNuovo); return; }
  if (d.incLink) {
    var il = by(D.inc, d.incLink); if (!il) return;
    var urlF = linkFirma(il);
    try { await navigator.clipboard.writeText(urlF); toast("Link copiato: mandalo al cliente"); } catch (x) { prompt("Copia questo link e mandalo al cliente", urlF); }
    if (il.stato === "Bozza") { await salvaSubito("inc", il.id, { stato: "Inviata", inviata_il: new Date().toISOString() }); }
    return;
  }
  if (d.incInviata) { var ii = by(D.inc, d.incInviata); if (ii && ii.stato === "Bozza") { await salvaSubito("inc", ii.id, { stato: "Inviata", inviata_il: new Date().toISOString() }); } return; }
  if (d.incAnnulla) { var ia = by(D.inc, d.incAnnulla); if (!ia) return; if (!confirm("Annullare questa lettera? Il link non funzionerà più.")) return; await salvaSubito("inc", ia.id, { stato: "Annullata" }); return; }
  if (d.incart) {
    var pa = d.incart.split("|"), ic = by(D.inc, pa[0]); if (!ic || ic.stato === "Firmata") return;
    var tx = JSON.parse(JSON.stringify(ic.testo || {})); tx.articoli = tx.articoli || [];
    if (pa[1] === "new") tx.articoli.push({ t: "Nuovo articolo", x: "" });
    else { var ja = +pa[1]; if (pa[2] === "via") tx.articoli.splice(ja, 1); else { var jb = ja + (+pa[2]); if (jb < 0 || jb >= tx.articoli.length) return; var tmp = tx.articoli[ja]; tx.articoli[ja] = tx.articoli[jb]; tx.articoli[jb] = tmp; } }
    await salvaSubito("inc", ic.id, { testo: tx }); return;
  }
  if (d.mprevApri) { apriModelliPrev(d.mprevApri); return; }
  if (d.mprevSalva) { apriSalvaModello(d.mprevSalva); return; }
  if (d.mprevUsa) { var mu = d.mprevUsa.split("|"); await applicaModelloPrev(mu[0], mu[1]); return; }
  if (d.mprevBianco) { DOCNUOVO = null; render(); return; }
  if (d.cambiacli) { CAMBIACLI = d.cambiacli === "0" ? null : d.cambiacli; render(); return; }
  if (d.blocco) {
    var bz = d.blocco.split("|"), kb = by(D.com, bz[0]); if (!kb) return;
    var ob = opzDoc(kb), nb = (ob.nascosti || []).filter(function (x) { return x !== bz[1]; });
    if (bz[2] === "via") nb.push(bz[1]);
    if (await salvaSubito("com", bz[0], { doc_opzioni: Object.assign({}, ob, { nascosti: nb }) })) toast(bz[2] === "via" ? "Blocco tolto dal foglio: lo rimetti da «Rimetti un blocco»" : "Blocco rimesso");
    return;
  }
  if (d.rigainline) {
    var ri = d.rigainline.split("|"), kr = by(D.com, ri[0]); if (!kr) return;
    var rri = await sb.from("righe").insert({ commessa_id: kr.id, progetto_id: ri[1] || null, nome: "Nuova voce", qty: 1, prezzo_unit: 0, assegnato_id: me.pro_id, ordine: righeOf(kr.id).length + 1, tipo: "Servizio" }).select().single();
    if (rri.error) { toast(erroreUmano(rri.error), true); return; }
    await reload(["righe"]); render();
    var nv = document.querySelector('[data-ed="righe|nome|' + rri.data.id + '"]'); if (nv) { nv.focus(); try { document.execCommand("selectAll", false, null); } catch (x) {} }
    return;
  }
  if (d.sezpreset) {
    var kp = by(D.com, d.sezpreset); if (!kp) return;
    var gia9 = sezioniDi(kp).map(function (x) { return (x.t || "").toLowerCase(); });
    var nuove9 = presetSezioni(kp).filter(function (p) { return gia9.indexOf(p[0].toLowerCase()) === -1; }).map(function (p) { return { t: p[0], d: p[1], x: "", v: p[2] }; });
    if (!nuove9.length) { toast("Le sezioni tipiche ci sono già."); return; }
    if (await salvaSezioni(kp.id, sezioniDi(kp).concat(nuove9))) { toast("Aggiunte " + nuove9.length + " sezioni: riscrivile come vuoi"); render(); }
    return;
  }
  if (d.sezmuovi) {
    var pm9 = d.sezmuovi.split("|"), km9 = by(D.com, pm9[0]); if (!km9) return;
    var sm9 = sezioniDi(km9).slice(), i9 = +pm9[1], j9 = i9 + (+pm9[2]);
    if (j9 < 0 || j9 >= sm9.length) return;
    var tmp9 = sm9[i9]; sm9[i9] = sm9[j9]; sm9[j9] = tmp9;
    if (await salvaSezioni(pm9[0], sm9)) render();
    return;
  }
  if (d.seznuova) {
    var pn = d.seznuova.split("|"), kn = by(D.com, pn[0]); if (!kn) return;
    var sn = sezioniDi(kn).slice(); sn.push({ t: "Nuova sezione", d: pn[1] === "dopo" ? "dopo" : "prima", x: "", v: [] });
    if (await salvaSezioni(pn[0], sn)) render();
    return;
  }
  if (d.sezvia) {
    var pv = d.sezvia.split("|"), kv = by(D.com, pv[0]); if (!kv) return;
    if (!confirm("Tolgo questa sezione dal preventivo?")) return;
    var sv = sezioniDi(kv).slice(); sv.splice(+pv[1], 1);
    if (await salvaSezioni(pv[0], sv)) { toast("Sezione tolta"); render(); }
    return;
  }
  if (d.sezvoce) {
    var pc = d.sezvoce.split("|"), kc = by(D.com, pc[0]); if (!kc) return;
    var sc = sezioniDi(kc).map(function (s) { return { t: s.t, d: s.d, x: s.x, v: (s.v || []).slice() }; });
    var sez = sc[+pc[1]]; if (!sez) return;
    if (pc[2] === "new") sez.v.push(""); else sez.v.splice(+pc[2], 1);
    if (await salvaSezioni(pc[0], sc)) render();
    return;
  }
  if (d.impSez && IMP) { IMP.sezioni.splice(+d.impSez.split("|")[0], 1); render(); return; }
  if (d.impPag && IMP) { IMP.pagamenti.splice(+d.impPag.split("|")[0], 1); render(); return; }
  if (d.stampa) {
    /* il nome del PDF è il titolo della pagina: lo cambio per il tempo della stampa */
    var tprima = document.title; if (d.stampa !== "1") document.title = d.stampa;
    window.print(); setTimeout(function () { document.title = tprima; }, 2000); return;
  }
  if (d.calCopia) {
    var inp = el("#icslink"); if (!inp) return;
    inp.focus(); inp.select(); inp.setSelectionRange(0, 999);
    var fatto = false;
    try { fatto = document.execCommand("copy"); } catch (e) { fatto = false; }
    if (!fatto && navigator.clipboard) { try { await navigator.clipboard.writeText(inp.value); fatto = true; } catch (e2) { fatto = false; } }
    toast(fatto ? "Link copiato" : "Selezionalo e copialo a mano", !fatto); return;
  }
  if (d.calNuovo) {
    if (urlIcs() && !confirm("Il link di adesso smetterà di funzionare e i calendari già collegati andranno rifatti. Procedo?")) return;
    var rct = await sb.rpc("cal_rigenera");
    if (rct.error) { toast(erroreUmano(rct.error), true); return; }
    await reload(["caltok"]); toast("Link pronto"); render(); return;
  }
  if (d.day) { openForm("task", null, { scadenza: d.day }); return; }
  if (d.noteditP) { NOTEDIT = d.noteditP === "1"; render(); return; }
  if (d.visprog) {
    var pv = by(D.prog, d.visprog); if (!pv) return;
    var rvp = await sb.from("progetti").update({ visibile_cliente: !pv.visibile_cliente }).eq("id", pv.id);
    if (rvp.error) { toast(erroreUmano(rvp.error), true); return; }
    await reload(["prog"]); toast(!pv.visibile_cliente ? "Il cliente ora vede questo progetto" : "Progetto reso interno"); render(); return;
  }
  if (d.tstartLav) {
    var lw = by(D.lav, d.tstartLav); if (!lw) return;
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    if (!await primaFermaTimer()) return;
    var rtl = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: lw.commessa_id, progetto_id: lw.progetto_id, lavorazione_id: lw.id, iniziato: new Date().toISOString() });
    if (rtl.error) { toast(erroreUmano(rtl.error), true); return; }
    await reload(["tmr"]); toast("Timer avviato su " + lw.nome); render(); return;
  }
  if (d.openCli) { go("cliente", d.openCli); return; }
  if (d.openPro) { go("pro", d.openPro); return; }
  if (d.openProg) { go("progetto", d.openProg); return; }
  if (d.openTask) { if (view === "task" && !(tab === "bacheca" || tab === "calendario" || tab === "timeline")) { PANEL = PANEL === d.openTask ? null : d.openTask; render(); return; } go("attivita", d.openTask); return; }
  if (d.tpanelClose) { PANEL = null; render(); return; }
  if (d.tv) { TV.chi = d.tv; try { localStorage.setItem("gs_task_chi", d.tv); } catch (x) {} render(); return; }
  if (d.tdata) { var td = by(D.task, d.tdata); if (td) apriPop(t, popData(td)); return; }
  if (d.tchi) { var tc = by(D.task, d.tchi); if (tc) apriPop(t, popChi(tc)); return; }
  if (d.tset) {
    var ts = d.tset.split("|"), pt = {}; pt[ts[1]] = ts[2] || null; chiudiPop();
    if (await salvaSubito("task", ts[0], pt)) toast(ts[1] === "scadenza" ? (ts[2] ? "Spostata a " + etichettaGiorno(ts[2]).toLowerCase() : "Scadenza tolta") : (ts[2] ? "Assegnata a " + nameOf(D.pros, ts[2]) : "Nessuno la fa"));
    return;
  }
  if (d.apprSi) { await apprRispondi(d.apprSi, "Approvata"); return; }
  if (d.apprNo) { await apprRispondi(d.apprNo, "Modifiche richieste"); return; }
  if (d.new === "com") { await nuovoPreventivo({ cliente_id: d.ctxCli || null, ambito: d.ctxAmb || "auto" }); return; }
  if (d.new) {
    var ctx = {};
    if (d.ctx) ctx.commessa_id = d.ctx;
    if (d.ctxCli) ctx.cliente_id = d.ctxCli;
    if (d.ctxPro) ctx.pro_id = d.ctxPro;
    if (d.ctxAmb) ctx.ambito = d.ctxAmb;
    if (d.ctxProg) { ctx.progetto_id = d.ctxProg; var pk2 = by(D.prog, d.ctxProg); if (pk2) ctx.commessa_id = pk2.commessa_id; }
    if (d.ctxLav) { var lk = by(D.lav, d.ctxLav); if (lk) { ctx.lavorazione_id = lk.id; ctx.progetto_id = lk.progetto_id; ctx.commessa_id = lk.commessa_id; } }
    if (d.ctxTask) { var tk8 = by(D.task, d.ctxTask); if (tk8) { ctx.task_id = tk8.id; ctx.lavorazione_id = tk8.lavorazione_id; ctx.progetto_id = tk8.progetto_id; ctx.commessa_id = tk8.commessa_id; } }
    openForm(d.new, null, ctx); return;
  }
  if (d.edit) { var p = d.edit.split(":"); openForm(p[0], p.slice(1).join(":")); return; }
  if (d.del) { var q = d.del.split(":"); await delRow(q[0], q.slice(1).join(":")); return; }
  if (d.riga) { openRiga(d.riga); return; }
  if (d.rigaEdit) { openRiga(null, d.rigaEdit); return; }
  if (d.portale) { openPortale(d.portale); return; }
  if (d.avvia) { await avviaLavoro(d.avvia); return; }
  if (d.sitovia) {
    if (!confirm("Tolgo questa immagine dal sito?")) return;
    var rsv = await sb.storage.from("sito").remove([d.sitovia]);
    if (rsv.error) { toast(erroreUmano(rsv.error), true); return; }
    SITO_IMG = null; toast("Tolta"); render(); return;
  }
  if (d.richOk) { if (await salvaSubito("rich", d.richOk, { stato: "Gestita", gestita_da: me.pro_id })) toast("Richiesta gestita"); render(); return; }
  if (d.richCli) {
    var rq1 = by(D.rich, d.richCli); if (!rq1) return;
    var gia1 = D.cli.filter(function (c) { return (c.email || "").toLowerCase() === (rq1.email || "").toLowerCase() || (c.nome || "").toLowerCase() === (rq1.azienda || rq1.nome || "").toLowerCase(); })[0];
    var cid1 = gia1 && gia1.id;
    if (!cid1) {
      var rc1 = await sb.from("clienti").insert({ nome: (rq1.azienda || rq1.nome).slice(0, 140), referente: rq1.azienda ? rq1.nome : null, email: rq1.email, telefono: rq1.telefono || null, stato: "Lead", owner_id: me.pro_id, note: "Dal sito il " + dt(String(rq1.created_at).slice(0, 10)) + ":\n" + (rq1.messaggio || "") }).select().single();
      if (rc1.error) { toast(erroreUmano(rc1.error), true); return; }
      cid1 = rc1.data.id; await reload(["cli"]);
    }
    await sb.from("interazioni").insert({ cliente_id: cid1, pro_id: me.pro_id, tipo: "Nota", data: today(), testo: "Richiesta dal sito: " + (rq1.messaggio || "—") });
    await salvaSubito("rich", rq1.id, { stato: "Gestita", gestita_da: me.pro_id, cliente_id: cid1 });
    await reload(["inter"]); toast(gia1 ? "Cliente già in anagrafica: ho aggiunto la nota" : "Cliente creato come Lead"); go("cliente", cid1, "anagrafica"); return;
  }
  if (d.richPro) {
    var rq2 = by(D.rich, d.richPro); if (!rq2) return;
    var rp2 = await sb.from("professionisti").insert({ nome: rq2.nome.slice(0, 140), ruolo: rq2.mestiere || null, citta: rq2.citta || null, email: rq2.email, sito: rq2.portfolio || null, vetting: "In valutazione" }).select().single();
    if (rp2.error) { toast(erroreUmano(rp2.error), true); return; }
    await salvaSubito("rich", rq2.id, { stato: "Gestita", gestita_da: me.pro_id });
    await reload(["pros"]); toast("Scheda creata, in valutazione. L\'accesso lo dai da Impostazioni quando è il momento."); go("pro", rp2.data.id, "scheda"); return;
  }
  if (d.riuStato) {
    var rz = d.riuStato.split("|");
    if (await salvaSubito("riu", rz[0], { stato: rz[1] })) toast(rz[1] === "Tenuta" ? "Segnata come tenuta" : rz[1] === "Annullata" ? "Riunione annullata" : "Rimessa in programma");
    render(); return;
  }
  if (d.riuTask) {
    var ru = by(D.riu, d.riuTask); if (!ru) return;
    var righeP = String(ru.prossimi || "").split("\n").map(function (x) { return x.replace(/^[-*•\d.)\s\[\]x]+/i, "").trim(); }).filter(Boolean);
    if (!righeP.length) { toast("Scrivi prima i prossimi passi, una riga per ognuno."); return; }
    var giaT = D.task.filter(function (t) { return t.origine_id === ru.id; }).map(function (t) { return t.titolo; });
    var nuoveT = righeP.filter(function (x) { return giaT.indexOf(x.slice(0, 200)) === -1; }).map(function (x, i) {
      return { titolo: x.slice(0, 200), commessa_id: ru.commessa_id || null, progetto_id: ru.progetto_id || null, cliente_id: ru.cliente_id || null, assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media", ordine: i + 1, origine_id: ru.id, sezione: ("Riunione " + dshort(ru.data)).slice(0, 80) };
    });
    if (!nuoveT.length) { toast("C'erano già tutte: nessun doppione."); return; }
    var rnt = await sb.from("task").insert(nuoveT);
    if (rnt.error) { toast(erroreUmano(rnt.error), true); return; }
    if (ru.commessa_id) await logEv(ru.commessa_id, "Dalla riunione «" + ru.titolo + "»: " + nuoveT.length + " attività");
    await reload(["task", "ev"]); toast("Create " + nuoveT.length + (nuoveT.length === 1 ? " attività" : " attività")); render(); return;
  }
  if (d.fig) { FIGAP = FIGAP === d.fig ? null : d.fig; render(); return; }
  if (d.postap) { POSTAP = POSTAP === d.postap ? null : d.postap; render(); return; }
  if (d.postlike) {
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var rl = hoReagito(d.postlike)
      ? await sb.from("post_reaz").delete().eq("post_id", d.postlike).eq("pro_id", me.pro_id)
      : await sb.from("post_reaz").insert({ post_id: d.postlike, pro_id: me.pro_id });
    if (rl.error) { toast(erroreUmano(rl.error), true); return; }
    await reload(["reaz"]); render(); return;
  }
  if (d.postfix) {
    var pf = by(D.post, d.postfix);
    if (await salvaSubito("post", d.postfix, { fissato: !(pf && pf.fissato) })) render();
    return;
  }
  if (d.postvia) {
    if (!confirm("Eliminare questo messaggio dalla bacheca?")) return;
    var rv = await sb.from("post").delete().eq("id", d.postvia);
    if (rv.error) { toast(erroreUmano(rv.error), true); return; }
    await reload(["post", "risp", "reaz"]); toast("Eliminato"); render(); return;
  }
  if (d.evsi || d.evno) {
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var eid = d.evsi || d.evno;
    var re = await sb.from("iscrizioni").upsert(
      { agenda_id: eid, pro_id: me.pro_id, stato: d.evsi ? "Ci sono" : "Non ci sono" },
      { onConflict: "agenda_id,pro_id" });
    if (re.error) { toast(erroreUmano(re.error), true); return; }
    await reload(["iscr"]); toast(d.evsi ? "Segnato: ci sei" : "Va bene, sarà per la prossima"); render(); return;
  }
  if (d.listino) { await prendiListino(); return; }
  if (d.imgvia) { await salvaImmagine(d.imgvia, null); return; }
  if (d.ciclo) {
    var cz = d.ciclo.split("|"), cq = document.querySelector('[data-ciclodata="' + cz[0] + '"]');
    await cambiaStato(cz[0], cz[1], cq && cq.value ? cq.value : null); return;
  }
  if (d.portnew) {
    var tok = "";
    var alfa = "abcdefghijkmnopqrstuvwxyz23456789";
    for (var ti = 0; ti < 22; ti++) tok += alfa[Math.floor(Math.random() * alfa.length)];
    var rp = await sb.from("portali").insert({ cliente_id: d.portnew, token: tok, attivo: true }).select();
    if (rp.error) { toast(erroreUmano(rp.error), true); return; }
    await reload(["port"]);
    toast("Link creato: ora imposta la password");
    render();
    var pwd0 = prompt("Scegli la password da comunicare al cliente (almeno 6 caratteri):");
    if (pwd0) {
      var rq = await sb.rpc("portale_pwd", { pid: rp.data[0].id, pwd: pwd0 });
      if (rq.error) toast(erroreUmano(rq.error), true); else { await reload(["port"]); toast("Password impostata"); render(); }
    }
    return;
  }
  if (d.portpwd) {
    var pwd1 = prompt("Nuova password del portale (almeno 6 caratteri):");
    if (!pwd1) return;
    var rr = await sb.rpc("portale_pwd", { pid: d.portpwd, pwd: pwd1 });
    if (rr.error) { toast(erroreUmano(rr.error), true); return; }
    await reload(["port"]); toast("Password aggiornata"); render(); return;
  }
  if (d.portoff) {
    var pp = d.portoff.split("|");
    var ro = await sb.from("portali").update({ attivo: pp[1] === "1" }).eq("id", pp[0]);
    if (ro.error) { toast(erroreUmano(ro.error), true); return; }
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
    if (r3.error) { toast(erroreUmano(r3.error), true); return; }
    if (pgm) await logEv(pgm.commessa_id, "Incassato: " + pgm.nome + " (" + eur(pgm.importo) + ")");
    await reload(["pag", "ev"]); toast("Pagamento incassato"); render(); return;
  }
  if (d.apprVar) {
    var vv = by(D.vari, d.apprVar);
    var r4 = await sb.from("varianti").update({ stato: "Approvata", approvata_il: today() }).eq("id", d.apprVar);
    if (r4.error) { toast(erroreUmano(r4.error), true); return; }
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
    if (rc.error) { toast(erroreUmano(rc.error), true); return; }
    render(); return;
  }
  if (d.tck) {
    var tt = by(D.task, d.tck); if (!tt) return;
    var fattoOra = tt.stato !== "Fatto";
    var st2 = fattoOra ? "Fatto" : "Da fare";
    var rt = await sb.from("task").update({ stato: st2, completata_il: fattoOra ? new Date().toISOString() : null }).eq("id", tt.id);
    if (rt.error) { toast(erroreUmano(rt.error), true); return; }
    if (fattoOra && tt.commessa_id) await logEv(tt.commessa_id, "Attività completata: " + tt.titolo);
    if (fattoOra && tt.ricorrenza) await prossimaRicorrenza(tt);
    await reload(["task", "ev"]); await dopoAttivita(tt.id); render(); return;
  }
  if (d.dipVia) {
    var dv = d.dipVia.split("|");
    var rdv = await sb.from("task_dip").delete().eq("task_id", dv[0]).eq("blocca_id", dv[1]);
    if (rdv.error) { toast(erroreUmano(rdv.error), true); return; }
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
    if (rdt.error) { toast(erroreUmano(rdt.error), true); return; }
    await reload(["task"]); toast("Attività duplicata"); go("attivita", rdt.data.id); return;
  }
  if (d.tstartTask) {
    var tk9 = by(D.task, d.tstartTask); if (!tk9) return;
    if (!me.pro_id) { toast("Il tuo utente non è collegato a una scheda", true); return; }
    if (!await primaFermaTimer()) return;
    var rtt = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: tk9.commessa_id, progetto_id: tk9.progetto_id, lavorazione_id: tk9.lavorazione_id, task_id: tk9.id, iniziato: new Date().toISOString() });
    if (rtt.error) { toast(erroreUmano(rtt.error), true); return; }
    await reload(["tmr"]); toast("Timer avviato"); render(); return;
  }
  if (d.fReset) {
    var vuoto0 = { com: { stato: "", salute: "", cli: "", cerca: "" }, prog: { stato: "", cli: "", pro: "", cerca: "" }, cli: { stato: "", owner: "", cerca: "" },
      serv: { cat: "", chi: "io", cerca: "" }, forn: { cat: "", cerca: "" }, pool: { cat: "", cerca: "" } };
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
    if (rvs.error) { toast(erroreUmano(rvs.error), true); return; }
    await reload(["viste"]); toast("Vista salvata"); render(); return;
  }
  if (d.servAdd) { apriAggiungiServizio(d.servAdd); return; }
  if (d.modelli) { apriModelli(); return; }
  if (d.modNuovo) { await creaModelloDaProgetto(); return; }
  if (d.modUsa) { await applicaModello(d.modUsa); return; }
  if (d.sub) { go("attivita", d.sub); return; }
  if (d.file) {
    var mf = by(D.mat, d.file); if (!mf || !mf.path) return;
    var sg = await sb.storage.from("materiali").createSignedUrl(mf.path, 120);
    if (sg.error) { toast(erroreUmano(sg.error), true); return; }
    window.open(sg.data.signedUrl, "_blank"); return;
  }
  if (d.vis) {
    var mv2 = by(D.mat, d.vis); if (!mv2) return;
    var rv = await sb.from("materiali").update({ visibile_cliente: !mv2.visibile_cliente }).eq("id", mv2.id);
    if (rv.error) { toast(erroreUmano(rv.error), true); return; }
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
    if (rcp.error) { toast(erroreUmano(rcp.error), true); return; }
    await reload(["ore"]); toast(nuoveC.length + " registrazioni copiate"); render(); return;
  }
  if (d.tstart) {
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    if (!await primaFermaTimer()) return;
    var r5 = await sb.from("timer").upsert({ pro_id: me.pro_id, commessa_id: d.tstart, iniziato: new Date().toISOString() });
    if (r5.error) { toast(erroreUmano(r5.error), true); return; }
    await reload(["tmr"]); toast("Timer avviato"); render(); return;
  }
  if (d.tstop) { await stopTimer(); return; }
}

/* ---------------- dal preventivo al lavoro ----------------
   Quando il cliente dice sì il preventivo smette di essere un foglio. Da ogni
   voce nasce un progetto, e dentro il progetto le attività giuste per QUELLA
   voce: un sito apre analisi-sviluppo-test-messa online, una gestione social
   apre un mese dopo l'altro. Il modello si sceglie guardando cosa c'è scritto
   nella voce, non chi la fa: un consulente marketing che vende un sito apre le
   attività di un sito. E se il preventivo è vecchio, i mesi già passati nascono
   già fatti: il gestionale racconta quello che è successo, non finge che tutto
   cominci oggi. */
function figuraDi(proId) {
  var pr = by(D.pros, proId);
  return pr && pr.professione_id ? by(D.prof, pr.professione_id) : null;
}
function figuraNome(nome) {
  var n = nome.toLowerCase();
  return D.prof.filter(function (f) { return String(f.nome).toLowerCase() === n; })[0] || null;
}
/* Cosa c'è scritto nella voce → che mestiere è. Poche parole, quelle che
   compaiono davvero nei preventivi italiani. Si estende aggiungendo una riga. */
var VOCE_FIGURA = [
  [/\b(sito|siti|web|landing|e-?commerce|wordpress|pagin[ae] web|hosting)\b/, "Sviluppatore web"],
  [/\b(crm|gestionale|software|piattaforma|portale|integrazion|automazion)/, "Sviluppatore web"],
  [/\b(app|applicazione mobile|ios|android)\b/, "Sviluppatore app"],
  [/\b(ads|advertising|adv|campagn[ae]|sponsorizzat)/, "Media buyer"],
  [/\b(social|instagram|facebook|tiktok|linkedin|piano editoriale|community)\b/, "Social media manager"],
  [/\b(seo|posizionamento sui motori|keyword)\b/, "SEO specialist"],
  [/\b(foto|fotograf|shooting|scatti)/, "Fotografo"],
  [/\b(video|riprese|montaggio|spot|reel)/, "Videomaker"],
  [/\b(logo|brand|marchio|identit[àa] visiva|naming)\b/, "Brand designer"],
  [/\b(grafic|impaginazion|volantin|brochure|catalogo|biglietti da visita|menu)/, "Graphic designer"],
  [/\b(illustrazion|disegn)/, "Illustratore"],
  [/\b(testi|copy|copywriting|articol|blog|newsletter|comunicato)/, "Copywriter"],
  [/\b(traduzion|traduttore)/, "Traduttore"],
  [/\b(ux|ui|interfacc|wireframe|prototip)/, "UX designer"],
  [/\b(formazion|corso|workshop|lezion)/, "Formatore"],
  [/\b(consulenz|strategi|marketing|posizionamento|analisi di mercato)/, "Consulente marketing"],
  [/\b(evento|eventi|inaugurazion|allestiment)/, "Event planner"],
  [/\b(progett(o|azione) (di )?interni|arred|render)/, "Interior designer"],
  [/\b(progetto architettonic|pratica edilizia|ristrutturazion|cantiere)/, "Architetto"],
  [/\b(contabilit|bilancio|dichiarazion)/, "Commercialista"],
  [/\b(contratt|parere legale|assistenza legale)/, "Avvocato"]
];
function figuraPerTesto(testo) {
  var t = String(testo || "").toLowerCase();
  for (var i = 0; i < VOCE_FIGURA.length; i++) if (VOCE_FIGURA[i][0].test(t)) return figuraNome(VOCE_FIGURA[i][1]);
  return null;
}
/* Il listino di chi fa la voce: se una voce del listino le somiglia e ha le sue
   attività, valgono quelle. */
function servizioSimile(r, proId) {
  var n = String(r.nome || "").toLowerCase();
  if (!n) return null;
  var miei = D.serv.filter(function (s) { return (!proId || s.pro_id === proId) && s.attivita && s.attivita.length; });
  return miei.filter(function (s) {
    var sn = String(s.nome || "").toLowerCase();
    return sn && (n.indexOf(sn) > -1 || sn.indexOf(n) > -1);
  })[0] || null;
}
function attivitaTipo(r) {
  var sv = by(D.serv, r.serv_id);
  if (sv && sv.attivita && sv.attivita.length) return { att: sv.attivita, da: sv.nome };
  var sim = servizioSimile(r, r.assegnato_id || (sv && sv.pro_id));
  if (sim) return { att: sim.attivita, da: sim.nome };
  var f = figuraPerTesto((r.nome || "") + " " + (r.descrizione || "")) || (sv && sv.professione_id && by(D.prof, sv.professione_id)) || figuraDi(r.assegnato_id || (sv && sv.pro_id));
  if (f && f.attivita && f.attivita.length) return { att: f.attivita, da: f.nome };
  return { att: [{ n: "Esecuzione", o: r.ore_stimate || null }, { n: "Consegna al cliente", o: null }], da: "" };
}
/* Conti sui mesi fatti in UTC: con le date locali il fuso sposta di un giorno
   e "agosto" finisce a settembre. */
function aggMesi(isoData, n) {
  var p = String(isoData).split("-");
  return isoUTC(new Date(Date.UTC(+p[0], +p[1] - 1 + n, Math.min(+p[2], 28))));
}
function fineMese(isoData) {
  var p = String(isoData).split("-");
  return isoUTC(new Date(Date.UTC(+p[0], +p[1], 0)));
}
async function apriIlLavoro(kid) {
  var fatti = { p: 0, a: 0, gia: 0 };
  var k = by(D.com, kid); if (!k) return fatti;
  var righe = righeOf(kid).filter(function (r) { return !r.opzionale && r.tipo !== "Sconto"; });
  var esistenti = progOf(kid).slice();
  var oggi = today(), partenza = k.accettato_il || dataDoc(k);
  var tuttoFinito = k.stato === "Completato";
  for (var i = 0; i < righe.length; i++) {
    var r = righe[i], cc = rigaCalc(r), chi = cc.pro || k.owner_id || me.pro_id;
    var nome = (cc.nome || "Lavoro").slice(0, 140);
    var mod = attivitaTipo(r);
    var inizio = r.inizio || partenza;
    var ricorrente = !!r.ricorrente, cicli = ricorrente ? Math.max(1, +r.cicli || 12) : 1;
    var fine = ricorrente ? fineMese(aggMesi(inizio, cicli - 1)) : (k.scadenza || null);
    var fatto = tuttoFinito || r.stato === "Consegnato" || (ricorrente && fine < oggi);
    var inCorso = !fatto && (r.stato === "In corso" || (ricorrente && inizio <= oggi) || (!ricorrente && inizio < oggi && k.stato === "Accettato"));
    var statoP = fatto ? "Completato" : inCorso ? "In corso" : "Da iniziare";
    /* su un canone l'avanzamento sono i mesi già passati */
    var mesiPassati = 0;
    if (ricorrente) for (var mp = 0; mp < cicli; mp++) if (fineMese(aggMesi(inizio, mp)) < oggi) mesiPassati++;
    var avanz = fatto ? 100 : ricorrente ? Math.round(mesiPassati / cicli * 100) : 0;
    var pg = r.progetto_id ? by(D.prog, r.progetto_id) : null;
    if (!pg) pg = esistenti.filter(function (x) { return x.nome === nome; })[0];
    var pid = pg && pg.id;
    if (!pid) {
      var np = await sb.from("progetti").insert({
        commessa_id: kid, nome: nome, descrizione: r.descrizione || null,
        pro_id: chi, stato: statoP, avanzamento: avanz, ordine: i + 1,
        inizio: inizio, fine: fine
      }).select();
      if (np.error) { toast(erroreUmano(np.error), true); return fatti; }
      pid = np.data[0].id; esistenti.push(np.data[0]); fatti.p++;
      if (!r.progetto_id) await sb.from("righe").update({ progetto_id: pid }).eq("id", r.id);
    } else fatti.gia++;
    /* un lavoro già consegnato non ha bisogno di attività finte già fatte */
    if (fatto && !ricorrente) continue;
    var gia = D.task.filter(function (t) { return t.progetto_id === pid; }).map(function (t) { return t.titolo; });
    var nuove = [];
    if (ricorrente) {
      /* un canone è un mese dopo l'altro: ogni mese la sua attività, con dentro
         cosa comprende. Quelli passati nascono fatti. */
      var cosa = mod.att.map(function (a) { return a.n || a.nome; }).filter(Boolean).join(" · ");
      for (var m = 0; m < cicli; m++) {
        var dal = aggMesi(inizio, m), al = fineMese(dal);
        var tit = (nome + " — " + meseEt(dal.slice(0, 7))).slice(0, 200);
        if (gia.indexOf(tit) > -1) continue;
        var passato = al < oggi, corrente = !passato && dal <= oggi;
        nuove.push({
          titolo: tit, commessa_id: kid, cliente_id: k.cliente_id || null, progetto_id: pid,
          assegnato_id: chi || null, stato: passato ? "Fatto" : corrente ? "In corso" : "Da fare",
          priorita: "Media", ordine: m + 1, inizio: dal, scadenza: al,
          completata_il: passato ? al + "T18:00:00Z" : null,
          stimate: null, sezione: nome.slice(0, 80), descrizione: cosa || null
        });
      }
    } else {
      mod.att.forEach(function (a, j) {
        var tit2 = String(a.n || a.nome || "Attività").slice(0, 200);
        if (gia.indexOf(tit2) > -1) return;
        gia.push(tit2);
        nuove.push({
          titolo: tit2, commessa_id: kid, cliente_id: k.cliente_id || null, progetto_id: pid,
          assegnato_id: chi || null, stato: "Da fare", priorita: "Media", ordine: j + 1,
          stimate: null, sezione: nome.slice(0, 80)
        });
      });
    }
    if (nuove.length) {
      var nt = await sb.from("task").insert(nuove);
      if (nt.error) { toast(erroreUmano(nt.error), true); return fatti; }
      fatti.a += nuove.length;
    }
  }
  if (fatti.p || fatti.a) await logEv(kid, "Lavoro aperto: " + fatti.p + " progetti e " + fatti.a + " attività");
  await sb.from("commesse").update({ avviato: true }).eq("id", kid);
  await reload(["prog", "task", "righe", "com", "ev"]);
  return fatti;
}
function esitoLavoro(f) {
  if (!f.p && !f.a) return "C'era già tutto: nessun doppione.";
  return "Aperti " + f.p + " progett" + (f.p === 1 ? "o" : "i") + " e " + f.a + " attività.";
}
async function avviaLavoro(kid) {
  var righe = righeOf(kid).filter(function (r) { return !r.opzionale && r.tipo !== "Sconto"; });
  if (!righe.length) { toast("Il preventivo non ha voci da cui partire"); return; }
  toast("Sto aprendo il lavoro…");
  var f = await apriIlLavoro(kid);
  toast(esitoLavoro(f));
  render();
}
/* Il passaggio di momento non è un campo come gli altri: si segna la data, si
   congela il numero quando il preventivo parte, e all'accettazione nascono
   progetti e attività. Una cosa sola, perché nella testa di chi lavora è una
   cosa sola. */
async function cambiaStato(kid, val, quando) {
  var k = by(D.com, kid) || {};
  if (!k.id || k.stato === val) return;
  /* Chiudere il lavoro non chiude il conto: se restano soldi fuori lo dico,
     senza impedire niente. Il credito deve restare visibile. */
  if (val === "Completato") {
    var fuori = pagOf(kid).filter(function (p) { return p.stato !== "Incassato"; });
    if (fuori.length) {
      var quanto = sum(fuori, function (p) { return p.importo; });
      if (!confirm("Chiudo il lavoro, ma restano " + eur(quanto) + " da incassare su " +
                   fuori.length + (fuori.length === 1 ? " scadenza" : " scadenze") +
                   ".\nLe scadenze restano aperte in Amministrazione. Procedo?")) return;
    }
  }
  var patch = { stato: val };
  if (STATO_DATA[val] && (quando || !k[STATO_DATA[val]])) patch[STATO_DATA[val]] = quando || today();
  if (val !== "Bozza" && !k.numero) patch.numero = numeroDoc(k);
  var eraAvviato = k.avviato;
  /* tornando indietro si cancellano le date dei passaggi successivi */
  var iv = STATI.indexOf(val), ic = STATI.indexOf(k.stato);
  if (iv > -1 && iv < ic) {
    STATI.slice(iv + 1).forEach(function (st) { if (STATO_DATA[st]) patch[STATO_DATA[st]] = null; });
    if (val === "Bozza" || val === "Inviato") patch.avviato = false;
  }
  if (val === "Bozza" && k.stato === "Perso") { patch.avviato = false; patch.inviato_il = null; patch.accettato_il = null; patch.completato_il = null; }
  if (val === "Perso") {
    var apertiP = progOf(kid).filter(function (p) { return p.stato !== "Completato"; }).length;
    var aperteT = taskOf(kid).filter(function (t) { return t.stato !== "Fatto"; }).length;
    var daInc = pagOf(kid).filter(function (p) { return p.stato !== "Incassato"; }).length;
    if (apertiP || aperteT || daInc) {
      if (!confirm("Preventivo perso. Tolgo anche " + [aperteT ? aperteT + " attività aperte" : "", daInc ? daInc + " scadenze da incassare" : ""].filter(Boolean).join(" e ") + (apertiP ? " e sospendo " + apertiP + " progetti" : "") + "? Le note e i file restano.")) { render(); return; }
    }
  }
  if (!await salvaSubito("com", kid, patch)) return;
  await logEv(kid, "Preventivo " + val.toLowerCase());
  if (val === "Completato") await chiudiLavoro(kid);
  if (val === "Perso") await sospendiLavoro(kid);
  await reload(["ev"]);
  if (val === "Accettato" && !eraAvviato) { await accettaPreventivo(kid); return; }
  toast("Preventivo " + val.toLowerCase());
  render();
}
/* Il lavoro finito chiude tutto quello che c'è sotto. */
async function chiudiLavoro(kid) {
  var pg = progOf(kid).filter(function (p) { return p.stato !== "Completato"; }).map(function (p) { return p.id; });
  var tk = taskOf(kid).filter(function (t) { return t.stato !== "Fatto"; }).map(function (t) { return t.id; });
  if (pg.length) await sb.from("progetti").update({ stato: "Completato", avanzamento: 100 }).in("id", pg);
  if (tk.length) await sb.from("task").update({ stato: "Fatto", completata_il: new Date().toISOString() }).in("id", tk);
  if (pg.length || tk.length) await logEv(kid, "Chiusi " + pg.length + " progetti e " + tk.length + " attività col preventivo");
  await reload(["prog", "task"]);
}
/* Il lavoro perso non lascia code: via le attività mai fatte e le scadenze mai
   dovute; i progetti restano, sospesi, con dentro note e file. */
async function sospendiLavoro(kid) {
  var tk = taskOf(kid).filter(function (t) { return t.stato !== "Fatto"; }).map(function (t) { return t.id; });
  var pg = pagOf(kid).filter(function (p) { return p.stato !== "Incassato"; }).map(function (p) { return p.id; });
  var pr = progOf(kid).filter(function (p) { return p.stato !== "Completato"; }).map(function (p) { return p.id; });
  if (tk.length) await sb.from("task").delete().in("id", tk);
  if (pg.length) await sb.from("pagamenti").delete().in("id", pg);
  if (pr.length) await sb.from("progetti").update({ stato: "Sospeso" }).in("id", pr);
  await reload(["task", "pag", "prog"]);
}
/* Quando cambia un'attività, il progetto sopra si accorge: tutte fatte → completato,
   qualcuna in mano → in corso. */
async function dopoAttivita(tid) {
  var t = by(D.task, tid); if (!t || !t.progetto_id) return;
  var p = by(D.prog, t.progetto_id); if (!p) return;
  var radici = taskOfProg(p.id).filter(function (x) { return !x.padre_id; });
  if (!radici.length) return;
  var fatte = radici.filter(function (x) { return x.stato === "Fatto"; }).length;
  var mosse = radici.filter(function (x) { return x.stato !== "Da fare"; }).length;
  var nuovo = fatte === radici.length ? "Completato" : mosse ? "In corso" : "Da iniziare";
  if (nuovo === p.stato) return;
  var r = await sb.from("progetti").update({ stato: nuovo, avanzamento: nuovo === "Completato" ? 100 : avanzProg(p) }).eq("id", p.id);
  if (r.error) return;
  await reload(["prog"]);
  if (nuovo === "Completato") {
    toast("Progetto «" + p.nome + "» completato");
    var k = by(D.com, p.commessa_id);
    if (k && k.stato === "Accettato" && progOf(k.id).every(function (x) { return x.stato === "Completato"; })) toast("Tutti i progetti sono finiti: puoi segnare «Il lavoro è finito» sul preventivo.");
  }
}
/* All'accettazione i soldi prendono forma: un canone al mese sulle voci
   ricorrenti, un saldo alla consegna sul resto. Solo se non c'è già un piano. */
async function scadenzeDaAccettazione(kid) {
  var k = by(D.com, kid); if (!k || pagOf(kid).length) return 0;
  var out = [], partenza = k.accettato_il || today(), unaTantum = 0;
  righeOf(kid).filter(function (r) { return !r.opzionale && r.tipo !== "Sconto"; }).forEach(function (r) {
    var rc = rigaCalc(r);
    if (r.ricorrente && r.periodo !== "Annuale") {
      var da = r.inizio || partenza, per = Math.round(rc.pu * rc.q * (1 - rc.sc));
      for (var m = 0; m < rc.cic; m++) {
        var dm = aggMesi(da, m);
        out.push({ commessa_id: kid, nome: (rc.nome + " — " + meseEt(dm.slice(0, 7))).slice(0, 140), importo: per, scadenza: fineMese(dm), stato: "Da incassare" });
      }
    } else unaTantum += rc.prezzo;
  });
  if (k.sconto) unaTantum = Math.round(unaTantum * (1 - (+k.sconto || 0) / 100));
  if (unaTantum > 0) out.push({ commessa_id: kid, nome: "Saldo alla consegna", importo: unaTantum, scadenza: k.scadenza || aggGiorni(partenza, 30), stato: "Da incassare" });
  if (!out.length) return 0;
  var r = await sb.from("pagamenti").insert(out);
  if (r.error) { toast("Le scadenze non sono state create: " + erroreUmano(r.error), true); return 0; }
  await reload(["pag"]);
  return out.length;
}
function aggGiorni(d, n) { var x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
async function accettaPreventivo(kid) {
  var k0 = by(D.com, kid), c0 = k0 ? by(D.cli, k0.cliente_id) : null;
  if (c0 && (c0.stato === "Lead" || c0.stato === "Dormiente")) { await sb.from("clienti").update({ stato: "Attivo" }).eq("id", c0.id); await reload(["cli"]); }
  var f = await apriIlLavoro(kid);
  var n = await scadenzeDaAccettazione(kid);
  toast("Accettato. " + esitoLavoro(f) + (n ? " Create " + n + " scadenze di pagamento." : ""));
  render();
}
/* Prima di avviare un timer nuovo, quello vecchio si chiude e le sue ore restano. */
async function primaFermaTimer() {
  var tm = timerMio(); if (!tm) return true;
  var dove = tm.task_id ? nameOf(D.task, tm.task_id, "titolo") : tm.lavorazione_id ? nameOf(D.lav, tm.lavorazione_id) : nameOf(D.com, tm.commessa_id, "titolo");
  if (!confirm("Hai già un timer acceso su «" + dove + "» da " + durata(tm.iniziato) + ". Lo fermo, registro le ore e parto col nuovo?")) return false;
  await stopTimer(true);
  return true;
}
/* Un timer dimenticato acceso per una notte non deve scrivere dodici ore: si chiede. */
async function timerDimenticato() {
  var tm = timerMio(); if (!tm) return;
  var oreT = (Date.now() - new Date(tm.iniziato).getTime()) / 3600000;
  if (oreT < 10) return;
  var quando = new Date(tm.iniziato);
  var risp = prompt("Hai un timer acceso dal " + quando.toLocaleDateString("it-IT") + " alle " + quando.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) + " (" + num(oreT, 1) + " ore). Quante ore vuoi registrare davvero su quel giorno? (0 per buttarlo)", "4");
  if (risp === null) return;
  var ore = Math.round((parseFloat(String(risp).replace(",", ".")) || 0) * 10) / 10;
  await stopTimer(true, ore);
}
async function stopTimer(zitto, oreForzate) {
  var tm = timerMio(); if (!tm) return;
  var ore = oreForzate != null ? oreForzate : Math.round((Date.now() - new Date(tm.iniziato).getTime()) / 360000) / 10;
  var giorno = iso(new Date(tm.iniziato));
  await sb.from("timer").delete().eq("pro_id", me.pro_id);
  if (ore >= 0.1) {
    var p = by(D.pros, me.pro_id);
    var r = await sb.from("ore").insert({ pro_id: me.pro_id, commessa_id: tm.commessa_id, progetto_id: tm.progetto_id || null, lavorazione_id: tm.lavorazione_id || null, task_id: tm.task_id || null, data: giorno, ore: ore, tariffa: p ? p.tariffa_oraria : 0, fatturabile: true, descrizione: tm.task_id ? nameOf(D.task, tm.task_id, "titolo") : tm.lavorazione_id ? nameOf(D.lav, tm.lavorazione_id) : "Sessione di lavoro" });
    if (r.error) { toast(erroreUmano(r.error), true); }
    else toast("Registrate " + num(ore, 1) + " h");
  } else if (!zitto) toast("Sessione troppo breve, non registrata");
  await reload(["tmr", "ore"]); if (!zitto) render();
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
    var r = await sb.from("ore").insert({ pro_id: me.pro_id, lavorazione_id: lid, progetto_id: lav ? lav.progetto_id : null, commessa_id: lav ? lav.commessa_id : null, data: data, ore: v, tariffa: p ? p.tariffa_oraria : 0, fatturabile: true, descrizione: lav ? lav.nome : "Ore della settimana" });
    if (r.error) { toast(erroreUmano(r.error), true); return; }
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
async function uploadFile(files, ctx) {
  var dove = ctxLeggi(ctx);
  toast("Carico " + files.length + (files.length === 1 ? " file…" : " file…"));
  var cartella = dove.commessa_id || dove.riunione_id || me.pro_id || "personali";
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var path = cartella + "/" + Date.now() + "-" + f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var up = await sb.storage.from("materiali").upload(path, f);
    if (up.error) { toast(erroreUmano(up.error), true); continue; }
    var est = (f.name.split(".").pop() || "").toLowerCase();
    var tipo = ["jpg", "jpeg", "png", "gif", "webp", "heic"].indexOf(est) > -1 ? "Immagine" : ["pdf"].indexOf(est) > -1 ? "Documento" : ["mp4", "mov"].indexOf(est) > -1 ? "Video" : "File";
    var riga = { nome: f.name, path: path, dim: f.size, tipo: tipo, visibile_cliente: false, caricato_da: me.pro_id };
    riga.commessa_id = dove.commessa_id; riga.progetto_id = dove.progetto_id;
    riga.lavorazione_id = dove.lavorazione_id; riga.task_id = dove.task_id; riga.riunione_id = dove.riunione_id;
    var ri = await sb.from("materiali").insert(riga);
    if (ri.error) { toast(erroreUmano(ri.error), true); }
  }
  if (dove.commessa_id) await logEv(dove.commessa_id, "Caricati file nei materiali");
  await reload(["mat", "ev"]); toast("File caricati"); render();
}

document.addEventListener("submit", function (e) {
  var f = e.target;
  if (f.dataset.busy) { e.preventDefault(); return; }
  f.dataset.busy = "1";
  var fine = function () { delete f.dataset.busy; };
  var pr = invioModulo(e, f);
  if (pr && pr.then) pr.then(fine, function (err) { fine(); toast(erroreUmano(err), true); }); else fine();
});
async function invioModulo(e, f) {
  if (f.id === "loginform") { e.preventDefault(); return doLogin(f); }
  if (f.dataset.save) { e.preventDefault(); return saveForm(f); }
  if (f.dataset.duplForm) { e.preventDefault(); var td = (f.titolo.value || "").trim(); if (!td) return; return duplicaDavvero(f.dataset.duplForm, td, f.cliente_id.value); }
  if (f.dataset.post) {
    e.preventDefault();
    var tp = (f.testo.value || "").trim(); if (!tp) return;
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var rp1 = await sb.from("post").insert({ pro_id: me.pro_id, testo: tp, tipo: f.tipo ? f.tipo.value : "Messaggio" });
    if (rp1.error) { toast(erroreUmano(rp1.error), true); return; }
    f.testo.value = "";
    await reload(["post"]); toast("Pubblicato"); render(); return;
  }
  if (f.dataset.risp) {
    e.preventDefault();
    var tr = (f.testo.value || "").trim(); if (!tr) return;
    var rr1 = await sb.from("post_risp").insert({ post_id: f.dataset.risp, pro_id: me.pro_id, testo: tr });
    if (rr1.error) { toast(erroreUmano(rr1.error), true); return; }
    await reload(["risp"]); render(); return;
  }
  if (f.dataset.msg) {
    e.preventDefault();
    var tm = (f.testo.value || "").trim(); if (!tm) return;
    if (!me.pro_id) { toast("Il tuo utente non è collegato al pool", true); return; }
    var rm1 = await sb.from("messaggi").insert({ canale_id: f.dataset.msg, pro_id: me.pro_id, testo: tm });
    if (rm1.error) { toast(erroreUmano(rm1.error), true); return; }
    f.testo.value = "";
    await sb.from("letture").upsert({ canale_id: f.dataset.msg, pro_id: me.pro_id, letto_il: new Date().toISOString() }, { onConflict: "canale_id,pro_id" });
    await reload(["msg", "lett"]); render(); return;
  }
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
    if (r.error) { toast(erroreUmano(r.error), true); return; }
    await reload(["righe"]); closeModal(); toast("Voce salvata");
    if (f.dataset.page) { FDIRTY = false; FBACK = null; go("commessa", kid, "servizi"); return; }
    render(); return;
  }
  if (f.dataset.linkSave) {
    e.preventDefault();
    var ok = await salvaLink(f.dataset.linkSave, {
      url: f.url.value, nome: f.nome.value, tipo: f.tipo.value,
      note: f.note.value, visibile_cliente: f.visibile_cliente.value === "si"
    });
    if (ok) { closeModal(); render(); }
    return;
  }
  if (f.dataset.servAddSave) {
    e.preventDefault();
    var sv9 = by(D.serv, f.dataset.servAddSave); if (!sv9) return;
    var kid9 = f.commessa_id.value; if (!kid9) { toast("Scegli un preventivo", true); return; }
    var riga9 = {
      commessa_id: kid9, serv_id: sv9.id, tipo: "Servizio", nome: sv9.nome, descrizione: sv9.descrizione,
      qty: +f.qty.value || 1, unita: sv9.unita || null,
      prezzo_unit: f.prezzo_unit.value === "" ? sv9.prezzo : +f.prezzo_unit.value,
      costo_unit: f.costo_unit.value === "" ? sv9.costo : +f.costo_unit.value,
      assegnato_id: sv9.pro_id, stato: "Da iniziare"
    };
    var rsa = await sb.from("righe").insert(riga9);
    if (rsa.error) { toast(erroreUmano(rsa.error), true); return; }
    await logEv(kid9, "Aggiunto al preventivo: " + sv9.nome + " di " + nameOf(D.pros, sv9.pro_id));
    await reload(["righe", "ev"]); closeModal();
    toast(sv9.nome + " aggiunto"); go("commessa", kid9, "servizi"); return;
  }
  if (f.dataset.tsadd) {
    e.preventDefault();
    var lid9 = f.lav.value; if (!lid9) return;
    if (TSEXTRA.indexOf(lid9) === -1) TSEXTRA.push(lid9);
    render(); return;
  }
  if (f.dataset.imapCollega) {
    e.preventDefault();
    var bi = f.querySelector("button[type=submit]"); if (bi) { bi.disabled = true; bi.textContent = "Provo la casella…"; }
    try {
      var ji = await chiamaImap({ azione: "collega", email: f.email.value.trim(), password: f.password.value, utente: f.utente.value.trim(), imap_host: f.imap_host.value.trim(), imap_port: 993, smtp_host: f.smtp_host.value.trim(), smtp_port: +f.smtp_port.value });
    } catch (x) { toast(String(x && x.message || x), true); if (bi) { bi.disabled = false; bi.textContent = "Prova e collega"; } return; }
    f.password.value = "";
    await reload(["mconn"]); closeModal(); GM.chiave = ""; toast("Casella collegata: " + (ji.email || "")); render(); return;
  }
  if (f.dataset.gmailCerca) {
    e.preventDefault(); GM.cerca = f.q.value || ""; GM.msg = null; render(); return;
  }
  if (f.dataset.gmailInvia) {
    e.preventDefault();
    var bt = f.querySelector("button[type=submit]"); if (bt) { bt.disabled = true; bt.textContent = "Invio…"; }
    var jm;
    try {
      jm = await chiamaPosta({ azione: "mail_send", a: f.a.value.trim(), cc: f.cc.value.trim(), oggetto: f.oggetto.value.trim(), testo: f.testo.value, threadId: f.threadId.value || null, inReplyTo: f.inReplyTo.value || null, references: f.references.value || null });
    } catch (x) { toast(String(x && x.message || x), true); if (bt) { bt.disabled = false; bt.textContent = "Invia"; } return; }
    var cidM = f.cliente_id.value;
    if (cidM && f.diario && f.diario.checked) await segnaNelDiario({ id: jm.id, inviato: true, a: f.a.value, da: jm.da, oggetto: f.oggetto.value, data: new Date().toISOString(), snippet: f.testo.value.slice(0, 300) }, cidM);
    var dopo = (f.dopo.value || "").split(":");
    if (dopo[0] === "prev") { var kd = by(D.com, dopo[1]); if (kd && kd.stato === "Bozza") await salvaSubito("com", kd.id, { stato: "Inviato" }); }
    if (dopo[0] === "inc") { var idd = by(D.inc, dopo[1]); if (idd && idd.stato === "Bozza") await salvaSubito("inc", idd.id, { stato: "Inviata", inviata_il: new Date().toISOString() }); }
    closeModal(); toast("Inviata da " + (jm.da || "Gmail")); GM.chiave = ""; if (cidM) delete GM.cli[cidM]; render(); return;
  }
  if (f.dataset.recMetti) {
    e.preventDefault();
    var rm9 = by(D.riu, f.dataset.recMetti); if (!rm9) return;
    var agg = function (vecchio, nuovo) { nuovo = (nuovo || "").trim(); if (!nuovo) return vecchio || null; return ((vecchio || "").trim() ? vecchio.trim() + "\n\n" : "") + nuovo; };
    var pm = { note: agg(rm9.note, f.note.value), decisioni: agg(rm9.decisioni, f.decisioni.value), prossimi: agg(rm9.prossimi, f.prossimi.value) };
    var rq9 = await sb.from("riunioni").update(pm).eq("id", rm9.id);
    if (rq9.error) { toast(erroreUmano(rq9.error), true); return; }
    await reload(["riu"]); closeModal(); toast("Messi nella riunione: da «Prossimi passi» crei le attività con un clic"); render(); return;
  }
  if (f.dataset.mprevForm) {
    e.preventDefault();
    var km = by(D.com, f.dataset.mprevForm); if (!km) return;
    var nomeM = (f.nome.value || "").trim(); if (!nomeM) return;
    var std = f.standard && f.standard.checked && puo("studio");
    var rm = await sb.from("modelli_prev").insert({ pro_id: std ? null : me.pro_id, nome: nomeM, descrizione: (f.descrizione.value || "").trim() || null,
      condiviso: std || (f.condiviso && f.condiviso.checked), standard: !!std, contenuto: contenutoDaFoglio(km) });
    if (rm.error) { toast(erroreUmano(rm.error), true); return; }
    await reload(["mprev"]); closeModal(); toast("Modello «" + nomeM + "» salvato"); return;
  }
  if (f.dataset.qnew) {
    e.preventDefault();
    var inq = f.querySelector("input"), txq = inq.value.trim(); if (!txq) return;
    var cq = capisciTask(txq, f.dataset.qnew);
    if (!cq.riga.titolo) return;
    var rq = await sb.from("task").insert(cq.riga);
    if (rq.error) { toast(erroreUmano(rq.error), true); return; }
    inq.value = ""; var hq = el("#qhint"); if (hq) hq.innerHTML = "";
    await reload(["task"]); render();
    var i2 = el("#tnuova"); if (i2) i2.focus();
    toast("Aggiunta" + (cq.riga.scadenza ? " · " + etichettaGiorno(cq.riga.scadenza).toLowerCase() : "") + (cq.riga.assegnato_id !== me.pro_id ? " · " + nameOf(D.pros, cq.riga.assegnato_id) : ""));
    return;
  }
  if (f.dataset.qaddSub) {
    e.preventDefault();
    var tsub = f.titolo.value.trim(); if (!tsub) return;
    var pd = by(D.task, f.dataset.qaddSub); if (!pd) return;
    var rqs = await sb.from("task").insert({ titolo: tsub, padre_id: pd.id, commessa_id: pd.commessa_id, progetto_id: pd.progetto_id, lavorazione_id: pd.lavorazione_id, assegnato_id: pd.assegnato_id || me.pro_id, creato_da: me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rqs.error) { toast(erroreUmano(rqs.error), true); return; }
    f.titolo.value = ""; await reload(["task"]); render(); return;
  }
  if (f.dataset.commTask) {
    e.preventDefault();
    var testo = f.testo.value.trim(); if (!testo) return;
    var rct = await sb.from("commenti").insert({ task_id: f.dataset.commTask, pro_id: me.pro_id, testo: testo });
    if (rct.error) { toast(erroreUmano(rct.error), true); return; }
    f.testo.value = ""; await reload(["comm"]); render(); return;
  }
  if (f.dataset.dipAdd) {
    e.preventDefault();
    var bl = f.blocca.value; if (!bl) return;
    var rda = await sb.from("task_dip").insert({ task_id: f.dataset.dipAdd, blocca_id: bl });
    if (rda.error) { toast(erroreUmano(rda.error), true); return; }
    await reload(["dip"]); render(); return;
  }
  if (f.dataset.qaddLav) {
    e.preventDefault();
    var titl = f.titolo.value.trim(); if (!titl) return;
    var lv2 = by(D.lav, f.dataset.qaddLav);
    var rql = await sb.from("task").insert({ titolo: titl, commessa_id: lv2 ? lv2.commessa_id : null, progetto_id: lv2 ? lv2.progetto_id : null, lavorazione_id: f.dataset.qaddLav, assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rql.error) { toast(erroreUmano(rql.error), true); return; }
    f.titolo.value = "";
    await reload(["task"]); render();
    return;
  }
  if (f.dataset.qadd) {
    e.preventDefault();
    var tit = f.titolo.value.trim(); if (!tit) return;
    var rq = await sb.from("task").insert({ titolo: tit, commessa_id: f.dataset.qadd, assegnato_id: me.pro_id, stato: "Da fare", priorita: "Media" });
    if (rq.error) { toast(erroreUmano(rq.error), true); return; }
    f.titolo.value = "";
    await reload(["task"]); render();
    var inp = document.querySelector(".qadd input"); if (inp) inp.focus();
    return;
  }
  if (f.dataset.ask) {
    e.preventDefault();
    var q = f.q.value.trim(); if (!q) return;
    f.q.value = "";
    await mandaDomanda(q);
    return;
  }
  if (f.dataset.chat) {
    e.preventDefault();
    var tx = f.testo.value.trim(); if (!tx) return;
    var rch = await sb.from("commenti").insert({ commessa_id: f.dataset.chat, pro_id: me.pro_id, testo: tx });
    if (rch.error) { toast(erroreUmano(rch.error), true); return; }
    f.testo.value = "";
    await reload(["comm"]); render();
    return;
  }
  if (f.dataset.form === "settings") {
    e.preventDefault();
    var v = +f.fee_default.value || 0;
    var rs = await sb.from("settings").update({ fee_default: v }).eq("id", 1);
    if (rs.error) { toast(erroreUmano(rs.error), true); return; }
    SET.fee_default = v; toast("Impostazioni salvate"); return;
  }
  if (f.dataset.form === "password") {
    e.preventDefault();
    var pw = f.pw.value || "";
    if (pw.length < 8) { toast("La password deve avere almeno 8 caratteri", true); return; }
    var rp = await sb.auth.updateUser({ password: pw });
    if (rp.error) { toast(erroreUmano(rp.error), true); return; }
    f.pw.value = ""; toast("Password aggiornata"); return;
  }
}

document.addEventListener("change", function (e) {
  if (e.target.dataset && e.target.dataset.persp) { persp = e.target.value; render(); }
});
document.addEventListener("input", function (e) {
  if (e.target.closest && e.target.closest("form.fpage")) {
    FDIRTY = true;
    var fst = el("#fstat"); if (fst) fst.textContent = "modifiche non salvate";
  }
  if (e.target.id === "palq") renderPal(e.target.value);
  if (e.target.id === "tnuova") { var hq9 = el("#qhint"); if (hq9) hq9.innerHTML = capisciTask(e.target.value, e.target.form.dataset.qnew).hint; }
  if (e.target.id === "tdesc") {
    var vald = e.target.value, tid9 = e.target.dataset.tid || current, std = el("#tstat");
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
  if (e.target.dataset && e.target.dataset.rf) { RF[e.target.dataset.rf] = e.target.value; render(); return; }
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
  if (e.target.dataset && e.target.dataset.autosave) {
    var az = e.target.dataset.autosave.split("|"), valA = e.target.value, stA = el("#notestat");
    if (stA) stA.textContent = "scrivo…";
    clearTimeout(NOTET);
    NOTET = setTimeout(async function () {
      var patchA = {}; patchA[az[1]] = valA;
      var rA = await sb.from(TB[az[0]]).update(patchA).eq("id", az[2]);
      applicaLocale(az[0], az[2], patchA);
      var sA = el("#notestat"); if (sA) sA.textContent = rA.error ? "errore: " + erroreUmano(rA.error) : "salvato";
      setTimeout(function () { var s3 = el("#notestat"); if (s3) s3.textContent = ""; }, 2200);
    }, 800);
    return;
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

/* Dentro il documento si scrive direttamente sul foglio: quando lasci un campo
   il valore va nel database e i totali si rifanno. */
var EDNUM = ["qty", "prezzo_unit", "costo_unit", "sconto", "importo", "ore_stimate", "cicli", "validita", "iva"];
var EDDATA = ["data", "scadenza", "inizio", "pagato_il"];
document.addEventListener("focusout", async function (e) {
  var t = e.target;
  /* la lettera d'incarico: titolo, premessa, articoli, chiusura */
  if (t && t.dataset && t.dataset.inc) {
    var pi = t.dataset.inc.split("|"), ii9 = by(D.inc, pi[0]); if (!ii9 || ii9.stato === "Firmata") return;
    var tI = (t.innerText || "").replace(/ /g, " ").replace(/\s+$/, "");
    if (!t.dataset.multi) tI = tI.replace(/\s*\n\s*/g, " ").trim();
    if (t.dataset.prima !== undefined && t.dataset.prima === tI) return;
    if (pi[1] === "titolo") { if (await salvaSubito("inc", ii9.id, { titolo: tI || "Lettera d'incarico" })) toast("Salvato"); return; }
    var tx9 = JSON.parse(JSON.stringify(ii9.testo || {})); tx9.articoli = tx9.articoli || [];
    var ma = /^a(\d+)\.(t|x)$/.exec(pi[1]);
    if (ma) { if (!tx9.articoli[+ma[1]]) return; tx9.articoli[+ma[1]][ma[2]] = tI; } else tx9[pi[1]] = tI;
    if (await salvaSubito("inc", ii9.id, { testo: tx9 })) toast("Salvato");
    return;
  }
  /* le sezioni stanno tutte in un campo solo: lo riscrivo intero */
  if (t && t.dataset && t.dataset.sez) {
    var ps = t.dataset.sez.split("|"), ks = by(D.com, ps[0]); if (!ks) return;
    var testoS = (t.innerText || "").replace(/ /g, " ").replace(/\s+$/, "");
    if (!t.dataset.multi) testoS = testoS.replace(/\s*\n\s*/g, " ").trim();
    if (t.dataset.prima !== undefined && t.dataset.prima === testoS) return;
    var lista = sezioniDi(ks).map(function (s) { return { t: s.t, d: s.d, x: s.x, v: (s.v || []).slice() }; });
    var sz = lista[+ps[1]]; if (!sz) return;
    if (ps[2] === "t") sz.t = testoS;
    else if (ps[2] === "x") sz.x = testoS;
    else if (ps[2].charAt(0) === "v") sz.v[+ps[2].slice(1)] = testoS;
    if (await salvaSezioni(ps[0], lista)) { toast("Salvato"); render(); }
    return;
  }
  if (!t || !t.dataset || !t.dataset.ed) return;
  var pz = t.dataset.ed.split("|"), tbk = pz[0], campo = pz[1], rid = pz[2];
  if (!rid) return;
  var testo = (t.innerText || "").replace(/ /g, " ").replace(/\s+$/, "");
  if (!t.dataset.multi) testo = testo.replace(/\s*\n\s*/g, " ").trim();
  var prima = t.dataset.prima;
  if (prima !== undefined && prima === testo) return;
  var val;
  if (EDDATA.indexOf(campo) > -1) {
    val = testo === "" ? null : dataIt(testo);
    if (testo !== "" && !val) { toast("Data non capita: scrivila come 12/03/2026", true); t.innerText = t.dataset.prima || ""; return; }
  } else if (EDNUM.indexOf(campo) > -1) {
    var n = parseFloat(testo.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    val = isNaN(n) ? null : n;
  } else val = testo === "" ? null : testo;
  var patch = {}; patch[campo] = val;
  if (await salvaSubito(tbk, rid, patch)) toast("Salvato");
  render();
});
document.addEventListener("focusin", function (e) {
  var t = e.target;
  if (t && t.dataset && (t.dataset.ed || t.dataset.sez || t.dataset.inc)) t.dataset.prima = (t.innerText || "").replace(/ /g, " ").trim();
});
document.addEventListener("keydown", function (e) {
  var t = e.target;
  if (!t || !t.dataset || !(t.dataset.ed || t.dataset.sez)) return;
  if (e.key === "Escape") { t.innerText = t.dataset.prima || ""; t.blur(); return; }
  if (e.key === "Enter" && !t.dataset.multi) { e.preventDefault(); t.blur(); }
});
/* incollando testo formattato tengo solo le parole */
document.addEventListener("paste", function (e) {
  var t = e.target;
  if (!t || !t.dataset || !(t.dataset.ed || t.dataset.sez)) return;
  e.preventDefault();
  var txt = (e.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, t.dataset.multi ? txt : txt.replace(/\s*\n\s*/g, " "));
});

document.addEventListener("change", async function (e) {
  /* campo a modifica immediata su qualsiasi scheda: tabella|campo|id */
  if (e.target.dataset && e.target.dataset.qset) {
    var pz = e.target.dataset.qset.split("|"), tbk = pz[0], campo = pz[1], rid = pz[2];
    var val = e.target.value;
    var BOOLQ = ["visibile_cliente", "fatturabile", "opzionale", "ricorrente", "mostra_ore", "mostra_stato"];
    if (e.target.type === "checkbox") val = !!e.target.checked;
    else if (BOOLQ.indexOf(campo) > -1) val = (val === "si");
    else if (val === "") val = null;
    else if (e.target.type === "number") val = +val;
    var patch = {}; patch[campo] = val;
    /* spostare una cosa da un progetto a un altro sposta anche il preventivo sotto */
    if (campo === "progetto_id" && val) { var pg9 = by(D.prog, val); if (pg9) patch.commessa_id = pg9.commessa_id; }
    if (campo === "lavorazione_id" && val) { var lv9 = by(D.lav, val); if (lv9) { patch.progetto_id = lv9.progetto_id; patch.commessa_id = lv9.commessa_id; } }
    if (tbk === "task" && campo === "stato" && val === "Fatto") patch.completata_il = new Date().toISOString();
    /* Il preventivo che cambia momento non è un campo come gli altri: si segna la
       data del passaggio, si congela il numero quando parte, e all'accettazione
       nascono progetti e attività. */
    if (tbk === "com" && campo === "stato") { await cambiaStato(rid, val); return; }
    /* dal foglio: un cliente nuovo si crea al volo, con il nome e basta */
    if (tbk === "com" && campo === "cliente_id" && val === "__nuovo") {
      var nomeNc = prompt("Come si chiama il cliente?"); if (!nomeNc) { render(); return; }
      var rnc = await sb.from("clienti").insert({ nome: nomeNc.trim(), stato: "Lead", owner_id: me.pro_id }).select().single();
      if (rnc.error) { toast(erroreUmano(rnc.error), true); return; }
      await reload(["cli"]); val = rnc.data.id; patch = { cliente_id: val };
    }
    if (tbk === "com" && campo === "cliente_id") CAMBIACLI = null;
    if (await salvaSubito(tbk, rid, patch)) toast("Salvato");
    if (tbk === "set") SET = D.set[0] || SET;
    if (tbk === "task" && campo === "stato") await dopoAttivita(rid);
    render(); return;
  }
  /* filtri di sezione: ambito|campo */
  if (e.target.dataset && e.target.dataset.f) {
    var fz = e.target.dataset.f.split("|");
    if (FS[fz[0]]) { FS[fz[0]][fz[1]] = e.target.value; render(); }
    return;
  }
  if (e.target.dataset && e.target.dataset.comvista) { COMVISTA = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.tf) { TF[e.target.dataset.tf] = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.incVedi) { INCVEDI = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.imapPreset) {
    var cs = CASELLE.filter(function (c) { return c[0] === e.target.value; })[0], fp = e.target.form;
    if (cs && fp) { if (cs[2]) fp.imap_host.value = cs[2]; if (cs[3]) fp.smtp_host.value = cs[3]; fp.smtp_port.value = cs[0] === "outlook" || cs[0] === "libero" ? "587" : "465"; if (cs[0] === "altro") { fp.imap_host.value = ""; fp.smtp_host.value = ""; } }
    return;
  }
  if (e.target.dataset && e.target.dataset.pcfg) {
    var cp = e.target.dataset.pcfg, vp = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (cp === "slug") { vp = slugDa(vp); e.target.value = vp; if (!vp) { toast("L'indirizzo non può essere vuoto", true); return; } }
    if (["durata", "buffer", "anticipo_ore", "orizzonte_giorni"].indexOf(cp) > -1) vp = +vp || 0;
    var pt = {}; pt[cp] = vp;
    if (await salvaPcfg(pt)) { toast(cp === "attivo" ? (vp ? "Prenotazioni aperte" : "Prenotazioni chiuse") : "Salvato"); if (cp === "attivo" || cp === "slug") render(); }
    return;
  }
  if (e.target.dataset && e.target.dataset.pcfgGiorno) {
    var cg = pcfgMia(); if (!cg) return;
    var settN = Object.assign({}, cg.settimana || {}); var fin = finestreDaTxt(e.target.value);
    if (fin.length) settN[e.target.dataset.pcfgGiorno] = fin; else delete settN[e.target.dataset.pcfgGiorno];
    e.target.value = finestreTxt(fin);
    if (await salvaPcfg({ settimana: settN })) toast("Orari salvati");
    return;
  }
  if (e.target.dataset && e.target.dataset.recFile) {
    var fa = e.target.files && e.target.files[0]; if (!fa) return;
    if (fa.size > 24 * 1024 * 1024) { toast("File troppo grande: massimo 24 MB (circa un'ora a bassa qualità). Registra dal CRM per gli incontri lunghi.", true); return; }
    if (REC) { toast("C'è già una registrazione in corso", true); return; }
    REC = { riu: e.target.dataset.recFile, parti: [fa], lavora: true, t0: null };
    render(); await trascriviParti(REC.riu, [fa]); return;
  }
  if (e.target.dataset && e.target.dataset.bloccoMostra) {
    var kbm = by(D.com, e.target.dataset.bloccoMostra), keym = e.target.value; if (!kbm || !keym) return;
    var obm = opzDoc(kbm); await salvaSubito("com", kbm.id, { doc_opzioni: Object.assign({}, obm, { nascosti: (obm.nascosti || []).filter(function (x) { return x !== keym; }) }) }); return;
  }
  if (e.target.dataset && e.target.dataset.tvista) { var tv9 = e.target.value; if (tv9 === "modelli") { e.target.value = ""; apriModelli(); return; } if (tv9) go("task", null, tv9); return; }
  if (e.target.dataset && e.target.dataset.tsetdate) { var tsd = e.target.dataset.tsetdate, vd = e.target.value || null; chiudiPop(); if (await salvaSubito("task", tsd, { scadenza: vd })) toast(vd ? "Spostata a " + etichettaGiorno(vd).toLowerCase() : "Scadenza tolta"); return; }
  if (e.target.dataset && e.target.dataset.tg) { TGROUP = e.target.value; render(); return; }
  if (e.target.dataset && e.target.dataset.tsordina) { TSORT = e.target.value; render(); return; }
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
  if (e.target.id === "impinp" && e.target.files && e.target.files.length) {
    await importaPdf(e.target.files[0]);
    return;
  }
  if (e.target.dataset && e.target.dataset.ana) {
    var ca = e.target.dataset.ana;
    ANA[ca] = e.target.value;
    if (ca === "cliente_id") {
      var cc = by(D.cli, e.target.value);
      if (cc) { ANA.piva = cc.piva || ""; ANA.nome = cc.nome || ""; }
      render();
    }
    return;
  }
  if (e.target.dataset && e.target.dataset.profil) {
    var cf = e.target.dataset.profil;
    if (cf === "da") PRO_DA = e.target.value;
    else if (cf === "al") PRO_AL = e.target.value;
    else PRO_DETT = !!e.target.checked;
    render(); return;
  }
  if (e.target.dataset && e.target.dataset.sezdove) {
    var pd = e.target.dataset.sezdove.split("|"), kd = by(D.com, pd[0]); if (!kd) return;
    var ld = sezioniDi(kd).map(function (s) { return { t: s.t, d: s.d, x: s.x, v: (s.v || []).slice() }; });
    if (ld[+pd[1]]) { ld[+pd[1]].d = e.target.value === "dopo" ? "dopo" : "prima"; if (await salvaSezioni(pd[0], ld)) render(); }
    return;
  }
  if (e.target.dataset && e.target.dataset.impFlag && IMP) {
    IMP[e.target.dataset.impFlag] = !!e.target.checked; render(); return;
  }
  if (e.target.dataset && e.target.dataset.impSet && IMP) {
    var campoImp = e.target.dataset.impSet;
    IMP[campoImp] = (campoImp === "iva" || campoImp === "sconto") ? (+e.target.value || 0) : e.target.value;
    if (campoImp === "iva" || campoImp === "sconto" || campoImp === "stato" || campoImp === "accettato_il") { render(); return; }
    if (campoImp === "cliente_id") render();
    return;
  }
  if (e.target.dataset && e.target.dataset.impRiga && IMP) {
    var pi = e.target.dataset.impRiga.split("|"), ri = IMP.righe[+pi[0]];
    if (ri) {
      var cImp = pi[1], vImp = e.target.value;
      if (cImp === "periodo") { ri.ricorrente = !!vImp; ri.periodo = vImp || null; if (ri.ricorrente && !ri.cicli) ri.cicli = 12; }
      else if (["nome", "stato", "inizio", "nota_prezzo"].indexOf(cImp) > -1) ri[cImp] = vImp || null;
      else ri[cImp] = vImp === "" ? null : +vImp;
      render();
    }
    return;
  }
  if (e.target.dataset && e.target.dataset.imgup && e.target.files && e.target.files.length) {
    await caricaImmagine(e.target.dataset.imgup, e.target.files[0]); return;
  }
  if (e.target.dataset && e.target.dataset.sitoup && e.target.files && e.target.files.length) {
    await caricaImmaginiSito(e.target.dataset.sitoup, e.target.files); return;
  }
  if (e.target.id === "fileinp" && e.target.files && e.target.files.length) {
    var dz = el("#drop");
    await uploadFile(e.target.files, dz ? dz.dataset.ctxAll : ctxAll(current));
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
  var dt = e.dataTransfer;
  if (z.dataset.imp) { if (dt && dt.files && dt.files.length) await importaPdf(dt.files[0]); return; }
  if (dt && dt.files && dt.files.length) { await uploadFile(dt.files, z.dataset.ctxAll); return; }
  /* trascinare un indirizzo dalla barra del browser vale come incollare un link */
  var testo = dt ? (dt.getData("text/uri-list") || dt.getData("text/plain") || "").trim().split(/\s+/)[0] : "";
  if (urlValido(testo)) { apriLink(z.dataset.ctxAll, testo); return; }
  if (testo) toast("Quello non sembra un indirizzo web", true);
});

document.addEventListener("keydown", function (e) {
  var pal = el("#palq");
  if (pal) {
    if (e.key === "ArrowDown") { e.preventDefault(); palMove(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); palMove(-1); return; }
    if (e.key === "Enter") { e.preventDefault(); palGo(PALI); return; }
  }
  if (e.key === "Escape") { if (el("#pop")) { chiudiPop(); return; } if (PANEL && !el(".modal")) { PANEL = null; render(); return; } closeModal(); return; }
  if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); return; }
  var tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
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
document.addEventListener("mousedown", function (e) {
  var p = el("#pop"); if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest("[data-tdata],[data-tchi]"))) chiudiPop();
});
document.addEventListener("click", async function (e) {
  var a = e.target.closest && e.target.closest("a[data-inc-inviata]"); if (!a) return;
  var ii8 = by(D.inc, a.dataset.incInviata); if (ii8 && ii8.stato === "Bozza") await salvaSubito("inc", ii8.id, { stato: "Inviata", inviata_il: new Date().toISOString() });
});
document.addEventListener("dragstart", function (e) {
  var t = e.target.closest && e.target.closest(".tsk, .trow[draggable]");
  if (!t) return;
  DRAG = t.dataset.openTask; t.classList.add("dragging");
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", DRAG); } catch (x) {} }
});
document.addEventListener("dragend", function (e) {
  var t = e.target.closest && e.target.closest(".tsk, .trow"); if (t) t.classList.remove("dragging");
  Array.prototype.forEach.call(document.querySelectorAll(".kcol.over, .mcol.over"), function (c) { c.classList.remove("over"); });
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
  var quando = col.dataset.quando, giorno = col.dataset.giorno;
  if (giorno === "ritardo") return;
  var nuova = giorno ? giorno : quando === "oggi" ? today()
    : quando === "settimana" ? iso(new Date(Date.now() + 3 * 86400000))
    : quando === "dopo" ? iso(new Date(Date.now() + 14 * 86400000)) : null;
  var rm9 = await sb.from("task").update({ scadenza: nuova }).eq("id", idm);
  if (rm9.error) { toast(erroreUmano(rm9.error), true); return; }
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
  if (r.error) { toast(erroreUmano(r.error), true); return; }
  if (t.commessa_id && st === "Fatto") await logEv(t.commessa_id, "Attività completata: " + t.titolo);
  await reload(["task", "ev"]); await dopoAttivita(t.id); toast("Spostata in “" + st + "”"); render();
});

/* ---------------- auth ---------------- */
async function doLogin(f) {
  var err = el("#loginerr"); err.classList.add("hide");
  var r = await sb.auth.signInWithPassword({ email: f.email.value, password: f.password.value });
  if (r.error) { err.textContent = erroreUmano(r.error); err.classList.remove("hide"); return; }
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
  var pf = /^#\/f\/([a-z0-9]+)/i.exec(location.hash || "");
  if (pf) { await paginaFirma(pf[1]); return; }
  var pa = /^#\/a\/([a-z0-9-]+)/i.exec(location.hash || "");
  if (pa) { await paginaPrenota(pa[1]); return; }
  var s = await sb.auth.getSession();
  if (!s.data.session) { show("login"); return; }
  user = s.data.session.user;
  await loadAll();
  var daUrl = leggiHash();
  if (!daUrl || isCliente()) { view = isCliente() ? "progetti" : "dash"; current = null; tab = ""; }
  if (!isCliente()) { ROUTING = true; try { location.hash = hashOf(view, current, tab); } catch (e) {} ROUTING = false; }
  show("app"); render();
  if (!isCliente()) { await timerDimenticato(); avviaAggiornamenti(); sincronizzaCal(true); }
}
/* ---- nodo 9: chat, bacheca e badge si aggiornano da soli, senza ricaricare ----
   Ogni mezzo minuto, solo se la finestra è visibile e nessuno sta scrivendo. */
var AGG_T = null;
function avviaAggiornamenti() {
  if (AGG_T) return;
  AGG_T = setInterval(aggiornaVivo, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) aggiornaVivo(); });
}
function impronta(k) { return D[k].length + "|" + (D[k].length ? (D[k][D[k].length - 1].id || "") : ""); }
async function aggiornaVivo() {
  if (document.hidden || !user || isCliente() || inForm() || document.querySelector("#modal .box") || (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName))) return;
  var prima = ["msg", "post", "risp", "reaz", "lett", "ag", "riu", "task", "comm", "rich"].map(impronta).join("#");
  await reload(["msg", "post", "risp", "reaz", "lett", "ag", "riu", "task", "comm", "rich"]);
  var dopo = ["msg", "post", "risp", "reaz", "lett", "ag", "riu", "task", "comm", "rich"].map(impronta).join("#");
  if (prima === dopo) return;
  if (["chat", "studio", "eventi", "riunioni", "task", "dash"].indexOf(view) > -1 || (view === "commessa" && tab === "discussione")) render(); else buildNav();
}
async function init() {
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { show("setup"); return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  document.addEventListener("click", function (e) {
    /* il menu del nome si chiude se clicchi fuori */
    var m = el("#memenu");
    if (m && !m.classList.contains("chiusa") && !e.target.closest(".sidefoot")) meMenu(false);
  });
  /* quello che si rompe lo scrivo, così nella sezione Sistema si vede */
  window.addEventListener("error", function (ev) {
    segnaErrore(ev.message || "errore", (ev.filename || "") + ":" + (ev.lineno || "") + (ev.error && ev.error.stack ? "\n" + ev.error.stack : ""));
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason;
    segnaErrore("promessa rifiutata: " + (r && r.message ? r.message : String(r)), r && r.stack ? r.stack : "");
  });
  try { if (localStorage.getItem("gs_mini") === "1") navMini(true); } catch (e) { }
  var ham = el("#ham"), scrim = el("#scrim");
  if (ham) ham.addEventListener("click", function () { document.body.classList.toggle("navopen"); });
  if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("navopen"); });
  await start();
}
init();
})();
