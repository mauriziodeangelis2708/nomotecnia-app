import { timestamp, isoDay, calendarMonths, romeDay } from "./lazio-dates";
import type { Answers, Checklist, Result, Size } from "./engine";
import type { Question, Step } from "./questions";

const yes = (a: Answers, k: string) => a[k] === "si";
const filled = (v: unknown) =>
  typeof v === "string" ? v.trim().length > 0 : typeof v === "number" && Number.isFinite(v);
const amount = (v: unknown) =>
  (typeof v === "number" || typeof v === "string") &&
  String(v).trim() !== "" &&
  /^\d+(?:[.,]\d+)?$/.test(String(v)) &&
  Number.isFinite(Number(String(v).replace(",", ".")))
    ? Number(String(v).replace(",", "."))
    : null;
const day = isoDay;
const tx = (id: string, label: string, showIf?: Question["showIf"], help?: string): Question => ({
  id,
  label,
  type: "textarea",
  maxLength: 12000,
  ...(showIf ? { showIf } : {}),
  ...(help ? { help } : {}),
});
const tri = (id: string, label: string, showIf?: Question["showIf"], help?: string): Question => ({
  id,
  label,
  type: "tri",
  ...(showIf ? { showIf } : {}),
  ...(help ? { help } : {}),
});
const dt = (id: string, label: string, showIf?: Question["showIf"]): Question => ({
  id,
  label: label + " (YYYY-MM-DD)",
  type: "text",
  ...(showIf ? { showIf } : {}),
});
const post = (a: Answers) => yes(a, "progetto_realizzato");
const selected = (a: Answers, k: string) =>
  k.startsWith("cloud_")
    ? yes(a, "interesse_cloud") &&
      Array.isArray(a["cloud_sistemi"]) &&
      a["cloud_sistemi"].includes(k.slice(6))
    : yes(a, "interesse_" + k);
export const LAZIO_LINES = [
  "workplace",
  "commerce",
  "cloud_application",
  "cloud_database",
  "cloud_web",
  "cloud_backup",
  "cyber",
] as const;
const names: Record<string, string> = {
  workplace: "B — Workplace",
  commerce: "C — Commerce",
  cloud_application: "D.1 — Application",
  cloud_database: "D.2 — Database",
  cloud_web: "D.3 — Web",
  cloud_backup: "D.4 — Backup",
  cyber: "E — Cyber Security",
};
export const OFFICIAL_DISCREPANCIES = [
  "Decorrenza dei 40 giorni: art. 7 p. 13 richiama la PEC di disponibilità dell’Atto; Appendice 4.A p. 32 richiama la messa a disposizione. Il controllo usa la PEC secondo art. 7: verificare entrambe le date e il termine comunicato, senza presumere che coincidano.",
  "Atto micro: Avviso p. 13 indica 15 giorni, modulistica pp. 38–39 indica 10. Verificare PEC/Atto e chiarimento Lazio Innova; non attendere oltre il termine più breve.",
  "IVA mancante: Avviso p. 9 prevede annullamento punti; guida GeCoWEB p. 11 parla di esclusione e p. 13 torna ai punti. Non considerare pronta la domanda senza risolvere il caso.",
  "Zero dipendenti: GeCoWEB p. 16 richiede dichiarazione semplice sostitutiva. Il trattamento dei punti va verificato; N/A non equivale a documento verificato.",
  "OSS/editoria: allegati integrativi mancanti possono incidere sui punti. La stima prudenziale non sostituisce il ricalcolo/riscontro di Lazio Innova.",
  "SRG 880088:24 è citata nella guida ma non nell’elenco dell’Avviso/griglia forniti. Non attribuire automaticamente il bonus in questo caso.",
  "Usare VF25 e criteri 4/5/6 per i bonus: guida con refusi VE25 e 5/6/7. Per forfettari: reddito e acquisti zero, non divisione per zero. OSS di riferimento 2025.",
  "I modelli citano upgrade Workplace e riportano alcune etichette D.2 errate: non finanziare upgrade vietati dall’Avviso; Application è D.1. Per imprese SEE non UE chiarire la discordanza SEE/UE.",
];

export const DOSSIER_STEPS: Step[] = [
  {
    id: "assetto_documentato",
    title: "Assetto e verifiche dell’impresa",
    intro:
      "MOD pp. 25–34; Appendici 1–2. Descrivere i fatti e i documenti; i controlli professionali restano necessari.",
    questions: () => [
      tri(
        "partecipazione_pubblica_rilevante",
        "Enti pubblici controllano, direttamente o indirettamente, almeno il 25% del capitale o dei diritti di voto?",
        undefined,
        "Includere partecipazioni congiunte. Al limite del 25% verificare la disciplina UE richiamata; non dedurre lo status PMI dai soli bilanci.",
      ),
      tri("eccezione_pubblica", "Ricorre un’eccezione prevista dalla definizione UE di PMI?", (a) =>
        yes(a, "partecipazione_pubblica_rilevante"),
      ),
      tx(
        "eccezione_pubblica_motivo",
        "Eccezione: soggetto, quota, motivazione normativa e documenti",
        (a) => yes(a, "partecipazione_pubblica_rilevante"),
      ),
      tri(
        "eccezione_pubblica_verificata",
        "L’eccezione è stata verificata dal professionista?",
        (a) => yes(a, "partecipazione_pubblica_rilevante"),
      ),
      tx(
        "pmi_perimetro",
        "Perimetro PMI alla domanda: soci/enti, percentuali capitale e voto, controllo diretto/indiretto, accordi e persone fisiche che operano su mercati uguali/contigui",
        undefined,
        "Indicare anche assenza di relazioni. Modello 6: denominazione/CF, relazione, quota, bilancio consolidato, ULA/fatturato/attivo degli ultimi due esercizi di ciascuna impresa. Associate pro quota, collegate per intero; evitare duplicazioni.",
      ),
      tx(
        "pmi_calcolo",
        "Calcolo PMI: esercizi effettivi, ULA, aggregazioni, eventuale terzo esercizio o stima di impresa nuova",
        undefined,
        "I campi numerici 2024/25 alimentano la stima ordinaria. Esercizi differenti, impresa nuova o variazioni richiedono verifica; non sostituire anni/dati inventati.",
      ),
      tri(
        "pmi_perimetro_verificato",
        "Perimetro, esercizi e aggregazioni verificati sui documenti?",
      ),
      tx(
        "soggetti_rilevanti",
        "Soggetti rilevanti e cariche: verifica condanne/sanzioni/decadenze, inclusi altri rappresentanti e soggetti art.94",
        undefined,
        "Non inserire dettagli giudiziari non necessari: registrare soggetti, controllo effettuato, data ed esito; conservare evidenze con accesso appropriato.",
      ),
      tx(
        "lavoro_ambiente_verifiche",
        "Verifiche distinte: CCNL, sicurezza, disabili, pari opportunità, lavoro regolare/riposi, ambiente — esito e riferimenti",
      ),
      tx(
        "polizza_estremi",
        "Polizza: compagnia, numero, beni, decorrenza/scadenza; oppure motivo di esenzione Modello 3 e documenti",
        undefined,
        "Esenzione da polizza non significa ammissibilità al bando. Verificare validità alla domanda e concessione; aggiornare al saldo.",
      ),
      tx(
        "aiuti_dettaglio",
        "Aiuti richiesti/concessi: ente, data, importo, impresa unica, interventi/costi e verifica cumulo",
        undefined,
        "Includere aiuti richiesti e finanziamenti indiretti della diagnosi al fornitore, EDIH o Competence Center; indicare espressamente “nessuno” quando verificato.",
      ),
      tri(
        "aiuti_richiesti_assenti",
        "Assenti anche richieste di altri aiuti sui medesimi interventi/costi e finanziamenti pubblici indiretti della diagnosi?",
      ),
      tx(
        "giovani_assetto",
        "Bonus giovani: forma giuridica, data domanda, date di nascita/età a tale data, quote e componenti amministrativi",
        (a) => yes(a, "impresa_giovanile"),
        "Capitali: maggioranza quote e amministratori; persone/cooperative: maggioranza soci; individuale: titolare. Giovane = meno di36 anni. Considerare anche partecipazioni di imprese giovanili.",
      ),
      tx(
        "cert_genere_estremi",
        "Genere: organismo accreditato, numero certificato, rilascio, scadenza e validità alla domanda",
        (a) => yes(a, "cert_genere_valida"),
      ),
      tx(
        "cert_ambiente_estremi",
        "Ambiente: certificazione, organismo, numero, ambito, rilascio e scadenza alla domanda",
        (a) => yes(a, "cert_ambiente_valida"),
      ),
      tri("cert_ambiente_srg", "La premialità ambientale si basa soltanto su SRG 880088:24?", (a) =>
        yes(a, "cert_ambiente_valida"),
      ),
      tx(
        "conflitti_dettaglio",
        "Modello 4: nominativi e rapporti di coniugio/parentela/affinità entro secondo grado con dirigenti/funzionari regionali o Lazio Innova",
        (a) => yes(a, "conflitti_interesse"),
        "Considerare il dichiarante e, per quanto a conoscenza, gli altri legali rappresentanti. Non è esclusione automatica.",
      ),
      tx(
        "estero_documenti",
        "Impresa estera: Stato, registro, incarico revisore/avvocato italiano, relazione e documenti equipollenti",
        (a) => yes(a, "registro_ue"),
      ),
      tx(
        "sede_titoli",
        "Sedi operative: indirizzi, titolo di disponibilità, estremi/decorrenza/durata, destinazione, spazi, addetti, beni e fattibilità apertura",
        undefined,
        "In caso di apertura futura descrivere e documentare già in domanda. Per più sedi, distinguere gli interventi per sede.",
      ),
    ],
  },
  {
    id: "modelli_exante",
    title: "Diagnosi / relazione — analisi ex ante",
    intro:
      "Modello 1 sezioni 1–6 o Modello 2 sezioni 1–5. Questi dati preparano il modello ufficiale, non lo sostituiscono.",
    questions: () => [
      tx(
        "modello_metodo",
        "Metodo: strutture/processi valutati, misure qualitative/quantitative, criteri e assunzioni dei costi/benefici",
      ),
      tx(
        "modello_contesto",
        "Contesto: settore, prodotti/servizi, dimensione e ambizioni di crescita",
      ),
      tx(
        "modello_maturita",
        "Maturità digitale iniziale: punti di forza/debolezza, opportunità e minacce",
      ),
      tx(
        "modello_obiettivi",
        "Obiettivi e indicatori: valore iniziale, risultato atteso, metodo di misura e scadenza",
      ),
      tx(
        "modello_capacita",
        "Capacità di investimento e di gestione del cambiamento: risorse economiche/umane e competenze",
      ),
      tx(
        "modello_impatti",
        "Impatto atteso: ricavi, costi operativi e rischi; stime quantitative/qualitative e assunzioni",
      ),
      tx("modello_rischi", "Rischi delle iniziative, mitigazioni e criteri chiave di successo"),
      tx(
        "modello_piano",
        "Master plan: priorità, dipendenze, azioni, responsabili, risorse, partner e cronoprogramma con date",
      ),
      dt("modello_fine_prevista", "Data prevista di completamento"),
      tx(
        "esperti_estremi",
        "Professionisti: nominativi, qualifiche/certificazioni o albo MIMIT settore 8, validità, indipendenza da beneficiario e fornitori; stesso firmatario ex post o forza maggiore",
        (a) => yes(a, "diagnosi_prevista") || yes(a, "diagnosi_contributo_micro"),
      ),
      tx(
        "fornitori_estremi",
        "Fornitori e soggetto ICT: denominazione/CF, ruolo, interventi e contratti; unico soggetto ICT per l’intero progetto micro",
      ),
      ...LAZIO_LINES.flatMap((k) => [
        tx(
          k + "_inventario_ante",
          names[k] +
            " — inventario prima: prodotti, funzioni, quantità, licenze e date di attivazione",
          (a) => selected(a, k),
          "Workplace: dettagliare5 categorie. Cloud: server fisici, VM e6 servizi. Cyber: sistemi per ambito. Commerce: architettura e integrazioni.",
        ),
        tx(
          k + "_fabbisogno",
          names[k] +
            " — fabbisogno, soluzioni nuove, quantità, caratteristiche tecniche e benefici",
          (a) => selected(a, k),
        ),
        tx(
          k + "_contratti",
          names[k] +
            " — contratti: componenti, fornitore, attivazione, scadenza, durata e pagamenti dovuti",
          (a) => selected(a, k),
        ),
        tx(
          k + "_eccezioni",
          names[k] + " — eccezioni tecniche e motivazione ex ante, oppure “nessuna”",
          (a) => selected(a, k),
          "Solo eccezioni previste: incompatibilità servizi Cloud o hardware Cyber. Non autorizza deroghe generiche a durata, nuova adozione o altre condizioni.",
        ),
        tx(
          k + "_costi_esclusi",
          names[k] + " — costi fuori somma forfettaria e altri aiuti, oppure “nessuno”",
          (a) => selected(a, k),
          "Distinguere hardware, connettività, ads, contenuti, commissioni, formazione e consulenze secondo la specifica linea. Non rideterminano la somma forfettaria.",
        ),
      ]),
      tri(
        "commerce_sostituzione",
        "Commerce sostituisce integralmente una soluzione precedente?",
        (a) => yes(a, "interesse_commerce"),
      ),
      dt(
        "commerce_precedente_data",
        "Data realizzazione soluzione precedente",
        (a) => yes(a, "interesse_commerce") && yes(a, "commerce_sostituzione"),
      ),
    ],
  },
  {
    id: "atto_saldo",
    title: "Atto di impegno e preparazione saldo",
    intro:
      "I dati di questa sezione non sostituiscono l’invio GeCoWEB. Le date si riferiscono ai documenti effettivi.",
    questions: () => [
      tri("concessione_ricevuta", "Concessione ricevuta?"),
      {
        id: "contributo_concesso",
        label: "Contributo concesso/rideterminato più recente (euro)",
        type: "number",
        showIf: (a) => yes(a, "concessione_ricevuta") || post(a),
      },
      tx(
        "pratica_estremi",
        "Numero domanda, titolo, CUP, COR, atto concessione e riferimenti delle successive riduzioni",
        (a) => yes(a, "concessione_ricevuta") || post(a),
      ),
      dt(
        "atto_pec_data",
        "Data PEC disponibilità Atto",
        (a) => yes(a, "concessione_ricevuta") || post(a),
      ),
      dt(
        "atto_invio_data",
        "Data trasmissione Atto firmato",
        (a) => yes(a, "concessione_ricevuta") || post(a),
      ),
      tri(
        "atto_perfezionato",
        "Atto firmato/inviato, allegati e perfezionamento verificati?",
        (a) => yes(a, "concessione_ricevuta") || post(a),
      ),
      tx(
        "scadenze_comunicazioni",
        "Termini PEC e richieste integrazioni/regolarizzazione: data, scadenza, risposta e riscontro ente",
        (a) => yes(a, "concessione_ricevuta") || post(a),
        "Micro: discordanza 10/15 giorni. Piccole/medie40 giorni. Regolarizzazione Atto10 giorni e saldo30 giorni solo su invito, non proroghe automatiche.",
      ),
      tri(
        "firme_exante_verificate",
        "Modello ex ante completo e firme digitali dei soggetti richiesti verificati?",
      ),
      tri(
        "firme_expost_verificate",
        "Modello ex post completo e firme digitali dei soggetti richiesti verificate?",
        post,
        "M1: professionisti competenti e legale rappresentante. M2: legale rappresentante impresa e fornitore/soggetto ICT unitario.",
      ),
      tri(
        "durc_saldo_regolare",
        "DURC alla fase di saldo regolare?",
        post,
        "Un’irregolarità al saldo richiede gestione della compensazione; non equivale automaticamente a esclusione della domanda.",
      ),
      tri(
        "cartelle_saldo",
        "Cartelle/inadempimenti rilevanti almeno 5.000 euro per il pagamento?",
        post,
        "Verifica dell’ente prima del pagamento: non dedurre una revoca automatica.",
      ),
      tri(
        "sede_registro_saldo",
        "Sede operativa Lazio e iscrizione italiana effettivamente risultanti al Registro al saldo?",
        post,
      ),
      tri("polizza_saldo", "Polizza valida o esenzione ancora applicabile al saldo?", post),
      tri("variazioni_progetto", "Il realizzato differisce dal progetto concesso?", post),
      tx(
        "variazioni_dettaglio",
        "Variazioni per intervento/importo, punteggio originario e attuale, posizione utile e riscontro Lazio Innova",
        (a) => post(a) && yes(a, "variazioni_progetto"),
      ),
      tx("saldo_iban", "IBAN intestato al beneficiario e verifica titolarità", post),
      tri(
        "saldo_formalizzato",
        "Richiesta R generata, firmata digitalmente, inviata GeCoWEB e PEC ricevuta?",
        post,
      ),
      tri(
        "saldo_voci_verificate",
        "Voci saldo GeCoWEB verificate secondo guida p. 20 (somma forfettaria base senza 20%, campi convenzionali e IVA0)?",
        post,
      ),
      tx(
        "cup_verifica",
        "CUP: controllo fatture italiane, data rispetto all’Atto, riconducibilità precedente e integrazioni necessarie",
        post,
      ),
      tx(
        "trasparenza_verifica",
        "Poster A3/loghi e sito: URL, pubblicazione entro 3 mesi dall’Atto, evidenze",
        (a) => yes(a, "concessione_ricevuta") || post(a),
      ),
      tx(
        "mantenimento_piano",
        "Scadenziario: contratti 3 anni, attività 3 anni, Lazio 5 anni, SEE 10 anni dall’erogazione; archivi 5 anni successivi all’anno di erogazione, controlli e DNSH",
      ),
      tri(
        "allegati_formati_verificati",
        "Allegati per GeCoWEB verificati: PDF/P7M, dimensione≤8 MB, nome≤100 caratteri, non contiene insieme trattino e underscore?",
      ),
    ],
  },
  {
    id: "modelli_expost",
    title: "Diagnosi / relazione — risultati ex post",
    intro:
      "Compilare dopo realizzazione. Confrontare i risultati con l’ex ante mantenendo il metodo di valutazione.",
    questions: () => [
      ...["contesto", "maturita", "obiettivi", "capacita", "impatti"].map((k) =>
        tx(
          "expost_" + k,
          "Ex post — " + k + ": situazione attuale, confronto con ex ante e misure ottenute",
          post,
        ),
      ),
      ...LAZIO_LINES.map((k) =>
        tx(
          k + "_realizzato",
          names[k] +
            " — realizzato: quantità, prodotti, funzioni, date, test, conformità di ogni componente e durata 36 mesi",
          (a) => post(a) && selected(a, k),
        ),
      ),
      tx(
        "expost_giudizio",
        "Giudizio conclusivo: obiettivi raggiunti, scostamenti, motivi ed evidenze",
        post,
      ),
    ],
  },
];

export interface DossierStage {
  label: string;
  ready: boolean;
  issues: string[];
}
export interface DossierResult {
  stages: DossierStage[];
  discrepancies: readonly string[];
}
export type Context = {
  size: Size | null;
  score: Result["score"];
  projectStatus: Result["projectStatus"];
  interventions: Result["interventions"];
  potentialCapped: number | null;
};

export function geCoRequired(a: Answers): string[] {
  const keys = [
    "dimensione",
    "caratteristiche_impresa",
    "legale_rappresentante",
    "referente_nome",
    "referente_ruolo",
    "referente_email",
    "referente_telefono",
    "titolo_progetto",
    "durata_mesi",
    "bollo_esente",
    "descrizione_sintetica",
    "sede_indirizzo",
    "descrizione_progetto",
    "punteggio_totale",
    "punteggio_c1",
    "punteggio_c2",
    "punteggio_c3",
    "punteggio_genere",
    "punteggio_giovanile",
    "punteggio_ambientale",
  ];
  if (a["sede_operativa_lazio"] === "no") keys.push("acquisizione_sede_lazio");
  if (a["gecoweb_bollo_esente"] === "no") keys.push("bollo_id", "bollo_data");
  if (a["gecoweb_bollo_esente"] === "si") keys.push("bollo_esenzione");
  if (yes(a, "diagnosi_prevista")) keys.push("costo_diagnosi");
  for (const k of LAZIO_LINES) if (selected(a, k)) keys.push("costo_" + k);
  const issues = keys
    .filter((k) => !filled(a["gecoweb_" + k]))
    .map((k) => "Formulario GeCoWEB: completare " + k.replaceAll("_", " "));
  for (const k of ["numerazione_punteggi_verificata", "importi_verificati"])
    if (!yes(a, "gecoweb_" + k))
      issues.push("Formulario GeCoWEB: verificare " + k.replaceAll("_", " "));
  return issues;
}

export function geCoConsistency(a: Answers, ctx?: Partial<Context>): string[] {
  const issues: string[] = [];
  const n = (k: string) => amount(a[k]);
  for (const [key, value] of Object.entries(a)) {
    if (
      /^gecoweb_(punteggio_|costo_|durata_mesi)/.test(key) &&
      filled(value) &&
      amount(value) === null
    )
      issues.push("Valore numerico GeCoWEB non valido: " + key.replaceAll("_", " "));
  }
  const duration = n("gecoweb_durata_mesi");
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 6))
    issues.push("Durata GeCoWEB: indicare da 1 a 6 mesi.");
  if (ctx?.size && filled(a["gecoweb_dimensione"]) && a["gecoweb_dimensione"] !== ctx.size)
    issues.push("Dimensione GeCoWEB diversa dalla dimensione valutata.");
  const scoreKeys = ["c1", "c2", "c3", "genere", "giovanile", "ambientale"];
  const limits = [35, 20, 15, 10, 10, 10];
  scoreKeys.forEach((key, i) => {
    const v = n("gecoweb_punteggio_" + key);
    if (v !== null && (v > limits[i]! || (i >= 3 && v !== 0 && v !== 10)))
      issues.push("Punteggio GeCoWEB " + key + ": valore fuori intervallo.");
    if (
      v !== null &&
      ctx?.score?.criteria[i] !== null &&
      ctx?.score?.criteria[i] !== undefined &&
      Math.abs(v - ctx.score!.criteria[i]!) > 0.011
    )
      issues.push("Punteggio GeCoWEB " + key + " diverso dal calcolo.");
  });
  const total = n("gecoweb_punteggio_totale");
  if (total !== null && total > 100) issues.push("Totale GeCoWEB superiore a 100.");
  const parts = scoreKeys.map((k) => n("gecoweb_punteggio_" + k));
  if (
    total !== null &&
    parts.every((x) => x !== null) &&
    Math.abs(total - parts.reduce<number>((x, y) => x + (y ?? 0), 0)) > 0.011
  )
    issues.push("Totale GeCoWEB diverso dalla somma dei criteri.");
  if (
    a["gecoweb_bollo_esente"] === "no" &&
    (!/^\d{14}$/.test(String(a["gecoweb_bollo_id"])) || day(a["gecoweb_bollo_data"]) === null)
  )
    issues.push("Bollo: servono identificativo 14 cifre e data valida.");
  if (a["gecoweb_bollo_esente"] === "si" && !filled(a["gecoweb_bollo_esenzione"]))
    issues.push("Bollo: motivazione esenzione mancante.");
  if (
    filled(a["gecoweb_bollo_esente"]) &&
    !["si", "no"].includes(String(a["gecoweb_bollo_esente"]))
  )
    issues.push("Selezionare una condizione valida per il bollo.");
  const bases: Record<string, number | null> = {
    diagnosi: ctx?.size === "piccola" ? 6802 : ctx?.size === "media" ? 17856 : null,
    commerce:
      ctx?.size === "micro"
        ? 4129
        : ctx?.size === "piccola"
          ? 6771
          : ctx?.size === "media"
            ? 13228
            : null,
    workplace: n("workplace_postazioni") === null ? null : n("workplace_postazioni")! * 1892,
    cloud_application: 14736,
    cloud_database: 23047,
    cloud_web: 11730,
    cloud_backup: 4661,
    cyber: ctx?.size === "piccola" ? 12214 : ctx?.size === "media" ? 37431 : null,
  };
  for (const [key, expected] of Object.entries(bases))
    if (
      (key === "diagnosi" ? ctx?.size === "piccola" || ctx?.size === "media" : selected(a, key)) &&
      expected !== null &&
      n("gecoweb_costo_" + key) !== null &&
      Math.abs(n("gecoweb_costo_" + key)! - expected) > 0.005
    )
      issues.push(
        "Costo GeCoWEB " + key + ": deve essere " + expected.toFixed(2) + " euro, senza 20%.",
      );
  return issues;
}

export function evaluateDossier(a: Answers, cl: Checklist, ctx: Context): DossierResult {
  const initial: string[] = [],
    commitment: string[] = [],
    balance: string[] = [];
  const doc = (list: string[], key: string, label: string) => {
    if (cl[key]?.status !== "verificato") list.push("Documento da verificare: " + label);
  };
  const flag = (list: string[], key: string, label: string) => {
    if (!yes(a, key)) list.push(label);
  };
  const readFields = (id: string, target: string[], force = false) => {
    for (const q of DOSSIER_STEPS.find((s) => s.id === id)!.questions({}))
      if (!q.showIf || q.showIf(a) || force) {
        const value = a[q.id];
        if (!filled(value) || (q.type === "tri" && !["si", "no"].includes(String(value))))
          target.push(q.label);
        else if (q.label.includes("(YYYY-MM-DD)") && day(value) === null)
          target.push("Data non valida: " + q.label);
      }
  };
  readFields("assetto_documentato", initial);
  readFields("modelli_exante", ctx.size === "micro" ? initial : commitment);
  for (const k of [
    "ragione_sociale",
    "partita_iva",
    "pec",
    "gecoweb_legale_rappresentante",
    "gecoweb_titolo_progetto",
    "gecoweb_descrizione_progetto",
  ])
    if (!filled(a[k])) initial.push("Dato identificativo/formulario mancante: " + k);
  for (const [key, label] of [
    ["visura", "visura e sede"],
    ["dich_pmi", "dimensione e perimetro PMI"],
    ["durc", "DURC domanda"],
    ["de_minimis", "Impresa Unica / RNA"],
    ["polizza_o_modello3", "polizza o Modello 3"],
  ])
    doc(initial, key!, label!);
  flag(initial, "pmi_perimetro_verificato", "Verificare perimetro e aggregazioni PMI.");
  flag(
    initial,
    "aiuti_richiesti_assenti",
    "Verificare aiuti richiesti e diagnosi finanziata indirettamente.",
  );
  flag(
    initial,
    "allegati_formati_verificati",
    "Verificare formati, dimensioni e nomi degli allegati GeCoWEB.",
  );
  if (ctx.size === "micro") {
    doc(initial, "modello2_exante", "Modello 2 ex ante / diagnosi equivalente");
    flag(initial, "firme_exante_verificate", "Verificare firme ex ante.");
  } else {
    doc(commitment, "modello1_exante", "Modello 1 ex ante");
    doc(commitment, "qualifiche_esperti", "qualifiche/indipendenza esperti");
    flag(commitment, "firme_exante_verificate", "Verificare firme ex ante.");
  }
  if (yes(a, "registro_ue")) doc(initial, "rappresentante_ue", "rappresentante e documenti esteri");
  if (amount(a["addetti_inps_luglio_2026"]) === 0) {
    doc(initial, "dichiarazione_zero_dipendenti", "dichiarazione assenza dipendenti");
    if (cl["inps_attestazione_luglio_2026"]?.status !== "verificato")
      initial.push(
        "Zero dipendenti: confermare con Lazio Innova il criterio 1 e il documento alternativo.",
      );
  } else doc(initial, "inps_attestazione_luglio_2026", "attestazione INPS luglio 2026");
  doc(
    initial,
    a["regime_fiscale"] === "forfettario" ? "redditi_2025" : "iva_modello_2026",
    "dichiarazione fiscale 2025",
  );
  if (yes(a, "vendite_oss")) doc(initial, "iva_oss_2025", "dichiarazioni OSS 2025");
  if (yes(a, "integrazione_editoria"))
    doc(initial, "attestazione_editoria", "attestazione editoria");
  for (const [answer, key] of [
    ["cert_genere_valida", "cert_genere"],
    ["cert_ambiente_valida", "cert_ambiente"],
    ["impresa_giovanile", "impresa_giovanile"],
    ["conflitti_interesse", "modello4_conflitti"],
    ["precedenti_voucher_lazio", "precedenti_voucher"],
  ])
    if (yes(a, answer!)) doc(initial, key!, key!);
  if (yes(a, "cert_ambiente_srg"))
    initial.push("SRG 880088:24: chiarimento ufficiale necessario prima di attribuire il bonus.");
  initial.push(...geCoRequired(a), ...geCoConsistency(a, ctx));
  if (yes(a, "commerce_sostituzione")) {
    const old = day(a["commerce_precedente_data"]),
      submittedTimestamp = timestamp(a["domanda_timestamp"]),
      submitted = submittedTimestamp === null ? null : romeDay(submittedTimestamp);
    if (old === null || submitted === null)
      initial.push(
        "Commerce: documentare data precedente soluzione e data domanda per verificare oltre 3 anni.",
      );
    else {
      const limit = calendarMonths(submitted, -36);
      if (old >= limit)
        initial.push(
          "Commerce: soluzione precedente non risulta realizzata oltre 3 anni prima della domanda.",
        );
    }
  }
  doc(commitment, "atto_impegno", "Atto firmato e ricevuta trasmissione");
  flag(commitment, "atto_perfezionato", "Atto non ancora verificato/perfezionato.");
  const available = day(a["atto_pec_data"]),
    sent = day(a["atto_invio_data"]);
  if (available === null || sent === null)
    commitment.push("Acquisire date PEC disponibilità e invio Atto.");
  else if (sent < available)
    commitment.push("Invio Atto precedente alla disponibilità: correggere date.");
  else if ((sent - available) / 86400000 > (ctx.size === "micro" ? 10 : 40))
    commitment.push(
      ctx.size === "micro"
        ? "Atto micro oltre 10 giorni: verificare discordanza 10/15 giorni e riscontro ente."
        : "Atto oltre 40 giorni: verificare invito di regolarizzazione e riscontro ente.",
    );
  if (amount(a["contributo_concesso"]) === null)
    commitment.push("Acquisire importo concesso/rideterminato.");
  if (!filled(a["pratica_estremi"]))
    commitment.push("Acquisire riferimenti pratica, concessione, CUP e COR.");
  if (ctx.size === null)
    commitment.push("Dimensione non determinata: verificare modello e scadenza applicabili.");
  if (!post(a)) balance.push("Progetto non dichiarato realizzato: saldo non ancora pronto.");
  else {
    readFields("modelli_expost", balance);
    readFields("atto_saldo", balance);
    doc(balance, "modello_expost", "relazione/diagnosi ex post");
    doc(balance, "contratti_saldo", "contratti e pagamenti dovuti");
    doc(balance, "cup_fatture", "CUP e riconducibilità");
    doc(balance, "saldo_pec", "richiesta R firmata e PEC");
    doc(balance, "trasparenza", "poster/sito/loghi");
    for (const [key, label] of [
      ["firme_expost_verificate", "Firme digitali ex post"],
      ["sede_registro_saldo", "Sede Lazio e Registro italiano al saldo"],
      ["polizza_saldo", "Polizza/esenzione al saldo"],
      ["saldo_formalizzato", "Invio richiesta R e PEC"],
      ["saldo_voci_verificate", "Voci forfettarie saldo"],
    ])
      flag(balance, key!, label + " da verificare.");
    if (a["durc_saldo_regolare"] !== "si")
      balance.push(
        "DURC saldo: verificare regolarità o compensazione con l’ente; non è esclusione automatica.",
      );
    if (a["cartelle_saldo"] !== "no")
      balance.push("Verificare cartelle e disponibilità del pagamento con l’ente.");
    if (a["variazioni_progetto"] !== "no")
      balance.push(
        "Variazioni: verificare autorizzazione, contributo non aumentabile e mantenimento del punteggio utile.",
      );
    if (amount(a["contributo_concesso"]) === null)
      balance.push("Importo concesso mancante: non determinabile il limite erogabile.");
    if (
      !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(
        String(a["saldo_iban"] ?? "")
          .replace(/\s/g, "")
          .toUpperCase(),
      )
    )
      balance.push(
        "IBAN: inserire il codice completo; verificare checksum e titolarità presso la banca.",
      );
  }
  if (ctx.projectStatus !== "confermato") {
    initial.push("Compatibilità preliminare ancora da risolvere.");
    balance.push("Compatibilità degli interventi ancora da risolvere.");
  }
  balance.push(...commitment.map((x) => "Atto/concessione: " + x));
  const stage = (label: string, issues: string[]): DossierStage => ({
    label,
    ready: issues.length === 0,
    issues: [...new Set(issues)],
  });
  return {
    stages: [
      stage("Completezza della domanda", initial),
      stage("Atto di impegno", commitment),
      stage("Prontezza per il saldo", balance),
    ],
    discrepancies: OFFICIAL_DISCREPANCIES,
  };
}
