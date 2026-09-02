/* Giraffa Studio — CRM v3 (ruoli: admin · professionista · pr · cliente) */
(function () {
"use strict";

var cfg = window.GS_CONFIG || {};
var sb = null, user = null;
var me = { pro_id: null, cliente_id: null, ruolo: "", nome: "", email: "" };
var D = { pros: [], serv: [], cli: [], com: [], righe: [], spazi: [], task: [], ore: [], mov: [], inter: [], pren: [], membri: [], fasi: [], mat: [], pag: [], appr: [], vari: [], ev: [] };
var SET = { fee_default: 12 };
var TB = { pros: "professionisti", serv: "servizi", cli: "clienti", com: "commesse", righe: "righe", spazi: "spazi", task: "task", ore: "ore", mov: "movimenti", inter: "interazioni", pren: "prenotazioni", membri: "membri", fasi: "fasi", mat: "materiali", pag: "pagamenti", appr: "approvazioni", vari: "varianti", ev: "eventi" };

var view = "dash", current = null, tab = "", persp = "all", search = "";
var PORT = [], STATS = null;

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

function calc(k) {
  var imp = 0, cost = 0, mio = 0;
  righeOf(k.id).forEach(function (r) {
    var s = by(D.serv, r.serv_id); if (!s) return;
    imp += (+s.prezzo || 0) * (r.qty || 1);
    cost += (+s.costo || 0) * (r.qty || 1);
    if (me.pro_id && (r.assegnato_id === me.pro_id || (!r.assegnato_id && s.pro_id === me.pro_id))) mio += (+s.costo || 0) * (r.qty || 1);
  });
  var fee = Math.round(imp * (+k.fee || 0) / 100);
  var tot = imp + fee;
  var prov = Math.round(tot * (+k.provvigione || 0) / 100);
  return { imp: imp, cost: cost, fee: fee, tot: tot, margine: tot - cost, mio: mio, prov: prov };
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
    { k: "commesse", t: "Le mie commesse", c: function () { return fcom().length; } },
    { k: "task", t: "Attività", c: function () { return ftask().filter(function (t) { return t.stato !== "Fatto"; }).length; } },
    { g: "Relazioni" }, { k: "clienti", t: "I miei clienti", c: function () { return fcli().length; } },
    { g: "Soldi" }, { k: "provvigioni", t: "Provvigioni" },
    { g: "Studio" }, { k: "impostazioni", t: "Impostazioni" }
  ];
  if (isPro()) return [
    { g: "Il mio lavoro" }, { k: "dash", t: "Dashboard" },
    { k: "commesse", t: "Commesse", c: function () { return fcom().length; } },
    { k: "task", t: "Attività", c: function () { return ftask().filter(function (t) { return t.stato !== "Fatto"; }).length; } },
    { k: "ore", t: "Ore & timesheet" },
    { g: "Relazioni" }, { k: "clienti", t: "Clienti", c: function () { return fcli().length; } },
    { k: "servizi", t: "I miei servizi" },
    { g: "Soldi" }, { k: "fatture", t: "Le mie fatture" },
    { g: "Studio" }, { k: "spazi", t: "Spazi & ufficio" }, { k: "impostazioni", t: "Impostazioni" }
  ];
  return [
    { g: "Lavoro" }, { k: "dash", t: "Dashboard" },
    { k: "commesse", t: "Commesse", c: function () { return fcom().filter(function (k) { return ["Preventivo", "Approvata", "In corso", "Consegna"].indexOf(k.stato) > -1; }).length; } },
    { k: "task", t: "Attività", c: function () { return ftask().filter(function (t) { return t.stato !== "Fatto"; }).length; } },
    { k: "ore", t: "Ore & timesheet" },
    { g: "Relazioni" }, { k: "clienti", t: "Clienti", c: function () { return fcli().length; } },
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
  el("#nav").innerHTML = h;
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

  var h = head("Ciao " + (me.nome || "").split(" ")[0], isPR() ? "Le tue segnalazioni e le commesse che segui" : "Quello che devi tenere d'occhio oggi",
    '<button class="btn sm" data-new="com">+ Nuova commessa</button>' + (isPR() ? "" : '<button class="btn sm ghost" data-new="ore">+ Registra ore</button>'));

  if (isPR()) {
    var prov = sum(com, function (k) { return calc(k).prov; });
    var provOk = sum(com.filter(function (k) { return ["In corso", "Consegna", "Chiusa"].indexOf(k.stato) > -1; }), function (k) { return calc(k).prov; });
    h += '<div class="grid g4">' +
      kpi(String(com.length), "Le mie commesse", aperte.length + " in corso o da chiudere") +
      kpi(eur(pipeline), "Valore seguito", "prezzo al cliente") +
      kpi(eur(prov), "Provvigioni potenziali", "sul totale delle commesse") +
      kpi(eur(provOk), "Provvigioni maturate", "su commesse partite") + "</div>";
  } else {
    var rischio = com.filter(function (k) { return salute(k).c === "b-red"; });
    h += '<div class="grid g4">' +
      kpi(eur(pipeline), "Pipeline aperta", aperte.length + " commesse attive") +
      kpi(eur(sum(com, function (k) { return calc(k).mio; })), "Il mio compenso", "sulle righe assegnate a me") +
      kpi(num(sum(oreMese, function (o) { return o.ore; }), 1) + " h", "Ore questo mese", ore.length + " registrazioni totali") +
      kpi(String(rischio.length), "Commesse a rischio", tk.filter(function (t) { return t.stato !== "Fatto"; }).length + " attività aperte") + "</div>";
  }

  h += '<div class="grid g32" style="margin-top:16px">';
  h += '<div class="card"><div class="cardhead"><h2>Commesse in corso</h2><button class="btn sm ghost" data-go="commesse">Vedi tutte</button></div>';
  h += com.length ? tblCom(com.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); }).slice(0, 8)) : vuoto("Nessuna commessa ancora.", '<button class="lnk" data-new="com">Creane una</button>');
  h += "</div><div>";

  h += '<div class="card"><div class="cardhead"><h2>Da fare a breve</h2><button class="btn sm ghost" data-go="task">Attività</button></div>';
  h += urgenti.length ? '<ul class="timeline">' + urgenti.slice(0, 6).map(function (t) {
    return '<li><button class="lnk" data-open-task="' + t.id + '">' + esc(t.titolo) + '</button><div class="when">' + (t.commessa_id ? esc(nameOf(D.com, t.commessa_id, "titolo")) + " · " : "") + (t.scadenza < today() ? '<span class="badge b-red">scaduta</span> ' : "") + dt(t.scadenza) + "</div></li>";
  }).join("") + "</ul>" : vuoto("Niente in scadenza. Bene così.");
  h += "</div>";

  h += '<div class="card"><div class="cardhead"><h2>In attesa del cliente</h2></div>';
  h += attesa.length ? '<ul class="timeline">' + attesa.slice(0, 6).map(function (a) {
    return '<li><button class="lnk" data-open-com="' + a.commessa_id + '">' + esc(nameOf(D.com, a.commessa_id, "titolo")) + '</button><div class="when">' + esc(a.tipo) + " · richiesta il " + dt(a.richiesta_il) + "</div></li>";
  }).join("") + "</ul>" : vuoto("Nessuna approvazione in sospeso.");
  h += "</div>";

  if (!isPR()) {
    h += '<div class="card"><div class="cardhead"><h2>Incassi</h2><button class="btn sm ghost" data-go="fatture">Fatture</button></div><table><tbody>' +
      row2("Da incassare", eur(sum(pagAperti, function (p) { return p.importo; }))) +
      row2("Scaduto", '<span class="' + (scaduti.length ? "badge b-red" : "") + '">' + eur(sum(scaduti, function (p) { return p.importo; })) + "</span>") +
      row2("Incassato", eur(sum(D.pag.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; }))) +
      "</tbody></table></div>";
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

function tblCom(list) {
  var h = '<table><thead><tr><th>Commessa</th><th>Cliente</th><th>Stato</th><th>Salute</th><th>Avanz.</th><th>Scadenza</th><th class="num">' + (isPR() ? "Provvigione" : "Valore") + "</th><th></th></tr></thead><tbody>";
  list.forEach(function (k) {
    var c = calc(k), av = avanzamento(k.id), sal = salute(k), b = budget(k);
    h += '<tr><td><button class="lnk" data-open-com="' + k.id + '">' + esc(k.titolo) + "</button>" + (condivisa(k) ? ' <span class="chip">condivisa</span>' : "") + "</td>" +
      "<td>" + esc(nameOf(D.cli, k.cliente_id)) + "</td>" +
      '<td><span class="badge ' + (STATO_COL[k.stato] || "") + '">' + esc(k.stato) + "</span></td>" +
      '<td><span class="badge ' + sal.c + '">' + sal.t + "</span></td>" +
      '<td style="min-width:90px">' + (av == null ? '<span class="faint">—</span>' : av + "%" + prog(av)) + "</td>" +
      "<td>" + (k.scadenza ? (k.scadenza < today() && ["Chiusa", "Persa"].indexOf(k.stato) < 0 ? '<span class="badge b-red">' + dshort(k.scadenza) + "</span>" : dt(k.scadenza)) : "—") + "</td>" +
      '<td class="num">' + (isPR() ? eur(c.prov) : eur(b.ricavo)) + "</td>" +
      '<td class="num"><button class="lnk" data-duplica="' + k.id + '">Duplica</button></td></tr>';
  });
  return h + "</tbody></table>";
}
/* ---------------- commesse ---------------- */
function vCommesse() {
  var list = fcom();
  if (search) list = list.filter(function (k) { return (k.titolo + " " + nameOf(D.cli, k.cliente_id)).toLowerCase().indexOf(search.toLowerCase()) > -1; });
  var h = head("Commesse", list.length + " commesse · " + eur(sum(list, function (k) { return calc(k).tot; })) + " di valore",
    '<input id="search" placeholder="Cerca…" style="width:170px" value="' + esc(search) + '"><button class="btn sm" data-new="com">+ Nuova commessa</button>');
  var per = {}; STATI.forEach(function (s) { per[s] = list.filter(function (k) { return k.stato === s; }); });
  var mx = Math.max.apply(null, STATI.map(function (s) { return sum(per[s], function (k) { return calc(k).tot; }); }).concat([1]));
  h += '<div class="card"><div class="cardhead"><h2>A che punto siamo</h2></div><div class="bars">';
  STATI.forEach(function (s) { if (per[s].length) h += bar(s + " (" + per[s].length + ")", sum(per[s], function (k) { return calc(k).tot; }), mx, eur(sum(per[s], function (k) { return calc(k).tot; }))); });
  h += "</div></div>";
  h += '<div class="card">' + (list.length ? tblCom(list.slice().sort(function (a, b) { return STATI.indexOf(a.stato) - STATI.indexOf(b.stato); })) : vuoto("Nessuna commessa.", '<button class="lnk" data-new="com">Creane una</button>')) + "</div>";
  return h;
}

function vCommessa() {
  var k = by(D.com, current);
  if (!k) return '<div class="card">Commessa non trovata. <button class="lnk" data-go="commesse">Torna all\'elenco</button></div>';
  var c = calc(k), ore = oreOf(k.id), tk = taskOf(k.id), mv = movOf(k.id), fs = fasiOf(k.id), mt = matOf(k.id), pg = pagOf(k.id), ap = apprOf(k.id);
  var oreT = sum(ore, function (o) { return o.ore; }), av = avanzamento(k.id);
  var incassato = sum(pg.filter(function (p) { return p.stato === "Incassato"; }), function (p) { return p.importo; });
  var t = tab || "fasi";

  var b = budget(k), sal = salute(k), vr = variOf(k.id);

  var h = '<div class="top"><h1>' + esc(k.titolo) + '<span class="sub">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + esc(k.stato) + " · " + esc(k.tipo_prezzo || "Fisso") + (condivisa(k) ? " · condivisa con " + (proDi(k.id).length - 1) + " colleghi" : " · solo tua") + '</span></h1><div class="tools">' +
    '<button class="btn sm ghost" data-go="commesse">← Commesse</button>' +
    '<button class="btn sm ghost" data-edit="com:' + k.id + '">Modifica</button>' +
    '<button class="btn sm ghost" data-preventivo="' + k.id + '">Preventivo</button>' +
    '<button class="btn sm" data-portale="' + k.id + '">Anteprima cliente</button></div></div>';

  h += '<div class="grid g4">' +
    kpi(eur(b.ricavo), "Valore commessa", b.extra ? eur(k.budget_importo || c.tot) + " + " + eur(b.extra) + " di varianti" : "imponibile " + eur(c.imp) + " + fee " + (k.fee || 0) + "%") +
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

  h += '<div class="grid g32" style="margin-top:16px"><div>';
  var TABS = [["fasi", "Fasi (" + fs.length + ")"], ["servizi", "Servizi (" + righeOf(k.id).length + ")"], ["attivita", "Attività (" + tk.filter(function (z) { return z.stato !== "Fatto"; }).length + ")"], ["materiali", "Materiali (" + mt.length + ")"], ["pagamenti", "Pagamenti (" + pg.length + ")"], ["approvazioni", "Approvazioni (" + ap.filter(function (a) { return a.stato === "In attesa"; }).length + ")"], ["varianti", "Varianti (" + vr.length + ")"], ["log", "Diario"]];
  if (!isPR()) TABS.splice(3, 0, ["ore", "Ore (" + num(oreT, 1) + ")"]);
  h += '<div class="card"><div class="tabs">' + TABS.map(function (x) { return '<button data-tab="' + x[0] + '" class="' + (t === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>";

  if (t === "fasi") {
    h += '<div class="cardhead"><h2>Fasi del lavoro</h2><button class="btn sm ghost" data-new="fasi" data-ctx="' + k.id + '">+ Nuova fase</button></div>';
    h += fs.length ? '<table><thead><tr><th>Fase</th><th>Stato</th><th>Periodo</th><th style="width:150px">Avanzamento</th><th>Cliente</th><th></th></tr></thead><tbody>' + fs.map(function (f) {
      return "<tr><td><b>" + esc(f.nome) + "</b>" + (f.note ? '<div class="faint">' + esc(f.note) + "</div>" : "") + '</td><td><span class="badge ' + (FASE_COL[f.stato] || "") + '">' + esc(f.stato) + "</span></td><td>" + dshort(f.inizio) + " → " + dshort(f.fine) + "</td><td>" + (f.avanzamento || 0) + "%" + prog(f.avanzamento) + '</td><td>' + (f.visibile_cliente ? '<span class="badge b-blue">visibile</span>' : '<span class="faint">interna</span>') + '</td><td class="num"><button class="lnk" data-edit="fasi:' + f.id + '">Modifica</button></td></tr>';
    }).join("") + "</tbody></table>" + gantt(k) : vuoto("Nessuna fase: dividi il lavoro in passaggi così il cliente vede l'avanzamento.", '<button class="lnk" data-new="fasi" data-ctx="' + k.id + '">Aggiungi la prima fase</button>');
  }
  if (t === "servizi") {
    h += '<div class="cardhead"><h2>Servizi e assegnazioni</h2><button class="btn sm ghost" data-riga="' + k.id + '">+ Aggiungi servizio</button></div>';
    h += righeOf(k.id).length ? '<table><thead><tr><th>Servizio</th><th>Assegnato a</th><th class="num">Q.tà</th><th class="num">Ore stim.</th>' + (vediCosti() ? '<th class="num">Costo</th>' : "") + '<th class="num">Prezzo</th><th>Stato</th><th></th></tr></thead><tbody>' +
      righeOf(k.id).map(function (r) {
        var s = by(D.serv, r.serv_id); if (!s) return "";
        var oreR = sum(ore.filter(function (o) { return o.pro_id === (r.assegnato_id || s.pro_id); }), function (o) { return o.ore; });
        return "<tr><td>" + esc(s.nome) + '<div class="faint">' + esc(s.cat || "") + "</div></td><td>" + esc(nameOf(D.pros, r.assegnato_id || s.pro_id)) + '</td><td class="num">' + (r.qty || 1) + '</td><td class="num">' + num(r.ore_stimate, 0) + " / " + num(oreR, 1) + "</td>" + (vediCosti() ? '<td class="num">' + eur((s.costo || 0) * (r.qty || 1)) + "</td>" : "") + '<td class="num">' + eur((s.prezzo || 0) * (r.qty || 1)) + '</td><td><span class="badge">' + esc(r.stato || "Da iniziare") + '</span></td><td class="num"><button class="lnk" data-riga-edit="' + r.id + '">Modifica</button></td></tr>';
      }).join("") + "</tbody></table>" : vuoto("Nessun servizio.", '<button class="lnk" data-riga="' + k.id + '">Aggiungi il primo</button>');
  }
  if (t === "attivita") h += '<div class="cardhead"><h2>Attività</h2><button class="btn sm ghost" data-new="task" data-ctx="' + k.id + '">+ Nuova attività</button></div>' + kanban(tk);
  if (t === "ore") h += '<div class="cardhead"><h2>Ore registrate</h2><button class="btn sm ghost" data-new="ore" data-ctx="' + k.id + '">+ Registra ore</button></div>' + tblOre(ore);
  if (t === "materiali") {
    h += '<div class="cardhead"><h2>Materiali della commessa</h2><button class="btn sm ghost" data-new="mat" data-ctx="' + k.id + '">+ Aggiungi materiale</button></div>';
    h += '<p class="faint" style="margin-bottom:12px">Tutto quello che serve per lavorare: brief, cartelle, bozze, consegne. Spunta "visibile al cliente" per condividerlo nel suo portale.</p>';
    h += mt.length ? '<table><thead><tr><th>Materiale</th><th>Tipo</th><th>Fase</th><th>Visibilità</th><th>Data</th><th></th></tr></thead><tbody>' + mt.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).map(function (m) {
      return "<tr><td>" + (m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.nome) + "</a>" : esc(m.nome)) + (m.note ? '<div class="faint">' + esc(m.note) + "</div>" : "") + '</td><td><span class="badge">' + esc(m.tipo || "—") + "</span></td><td>" + esc(m.fase_id ? nameOf(D.fasi, m.fase_id) : "—") + "</td><td>" + (m.visibile_cliente ? '<span class="badge b-blue">cliente</span>' : '<span class="faint">solo studio</span>') + '</td><td class="faint">' + dshort(m.created_at) + '</td><td class="num"><button class="lnk" data-edit="mat:' + m.id + '">Modifica</button></td></tr>';
    }).join("") + "</tbody></table>" : vuoto("Nessun materiale.", '<button class="lnk" data-new="mat" data-ctx="' + k.id + '">Aggiungi il primo</button>');
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
/* ---------------- portale cliente ---------------- */
function vProgetti() {
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
function vProgetto() {
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
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-family:var(--ffd);font-size:1.6rem;color:var(--ink)">Giraffa</div><div style="font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;color:var(--terra)">Studio</div></div><div style="text-align:right"><h2>' + titolo + '</h2><div class="faint">' + esc(nameOf(D.cli, k.cliente_id)) + " · " + dt(today()) + "</div></div></div>";
}
function openPreventivo(id) {
  var k = by(D.com, id); if (!k) return;
  var c = calc(k);
  var rows = righeOf(k.id).map(function (r) {
    var s = by(D.serv, r.serv_id); if (!s) return "";
    return "<tr><td>" + esc(s.nome) + (s.descrizione ? '<div class="faint">' + esc(s.descrizione) + "</div>" : "") + '</td><td class="faint">' + esc(nameOf(D.pros, r.assegnato_id || s.pro_id)) + '</td><td class="num">' + (r.qty || 1) + '</td><td class="num">' + eur((s.prezzo || 0) * (r.qty || 1)) + "</td></tr>";
  }).join("");
  var pg = pagOf(k.id);
  modal('<div class="box wide">' + docHead(k, "Preventivo") +
    '<h2 style="margin-top:22px">' + esc(k.titolo) + "</h2>" +
    '<table style="margin-top:14px"><thead><tr><th>Servizio</th><th>A cura di</th><th class="num">Q.tà</th><th class="num">Importo</th></tr></thead><tbody>' + rows + "</tbody></table>" +
    '<table style="margin-top:16px"><tbody>' + row2("Imponibile", eur(c.imp)) + row2("Coordinamento Giraffa Studio (" + (k.fee || 0) + "%)", eur(c.fee)) + row2("<b>Totale</b>", "<b>" + eur(c.tot) + "</b>") + "</tbody></table>" +
    (pg.length ? '<h3 style="margin:20px 0 8px">Piano di pagamento</h3><table><tbody>' + pg.map(function (p) { return "<tr><td>" + esc(p.nome) + '</td><td class="faint">' + dt(p.scadenza) + '</td><td class="num">' + eur(p.importo) + "</td></tr>"; }).join("") + "</tbody></table>" : "") +
    '<p class="faint" style="margin-top:14px">Importi IVA esclusa. Validità 30 giorni. Ogni professionista opera con la propria partita IVA sotto il coordinamento di Giraffa Studio.</p>' +
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
      fld("probabilita", "Probabilità di chiusura (%)", "number", r.probabilita == null ? 50 : r.probabilita) +
      fld("note", "Note", "textarea", r.note);
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
      '<div class="row2">' + fld("cat", "Categoria", "text", r.cat) + fld("unita", "Unità (progetto, mese, shooting…)", "text", r.unita) + "</div>" +
      '<div class="row2">' + fld("costo", "Compenso al professionista (€)", "number", r.costo) + fld("prezzo", "Prezzo al cliente (€)", "number", r.prezzo) + "</div>" +
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
    return '<div class="row2">' + selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) + selField("pro_id", "Chi", opt(PROS_PRO(), r.pro_id || me.pro_id)) + "</div>" +
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
      fld("note", "Note", "textarea", r.note);
  }},
  mat: { t: "Materiale", tb: "mat", f: function (r) {
    return fld("nome", "Nome", "text", r.nome, true) + fld("url", "Link (Drive, Dropbox, WeTransfer…)", "text", r.url) +
      '<div class="row2">' + selField("tipo", "Tipo", sel(TIPI_MAT, r.tipo || "Materiale")) + selField("fase_id", "Fase", opt(fasiOf(r.commessa_id || current), r.fase_id)) + "</div>" +
      '<div class="row2">' + selField("commessa_id", "Commessa", opt(D.com, r.commessa_id, "titolo")) + selField("visibile_cliente", "Visibile al cliente", sel(["no", "si"], r.visibile_cliente ? "si" : "no")) + "</div>" +
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
  var rg = righeOf(k.id).map(function (x) { return { commessa_id: nid, serv_id: x.serv_id, qty: x.qty, ore_stimate: x.ore_stimate, assegnato_id: x.assegnato_id, stato: "Da iniziare" }; });
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
  modal('<form class="box" data-riga-save="' + k + ":" + (rid || "") + '"><h2>' + (rid ? "Modifica servizio" : "Aggiungi servizio") + "</h2>" +
    selField("serv_id", "Servizio a listino", D.serv.map(function (s) { return '<option value="' + s.id + '"' + (r.serv_id === s.id ? " selected" : "") + ">" + esc(s.nome) + " · " + esc(nameOf(D.pros, s.pro_id)) + " · " + eur(s.prezzo) + "</option>"; }).join("")) +
    '<div class="row2">' + fld("qty", "Quantità", "number", r.qty == null ? 1 : r.qty) + fld("ore_stimate", "Ore stimate", "number", r.ore_stimate == null ? 8 : r.ore_stimate) + "</div>" +
    '<div class="row2">' + selField("assegnato_id", "Assegnato a", opt(PROS_PRO(), r.assegnato_id)) + selField("stato", "Stato", sel(["Da iniziare", "In corso", "Consegnato"], r.stato || "Da iniziare")) + "</div>" +
    '<div class="actions">' + (rid ? '<button type="button" class="btn danger" data-del="righe:' + rid + '">Elimina</button>' : "") +
    '<button type="button" class="btn ghost" data-close>Annulla</button><button class="btn" type="submit">Salva</button></div></form>');
}

/* ---------------- render ---------------- */
function render() {
  if (isCliente()) {
    buildNavCliente();
    el("#main").innerHTML = (view === "progetto" ? vProgetto : vProgetti)();
    return;
  }
  if (!me.ruolo) {
    el("#nav").innerHTML = "";
    el("#main").innerHTML = '<div class="card"><h2>Accesso non ancora abilitato</h2><p class="muted" style="margin-top:8px">Il tuo utente esiste ma non è stato collegato a nessun ruolo. Chiedi alla regia di Giraffa Studio di abilitarti.</p></div>';
    return;
  }
  buildNav();
  var V = { dash: vDash, commesse: vCommesse, commessa: vCommessa, clienti: vClienti, cliente: vCliente, pool: vPool, pro: vPro, servizi: vServizi, task: vTask, ore: vOre, fatture: vFatture, provvigioni: vProvvigioni, report: vReport, carico: vCarico, spazi: vSpazi, impostazioni: vSettings };
  var f = V[view] || vDash;
  el("#main").innerHTML = f();
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
  if (d.openCom) { go("commessa", d.openCom, "fasi"); return; }
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
});

document.addEventListener("submit", async function (e) {
  var f = e.target;
  if (f.id === "loginform") { e.preventDefault(); return doLogin(f); }
  if (f.dataset.save) { e.preventDefault(); return saveForm(f); }
  if (f.dataset.rigaSave) {
    e.preventDefault();
    var pp = f.dataset.rigaSave.split(":"), kid = pp[0], rid = pp[1];
    var obj = { commessa_id: kid, serv_id: f.serv_id.value, qty: +f.qty.value || 1, ore_stimate: +f.ore_stimate.value || 0, assegnato_id: f.assegnato_id.value || null, stato: f.stato.value };
    var r = rid ? await sb.from("righe").update(obj).eq("id", rid) : await sb.from("righe").insert(obj);
    if (r.error) { toast(r.error.message, true); return; }
    await reload(["righe"]); closeModal(); toast("Servizio salvato"); render(); return;
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
  await start();
}
init();
})();
