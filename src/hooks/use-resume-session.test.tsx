import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeSession } from "./use-resume-session";
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), unsubscribe: vi.fn(), listen: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { onAuthStateChange: mocks.listen } },
}));
describe("restoring a saved login", () => {
  let emit: (event: string, session: unknown) => void;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listen.mockImplementation((callback) => {
      emit = callback;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
  });
  it("opens the dashboard after a persisted session is restored", () => {
    renderHook(() => useResumeSession());
    expect(mocks.navigate).not.toHaveBeenCalled();
    act(() => emit("INITIAL_SESSION", { user: { id: "test" } }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
  });
  it("restores customer sessions into the customer portal", () => {
    renderHook(() => useResumeSession("/portal"));
    act(() => emit("INITIAL_SESSION", { user: { id: "customer" } }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/portal", replace: true });
  });
  it("keeps the login available when there is no valid session", () => {
    renderHook(() => useResumeSession());
    act(() => emit("INITIAL_SESSION", null));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("handles OAuth completion and removes the listener on unmount", () => {
    const { unmount } = renderHook(() => useResumeSession());
    act(() => emit("SIGNED_IN", { user: { id: "test" } }));
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
