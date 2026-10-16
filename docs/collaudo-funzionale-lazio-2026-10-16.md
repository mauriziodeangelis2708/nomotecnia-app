# NomotecnIA — collaudo funzionale Voucher Lazio 2026
Data: 16 ottobre 2026. Base codice: 6187b5d91ca04fb77bfd418b9aba51bc9f99f09d, ramo feature/document-intelligence-sandbox-20261015.

## Esito
96 scenari sintetici aggiuntivi superati in locale, senza errori. Le prove eseguono il motore reale engine.ts e i controlli GeCoWEB/dossier; le aspettative numeriche sono fissate separatamente sulla base dell'Avviso e della griglia Excel. Nessuna modifica al motore di ammissibilità è risultata necessaria nelle condizioni provate.

Non è un nuovo collaudo manuale di tutti i campi dell'interfaccia. Il precedente collaudo sullo staging pubblicato (run 38880495607) ha separatamente superato login di quattro utenti, isolamento, salvataggio, CSV, report A4 e importazione PDF sintetici. Queste due verifiche hanno ambiti distinti.

## Fonti
- Avviso pubblico G12616 del 18 settembre 2026, BUR 77 del 24 settembre 2026, 43 pagine: artt. 1, 4–7, definizioni e Appendice 4.
- Allegato 2 Modulistica e Istruzioni, fornito il 14 ottobre.
- Uso GeCoWEB Plus e documenti di rendicontazione, fornito il 14 ottobre.
- Griglia-punteggi-7-settembre-2026 (1)(1).xlsx: formule Griglia!G9/K9, E9/E12, G27/K27, G34 e bonus.
- Pagina ufficiale consultata il 16 ottobre: https://www.lazioinnova.it/bandi/voucher-digitalizzazione-pmi-2026/ . Documentazione elencata coerente con le fonti fornite; non compare una sezione FAQ nella pagina consultata.

## Risultati rappresentativi
Tutti i casi assumono requisiti generali e tecnici positivi, documenti di test verificati e de minimis disponibile, salvo il difetto esplicitamente indicato. “Coerente” è un esito del motore sui dati inventati, non concessione dell'ente.

| Caso sintetico | Somma prima dei massimali | Contributo dopo i limiti | Esito atteso e ottenuto |
| --- | ---: | ---: | --- |
| Micro, solo migrazione Web Server | 14.076,00 EUR | 14.076,00 EUR | Coerente |
| Micro, solo Database Backup | 5.593,20 EUR | 5.593,20 EUR | Incompatibile: sotto 14.000 |
| Micro, 6 Workplace completi | 13.622,40 EUR | 13.622,40 EUR | Incompatibile: sotto 14.000 |
| Micro, 7 Workplace completi | 15.892,80 EUR | 15.892,80 EUR | Coerente |
| Micro, quattro VM distinte | 65.008,80 EUR | 50.000,00 EUR | Coerente, applicato massimale |
| Piccola, diagnosi + 20 Workplace + commerce + quattro VM + cyber | 141.361,20 EUR | 100.000,00 EUR | Coerente, applicato massimale |
| Media, diagnosi + 60 Workplace + commerce + quattro VM + cyber | 283.450,80 EUR | 150.000,00 EUR | Coerente, applicato massimale |
| Micro database, residuo de minimis 14.000 | 27.656,40 EUR | 14.000,00 EUR | Coerente: soglia inclusiva |
| Stesso caso, residuo de minimis 13.999,99 | 27.656,40 EUR | 13.999,99 EUR | Incompatibile |
| Media, sola diagnosi | 21.427,20 EUR | 21.427,20 EUR | Incompatibile anche sopra soglia |

La soglia di 14.000 EUR riguarda il contributo riconoscibile, non la spesa preventivata. Gli importi già includono il 20% personale; GeCoWEB richiede la base prevista, senza raddoppiarlo.

## Copertura dei 96 controlli
- L01–L25: soglia, massimali, de minimis, diagnosi obbligatoria, divieti A/E per micro, dimensione UE e aggregazioni, sede operativa, attività escluse, precedenti voucher e cumulo.
- L26–L38: limite INPS e addetti Lazio, cinque categorie Workplace distinte, nuova adozione, 36 mesi, commerce SaaS escluso e rifacimento oltre tre anni, origine on-premise, unicità VM, componenti cloud, esperto cyber, preventivi separati dal forfait.
- L39–L45: documenti mancanti o solo ricevuti, punteggio teorico e sostenuto distinti, 100 punti, forfettari, OSS ed editoria.
- L46–L60: finestra GeCoWEB in ora italiana, sei mesi calendario, base senza doppio 20%, zero addetti con denominatore almeno uno, dati/regole incomplete, input negativi/frazionari, cronologia effettiva, diagnosi obsoleta, saldo tardivo e limite del contributo concesso.
- S1: 8 valori di confine e intermedi del valore aggiunto per addetto.
- S2: 9 valori di confine e intermedi degli addetti.
- S3: 12 combinazioni di dimensione e numero di tipologie.
- P: 7 casi sulle soglie PMI, compreso l'OR fra fatturato e attivo.

## Verifica indipendente dei punteggi
C1: 35.000 → 0 punti; 42.500 → 17,5; 50.000 → 35; 150.000 → 17,5; 250.000 → 0. C2: 0 addetti → 0; 20 → 20; 60 → 10; 100 → 0.
C3: micro 1/2/3+ tipologie → 5/10/15; piccole/medie diagnosi +1/+2/+3/+4+ → 0/5/10/15. Ogni VM distinta è una tipologia; un duplicato non aggiunge importi né punti.
Esempio a 100 punti: piccola, 20 addetti, VE50 1.000.000 e VF25 zero, diagnosi + quattro VM, tre bonus verificati. Se mancano le prove dei tre bonus: stima teorica 100, sostenuta 70. Senza IVA: C1 sostenuto zero; senza INPS: C1 e C2 sostenuti zero.

## Limiti documentali da mantenere espliciti
Restano da trattare tramite verifica dell'operatore/ente: indipendenza e qualifiche effettive degli esperti, attività economica reale, perimetro PMI e Impresa Unica, autenticità di certificati e dichiarazioni, finanziamenti indiretti e adempimenti futuri.
Le difformità già censite nelle fonti (Atto micro 10/15 giorni; trattamento documenti IVA mancanti e zero addetti; SRG 880088:24; refusi dei modelli) restano segnalate nell'app; questi test non inventano chiarimenti amministrativi.
Non è stata verificata una decisione di concessione né inviata alcuna domanda GeCoWEB.

## Riproduzione
Node 24: node scripts/verify-lazio-functional.mjs
Facoltativo: LAZIO_AUDIT_OUTPUT=lazio-audit-results.json per il dettaglio JSON.
Workflow: .github/workflows/test-lazio-functional.yml. Esegue anche le regressioni esistenti engine/dossier/questions con dipendenze bloccate. Nessun secret, connessione Supabase, utente reale o servizio a pagamento richiesto.

## Modifiche
Aggiunti solo il runner dei casi, il workflow di verifica e questo verbale. Nessun deploy, merge su main, modifica ai dati o alla produzione.
