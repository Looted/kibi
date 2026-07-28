export type EvidenceValue = string | number | boolean | null;

export type EvidenceClaim = Readonly<{
  key: string;
  value: EvidenceValue;
}>;

export type EvidenceSource = Readonly<{
  complete: boolean;
  integrityValid: boolean;
  claims: readonly EvidenceClaim[];
  snapshot?: unknown;
}>;

export function evidenceConflictKeys(
  sources: readonly EvidenceSource[],
): string[] {
  const observed = new Map<string, EvidenceValue>();
  const conflicts = new Set<string>();
  for (const source of sources) {
    for (const claim of source.claims) {
      const previous = observed.get(claim.key);
      if (previous !== undefined && !Object.is(previous, claim.value)) {
        conflicts.add(claim.key);
      } else {
        observed.set(claim.key, claim.value);
      }
    }
  }
  return [...conflicts].sort();
}

export function redactEvidence(
  value: unknown,
  sentinels: readonly string[],
): unknown {
  if (typeof value === "string") {
    return sentinels.some((sentinel) => value.includes(sentinel))
      ? "[REDACTED]"
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactEvidence(entry, sentinels));
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /(?:api[-_]?key|auth|credential|password|secret|token)/i.test(key)
        ? "[REDACTED]"
        : redactEvidence(entry, sentinels),
    ]),
  );
}
