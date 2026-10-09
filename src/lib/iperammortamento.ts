export interface IperAnswers {
  [key: string]: string | number | undefined;
  _assessment_type?: string;
  italia?: string;
  procedura_crisi?: string;
  sanzioni_231?: string;
  sicurezza_durc?: string;
  bene_nuovo?: string;
  termine?: string;
  esclusione_446?: string;
  tipo_bene?: string;
  tipo_energia?: string;
  calore_processo?: string;
  calore_non_cessibile?: string;
  fonte_termica_ammessa?: string;
  categoria_allegato?: string;
  interconnessione?: string;
  requisiti_tecnici?: string;
  funzione_software?: string;
  autoconsumo?: string;
  impianto_ammesso?: string;
  dimensionamento?: string;
  sito_pod?: string;
  accumulo?: string;
  altri_aiuti?: string;
  cumulo_verificato?: string;
  perizia?: string;
  certificazione_contabile?: string;
  fase_gse?: string;
  conferma_20?: string;
  completamento_tecnico?: string;
  completamento_invio?: string;
  periodica_gennaio?: string;
  periodica_giugno?: string;
  costo_ammissibile?: number;
  fabbisogno_kwh?: number;
  producibilita_kwh?: number;
  note?: string;
  denominazione?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  forma_giuridica?: string;
  data_costituzione?: string;
  data_iscrizione_registro?: string;
  sede_legale_indirizzo?: string;
  sede_legale_comune?: string;
  sede_legale_provincia?: string;
  sede_legale_cap?: string;
  pec?: string;
  email?: string;
  telefono?: string;
  firmatario_tipo?: string;
  firmatario_nome?: string;
  firmatario_cf?: string;
  referente_nome?: string;
  referente_email?: string;
  referente_telefono?: string;
  struttura_nome?: string;
  struttura_indirizzo?: string;
  struttura_comune?: string;
  struttura_provincia?: string;
  struttura_cap?: string;
  struttura_sezione_catastale?: string;
  struttura_foglio?: string;
  struttura_particella?: string;
  struttura_subalterno?: string;
  beni_ivv_json?: string;
  impianti_fer_json?: string;
  dichiarazione_investimento_fer?: string;
  pratica_nptr?: string;
  conferma_data_esito?: string;
  conferma_data_invio?: string;
  conferma_totale_acconti?: number;
  documenti_disponibili?: string;
}
export type IperStatus = "ostacolo" | "da_verificare" | "coerente";

export function calculateIperUplift(cost: number) {
  const eligibleCost = Math.min(Math.max(0, cost), 20_000_000);
  const amount =
    Math.min(eligibleCost, 2_500_000) * 1.8 +
    Math.min(Math.max(eligibleCost - 2_500_000, 0), 7_500_000) +
    Math.min(Math.max(eligibleCost - 10_000_000, 0), 10_000_000) * 0.5;
  return { amount, capped: cost > 20_000_000 };
}

export function assessIperammortamento(a: IperAnswers) {
  const blockers: string[] = [];
  const checks: string[] = [];
  const missing: string[] = [];
  const has = (key: string) => String(a[key] ?? "").trim().length > 0;
  const requiredFields: [string, string][] = [
    ["denominazione", "Denominazione operatore GSE"],
    ["partita_iva", "Partita IVA dell’operatore GSE"],
    ["codice_fiscale", "Codice fiscale dell’operatore GSE"],
    ["forma_giuridica", "Tipologia operatore GSE / forma giuridica"],
    ["data_costituzione", "Data di costituzione dell’impresa"],
    ["data_iscrizione_registro", "Data di iscrizione al Registro Imprese"],
    ["sede_legale_indirizzo", "Indirizzo della sede legale dell’operatore"],
    ["pec", "PEC dell’impresa"],
    ["email", "Email dell’impresa"],
    ["telefono", "Telefono dell’impresa"],
    ["firmatario_tipo", "Ruolo del firmatario della comunicazione GSE"],
    ["firmatario_nome", "Nome e cognome del firmatario GSE"],
    ["firmatario_cf", "Codice fiscale del firmatario GSE"],
    ["referente_nome", "Referente GSE da contattare"],
    ["referente_email", "Email del referente GSE"],
    ["referente_telefono", "Cellulare del referente GSE"],
    ["struttura_nome", "Denominazione della struttura produttiva"],
    ["struttura_indirizzo", "Indirizzo della struttura produttiva"],
    ["struttura_comune", "Comune della struttura produttiva"],
    ["struttura_provincia", "Provincia della struttura produttiva"],
    ["struttura_cap", "CAP della struttura produttiva"],
    ["struttura_sezione_catastale", "Sezione catastale della struttura (o NP)"],
    ["struttura_foglio", "Foglio catastale della struttura"],
    ["struttura_particella", "Particella catastale della struttura"],
    ["struttura_subalterno", "Sub prevalente catastale della struttura (o NP)"],
  ];
  for (const [key, label] of requiredFields) if (!has(key)) missing.push(label);
  if (has("data_costituzione") && has("data_iscrizione_registro")) {
    const constitution = String(a["data_costituzione"]);
    const registration = String(a["data_iscrizione_registro"]);
    const today = new Date().toISOString().slice(0, 10);
    if (
      !isISODate(constitution) ||
      !isISODate(registration) ||
      registration < constitution ||
      registration > today
    ) {
      missing.push(
        "Date di costituzione/iscrizione da verificare: l’iscrizione deve essere tra costituzione e compilazione GSE",
      );
    }
  }
  if (a["dichiarazioni_gse"] !== "si") {
    missing.push("Dichiarazioni DSAN GSE da verificare e confermare nel portale ufficiale");
  }

  const criticalYes = (key: string, label: string) => {
    if (a[key] === "si") blockers.push(label);
    else if (a[key] !== "no") missing.push(label);
  };
  const requiredYes = (key: string, label: string) => {
    if (a[key] === "no") blockers.push(label);
    else if (a[key] !== "si") missing.push(label);
  };

  requiredYes("italia", "Impresa residente o stabile organizzazione in Italia");
  criticalYes("procedura_crisi", "Procedura di liquidazione/insolvenza o procedimento in corso");
  criticalYes("sanzioni_231", "Sanzione interdittiva rilevante");
  requiredYes("sicurezza_durc", "Conformità sicurezza sul lavoro e regolarità contributiva");
  requiredYes("bene_nuovo", "Bene nuovo e strumentale all’attività d’impresa");
  requiredYes(
    "termine",
    "Investimento nel periodo 1° gennaio 2026–30 settembre 2028 secondo i criteri applicabili",
  );
  criticalYes(
    "esclusione_446",
    "Investimento già agevolato nel regime specificamente escluso dalla legge",
  );

  const kind = a.tipo_bene;
  if (!["allegato_iv", "allegato_v", "beni_iv_v", "energia", "misto"].includes(String(kind))) {
    missing.push("Categoria dell’investimento");
  }
  if (kind === "energia" || kind === "misto") {
    requiredYes("autoconsumo", "Impianto destinato all’autoconsumo della struttura produttiva");
    requiredYes("impianto_ammesso", "Tecnologia e componenti conformi ai requisiti della misura");
    const energyKind = a.tipo_energia;
    if (!["elettrica", "termica", "entrambe"].includes(String(energyKind))) {
      missing.push("Tipologia di energia prodotta e relativa verifica tecnica");
    }
    if (energyKind === "elettrica" || energyKind === "entrambe") {
      requiredYes(
        "dimensionamento",
        "Produzione elettrica entro il limite del 105%, calcolato secondo il decreto",
      );
    }
    if (energyKind === "termica" || energyKind === "entrambe") {
      requiredYes("calore_processo", "Calore destinato esclusivamente al processo produttivo");
      requiredYes("calore_non_cessibile", "Calore non cedibile a terzi");
      requiredYes(
        "fonte_termica_ammessa",
        "Alimentazione termica conforme alle condizioni del decreto",
      );
    }
    if (a.sito_pod !== "si")
      missing.push("Ubicazione, POD e collegamento alla struttura produttiva");
    if (a.accumulo !== "si" && a.accumulo !== "no")
      missing.push("Presenza e configurazione degli eventuali sistemi di accumulo");
  }
  if (kind === "allegato_iv" || kind === "allegato_v" || kind === "beni_iv_v" || kind === "misto") {
    requiredYes(
      "categoria_allegato",
      "Bene ricompreso nella categoria pertinente dell’Allegato IV o V",
    );
    requiredYes(
      "interconnessione",
      "Interconnessione al sistema di produzione o alla rete di fornitura",
    );
    if (kind === "allegato_iv" || kind === "beni_iv_v" || kind === "misto") {
      requiredYes("requisiti_tecnici", "Caratteristiche tecniche previste per il bene materiale");
    }
    if (kind === "allegato_v" || kind === "beni_iv_v" || kind === "misto") {
      requiredYes(
        "funzione_software",
        "Software funzionale ai processi digitali/operativi contemplati dall’Allegato V",
      );
    }
  }

  const ivvRows = safeRows(a.beni_ivv_json);
  const ferRows = safeRows(a.impianti_fer_json);
  if (kind === "allegato_iv" || kind === "allegato_v" || kind === "beni_iv_v" || kind === "misto") {
    if (!ivvRows.length)
      missing.push("Almeno una scheda bene Allegato IV/V da compilare per il GSE");
    ivvRows.forEach((row, index) => {
      for (const key of [
        "categoria",
        "completamento",
        "interconnessione",
        "bene_complesso",
        "costo_netto",
        "coefficiente",
      ]) {
        if (!String(row[key] ?? "").trim())
          missing.push(`Bene IV/V ${index + 1}: campo ${key} richiesto dal GSE`);
      }
      if (row["bene_complesso"] === "Sì" && !String(row["descrizione_complesso"] ?? "").trim()) {
        missing.push(`Bene IV/V ${index + 1}: descrizione del bene complesso`);
      }
      const start = "2026-01-01";
      const end = "2028-09-30";
      const completion = String(row["completamento"] ?? "");
      const interconnection = String(row["interconnessione"] ?? "");
      if (completion && (completion < start || completion > end))
        missing.push(
          `Bene IV/V ${index + 1}: data di completamento fuori dal periodo 01/01/2026–30/09/2028`,
        );
      if (
        interconnection &&
        (interconnection < start ||
          interconnection > end ||
          (completion && interconnection < completion))
      )
        missing.push(
          `Bene IV/V ${index + 1}: data di interconnessione da verificare rispetto al completamento e al periodo ammesso`,
        );
      const cost = Number(row["costo_netto"]);
      if (row["costo_netto"] && (!Number.isFinite(cost) || cost < 0))
        missing.push(`Bene IV/V ${index + 1}: costo netto non numerico o negativo`);
      const coefficient = Number(row["coefficiente"]);
      if (
        row["coefficiente"] &&
        (!Number.isFinite(coefficient) || coefficient < 0 || coefficient > 100)
      )
        missing.push(
          `Bene IV/V ${index + 1}: coefficiente di ammortamento da verificare (percentuale)`,
        );
    });
  }
  if (kind === "energia" || kind === "misto") {
    if (!ferRows.length) missing.push("Almeno una scheda impianto FER da compilare per il GSE");
    ferRows.forEach((row, index) => {
      for (const key of [
        "fonte",
        "potenza",
        "completamento",
        "entrata_esercizio",
        "costo_netto",
        "coefficiente",
      ]) {
        if (!String(row[key] ?? "").trim())
          missing.push(`Impianto FER ${index + 1}: campo ${key} richiesto dal GSE`);
      }
      const start = "2026-01-01";
      const end = "2028-09-30";
      const completion = String(row["completamento"] ?? "");
      const operation = String(row["entrata_esercizio"] ?? "");
      if (completion && (completion < start || completion > end))
        missing.push(
          `Impianto FER ${index + 1}: data di completamento fuori dal periodo 01/01/2026–30/09/2028`,
        );
      if (
        operation &&
        (operation < start || operation > end || (completion && operation < completion))
      )
        missing.push(`Impianto FER ${index + 1}: data di entrata in funzione da verificare`);
      const cost = Number(row["costo_netto"]);
      if (row["costo_netto"] && (!Number.isFinite(cost) || cost < 0))
        missing.push(`Impianto FER ${index + 1}: costo netto non numerico o negativo`);
      const coefficient = Number(row["coefficiente"]);
      if (
        row["coefficiente"] &&
        (!Number.isFinite(coefficient) || coefficient < 0 || coefficient > 100)
      )
        missing.push(
          `Impianto FER ${index + 1}: coefficiente di ammortamento da verificare (percentuale)`,
        );
    });
    if (!has("pod")) missing.push("Codice POD della struttura produttiva");
    if (a.producibilita_kwh === undefined)
      missing.push("Producibilità complessiva degli impianti FER (kWh)");
    if (a.fabbisogno_kwh === undefined)
      missing.push("Consumo elettrico annuo della struttura (kWh)");
    if (
      (a.tipo_energia === "termica" || a.tipo_energia === "entrambe") &&
      a["fabbisogno_termico_equivalente"] === undefined
    ) {
      missing.push("Fabbisogno elettrico equivalente dei consumi termici, se applicabile");
    }
    if (
      ferRows.filter((row) =>
        String(row["fonte"] ?? "")
          .toLowerCase()
          .includes("accumulo"),
      ).length > 1
    ) {
      missing.push("Il GSE consente al massimo un sistema di accumulo per comunicazione");
    }
  }

  if (a.fase_gse === "conferma") {
    const allRows = [...ivvRows, ...ferRows];
    if (!allRows.length)
      missing.push("Schede dei beni preventivati da confermare o dichiarare decaduti");
    allRows.forEach((row, index) => {
      const prefix = `Bene/impianto ${index + 1} — conferma GSE`;
      const state = String(row["stato_bene"] ?? "");
      if (!state) missing.push(`${prefix}: stato confermato/decaduto`);
      if (state.toLowerCase() === "decaduto") return;
      if (!state) return;
      if (!["confermato", "decaduto"].includes(state.toLowerCase())) {
        missing.push(`${prefix}: valore stato non riconosciuto`);
      }
      if (!String(row["leasing"] ?? "").trim())
        missing.push(`${prefix}: indicare se è stato usato il leasing`);
      if (
        String(row["leasing"] ?? "").toLowerCase() === "sì" ||
        String(row["leasing"] ?? "").toLowerCase() === "si"
      ) {
        if (!String(row["importo_leasing"] ?? "").trim())
          missing.push(`${prefix}: importo leasing`);
      } else {
        for (const key of [
          "data_ultima_quota_acconto",
          "importo_ultima_quota_acconto",
          "acconto_totale",
        ]) {
          if (!String(row[key] ?? "").trim())
            missing.push(`${prefix}: campo ${key} per l’acconto del 20%`);
        }
      }
      if (!String(row["fatture"] ?? "").trim())
        missing.push(`${prefix}: riferimenti alle fatture/documenti di acquisto`);
    });
  }

  if (a.altri_aiuti === "si") {
    requiredYes(
      "cumulo_verificato",
      "Cumulo verificato: niente doppio finanziamento delle stesse quote di costo e base netta degli altri contributi",
    );
  } else if (a.altri_aiuti !== "no") {
    missing.push("Presenza di altri contributi o agevolazioni sugli stessi costi");
  }

  if (a.perizia !== "si") {
    missing.push("Perizia tecnica asseverata e analisi tecnica");
    if (a.perizia === "no")
      checks.push("Pianificare l’incarico a ingegnere/perito abilitato o ente accreditato.");
  }
  if (a.certificazione_contabile !== "si") {
    missing.push("Certificazione contabile delle spese");
    if (a.certificazione_contabile === "no")
      checks.push(
        "Pianificare la certificazione con revisore legale/società di revisione abilitata.",
      );
  }

  if (a.fase_gse === "preventiva" || a.fase_gse === "conferma") {
    requiredYes(
      "conferma_20",
      "Conferma entro 60 giorni dall’esito positivo e acconto del 20% per ciascun bene",
    );
  }
  if (a.fase_gse === "completamento") {
    requiredYes(
      "completamento_tecnico",
      kind === "energia"
        ? "Fine lavori dell’impianto energetico e condizioni di entrata in funzione"
        : "Interconnessione effettivamente realizzata",
    );
    requiredYes(
      "completamento_invio",
      "Comunicazione di completamento inviata entro il termine previsto",
    );
  }
  if (a.fase_gse === "periodica") {
    requiredYes("periodica_gennaio", "Comunicazione periodica entro il 20 gennaio, se già dovuta");
    requiredYes("periodica_giugno", "Piano di ammortamento entro il 30 giugno, se già dovuto");
  }

  const status: IperStatus = blockers.length
    ? "ostacolo"
    : missing.length
      ? "da_verificare"
      : "coerente";
  const stage = String(a.fase_gse ?? "non_avviata");

  return {
    status,
    blockers,
    missing: [...new Set(missing)],
    checks,
    stage,
    note: "Pre-assessment basato sulle risposte inserite. Non determina l’ammissibilità e non sostituisce le verifiche del GSE, la perizia tecnica o il parere fiscale.",
  };
}

function safeRows(value: unknown): Record<string, unknown>[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      : [];
  } catch {
    return [];
  }
}

function isISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const IPER_VERSION =
  "Quadro normativo verificato al 9 ottobre 2026 · Legge 199/2025, DL 38/2026 convertito, decreto MIMIT-MEF 7 maggio 2026";
