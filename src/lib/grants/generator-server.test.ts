import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGrantGeneration, type GenerationEnv } from "./generator-server";
import { syntheticGrant } from "./fixtures.test-support";

const origin = "https://test.nomotecnia.invalid";
const d = syntheticGrant();
const input = { id: d.id, version: 1, title: d.title, sources: d.sources };
const request = (body: unknown = input, headers = {}) =>
  new Request(`${origin}/api/grants/generate`, {
    method: "POST",
    headers: {
      Origin: origin,
      Authorization: "Bearer synthetic-token",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const modelOutput = () => {
  const { description, questions, rules, unresolved } = syntheticGrant();
  return { description, questions, rules, unresolved };
};
function setup(admin = true) {
  const ai = vi.fn().mockResolvedValue({ response: JSON.stringify(modelOutput()) });
  const http = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: "synthetic-user" }))
    .mockResolvedValueOnce(Response.json(admin ? [{ role: "admin" }] : []));
  const env: GenerationEnv = {
    SUPABASE_URL: "https://vknvadzsjuixcuwegxto.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_SYNTHETIC",
    BANDO_GENERATOR_ENABLED: "true",
    AI: { run: ai },
  };
  return { ai, http, env };
}
afterEach(() => vi.useRealTimers());
describe("admin-only generation gateway", () => {
  it("requires a token before using any backend", async () => {
    const s = setup();
    const req = request();
    req.headers.delete("Authorization");
    expect((await handleGrantGeneration(req, s.env, s.http)).status).toBe(401);
    expect(s.ai).not.toHaveBeenCalled();
    expect(s.http).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and non-POST requests", async () => {
    const s = setup();
    expect(
      (
        await handleGrantGeneration(
          request(input, { Origin: "https://foreign.invalid" }),
          s.env,
          s.http,
        )
      ).status,
    ).toBe(403);
    expect((await handleGrantGeneration(new Request(origin), s.env, s.http)).status).toBe(405);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it.each(["member", "customer", "outsider"])("denies %s with no inference", async () => {
    const s = setup(false);
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(403);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("does not trust editable user metadata", async () => {
    const s = setup(false);
    s.http
      .mockReset()
      .mockResolvedValueOnce(Response.json({ id: "synthetic", user_metadata: { role: "admin" } }))
      .mockResolvedValueOnce(Response.json([]));
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(403);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("does not activate inference without explicit server configuration", async () => {
    const s = setup();
    delete s.env.BANDO_GENERATOR_ENABLED;
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(503);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("rejects expired session and backend errors without revealing details", async () => {
    const s = setup();
    s.http.mockReset().mockResolvedValue(Response.json({ error: "private" }, { status: 401 }));
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(401);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("returns only a validated, unreviewed draft", async () => {
    const s = setup();
    const response = await handleGrantGeneration(request(), s.env, s.http);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.reviewed).toBe(false);
    expect(body.definition).toEqual(d);
    expect(s.http.mock.calls.every((c) => String(c[0]).startsWith(s.env.SUPABASE_URL!))).toBe(true);
  });
  it("rejects hallucinated citations and executable payloads", async () => {
    const s = setup();
    const payload = modelOutput();
    payload.rules[0]!.citations = [
      { documentId: "avviso", page: 1, quote: "Il modello ha inventato questa frase." },
    ];
    s.ai.mockResolvedValue({ response: JSON.stringify(payload) });
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(502);
  });
  it("rejects overlong sources before inference", async () => {
    const s = setup(),
      body = structuredClone(input);
    body.sources[0]!.pages[0]!.text = "a".repeat(24001);
    expect((await handleGrantGeneration(request(body), s.env, s.http)).status).toBe(400);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("bounds body size even with chunked transfer", async () => {
    const s = setup();
    expect(
      (await handleGrantGeneration(request({ x: "a".repeat(250001) }), s.env, s.http)).status,
    ).toBe(413);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("rejects malformed model JSON without exposing source text", async () => {
    const s = setup();
    s.ai.mockResolvedValue({ response: "PRIVATE_SOURCE_TEXT invalid json" });
    const r = await handleGrantGeneration(request(), s.env, s.http);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain("PRIVATE_SOURCE_TEXT");
  });
});
