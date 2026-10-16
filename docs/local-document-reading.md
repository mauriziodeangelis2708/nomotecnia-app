# Lettura PDF locale nella pratica — 16 ottobre 2026

La scheda **Documenti** degli assessment Lazio offre agli amministratori la funzione
**Leggi PDF e compila la pratica**. Per i soci senza ruolo amministratore e nel portale
clienti non viene abilitata in questa prima versione.

## Funzionamento
- Selezione di un singolo PDF testuale: visura, IVA 2026 (periodo 2025), attestazione INPS luglio 2026.
- Lettura con PDF.js e worker distribuiti dall'app sul dispositivo dell'operatore.
- Nessun originale, nome file, testo completo o frammento di provenienza viene aggiunto
  al database, ai log applicativi o a servizi AI. Il nome è mostrato solo nella sessione.
- Solo i valori selezionati e confermati entrano nelle risposte della bozza. Il salvataggio
  segue il comando Salva e le autorizzazioni della pratica già esistenti.
- Campi già compilati protetti, periodo e P.IVA discordanti bloccati, appartenenza da
  confermare manualmente quando non determinabile. Nessuna checklist diventa verificata.
- Nessun dato sintetico precaricato nella modalità operativa.
- Rimozione esplicita, cambio documento e smontaggio della scheda invalidano letture pendenti;
  il componente è distinto per ID della pratica.

## Limiti
8 MB, 45 pagine, 240.000 caratteri. Non gestisce scansioni/OCR o PDF protetti.
Il riconoscimento è conservativo: un layout non riconosciuto rimane da compilare manualmente.
Non verifica l'autenticità né sostituisce il controllo sull'originale.
Non è un archivio documentale: conservare gli originali con la procedura aziendale vigente.

## Ambito privacy e test
Il piano storico document-intelligence-gdpr-phase1.md descrive anche fasi future di upload,
storage e servizi esterni: queste fasi non sono attivate da questa versione.
Restano applicabili gli accordi e le procedure del progetto per le risposte salvate;
la funzionalità locale non costituisce un'attestazione di conformità.
I test usano esclusivamente documenti e utenti sintetici nel database staging, mai dati reali.
La modalità laboratorio resta disponibile solo dove il flag VITE_ENABLE_DOCUMENT_PDF_LAB=true
è esplicitamente configurato. I test operativi usano il flag false e il medesimo flusso della produzione.
