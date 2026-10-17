import { z } from "zod";
import { normalizeQuote } from "./schema";
import type { SourceChunk } from "./multipass";
import type { SourceSpan } from "./source-spans";

const reference = z.object({ spanId: z.string() }).strict();
const references = z.array(reference).min(1).max(20);

/** Resolve only server-created IDs belonging to this request, never provider-supplied quote text. */
export function citationResolver(spans: SourceSpan[], chunk: SourceChunk[]) {
  const known = new Map<string, SourceSpan>();
  for (const span of spans) {
    if (
      known.has(span.id) ||
      !chunk.some(
        (p) =>
          p.documentId === span.documentId &&
          p.page === span.page &&
          normalizeQuote(p.text).includes(normalizeQuote(span.text)),
      )
    )
      throw new Error("Contesto dei riferimenti sorgente non valido.");
    known.set(span.id, span);
  }
  return (raw: unknown) =>
    references.parse(raw).map(({ spanId }) => {
      const span = known.get(spanId);
      if (!span) throw new Error("Riferimento a un passaggio sorgente inesistente.");
      return { documentId: span.documentId, page: span.page, quote: span.text };
    });
}

export function resolveGeneratedCitations(raw: unknown, spans: SourceSpan[], chunk: SourceChunk[]) {
  if (JSON.stringify(raw)?.length > 1500000) throw new Error("Risposta superiore a 1,5 MB.");
  const parsed = z
    .object({
      description: z.unknown(),
      questions: z.array(z.record(z.unknown())).max(150),
      rules: z.array(z.record(z.unknown())).max(250),
      unresolved: z.unknown(),
      coverage: z.unknown(),
    })
    .strict()
    .parse(raw);
  const resolve = citationResolver(spans, chunk);
  return {
    ...parsed,
    questions: parsed.questions.map((q) => ({ ...q, citations: resolve(q["citations"]) })),
    rules: parsed.rules.map((r) => ({ ...r, citations: resolve(r["citations"]) })),
  };
}

export function spanCitationFormat(spans: SourceSpan[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["spanId"],
    properties: {
      spanId: {
        type: "string",
        ...(spans.length ? { enum: spans.map((s) => s.id) } : { pattern: "^span_[0-9]+$" }),
      },
    },
  };
}

const auditSchema = z
  .object({
    findings: z
      .array(z.object({ message: z.string().trim().min(1).max(2000), spanId: z.string() }).strict())
      .max(50),
  })
  .strict();
export function resolveAuditCitations(raw: unknown, spans: SourceSpan[], chunk: SourceChunk[]) {
  if (JSON.stringify(raw)?.length > 200000) throw new Error("Controllo troppo esteso.");
  const parsed = auditSchema.parse(raw),
    resolve = citationResolver(spans, chunk);
  return {
    findings: parsed.findings.map(({ message, spanId }) => ({
      message,
      ...resolve([{ spanId }])[0]!,
    })),
  };
}
export function spanAuditFormat(spans: SourceSpan[]) {
  return {
    type: "json_schema",
    json_schema: {
      type: "object",
      additionalProperties: false,
      required: ["findings"],
      properties: {
        findings: {
          type: "array",
          maxItems: 50,
          items: {
            ...spanCitationFormat(spans),
            required: ["message", "spanId"],
            properties: {
              ...spanCitationFormat(spans).properties,
              message: { type: "string", minLength: 1, maxLength: 2000 },
            },
          },
        },
      },
    },
  };
}
