import {
  type IngestProofArgs,
  type IngestProofResult,
  executeIngestProof,
} from "../../../operations/proof/ingest-proof.js";
import { PROOF_RUN_ARTIFACT_SCHEMA } from "../../proof-protocol.js";
import type { OperationSpec } from "../types.js";

export type {
  IngestProofArgs,
  IngestProofResult,
} from "../../../operations/proof/ingest-proof.js";
export { executeIngestProof } from "../../../operations/proof/ingest-proof.js";

// implements REQ-kibi-proof-evidence-protocol
export const ingestProofSpec = {
  name: "kb_ingest_proof",
  cliName: "ingest-proof",
  description:
    "Ingest a producer-emitted kibi.proof-run.v1 artifact and evaluate it against each selected test's kibi.proof-contract.v1 proof obligations. Revalidates the live workspace snapshot, integration command binding, run-level outcome, attempt history, success policy, and append-only proof-receipt history before deriving and appending idempotent kibi.proof-receipt.v1 receipts. Producers report what happened; Kibi evaluates proof. Prefer `kibi prove` so the configured producer runs automatically; direct ingestion is an integration path for custom producers and agents.",
  businessInputSchema: {
    type: "object",
    required: ["snapshot", "artifact"],
    properties: {
      snapshot: {
        type: "string",
        pattern: "^[a-f0-9]{64}$",
        description: "Workspace snapshot captured immediately before the run.",
      },
      artifact: PROOF_RUN_ARTIFACT_SCHEMA,
      testIds: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 },
        description:
          "Existing test entities with proof_contract.v1. Omit to evaluate every test contracted to the artifact's integration.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "kb-write", "workspace-read"],
  execute: executeIngestProof,
} as const satisfies OperationSpec<IngestProofArgs, IngestProofResult>;
