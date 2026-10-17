# Citazioni del server e controllo del comportamento effettivo

## Modifiche comuni

Inventario, generazione di domande/regole e audit usano ora identificativi di passaggi creati dal server. Il modello seleziona `spanId`; non può fornire una citazione sostitutiva, né documento/pagina arbitrari. Il server risolve gli identificativi nello stesso contesto della richiesta e verifica nuovamente le citazioni. Gli identificativi inesistenti, i campi aggiuntivi, i contesti incompatibili, le duplicazioni e le risposte oltre i limiti sono respinti. I dati salvati restano nel formato precedente, con documento, pagina e testo originali.

Lo schema della generazione limita anche gli identificativi della copertura ai requisiti effettivamente estratti; se l'inventario è vuoto la copertura deve essere vuota. La mancata copertura conserva comunque una lacuna: l'enumerazione non dimostra che una regola implementi davvero il requisito. Gli schemi sono costruiti per richiesta e non modificano uno stato condiviso fra fonti diverse.

L'audit non riceve più le conclusioni o gli avvisi del generatore, le etichette delle regole o copie ripetute delle citazioni. Riceve l'elenco delle domande, le condizioni e le formule compilate, più esecuzioni diagnostiche sintetiche del motore. `evaluateRule` è condivisa con l'assessment: non è stata introdotta una seconda interpretazione delle regole per l'audit. Visibilità, tipi, intervalli, quantità intere, dati ignoti, arrotondamento e massimali usano gli stessi percorsi dell'esecuzione normale.

I campioni usano fino a sei valori numerici comuni, con alcuni valori vicino alle soglie scalari. Non costituiscono casi normativi indipendenti, non includono esiti attesi, non provano completezza e non sono dati cliente. Il numero di campioni omessi è esplicito. Un controllo operativo oltre 45.000 caratteri fallisce senza troncare domande, regole o fonti. Le descrizioni delle domande restano ipotesi da confrontare con il testo originale.

È stata corretta anche l'indicazione obsoleta nell'interfaccia: il limite complessivo era già 600.000 caratteri nel server, mentre la schermata riportava ancora 24.000. Nessun aumento dei limiti lato server.

## Confronto reale sul medesimo estratto

`all-spans-observed.test-support.json` conserva richiesta e risposta di quattro chiamate diagnostiche sul testo pubblico B.1 di Nuova Impresa, con consumo dichiarato complessivo di circa **1.127,94 neuroni**. Non è il collaudo autenticato di una generazione completa, né la verifica di tutti i documenti o del limite temporale end-to-end.

1. La generazione con identificativi produce citazioni risolvibili e una configurazione formalmente valida. Restano quattro lacune di copertura e un errore sostanziale: la regola delle spese correnti esclude ogni importo positivo. Il caso indipendente con 1.500 euro capitale e 1.500 corrente risulta erroneamente escluso, mentre il riferimento parziale resta incompleto per gli altri requisiti e calcola 1.500 euro.
2. Il controllo sulla bozza descrittiva ripete quattro lacune già dichiarate e descrive in modo impreciso alcune regole. Non certifica il comportamento.
3. Il controllo sulla vista eseguibile individua la mancata ammissibilità della parte corrente fino alla quota prevista e un problema nella composizione del budget. L'input scende da 8.332 a 2.420 token in questa singola prova. Un ulteriore rilievo sull'investimento minimo è generico e non dimostra da solo un errore: anche il revisore AI produce ipotesi da verificare, non conclusioni autorevoli.
4. Un esperimento separato di revisione assistita non risolve la bozza: aggiunge un confronto numerico su una domanda booleana. Il validatore lo respinge. Questa correzione automatica NON è stata integrata nel gateway e non viene presentata come soluzione riuscita.

Le regressioni preservano sia il rifiuto della revisione sia la differenza semantica della prima bozza rispetto al riferimento indipendente. Un testo citato fedelmente non rende vera una regola. Il miglioramento dell'audit non sostituisce la validazione dei requisiti, dei parametri e delle relazioni prima dell'uso operativo.

## Stato

Nessun modello sostituito, nessun piano a pagamento attivato, nessun dato aziendale inviato. Il gateway resta amministrativo, disattivato nell'app pubblicata e protetto dal controllo umano obbligatorio. Nessun deploy di queste modifiche e nessuna modifica alla produzione. La parte di estrazione semantica non è dichiarata risolta.
