# Calcoli comuni: separare interpretazione ed esecuzione

## Problema e modifica

La generazione diretta dell'albero aritmetico ha applicato l'aliquota alla sola categoria cui imputare l'aiuto, anziché alla base complessiva. Il solo rafforzamento del prompt, un esempio matematico, un prompt più breve e la modalità JSON senza schema non hanno risolto il problema sul medesimo estratto B.1 di Nuova Impresa 2026. Il confronto resta circoscritto al testo già documentato, non all'intero bando con tutti gli allegati.

Il formato di generazione ora distingue tre piani di contributo:

- `percentage`: aliquota percentuale, elenco delle componenti della base, tetto monetario e ulteriori tetti riferiti a importi del richiedente;
- `per_unit`: importo unitario, quantità, eventuali limiti di quantità e tetto monetario;
- `fixed`: importo fisso.

Il server compila questi dati negli operatori già supportati dall'interprete. Per una percentuale costruisce prima la somma delle componenti, poi applica l'aliquota e infine tutti i tetti. Per un forfait limita prima la quantità, poi moltiplica, poi applica l'eventuale tetto monetario. Zero resta zero; un operando assente resta ignoto. Non viene eseguito codice del modello. Nessun nome di bando, regione, aliquota o soglia è codificato nel compilatore.

Gli importi negativi, le percentuali fuori 0–100, i nomi non validi, le liste vuote o duplicate, i campi extra e i formati misti sono respinti. Il provider non supporta `uniqueItems` nella grammatica provata: l'unicità resta verificata localmente da Zod. I riferimenti alle domande e il loro tipo numerico sono verificati dal validatore esistente dopo la compilazione; le citazioni restano obbligatorie e devono riscontrarsi nelle fonti. Non vengono riparati significati, percentuali, citazioni o nomi di campi inventati.

Le configurazioni salvate conservano il formato precedente: solo la risposta intermedia del modello introduce `calculation`, poi rimossa a favore di `formula`. Le formule manuali e i dati esistenti restano leggibili. Il controllo AI riceve adesso la bozza validata e compilata, non la risposta grezza con il piano intermedio. Il sistema rimuove anche l'istruzione contraddittoria che richiedeva una domanda per ogni requisito. Più regole possono usare gli stessi fatti aziendali.

I tre metodi coprono calcoli comuni, non ogni possibile agevolazione. Formule progressive, dipendenze complesse, maggiorazioni e riduzioni non rappresentabili devono restare lacune esplicite. Il compilatore esegue ciò che è stato estratto: NON dimostra che aliquota, base o tetti siano stati interpretati correttamente.

## Prove indipendenti ed esiti reali

I piani preparati manualmente per il confronto danno gli stessi risultati dei riferimenti parziali indipendenti Nuova Impresa (7 casi) e Workplace Lazio (9 casi), inclusi soglie, centesimi, quantità frazionarie e input mancanti. Sono prove del compilatore, NON configurazioni estratte automaticamente e dichiarate corrette. Le ulteriori prove usano aliquote e importi differenti, più tetti, limiti nulli e unità limitate prima della moltiplicazione.

I confronti dal vivo sono conservati in `quantitative-observed.test-support.json` e `calculation-integrated-observed.test-support.json`. Dieci risposte diagnostiche riuscite a livello API consumano complessivamente circa **2.971,85 neuroni**. Comprendono Llama, Qwen3 e gpt-oss-120b sullo stesso account: nessuna modifica di piano, attivazione di servizio a pagamento o invio di dati aziendali. Gli errori preliminari di schema (`uniqueItems` non supportato e un riferimento `$defs` mancante nel formato sperimentale ristretto) hanno impedito l'esecuzione della relativa richiesta e sono stati corretti prima delle risposte riportate. Il consumo riportato deriva dalle risposte con metadati di utilizzo, non certifica l'eventuale consumo degli errori API.

Nessun modello confrontato supera la verifica semantica di questo esperimento. Restano, secondo il tentativo, domande su parametri o totali derivabili, percentuali trattate come euro, operatori non ammessi, input inesistenti, citazioni ricostruite, soglie esclusive anziché inclusive e coperture dichiarate senza regole sufficienti. La risposta gpt-oss nella prova estesa è troncata dal connettore: viene conservata come testo incompleto, non analizzata come JSON integro e non dichiarata valida. Il modello configurato nell'app non è stato sostituito in base a questi tentativi.

La prova reale con il formato integrato produce ora un piano percentuale, ma ricostruisce una citazione non contigua della tabella e non copre correttamente tutti i requisiti: il validatore respinge la risposta. La regressione conserva tale rifiuto e verifica esplicitamente l'assenza della citazione nel testo originale; nessuna sostituzione automatica con una citazione corretta.

Il gateway è provato anche con una risposta sintetica valida: compila il piano, conserva il controllo umano obbligatorio e passa all'audit la formula compilata. La suite locale arriva a 515 test in 35 file; TypeScript e lint mirato superati. La prima build locale ha incontrato file temporanei OCR durante la copia degli asset; la ripetizione completa della build è riuscita senza modificare il codice. I controlli remoti di questo incremento sono separati dalle precedenti verifiche.

**Stato: compilazione aritmetica comune verificata; estrazione semantica automatica NON SUPERATA.** Nessun assessment attivato, nessun deploy di questa versione, nessuna modifica alla produzione. Restano da risolvere l'estrazione affidabile di tutti i fatti e parametri, le relazioni fra componenti e totali, la copertura del bando completo e il collaudo del ciclo generato dopo revisione.
