# NomotecnIA – collaudo PDF isolato su Cloudflare Workers

## Scopo e limiti

Questo è un **laboratorio temporaneo, soltanto con dati sintetici**, che importa i
componenti e il motore documentale del ramo GitHub di sviluppo, senza collegare
Supabase e senza introdurre alcun percorso di scrittura verso l'app operativa.
Non sostituisce il collaudo dell'intero wizard, delle policy RLS e del salvataggio
di una pratica sul backend di staging.

Il Worker è **nomotecnia-pdf-staging**, distinto dal Worker operativo
**nomotecnia-app**. La configurazione è in `wrangler.pdf-staging.jsonc`; mai
usare la configurazione `wrangler.jsonc` per questo rilascio.

## Sicurezza

- I file PDF sono letti solo nel browser. **Non** vengono caricati su Cloudflare,
  Supabase o verso servizi AI. La lettura dei PDF scansionati richiede OCR
  non implementato.
- Si devono usare **soltanto** i sette documenti fittizi predisposti per i test.
- L'unico salvataggio della bozza è `localStorage` sul browser dell'operatore;
  il Worker non riceve, conserva o elabora dati di assessment.
- Nessun binding o variabile Supabase è presente nella configurazione del
  Worker di staging.
- Il Worker risponde con HTTP 503 **se manca** `STAGING_ACCESS_PASSWORD`
  o se ha meno di 18 caratteri; HTTP 401 senza password corretta.
- Il controllo HTTP Basic è un presidio provvisorio **solo per facsimili**,
  da sostituire/affiancare a Cloudflare Access per un vero staging privato.
  Non usare questo Worker per dati reali dei clienti.

## Preparazione e verifica

Nel ramo `feature/document-intelligence-sandbox-20261015`:

1. Eseguire `bun install --frozen-lockfile`.
2. Eseguire `bun run typecheck:pdf-staging`.
3. Eseguire `bun run build:pdf-staging`. Il risultato sarà in
   `dist/pdf-staging`.
4. Controllare che il contenuto della directory compilata **non** includa
   URL, chiavi o stringhe identificative del database Supabase di produzione.
5. Prima del primo deploy impostare in Cloudflare Workers, **solo sul Worker
   nomotecnia-pdf-staging**, il secret `STAGING_ACCESS_PASSWORD` con un valore
   casuale lungo almeno 18 caratteri; **mai** in GitHub o in chat.
6. Quando Cloudflare è collegato con un account autorizzato, effettuare il
   deploy esclusivamente con
   `bunx wrangler@4 deploy --config wrangler.pdf-staging.jsonc`.
   Non eseguire deploy con il file Wrangler di produzione.
7. Verificare risposta HTTP 401 senza credenziali, 200 con credenziali,
   PDF worker caricato dal dominio staging e nessuna richiesta a Supabase.
8. Usare i 7 PDF sintetici per collaudare in Chrome e in mobile il caricamento,
   la selezione, l'importazione in campi vuoti, il salvataggio locale,
   la ricarica e la cancellazione. Verificare i casi di rifiuto.

## Passaggio successivo: staging completo NomotecnIA

Per testare la **vera** applicazione con backend, creare un progetto/branch
Supabase indipendente, senza dati copiati dalla produzione, dopo verifica del
costo e autorizzazione dell'organizzazione corretta. Occorrono account di prova,
RLS, regole separate e test su create/save/reload delle pratiche. Nessun token
o URL di produzione può essere usato come fallback.

**Stato iniziale:** codice e controllo CI preparati sul ramo di sviluppo.
Non indicare il Worker come online finché una pubblicazione effettiva e test HTTP
non sono documentati.

## Deploy da GitHub senza esporre credenziali

Il workflow GitHub `.github/workflows/deploy-pdf-staging.yml` è **opt-in**.
Quando il repository non contiene la variabile `ENABLE_PDF_STAGING_DEPLOY=true`,
il deploy è disabilitato e **non può modificare Cloudflare**. Il workflow usa
esclusivamente il ramo `feature/document-intelligence-sandbox-20261015`
e il file `wrangler.pdf-staging.jsonc`.

Per un deploy autorizzato:
- Creare in GitHub Actions un Environment denominato `pdf-staging`,
  preferibilmente con revisione richiesta prima del deployment.
- Impostare **solo in quell'Environment** i secret
  `CF_STAGING_ACCOUNT_ID`, `CF_STAGING_API_TOKEN` e
  `PDF_STAGING_PASSWORD` (minimo 18 caratteri).
- Usare un API token Cloudflare limitato all'account corretto e alle
  autorizzazioni minime per creare/gestire **nomotecnia-pdf-staging**.
  Dopo la prima creazione restringere ulteriormente lo scope al singolo Worker,
  se supportato, per evitare modifiche al Worker operativo.
- Impostare **in Repository variables** `ENABLE_PDF_STAGING_DEPLOY=true`.
  Un successivo commit sul ramo laboratorio attiverà il workflow; eventuali
  approvazioni dell'Environment saranno comunque rispettate.
- Il primo deploy carica una versione che risponde **503** finché il secret
  non esiste. La fase successiva imposta il password secret su Cloudflare
  e il Worker risponderà 401 senza autenticazione.
- Prima di distribuire i PDF di prova verificare che non ci siano binding
  Supabase, KV, D1, R2 o route del Worker di produzione nella nuova configurazione.

**Non** trasferire Cloudflare API token e password nella conversazione o
in un file del repository. Inserirli nei Secret di GitHub.

Fonti ufficiali:
https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
https://developers.cloudflare.com/workers/authorization/workers/
