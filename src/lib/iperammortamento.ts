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
  requiredYes("termine", "Completamento dell’investimento entro il 30 settembre 2028");
  criticalYes(
    "esclusione_446",
    "Investimento già agevolato nel regime specificamente escluso dalla legge",
  );

  const kind = a.tipo_bene;
  if (!["allegato_iv", "allegato_v", "energia"].includes(String(kind))) {
    missing.push("Categoria dell’investimento");
  } else if (kind === "energia") {
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
  } else {
    requiredYes(
      "categoria_allegato",
      "Bene ricompreso nella categoria pertinente dell’Allegato IV o V",
    );
    requiredYes(
      "interconnessione",
      "Interconnessione al sistema di produzione o alla rete di fornitura",
    );
    if (kind === "allegato_iv") {
      requiredYes("requisiti_tecnici", "Caratteristiche tecniche previste per il bene materiale");
    } else {
      requiredYes(
        "funzione_software",
        "Software funzionale ai processi digitali/operativi contemplati dall’Allegato V",
      );
    }
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

export const IPER_VERSION =
  "Quadro normativo verificato al 9 ottobre 2026 · Legge 199/2025, DL 38/2026 convertito, decreto MIMIT-MEF 7 maggio 2026";
