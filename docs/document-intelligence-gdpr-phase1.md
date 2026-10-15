# NomotecnIA — Piano Document Intelligence con privacy by design

**Stato 15 ottobre 2026: solo laboratorio su esempi sintetici, NON attivo per PDF dei clienti.**
Questa prima fase non introduce un servizio AI, non riceve upload, non scrive documenti in Supabase/Cloudflare e non precompila automaticamente gli assessment salvati. È una prova del mapping testo → campi, con provenienza della riga. Limitata alla UI amministratori.

## Stato della fase 1

- Nel tab **Documenti** gli amministratori possono provare tre facsimili **inventati**: visura, dichiarazione IVA 2026 anno 2025 e attestazione INPS luglio 2026.
- Il parser analizza solo testo digitato nel browser: nessuna lettura binaria PDF, OCR, modello di AI o API esterna.
- Il motore di calcolo, checklist, ruoli e database esistenti non sono modificati.
- La preview non scrive negli assessment né marca un documento come “verificato”.
- Il matching è dimostrativo e intenzionalmente ristretto: righe duplicate, intestazioni o periodi incompatibili non producono valori utilizzabili.
- **Non inserire documenti o dati reali nel laboratorio.**

## Architettura per le fasi successive (DA APPROVARE, non implementata)

1. **Accesso:** solo utenti autenticati e autorizzati sulla singola pratica; per i clienti, permessi limitati esclusivamente alle proprie pratiche.
2. **Upload protetto:** bucket privato con RLS/policy specifiche, cifratura in transito e a riposo, verifica estensione e magic bytes, limiti dimensione/pagine, scansione malware, URL firmati temporanei. Nessun bucket pubblico.
3. **Estrazione:** valutare prima estrazione PDF testuale nel browser o su servizio privato, poi OCR per scansioni. **Non** inviare originali a fornitori AI prima di contratti, controlli sui trasferimenti internazionali e configurazioni privacy.
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
- [ ] Test con PDF sintetici superati; nessun dato di clienti usato nei test.
- [ ] Riesame aggiornamenti dell'Avviso e del questionario, senza cambiare silenziosamente il motore.
- [ ] Piano gestione violazioni ed eliminazione documenti testato.
- [ ] Rilascio approvato dal responsabile del progetto e dal referente privacy.

## Riferimenti

Regolamento (UE) 2016/679: artt. 5, 6, 13–14, 24–25, 28, 30, 32–35, 44 e seguenti.
Questo piano è una checklist tecnica/organizzativa, non un parere legale e non un'attestazione di conformità GDPR.
