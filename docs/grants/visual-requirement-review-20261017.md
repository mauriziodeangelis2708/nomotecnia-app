# Revisione visuale dei requisiti — 17 ottobre 2026

Il laboratorio amministratore include “Costruisci domande dai requisiti verificati”. Con PDF già caricati, il revisore seleziona una sezione, aggiunge una domanda completa, sceglie ammissibilità/esclusione/documento e la risposta attesa, quindi seleziona uno o più passaggi originali. Non occorre scrivere JSON per queste dichiarazioni.

L'applicazione usa lo stesso compilatore della specifica strutturata. Mantiene identità/versione e fonti, azzera la revisione precedente e sostituisce esplicitamente l'anteprima; non fonde automaticamente regole esistenti. La sezione non cambia mentre contiene requisiti, evitando che identificativi locali siano ricollegati a testo diverso. Le versioni pubblicate sono bloccate. La configurazione conserva sempre l'avviso di parzialità e non è attivabile come bando completo.

Questo incremento riguarda dichiarazioni qualitative verificate da una persona. Calcoli, quote e soglie restano disponibili mediante importazione strutturata. Non introduce estrazione semantica automatica affidabile, verifica documentale o una nuova distribuzione dell'applicazione pubblicata.

Verifica locale: 556 test in 40 file, TypeScript, lint mirato e build. Il collaudo autenticato include compilazione visuale con dati sintetici, mantenimento delle citazioni e blocco di attivazione, seguito dal flusso di importazione/salvataggio e pulizia esistente.
