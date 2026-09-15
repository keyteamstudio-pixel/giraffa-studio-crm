/* radar-raccolta: legge le fonti con un feed vero e salva gli atti come sono.
   Nessuna AI qui: solo lettura, impronta e filtro secco per parole.

   Due modi. Normale: la gazzetta del giorno, dal feed.
   Recupero: gli ultimi trenta giorni presi dai sommari; serve il primo
   giorno, altrimenti il Radar resta vuoto per un mese.

   Se un atto gia' visto torna con un'impronta diversa, e' cambiato: si alza
   la versione e si scrive cosa e' successo. Da li' nasce il controllo sulle
   opportunita' salvate, senza costruirlo a parte.

   Chi puo' chiamarla: il database con la chiave della cassaforte, il
   servizio col suo accesso, o una persona con i permessi di sistema. */

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-radar-chiave",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function esito(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

const URL_DB = Deno.env.get("SUPABASE_URL") || "";
const CHIAVE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TESTATE = { apikey: CHIAVE, Authorization: "Bearer " + CHIAVE, "Content-Type": "application/json" };
const GU = "https://www.gazzettaufficiale.it";

async function db(p: string, o: RequestInit = {}) {
  const r = await fetch(URL_DB + "/rest/v1/" + p, { ...o, headers: { ...TESTATE, ...(o.headers as Record<string, string> || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(p.split("?")[0] + " risponde " + r.status + " " + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
async function rpc(n: string, a: Record<string, unknown>) {
  const r = await fetch(URL_DB + "/rest/v1/rpc/" + n, { method: "POST", headers: TESTATE, body: JSON.stringify(a) });
  const t = await r.text();
  if (!r.ok) throw new Error(n + " risponde " + r.status);
  return t ? JSON.parse(t) : null;
}
function pezzo(req: Request, campo: string): string | null {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const p = t.split(".")[1];
  if (!p) return null;
  try {
    const s = p.replace(/-/g, "+").replace(/_/g, "/");
    const j = JSON.parse(atob(s.padEnd(s.length + ((4 - (s.length % 4)) % 4), "=")));
    return j[campo] ? String(j[campo]) : null;
  } catch { return null; }
}
function uguali(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function haIlDiritto(req: Request): Promise<string | null> {
  const portata = req.headers.get("x-radar-chiave");
  if (portata) {
    try {
      const k = await rpc("radar_chiave", {});
      if (typeof k === "string" && k && uguali(portata, k)) return null;
    } catch { /* si prova con gli altri modi */ }
    return "La chiave non corrisponde.";
  }
  if (pezzo(req, "role") === "service_role") return null;
  const uid = pezzo(req, "sub");
  if (!uid) return "Serve essere dentro col proprio account.";
  const m = await db("membri?select=ruolo,perm_accessi&user_id=eq." + uid + "&limit=1");
  if (m?.[0] && (m[0].ruolo === "admin" || m[0].perm_accessi === true)) return null;
  return "Serve il permesso di sistema.";
}

const ENTITA: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", laquo: "«", raquo: "»" };
function ripulisci(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTITA[n] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}
function dentro(blocco: string, tag: string): string {
  const m = blocco.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? ripulisci(m[1]) : "";
}
async function impronta(t: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function senzaAccenti(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function passaIlFiltro(testo: string, si: string[], no: string[]): boolean {
  const t = senzaAccenti(testo);
  if (no.some((p) => p && t.includes(senzaAccenti(p)))) return false;
  if (!si.length) return true;
  return si.some((p) => p && t.includes(senzaAccenti(p)));
}
function dataDi(s: string): string | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
async function prendi(u: string): Promise<string> {
  const r = await fetch(u, {
    headers: { "User-Agent": "Giraffa Studio Radar (gestionale interno)" },
    signal: AbortSignal.timeout(40000),
  });
  return r.ok ? await r.text() : "";
}

type Voce = { chiave: string; titolo: string; url: string; pubblicato: string | null; testo: string };

function leggiRss(xml: string): Voce[] {
  const fuori: Voce[] = [];
  for (const b of xml.match(/<item[\s\S]*?<\/item>/gi) || []) {
    const titolo = dentro(b, "title");
    const url = dentro(b, "link") || dentro(b, "guid");
    const testo = dentro(b, "content:encoded") || dentro(b, "description") || "";
    if (!titolo && !url) continue;
    fuori.push({
      chiave: (dentro(b, "guid") || url || titolo).slice(0, 400),
      titolo: (titolo || "(senza titolo)").slice(0, 600),
      url,
      pubblicato: dataDi(dentro(b, "pubDate")),
      testo: testo.slice(0, 20000),
    });
  }
  return fuori;
}

const SERIE: Record<string, string> = {
  SG: "serie_generale", S1: "corte_costituzionale", S2: "unione_europea",
  S3: "regioni", S4: "concorsi", S5: "contratti", P2: "parte_seconda",
};

/* Dal sommario di una gazzetta si tirano fuori gli atti: ogni atto compare
   due volte, prima col tipo e poi con la descrizione. Si uniscono. */
function leggiSommario(html: string, data: string, sigla: string): Voce[] {
  const per = new Map<string, string[]>();
  const re = /<a[^>]+href="([^"]*caricaDettaglioAtto[^"]*codiceRedazionale=([A-Za-z0-9]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const codice = m[2];
    const testo = ripulisci(m[3]);
    if (!testo) continue;
    if (!per.has(codice)) per.set(codice, []);
    per.get(codice)!.push(testo);
  }
  const fuori: Voce[] = [];
  const [y, mm, dd] = data.split("-");
  for (const [codice, pezzi] of per) {
    const titolo = pezzi.join(" - ").replace(/\s+Pag\.\s*\d+\s*$/i, "").slice(0, 600);
    fuori.push({
      chiave: "http://www.gazzettaufficiale.it/eli/id/" + y + "/" + mm + "/" + dd + "/" + codice + "/" + sigla,
      titolo,
      url: GU + "/eli/id/" + y + "/" + mm + "/" + dd + "/" + codice + "/" + sigla,
      pubblicato: data,
      testo: titolo,
    });
  }
  return fuori;
}

/* L'elenco delle gazzette degli ultimi trenta giorni, con data e numero. */
async function ultimeGazzette(sigla: string, quante: number): Promise<{ data: string; numero: string }[]> {
  const serie = SERIE[sigla] || "serie_generale";
  const html = await prendi(GU + "/30giorni/" + serie);
  const viste = new Map<string, string>();
  const re = /dataPubblicazioneGazzetta=(\d{4}-\d{2}-\d{2})(?:&amp;|&)numeroGazzetta=(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) if (!viste.has(m[1])) viste.set(m[1], m[2]);
  const re2 = /\/eli\/gu\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)\//gi;
  while ((m = re2.exec(html)) !== null) {
    const d = m[1] + "-" + m[2] + "-" + m[3];
    if (!viste.has(d)) viste.set(d, m[4]);
  }
  return Array.from(viste.entries())
    .map(([data, numero]) => ({ data, numero }))
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, quante);
}

/* Salva un mucchio di voci in blocco: una lettura e una scrittura sole,
   invece di due chiamate per atto. */
async function salva(fonteId: string, voci: Voce[], si: string[], no: string[]) {
  const esistenti = await db("radar_atti?select=id,chiave_esterna,impronta,versione&fonte_id=eq." + fonteId) as Record<string, unknown>[];
  const mappa = new Map(esistenti.map((x) => [String(x.chiave_esterna), x]));
  const daMettere: Record<string, unknown>[] = [];
  let nuovi = 0, cambiati = 0, ignorati = 0, gia = 0;

  for (const v of voci) {
    const tutto = v.titolo + "\n" + v.testo;
    const imp = await impronta(tutto);
    const tiene = passaIlFiltro(tutto, si, no);
    const vecchio = mappa.get(v.chiave);

    if (!vecchio) {
      daMettere.push({
        fonte_id: fonteId, chiave_esterna: v.chiave, titolo: v.titolo, url: v.url,
        pubblicato: v.pubblicato, testo: v.testo, impronta: imp,
        stato: tiene ? "nuovo" : "ignorato",
      });
      if (tiene) nuovi++; else ignorati++;
      continue;
    }
    if (String(vecchio.impronta || "") === imp) { gia++; continue; }

    const daV = Number(vecchio.versione || 1);
    const ora = new Date().toISOString();
    await db("radar_atti?id=eq." + vecchio.id, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        titolo: v.titolo, url: v.url, pubblicato: v.pubblicato, testo: v.testo,
        impronta: imp, versione: daV + 1, cambiato_il: ora, visto_il: ora,
        testo_pieno: null, stato: tiene ? "nuovo" : "ignorato",
      }),
    });
    await db("radar_cambiamenti", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        atto_id: vecchio.id, da_versione: daV, a_versione: daV + 1,
        cosa: "Il testo pubblicato e' cambiato rispetto all'ultima lettura.",
      }),
    });
    cambiati++;
  }

  for (let i = 0; i < daMettere.length; i += 200) {
    await db("radar_atti", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(daMettere.slice(i, i + 200)),
    });
  }
  return { nuovi, cambiati, ignorati, gia_visti: gia };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!URL_DB || !CHIAVE) return esito({ errore: "Configurazione incompleta." }, 500);
  const no = await haIlDiritto(req);
  if (no) return esito({ errore: no }, 403);

  let corpo: Record<string, unknown> = {};
  try { corpo = await req.json(); } catch { /* va bene anche senza corpo */ }
  const soloQuesta = typeof corpo.fonte === "string" ? corpo.fonte : null;
  const forza = corpo.forza === true;
  const recupero = corpo.recupero === true;
  const giorni = Math.min(Math.max(Number(corpo.giorni || 30), 1), 30);

  let q = "radar_fonti?select=*&attiva=eq.true&modo=eq.rss&order=chiave";
  if (soloQuesta) q += "&chiave=eq." + encodeURIComponent(soloQuesta);
  const fonti = await db(q) as Record<string, unknown>[];
  const resoconto: Record<string, unknown>[] = [];

  for (const f of fonti) {
    const id = String(f.id);
    const ultimo = f.ultimo_controllo ? new Date(String(f.ultimo_controllo)).getTime() : 0;
    const ogni = Number(f.ogni_ore || 24) * 3600 * 1000;
    if (!forza && !recupero && ultimo && Date.now() - ultimo < ogni) {
      resoconto.push({ fonte: f.chiave, saltata: "controllata da poco" });
      continue;
    }

    const si = (f.parole_si as string[]) || [];
    const scarta = (f.parole_no as string[]) || [];

    try {
      let conto = { nuovi: 0, cambiati: 0, ignorati: 0, gia_visti: 0 };
      let letti = 0;

      if (recupero) {
        const sigla = (String(f.url).match(/\/rss\/(\w+)/i) || [])[1];
        if (!sigla) throw new Error("questa fonte non ha un archivio da recuperare");
        const gazzette = await ultimeGazzette(sigla.toUpperCase(), giorni);
        if (!gazzette.length) throw new Error("non trovo l'elenco degli ultimi trenta giorni");
        const tutte: Voce[] = [];
        for (const g of gazzette) {
          const [y, mm, dd] = g.data.split("-");
          const html = await prendi(GU + "/eli/gu/" + y + "/" + mm + "/" + dd + "/" + g.numero + "/" + sigla.toLowerCase() + "/html");
          if (!html) continue;
          tutte.push(...leggiSommario(html, g.data, sigla.toUpperCase()));
        }
        letti = tutte.length;
        if (letti) conto = await salva(id, tutte, si, scarta);
        resoconto.push({ fonte: f.chiave, gazzette: gazzette.length, letti, ...conto });
      } else {
        const voci = leggiRss(await prendi(String(f.url)));
        if (!voci.length) throw new Error("il feed non contiene voci leggibili");
        letti = voci.length;
        conto = await salva(id, voci, si, scarta);
        resoconto.push({ fonte: f.chiave, letti, ...conto });
      }

      const quanti = await db("radar_atti?select=id&fonte_id=eq." + id) as unknown[];
      await db("radar_fonti?id=eq." + id, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          ultimo_controllo: new Date().toISOString(),
          ultimo_esito: "ok", ultimo_errore: null, atti_totali: quanti.length,
        }),
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      await db("radar_fonti?id=eq." + id, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          ultimo_controllo: new Date().toISOString(),
          ultimo_esito: "errore", ultimo_errore: m.slice(0, 500),
        }),
      });
      resoconto.push({ fonte: f.chiave, errore: m.slice(0, 300) });
    }
  }

  return esito({ quando: new Date().toISOString(), modo: recupero ? "recupero" : "giornaliera", fonti: resoconto });
});
