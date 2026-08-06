// implements REQ-002
export function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Requirement modeling failed: text must be a non-empty string",
    );
  }
  return normalized;
}

// implements REQ-002
export function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

// implements REQ-002
export function normalizeSourceFiles(
  sourceFiles: string[] | undefined,
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const sourceFile of sourceFiles ?? []) {
    const trimmed = String(sourceFile ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

// implements REQ-002
export function clampConfidence(confidence: number | undefined): number {
  const numeric =
    typeof confidence === "number" && Number.isFinite(confidence)
      ? confidence
      : 0.8;
  return Math.round(Math.min(1, Math.max(0, numeric)) * 100) / 100;
}

// implements REQ-002
export function normalizeClaimValue(value: unknown): string | number | boolean {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(
        "Requirement modeling failed: value must be a finite number",
      );
    }
    return value;
  }
  throw new Error(
    "Requirement modeling failed: value must be a string, number, or boolean",
  );
}

// implements REQ-002
export function stripListPrefix(value: string): string {
  return value
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

// implements REQ-002
export function trimSentenceTail(value: string): string {
  return value.replace(/[\s.?!:;]+$/g, "").trim();
}

// implements REQ-002
export function cleanSubject(value: string): string {
  const cleaned = trimSentenceTail(stripListPrefix(value));
  return cleaned.replace(/^(?:the|a|an)\s+/i, "").trim() || cleaned;
}

// implements REQ-002
export function cleanPredicate(value: string): string {
  return trimSentenceTail(stripListPrefix(value)) || "statement";
}
