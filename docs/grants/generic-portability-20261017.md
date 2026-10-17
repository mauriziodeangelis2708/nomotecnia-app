# Processo generico: primo confronto fra bandi differenti

Obiettivo: i requisiti del singolo bando devono risiedere in una configurazione dati prodotta e revisionata; il motore non deve contenere rami dedicati a Lazio, Lombardia o a una specifica soglia. Questa verifica non dichiara riuscita l'estrazione automatica end-to-end.

## Secondo caso reale

È stato letto il bando ufficiale **Nuova Impresa 2026** di Unioncamere Lombardia, dal PDF pubblico https://www.unioncamerelombardia.it/fileadmin/bandi/2026/NUOVA_IMPRESA_2026/Bando_Nuova_impresa_2026_def.pdf (22 pagine; SHA-256 `41adbb20a2c99f81870d6e855170dae845665029122f50eec6040d2c66f1c875`). Il riferimento numerico è circoscritto alla sezione B.1, pagine 6–7; il fixture conserva le pagine originali 1–7. Non va confuso con la misura lombarda specifica per startup innovative o con Nuova Impresa piccoli comuni.

I casi attesi sono scritti indipendentemente dal modello. Le definizioni di test per entrambi i bandi sono preparate manualmente per verificare il formato comune: NON sono output AI dichiarati corretti. Non è stato introdotto alcun ramo regionale nel motore.

Il riferimento Nuova Impresa usa **spese già verificate come ammissibili e dopo eventuali riduzioni**. Controlla soltanto minimo, composizione dichiarata e formula percentuale/massimale; non decide automaticamente come ridurre spese di parte corrente inizialmente eccedenti. Beneficiari, date, spese, allegati, collegamenti fra domande e de minimis restano esplicitamente irrisolti e impediscono la pubblicazione del riferimento parziale.

## Correzioni del formato comune

- Nuovo predicato `compare`: confronta due espressioni numeriche, per esempio una somma e una soglia. Riutilizza le formule esistenti senza eval o codice eseguibile. Dipendenze, profondità, input mancanti, divisione per zero e valori non calcolabili seguono gli stessi controlli del motore. `compare_fields` e le configurazioni precedenti restano supportati.
- Schema del provider: `gt/gte/lt/lte` accettano solo un valore numerico; `eq/ne` mantengono i tipi scalari. La risposta reale errata del precedente test Workplace viene respinta anche da una compilazione locale dello schema JSON con AJV, mentre la risposta sintetica valida continua a passare. È una verifica strutturale locale, non una nuova inferenza né garanzia che il provider rispetti sempre lo schema.
- Il controllo testuale delle fonti preserva anche alcuni rinvii espliciti ad allegati, appendici, modelli, articoli, paragrafi e tabelle. Il rinvio rilevato resta una lacuna manuale anche se l'AI lo omette o lo collega ad altre regole; rimuovere i soli avvisi generali non lo risolve. Identificatori di questi controlli riservati al sistema.
- Questo controllo di rinvii è euristico: non risolve il collegamento, non acquisisce documenti mancanti e non garantisce di riconoscere ogni forma linguistica o rinvio implicito. Il contesto originale resta citato; superare i limiti provoca un errore esplicito, senza troncamento silenzioso.

## Evidenze e limiti

`generic-portability.test.ts` esegue lo stesso motore sui casi parziali Lazio (forfait per unità/limite addetti) e Nuova Impresa (spese e percentuale), inclusi valori di confine, massimale, input ignoti, rimappatura delle espressioni, dipendenze non numeriche e profondità eccessiva. I rinvii sono provati anche su un passaggio del secondo bando reale. `inventory.test.ts` verifica la persistenza della lacuna dopo un collegamento AI e la protezione degli identificatori riservati.

Validazione: suite completa 465 test in 33 file prima delle ultime due regressioni di inventario; queste ultime sono verificate separatamente. Totale atteso 467. TypeScript, lint mirato e build superati. I controlli GitHub del nuovo commit sono separati e vanno verificati dopo il push.

Restano da completare: lettura strutturata di tutto il secondo bando e allegati, produzione automatica completa delle due configurazioni, confronto semantico con le attese indipendenti, revisione/correzione del socio e collaudo autenticato dell'intero ciclo di una versione generata. La qualità del modello reale resta non validata. Nessuna nuova chiamata AI in questa verifica, nessun deploy, produzione invariata.
