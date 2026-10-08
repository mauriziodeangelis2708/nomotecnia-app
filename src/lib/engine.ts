// Motore di pre-istruttoria — logica pura, nessun accesso a rete/DB.
// Tutti gli importi/soglie arrivano dalla tabella `rules` (configurabile da admin).
// Nessuna regola è considerata verificata finché lo stato non è "validata".

export type Status = "confermato" | "potenziale" | "non_ammissibile" | "ignoto";
export type Size = "micro" | "piccola" | "media" | "grande";
export type Answers = Record<string, unknown>;

export interface Rule {
  key: string;
  category: string;
  label: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  source: string;
  reference: string;
  status: string;
  requires_official_check: boolean;
  review_notes: string | null;
}
export type RuleMap = Record<string, Rule | undefined>;

export interface Check {
  key: string;
  label: string;
  status: Status;
  reasons: string[];
  ruleKeys: string[];
}
export interface Intervention extends Check {
  theoretical: number | null;
  documented: number;
}
export interface Result {
  size: Size | null;
  sizeStatus: Status;
  sizeReasons: string[];
  gates: Check[];
  gateStatus: Status;
  interventions: Intervention[];
  totals: {
    confirmed: number;
    potential: number;
    documented: number;
    cap: number | null;
    confirmedCapped: number;
    potentialCapped: number;
    minimum: number | null;
    meetsMinimumConfirmed: boolean | null;
    meetsMinimumPotential: boolean | null;
  };
  score: { status: "da_verificare" | "formula_validata"; note: string; inputs: Record<string, unknown> };
  warnings: string[];
}

const RANK: Record<Status, number> = { non_ammissibile: 0, ignoto: 1, potenziale: 2, confermato: 3 };
export function worst(...s: Status[]): Status {
  return s.reduce((a, b) => (RANK[b] < RANK[a] ? b : a), "confermato" as Status);
}
/** combina: un "ignoto" in un gate non annulla ma degrada a potenziale */
function gateCombine(list: Status[]): Status {
  if (list.includes("non_ammissibile")) return "non_ammissibile";
  if (list.some((s) => s !== "confermato")) return "potenziale";
  return "confermato";
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const tri = (v: unknown): "si" | "no" | "nonso" | null =>
  v === "si" || v === "no" || v === "nonso" ? v : null;
const rv = (r: RuleMap, k: string) => r[k]?.value ?? null;

export function classOf(ula: number, fatt: number, attivo: number): Size {
  if (ula < 10 && (fatt <= 2_000_000 || attivo <= 2_000_000)) return "micro";
  if (ula < 50 && (fatt <= 10_000_000 || attivo <= 10_000_000)) return "piccola";
  if (ula < 250 && (fatt <= 50_000_000 || attivo <= 43_000_000)) return "media";
  return "grande";
}

export function classifySize(a: Answers): { size: Size | null; status: Status; reasons: string[] } {
  const reasons: string[] = [];
  const assoc = tri(a.ha_associate_collegate);
  const useAgg = assoc === "si" && tri(a.dati_aggregati_disponibili) === "si";
  const year = (y: "2025" | "2024") => {
    const ula = num(useAgg ? a[`ula_agg_${y}`] : a[`ula_${y}`]);
    const f = num(useAgg ? a[`fatturato_agg_${y}`] : a[`fatturato_${y}`]);
    const t = num(useAgg ? a[`attivo_agg_${y}`] : a[`attivo_${y}`]);
    return ula === null || f === null || t === null ? null : classOf(ula, f, t);
  };
  const s25 = year("2025");
  const s24 = year("2024");
  if (!s25 && !s24) return { size: null, status: "ignoto", reasons: ["Dati ULA/fatturato/attivo mancanti."] };
  let status: Status = "confermato";
  const size = (s25 ?? s24) as Size;
  if (!s25 || !s24) {
    status = "potenziale";
    reasons.push("Disponibile un solo esercizio: la dimensione va confermata su due esercizi.");
  } else if (s25 !== s24) {
    status = "potenziale";
    reasons.push(`Dimensione diversa tra 2025 (${s25}) e 2024 (${s24}): verificare la regola dei due esercizi consecutivi.`);
  }
  if (assoc === "nonso") {
    status = worst(status, "potenziale");
    reasons.push("Non è noto se esistono imprese associate/collegate: incertezza dimensionale.");
  } else if (assoc === "si" && !useAgg) {
    status = worst(status, "potenziale");
    reasons.push("Esistono imprese associate/collegate ma i dati aggregati non sono disponibili: dimensione incerta.");
  }
  if (size === "grande") reasons.push("Supera le soglie PMI.");
  return { size, status: size === "grande" ? "non_ammissibile" : status, reasons };
}

function triCheck(key: string, label: string, v: unknown, okWhen: "si" | "no", ruleKeys: string[], msgKo: string): Check {
  const t = tri(v);
  if (t === null) return { key, label, status: "ignoto", reasons: ["Risposta non fornita."], ruleKeys };
  if (t === "nonso") return { key, label, status: "ignoto", reasons: ["Informazione non nota: da acquisire."], ruleKeys };
  return t === okWhen
    ? { key, label, status: "confermato", reasons: [], ruleKeys }
    : { key, label, status: "non_ammissibile", reasons: [msgKo], ruleKeys };
}

export function evaluate(a: Answers, rules: RuleMap, evidences: { intervention: string | null; amount: number | null }[] = []): Result {
  const warnings: string[] = [];
  const sz = classifySize(a);
  const size = sz.size;

  // --- Gate di ammissibilità soggettiva
  const gates: Check[] = [];
  const sede = tri(a.sede_lazio);
  if (sede === "si") gates.push({ key: "sede", label: "Sede nel Lazio", status: "confermato", reasons: [], ruleKeys: ["sede_lazio"] });
  else if (sede === "no") {
    const fut = tri(a.sede_lazio_entro_termine);
    gates.push({
      key: "sede", label: "Sede nel Lazio",
      status: fut === "si" ? "potenziale" : fut === "no" ? "non_ammissibile" : "ignoto",
      reasons: [fut === "si" ? "Apertura sede nel Lazio dichiarata entro il termine: verificare termine e documentazione." : fut === "no" ? "Nessuna sede nel Lazio." : "Apertura sede nel Lazio da chiarire."],
      ruleKeys: ["sede_lazio"],
    });
  } else gates.push({ key: "sede", label: "Sede nel Lazio", status: "ignoto", reasons: ["Da verificare."], ruleKeys: ["sede_lazio"] });

  const ateco = triCheck("ateco", "ATECO non escluso", a.ateco_escluso, "no", ["ateco_exclusions"], "Codice ATECO in settore escluso.");
  if (!a.ateco_codice) ateco.reasons.push("Codice ATECO non indicato.");
  if (!rules.ateco_exclusions?.value_text) {
    ateco.status = worst(ateco.status, "potenziale");
    ateco.reasons.push("Elenco esclusioni ATECO non ancora trascritto nelle regole.");
  }
  gates.push(ateco);
  gates.push({ key: "pmi", label: "Requisito PMI", status: sz.status, reasons: sz.reasons, ruleKeys: ["sme_thresholds"] });
  gates.push(triCheck("registro", "Iscrizione Registro Imprese e attività", a.iscritta_attiva, "si", [], "Impresa non iscritta/attiva."));
  gates.push(triCheck("durc", "Regolarità contributiva (DURC)", a.durc_regolare, "si", [], "DURC non regolare."));
  gates.push(triCheck("difficolta", "Non impresa in difficoltà", a.impresa_difficolta, "no", [], "Impresa in difficoltà."));
  gates.push(triCheck("procedure", "Assenza procedure concorsuali", a.procedure_concorsuali, "no", [], "Procedure concorsuali in corso."));

  const dm = tri(a.de_minimis_ricevuti);
  const dmCap = rv(rules, "de_minimis_cap");
  const dmAmt = num(a.de_minimis_importo);
  if (dm === "no") gates.push({ key: "deminimis", label: "Capienza de minimis", status: "confermato", reasons: [], ruleKeys: ["de_minimis_cap"] });
  else if (dm === "si") {
    if (dmCap === null || dmAmt === null)
      gates.push({ key: "deminimis", label: "Capienza de minimis", status: "ignoto", reasons: ["Aiuti de minimis ricevuti: massimale o importo non disponibile. Verificare RNA."], ruleKeys: ["de_minimis_cap"] });
    else
      gates.push({ key: "deminimis", label: "Capienza de minimis", status: dmAmt < dmCap ? "potenziale" : "non_ammissibile", reasons: [dmAmt < dmCap ? `Residuo stimato ${dmCap - dmAmt} EUR: confrontare con il contributo richiesto.` : "Massimale de minimis esaurito."], ruleKeys: ["de_minimis_cap"] });
  } else gates.push({ key: "deminimis", label: "Capienza de minimis", status: "ignoto", reasons: ["Da verificare su RNA."], ruleKeys: ["de_minimis_cap"] });

  const ov = tri(a.altri_voucher);
  if (ov === "si") {
    const same = tri(a.stesse_spese);
    gates.push({ key: "cumulo", label: "Cumulo con altri voucher", status: same === "no" ? "potenziale" : same === "si" ? "non_ammissibile" : "ignoto", reasons: [same === "si" ? "Stesse spese già agevolate: rischio doppio finanziamento." : "Altri voucher presenti: verificare regole di cumulo."], ruleKeys: [] });
  } else if (ov === "no") gates.push({ key: "cumulo", label: "Cumulo con altri voucher", status: "confermato", reasons: [], ruleKeys: [] });
  else gates.push({ key: "cumulo", label: "Cumulo con altri voucher", status: "ignoto", reasons: ["Da verificare."], ruleKeys: [] });

  const gateStatus = gateCombine(gates.map((g) => g.status));

  // --- Interventi
  const iv: Intervention[] = [];
  const evSum = (k: string) => evidences.filter((e) => e.intervention === k).reduce((s, e) => s + (e.amount ?? 0), 0);
  const push = (c: Check, theoretical: number | null) =>
    iv.push({ ...c, theoretical, documented: theoretical === null ? 0 : Math.min(theoretical, evSum(c.key)) });
  const bySize = (prefix: string, allowed: Size[]) => {
    if (!size || !allowed.includes(size)) return null;
    const map: Record<string, string> = { micro: "micro", piccola: "small", media: "medium" };
    return rv(rules, `${prefix}_${map[size]}`);
  };

  // Diagnosi digitale
  let diagnosiBlocks = false;
  {
    const k = ["diag_small", "diag_medium", "diag_rule"];
    if (!size) push({ key: "diagnosi", label: "Diagnosi digitale", status: "ignoto", reasons: ["Dimensione non determinata."], ruleKeys: k }, null);
    else if (size === "micro") push({ key: "diagnosi", label: "Diagnosi digitale", status: "non_ammissibile", reasons: ["Non ammissibile per micro imprese."], ruleKeys: k }, 0);
    else if (size === "piccola" || size === "media") {
      const d = tri(a.diagnosi_prevista);
      const val = size === "piccola" ? rv(rules, "diag_small") : rv(rules, "diag_medium");
      if (d === "si") push({ key: "diagnosi", label: "Diagnosi digitale", status: "confermato", reasons: ["Obbligatoria per piccole/medie: prevista."], ruleKeys: k }, val);
      else {
        diagnosiBlocks = true;
        push({ key: "diagnosi", label: "Diagnosi digitale", status: d === "no" ? "non_ammissibile" : "ignoto", reasons: ["Obbligatoria per piccole/medie: non prevista o non definita. Gli altri interventi non possono essere considerati confermati."], ruleKeys: k }, d === "no" ? 0 : val);
      }
    }
  }

  // Digital Workplace
  if (a.interesse_workplace === "si") {
    const k = ["workplace_per_employee", "workplace_categories", "workplace_min_months"];
    const reasons: string[] = [];
    const required = rv(rules, "workplace_categories") ?? 5;
    const cats = Array.isArray(a.workplace_categorie) ? (a.workplace_categorie as string[]) : [];
    const addetti = num(a.addetti_inps_luglio_2026);
    const durata = num(a.workplace_durata_mesi);
    const minM = rv(rules, "workplace_min_months");
    let st: Status = "confermato";
    if (cats.length < required) { st = "non_ammissibile"; reasons.push(`Coperte ${cats.length}/${required} categorie obbligatorie.`); }
    if (addetti === null) { st = worst(st, "ignoto"); reasons.push("Numero addetti INPS luglio 2026 non disponibile."); }
    if (minM === null) { st = worst(st, "potenziale"); reasons.push("Durata minima non configurata: da verificare sul testo ufficiale."); }
    else if (durata === null) { st = worst(st, "ignoto"); reasons.push("Durata dei servizi non indicata."); }
    else if (durata < minM) { st = "non_ammissibile"; reasons.push(`Durata ${durata} mesi inferiore al minimo ${minM}.`); }
    if (!a.sw_attuali) reasons.push("Software attuali non descritti.");
    const per = rv(rules, "workplace_per_employee");
    push({ key: "workplace", label: "Digital Workplace", status: st, reasons, ruleKeys: k }, addetti !== null && per !== null && st !== "non_ammissibile" ? addetti * per : st === "non_ammissibile" ? 0 : null);
  }

  // Digital Commerce
  if (a.interesse_commerce === "si") {
    const k = ["commerce_micro", "commerce_small", "commerce_medium", "commerce_tech"];
    const t = a.commerce_tipo;
    const val = bySize("commerce", ["micro", "piccola", "media"]);
    if (t === "saas") push({ key: "commerce", label: "Digital Commerce", status: "non_ammissibile", reasons: ["Semplice SaaS: non soddisfa i requisiti tecnici IaaS/PaaS."], ruleKeys: k }, 0);
    else if (t === "iaas" || t === "paas") {
      const ok = tri(a.commerce_requisiti_confermati);
      push({ key: "commerce", label: "Digital Commerce", status: ok === "si" ? "confermato" : "potenziale", reasons: ok === "si" ? [] : ["Requisiti tecnici IaaS/PaaS da documentare."], ruleKeys: k }, val);
    } else push({ key: "commerce", label: "Digital Commerce", status: "ignoto", reasons: ["Architettura della soluzione non definita."], ruleKeys: k }, null);
  }

  // Cybersecurity
  if (a.interesse_cyber === "si") {
    const k = ["cyber_small", "cyber_medium", "cyber_sizes"];
    if (size === "micro") push({ key: "cyber", label: "Cybersecurity", status: "non_ammissibile", reasons: ["Ammessa solo per piccole e medie imprese."], ruleKeys: k }, 0);
    else if (size === "piccola" || size === "media") {
      const ok = tri(a.cyber_perimetro_definito);
      push({ key: "cyber", label: "Cybersecurity", status: ok === "si" ? "confermato" : "potenziale", reasons: ok === "si" ? [] : ["Perimetro e servizi da definire."], ruleKeys: k }, bySize("cyber", ["piccola", "media"]));
    } else push({ key: "cyber", label: "Cybersecurity", status: "ignoto", reasons: ["Dimensione non determinata."], ruleKeys: k }, null);
  }

  // Cloud
  if (a.interesse_cloud === "si") {
    const types: [string, string, string][] = [
      ["application", "Cloud — application server", "cloud_application"],
      ["database", "Cloud — database", "cloud_database"],
      ["web", "Cloud — web server", "cloud_web"],
      ["backup", "Cloud — backup", "cloud_backup"],
    ];
    const sel = Array.isArray(a.cloud_sistemi) ? (a.cloud_sistemi as string[]) : [];
    const already = a.gia_cloud;
    const residui = tri(a.sistemi_locali_residui);
    if (sel.length === 0) warnings.push("Cloud: nessun sistema esistente on-premise indicato — nessuna migrazione attribuibile.");
    for (const [t, label, rk] of types) {
      if (!sel.includes(t)) continue;
      const reasons: string[] = [];
      let st: Status;
      const ex = tri(a[`cloud_${t}_esistente`]);
      if ((already === "si" || already === "parziale") && residui !== "si") {
        st = residui === "no" ? "non_ammissibile" : "ignoto";
        reasons.push("Impresa già in cloud: ammissibili solo sistemi locali residui reali.");
      } else if (ex === "si") st = "confermato";
      else if (ex === "no") { st = "non_ammissibile"; reasons.push("Sistema non esistente: non è una migrazione reale."); }
      else { st = "ignoto"; reasons.push("Esistenza del sistema on-premise da verificare."); }
      if (st === "confermato" && !a[`cloud_${t}_descrizione`]) { st = "potenziale"; reasons.push("Descrivere il sistema esistente (inventario)."); }
      push({ key: `cloud_${t}`, label, status: st, reasons, ruleKeys: [rk, "cloud_rule"] }, st === "non_ammissibile" ? 0 : rv(rules, rk));
    }
  }

  // Applica gate e diagnosi obbligatoria
  for (const i of iv) {
    if (gateStatus === "non_ammissibile" && i.status !== "non_ammissibile") {
      i.status = "non_ammissibile"; i.reasons.push("Requisiti soggettivi non soddisfatti.");
    } else if (gateStatus === "potenziale" && i.status === "confermato") {
      i.status = "potenziale"; i.reasons.push("Requisiti soggettivi non tutti confermati.");
    }
    if (diagnosiBlocks && i.key !== "diagnosi" && i.status === "confermato") {
      i.status = "potenziale"; i.reasons.push("Diagnosi digitale obbligatoria non prevista.");
    }
    // Ogni regola non validata impedisce lo stato "confermato" normativo pieno: segnalata ma non degradata.
  }

  const val = (i: Intervention) => (i.theoretical ?? 0);
  const confirmed = iv.filter((i) => i.status === "confermato").reduce((s, i) => s + val(i), 0);
  const potential = confirmed + iv.filter((i) => i.status === "potenziale").reduce((s, i) => s + val(i), 0);
  const documented = iv.filter((i) => i.status !== "non_ammissibile").reduce((s, i) => s + i.documented, 0);
  const cap = size === "micro" ? rv(rules, "max_micro") : size === "piccola" ? rv(rules, "max_small") : size === "media" ? rv(rules, "max_medium") : null;
  const minimum = rv(rules, "min_project");
  const capIt = (v: number) => (cap === null ? v : Math.min(v, cap));
  if (cap === null) warnings.push("Massimale non applicabile: dimensione non determinata.");
  if (sz.status !== "confermato" && size) warnings.push("Massimale applicato su dimensione non confermata.");
  if (iv.some((i) => i.theoretical === null && i.status !== "non_ammissibile")) warnings.push("Alcuni interventi non hanno valore calcolabile per dati mancanti.");

  const scoreRule = rules.score_formula;
  const score = scoreRule?.status === "validata" && scoreRule.value_text
    ? { status: "formula_validata" as const, note: `Formula validata: ${scoreRule.value_text}. Calcolo da effettuare secondo il testo ufficiale.`, inputs: { iva_2025: a.iva_volume_2025, inps_2025: a.inps_addetti_2025, premialita: a.premialita } }
    : { status: "da_verificare" as const, note: "Formula di punteggio non verificata sul testo ufficiale: nessun punteggio calcolato.", inputs: { iva_2025: a.iva_volume_2025, inps_2025: a.inps_addetti_2025, premialita: a.premialita } };

  return {
    size, sizeStatus: sz.status, sizeReasons: sz.reasons, gates, gateStatus, interventions: iv,
    totals: {
      confirmed, potential, documented, cap,
      confirmedCapped: capIt(confirmed), potentialCapped: capIt(potential), minimum,
      meetsMinimumConfirmed: minimum === null ? null : capIt(confirmed) >= minimum,
      meetsMinimumPotential: minimum === null ? null : capIt(potential) >= minimum,
    },
    score, warnings,
  };
}

export const STATUS_LABEL: Record<Status, string> = {
  confermato: "Confermato", potenziale: "Potenziale", non_ammissibile: "Non ammissibile", ignoto: "Ignoto",
};
export const SIZE_LABEL: Record<Size, string> = { micro: "Micro", piccola: "Piccola", media: "Media", grande: "Grande (non PMI)" };
