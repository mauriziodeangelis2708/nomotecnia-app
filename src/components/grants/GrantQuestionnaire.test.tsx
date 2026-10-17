import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { syntheticGrant, SYNTHETIC_ANSWERS } from "@/lib/grants/fixtures.test-support";
import type { GrantAnswers } from "@/lib/grants/schema";
import { GrantQuestionnaire, GrantResult } from "./GrantQuestionnaire";

describe("generated assessment and report", () => {
  it("shows integer input steps and keeps fractional quantities unverified", () => {
    const d = syntheticGrant();
    d.questions[2]!.integer = true;
    render(
      <>
        <GrantQuestionnaire
          definition={d}
          answers={{ ...SYNTHETIC_ANSWERS, investimento: 14000.5 }}
          onChange={() => {}}
        />
        <GrantResult definition={d} answers={{ ...SYNTHETIC_ANSWERS, investimento: 14000.5 }} />
      </>,
    );
    expect(screen.getByLabelText(/Investimento/)).toHaveAttribute("step", "1");
    expect(screen.getByText("Da completare / verificare")).toBeInTheDocument();
  });
  it("updates the report when a dynamic limit changes or is cleared", () => {
    const d = syntheticGrant();
    d.questions.push({ ...d.questions[2]!, id: "limit", label: "Limite ammesso", min: 0 });
    d.rules[2]!.condition = {
      op: "compare_fields",
      field: "investimento",
      otherField: "limit",
      comparison: "lte",
    };
    function Preview() {
      const [answers, setAnswers] = useState<GrantAnswers>({ ...SYNTHETIC_ANSWERS, limit: 14000 });
      return (
        <>
          <GrantQuestionnaire definition={d} answers={answers} onChange={setAnswers} />
          <GrantResult definition={d} answers={answers} />
        </>
      );
    }
    render(<Preview />);
    expect(screen.getByText("Preliminarmente ammissibile")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Limite ammesso/), { target: { value: "13999" } });
    expect(screen.getByText("Requisiti ostativi")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Limite ammesso/), { target: { value: "" } });
    expect(screen.getByText("Da completare / verificare")).toBeInTheDocument();
  });
  it("shows persistent inventory gaps even when the generic warning list is cleared", () => {
    const d = syntheticGrant();
    d.requirements = [
      {
        id: "missing_requirement",
        label: "Deroga non verificata",
        citations: d.questions[0]!.citations,
        questionIds: [],
        ruleIds: [],
        gap: "Manca la regola della deroga.",
      },
    ];
    render(<GrantResult definition={d} answers={SYNTHETIC_ANSWERS} />);
    expect(screen.getByText("Da completare / verificare")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Manca la regola della deroga");
  });
  it("keeps unknown answers distinct from explicit no", () => {
    const d = syntheticGrant();
    function Preview() {
      const [a, setA] = useState<GrantAnswers>({});
      return (
        <>
          <GrantQuestionnaire definition={d} answers={a} onChange={setA} />
          <GrantResult definition={d} answers={a} />
        </>
      );
    }
    render(<Preview />);
    expect(screen.getByText("Da completare / verificare")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Impresa attiva\?/), { target: { value: "false" } });
    expect(screen.getByText("Requisiti ostativi")).toBeInTheDocument();
  });
  it("escapes uploaded text and prints its source reference", () => {
    const d = syntheticGrant();
    d.title = "<script>unsafe()</script>";
    render(<GrantResult definition={d} answers={{}} />);
    expect(screen.getByText(/<script>unsafe\(\)<\/script>/)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getAllByText(/avviso-sintetico.pdf · pagina 1/).length).toBeGreaterThan(0);
  });
});
