# Area clienti e assessment ricevuti

Due ingressi: soci autorizzati e clienti con email confermata. I clienti possono salvare, modificare ed eliminare le proprie bozze. L'invio è atomico e idempotente: crea cliente e assessment interno, congela la copia originale e rende la pratica disponibile ai soci. Dopo l'invio il cliente vede soltanto stato e richiesta di correzione. Nessuna notifica email viene inviata per l'assessment.

Le autorizzazioni sono applicate nel database, non soltanto nascondendo pulsanti. Nessun ruolo socio è attribuito con la registrazione clienti. Il metadata access_requested serve esclusivamente a mostrare l'attesa ai nuovi richiedenti soci. La conferma email usa il callback /dashboard già autorizzato: i clienti senza ruolo sono reindirizzati a /portal.

Validazione: build e TypeScript riusciti; 172 test automatici superati, inclusi salvataggio/invio, errore di salvataggio, schermata post-invio, campi Iper e ripristino sessione. Test SQL su produzione in transazione con rollback: isolamento tra clienti, email non confermata bloccata, dati interni invisibili, duplicazione invio evitata, modifica interna/nota/documento/snapshot consentiti ai soci, originale conservato, eliminazione propria bozza. Nessun dato di prova resta dopo il rollback.

Gli advisory Supabase rilevano ancora avvisi preesistenti sulle funzioni SECURITY DEFINER pubbliche di controllo accesso e sulla protezione password compromesse disattivata. Il nuovo gateway customer_submission_action è SECURITY INVOKER, non eseguibile anonimamente; implementazione privata con controlli espliciti. L'area clienti non modifica la configurazione SMTP.

Il test dell'intero flusso email/OAuth con un account reale e il controllo visuale su telefono fisico richiedono una sessione utente; non sono coperti dai test automatici.
