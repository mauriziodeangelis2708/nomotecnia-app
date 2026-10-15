# Collaudo RLS NomotecnIA con account usa-e-getta

## Obiettivo

Verificare sul **progetto Supabase staging gratuito**, senza dati clienti,
l'autorizzazione effettiva per quattro ruoli distinti: admin, socio A,
socio B, outsider senza ruolo.

Lo script \`scripts/provision-and-test-staging-rls.mjs\` crea i quattro account
test mediante l'**API ufficiale Supabase Auth Admin**, conferma le email
senza inviarle, assegna ruoli limitati al solo staging, esegue
\`scripts/verify-staging-rls.mjs\` con accessi autonomi e infine
cancella gli account. Le email \`@example.com\` e i clienti sono fittizi;
le password sono casuali, generate a ogni esecuzione e mai salvate nel
repository o riportate nei log.

Il collaudo si interrompe se l'URL non è **esattamente**
\`https://vknvadzsjuixcuwegxto.supabase.co\`.

## Abilitazione: controlli espliciti, nessuna esecuzione automatica

Da GitHub, nel repository \`mauriziodeangelis2708/nomotecnia-app\`:

1. Aprire **Settings → Environments** e creare \`staging-rls\`.
   Attivare preferibilmente la revisione richiesta per la pubblicazione
   dell'ambiente.
2. Solo nell'environment \`staging-rls\`, aggiungere i secret
   \`STAGING_SUPABASE_PUBLISHABLE_KEY\` e
   \`STAGING_SUPABASE_SECRET_KEY\` del progetto Supabase
   **nomotecnia-staging**. Non inserire mai credenziali della produzione.
   La secret key consente privilegi amministrativi: custodirla
   esclusivamente nelle impostazioni protette GitHub, mai in chat.
3. In **Settings → Secrets and variables → Actions → Variables**,
   impostare \`ENABLE_STAGING_RLS_TESTS=true\`.
4. Eseguire da GitHub Actions, manualmente, il workflow
   **Test staging RLS with disposable Auth users**, selezionando soltanto
   il ramo \`feature/document-intelligence-sandbox-20261015\`.
5. Controllare i risultati dei test; la cancellazione dei quattro
   utenti di prova avviene comunque nel blocco di pulizia anche
   in caso di errore. Se il cleanup fallisce, l'esecuzione segnala
   esplicitamente il problema e occorre rimuovere i soli account
   temporanei dal pannello Auth di Supabase staging.

**Stato:** il workflow è preparato ma NON è stato eseguito.
Non dichiarare superati i controlli multi-account finché un workflow
non termina con successo.

Il token con privilegi amministrativi resta nel solo processo di
preparazione/cleanup: lo script secondario di verifica riceve
esclusivamente la publishable key e le sessioni di login dei test.

Le prove testano creazione di due clienti, autorizzazione per proprietario,
accesso trasversale solo admin, negazione degli accessi all'outsider,
divieto di cambiare \`created_by\`, divieto di spostare il
\`client_id\`, divieto di autoattribuirsi il ruolo admin e
salvataggio/ricarica di un assessment sintetico. Nessun dato
di produzione viene trasferito.
