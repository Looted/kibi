import {
  type Payload,
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
  return [
    {
      type: "fact",
      id: `FACT-OBS-${shortHash(`${stringValue(payload.id)}.${title}.${statementOf(payload)}`)}`,
      properties: {
        title,
        status: "active",
        source: sourceOf(payload),
        fact_kind: "observation",
        text_ref: statementOf(payload),
        tags,
      },
      relationships: [],
    },
  ];
}
