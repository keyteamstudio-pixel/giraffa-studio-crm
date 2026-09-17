-- ===========================================================================
-- La prova della separazione fra due persone dello studio.
--
-- Perche' esiste: il collaudo in test/run.js gira in un browser finto con
-- Supabase simulato, quindi NON puo' provare i permessi veri — quelli vivono
-- nel database. Questo file prova quelli, sul database vero, senza lasciare
-- traccia.
--
-- Come si lancia: incollalo nel SQL Editor di Supabase e premi Run.
-- Finisce SEMPRE con un errore che comincia con «ESITO:»: e' voluto. Quell'
-- errore annulla tutto quello che la prova ha creato (l'accesso finto, la
-- riga condivisa), quindi il database resta esattamente com'era. Il risultato
-- della prova e' il testo dentro il messaggio d'errore.
--
-- Cosa deve dire: tutte le righe marcate DEVE essere 0 devono essere 0.
-- Se una non lo e', qualcosa si e' rotto nei permessi.
--
-- Da rilanciare: ogni volta che si tocca una policy, si aggiunge una tabella,
-- o si cambia chi vede cosa.
-- ===========================================================================

do $$
declare
  -- le due persone: cambia questi due se i professionisti cambiano
  altro uuid := '7ba764bb-7491-4dc3-b5c5-bf7089276ad5';  -- chi entra (Goffredo)
  padrone uuid := '01064f06-dc85-482b-a068-d567f4a6a2f0'; -- chi ha i dati (Nicola)
  finto uuid := '11111111-2222-3333-4444-555555555555';   -- accesso finto, usa e getta
  k_cond uuid; k_altro uuid; cli_cond uuid;
  r text := ''; n int; m int;
  problemi int := 0;
begin
  -- accesso finto: professionista semplice, nessun permesso in piu'
  insert into membri(user_id, email, ruolo, pro_id, perm_spazi, perm_studio, perm_accessi)
  values (finto, 'prova@separazione.local', 'professionista', altro, false, false, false);

  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-2222-3333-4444-555555555555","role":"authenticated"}', true);

  -- ---------------------------------------------------------------- niente
  r := r || E'\n--- SENZA NIENTE IN COMUNE: deve vedere zero ---';

  select count(*) into n from clienti;     r := r || E'\nclienti ............. ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from commesse;    r := r || E'\npreventivi .......... ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from righe;       r := r || E'\nrighe con importi ... ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from pagamenti;   r := r || E'\npagamenti ........... ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from costi;       r := r || E'\ncosti ............... ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from ore;         r := r || E'\nore ................. ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from trasferte;   r := r || E'\ntrasferte ........... ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from progetti;    r := r || E'\nprogetti ............ ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from task;        r := r || E'\nattivita ............ ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from interazioni; r := r || E'\nnote sui clienti .... ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from materiali;   r := r || E'\nfile ................ ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from copie_db;    r := r || E'\ncopie del database .. ' || n; if n > 0 then problemi := problemi + 1; end if;
  select count(*) into n from ai_uso;      r := r || E'\nconsumi AI .......... ' || n; if n > 0 then problemi := problemi + 1; end if;

  -- le sue cose, che invece deve vedere: qui il numero e' di chi sono
  select count(*) filter (where pro_id = padrone) into n from pro_privato;
  r := r || E'\ntariffe di ' || left(padrone::text, 8) || ' ... ' || n || ' (deve essere 0)';
  if n > 0 then problemi := problemi + 1; end if;

  select count(*) filter (where pro_id = padrone) into n from radar_segnalazioni;
  r := r || E'\nradar di ' || left(padrone::text, 8) || ' ..... ' || n || ' (deve essere 0)';
  if n > 0 then problemi := problemi + 1; end if;

  -- ------------------------------------------------------------- scritture
  r := r || E'\n\n--- PROVA A SCRIVERE SULLA ROBA ALTRUI ---';
  begin
    update clienti set nome = nome || ' x' where owner_id = padrone;
    get diagnostics n = row_count;
    r := r || E'\nmodificare i clienti ..... ' || n || ' righe';
    if n > 0 then problemi := problemi + 1; end if;
  exception when others then r := r || E'\nmodificare i clienti ..... rifiutato'; end;

  begin
    update pagamenti set importo = importo + 1
     where commessa_id in (select id from commesse where owner_id = padrone);
    get diagnostics n = row_count;
    r := r || E'\ncambiare gli importi ..... ' || n || ' righe';
    if n > 0 then problemi := problemi + 1; end if;
  exception when others then r := r || E'\ncambiare gli importi ..... rifiutato'; end;

  begin
    insert into ore(pro_id, data, ore) values (padrone, current_date, 8);
    get diagnostics n = row_count;
    r := r || E'\nore a nome altrui ........ ' || n || ' righe';
    if n > 0 then problemi := problemi + 1; end if;
  exception when others then r := r || E'\nore a nome altrui ........ rifiutato'; end;

  -- --------------------------------------------------- con un lavoro in comune
  reset role;
  select id, cliente_id into k_cond, cli_cond from commesse
   where owner_id = padrone and cliente_id is not null order by created_at limit 1;
  update righe set assegnato_id = altro where commessa_id = k_cond;
  select id into k_altro from commesse where owner_id = padrone and id <> k_cond limit 1;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-2222-3333-4444-555555555555","role":"authenticated"}', true);

  r := r || E'\n\n--- CON UN LAVORO CONDIVISO ---';
  select count(*) into n from commesse;
  r := r || E'\npreventivi visibili ...... ' || n || ' (deve essere 1)';
  if n <> 1 then problemi := problemi + 1; end if;

  select count(*) into n from commesse where id = k_altro;
  r := r || E'\nun ALTRO lavoro suo ...... ' || n || ' (deve essere 0)';
  if n > 0 then problemi := problemi + 1; end if;

  select count(*) into n from ore;
  r := r || E'\nore che vede ............. ' || n || ' (deve essere 0: le ore non si condividono mai)';
  if n > 0 then problemi := problemi + 1; end if;

  select count(*) into n from clienti;
  r := r || E'\nclienti visibili ......... ' || n || ' (1: quello del lavoro, gli serve)';

  reset role;

  if problemi = 0 then
    raise exception 'ESITO: SEPARAZIONE INTATTA — nessun problema.%', r;
  else
    raise exception 'ESITO: % PROBLEMI, guarda le righe qui sotto.%', problemi, r;
  end if;
end $$;
