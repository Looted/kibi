import {
  type ProofGap,
  evaluateContractAgainstRun,
} from "../../proof/evaluate.js";
import {
  loadProofIntegrations,
  resolveIntegration,
  toExecution,
} from "../../proof/integrations.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import {
  environmentHash as canonicalEnvironmentHash,
  effectiveProofFingerprint,
  jsonDigest,
  proofContractHash,
} from "../../public/proof-fingerprint.js";
import {
  PROOF_CONTRACT_VERSION,
  PROOF_RECEIPT_VERSION,
  type ProofBinding,
  type ProofContract,
  type ProofRunArtifact,
  proofBindingsErrors,
  proofRunArtifactErrors,
} from "../../public/proof-protocol.js";
import {
  MAX_PROOF_RECEIPTS,
  type ProofReceipt,
  proofReceiptCurrentBindingErrors,
  proofReceiptHistoryErrors,
} from "../../public/proof-receipt.js";
import { projectEntityProperties } from "../mutation/entity-projection.js";
import { executeUpsert } from "../mutation/upsert.js";

// implements REQ-kibi-proof-evidence-protocol
export type IngestProofArgs = Readonly<{
  snapshot: string;
  artifact: Readonly<Record<string, unknown>>;
  testIds?: readonly string[];
}>;

export type IngestProofTestResult = Readonly<{
  testId: string;
  outcome: ProofReceipt["outcome"];
  receiptId: string;
  applied: boolean;
  duplicate: boolean;
  receiptCount: number;
  gaps: readonly ProofGap[];
}>;

// implements REQ-kibi-proof-evidence-protocol
export type IngestProofResult = Readonly<{
  artifactDigest: string;
  environmentHash: string;
  integration: string | null;
  passed: number;
  failed: number;
  unchanged: number;
  results: readonly IngestProofTestResult[];
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(value: unknown, label: string): string {
  const result = text(value);
  if (!result)
    throw new Error(`Proof ingest failed: ${label} must be non-empty`);
  return result;
}

function parseContract(test: Record<string, unknown>): ProofContract {
  const contract = record(test.proof_contract);
  const candidate: Record<string, unknown> = contract ?? {};
  const { version, integration, required_proofs, success_policy } =
    candidate as Record<string, unknown>;
  const normalized: ProofContract = {
    version: version as ProofContract["version"],
    integration: String(integration ?? ""),
    required_proofs: Array.isArray(required_proofs)
      ? (required_proofs.map((entry) => {
          const row = record(entry);
          return {
            symbol_id: String(row?.symbol_id ?? ""),
            target: String(row?.target ?? ""),
          };
        }) as ProofContract["required_proofs"])
      : [],
    success_policy: success_policy as ProofContract["success_policy"],
  };
  if (!contract || contract.version !== PROOF_CONTRACT_VERSION)
    throw new Error(
      `Proof ingest failed: test ${String(test.id)} has no proof_contract (${PROOF_CONTRACT_VERSION})`,
    );
  return normalized;
}

function parseBindings(test: Record<string, unknown>): ProofBinding[] {
  const raw = test.proof_bindings;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw))
    throw new Error(
      `Proof ingest failed: test ${String(test.id)} proof_bindings must be an array`,
    );
  const errors = proofBindingsErrors(raw);
  if (errors.length > 0)
    throw new Error(
      `Proof ingest failed: test ${String(test.id)} ${errors.join("; ")}`,
    );
  return raw.map((entry) => {
    const row = record(entry) ?? {};
    return {
      symbol_id: String(row.symbol_id ?? ""),
      target: String(row.target ?? ""),
      ...(row.native_id !== undefined
        ? { native_id: String(row.native_id) }
        : {}),
      ...(row.aliases !== undefined
        ? { aliases: (row.aliases as unknown[]).map(String) }
        : {}),
      ...(row.source_file !== undefined
        ? { source_file: String(row.source_file) }
        : {}),
      ...(row.line !== undefined ? { line: Number(row.line) } : {}),
    };
  });
}

function existingReceipts(
  test: Record<string, unknown>,
): Record<string, unknown>[] {
  return Array.isArray(test.proof_receipts)
    ? test.proof_receipts.filter(record).map((value) => ({ ...value }))
    : [];
}

// implements REQ-kibi-proof-evidence-protocol
export async function executeIngestProof(
  args: IngestProofArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: IngestProofResult;
}> {
  if (!context.prolog)
    throw new Error("Proof ingest requires a Prolog runtime");
  const snapshot = requiredString(args.snapshot, "snapshot");
  const artifactValue = record(args.artifact);
  if (!artifactValue)
    throw new Error(
      "Proof ingest failed: artifact must be a kibi.proof-run.v1 object with version, producer, command_argv, code_snapshot, environment, run, and proof_results",
    );
  // One generic pipeline: validate, bind, fingerprint, evaluate, derive, apply.
  const artifactErrors = proofRunArtifactErrors(artifactValue);
  if (artifactErrors.length > 0)
    throw new Error(`Proof ingest failed: ${artifactErrors.join("; ")}`);
  const artifact = artifactValue as unknown as ProofRunArtifact;

  const workspace = await readWorkspaceSnapshot(context);
  if (!workspace.available)
    throw new Error(`Proof ingest failed: ${workspace.error}`);
  if (workspace.snapshot.hash !== snapshot)
    throw new Error(
      "Proof ingest failed: captured snapshot is not the live workspace snapshot",
    );
  if (artifact.code_snapshot !== snapshot)
    throw new Error(
      "Proof ingest failed: artifact code_snapshot does not match captured snapshot",
    );

  const requestedTestIds =
    args.testIds?.map((id) => requiredString(id, "testIds")) ?? [];
  if (new Set(requestedTestIds).size !== requestedTestIds.length)
    throw new Error("Proof ingest failed: testIds contains duplicates");
  if (requestedTestIds.length === 0 && text(artifact.integration) === "")
    throw new Error(
      "Proof ingest failed: provide testIds, or set artifact.integration to select the contracted tests this artifact is evaluated against",
    );

  const integrationId = text(artifact.integration) || null;
  const integrations = loadProofIntegrations(context.workspaceRoot);
  if (!integrations.available)
    throw new Error(`Proof ingest failed: ${integrations.error}`);

  const tests: Record<string, unknown>[] = [];
  if (requestedTestIds.length > 0) {
    for (const testId of requestedTestIds) {
      const found = await loadEntities(context.prolog, {
        id: testId,
        type: "test",
      });
      const test = found[0];
      if (!test)
        throw new Error(`Proof ingest failed: test ${testId} was not found`);
      tests.push(test);
    }
  } else {
    const all = await loadEntities(context.prolog, { type: "test" });
    for (const test of all) {
      const contract = record(test.proof_contract);
      if (
        contract &&
        contract.version === PROOF_CONTRACT_VERSION &&
        text(contract.integration) === integrationId
      ) {
        tests.push(test);
      }
    }
    if (tests.length === 0)
      throw new Error(
        `Proof ingest failed: no tests declare proof_contract.integration '${integrationId}'`,
      );
  }

  type Prepared = {
    testId: string;
    test: Record<string, unknown>;
    contract: ProofContract;
    evaluation: ReturnType<typeof evaluateContractAgainstRun>;
    receipt: ProofReceipt;
    existing: Record<string, unknown>[];
  };
  const prepared: Prepared[] = [];
  for (const test of tests) {
    const testId = String(test.id);
    const contract = parseContract(test);
    if (integrationId !== null && contract.integration !== integrationId)
      throw new Error(
        `Proof ingest failed: test ${testId} binds integration '${contract.integration}' but the artifact was produced by '${integrationId}'`,
      );
    const effectiveIntegrationId = integrationId ?? contract.integration;
    const integration = resolveIntegration(
      integrations.integrations,
      effectiveIntegrationId,
    );
    if (!integration)
      throw new Error(
        `Proof ingest failed: integration '${effectiveIntegrationId}' is not configured in .kb/proof/integrations.json`,
      );
    if (
      jsonDigest(artifact.command_argv) !== jsonDigest([...integration.command])
    )
      throw new Error(
        `Proof ingest failed: artifact command_argv does not match the configured command for integration '${effectiveIntegrationId}'`,
      );
    const bindings = parseBindings(test);
    const { fingerprint, components } = effectiveProofFingerprint({
      contract,
      integration: toExecution(integration),
      bindings,
    });
    const evaluation = evaluateContractAgainstRun(artifact, contract);
    const environmentHash = canonicalEnvironmentHash(artifact.environment);
    const artifactDigest = jsonDigest(artifact);
    const receipt: ProofReceipt = {
      version: PROOF_RECEIPT_VERSION,
      receipt_id: `PR-${jsonDigest({
        artifact_digest: artifactDigest,
        test_id: testId,
        fingerprint,
      }).slice(0, 24)}`,
      test_id: testId,
      scope: (text(test.verification_scope) ||
        "end_to_end") as ProofReceipt["scope"],
      outcome: evaluation.outcome,
      code_snapshot: snapshot,
      environment_hash: environmentHash,
      started_at: artifact.run.started_at,
      finished_at: artifact.run.finished_at,
      artifact_digest: artifactDigest,
      contract_hash: proofContractHash(contract),
      fingerprint,
      fingerprint_components: components,
      integration_id: effectiveIntegrationId,
      producer: artifact.producer,
      command_argv: [...artifact.command_argv],
      run_outcome: artifact.run.outcome,
      proof_results: evaluation.projectedResults.map((result) => ({
        ...result,
      })),
      ...(evaluation.gaps.length > 0 ? { gaps: evaluation.gaps } : {}),
    };
    prepared.push({
      testId,
      test,
      contract,
      evaluation,
      receipt,
      existing: existingReceipts(test),
    });
  }

  const results: IngestProofTestResult[] = [];
  let passed = 0;
  let failed = 0;
  let unchanged = 0;
  for (const entry of prepared) {
    const { testId, test, contract, evaluation, receipt, existing } = entry;
    // Idempotent re-ingestion: the same artifact against the same effective
    // contract+fingerprint derives the same receipt id and must not re-append.
    if (existing.some((row) => row.receipt_id === receipt.receipt_id)) {
      unchanged += 1;
      if (receipt.outcome === "passed") passed += 1;
      else failed += 1;
      results.push({
        testId,
        outcome: receipt.outcome,
        receiptId: receipt.receipt_id,
        applied: false,
        duplicate: true,
        receiptCount: existing.length,
        gaps: evaluation.gaps,
      });
      continue;
    }
    const nextReceipts = [
      ...existing,
      receipt as unknown as Record<string, unknown>,
    ].slice(-MAX_PROOF_RECEIPTS);
    const historyErrors = proofReceiptHistoryErrors(
      testId,
      test.verification_scope,
      nextReceipts,
    );
    const bindingErrors = proofReceiptCurrentBindingErrors(
      testId,
      test.verification_scope,
      receipt as unknown as Record<string, unknown>,
      contract,
      receipt.fingerprint,
    );
    const receiptErrors = [...historyErrors, ...bindingErrors];
    if (receiptErrors.length > 0)
      throw new Error(
        `Proof ingest failed for ${testId}: ${receiptErrors.join("; ")}`,
      );
    const properties = projectEntityProperties(test);
    properties.proof_receipts = undefined;
    const upsert = await executeUpsert(
      {
        type: "test",
        id: testId,
        properties: { ...properties, proof_receipts: nextReceipts },
      },
      context,
    );
    void upsert;
    if (receipt.outcome === "passed") passed += 1;
    else failed += 1;
    results.push({
      testId,
      outcome: receipt.outcome,
      receiptId: receipt.receipt_id,
      applied: true,
      duplicate: false,
      receiptCount: nextReceipts.length,
      gaps: evaluation.gaps,
    });
  }

  const summary =
    passed > 0
      ? `Proved ${passed} test(s)${failed > 0 ? `, ${failed} failed` : ""}${unchanged > 0 ? `, ${unchanged} unchanged` : ""}.`
      : `No passing proof: ${failed} failed, ${unchanged} unchanged.`;
  return {
    content: [{ type: "text", text: `Ingested proof evidence. ${summary}` }],
    structuredContent: {
      artifactDigest: jsonDigest(artifact),
      environmentHash: canonicalEnvironmentHash(artifact.environment),
      integration: integrationId,
      passed,
      failed,
      unchanged,
      results,
    },
  };
}
