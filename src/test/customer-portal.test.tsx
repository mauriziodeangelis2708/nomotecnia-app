import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CustomerPortal } from "../routes/portal";
const mocks = vi.hoisted(() => ({ action: vi.fn(), invalidate: vi.fn(), rows: [] as unknown[] }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    useRouteContext: () => ({ user: { id: "customer", email_confirmed_at: "2026-10-10" } }),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  redirect: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.rows, refetch: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/customer-portal", () => ({
  submissionAction: mocks.action,
  SUBMISSION_STATES: { draft: "Bozza", submitted: "Da esaminare" },
}));
vi.mock("@/components/CustomerQuestionnaire", () => ({
  CustomerQuestionnaire: () => <p>Questionario</p>,
}));
describe("customer intake workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [];
    mocks.action.mockResolvedValue("draft-id");
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it("saves before sending and closes the editor only after success", async () => {
    render(<CustomerPortal />);
    fireEvent.click(screen.getByText("+ Nuovo assessment"));
    fireEvent.change(screen.getByLabelText("Ragione sociale della pratica"), {
      target: { value: "Azienda prova" },
    });
    fireEvent.click(screen.getAllByText("Invia a NomotecnIA")[0]!);
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith("submit", "draft-id"));
    expect(mocks.action.mock.calls[0]?.[0]).toBe("save");
    await waitFor(() => expect(screen.queryByText("Questionario")).not.toBeInTheDocument());
  });
  it("does not send or lose the editor if saving fails", async () => {
    mocks.action.mockRejectedValue(new Error("Connessione interrotta"));
    render(<CustomerPortal />);
    fireEvent.click(screen.getByText("+ Nuovo assessment"));
    fireEvent.change(screen.getByLabelText("Ragione sociale della pratica"), {
      target: { value: "Azienda prova" },
    });
    fireEvent.click(screen.getAllByText("Invia a NomotecnIA")[0]!);
    await waitFor(() => expect(mocks.action).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Questionario")).toBeInTheDocument();
  });
  it("submitted customers see status and correction only, without reports or edit/delete", () => {
    mocks.rows = [
      {
        id: "sent",
        company: "Azienda inviata",
        scheme: "lazio",
        state: "submitted",
        submitted_at: "2026-10-10T12:00:00Z",
      },
    ];
    render(<CustomerPortal />);
    expect(screen.getByText("Richiedi correzione")).toBeInTheDocument();
    expect(screen.queryByText("Completa / modifica")).not.toBeInTheDocument();
    expect(screen.queryByText("Elimina bozza")).not.toBeInTheDocument();
    expect(screen.queryByText(/PDF|CSV|report|Apri valutazione/i)).not.toBeInTheDocument();
  });
});
