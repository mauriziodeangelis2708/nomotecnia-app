import { beforeEach, describe, expect, it } from "vitest";
import { createSessionStorage } from "./session-storage";

describe("optional persistent login", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const adapter = () => createSessionStorage(localStorage, sessionStorage, localStorage);
  it("defaults to a temporary session and survives reload in the same tab", async () => {
    await adapter().setItem("auth-test", "test-token");
    expect(localStorage.getItem("auth-test")).toBeNull();
    expect(await adapter().getItem("auth-test")).toBe("test-token");
    sessionStorage.clear();
    expect(await adapter().getItem("auth-test")).toBeNull();
  });
  it("retains the session after closing the tab only when selected", async () => {
    const storage = adapter();
    storage.choose(true);
    await storage.setItem("auth-test", "test-token");
    sessionStorage.clear();
    expect(await adapter().getItem("auth-test")).toBe("test-token");
  });
  it("clears the previous persistent copy when the next login is unchecked", async () => {
    const storage = adapter();
    storage.choose(true);
    await storage.setItem("auth-test", "old-test-token");
    storage.choose(false);
    await storage.setItem("auth-test", "new-test-token");
    expect(localStorage.getItem("auth-test")).toBeNull();
    sessionStorage.clear();
    expect(await adapter().getItem("auth-test")).toBeNull();
  });
  it("removes both copies on logout", async () => {
    const storage = adapter();
    storage.choose(true);
    await storage.setItem("auth-test", "test-token");
    await storage.removeItem("auth-test");
    expect(await storage.getItem("auth-test")).toBeNull();
    expect(sessionStorage.getItem("auth-test")).toBeNull();
  });
  it("does not reuse old automatic persistent sessions without an opt-in", async () => {
    localStorage.setItem("auth-test", "legacy-test-token");
    expect(await adapter().getItem("auth-test")).toBeNull();
  });
});
