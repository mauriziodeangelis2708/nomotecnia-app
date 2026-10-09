import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { OFFICIAL_RULES } from "@/lib/bando";
const { order, eq, getUser } = vi.hoisted(() => ({
  order: vi.fn(),
  eq: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ order, eq }) }), auth: { getUser } },
}));
import { useMe, useRules } from "./use-rules";
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
beforeEach(() => vi.resetAllMocks());
describe("Regole e permessi: nessun successo fittizio", () => {
  it("tabella vuota usa baseline ufficiale senza scrivere al DB", async () => {
    order.mockResolvedValue({ data: [], error: null });
    const h = renderHook(useRules, { wrapper: wrapper() });
    await waitFor(() => expect(h.result.current.isSuccess).toBe(true));
    expect(h.result.current.data?.map["min_project"]?.value).toBe(14000);
    expect(h.result.current.data?.storedKeys).toEqual([]);
  });
  it("un errore DB non è una tabella vuota", async () => {
    order.mockResolvedValue({ data: null, error: new Error("rete") });
    const h = renderHook(useRules, { wrapper: wrapper() });
    await waitFor(() => expect(h.result.current.isError).toBe(true));
    expect(h.result.current.data).toBeUndefined();
  });
  it("override resta distinto e non viene validato dalla baseline", async () => {
    order.mockResolvedValue({
      data: [{ ...OFFICIAL_RULES["cloud_database"], status: "da_validare" }],
      error: null,
    });
    const h = renderHook(useRules, { wrapper: wrapper() });
    await waitFor(() => expect(h.result.current.isSuccess).toBe(true));
    expect(h.result.current.data?.map["cloud_database"]?.status).toBe("da_validare");
  });
  it("errore ruoli non concede accesso o successo vuoto", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "test", email: "test@example.invalid" } },
      error: null,
    });
    eq.mockResolvedValue({ data: null, error: new Error("permessi") });
    const h = renderHook(useMe, { wrapper: wrapper() });
    await waitFor(() => expect(h.result.current.isError).toBe(true));
    expect(h.result.current.data).toBeUndefined();
  });
});
