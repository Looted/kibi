// implements REQ-kibi-proof-evidence-protocol
export const PROOF_RUN_VERSION = "kibi.proof-run.v1" as const;
// implements REQ-kibi-proof-evidence-protocol
export const PROOF_CONTRACT_VERSION = "kibi.proof-contract.v1" as const;
// implements REQ-kibi-proof-evidence-protocol
export const PROOF_RECEIPT_VERSION = "kibi.proof-receipt.v1" as const;
// implements REQ-kibi-proof-evidence-protocol
export const PROOF_INTEGRATION_VERSION = "kibi.proof-integration.v1" as const;

export const PROOF_RUN_OUTCOMES = [
  "passed",
  "failed",
  "errored",
  "cancelled",
  "timed_out",
  "interrupted",
  "no_results",
] as const;

export const PROOF_RESULT_OUTCOMES = [
  "passed",
  "failed",
  "timed_out",
  "skipped",
  "interrupted",
  "errored",
] as const;

export const PROOF_BINDING_KINDS = ["native_case", "aggregate_run"] as const;

export const ATTEMPTS_STATUS = ["complete", "unavailable"] as const;

export const RUN_FAILURE_PHASES = [
  "setup",
  "collection",
  "execution",
  "teardown",
  "infrastructure",
] as const;

export const SUCCESS_POLICIES = ["all_required_first_attempt"] as const;

export type ProofRunOutcome = (typeof PROOF_RUN_OUTCOMES)[number];
export type ProofResultOutcome = (typeof PROOF_RESULT_OUTCOMES)[number];
export type ProofBindingKind = (typeof PROOF_BINDING_KINDS)[number];
export type AttemptsStatus = (typeof ATTEMPTS_STATUS)[number];
export type RunFailurePhase = (typeof RUN_FAILURE_PHASES)[number];
export type SuccessPolicy = (typeof SUCCESS_POLICIES)[number];

export type ProofAttempt = Readonly<{
  outcome: ProofResultOutcome;
  duration_ms?: number;
}>;

export type ProofAttempts = Readonly<
  | { status: "complete"; entries: readonly ProofAttempt[] }
  | { status: "unavailable" }
>;

export type ProofResult = Readonly<{
  symbol_id: string;
  target: string;
  outcome: ProofResultOutcome;
  binding: ProofBindingKind;
  native_id?: string;
  attempts: ProofAttempts;
  diagnostics?: readonly string[];
}>;

export type ProducerProvenance = Readonly<{
  name: string;
  version?: string;
}>;

export type ProofEnvironment = Readonly<Record<string, unknown>>;

export type ProofRun = Readonly<{
  outcome: ProofRunOutcome;
  exit_code: number;
  started_at: string;
  finished_at: string;
  failure_phase?: RunFailurePhase;
}>;

export type ProofRunArtifact = Readonly<{
  version: typeof PROOF_RUN_VERSION;
  producer: ProducerProvenance;
  executor?: ProducerProvenance;
  command_argv: readonly string[];
  code_snapshot: string;
  environment: ProofEnvironment;
  run: ProofRun;
  proof_results: readonly ProofResult[];
  integration?: string;
  diagnostics?: readonly string[];
}>;

export type ProofObligation = Readonly<{
  symbol_id: string;
  target: string;
}>;

export type ProofContract = Readonly<{
  version: typeof PROOF_CONTRACT_VERSION;
  integration: string;
  required_proofs: readonly ProofObligation[];
  success_policy: SuccessPolicy;
}>;

export type ProofBinding = Readonly<{
  symbol_id: string;
  target: string;
  native_id?: string;
  aliases?: readonly string[];
  source_file?: string;
  line?: number;
}>;

export const PROOF_RESULT_SCHEMA = {
  type: "object",
  description:
    "One observed proof result. binding distinguishes native-case observations from aggregate-run bindings; attempts must report facts only.",
  required: ["symbol_id", "target", "outcome", "binding", "attempts"],
  properties: {
    symbol_id: {
      type: "string",
      minLength: 1,
      description: "Stable proof symbol ID (SYM-*).",
    },
    target: {
      type: "string",
      minLength: 1,
      description:
        "Ecosystem-neutral execution target (browser, runtime, database, device, deployment, or default).",
    },
    outcome: { type: "string", enum: [...PROOF_RESULT_OUTCOMES] },
    binding: { type: "string", enum: [...PROOF_BINDING_KINDS] },
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
              maxItems: 100,
              items: {
                type: "object",
                required: ["outcome"],
                properties: {
                  outcome: { type: "string", enum: [...PROOF_RESULT_OUTCOMES] },
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
          properties: { status: { type: "string", const: "unavailable" } },
          additionalProperties: false,
        },
      ],
    },
    diagnostics: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
  additionalProperties: false,
} as const;

export const PROOF_RUN_ARTIFACT_SCHEMA = {
  type: "object",
  description:
    "Producer-emitted kibi.proof-run.v1 proof artifact. Producers report what happened; Kibi evaluates proof obligations and policies. Produce it via `kibi prove` or direct kb_ingest_proof calls.",
  required: [
    "version",
    "producer",
    "command_argv",
    "code_snapshot",
    "environment",
    "run",
    "proof_results",
  ],
  properties: {
    version: { type: "string", const: PROOF_RUN_VERSION },
    producer: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        version: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
    executor: {
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
    code_snapshot: { type: "string", pattern: "^[a-f0-9]{64}$" },
    environment: { type: "object", additionalProperties: true },
    run: {
      type: "object",
      required: ["outcome", "exit_code", "started_at", "finished_at"],
      properties: {
        outcome: { type: "string", enum: [...PROOF_RUN_OUTCOMES] },
        exit_code: { type: "integer" },
        started_at: { type: "string", minLength: 1 },
        finished_at: { type: "string", minLength: 1 },
        failure_phase: { type: "string", enum: [...RUN_FAILURE_PHASES] },
      },
      additionalProperties: false,
    },
    proof_results: {
      type: "array",
      minItems: 1,
      maxItems: 1000,
      items: PROOF_RESULT_SCHEMA,
    },
    integration: { type: "string", minLength: 1 },
    diagnostics: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
  additionalProperties: false,
} as const;

export const PROOF_CONTRACT_SCHEMA = {
  type: "object",
  description:
    "Semantic proof contract binding a test to explicit proof obligations executed by a configured integration.",
  required: ["version", "integration", "required_proofs", "success_policy"],
  properties: {
    version: { type: "string", const: PROOF_CONTRACT_VERSION },
    integration: { type: "string", minLength: 1 },
    required_proofs: {
      type: "array",
      minItems: 1,
      maxItems: 1000,
      items: {
        type: "object",
        required: ["symbol_id", "target"],
        properties: {
          symbol_id: { type: "string", minLength: 1 },
          target: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    success_policy: { type: "string", enum: [...SUCCESS_POLICIES] },
  },
  additionalProperties: false,
} as const;

export const PROOF_BINDINGS_SCHEMA = {
  type: "array",
  description:
    "Optional native-runner bindings for proof obligations. Bindings are provenance metadata; they never replace the semantic proof contract.",
  items: {
    type: "object",
    required: ["symbol_id", "target"],
    properties: {
      symbol_id: { type: "string", minLength: 1 },
      target: { type: "string", minLength: 1 },
      native_id: { type: "string", minLength: 1 },
      aliases: {
        type: "array",
        items: { type: "string", minLength: 1 },
      },
      source_file: { type: "string", minLength: 1 },
      line: { type: "integer", minimum: 1 },
    },
    additionalProperties: false,
  },
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hex64(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isPlainJson(value: unknown): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isPlainJson);
  const row = record(value);
  if (!row) return false;
  return Object.values(row).every(isPlainJson);
}

function includes<T extends string>(
  list: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (list as readonly string[]).includes(value)
  );
}

function producerProvenanceErrors(
  value: unknown,
  label: string,
  required: boolean,
): string[] {
  if (value === undefined) {
    return required ? [`${label} is required`] : [];
  }
  const row = record(value);
  if (!row)
    return [
      `${label} must be an object with a non-empty name (and optional version)`,
    ];
  const errors: string[] = [];
  if (!nonEmptyString(row.name))
    errors.push(`${label}.name must be a non-empty string`);
  if (row.version !== undefined && !nonEmptyString(row.version))
    errors.push(`${label}.version must be a non-empty string when present`);
  return errors;
}

function attemptsErrors(value: unknown, label: string): string[] {
  const row = record(value);
  if (!row)
    return [
      `${label} must be an object: {status: "complete", entries: [...]} or {status: "unavailable"}`,
    ];
  if (!includes(ATTEMPTS_STATUS, row.status))
    return [
      `${label}.status must be one of: complete, unavailable; received ${JSON.stringify(row.status ?? null)}`,
    ];
  if (row.status === "unavailable") {
    if (row.entries !== undefined)
      return [`${label}.entries must be omitted when status is unavailable`];
    return [];
  }
  if (!Array.isArray(row.entries) || row.entries.length === 0)
    return [
      `${label}.entries must be a non-empty array when status is complete`,
    ];
  const errors: string[] = [];
  row.entries.forEach((entry, index) => {
    const entryRow = record(entry);
    const entryLabel = `${label}.entries[${index}]`;
    if (!entryRow) {
      errors.push(
        `${entryLabel} must be an object with outcome (and optional duration_ms)`,
      );
      return;
    }
    if (!includes(PROOF_RESULT_OUTCOMES, entryRow.outcome))
      errors.push(
        `${entryLabel}.outcome must be one of: ${PROOF_RESULT_OUTCOMES.join(", ")}; received ${JSON.stringify(entryRow.outcome ?? null)}`,
      );
    if (
      entryRow.duration_ms !== undefined &&
      (!Number.isInteger(entryRow.duration_ms) ||
        Number(entryRow.duration_ms) < 0)
    )
      errors.push(
        `${entryLabel}.duration_ms must be a non-negative integer; received ${JSON.stringify(entryRow.duration_ms ?? null)}`,
      );
  });
  return errors;
}

export function proofResultErrors(value: unknown, label: string): string[] {
  const row = record(value);
  if (!row)
    return [
      `${label} must be an object with symbol_id, target, outcome, binding, and attempts`,
    ];
  const errors: string[] = [];
  if (!nonEmptyString(row.symbol_id))
    errors.push(
      `${label}.symbol_id must be a non-empty proof symbol ID (SYM-*)`,
    );
  if (!nonEmptyString(row.target))
    errors.push(`${label}.target must be a non-empty execution target`);
  if (!includes(PROOF_RESULT_OUTCOMES, row.outcome))
    errors.push(
      `${label}.outcome must be one of: ${PROOF_RESULT_OUTCOMES.join(", ")}; received ${JSON.stringify(row.outcome ?? null)}`,
    );
  if (!includes(PROOF_BINDING_KINDS, row.binding))
    errors.push(
      `${label}.binding must be one of: ${PROOF_BINDING_KINDS.join(", ")}; received ${JSON.stringify(row.binding ?? null)}`,
    );
  if (row.native_id !== undefined && !nonEmptyString(row.native_id))
    errors.push(`${label}.native_id must be a non-empty string when present`);
  errors.push(...attemptsErrors(row.attempts, `${label}.attempts`));
  if (row.diagnostics !== undefined) {
    if (
      !Array.isArray(row.diagnostics) ||
      !row.diagnostics.every((entry) => nonEmptyString(entry))
    )
      errors.push(`${label}.diagnostics must be an array of non-empty strings`);
  }
  return errors;
}

export function proofRunArtifactErrors(value: unknown): string[] {
  const artifact = record(value);
  if (!artifact)
    return [
      "artifact must be an object with version, producer, command_argv, code_snapshot, environment, run, and proof_results",
    ];
  const errors: string[] = [];
  if (artifact.version !== PROOF_RUN_VERSION)
    errors.push(
      `artifact.version must be ${PROOF_RUN_VERSION}; received ${JSON.stringify(artifact.version ?? null)}`,
    );
  errors.push(
    ...producerProvenanceErrors(artifact.producer, "artifact.producer", true),
  );
  errors.push(
    ...producerProvenanceErrors(artifact.executor, "artifact.executor", false),
  );
  if (
    !Array.isArray(artifact.command_argv) ||
    artifact.command_argv.length === 0 ||
    !artifact.command_argv.every((entry) => nonEmptyString(entry))
  )
    errors.push(
      "artifact.command_argv must be a non-empty array of the exact executed command arguments",
    );
  if (!hex64(artifact.code_snapshot))
    errors.push(
      "artifact.code_snapshot must be the 64-hex workspace snapshot captured before the run",
    );
  const environment = record(artifact.environment);
  if (!environment)
    errors.push("artifact.environment must be a typed environment object");
  else if (!isPlainJson(environment))
    errors.push("artifact.environment must contain only JSON values");
  const run = record(artifact.run);
  if (!run)
    errors.push(
      "artifact.run must be an object with outcome, exit_code, started_at, and finished_at",
    );
  else {
    if (!includes(PROOF_RUN_OUTCOMES, run.outcome))
      errors.push(
        `artifact.run.outcome must be one of: ${PROOF_RUN_OUTCOMES.join(", ")}; received ${JSON.stringify(run.outcome ?? null)}`,
      );
    if (!Number.isInteger(run.exit_code))
      errors.push(
        `artifact.run.exit_code must be an integer; received ${JSON.stringify(run.exit_code ?? null)}`,
      );
    if (!nonEmptyString(run.started_at))
      errors.push("artifact.run.started_at must be a non-empty ISO timestamp");
    if (!nonEmptyString(run.finished_at))
      errors.push("artifact.run.finished_at must be a non-empty ISO timestamp");
    if (
      run.failure_phase !== undefined &&
      !includes(RUN_FAILURE_PHASES, run.failure_phase)
    )
      errors.push(
        `artifact.run.failure_phase must be one of: ${RUN_FAILURE_PHASES.join(", ")}; received ${JSON.stringify(run.failure_phase ?? null)}`,
      );
  }
  if (
    !Array.isArray(artifact.proof_results) ||
    artifact.proof_results.length === 0
  ) {
    errors.push(
      "artifact.proof_results must be a non-empty array of proof results with symbol_id, target, outcome, binding, and attempts",
    );
  } else {
    if (artifact.proof_results.length > 1000)
      errors.push("artifact.proof_results must contain at most 1000 results");
    const seen = new Set<string>();
    artifact.proof_results.forEach((entry, index) => {
      const label = `artifact.proof_results[${index}]`;
      errors.push(...proofResultErrors(entry, label));
      const row = record(entry);
      if (row && nonEmptyString(row.symbol_id) && nonEmptyString(row.target)) {
        const key = `${String(row.target)}\0${String(row.symbol_id)}`;
        if (seen.has(key))
          errors.push(
            `${label} duplicates target/symbol_id '${key.replace("\0", "/")}'`,
          );
        seen.add(key);
      }
    });
  }
  if (
    artifact.integration !== undefined &&
    !nonEmptyString(artifact.integration)
  )
    errors.push("artifact.integration must be a non-empty string when present");
  if (artifact.diagnostics !== undefined) {
    if (
      !Array.isArray(artifact.diagnostics) ||
      !artifact.diagnostics.every((entry) => nonEmptyString(entry))
    )
      errors.push("artifact.diagnostics must be an array of non-empty strings");
  }
  return errors;
}

export function proofContractErrors(value: unknown): string[] {
  const contract = record(value);
  if (!contract)
    return [
      "proof_contract must be an object with version, integration, required_proofs, and success_policy",
    ];
  const errors: string[] = [];
  if (contract.version !== PROOF_CONTRACT_VERSION)
    errors.push(
      `proof_contract.version must be ${PROOF_CONTRACT_VERSION}; received ${JSON.stringify(contract.version ?? null)}`,
    );
  if (!nonEmptyString(contract.integration))
    errors.push(
      "proof_contract.integration must reference a configured integration id",
    );
  if (
    !Array.isArray(contract.required_proofs) ||
    contract.required_proofs.length === 0
  ) {
    errors.push(
      "proof_contract.required_proofs must be a non-empty array of {symbol_id, target} obligations",
    );
  } else {
    if (contract.required_proofs.length > 1000)
      errors.push(
        "proof_contract.required_proofs must contain at most 1000 obligations",
      );
    const seen = new Set<string>();
    contract.required_proofs.forEach((entry, index) => {
      const row = record(entry);
      const label = `proof_contract.required_proofs[${index}]`;
      if (!row) {
        errors.push(`${label} must be an object with symbol_id and target`);
        return;
      }
      if (!nonEmptyString(row.symbol_id))
        errors.push(
          `${label}.symbol_id must be a non-empty proof symbol ID (SYM-*)`,
        );
      if (!nonEmptyString(row.target))
        errors.push(`${label}.target must be a non-empty execution target`);
      if (nonEmptyString(row.symbol_id) && nonEmptyString(row.target)) {
        const key = `${String(row.target)}\0${String(row.symbol_id)}`;
        if (seen.has(key))
          errors.push(
            `${label} duplicates target/symbol_id '${key.replace("\0", "/")}'`,
          );
        seen.add(key);
      }
    });
  }
  if (!includes(SUCCESS_POLICIES, contract.success_policy))
    errors.push(
      `proof_contract.success_policy must be one of: ${SUCCESS_POLICIES.join(", ")}; received ${JSON.stringify(contract.success_policy ?? null)}`,
    );
  return errors;
}

export function proofBindingsErrors(value: unknown): string[] {
  if (!Array.isArray(value))
    return ["proof_bindings must be an array of binding objects"];
  const errors: string[] = [];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const row = record(entry);
    const label = `proof_bindings[${index}]`;
    if (!row) {
      errors.push(`${label} must be an object with symbol_id and target`);
      return;
    }
    if (!nonEmptyString(row.symbol_id))
      errors.push(
        `${label}.symbol_id must be a non-empty proof symbol ID (SYM-*)`,
      );
    if (!nonEmptyString(row.target))
      errors.push(`${label}.target must be a non-empty execution target`);
    if (row.native_id !== undefined && !nonEmptyString(row.native_id))
      errors.push(`${label}.native_id must be a non-empty string when present`);
    if (row.aliases !== undefined) {
      if (
        !Array.isArray(row.aliases) ||
        !row.aliases.every((alias) => nonEmptyString(alias))
      )
        errors.push(`${label}.aliases must be an array of non-empty strings`);
    }
    if (row.source_file !== undefined && !nonEmptyString(row.source_file))
      errors.push(
        `${label}.source_file must be a non-empty string when present`,
      );
    if (
      row.line !== undefined &&
      (!Number.isInteger(row.line) || Number(row.line) < 1)
    )
      errors.push(`${label}.line must be a positive integer when present`);
    if (nonEmptyString(row.symbol_id) && nonEmptyString(row.target)) {
      const key = `${String(row.target)}\0${String(row.symbol_id)}`;
      if (seen.has(key))
        errors.push(
          `${label} duplicates target/symbol_id '${key.replace("\0", "/")}'`,
        );
      seen.add(key);
    }
  });
  return errors;
}
