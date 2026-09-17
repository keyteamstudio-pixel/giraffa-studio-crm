# Giraffa Studio CRM — come è messo in piedi

*Riscritto il 15 settembre 2026. La versione precedente descriveva un CRM che
non esiste più: parlava di «lavorazioni» (livello rimosso), di un carattere di
sistema (ce n'è uno caricato da Google), di backup automatici che sul piano
gratuito non ci sono, e di una regione sbagliata. Se trovi qui qualcosa che non
torna con la realtà, ha ragione la realtà.*

Per **come si lavora** su questo progetto — dove si tocca cosa, cosa non si fa
mai, come si pubblica — leggi `COME-SI-LAVORA.md`. Questo file racconta com'è
montato.

---

## Cos'è

Pagine statiche più Supabase. Nessuna compilazione, nessun `node_modules` in
produzione: il browser scarica `index.html`, `app.js` e parla direttamente col
database.

Online su **https://crm.giraffastudio.it** — repository
`keyteamstudio-pixel/giraffa-studio-crm`, pubblicato da Vercel a ogni commit.

| File | Cosa contiene |
|---|---|
| `index.html` | la scaffalatura e tutto il CSS, scritto dentro la pagina |
| `app.js` | tutta la logica, un file solo |
| `config.js` | indirizzo Supabase e chiave pubblica |
| `recupero.js` | la pagina di reimpostazione password |
| `vercel.json` | le intestazioni di sicurezza |
| `schema.sql`, `schema_v2.sql` | lo schema delle origini, tenuto per storia |
| `supabase/functions/` | il codice delle funzioni di servizio |
| `test/run.js` | il collaudo |

Lo schema di oggi **non** è quello dei due `.sql`: è cresciuto per migrazioni,
e la fonte vera è il database. I due file restano come punto di partenza
storico.

---

## Il database

Supabase, progetto `uxeuqyzlikkbkpraeoen`, regione **eu-west-1 (Irlanda)**,
**piano gratuito**. 65 tabelle, tutte con le regole di riga attive, 154 policy.

La chiave pubblica (`sb_publishable_...`) è pubblica per costruzione: i dati
sono protetti dalle policy, non dal fatto che la chiave sia segreta. La chiave
`service_role` non deve finire da nessuna parte che arrivi al browser o a un
repository: quella passa sopra a tutti i permessi.

### I backup: come stanno davvero le cose

Sul piano gratuito Supabase **non** fa backup che si possano ripristinare. La
frase «Supabase fa backup automatici», che stava qui prima, era falsa e
pericolosa, perché toglieva a chi legge la voglia di farsi la propria copia.

Quello che c'è davvero:

- una copia completa ogni mattina (`copia-quotidiana`, alle 6:50), scritta
  dentro il database stesso nella tabella `copie_db`;
- un pulsante in **Sistema** per scaricarla sul computer;
- un ripristino **provato davvero**, non solo descritto: 61 tabelle, 1.135
  righe, rimesse e confrontate una per una.

Una copia che sta solo dentro il database che vuole proteggere serve a poco.
Scaricarne una ogni tanto e tenerla altrove è il pezzo che manca, e lo fa una
persona, non il sistema.

---

## Chi vede cosa

Quattro ruoli: **regia** (admin), **professionista**, **PR**, **cliente**.
La tabella dei permessi, per ruolo e per tabella, sta in `RUOLI.md`.

Non sono permessi grafici: sono applicati dal database. Un cliente non legge
nessuna tabella — riceve i suoi dati solo dalle funzioni `portale()` e
`portale_rispondi()`. La cosa è stata verificata impersonando ogni ruolo dentro
il database, e la verifica ha trovato e chiuso una perdita vera.

### Creare un accesso — per invito

Il modo giusto è l'invito: la password **la sceglie la persona**, non passa da
te, non gira su WhatsApp e tu non la conosci. Il gestionale è gia' pronto a
riceverlo: il link d'invito arriva con `type=invite` e `recupero.js` lo
riconosce, mostra la schermata «Nuova password» e poi fa entrare.

1. Supabase → Authentication → Users → **Invite user**, e metti la sua email.
   L'utente viene creato subito, in stato *invited*: lo **User UID** esiste
   gia' da questo momento.
2. Copia lo **User UID**.
3. Nel CRM → Impostazioni → Membri e accessi → **+ Collega utente**: incolla
   l'UID, scegli il ruolo, collega la scheda del professionista oppure il
   cliente.
4. Solo adesso digli di aprire l'email. Cliccando sceglie la password ed entra
   in un gestionale gia' abilitato.

L'ordine conta: se fa il passo 4 prima del 3 entra e legge «Accesso non ancora
abilitato» — non e' un guasto, ma e' una brutta prima impressione.

Il link dell'invito **scade** (di norma entro 24 ore). Se scade, dal pannello
si rimanda: Users → i tre puntini sulla riga → *Send invite*.

**Prima del primo invito, controlla dove punta il link.** Supabase →
Authentication → URL Configuration: il *Site URL* deve essere
`https://crm.giraffastudio.it`. Se e' rimasto `http://localhost:3000` — che e'
il valore di partenza — l'email arriva ma il link non porta da nessuna parte.

### Creare un accesso — a mano (sconsigliato)

Si puo' anche fare **Add user** con *Auto Confirm* e una password decisa da te,
ma vuol dire che quella password la conosci, e che deve viaggiare in qualche
modo fino alla persona. Usalo solo se l'invito per email non e' praticabile.

---

## La struttura del lavoro

**Cliente → Preventivo → Progetto → Attività e ore.**

- **Preventivo** — la trattativa: righe, sconti, IVA, il documento da mandare.
  Ha un ciclo di stati con delle regole, scritte in `REGOLE-COMMESSA.md` e
  imposte dal database, non solo dall'interfaccia.
- **Progetto** — «Sito», «Foto», «Social». Avanzamento, ore, valore a
  preventivo, materiali, note, e l'interruttore per mostrarlo o no al cliente.
- **Attività e ore** — stanno dentro il progetto.

Il livello **Lavorazione** è stato tolto a settembre. Erano tre livelli dove ne
bastavano due: i dati lo dicevano chiaramente (zero lavorazioni create, 25
attività). La tabella `lavorazioni` resta nel database, vuota.

Il menu: Studio · Lavoro (Progetti, Attività, Agenda, Ore) · Amministrazione ·
Profilo.

---

## L'aspetto

Il simbolo è un tracciato vettoriale dentro `index.html`, usato come maschera
dalla classe `.mark`: prende il colore del tema e resta nitido a ogni misura.
La favicon è lo stesso tracciato dentro un `data:` URL, quindi non è un file
che si possa perdere.

Il carattere **non** è quello di sistema: è **Inter**, caricato da Google
Fonts. È un servizio di terzi e sta scritto nell'informativa del sito.

I colori stanno tutti in variabili CSS in cima a `index.html`. Il colore delle
scritte piccole di servizio (`--faint`) è stato scurito a `#767067` perché il
precedente stava a 2,91 contro 1 sul fondo chiaro, sotto il minimo leggibile
di 4,5. Se lo cambi, ricontrolla il contrasto.

---

## Le funzioni di servizio

Undici, tutte su Supabase, codice in `supabase/functions/`:

| Funzione | A cosa serve |
|---|---|
| `ics` | il calendario personale da sottoscrivere |
| `leggi-preventivo` | legge un PDF e ne ricava le righe |
| `assistente` | la barra delle domande |
| `trascrivi-riunione` | dalla registrazione al testo |
| `google`, `google-callback` | posta e calendario Google |
| `posta-imap` | la casella aziendale |
| `salva-tutto` | la copia quotidiana |
| `radar-raccolta`, `radar-lettura`, `radar-incrocio` | il Radar |

Le tre del Radar partono da sole ogni mattina fra le 6:10 e le 6:45, e si
autenticano con una chiave tenuta nel vault di Supabase.

**Il Radar sui clienti è fermo di proposito.** Confrontare i dati dei clienti
con le misure pubbliche vuol dire mandarli a un fornitore esterno, e si può
fare solo dopo averglielo detto. Il freno sta nel database (tabella
`radar_clienti_ok`), non nell'interfaccia. Cosa serve per riaprirlo:
`INFORMATIVA-RADAR.md`.

---

## Vercel e DNS

Due progetti Vercel separati, uno per il gestionale e uno per il sito.

- `crm.giraffastudio.it` → record CNAME verso `cname.vercel-dns.com.`
- `giraffastudio.it` → record A verso l'indirizzo che Vercel indica.

Il DNS è su OVH.

`vercel.json` del gestionale porta le intestazioni di sicurezza: la regola che
dice al browser da dove può arrivare ogni cosa (CSP), il divieto di finire
dentro la cornice di un'altra pagina, e le altre. Se aggiungi una libreria o
un servizio esterno **devi aggiungerlo lì**, altrimenti il browser lo rifiuta —
ed è esattamente quello che deve fare.
