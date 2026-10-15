# NomotecnIA — Piano Document Intelligence con privacy by design

**Stato tecnico 15 ottobre 2026: laboratorio PDF LOCALE, disabilitato di default e NON rilasciato ai clienti.**

- La demo predefinita usa soltanto dati fittizi: visura, IVA 2026 per il 2025 e attestazione INPS luglio 2026.
- La lettura PDF, tramite libreria pdfjs-dist 6.4.299 e worker locale, richiede un flag esplicito VITE_ENABLE_DOCUMENT_PDF_LAB=true in un ambiente di test. L'app online resta invariata.
- Nessun upload PDF a server, nessuna AI esterna, nessun OCR e nessun salvataggio dell'originale. I dati testuali rimangono transitori nel browser.
- Il parser impone 8 MB, 45 pagine e 240.000 caratteri; i PDF immagine e protetti da password non sono gestiti.
- Il laboratorio propone soltanto campi con etichette specifiche e senza duplicati, mostrando pagina/riga e frammento di origine.
- Conferma umana esplicita e campi non sovrascritti: i dati accettati entrano solo nella bozza; documenti e importi non vengono automaticamente dichiarati verificati.
- Non caricare documenti reali dei clienti nel laboratorio. Manca ancora il collaudo end-to-end con browser, PDF di prova e tablet.

## Architettura per le fasi successive (DA APPROVARE: storage, OCR e AI non implementati)

1. **Accesso:** solo utenti autenticati e autorizzati sulla singola pratica; per i clienti, permessi limitati esclusivamente alle proprie pratiche.
2. **Upload protetto:** bucket privato con RLS/policy specifiche, cifratura in transito e a riposo, verifica estensione e magic bytes, limiti dimensione/pagine, scansione malware, URL firmati temporanei. Nessun bucket pubblico.
3. **Estrazione:** il parser locale testuale è presente sul ramo di laboratorio; restano OCR per scansioni, test browser, documenti a colonne e qualunque servizio AI esterno. **Non** inviare originali a fornitori AI prima di contratti, controlli sui trasferimenti internazionali e configurazioni privacy.
4. **Selezione minima:** identificare prima i dati strettamente necessari (es. VE50/VF25, Forza Aziendale, partita IVA, dati PMI). Evitare di conservare o riprodurre informazioni personali non necessarie.
5. **Proposte, non verità:** origine con documento, numero pagina/riga e valore; stima di attendibilità solo se validata. Valori discordanti/bloccati e documenti incompleti vanno verificati da un operatore.
6. **Conferma manuale:** non sovrascrivere dati già presenti, non attestare automaticamente l'autenticità di documenti, non assegnare “documento verificato”, non salvare esiti senza conferma esplicita dell'operatore.
7. **Retention e cancellazione:** tempi definiti per originali temporanei, esiti estratti, revisioni e backup; cancellazione e verifiche; conservazioni obbligatorie della pratica trattate separatamente.
8. **Audit e incidenti:** registro accessi/caricamenti/verifiche con minimi metadati e senza contenuti PDF; gestione data breach, alert su accessi anomali, testing delle policy RLS anche con utenze esterne.
9. **Modelli esterni:** contratto che escluda uso per training se questo è requisito commerciale; sub-responsabili, region, logging, support access, retention e data residency verificati su accordi realmente sottoscritti, non su dichiarazioni promozionali.
10. **Test e rollout:** test con PDF fittizi di vari formati, scansionati, malformati, cifrati e falsificati; test cross-tenant e cancellazione; revisione umana e legale prima della produzione.

## Verifiche GDPR e contrattuali da chiudere

- Mappare finalità, categorie di interessati e dati, ruoli **effettivi** del cliente, NomotecnIA e dei fornitori per ciascuna finalità (possibile NomotecnIA titolare per rapporti commerciali, responsabile ex art. 28 per il trattamento su istruzione del cliente).
- Documentare idonea base giuridica del titolare, informative applicabili (artt. 13/14), necessità/proporzionalità, registri dei trattamenti se richiesti.
- DPA art. 28 e sub-responsabili: istruzioni, sicurezza, restituzione/cancellazione, audit, assistenza, obblighi del fornitore.
- Valutazione dei rischi art. 32 e screening motivato sulla necessità di una **DPIA** ex art. 35; DPIA obbligatoria in presenza delle condizioni previste, non in automatico per qualunque OCR.
- Accertare eventuali trasferimenti/accessi extra SEE e garanzie del Capo V. La sola sede di un server in UE non risolve tutti i trasferimenti.
- Verificare protezioni Supabase già note come advisory: funzione di autorizzazione SECURITY DEFINER e blocco password compromesse, oltre a policy sulle future risorse Storage.
- Definire procedure per esercizio dei diritti, richieste di cancellazione, accesso e data breach, e approvazione formale per trattare documenti veri.

## Criteri di rilascio (tutti obbligatori prima di abilitare i PDF reali)

- [ ] Accordi/privacy e ruoli documentati e verificati.
- [ ] Fornitore OCR/AI scelto e valutato contrattualmente, oppure solo trattamento locale/privato senza invio a terzi.
- [ ] Threat modeling, policy RLS e test d'isolamento tra clienti superati.
- [ ] Upload privato, scansione file, limiti e retention implementati.
- [ ] Provenienza pagina/campo, gestione duplicati e dati contraddittori verificata.
- [ ] Revisione e conferma umana prima del salvataggio implementate.
- [ ] Test con PDF fittizi, scannerizzati, a colonne, danneggiati, protetti da password, mobile e browser superati. Nessun dato cliente nei test.
- [ ] Riesame aggiornamenti dell'Avviso e del questionario, senza cambiare silenziosamente il motore.
- [ ] Piano gestione violazioni ed eliminazione documenti testato.
- [ ] Rilascio approvato dal responsabile del progetto e dal referente privacy.

## Riferimenti

Regolamento (UE) 2016/679: artt. 5, 6, 13–14, 24–25, 28, 30, 32–35, 44 e seguenti.
Questo piano è una checklist tecnica/organizzativa, non un parere legale e non un'attestazione di conformità GDPR.

## Audit read-only del database del 15 ottobre 2026

- Supabase nomotecnia-production risulta nella regione eu-west-1. Questo non certifica residenza e accessi di tutti i fornitori.
- Nessun bucket presente in storage.buckets al controllo: nessun archivio documentale aggiunto.
- Advisor: cinque funzioni SECURITY DEFINER pubbliche (can_access_assessment, can_access_client, has_role, is_member e rls_auto_enable) concedono EXECUTE tramite PUBLIC, quindi anche a client anonimi. Non dimostra di per sé exploit; occorrono revisione del codice e test prima di restringere i privilegi.
- Advisor: protezione contro password compromesse disabilitata; verificare configurazione auth ed effetti di eventuali modifiche.
- Policy su clienti, assessment e invii presenti per authenticated; l'isolamento cross-tenant richiede comunque test di regressione prima di aggiungere dati PDF.
- Nessun intervento eseguito sul database di produzione.
- Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Stato collaudo / rilascio

- La PR #7 resta draft, su ramo separato, senza merge e deploy.
- GitHub Actions esegue TypeScript, test unitari e build; serve ancora testare in browser e con PDF campione reali ma fittizi.
- Il file bun.lock è riallineato sul ramo di sviluppo dopo esito positivo dei controlli; verificare installazione congelata prima del merge.
- Il parsing locale evita la trasmissione di PDF a nuovi provider ma non elimina gli obblighi GDPR riferiti ai dati estratti, salvati e accessibili attraverso l'app.
- Prima della produzione serve approvazione del referente privacy e verifica dei contratti e delle misure tecniche applicabili.
