import { createHash } from "node:crypto";

const DEFAULT_MIN_SCORE = 0.35;

// implements REQ-mcp-suggest-predicates
export function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Predicate suggestion failed: text must be a non-empty string",
    );
  }
  return normalized;
}

// implements REQ-mcp-suggest-predicates
export function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

// implements REQ-mcp-suggest-predicates
export function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

// implements REQ-mcp-suggest-predicates
export function clampScore(value: number | undefined): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : DEFAULT_MIN_SCORE;
  return Math.min(1, Math.max(0, numeric));
}

// implements REQ-mcp-suggest-predicates
export function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// implements REQ-mcp-suggest-predicates
export function hashId(prefix: string, parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `${prefix}-${digest}`;
}

// implements REQ-mcp-suggest-predicates
export function inferSubject(text: string, subjectHint: string | undefined): string {
  const explicit = normalizeOptionalString(subjectHint);
  if (explicit) return explicit;

  const lower = text.toLowerCase();
  if (lower.includes("annotation")) return "editor.annotation";
  if (lower.includes("editor")) return "editor";
  if (lower.includes("session")) return "session";
  if (lower.includes("customer data")) return "customer.data";
  if (lower.includes("user")) return "user";
  return "requirement.subject";
}

// implements REQ-mcp-suggest-predicates
export function inferTrigger(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("navigate")) return "navigation";
  if (lower.includes("escape")) return "escape";
  if (lower.includes("cancel")) return "cancel";
  if (lower.includes("submit")) return "submit";
  return "unspecified_trigger";
}

// implements REQ-mcp-suggest-predicates
export function inferScope(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("draft")) return "draft";
  if (lower.includes("annotation")) return "active_annotation";
  if (lower.includes("session")) return "session";
  return "subject";
}

// implements REQ-mcp-suggest-predicates
export function normalizePredicateToken(value: string): string {
  return value
    .trim()
    .replace(/\b(?:a|an|the)\b\s*/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// implements REQ-mcp-suggest-predicates
export function singularize(value: string): string {
  if (["changes", "status", "results"].includes(value)) return value;
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

// implements REQ-mcp-suggest-predicates
export function normalizeSubjectKey(value: string): string {
  return slug(value).split("_").map(singularize).join(".");
}

// implements REQ-mcp-suggest-predicates
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// implements REQ-mcp-suggest-predicates
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

// implements REQ-mcp-suggest-predicates
export function inferDuration(text: string): string {
  return text.match(/\b\d+\b/)?.[0] ?? "1";
}

// implements REQ-mcp-suggest-predicates
export function inferDurationUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("year")) return "years";
  if (lower.includes("month")) return "months";
  if (lower.includes("day")) return "days";
  return "unit";
}

// implements REQ-mcp-suggest-predicates
export function inferResource(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("latency")) return "latency";
  if (lower.includes("timeout")) return "timeout";
  if (lower.includes("size")) return "size";
  return "resource";
}

// implements REQ-mcp-suggest-predicates
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

// implements REQ-mcp-suggest-predicates
export function inferNumber(text: string): string {
  return text.match(/\b\d+(?:\.\d+)?\b/)?.[0] ?? "0";
}

// implements REQ-mcp-suggest-predicates
export function inferUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("ms")) return "ms";
  if (lower.includes("seconds")) return "seconds";
  if (lower.includes("mb")) return "mb";
  return "unit";
}

// implements REQ-mcp-suggest-predicates
export function inferGate(text: string): string {
  const quoted = text.match(/[`'"](?<gate>[A-Za-z0-9_.:-]+)[`'"]/)?.groups
    ?.gate;
  return quoted ?? "feature_gate";
}

// implements REQ-mcp-suggest-predicates
export function inferEvent(text: string): string {
  const eventName = text.match(/\b[A-Z][A-Za-z0-9]+Event\b/)?.[0];
  return eventName ?? "domain_event";
}
