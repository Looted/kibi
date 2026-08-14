import { createHash } from "node:crypto";

import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import {
  VERIFICATION_CONTRACT_VERSION,
  VERIFICATION_RECEIPT_V2_VERSION,
  verificationContractHash,
  verificationReceiptHistoryErrors,
} from "../../public/verification-receipt.js";
import { projectEntityProperties } from "../mutation/entity-projection.js";
import { executeUpsert } from "../mutation/upsert.js";

// implements REQ-kibi-verification-evidence-contract
export const PLAYWRIGHT_RUN_VERSION = "kibi.playwright-run.v1" as const;

// implements REQ-kibi-verification-evidence-contract
export type VerificationCaseArtifact = Readonly<{
  symbol_id: string;
  project: string;
  outcome: "passed" | "failed" | "timed_out" | "skipped" | "interrupted";
  retries: number;
  duration_ms: number;
}>;

// implements REQ-kibi-verification-evidence-contract
export type IngestVerificationArgs = Readonly<{
  testId: string;
  snapshot: string;
  artifact: Readonly<Record<string, unknown>>;
}>;

// implements REQ-kibi-verification-evidence-contract
export type IngestVerificationResult = Readonly<{
  receipt: Readonly<Record<string, unknown>>;
  testId: string;
  proofOutcome: "passed" | "failed" | "timed_out" | "interrupted";
  receiptCount: number;
  upsert: unknown;
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const objectValue = record(value);
  if (objectValue) {
    return `{${Object.entries(objectValue)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function requiredString(value: unknown, label: string): string {
  const result = text(value);
  if (!result)
    throw new Error(`Verification ingest failed: ${label} must be non-empty`);
  return result;
}

function parseCases(
  artifact: Record<string, unknown>,
): VerificationCaseArtifact[] {
  const raw = artifact.cases;
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error(
      "Verification ingest failed: artifact.cases must be non-empty",
    );
  return raw.map((value, index) => {
    const row = record(value);
    if (!row)
      throw new Error(
        `Verification ingest failed: artifact.cases[${index}] must be an object`,
      );
    const outcome = text(row.outcome) as VerificationCaseArtifact["outcome"];
    if (
      !["passed", "failed", "timed_out", "skipped", "interrupted"].includes(
        outcome,
      )
    )
      throw new Error(
        `Verification ingest failed: unsupported case outcome at index ${index}`,
      );
    if (!Number.isInteger(row.retries) || Number(row.retries) < 0)
      throw new Error(
        `Verification ingest failed: artifact.cases[${index}].retries must be non-negative`,
      );
    if (!Number.isInteger(row.duration_ms) || Number(row.duration_ms) < 0)
      throw new Error(
        `Verification ingest failed: artifact.cases[${index}].duration_ms must be non-negative`,
      );
    return {
      symbol_id: requiredString(
        row.symbol_id,
        `artifact.cases[${index}].symbol_id`,
      ),
      project: requiredString(row.project, `artifact.cases[${index}].project`),
      outcome,
      retries: Number(row.retries),
      duration_ms: Number(row.duration_ms),
    };
  });
}

function existingReceipts(
  test: Record<string, unknown>,
): Record<string, unknown>[] {
  return Array.isArray(test.verification_receipts)
    ? test.verification_receipts.filter(record).map((value) => ({ ...value }))
    : [];
}

function validateContract(
  test: Record<string, unknown>,
  artifact: Record<string, unknown>,
  cases: readonly VerificationCaseArtifact[],
): { contract: Record<string, unknown>; contractHash: string } {
  const contract = record(test.verification_contract);
  if (!contract || contract.version !== VERIFICATION_CONTRACT_VERSION)
    throw new Error(
      "Verification ingest failed: test has no verification_contract.v1",
    );
  if (text(artifact.runner) !== text(contract.runner))
    throw new Error(
      "Verification ingest failed: reporter runner does not match verification contract",
    );
  const command = Array.isArray(artifact.command_argv)
    ? artifact.command_argv.map(String)
    : [];
  const contractCommand = Array.isArray(contract.command_argv)
    ? contract.command_argv.map(String)
    : [];
  if (canonical(command) !== canonical(contractCommand))
    throw new Error(
      "Verification ingest failed: reporter command_argv does not match verification contract",
    );
  const requiredCases = Array.isArray(contract.required_case_symbols)
    ? contract.required_case_symbols.map(String)
    : [];
  const requiredProjects = Array.isArray(contract.required_projects)
    ? contract.required_projects.map(String)
    : [];
  const seen = new Set<string>();
  for (const row of cases) {
    const key = `${row.project}\0${row.symbol_id}`;
    if (seen.has(key))
      throw new Error(
        `Verification ingest failed: duplicate reporter case ${row.project}/${row.symbol_id}`,
      );
    seen.add(key);
  }
  for (const symbol of requiredCases) {
    for (const project of requiredProjects) {
      if (!seen.has(`${project}\0${symbol}`))
        throw new Error(
          `Verification ingest failed: missing required case ${project}/${symbol}`,
        );
    }
  }
  return { contract, contractHash: verificationContractHash(contract) };
}

// implements REQ-kibi-verification-evidence-contract
export async function executeIngestVerification(
  args: IngestVerificationArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: IngestVerificationResult;
}> {
  if (!context.prolog)
    throw new Error("Verification ingest requires a Prolog runtime");
  const testId = requiredString(args.testId, "testId");
  const snapshot = requiredString(args.snapshot, "snapshot");
  const artifact = record(args.artifact);
  if (!artifact || artifact.version !== PLAYWRIGHT_RUN_VERSION)
    throw new Error(
      `Verification ingest failed: artifact.version must be ${PLAYWRIGHT_RUN_VERSION}`,
    );
  const workspace = await readWorkspaceSnapshot(context);
  if (!workspace.available)
    throw new Error(`Verification ingest failed: ${workspace.error}`);
  if (workspace.snapshot.hash !== snapshot)
    throw new Error(
      "Verification ingest failed: captured snapshot is not the live workspace snapshot",
    );
  if (text(artifact.code_snapshot) !== snapshot)
    throw new Error(
      "Verification ingest failed: artifact code_snapshot does not match captured snapshot",
    );
  const tests = await loadEntities(context.prolog, {
    id: testId,
    type: "test",
  });
  const test = tests[0];
  if (!test)
    throw new Error(`Verification ingest failed: test ${testId} was not found`);
  const cases = parseCases(artifact);
  const { contract, contractHash } = validateContract(test, artifact, cases);
  const processExitCode = Number(artifact.process_exit_code);
  const hasInterrupted = cases.some((row) => row.outcome === "interrupted");
  const hasTimedOut = cases.some((row) => row.outcome === "timed_out");
  const allPassing =
    processExitCode === 0 &&
    cases.every((row) => row.outcome === "passed" && row.retries === 0);
  const proofOutcome = allPassing
    ? "passed"
    : hasInterrupted
      ? "interrupted"
      : hasTimedOut
        ? "timed_out"
        : "failed";
  const startedAt = requiredString(artifact.started_at, "artifact.started_at");
  const finishedAt = requiredString(
    artifact.finished_at,
    "artifact.finished_at",
  );
  const receipt: Record<string, unknown> = {
    version: VERIFICATION_RECEIPT_V2_VERSION,
    receipt_id: `VR-${digest({ testId, artifact }).slice(0, 24)}`,
    test_id: testId,
    runner: text(artifact.runner),
    command:
      cases.length > 0
        ? Array.isArray(artifact.command_argv)
          ? artifact.command_argv.map(String).join(" ")
          : ""
        : "",
    command_argv: Array.isArray(artifact.command_argv)
      ? artifact.command_argv.map(String)
      : [],
    scope: text(test.verification_scope) || "end_to_end",
    outcome: proofOutcome,
    code_snapshot: snapshot,
    environment_hash: requiredString(
      artifact.environment_hash,
      "artifact.environment_hash",
    ),
    started_at: startedAt,
    finished_at: finishedAt,
    artifact_digest: digest(artifact),
    contract_hash: contractHash,
    case_results: cases,
  };
  const nextReceipts = [...existingReceipts(test), receipt];
  const historyErrors = verificationReceiptHistoryErrors(
    testId,
    test.verification_scope,
    nextReceipts,
    contract,
  );
  if (historyErrors.length > 0)
    throw new Error(`Verification ingest failed: ${historyErrors.join("; ")}`);
  const properties = projectEntityProperties(test);
  properties.verification_receipts = undefined;
  const upsert = await executeUpsert(
    {
      type: "test",
      id: testId,
      properties: { ...properties, verification_receipts: nextReceipts },
    },
    context,
  );
  return {
    content: [
      {
        type: "text",
        text: `Ingested ${proofOutcome} verification evidence for ${testId}.`,
      },
    ],
    structuredContent: {
      receipt,
      testId,
      proofOutcome,
      receiptCount: nextReceipts.length,
      upsert,
    },
  };
}
