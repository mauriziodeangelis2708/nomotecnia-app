import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentPrefillSandbox } from "./DocumentPrefillSandbox";

afterEach(() => vi.restoreAllMocks());

describe("Document Intelligence: conferma operatore", () => {
  it("non importa campi senza selezione e conferma esplicita", () => {
    const onApply = vi.fn();
    const prompt = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DocumentPrefillSandbox answers={{}} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText("Tipologia documento"), {
      target: { value: "iva" },
    });
    const apply = screen.getByRole("button", { name: "Conferma campi selezionati nella bozza" });
    expect(apply).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Conferma VE50 volume d'affari 2025" }));
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith("iva", [
      expect.objectContaining({ field: "iva_ve50_2025", value: 500000, sourcePage: 1 }),
    ]);
    expect(apply).toBeDisabled();
  });

  it("se l'utente annulla, non modifica l'assessment", () => {
    const onApply = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DocumentPrefillSandbox answers={{}} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText("Tipologia documento"), {
      target: { value: "inps" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Conferma Forza aziendale luglio 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferma campi selezionati nella bozza" }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("protegge campi valorizzati e non dichiara documenti verificati", () => {
    const onApply = vi.fn();
    render(
      <DocumentPrefillSandbox
        answers={{ iva_ve50_2025: 700000, iva_vf25_2025: "" }}
        onApply={onApply}
      />,
    );
    fireEvent.change(screen.getByLabelText("Tipologia documento"), {
      target: { value: "iva" },
    });
    expect(
      screen.getByRole("checkbox", { name: "Conferma VE50 volume d'affari 2025" }),
    ).toBeDisabled();
    expect(screen.getByText(/nessuna sovrascrittura automatica/i)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText(/Nessuna evidenza diventa/)).toBeInTheDocument();
  });

  it("cambiare testo o tipologia annulla la precedente selezione", () => {
    const onApply = vi.fn();
    render(<DocumentPrefillSandbox answers={{}} onApply={onApply} />);
    const apply = screen.getByRole("button", { name: "Conferma campi selezionati nella bozza" });
    fireEvent.change(screen.getByLabelText("Tipologia documento"), {
      target: { value: "iva" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Conferma VE50 volume d'affari 2025" }));
    expect(apply).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Testo di prova (solo nel browser)"), {
      target: { value: "Documento errato e incompleto" },
    });
    expect(apply).toBeDisabled();
    expect(screen.getByText(/Nessun campo univoco riconosciuto/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipologia documento"), {
      target: { value: "inps" },
    });
    expect(apply).toBeDisabled();
  });
});
