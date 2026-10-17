import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { syntheticGrant } from "@/lib/grants/fixtures.test-support";
import { NUMERIC_SPECIFICATION_SCOPE } from "@/lib/grants/numeric-specification";
import { evaluateGrant } from "@/lib/grants/engine";
import { RequirementEditor } from "./RequirementEditor";

afterEach(cleanup);
const d = syntheticGrant();
function setup(disabled = false) {
  const apply = vi.fn();
  render(
    <RequirementEditor
      sources={d.sources}
      title={d.title}
      identity={{ id: d.id, version: 2 }}
      disabled={disabled}
      onApply={apply}
    />,
  );
  return apply;
}
function add() {
  fireEvent.click(screen.getByText("Aggiungi requisito verificato"));
  fireEvent.change(screen.getByLabelText("Domanda requisito 1"), {
    target: { value: "Impresa in procedura concorsuale?" },
  });
}
describe("source-linked requirement editor", () => {
  it("requires an explicit source and compiles exclusion semantics without removing partial scope", () => {
    const apply = setup();
    add();
    fireEvent.change(screen.getByLabelText("Tipo requisito 1"), { target: { value: "exclusion" } });
    fireEvent.click(screen.getByText("Sostituisci anteprima con questi requisiti"));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByText("Sostituisci anteprima con questi requisiti"));
    expect(apply).toHaveBeenCalledTimes(1);
    const result = apply.mock.calls[0]![0];
    expect(result.id).toBe(d.id);
    expect(result.version).toBe(2);
    expect(result.unresolved).toContain(NUMERIC_SPECIFICATION_SCOPE);
    expect(result.rules[0].citations[0].quote).toBeTruthy();
    expect(evaluateGrant(result, { [result.questions[0].id]: true }).status).toBe("not_eligible");
    expect(evaluateGrant(result, { [result.questions[0].id]: false }).status).toBe("incomplete");
  });
  it("locks source section while requirements exist and allows explicit removal", () => {
    setup();
    add();
    expect(screen.getByLabelText("Sezione delle fonti")).toBeDisabled();
    fireEvent.click(screen.getByText("Rimuovi requisito 1"));
    expect(screen.getByLabelText("Sezione delle fonti")).not.toBeDisabled();
    expect(screen.getByText("Sostituisci anteprima con questi requisiti")).toBeDisabled();
  });
  it("published and busy forms cannot mutate or apply", () => {
    setup(true);
    expect(screen.getByText("Aggiungi requisito verificato")).toBeDisabled();
    expect(screen.getByText("Sostituisci anteprima con questi requisiti")).toBeDisabled();
  });
});
