import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentPrefillSandbox } from "./DocumentPrefillSandbox";

const { extract } = vi.hoisted(() => ({ extract: vi.fn() }));
vi.mock("@/lib/local-pdf-reader", () => ({ extractLocalPdfText: extract }));
afterEach(() => {
  vi.restoreAllMocks();
  extract.mockReset();
});
const pages = [
  {
    page: 1,
    text: "VISURA CAMERALE\nPartita IVA: 00000000000\nATECO prevalente: 62.10.00",
  },
];
function selectPdf() {
  fireEvent.change(screen.getByLabelText("Seleziona PDF dell’impresa"), {
    target: {
      files: [new File(["%PDF-test"], "impresa.pdf", { type: "application/pdf" })],
    },
  });
}

describe("Lettura PDF operativa locale", () => {
  it("parte senza esempi e consente la selezione del PDF senza consenso fittizio", () => {
    render(<DocumentPrefillSandbox mode="local" answers={{}} onApply={vi.fn()} />);
    expect(screen.getByLabelText("Seleziona PDF dell’impresa")).toBeEnabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/Testo assente/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Non posso confermare automaticamente/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AZIENDA DEMO/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Conferma Partita IVA" }),
    ).not.toBeInTheDocument();
  });

  it("inserisce solo i campi selezionati dopo conferma e mantiene i campi esistenti", async () => {
    extract.mockResolvedValue(pages);
    const onApply = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <DocumentPrefillSandbox
        mode="local"
        answers={{ partita_iva: "00000000000" }}
        onApply={onApply}
      />,
    );
    selectPdf();
    await screen.findByText("Analizzato localmente: impresa.pdf");
    expect(screen.getByRole("checkbox", { name: "Conferma Partita IVA" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Conferma Codice ATECO" }));
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Conferma campi selezionati nella bozza",
      }),
    );
    expect(onApply).toHaveBeenCalledWith(
      "visura",
      [expect.objectContaining({ field: "ateco_codice", value: "62.10.00" })],
      pages,
      false,
    );
  });

  it("scarta i dati precedenti quando il PDF successivo non è leggibile", async () => {
    extract.mockResolvedValueOnce(pages).mockRejectedValueOnce(new Error("PDF non leggibile"));
    render(<DocumentPrefillSandbox mode="local" answers={{}} onApply={vi.fn()} />);
    selectPdf();
    await screen.findByText("Analizzato localmente: impresa.pdf");
    selectPdf();
    await screen.findByText("PDF non leggibile");
    expect(
      screen.queryByRole("checkbox", { name: "Conferma Codice ATECO" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Conferma campi selezionati nella bozza",
      }),
    ).toBeDisabled();
  });

  it("rimuovere il PDF invalida anche una lettura ancora in corso", async () => {
    let finish!: (value: typeof pages) => void;
    extract.mockReturnValue(
      new Promise<typeof pages>((resolve) => {
        finish = resolve;
      }),
    );
    render(<DocumentPrefillSandbox mode="local" answers={{}} onApply={vi.fn()} />);
    selectPdf();
    await waitFor(() => expect(extract).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Rimuovi PDF dalla memoria" }));
    await act(async () => {
      finish(pages);
    });
    expect(screen.queryByText("Analizzato localmente: impresa.pdf")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Conferma Codice ATECO" }),
    ).not.toBeInTheDocument();
  });

  it("cambiare impresa invalida la conferma manuale di appartenenza", async () => {
    extract.mockResolvedValue(pages);
    const onApply = vi.fn();
    const { rerender } = render(
      <DocumentPrefillSandbox mode="local" answers={{}} onApply={onApply} />,
    );
    selectPdf();
    await screen.findByText("Analizzato localmente: impresa.pdf");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Confermo appartenenza documento alla impresa",
      }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Conferma Codice ATECO" }));
    rerender(
      <DocumentPrefillSandbox
        mode="local"
        answers={{ partita_iva: "11111111111" }}
        onApply={onApply}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("diversa");
    expect(
      screen.getByRole("button", {
        name: "Conferma campi selezionati nella bozza",
      }),
    ).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
