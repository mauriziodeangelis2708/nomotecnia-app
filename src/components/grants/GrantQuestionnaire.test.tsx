import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { syntheticGrant } from "@/lib/grants/fixtures.test-support";
import type { GrantAnswers } from "@/lib/grants/schema";
import { GrantQuestionnaire, GrantResult } from "./GrantQuestionnaire";

describe("generated assessment and report", () => {
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
