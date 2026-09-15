import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function piega(riga: string): string {
  const b = new TextEncoder().encode(riga);
  if (b.length <= 73) return riga;
  const out: string[] = [];
  let i = 0;
  while (i < b.length) {
    let n = Math.min(73, b.length - i);
    while (n > 1 && i + n < b.length && (b[i + n] & 0xc0) === 0x80) n--;
    out.push((i === 0 ? "" : " ") + new TextDecoder().decode(b.slice(i, i + n)));
    i += n;
  }
  return out.join("\r\n");
}

const giorno = (d: string) => String(d).slice(0, 10).replace(/-/g, "");

function piuUno(d: string): string {
  const t = new Date(String(d).slice(0, 10) + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10).replace(/-/g, "");
}

type Ev = { uid: string; dal: string; al: string; titolo: string; desc?: string; luogo?: string };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pezzi = url.pathname.split("/").filter(Boolean);
  let token = pezzi[pezzi.length - 1] || "";
  if (token === "ics") token = url.searchParams.get("t") || "";
  token = token.replace(/\.ics$/i, "");

  if (!/^[a-f0-9]{32,64}$/.test(token)) return new Response("Link non valido", { status: 404 });

  const sb = createClient(URL_SB, KEY, { auth: { persistSession: false } });

  const { data: tk } = await sb.from("cal_token").select("pro_id").eq("token", token).maybeSingle();
  if (!tk) return new Response("Link non valido", { status: 404 });
  const pro = tk.pro_id as string;

  const { data: io } = await sb.from("professionisti").select("nome").eq("id", pro).maybeSingle();

  const inizio = new Date();
  inizio.setUTCDate(inizio.getUTCDate() - 120);
  const da = inizio.toISOString().slice(0, 10);

  const ev: Ev[] = [];

  const [{ data: comm }, { data: cli }, { data: prog }] = await Promise.all([
    sb.from("commesse").select("id,titolo,cliente_id,scadenza,stato,pm_id,owner_id"),
    sb.from("clienti").select("id,nome"),
    sb.from("progetti").select("id,nome,commessa_id"),
  ]);
  const nomeCli = new Map((cli || []).map((c: any) => [c.id, c.nome]));
  const mComm = new Map((comm || []).map((c: any) => [c.id, c]));
  const mProg = new Map((prog || []).map((p: any) => [p.id, p]));

  const etichetta = (commessaId: string | null | undefined) => {
    const c = commessaId ? mComm.get(commessaId) : null;
    if (!c) return "";
    const titolo = String(c.titolo || "");
    const n = c.cliente_id ? String(nomeCli.get(c.cliente_id) || "") : "";
    if (!n) return titolo;
    // il titolo spesso ripete già il nome del cliente: non ripeterlo due volte
    if (titolo.toLowerCase().startsWith(n.toLowerCase())) return titolo;
    return n + " — " + titolo;
  };

  // attività assegnate a me
  const { data: task } = await sb
    .from("task")
    .select("id,titolo,scadenza,inizio,stato,commessa_id,progetto_id,descrizione")
    .eq("assegnato_id", pro)
    .gte("scadenza", da);
  for (const t of task || []) {
    if (!t.scadenza) continue;
    const ctx = etichetta(t.commessa_id) || (t.progetto_id ? mProg.get(t.progetto_id)?.nome : "");
    ev.push({
      uid: "task-" + t.id,
      dal: giorno(t.inizio && t.inizio < t.scadenza ? t.inizio : t.scadenza),
      al: piuUno(t.scadenza),
      titolo: t.titolo,
      desc: [ctx, t.descrizione, "Stato: " + (t.stato || "—")].filter(Boolean).join("\n"),
    });
  }

  // lavorazioni di cui sono responsabile
  const { data: lav } = await sb
    .from("lavorazioni")
    .select("id,nome,inizio,fine,stato,commessa_id,progetto_id,descrizione")
    .eq("pro_id", pro);
  for (const l of lav || []) {
    const dal = l.inizio || l.fine;
    if (!dal || dal < da) continue;
    ev.push({
      uid: "lav-" + l.id,
      dal: giorno(dal),
      al: piuUno(l.fine || dal),
      titolo: l.nome,
      desc: [etichetta(l.commessa_id), l.descrizione, "Stato: " + (l.stato || "—")].filter(Boolean).join("\n"),
    });
  }

  // prenotazioni di spazi
  const { data: pre } = await sb
    .from("prenotazioni")
    .select("id,data,slot,stato,note,spazio_id")
    .eq("pro_id", pro)
    .gte("data", da);
  if ((pre || []).length) {
    const { data: sp } = await sb.from("spazi").select("id,nome,indirizzo");
    const mSp = new Map((sp || []).map((s: any) => [s.id, s]));
    for (const p of pre || []) {
      const s: any = p.spazio_id ? mSp.get(p.spazio_id) : null;
      ev.push({
        uid: "pren-" + p.id,
        dal: giorno(p.data),
        al: piuUno(p.data),
        titolo: (s?.nome || "Spazio") + (p.slot ? " · " + p.slot : ""),
        desc: [p.note, "Stato: " + (p.stato || "—")].filter(Boolean).join("\n"),
        luogo: s?.indirizzo || s?.nome || "",
      });
    }
  }

  // consegne dei lavori che seguo
  for (const c of comm || []) {
    if (!c.scadenza || c.scadenza < da) continue;
    if (c.pm_id !== pro && c.owner_id !== pro) continue;
    ev.push({
      uid: "comm-" + c.id,
      dal: giorno(c.scadenza),
      al: piuUno(c.scadenza),
      titolo: "Consegna · " + etichetta(c.id),
      desc: "Stato: " + (c.stato || "—"),
    });
  }

  const ora = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const righe: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Giraffa Studio//CRM//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc("Giraffa Studio" + (io?.nome ? " — " + io.nome : "")),
    "X-WR-TIMEZONE:Europe/Rome",
    "X-PUBLISHED-TTL:PT2H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
  ];
  for (const e of ev) {
    righe.push("BEGIN:VEVENT");
    righe.push("UID:" + e.uid + "@crm.giraffastudio.it");
    righe.push("DTSTAMP:" + ora);
    righe.push("DTSTART;VALUE=DATE:" + e.dal);
    righe.push("DTEND;VALUE=DATE:" + e.al);
    righe.push("SUMMARY:" + esc(e.titolo));
    if (e.desc) righe.push("DESCRIPTION:" + esc(e.desc));
    if (e.luogo) righe.push("LOCATION:" + esc(e.luogo));
    righe.push("TRANSP:TRANSPARENT");
    righe.push("END:VEVENT");
  }
  righe.push("END:VCALENDAR");

  return new Response(righe.map(piega).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="giraffa-studio.ics"',
      "Cache-Control": "public, max-age=900",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
