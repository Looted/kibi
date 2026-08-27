import {
  type IngestVerificationArgs,
  type IngestVerificationResult,
  executeIngestVerification,
} from "../../../operations/verification/ingest-verification.js";
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
    "Ingest a reporter-produced kibi.playwright-run.v1 artifact for a contracted test. Revalidates the live workspace snapshot, runner/command contract, required case/project coverage, and append-only receipt history before deriving and appending a kibi.verification-receipt.v2. It never accepts a caller-authored receipt or trusted outcome.",
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
      artifact: {
        type: "object",
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
          version: { type: "string", const: "kibi.playwright-run.v1" },
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
            items: { type: "object" },
          },
        },
        additionalProperties: true,
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "kb-write", "workspace-read"],
  execute: executeIngestVerification,
} as const satisfies OperationSpec<
  IngestVerificationArgs,
  IngestVerificationResult
>;
