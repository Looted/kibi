// implements REQ-kibi-verification-evidence-contract
export const PLAYWRIGHT_RUN_VERSION = "kibi.playwright-run.v1" as const;

/** Case outcomes accepted inside a kibi.playwright-run.v1 artifact. */
// implements REQ-kibi-verification-evidence-contract
export const PLAYWRIGHT_RUN_CASE_OUTCOMES = [
  "passed",
  "failed",
  "timed_out",
  "skipped",
  "interrupted",
] as const;

// implements REQ-kibi-verification-evidence-contract
export type PlaywrightRunCaseOutcome = (typeof PLAYWRIGHT_RUN_CASE_OUTCOMES)[number];

// implements REQ-kibi-verification-evidence-contract
export type VerificationCaseArtifact = Readonly<{
  symbol_id: string;
  project: string;
  outcome: PlaywrightRunCaseOutcome;
  retries: number;
  duration_ms: number;
}>;

/** JSON Schema for a single reporter case result. */
// implements REQ-kibi-verification-evidence-contract
export const VERIFICATION_CASE_ARTIFACT_SCHEMA = {
  type: "object",
  description:
    "One stable end-to-end case result. symbol_id must match a SYM-* case symbol; outcome must be one of: passed, failed, timed_out, skipped, interrupted.",
  required: ["symbol_id", "project", "outcome", "retries", "duration_ms"],
  properties: {
    symbol_id: {
      type: "string",
      minLength: 1,
      description: "Stable case symbol ID (SYM-*) derived from the test title.",
    },
    project: { type: "string", minLength: 1 },
    outcome: { type: "string", enum: [...PLAYWRIGHT_RUN_CASE_OUTCOMES] },
    retries: { type: "integer", minimum: 0 },
    duration_ms: { type: "number", minimum: 0 },
  },
  additionalProperties: true,
} as const;

/**
 * JSON Schema for the full kibi.playwright-run.v1 artifact accepted by
 * kb_ingest_verification. Prefer `kibi verify` so the reporter produces this
 * automatically; direct ingestion is an integration path for reporters.
 */
// implements REQ-kibi-verification-evidence-contract
export const PLAYWRIGHT_RUN_ARTIFACT_SCHEMA = {
  type: "object",
  description:
    "Reporter-produced kibi.playwright-run.v1 run artifact. Produce it with the bundled Playwright reporter via `kibi verify TEST-ID -- <contract command>`.",
  required: [
    "version",
    "runner",
    "command_argv",
    "code_snapshot",
    "environment_hash",
    "started_at",
    "finished_at",
    "process_exit_code",
    "cases",
  ],
  properties: {
    version: { type: "string", const: PLAYWRIGHT_RUN_VERSION },
    runner: { type: "string", minLength: 1 },
    command_argv: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    code_snapshot: { type: "string", pattern: "^[a-f0-9]{64}$" },
    environment_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    started_at: { type: "string", minLength: 1 },
    finished_at: { type: "string", minLength: 1 },
    process_exit_code: { type: "integer" },
    cases: {
      type: "array",
      minItems: 1,
      maxItems: 1000,
      items: VERIFICATION_CASE_ARTIFACT_SCHEMA,
    },
  },
  additionalProperties: true,
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

/**
 * Actionable validation errors for one artifact case result. `label` names the
 * value in messages (for example `artifact.cases[0]`).
 */
// implements REQ-kibi-verification-evidence-contract
export function verificationCaseArtifactErrors(
  value: unknown,
  label: string,
): string[] {
  const row = record(value);
  if (!row)
    return [`${label} must be an object with symbol_id, project, outcome, retries, and duration_ms`];
  const errors: string[] = [];
  if (!nonEmptyString(row.symbol_id))
    errors.push(`${label}.symbol_id must be a non-empty case symbol ID (SYM-*)`);
  if (!nonEmptyString(row.project))
    errors.push(`${label}.project must be a non-empty Playwright project name`);
  const outcomes = PLAYWRIGHT_RUN_CASE_OUTCOMES.join(", ");
  if (
    typeof row.outcome !== "string" ||
    !PLAYWRIGHT_RUN_CASE_OUTCOMES.includes(
      row.outcome as PlaywrightRunCaseOutcome,
    )
  )
    errors.push(
      `${label}.outcome must be one of: ${outcomes}; received ${JSON.stringify(row.outcome ?? null)}`,
    );
  if (!Number.isInteger(row.retries) || Number(row.retries) < 0)
    errors.push(`${label}.retries must be a non-negative integer; received ${JSON.stringify(row.retries ?? null)}`);
  if (!Number.isInteger(row.duration_ms) || Number(row.duration_ms) < 0)
    errors.push(`${label}.duration_ms must be a non-negative integer; received ${JSON.stringify(row.duration_ms ?? null)}`);
  return errors;
}

/** Actionable validation errors for a full kibi.playwright-run.v1 artifact. */
// implements REQ-kibi-verification-evidence-contract
export function playwrightRunArtifactErrors(value: unknown): string[] {
  const artifact = record(value);
  if (!artifact)
    return ["artifact must be an object with version, runner, command_argv, code_snapshot, environment_hash, started_at, finished_at, process_exit_code, and cases"];
  const errors: string[] = [];
  if (artifact.version !== PLAYWRIGHT_RUN_VERSION)
    errors.push(
      `artifact.version must be ${PLAYWRIGHT_RUN_VERSION}; received ${JSON.stringify(artifact.version ?? null)}`,
    );
  if (!nonEmptyString(artifact.runner))
    errors.push("artifact.runner must be a non-empty string");
  if (
    !Array.isArray(artifact.command_argv) ||
    artifact.command_argv.length === 0 ||
    !artifact.command_argv.every((entry) => nonEmptyString(entry))
  )
    errors.push(
      "artifact.command_argv must be a non-empty array of the exact contracted command arguments",
    );
  if (!hex64(artifact.code_snapshot))
    errors.push(
      "artifact.code_snapshot must be the 64-hex workspace snapshot captured before the run",
    );
  if (!hex64(artifact.environment_hash))
    errors.push("artifact.environment_hash must be a 64-hex digest");
  if (!nonEmptyString(artifact.started_at))
    errors.push("artifact.started_at must be a non-empty ISO timestamp");
  if (!nonEmptyString(artifact.finished_at))
    errors.push("artifact.finished_at must be a non-empty ISO timestamp");
  if (!Number.isInteger(artifact.process_exit_code))
    errors.push(
      `artifact.process_exit_code must be an integer; received ${JSON.stringify(artifact.process_exit_code ?? null)}`,
    );
  if (!Array.isArray(artifact.cases) || artifact.cases.length === 0) {
    errors.push(
      "artifact.cases must be a non-empty array of case results with symbol_id, project, outcome, retries, and duration_ms",
    );
  } else {
    if (artifact.cases.length > 1000)
      errors.push("artifact.cases must contain at most 1000 case results");
    artifact.cases.forEach((entry, index) => {
      errors.push(...verificationCaseArtifactErrors(entry, `artifact.cases[${index}]`));
    });
  }
  return errors;
}
