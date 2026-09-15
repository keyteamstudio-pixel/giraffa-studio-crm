> ## ⚠️ Documento storico — non descrive il CRM di oggi
>
> Questo è l'audit del **3 settembre 2026**. Da allora quasi tutto quello che
> descrive è cambiato: il livello «Lavorazione» non esiste più, le tabelle sono
> 65 e non 24, i numeri dei clienti e delle ore sono di un'altra epoca, e i
> problemi elencati qui sotto sono stati chiusi uno per uno (vedi
> `CONSOLIDAMENTO.md`).
>
> Si tiene perché racconta **perché** certe scelte sono state prese, e quel
> ragionamento vale ancora. Non si legge per sapere com'è fatto il gestionale
> adesso: per quello c'è `COME-SI-LAVORA.md`.
>
> L'audit in corso è **`AUDIT-15-SETTEMBRE-2026.md`**, nella cartella sopra.

# Audit del CRM Giraffa Studio
*3 settembre 2026 — stato: 24 tabelle, 22 viste, 6 clienti, 6 preventivi, 14 progetti, 15 lavorazioni, 49 ore registrate*

L'impianto è solido: il flusso Cliente → Preventivo → Progetto → Lavorazione esiste, i permessi sono applicati dal database e non solo dall'interfaccia, il preventivo è completo (unità, ricorrenze, trasferte, sconti, opzionali). Quello che manca non è "altra roba": sono gli **anelli che chiudono i cerchi già aperti**. Oggi diversi flussi partono e si interrompono a metà, e il lavoro riprende a mano fuori dal CRM — che è esattamente il motivo per cui un gestionale viene abbandonato.

---

## 1. I cerchi che non si chiudono

### 1.1 Il preventivo approvato non diventa lavoro
Quando un preventivo passa ad *Approvata* non succede nulla: progetti e lavorazioni vanno creati a mano, riscrivendo quello che è già nelle righe. Il momento più importante del ciclo commerciale è un cambio di stato senza conseguenze.

**Cosa serve:** un'azione «Avvia il lavoro» che, dalle righe del preventivo, crea i progetti e una lavorazione per riga assegnata, con ore stimate e responsabile già compilati. Un clic invece di venti minuti di reinserimento.

### 1.2 Le ore non arrivano al lavoro giusto
Tutte le 49 ore registrate non hanno né progetto né lavorazione. Non è un caso: il **timesheet a griglia e il timer registrano sulla commessa**, non sulla lavorazione. Il livello "Programmazione backend" che abbiamo costruito resta quindi vuoto di consuntivo, e il confronto ore stimate/effettive — il dato che dice se un lavoro è in perdita — non è calcolabile.

**Cosa serve:** griglia e timer devono puntare alla lavorazione (con il preventivo dedotto da lì). E le 49 ore esistenti vanno riassegnate.

### 1.3 Le attività vivono fuori dalle lavorazioni
15 attività su 15 sono agganciate alla commessa, non alla lavorazione. Chi apre una lavorazione non vede il suo elenco di cose da fare.

### 1.4 Le fatture si scrivono a mano
`movimenti` è una tabella da compilare: nessuna numerazione automatica, nessun collegamento con lo scadenzario o con le ore consuntivate, nessun documento generabile. Ci sono 10 scadenze di pagamento registrate e 3 fatture: due mondi che non si parlano.

**Cosa serve:** «Genera fattura» da una scadenza di pagamento o da un blocco di ore, con numerazione progressiva e stato incasso; il PDF con la stessa impaginazione del preventivo.

### 1.5 Manca il lato più delicato di un collettivo: **chi paga chi**
Le righe hanno un compenso unitario (`costo_unit`) per il professionista, e il campo `modello` distingue *ognuno il suo / Giraffa fattura / subappalto*. Ma non esiste da nessuna parte la risposta a: **quanto devo a Marta questo mese, e per cosa?** Nessun consuntivo compensi, nessuno stato "da liquidare / liquidato", nessuna nota di debito. In uno studio di professionisti indipendenti questo non è un dettaglio contabile: è la fiducia.

**Cosa serve:** una vista «Compensi» per persona e per periodo, che sommi righe assegnate e ore, con stato di liquidazione, e che il professionista veda per sé.

### 1.6 Le provvigioni PR sono un numero, non un processo
La percentuale c'è, la sezione c'è, ma manca lo stato (maturata quando il cliente paga? liquidata quando?). Un PR non può fidarsi di un numero senza stato.

---

## 2. Perché oggi un nuovo professionista non entrerebbe

### 2.1 L'accesso si crea da tecnici, non da persone
Per far entrare qualcuno bisogna: aprire Supabase, creare l'utente, copiare uno **User UID**, tornare nel CRM e incollarlo. Nessun invito via email, nessuna auto-registrazione controllata. È la barriera più grave: blocca la crescita dello studio sul collo di bottiglia di chi ha le chiavi del database.

**Cosa serve:** invito per email dal CRM (Supabase lo supporta), con ruolo e scheda pool preselezionati; il professionista imposta la sua password e trova già il suo profilo.

### 2.2 Nessuna notifica, quindi nessuna abitudine
Zero avvisi: né email né in-app. Nessuno viene informato di un'assegnazione, di un'approvazione in attesa da 7 giorni, di una scadenza domani, di un materiale caricato. La dashboard ha la lista «Da guardare adesso», ma bisogna ricordarsi di aprire il CRM per vederla. Un gestionale collaborativo senza notifiche non entra nella giornata di nessuno.

**Cosa serve:** digest email giornaliero personale (le tue scadenze, le tue approvazioni, le tue assegnazioni) + badge in-app. Il digest è la leva più efficace: riporta le persone dentro ogni mattina.

### 2.3 Il primo accesso è una pagina vuota
Un professionista appena entrato vede sezioni vuote e nessuna indicazione di cosa fare. Manca: benvenuto, completamento del profilo (tariffa, competenze, P.IVA), inserimento dei propri servizi nel listino, primo giro guidato.

### 2.4 Nessun export
Niente CSV, niente PDF fattura. Chi mette i dati in un sistema da cui non può estrarli si sente in gabbia — e il commercialista chiede un file.

---

## 3. Prestazioni: regge oggi, non regge a venti persone

### 3.1 Nessun indice sulle chiavi esterne *(risolto oggi)*
Tutte le 24 tabelle avevano un solo indice, la chiave primaria. Ogni filtro per commessa, persona o data era una scansione completa, aggravata dalle policy RLS che valutano `can_com()` riga per riga. **Aggiunti 36 indici** su tutte le chiavi esterne e sulle date usate nei filtri.

### 3.2 L'app carica tutto in memoria a ogni avvio
Al login vengono scaricate **tutte le righe di tutte le tabelle**. Con 6 clienti va bene; con 20 professionisti, 200 progetti e 20.000 ore l'avvio diventa lento e il telefono soffre.

**Cosa serve:** caricare all'avvio solo il necessario (anagrafiche + le proprie cose recenti) e leggere il resto quando si apre la sezione; ore e attività filtrate per periodo lato server.

### 3.3 Nessun limite di dimensione sui materiali
Il bucket accetta qualsiasi file: un video da 2 GB riempie il piano gratuito e blocca tutti.

---

## 4. Dettagli che si notano usando

- **Calendario**: solo mensile e in sola lettura. Manca la settimana (dove si lavora davvero), la disponibilità delle persone, il trascinamento per spostare una scadenza.
- **Timesheet su telefono**: la griglia settimanale su schermo piccolo è difficile da usare. Serve una modalità "oggi" verticale.
- **Materiali**: nessuna versione, nessun commento sul singolo file, nessuna anteprima.
- **Anagrafiche**: nessun controllo sui duplicati (stesso cliente inserito due volte con grafie diverse).
- **Diario**: la tabella eventi è popolata solo su alcune azioni; il registro non è completo.
- **Ruoli**: manca il collaboratore esterno a tempo (accesso a un solo progetto, con scadenza).

---

## 5. Cosa farei, in ordine

**Prima ondata — chiude i cerchi (il CRM diventa affidabile)**
1. «Avvia il lavoro»: preventivo approvato → progetti e lavorazioni generati
2. Ore sulla lavorazione da griglia e timer + riassegnazione delle 49 ore esistenti
3. Attività dentro la lavorazione
4. «Genera fattura» da scadenza o da ore, con numerazione e PDF

**Seconda ondata — rende il CRM di tutti (le persone ci entrano)**
5. Invito per email con ruolo, senza passare da Supabase
6. Digest email giornaliero + badge in-app
7. Vista Compensi per persona con stato di liquidazione (e provvigioni PR con stato)
8. Primo accesso guidato: profilo, tariffa, propri servizi

**Terza ondata — regge la crescita**
9. Caricamento dati per sezione invece che tutto all'avvio
10. Export CSV e PDF fattura
11. Calendario settimanale con trascinamento
12. Limiti e anteprime sui materiali

---

*Le prime quattro voci sono quelle che oggi costringono a lavorare fuori dal CRM. Le seconde quattro sono quelle che determinano se i professionisti lo apriranno ogni giorno o se resterà il gestionale di una persona sola.*
