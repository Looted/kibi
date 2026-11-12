export function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Requirement modeling failed: text must be a non-empty string",
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

export function clampConfidence(confidence: number | undefined): number {
  // Number.isFinite is false for every non-number, so it is the whole guard.
  const numeric = Number.isFinite(confidence) ? (confidence as number) : 0.8;
  return Math.round(Math.min(1, Math.max(0, numeric)) * 100) / 100;
}

export function normalizeClaimValue(
  value: unknown,
): string | number | boolean | readonly string[] {
  if (Array.isArray(value)) {
    const members = value.map((member) =>
      typeof member === "string" ? member.trim() : "",
    );
    if (members.length === 0 || members.some((member) => member === ""))
      throw new Error(
        "Requirement modeling failed: a set value must be a non-empty list of non-empty strings",
      );
    return [...new Set(members)].sort();
  }
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
    "Requirement modeling failed: value must be a string, number, boolean, or a list of strings",
  );
}

export function stripListPrefix(value: string): string {
  // One separator character is enough to match: the next pattern skips
  // leading whitespace and the final trim drops the rest.
  return value
    .replace(/^\s*[-*+]\s/, "")
    .replace(/^\s*\d+[.)]\s/, "")
    .trim();
}

export function trimSentenceTail(value: string): string {
  return value.replace(/[\s.?!:;]+$/g, "").trim();
}

export function cleanSubject(value: string): string {
  const cleaned = trimSentenceTail(stripListPrefix(value));
  // `cleaned` is already trimmed, so dropping the article leaves no edge space.
  return cleaned.replace(/^(?:the|a|an)\s+/i, "") || cleaned;
}

export function cleanPredicate(value: string): string {
  return trimSentenceTail(stripListPrefix(value)) || "statement";
}
