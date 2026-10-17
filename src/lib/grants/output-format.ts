// Provider-side shape constraints complement, never replace, schema.ts validation.
type Schema = Record<string, unknown>;
const text = { type: "string" };
const id = { type: "string", pattern: "^[a-z][a-z0-9_]{0,63}$" };
const number = { type: "number" };
const array = (items: Schema, maxItems: number): Schema => ({ type: "array", items, maxItems });
const object = (
  properties: Record<string, Schema>,
  required = Object.keys(properties),
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const op = (...values: string[]): Schema => ({ type: "string", enum: values });
const predicate = { $ref: "#/$defs/predicate" },
  expression = { $ref: "#/$defs/expression" };
const scalar = { type: ["string", "number", "boolean"] };
const citations = {
  ...array(
    object({
      documentId: id,
      page: { type: "integer", minimum: 1 },
      quote: { type: "string", minLength: 12 },
    }),
    20,
  ),
  minItems: 1,
};
const baseRule = { id, label: text, when: predicate, citations };
export const GENERATION_FORMAT = {
  type: "json_schema",
  json_schema: {
    ...object({
      description: text,
      questions: array(
        object(
          {
            id,
            section: text,
            label: text,
            type: op("boolean", "number", "text", "select"),
            required: { type: "boolean" },
            citations,
            options: array(object({ value: text, label: text }), 100),
            unit: text,
            help: text,
            min: number,
            max: number,
            integer: { type: "boolean" },
            showIf: predicate,
          },
          ["id", "section", "label", "type", "required", "citations"],
        ),
        150,
      ),
      rules: array(
        {
          anyOf: [
            object(
              {
                ...baseRule,
                kind: op("eligibility", "exclusion", "document"),
                condition: predicate,
              },
              ["id", "label", "kind", "condition", "citations"],
            ),
            object(
              { ...baseRule, kind: op("score", "grant"), formula: expression, maximum: number },
              ["id", "label", "kind", "formula", "citations"],
            ),
          ],
        },
        250,
      ),
      unresolved: array(text, 100),
      coverage: array(
        object(
          { requirementId: id, questionIds: array(id, 150), ruleIds: array(id, 250), gap: text },
          ["requirementId", "questionIds", "ruleIds"],
        ),
        80,
      ),
    }),
    $defs: {
      predicate: {
        anyOf: [
          object({
            op: op("compare_fields"),
            field: id,
            otherField: id,
            comparison: op("eq", "ne", "gt", "gte", "lt", "lte"),
          }),
          object({ op: op("eq", "ne"), field: id, value: scalar }),
          object({ op: op("gt", "gte", "lt", "lte"), field: id, value: number }),
          object({
            op: op("compare"),
            comparison: op("eq", "ne", "gt", "gte", "lt", "lte"),
            left: expression,
            right: expression,
          }),
          object({ op: op("in"), field: id, values: { ...array(scalar, 100), minItems: 1 } }),
          object({ op: op("all", "any"), args: { ...array(predicate, 30), minItems: 1 } }),
          object({ op: op("not"), arg: predicate }),
        ],
      },
      expression: {
        anyOf: [
          object({ op: op("constant"), value: number }),
          object({ op: op("field"), field: id }),
          object({
            op: op("add", "multiply", "min", "max"),
            args: { ...array(expression, 30), minItems: 1 },
          }),
          object({ op: op("subtract", "divide"), left: expression, right: expression }),
          object({ op: op("if"), when: predicate, then: expression, otherwise: expression }),
        ],
      },
    },
  },
};
