// implements REQ-kibi-verification-evidence-contract
export const PROOF_RUN_VERSION = "kibi.proof-run.v1" as const;
// implements REQ-kibi-verification-evidence-contract
export const PROOF_CONTRACT_VERSION = "kibi.proof-contract.v1" as const;
/**
 * Receipts Kibi writes. v2 adds the contract's kind, the evidence level the
 * receipt supports, and for certificate kinds the re-checked certificate.
 */
// implements REQ-kibi-verification-evidence-contract, REQ-kibi-code-proof-kinds
export const PROOF_RECEIPT_VERSION = "kibi.proof-receipt.v2" as const;
/** Receipts written before v2; still read, as e2e evidence at tested. */
// implements REQ-kibi-code-proof-kinds
export const PROOF_RECEIPT_V1_VERSION = "kibi.proof-receipt.v1" as const;
// implements REQ-kibi-code-proof-kinds
export const PROOF_RECEIPT_VERSIONS = [
  PROOF_RECEIPT_V1_VERSION,
  PROOF_RECEIPT_VERSION,
] as const;
/** The certificate a certificate-kind proof leaves for Kibi to re-check. */
// implements REQ-kibi-code-proof-kinds
export const CODE_CERTIFICATE_VERSION = "kibi.code-certificate.v1" as const;
// implements REQ-kibi-verification-evidence-contract
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

/**
 * `all_required_first_attempt`: the whole run must pass and every obligation's
 * own result must pass on its first attempt.
 * `own_results_first_attempt`: a run whose only failures are other test cases
 * (outcome `failed` in the execution phase) still proves an obligation whose
 * own native-case result passed on its first attempt, so one unrelated
 * failing case does not erase a suite's evidence. Aggregate-run obligations
 * still need the whole run to pass.
 */
export const SUCCESS_POLICIES = [
  "all_required_first_attempt",
  "own_results_first_attempt",
] as const;

/**
 * What a proof contract's checker establishes. Runner kinds (e2e, example,
 * property) sample cases and support tested evidence; certificate kinds
 * (exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex,
 * source) cover every case and support proved evidence once Kibi re-checks
 * the certificate the run left. A source certificate is Kibi's own read of a
 * project source (a JSON or YAML file, a glob, an OpenAPI document, the
 * references the code makes, a data schema, a route table, a validator).
 */
// implements REQ-kibi-code-proof-kinds
export const PROOF_KINDS = [
  "e2e",
  "example",
  "property",
  "exhaustive",
  "typecheck",
  "arithmetic",
  "smt",
  "rule",
  "state_machine",
  "regex",
  "source",
] as const;

// implements REQ-kibi-code-proof-kinds, REQ-kibi-non-numeric-proof-kinds, REQ-kibi-source-proof-kinds
export const CERTIFICATE_PROOF_KINDS = [
  "exhaustive",
  "typecheck",
  "arithmetic",
  "smt",
  "rule",
  "state_machine",
  "regex",
  "source",
] as const;

// implements REQ-kibi-code-proof-kinds
export type ProofKind = (typeof PROOF_KINDS)[number];

// implements REQ-kibi-code-proof-kinds
export function isCertificateProofKind(kind: unknown): boolean {
  return (CERTIFICATE_PROOF_KINDS as readonly unknown[]).includes(kind);
}

export type {
  AttemptsStatus,
  ProducerProvenance,
  ProofAttempt,
  ProofAttempts,
  ProofBinding,
  ProofBindingKind,
  ProofContract,
  ProofEnvironment,
  ProofObligation,
  ProofResult,
  ProofResultOutcome,
  ProofRun,
  ProofRunArtifact,
  ProofRunOutcome,
  RunFailurePhase,
  SuccessPolicy,
} from "./proof-protocol-types.js";

import type {
  ProducerProvenance,
  ProofAttempts,
  ProofBinding,
  ProofContract,
  ProofResult,
  ProofRunArtifact,
} from "./proof-protocol-types.js";
import {
  SOURCE_READERS,
  type SourceSpec,
  normalizeSourceSpec,
  sourceSpecErrors,
} from "./proof-sources.js";

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
    certificates: {
      type: "array",
      description:
        "kibi.code-certificate.v1 objects the run left for certificate-kind contracts, one per test. Kibi re-checks each before a receipt counts as proved.",
      maxItems: 1000,
      items: { type: "object", required: ["version", "kind", "test_id"] },
    },
  },
  additionalProperties: false,
} as const;

const SOURCE_REFERENCE_SCHEMA = {
  type: "object",
  required: ["symbol_id"],
  properties: {
    symbol_id: { type: "string", minLength: 1 },
    export: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

// implements REQ-kibi-source-proof-kinds
const SOURCE_SPEC_SCHEMA = {
  type: "object",
  description:
    "A project source Kibi reads by itself. reader json or yaml: {file, path?, select?: keys|values|items}. glob: {pattern, capture?, ignore?} (capture true reads what each * matched). openapi: {file, select?: operations|unsecured_operations|security_schemes|responses}. references: {files, extract: env|imports|calls|string_args|thrown|property, callee?, key?, ignore?}. schema: {format: drizzle|prisma|sql, file (drizzle, prisma) or files (sql migrations), exports?, table?, select?: tables|columns|required_columns|nullable_columns|foreign_keys}. routes: {file, export, framework?: hono|express, path_prefix?, names_from?, select?: routes|middleware}. validator: {file, export, select?: fields|required_fields|optional_fields}. Paths are repository-relative. A member Kibi cannot read statically fails the read with its location.",
  required: ["reader"],
  properties: {
    reader: { type: "string", enum: [...SOURCE_READERS] },
  },
  additionalProperties: true,
} as const;

const SOURCE_DOMAIN_SCHEMA = {
  type: "object",
  required: ["source"],
  properties: { source: SOURCE_SPEC_SCHEMA },
  additionalProperties: false,
} as const;

const PREDICATE_SOURCE_SCHEMA = {
  type: "object",
  required: ["symbol_id"],
  properties: {
    symbol_id: { type: "string", minLength: 1 },
    export: { type: "string", minLength: 1 },
    harness_for: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
      description:
        "The predicate is a test harness that decides the predicate by driving these code symbols (for example by calling the handler with each role). The symbols must be covered_by the test; a claim the harness proves is bound with scope harness.",
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
    kind: {
      type: "string",
      enum: [...PROOF_KINDS],
      description:
        "What the checker establishes; absent means e2e. exhaustive, typecheck, arithmetic, smt, rule, state_machine and regex must leave a kibi.code-certificate.v1 that Kibi re-checks before the receipt counts as proved. source reads the contract's source itself: the run may leave {version, kind: source, test_id, source} or nothing, and Kibi stores its own read as the certificate.",
    },
    source: {
      ...SOURCE_SPEC_SCHEMA,
      description: `source: the project source a source proof reads. ${SOURCE_SPEC_SCHEMA.description}`,
    },
    domain_source: {
      type: "object",
      description:
        "exhaustive and typecheck: the symbol that defines the finite domain (typecheck: also the type whose fields a required_fields fact names). state_machine: the transition table or next-state function. The proof must import it from its source file; a hand-listed domain downgrades the receipt to example. Kibi reads the export named `export`, or the symbol's title when `export` is absent.",
      required: ["symbol_id"],
      properties: {
        symbol_id: { type: "string", minLength: 1 },
        export: {
          type: "string",
          minLength: 1,
          description:
            "The name the domain is exported under in the symbol's source file, when the symbol's title is not that name.",
        },
      },
      additionalProperties: false,
    },
    witness: {
      type: "object",
      description:
        "typecheck: the repository-relative witness file Kibi compiles (an exhaustive switch ending in never, or a mapped type over the domain).",
      required: ["path"],
      properties: { path: { type: "string", minLength: 1 } },
      additionalProperties: false,
    },
    proves: {
      type: "array",
      description:
        "Certificate kinds: the requirement claim keys (CLAIM-...) this certificate proves. Each must be a modeled claim of a current requirement the test reaches through its scenarios. Kibi derives what the certificate must establish from the claim's grounding fact (a set fact for exhaustive or typecheck, a numeric fact for arithmetic or smt, a rule, predicate or set fact for rule and state_machine, a string fact for regex); a claim with no such derivation is only attested and never counts as proved.",
      minItems: 1,
      items: { type: "string", pattern: "^CLAIM-" },
      uniqueItems: true,
    },
    value_source: {
      type: "array",
      description:
        "arithmetic and smt: code constants the assumptions read. Kibi evaluates each export at ingest and requires the certificate to assume the variable equals that value, so the proof is about the code and not only the knowledge base. With measure count the value is the size of a list, set, map or object export, so a count claim reads the collection itself. An entry {source, measure: count} counts the members Kibi reads from a project source (routes, tables, environment variables).",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          symbol_id: { type: "string", minLength: 1 },
          export: { type: "string", minLength: 1 },
          source: SOURCE_SPEC_SCHEMA,
          measure: {
            type: "string",
            enum: ["value", "count"],
            description:
              "value (default for an export): the export is a number. count (the only measure of a source): the number of members of a list, set, map or object export, or of a source.",
          },
        },
        additionalProperties: false,
      },
    },
    predicate_source: {
      type: "object",
      description:
        "rule: the code function behind each predicate a claim's rule, predicate or set fact names, keyed by predicate name. Each export takes the predicate's arguments in order and returns a boolean; Kibi calls it on every combination of its argument domains.",
      minProperties: 1,
      additionalProperties: PREDICATE_SOURCE_SCHEMA,
    },
    domains: {
      type: "object",
      description:
        "rule: the finite domain of each argument type, keyed by type name (an array, Set, Map or object export, or a Python list, set, dict or Enum), or {source} for the members Kibi reads from a project source (every route, every table, every environment variable). state_machine with a next-state function: the `state` and `event` domains it is called on.",
      minProperties: 1,
      additionalProperties: {
        anyOf: [SOURCE_REFERENCE_SCHEMA, SOURCE_DOMAIN_SCHEMA],
      },
    },
    initial_source: {
      ...SOURCE_REFERENCE_SCHEMA,
      description:
        "state_machine: the export holding the initial state (or states), needed for initial_states and reachable_states facts.",
    },
    pattern_source: {
      ...SOURCE_REFERENCE_SCHEMA,
      description:
        "regex: the export holding the code's pattern (a RegExp, or a Python re.Pattern) or string constant that a string fact is about.",
    },
    constraint_source: {
      type: "object",
      description:
        "arithmetic and smt: the typed numeric property_value facts the certificate's assumptions come from. Kibi checks the assumptions (or the query's assertions) are exactly these facts' constraints, so the proof is about the knowledge base, not numbers the test chose.",
      required: ["fact_ids"],
      properties: {
        fact_ids: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
      },
      additionalProperties: false,
    },
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
  if (artifact.certificates !== undefined) {
    if (!Array.isArray(artifact.certificates))
      errors.push("artifact.certificates must be an array when present");
    else
      artifact.certificates.forEach((entry, index) => {
        const row = record(entry);
        if (
          !row ||
          !nonEmptyString(row.version) ||
          !includes(CERTIFICATE_PROOF_KINDS, row.kind) ||
          !nonEmptyString(row.test_id) ||
          !isPlainJson(row)
        )
          errors.push(
            `artifact.certificates[${index}] must be a JSON object with version, a certificate kind (${CERTIFICATE_PROOF_KINDS.join(", ")}) and test_id`,
          );
      });
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
  errors.push(...proofContractKindErrors(contract));
  return errors;
}

// implements REQ-kibi-code-proof-kinds
function proofContractKindErrors(contract: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const kind = contract.kind;
  if (kind !== undefined && !includes(PROOF_KINDS, kind))
    errors.push(
      `proof_contract.kind must be one of: ${PROOF_KINDS.join(", ")}; received ${JSON.stringify(kind)}`,
    );
  const domain = contract.domain_source;
  if (domain !== undefined) {
    const row = record(domain);
    if (
      !row ||
      !nonEmptyString(row.symbol_id) ||
      (row.export !== undefined && !nonEmptyString(row.export)) ||
      Object.keys(row).some((key) => key !== "symbol_id" && key !== "export")
    )
      errors.push(
        "proof_contract.domain_source must be {symbol_id, export?} naming the symbol that defines the domain and, when its title is not the export name, the export to read",
      );
  } else if (kind === "exhaustive" || kind === "typecheck")
    errors.push(
      `proof_contract.domain_source is required for kind ${String(kind)}: name the symbol the proof reads its domain from`,
    );
  const witness = contract.witness;
  if (witness !== undefined) {
    const row = record(witness);
    if (!row || !nonEmptyString(row.path) || Object.keys(row).length !== 1)
      errors.push(
        "proof_contract.witness must be {path} naming the repository-relative witness file",
      );
  } else if (kind === "typecheck")
    errors.push(
      "proof_contract.witness is required for kind typecheck: name the file the type checker compiles",
    );
  const source = contract.constraint_source;
  if (source !== undefined) {
    const row = record(source);
    const ids = row?.fact_ids;
    if (
      !row ||
      Object.keys(row).length !== 1 ||
      !Array.isArray(ids) ||
      ids.length === 0 ||
      !ids.every(nonEmptyString)
    )
      errors.push(
        "proof_contract.constraint_source must be {fact_ids: [FACT-...]} naming the facts the assumptions come from",
      );
  } else if (
    (kind === "arithmetic" || kind === "smt") &&
    contract.value_source === undefined
  )
    errors.push(
      `proof_contract.constraint_source or value_source is required for kind ${String(kind)}: name the typed facts or code constants its assumptions come from`,
    );
  const valueSource = contract.value_source;
  if (valueSource !== undefined) {
    if (Array.isArray(valueSource))
      valueSource.forEach((entry, index) => {
        const row = record(entry);
        if (row === null || row.source === undefined) return;
        errors.push(
          ...sourceSpecErrors(
            row.source,
            `proof_contract.value_source[${index}].source`,
          ),
        );
        if (row.symbol_id !== undefined || row.export !== undefined)
          errors.push(
            `proof_contract.value_source[${index}] names a source, so it takes no symbol_id or export`,
          );
        if (row.measure !== undefined && row.measure !== "count")
          errors.push(
            `proof_contract.value_source[${index}].measure must be count for a source: Kibi counts the members it reads`,
          );
      });
    if (
      !Array.isArray(valueSource) ||
      valueSource.length === 0 ||
      !valueSource.every((entry) => {
        const row = record(entry);
        if (row !== null && row.source !== undefined) return true;
        return (
          row !== null &&
          nonEmptyString(row.symbol_id) &&
          (row.export === undefined || nonEmptyString(row.export)) &&
          (row.measure === undefined ||
            row.measure === "value" ||
            row.measure === "count") &&
          Object.keys(row).every(
            (key) =>
              key === "symbol_id" || key === "export" || key === "measure",
          )
        );
      })
    )
      errors.push(
        "proof_contract.value_source must be [{symbol_id, export?, measure?: value|count} or {source, measure?: count}] naming the code constants or project sources the assumptions read",
      );
    else if (kind !== "arithmetic" && kind !== "smt")
      errors.push(
        `proof_contract.value_source applies only to kind arithmetic or smt, not ${String(kind ?? "e2e")}`,
      );
  }
  errors.push(...nonNumericContractErrors(contract));
  errors.push(...sourceContractErrors(contract));
  const proves = contract.proves;
  if (proves !== undefined) {
    if (
      !Array.isArray(proves) ||
      proves.length === 0 ||
      !proves.every(
        (key) => typeof key === "string" && /^CLAIM-[A-Za-z0-9]+$/.test(key),
      ) ||
      new Set(proves).size !== proves.length
    )
      errors.push(
        "proof_contract.proves must be a non-empty list of distinct claim keys (CLAIM-...) the certificate proves",
      );
    else if (!isCertificateProofKind(kind))
      errors.push(
        `proof_contract.proves applies only to certificate kinds (${CERTIFICATE_PROOF_KINDS.join(", ")}), not ${String(kind ?? "e2e")}`,
      );
  }
  return errors;
}

function isSourceReference(value: unknown): boolean {
  const row = record(value);
  return (
    row !== null &&
    nonEmptyString(row.symbol_id) &&
    (row.export === undefined || nonEmptyString(row.export)) &&
    Object.keys(row).every((key) => key === "symbol_id" || key === "export")
  );
}

function isSourceMap(
  value: unknown,
  accepts: (entry: unknown) => boolean = isSourceReference,
): boolean {
  const row = record(value);
  return (
    row !== null &&
    Object.keys(row).length > 0 &&
    Object.entries(row).every(
      ([key, entry]) => key.trim() !== "" && accepts(entry),
    )
  );
}

function isPredicateReference(value: unknown): boolean {
  const row = record(value);
  if (row === null || row.harness_for === undefined)
    return isSourceReference(value);
  const { harness_for: harness, ...reference } = row;
  return (
    isSourceReference(reference) &&
    Array.isArray(harness) &&
    harness.length > 0 &&
    harness.every(nonEmptyString)
  );
}

function isSourceDomain(value: unknown): boolean {
  const row = record(value);
  return (
    row !== null && Object.keys(row).length === 1 && row.source !== undefined
  );
}

/**
 * The source kind and the source-backed rule domains: a well-formed source
 * spec, required for kind source and only there.
 */
// implements REQ-kibi-source-proof-kinds
function sourceContractErrors(contract: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const kind = contract.kind;
  if (contract.source !== undefined) {
    errors.push(...sourceSpecErrors(contract.source, "proof_contract.source"));
    if (kind !== "source")
      errors.push(
        `proof_contract.source applies only to kind source, not ${String(kind ?? "e2e")}`,
      );
  } else if (kind === "source")
    errors.push(
      "proof_contract.source is required for kind source: name the project source Kibi reads (reader json, yaml, glob, openapi, references, schema, routes or validator)",
    );
  const domains = record(contract.domains);
  for (const [type, entry] of Object.entries(domains ?? {}))
    if (isSourceDomain(entry)) {
      errors.push(
        ...sourceSpecErrors(
          record(entry)?.source,
          `proof_contract.domains.${type}.source`,
        ),
      );
      if (kind !== "rule")
        errors.push(
          `proof_contract.domains.${type}.source applies only to kind rule: a state machine's domains are the code's`,
        );
    }
  return errors;
}

/**
 * The contract fields of the rule, state_machine and regex kinds: where the
 * code Kibi evaluates lives, and only on the kinds that read it.
 */
// implements REQ-kibi-non-numeric-proof-kinds
function nonNumericContractErrors(contract: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const kind = contract.kind;
  const only = (field: string, kinds: readonly string[]) => {
    if (contract[field] !== undefined && !kinds.includes(String(kind)))
      errors.push(
        `proof_contract.${field} applies only to kind ${kinds.join(" or ")}, not ${String(kind ?? "e2e")}`,
      );
  };
  if (
    contract.predicate_source !== undefined &&
    !isSourceMap(contract.predicate_source, isPredicateReference)
  )
    errors.push(
      "proof_contract.predicate_source must map each predicate name to {symbol_id, export?, harness_for?} naming the function that decides it",
    );
  if (
    contract.domains !== undefined &&
    !isSourceMap(
      contract.domains,
      (entry) => isSourceReference(entry) || isSourceDomain(entry),
    )
  )
    errors.push(
      "proof_contract.domains must map each argument type to {symbol_id, export?} naming the export that lists its values, or {source} naming the project source Kibi reads them from",
    );
  for (const field of ["initial_source", "pattern_source"])
    if (contract[field] !== undefined && !isSourceReference(contract[field]))
      errors.push(
        `proof_contract.${field} must be {symbol_id, export?} naming the export Kibi reads`,
      );
  only("predicate_source", ["rule"]);
  only("domains", ["rule", "state_machine"]);
  only("initial_source", ["state_machine"]);
  only("pattern_source", ["regex"]);
  if (kind === "rule") {
    if (contract.predicate_source === undefined)
      errors.push(
        "proof_contract.predicate_source is required for kind rule: name the function behind each predicate the claims use",
      );
    if (contract.domains === undefined)
      errors.push(
        "proof_contract.domains is required for kind rule: name the export listing each argument type's values",
      );
  }
  if (kind === "state_machine") {
    if (contract.domain_source === undefined)
      errors.push(
        "proof_contract.domain_source is required for kind state_machine: name the transition table or next-state function",
      );
    const domains = record(contract.domains);
    if (
      domains !== null &&
      (Object.keys(domains).length !== 2 ||
        domains.state === undefined ||
        domains.event === undefined)
    )
      errors.push(
        "proof_contract.domains for kind state_machine must name exactly the state and event domains a next-state function is called on",
      );
  }
  if (kind === "regex" && contract.pattern_source === undefined)
    errors.push(
      "proof_contract.pattern_source is required for kind regex: name the export holding the pattern or string",
    );
  return errors;
}

/**
 * The optional contract fields beyond the v1 core, copied only when present
 * so existing contracts keep their hash.
 */
// implements REQ-kibi-code-proof-kinds
export function optionalProofContractFields(
  contract: Record<string, unknown>,
): Pick<
  ProofContract,
  | "kind"
  | "domain_source"
  | "witness"
  | "constraint_source"
  | "value_source"
  | "proves"
  | "predicate_source"
  | "domains"
  | "initial_source"
  | "pattern_source"
  | "source"
> {
  const fields: {
    kind?: ProofKind;
    domain_source?: { symbol_id: string; export?: string };
    witness?: { path: string };
    constraint_source?: { fact_ids: string[] };
    value_source?: ValueSourceEntry[];
    proves?: string[];
    predicate_source?: Record<string, PredicateReference>;
    domains?: Record<string, SourceReference | { source: SourceSpec }>;
    initial_source?: SourceReference;
    pattern_source?: SourceReference;
    source?: SourceSpec;
  } = {};
  if (typeof contract.kind === "string")
    fields.kind = contract.kind as ProofKind;
  const domain = record(contract.domain_source);
  if (domain && typeof domain.symbol_id === "string")
    fields.domain_source = {
      symbol_id: domain.symbol_id,
      ...(typeof domain.export === "string" ? { export: domain.export } : {}),
    };
  const witness = record(contract.witness);
  if (witness && typeof witness.path === "string")
    fields.witness = { path: witness.path };
  const source = record(contract.constraint_source);
  if (source && Array.isArray(source.fact_ids))
    fields.constraint_source = {
      fact_ids: source.fact_ids.filter(
        (id): id is string => typeof id === "string",
      ),
    };
  if (Array.isArray(contract.value_source))
    fields.value_source = contract.value_source
      .map((entry) => record(entry))
      .map((row): ValueSourceEntry | null => {
        if (row === null) return null;
        const spec = normalizeSourceSpec(row.source);
        if (spec !== undefined) return { source: spec, measure: "count" };
        if (typeof row.symbol_id !== "string") return null;
        return {
          symbol_id: row.symbol_id,
          ...(typeof row.export === "string" ? { export: row.export } : {}),
          ...(row.measure === "value" || row.measure === "count"
            ? { measure: row.measure }
            : {}),
        };
      })
      .filter((row): row is ValueSourceEntry => row !== null);
  if (Array.isArray(contract.proves))
    fields.proves = contract.proves.filter(
      (key): key is string => typeof key === "string",
    );
  const predicates = predicateMap(contract.predicate_source);
  if (predicates !== undefined) fields.predicate_source = predicates;
  const domains = domainMap(contract.domains);
  if (domains !== undefined) fields.domains = domains;
  const spec = normalizeSourceSpec(contract.source);
  if (spec !== undefined) fields.source = spec;
  const initial = sourceReference(contract.initial_source);
  if (initial !== undefined) fields.initial_source = initial;
  const pattern = sourceReference(contract.pattern_source);
  if (pattern !== undefined) fields.pattern_source = pattern;
  return fields;
}

type SourceReference = { symbol_id: string; export?: string };
type PredicateReference = SourceReference & { harness_for?: string[] };
type ValueSourceEntry =
  | { symbol_id: string; export?: string; measure?: "value" | "count" }
  | { source: SourceSpec; measure: "count" };

function predicateMap(
  value: unknown,
): Record<string, PredicateReference> | undefined {
  const row = record(value);
  if (!row) return undefined;
  const out: Record<string, PredicateReference> = {};
  for (const [key, entry] of Object.entries(row)) {
    const reference = sourceReference(entry);
    if (reference === undefined) continue;
    const harness = record(entry)?.harness_for;
    out[key] = Array.isArray(harness)
      ? {
          ...reference,
          harness_for: harness.filter(
            (id): id is string => typeof id === "string",
          ),
        }
      : reference;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function domainMap(
  value: unknown,
): Record<string, SourceReference | { source: SourceSpec }> | undefined {
  const row = record(value);
  if (!row) return undefined;
  const out: Record<string, SourceReference | { source: SourceSpec }> = {};
  for (const [key, entry] of Object.entries(row)) {
    const spec = normalizeSourceSpec(record(entry)?.source);
    if (spec !== undefined) {
      out[key] = { source: spec };
      continue;
    }
    const reference = sourceReference(entry);
    if (reference !== undefined) out[key] = reference;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sourceReference(value: unknown): SourceReference | undefined {
  const row = record(value);
  if (!row || typeof row.symbol_id !== "string") return undefined;
  return {
    symbol_id: row.symbol_id,
    ...(typeof row.export === "string" ? { export: row.export } : {}),
  };
}

function sourceMap(
  value: unknown,
): Record<string, SourceReference> | undefined {
  const row = record(value);
  if (!row) return undefined;
  const out: Record<string, SourceReference> = {};
  for (const [key, entry] of Object.entries(row)) {
    const reference = sourceReference(entry);
    if (reference !== undefined) out[key] = reference;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
