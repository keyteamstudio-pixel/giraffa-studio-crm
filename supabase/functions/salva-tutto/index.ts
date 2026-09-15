// Copia completa del database in un file, dentro il secchio privato "copie".
// La copia la chiede il chiamante con il suo accesso: se non ha i permessi
// di sistema, e' il database a dire di no. Il service_role serve solo a
// scrivere il file, mai a leggere i dati.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function risposta(corpo: unknown, stato = 200) {
  return new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accesso = req.headers.get("Authorization") ?? "";
  if (!url || !anon || !srv) return risposta({ errore: "Configurazione incompleta." }, 500);
  if (!accesso) return risposta({ errore: "Manca l'accesso." }, 401);

  const comeUtente = createClient(url, anon, {
    global: { headers: { Authorization: accesso } },
    auth: { persistSession: false },
  });

  const { data, error } = await comeUtente.rpc("dump_tutto");
  if (error) return risposta({ errore: error.message }, 403);
  if (!data) return risposta({ errore: "La copia e' uscita vuota." }, 500);

  const testo = JSON.stringify(data);
  const q = new Date();
  const due = (n: number) => String(n).padStart(2, "0");
  const nome = `copia-${q.getUTCFullYear()}-${due(q.getUTCMonth() + 1)}-${due(q.getUTCDate())}` +
    `-${due(q.getUTCHours())}${due(q.getUTCMinutes())}.json`;

  const servizio = createClient(url, srv, { auth: { persistSession: false } });
  const su = await servizio.storage.from("copie").upload(
    nome,
    new Blob([testo], { type: "application/json" }),
    { upsert: true, contentType: "application/json" },
  );
  if (su.error) return risposta({ errore: su.error.message }, 500);

  const firma = await servizio.storage.from("copie").createSignedUrl(nome, 60 * 60 * 24 * 7);

  const dati = (data as Record<string, unknown>).dati as Record<string, unknown[]>;
  const righe = Object.values(dati).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);

  return risposta({
    nome,
    byte: testo.length,
    tabelle: Object.keys(dati).length,
    righe,
    link: firma.data?.signedUrl ?? null,
    scade: "fra sette giorni",
  });
});
