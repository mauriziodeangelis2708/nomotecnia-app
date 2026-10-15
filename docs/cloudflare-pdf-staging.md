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
