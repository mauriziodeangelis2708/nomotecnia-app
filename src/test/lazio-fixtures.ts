import type { Answers, Checklist, RuleMap } from "../lib/engine";
import { evaluate } from "../lib/engine";
import { OFFICIAL_RULES, GENERAL_CHECKS, TECH_CHECKS, COMMON_TECH_CHECKS } from "../lib/bando";
const docs: Checklist = Object.fromEntries(
  [
    "visura",
    "impresa_giovanile",
    "modello_expost",
    "modello1_exante",
    "polizza_o_modello3",
    "modello2_exante",
    "precedenti_voucher",
    "inps_attestazione_luglio_2026",
    "iva_modello_2026",
    "redditi_2025",
    "cert_genere",
    "cert_ambiente",
    "iva_oss_2025",
    "attestazione_editoria",
  ].map((k) => [k, { status: "verificato" }]),
);
const micro: Answers = {
  ...Object.fromEntries(GENERAL_CHECKS.map(([k]) => [k, "si"])),
  conflitti_interesse: "no",
  ha_associate_collegate: "no",
  operazioni_straordinarie: "no",
  partecipazione_pubblica_rilevante: "no",
  giovani_assetto: "Assetto societario e date verificati",
  ula_2024: 5,
  ula_2025: 5,
  fatturato_2024: 500000,
  fatturato_2025: 500000,
  attivo_2024: 300000,
  attivo_2025: 300000,
  sede_operativa_lazio: "si",
  ateco_codice: "62.01",
  ateco_escluso: "no",
  attivita_esclusioni_verificate: "si",
  iscritta_attiva: "si",
  durc_regolare: "si",
  procedure_concorsuali: "no",
  de_minimis_impresa_unica: 0,
  de_minimis_verificato: "si",
  doppio_finanziamento_assente: "si",
  precedenti_voucher_lazio: "no",
  relazione_micro_exante: "si",
  fornitore_micro_unico: "si",
  saldo_entro_sei_mesi: "si",
  interesse_workplace: "no",
  interesse_commerce: "no",
  interesse_cyber: "no",
  interesse_cloud: "no",
  regime_fiscale: "iva",
  iva_ve50_2025: 1000000,
  iva_vf25_2025: 0,
  addetti_inps_luglio_2026: 20,
  vendite_oss: "no",
  integrazione_editoria: "no",
  cert_genere_valida: "si",
  impresa_giovanile: "si",
  cert_ambiente_valida: "si",
};
const small: Answers = {
  ...micro,
  ula_2024: 20,
  ula_2025: 20,
  diagnosi_prevista: "si",
  diagnosi_manager: "si",
  diagnosi_tempi: "si",
};
const medium: Answers = { ...small, ula_2024: 100, ula_2025: 100 };
const cloud = (types = ["database"]): Answers => ({
  interesse_cloud: "si",
  cloud_sistemi: types,
  ...Object.fromEntries(
    types.flatMap((t) => [
      [`cloud_${t}_esistente`, "si"],
      [
        `cloud_${t}_descrizione`,
        "Server locale aziendale PostgreSQL con VM conforme alla definizione",
      ],
      [`cloud_${t}_durata_mesi`, 36],
      ...TECH_CHECKS["cloud"]!.map(([k]) => [`cloud_${t}_${k}`, "si"]),
      ...COMMON_TECH_CHECKS.map(([k]) => [`cloud_${t}_${k}`, "si"]),
    ]),
  ),
});
const workplace: Answers = {
  interesse_workplace: "si",
  workplace_categorie: ["c1", "c2", "c3", "c4", "c5"],
  workplace_postazioni: 7,
  addetti_inps_luglio_2026: 20,
  inps_accentrato: "no",
  workplace_durata_mesi: 36,
  ...Object.fromEntries(
    [
      ...TECH_CHECKS["workplace"]!,
      ...COMMON_TECH_CHECKS.map(([k, l]) => [`workplace_${k}`, l] as const),
    ].map(([k]) => [k, "si"]),
  ),
};
const commerce: Answers = {
  interesse_commerce: "si",
  commerce_tipo: "iaas",
  commerce_durata_mesi: 36,
  ...Object.fromEntries(
    [
      ...TECH_CHECKS["commerce"]!,
      ...COMMON_TECH_CHECKS.map(([k, l]) => [`commerce_${k}`, l] as const),
    ].map(([k]) => [k, "si"]),
  ),
};
const cyber: Answers = {
  interesse_cyber: "si",
  cyber_soluzioni: ["s1"],
  cyber_durata_mesi: 36,
  ...Object.fromEntries(
    [
      ...TECH_CHECKS["cyber"]!,
      ...COMMON_TECH_CHECKS.filter(([k]) => k !== "fornitore_ict_unitario").map(
        ([k, l]) => [`cyber_${k}`, l] as const,
      ),
    ].map(([k]) => [k, "si"]),
  ),
};
const ev = (a: Answers = {}, r: RuleMap = OFFICIAL_RULES, cl: Checklist = docs) =>
  evaluate({ ...micro, ...cloud(), ...a }, r, [], cl);

export { micro, small, medium, cloud, workplace, commerce, cyber, docs, ev };
