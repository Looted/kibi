import {
  type Payload,
  relationship,
  shortHash,
  sourceOf,
  statementOf,
  stringValue,
} from "./shared.js";

// implements REQ-mcp-semantic-advisor-preflight
export function observationPlan(
  payload: Payload,
  title: string,
  tags: readonly string[],
): readonly Readonly<Record<string, unknown>>[] {
  const factId = `FACT-OBS-${shortHash(`${stringValue(payload.id)}.${title}.${statementOf(payload)}`)}`;
  const target = tags.includes("review:ambiguity")
    ? "review:ambiguous-claim"
    : tags.includes("review:keyword-false-positive")
      ? "review:keyword-false-positive"
      : tags.includes("review:ontology-gap")
        ? "review:ontology-gap"
        : tags.includes("review:nonlogical")
          ? "review:nonlogical"
          : undefined;
  return [
    {
      type: "fact",
      id: factId,
      properties: {
        title,
        status: "active",
        source: sourceOf(payload),
        fact_kind: "observation",
        text_ref: statementOf(payload),
        tags,
      },
      relationships:
        target === undefined
          ? []
          : [relationship(factId, target, "relates_to")],
    },
  ];
}
