import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultView } from "./ResultView";
import { QuestionField } from "./QuestionField";
import { evaluate } from "@/lib/engine";
import { STEPS } from "@/lib/questions";
import { BANDO_VERSION, OFFICIAL_RULES } from "@/lib/bando";
describe("Indicazioni mostrate all'operatore", () => {
  it("nessuna soglia sconosciuta è presentata come non raggiunta", () => {
    render(<ResultView r={evaluate({}, {})} rules={{}} />);
    expect(screen.getByText(/non determinabile: dati o regole mancanti/)).toBeInTheDocument();
    expect(screen.queryByText("non raggiunta")).not.toBeInTheDocument();
    expect(screen.getByText("Spese/preventivi registrati")).toBeInTheDocument();
    expect(screen.queryByText("Valore documentato")).not.toBeInTheDocument();
  });
  it("versione e limiti normativi compaiono anche nel report compatto", () => {
    render(<ResultView r={evaluate({}, OFFICIAL_RULES)} rules={OFFICIAL_RULES} compact />);
    expect(
      screen.getAllByText(new RegExp(BANDO_VERSION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Appendici 1, 4/).length).toBeGreaterThan(0);
  });
  it("postazioni hanno minimo zero e passo intero, ULA ammettono frazioni", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuestionField
        q={{ id: "workplace_postazioni", label: "Postazioni", type: "number" }}
        value={7}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("spinbutton")).toHaveAttribute("step", "1");
    expect(screen.getByRole("spinbutton")).toHaveAttribute("min", "0");
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(8);
    rerender(
      <QuestionField
        q={{ id: "ula_2025", label: "ULA", type: "number" }}
        value={5}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("spinbutton")).toHaveAttribute("step", "any");
  });
  it("i vecchi dettagli cloud sono nascosti quando l'interesse passa a no", () => {
    const step = STEPS.find((s) => s.id === "cloud")!;
    const visible = step.questions(OFFICIAL_RULES).filter(
      (q) =>
        !q.showIf ||
        q.showIf({
          interesse_cloud: "no",
          cloud_sistemi: ["database"],
          cloud_database_esistente: "si",
        }),
    );
    expect(visible.some((q) => q.id.startsWith("cloud_database"))).toBe(false);
  });
  it("il punteggio non usa addetti medi 2025 o IVA 2025 obsoleti", () => {
    const ids = STEPS.find((s) => s.id === "punteggio")!
      .questions(OFFICIAL_RULES)
      .map((q) => q.id);
    expect(ids).toContain("addetti_inps_luglio_2026");
    expect(ids).toContain("iva_vf25_2025");
    expect(ids).not.toContain("inps_addetti_2025");
    expect(ids).not.toContain("iva_volume_2025");
  });
});
