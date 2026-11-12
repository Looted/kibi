import { createHash } from "node:crypto";
import { singularizeToken } from "../semantic-advisor/shared.js";

const DEFAULT_MIN_SCORE = 0.35;

export function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Predicate suggestion failed: text must be a non-empty string",
    );
  }
  return normalized;
}

export function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  // Number.isFinite is false for every non-number.
  const numeric = Number.isFinite(value) ? (value as number) : fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

export function clampScore(value: number | undefined): number {
  const numeric = Number.isFinite(value)
    ? (value as number)
    : DEFAULT_MIN_SCORE;
  return Math.min(1, Math.max(0, numeric));
}

// Named capture groups of the first match of `pattern` in `text`; a text
// that does not match captures nothing, so every group reads as undefined.
export function captures(
  text: string,
  pattern: RegExp,
): Readonly<Record<string, string | undefined>> {
  return text.match(pattern)?.groups ?? {};
}

export function slug(value: string): string {
  // Edge whitespace becomes an edge underscore, which the last step drops;
  // every run of other characters (underscores included) is one underscore.
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function hashId(prefix: string, parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `${prefix}-${digest}`;
}

/**
 * The subject a predicate binds when the caller names none. An explicit
 * subjectHint wins, then the subject_key of the subject fact the requirement
 * already constrains. The keyword heuristics only apply to free text: for a
 * requirement without a subject fact the subject stays a placeholder, so the
 * agent binds it instead of getting a demo subject such as editor.annotation.
 */
export function inferSubject(
  text: string,
  subjectHint: string | undefined,
  requirement?: Readonly<{
    requirementId?: string | undefined;
    subjectKey?: string | undefined;
  }>,
): string {
  const explicit = normalizeOptionalString(subjectHint);
  if (explicit) return explicit;
  const grounded = normalizeOptionalString(requirement?.subjectKey);
  if (grounded) return grounded;
  if (normalizeOptionalString(requirement?.requirementId))
    return "requirement.subject";

  const lower = text.toLowerCase();
  if (lower.includes("annotation")) return "editor.annotation";
  if (lower.includes("editor")) return "editor";
  if (lower.includes("session")) return "session";
  if (lower.includes("customer data")) return "customer.data";
  if (lower.includes("user")) return "user";
  return "requirement.subject";
}

export function inferTrigger(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("navigate")) return "navigation";
  if (lower.includes("escape")) return "escape";
  if (lower.includes("cancel")) return "cancel";
  if (lower.includes("submit")) return "submit";
  if (/\bclick/.test(lower)) return "click";
  if (/\b(?:times?|timed)[\s-]?out\b/.test(lower)) return "timeout";
  return "unspecified_trigger";
}

export function inferScope(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("draft")) return "draft";
  if (lower.includes("annotation")) return "active_annotation";
  if (lower.includes("session")) return "session";
  if (/\bchanges?\b/.test(lower)) return "changes";
  return "subject";
}

export function normalizePredicateToken(value: string): string {
  // Edge whitespace becomes an edge underscore, which the last step drops.
  return value
    .replace(/\b(?:a|an|the)\b\s*/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function singularize(value: string): string {
  // "status" needs no entry: singularizeToken keeps every "-us" word.
  return singularizeToken(value, ["changes", "results"]);
}

export function normalizeSubjectKey(value: string): string {
  return slug(value).split("_").map(singularize).join(".");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesKeyword(
  text: string,
  lowerText: string,
  keyword: string,
): boolean {
  const normalized = keyword.toLowerCase();
  if (/^[a-z0-9\s-]+$/.test(normalized)) {
    const pattern = escapeRegExp(normalized).replace(/\s+/g, "\\s+");
    return new RegExp(`\\b${pattern}\\b`, "i").test(text);
  }
  return lowerText.includes(normalized);
}

export function inferDuration(text: string): string {
  return text.match(/\b\d+\b/)?.[0] ?? "1";
}

export function inferDurationUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("year")) return "years";
  if (lower.includes("month")) return "months";
  if (lower.includes("day")) return "days";
  return "unit";
}

export function inferResource(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("latency")) return "latency";
  if (lower.includes("timeout")) return "timeout";
  if (lower.includes("size")) return "size";
  return "resource";
}

export function inferOperator(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("minimum") || lower.includes("at least")) return "gte";
  if (
    lower.includes("not exceed") ||
    lower.includes("not be more than") ||
    lower.includes("no more than") ||
    lower.includes("at most") ||
    lower.includes("maximum")
  ) {
    return "lte";
  }
  if (lower.includes("not")) return "neq";
  return "lte";
}

export function inferNumber(text: string): string {
  return text.match(/\b\d+(?:\.\d+)?\b/)?.[0] ?? "0";
}

export function inferUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("ms")) return "ms";
  if (lower.includes("seconds")) return "seconds";
  if (lower.includes("mb")) return "mb";
  return "unit";
}

export function inferGate(text: string): string {
  return text.match(/[`'"]([A-Za-z0-9_.:-]+)[`'"]/)?.[1] ?? "feature_gate";
}

export function inferEvent(text: string): string {
  const eventName = text.match(/\b[A-Z][A-Za-z0-9]+Event\b/)?.[0];
  return eventName ?? "domain_event";
}
