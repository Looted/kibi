import {
  type SemanticClaim,
  isConventionalSubjectKey,
  normalizeSubjectKey,
} from "../../utils/strict-modeling.js";

// implements REQ-KIBI-BOOTSTRAP-PLAN
export function normalizeClaimStatement(statement: string): string {
  return statement
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
    .replace(/^\s*\[(?: |x)\]\s*/i, "")
    .trim();
}

export function claimFor(
  statement: string,
  source: string,
  confidence: number,
  provenance: string,
): SemanticClaim | null {
  const cleaned = normalizeClaimStatement(statement);
  if (cleaned.endsWith("?")) return null;
  const normalized = /^(?:must|shall|should)\s+/i.test(cleaned)
    ? `System ${cleaned}`
    : cleaned;
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

export type SubjectKeyResolution =
  | { readonly ok: true; readonly subjectKey: string }
  | { readonly ok: false; readonly reason: string };

/** One lowercase snake segment, or "" when the value has no usable word. */
function snakeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * The bootstrap subject key in the component.aspect[.sub] shape that
 * subject-key-shape checks. A subject that already has that shape is kept.
 * Otherwise the component comes from the declared `component` (claim or
 * knowledge source) and the aspect from the claim's subject; a one-word
 * subject is itself the component and the constrained property becomes the
 * aspect. When no component can be named the claim is not resolved, so the
 * caller reports it instead of writing a malformed key.
 */
// implements REQ-bootstrap-subject-key-shape
export function resolveBootstrapSubjectKey(
  subject: string,
  propertyKey: string,
  component?: string,
): SubjectKeyResolution {
  const stripped = subject.trim().replace(/^(?:the|a|an)\s+/i, "");
  let key: string;
  try {
    key = normalizeSubjectKey(stripped);
  } catch {
    return { ok: false, reason: `subject "${subject}" has no usable words` };
  }
  if (isConventionalSubjectKey(key)) return { ok: true, subjectKey: key };
  const flat = key.replace(/\./g, "_");
  const comp = component === undefined ? "" : snakeSegment(component);
  const property = snakeSegment(propertyKey);
  let candidate: string;
  if (comp) {
    const aspect =
      flat === comp
        ? property
        : flat.startsWith(`${comp}_`)
          ? flat.slice(comp.length + 1)
          : flat;
    candidate = `${comp}.${aspect}`;
  } else if (/^[a-z][a-z0-9]*$/.test(flat) && property) {
    candidate = `${flat}.${property}`;
  } else {
    return {
      ok: false,
      reason: `subject key "${flat}" names no component, so it would violate component.aspect[.sub]`,
    };
  }
  return isConventionalSubjectKey(candidate)
    ? { ok: true, subjectKey: candidate }
    : {
        ok: false,
        reason: `subject key "${candidate}" does not follow component.aspect[.sub]`,
      };
}
