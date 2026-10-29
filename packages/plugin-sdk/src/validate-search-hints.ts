import {
  SEARCH_HINTS_MAX_LIMIT,
  type SearchHint,
  type SearchHintsResult,
  type SearchHintsV1,
} from "./capabilities/search-hints.js";
import { PluginValidationError } from "./validation-error.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PluginValidationError(
      code,
      `${field} must be a non-empty string`,
    );
  }
  return value.trim();
}

function failResult(message: string): never {
  throw new PluginValidationError("INVALID_CAPABILITY_RESULT", message);
}

/** A searchHints capability exposes an id, a model and hint(). */
// implements REQ-capability-search-hints-v1
export function validateSearchHints(value: unknown): SearchHintsV1 {
  if (!isRecord(value) || typeof value.hint !== "function") {
    throw new PluginValidationError(
      "INVALID_CAPABILITY",
      "searchHints must expose hint()",
    );
  }
  return {
    id: requireString(value.id, "searchHints.id", "INVALID_CAPABILITY"),
    model: requireString(
      value.model,
      "searchHints.model",
      "INVALID_CAPABILITY",
    ),
    hint: value.hint as SearchHintsV1["hint"],
  };
}

/**
 * Validate a search-hints result against the entities that were sent. Every
 * hint must name a supplied entity once, scores must lie in [0, 1] and run
 * from highest to lowest (ties by id), and no more than `limit` hints may be
 * returned, so a provider cannot invent or reorder evidence.
 */
// implements REQ-capability-search-hints-v1
export function validateSearchHintsResult(
  value: unknown,
  entityIds: readonly string[],
  limit: number,
): SearchHintsResult {
  if (!isRecord(value) || !Array.isArray(value.hints))
    failResult("searchHints result must include hints[]");
  const max = Math.min(limit, SEARCH_HINTS_MAX_LIMIT);
  if (value.hints.length > max)
    failResult(
      `searchHints returned ${value.hints.length} hints; at most ${max} were requested`,
    );
  const allowed = new Set(entityIds);
  const seen = new Set<string>();
  const hints: SearchHint[] = value.hints.map((hint: unknown, index) => {
    if (!isRecord(hint)) failResult(`hints[${index}] must be an object`);
    const id = requireString(
      hint.id,
      `hints[${index}].id`,
      "INVALID_CAPABILITY_RESULT",
    );
    if (!allowed.has(id))
      failResult(`hints[${index}].id '${id}' is not a supplied entity`);
    if (seen.has(id)) failResult(`duplicate hint for '${id}'`);
    seen.add(id);
    const score = hint.score;
    if (typeof score !== "number" || !(score >= 0 && score <= 1))
      failResult(`hints[${index}].score must be a number between 0 and 1`);
    return { id, score };
  });
  hints.forEach((current, index) => {
    const previous = hints[index - 1];
    if (
      previous !== undefined &&
      (current.score > previous.score ||
        // rationale: equal ids were rejected as duplicates above, so < and
        // <= cannot differ here.
        // Stryker disable next-line EqualityOperator
        (current.score === previous.score && current.id < previous.id))
    )
      failResult(
        `hints[${index}] is out of order: hints run from highest score to lowest, ties by id`,
      );
  });
  return { hints };
}
