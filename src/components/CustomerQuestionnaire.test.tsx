import { describe, expect, it } from "vitest";
import { customerSections } from "./CustomerQuestionnaire";
const fields = (scheme: string, answers = {}) =>
  customerSections(scheme, answers).flatMap((s) => s.fields);
describe("customer questionnaire compatibility", () => {
  it("offers canonical Iper yes/no/unknown values instead of free text", () => {
    const q = fields("iperammortamento").find((f) => f.id === "italia")!;
    expect(q.type).toBe("select");
    expect(q.options?.map((o) => o.value)).toEqual(["si", "no", "non_so"]);
  });
  it("shows the interconnection follow-up only for relevant investments", () => {
    expect(fields("iperammortamento", { tipo_bene: "allegato_v" }).map((f) => f.id)).toContain(
      "interconnessione",
    );
    expect(fields("iperammortamento", { tipo_bene: "energia" }).map((f) => f.id)).not.toContain(
      "interconnessione",
    );
  });
  it("preserves structured investment entry and numeric eligible cost", () => {
    const fs = fields("iperammortamento", { tipo_bene: "misto" });
    expect(fs.find((f) => f.id === "costo_ammissibile")?.type).toBe("number");
    expect(fs.map((f) => f.id)).toContain("beni_ivv_json");
    expect(fs.map((f) => f.id)).toContain("impianti_fer_json");
  });
});
