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

// implements REQ-mcp-semantic-advisor-preflight
export function detectCountStrictSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const cardinality = statement.match(
    /\b(?<operator>at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to)\s+(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<resource>[a-z][a-z\s_-]*?)\.?$/i,
  );
  if (
    cardinality?.groups?.operator &&
    cardinality.groups.value &&
    cardinality.groups.resource
  ) {
    const value = numberToken(cardinality.groups.value);
    const suggestion = whenParsedNumber(value, (parsed) => {
      const normalized = normalizeKey(cardinality.groups.resource);
      const tail = singularize(normalized.split("_").at(-1) ?? normalized);
      const operator = /at\s+least/i.test(cardinality.groups.operator)
        ? "gte"
        : /exactly/i.test(cardinality.groups.operator)
          ? "eq"
          : "lte";
      return strictSuggestion(
        payload,
        `${cardinality.groups.operator} ${cardinality.groups.value}`,
        {
          subject_key:
            tail === "session" ? "user.session" : normalized.replace(/_/g, "."),
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
    if (suggestion) return suggestion;
  }
  const capped = statement.match(
    /^(?<subject>.+?)\s+cap(?:s|ped)?\s+at\s+(?:(?<property>[a-z][a-z\s_-]*?)\s+)?(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\.?$/i,
  );
  if (capped?.groups?.subject && capped.groups.value) {
    const value = numberToken(capped.groups.value);
    const suggestion = whenParsedNumber(value, (parsed) =>
      strictSuggestion(
        payload,
        `cap at ${capped.groups.value}`,
        {
          subject_key: normalizeSubjectKey(capped.groups.subject),
          property_key: capped.groups.property
            ? `${normalizeKey(capped.groups.property)}_cap`
            : "count",
          operator: "lte",
          value_type: "int",
          value_int: parsed,
        },
        "Cap-at prose is an upper-bound strict property and should be modeled explicitly.",
        0.9,
      ),
    );
    if (suggestion) return suggestion;
  }
  return null;
}
