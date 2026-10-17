import { z } from "zod";
import { generationRequest } from "./generation";
import { sourceSpans } from "./source-spans";
import { planSourceChunks } from "./multipass";
import { compileNumericSpecification } from "./numeric-specification";
import { parseDefinition, type GrantSource } from "./schema";

const envelope = z
  .object({
    kind: z.enum(["numeric_specification", "requirement_specification"]),
    id: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    title: z.string().trim().min(2).max(200),
    version: z.number().int().min(1).max(100000),
    sourceHashes: z
      .array(z.string().regex(/^[a-f0-9]{64}$/))
      .min(1)
      .max(12),
    chunkIndex: z.number().int().min(0).max(199),
    specification: z.unknown(),
  })
  .strict();

/** Ordinary saved definitions are unchanged. The numeric envelope is always compiled from local sources. */
export function importGrantConfiguration(raw: unknown, sources: GrantSource[]) {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !("kind" in raw) ||
    !["numeric_specification", "requirement_specification"].includes(String(raw.kind))
  )
    return parseDefinition(raw);
  if (JSON.stringify(raw).length > 1500000) throw new Error("Importazione superiore a 1,5 MB.");
  const e = envelope.parse(raw);
  if (
    e.sourceHashes.length !== sources.length ||
    sources.some((s, i) => s.sha256 !== e.sourceHashes[i])
  )
    throw new Error(
      "Le fonti caricate non corrispondono, o hanno un ordine diverso. Caricare gli stessi PDF della revisione.",
    );
  const validated = generationRequest.parse({
    id: e.id,
    title: e.title,
    version: e.version,
    sources,
    chunkIndex: e.chunkIndex,
  });
  const chunk = planSourceChunks(validated.sources)[e.chunkIndex]!;
  return parseDefinition(
    compileNumericSpecification(e.specification, {
      id: e.id,
      title: e.title,
      version: e.version,
      sources: validated.sources,
      chunk,
      spans: sourceSpans(chunk),
    }),
  );
}

export function numericReviewPacket(sources: GrantSource[]) {
  const validated = generationRequest.parse({
    id: "revisione_numerica",
    title: "Revisione dei requisiti numerici",
    version: 1,
    sources,
  });
  return {
    kind: "requirement_review_sources",
    version: 1,
    sourceHashes: validated.sources.map((s) => s.sha256),
    instructions:
      "Esaminare il testo originale e preparare una specifica di requisiti parziale, senza codice o formule arbitrarie. Distinguere fatti del richiedente, soglie, quote, tetti e conferme documentali. Non chiedere come input aliquote, massimali o totali derivabili. Usare esclusivamente gli spanId della sezione scelta. Verificare manualmente requisiti, valori, alternative, deroghe e rimandi. Le declarations richiedono una conferma umana completa del requisito; non verificano automaticamente documenti o fatti. Non dichiarare completo il bando. Restituire un involucro requirement_specification secondo il formato seguente. Se le regole non sono esprimibili, lasciare unresolved: nessuna approssimazione.",
    importFormat: {
      kind: "requirement_specification",
      id: "scegliere_id_bando",
      title: "Nome del bando",
      version: 1,
      sourceHashes: validated.sources.map((s) => s.sha256),
      chunkIndex: 0,
      specification: {
        declarations:
          "[{id,label,kind:eligibility|exclusion|document,expected:boolean,spanIds}] — domanda di conferma: eligibility/document è soddisfatta se la risposta equivale a expected; exclusion esclude se la risposta equivale a expected. Descrivere il criterio completo, comprese alternative e deroghe.",
        inputs: "[{id,label,unit:EUR|count,spanId}] — count indica quantità intere",
        minimums: "[{sumOf:inputId[],value,spanId}] — somma almeno pari alla soglia",
        shares:
          "[{part:inputId,total:inputId[],atLeastPercent,spanId}] — il totale comprende la componente",
        fieldLimits:
          "[{field:inputId,atMostField:inputId,spanId}] — vincolo fra due input della stessa unità",
        awardCaps:
          "[{awardId,amountField:inputId,spanId}] — tetto al contributo riferito a un importo EUR",
        awards:
          "[{id,calculation,spanIds}] — calculation: percentage(ratePercent,baseFields,capAmount?,capFields?) oppure per_unit(amountPerUnit,quantityField,maxUnits?,capQuantityFields?,capAmount?) oppure fixed(amount)",
        unresolved: "string[] — tutti i requisiti o passaggi non verificati",
      },
    },
    chunks: planSourceChunks(validated.sources).map((chunk, chunkIndex) => ({
      chunkIndex,
      spans: sourceSpans(chunk),
    })),
  };
}
