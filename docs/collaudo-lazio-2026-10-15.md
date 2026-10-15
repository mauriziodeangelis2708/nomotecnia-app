# Correzioni documentali Lazio — 15 ottobre 2026

Base: main 524f9b50499f02a5ee528833266b2f1e83c86cdd. Nessuna migrazione né modifica ai dati reali.

Fonti fornite: Avviso Voucher Digitalizzazione PMI 2026; Allegato 2 Modulistica; determina; guida GeCoWEB/rendicontazione; griglia punteggi 7 settembre 2026; Modello 1 Diagnosi; Modello 2 Relazione. Rimangono necessarie verifiche documentali professionali: le risposte descrittive non vengono certificate automaticamente.

| Area | Correzione e controllo |
| --- | --- |
| PMI | Operazioni straordinarie ignote impediscono conferma; partecipazioni pubbliche rilevanti, eccezioni e verifica documentale; perimetro e aggregazioni |
| Giovani | Punti sostenuti subordinati a visura, assetto descritto e checklist verificata |
| Cronologia | Ammessa conclusione prima della concessione se altri termini rispettati; avvio non può essere dopo conclusione |
| Ex post | Richiesta verifica del modello e delle firme; M1 ex ante per piccole/medie |
| Commerce | Sostituzione di soluzione non più vecchia di tre anni esclusa; date ignote da verificare |
| Saldo | DURC distinto dalla domanda, compensazione da verificare; limite importo concesso; cartelle, CUP, IBAN, PEC, trasparenza, variazioni |
| GeCoWEB | Intervalli, numeri non validi, somme, dimensione, importi base senza doppio 20%, bollo |
| Modelli | Campi per metodo, maturità, obiettivi, capacità, impatti, piano, esperti, fornitori, inventario/componenti per linea e confronto ex post |
| Report | Distinte compatibilità preliminare, completezza domanda, Atto, preparazione saldo; elenco delle mancanze e discrepanze nelle fonti |

## Ambiguità non risolte inventando regole

- Atto micro: Avviso 15 giorni contro modulistica 10. Avviso nel report e controllo prudente a 10, da verificare sulla PEC/Atto.
- IVA mancante: annullamento punti contro esclusione nella guida; domanda non pronta.
- Zero dipendenti: dichiarazione alternativa censita, trattamento punteggio da chiarire.
- OSS/editoria mancanti: stima prudenziale, esito da verificare.
- SRG 880088:24: nessun bonus automatico in assenza di chiarimento.
- Refusi GeCoWEB su numerazione, VF25, forfettari; refusi Word su upgrade/D.2; SEE/UE segnalati.

## Verifiche

- Suite Vitest: 222 test, incluse regressioni degli altri assessment e report.
- TypeScript: nessun errore.
- ESLint sui file modificati: nessun errore.
- Build produzione Vite/Nitro riuscita.
- Simulazioni solo locali: fascicolo completo, incompleto, requisito negativo/ignoto, soglia minima, massimali, date, importi e documenti.
- Rendering React dei contenuti del report verificato con Testing Library.
- NON completato: verifica visiva responsive PC/mobile e stampa PDF effettiva. Chromium locale non installabile nell'ambiente; sito online richiede autenticazione. Non si dichiara un collaudo end-to-end autenticato.
- Le checklist richiedono verifica umana dei documenti; nessuna promessa di concessione o garanzia della graduatoria.
