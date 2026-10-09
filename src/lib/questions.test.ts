import { describe, expect, it } from "vitest";
import { getGeCoWebFormMissing } from "./questions";

describe("preparazione del formulario GeCoWEB", () => {
  it("segnala i dati obbligatori del formulario che non risultano nell’assessment", () => {
    const missing = getGeCoWebFormMissing({});
    expect(missing).toContain("Classe dimensionale da selezionare in GeCoWEB");
    expect(missing).toContain("Legale rappresentante che sottoscriverà la domanda");
    expect(missing).toContain("Titolo del progetto");
    expect(missing).toContain("Descrizione del progetto (fino a 20.000 caratteri)");
    expect(missing).toContain("Confronto delle voci di costo con la tabella forfettaria ufficiale");
  });

  it("chiede la linea di costo solo per gli interventi selezionati", () => {
    const missing = getGeCoWebFormMissing({ interesse_workplace: "si" });
    expect(missing).toContain("B — Digital Workplace: importo complessivo da inserire (€)");

    const withoutWorkplace = getGeCoWebFormMissing({ interesse_workplace: "no" });
    expect(withoutWorkplace).not.toContain(
      "B — Digital Workplace: importo complessivo da inserire (€)",
    );
  });
});
