import { HUMAN_COVERAGE_REVIEW } from "./coverage";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGrantGeneration, type GenerationEnv } from "./generator-server";
import { syntheticGrant } from "./fixtures.test-support";
import observed from "./workers-ai-observed.test-support.json";
import { evaluateGrant } from "./engine";

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
  return { description, questions, rules, unresolved, coverage: [] };
};
function setup(admin = true) {
  const ai = vi
    .fn()
    .mockResolvedValue({ response: { findings: [] } })
    .mockResolvedValueOnce({ response: { requirements: [] } })
    .mockResolvedValueOnce({ response: JSON.stringify(modelOutput()) });
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
  it("compiles calculation plans and sends the validated formula to the independent audit", async () => {
    const s = setup();
    const payload = modelOutput();
    const grant = {
      id: "planned_award",
      label: "Importo fisso sintetico",
      kind: "grant",
      calculation: { method: "fixed", amount: 1234.56 },
      citations: payload.rules[0]!.citations,
    };
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: { ...payload, rules: [...payload.rules, grant] } });
    const response = await handleGrantGeneration(request(), s.env, s.http);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(
      body.definition.rules.find((r: { id: string }) => r.id === "planned_award").formula,
    ).toEqual({ op: "constant", value: 1234.56 });
    expect(
      body.definition.rules.find((r: { id: string }) => r.id === "planned_award"),
    ).not.toHaveProperty("calculation");
    const audit = JSON.parse(s.ai.mock.calls[2]![1].messages[1].content);
    expect(audit.draft).not.toHaveProperty("sources");
    expect(audit.excerpts).toBeDefined();
    expect(audit.draft.rules.find((r: { id: string }) => r.id === "planned_award").formula).toEqual(
      { op: "constant", value: 1234.56 },
    );
    const format = s.ai.mock.calls[1]![1].response_format;
    expect(JSON.stringify(format)).toContain('"calculation"');
    expect(body.definition.unresolved).toContain(HUMAN_COVERAGE_REVIEW);
  });
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
  it("keeps the protected staging Basic gate separate from Supabase authentication", async () => {
    const s = setup();
    const req = request(input, {
      Authorization: "Basic synthetic-staging-gate",
      "X-Nomotecnia-Session": "Bearer synthetic-user-session",
    });
    const r = await handleGrantGeneration(req, s.env, s.http);
    expect(r.status).toBe(200);
    expect(s.http.mock.calls[0]?.[1]?.headers.Authorization).toBe("Bearer synthetic-user-session");
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
    expect(body.definition).toEqual({
      ...d,
      requirements: [],
      unresolved: [HUMAN_COVERAGE_REVIEW],
    });
    expect(s.http.mock.calls.every((c) => String(c[0]).startsWith(s.env.SUPABASE_URL!))).toBe(true);
  });
  it("resolves inventory source IDs server-side before generation and rejects invented IDs", async () => {
    const s = setup(),
      payload = {
        ...modelOutput(),
        coverage: [
          { requirementId: "active", questionIds: ["attiva"], ruleIds: ["impresa_attiva"] },
        ],
      };
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({
        response: {
          requirements: [
            { id: "active", label: "Impresa attiva", citations: [{ spanId: "span_1" }] },
          ],
        },
      })
      .mockResolvedValueOnce({ response: payload });
    const result = await handleGrantGeneration(request(), s.env, s.http);
    expect(result.status).toBe(200);
    expect((await result.json()).definition.requirements[0].citations[0].quote).toBe(
      d.sources[0]!.pages[0]!.text,
    );
    const wrong = setup();
    wrong.ai.mockReset().mockResolvedValue({
      response: {
        requirements: [
          { id: "active", label: "Impresa attiva", citations: [{ spanId: "missing" }] },
        ],
      },
    });
    expect((await handleGrantGeneration(request(), wrong.env, wrong.http)).status).toBe(502);
    expect(wrong.ai).toHaveBeenCalledTimes(1);
  });
  it("fails closed if the independent audit fails instead of returning a partial draft", async () => {
    const s = setup();
    s.ai
      .mockReset()
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: modelOutput() })
      .mockRejectedValueOnce(new Error("private provider detail"));
    const response = await handleGrantGeneration(request(), s.env, s.http);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private provider detail");
    expect(s.ai).toHaveBeenCalledTimes(3);
  });
  it("accepts the live synthetic provider response and evaluates its generated rules", async () => {
    const s = setup();
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: { ...observed.response, coverage: [] } });
    const response = await handleGrantGeneration(
      request({
        ...input,
        sources: [
          {
            id: "documento_1",
            name: "synthetic.pdf",
            sha256: "a".repeat(64),
            pages: [{ page: 1, text: observed.source }],
          },
        ],
      }),
      s.env,
      s.http,
    );
    expect(response.status).toBe(200);
    const { definition } = await response.json();
    const answers = { sede_operativa: true, liquidazione: false, spesa_ammissibile: 20000 };
    expect(evaluateGrant(definition, answers).grants[0]!.value).toBe(10000);
    expect(evaluateGrant(definition, { ...answers, liquidazione: true }).status).toBe(
      "not_eligible",
    );
    expect(evaluateGrant(definition, {}).status).toBe("incomplete");
  });
  it("validates structured JSON-mode responses observed from Workers AI", async () => {
    const s = setup();
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: modelOutput() });
    const response = await handleGrantGeneration(request(), s.env, s.http);
    expect(response.status).toBe(200);
    expect((await response.json()).definition).toEqual({
      ...d,
      requirements: [],
      unresolved: [HUMAN_COVERAGE_REVIEW],
    });
    const payload = modelOutput();
    payload.rules[0]!.citations = [
      { documentId: "avviso", page: 1, quote: "Il modello ha inventato questa frase." },
    ];
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: payload });
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(502);
  });
  it("rejects hallucinated citations and executable payloads", async () => {
    const s = setup();
    const payload = modelOutput();
    payload.rules[0]!.citations = [
      { documentId: "avviso", page: 1, quote: "Il modello ha inventato questa frase." },
    ];
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: JSON.stringify(payload) });
    expect((await handleGrantGeneration(request(), s.env, s.http)).status).toBe(502);
  });
  it("rejects overlong sources before inference", async () => {
    const s = setup(),
      body = structuredClone(input);
    body.sources[0]!.pages = [1, 2, 3].map((page) => ({ page, text: "a".repeat(200001) }));
    expect((await handleGrantGeneration(request(body), s.env, s.http)).status).toBe(400);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("bounds body size even with chunked transfer", async () => {
    const s = setup();
    expect(
      (await handleGrantGeneration(request({ x: "a".repeat(1500001) }), s.env, s.http)).status,
    ).toBe(413);
    expect(s.ai).not.toHaveBeenCalled();
  });
  it("rejects malformed model JSON without exposing source text", async () => {
    const s = setup();
    s.ai
      .mockReset()
      .mockResolvedValue({ response: { findings: [] } })
      .mockResolvedValueOnce({ response: { requirements: [] } })
      .mockResolvedValueOnce({ response: "PRIVATE_SOURCE_TEXT invalid json" });
    const r = await handleGrantGeneration(request(), s.env, s.http);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain("PRIVATE_SOURCE_TEXT");
  });
});
