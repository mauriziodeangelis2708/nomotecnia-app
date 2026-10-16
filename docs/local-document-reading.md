# Documenti della pratica: lettura locale, OCR e archivio privato

## Lettura e controllo
Gli amministratori possono leggere visura, IVA 2026 per il 2025 e attestazione INPS luglio 2026 nella scheda Documenti dell’assessment Lazio. Gli altri PDF (bilanci, DURC, certificazioni, allegati) possono essere letti come testo di supporto, ma non hanno una mappatura automatica dei campi.

L’OCR in italiano è facoltativo e viene eseguito sul dispositivo con Tesseract.js 7.0.0, risorse e modello serviti dalla stessa origine dell’app. Nessun servizio OCR/AI esterno, nessun invio di pagine o testo. L’OCR interviene sulle pagine con meno di 80 caratteri estraibili, massimo 8 pagine OCR per documento; le letture poco leggibili vengono rifiutate. Non è un controllo di autenticità. Verificare sempre il risultato sull’originale.

Limiti PDF: 8 MB, 45 pagine, 240.000 caratteri. PDF cifrati non supportati. Il pulsante Rimuovi invalida la lettura in corso. Nessun campo valorizzato viene sovrascritto; restano i controlli di impresa e periodo, la conferma umana e il salvataggio esplicito della bozza. La checklist non diventa verificata.

## Archivio originale
L’archivio è un’operazione distinta e richiede conferma esplicita. I soci autorizzati sulla pratica possono archiviare originali PDF di massimo 8 MB nel bucket privato assessment-documents. La lettura locale non carica né archivia il documento. Per le pratiche nuove occorre salvare prima la pratica.

Gli oggetti sono suddivisi per ID della pratica, con un identificativo casuale per evitare sovrascritture. Il nome file viene normalizzato. Le policy Storage applicano le autorizzazioni già esistenti sull’assessment e richiedono un ruolo interno: altri soci, esterni e accessi anonimi non possono leggere, caricare o rimuovere documenti altrui. Nessun URL pubblico o URL firmato condivisibile viene creato dall’app. I download dell’app usano una richiesta senza cache con nonce univoco e il JWT dell’utente e vengono proposti come allegati, senza visualizzazione attiva nell’app.

Gli originali restano fino a cancellazione esplicita. La cancellazione non revoca copie già scaricate; eventuali copie nelle cache del fornitore seguono i suoi tempi di propagazione. Prima di eliminare la pratica o il cliente devono essere rimossi gli originali associati: un trigger impedisce di lasciare file scollegati. La policy di caricamento blocca la riga assessment durante l’inserimento per coordinarsi con la cancellazione. L’app non dichiara i file sicuri e non dispone di scansione antivirus automatica. Per conservazioni e backup del fornitore si applicano i contratti e le procedure del progetto: non viene promessa cancellazione immediata da ogni backup.

## Costi e collaudo
Nessun servizio a pagamento viene attivato. Non viene modificato il piano Supabase/Cloudflare. In caso di limiti o spazio esaurito il caricamento deve fallire senza upgrade automatici. I test usano soltanto originali inventati e quattro identità temporanee in staging. Comprendono OCR reale su PDF raster, annullamento, importazione controllata, archivio/download/eliminazione, isolamento e URL pubblici negati. Le migrazioni sono additive e non modificano dati o risposte delle pratiche esistenti.
