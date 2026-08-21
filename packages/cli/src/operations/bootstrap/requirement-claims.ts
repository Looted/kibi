import type { SemanticClaim } from "../../utils/strict-modeling.js";

export function claimFor(
  statement: string,
  source: string,
  confidence: number,
  provenance: string,
): SemanticClaim | null {
  const normalized = statement.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim();
  const retention = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>day|days|month|months|year|years)\.?$/i,
  );
  if (
    retention?.groups?.subject &&
    retention.groups.value &&
    retention.groups.unit
  ) {
    const unit = retention.groups.unit.toLowerCase().startsWith("day")
      ? "Days"
      : retention.groups.unit.toLowerCase().startsWith("month")
        ? "Months"
        : "Years";
    return {
      source,
      subjectKey: retention.groups.subject
        .replace(/^(the|a|an)\s+/i, "")
        .trim(),
      propertyKey: `Retention ${unit}`,
      operator: "eq",
      value: Number(retention.groups.value),
      confidence,
      provenance,
    };
  }
  const state = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<value>enabled|disabled)\.?$/i,
  );
  if (state?.groups?.subject && state.groups.value) {
    return {
      source,
      subjectKey: state.groups.subject.trim(),
      propertyKey: "enabled",
      operator: "bool",
      value: state.groups.value.toLowerCase() === "enabled",
      confidence,
      provenance,
    };
  }
  const polarity = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<negative>not\s+)?(?<predicate>.+?)\.?$/i,
  );
  if (!polarity?.groups?.subject || !polarity.groups.predicate) return null;
  return {
    source,
    subjectKey: polarity.groups.subject.trim(),
    propertyKey: polarity.groups.predicate.trim(),
    operator: "polarity",
    value: polarity.groups.negative ? "forbid" : "require",
    confidence,
    provenance,
  };
}
