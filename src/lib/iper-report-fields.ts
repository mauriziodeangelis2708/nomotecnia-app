// Etichette e condizioni del questionario Iperammortamento, per il report stampabile.
import type { IperAnswers } from "./iperammortamento";
export const IVV_FIELDS = [
  ["categoria", "Categoria e codice da tabella GSE Allegato IV/V"],
  ["descrizione", "Descrizione del bene"],
  ["completamento", "Data prevista di completamento (YYYY-MM-DD)"],
  ["interconnessione", "Data prevista di interconnessione (YYYY-MM-DD)"],
  ["bene_complesso", "Componente di bene complesso? (Sì/No)"],
  ["descrizione_complesso", "Descrizione del bene complesso/componente (se applicabile)"],
  ["costo_netto", "Costo di acquisizione al netto di altre agevolazioni (€)"],
  ["coefficiente", "Coefficiente di ammortamento (%)"],
  ["stato_bene", "Solo in conferma: stato del bene (confermato / decaduto)"],
  ["leasing", "Solo in conferma: acquisto con leasing, anche parziale? (Sì/No)"],
  ["importo_leasing", "Solo in conferma: importo leasing (€)"],
  [
    "data_ultima_quota_acconto",
    "Solo in conferma: data ultima quota per raggiungere l’acconto del 20%",
  ],
  ["importo_ultima_quota_acconto", "Solo in conferma: importo ultima quota acconto (€)"],
  ["acconto_totale", "Solo in conferma: importo totale acconto (€)"],
  ["fatture", "Solo in conferma: riferimenti fatture e documenti di acquisto"],
] as const;
export const FER_FIELDS = [
  ["fonte", "Tipologia di fonte rinnovabile / accumulo"],
  ["descrizione", "Descrizione impianto"],
  ["potenza", "Potenza (kWp per fotovoltaico, kW per altre fonti)"],
  ["completamento", "Data prevista di completamento (YYYY-MM-DD)"],
  ["entrata_esercizio", "Data prevista di entrata in funzione (YYYY-MM-DD)"],
  ["costo_netto", "Costo di acquisizione al netto di altre agevolazioni (€)"],
  ["coefficiente", "Coefficiente di ammortamento (%)"],
  ["classe_enea", "Per fotovoltaico: modulo ENEA categoria b o c e relativo costo (€)"],
  ["stato_bene", "Solo in conferma: stato dell’impianto (confermato / decaduto)"],
  ["leasing", "Solo in conferma: acquisto con leasing, anche parziale? (Sì/No)"],
  ["importo_leasing", "Solo in conferma: importo leasing (€)"],
  [
    "data_ultima_quota_acconto",
    "Solo in conferma: data ultima quota per raggiungere l’acconto del 20%",
  ],
  ["importo_ultima_quota_acconto", "Solo in conferma: importo ultima quota acconto (€)"],
  ["acconto_totale", "Solo in conferma: importo totale acconto (€)"],
  ["fatture", "Solo in conferma: riferimenti fatture e documenti di acquisto"],
] as const;
export const IPER_REPORT_FIELDS = [
  {
    id: "denominazione",
    section: "0. Dati aziendali e firmatario",
    label: () => "Denominazione / ragione sociale",
    showIf: () => true,
    options: [],
  },
  {
    id: "partita_iva",
    section: "0. Dati aziendali e firmatario",
    label: () => "Partita IVA",
    showIf: () => true,
    options: [],
  },
  {
    id: "codice_fiscale",
    section: "0. Dati aziendali e firmatario",
    label: () => "Codice fiscale",
    showIf: () => true,
    options: [],
  },
  {
    id: "forma_giuridica",
    section: "0. Dati aziendali e firmatario",
    label: () => "Forma giuridica / tipologia operatore GSE",
    showIf: () => true,
    options: [],
  },
  {
    id: "data_costituzione",
    section: "0. Dati aziendali e firmatario",
    label: () => "Data costituzione impresa (YYYY-MM-DD)",
    showIf: () => true,
    options: [],
  },
  {
    id: "data_iscrizione_registro",
    section: "0. Dati aziendali e firmatario",
    label: () => "Data iscrizione Registro Imprese (YYYY-MM-DD)",
    showIf: () => true,
    options: [],
  },
  {
    id: "sede_legale_indirizzo",
    section: "0. Dati aziendali e firmatario",
    label: () => "Sede legale — indirizzo",
    showIf: () => true,
    options: [],
  },
  {
    id: "sede_legale_comune",
    section: "0. Dati aziendali e firmatario",
    label: () => "Sede legale — Comune",
    showIf: () => true,
    options: [],
  },
  {
    id: "sede_legale_provincia",
    section: "0. Dati aziendali e firmatario",
    label: () => "Sede legale — provincia",
    showIf: () => true,
    options: [],
  },
  {
    id: "sede_legale_cap",
    section: "0. Dati aziendali e firmatario",
    label: () => "Sede legale — CAP",
    showIf: () => true,
    options: [],
  },
  {
    id: "pec",
    section: "0. Dati aziendali e firmatario",
    label: () => "PEC aziendale",
    showIf: () => true,
    options: [],
  },
  {
    id: "email",
    section: "0. Dati aziendali e firmatario",
    label: () => "Email aziendale",
    showIf: () => true,
    options: [],
  },
  {
    id: "telefono",
    section: "0. Dati aziendali e firmatario",
    label: () => "Telefono aziendale",
    showIf: () => true,
    options: [],
  },
  {
    id: "firmatario_tipo",
    section: "0. Dati aziendali e firmatario",
    label: (answers: IperAnswers) =>
      "Firmatario: legale rappresentante / titolare / responsabile / delegato",
    showIf: () => true,
    options: [],
  },
  {
    id: "firmatario_nome",
    section: "0. Dati aziendali e firmatario",
    label: () => "Firmatario — nome e cognome",
    showIf: () => true,
    options: [],
  },
  {
    id: "firmatario_cf",
    section: "0. Dati aziendali e firmatario",
    label: () => "Firmatario — codice fiscale",
    showIf: () => true,
    options: [],
  },
  {
    id: "referente_nome",
    section: "0. Dati aziendali e firmatario",
    label: () => "Referente GSE — nome e cognome",
    showIf: () => true,
    options: [],
  },
  {
    id: "referente_email",
    section: "0. Dati aziendali e firmatario",
    label: () => "Referente GSE — email",
    showIf: () => true,
    options: [],
  },
  {
    id: "referente_telefono",
    section: "0. Dati aziendali e firmatario",
    label: () => "Referente GSE — cellulare (prefisso internazionale con 00)",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_nome",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Denominazione della struttura produttiva",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_indirizzo",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Indirizzo della struttura",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_comune",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Comune",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_provincia",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Provincia",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_cap",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "CAP",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_sezione_catastale",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Sezione catastale (oppure NP)",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_foglio",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Foglio catastale",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_particella",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Particella catastale",
    showIf: () => true,
    options: [],
  },
  {
    id: "struttura_subalterno",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Sub prevalente (oppure NP)",
    showIf: () => true,
    options: [],
  },
  {
    id: "pratica_nptr",
    section: "0.1 Struttura produttiva per la comunicazione preventiva",
    label: () => "Numero pratica NPTR5 (se già assegnato)",
    showIf: () => true,
    options: [],
  },
  {
    id: "beni_ivv_json",
    section: "0.2 Elenco investimenti da dichiarare al GSE",
    label: () => "Beni Allegato IV/V",
    showIf: () => true,
    options: [],
  },
  {
    id: "impianti_fer_json",
    section: "0.2 Elenco investimenti da dichiarare al GSE",
    label: () => "Impianti di autoconsumo FER e sistemi di accumulo",
    showIf: () => true,
    options: [],
  },
  {
    id: "producibilita_kwh",
    section: "0.2 Elenco investimenti da dichiarare al GSE",
    label: () => "Producibilità complessiva FER prevista (kWh)",
    showIf: () => true,
    options: [],
  },
  {
    id: "fabbisogno_kwh",
    section: "0.2 Elenco investimenti da dichiarare al GSE",
    label: (answers: IperAnswers) =>
      "Consumo elettrico annuo della struttura nell’anno precedente (kWh)",
    showIf: () => true,
    options: [],
  },
  {
    id: "pod",
    section: "0.2 Elenco investimenti da dichiarare al GSE",
    label: (answers: IperAnswers) =>
      "POD della struttura (se più di uno, separati da punto e virgola)",
    showIf: () => true,
    options: [],
  },
  {
    id: "fabbisogno_termico_equivalente",
    section: "0.2 Elenco investimenti da dichiarare al GSE",
    label: (answers: IperAnswers) =>
      "Fabbisogno equivalente per consumi termici, se applicabile (kWh)",
    showIf: () => true,
    options: [],
  },
  {
    id: "italia",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "Impresa residente in Italia o stabile organizzazione in Italia?",
    showIf: () => true,
    options: [],
  },
  {
    id: "procedura_crisi",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "L’impresa è in liquidazione/procedura concorsuale o è in corso un procedimento per dichiararla?",
    showIf: () => true,
    options: [],
  },
  {
    id: "sanzioni_231",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "L’impresa è destinataria di una sanzione interdittiva ai sensi del D.Lgs. 231/2001?",
    showIf: () => true,
    options: [],
  },
  {
    id: "sicurezza_durc",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "Sono rispettate le norme di sicurezza sul lavoro e gli obblighi contributivi/previdenziali?",
    showIf: () => true,
    options: [],
  },
  {
    id: "bene_nuovo",
    section: "1. Impresa e requisiti generali",
    label: () => "Il bene è nuovo e strumentale all’attività d’impresa?",
    showIf: () => true,
    options: [],
  },
  {
    id: "dichiarazioni_gse",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "Sono state verificate le dichiarazioni e i requisiti di impresa richiesti nella DSAN GSE?",
    showIf: () => true,
    options: [],
  },
  {
    id: "termine",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "È previsto che l’investimento rientri nel periodo agevolabile dal 1° gennaio 2026 al 30 settembre 2028, secondo i criteri applicabili?",
    showIf: () => true,
    options: [],
  },
  {
    id: "esclusione_446",
    section: "1. Impresa e requisiti generali",
    label: (answers: IperAnswers) =>
      "Sul bene/costo viene richiesto anche il credito d’imposta previsto dall’art. 1, comma 446, L. 207/2024?",
    showIf: () => true,
    options: [],
  },
  {
    id: "tipo_bene",
    section: "2. Investimento",
    label: () => "Quale investimento vuoi valutare?",
    showIf: () => true,
    options: [
      { value: "", label: "Seleziona…" },
      { value: "allegato_iv", label: "Bene materiale – Allegato IV" },
      { value: "allegato_v", label: "Software o bene immateriale – Allegato V" },
      { value: "beni_iv_v", label: "Beni Allegato IV e V" },
      { value: "energia", label: "Autoproduzione di energia rinnovabile" },
      { value: "misto", label: "Beni Allegato IV/V e impianti FER" },
    ],
  },
  {
    id: "categoria_allegato",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Un tecnico ha verificato che il bene rientra in una voce dell’Allegato IV/V?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        String(answers.tipo_bene) === "allegato_iv" ||
        String(answers.tipo_bene) === "allegato_v" ||
        String(answers.tipo_bene) === "beni_iv_v" ||
        String(answers.tipo_bene) === "misto",
      ),
    options: [],
  },
  {
    id: "interconnessione",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Il bene sarà interconnesso al sistema aziendale di gestione della produzione o alla rete di fornitura?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        String(answers.tipo_bene) === "allegato_iv" ||
        String(answers.tipo_bene) === "allegato_v" ||
        String(answers.tipo_bene) === "beni_iv_v" ||
        String(answers.tipo_bene) === "misto",
      ),
    options: [],
  },
  {
    id: "requisiti_tecnici",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Le caratteristiche tecniche richieste per la specifica categoria di bene sono documentate?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        (String(answers.tipo_bene) === "allegato_iv" ||
          String(answers.tipo_bene) === "beni_iv_v" ||
          String(answers.tipo_bene) === "misto") &&
        (String(answers.tipo_bene) === "allegato_iv" ||
          String(answers.tipo_bene) === "allegato_v" ||
          String(answers.tipo_bene) === "beni_iv_v" ||
          String(answers.tipo_bene) === "misto"),
      ),
    options: [],
  },
  {
    id: "funzione_software",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Il software è funzionale ai processi digitali/operativi contemplati dall’Allegato V, e non soltanto un software generico?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        (String(answers.tipo_bene) === "allegato_v" ||
          String(answers.tipo_bene) === "beni_iv_v" ||
          String(answers.tipo_bene) === "misto") &&
        (String(answers.tipo_bene) === "allegato_iv" ||
          String(answers.tipo_bene) === "allegato_v" ||
          String(answers.tipo_bene) === "beni_iv_v" ||
          String(answers.tipo_bene) === "misto"),
      ),
    options: [],
  },
  {
    id: "tipo_energia",
    section: "2. Investimento",
    label: () => "Quale tipo di energia produce l’impianto?",
    showIf: (answers: IperAnswers) =>
      Boolean(String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
    options: [
      { value: "", label: "Seleziona…" },
      { value: "elettrica", label: "Energia elettrica" },
      { value: "termica", label: "Calore di processo" },
      { value: "entrambe", label: "Energia elettrica e calore di processo" },
      { value: "non_so", label: "Non lo so" },
    ],
  },
  {
    id: "autoconsumo",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "L’energia prodotta è destinata all’autoconsumo della struttura produttiva?",
    showIf: (answers: IperAnswers) =>
      Boolean(String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
    options: [],
  },
  {
    id: "impianto_ammesso",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "La tecnologia e i componenti rispettano i requisiti della misura?",
    showIf: (answers: IperAnswers) =>
      Boolean(String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
    options: [],
  },
  {
    id: "dimensionamento",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Un tecnico ha verificato il limite del 105% per la produzione elettrica usando i consumi dell’esercizio precedente e le conversioni previste dal decreto?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        (answers.tipo_energia === "elettrica" || answers.tipo_energia === "entrambe") &&
        (String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
      ),
    options: [],
  },
  {
    id: "calore_processo",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Il calore prodotto è destinato esclusivamente al calore di processo?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        (answers.tipo_energia === "termica" || answers.tipo_energia === "entrambe") &&
        (String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
      ),
    options: [],
  },
  {
    id: "calore_non_cessibile",
    section: "2. Investimento",
    label: () => "Il calore prodotto non è cedibile a terzi?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        (answers.tipo_energia === "termica" || answers.tipo_energia === "entrambe") &&
        (String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
      ),
    options: [],
  },
  {
    id: "fonte_termica_ammessa",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "L’impianto termico è alimentato nelle modalità ammesse dal decreto?",
    showIf: (answers: IperAnswers) =>
      Boolean(
        (answers.tipo_energia === "termica" || answers.tipo_energia === "entrambe") &&
        (String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
      ),
    options: [],
  },
  {
    id: "sito_pod",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Ubicazione, POD e collegamento alla struttura produttiva sono stati verificati?",
    showIf: (answers: IperAnswers) =>
      Boolean(String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
    options: [],
  },
  {
    id: "accumulo",
    section: "2. Investimento",
    label: () => "Sono previsti sistemi di accumulo?",
    showIf: (answers: IperAnswers) =>
      Boolean(String(answers.tipo_bene) === "energia" || String(answers.tipo_bene) === "misto"),
    options: [],
  },
  {
    id: "costo_ammissibile",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Costo agevolabile stimato per una singola annualità, al netto degli altri contributi (€)",
    showIf: () => true,
    options: [],
  },
  {
    id: "altri_aiuti",
    section: "2. Investimento",
    label: () => "Ci sono altri contributi o agevolazioni sugli stessi costi?",
    showIf: () => true,
    options: [],
  },
  {
    id: "cumulo_verificato",
    section: "2. Investimento",
    label: (answers: IperAnswers) =>
      "Il commercialista ha verificato il cumulo, la base netta e l’assenza di doppio finanziamento delle stesse quote di costo?",
    showIf: (answers: IperAnswers) => Boolean(answers.altri_aiuti === "si"),
    options: [],
  },
  {
    id: "perizia",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      "È già disponibile la perizia tecnica asseverata con analisi tecnica?",
    showIf: () => true,
    options: [],
  },
  {
    id: "certificazione_contabile",
    section: "3. Procedura e documenti",
    label: () => "È già disponibile la certificazione contabile delle spese?",
    showIf: () => true,
    options: [],
  },
  {
    id: "fase_gse",
    section: "3. Procedura e documenti",
    label: () => "Fase comunicazioni GSE",
    showIf: () => true,
    options: [
      { value: "non_avviata", label: "Non avviata" },
      { value: "preventiva", label: "Comunicazione preventiva inviata" },
      { value: "conferma", label: "Conferma investimento da inviare/inviata" },
      { value: "completamento", label: "Completamento da comunicare/comunicato" },
      { value: "periodica", label: "Comunicazioni periodiche" },
    ],
  },
  {
    id: "conferma_20",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      "Dopo esito positivo GSE, è stato rispettato/programmato il termine di 60 giorni per la conferma e l’acconto minimo del 20% per ciascun bene?",
    showIf: (answers: IperAnswers) => Boolean(answers.fase_gse === "preventiva"),
    options: [],
  },
  {
    id: "conferma_20",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      "La conferma è stata inviata entro 60 giorni dall’esito positivo GSE e l’acconto del 20% è documentato per ciascun bene?",
    showIf: (answers: IperAnswers) => Boolean(answers.fase_gse === "conferma"),
    options: [],
  },
  {
    id: "completamento_tecnico",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      String(answers.tipo_bene) === "misto"
        ? "Per ciascun bene: interconnessione IV/V o fine lavori/entrata in funzione FER, secondo il tipo d’investimento?"
        : String(answers.tipo_bene) === "energia"
          ? "Sono terminati i lavori dell’impianto e sono verificate le condizioni di entrata in funzione?"
          : "L’interconnessione è stata effettivamente realizzata?",
    showIf: (answers: IperAnswers) => Boolean(answers.fase_gse === "completamento"),
    options: [],
  },
  {
    id: "completamento_invio",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      "La comunicazione di completamento è stata inviata entro il termine applicabile?",
    showIf: (answers: IperAnswers) => Boolean(answers.fase_gse === "completamento"),
    options: [],
  },
  {
    id: "periodica_gennaio",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      "La comunicazione annuale entro il 20 gennaio è stata inviata o non è ancora dovuta?",
    showIf: (answers: IperAnswers) => Boolean(answers.fase_gse === "periodica"),
    options: [],
  },
  {
    id: "periodica_giugno",
    section: "3. Procedura e documenti",
    label: (answers: IperAnswers) =>
      "Il piano di ammortamento entro il 30 giugno è stato inviato o non è ancora dovuto?",
    showIf: (answers: IperAnswers) => Boolean(answers.fase_gse === "periodica"),
    options: [],
  },
  {
    id: "note",
    section: "3. Procedura e documenti",
    label: () => "Note e documenti ancora da chiedere",
    showIf: () => true,
    options: [],
  },
];
