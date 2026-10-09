# NomotecnIA: verifica funzionale e confronto con Voucher Digitalizzazione PMI 2026

Verifica del 9 ottobre 2026. Codice di partenza: `1f6e4d2369360bfbd5271bcbc57fbddb7fa69612`.

Le correzioni riguardano la pre-istruttoria, il questionario, le indicazioni all'operatore e la gestione degli errori. Non equivalgono a una certificazione di ammissibilità, a lettura automatica degli allegati o a verifica delle banche dati pubbliche. Nessuna scrittura, cancellazione o migrazione sul database reale eseguita per queste correzioni. Nessun deploy eseguito.

## Fonti ufficiali

- [Pagina del bando e aggiornamenti](https://www.lazioinnova.it/bandi/voucher-digitalizzazione-pmi-2026/).
- [Avviso, G12616 del 18 settembre 2026, BUR 77 del 24 settembre](https://www.lazioinnova.it/app/uploads/2026/09/Avviso-Pubblico-Voucher-digitalizzazione-PMI-2026.pdf): 43 pagine, incluse Appendici 1–4.
- [Allegato 2: Modulistica e Istruzioni](https://www.lazioinnova.it/app/uploads/2026/09/Allegato-2-Modulistica-e-Istruzioni-Voucher-Digitalizzazione-PMI-2026.pdf): 50 pagine.
- [Uso GeCoWEB e documenti di rendicontazione](https://www.lazioinnova.it/app/uploads/2026/09/Uso-GeCoWEB-e-doc-rend-Voucher-Digitalizzazione-PMI-2026-DEF.pdf): 22 pagine.
- [Griglia Excel ufficiale](https://www.lazioinnova.it/app/uploads/2026/09/Griglia-punteggi-7-settembre-2026.xlsx): verificati formule G9/K9, G27/K27, G34, G45/G50/G55/G61 e gli elenchi.

Nel documento Uso GeCoWEB sono presenti refusi di numerazione dei criteri e la dicitura VE25 per gli acquisti; il motore usa **VF25 imponibile**, coerente con Avviso e griglia Excel. La marca da bollo/esenzione è richiamata nelle formalità di invio.

L'Avviso prevale su sintesi e generiche risposte del questionario. La versione di riferimento è conservata nel risultato, nel report e nello storico. Successive modifiche/FAQ richiedono una nuova revisione delle fonti: l'app non le recepisce automaticamente.

## Difetti corretti e comportamento risultante

| Prima                                                                                   | Dopo                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regole vuote o non validate potevano produrre indicazioni di conferma/esclusione        | Baseline ufficiale in codice; errore di lettura distinto da tabella vuota. Override non validati, senza riferimenti o con importi divergenti non producono importi       |
| Soglia minima nulla visualizzata come non raggiunta                                     | Soglia e massimali non determinabili restano da verificare                                                                                                               |
| Sede legale Lazio considerata sufficiente                                               | Nuova verifica sede **operativa** e attività risultanti al Registro; apertura futura condizionata alla documentazione in domanda                                         |
| Dimensione del gruppo stimata dai soli dati individuali                                 | Nessuna classificazione certa senza aggregazioni; cambi di classe/operazioni straordinarie richiedono verifica aggiuntiva                                                |
| Negativi/frazioni potevano moltiplicare il contributo                                   | Valori negativi/non finiti non validi; addetti/postazioni/mesi interi; ULA ammettono frazioni                                                                            |
| Diagnosi sola, o piccola/media senza diagnosi, non bloccavano correttamente il progetto | Esito complessivo separato dai singoli importi: composizione e diagnosi obbligatorie controllate                                                                         |
| De minimis non riduceva il totale                                                       | Massimale dell'Impresa Unica di 300.000 EUR su tre anni mobili; residuo riduce il contributo e può farlo scendere sotto 14.000 EUR                                       |
| Precedenti voucher controllati solo per spese uguali                                    | Richiesta erogazione precedente già presentata alla nuova domanda; tipologie già concesse escluse anche con spese diverse                                                |
| Workplace conteggiato per tutti gli addetti e per numero di checkbox                    | Postazioni effettivamente acquistate, tetto INPS luglio 2026 e limite Lazio in caso di accentramento; cinque categorie distinte, rinnovi/upgrade esclusi, almeno 36 mesi |
| Commerce basato su architettura e singolo sì generico                                   | Tutte le tre categorie, SSL, nuova adozione/rifacimento oltre tre anni, supporto e durata                                                                                |
| Cloud assimilava sistema esistente a server locale                                      | Server on-premise realmente in uso, cloud pubblico, componenti obbligatorie e durata; applicazioni client individuali e sistemi già cloud esclusi                        |
| Cyber basato su dimensione e perimetro genericamente definito                           | Soluzione ammessa, nuova adozione, hardware ove compatibile, software, outsourcing, esperto idoneo e durata                                                              |
| Importo preventivi denominato contributo documentato                                    | Somme registrate sono spese/preventivi: nessuna influenza sull'importo forfettario concedibile                                                                           |
| Formula punteggio non implementata                                                      | Criteri 1–6, stima e punteggio sostenuto dalla checklist verificata separati; dati mancanti distinti da zero                                                             |
| Vecchia IVA 2025 e UniEmens                                                             | Modello IVA **2026** periodo 2025 e **Attestazione della denuncia contributiva INPS luglio 2026**; vecchie spunte non ereditano il significato nuovo                     |
| Difficoltà UE / procedure causavano esclusioni automatiche                              | Difficoltà UE non trattata come causa autonoma in questo Avviso; procedure richiedono valutazione delle eccezioni dell'Appendice 2                                       |
| Errori di evidenze/ruoli potevano diventare liste vuote o accesso UI                    | Errori espliciti; autorizzazione UI chiusa in caso di errore. Le RLS restano l'autorità sul database                                                                     |
| Report accessibile con modifiche non salvate                                            | Report richiede salvataggio, checklist inclusa nel calcolo; snapshot conserva anche regole, fonte e checklist                                                            |

I nuovi quesiti usano identificativi distinti per non reinterpretare i vecchi sì generici come verifiche più complete. Gli assessment storici vanno riaperti e integrati; gli snapshot precedenti restano marcati come esiti storici da ricalcolare.

## Mappa completa del bando

`Calcolo` significa verifica deterministica sui dati inseriti. `Verifica operatore` significa domanda/checklist, senza accesso automatico a documenti, registri o atti. `Informazione` significa richiamo nella guida del report, senza attribuzione automatica di diritti o esiti amministrativi.

| Fonte                 | Condizione                                                                                                              | Copertura e limite                                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Art. 1                | A/B/C/D1–D4/E, una PMI, un progetto finanziabile, minimo 14.000, diagnosi sola vietata                                  | Calcolo composizione, minimo dopo i massimali; verifica operatore su PMI unica/progetti                                                                                                  |
| Art. 1                | Micro senza contributi A/E; modello 2 ex ante; piccole/medie diagnosi ex ante e tutte ex post                           | Calcolo divieti, domande specifiche e checklist; una diagnosi privata micro può sostituire il modello 2 senza ottenere contributo A                                                      |
| Art. 2                | Dotazione 15 milioni                                                                                                    | Informazione; nessuna simulazione della disponibilità residua dei fondi                                                                                                                  |
| Art. 3                | Gestione Lazio Innova/Regione, responsabili, diritto di accesso                                                         | Fonte ufficiale e guida; nessuna sostituzione dell'autorità competente                                                                                                                   |
| Art. 4                | PMI alla domanda e fino concessione; dimensione alla concessione                                                        | Classificazione dichiarata su due esercizi; gruppo, variazioni e casi speciali da verificare con modelli 5/6                                                                             |
| Art. 4                | Registro italiano; deroga per registro altro Stato SEE fino saldo                                                       | Verifica operatore; deroga condizionata, equipollenza/rappresentanza da verificare. Art. 6 descrive documentazione per imprese UE: casi SEE non UE richiedono chiarimento amministrativo |
| Art. 4                | Sede operativa e attività non esclusa nel Lazio; eventuale apertura documentata già in domanda                          | Nuove domande e checklist, stato condizionato per apertura futura                                                                                                                        |
| Art. 4                | Assenza delocalizzazione nei due anni precedenti/progetto; mantenimento; aggiornare requisiti                           | Domande e guida; nessuna visura automatica                                                                                                                                               |
| Art. 4                | Precedenti voucher: saldo richiesto già alla domanda e mai stessa tipologia                                             | Calcolo esclusioni sulle risposte; documenti precedenti da verificare                                                                                                                    |
| Art. 5                | Somme forfettarie, personale 20%, cap 50/100/150 mila e residuo de minimis                                              | Calcolo per tipologia e size, mai sul costo preventivi; indicazione di non duplicare il 20% GeCoWEB                                                                                      |
| Art. 5                | Avvio dopo domanda o diagnosi se successiva; sei mesi concessione; componenti installate/configurate                    | Verifica piano e date effettive se progetto realizzato; domanda in fuso italiano, confronto dei giorni; nessuna proroga automatica                                                       |
| Art. 5                | Divieto cumulo sui medesimi interventi/costi coperti; variazioni mai incrementative                                     | Domanda specifica e guida; altri costi fuori somme forfettarie da valutare caso per caso                                                                                                 |
| Art. 6                | C1 valore aggiunto per addetto: VE50 meno imponibile VF25, denominatore almeno 1                                        | Calcolo interpolazioni 35.000/50.000/250.000; forfettari reddito imponibile 2025; integrazioni OSS/editoria esplicite                                                                    |
| Art. 6                | C2 addetti INPS luglio 2026                                                                                             | Calcolo interpolazioni 0/20/100; non usa media 2025                                                                                                                                      |
| Art. 6                | C3 complessità, ogni VM distinta                                                                                        | Calcolo: micro 5/10/15 per 1/2/3+ tipologie; altre 0/5/10/15 per diagnosi +1/+2/+3/+4+. Confermato dalla formula G34 Excel                                                               |
| Art. 6                | C4 genere, C5 giovani, C6 ambiente                                                                                      | Domande con definizioni e 10 punti ciascuna; allegati verificati per C4/C6; maggioranze ed età da verificare alla domanda                                                                |
| Art. 6                | Documenti a sostegno mancanti annullano i relativi punti senza soccorso                                                 | Stima distinta da punti sostenuti dalla checklist; ricevuto/N/A non valgono verificato                                                                                                   |
| Art. 6                | Polizza/modello3, modello2 micro, editoria, rappresentanza UE, conflitti/modello4                                       | Checklist specifica; gating documenti fondamentali, altri allegati condizionati da valutare dall'operatore                                                                               |
| Art. 6                | Formulario, generazione/firma/invio GeCoWEB, bollo/esenzione, finestra, PEC, ultima domanda                             | Calcolo finestra con DST italiana e data PEC; guida formale. Nessun invio automatico da NomotecnIA                                                                                       |
| Art. 6                | Istruttoria, graduatoria/ex aequo, integrazioni 10 giorni, controdeduzioni/ricorsi                                      | Guida su graduatoria/integrazioni; tempi e diritti controdeduzioni/ricorsi restano nell'Avviso. Nessuna garanzia di finanziamento o esito amministrativo                                 |
| Art. 7                | Atto entro 15 giorni PEC o 40 per piccole/medie con diagnosi; invito ulteriori10                                        | Guida e checklist; data disponibilità non confusa con concessione; gestione inviti da verificare manualmente                                                                             |
| Art. 7                | Diagnosi non obsoleta, prima interventi, coerenza; ex post stesso esperto salvo forza maggiore                          | Domande qualifiche/coerenza e test date; verifica modelli e firma all'operatore                                                                                                          |
| Art. 7                | Sei mesi per conclusione e richiesta completa; saldo unico; modelli1/2/4 firmati                                        | Calcolo date se realizzato, checklist e guida; richiesta tardiva con conclusione nei tempi resta da verificare per possibile invito30 giorni                                             |
| Art. 8                | Difformità, riduzioni e nessun aumento                                                                                  | Informazione; l'app non simula il provvedimento di rideterminazione                                                                                                                      |
| Art. 9                | Revoca, restituzione, cause incl. delocalizzazione e cessazione                                                         | Guida; mantenimento attività3/Lazio5/SEE10 anni. Eccezioni fallimento non fraudolento/liquidazione volontaria e interessi/restituzione nell'Avviso, da valutare manualmente              |
| Art. 10               | Controlli, dichiarazioni, DURC, cartelle prima saldo                                                                    | Verifica operatore e informazione, nessuna integrazione automatica con enti                                                                                                              |
| Art. 11               | Conservazione5 anni, controlli, pubblicità FESR, principi orizzontali/DNSH, monitoraggio                                | Domande impegni e guida; non certifica gli adempimenti futuri                                                                                                                            |
| Art. 12 / App. 3      | Informativa alle persone i cui dati sono comunicati                                                                     | Domanda e guida; non sostituisce informative/modulistica ufficiali                                                                                                                       |
| Art. 13               | PEC/pubblicazioni, comunicazioni/FAQ, rinvio normative                                                                  | Guida e link aggiornamenti; nuove FAQ non acquisite automaticamente                                                                                                                      |
| App. 1                | Attività escluse, SME, Impresa Unica, VM, esperti, certificazioni, giovani                                              | Definizioni nelle domande/regole; attività effettiva e documenti da verificare. Giovani **non ancora36 anni**, non under35                                                               |
| App. 2.1/4            | DURC e polizza domanda, polizza concessione/esenzione                                                                   | Domande e checklist; riconferma documentale e controllo ente necessari                                                                                                                   |
| App. 2.2              | Pieno esercizio, procedure con eccezioni; esclusione incentivi delocalizzazione                                         | Verifica separata; procedure non escludono automaticamente prima della valutazione eccezioni                                                                                             |
| App. 2.3              | Condanne tutti soggetti art94, interdizioni, decadenze2 anni, pantouflage3 anni, CCNL/sicurezza/lavoro/ambiente         | Domande distinte; firma DSAN e accertamento dei soggetti rilevanti all'operatore/ente                                                                                                    |
| App. 4.A              | Manager UNI11814 accreditato o MIMIT settore8; indipendenza persona/società; esperto cyber idoneo; modelli e tempi      | Domande, dates e checklist; non basta titolo di ingegnere o generico innovation manager; controllare qualifiche e firme                                                                  |
| App. 4.B              | Cinque categorie tutte nuove, firma+conservazione, quantità acquistata ≤ addetti INPS/Lazio, servizi unitari, 36mesi    | Calcolo categorie distinte/quantità/durata, verifiche tecniche e contrattuali; hardware/connettività/formazione fuori forfait B                                                          |
| App. 4.C              | Tre categorie IaaS/PaaS, dominio+SSL, servizi ICT+supporto36mesi; nuova/sostituzione oltre3anni; rinnovi esclusi        | Calcolo durata/architettura e domande specifiche; progetti solo SaaS esclusi                                                                                                             |
| App. 4.D              | Server locali esistenti → pubblico, VM distinta; tre categorie; tutti6servizi e tutte attività ICT o eccezioni motivate | Calcolo VM unica per tipo e durata; domande complete su inventario, servizi, software, ICT/formazione/supporto; client individuali e sistemi già cloud esclusi                           |
| App. 4.E              | Solo piccole/medie; almeno1di8 soluzioni; nuova; hardware compatibile+software+outsourcing; esperto;36mesi              | Calcolo dimensione/soluzioni/durata e verifiche tecniche; non inventa un obbligo di fornitore unico ICT per E                                                                            |
| App. 4 generale       | Contratti, fatturazione/pagamenti, acquisto PMI/strumentalità, attestazione conformità; costi coperti e CUP             | Domande e guida; spese evidenze separate dai contributi, CUP verificato nelle fatture applicabili                                                                                        |
| Modulistica / GeCoWEB | Modelli1–6/D/A/R, dichiarazioni, firma, importi base senza20%, allegati e trasmissione                                  | Checklist e guida; l'app non genera i modelli ufficiali, non firma e non trasmette la domanda                                                                                            |

## Importi verificati (EUR, già comprensivi del personale 20%)

| Intervento                  |     Micro |   Piccola |     Media |
| --------------------------- | --------: | --------: | --------: |
| A diagnosi                  |   escluso |  8.162,40 | 21.427,20 |
| B per postazione acquistata |  2.270,40 |  2.270,40 |  2.270,40 |
| C commerce                  |  4.954,80 |  8.125,20 | 15.873,60 |
| D1 application              | 17.683,20 | 17.683,20 | 17.683,20 |
| D2 database                 | 27.656,40 | 27.656,40 | 27.656,40 |
| D3 web                      | 14.076,00 | 14.076,00 | 14.076,00 |
| D4 database backup          |  5.593,20 |  5.593,20 |  5.593,20 |
| E cyber                     |   escluso | 14.656,80 | 44.917,20 |
| Massimale impresa           |    50.000 |   100.000 |   150.000 |

Somma delle tipologie applicabili, poi minimo fra somma, massimale size e residuo de minimis. Se anche un limite necessario non è determinabile, il totale concedibile resta nullo (`null`, visualizzato come —), mai automaticamente zero. Il totale inferiore a 14.000 è incompatibile; una sola diagnosi resta incompatibile anche se supera tale soglia.

## Prove e limiti operativi

- 140 test automatici con dati sintetici: soglie UE/OR finanziario, gruppi/operazioni, input negativi/frazionari, regole mancanti/override, sede e requisiti, documenti, precedenti voucher, de minimis e minimi, A–E, unicità VM, massimali, punteggi e documenti, finestre PEC/DST, durata calendario e ordine temporale, UI degli esiti e risposte nascoste, errori DB/ruoli.
- TypeScript `npx tsc --noEmit`: superato.
- Build produzione `npm run build`: superata (avvisi tooling Vite/Nitro già presenti, non deployment).
- ESLint sui file modificati: superato. `npm run lint` generale trova problemi preesistenti soprattutto di formattazione su file non modificati; non è dichiarato superato.
- Il setup Vitest referenziato ma assente nel repository è stato aggiunto: prima impediva l'esecuzione dei test.
- Il precedente collaudo dell'app online aveva verificato con record TEST: accesso, cliente/assessment, riuso anagrafica, questionario, salvataggio, evidenze, checklist, note, storico e JSON. Le correzioni attuali sono provate localmente con dati sintetici/mocks: gli account reali, le RLS effettivamente installate e l'esito di stampa browser della nuova build richiedono verifica nell'ambiente di distribuzione.
- Letture fallite ora espongono errore: non simulano database vuoto, assenza documenti, accesso autorizzato o nuovo esito normativo.
- Non eseguite cancellazioni, cambi ruoli utenti reali, invii GeCoWEB, modifiche alle configurazioni di hosting o applicazione SQL.
- La migrazione SQL esistente autorizza il primo iscritto quando manca qualsiasi admin. Non simulato tale caso con registrazioni reali: preservare l'amministratore e verificare tale bootstrap separatamente prima di nuove installazioni.

Per rendere visibile la correzione sul sito occorre integrare questa modifica nel ramo collegato alla distribuzione e verificare la nuova versione online. Gli assessment storici richiedono le nuove risposte; nessuna migrazione li può rendere automaticamente verificati.

## Identità dei documenti esaminati

SHA-256 dei file ufficiali scaricati il 9 ottobre 2026, per identificare la versione analizzata:

- Avviso: `5441b7a46164e51b91b824027836b47ec2a935a8b6a0d855f04acaa54885bd57`.
- Modulistica: `574874f51b8a860cd2770ec8d63a53038f8f769ad1de8b5af181ef9d6d91612f`.
- Uso GeCoWEB: `17b06050a5e2fea9d779f11ab6636e8911ec88331112ebd9767fb79715215250`.
- Griglia: `aee0e28f6f10c6ef361a7d72ff5ac70a21791a9df2413253631e5de49b5f887c`.
