import { addCoverageFindings, COVERAGE_SYSTEM } from "./coverage";
import { attachInventory } from "./inventory";
import {
  sourceSpans,
  spanInventoryFormat,
  acceptSpanInventory,
  SPAN_INVENTORY_SYSTEM,
} from "./source-spans";
import { GENERATION_FORMAT } from "./output-format";
import { planSourceChunks } from "./multipass";
import {
  acceptGeneratedDefinition,
  generationRequest,
  GENERATOR_MODEL,
  GENERATOR_SYSTEM,
} from "./generation";

export interface GenerationEnv {
  AI?: { run(model: string, options: Record<string, unknown>): Promise<{ response?: unknown }> };
  BANDO_GENERATOR_ENABLED?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}
const reply = (body: unknown, status: number) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
/** A separate Worker entry is supplied below; no model binding is enabled by this module. */
export async function handleGrantGeneration(
  request: Request,
  env: GenerationEnv,
  http: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "POST") return reply({ error: "Metodo non consentito." }, 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin)
    return reply({ error: "Origine non consentita." }, 403);
  // Staging Basic auth belongs to the outer gate. Keep the Supabase session separate.
  const token = request.headers.get("X-Nomotecnia-Session") ?? request.headers.get("Authorization");
  if (!token?.startsWith("Bearer ") || token.length > 9000)
    return reply({ error: "Accesso richiesto." }, 401);
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL)
  )
    return reply({ error: "Configurazione di accesso non disponibile." }, 503);
  const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: token };
  try {
    const user = await http(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!user.ok) return reply({ error: "Sessione non valida." }, 401);
    const identity = (await user.json()) as { id?: string; is_anonymous?: boolean };
    if (!identity.id || identity.is_anonymous)
      return reply({ error: "Accesso non consentito." }, 403);
    const roles = await http(
      `${env.SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(identity.id)}&role=eq.admin`,
      { headers, signal: AbortSignal.timeout(10000) },
    );
    if (!roles.ok || !((await roles.json()) as { role: string }[]).some((r) => r.role === "admin"))
      return reply({ error: "Sezione riservata agli amministratori." }, 403);
    // Fail closed until the account's no-charge conditions have been independently verified.
    if (env.BANDO_GENERATOR_ENABLED !== "true" || !env.AI)
      return reply(
        {
          error:
            "Generazione AI non attiva. Il collegamento al modello deve essere configurato e verificato prima dell'utilizzo.",
        },
        503,
      );
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      return reply({ error: "Formato non valido." }, 415);
    const declaredSize = Number(request.headers.get("Content-Length"));
    if (declaredSize > 1500000) return reply({ error: "Documenti troppo estesi." }, 413);
    // Bound bytes while reading, including chunked transfer bodies.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Documenti mancanti." }, 400);
    const parts: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1500000) {
          await reader.cancel();
          return reply({ error: "Documenti troppo estesi." }, 413);
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    const parsed = generationRequest.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    if (!parsed.success)
      return reply({ error: parsed.error.issues.map((i) => i.message).join("; ") }, 400);
    const chunks = planSourceChunks(parsed.data.sources);
    const chunk = chunks[parsed.data.chunkIndex]!;
    const spans = sourceSpans(chunk);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expired = false;
    try {
      const definition = await Promise.race([
        (async () => {
          const extracted = await env.AI!.run(GENERATOR_MODEL, {
            messages: [
              { role: "system", content: SPAN_INVENTORY_SYSTEM },
              { role: "user", content: JSON.stringify({ spans }) },
            ],
            response_format: spanInventoryFormat(spans),
            max_tokens: 4000,
            temperature: 0,
          });
          const inventory = acceptSpanInventory(
            typeof extracted.response === "string"
              ? JSON.parse(extracted.response)
              : extracted.response,
            spans,
            chunk,
          );
          if (expired) throw new Error("timeout");
          const response = await env.AI!.run(GENERATOR_MODEL, {
            messages: [
              {
                role: "system",
                content:
                  GENERATOR_SYSTEM +
                  "\nAggiungi un campo coverage all'output: [{requirementId:string,questionIds:string[],ruleIds:string[],gap?:string}]. Collega OGNI requisito dell'inventario alle domande e alle regole che lo implementano; se non è coperto indica gap e non inventare. Non modificare l'inventario.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  title: parsed.data.title,
                  chunkIndex: parsed.data.chunkIndex,
                  chunkCount: chunks.length,
                  excerpts: chunk,
                  inventory,
                }),
              },
            ],
            response_format: GENERATION_FORMAT,
            max_tokens: 8000,
            temperature: 0,
          });
          const raw =
            typeof response.response === "string"
              ? JSON.parse(response.response)
              : response.response;
          if (!raw || typeof raw !== "object" || Array.isArray(raw))
            throw new Error("Formato non valido.");
          const { coverage, ...generated } = raw as Record<string, unknown>;
          const draft = attachInventory(
            acceptGeneratedDefinition(generated, parsed.data),
            inventory,
            coverage,
          );
          if (expired) throw new Error("timeout");
          const audit = await env.AI!.run(GENERATOR_MODEL, {
            messages: [
              { role: "system", content: COVERAGE_SYSTEM },
              {
                role: "user",
                content: JSON.stringify({
                  excerpts: chunk,
                  draft: {
                    description: draft.description,
                    questions: draft.questions,
                    rules: draft.rules,
                    unresolved: draft.unresolved,
                    requirements: draft.requirements,
                  },
                }),
              },
            ],
            response_format: { type: "json_object" },
            max_tokens: 3500,
            temperature: 0,
          });
          const findings =
            typeof audit.response === "string" ? JSON.parse(audit.response) : audit.response;
          return addCoverageFindings(draft, findings, chunk);
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            reject(new Error("timeout"));
          }, 90000);
        }),
      ]);
      return reply(
        {
          definition,
          model: GENERATOR_MODEL,
          reviewed: false,
          chunkIndex: parsed.data.chunkIndex,
          chunkCount: chunks.length,
        },
        200,
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    // No token, source text, or provider response in logs or error payloads.
    return reply(
      {
        error:
          "Generazione non riuscita o risposta non valida. Nessun assessment è stato attivato.",
      },
      502,
    );
  }
}
