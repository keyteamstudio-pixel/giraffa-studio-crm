# Consolidamento del CRM

Quattro cose devono diventare verificabili: **i dati si recuperano, i numeri
tornano, ciascuno vede ciò che deve, il lavoro quotidiano procede senza
intoppi.** Questo documento è il registro: cosa è stato fatto, come è stato
provato, cosa manca. Si aggiorna a ogni intervento.

Stato al 7 settembre 2026 · CRM v74 · 3 clienti, 4 preventivi, 38 file.

---

## 0 · Chiuso subito, fuori ordine

**Il buco.** `trascrivi-riunione` scaricava l'audio con la chiave di servizio
verificando solo che chi chiedeva fosse autenticato, non che potesse vedere
*quella* riunione. La chiave di servizio scavalca le regole del database:
chi la usa deve rimettere il controllo a mano.

**Come è stato risolto.** Prima di toccare il file, la funzione richiede al
database — col token di chi ha chiesto, non con la propria chiave — se quella
riunione la può vedere. Se non arriva un sì netto, si ferma.

**Prova, 7 settembre.**

| Caso | Atteso | Ottenuto |
|---|---|---|
| Riunione di un altro | rifiuto | `403 — Questa riunione non è tua` |
| Riunione propria | permesso passa | `404 — Audio non trovato` (si ferma dopo il controllo) |

Sistemato anche `inc_blocca` (il trigger che sigilla l'incarico firmato):
girava senza `search_path` fisso.

**Resta un clic, da fare a mano:** Supabase → Authentication → Policies →
*Leaked password protection*, oggi spenta.

---

## 1 · Mettere al sicuro il lavoro

### Fatto

**Copia di sicurezza completa** — `backup/salva-tutto.py`. Scarica in una
cartella datata sul computer: tutte le tabelle in JSON, tutti i file di tutti
gli archivi, e le 101 migrazioni che raccontano com'è costruito il database.
Non richiede installare niente; la chiave di servizio sta in un file personale
e non entra mai nel repository. Istruzioni in `backup/LEGGIMI.md`.

Serviva perché i backup di Supabase **non contengono i file dell'archivio**, e
perché la struttura del database viveva in un posto solo: dentro Supabase.
`schema.sql` nel repo era fermo al 1° settembre, con quindici migrazioni
applicate dopo.

**Procedura di manutenzione** — `backup/LEGGIMI.md`: cosa fare quando il
gestionale si ferma, in cinque casi, con i tempi di ripristino.
Responsabile: Nicola Ugrcic.

### Manca

- Lo script non è ancora stato lanciato una volta: va provato.
- Ambiente di prova separato (secondo progetto Supabase).
- **Il ripristino vero**: cancellare, ripristinare nell'ambiente di prova, e
  aprire clienti, preventivi, allegati e collegamenti per vedere che siano
  davvero utilizzabili. Finché non è successo, non è un backup: è una speranza.
- Passaggio a piano Pro — senza, il progetto si mette in pausa dopo sette
  giorni di silenzio e non esiste ripristino a un istante preciso.

---

## 2 · Le regole della commessa

Bozza completa in **`REGOLE-COMMESSA.md`**: per ogni punto com'è oggi
(verificato nel codice), la regola proposta, e dove serve una decisione.

### Fatto — le regole che non richiedevano decisioni

**Il prezzo appartiene alla riga.** Quando una riga nasce, il database ci copia
dentro il prezzo di listino di quel momento. Da lì non si muove: cambiare il
listino non tocca più i numeri di un lavoro chiuso. Tolto anche il ripiego dal
calcolo nel CRM (v72).

**Un preventivo accettato non si ritocca.** Dopo l'accettazione si fa avanzare
il lavoro — stato, assegnazioni, date, progetti — ma i numeri sono sigillati.
Per aggiungere si usa una variante; per correggere si riporta il preventivo a
«Inviato», e il passaggio resta nello storico.

**Prova, 7 settembre.**

| Caso | Atteso | Ottenuto |
|---|---|---|
| Cambio il prezzo di una riga accettata | rifiuto | `400` + «i numeri non si toccano» |
| Faccio avanzare la stessa riga | passa | `204` |
| Cambio l'IVA di un preventivo accettato | rifiuto | `400` + «numero, data, IVA… non si cambiano più» |
| Riporto il preventivo a «Inviato» | passa | `204` — la via per correggere resta aperta |
| Cambio l'IVA di una bozza | passa | `204` |

Prezzo, IVA e stato verificati intatti dopo le prove.

**Non si chiude in silenzio con dei soldi fuori.** Completando un lavoro con
scadenze non incassate, il CRM dice quanto resta e dove — senza impedire (v72).

### Da decidere e scrivere

- Chi è titolare del cliente, chi coordina, chi incassa.
- Quale versione del preventivo è quella accettata, e come si approvano gli extra.
- Come si calcola il margine, con costo del lavoro e fornitori dentro.
- Chi può vedere i risultati economici di un lavoro condiviso.

### Già vero nel CRM

Stato commerciale, avanzamento del lavoro e pagamenti sono già tre cose
separate: un progetto può essere consegnato e lasciare visibile il saldo.

Il **margine** ha già dentro il costo del lavoro e i fornitori: si calcola come
ricavo più extra approvati, meno il maggiore fra costo previsto e ore davvero
registrate, meno i costi vivi non ribaltati. Va solo scritto e confermata la
scelta prudenziale del «maggiore fra».

Le **quattro decisioni aperte** — coordinatore, approvazione degli extra,
margine prudenziale, chi vede i risultati economici — sono in fondo a
`REGOLE-COMMESSA.md`.

---

## 3 · Operazioni robuste

### Fatto

**Niente progetti doppi.** Finora l'apertura del lavoro evitava i doppioni
cercando un progetto con lo stesso nome: una convenzione del browser, che due
persone contemporaneamente — o un rinomina più un secondo clic — mandavano a
gambe all'aria. Ora è un vincolo del database, indifferente a maiuscole e spazi.

**Storico delle modifiche.** Tabella `storico`: chi, quando, quali campi, e i
valori di prima e di dopo. Solo sulle sei tabelle dove un errore costa —
commesse, righe, pagamenti, incarichi, clienti, progetti — e solo sui campi
davvero cambiati. Ci scrive solo il database, nessuno a mano. Lo legge chi cura
gli accessi, e ognuno vede le proprie modifiche.

**Prova, 7 settembre.**

| Caso | Atteso | Ottenuto |
|---|---|---|
| Modifico titolo e compenso | riga con prima/dopo e autore | registrata: `campi [fee, titolo]`, valori prima e dopo, autore, orario |
| Cambio solo l'orologio | nessuna riga | nessuna riga |
| Due progetti con lo stesso nome | rifiuto | `409 — duplicate key` |
| Stesso nome con spazi e maiuscole diverse | rifiuto | `409` |

Dati di prova creati e cancellati; commesse verificate intatte dopo.

### Manca

- Accettazione del preventivo e generazione progetti resi atomici lato server
  (oggi l'idempotenza regge, ma per convenzione).
- Prove di connessione interrotta e richiesta ripetuta.
- Registrazione incassi e prenotazioni.
- Test automatici da eseguire prima di ogni pubblicazione.

---

## 4 · Permessi

### Già vero

Regole di riga attive **su tutte le 65 tabelle** (154 policy in tutto),
ognuna con le sue.
Le funzioni `google` e `posta-imap` verificano che chi chiede sia il
proprietario. `assistente` e `leggi-preventivo` usano la chiave di servizio
solo per scrivere nel registro consumi: non leggono dati del CRM.

### Fatto — 15 settembre 2026

La tabella dei permessi è stata provata impersonando ogni ruolo dentro il
database, non fidandosi di quello che dice l'interfaccia: per ogni ruolo si è
provato a leggere e a scrivere su ogni tabella, e si è guardato cosa il
database concedeva davvero. La prova ha trovato e chiuso una perdita vera
(la tabella `analisi` era leggibile da chi non doveva).

Una nota su come si fanno queste prove, perché ci è costata cinque falsi «va
tutto bene»: in PL/pgSQL `FOUND` **non** viene impostato da `EXECUTE`. Va usato
`GET DIAGNOSTICS n = ROW_COUNT`. E un `UPDATE` senza `WHERE` tocca solo le
righe che quel ruolo già vede, quindi «1 riga modificata» può voler dire che ha
modificato la propria: i tentativi di scrittura vanno puntati su righe altrui,
per nome.

---

## 5 · Codice e errori

`app.js` è un file solo da circa 8.700 righe (il numero cresce: è indicativo). I calcoli economici sono già
centralizzati. Le integrazioni segnano l'ultimo errore, ma l'invio di un'email
non ha stati intermedi: o è partita o ha fallito, non esiste "in attesa".

---

## 6 · Collaudo

Le 101 schermate sono provate automaticamente. Fino al 15 settembre 2026 la
prova guardava soltanto che «la pagina si disegna», e per di più usciva sempre
con esito positivo: un collaudo che non sa fallire non è un collaudo. Adesso:
verifica anche dei **numeri** (imponibile, IVA, totale calcolati a mano e
confrontati con quelli in pagina), una verifica che controlla che il
meccanismo sappia dire di no, e un codice di uscita che vale 1 quando qualcosa
non torna. Provato rompendo `eur()` apposta: quattro verifiche falliscono e il
comando esce con 1.

Restano i quattro percorsi reali, che nessuno ha mai percorso per intero:

1. Nuovo cliente → preventivo → consegna → saldo
2. Extra richiesto durante il progetto
3. Passaggio di lavoro a un collega
4. Acconto → sospensione → ripresa → saldo

---

---

## 7 · Un solo tipo di lavoro (v73–74)

**Il problema.** Progetto, Lavorazione e Attività erano tre livelli, e gli
ultimi due avevano gli stessi campi con nomi diversi: nome/titolo, chi, stato,
ore stimate, inizio, fine, descrizione. Dentro ogni progetto c'erano **due
schede affiancate** che chiedevano la stessa cosa.

Il verdetto stava nei dati: **0 lavorazioni create, 25 attività**, di cui 23
già dritte dentro un progetto. Il livello di mezzo era stato scartato dall'uso.

**Come lo fanno gli altri.** Il principio è comune a tutti i migliori: *esiste
un solo tipo di cosa da fare, e si annida; ciò che serve a raggruppare non ha
vita propria*. Asana: Progetto → Sezione (contenitore muto, senza stato né
date) → Task → Sottotask. Linear: Progetto → Issue → Sub-issue. ClickUp ha la
gerarchia più profonda ed è quello che confonde di più. Per le agenzie
(Productive, Scoro, Teamwork) il deliverable non è un'entità a sé: è agganciato
alle attività e al budget.

**Cosa è cambiato.** Due livelli: **Progetto → Attività**. Dentro il progetto
una scheda sola. Le attività si raggruppano in **sezioni** (un titolo, niente
stato) e si spezzano in **sotto-attività**: entrambe erano già nel database,
non erano mai state accese. L'avanzamento del progetto ora si legge dalle
attività fatte.

Le due voci di menu «Progetti» e «Attività» restano: rispondono a due domande
diverse — *a che punto è il lavoro* e *cosa devo fare io adesso* — come My Tasks
e Projects in Asana e Linear.

**Prova, 7 settembre.** Quattro controlli fissi nel test automatico: una scheda
sola nel progetto, raggruppamento in sezioni, nessun rimando alla scheda
sparita, progetto senza preventivo visibile. 96 rotte, nessun errore.
Verificato anche sul CRM vero.

**Resta da fare.** La tabella `lavorazioni` e le colonne `lavorazione_id`
restano nel database, vuote e non più raggiungibili dall'interfaccia: si
cancellano quando il ripristino sarà stato provato davvero (punto 1). Il codice
morto che le riguarda va via col punto 5.

---

## 8 · Il preventivo si vede a fogli (v75–80)

**Il problema.** Il preventivo si scriveva su un foglio unico che si allungava
all'infinito. Dove sarebbe caduta la fine pagina si scopriva solo stampando: e
spesso l'ultimo foglio conteneva soltanto le firme. In più il browser scriveva
in cima e in fondo alla stampa indirizzo, titolo e orario, che in un preventivo
non hanno senso.

**Cosa è cambiato.** Mentre scrivi, il documento è tagliato in **fogli A4 veri**
(210 × 297 mm), numerati. Il taglio non è calcolato a tavolino: ogni blocco
viene messo nel foglio e si chiede al browser se il foglio è cresciuto. È
l'unico modo esatto, perché sommare le altezze dei blocchi lascia fuori i
margini fra un blocco e l'altro — l'errore che ha prodotto le prime versioni
sbagliate.

Un blocco più alto di una pagina viene tagliato **dentro**, sulla cosa più
lunga che contiene: le righe di una tabella oppure le voci di un elenco. Quello
che non ha parti ripetute — condizioni, chiusura, firme — non si taglia mai.
Il comando «+ aggiungi una voce» segue il contenuto di foglio in foglio.

Se l'ultima pagina resta quasi vuota compare un avviso: *accorcia una
descrizione e rientri in N pagine*. Nella stampa il margine della pagina è zero
e il margine vero ce l'ha il foglio: così il browser non ha spazio per
scriverci dentro indirizzo e orario.

**Prova, 8 settembre.** Su un preventivo vero di 5 pagine:

| versione | altezze dei fogli (px, A4 = 1123) | tutti dentro |
|---|---|---|
| v77 | 1220 · 1123 · 1525 · 1286 | no |
| v79 | 1123 · 1123 · 1525 · 1123 · 1123 | no |
| **v80** | **1123 · 1123 · 1123 · 1123 · 1123** | **sì** |

Il foglio che sforava conteneva una sezione con un elenco di 46 voci e nessuna
tabella: `spezza()` sapeva tagliare solo le tabelle. Ora sceglie da sé il
contenitore più lungo. L'elenco è finito 29 voci sul foglio 3 e 17 sul foglio 4.
L'ultimo foglio contiene pagamenti, chiusura e firme: non è più una pagina di
sole firme. Un controllo fisso nel test automatico impedisce che torni indietro.
96 rotte, nessun errore.

**Nota.** In stampa il testo è 10,5 pt (14 px) contro 14,4 px a schermo: circa
il 3 % più piccolo. Non sposta niente, perché il cambio pagina è imposto foglio
per foglio; serve da margine di sicurezza contro gli arrotondamenti.

---

## 9 · La sezione Lavoro rifatta (v81)

**Il problema.** Sotto «Lavoro» c'erano sette voci per quattro domande. Oggi,
Attività, Carico e Ore rispondevano in parte alla stessa cosa; Calendario e
Riunioni erano due elenchi dello stesso «quando». E tre pezzi erano rimasti
indietro rispetto a v74:

- **Carico** era una pagina di zeri: contava le *lavorazioni*, che non esistono
  più. Diceva ancora «Lavorazioni aperte», «Lavorazioni senza stima».
- **La griglia settimanale delle Ore** aveva per righe le lavorazioni: restava
  vuota per sempre e da lì le ore non si potevano più scrivere. Difetto grave e
  invisibile finché non provi a usarla.
- **Il numero in menu litigava con la pagina**: «Attività 8», ci clicchi e leggi
  «0 per oggi — Niente per oggi», perché la scheda che si apriva era un'altra.

**Cosa è cambiato.**

| prima | adesso |
|---|---|
| Oggi, Calendario, Riunioni, Progetti, Attività, Ore, Carico | **Oggi** sopra i gruppi · **Lavoro**: Progetti, Attività, Agenda, Ore |
| Attività: 4 schede (Oggi, Prossimi, Tutte, Fatte) | 2 schede: **Da fare** e **Fatte**, con i gruppi In ritardo / Oggi / Prossimi 7 giorni / Più avanti / Senza data |
| Carico: 4 numeri fermi su dati morti | i numeri utili sono in cima ad Attività, accanto alle cose che contano |
| Ore: griglia sulle lavorazioni (vuota) | griglia **sui progetti**, che si scrive davvero |
| Calendario + Riunioni | **Agenda**: Mese · Settimana · Riunioni |

Quattro voci perché sono quattro le domande: *a che punto è il lavoro*,
*cosa devo fare io*, *quando*, *quanto ci ho messo*. Il numero nel menu e quello
della scheda ora li conta **una funzione sola**, così non possono più discordare.
«Oggi» è uscito da Lavoro: è la prima pagina del gestionale, non un suo capitolo.

Le vecchie rotte continuano a funzionare: `/carico` porta ad Attività,
`/riunioni` è la terza scheda dell'Agenda, `task/-/oggi` apre «Da fare».

**Prova, 8 settembre.** Quattro controlli fissi nuovi nel test automatico: menu a
quattro voci con Oggi fuori dai gruppi e nessun Carico; Agenda unica; Attività a
due schede con la pastiglia coerente; griglia delle ore sui progetti. 96 rotte,
nessun errore. Sul CRM vero ho scritto e cancellato mezz'ora nella griglia
settimanale: salva e cancella correttamente.

**Resta da fare.** Le viste da tavolo grande (bacheca, timeline, calendario delle
attività) sono nella tendina «Altre viste…»: vanno riviste con calma, oggi sono
poco frequentate. La tabella `lavorazioni` resta nel database, vuota, e si
cancella quando il ripristino sarà stato provato davvero (punto 1).

---

## 10 · Via tutto il vecchio (v82)

**Il problema.** Quando un livello si toglie dall'interfaccia, il codice che lo
serviva resta: non dà fastidio subito, ma è la ragione per cui poi le cose
«sembrano rotte a caso». C'erano dodici funzioni scritte e mai chiamate da
nessuno, una pagina intera (`vLavorazione`) raggiungibile solo digitando
l'indirizzo a mano, un modulo per creare lavorazioni, e trentasette punti in cui
si leggeva o si scriveva `lavorazione_id`.

**Cosa è cambiato.**

| via | perché |
|---|---|
| 12 funzioni mai chiamate | `vistaOggi`, `vistaProssimi`, `vistaTutte`, `vistaLista`, `vistaMie`, `rigaTaskLista`, `isAdmin`, `isPro`, `lnkPro`, `etichettaDi`, `fchip`, `professione`, `propRipristina` |
| la pagina della lavorazione, il suo modulo, la sua rotta | non ci si arrivava più da nessun pulsante |
| la tabella `lavorazioni` fra quelle caricate all'avvio | una chiamata in meno al database ogni volta che apri il CRM |
| ogni scrittura di `lavorazione_id` | attività, ore, materiali, timer, sotto-attività, duplicati, modelli |
| il calendario che annunciava «consegna lavorazione» | erano righe che non potevano più esistere |

Due cose sono state **riscritte invece che tolte**, perché sotto c'erano numeri
finti: l'avanzamento di un progetto ora si legge solo dalle attività, e i modelli
di lavoro fanno nascere attività, mettendo le vecchie voci «lavorazione» come
**sezione** — che è dove quel livello è finito.

Una cosa è stata **lasciata apposta**: la terza casella nel contesto degli
allegati (`preventivo|progetto|—|attività|riunione`) resta vuota anziché sparire,
perché i file già caricati hanno il contesto scritto in quel formato.

**Numeri.** `app.js` passa da 623.779 a 603.321 caratteri: **20 KB di codice
morto in meno**, circa il 3%.

**Prova, 8 settembre.** 96 rotte nel test automatico, nessun errore. Poi il giro
dal vivo sul CRM online: tutte e 23 le voci di menu più le pagine di dettaglio
(cliente, preventivo con le sue schede, progetto, attività, riunione) aprono
contenuto, **zero errori in console**. Nel database: `lavorazioni` ha 0 righe e
`lavorazione_id` è nullo in tutte le ore, le attività e i materiali — quindi non
c'era niente da salvare.

**Resta da fare.** Cancellare dal database la tabella `lavorazioni` e le tre
colonne `lavorazione_id`: si fa dopo la prima copia completa (punto 1), che
richiede la chiave di servizio Supabase.

---

## 11 · Le trasferte, che prima erano solo una parola (v83–86)

**Il problema.** «Trasferta» esisteva solo come *tipo di voce* nel preventivo.
Il totale delle trasferte veniva perfino calcolato — la variabile `spese` in
`calc()` — ma non era mostrato da nessuna parte: si calcolava e si buttava.
Non era fra i tipi di costo, non c'erano chilometri, non c'era una tariffa, e
una trasferta fatta davvero non si poteva registrare da nessuna parte.

**Come funziona adesso.**

| dove | cosa |
|---|---|
| **Profilo → privato** | il tuo rimborso al chilometro (0,45 € predefinito) e quanto vale un'ora di viaggio (50% della tariffa). Solo tuoi, come la tariffa oraria. |
| **Ore → Trasferte** | il registro: quando, dove, perché, per chi, chilometri, spese vive, ore di viaggio, addebitata sì/no. In cima: uscite dell'anno, chilometri, quanto ti sono costate, ore passate in viaggio. |
| **Preventivo → Costi** | previste contro fatte: «2 uscite su 3 previste», quanto sono costate davvero contro quanto le avevi messe a preventivo, e quanto resta a carico tuo. |
| **Preventivo → Numeri** | il costo sul valore ora dice quanta parte è di trasferte. |

Il conto è `chilometri × tariffa + spese vive`. Se la trasferta è **addebitata**
al cliente non tocca il margine: passa e basta, come un costo ribaltato. Se no,
è costo vivo esattamente come uno strumento.

Il **tempo del viaggio** non sta sulla trasferta: nasce come una riga nel
registro ore, a tariffa ridotta, agganciata alla trasferta. Se correggi le ore
si corregge anche lei; se le azzeri sparisce; se cancelli la trasferta se ne va
con lei. Se stesse solo sulla trasferta non entrerebbe nel costo del lavoro e
il margine sembrerebbe più bello di quello che è.

Le trasferte sono **tue come le ore**: il rimborso chilometrico di un collega
non lo legge nessun altro. Stessa regola nel database (`pro_id = m_pro()`).

**Prova, 8 settembre.** Il collaudo dal vivo ha trovato quattro difetti che il
test automatico non poteva vedere, tutti corretti:

| difetto | perché succedeva |
|---|---|
| la trasferta non si salvava | il modulo non le metteva sopra il tuo nome e il database la rifiutava |
| «rimborso di € 0 al km» | 0,45 arrotondato all'euro fa zero: serviva un formato con i centesimi |
| due righe vuote in cima ai menu Cliente e Preventivo | ne aggiungevo una che c'era già |
| **«Addebitata: sì» non si salvava, in silenzio** | partiva come testo e Postgres lo rifiutava. Con «no» passava lo stesso, perché Postgres legge «no» come falso: il difetto si vedeva solo cambiando idea |

Poi il giro completo: creata una trasferta di 120 km con 18 € di spese e 2 ore
di viaggio → **72,00 €** e due ore a **40 €/h** nate da sole nel registro ore;
messa addebitata → le ore diventano fatturabili; cancellata → spariscono anche
le sue ore, e le registrazioni preesistenti restano intatte. 98 rotte nel test
automatico, nessun errore.

**Resta da fare.** Le trasferte non compaiono ancora nella scheda del cliente
(«quanto mi è costato andare da lui quest'anno») né in quella del progetto.

---

## Quando è finita

Quando i quattro percorsi passano, il ripristino è riuscito davvero, e non
restano errori aperti su accessi, accordi, importi o perdita di dati.
Solo allora si torna ad aggiungere funzioni.
