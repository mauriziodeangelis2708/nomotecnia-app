# Requisiti verificati → assessment compilato

## Soluzione realizzata nella bozza

Il percorso affidabile separa l'interpretazione del bando dalla costruzione dell'assessment. Una specifica di dati descrive fatti del richiedente, conferme di requisiti, minimi, quote, limiti e contributi. Il compilatore costruisce domande e regole; non chiede al modello di scrivere operatori, condizioni di attivazione o formule arbitrarie. Non ci sono rami per nomi di bando o regioni.

Nel laboratorio amministrativo, dentro **Importa o correggi una configurazione strutturata**, è disponibile **Esporta fonti per la revisione dei requisiti**. Dopo avere caricato i PDF, l'esportazione locale produce testo, documento/pagina, impronte dei file e identificativi per sezione. Non invia il testo a un modello e non attiva servizi. Il pacchetto contiene il contratto di importazione e può essere usato da un revisore o da un assistente, mantenendo obbligatorio il confronto con le fonti.

La specifica revisionata si importa nello stesso editor. L'app controlla impronte e ordine dei PDF, sezione analizzata, riferimenti sorgente, tipi e relazioni prima di costruire l'anteprima. Un pacchetto di sola esportazione non viene confuso con una specifica pronta da compilare. Una fonte diversa o un riferimento inesistente impedisce l'importazione. Le configurazioni ordinarie già salvate restano compatibili.

Il percorso è intenzionalmente riservato alla configurazione amministrativa: il protocollo strutturato non viene presentato come compilazione automatica già risolta dei PDF. Non è ancora una maschera guidata per modificare ogni singolo requisito e non è stato collegato al pulsante AI come sostituzione automatica del modello corrente.

## Contratto e controlli

La specifica contiene:

- `inputs`: importi EUR o quantità intere variabili, mai aliquote e massimali fissati dal bando;
- `declarations`: conferme booleane di criteri completi e verifiche documentali, con condizioni, alternative e deroghe nel testo da verificare; non è lettura automatica dei documenti;
- `minimums`: soglia inclusiva sulla somma di componenti della stessa unità;
- `shares`: quota minima rispetto a un totale che include la componente;
- `fieldLimits`: limite di un dato del richiedente rispetto a un altro dato della stessa unità;
- `awardCaps`: tetto al contributo, espresso da un importo del richiedente, distinto dal vincolo fra due input;
- `awards`: piani percentuali, per unità o fissi già supportati dal compilatore;
- `unresolved`: tutti i punti non verificati o non esprimibili.

Identificativi duplicati, riferimenti a variabili inesistenti o dichiarazioni usate come importi, unità incompatibili, somme duplicate, quote prive della componente, contributi usati impropriamente come input e dati aggiuntivi non previsti sono respinti. Le relazioni sono compilate come dichiarate; non vengono riparate dal modello o dal programma. Un limite fra due input non viene reinterpretato automaticamente come tetto al contributo. Valori, unità e significato normativo richiedono comunque revisione della fonte: i controlli strutturali non certificano la verità dei parametri.

Le conferme qualitative hanno due significati espliciti: per eligibility/document la risposta deve coincidere con `expected`; per exclusion la coincidenza esclude. Non eseguono codice o confronti nascosti con dati del cliente. Tutti i criteri restano collegati al testo sorgente.

Ogni compilazione conserva un avviso di specifica parziale. Gli importi sono già verificati ammissibili, al netto IVA e dopo eventuali riduzioni: il compilatore non sceglie autonomamente come ridurre costi eccedenti. Copertura completa, beneficiari, date, documenti, de minimis, punteggi, combinazioni o regole non rappresentabili richiedono un completamento separato. Importare una specifica azzera la revisione precedente e non attiva il bando. L'identità/versione di una bozza già salvata restano protette dal controllo esistente.

## Prove e limiti dell'AI

Le specifiche preparate e verificate indipendentemente coincidono con i sette casi numerici parziali Nuova Impresa e i nove casi Workplace, senza modificare i risultati attesi. Sono dati revisionati manualmente per collaudare il compilatore, NON risposte AI dichiarate corrette. Un ulteriore caso verifica esplicitamente la quota insufficiente e il tetto separato dalla base; l'importazione aggiunge prove su conferme qualitative, esclusioni, fonti differenti e assenza di mutazioni dei dati originali.

`numeric-specification-observed.test-support.json` conserva tre prove aggiuntive sul medesimo estratto pubblico con l'interfaccia Responses di gpt-oss-120b:

1. Ragionamento high, limite 6.500 token: risposta incompleta, nessun testo finale. Nessuna configurazione ottenuta o accettata.
2. Specifica numerica più breve: distingue correttamente due componenti e la somma minima, ma usa un contributo come input in una relazione non consentita dal contratto. Non viene convertita a posteriori in una risposta valida.
3. Contratto con tetti al contributo espliciti: reintroduce un totale indipendente e una quota che non include la componente, oltre al riferimento improprio al contributo. Il compilatore respinge la specifica.

Consumo riportato complessivo di queste tre prove: circa **999,76 neuroni**. Nessuna di esse supera l'intero contratto. Il modello dell'app rimane invariato e non viene attivato alcun servizio a pagamento. Queste prove non sono un test autenticato end-to-end di una generazione reale completa.

La suite locale complessiva raggiunge **553 test in 39 file**, con TypeScript, lint mirato e build superati. Il collaudo autenticato dello staging verifica anche esportazione locale, importazione della specifica sintetica, rifiuto di impronte diverse, anteprima bloccata, salvataggio e conflitti. Il relativo esito remoto è riportato nella PR; non va dedotto dai soli test locali.

Il problema dell'estrazione automatica universale non è dichiarato risolto. È stata implementata una via di compilazione controllata da requisiti verificati, che evita di introdurre codice dedicato per ogni nuovo bando. Restano da completare estrazione semantica affidabile, copertura delle fonti intere e un'interfaccia di revisione più semplice del protocollo strutturato. Nessun deploy o modifica alla produzione.
