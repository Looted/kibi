import {
  type Payload,
  normalizeKey,
  normalizeSubjectKey,
  singularize,
  strictSuggestion,
} from "./shared.js";
import type { SemanticModelingSuggestion } from "./types.js";

const NUMBER_WORDS = new Map<string, number>([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
]);

export function numberToken(value: string): number | null {
  return /^\d+$/.test(value)
    ? Number(value)
    : (NUMBER_WORDS.get(value.toLowerCase()) ?? null);
}

export function whenParsedNumber<T>(
  value: number | null,
  then: (value: number) => T,
): T | null {
  if (value === null) return null;
  return then(value);
}

type CardinalityGroups = Readonly<{
  operator: string;
  value: string;
  resource: string;
  scope?: string;
}>;

type CappedGroups = Readonly<{
  subject: string;
  property?: string;
  value: string;
}>;

// implements REQ-mcp-semantic-advisor-preflight
export function detectCountStrictSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  // Every group but `scope` is mandatory, so a match carries them all, and the
  // value group only admits tokens numberToken parses.
  const cardinality = statement.match(
    /\b(?<operator>at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to)\s+(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<resource>[a-z][a-z\s_-]*?)(?:\s+(?:under|in|below)\s+`?(?<scope>\/[^\s`]*)`?)?\.?$/i,
  )?.groups as CardinalityGroups | undefined;
  if (cardinality) {
    const {
      operator: operatorText,
      value: valueText,
      resource: resourceText,
      scope,
    } = cardinality;
    return whenParsedNumber(numberToken(valueText), (parsed) => {
      const normalized = normalizeKey(resourceText);
      const tail = singularize(
        normalized.slice(normalized.lastIndexOf("_") + 1),
      );
      const operator = /at\s+least/i.test(operatorText)
        ? "gte"
        : /exactly/i.test(operatorText)
          ? "eq"
          : "lte";
      return strictSuggestion(
        payload,
        `${operatorText} ${valueText}`,
        {
          // "at least 30 routes under /api/orgs" counts the routes under the
          // prefix, the subject a source proof with path_prefix reads.
          subject_key: scope
            ? normalizeSubjectKey(`${resourceText} ${scope}`)
            : tail === "session"
              ? "user.session"
              : normalized.replace(/_/g, "."),
          property_key: normalized.includes("active_session")
            ? "active_count"
            : "count",
          operator,
          value_type: "int",
          value_int: parsed,
        },
        "Bounded cardinality is a strict numeric property and should be modeled explicitly.",
        0.9,
      );
    });
  }
  const capped = statement.match(
    /^(?<subject>.+?)\s+cap(?:s|ped)?\s+at\s+(?:(?<property>[a-z][a-z\s_-]*?)\s+)?(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\.?$/i,
  )?.groups as CappedGroups | undefined;
  if (!capped) return null;
  const {
    subject: subjectText,
    property: propertyText,
    value: valueText,
  } = capped;
  return whenParsedNumber(numberToken(valueText), (parsed) =>
    strictSuggestion(
      payload,
      `cap at ${valueText}`,
      {
        subject_key: normalizeSubjectKey(subjectText),
        property_key: propertyText
          ? `${normalizeKey(propertyText)}_cap`
          : "count",
        operator: "lte",
        value_type: "int",
        value_int: parsed,
      },
      "Cap-at prose is an upper-bound strict property and should be modeled explicitly.",
      0.9,
    ),
  );
}
