import { describe, expect, it } from "vitest";
import { assessIperammortamento, calculateIperUplift } from "./iperammortamento";

const coherentBase = {
  italia: "si",
  procedura_crisi: "no",
  sanzioni_231: "no",
  sicurezza_durc: "si",
  bene_nuovo: "si",
  termine: "si",
  esclusione_446: "no",
  tipo_bene: "allegato_iv",
  categoria_allegato: "si",
  interconnessione: "si",
  requisiti_tecnici: "si",
  altri_aiuti: "no",
  perizia: "si",
  certificazione_contabile: "si",
};

describe("pre-assessment Iperammortamento 2026", () => {
  it("calcola la maggiorazione progressiva per scaglioni senza chiamarla risparmio fiscale", () => {
    expect(calculateIperUplift(2_500_000)).toEqual({ amount: 4_500_000, capped: false });
    expect(calculateIperUplift(10_000_000)).toEqual({ amount: 12_000_000, capped: false });
    expect(calculateIperUplift(25_000_000)).toEqual({ amount: 17_000_000, capped: true });
  });

  it("segnala un criterio ostativo senza dichiarare una decisione ufficiale", () => {
    const result = assessIperammortamento({ ...coherentBase, procedura_crisi: "si" });
    expect(result.status).toBe("ostacolo");
    expect(result.blockers).toContain(
      "Procedura di liquidazione/insolvenza o procedimento in corso",
    );
  });

  it("non marca come coerente un caso con interconnessione ignota", () => {
    const result = assessIperammortamento({ ...coherentBase, interconnessione: "non_so" });
    expect(result.status).toBe("da_verificare");
    expect(result.missing).toContain(
      "Interconnessione al sistema di produzione o alla rete di fornitura",
    );
  });

  it("applica la valutazione energetica specifica per gli impianti FER", () => {
    const result = assessIperammortamento({
      ...coherentBase,
      tipo_bene: "energia",
      autoconsumo: "si",
      impianto_ammesso: "si",
      dimensionamento: "no",
      sito_pod: "si",
      accumulo: "no",
    });
    expect(result.status).toBe("ostacolo");
    expect(result.blockers).toContain("Dimensionamento entro i limiti di producibilità previsti");
  });

  it("richiede il controllo di conferma e acconto quando è partita la procedura GSE", () => {
    const result = assessIperammortamento({
      ...coherentBase,
      fase_gse: "preventiva",
      conferma_20: "non_so",
    });
    expect(result.status).toBe("da_verificare");
    expect(result.missing).toContain(
      "Conferma entro 60 giorni dall’esito positivo e acconto del 20% per ciascun bene",
    );
  });
});
