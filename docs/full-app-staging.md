# NomotecnIA – full-app staging (Supabase Free + Cloudflare)

**Stato: preparato sul ramo GitHub di sviluppo, NON pubblicato.**

## Progetto

- Supabase staging **esistente e gratuito**: `nomotecnia-staging`,
  `https://vknvadzsjuixcuwegxto.supabase.co`.
- Progetto di produzione distinto: `bdwqobvkeposjvuddjav`, vietato nello staging.
- L'app effettiva (TanStack Start) viene compilata con
  `VITE_NOMOTECNIA_STAGING=true`,
  `VITE_ENABLE_DOCUMENT_PDF_LAB=true`,
  `VITE_SUPABASE_URL=https://vknvadzsjuixcuwegxto.supabase.co`.
- Il workflow verificato usa soltanto un **publishable key** del progetto staging,
  mai una credenziale service-role o un token Supabase privilegiato.
- Il file Wrangler viene derivato dal manifest Nitro compilato, verificato
  e rinominato `nomotecnia-full-staging` da
  `scripts/prepare-full-staging.mjs`. Si rifiuta di proseguire se non trova
  la build, se compare la produzione o se compaiono binding Cloudflare inattesi.
- Per tutte le risorse Cloudflare è impostato
  `assets.run_worker_first=true`: è essenziale perché `src/server.ts`
  protegge ogni richiesta con password di staging.
- Il login Google Lovable è nascosto in staging: si usano soltanto account
  Supabase Auth **appositamente creati nel progetto staging** con email e password.
  È nascosto anche l'ingresso al portale clienti perché la relativa migrazione
  non è stata applicata al database staging.

## Deploy: solo dopo predisposizione credenziali e verifica configurazione

Il workflow `.github/workflows/deploy-full-staging.yml` è **manuale** e
non si attiva per commit, push o approvazioni automatiche. Fa deploy soltanto
se è attiva la Repository variable `ENABLE_FULL_STAGING_DEPLOY=true`
e se è in esecuzione sul ramo laboratorio.

1. Creare in GitHub un Environment `full-staging`, con revisione
   preventiva per le azioni di deploy.
2. Inserire nell'Environment i secret:
   `STAGING_SUPABASE_PUBLISHABLE_KEY` (publishable key recuperata
   esclusivamente dal progetto `vknvadzsjuixcuwegxto`),
   `CF_STAGING_ACCOUNT_ID`, `CF_STAGING_API_TOKEN` e
   `FULL_STAGING_PASSWORD` (almeno 18 caratteri).
3. Limitare per quanto consentito il token Cloudflare al Worker
   `nomotecnia-full-staging` e non alle route o al Worker di produzione.
   Verificare manualmente gli scope effettivi.
4. Impostare Repository variable `ENABLE_FULL_STAGING_DEPLOY=true`.
5. Avviare manualmente da GitHub Actions `Deploy full NomotecnIA staging`
   sul ramo dedicato, non sul ramo `main`.
6. Il deploy è **fail closed**: in assenza della password sul Worker
   restituisce 503, senza password corretta risponde 401. Verificare
   200 con credenziali, PDF.js dal dominio staging e nessun endpoint
   Supabase produttivo nelle richieste di rete.
7. Non usare dati reali, nemmeno dopo il deploy: questo è soltanto
   l'ambiente tecnico di test e non include l'intero percorso clienti.

Nessun token o password deve essere comunicato in chat o aggiunto al repository.

## Test RLS live con quattro account autenticati

I controlli anonimi e sulle autorizzazioni delle colonne sono già stati
eseguiti sul database reale di staging, con risultato negativo per accessi
non autorizzati. Per il test live multi-account:

1. Nel pannello **Auth del progetto staging**, creare/confermare quattro
   account temporanei dedicati a collaudo, con password differenti:
   admin, socio A, socio B, outsider.
2. Assegnare il ruolo `admin` o `socio` a ciascuno soltanto dal pannello
   sicuro e soltanto nel database di staging. L'outsider non ha alcun ruolo.
3. Eseguire `scripts/verify-staging-rls.mjs` impostando le variabili
   `STAGING_SUPABASE_URL`,
   `STAGING_SUPABASE_PUBLISHABLE_KEY`,
   `STAGING_TEST_ADMIN_EMAIL` / `_PASSWORD`,
   `STAGING_TEST_MEMBER_A_EMAIL` / `_PASSWORD`,
   `STAGING_TEST_MEMBER_B_EMAIL` / `_PASSWORD`,
   `STAGING_TEST_OUTSIDER_EMAIL` / `_PASSWORD`.
   Il test rifiuta la produzione, non usa `service_role`, crea due
   clienti inventati e una valutazione, verifica isolamento e scritture
   autorizzate, poi prova a cancellare le sole righe di test.
4. Nessun test live viene dichiarato passato finché non sono state realmente
   eseguite tutte le richieste con JWT di test separati.

## Limiti di questa fase

Il test live API Auth/RLS con quattro sessioni è stato eseguito e superato
il 15 ottobre 2026: run 38779433108, tentativo 2. Tutti gli account
sintetici e i relativi dati sono stati rimossi, con conteggi SQL verificati.
Dettagli in docs/staging-rls-automated-test.md. Il test dell'interfaccia
browser completa resta da eseguire.

Il deploy Cloudflare non è ancora avvenuto. Il 15 ottobre è stato avviato
l'accesso sicuro a Cloudflare con Google per preparare il collaudo UI;
la selezione dell'account è stata declinata e il login non è stato completato.
Nessun token Cloudflare creato, nessun Worker pubblicato o modificato. I test PDF e la compilazione GitHub
non sono un sostituto del test browser end-to-end.

Solo dati sintetici; nessuna modifica al progetto Supabase di produzione.
