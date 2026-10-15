import { BANDO_URL, BANDO_VERSION } from "@/lib/bando";

export function BandoGuide() {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm space-y-3">
      <h3 className="font-semibold">Procedura, obblighi e limiti della verifica</h3>
      <p>
        Fonte:{" "}
        <a className="underline" href={BANDO_URL} target="_blank" rel="noreferrer">
          Avviso ufficiale e Appendici 1–4
        </a>
        . {BANDO_VERSION}.
      </p>
      <p>
        Artt. 1–6: un progetto di una sola PMI; ultima domanda valida sostituisce le precedenti.
        Dotazione 15 milioni EUR e graduatoria per punteggio verificato: la stima non prova
        disponibilità di fondi né diritto al finanziamento. In parità prevalgono i criteri 1, 2, 3,
        4, 5 in tale ordine; ulteriore parità non finanziabile integralmente comporta mancata
        concessione.
      </p>
      <p>
        Art. 6: formulario dal 25/09/2026 ore 12:00; invio dal 30/09/2026 ore 12:00 al 29/10/2026
        ore 17:00, ora italiana. Solo GeCoWEB, domanda generata, firma digitale e PEC di conferma.
        Marca da bollo con identificativo e data, annullata e conservata, oppure esenzione motivata
        nel formulario. Modifiche dopo il download richiedono una nuova generazione e firma. IVA,
        INPS e certificazioni mancanti annullano i relativi punteggi senza integrazione. Altre
        integrazioni istruttorie: 10 giorni dalla richiesta.
      </p>
      <p>
        Art. 7: Atto di Impegno reso disponibile entro 5 giorni dalla concessione. Restituzione
        firmata: l’Avviso indica 15 giorni dalla PEC, la modulistica 10 per le micro; verificare il
        termine nella comunicazione dell’ente. Per piccole/medie: 40 giorni con diagnosi ex ante.
        Solo su invito si applicano gli ulteriori 10 giorni. Diagnosi non oltre 3 mesi prima della
        domanda e prima degli altri interventi. Conclusione e richiesta saldo completa entro 6 mesi
        dalla pubblicazione della concessione sul BUR. Invito a regolarizzare la richiesta:
        ulteriori 30 giorni, senza proroga automatica. Erogazione in un’unica soluzione a saldo, con
        modello 1/2 ex post e modello 4 ove necessario.
      </p>
      <p>
        Artt. 8–10: variazioni non aumentano contributo o componenti concessi. Difformità,
        dichiarazioni mendaci, doppio finanziamento, termini e requisiti non rispettati possono
        determinare riduzione, revoca e recupero. Controlli anche dopo l’erogazione; DURC e cartelle
        di pagamento verificati prima del saldo. Le eccezioni e gli esiti amministrativi richiedono
        verifica di Lazio Innova.
      </p>
      <p>
        Artt. 9–11: mantenere attività per 3 anni, localizzazione nel Lazio per 5 anni e nello SEE
        per 10 anni dall’erogazione. Conservare documentazione per 5 anni dall’anno di erogazione;
        consentire controlli e monitoraggio. Contratti ricorrenti almeno 36 mesi, pagamenti regolari
        e conformità dei componenti ex post. Aggiornare tempestivamente le dichiarazioni, rispettare
        pubblicità FESR, principi orizzontali e DNSH.
      </p>
      <p>
        Appendice 4: fatture dei costi coperti soggette agli obblighi CUP applicabili, anche se non
        allegate al saldo. Per fatture italiane successive all’Atto di Impegno, CUP obbligatorio;
        per quelle precedenti deve essere dimostrabile la riconducibilità al progetto, con
        integrazione secondo la procedura prevista quando necessaria.
      </p>
      <p>
        Art. 12 e Appendice 3: rendere nota l’informativa a ogni persona di cui si comunicano dati.
        Art. 13: monitorare PEC e pubblicazioni BUR; quesiti a infobandi@lazioinnova.it, PEC
        procedurale incentivi@pec.lazioinnova.it. FAQ e successive modifiche vanno ricontrollate sul
        sito ufficiale prima dell’invio.
      </p>
      <p>
        La checklist registra il controllo dell’operatore: l’app non legge automaticamente i
        documenti né interroga Registro Imprese, RNA, INPS, DURC, certificazioni o GeCoWEB.
        Verificare qualifiche, indipendenza, attività effettiva, contratti, allegati e relative
        date. I modelli ufficiali e le dichiarazioni firmate restano necessari.
      </p>
      <a
        className="underline"
        href="https://www.lazioinnova.it/bandi/voucher-digitalizzazione-pmi-2026/"
        target="_blank"
        rel="noreferrer"
      >
        Modulistica, istruzioni GeCoWEB, griglia punteggi e aggiornamenti ufficiali
      </a>
    </div>
  );
}
