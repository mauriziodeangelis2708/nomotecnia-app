import { describe, it, expect } from "vitest";
import { evaluate, classOf, type RuleMap, type Rule } from "./engine";

const mk = (key: string, value: number | null, extra: Partial<Rule> = {}): Rule => ({
  key, category: "x", label: key, value, value_text: null, unit: null, source: "s", reference: "r", status: "da_validare", requires_official_check: true, review_notes: null, ...extra,
});
const rules: RuleMap = Object.fromEntries([
  mk("diag_small", 8162.4), mk("diag_medium", 21427.2), mk("workplace_per_employee", 2270.4),
  mk("commerce_micro", 4954.8), mk("commerce_small", 8125.2), mk("commerce_medium", 15873.6),
  mk("cyber_small", 14656.8), mk("cyber_medium", 44917.2), mk("cloud_application", 17683.2),
  mk("cloud_database", 27656.4), mk("cloud_web", 14076), mk("cloud_backup", 5593.2),
  mk("min_project", 14000), mk("max_micro", 50000), mk("max_small", 100000), mk("max_medium", 150000),
  mk("workplace_categories", 5), mk("workplace_min_months", null), mk("ateco_exclusions", null, { value_text: "x" }),
  mk("score_formula", null),
].map((r) => [r.key, r]));

const okGates = { sede_lazio: "si", ateco_codice: "62.01", ateco_escluso: "no", iscritta_attiva: "si", durc_regolare: "si", impresa_difficolta: "no", procedure_concorsuali: "no", de_minimis_ricevuti: "no", altri_voucher: "no", ha_associate_collegate: "no" };
const micro = { ula_2025: 5, fatturato_2025: 500000, attivo_2025: 300000, ula_2024: 5, fatturato_2024: 400000, attivo_2024: 300000 };
const small = { ula_2025: 20, fatturato_2025: 3e6, attivo_2025: 2e6, ula_2024: 20, fatturato_2024: 3e6, attivo_2024: 2e6 };

describe("engine", () => {
  it("classifies EU sizes", () => {
    expect(classOf(5, 1e6, 1e6)).toBe("micro");
    expect(classOf(30, 5e6, 5e6)).toBe("piccola");
    expect(classOf(200, 40e6, 40e6)).toBe("media");
    expect(classOf(300, 1e6, 1e6)).toBe("grande");
  });
  it("diagnosi non ammissibile for micro", () => {
    const r = evaluate({ ...okGates, ...micro }, rules);
    expect(r.interventions.find((i) => i.key === "diagnosi")?.status).toBe("non_ammissibile");
  });
  it("cyber non ammissibile for micro", () => {
    const r = evaluate({ ...okGates, ...micro, interesse_cyber: "si" }, rules);
    expect(r.interventions.find((i) => i.key === "cyber")?.status).toBe("non_ammissibile");
  });
  it("small with diagnosi gets 8162.40 confirmed", () => {
    const r = evaluate({ ...okGates, ...small, diagnosi_prevista: "si" }, rules);
    const d = r.interventions.find((i) => i.key === "diagnosi")!;
    expect(d.status).toBe("confermato");
    expect(d.theoretical).toBe(8162.4);
  });
  it("small without diagnosi cannot have confirmed interventions", () => {
    const r = evaluate({ ...okGates, ...small, diagnosi_prevista: "no", interesse_cyber: "si", cyber_perimetro_definito: "si" }, rules);
    expect(r.interventions.find((i) => i.key === "cyber")?.status).toBe("potenziale");
  });
  it("simple SaaS commerce is non ammissibile", () => {
    const r = evaluate({ ...okGates, ...micro, interesse_commerce: "si", commerce_tipo: "saas" }, rules);
    expect(r.interventions.find((i) => i.key === "commerce")?.status).toBe("non_ammissibile");
  });
  it("workplace needs all 5 categories; value = addetti × 2270.40", () => {
    const base = { ...okGates, ...micro, interesse_workplace: "si", addetti_inps_luglio_2026: 3, workplace_durata_mesi: 12 };
    expect(evaluate({ ...base, workplace_categorie: ["c1", "c2"] }, rules).interventions[1].status).toBe("non_ammissibile");
    const w = evaluate({ ...base, workplace_categorie: ["c1", "c2", "c3", "c4", "c5"] }, rules).interventions.find((i) => i.key === "workplace")!;
    expect(w.status).toBe("potenziale"); // durata minima non configurata
    expect(w.theoretical).toBeCloseTo(6811.2);
  });
  it("cloud: already in cloud without local residuals is not attributable", () => {
    const r = evaluate({ ...okGates, ...micro, interesse_cloud: "si", gia_cloud: "si", sistemi_locali_residui: "no", cloud_sistemi: ["database"] }, rules);
    expect(r.interventions.find((i) => i.key === "cloud_database")?.status).toBe("non_ammissibile");
  });
  it("cloud: non-existing system is not a real migration", () => {
    const r = evaluate({ ...okGates, ...micro, interesse_cloud: "si", gia_cloud: "no", cloud_sistemi: ["web"], cloud_web_esistente: "no" }, rules);
    expect(r.interventions.find((i) => i.key === "cloud_web")?.status).toBe("non_ammissibile");
  });
  it("no contribution attributed when sede not in Lazio", () => {
    const r = evaluate({ ...okGates, ...small, sede_lazio: "no", sede_lazio_entro_termine: "no", diagnosi_prevista: "si" }, rules);
    expect(r.totals.confirmed).toBe(0);
    expect(r.gateStatus).toBe("non_ammissibile");
  });
  it("micro cap 50000 applied", () => {
    const r = evaluate({ ...okGates, ...micro, interesse_cloud: "si", gia_cloud: "no", cloud_sistemi: ["application", "database", "web", "backup"],
      cloud_application_esistente: "si", cloud_database_esistente: "si", cloud_web_esistente: "si", cloud_backup_esistente: "si",
      cloud_application_descrizione: "a", cloud_database_descrizione: "a", cloud_web_descrizione: "a", cloud_backup_descrizione: "a" }, rules);
    expect(r.totals.confirmedCapped).toBe(50000);
  });
  it("score always 'da verificare' when formula not validated", () => {
    expect(evaluate({}, rules).score.status).toBe("da_verificare");
  });
  it("associated firms without aggregated data → size uncertain", () => {
    const r = evaluate({ ...okGates, ...micro, ha_associate_collegate: "si", dati_aggregati_disponibili: "no" }, rules);
    expect(r.sizeStatus).toBe("potenziale");
  });
});
