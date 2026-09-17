# Regolamento dei ruoli e dei permessi
*Giraffa Studio — **verificato sul database il 17 settembre 2026**, impersonando
una seconda persona vera. Non è più una bozza: è quello che il database fa.*

> **Come si ri-verifica.** `test/separazione.sql` — si incolla nel SQL Editor di
> Supabase e si preme Run. Crea un accesso finto, conta cosa vede, prova a
> scrivere sulle cose altrui, poi **annulla tutto** e stampa l'esito. Va
> rilanciato ogni volta che si tocca una regola di permessi o si aggiunge una
> tabella. L'ultima volta ha detto: *separazione intatta, nessun problema.*

Il principio è quello che hai detto: **prima di tutto ognuno ha il suo gestionale, potente e privato.** La collaborazione viene dopo, ed è sempre un atto volontario. Nessuno "sopra" gli altri: non esiste più una regia che vede tutto.

---

## 1. Le tre zone

### Zona personale — privatissima
Nessuno la vede, per nessun motivo, nemmeno chi amministra tecnicamente il sistema.

- I tuoi **clienti** e i loro dati
- I tuoi **preventivi**, progetti e lavorazioni
- Le tue **ore** e il tuo timesheet
- Le tue **fatture**, i tuoi incassi, i tuoi compensi
- La tua **tariffa oraria** e i tuoi margini

*Già applicato:* ore e timer sono chiusi a livello di database — la query di un altro utente non le restituisce, qualunque cosa faccia l'interfaccia.

### Zona condivisa — solo su invito
Diventa visibile a un collega **solo quando lo coinvolgi tu** in un lavoro specifico.

- Un preventivo dove gli assegni una riga
- Il progetto e le lavorazioni che lo riguardano
- I materiali e le note di quel lavoro
- La discussione interna di quella commessa

Chi entra vede **quel lavoro**, non il cliente in generale, non gli altri tuoi progetti, non i tuoi numeri complessivi. Quando il lavoro finisce, l'accesso resta sullo storico di quel lavoro e basta.

### Zona comune — di tutti
Le aree che esistono perché lo studio è un collettivo.

- **Servizi & listino**: il catalogo di cosa sa fare ognuno
- **Pool professionisti**: i profili, le competenze, la città
- **Spazi & ufficio**: sale, postazioni, prenotazioni
- **Impostazioni dello studio**: dati per i documenti, condizioni standard

---

## 2. Chi può modificare cosa nelle aree comuni

| Area | Legge | Modifica |
|---|---|---|
| I propri servizi a listino | tutti | **solo il proprietario** |
| I servizi altrui | tutti | nessuno |
| Il proprio profilo | tutti | **solo il proprietario** |
| Spazi e prenotazioni | tutti | chi ha il permesso *spazi* · le proprie prenotazioni sempre |
| Impostazioni dello studio | tutti | chi ha il permesso *studio* |
| Accessi (chi entra nel CRM) | chi ha il permesso *accessi* | chi ha il permesso *accessi* |

I permessi sono **tre interruttori** per persona, non un ruolo unico: *spazi*, *studio*, *accessi*. Si accendono a chi se ne occupa. Chi non ne ha nessuno è un professionista pieno: ha tutto il suo CRM, legge le aree comuni, gestisce i propri servizi.

Il ruolo **cliente** resta separato: non è un membro, entra solo dal link del suo portale.

---

## 3. Cosa cambia rispetto a oggi

**Sparisce** il ruolo "regia" che vedeva costi, margini e commesse di tutti.
**Sparisce** il ruolo "PR" come categoria: chi porta un cliente resta indicato sulla commessa come *portato da*, senza percentuali (le provvigioni sono già state rimosse).
**Resta** un solo tipo di membro — il professionista — con eventuali interruttori di responsabilità sulle aree comuni.

Conseguenze pratiche da accettare:

- Il **carico di lavoro** mostra ore stimate e attività aperte, non i consuntivi altrui
- Il **margine** di una commessa si calcola sui compensi concordati nelle righe, non sulle ore consuntivate dai colleghi
- I **compensi** diventano bilaterali: sulle tue commesse vedi quanto devi a chi hai coinvolto; sul tuo profilo vedi quanto ti devono gli altri

---

## 4. Perché uno dovrebbe popolare il suo profilo

Non per obbligo o per controllo, ma perché gli conviene:

1. **Ha un gestionale vero, gratis e già pronto** — clienti, preventivi, ore, scadenze, fatture. Da solo vale l'iscrizione.
2. **Fa i preventivi in un quarto del tempo** — il listino è già scritto, le voci si pescano, i modelli si duplicano.
3. **Vende più servizi ai suoi clienti** — quando serve una cosa che non sa fare, la trova nel catalogo dei colleghi e la mette nel suo preventivo, restando lui l'interlocutore del cliente.
4. **Viene trovato dagli altri** — più il profilo è completo (competenze, servizi, prezzi, lavori fatti), più è probabile che un collega lo inserisca in un suo preventivo.

Il quarto punto è il motore della rete: **il profilo curato è ciò che porta lavoro**. Per questo il CRM deve dire con chiarezza cosa manca al profilo e quanto vale completarlo — non con una barra di completamento fine a sé stessa, ma con il messaggio giusto: *"con questi servizi a listino i colleghi possono coinvolgerti nei loro preventivi"*.

---

## 5. Cosa serve costruire

1. Sostituire il ruolo unico con i tre interruttori di responsabilità
2. Riscrivere le regole del database di conseguenza (via i privilegi della regia)
3. **Esplora** — la pagina dei servizi dei colleghi, cercabile per competenza, città, prezzo, con «aggiungi al preventivo» in un clic
4. Compensi bilaterali: quanto devo / quanto mi devono
5. Il profilo che spiega perché conviene completarlo

---

*Da validare punto per punto prima di scrivere codice: le regole di visibilità sono la cosa più difficile da cambiare dopo, perché le persone ci costruiscono sopra la fiducia.*


---

# Il verbale della prova · 17 settembre 2026

Fatta impersonando un secondo professionista (Goffredo) dentro il database, con
un accesso finto creato e poi annullato. Due scenari.

## Scenario 1 — nessun lavoro in comune

Quello che vede di Nicola:

| | |
|---|---|
| clienti | **0** |
| preventivi | **0** |
| righe con gli importi | **0** |
| pagamenti | **0** |
| costi | **0** |
| **ore** | **0** |
| trasferte | **0** |
| progetti, attività, note sui clienti, file | **0** |
| tariffa oraria altrui | **0** |
| segnalazioni Radar altrui | **0** |
| copie del database, consumi AI | **0** |

E provando a scrivere: modificare i clienti → **0 righe toccate**; cambiare gli
importi dei pagamenti → **0 righe toccate**; registrare ore a nome di Nicola →
**rifiutato dal database**.

Quello che vede, e deve vedere: i professionisti dello studio, i servizi a
catalogo, la bacheca, i canali, gli eventi, i fornitori, gli spazi. Più le
**sue** cose: la sua tariffa, il suo Radar.

## Scenario 2 — un lavoro condiviso

Nicola assegna a Goffredo **una riga** di un preventivo. Da quel momento:

| | |
|---|---|
| preventivi visibili | **1** — solo quello |
| un altro lavoro di Nicola | **0** |
| il cliente di quel lavoro | **1** — gli serve per lavorarci |
| **le ore di Nicola su quello stesso lavoro** | **0** |

**Le ore non si condividono mai**, nemmeno fra due persone che lavorano sullo
stesso preventivo. È la regola più rigida del sistema, ed è confermata.

## Due cose da sapere, non difetti ma conseguenze

**1. Condividere un lavoro vuol dire condividere la scheda del cliente.**
Quando assegni una riga a qualcuno, quella persona vede il cliente di quel
lavoro: nome, referente, email, telefono, partita IVA **e il campo note**. Non
vede gli altri lavori di quel cliente, ma la scheda sì, tutta. Se scrivi note
commerciali riservate lì dentro, tienilo presente: il posto giusto per le cose
che restano tue è il diario del cliente (`interazioni`), che **non** si
condivide.

**2. Le richieste arrivate dal sito le vedono tutti.** Sono i contatti che
arrivano dal modulo di giraffastudio.it: nome, email, messaggio. Oggi sono
visibili a chiunque abbia un accesso interno. Ha senso, perché sono contatti
dello studio e non di una persona, ma è una scelta: se vuoi che le veda solo
chi le gestisce, si cambia.
