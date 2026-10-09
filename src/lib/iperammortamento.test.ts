import { describe, expect, it } from "vitest";
import { assessIperammortamento, calculateIperUplift } from "./iperammortamento";

const coherentBase = {
  denominazione: "Impresa di prova",
  partita_iva: "00000000000",
  codice_fiscale: "00000000000",
  forma_giuridica: "S.r.l.",
  data_costituzione: "2020-01-01",
  data_iscrizione_registro: "2020-02-01",
  sede_legale_indirizzo: "Via di prova 1",
  pec: "test@example.invalid",
  email: "test@example.invalid",
  telefono: "0000000000",
  firmatario_tipo: "Legale rappresentante",
  firmatario_nome: "Persona di prova",
  firmatario_cf: "00000000000",
  referente_nome: "Referente di prova",
  referente_email: "test@example.invalid",
  referente_telefono: "00390000000000",
  struttura_nome: "Sede produttiva di prova",
  struttura_indirizzo: "Via di prova 1",
  struttura_comune: "Roma",
  struttura_provincia: "RM",
  struttura_cap: "00100",
  struttura_sezione_catastale: "NP",
  struttura_foglio: "1",
  struttura_particella: "1",
  struttura_subalterno: "NP",
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
  beni_ivv_json: JSON.stringify([
    {
      categoria: "IV / categoria di prova",
      completamento: "2027-01-01",
      interconnessione: "2027-01-02",
      bene_complesso: "No",
      costo_netto: "1000",
      coefficiente: "10",
    },
  ]),
  altri_aiuti: "no",
  perizia: "si",
  certificazione_contabile: "si",
  dichiarazioni_gse: "si",
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
      tipo_energia: "elettrica",
      autoconsumo: "si",
      impianto_ammesso: "si",
      dimensionamento: "no",
      sito_pod: "si",
      accumulo: "no",
    });
    expect(result.status).toBe("ostacolo");
    expect(result.blockers).toContain(
      "Produzione elettrica entro il limite del 105%, calcolato secondo il decreto",
    );
  });

  it("non applica il limite elettrico del 105% indistintamente al calore di processo", () => {
    const result = assessIperammortamento({
      ...coherentBase,
      tipo_bene: "energia",
      impianti_fer_json: JSON.stringify([
        {
          fonte: "Biomassa",
          potenza: "10",
          completamento: "2027-01-01",
          entrata_esercizio: "2027-02-01",
          costo_netto: "1000",
          coefficiente: "10",
        },
      ]),
      pod: "IT001E00000000",
      producibilita_kwh: 100,
      fabbisogno_kwh: 100,
      fabbisogno_termico_equivalente: 100,
      tipo_energia: "termica",
      autoconsumo: "si",
      impianto_ammesso: "si",
      calore_processo: "si",
      calore_non_cessibile: "si",
      fonte_termica_ammessa: "si",
      sito_pod: "si",
      accumulo: "no",
    });
    expect(result.status).toBe("coerente");
    expect(result.missing).not.toContain(
      "Produzione elettrica entro il limite del 105%, calcolato secondo il decreto",
    );
  });

  it("richiede le condizioni del decreto per calore di processo", () => {
    const result = assessIperammortamento({
      ...coherentBase,
      tipo_bene: "energia",
      impianti_fer_json: JSON.stringify([
        {
          fonte: "Biomassa",
          potenza: "10",
          completamento: "2027-01-01",
          entrata_esercizio: "2027-02-01",
          costo_netto: "1000",
          coefficiente: "10",
        },
      ]),
      pod: "IT001E00000000",
      producibilita_kwh: 100,
      fabbisogno_kwh: 100,
      fabbisogno_termico_equivalente: 100,
      tipo_energia: "termica",
      autoconsumo: "si",
      impianto_ammesso: "si",
      calore_processo: "no",
      calore_non_cessibile: "si",
      fonte_termica_ammessa: "si",
      sito_pod: "si",
      accumulo: "no",
    });
    expect(result.status).toBe("ostacolo");
    expect(result.blockers).toContain("Calore destinato esclusivamente al processo produttivo");
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

  it("non segnala un esito completo se mancano anagrafica e scheda GSE", () => {
    const result = assessIperammortamento({
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
    });
    expect(result.status).toBe("da_verificare");
    expect(result.missing).toContain("Denominazione operatore GSE");
    expect(result.missing).toContain(
      "Almeno una scheda bene Allegato IV/V da compilare per il GSE",
    );
  });

  it("supporta contemporaneamente beni IV/V e investimenti FER", () => {
    const result = assessIperammortamento({
      ...coherentBase,
      tipo_bene: "misto",
      requisiti_tecnici: "si",
      funzione_software: "si",
      autoconsumo: "si",
      impianto_ammesso: "si",
      tipo_energia: "elettrica",
      dimensionamento: "si",
      sito_pod: "si",
      accumulo: "no",
      interconnessione: "si",
      categoria_allegato: "si",
      impianti_fer_json: JSON.stringify([
        {
          fonte: "Fotovoltaico",
          potenza: "10",
          completamento: "2027-01-01",
          entrata_esercizio: "2027-02-01",
          costo_netto: "1000",
          coefficiente: "10",
        },
      ]),
      pod: "IT001E00000000",
      producibilita_kwh: 100,
      fabbisogno_kwh: 100,
    });
    expect(result.status).toBe("coerente");
  });
});
