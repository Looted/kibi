import {
  type Payload,
  shortHash,
  sourceOf,
  statementOf,
  stringValue,
} from "./shared.js";

// implements REQ-mcp-semantic-advisor-preflight, REQ-model-predicates-plan-roundtrip
/**
 * A review observation the advisor suggests for unresolved prose. The review
 * tags (`review:ambiguity`, `review:ontology-gap`, ...) stay in `tags`: a tag
 * is not a KB entity, so the plan carries no relationship to it, and the
 * step explains itself in `document.body` (an observation without body
 * context fails entity-context-missing), so kb_upsert accepts it as returned.
 */
export function observationPlan(
  payload: Payload,
  title: string,
  tags: readonly string[],
): readonly Readonly<Record<string, unknown>>[] {
  const factId = `FACT-OBS-${shortHash(`${stringValue(payload.id)}.${title}.${statementOf(payload)}`)}`;
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
      document: {
        body: `${title}. The semantic advisor suggested this review observation because the prose below is not safely grounded by a typed fact; it stays open until a reviewer models, rewords or dismisses the claim.\n\n> ${statementOf(payload).trim().replace(/\n/g, "\n> ")}`,
      },
      relationships: [],
    },
  ];
}
