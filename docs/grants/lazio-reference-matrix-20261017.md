# Matrice di riferimento Lazio — 17 ottobre 2026

Base: assessment Lazio scritto e verificato manualmente (`engine.ts`, `questions.ts`, `bando.ts`, `lazio-dossier.ts`), separato dal generatore configurabile in bozza. Questa matrice riprende la verifica documentale del 9/15 ottobre, rilegge le condizioni decisive dell'Avviso e aggiorna il riscontro sul codice corrente. Non afferma una nuova lettura integrale di ogni pagina dei sette file né una verifica delle dichiarazioni di un cliente.

I sette file oggi collegati da https://www.lazioinnova.it/bandi/voucher-digitalizzazione-pmi-2026/ coincidono byte per byte con le fonti locali precedentemente analizzate. Impronte e URL: `lazio-source-verification-20261017.json`. Le formule della griglia sono state nuovamente lette nelle celle E9/E12/G9/K9/G27/K27/G34/G45/G50/G55/G61. I 96 casi sintetici del motore esistente sono stati rieseguiti: risultati in `lazio-functional-verification-20261017.json`.

**C** = calcolo sui dati inseriti; **O** = controllo documentale dell'operatore; **I** = informazione/richiamo, senza decisione amministrativa automatica. Le prove Lxx/Sx/Px sono definite in `scripts/verify-lazio-functional.mjs`. Un presidio O/I non equivale a un requisito accertato automaticamente.

| Fonte / pagine Avviso | Requisito o gruppo di condizioni | Domande / regola nel codice | Presidio | Prove e limite |
| --- | --- | --- | --- | --- |
| Art.1 p.3 | Una PMI, un progetto; interventi A–E; diagnosi sola vietata | `unica_pmi_progetto`, composizione `evaluate` | C/O | L10; unicità dichiarata, nessun controllo registri |
| Art.1 p.3 | Contributo riconoscibile almeno 14.000 dopo limiti | `min_project`, `meetsMinimumPotential` | C | L02/L06/L07/L24/L25; non è una soglia sui preventivi |
| Art.1 p.3 | Micro senza contributo diagnosi/cyber; piccole/medie con diagnosi | `diagnosi_contributo_micro`, `interesse_cyber`, `diagnosi_prevista` | C/O | L10–L13; modelli e firme da verificare |
| Artt.2–3 p.4 | Dotazione, gestione e responsabili | Fonti e guida del report | I | Nessuna stima dei fondi residui o garanzia di graduatoria |
| Art.4 p.4; App.1 pp.22–23 | PMI, esercizi, aggregazioni, eccezioni e continuità del requisito | `classifySize`, `pmi_perimetro`, `pmi_calcolo`, `pmi_perimetro_verificato` | C/O | L14–L16, Px; casi straordinari e documenti non verificati automaticamente |
| Art.4 p.4 | Registro italiano o deroga SEE | `iscritta_attiva`, `registro_ue`, `estero_documenti`, `rappresentante_ue` | O | Deroga e documentazione; discordanza SEE/UE resta esplicita |
| Art.4 p.4 | Sede operativa e attività Lazio, apertura futura documentata in domanda | `sede_operativa_lazio`, quesiti apertura futura, `sede_titoli` | C/O | L17/L18; nessuna visura automatica |
| Art.4 p.4; App.1 p.19 | Attività effettiva non esclusa, non semplice codice ATECO | `ateco_codice`, `ateco_escluso`, `attivita_esclusioni_verificate` | O | L19; l'intero elenco va verificato sui fatti |
| Art.4 pp.4–5 | Delocalizzazione precedente/durante, aggiornamento requisiti | `delocalizzazione_assente`, `aggiornamenti_requisiti` | O | Cascata dei requisiti generali in `lazio-dossier.test.ts`; nessun monitoraggio futuro automatico |
| Art.4 p.5 | Voucher precedente: richiesta erogazione già presentata; niente stessa tipologia | `precedenti_voucher_lazio`, `precedenti_tipologie`, completezza elenco | C/O | L20–L22; verifica documenti precedenti |
| Art.5 pp.5–7 | Forfait per dimensione/tipologia, personale già incluso | `NUMERIC_RULES`, `rv`, importi GeCoWEB base | C | L01/L03–L05/L38/L48/L49; preventivi non cambiano forfait, niente doppio 20% |
| Art.5 pp.6–7 | Cap 50/100/150 mila e residuo de minimis Impresa Unica | `capIt`, `de_minimis_impresa_unica`, verifica RNA | C/O | L03–L09; residuo ignoto non diventa zero o disponibilità piena |
| Art.5 p.6 | Una Workplace per addetto e una sola VM per ciascuna tipologia | quantità e `selected` su `cloud_sistemi` | C/O | L26/L27/L35; addetti documentati |
| Art.5 p.6; App.4 | Avvio dopo domanda o diagnosi se successiva | date effettive `*_data_avvio`; `romeDay` | C/O | L55/L56; conferma piano prima della realizzazione |
| Artt.5/7 pp.6/13–14 | Conclusione e saldo completo entro sei mesi dalla concessione BUR | `saldo_entro_sei_mesi`, `saldo_date`, `calendarMonths` | C/O | L47/L58/L59; invito 30 giorni non è proroga automatica |
| Art.5 p.7; App.4 | Cumulo vietato sugli stessi interventi/costi coperti, non su qualunque costo estraneo | `doppio_finanziamento_assente`, `aiuti_dettaglio`, `aiuti_richiesti_assenti` | O | L23; qualificazione degli aiuti e costi esterni da valutare |
| Art.6 pp.7–9 | C1 valore aggiunto/addetti, imponibile VF25, forfettari, OSS/editoria | `calculateScore`, `scoreValueAdded`, campi fiscali 2025 | C/O | S1, L40/L44/L45/L50; denominatore almeno uno; divergenze guida segnalate |
| Art.6 p.8 | C2 addetti attestazione luglio 2026, interpolazioni | `scoreEmployees`, `addetti_inps_luglio_2026` | C/O | S2, L41; non ULA o UNIEMENS |
| Art.6 p.8; Griglia G34 | C3 articolazione, VM distinte, diagnosi obbligatoria per piccole/medie | conteggio interventi confermati, `c3` | C | S3; se componenti ignote non attribuisce un C3 certo |
| Art.6 p.8; App.1 pp.19–21 | Bonus genere/giovani/ambiente | `cert_genere_valida`, `impresa_giovanile`, `giovani_assetto`, `cert_ambiente_valida` | C/O | L42/L43; età e maggioranze da verificare, SRG non accreditato automaticamente |
| Art.6 p.9 | Documenti mancanti annullano i punti relativi senza integrazione | `supportedTotal`, checklist verificata distinta da ricevuta | C/O | L39–L43; punteggio prudenziale, non provvedimento dell'ente |
| Art.6 pp.9–10 | Polizza/esenzione, Modello2 micro, editoria, rappresentanza estera, conflitti | checklist e `evaluateDossier` stadio domanda | O | Test fascicolo completo/incompleto; conflitto non esclusione automatica |
| Art.6 pp.10–12 | GeCoWEB finalizzato, firma, bollo, PEC, finestra e ultima domanda | campi GeCoWEB, `submissionInWindow`, completezza domanda | C/O/I | L46; nessun invio GeCoWEB automatico |
| Art.6 pp.11–12 | Graduatoria, verifica punteggi, parità, istruttoria, integrazioni e ricorsi | guida del report e richiamo fonte | I | Non simulati ranking, fondi disponibili o provvedimenti |
| Art.7 p.13; App.4.A p.32 | Atto firmato, 15/40 giorni; diagnosi non obsoleta e coerente | `atto_pec_data`, `atto_invio_data`, `atto_perfezionato`, diagnosi | C/O | L57; discordanza micro 10/15 e decorrenza 40 giorni da chiarire sulla comunicazione |
| Art.7 p.14 | Modelli ex post, firme, soggetto ICT micro unitario, saldo unico | `modelli_expost`, `firme_expost_verificate`, `fornitore_micro_unico`, checklist saldo | O | Test fascicolo; non sostituisce modelli ufficiali né firma digitale |
| Art.8 p.15 | Variazioni e nessun incremento del concesso | `variazioni_progetto`, importo concesso/rideterminato, `capIt` | C/O/I | L60; gravità/rideterminazione e ranking effettivo spettano all'ente |
| Art.9 pp.15–16 | Revoca, Lazio 5 anni, SEE 10, cessazione 3, eccezioni e recupero | `obblighi_mantenimento`, guida report | O/I | Nessuna valutazione automatica di fallimento non fraudolento o interessi |
| Art.10 pp.16–17 | DURC domanda/saldo, cartelle e controlli | `durc_regolare`, `durc_saldo_regolare`, `cartelle_saldo` | O | Attestazioni e accertamenti spettano a operatore/ente |
| Art.11 pp.17–18 | Conservazione, controlli, pubblicità, DNSH e monitoraggio | impegni generali, `trasparenza`, campi saldo | O/I | Non certifica adempimenti futuri |
| Art.12/App.3 pp.18/27–30 | Informativa alle persone i cui dati sono trasmessi | `privacy_informativa`, guida | O/I | Non è una verifica GDPR completa dell'app o sostitutiva dell'informativa ufficiale |
| Art.13 p.18 | PEC, pubblicazioni, FAQ e rinvii | fonte ufficiale e guida | I | Controllo delle versioni puntuale; nessun recepimento automatico di FAQ |
| App.2 pp.25–26 | DURC/polizza, pieno esercizio con eccezioni, condanne/sanzioni/decadenze/pantouflage/lavoro | `GENERAL_CHECKS`, quesiti procedure ed eccezioni, soggetti rilevanti | O | Test cascata generale; non raccogliere o certificare automaticamente dati giudiziari |
| App.4.A pp.31–33 | Qualifiche e indipendenza IM/cyber, stesso firmatario salvo forza maggiore, tempi | `diagnosi_manager`, `diagnosi_tempi`, qualifiche e modelli | O/C | L13/L37/L57; elenchi/qualifiche da verificare, non basta titolo generico |
| App.4.B pp.33–35 | Cinque categorie nuove, firma e conservazione, limite Lazio/INPS, contratti e 36 mesi | `workplace_*`, `COMMON_TECH_CHECKS` | C/O | L24–L30/L53/L54; upgrade/rinnovi esclusi, costi hardware esterni al forfait B |
| App.4.C pp.35–37 | IaaS/PaaS, SSL, tre categorie, nuova adozione o soluzione oltre tre anni | `commerce_*`, data precedente, `lazio-dates` | C/O | L31–L33 e regressione PEC UTC/offset; SaaS e mero rinnovo non ammessi |
| App.4.D pp.37–40 | Server locale già in uso, cloud pubblico, VM ammesse, componenti e deroghe documentate | `cloud_*`, inventario, sei servizi e attività ICT | C/O | L34–L36; componenti incompatibili/escluse vanno motivate ex ante, non eliminate senza evidenza |
| App.4.E pp.40–43 | Solo piccole/medie, una fra otto soluzioni, componenti e hardware compatibile, outsourcing | `cyber_*`, esperto, nuova adozione, durata | C/O | L12/L37 e test tecnici; clausola hardware non è un obbligo assoluto senza eccezioni |
| Modulistica 50 pp. | Domanda, DSAN, Modelli1–6, Atto, richiesta saldo e dichiarazioni PMI | `CHECKLIST`, `DOSSIER_STEPS`, dati formulario | O/I | Ripresa revisione del 15/10 su identica versione; nessuna generazione/firma dei modelli ufficiali |
| Guida GeCoWEB 22 pp. | Dieci box, importi base, allegati e trasmissione/rendicontazione | `geCoConsistency`, `geCoRequired`, checklist | C/O/I | L48/L49, test dossier; refusi VF25/criteri e divergenze già evidenziati |
| Griglia XLSX | Tutte le formule di calcolo e bonus | `scoreValueAdded`, `scoreEmployees`, `calculateScore` | C | Formule rilette; S1/S2/S3/L43–L45/L50. L'app non assume identità dell'ente con una stima |
| Modello1 DOCX | Metodo, contesto, dotazioni, analisi ex ante/ex post, piano, firme professionisti | sezioni `modelli_exante`, `modelli_expost`, qualifiche e checklist | O/I | Versione identica, campi descrittivi presenti; refusi upgrade/D.2 non modificano l'Avviso |
| Modello2 DOCX | Autovalutazione micro, piano e sezione ex post con beneficiario e fornitore | stesse sezioni, `fornitore_micro_unico`, firme | O/I | Versione identica; errori di etichette nel modello non diventano requisiti finanziabili |

## Difetto riprodotto e corretto durante questa verifica

Per la sostituzione Commerce, il motore usava il giorno italiano della PEC mentre il fascicolo tagliava i primi dieci caratteri del timestamp. Gli istanti `2026-10-16T23:30:00Z` e `2026-10-17T01:30:00+02:00` sono equivalenti, ma producevano indicazioni documentali diverse. Un offset +03:00 produceva anche il caso inverso. Due dei tre nuovi test fallivano prima della correzione. Il fascicolo ora usa gli stessi helper del motore, estratti in `lazio-dates.ts`, incluso il calendario a mesi per il limite triennale.

## Limiti ancora aperti

- Le discrepanze ufficiali rimangono in `OFFICIAL_DISCREPANCIES`; non sono risolte inventando una prevalenza o una proroga. È stata aggiunta la diversa formulazione della decorrenza dei 40 giorni fra art.7 e App.4.A.
- I controlli documentali e informativi della matrice richiedono un operatore: la copertura del questionario non prova il possesso dei requisiti di un cliente.
- I riferimenti del generatore configurabile restano parziali e le prove AI reali restano fallite. Non sostituiscono questo motore Lazio.
- Questo ciclo è offline, con dati sintetici. Non è ancora il collaudo autenticato della nuova versione in staging. Nessun deploy o dato reale modificato.
