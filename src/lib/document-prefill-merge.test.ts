import { describe, expect, it } from "vitest";
import { IMPORTABLE_FIELDS, mergeConfirmedDocumentFields } from "./document-prefill-merge";
import { STEPS } from "./questions";
import { OFFICIAL_RULES } from "./bando";
import type { DocumentProposal } from "./document-prefill-demo";

function candidate(field: string, value: string | number): DocumentProposal {
  return {
    field,
    label: field,
    value,
    sourcePage: 2,
    sourceLine: 3,
    sourceExcerpt: field + ": " + String(value),
  };
}

describe("controlled local document prefill", () => {
  it("imports only approved fields into empty questions", () => {
    const old = { iva_ve50_2025: 9000, iva_vf25_2025: "" };
    const r = mergeConfirmedDocumentFields(old, "iva", [
      candidate("iva_ve50_2025", 500000),
      candidate("iva_vf25_2025", 100000),
    ]);
    expect(r.answers).toEqual({ iva_ve50_2025: 9000, iva_vf25_2025: 100000 });
    expect(r.applied).toEqual(["iva_vf25_2025"]);
    expect(r.blocked).toEqual(["iva_ve50_2025"]);
    expect(old.iva_vf25_2025).toBe("");
  });

  it("rejects fields not belonging to the source document", () => {
    const r = mergeConfirmedDocumentFields({}, "inps", [
      candidate("iva_ve50_2025", 100000),
      candidate("addetti_inps_luglio_2026", 8),
    ]);
    expect(r.applied).toEqual(["addetti_inps_luglio_2026"]);
    expect(r.blocked).toEqual(["iva_ve50_2025"]);
  });

  it("blocks duplicates even if both proposed numbers agree", () => {
    const r = mergeConfirmedDocumentFields({}, "inps", [
      candidate("addetti_inps_luglio_2026", 8),
      candidate("addetti_inps_luglio_2026", 8),
    ]);
    expect(r.applied).toEqual([]);
    expect(r.blocked).toEqual(["addetti_inps_luglio_2026"]);
  });

  it("rejects absent provenance, invalid numbers and unknown fields", () => {
    const bad = { ...candidate("iva_vf25_2025", 10000), sourcePage: 0 };
    const r = mergeConfirmedDocumentFields({}, "iva", [
      bad,
      candidate("iva_ve50_2025", Number.NaN),
      candidate("internal_role", "admin"),
    ]);
    expect(r.applied).toEqual([]);
    expect(r.blocked).toHaveLength(3);
    expect(r.answers).toEqual({});
  });

  it("maps only to actual canonical questions in NomotecnIA", () => {
    const ids = new Set(STEPS.flatMap((step) => step.questions(OFFICIAL_RULES).map((q) => q.id)));
    for (const fields of Object.values(IMPORTABLE_FIELDS)) {
      for (const field of fields) expect(ids.has(field), field).toBe(true);
    }
    expect(ids.has("iva_volume_2025")).toBe(false);
    expect(ids.has("inps_addetti_2025")).toBe(false);
  });

  it("never treats an imported proposal as a confirmed evidence", () => {
    const r = mergeConfirmedDocumentFields({ source_document_verified: "no" }, "visura", [
      candidate("ragione_sociale", "AZIENDA DEMO SRL"),
    ]);
    expect(r.answers["source_document_verified"]).toBe("no");
    expect(r.answers["ragione_sociale"]).toBe("AZIENDA DEMO SRL");
    expect(r.answers["regime_fiscale"]).toBeUndefined();
  });
});
