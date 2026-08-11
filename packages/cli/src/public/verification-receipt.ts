export const VERIFICATION_RECEIPT_VERSION =
  "kibi.verification-receipt.v1" as const;

export const VERIFICATION_RECEIPT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const VERIFICATION_RECEIPT_OUTCOMES = [
  "passed",
  "failed",
  "errored",
  "cancelled",
  "skipped",
] as const;

export const VERIFICATION_RECEIPT_SCHEMA = {
  type: "object",
  required: [
    "version",
    "receipt_id",
    "test_id",
    "runner",
    "command",
    "scope",
    "outcome",
    "code_snapshot",
    "environment_hash",
    "started_at",
    "finished_at",
    "artifact_digest",
  ],
  properties: {
    version: { type: "string", const: VERIFICATION_RECEIPT_VERSION },
    receipt_id: {
      type: "string",
      pattern: "^VR-[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$",
    },
    test_id: { type: "string", minLength: 1 },
    runner: { type: "string", minLength: 1 },
    command: { type: "string", minLength: 1 },
    scope: { type: "string", enum: ["unit", "integration", "end_to_end"] },
    outcome: { type: "string", enum: [...VERIFICATION_RECEIPT_OUTCOMES] },
    code_snapshot: { type: "string", pattern: "^[a-f0-9]{64}$" },
    environment_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    started_at: { type: "string", minLength: 1 },
    finished_at: { type: "string", minLength: 1 },
    artifact_digest: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
  additionalProperties: false,
} as const;

export type VerificationReceipt = Readonly<{
  version: typeof VERIFICATION_RECEIPT_VERSION;
  receipt_id: string;
  test_id: string;
  runner: string;
  command: string;
  scope: "unit" | "integration" | "end_to_end";
  outcome: (typeof VERIFICATION_RECEIPT_OUTCOMES)[number];
  code_snapshot: string;
  environment_hash: string;
  started_at: string;
  finished_at: string;
  artifact_digest: string;
}>;

function timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function verificationReceiptHistoryErrors(
  testId: string,
  verificationScope: unknown,
  receipts: readonly Readonly<Record<string, unknown>>[],
): readonly string[] {
  const errors: string[] = [];
  let previousFinishedAt: number | null = null;
  if (receipts.length > 0 && typeof verificationScope !== "string") {
    errors.push(
      "verification_scope is required when verification_receipts are present",
    );
  }
  const receiptIds = new Set<string>();
  for (const [index, receipt] of receipts.entries()) {
    const prefix = `verification_receipts[${index}]`;
    const receiptId = receipt.receipt_id;
    if (typeof receiptId === "string") {
      if (receiptIds.has(receiptId)) {
        errors.push(`${prefix}.receipt_id duplicates '${receiptId}'`);
      }
      receiptIds.add(receiptId);
    }
    if (receipt.test_id !== testId) {
      errors.push(`${prefix}.test_id must equal '${testId}'`);
    }
    if (
      typeof verificationScope === "string" &&
      receipt.scope !== verificationScope
    ) {
      errors.push(
        `${prefix}.scope must equal the test verification_scope '${verificationScope}'`,
      );
    }
    const startedAt = timestamp(receipt.started_at);
    const finishedAt = timestamp(receipt.finished_at);
    if (startedAt === null)
      errors.push(`${prefix}.started_at must be ISO-8601`);
    if (finishedAt === null)
      errors.push(`${prefix}.finished_at must be ISO-8601`);
    if (startedAt !== null && finishedAt !== null && finishedAt < startedAt) {
      errors.push(`${prefix}.finished_at must not precede started_at`);
    }
    if (
      finishedAt !== null &&
      previousFinishedAt !== null &&
      finishedAt <= previousFinishedAt
    ) {
      errors.push(
        `${prefix}.finished_at must be strictly later than the previous receipt`,
      );
    }
    if (finishedAt !== null) previousFinishedAt = finishedAt;
  }
  return errors;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function appendOnlyVerificationReceiptHistoryErrors(
  previous: readonly Readonly<Record<string, unknown>>[],
  next: readonly Readonly<Record<string, unknown>>[] | undefined,
): readonly string[] {
  if (previous.length === 0) return [];
  if (next === undefined) {
    return [
      "verification_receipts is append-only and cannot be removed from an existing test",
    ];
  }
  if (next.length < previous.length) {
    return [
      `verification_receipts is append-only: expected at least ${previous.length} historical receipt(s), received ${next.length}`,
    ];
  }
  for (const [index, receipt] of previous.entries()) {
    if (canonicalJson(next[index]) !== canonicalJson(receipt)) {
      return [
        `verification_receipts is append-only: historical receipt at index ${index} was changed, removed, or reordered`,
      ];
    }
  }
  return [];
}
