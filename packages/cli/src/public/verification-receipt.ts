import { createHash } from "node:crypto";

export const VERIFICATION_RECEIPT_VERSION =
  "kibi.verification-receipt.v1" as const;
// implements REQ-kibi-verification-evidence-contract
export const VERIFICATION_RECEIPT_V2_VERSION =
  "kibi.verification-receipt.v2" as const;
// implements REQ-kibi-verification-evidence-contract
export const VERIFICATION_CONTRACT_VERSION =
  "kibi.verification-contract.v1" as const;

export const VERIFICATION_RECEIPT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const VERIFICATION_RECEIPT_OUTCOMES = [
  "passed",
  "failed",
  "errored",
  "cancelled",
  "skipped",
  "timed_out",
  "interrupted",
] as const;

const VERIFICATION_RECEIPT_V1_SCHEMA = {
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

// implements REQ-kibi-verification-evidence-contract
export const VERIFICATION_CONTRACT_SCHEMA = {
  type: "object",
  required: [
    "version",
    "runner",
    "command_argv",
    "required_case_symbols",
    "required_projects",
    "success_policy",
  ],
  properties: {
    version: { type: "string", const: VERIFICATION_CONTRACT_VERSION },
    runner: { type: "string", minLength: 1 },
    command_argv: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    required_case_symbols: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
    required_projects: {
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
    },
    success_policy: {
      type: "string",
      const: "all_required_cases_first_attempt",
    },
  },
  additionalProperties: false,
} as const;

const VERIFICATION_RECEIPT_V2_SCHEMA = {
  ...VERIFICATION_RECEIPT_V1_SCHEMA,
  required: [
    ...VERIFICATION_RECEIPT_V1_SCHEMA.required,
    "command_argv",
    "contract_hash",
    "case_results",
  ],
  properties: {
    ...VERIFICATION_RECEIPT_V1_SCHEMA.properties,
    version: { type: "string", const: VERIFICATION_RECEIPT_V2_VERSION },
    command_argv: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    contract_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    case_results: {
      type: "array",
      maxItems: 1000,
      items: {
        type: "object",
        required: ["symbol_id", "project", "outcome", "retries", "duration_ms"],
        properties: {
          symbol_id: { type: "string", minLength: 1 },
          project: { type: "string", minLength: 1 },
          outcome: {
            type: "string",
            enum: ["passed", "failed", "timed_out", "skipped", "interrupted"],
          },
          retries: { type: "integer", minimum: 0 },
          duration_ms: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    },
  },
} as const;

export const VERIFICATION_RECEIPT_SCHEMA = {
  oneOf: [VERIFICATION_RECEIPT_V1_SCHEMA, VERIFICATION_RECEIPT_V2_SCHEMA],
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

// implements REQ-kibi-verification-evidence-contract
export type VerificationReceiptV2 = VerificationReceipt &
  Readonly<{
    version: typeof VERIFICATION_RECEIPT_V2_VERSION;
    command_argv: readonly string[];
    contract_hash: string;
    case_results: readonly {
      symbol_id: string;
      project: string;
      outcome: "passed" | "failed" | "timed_out" | "skipped" | "interrupted";
      retries: number;
      duration_ms: number;
    }[];
  }>;

// implements REQ-kibi-verification-evidence-contract
export type VerificationContract = Readonly<{
  version: typeof VERIFICATION_CONTRACT_VERSION;
  runner: string;
  command_argv: readonly string[];
  required_case_symbols: readonly string[];
  required_projects: readonly string[];
  success_policy: "all_required_cases_first_attempt";
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
  contract?: Readonly<Record<string, unknown>>,
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
    if (receipt.version === VERIFICATION_RECEIPT_V2_VERSION) {
      const caseResults = receipt.case_results;
      if (!Array.isArray(caseResults) || caseResults.length === 0) {
        errors.push(
          `${prefix}.case_results must contain at least one contracted case`,
        );
      } else {
        const seenCases = new Set<string>();
        for (const [caseIndex, caseResult] of caseResults.entries()) {
          if (
            !caseResult ||
            typeof caseResult !== "object" ||
            Array.isArray(caseResult)
          ) {
            errors.push(
              `${prefix}.case_results[${caseIndex}] must be an object`,
            );
            continue;
          }
          const row = caseResult as Record<string, unknown>;
          const key = `${String(row.project ?? "")}\0${String(row.symbol_id ?? "")}`;
          if (seenCases.has(key))
            errors.push(
              `${prefix}.case_results duplicates '${key.replace("\0", "/")}'`,
            );
          seenCases.add(key);
          if (
            typeof row.retries !== "number" ||
            !Number.isInteger(row.retries) ||
            row.retries < 0
          )
            errors.push(
              `${prefix}.case_results[${caseIndex}].retries must be a non-negative integer`,
            );
          if (
            typeof row.duration_ms !== "number" ||
            !Number.isInteger(row.duration_ms) ||
            row.duration_ms < 0
          )
            errors.push(
              `${prefix}.case_results[${caseIndex}].duration_ms must be a non-negative integer`,
            );
        }
      }
      if (contract && typeof receipt.contract_hash === "string") {
        const expectedHash = verificationContractHash(contract);
        if (receipt.contract_hash !== expectedHash)
          errors.push(
            `${prefix}.contract_hash does not match the verification_contract`,
          );
      }
    }
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

// implements REQ-kibi-verification-evidence-contract
export function verificationContractHash(
  contract: Readonly<Record<string, unknown>>,
): string {
  return createHash("sha256").update(canonicalJson(contract)).digest("hex");
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
