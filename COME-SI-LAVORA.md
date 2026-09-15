# Come si lavora su questo progetto

*Aggiornato il 15 settembre 2026.*

Questo è il documento da leggere per primo. Gli altri raccontano **cosa** è
stato fatto e **perché**; questo dice **come si mette le mani** senza rompere
niente. Se una sola cosa di questo file non torna con la realtà, ha ragione la
realtà: correggi il file.

---

## Le due cose che stanno online

| Cosa | Indirizzo | Repository |
|---|---|---|
| Il gestionale | `crm.giraffastudio.it` | `keyteamstudio-pixel/giraffa-studio-crm` |
| Il sito | `giraffastudio.it` | `keyteamstudio-pixel/giraffa-studio-sito` |

Tutti e due stanno su Vercel e si aggiornano **da soli a ogni commit**. Non c'è
un pulsante «pubblica»: il commit *è* la pubblicazione. Questo ha una
conseguenza che vale la pena tenere a mente — un commit sbagliato è online in
un minuto.

Il database, i login e le funzioni di servizio stanno su Supabase, progetto
`uxeuqyzlikkbkpraeoen`, in Irlanda, piano gratuito.

---

## Il sito non si scrive a mano

Le pagine di `giraffa-studio-sito` sono **generate**. Modificare direttamente
un `.html` lì dentro è tempo buttato: al primo rigenerato la modifica sparisce.

I generatori stanno nella cartella di lavoro (`outputs/sito/`). Si lancia:

```
python3 costruisci.py
```

e riscrive tutto: pagine, `stile.css`, `sito.js`, `sitemap.xml`, `robots.txt` e
`vercel.json`. L'ordine dentro `costruisci.py` conta in un punto: `gen_vercel.py`
va per ultimo, perché legge le pagine appena scritte per calcolarne l'impronta.

Due interruttori decidono parecchio, e stanno tutti e due in `base.py`:

- **`APERTO`** — `False` finché il sito è dietro la pagina «in lavorazione».
  Da lui dipendono l'ultima regola di `vercel.json`, il `robots.txt` e il fatto
  che la mappa del sito venga o no dichiarata. Si apre il sito cambiando questa
  riga e rigenerando. Oggi il sito vero si vede su `/anteprima/`.
- **`VOCI`** — le voci del menu. Una pagina può esistere senza essere nel menu
  (è il caso di `lavori.html`: la pagina c'è, la voce no, finché non ci sono
  lavori veri da mostrare).

---

## Il gestionale: quattro file e una regola che si dimentica sempre

- `index.html` — la scaffalatura e **tutto** il CSS, scritto dentro la pagina.
- `app.js` — tutta la logica. Un file solo, grande. Vedi sotto.
- `config.js` — l'indirizzo di Supabase e la chiave pubblica.
- `recupero.js` — la pagina di reimpostazione della password.

**La regola che si dimentica sempre:** se tocchi `app.js`, devi alzare il
numero in `<script src="app.js?v=NN">` dentro `index.html`. Se non lo fai, il
browser continua a usare la copia vecchia che ha in tasca, tu vedi la modifica
(perché hai svuotato la cache) e chi la usa no. È già successo.

Lo stesso vale per `config.js` e `recupero.js`.

### Perché `app.js` è un file solo

Perché dividerlo oggi costerebbe una giornata e romperebbe cose che funzionano,
in cambio di una comodità che serve a chi ci lavora, non a chi lo usa. È una
scelta consapevole, non una dimenticanza. Quando diventerà un problema vero
(più di una persona che scrive codice nello stesso momento) si dividerà.

### Le librerie di fuori

Due, e tutte e due **con la versione fissata e l'impronta**:

- `@supabase/supabase-js@2.116.0` da jsDelivr, in `index.html`.
- `pdf.js 3.11.174` da cdnjs, caricata solo quando serve (`PDFJS_LIB` in `app.js`).

«Versione fissata» vuol dire che `@2` non si usa: `@2` significa «l'ultima della
serie 2», cioè codice che può cambiare senza che nessuno lo decida.
«Impronta» (`integrity`) vuol dire che se quel file cambiasse di un byte il
browser si rifiuterebbe di eseguirlo.

Se cambi versione, **devi rifare l'impronta**. Si calcola così, dalla console
di un browser:

```js
const r = await fetch(URL); const b = await r.arrayBuffer();
const d = await crypto.subtle.digest('SHA-384', b);
'sha384-' + btoa(String.fromCharCode(...new Uint8Array(d)));
```

Se sbagli, non si rompe in silenzio: la libreria non si carica e basta.

---

## Le prove, prima di pubblicare

```
npm i jsdom          # una volta sola
node test/run.js
```

Apre il gestionale in un browser finto con dati inventati, passa per tutte le
101 schermate, controlla un centinaio di cose fra comportamenti e numeri, e
**esce con 1 se qualcosa non torna**. Il codice di uscita conta più di quello
che si legge: prima usciva sempre con 0, quindi qualunque cosa andasse storta,
a uno script sembrava tutto a posto.

Dentro c'è anche una verifica che controlla che il meccanismo sappia dire di
no. Se quella riga dicesse «ok», vorrebbe dire che tutti gli altri «ok» non
valgono niente.

Prima di ogni commit su `app.js`: `node --check app.js` e poi `node test/run.js`.

---

## Come si pubblica

Non c'è un `git push` da qui: si passa dall'editor web di GitHub. La regola
non negoziabile è una:

> **Prima di confermare, confronta l'impronta SHA-256 del testo che hai
> incollato con quella del file che hai in locale.**

Perché un editor web può mangiarsi una riga, cambiare i fine-riga o troncare un
incollaggio lungo, e un file di 600 KB non si controlla a occhio. Il confronto
si fa sul testo con gli spazi di bordo tolti, perché quelli l'editor li tratta a
modo suo.

---

## Le funzioni su Supabase

Undici funzioni di servizio (`ics`, `leggi-preventivo`, `assistente`,
`trascrivi-riunione`, `google`, `google-callback`, `posta-imap`, `salva-tutto`,
`radar-raccolta`, `radar-lettura`, `radar-incrocio`). Il codice sta in
`supabase/functions/<nome>/index.ts`.

**Quella copia è l'unica che hai fuori da Supabase.** Se modifichi una funzione
dal pannello, ricopiala qui, altrimenti la prossima volta che serve non c'è.

Le tre `radar-*` girano da sole ogni mattina (pg_cron, fra le 6:10 e le 6:45) e
si autenticano con una chiave tenuta nel vault, non con la chiave di servizio.

---

## Le cose che non si fanno

- **Non si mette la chiave `service_role` da nessuna parte** che finisca nel
  browser o in un repository. Quella chiave passa sopra a tutti i permessi.
- **Non si tocca `execute_sql` per scrivere**: è di sola lettura. Per le
  modifiche allo schema si usa `apply_migration`, che lascia traccia.
- **Non si mettono dati di prova nel database vero.** Per le prove c'è
  `test/run.js`, che ha i suoi dati inventati e non tocca niente.
- **Non si pubblica `app.js` senza alzare il `?v=`.** Detto due volte apposta.

---

## Dove cercare quando qualcosa non torna

| Domanda | File |
|---|---|
| Com'è fatto un preventivo, cosa può e non può succedere | `REGOLE-COMMESSA.md` |
| Chi vede cosa | `RUOLI.md` |
| Come si crea un accesso, come si collega Google | `SETUP.md` |
| Cosa serve per riaprire il Radar sui clienti | `INFORMATIVA-RADAR.md` |
| Cos'è stato sistemato e perché | `CONSOLIDAMENTO.md` |
| Lo stato onesto di tutto, con le misure | `../AUDIT-15-SETTEMBRE-2026.md` |
| Com'era a settembre (storico, non attuale) | `AUDIT.md` |
