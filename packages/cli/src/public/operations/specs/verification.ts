import {
  type IngestVerificationArgs,
  type IngestVerificationResult,
  executeIngestVerification,
} from "../../../operations/verification/ingest-verification.js";
import { PLAYWRIGHT_RUN_ARTIFACT_SCHEMA } from "../../verification-artifact.js";
import type { OperationSpec } from "../types.js";

export type {
  IngestVerificationArgs,
  IngestVerificationResult,
} from "../../../operations/verification/ingest-verification.js";
export { executeIngestVerification } from "../../../operations/verification/ingest-verification.js";

// implements REQ-kibi-verification-evidence-contract
export const ingestVerificationSpec = {
  name: "kb_ingest_verification",
  cliName: "ingest-verification",
  description:
    "Ingest a reporter-produced kibi.playwright-run.v1 artifact for a contracted test. Revalidates the live workspace snapshot, runner/command contract, required case/project coverage, and append-only receipt history before deriving and appending a kibi.verification-receipt.v2. It never accepts a caller-authored receipt or trusted outcome. Each artifact.cases entry requires symbol_id, project, outcome (passed|failed|timed_out|skipped|interrupted), retries, and duration_ms. Produce artifacts with the bundled Playwright reporter via `kibi verify TEST-ID -- <exact contract command>`; direct ingestion is an integration path for reporters and agents.",
  businessInputSchema: {
    type: "object",
    required: ["testId", "snapshot", "artifact"],
    properties: {
      testId: {
        type: "string",
        minLength: 1,
        description: "Existing test entity with verification_contract.v1.",
      },
      snapshot: {
        type: "string",
        pattern: "^[a-f0-9]{64}$",
        description:
          "Workspace verification snapshot captured immediately before the run.",
      },
      artifact: PLAYWRIGHT_RUN_ARTIFACT_SCHEMA,
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "kb-write", "workspace-read"],
  execute: executeIngestVerification,
} as const satisfies OperationSpec<
  IngestVerificationArgs,
  IngestVerificationResult
>;
