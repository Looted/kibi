import {
  type Payload,
  normalizeSubjectKey,
  strictSuggestion,
} from "./shared.js";
import { detectCountStrictSuggestion } from "./strict-count-rules.js";
import type {
  SemanticModelingSuggestion,
  SemanticStrictPropertyClaim,
} from "./types.js";

function suggestion(
  payload: Payload,
  match: RegExpMatchArray,
  claim: SemanticStrictPropertyClaim,
  rationale: string,
  confidence: number,
  evidence = match[0],
): SemanticModelingSuggestion {
  return strictSuggestion(payload, evidence, claim, rationale, confidence);
}

// implements REQ-mcp-semantic-advisor-preflight
export function detectStrictSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const expiry = statement.match(
    /^(?<subject>.+?)\s+expir(?:e|es)\s+after\s+(?<value>\d+)\s+(?<unit>days?|months?|years?|hours?|minutes?)\.?$/i,
  );
  if (expiry?.groups?.subject && expiry.groups.value && expiry.groups.unit) {
    const unit = expiry.groups.unit.toLowerCase().replace(/s?$/, "s");
    return suggestion(
      payload,
      expiry,
      {
        subject_key: normalizeSubjectKey(expiry.groups.subject),
        property_key: `expiry_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(expiry.groups.value),
        unit,
      },
      "Expiry duration is a scalar strict property and should be explicit.",
      0.88,
      `expire after ${expiry.groups.value} ${expiry.groups.unit}`,
    );
  }

  const comparative = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<operator>less\s+than|greater\s+than|below|above|minimum|maximum|at\s+least|at\s+most)\s+(?<value>\d+)\.?$/i,
  );
  if (
    comparative?.groups?.subject &&
    comparative.groups.operator &&
    comparative.groups.value
  ) {
    const operatorText = comparative.groups.operator.toLowerCase();
    const operator = /less|below/.test(operatorText)
      ? "lt"
      : /greater|above/.test(operatorText)
        ? "gt"
        : /minimum|least/.test(operatorText)
          ? "gte"
          : "lte";
    return suggestion(
      payload,
      comparative,
      {
        subject_key: normalizeSubjectKey(comparative.groups.subject),
        property_key: "value",
        operator,
        value_type: "int",
        value_int: Number(comparative.groups.value),
      },
      "Comparative numeric prose is a strict property constraint.",
      0.86,
      `${comparative.groups.operator} ${comparative.groups.value}`,
    );
  }

  const precision = statement.match(
    /^.+?\s+(?:must|shall|should)\s+normalize\s+into\s+canonical\s+integer\s+decisecond\s+(?<subject>[a-z][a-z0-9_-]*)\s+values?\.?$/i,
  );
  if (precision?.groups?.subject) {
    return suggestion(
      payload,
      precision,
      {
        subject_key: normalizeSubjectKey(precision.groups.subject),
        property_key: "slot_precision",
        operator: "eq",
        value_type: "string",
        value_string: "decisecond",
      },
      "Canonical decisecond slot prose is a strict precision property.",
      0.9,
    );
  }

  const threshold = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+return\s+within\s+(?<value>\d+)\s+(?<unit>ms|milliseconds?|s|sec|secs|seconds?)\.?$/i,
  );
  if (
    threshold?.groups?.subject &&
    threshold.groups.value &&
    threshold.groups.unit
  ) {
    const unit = threshold.groups.unit.toLowerCase().startsWith("m")
      ? "ms"
      : "seconds";
    return suggestion(
      payload,
      threshold,
      {
        subject_key: normalizeSubjectKey(threshold.groups.subject),
        property_key: unit === "ms" ? "latency_ms" : "latency_seconds",
        operator: "lte",
        value_type: "int",
        value_int: Number(threshold.groups.value),
        unit,
      },
      "Response-time thresholds are bounded numeric properties and should be modeled explicitly.",
      0.88,
      `within ${threshold.groups.value} ${threshold.groups.unit}`,
    );
  }

  const booleanState = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>enabled|disabled)\.?$/i,
  );
  if (booleanState?.groups?.subject && booleanState.groups.state) {
    return suggestion(
      payload,
      booleanState,
      {
        subject_key: normalizeSubjectKey(booleanState.groups.subject),
        property_key: "enabled",
        operator: "eq",
        value_type: "bool",
        value_bool: booleanState.groups.state.toLowerCase() === "enabled",
      },
      "Enabled/disabled requirements are boolean properties and can participate in strict checks.",
      0.88,
      `be ${booleanState.groups.state}`,
    );
  }

  const retention = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>days?|months?|years?)\.?$/i,
  );
  if (
    retention?.groups?.subject &&
    retention.groups.value &&
    retention.groups.unit
  ) {
    const unit = retention.groups.unit.toLowerCase().replace(/s$/, "s");
    return suggestion(
      payload,
      retention,
      {
        subject_key: normalizeSubjectKey(retention.groups.subject),
        property_key: `retention_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(retention.groups.value),
        unit,
      },
      "Retention duration is a scalar strict property and can participate in contradiction checks.",
      0.92,
      `retained for ${retention.groups.value} ${retention.groups.unit}`,
    );
  }

  const enumSet = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+one\s+of\s+(?<values>.+?)\.?$/i,
  );
  if (enumSet?.groups?.subject && enumSet.groups.values) {
    const values = enumSet.groups.values
      .split(/,|\bor\b/i)
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length > 1)
      return suggestion(
        payload,
        enumSet,
        {
          subject_key: normalizeSubjectKey(enumSet.groups.subject),
          property_key: "allowed_values",
          operator: "eq",
          value_type: "string",
          value_string: values.join("|"),
        },
        "Allowed enum sets are explicit property values and should not remain prose-only.",
        0.86,
        `one of ${enumSet.groups.values}`,
      );
  }

  return detectCountStrictSuggestion(payload, statement);
}
