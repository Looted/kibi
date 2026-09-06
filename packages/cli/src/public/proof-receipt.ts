import {
  type ProofFingerprintComponents,
  canonicalJson,
  proofContractHash,
} from "./proof-fingerprint.js";
import {
  PROOF_RECEIPT_VERSION,
  PROOF_RESULT_OUTCOMES,
  PROOF_RUN_OUTCOMES,
  type ProofContract,
} from "./proof-protocol.js";

export const PROOF_RECEIPT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const PROOF_RECEIPT_OUTCOMES = [
  "passed",
  "failed",
  "errored",
  "cancelled",
  "skipped",
  "timed_out",
  "interrupted",
] as const;

export const PROOF_RECEIPT_SCHEMA = {
  type: "object",
  description:
    "Kibi-derived kibi.proof-receipt.v1. Receipts are never caller-authored; kb_ingest_proof derives them from kibi.proof-run.v1 artifacts.",
  required: [
    "version",
    "receipt_id",
    "test_id",
    "scope",
    "outcome",
    "code_snapshot",
    "environment_hash",
    "started_at",
    "finished_at",
    "artifact_digest",
    "contract_hash",
    "fingerprint",
    "fingerprint_components",
    "integration_id",
    "producer",
    "command_argv",
    "run_outcome",
    "proof_results",
  ],
  properties: {
    version: { type: "string", const: PROOF_RECEIPT_VERSION },
    receipt_id: {
      type: "string",
      pattern: "^PR-[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$",
    },
    test_id: { type: "string", minLength: 1 },
    scope: { type: "string", enum: ["unit", "integration", "end_to_end"] },
    outcome: { type: "string", enum: [...PROOF_RECEIPT_OUTCOMES] },
    code_snapshot: { type: "string", pattern: "^[a-f0-9]{64}$" },
    environment_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    started_at: { type: "string", minLength: 1 },
    finished_at: { type: "string", minLength: 1 },
    artifact_digest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    contract_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    fingerprint: { type: "string", pattern: "^[a-f0-9]{64}$" },
    fingerprint_components: {
      type: "object",
      required: ["contract", "integration", "command", "bindings", "producer"],
      additionalProperties: false,
      properties: {
        contract: { type: "string", pattern: "^[a-f0-9]{64}$" },
        integration: { type: "string", pattern: "^[a-f0-9]{64}$" },
        command: { type: "string", pattern: "^[a-f0-9]{64}$" },
        bindings: { type: "string", pattern: "^[a-f0-9]{64}$" },
        producer: { type: "string", pattern: "^[a-f0-9]{64}$" },
      },
    },
    integration_id: { type: "string", minLength: 1 },
    producer: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        version: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
    command_argv: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    run_outcome: { type: "string", enum: [...PROOF_RUN_OUTCOMES] },
    proof_results: {
      type: "array",
      minItems: 0,
      maxItems: 1000,
      items: {
        type: "object",
        required: ["symbol_id", "target", "outcome", "binding", "attempts"],
        properties: {
          symbol_id: { type: "string", minLength: 1 },
          target: { type: "string", minLength: 1 },
          outcome: { type: "string", enum: [...PROOF_RESULT_OUTCOMES] },
          binding: { type: "string", enum: ["native_case", "aggregate_run"] },
          native_id: { type: "string", minLength: 1 },
          attempts: {
            oneOf: [
              {
                type: "object",
                required: ["status", "entries"],
                properties: {
                  status: { type: "string", const: "complete" },
                  entries: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["outcome"],
                      properties: {
                        outcome: {
                          type: "string",
                          enum: [...PROOF_RESULT_OUTCOMES],
                        },
                        duration_ms: { type: "number", minimum: 0 },
                      },
                      additionalProperties: false,
                    },
                  },
                },
                additionalProperties: false,
              },
              {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", const: "unavailable" },
                },
                additionalProperties: false,
              },
            ],
          },
        },
        additionalProperties: false,
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        required: ["symbol_id", "target", "reason"],
        properties: {
          symbol_id: { type: "string", minLength: 1 },
          target: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export type ProofReceipt = Readonly<{
  version: typeof PROOF_RECEIPT_VERSION;
  receipt_id: string;
  test_id: string;
  scope: "unit" | "integration" | "end_to_end";
  outcome: (typeof PROOF_RECEIPT_OUTCOMES)[number];
  code_snapshot: string;
  environment_hash: string;
  started_at: string;
  finished_at: string;
  artifact_digest: string;
  contract_hash: string;
  fingerprint: string;
  fingerprint_components: ProofFingerprintComponents;
  integration_id: string;
  producer: { readonly name: string; readonly version?: string };
  command_argv: readonly string[];
  run_outcome: (typeof PROOF_RUN_OUTCOMES)[number];
  proof_results: readonly {
    readonly symbol_id: string;
    readonly target: string;
    readonly outcome: (typeof PROOF_RESULT_OUTCOMES)[number];
    readonly binding: "native_case" | "aggregate_run";
    readonly native_id?: string;
    readonly attempts:
      | {
          readonly status: "complete";
          readonly entries: readonly {
            readonly outcome: string;
            readonly duration_ms?: number;
          }[];
        }
      | { readonly status: "unavailable" };
  }[];
  gaps?: readonly {
    readonly symbol_id: string;
    readonly target: string;
    readonly reason: string;
  }[];
}>;

export function finishedAtPrecedesStartedAt(
  startedAt: number | null,
  finishedAt: number | null,
): boolean {
  return startedAt !== null && finishedAt !== null && finishedAt < startedAt;
}

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

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hex64(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validAttempts(value: unknown): boolean {
  const row = isRecord(value) ? value : null;
  if (!row) return false;
  if (row.status === "unavailable") return row.entries === undefined;
  if (row.status !== "complete") return false;
  if (!Array.isArray(row.entries) || row.entries.length === 0) return false;
  return row.entries.every((entry) => {
    const attempt = isRecord(entry) ? entry : null;
    return (
      attempt !== null &&
      nonEmptyString(attempt.outcome) &&
      (PROOF_RESULT_OUTCOMES as readonly string[]).includes(
        String(attempt.outcome),
      ) &&
      (attempt.duration_ms === undefined ||
        (Number.isInteger(attempt.duration_ms) &&
          Number(attempt.duration_ms) >= 0))
    );
  });
}

function validReceiptProofResult(value: unknown): boolean {
  const row = isRecord(value) ? value : null;
  if (!row) return false;
  return (
    nonEmptyString(row.symbol_id) &&
    nonEmptyString(row.target) &&
    (PROOF_RESULT_OUTCOMES as readonly string[]).includes(
      String(row.outcome),
    ) &&
    (["native_case", "aggregate_run"] as readonly string[]).includes(
      String(row.binding),
    ) &&
    (row.native_id === undefined || nonEmptyString(row.native_id)) &&
    validAttempts(row.attempts)
  );
}

function validFingerprintComponents(value: unknown): boolean {
  const row = isRecord(value) ? value : null;
  if (!row) return false;
  return (
    hex64(row.contract) &&
    hex64(row.integration) &&
    hex64(row.command) &&
    hex64(row.bindings) &&
    hex64(row.producer)
  );
}

/** Structural validation of one kibi.proof-receipt.v1 entry. */
export function validProofReceiptShape(
  testId: string,
  receipt: unknown,
): boolean {
  const row = isRecord(receipt) ? receipt : null;
  if (!row) return false;
  if (row.version !== PROOF_RECEIPT_VERSION) return false;
  if (
    typeof row.receipt_id !== "string" ||
    !/^PR-[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(row.receipt_id)
  )
    return false;
  if (row.test_id !== testId) return false;
  if (
    !(["unit", "integration", "end_to_end"] as readonly string[]).includes(
      String(row.scope),
    )
  )
    return false;
  if (
    !(PROOF_RECEIPT_OUTCOMES as readonly string[]).includes(String(row.outcome))
  )
    return false;
  if (!hex64(row.code_snapshot) || !hex64(row.environment_hash)) return false;
  if (!hex64(row.artifact_digest)) return false;
  if (!hex64(row.contract_hash) || !hex64(row.fingerprint)) return false;
  if (!validFingerprintComponents(row.fingerprint_components)) return false;
  if (!nonEmptyString(row.integration_id)) return false;
  const producer = isRecord(row.producer) ? row.producer : null;
  if (!producer || !nonEmptyString(producer.name)) return false;
  if (producer.version !== undefined && !nonEmptyString(producer.version))
    return false;
  if (
    !Array.isArray(row.command_argv) ||
    row.command_argv.length === 0 ||
    !row.command_argv.every((argument) => nonEmptyString(argument))
  )
    return false;
  if (
    !(PROOF_RUN_OUTCOMES as readonly string[]).includes(String(row.run_outcome))
  )
    return false;
  if (
    !Array.isArray(row.proof_results) ||
    !row.proof_results.every(validReceiptProofResult)
  )
    return false;
  if (row.gaps !== undefined) {
    if (!Array.isArray(row.gaps)) return false;
    if (
      !row.gaps.every(
        (gap) =>
          isRecord(gap) &&
          nonEmptyString(gap.symbol_id) &&
          nonEmptyString(gap.target) &&
          nonEmptyString(gap.reason),
      )
    )
      return false;
  }
  const startedAt = timestamp(row.started_at);
  const finishedAt = timestamp(row.finished_at);
  if (startedAt === null || finishedAt === null) return false;
  return finishedAt >= startedAt;
}

/**
 * Full-history validation for proof_receipts: unique ids, per-test binding,
 * supported scope, ordered timestamps, and structurally valid v1 entries.
 */
export function proofReceiptHistoryErrors(
  testId: string,
  verificationScope: unknown,
  receipts: readonly Readonly<Record<string, unknown>>[],
): readonly string[] {
  const errors: string[] = [];
  if (receipts.length > 0 && typeof verificationScope !== "string") {
    errors.push(
      "verification_scope is required when proof_receipts are present",
    );
  }
  const receiptIds = new Set<string>();
  for (const [index, receipt] of receipts.entries()) {
    const prefix = `proof_receipts[${index}]`;
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
    if (!validProofReceiptShape(testId, receipt)) {
      errors.push(
        `${prefix} must be a structurally valid kibi.proof-receipt.v1 bound to '${testId}'`,
      );
      continue;
    }
    const startedAt = timestamp(receipt.started_at);
    const finishedAt = timestamp(receipt.finished_at);
    if (finishedAtPrecedesStartedAt(startedAt, finishedAt)) {
      errors.push(`${prefix}.finished_at must not precede started_at`);
    }
    if (
      finishedAt !== null &&
      index > 0 &&
      timestamp(receipts[index - 1]?.finished_at) !== null &&
      finishedAt <= (timestamp(receipts[index - 1]?.finished_at) as number)
    ) {
      errors.push(
        `${prefix}.finished_at must be strictly later than the previous receipt`,
      );
    }
  }
  return errors;
}

/** The current receipt must match the live scope, contract hash, and fingerprint. */
export function proofReceiptCurrentBindingErrors(
  testId: string,
  verificationScope: unknown,
  receipt: Readonly<Record<string, unknown>>,
  contract?: ProofContract,
  fingerprint?: string,
): readonly string[] {
  const errors: string[] = [];
  if (receipt.test_id !== testId) {
    errors.push(`proof receipt test_id must equal '${testId}'`);
  }
  if (typeof verificationScope !== "string") {
    errors.push("verification_scope is required for current receipt evidence");
  } else if (receipt.scope !== verificationScope) {
    errors.push(
      `proof receipt scope must equal the current verification_scope '${verificationScope}'`,
    );
  }
  if (contract !== undefined) {
    if (typeof receipt.contract_hash === "string") {
      const expectedHash = proofContractHash(contract);
      if (receipt.contract_hash !== expectedHash) {
        errors.push(
          "proof receipt contract_hash does not match the current proof_contract",
        );
      }
    }
    if (
      fingerprint !== undefined &&
      typeof receipt.fingerprint === "string" &&
      receipt.fingerprint !== fingerprint
    ) {
      errors.push(
        "proof receipt fingerprint does not match the current effective execution fingerprint",
      );
    }
  }
  return errors;
}

/**
 * Hard schema cap on stored receipts per test. Ingest appends past this cap by
 * rotating: drop exactly the oldest receipts so the newest evidence stays
 * bound to the test without ever exceeding the cap.
 */
export const MAX_PROOF_RECEIPTS = 50;

function isCapRotation(
  previous: readonly Readonly<Record<string, unknown>>[],
  next: readonly Readonly<Record<string, unknown>>[],
): boolean {
  if (next.length !== MAX_PROOF_RECEIPTS) return false;
  if (previous.length < MAX_PROOF_RECEIPTS) return false;
  const preserved = MAX_PROOF_RECEIPTS - 1;
  for (let index = 0; index < preserved; index++) {
    if (
      canonicalJson(previous[previous.length - preserved + index]) !==
      canonicalJson(next[index])
    ) {
      return false;
    }
  }
  return true;
}

export function appendOnlyProofReceiptHistoryErrors(
  previous: readonly Readonly<Record<string, unknown>>[],
  next: readonly Readonly<Record<string, unknown>>[] | undefined,
): readonly string[] {
  if (previous.length === 0) return [];
  if (next === undefined) {
    return [
      "proof_receipts is append-only and cannot be removed from an existing test",
    ];
  }
  if (isCapRotation(previous, next)) return [];
  if (next.length < previous.length) {
    return [
      `proof_receipts is append-only: expected at least ${previous.length} historical receipt(s), received ${next.length}`,
    ];
  }
  for (const [index, receipt] of previous.entries()) {
    if (canonicalJson(next[index]) !== canonicalJson(receipt)) {
      return [
        `proof_receipts is append-only: historical receipt at index ${index} was changed, removed, or reordered`,
      ];
    }
  }
  return [];
}
