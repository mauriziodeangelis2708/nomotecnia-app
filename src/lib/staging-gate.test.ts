import { describe, expect, it } from "vitest";
import { denyUnauthenticatedStagingRequest } from "./staging-gate";

const password = "only-synthetic-data-staging";
const env = { STAGING_ACCESS_PASSWORD: password };
const page = "https://nomotecnia-full-staging.workers.dev/dashboard";

describe("full-app Cloudflare staging access gate", () => {
  it("fails closed if password is missing or too short", () => {
    const request = new Request(page);
    expect(denyUnauthenticatedStagingRequest(request, {})?.status).toBe(503);
    expect(
      denyUnauthenticatedStagingRequest(request, { STAGING_ACCESS_PASSWORD: "short" })?.status,
    ).toBe(503);
  });

  it("denies unauthenticated HTML, PDF worker assets and routes", () => {
    for (const url of [page, page.replace("/dashboard", "/assets/pdf.worker.min.js")]) {
      const response = denyUnauthenticatedStagingRequest(new Request(url), env);
      expect(response?.status).toBe(401);
      expect(response?.headers.get("www-authenticate")).toContain("Basic realm");
      expect(response?.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("rejects wrong credentials and accepts only the staging password", () => {
    const invalid = new Request(page, {
      headers: { Authorization: "Basic " + btoa("nomotecnia:incorrect-password") },
    });
    expect(denyUnauthenticatedStagingRequest(invalid, env)?.status).toBe(401);
    const valid = new Request(page, {
      headers: { Authorization: "Basic " + btoa("nomotecnia:" + password) },
    });
    expect(denyUnauthenticatedStagingRequest(valid, env)).toBeNull();
  });
});
