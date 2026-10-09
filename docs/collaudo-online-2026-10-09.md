# Collaudo online NomotecnIA — 9 ottobre 2026

La PR #1 è stata integrata in main con commit f554ea129d41ac374d73283a5f0fb4a9193975c5. Cloudflare Workers Builds ha concluso con successo la pubblicazione, versione 5b7a050a-4766-419a-88fd-21672ca1915d. L'app online mostra la baseline G12616/18-09-2026 verificata 09-10-2026.

## Dati e verifiche

Operazioni solo sul cliente TEST COLLAUDO 20261009 SRL, P.IVA fittizia 00000000000. Creato TEST C - Collaudo versione corretta, assessment 1e204880-0286-4e77-b62e-931f86521a1a. Nessun dato reale aggiornato o cancellato; nessuna modifica a ruoli, schema o regole database. Le spunte documentali sono esplicitamente annotate come simulazioni, senza documenti reali.

| Prova nell'app online | Risultato osservato |
|---|---|
| Accesso, dashboard e creazione assessment | Funzionanti |
| Vecchio TEST A con risposte incomplete | Nuovi requisiti da verificare, nessun totale favorevole inventato |
| ULA negativa | Salvataggio bloccato con messaggio sul campo |
| Micro autonoma, Workplace 8 postazioni e Commerce IaaS, 36 mesi | 18.163,20 + 4.954,80 = 23.118,00 EUR |
| Polizza e modello 2 solo ricevuti | Progetto da verificare |
| Verifiche simulate di polizza/modello 2 e dati completi | Coerente con i dati dichiarati, nessuna garanzia di concessione |
| VE50 500.000, VF25 100.000, INPS 8, due tipologie, senza premialità | 35 + 8 + 10 = 53 punti |
| Attestazione INPS mancante | Punti sostenuti ridotti a 10, stima separata 53 |
| Commerce semplice SaaS | Incompatibilità rilevata, importo Commerce escluso |
| Workplace 9 postazioni / 8 addetti | Incompatibilità e quantità sopra limite esplicita |
| De minimis pregresso 290.000 EUR | Residuo 10.000, tetto applicato e progetto sotto soglia 14.000 incompatibile |
| Database presente solo su PC, senza server locale proprio | Cloud database incompatibile, nessun importo cloud aggiunto |
| PEC 29/10/2026 17:00:01 +01:00 | Invio fuori finestra incompatibile |
| Preventivo sintetico 10.000 EUR | Spese registrate separate; stima resta 23.118 EUR |
| Storico valutazione | Snapshot persistente con versione e totali |
| JSON | Download riuscito e JSON valido, sezioni client/assessment/result/evidences/rules |
| Report | Totali, punteggio, fonti, checklist ed evidenza coerenti con assessment |
| Salvataggio e ricaricamento | Risposte e checklist persistenti; ripristinato caso coerente |
| Admin regole in sola lettura | 27 regole ufficiali, fonte e baseline; salvataggio baseline disabilitato |

Durante il collaudo corretti il badge dimensione che debordava dalla scheda, la dicitura tecnica confermato nello storico e l'omissione delle note documentali nel report. Non modificato il motore normativo in questo intervento successivo.

## Limiti effettivi

Il comando Stampa / Salva PDF è stato azionato; il browser remoto non ha esposto un file PDF o un'anteprima utilizzabile. La pagina report è verificata, ma paginazione e PDF finale non sono certificati da questa prova. Non effettuati cancellazioni, registrazioni nuovi utenti, cambi ruoli, verifiche multiutente delle RLS installate, invii GeCoWEB/PEC né interrogazioni pubbliche automatiche. L'app resta una pre-istruttoria: solo Lazio Innova determina concessione, punteggio e ammissibilità. Le modifiche del pannello amministrativo non sono state esercitate sul database di produzione.

Le restanti combinazioni del motore (incluse piccole/medie, gruppi, diagnosi/cyber, date e massimali) sono coperte dai 140 test automatizzati con dati sintetici descritti in verifica-bando-2026.md; questo non equivale a provare ogni combinazione nel browser di produzione.
