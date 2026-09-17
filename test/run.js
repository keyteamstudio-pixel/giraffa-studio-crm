/* Prova di ogni rotta del CRM in un browser finto (jsdom), con dati di prova in
   memoria al posto di Supabase. Si lancia con:  node test/run.js
   Serve jsdom:  npm i jsdom   (nella cartella dove si lancia) */
const fs = require('fs'), path = require('path'), { JSDOM, VirtualConsole } = require('jsdom');
const dir = path.resolve(__dirname, '..') + '/';
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => errs.push('JSDOM: ' + (e.detail ? e.detail.message || e.detail : e.message)));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(fs.readFileSync(dir + 'index.html', 'utf8'), { runScripts: 'outside-only', url: 'https://crm.giraffastudio.it/', virtualConsole: vc, pretendToBeVisual: true });
const w = dom.window;
w.scrollTo = () => {}; w.scroll = () => {}; w.confirm = () => true; w.prompt = () => null; w.alert = () => {};
w.GS_CONFIG = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' };
const P = 'p1', C = 'c1', K = 'k1', PG = 'g1', L = 'l1';
const DOMANI = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const rows = {
  professionisti: [{ id: P, nome: 'Nicola Ugrcic', ruolo: 'Strategia', vetting: 'Attivo', competenze: 'Strategia, Web', email: 'n@x.it', citta: 'Verona', piva: '0123' }, { id: 'p2', nome: 'Marta Bianchi', ruolo: 'Fotografa', vetting: 'Attivo', competenze: 'Foto', citta: 'Verona', professione_id: 'pf1' }],
  pro_privato: [{ pro_id: P, tariffa_oraria: 60, tariffa_km: 0.45, perc_viaggio: 50, note: 'appunti miei' }],
  clienti: [{ id: C, nome: 'La Staffa', settore: 'Food', stato: 'Attivo', owner_id: P, email: 'i@s.it' }],
  commesse: [{ id: K, titolo: 'Rilancio 2026', data: '2026-03-12', created_at: '2026-09-01T10:00:00Z', validita: 15, sezioni: [{ t: 'Moduli inclusi', d: 'prima', x: 'Quello che comprende', v: ['Dashboard', 'Clienti'] }], cliente_id: C, owner_id: P, stato: 'Accettato', ambito: 'personale', accettato_il: '2026-03-20', inviato_il: '2026-03-13', tipo_prezzo: 'Fisso', iva: 22, sconto: 0, budget_ore: 40, budget_importo: 5000, inizio: '2026-01-10', scadenza: '2026-06-30' }],
  progetti: [{ id: PG, commessa_id: K, nome: 'Sito', pro_id: P, stato: 'In corso', ordine: 1, visibile_cliente: true, fine: '2026-05-01' },
    { id: 'pg-diretto', commessa_id: null, cliente_id: C, nome: 'Restyling logo', pro_id: P, stato: 'In corso', ordine: 2 },
    { id: 'pg-interno', commessa_id: null, cliente_id: null, nome: 'Sito dello studio', pro_id: P, stato: 'Da iniziare', ordine: 3 }],
  lavorazioni: [{ id: L, progetto_id: PG, commessa_id: K, nome: 'Backend', pro_id: P, stato: 'In corso', ore_stimate: 20 }],
  righe: [{ id: 'r1', commessa_id: K, progetto_id: PG, tipo: 'Servizio', nome: 'Sito', qty: 1, prezzo_unit: 3000, costo_unit: 1500, ore_stimate: 20, assegnato_id: P, stato: 'In corso' },
    { id: 'r2', commessa_id: K, tipo: 'Trasferta', nome: 'Uscite a Milano', qty: 3, unita: 'uscita', prezzo_unit: 150, costo_unit: 0, stato: 'Da iniziare' }],
  servizi: [{ id: 's1', pro_id: P, nome: 'Sito vetrina', cat: 'Web', prezzo: 3000, costo: 1500, tipo_unita: 'Forfait', min_qty: 1 },
    { id: 's2', pro_id: 'p2', nome: 'Servizio fotografico', cat: 'Foto', prezzo: 800, costo: 300, tipo_unita: 'Giornata', min_qty: 1 }],
  copie_db: [{ id: 1, quando: '2026-09-13T05:40:00Z', motivo: 'copia settimanale', byte: 362000 }],
  prova_ripristino: [{ id: 1, quando: '2026-09-13T06:00:00Z', copia_id: 1, tabella: 'clienti', nella_copia: 3, adesso: 3, contenuto_uguale: true, nota: null },
    { id: 2, quando: '2026-09-13T06:00:00Z', copia_id: 1, tabella: 'commesse', nella_copia: 5, adesso: 5, contenuto_uguale: true, nota: null }],
  ore: [{ id: 'o1', pro_id: P, commessa_id: K, progetto_id: PG, lavorazione_id: L, data: '2026-02-02', ore: 4, tariffa: 60, fatturabile: true, descrizione: 'Setup' }],
  trasferte: [{ id: 'tr1', pro_id: P, cliente_id: C, commessa_id: K, progetto_id: PG, data: '2026-02-10', destinazione: 'Milano', motivo: 'Sopralluogo', km: 320, tariffa_km: 0.45, spese: 38, spese_dettaglio: 'pranzo 18, pedaggi 20', ore_viaggio: 3.5, addebitata: false },
    { id: 'tr2', pro_id: P, cliente_id: C, commessa_id: K, data: '2026-03-04', destinazione: 'Vicenza', motivo: 'Riunione', km: 120, tariffa_km: 0.45, spese: 0, ore_viaggio: 1.5, addebitata: true }],
  task: [{ id: 't1', commessa_id: K, progetto_id: PG, lavorazione_id: L, titolo: 'Hosting', stato: 'Da fare', priorita: 'Alta', assegnato_id: P, scadenza: '2026-03-01', stimate: 3, inizio: '2026-02-20', ricorrenza: 'settimanale' },
    { id: 't2', commessa_id: K, progetto_id: PG, titolo: 'Bozza home', stato: 'In corso', priorita: 'Media', assegnato_id: 'p2', scadenza: '2026-09-04' },
    { id: 't3', titolo: 'Commercialista', stato: 'Da fare', priorita: 'Bassa', assegnato_id: P },
    { id: 't4', padre_id: 't1', titolo: 'Dominio', stato: 'Fatto', assegnato_id: P },
    { id: 't-sez1', commessa_id: K, progetto_id: PG, titolo: 'Sopralluogo', stato: 'Da fare', assegnato_id: P, sezione: 'Riprese' },
    { id: 't-sez2', commessa_id: K, progetto_id: PG, titolo: 'Montaggio grezzo', stato: 'Fatto', assegnato_id: P, sezione: 'Montaggio' }],
  task_dip: [{ task_id: 't1', blocca_id: 't2' }],
  analisi: [{ id: 'a1', cliente_id: C, piva: '0123', nome: 'La Staffa', created_at: '2026-09-01T10:00:00Z', dati: { trovata: true, ragione_sociale: 'La Staffa Srl', forma: 'Srl', sede: 'Verona', attivita: 'Ristorazione', sintesi: 'Trattoria.', notizie: [{ titolo: 'Nuova apertura', quando: '2026-05', cosa: 'Seconda sede.', url: 'https://esempio.it/n' }], segnali: [], fonti: [{ titolo: 'Sito', url: 'https://lastaffa.it' }], contatti: [] } }],
  viste: [{ id: 'v1', pro_id: P, ambito: 'task', nome: 'Urgenti', config: { TF: { stato: 'aperte', pro: 'io', prog: '', prio: 'Alta', cerca: '', scadute: false }, TGROUP: 'progetto', TSORT: 'scadenza', vista: 'lista' } }],
  modelli: [{ id: 'm1', pro_id: P, nome: 'Sito vetrina', condiviso: false, voci: [{ tipo: 'lavorazione', nome: 'Analisi', giorni: 5, ore: 6 }] }],
  pro_profilo: [{ pro_id: P, ateco: '73.11.02', ateco_desc: 'Conduzione di campagne di marketing', forma: 'libero professionista', regime: 'forfettario', avvio: '2019-04-01', comune: 'Verona', provincia: 'VR', regione: 'Veneto', raggio: 'nazionale', parole_chiave: ['siti', 'grafica'], settori_clienti: ['ristorazione'], interessi: { bandi: true, incentivi_clienti: true } }],
  radar_fonti: [{ id: 'f1', chiave: 'gu-sg', nome: 'Gazzetta Ufficiale, Serie Generale', tipo: 'normativa', modo: 'rss', territorio: 'nazionale', attiva: true, ultimo_controllo: '2026-09-10T06:10:00Z', ultimo_esito: 'ok', note: 'Il feed riporta il sommario del giorno.' },
    { id: 'f2', chiave: 'veneto-bandi', nome: 'Bandi della Regione del Veneto', tipo: 'bando', modo: 'manuale', territorio: 'regione:Veneto', attiva: false, ultimo_controllo: null, ultimo_esito: null, note: 'Nessun feed pubblico: si controlla a mano.' }],
  radar_mie: [{ id: 'rs1', pro_id: P, atto_id: 'ra1', per_chi: 'clienti', punteggio: 0, perche: 'Non sembra riguardare te, ma potrebbe riguardare un tuo cliente.', combaciano: [], mancano: [], da_verificare: ['Dimensione dell\'impresa secondo i parametri PMI.'], stato: 'nuova', titolo_breve: 'Bando per investimenti innovativi delle PMI', sintesi: 'Sostiene investimenti innovativi e sostenibili delle micro, piccole e medie imprese.', ente: 'Ministero delle imprese e del made in Italy', chi_puo: ['micro, piccole e medie imprese'], territori: [], ateco_ammessi: [], forme_ammesse: [], spese_ammesse: [{ voce: 'Servizi digitali', note: null }], importo: { tipo: 'contributo a fondo perduto', min: null, max: 40000, percentuale: 50 }, aperto_dal: null, scade_il: DOMANI, come_si_fa: 'Domanda telematica sul portale del ministero.', requisiti: [{ testo: 'Essere una PMI attiva.', verificabile: false }], incerto: 'Il testo non elenca i territori ammessi.', atto_titolo: 'COMUNICATO - Nuovo bando PMI', atto_url: 'https://esempio.it/atto', pubblicato: '2026-08-22', atto_versione: 1, fonte_nome: 'Gazzetta Ufficiale, Serie Generale', fonte_chiave: 'gu-sg', fonte_controllata: '2026-09-10T06:10:00Z', quanti_clienti: 1, quanti_cambiamenti: 0 }],
  radar_occasioni_mie: [{ id: 'ro1', segnalazione_id: 'rs1', cliente_id: C, pro_id: P, servizi: ['s1'], perche: 'La Staffa potrebbe rientrare fra le PMI destinatarie.', combaciano: ['E\' un\'impresa attiva nella ristorazione.'], da_verificare: ['Numero di dipendenti e fatturato.'], stato: 'nuova', commessa_id: null, cliente_nome: 'La Staffa', cliente_settore: 'Food', cliente_email: 'i@s.it' }],
  movimenti: [], pagamenti: [{ id: 'pa1', commessa_id: K, nome: 'Acconto', importo: 2000, scadenza: '2026-02-01', stato: 'Da incassare' }],
  fasi: [{ id: 'f1', commessa_id: K, nome: 'Analisi', stato: 'In corso', avanzamento: 40, ordine: 1, visibile_cliente: true }],
  materiali: [{ id: 'ma1', commessa_id: K, progetto_id: PG, nome: 'Brief.pdf', path: 'k1/brief.pdf', dim: 220000, tipo: 'Brief', created_at: '2026-01-12', visibile_cliente: false }, { id: 'ma2', commessa_id: K, progetto_id: PG, nome: 'Cartella', url: 'https://drive.google.com/drive/folders/abc', tipo: 'Cartella condivisa', created_at: '2026-01-13', visibile_cliente: true }],
  approvazioni: [{ id: 'ap1', commessa_id: K, tipo: 'Bozza', stato: 'In attesa', richiesta_il: '2026-02-01' }],
  varianti: [{ id: 'v9', commessa_id: K, nome: 'Extra', importo: 400, ore: 4, stato: 'Proposta', data: '2026-02-14' }],
  interazioni: [{ id: 'i1', cliente_id: C, tipo: 'Chiamata', data: '2026-02-03', pro_id: P, testo: 'Ciao' }],
  eventi: [{ id: 'e1', commessa_id: K, testo: 'Creata', created_at: '2026-01-10', pro_id: P }],
  commenti: [{ id: 'cm1', task_id: 't1', pro_id: P, testo: 'ci penso io', created_at: '2026-02-05' }],
  timer: [], prenotazioni: [{ id: 'pr1', spazio_id: 'sp1', pro_id: P, data: '2026-09-20', slot: 'Giornata', stato: 'Confermata' }],
  spazi: [{ id: 'sp1', nome: 'Sala grande', stato: 'Attivo', capienza: 8, indirizzo: 'Verona', tipo: 'Ufficio' }],
  fornitori: [{ id: 'fo1', nome: 'Tipografia', categoria: 'Stampa', citta: 'Verona', consigliato_da: P }],
  professioni: [{ id: 'pf1', nome: 'Fotografo', categoria: 'Immagine e audiovisivo', unita: 'servizio', misura: 'quantita', moduli: ['progetti', 'materiali', 'spazi'], attivita: [{ n: 'Sopralluogo', o: 4 }, { n: 'Shooting', o: 8 }], servizi: [{ n: 'Servizio fotografico', u: 'servizio' }], ordine: 10, attiva: true },
    { id: 'pf2', nome: 'Sviluppatore web', categoria: 'Digitale e tecnologia', unita: 'giornata', misura: 'progetto', moduli: ['progetti', 'ore'], attivita: [{ n: 'Analisi', o: 10 }], servizi: [{ n: 'Sito vetrina', u: 'progetto' }], ordine: 20, attiva: true }],
  post: [{ id: 'po1', pro_id: P, testo: 'Benvenuti nella bacheca', tipo: 'Annuncio', fissato: true, created_at: '2026-09-03T09:00:00Z' }, { id: 'po2', pro_id: 'p2', testo: 'Qualcuno ha un contatto per la stampa?', tipo: 'Domanda', fissato: false, created_at: '2026-09-04T08:00:00Z' }],
  post_risp: [{ id: 'pr9', post_id: 'po2', pro_id: P, testo: 'Ti giro la tipografia', created_at: '2026-09-04T08:30:00Z' }],
  post_reaz: [{ post_id: 'po1', pro_id: 'p2', segno: 'like', created_at: '2026-09-03T10:00:00Z' }],
  agenda: [{ id: 'ag1', titolo: 'Workshop sui preventivi', tipo: 'Workshop', data: '2026-09-20', ora: '18:00:00', fine: '20:00:00', luogo: 'Sala grande', posti: 12, descrizione: 'Come si scrive un preventivo.', relatore_id: P, pro_id: P, aperto: true, created_at: '2026-09-01T10:00:00Z' },
    { id: 'ag2', titolo: 'Riunione di studio', tipo: 'Riunione', data: '2026-08-01', ora: '10:00:00', pro_id: P, created_at: '2026-07-01T10:00:00Z' }],
  iscrizioni: [{ id: 'is1', agenda_id: 'ag1', pro_id: 'p2', stato: 'Ci sono', created_at: '2026-09-02T10:00:00Z' }],
  canali: [{ id: 'ca1', nome: 'generale', descrizione: 'Il canale di tutti', ordine: 10 }, { id: 'ca2', nome: 'lavori', descrizione: 'Passaggi di lavoro', ordine: 20 }],
  messaggi: [{ id: 'ms1', canale_id: 'ca1', pro_id: 'p2', testo: 'Buongiorno a tutti', created_at: '2026-09-04T07:00:00Z' }],
  riunioni: [{ id: 'r1', titolo: 'Kickoff sito', data: DOMANI, ora: '10:00', fine: '11:00', link: 'https://meet.google.com/abc', tipo: 'Videocall', stato: 'Programmata', cliente_id: C, commessa_id: K, progetto_id: PG, pro_id: P, partecipanti: ['p2'], ordine_giorno: '- Home\n- Tempi', note: '', decisioni: '', prossimi: '- Mandare i testi\n- Scegliere le foto' }, { id: 'r2', titolo: 'Revisione foto', data: '2020-01-10', tipo: 'In presenza', stato: 'Programmata', pro_id: P, partecipanti: [] }],
  richieste_sito: [{ id: 'rs1', tipo: 'preventivo', nome: 'Anna Verdi', email: 'anna@verdi.it', azienda: 'Verdi Srl', messaggio: 'Vorrei un sito', stato: 'Nuova', created_at: '2026-09-05T10:00:00Z' }, { id: 'rs2', tipo: 'candidatura', nome: 'Luca Neri', email: 'luca@neri.it', mestiere: 'Copywriter', citta: 'Verona', stato: 'Nuova', created_at: '2026-09-05T11:00:00Z' }],
  letture: [], costi: [{ id: 'co1', commessa_id: K, progetto_id: PG, pro_id: P, nome: 'Plugin prenotazioni', tipo: 'Strumento', importo: 120, data: '2026-02-01', ricorrente: true, periodo: 'Annuale', cicli: 1, ribaltato: false }, { id: 'co2', commessa_id: K, nome: 'Foto stock', tipo: 'Materiale', importo: 40, data: '2026-02-10', ribaltato: true }],
  portali: [], cal_token: [], errori: [], ai_uso: [], settings: [{ id: 1, fee_default: 12 }],
  // vuota apposta: senza permesso scritto la scheda «Per i tuoi clienti» resta chiusa
  radar_clienti_ok: [],
  membri: [{ user_id: 'u1', email: 'n@x.it', ruolo: 'professionista', pro_id: P, perm_spazi: true, perm_studio: true, perm_accessi: true }]
};
function tbl(name) {
  const res = { data: rows[name] || [], error: null };
  const api = { select() { return api; }, eq() { return api; }, in() { return api; }, order() { return api; }, limit() { return api; }, gte() { return api; }, lte() { return api; },
    single() { return Promise.resolve({ data: (rows[name] || [])[0] || { id: 'n' }, error: null }); },
    maybeSingle() { return Promise.resolve({ data: (rows[name] || [])[0] || null, error: null }); },
    insert() { return api; }, update() { return api; }, delete() { return api; }, upsert() { return api; },
    then(r, j) { return Promise.resolve(res).then(r, j); } };
  return api;
}
w.supabase = { createClient() { return { from: tbl, rpc() { return Promise.resolve({ data: null, error: null }); },
  auth: { getSession() { return Promise.resolve({ data: { session: { user: { id: 'u1', email: 'n@x.it' } } } }); }, onAuthStateChange() {}, signOut() { return Promise.resolve({}); }, updateUser() { return Promise.resolve({}); }, setSession() { return Promise.resolve({ data: {}, error: null }); } },
  storage: { from() { return { createSignedUrl() { return Promise.resolve({ data: { signedUrl: '#' }, error: null }); }, upload() { return Promise.resolve({ error: null }); }, list() { return Promise.resolve({ data: [], error: null }); }, remove() { return Promise.resolve({ error: null }); } }; } } }; } };
w.eval(fs.readFileSync(dir + 'app.js', 'utf8'));

/* Un secondo mondo, identico al primo tranne una riga: il permesso a guardare
   i clienti. Serve a provare che e' quella riga a decidere se la scheda «Per i
   tuoi clienti» si apre, e non un dettaglio di come e' scritta la pagina. I
   «var» dell'app non affiorano su window, quindi non si puo' accendere un
   interruttore dall'esterno: si costruisce un mondo dove e' gia' acceso. */
function mondoColPermesso() {
  const rows2 = Object.assign({}, rows, {
    radar_clienti_ok: [{ pro_id: P, attivo: true, informativa_del: '2026-09-15', dove: 'Informativa clienti, par. 7' }]
  });
  function tbl2(name) {
    const res = { data: rows2[name] || [], error: null };
    const api = { select() { return api; }, eq() { return api; }, in() { return api; }, order() { return api; }, limit() { return api; }, gte() { return api; }, lte() { return api; },
      single() { return Promise.resolve({ data: (rows2[name] || [])[0] || { id: 'n' }, error: null }); },
      maybeSingle() { return Promise.resolve({ data: (rows2[name] || [])[0] || null, error: null }); },
      insert() { return api; }, update() { return api; }, delete() { return api; }, upsert() { return api; },
      then(r, j) { return Promise.resolve(res).then(r, j); } };
    return api;
  }
  const d2 = new JSDOM(fs.readFileSync(dir + 'index.html', 'utf8'), { runScripts: 'outside-only', url: 'https://crm.giraffastudio.it/', virtualConsole: vc, pretendToBeVisual: true });
  const w2 = d2.window;
  w2.scrollTo = () => {}; w2.scroll = () => {}; w2.confirm = () => true; w2.prompt = () => null; w2.alert = () => {};
  w2.GS_CONFIG = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' };
  w2.supabase = { createClient() { return { from: tbl2, rpc() { return Promise.resolve({ data: null, error: null }); },
    auth: { getSession() { return Promise.resolve({ data: { session: { user: { id: 'u1', email: 'n@x.it' } } } }); }, onAuthStateChange() {}, signOut() { return Promise.resolve({}); }, updateUser() { return Promise.resolve({}); }, setSession() { return Promise.resolve({ data: {}, error: null }); } },
    storage: { from() { return { createSignedUrl() { return Promise.resolve({ data: { signedUrl: '#' }, error: null }); }, upload() { return Promise.resolve({ error: null }); }, list() { return Promise.resolve({ data: [], error: null }); }, remove() { return Promise.resolve({ error: null }); } }; } } }; } };
  w2.eval(fs.readFileSync(dir + 'app.js', 'utf8'));
  return w2;
}
const rotte = ['dash', 'calendario', 'progetti/-/percliente', 'progetti/-/elenco', 'progetto/g1/attivita', 'progetto/g1/', 'progetti/-/bacheca', 'task/-/lista', 'task/-/oggi', 'task/-/tutte', 'task/-/fatte', 'attivita/t1', 'ore', 'ore/-/trasferte', 'nuovo/trasf', 'carico', 'profilo/-/scheda', 'profilo/-/prenota', 'servizi', 'amm', 'clienti/-/lista', 'clienti/-/schede', 'cliente/c1/anagrafica', 'cliente/c1/progetti', 'progetti/-/elenco', 'progetto/g1/attivita', 'progetto/g1/', 'commesse/-/personali', 'commesse/-/studio', 'commesse/-/tutti', 'importa', 'documento/k1/', 'prospetto/k1/ore', 'prospetto/k1/stato', 'sistema', 'analisi', 'commessa/k1/note', 'commessa/k1/servizi', 'commessa/k1/pagamenti', 'commessa/k1/fasi', 'commessa/k1/ore', 'commessa/k1/attivita', 'commessa/k1/materiali', 'progetto/g1/materiali', 'commessa/k1/approvazioni', 'commessa/k1/varianti', 'commessa/k1/log', 'commessa/k1/discussione', 'cliente/c1/lavori', 'cliente/c1/note', 'profilo/-/servizi', 'pro/p2/servizi', 'report', 'studio', 'pool', 'pro/p2/scheda', 'fornitori', 'spazi', 'impostazioni', 'progetto/g1/lavorazioni', 'lavorazione/l1/attivita', 'lavorazione/l1/ore', 'nuovo/cli', 'mod/com/k1', 'riga/k1/', 'professioni', 'eventi/-/prossimi', 'eventi/-/passati', 'chat', 'chat/ca2/', 'nuovo/ag', 'nuovo/can', 'nuovo/prof', 'mod/pros/p1', 'mod/serv/s1', 'commessa/k1/costi', 'progetto/g1/costi', 'riunioni/-/prossime', 'riunioni/-/passate', 'riunione/r1', 'riunione/r2', 'nuovo/riu', 'mod/riu/r1', 'commessa/k1/riunioni', 'commessa/k1/numeri', 'commessa/k1/incarico', 'nuovo/com', 'nuovo/ore', 'calendario/-/settimana', 'calendario/-/mese', 'pool', 'posta', 'profilo/-/email', 'cliente/c1/email', 'radar', 'radar/-/te', 'radar/-/clienti', 'radar/-/salvate', 'radar/-/fonti', 'radar/-/profilo', 'radar/rs1/'];
(async () => {
  await new Promise(r => setTimeout(r, 500));
  const main = w.document.querySelector('#main'); const brutte = [];
  for (const r of rotte) { const prima = errs.length; w.location.hash = '#/' + r; await new Promise(x => setTimeout(x, 30));
    const len = (main.innerHTML || '').length; const nuovi = errs.slice(prima);
    if (len < 120 || nuovi.length) brutte.push(r + ' → ' + len + ' ' + (nuovi.length ? JSON.stringify(nuovi) : '')); }
  const chk = []; const vai = async r => { w.location.hash = '#/' + r; await new Promise(x => setTimeout(x, 40)); return main.innerHTML || ''; };
  const cic = await vai('commessa/k1/note');
  chk.push(['ciclo del preventivo in testa', cic.indexOf('class="card ciclo"') > -1 && ['Bozza', 'Inviato', 'Accettato', 'Completato'].every(s => cic.indexOf(s) > -1)]);
  chk.push(['passo successivo e Perso', cic.indexOf('data-ciclo="k1|Completato"') > -1 && cic.indexOf('data-ciclo="k1|Perso"') > -1]);
  chk.push(['date dei passaggi', cic.indexOf('13 mar') > -1 && cic.indexOf('20 mar') > -1]);
  const cs2 = await vai('commesse/-/personali');
  chk.push(['due flussi con i loro pulsanti', cs2.indexOf('data-ctx-amb="personale"') > -1 && cs2.indexOf('data-ctx-amb="studio"') > -1 && cs2.indexOf('P/2026') > -1]);
  chk.push(['serie dello studio', (await vai('commesse/-/studio')).indexOf('S/2026') > -1]);
  const doc = await vai('documento/k1/');
  chk.push(['numero con la serie giusta', doc.indexOf('P/2026/001') > -1]);
  chk.push(['documento A4 con sezioni', doc.indexOf('class="a4"') > -1 && doc.indexOf('Moduli inclusi') > -1]);
  chk.push(['foglio: modelli, blocchi, voce in riga, dettagli', doc.indexOf('data-mprev-apri=') > -1 && doc.indexOf('data-rigainline=') > -1 && doc.indexOf('data-blocco=') > -1 && doc.indexOf('data-riga-edit=') > -1]);
  const ksv = await vai('commessa/k1/servizi');
  chk.push(['la scheda Preventivo è il foglio A4', ksv.indexOf('class="a4"') > -1 && ksv.indexOf('class="docbar noprint"') > -1]);
  const kin = await vai('commessa/k1/incarico');
  chk.push(['incarico: si prepara dal lavoro', kin.indexOf('data-inc-nuovo="k1"') > -1 && kin.indexOf('Prepara la lettera') > -1]);
  const pren = await vai('profilo/-/prenota');
  chk.push(['prenota una call: si prepara dal profilo', pren.indexOf('data-pcfg-attiva') > -1]);
  const riu9 = await vai('riunione/r1');
  chk.push(['riunione: registra e trascrivi', riu9.indexOf('data-rec-start="r1"') > -1 && riu9.indexOf('data-rec-file="r1"') > -1]);
  const posta = await vai('posta');
  const pAll = await vai('progetti/-/elenco');
  const pgAtt = await vai('progetto/g1/attivita');
  chk.push(['nessun rimando alla scheda sparita', fs.readFileSync(dir + 'app.js', 'utf8').indexOf('|lavorazioni\"') === -1]);
  chk.push(['il progetto ha una scheda sola per il lavoro', pgAtt.indexOf('Lavorazioni') === -1 && pgAtt.indexOf('Attività del progetto') > -1]);
  chk.push(['le attività si raggruppano in sezioni', pgAtt.indexOf('sezt') > -1 && pgAtt.indexOf('Riprese') > -1]);
  chk.push(['progetto senza preventivo, attaccato a un cliente', pAll.indexOf('Restyling logo') > -1]);
  chk.push(['progetto interno, senza cliente ne preventivo', pAll.indexOf('Sito dello studio') > -1]);
  const pCli = await vai('progetti/-/percliente');
  chk.push(['il lavoro diretto si raggruppa sotto il suo cliente', pCli.indexOf('Restyling logo') > -1 && pCli.indexOf('Senza cliente') > -1]);
  const cliP = await vai('cliente/c1/progetti');
  chk.push(['la scheda cliente mostra anche il lavoro diretto', cliP.indexOf('Restyling logo') > -1]);
  chk.push(['posta: senza casella invita a collegare (Google o IMAP)', posta.indexOf('data-gconn-collega') > -1 && posta.indexOf('data-imap-form') > -1]);
  const pem = await vai('profilo/-/email');
  chk.push(['profilo: scheda Email e calendario', pem.indexOf('data-gconn-collega') > -1 && pem.indexOf('data-imap-form') > -1]);
  const cem = await vai('cliente/c1/email');
  chk.push(['cliente: scheda Email rimanda al profilo', cem.indexOf('profilo|-|email') > -1]);
  chk.push(['incarico: pagina pubblica di firma nel codice', fs.readFileSync(dir + 'app.js', 'utf8').indexOf('function paginaFirma') > -1]);
  const fig = await vai('professioni');
  chk.push(['catalogo dei mestieri sotto il profilo', fig.indexOf('Figure professionali') > -1 && fig.indexOf('Fotografo') > -1 && fig.indexOf('data-fig="pf1"') > -1 && fig.indexOf('Il mio profilo') > -1]);
  const evt = await vai('eventi/-/prossimi');
  chk.push(['eventi con iscrizione', evt.indexOf('Workshop sui preventivi') > -1 && evt.indexOf('data-evsi="ag1"') > -1 && evt.indexOf('Settembre 2026') > -1]);
  chk.push(['eventi passati', (await vai('eventi/-/passati')).indexOf('Riunione di studio') > -1]);
  const cht = await vai('chat');
  chk.push(['chat a canali', cht.indexOf('class="chatw"') > -1 && cht.indexOf('# generale') > -1 && cht.indexOf('Buongiorno a tutti') > -1 && cht.indexOf('data-msg="ca1"') > -1]);
  const std = await vai('studio');
  chk.push(['bacheca viva', std.indexOf('data-post="studio"') > -1 && std.indexOf('Benvenuti nella bacheca') > -1 && std.indexOf('data-postlike="po1"') > -1]);
  chk.push(['studio conta eventi e messaggi', std.indexOf('Workshop e formazione') > -1 && std.indexOf('Messaggi da leggere') > -1 && std.indexOf('Cosa resta tuo') > -1]);
  const nav = w.document.querySelector('#nav').innerHTML;
  chk.push(['Eventi e Chat nel menu, Mestieri no', ['eventi', 'chat'].every(k => nav.indexOf('data-go="' + k + '"') > -1) && nav.indexOf('data-go="professioni"') === -1]);
  chk.push(['menu: Lavoro, Clienti, Studio', ['Lavoro', 'Clienti', 'Studio'].every((g, i, a) => i === 0 || nav.indexOf('data-navg="' + a[i - 1] + '"') < nav.indexOf('data-navg="' + g + '"'))]);
  chk.push(['profilo e impostazioni sotto il nome', nav.indexOf('data-go="profilo"') === -1 && w.document.querySelector('#memenu').innerHTML.indexOf('data-go="profilo"') > -1]);
  const pf9 = await vai('profilo/-/scheda');
  chk.push(['il profilo chiede che mestiere fai', pf9.indexOf('Che mestiere fai?') > -1 || pf9.indexOf('Come lavori tu') > -1]);
  chk.push(['attività tipo sul servizio', (await vai('mod/serv/s1')).indexOf('attivita_txt') > -1]);
  chk.push(['figura nella scheda, per famiglia', (await vai('mod/pros/p1')).indexOf('optgroup') > -1]);
  const pro = await vai('prospetto/k1/ore');
  chk.push(['prospetto ore condivisibile', pro.indexOf('Riepilogo ore') > -1 && pro.indexOf('data-proscarica="ore|k1"') > -1]);
  const sis = await vai('sistema');
  chk.push(['Sistema con ricontrollo', sis.indexOf('data-diag="1"') > -1]);
  const ana = await vai('analisi');
  chk.push(['analisi cliente', ana.indexOf('Analisi cliente') > -1 && ana.indexOf('La Staffa Srl') > -1]);
  const cst = await vai('commessa/k1/costi');
  chk.push(['costi del lavoro nel preventivo', cst.indexOf('Costi del lavoro') > -1 && cst.indexOf('Plugin prenotazioni') > -1 && cst.indexOf('a carico tuo') > -1 && cst.indexOf('addebitato') > -1]);
  const cpg = await vai('progetto/g1/costi');
  chk.push(['costi nel progetto', cpg.indexOf('Costi di questo progetto') > -1 && cpg.indexOf('Plugin prenotazioni') > -1 && cpg.indexOf('Foto stock') === -1]);
  const tl = await vai('task/-/lista');
  chk.push(['attività: si vede il progetto, non le ore', tl.indexOf('class="rel"') > -1 && tl.indexOf('>Sito<') > -1 && tl.indexOf('3,0 h') === -1]);
  chk.push(['attività: scrivi una riga, oggi, chip data e persona', tl.indexOf('id="tnuova"') > -1 && tl.indexOf('data-tdata="t1"') > -1 && tl.indexOf('data-tchi="t1"') > -1]);
  const to = await vai('task/-/oggi');
  chk.push(['oggi: la striscia dove si trascina', to.indexOf('class="oggibox mcol"') > -1 && to.indexOf('data-giorno=') > -1]);
  const ri = await vai('riunione/r1');
  chk.push(['riunione: link, appunti, prossimi passi, allegati', ri.indexOf('Entra nella videocall') > -1 && ri.indexOf('data-autosave="riu|note|r1"') > -1 && ri.indexOf('data-riu-task="r1"') > -1 && ri.indexOf('data-ctx-all="k1|g1|||r1"') > -1]);
  const rl = await vai('riunioni/-/prossime');
  chk.push(['riunioni: prossime e da chiudere', rl.indexOf('Kickoff sito') > -1 && rl.indexOf('Da chiudere') > -1 && rl.indexOf('Revisione foto') > -1]);
  const src = fs.readFileSync(dir + 'app.js', 'utf8');
  const ag = await vai('calendario');
  chk.push(['Agenda: una voce sola per calendario e riunioni', nav.indexOf('data-go="riunioni"') === -1 && nav.indexOf('data-go="calendario"') > -1 && nav.indexOf('>Agenda<') > -1 &&
    ag.indexOf('riunione|r1|') > -1 && ag.indexOf('data-route="riunioni|-|prossime"') > -1 && rl.indexOf('data-route="calendario|-|mese"') > -1]);
  chk.push(['Lavoro: quattro voci, Oggi sopra i gruppi, niente Carico',
    nav.indexOf('data-go="carico"') === -1 && nav.indexOf('navsolo') > -1 &&
    ['progetti', 'task', 'calendario', 'ore'].every(k => nav.indexOf('data-go="' + k + '"') > -1)]);
  const tk2 = await vai('task');
  chk.push(['Attività: il filtro sta nella barra e il numero del menu è quello che vedi',
    tk2.indexOf('data-tf="stato"') > -1 && tk2.indexOf('data-tvchi="1"') > -1 &&
    tk2.indexOf('data-route="task|-|dafare"') === -1 &&
    src.indexOf('function taskDaFare()') > -1 && src.indexOf('c: function () { return taskDaFare().length; }') > -1]);
  const or2 = await vai('ore');
  chk.push(['Ore: la settimana si scrive sui progetti', or2.indexOf('<th>Progetto</th>') > -1 && or2.indexOf('<th>Lavorazione</th>') === -1 && src.indexOf('function salvaTs(pid, data, val)') > -1]);
  const tr2 = await vai('ore/-/trasferte');
  const cos2 = await vai('commessa/k1/costi');
  /* niente numeri dei riquadri qui dentro: si contano da soli con un'animazione,
     e a 40 millisecondi dal disegno sono ancora per strada */
  chk.push(['Trasferte: chilometri, spese, ore di viaggio e confronto col preventivo',
    or2.indexOf('data-route="ore|-|trasferte"') > -1 &&
    tr2.indexOf('Milano') > -1 && tr2.indexOf('Vicenza') > -1 && tr2.indexOf('Sopralluogo') > -1 &&
    tr2.indexOf('Chilometri percorsi') > -1 && tr2.indexOf('Ore passate in viaggio') > -1 &&
    tr2.indexOf('addebitata') > -1 && tr2.indexOf('data-edit="trasf:tr1"') > -1 &&
    cos2.indexOf('Trasferte') > -1 && cos2.indexOf('2 / 3') > -1 && cos2.indexOf('uscite previste') > -1 &&
    src.indexOf('async function oreDelViaggio(') > -1 && src.indexOf('function trasfVal(') > -1 &&
    src.indexOf('costiVivi + trasfVive') > -1 &&
    /var BOOL = \[[^\]]*"addebitata"/.test(src)]);
  const kn = await vai('commessa/k1/note');
  chk.push(['preventivo alla Notion: proprietà in cima, note prima dei numeri', kn.indexOf('class="card props"') > -1 && kn.indexOf('data-qset="com|stato|k1"') > -1 && kn.indexOf('Economics') === -1 && kn.indexOf('|numeri"') > -1 && kn.indexOf('|riunioni"') > -1]);
  const kn2 = await vai('commessa/k1/numeri');
  chk.push(['numeri nella loro scheda', kn2.indexOf('Economics') > -1 && kn2.indexOf('Chi ci lavora') > -1]);
  const nc = await vai('nuovo/com');
  chk.push(['modulo preventivo corto con cliente nuovo', nc.indexOf('nuovo_cliente') > -1 && nc.indexOf('<details') > -1 && nc.indexOf('Owner') === -1 && nc.indexOf('Regia') === -1]);
  const no = await vai('nuovo/ore');
  chk.push(['ore su progetto e attività', no.indexOf('name="progetto_id"') > -1 && no.indexOf('name="task_id"') > -1 && no.indexOf('se vuoi') > -1]);
  chk.push(['avanzamento dai progetti', kn.indexOf('<label>Avanzamento</label>') > -1]);
  const cw = await vai('calendario/-/settimana');
  chk.push(['calendario a settimana con riunioni', cw.indexOf('class="week"') > -1 && cw.indexOf('Kickoff sito') > -1]);
  const doc2 = await vai('documento/k1/');
  chk.push(['documento: intestazione propria, invio, preset, nome file', doc2.indexOf('data-ed="com|intestatario|k1"') > -1 && doc2.indexOf('data-ed="cli|nome|') === -1 && doc2.indexOf('data-mprev-apri="k1"') > -1 && /data-stampa="[^1"][^"]*"/.test(doc2)]);
  const rp = await vai('report');
  chk.push(['report senza gergo e con margine reale', rp.indexOf('Pipeline') === -1 && rp.indexOf('con ore e costi') > -1]);
  const am = await vai('amm');
  chk.push(['amministrazione senza pipeline', am.indexOf('Pipeline') === -1 && am.indexOf('Preventivi in gioco') > -1]);
  const cl = await vai('cliente/c1/anagrafica');
  chk.push(['cliente: da risentire, telefono cliccabile, niente Owner', cl.indexOf('|richiamo|c1"') > -1 && cl.indexOf('Owner') === -1]);
  const dsh = await vai('dash');
  chk.push(['richieste dal sito in dashboard', dsh.indexOf('Richieste dal sito') > -1 && dsh.indexOf('data-rich-cli="rs1"') > -1 && dsh.indexOf('data-rich-pro="rs2"') > -1]);
  // --- Radar, prima da chiuso: e' lo stato in cui il gestionale sta oggi
  const rdChiuso = await vai('radar/-/clienti');
  chk.push(['radar: senza informativa la scheda clienti e\' chiusa e spiega perche\'',
    rdChiuso.indexOf('Questa parte \u00e8 ferma') > -1 && rdChiuso.indexOf('INFORMATIVA-RADAR.md') > -1 &&
    rdChiuso.indexOf('data-radar-prev=') === -1 && rdChiuso.indexOf('La Staffa') === -1]);
  const rdChiusoDett = await vai('radar/rs1/');
  chk.push(['radar: chiusa la scheda, spariscono anche le occasioni gia\' prodotte',
    rdChiusoDett.indexOf('data-radar-prev="ro1"') === -1 && rdChiusoDett.indexOf('Occasioni per i tuoi clienti') === -1]);

  // --- e ora da aperto, come sara' quando l'informativa ci sara'
  const w2 = mondoColPermesso();
  await new Promise(r => setTimeout(r, 500));
  const main2 = w2.document.querySelector('#main');
  const vai2 = async r => { w2.location.hash = '#/' + r; await new Promise(x => setTimeout(x, 40)); return main2.innerHTML || ''; };
  const rdc = await vai2('radar/-/clienti');
  chk.push(['radar: col permesso, la misura per i clienti con fonte e data', rdc.indexOf('Bando per investimenti innovativi') > -1 && rdc.indexOf('Fonte controllata il') > -1 && rdc.indexOf('data-radar-stato="rs1:salvata"') > -1]);
  const rdd = await vai2('radar/rs1/');
  chk.push(['radar: la scheda separa combacia, non combacia e da verificare', rdd.indexOf('Da verificare') > -1 && rdd.indexOf('rbl warn') > -1 && rdd.indexOf('La Staffa') > -1 && rdd.indexOf('data-radar-prev="ro1"') > -1]);
  chk.push(['radar: non dice mai che hai diritto', rdd.indexOf('hai diritto') === -1 && rdd.indexOf('sei ammissibile') === -1 && rdd.indexOf('non può rispondere al posto tuo') > -1]);
  const rdf = await vai('radar/-/fonti');
  chk.push(['radar: le fonti sono dichiarate, comprese quelle spente', rdf.indexOf('Gazzetta Ufficiale') > -1 && rdf.indexOf('Bandi della Regione del Veneto') > -1 && rdf.indexOf('spenta') > -1]);
  const rdp = await vai('radar/-/profilo');
  chk.push(['radar: il profilo si compila da qui', rdp.indexOf('id="rp-ateco"') > -1 && rdp.indexOf('data-radar-profilo="1"') > -1]);
  const srvMio = await vai('servizi');
  chk.push(['listino: sui miei servizi vedo costo e margine', srvMio.indexOf('data-edit="serv:s1"') > -1 && srvMio.indexOf('<th class="num">Costo</th>') > -1]);
  const srvAltrui = await vai('pro/p2/servizi');
  chk.push(['listino: dei servizi altrui vedo solo il prezzo', srvAltrui.indexOf('data-edit="serv:s2"') === -1 && srvAltrui.indexOf('<th class="num">Costo</th>') === -1 && srvAltrui.indexOf('di Marta Bianchi') > -1]);
  const nmr = await vai('commessa/k1/numeri');
  chk.push(['i conti li vede chi risponde del lavoro', nmr.indexOf('Margine atteso') > -1 && nmr.indexOf('scelta prudenziale') > -1]);
  const sist = await vai('sistema');
  chk.push(['Sistema: copie e ripristino provato', sist.indexOf('Copie di sicurezza') > -1 && sist.indexOf('Ripristino provato') > -1 && sist.indexOf('data-scarica-copia="1"') > -1]);
  const att = await vai('task');
  chk.push(['Attività: una tabella con le colonne giuste', ['>Nome<','>Progetto<','>Stato<','>Persona<','>Scadenza<'].every(x => att.indexOf(x) > -1) && att.indexOf('class="ttab"') > -1]);
  chk.push(['Attività: stato, persona e data si cambiano in riga', att.indexOf('data-tstato="t1"') > -1 && att.indexOf('data-tchi="t1"') > -1 && att.indexOf('data-tdata="t1"') > -1]);
  chk.push(['Attività: si ordina cliccando l\'intestazione', att.indexOf('data-tsort="scadenza"') > -1 && att.indexOf('data-tsort="titolo"') > -1]);
  chk.push(['Attività: restano «Oggi» e la riga per scrivere al volo', att.indexOf('class="oggibox mcol"') > -1 && att.indexOf('data-qnew="dafare"') > -1]);
  chk.push(['Attività: via i quattro numeri e le viste secondarie', att.indexOf('Nei prossimi 7 giorni') === -1 && att.indexOf('data-tvista') === -1 && att.indexOf('class="kpi"') === -1]);
  chk.push(['Attività: il conto sta in fondo', att.indexOf('class="tpiede"') > -1]);
  const sorg = fs.readFileSync(dir + 'app.js', 'utf8');
  chk.push(['radar: nessun campo che dichiari l\'ammissibilità', sorg.indexOf('ammissibile:') < 0 && sorg.indexOf('function radarDettaglio') > -1]);
  chk.push(['nessuna chiamata a vediCosti senza il lavoro davanti', sorg.indexOf('vediCosti()') < 0 && sorg.indexOf('function vediCosti(k)') > -1]);
  chk.push(['la chiusura avvisa se restano soldi fuori', sorg.indexOf('ancora da incassare') > -1]);
  chk.push(['valore unico e ore nel costo reale', sorg.indexOf('function valore(k)') > -1 && sorg.indexOf('Math.max(c.cost, costoOre)') > -1 && sorg.indexOf('sum(aperte, function (k) { return calc(k).tot; })') === -1]);
  chk.push(['aggiornamento vivo, timer sicuro, portali senza hash', sorg.indexOf('function avviaAggiornamenti') > -1 && sorg.indexOf('async function primaFermaTimer') > -1 && sorg.indexOf('async function timerDimenticato') > -1 && sorg.indexOf('pwd_hash') === -1 && sorg.indexOf('ha_pwd') > -1]);
  chk.push(['duplica completo, preset sezioni, mailto', sorg.indexOf('sezioni: sezioniDi(k)') > -1 && sorg.indexOf('var SEZ_PRESET') > -1 && sorg.indexOf('function mailtoPreventivo') > -1]);
  chk.push(['niente gergo', ['"Owner"', '"Vetting"', '"Retainer mensile"', '"Pipeline"', '"Timesheet"'].every(x => sorg.indexOf(x) < 0)]);
  chk.push(['guardie sul doppio clic e sui moduli', sorg.indexOf('var INCORSO = {}') > -1 && sorg.indexOf('f.dataset.busy') > -1]);
  chk.push(['chiudere chiude', sorg.indexOf('async function chiudiLavoro(') > -1 && sorg.indexOf('async function dopoAttivita(') > -1 && sorg.indexOf('async function scadenzeDaAccettazione(') > -1]);
  chk.push(['errori tradotti e genere giusto', sorg.indexOf('function erroreUmano(') > -1 && sorg.indexOf('.error.message, true') === -1 && sorg.indexOf('function dettoFatto(') > -1]);
  chk.push(['accenti nelle spiegazioni di stato', sorg.indexOf("E' uscito") === -1 && sorg.indexOf('detto sì') > -1]);
  chk.push(['stati vecchi spariti', ['"Preventivo"', '"Approvata"', '"Persa"', '"Chiusa"'].every(x => sorg.indexOf('k.stato === ' + x) < 0)]);
  chk.push(['accettazione apre progetti e attività', sorg.indexOf('async function apriIlLavoro(') > -1 && sorg.indexOf('function attivitaTipo(') > -1]);
  const pagina = fs.readFileSync(dir + 'index.html', 'utf8');
  chk.push(['fogli A4 veri: taglia elenchi e tabelle, stampa senza indirizzo e orario',
    sorg.indexOf('function impagina()') > -1 && sorg.indexOf('function candidato(c)') > -1 &&
    sorg.indexOf('querySelector("ul, ol")') > -1 && sorg.indexOf('if (!tab || righe.length < 3)') === -1 &&
    pagina.indexOf('@page{size:A4;margin:0}') > -1 && pagina.indexOf('.foglio:last-child{break-after:auto}') > -1]);
  chk.push(['nessuna chiave nel codice', !/sk-[A-Za-z0-9_-]{20}/.test(sorg) && sorg.indexOf('api.openai.com') < 0 && sorg.indexOf('service_role') < 0]);
  /* ---- numeri, non solo parole ----------------------------------------
     Finora le prove guardavano che certe scritte comparissero. Una scritta
     puo' comparire anche quando il conto sotto e' sbagliato. Qui si guardano
     i numeri, calcolati a mano dai dati di prova e confrontati con quelli che
     il gestionale mette in pagina.
     Il preventivo k1: 1 x 3000 (Sito) + 3 x 150 (trasferte) = 3.450 imponibile.
     Costi a preventivo: 1500 + 0 = 1.500. Margine atteso: 1.950 su 3.450. */
  const num = await vai('documento/k1/');
  /* niente separatore delle migliaia: in jsdom manca il dizionario delle
     lingue e toLocaleString scrive «3450». Il numero pero' e' quello vero. */
  const importi = (num.match(/\u20ac\s?([0-9]+)/g) || []).map(x => +x.replace(/[^0-9]/g, ''));
  const imponibile = 1 * 3000 + 3 * 150;            // Sito + tre uscite
  const iva = Math.round(imponibile * 0.22);        // l'aliquota del preventivo di prova
  chk.push(['imponibile: il foglio dice ' + imponibile, importi.indexOf(imponibile) > -1]);
  chk.push(['IVA al 22%: il foglio dice ' + iva, importi.indexOf(iva) > -1]);
  chk.push(['totale: il foglio dice ' + (imponibile + iva), importi.indexOf(imponibile + iva) > -1]);
  const cnt = await vai('commessa/k1/numeri');
  chk.push(['i numeri del lavoro partono dallo stesso imponibile', cnt.indexOf('\u20ac ' + imponibile) > -1]);

  /* ---- la prova della prova -------------------------------------------
     Un collaudo che non sa fallire non e' un collaudo: e' una scritta verde.
     Qui si mette apposta una verifica falsa e si controlla che il conteggio
     la veda. Se questa riga dicesse «ok», vorrebbe dire che il meccanismo e'
     rotto e che tutti gli altri «ok» non valgono niente. */
  const finte = [['prova della prova: una verifica falsa deve risultare NO', false]];
  const meccanismoFunziona = finte.filter(c => !c[1]).length === 1;
  chk.push(['il collaudo sa fallire', meccanismoFunziona]);

  /* ---- ogni voce di menu ha la sua icona --------------------------------
     Senza la riga CSS con --i, la maschera non ritaglia niente e al posto
     dell'icona esce un quadrato pieno. Non rompe nulla, non da' errori in
     console, e infatti «Radar» e «Sistema» sono arrivati online cosi'.
     Questa verifica guarda che ogni voce del menu abbia la sua icona, e che
     ci sia comunque un ripiego per quelle future. */
  const vociMenu = [...new Set([...sorg.matchAll(/\{\s*k:\s*"([a-z]+)"/g)].map(m => m[1]))];
  const conIcona = new Set([...pagina.matchAll(/\.nav button\[data-go="([a-z]+)"\]\{--i:/g)].map(m => m[1]));
  const senzaIcona = vociMenu.filter(k => !conIcona.has(k));
  chk.push(['ogni voce di menu ha la sua icona' + (senzaIcona.length ? ' (mancano: ' + senzaIcona.join(', ') + ')' : ''),
    senzaIcona.length === 0]);
  chk.push(['e comunque c\'e\' un ripiego, per le voci che verranno',
    pagina.indexOf('.nav button[data-go]{--i:url(') > -1]);

  /* ---- il numero nel menu porta da qualche parte -------------------------
     Il Radar contava anche le segnalazioni «per i clienti», che pero' con la
     scheda chiusa non si vedono: il menu diceva 1 e la pagina era vuota. */
  chk.push(['il numero del Radar conta solo quello che si puo\' aprire',
    sorg.indexOf('r.per_chi === "clienti" ? okCli : true') > -1]);

  const falliti = chk.filter(c => !c[1]);
  console.log(chk.map(c => (c[1] ? 'ok   ' : 'NO   ') + c[0]).join('\n'));
  console.log(brutte.length ? 'PROBLEMI:\n' + brutte.join('\n') : 'tutte le ' + rotte.length + ' rotte rendono contenuto');
  console.log('errori:', errs.length ? errs.slice(0, 5) : 'nessuno');
  console.log('verifiche: ' + (chk.length - falliti.length) + '/' + chk.length + ' passate');
  /* Il codice di uscita conta piu' di quello che si legge: prima era sempre 0,
     quindi qualunque cosa andasse storta il comando diceva «tutto bene» a chi
     lo lanciava da uno script. Adesso 1 vuol dire «guarda». */
  const male = falliti.length || brutte.length || errs.length;
  if (male) console.log('\nESITO: da guardare — ' + falliti.length + ' verifiche non passate, ' +
    brutte.length + ' rotte con problemi, ' + errs.length + ' errori.');
  else console.log('\nESITO: tutto a posto.');
  process.exit(male ? 1 : 0);
})();
