import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AssessmentReport,
  displayAnswer,
  isIperAssessment,
  type ReportData,
} from "./AssessmentReport";
import { OFFICIAL_RULES } from "@/lib/bando";
import { IPER_REPORT_FIELDS } from "@/lib/iper-report-fields";
const base: ReportData = {
  id: "test-report",
  title: "Valutazione di prova",
  status: "bozza",
  updated_at: "2026-10-09T12:00:00Z",
  answers: {},
  checklist: {},
  clients: {
    ragione_sociale: "Impresa di prova",
    partita_iva: "00000000000",
    comune: "Roma",
    referente: "Referente prova",
  },
};
describe("Report della singola valutazione", () => {
  it("include risposte, documenti, note ed evidenze anche per Lazio incompleto", () => {
    render(
      <AssessmentReport
        assessment={{ ...base, answers: { pec: "prova@example.invalid" } }}
        rules={OFFICIAL_RULES}
        notes={[
          {
            id: "n",
            body: "Nota specifica della valutazione",
            section: "Generale",
            created_at: base.updated_at,
          },
        ]}
        evidences={[
          {
            id: "e",
            title: "Preventivo di prova",
            kind: "preventivo",
            amount: 12500,
            description: "Descrizione completa",
            reference: "RIF-TEST",
            intervention: "cloud",
            created_at: base.updated_at,
          },
        ]}
      />,
    );
    expect(screen.getByText("prova@example.invalid")).toBeInTheDocument();
    expect(screen.getByText("Checklist documentale")).toBeInTheDocument();
    expect(screen.getByText("Nota specifica della valutazione")).toBeInTheDocument();
    expect(screen.getByText("Descrizione completa")).toBeInTheDocument();
    expect(screen.getAllByText("Non compilato").length).toBeGreaterThan(0);
  });
  it("report Iper incompleto non usa mai il motore Lazio e non inventa importi", () => {
    render(
      <AssessmentReport
        assessment={{ ...base, answers: { _assessment_type: "iperammortamento_2026" } }}
        rules={{}}
      />,
    );
    expect(
      screen.getByText("Valutazione incompleta: servono verifiche o informazioni"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Maggiorazione teorica: Non determinabile/)).toBeInTheDocument();
    expect(screen.queryByText("Checklist documentale")).not.toBeInTheDocument();
    expect(screen.queryByText(/Residuo de minimis/)).not.toBeInTheDocument();
  });
  it("riporta gli ostacoli e le singole schede investimento con etichette leggibili", () => {
    render(
      <AssessmentReport
        assessment={{
          ...base,
          answers: {
            _assessment_type: "iperammortamento_2026",
            italia: "no",
            tipo_bene: "allegato_v",
            costo_ammissibile: 10000,
            beni_ivv_json: JSON.stringify([
              { descrizione: "Software IA prova", costo_netto: "10000" },
            ]),
          },
        }}
        rules={{}}
      />,
    );
    expect(
      screen.getByText("Possibile ostacolo dichiarato: verifica necessaria"),
    ).toBeInTheDocument();
    expect(screen.getByText("Software IA prova")).toBeInTheDocument();
    expect(screen.getByText(/Maggiorazione teorica:.*18.000/)).toBeInTheDocument();
    expect(screen.getByText("Software o bene immateriale – Allegato V")).toBeInTheDocument();
  });
  it("mantiene valori non più applicabili senza presentarli come risposte attive", () => {
    render(
      <AssessmentReport
        assessment={{
          ...base,
          answers: {
            _assessment_type: "iperammortamento_2026",
            tipo_bene: "allegato_v",
            autoconsumo: "si",
          },
        }}
        rules={{}}
      />,
    );
    expect(
      screen.getByText("Altri dati salvati, inclusi eventuali campi non più applicabili"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "L’energia prodotta è destinata all’autoconsumo della struttura produttiva?",
      ),
    ).not.toBeInTheDocument();
  });
  it("usa prima il tipo salvato, con fallback per valutazioni precedenti", () => {
    expect(isIperAssessment({ ...base, title: "Iperammortamento 2026 · Prova" })).toBe(true);
    expect(
      isIperAssessment({
        ...base,
        title: "Titolo personalizzato",
        answers: { _assessment_type: "iperammortamento_2026" },
      }),
    ).toBe(true);
    expect(displayAnswer(0)).toBe("0");
    expect(displayAnswer(["si", "no"])).toBe("Sì; No");
  });
  it("rispetta le diramazioni IV/V, energia e fase GSE", () => {
    const visible = (a: Record<string, string>) =>
      IPER_REPORT_FIELDS.filter((q) => q.showIf(a)).map((q) => q.id);
    expect(visible({ tipo_bene: "allegato_v" })).toContain("funzione_software");
    expect(visible({ tipo_bene: "energia", tipo_energia: "termica" })).toContain("calore_processo");
    expect(visible({ tipo_bene: "energia", tipo_energia: "termica" })).not.toContain(
      "interconnessione",
    );
    expect(visible({ fase_gse: "conferma" }).filter((x) => x === "conferma_20")).toHaveLength(1);
  });
});
