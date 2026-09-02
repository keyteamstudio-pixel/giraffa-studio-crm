/* Giraffa Studio — CRM v2 */
(function () {
"use strict";

var cfg = window.GS_CONFIG || {};
var sb = null, user = null;
var me = { pro_id: null, ruolo: "membro", nome: "", email: "" };
var D = { pros: [], serv: [], cli: [], com: [], righe: [], spazi: [], task: [], ore: [], mov: [], inter: [], doc: [], pren: [], membri: [] };
var SET = { fee_default: 12 };
var TB = { pros: "professionisti", serv: "servizi", cli: "clienti", com: "commesse", righe: "righe", spazi: "spazi", task: "task", ore: "ore", mov: "movimenti", inter: "interazioni", doc: "documenti", pren: "prenotazioni", membri: "membri" };

var view = "dash", current = null, tab = "", persp = "all", search = "";

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
function show(id) { ["setup", "login", "app"].forEach(function (x) { el("#" + x).classList.toggle("hide", x !== id); }); }
function closeModal() { el("#modal").innerHTML = ""; }
function go(v, id, t) { view = v; current = id || null; tab = t || ""; search = ""; window.scrollTo(0, 0); render(); }

var STATI = ["Bozza", "Preventivo", "Approvata", "In corso", "Consegna", "Chiusa", "Persa"];
var STATO_COL = { Bozza: "", Preventivo: "b-amber", Approvata: "b-blue", "In corso": "b-terra", Consegna: "b-blue", Chiusa: "b-green", Persa: "b-red" };
var TASK_STATI = ["Da fare", "In corso", "In review", "Fatto"];
var PRIO_COL = { Alta: "b-red", Media: "b-amber", Bassa: "" };
var MOV_COL = { Pagata: "b-green", Emessa: "b-blue", "Da emettere": "b-amber", Insoluta: "b-red" };
var MODELLI = ["A · ognuno il suo", "B · Giraffa fattura", "C · subappalto"];

/* ---------------- calcoli ---------------- */
function righeOf(kid) { return D.righe.filter(function (r) { return r.commessa_id === kid; }); }
function calc(k) {
  var imp = 0, cost = 0;
  righeOf(k.id).forEach(function (r) {
    var s = by(D.serv, r.serv_id); if (!s) return;
    imp += (+s.prezzo || 0) * (r.qty || 1);
    cost += (+s.costo || 0) * (r.qty || 1);
  });
  var fee = Math.round(imp * (+k.fee || 0) / 100);
  var tot = imp + fee;
  return { imp: imp, cost: cost, fee: fee, tot: tot, margine: tot - cost };
}
function oreOf(kid) { return D.ore.filter(function (o) { return o.commessa_id === kid; }); }
function oreTot(kid) { return sum(oreOf(kid), function (o) { return o.ore; }); }
function taskOf(kid) { return D.task.filter(function (t) { return t.commessa_id === kid; }); }
function movOf(kid) { return D.mov.filter(function (m) { return m.commessa_id === kid; }); }
function incassato(kid) { return sum(movOf(kid).filter(function (m) { return m.tipo === "Attiva" && m.stato === "Pagata"; }), function (m) { return m.importo; }); }
function comOfCliente(cid) { return D.com.filter(function (k) { return k.cliente_id === cid; }); }
function valoreCliente(cid) { return sum(comOfCliente(cid).filter(function (k) { return k.stato !== "Persa"; }), function (k) { return calc(k).tot; }); }

function isMine(row, kind) {
  if (persp === "all") return true;
  if (!me.pro_id) return false;
  if (kind === "com") return row.owner_id === me.pro_id || row.pm_id === me.pro_id || righeOf(row.id).some(function (r) { var s = by(D.serv, r.serv_id); return s && s.pro_id === me.pro_id; });
  if (kind === "cli") return row.owner_id === me.pro_id || comOfCliente(row.id).some(function (k) { return isMineCom(k); });
  if (kind === "ore") return row.pro_id === me.pro_id;
  if (kind === "task") return row.assegnato_id === me.pro_id;
  if (kind === "mov") return row.pro_id === me.pro_id;
  if (kind === "serv") return row.pro_id === me.pro_id;
  return true;
}
function isMineCom(k) { return me.pro_id && (k.owner_id === me.pro_id || k.pm_id === me.pro_id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return s && s.pro_id === me.pro_id; })); }
function fcom() { return D.com.filter(function (k) { return isMine(k, "com"); }); }
function fcli() { return D.cli.filter(function (c) { return isMine(c, "cli"); }); }
function fore() { return D.ore.filter(function (o) { return isMine(o, "ore"); }); }
function ftask() { return D.task.filter(function (t) { return isMine(t, "task"); }); }
function fmov() { return D.mov.filter(function (m) { return isMine(m, "mov"); }); }

/* ---------------- caricamento ---------------- */
async function loadAll() {
  var keys = Object.keys(TB);
  var res = await Promise.all(keys.map(function (k) { return sb.from(TB[k]).select("*"); }));
  res.forEach(function (r, i) { if (!r.error) D[keys[i]] = r.data || []; });
  var s = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (s.data) SET = s.data;
  var m = D.membri.filter(function (x) { return x.user_id === user.id; })[0];
  me.email = user.email;
  if (m) { me.pro_id = m.pro_id; me.ruolo = m.ruolo || "membro"; }
  var p = me.pro_id ? by(D.pros, me.pro_id) : null;
  me.nome = p ? p.nome : user.email;
}
async function reload(keys) {
  await Promise.all(keys.map(async function (k) {
    var r = await sb.from(TB[k]).select("*"); if (!r.error) D[k] = r.data || [];
  }));
}
/* ---------------- nav ---------------- */
var NAV = [
  { g: "Lavoro" },
  { k: "dash", t: "Dashboard" },
  { k: "commesse", t: "Commesse", c: function () { return fcom().filter(function (k) { return ["Preventivo", "Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; }).length; } },
  { k: "task", t: "Attività", c: function () { return ftask().filter(function (t) { return t.stato !== "Fatto"; }).length; } },
  { k: "ore", t: "Ore & timesheet" },
  { g: "Relazioni" },
  { k: "clienti", t: "Clienti", c: function () { return fcli().length; } },
  { k: "pool", t: "Pool professionisti", c: function () { return D.pros.length; } },
  { k: "servizi", t: "Servizi & listino" },
  { g: "Soldi" },
  { k: "fatture", t: "Fatturazione", c: function () { return fmov().filter(function (m) { return m.stato !== "Pagata"; }).length; } },
  { k: "report", t: "Report" },
  { g: "Studio" },
  { k: "spazi", t: "Spazi & ufficio" },
  { k: "impostazioni", t: "Impostazioni" }
];
function buildNav() {
  var h = "";
  NAV.forEach(function (n) {
    if (n.g) { h += '<div class="navgroup">' + n.g + "</div>"; return; }
    var c = n.c ? n.c() : null;
    h += '<button data-go="' + n.k + '" class="' + (view === n.k || (view === "commessa" && n.k === "commesse") || (view === "cliente" && n.k === "clienti") || (view === "pro" && n.k === "pool") ? "on" : "") + '">' + n.t + (c ? '<span class="cnt">' + c + "</span>" : "") + "</button>";
  });
  el("#nav").innerHTML = h;
  el("#mename").textContent = me.nome;
  el("#meemail").textContent = me.email;
}
function perspSel() {
  return '<select id="persp" style="width:auto"><option value="all"' + (persp === "all" ? " selected" : "") + ">Tutto lo studio</option><option value=\"me\"" + (persp === "me" ? " selected" : "") + ">Solo io</option></select>";
}
function head(title, sub, tools) {
  return '<div class="top"><h1>' + esc(title) + (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") + '</h1><div class="tools">' + (tools || "") + '<span class="faint">Vista</span>' + perspSel() + "</div></div>";
}
function kpi(v, l, d) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + l + "</div>" + (d ? '<div class="d">' + d + "</div>" : "") + "</div>"; }
function bar(label, val, max, right) {
  var w = max ? Math.min(100, Math.round(val / max * 100)) : 0;
  return '<div class="barrow"><div>' + esc(label) + '</div><div class="track"><i style="width:' + w + '%"></i></div><div class="num">' + right + "</div></div>";
}

/* ---------------- dashboard ---------------- */
function vDash() {
  var com = fcom(), cli = fcli(), ore = fore(), tk = ftask(), mov = fmov();
  var aperte = com.filter(function (k) { return ["Preventivo", "Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; });
  var pipeline = sum(aperte, function (k) { return calc(k).tot; });
  var pesata = sum(aperte, function (k) { return calc(k).tot * (k.probabilita == null ? 50 : k.probabilita) / 100; });
  var margine = sum(com.filter(function (k) { return k.stato !== "Persa"; }), function (k) { return calc(k).margine; });
  var d = new Date(); var m0 = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  var oreMese = ore.filter(function (o) { return o.data >= m0; });
  var oreSett = ore.filter(function (o) { return days(today(), o.data) < 7 && days(today(), o.data) >= 0; });
  var valOre = sum(oreMese.filter(function (o) { return o.fatturabile; }), function (o) { return (+o.ore || 0) * (+o.tariffa || 0); });
  var daIncassare = sum(mov.filter(function (m) { return m.tipo === "Attiva" && m.stato !== "Pagata"; }), function (m) { return m.importo; });
  var incass = sum(mov.filter(function (m) { return m.tipo === "Attiva" && m.stato === "Pagata"; }), function (m) { return m.importo; });
  var scadute = mov.filter(function (m) { return m.tipo === "Attiva" && m.stato !== "Pagata" && m.scadenza && m.scadenza < today(); });
  var urgenti = tk.filter(function (t) { return t.stato !== "Fatto" && t.scadenza && days(t.scadenza, today()) <= 7; }).sort(function (a, b) { return (a.scadenza || "") < (b.scadenza || "") ? -1 : 1; });
  var recenti = com.slice().sort(function (a, b) { return (b.created_at || "") < (a.created_at || "") ? -1 : 1; }).slice(0, 8);

  var h = head("Dashboard", persp === "me" ? "La tua situazione personale dentro lo studio" : "La situazione dello studio in un colpo d'occhio",
    '<button class="btn sm" data-new="com">+ Nuova commessa</button><button class="btn sm ghost" data-new="ore">+ Registra ore</button>');

  h += '<div class="grid g4">' +
    kpi(eur(pipeline), "Pipeline aperta", aperte.length + " commesse attive") +
    kpi(eur(pesata), "Pipeline pesata", "per probabilità di chiusura") +
    kpi(eur(incass), "Incassato", eur(daIncassare) + " da incassare") +
    kpi(eur(margine), "Margine studio", "su commesse non perse") +
    "</div>";

  h += '<div class="grid g4" style="margin-top:16px">' +
    kpi(num(sum(oreMese, function (o) { return o.ore; }), 1) + " h", "Ore questo mese", num(sum(oreSett, function (o) { return o.ore; }), 1) + " h negli ultimi 7 giorni") +
    kpi(eur(valOre), "Valore ore fatturabili", "del mese in corso") +
    kpi(String(tk.filter(function (t) { return t.stato !== "Fatto"; }).length), "Attività aperte", urgenti.length + " in scadenza entro 7 giorni") +
    kpi(String(cli.length), "Clienti", D.pros.filter(function (p) { return p.vetting === "Attivo"; }).length + " professionisti attivi") +
    "</div>";

  h += '<div class="grid g32" style="margin-top:16px">';
  h += '<div class="card"><div class="cardhead"><h2>Commesse recenti</h2><button class="btn sm ghost" data-go="commesse">Vedi tutte</button></div>';
  h += recenti.length ? tblCom(recenti) : '<div class="empty">Nessuna commessa.</div>';
  h += "</div>";

  h += "<div>";
  h += '<div class="card"><div class="cardhead"><h2>In scadenza</h2><button class="btn sm ghost" data-go="task">Attività</button></div>';
  h += urgenti.length ? '<ul class="timeline">' + urgenti.slice(0, 6).map(function (t) {
    var late = t.scadenza < today();
    return "<li><button class=\"lnk\" data-open-task=\"" + t.id + "\">" + esc(t.titolo) + '</button><div class="when">' + (t.commessa_id ? esc(nameOf(D.com, t.commessa_id, "titolo")) + " · " : "") + (late ? '<span class="badge b-red">scaduta</span> ' : "") + dt(t.scadenza) + "</div></li>";
  }).join("") + "</ul>" : '<div class="empty">Niente in scadenza. Bene così.</div>';
  h += "</div>";

  h += '<div class="card"><div class="cardhead"><h2>Soldi</h2><button class="btn sm ghost" data-go="fatture">Fatturazione</button></div>';
  h += '<div class="bars">';
  var maxm = Math.max(1, incass, daIncassare);
  h += bar("Incassato", incass, maxm, eur(incass));
  h += bar("Da incassare", daIncassare, maxm, eur(daIncassare));
  h += bar("Scaduto", sum(scadute, function (m) { return m.importo; }), maxm, eur(sum(scadute, function (m) { return m.importo; })));
  h += "</div>";
  if (scadute.length) h += '<p class="faint" style="margin-top:12px">' + scadute.length + " fattura/e oltre la scadenza.</p>";
  h += "</div></div></div>";

  return h;
}

function tblCom(list) {
  var h = "<table><thead><tr><th>Commessa</th><th>Cliente</th><th>Stato</th><th>Owner</th><th>Scadenza</th><th class=\"num\">Ore</th><th class=\"num\">Totale</th></tr></thead><tbody>";
  list.forEach(function (k) {
    var c = calc(k);
    h += "<tr><td><button class=\"lnk\" data-open-com=\"" + k.id + "\">" + esc(k.titolo) + "</button></td>" +
      "<td>" + esc(nameOf(D.cli, k.cliente_id)) + "</td>" +
      '<td><span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + "</span></td>" +
      "<td>" + esc(nameOf(D.pros, k.owner_id)) + "</td>" +
      "<td>" + (k.scadenza ? (k.scadenza < today() && ["Chiusa", "Persa"].indexOf(k.stato) < 0 ? '<span class="badge b-red">' + dshort(k.scadenza) + "</span>" : dt(k.scadenza)) : "—") + "</td>" +
      '<td class="num">' + num(oreTot(k.id), 1) + "</td>" +
      '<td class="num">' + eur(c.tot) + "</td></tr>";
  });
  return h + "</tbody></table>";
}
/* ---------------- commesse ---------------- */
function vCommesse() {
  var list = fcom();
  if (search) list = list.filter(function (k) { return (k.titolo + " " + nameOf(D.cli, k.cliente_id)).toLowerCase().indexOf(search.toLowerCase()) > -1; });
  var h = head("Commesse", list.length + " commesse · " + eur(sum(list, function (k) { return calc(k).tot; })) + " di valore",
    '<input id="search" placeholder="Cerca…" style="width:180px" value="' + esc(search) + '"><button class="btn sm" data-new="com">+ Nuova commessa</button>');

  var per = {}; STATI.forEach(function (s) { per[s] = list.filter(function (k) { return k.stato === s; }); });
  h += '<div class="card"><div class="cardhead"><h2>Per stato</h2></div><div class="bars">';
  var mx = Math.max.apply(null, STATI.map(function (s) { return sum(per[s], function (k) { return calc(k).tot; }); }).concat([1]));
  STATI.forEach(function (s) { if (per[s].length) h += bar(s + " (" + per[s].length + ")", sum(per[s], function (k) { return calc(k).tot; }), mx, eur(sum(per[s], function (k) { return calc(k).tot; }))); });
  h += "</div></div>";

  h += '<div class="card">' + (list.length ? tblCom(list.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); })) : '<div class="empty">Nessuna commessa. Creane una.</div>') + "</div>";
  return h;
}

function vCommessa() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Commessa non trovata. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  var c = calc(k), ore = oreOf(k.id), tk = taskOf(k.id), mv = movOf(k.id), dc = D.doc.filter(function (x) { return x.commessa_id === k.id; });
  var oreT = sum(ore, function (o) { return o.ore; }), inc = incassato(k.id);
  var t = tab || "servizi";

  var h = '<div class="top"><h1>' + esc(k.titolo) + '<span class="sub">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + esc(k.modello || "modello non impostato") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="commesse">← Commesse</button>' +
    '<button class="btn sm ghost" data-edit="com:' + k.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-preventivo="' + k.id + '">Preventivo</button>' +
    '<button class="btn sm" data-portale="' + k.id + '">Vista cliente</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(c.tot), "Totale cliente", "imponibile " + eur(c.imp) + " + fee " + (k.fee || 0) + "%") +
    kpi(eur(c.margine), "Margine studio", "costo professionisti " + eur(c.cost)) +
    kpi(num(oreT, 1) + " h", "Ore registrate", k.budget_ore ? "budget " + num(k.budget_ore, 0) + " h" : "nessun budget ore") +
    kpi(eur(inc), "Incassato", eur(c.tot - inc) + " residuo") +
    "</div>";

  if (k.budget_ore) {
    var p = Math.min(100, Math.round(oreT / k.budget_ore * 100));
    h += '<div class="card"><div class="cardhead"><h2>Consumo del budget ore</h2><span class="faint">' + num(oreT, 1) + " / " + num(k.budget_ore, 0) + " h</span></div><div class=\"prog\"><i class=\"" + (p > 100 ? "bad" : p > 80 ? "warn" : "ok") + '" style="width:' + p + '%"></i></div></div>';
  }

  h += '<div class="grid g32" style="margin-top:16px"><div>';
  h += '<div class="card"><div class="tabs">' +
    ["servizi", "attivita", "ore", "fatture", "documenti"].map(function (x) {
      var lbl = { servizi: "Servizi", attivita: "Attività (" + tk.filter(function (z) { return z.stato !== "Fatto"; }).length + ")", ore: "Ore (" + num(oreT, 1) + ")", fatture: "Fatture (" + mv.length + ")", documenti: "Documenti (" + dc.length + ")" }[x];
      return '<button data-tab="' + x + '" class="' + (t === x ? "on" : "") + '">' + lbl + "</button>";
    }).join("") + "</div>";

  if (t === "servizi") {
    h += '<div class="cardhead"><h2>Righe di servizio</h2><button class="btn sm ghost" data-riga="' + k.id + '">+ Aggiungi servizio</button></div>';
    h += righeOf(k.id).length ? "<table><thead><tr><th>Servizio</th><th>Professionista</th><th class=\"num\">Q.tà</th><th class=\"num\">Costo</th><th class=\"num\">Prezzo</th><th></th></tr></thead><tbody>" +
      righeOf(k.id).map(function (r) {
        var s = by(D.serv, r.serv_id); if (!s) return "";
        return "<tr><td>" + esc(s.nome) + ' <span class="faint">· ' + esc(s.cat || "") + "</span></td><td>" + esc(nameOf(D.pros, s.pro_id)) + '</td><td class="num">' + (r.qty || 1) + '</td><td class="num">' + eur((s.costo || 0) * (r.qty || 1)) + '</td><td class="num">' + eur((s.prezzo || 0) * (r.qty || 1)) + '</td><td class="num"><button class="lnk" data-del="righe:' + r.id + '">Rimuovi</button></td></tr>';
      }).join("") + "</tbody></table>" : '<div class="empty">Nessun servizio. Aggiungi la prima riga.</div>';
  }
  if (t === "attivita") {
    h += '<div class="cardhead"><h2>Attività</h2><button class="btn sm ghost" data-new="task" data-ctx="' + k.id + '">+ Nuova attività</button></div>' + kanban(tk);
  }
  if (t === "ore") {
    h += '<div class="cardhead"><h2>Ore registrate</h2><button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">+ Registra ore</button></div>' + tblOre(ore);
  }
  if (t === "fatture") {
    h += '<div class="cardhead"><h2>Fatture e movimenti</h2><button class="btn sm ghost" data-new="mov" data-ctx="' + k.id + '">+ Nuovo movimento</button></div>' + tblMov(mv);
  }
  if (t === "documenti") {
    h += '<div class="cardhead"><h2>Documenti e link</h2><button class="btn sm ghost" data-new="doc" data-ctx="' + k.id + '">+ Aggiungi</button></div>';
    h += dc.length ? "<table><tbody>" + dc.map(function (x) {
      return "<tr><td>" + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.nome) + "</a>" : esc(x.nome)) + '</td><td><span class="badge">' + esc(x.tipo || "Link") + "</span></td><td class=\"num faint\">" + dt(x.created_at) + '</td><td class="num"><button class="lnk" data-del="doc:' + x.id + '">Rimuovi</button></td></tr>';
    }).join("") + "</tbody></table>" : '<div class="empty">Nessun documento collegato.</div>';
  }
  h += "</div></div>";

  h += "<div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Scheda</h3><table><tbody>' +
    row2("Cliente", '<button class="lnk" data-open-cli="' + k.cliente_id + '">' + esc(nameOf(D.cli, k.cliente_id)) + "</button>") +
    row2("Owner", esc(nameOf(D.pros, k.owner_id))) +
    row2("Regia (PM)", esc(nameOf(D.pros, k.pm_id))) +
    row2("Stato", '<span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + "</span>") +
    row2("Probabilità", (k.probabilita == null ? 50 : k.probabilita) + " %") +
    row2("Fatturazione", esc(k.modello || "—")) +
    row2("Fee coordinamento", (k.fee || 0) + " %") +
    row2("Periodo", dt(k.inizio) + " → " + dt(k.scadenza)) +
    row2("Note", esc(k.note || "—")) +
    "</tbody></table></div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Economics</h3><table><tbody>' +
    row2("Imponibile servizi", eur(c.imp)) +
    row2("Fee coordinamento", eur(c.fee)) +
    row2("<b>Totale cliente</b>", "<b>" + eur(c.tot) + "</b>") +
    row2("Costo professionisti", eur(c.cost)) +
    row2("Margine studio", eur(c.margine) + ' <span class="faint">(' + (c.tot ? Math.round(c.margine / c.tot * 100) : 0) + "%)</span>") +
    row2("Costo ore registrate", eur(sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); }))) +
    "</tbody></table></div>";

  h += '<div class="card"><h3 style="margin-bottom:12px">Chi ci lavora</h3>';
  var perPro = {};
  ore.forEach(function (o) { perPro[o.pro_id] = (perPro[o.pro_id] || 0) + (+o.ore || 0); });
  righeOf(k.id).forEach(function (r) { var s = by(D.serv, r.serv_id); if (s && s.pro_id && perPro[s.pro_id] == null) perPro[s.pro_id] = 0; });
  var keys = Object.keys(perPro);
  h += keys.length ? '<div class="bars">' + keys.map(function (pid) {
    return bar(nameOf(D.pros, pid), perPro[pid], Math.max.apply(null, keys.map(function (x) { return perPro[x]; }).concat([1])), num(perPro[pid], 1) + " h");
  }).join("") + "</div>" : '<div class="empty">Nessuno assegnato.</div>';
  h += "</div></div></div>";
  return h;
}
function row2(a, b) { return '<tr><td class="muted" style="width:44%">' + a + "</td><td>" + b + "</td></tr>"; }
/* ---------------- attività ---------------- */
function kanban(list) {
  var h = '<div class="kanban">';
  TASK_STATI.forEach(function (s) {
    var items = list.filter(function (t) { return t.stato === s; });
    h += '<div class="kcol"><h3>' + s + "<span>" + items.length + "</span></h3>";
    items.forEach(function (t) {
      var late = t.scadenza && t.scadenza < today() && t.stato !== "Fatto";
      h += '<div class="tsk" data-open-task="' + t.id + '">' + esc(t.titolo) +
        '<div class="meta"><span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita || "Media") + "</span><span>" + (t.scadenza ? (late ? '<span class="badge b-red">' + dshort(t.scadenza) + "</span>" : dshort(t.scadenza)) : "") + "</span></div>" +
        '<div class="meta"><span>' + esc(t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") : "—") + "</span><span>" + esc(t.assegnato_id ? nameOf(D.pros, t.assegnato_id).split(" ")[0] : "") + "</span></div></div>";
    });
    h += "</div>";
  });
  return h + "</div>";
}
function vTask() {
  var list = ftask();
  var late = list.filter(function (t) { return t.stato !== "Fatto" && t.scadenza && t.scadenza < today(); });
  var h = head("Attività", list.filter(function (t) { return t.stato !== "Fatto"; }).length + " aperte · " + late.length + " scadute",
    '<button class="btn sm" data-new="task">+ Nuova attività</button>');
  h += '<div class="card">' + kanban(list) + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Elenco completo</h2></div><table><thead><tr><th>Attività</th><th>Commessa</th><th>Assegnata a</th><th>Priorità</th><th>Scadenza</th><th>Stato</th><th></th></tr></thead><tbody>';
  list.slice().sort(function (a, b) { return (a.scadenza || "9") < (b.scadenza || "9") ? -1 : 1; }).forEach(function (t) {
    h += '<tr><td><button class="lnk" data-open-task="' + t.id + '">' + esc(t.titolo) + "</button></td><td>" + esc(t.commessa_id ? nameOf(D.com, t.commessa_id, "titolo") : "—") + "</td><td>" + esc(nameOf(D.pros, t.assegnato_id)) + '</td><td><span class="badge ' + (PRIO_COL[t.priorita] || "") + '">' + esc(t.priorita || "Media") + "</span></td><td>" + (t.scadenza && t.scadenza < today() && t.stato !== "Fatto" ? '<span class="badge b-red">' + dt(t.scadenza) + "</span>" : dt(t.scadenza)) + '</td><td><span class="badge ' + (t.stato === "Fatto" ? "b-green" : t.stato === "In corso" ? "b-terra" : "") + '">' + esc(t.stato) + "</span></td><td class=\"num\">" + (t.stato !== "Fatto" ? '<button class="lnk" data-done="' + t.id + '">Segna fatto</button>' : "") + "</td></tr>";
  });
  return h + "</tbody></table></div>";
}

/* ---------------- ore ---------------- */
function tblOre(list) {
  if (!list.length) return '<div class="empty">Nessuna ora registrata.</div>';
  var h = "<table><thead><tr><th>Data</th><th>Chi</th><th>Commessa</th><th>Descrizione</th><th class=\"num\">Ore</th><th class=\"num\">Valore</th><th></th></tr></thead><tbody>";
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
  var h = head("Ore & timesheet", "Registro delle ore " + (persp === "me" ? "personali" : "dello studio"),
    '<button class="btn sm" data-new="ore">+ Registra ore</button>');

  h += '<div class="grid g4">' +
    kpi(num(totMese, 1) + " h", "Questo mese", num(sum(sett, function (o) { return o.ore; }), 1) + " h negli ultimi 7 giorni") +
    kpi(num(sum(fatt, function (o) { return o.ore; }), 1) + " h", "Fatturabili", totMese ? Math.round(sum(fatt, function (o) { return o.ore; }) / totMese * 100) + "% del totale" : "—") +
    kpi(eur(sum(fatt, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); })), "Valore del mese", "alle tariffe orarie") +
    kpi(num(sum(list, function (o) { return o.ore; }), 1) + " h", "Totale storico", list.length + " registrazioni") +
    "</div>";

  var per = {};
  list.forEach(function (o) { if (o.commessa_id) per[o.commessa_id] = (per[o.commessa_id] || 0) + (+o.ore || 0); });
  var pk = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; });
  h += '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="cardhead"><h2>Ore per commessa</h2></div>';
  h += pk.length ? '<div class="bars">' + pk.slice(0, 8).map(function (id) { return bar(nameOf(D.com, id, "titolo"), per[id], per[pk[0]], num(per[id], 1) + " h"); }).join("") + "</div>" : '<div class="empty">—</div>';
  h += "</div>";

  var pp = {};
  list.forEach(function (o) { if (o.pro_id) pp[o.pro_id] = (pp[o.pro_id] || 0) + (+o.ore || 0); });
  var ppk = Object.keys(pp).sort(function (a, b) { return pp[b] - pp[a]; });
  h += '<div class="card"><div class="cardhead"><h2>Ore per professionista</h2></div>';
  h += ppk.length ? '<div class="bars">' + ppk.map(function (id) { return bar(nameOf(D.pros, id), pp[id], pp[ppk[0]], num(pp[id], 1) + " h"); }).join("") + "</div>" : '<div class="empty">—</div>';
  h += "</div></div>";

  h += '<div class="card"><div class="cardhead"><h2>Registrazioni</h2></div>' + tblOre(list.slice(0, 60)) + "</div>";
  return h;
}

/* ---------------- clienti ---------------- */
function vClienti() {
  var list = fcli();
  if (search) list = list.filter(function (c) { return (c.nome + " " + (c.settore || "")).toLowerCase().indexOf(search.toLowerCase()) > -1; });
  var h = head("Clienti", list.length + " clienti · " + eur(sum(list, function (c) { return valoreCliente(c.id); })) + " di valore complessivo",
    '<input id="search" placeholder="Cerca…" style="width:170px" value="' + esc(search) + '"><button class="btn sm" data-new="cli">+ Nuovo cliente</button>');
  h += '<div class="card">';
  h += list.length ? "<table><thead><tr><th>Cliente</th><th>Settore</th><th>Referente</th><th>Owner</th><th>Stato</th><th class=\"num\">Commesse</th><th class=\"num\">Valore</th></tr></thead><tbody>" +
    list.slice().sort(function (a, b) { return valoreCliente(b.id) - valoreCliente(a.id); }).map(function (c) {
      return '<tr><td><button class="lnk" data-open-cli="' + c.id + '">' + esc(c.nome) + "</button></td><td>" + esc(c.settore || "—") + "</td><td>" + esc(c.referente || "—") + "</td><td>" + esc(nameOf(D.pros, c.owner_id)) + '</td><td><span class="badge ' + (c.stato === "Attivo" ? "b-green" : c.stato === "Lead" ? "b-amber" : "") + '">' + esc(c.stato || "Lead") + '</span></td><td class="num">' + comOfCliente(c.id).length + '</td><td class="num">' + eur(valoreCliente(c.id)) + "</td></tr>";
    }).join("") + "</tbody></table>" : '<div class="empty">Nessun cliente.</div>';
  return h + "</div>";
}
function vCliente() {
  var c = by(D.cli, current);
  if (!c) return '<div class="card">Cliente non trovato. <button class="lnk" data-go="clienti">Torna all\'elenco</button></div>';
  var com = comOfCliente(c.id);
  var inter = D.inter.filter(function (i) { return i.cliente_id === c.id; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  var mv = D.mov.filter(function (m) { return m.cliente_id === c.id; });
  var ore = D.ore.filter(function (o) { return com.some(function (k) { return k.id === o.commessa_id; }); });
  var inc = sum(mv.filter(function (m) { return m.stato === "Pagata"; }), function (m) { return m.importo; });

  var h = '<div class="top"><h1>' + esc(c.nome) + '<span class="sub">' + esc(c.settore || "—") + " · " + esc(c.stato || "Lead") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="clienti">← Clienti</button>' +
    '<button class="btn sm ghost" data-edit="cli:' + c.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-new="inter" data-ctx="' + c.id + '">+ Nota</button>' +
    '<button class="btn sm" data-new="com" data-ctx="' + c.id + '">+ Commessa</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(valoreCliente(c.id)), "Valore totale", com.length + " commesse") +
    kpi(eur(inc), "Incassato", eur(sum(mv.filter(function (m) { return m.stato !== "Pagata"; }), function (m) { return m.importo; })) + " da incassare") +
    kpi(num(sum(ore, function (o) { return o.ore; }), 1) + " h", "Ore dedicate", "su tutte le commesse") +
    kpi(String(inter.length), "Interazioni", inter[0] ? "ultima " + dt(inter[0].data) : "—") +
    "</div>";

  h += '<div class="grid g32" style="margin-top:16px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Commesse</h2></div>' + (com.length ? tblCom(com) : '<div class="empty">Nessuna commessa.</div>') + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Fatture</h2><button class="btn sm ghost" data-new="mov" data-ctx-cli="' + c.id + '">+ Movimento</button></div>' + tblMov(mv) + "</div>";
  h += "</div><div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Anagrafica</h3><table><tbody>' +
    row2("Referente", esc(c.referente || "—")) +
    row2("Email", c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "—") +
    row2("Telefono", esc(c.telefono || "—")) +
    row2("Sito", c.sito ? '<a href="' + esc(c.sito) + '" target="_blank" rel="noopener">' + esc(c.sito) + "</a>" : "—") +
    row2("P. IVA", esc(c.piva || "—")) +
    row2("Indirizzo", esc(c.indirizzo || "—")) +
    row2("Owner", esc(nameOf(D.pros, c.owner_id))) +
    row2("Note", esc(c.note || "—")) +
    "</tbody></table></div>";
  h += '<div class="card"><div class="cardhead"><h2>Diario</h2><button class="btn sm ghost" data-new="inter" data-ctx="' + c.id + '">+ Aggiungi</button></div>';
  h += inter.length ? '<ul class="timeline">' + inter.map(function (i) {
    return "<li><b>" + esc(i.tipo || "Nota") + "</b> · " + esc(i.testo || "") + '<div class="when">' + dt(i.data) + " · " + esc(nameOf(D.pros, i.pro_id)) + ' · <button class="lnk" data-del="inter:' + i.id + '">elimina</button></div></li>';
  }).join("") + "</ul>" : '<div class="empty">Nessuna interazione registrata.</div>';
  h += "</div></div></div>";
  return h;
}
/* ---------------- pool ---------------- */
function vPool() {
  var h = head("Pool professionisti", D.pros.length + " professionisti · " + D.pros.filter(function (p) { return p.vetting === "Attivo"; }).length + " attivi",
    '<button class="btn sm" data-new="pros">+ Nuovo professionista</button>');
  h += '<div class="grid g3">';
  D.pros.forEach(function (p) {
    var srv = D.serv.filter(function (s) { return s.pro_id === p.id; });
    var ore = D.ore.filter(function (o) { return o.pro_id === p.id; });
    var com = D.com.filter(function (k) { return k.owner_id === p.id || k.pm_id === p.id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return s && s.pro_id === p.id; }); });
    h += '<div class="card"><div class="cardhead"><h2>' + esc(p.nome) + '</h2><span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span></div>" +
      '<p class="muted" style="font-size:.88rem">' + esc(p.ruolo || "—") + "</p>" +
      '<div style="margin:10px 0">' + (p.competenze || "").split(",").filter(Boolean).map(function (x) { return '<span class="chip">' + esc(x.trim()) + "</span>"; }).join("") + "</div>" +
      '<table><tbody>' + row2("Tariffa oraria", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") + row2("Servizi a listino", srv.length) + row2("Commesse", com.length) + row2("Ore registrate", num(sum(ore, function (o) { return o.ore; }), 1) + " h") + "</tbody></table>" +
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
  var com = D.com.filter(function (k) { return k.owner_id === p.id || k.pm_id === p.id || righeOf(k.id).some(function (r) { var s = by(D.serv, r.serv_id); return s && s.pro_id === p.id; }); });
  var cli = D.cli.filter(function (c) { return c.owner_id === p.id; });
  var val = sum(ore, function (o) { return (+o.ore || 0) * (+o.tariffa || 0); });

  var h = '<div class="top"><h1>' + esc(p.nome) + '<span class="sub">' + esc(p.ruolo || "—") + '</span></h1><div class="tools"><button class="btn sm ghost" data-go="pool">← Pool</button><button class="btn sm ghost" data-edit="pros:' + p.id + '">Modifica</button></div></div>';
  h += '<div class="grid g4">' +
    kpi(String(com.length), "Commesse", cli.length + " clienti propri") +
    kpi(num(sum(ore, function (o) { return o.ore; }), 1) + " h", "Ore registrate", ore.length + " registrazioni") +
    kpi(eur(val), "Valore ore", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "tariffa non impostata") +
    kpi(String(tk.filter(function (t) { return t.stato !== "Fatto"; }).length), "Attività aperte", tk.length + " totali") +
    "</div>";
  h += '<div class="grid g32" style="margin-top:16px"><div>';
  h += '<div class="card"><div class="cardhead"><h2>Commesse</h2></div>' + (com.length ? tblCom(com) : '<div class="empty">—</div>') + "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Servizi a listino</h2><button class="btn sm ghost" data-new="serv" data-ctx-pro="' + p.id + '">+ Servizio</button></div>' + tblServ(srv) + "</div>";
  h += "</div><div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Anagrafica</h3><table><tbody>' +
    row2("Vetting", '<span class="badge ' + (p.vetting === "Attivo" ? "b-green" : "b-amber") + '">' + esc(p.vetting || "—") + "</span>") +
    row2("Email", esc(p.email || "—")) + row2("Telefono", esc(p.telefono || "—")) + row2("Città", esc(p.citta || "—")) +
    row2("P. IVA", esc(p.piva || "—")) + row2("Tariffa oraria", p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") +
    row2("Competenze", esc(p.competenze || "—")) + row2("Note", esc(p.note || "—")) +
    "</tbody></table></div>";
  h += '<div class="card"><h3 style="margin-bottom:12px">Ultime ore</h3>' + tblOre(ore.slice(0, 10)) + "</div>";
  return h + "</div></div>";
}

/* ---------------- servizi ---------------- */
function tblServ(list) {
  if (!list.length) return '<div class="empty">Nessun servizio.</div>';
  var h = "<table><thead><tr><th>Servizio</th><th>Categoria</th><th>Professionista</th><th>Unità</th><th class=\"num\">Costo</th><th class=\"num\">Prezzo</th><th class=\"num\">Margine</th><th></th></tr></thead><tbody>";
  list.forEach(function (s) {
    var m = (+s.prezzo || 0) - (+s.costo || 0);
    h += "<tr><td>" + esc(s.nome) + (s.descrizione ? '<div class="faint">' + esc(s.descrizione) + "</div>" : "") + "</td><td>" + esc(s.cat || "—") + "</td><td>" + esc(nameOf(D.pros, s.pro_id)) + "</td><td>" + esc(s.unita || "—") + '</td><td class="num">' + eur(s.costo) + '</td><td class="num">' + eur(s.prezzo) + '</td><td class="num">' + eur(m) + ' <span class="faint">' + (s.prezzo ? Math.round(m / s.prezzo * 100) : 0) + '%</span></td><td class="num"><button class="lnk" data-edit="serv:' + s.id + '">Modifica</button></td></tr>';
  });
  return h + "</tbody></table>";
}
function vServizi() {
  var list = persp === "me" ? D.serv.filter(function (s) { return s.pro_id === me.pro_id; }) : D.serv;
  var cats = {};
  list.forEach(function (s) { cats[s.cat || "Altro"] = (cats[s.cat || "Altro"] || []).concat([s]); });
  var h = head("Servizi & listino", list.length + " servizi · margine medio " + (list.length ? Math.round(sum(list, function (s) { return s.prezzo ? ((s.prezzo - s.costo) / s.prezzo * 100) : 0; }) / list.length) : 0) + "%",
    '<button class="btn sm" data-new="serv">+ Nuovo servizio</button>');
  Object.keys(cats).sort().forEach(function (c) {
    h += '<div class="card"><div class="cardhead"><h2>' + esc(c) + '</h2><span class="faint">' + cats[c].length + " servizi</span></div>" + tblServ(cats[c]) + "</div>";
  });
  if (!list.length) h += '<div class="card"><div class="empty">Nessun servizio a listino.</div></div>';
  return h;
}

/* ---------------- fatturazione ---------------- */
function tblMov(list) {
  if (!list.length) return '<div class="empty">Nessun movimento.</div>';
  var h = "<table><thead><tr><th>Numero</th><th>Tipo</th><th>Cliente</th><th>Commessa</th><th>Emessa da</th><th>Data</th><th>Scadenza</th><th class=\"num\">Importo</th><th>Stato</th><th></th></tr></thead><tbody>";
  list.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).forEach(function (m) {
    var late = m.stato !== "Pagata" && m.scadenza && m.scadenza < today();
    h += "<tr><td>" + esc(m.numero || "—") + '</td><td><span class="badge ' + (m.tipo === "Attiva" ? "b-green" : "b-amber") + '">' + esc(m.tipo) + "</span></td><td>" + esc(m.cliente_id ? nameOf(D.cli, m.cliente_id) : "—") + "</td><td>" + esc(m.commessa_id ? nameOf(D.com, m.commessa_id, "titolo") : "—") + "</td><td>" + esc(nameOf(D.pros, m.pro_id)) + "</td><td>" + dt(m.data) + "</td><td>" + (late ? '<span class="badge b-red">' + dt(m.scadenza) + "</span>" : dt(m.scadenza)) + '</td><td class="num">' + eur(m.importo) + '</td><td><span class="badge ' + (MOV_COL[m.stato] || "") + '">' + esc(m.stato) + "</span></td><td class=\"num\">" + (m.stato !== "Pagata" ? '<button class="lnk" data-pay="' + m.id + '">Incassata</button> ' : "") + '<button class="lnk" data-edit="mov:' + m.id + '">Modifica</button></td></tr>';
  });
  return h + "</tbody></table>";
}
function vFatture() {
  var list = fmov();
  var att = list.filter(function (m) { return m.tipo === "Attiva"; }), pas = list.filter(function (m) { return m.tipo === "Passiva"; });
  var inc = sum(att.filter(function (m) { return m.stato === "Pagata"; }), function (m) { return m.importo; });
  var da = sum(att.filter(function (m) { return m.stato !== "Pagata"; }), function (m) { return m.importo; });
  var scad = att.filter(function (m) { return m.stato !== "Pagata" && m.scadenza && m.scadenza < today(); });
  var h = head("Fatturazione", "Movimenti attivi e passivi " + (persp === "me" ? "personali" : "dello studio"),
    '<button class="btn sm" data-new="mov">+ Nuovo movimento</button>');
  h += '<div class="grid g4">' +
    kpi(eur(inc), "Incassato", att.filter(function (m) { return m.stato === "Pagata"; }).length + " fatture pagate") +
    kpi(eur(da), "Da incassare", att.filter(function (m) { return m.stato !== "Pagata"; }).length + " aperte") +
    kpi(eur(sum(scad, function (m) { return m.importo; })), "Scaduto", scad.length + " oltre la scadenza") +
    kpi(eur(sum(pas, function (m) { return m.importo; })), "Uscite", pas.length + " movimenti passivi") +
    "</div>";
  var perPro = {};
  att.forEach(function (m) { if (m.pro_id) perPro[m.pro_id] = (perPro[m.pro_id] || 0) + (+m.importo || 0); });
  var pk = Object.keys(perPro).sort(function (a, b) { return perPro[b] - perPro[a]; });
  if (pk.length) {
    h += '<div class="card"><div class="cardhead"><h2>Chi fattura quanto</h2></div><div class="bars">' +
      pk.map(function (id) { return bar(nameOf(D.pros, id), perPro[id], perPro[pk[0]], eur(perPro[id])); }).join("") + "</div></div>";
  }
  h += '<div class="card"><div class="cardhead"><h2>Movimenti</h2></div>' + tblMov(list) + "</div>";
  return h;
}
/* ---------------- report ---------------- */
function vReport() {
  var com = fcom(), ore = fore(), mov = fmov();
  var vinte = com.filter(function (k) { return ["Approvata", "In corso", "Consegna", "Chiusa"].indexOf(k.stato) > -1; });
  var perse = com.filter(function (k) { return k.stato === "Persa"; });
  var conv = (vinte.length + perse.length) ? Math.round(vinte.length / (vinte.length + perse.length) * 100) : 0;
  var mesi = {};
  mov.filter(function (m) { return m.tipo === "Attiva"; }).forEach(function (m) {
    var k = (m.data || "").slice(0, 7); if (!k) return; mesi[k] = (mesi[k] || 0) + (+m.importo || 0);
  });
  var mk = Object.keys(mesi).sort();
  var topCli = fcli().slice().sort(function (a, b) { return valoreCliente(b.id) - valoreCliente(a.id); }).slice(0, 8);
  var fattOre = sum(ore.filter(function (o) { return o.fatturabile; }), function (o) { return o.ore; });
  var totOre = sum(ore, function (o) { return o.ore; });

  var h = head("Report", "Numeri e andamenti");
  h += '<div class="grid g4">' +
    kpi(conv + " %", "Tasso di conversione", vinte.length + " vinte / " + perse.length + " perse") +
    kpi(totOre ? Math.round(fattOre / totOre * 100) + " %" : "—", "Ore fatturabili", num(fattOre, 1) + " h su " + num(totOre, 1) + " h") +
    kpi(eur(com.length ? sum(com, function (k) { return calc(k).tot; }) / com.length : 0), "Valore medio commessa", com.length + " commesse") +
    kpi(eur(sum(com.filter(function (k) { return k.stato !== "Persa"; }), function (k) { return calc(k).margine; })), "Margine complessivo", "su commesse non perse") +
    "</div>";

  h += '<div class="grid g2" style="margin-top:16px">';
  h += '<div class="card"><div class="cardhead"><h2>Fatturato per mese</h2></div>';
  h += mk.length ? '<div class="bars">' + mk.map(function (k) { return bar(k, mesi[k], Math.max.apply(null, mk.map(function (x) { return mesi[x]; })), eur(mesi[k])); }).join("") + "</div>" : '<div class="empty">—</div>';
  h += "</div>";
  h += '<div class="card"><div class="cardhead"><h2>Top clienti per valore</h2></div>';
  h += topCli.length ? '<div class="bars">' + topCli.map(function (c) { return bar(c.nome, valoreCliente(c.id), valoreCliente(topCli[0].id) || 1, eur(valoreCliente(c.id))); }).join("") + "</div>" : '<div class="empty">—</div>';
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
    '<button class="btn sm ghost" data-new="spazi">+ Nuovo spazio</button><button class="btn sm" data-new="pren">+ Prenotazione</button>');
  h += '<div class="card" style="background:var(--cream);border-style:dashed"><h2>Coming soon</h2><p class="muted" style="margin-top:6px">La sede è in fase di ricerca. Qui gestirai postazioni, sale riunioni e spazi partner: la struttura è già pronta, si accende quando apriamo.</p></div>';
  h += '<div class="grid g3" style="margin-top:16px">';
  D.spazi.forEach(function (s) {
    var pr = D.pren.filter(function (p) { return p.spazio_id === s.id; });
    h += '<div class="card"><div class="cardhead"><h2>' + esc(s.nome) + '</h2><span class="badge ' + (s.stato === "Attivo" ? "b-green" : "b-amber") + '">' + esc(s.stato || "—") + "</span></div><table><tbody>" +
      row2("Indirizzo", esc(s.indirizzo || "—")) + row2("Tipo", esc(s.tipo || "—")) + row2("Opzioni", esc(s.opzioni || "—")) +
      row2("Costo", esc(s.costo || "—")) + row2("Capienza", s.capienza ? s.capienza + " postazioni" : "—") +
      row2("Partner", esc(s.partner || "interno")) + row2("Prenotazioni", pr.length) +
      '</tbody></table><div style="margin-top:12px"><button class="btn sm ghost" data-edit="spazi:' + s.id + '">Modifica</button></div></div>';
  });
  h += "</div>";
  var pren = D.pren.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
  h += '<div class="card"><div class="cardhead"><h2>Prenotazioni</h2><button class="btn sm ghost" data-new="pren">+ Prenota</button></div>';
  h += pren.length ? "<table><thead><tr><th>Data</th><th>Spazio</th><th>Chi</th><th>Slot</th><th>Stato</th><th></th></tr></thead><tbody>" + pren.map(function (p) {
    return "<tr><td>" + dt(p.data) + "</td><td>" + esc(nameOf(D.spazi, p.spazio_id)) + "</td><td>" + esc(nameOf(D.pros, p.pro_id)) + "</td><td>" + esc(p.slot || "—") + '</td><td><span class="badge b-green">' + esc(p.stato || "—") + '</span></td><td class="num"><button class="lnk" data-del="pren:' + p.id + '">Annulla</button></td></tr>';
  }).join("") + "</tbody></table>" : '<div class="empty">Nessuna prenotazione: si parte quando apriamo la sede.</div>';
  return h + "</div>";
}

/* ---------------- impostazioni ---------------- */
function vSettings() {
  var h = head("Impostazioni", "Studio, profilo e accessi");
  h += '<div class="grid g2">';
  h += '<div class="card"><h2>Studio</h2><form data-form="settings" style="margin-top:14px"><div class="field"><label>Fee di coordinamento predefinita (%)</label><input name="fee_default" type="number" step="1" value="' + (SET.fee_default || 0) + '" /></div><button class="btn" type="submit">Salva</button></form></div>';
  h += '<div class="card"><h2>Il mio profilo</h2>';
  if (me.pro_id) {
    var p = by(D.pros, me.pro_id);
    h += '<table style="margin-top:12px"><tbody>' + row2("Nome", esc(p ? p.nome : "—")) + row2("Ruolo", esc(p ? p.ruolo : "—")) + row2("Tariffa oraria", p && p.tariffa_oraria ? eur(p.tariffa_oraria) + "/h" : "—") + row2("Permessi", esc(me.ruolo)) + "</tbody></table>" +
      '<div style="margin-top:12px"><button class="btn sm ghost" data-edit="pros:' + me.pro_id + '">Modifica anagrafica</button></div>';
  } else {
    h += '<p class="muted" style="margin-top:10px">Il tuo utente non è ancora collegato a un professionista del pool: la vista "Solo io" resterà vuota. Collega l\'utente dalla tabella <code>membri</code>.</p>';
  }
  h += "</div>";
  h += '<div class="card"><h2>Cambia password</h2><form data-form="password" style="margin-top:14px"><div class="field"><label>Nuova password</label><input name="pw" type="password" placeholder="almeno 8 caratteri" autocomplete="new-password" /></div><button class="btn" type="submit">Aggiorna password</button></form><p class="faint" style="margin-top:8px">Vale per l\'utente con cui sei connesso: ' + esc(me.email) + "</p></div>";
  h += '<div class="card"><h2>Membri e accessi</h2><table style="margin-top:12px"><thead><tr><th>Email</th><th>Professionista</th><th>Ruolo</th></tr></thead><tbody>' +
    D.membri.map(function (m) { return "<tr><td>" + esc(m.email || "—") + "</td><td>" + esc(nameOf(D.pros, m.pro_id)) + '</td><td><span class="badge">' + esc(m.ruolo || "membro") + "</span></td></tr>"; }).join("") +
    '</tbody></table><p class="faint" style="margin-top:10px">Nuovi accessi: Supabase → Authentication → Users, poi collega l\'utente a un professionista nella tabella <code>membri</code>.</p></div>';
  return h + "</div>";
}
/* ---------------- preventivo / portale ---------------- */
function docHead(k, titolo) {
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-family:var(--ffd);font-size:1.6rem;color:var(--ink)">Giraffa</div><div style="font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;color:var(--terra)">Studio</div></div><div style="text-align:right"><h2>' + titolo + '</h2><div class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + dt(today()) + "</div></div></div>";
}
function openPreventivo(id) {
  var k = by(D.com, id); if (!k) return;
  var c = calc(k);
  var rows = righeOf(k.id).map(function (r) {
    var s = by(D.serv, r.serv_id); if (!s) return "";
    return "<tr><td>" + esc(s.nome) + (s.descrizione ? '<div class="faint">' + esc(s.descrizione) + "</div>" : "") + '</td><td class="faint">' + esc(nameOf(D.pros, s.pro_id)) + '</td><td class="num">' + (r.qty || 1) + '</td><td class="num">' + eur((s.prezzo || 0) * (r.qty || 1)) + "</td></tr>";
  }).join("");
  modal('<div class="box wide">' + docHead(k, "Preventivo") +
    '<h2 style="margin-top:22px">' + esc(k.titolo) + "</h2>" +
    '<table style="margin-top:14px"><thead><tr><th>Servizio</th><th>A cura di</th><th class="num">Q.tà</th><th class="num">Importo</th></tr></thead><tbody>' + rows + "</tbody></table>" +
    '<table style="margin-top:16px"><tbody>' + row2("Imponibile", eur(c.imp)) + row2("Coordinamento Giraffa Studio (" + (k.fee || 0) + "%)", eur(c.fee)) + row2("<b>Totale</b>", "<b>" + eur(c.tot) + "</b>") + "</tbody></table>" +
    '<p class="faint" style="margin-top:14px">Importi IVA esclusa. Validità 30 giorni. Ogni professionista opera con la propria partita IVA sotto il coordinamento di Giraffa Studio.</p>' +
    '<div class="actions noprint"><button class="btn ghost" data-close>Chiudi</button><button class="btn" onclick="window.print()">Stampa / PDF</button></div></div>');
}
function openPortale(id) {
  var k = by(D.com, id); if (!k) return;
  var c = calc(k), tk = taskOf(k.id);
  var rows = righeOf(k.id).map(function (r) {
    var s = by(D.serv, r.serv_id); if (!s) return "";
    return "<tr><td>" + esc(s.nome) + '</td><td class="faint">' + esc(nameOf(D.pros, s.pro_id)) + '</td><td class="num">' + eur((s.prezzo || 0) * (r.qty || 1)) + "</td></tr>";
  }).join("");
  modal('<div class="box wide">' + docHead(k, "Stato lavori") +
    '<h2 style="margin-top:22px">' + esc(k.titolo) + '</h2><p class="muted">' + esc(k.note || "") + "</p>" +
    '<div class="grid g3" style="margin-top:16px">' + kpi(esc(k.stato), "Stato") + kpi(dt(k.scadenza), "Consegna prevista") + kpi(eur(c.tot), "Valore concordato") + "</div>" +
    '<h3 style="margin:20px 0 8px">Cosa comprende</h3><table><tbody>' + rows + "</tbody></table>" +
    '<h3 style="margin:20px 0 8px">Avanzamento</h3>' + (tk.length ? "<table><tbody>" + tk.map(function (t) { return "<tr><td>" + esc(t.titolo) + '</td><td class="num"><span class="badge ' + (t.stato === "Fatto" ? "b-green" : t.stato === "In corso" ? "b-terra" : "") + '">' + esc(t.stato) + "</span></td></tr>"; }).join("") + "</tbody></table>" : '<div class="empty">Nessuna attività pubblicata.</div>') +
    '<p class="faint" style="margin-top:14px">Vista pensata per il cliente: nessun costo interno, nessun margine.</p>' +
    '<div class="actions noprint"><button class="btn ghost" data-close>Chiudi</button><button class="btn" onclick="window.print()">Stampa / PDF</button></div></div>');
}

/* ---------------- form engine ---------------- */
function opt(list, val, f) { return '<option value=""></option>' + list.map(function (o) { return '<option value="' + o.id + '"' + (val === o.id ? " selected" : "") + ">" + esc(o[f || "nome"]) + "</option>"; }).join(""); }
function sel(list, val) { return list.map(function (o) { return '<option value="' + esc(o) + '"' + (val === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join(""); }

var FORMS = {
  com: { t: "Commessa", tb: "com", f: function (r) {
    return fld("titolo", "Titolo", "text", r.titolo, true) +
      '<div class="row2"><div class="field"><label>Cliente</label><select name="cliente_id">' + opt(D.cli, r.cliente_id) + '</select></div><div class="field"><label>Stato</label><select name="stato">' + sel(STATI, r.stato || "Bozza") + "</select></div></div>" +
      '<div class="row2"><div class="field"><label>Owner (chi porta il cliente)</label><select name="owner_id">' + opt(D.pros, r.owner_id) + '</select></div><div class="field"><label>Regia / PM</label><select name="pm_id">' + opt(D.pros, r.pm_id) + "</select></div></div>" +
      '<div class="row2"><div class="field"><label>Modello di fatturazione</label><select name="modello">' + sel(MODELLI, r.modello) + "</select></div>" + fld("fee", "Fee coordinamento (%)", "number", r.fee == null ? SET.fee_default : r.fee) + "</div>" +
      '<div class="row2">' + fld("inizio", "Inizio", "date", r.inizio) + fld("scadenza", "Scadenza", "date", r.scadenza) + "</div>" +
      '<div class="row2">' + fld("probabilita", "Probabilità (%)", "number", r.probabilita == null ? 50 : r.probabilita) + fld("budget_ore", "Budget ore", "number", r.budget_ore) + "</div>" +
      fld("note", "Note", "textarea", r.note);
  }},
  cli: { t: "Cliente", tb: "cli", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      '<div class="row2">' + fld("settore", "Settore", "text", r.settore) + '<div class="field"><label>Stato</label><select name="stato">' + sel(["Lead", "Attivo", "Dormiente", "Chiuso"], r.stato || "Lead") + "</select></div></div>" +
      '<div class="row2">' + fld("referente", "Referente", "text", r.referente) + fld("email", "Email", "email", r.email) + "</div>" +
      '<div class="row2">' + fld("telefono", "Telefono", "text", r.telefono) + fld("sito", "Sito web", "text", r.sito) + "</div>" +
      '<div class="row2">' + fld("piva", "P. IVA", "text", r.piva) + '<div class="field"><label>Owner</label><select name="owner_id">' + opt(D.pros, r.owner_id) + "</select></div></div>" +
      fld("indirizzo", "Indirizzo", "text", r.indirizzo) + fld("note", "Note", "textarea", r.note);
  }},
  pros: { t: "Professionista", tb: "pros", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      '<div class="row2">' + fld("ruolo", "Ruolo", "text", r.ruolo) + '<div class="field"><label>Vetting</label><select name="vetting">' + sel(["In valutazione", "Attivo", "Sospeso"], r.vetting || "In valutazione") + "</select></div></div>" +
      fld("competenze", "Competenze (separate da virgola)", "text", r.competenze) +
      '<div class="row2">' + fld("email", "Email", "email", r.email) + fld("telefono", "Telefono", "text", r.telefono) + "</div>" +
      '<div class="row2">' + fld("citta", "Città", "text", r.citta) + fld("piva", "P. IVA", "text", r.piva) + "</div>" +
      '<div class="row2">' + fld("tariffa_oraria", "Tariffa oraria (€)", "number", r.tariffa_oraria) + fld("rating", "Rating (1-5)", "number", r.rating == null ? 5 : r.rating) + "</div>" +
      fld("note", "Note", "textarea", r.note);
  }},
  serv: { t: "Servizio", tb: "serv", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) +
      '<div class="field"><label>Professionista</label><select name="pro_id">' + opt(D.pros, r.pro_id) + "</select></div>" +
      '<div class="row2">' + fld("cat", "Categoria", "text", r.cat) + fld("unita", "Unità (progetto, mese, shooting…)", "text", r.unita) + "</div>" +
      '<div class="row2">' + fld("costo", "Costo al professionista (€)", "number", r.costo) + fld("prezzo", "Prezzo al cliente (€)", "number", r.prezzo) + "</div>" +
      fld("descrizione", "Descrizione", "textarea", r.descrizione);
  }},
  task: { t: "Attività", tb: "task", f: function (r) {
    return fld("titolo", "Titolo", "text", r.titolo, true) +
      '<div class="row2"><div class="field"><label>Commessa</label><select name="commessa_id">' + opt(D.com, r.commessa_id, "titolo") + '</select></div><div class="field"><label>Assegnata a</label><select name="assegnato_id">' + opt(D.pros, r.assegnato_id) + "</select></div></div>" +
      '<div class="row2"><div class="field"><label>Stato</label><select name="stato">' + sel(TASK_STATI, r.stato || "Da fare") + '</select></div><div class="field"><label>Priorità</label><select name="priorita">' + sel(["Bassa", "Media", "Alta"], r.priorita || "Media") + "</select></div></div>" +
      fld("scadenza", "Scadenza", "date", r.scadenza) + fld("note", "Note", "textarea", r.note);
  }},
  ore: { t: "Ore", tb: "ore", f: function (r) {
    return '<div class="row2"><div class="field"><label>Commessa</label><select name="commessa_id">' + opt(D.com, r.commessa_id, "titolo") + '</select></div><div class="field"><label>Chi</label><select name="pro_id">' + opt(D.pros, r.pro_id || me.pro_id) + "</select></div></div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + fld("ore", "Ore", "number", r.ore) + "</div>" +
      '<div class="row2">' + fld("tariffa", "Tariffa oraria (€)", "number", r.tariffa == null ? (me.pro_id && by(D.pros, me.pro_id) ? by(D.pros, me.pro_id).tariffa_oraria : 0) : r.tariffa) +
      '<div class="field"><label>Fatturabile</label><select name="fatturabile">' + sel(["si", "no"], r.fatturabile === false ? "no" : "si") + "</select></div></div>" +
      fld("descrizione", "Descrizione", "text", r.descrizione);
  }},
  mov: { t: "Movimento", tb: "mov", f: function (r) {
    return '<div class="row2"><div class="field"><label>Tipo</label><select name="tipo">' + sel(["Attiva", "Passiva"], r.tipo || "Attiva") + '</select></div><div class="field"><label>Stato</label><select name="stato">' + sel(["Da emettere", "Emessa", "Pagata", "Insoluta"], r.stato || "Da emettere") + "</select></div></div>" +
      '<div class="row2"><div class="field"><label>Commessa</label><select name="commessa_id">' + opt(D.com, r.commessa_id, "titolo") + '</select></div><div class="field"><label>Cliente</label><select name="cliente_id">' + opt(D.cli, r.cliente_id) + "</select></div></div>" +
      '<div class="field"><label>Emessa da (professionista)</label><select name="pro_id">' + opt(D.pros, r.pro_id) + "</select></div>" +
      '<div class="row2">' + fld("numero", "Numero", "text", r.numero) + fld("importo", "Importo (€)", "number", r.importo) + "</div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + fld("scadenza", "Scadenza", "date", r.scadenza) + "</div>" +
      fld("note", "Note", "text", r.note);
  }},
  inter: { t: "Interazione", tb: "inter", f: function (r) {
    return '<div class="row2"><div class="field"><label>Cliente</label><select name="cliente_id">' + opt(D.cli, r.cliente_id) + '</select></div><div class="field"><label>Tipo</label><select name="tipo">' + sel(["Nota", "Chiamata", "Email", "Meeting"], r.tipo || "Nota") + "</select></div></div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + '<div class="field"><label>Chi</label><select name="pro_id">' + opt(D.pros, r.pro_id || me.pro_id) + "</select></div></div>" +
      fld("testo", "Testo", "textarea", r.testo);
  }},
  doc: { t: "Documento", tb: "doc", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) + fld("url", "Link (Drive, Dropbox, sito…)", "text", r.url) +
      '<div class="row2"><div class="field"><label>Tipo</label><select name="tipo">' + sel(["Link", "Contratto", "Brief", "Consegna", "Fattura"], r.tipo || "Link") + '</select></div><div class="field"><label>Commessa</label><select name="commessa_id">' + opt(D.com, r.commessa_id, "titolo") + "</select></div></div>";
  }},
  spazi: { t: "Spazio", tb: "spazi", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) + fld("indirizzo", "Indirizzo", "text", r.indirizzo) +
      '<div class="row2">' + fld("tipo", "Tipo", "text", r.tipo) + fld("capienza", "Capienza", "number", r.capienza) + "</div>" +
      '<div class="row2">' + fld("opzioni", "Opzioni", "text", r.opzioni) + fld("costo", "Costo", "text", r.costo) + "</div>" +
      '<div class="row2">' + fld("partner", "Partner", "text", r.partner) + '<div class="field"><label>Stato</label><select name="stato">' + sel(["Coming soon", "Attivo", "Chiuso"], r.stato || "Coming soon") + "</select></div></div>" +
      fld("referente", "Referente", "text", r.referente);
  }},
  pren: { t: "Prenotazione", tb: "pren", f: function (r) {
    return '<div class="row2"><div class="field"><label>Spazio</label><select name="spazio_id">' + opt(D.spazi, r.spazio_id) + '</select></div><div class="field"><label>Chi</label><select name="pro_id">' + opt(D.pros, r.pro_id || me.pro_id) + "</select></div></div>" +
      '<div class="row2">' + fld("data", "Data", "date", r.data || today()) + '<div class="field"><label>Slot</label><select name="slot">' + sel(["Giornata", "Mattina", "Pomeriggio", "Sala riunioni"], r.slot || "Giornata") + "</select></div></div>" +
      fld("note", "Note", "text", r.note);
  }}
};
function fld(n, l, t, v, req) {
  if (t === "textarea") return '<div class="field"><label>' + l + '</label><textarea name="' + n + '">' + esc(v || "") + "</textarea></div>";
  return '<div class="field"><label>' + l + '</label><input name="' + n + '" type="' + t + '"' + (t === "number" ? ' step="any"' : "") + (req ? " required" : "") + ' value="' + esc(v == null ? "" : v) + '" /></div>';
}
function modal(html) { el("#modal").innerHTML = '<div class="modal">' + html + "</div>"; }
function openForm(entity, id, ctx) {
  var F = FORMS[entity]; if (!F) return;
  var r = id ? (by(D[F.tb], id) || {}) : (ctx || {});
  modal('<form class="box" data-save="' + entity + ':' + (id || "") + '"><h2>' + (id ? "Modifica" : "Nuovo") + " · " + F.t + "</h2>" + F.f(r) +
    '<div class="actions">' + (id ? '<button type="button" class="btn danger" data-del="' + entity + ":" + id + '">Elimina</button>' : "") +
    '<button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Salva</button></div></form>');
}
async function saveForm(f) {
  var parts = f.dataset.save.split(":"), entity = parts[0], id = parts[1];
  var F = FORMS[entity], obj = {};
  Array.prototype.forEach.call(f.elements, function (i) {
    if (!i.name) return;
    var v = i.value;
    if (v === "") v = null;
    else if (i.type === "number") v = +v;
    else if (i.name === "fatturabile") v = v === "si";
    obj[i.name] = v;
  });
  var r = id ? await sb.from(TB[F.tb]).update(obj).eq("id", id) : await sb.from(TB[F.tb]).insert(obj);
  if (r.error) { toast(r.error.message, true); return; }
  await reload([F.tb]);
  closeModal(); toast(F.t + (id ? " aggiornato" : " creato")); render();
}
async function delRow(entity, id) {
  var tbk = FORMS[entity] ? FORMS[entity].tb : entity;
  if (!confirm("Eliminare definitivamente?")) return;
  var r = await sb.from(TB[tbk]).delete().eq("id", id);
  if (r.error) { toast(r.error.message, true); return; }
  await reload([tbk]);
  closeModal();
  if ((view === "commessa" && tbk === "com") || (view === "cliente" && tbk === "cli")) { go(tbk === "com" ? "commesse" : "clienti"); return; }
  toast("Eliminato"); render();
}
function openRiga(kid) {
  modal('<form class="box" data-riga-save="' + kid + '"><h2>Aggiungi servizio</h2>' +
    '<div class="field"><label>Servizio</label><select name="serv_id" required>' + D.serv.map(function (s) { return '<option value="' + s.id + '">' + esc(s.nome) + " · " + esc(nameOf(D.pros, s.pro_id)) + " · " + eur(s.prezzo) + "</option>"; }).join("") + "</select></div>" +
    fld("qty", "Quantità", "number", 1) +
    '<div class="actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Aggiungi</button></div></form>');
}
/* ---------------- render ---------------- */
function render() {
  buildNav();
  var v = { dash: vDash, commesse: vCommesse, commessa: vCommessa, clienti: vClienti, cliente: vCliente, pool: vPool, pro: vPro, servizi: vServizi, task: vTask, ore: vOre, fatture: vFatture, report: vReport, spazi: vSpazi, impostazioni: vSettings }[view] || vDash;
  el("#main").innerHTML = v();
  var s = el("#search"); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}

/* ---------------- eventi ---------------- */
document.addEventListener("click", async function (e) {
  var t = e.target.closest("button, [data-open-task], [data-close]");
  if (!t) return;
  var d = t.dataset || {};
  if (t.hasAttribute("data-close")) { closeModal(); return; }
  if (d.go) { go(d.go); return; }
  if (d.tab) { tab = d.tab; render(); return; }
  if (d.openCom) { go("commessa", d.openCom, "servizi"); return; }
  if (d.openCli) { go("cliente", d.openCli); return; }
  if (d.openPro) { go("pro", d.openPro); return; }
  if (d.openTask) { openForm("task", d.openTask); return; }
  if (d.new) {
    var ctx = {};
    if (d.ctx) { ctx.commessa_id = d.ctx; if (d.new === "inter") { ctx = { cliente_id: d.ctx }; } if (d.new === "com") ctx = { cliente_id: d.ctx }; }
    if (d.ctxCli) ctx.cliente_id = d.ctxCli;
    if (d.ctxPro) ctx.pro_id = d.ctxPro;
    openForm(d.new, null, ctx); return;
  }
  if (d.edit) { var p = d.edit.split(":"); openForm(p[0], p[1]); return; }
  if (d.del) { var q = d.del.split(":"); await delRow(q[0], q[1]); return; }
  if (d.riga) { openRiga(d.riga); return; }
  if (d.preventivo) { openPreventivo(d.preventivo); return; }
  if (d.portale) { openPortale(d.portale); return; }
  if (d.done) {
    var r = await sb.from("task").update({ stato: "Fatto" }).eq("id", d.done);
    if (r.error) { toast(r.error.message, true); return; }
    await reload(["task"]); toast("Attività completata"); render(); return;
  }
  if (d.pay) {
    var r2 = await sb.from("movimenti").update({ stato: "Pagata" }).eq("id", d.pay);
    if (r2.error) { toast(r2.error.message, true); return; }
    await reload(["mov"]); toast("Segnata come incassata"); render(); return;
  }
});

document.addEventListener("submit", async function (e) {
  var f = e.target;
  if (f.id === "loginform") { e.preventDefault(); return doLogin(f); }
  if (f.dataset.save) { e.preventDefault(); return saveForm(f); }
  if (f.dataset.rigaSave) {
    e.preventDefault();
    var r = await sb.from("righe").insert({ commessa_id: f.dataset.rigaSave, serv_id: f.serv_id.value, qty: +f.qty.value || 1 });
    if (r.error) { toast(r.error.message, true); return; }
    await reload(["righe"]); closeModal(); toast("Servizio aggiunto"); render(); return;
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
  if (e.target.id === "persp") { persp = e.target.value; if (view === "commessa" || view === "cliente" || view === "pro") view = "dash"; render(); }
});
document.addEventListener("input", function (e) {
  if (e.target.id === "search") { search = e.target.value; render(); }
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
  show("app"); render();
}
async function init() {
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { show("setup"); return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  el("#logout").addEventListener("click", async function () { await sb.auth.signOut(); location.reload(); });
  await start();
}
init();
})();
