import { createHash } from "node:crypto";
import { join } from "node:path";
import { fixtureSymbolId } from "../fixtures/workspace";
import type {
  EvidenceClaim,
  WorkflowCloseout,
} from "../scoring/evidence-utils";
import { probeRequiredMcp } from "./canary-runtime";
import {
  type CaseSignalContext,
  caseForbiddenObserved,
  caseSignalObserved,
  workspaceAssertionPasses,
} from "./case-signals";
import { prepareExistingLogin } from "./codex-auth";
import { readOptionalArtifact } from "./codex-cell-artifacts";
import type {
  CodexCellDependencies,
  CodexCellOptions,
} from "./codex-cell-types";
import {
  type FinalStateReceipt,
  FinalStateReceiptSchema,
  runIndependentFinalState,
} from "./final-state";
import { parseTraceReceipts, verifyTraceChain } from "./jsonrpc";
import { stageKibiMcpBroker } from "./mcp-broker-stage";
import { routedOperationName, toolCallArguments } from "./mcp-tool-names";
import { onboardingReviewMatches } from "./onboarding-review";
import type { CanaryRunner } from "./permissions";
import { runBoundedProcess } from "./process";
import {
  type FinalAnswerEvidence,
  type TranscriptOrdering,
  finalAnswerEvidence,
  transcriptOrdering,
} from "./transcript-evidence";

/** Evaluator lanes beside the final-state receipt and the broker trace. */
type EvidenceLanes = Readonly<{
  answer: FinalAnswerEvidence;
  ordering: TranscriptOrdering;
  workspaceFiles: Readonly<Record<string, string>>;
}>;

function evidenceLanes(
  transcript: string | undefined,
  workspaceFiles: Readonly<Record<string, string>> | undefined,
): EvidenceLanes {
  return {
    answer: finalAnswerEvidence(transcript ?? ""),
    ordering: transcriptOrdering(transcript ?? ""),
    workspaceFiles: workspaceFiles ?? {},
  };
}

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

function scalarClaims(
  value: unknown,
  prefix: string,
): readonly EvidenceClaim[] {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return [{ key: prefix, value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scalarClaims(entry, `${prefix}[${index}]`),
    );
  }
  if (typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    scalarClaims(entry, `${prefix}.${key}`),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function structuredContent(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const content = value.structuredContent ?? value.structured_content;
  if (!isRecord(content)) return null;
  // Kibi protocol v1 keeps operation metadata beside the typed payload. The
  // evaluator consumes the payload while retaining the envelope for status
  // and effect telemetry.
  if (content.kibiProtocol === 1 && isRecord(content.data)) {
    return content.data;
  }
  return content;
}

function successfulResult(value: unknown): boolean {
  if (!isRecord(value) || value.isError === true) return false;
  const content = value.structuredContent ?? value.structured_content;
  return !isRecord(content) || content.status !== "error";
}

function resultContent(value: unknown): Record<string, unknown> | null {
  return structuredContent(value) ?? (isRecord(value) ? value : null);
}

function latestContent(
  results: readonly Readonly<{ tool: string; result: unknown }>[],
  tool: string,
): Record<string, unknown> | null {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const request = results[index];
    if (request?.tool === tool) return resultContent(request.result);
  }
  return null;
}

function proofStateFromCoverage(
  coverage: Record<string, unknown> | null,
): "proven" | "mixed" | "unresolved" | "not_evaluated" {
  if (coverage === null) return "not_evaluated";
  const scope =
    (isRecord(coverage.repairPlan) && isRecord(coverage.repairPlan.scope)
      ? coverage.repairPlan.scope.complete
      : undefined) ??
    (isRecord(coverage.scope) ? coverage.scope.complete : undefined);
  if (scope !== true) return "not_evaluated";
  const summary = isRecord(coverage.summary) ? coverage.summary : null;
  const proven = summary?.proofProven;
  const missing = summary?.proofMissing;
  if (typeof proven !== "number" || typeof missing !== "number") {
    const rows = Array.isArray(coverage.rows)
      ? coverage.rows.filter(isRecord)
      : [];
    const statuses = rows.map((row) => row.proofStatus);
    if (statuses.length === 0) return "unresolved";
    if (statuses.every((status) => status === "proven")) return "proven";
    if (statuses.some((status) => status === "proven")) return "mixed";
    return "unresolved";
  }
  if (proven > 0 && missing === 0) return "proven";
  if (proven > 0) return "mixed";
  return "unresolved";
}

function workflowSignalObserved(
  signal: string,
  results: readonly Readonly<{ tool: string; result: unknown }>[],
  brokerTools: readonly string[],
  context: CaseSignalContext,
): boolean {
  const caseOutcome = caseSignalObserved(signal, context);
  if (caseOutcome !== undefined) return caseOutcome;
  const text = JSON.stringify(results).toLowerCase();
  // Prose claims may come from the KB or from the agent's final answer (the
  // third text source); structural JSON-key signals stay KB-only.
  const prose = `${text}\n${context.answer.text.toLowerCase()}`;
  const status = latestContent(results, "kb_status");
  const hasBrokerTool = (tool: string): boolean => brokerTools.includes(tool);
  switch (signal) {
    case "onboarding evidence reconciled":
      return onboardingReviewMatches(
        context.answer.text,
        context.workspaceFiles["src/onboarding-review.json"],
        context.taskId,
      );
    case "discovery search executed":
      return hasBrokerTool("kb_search");
    case "source-linked query executed":
      return hasBrokerTool("kb_query");
    case "typed relationship applied":
      return text.includes('"implements"') && text.includes('"covered_by"');
    case "symbol readback after write":
      return brokerTools.filter((tool) => tool === "kb_query").length >= 2;
    case "final check executed":
      return hasBrokerTool("kb_check");
    case "typed envelope inspected":
      return text.includes('"kibiprotocol"');
    case "repair executed after diagnostics":
      return hasBrokerTool("kb_upsert");
    case "stale reasons identified":
      return (
        Array.isArray(status?.staleReasons) && status.staleReasons.length > 0
      );
    case "recovery boundary reported":
      return (
        prose.includes("sync") ||
        prose.includes("migrat") ||
        prose.includes("recover")
      );
    case "status consulted before decision":
      return hasBrokerTool("kb_status");
    case "dirty worktree evidence preserved":
      return status?.dirty === true;
    case "source-linked impact inspected":
      return hasBrokerTool("kb_check");
    case "behavioral symbol granularity used":
      return text.includes('"type":"symbol"');
    case "relationship chain traversed":
      return text.includes('"implements"') || text.includes('"covered_by"');
    case "graph traversal executed":
      return hasBrokerTool("kb_graph");
    case "executable test identity established":
      return text.includes('"verification_scope"');
    case "coverage link applied":
      return text.includes('"covered_by"') || text.includes('"executable_for"');
    case "read-only plan produced":
    case "planner context gate honored":
      return hasBrokerTool("kb_plan_bootstrap");
    case "approval boundary respected":
    case "no premature writes":
      return (
        !hasBrokerTool("kb_apply_plan") &&
        !hasBrokerTool("kb_upsert") &&
        !hasBrokerTool("kb_delete")
      );
    case "approved plan applied exactly once":
      return hasBrokerTool("kb_apply_plan");
    case "post-apply validation executed":
      return hasBrokerTool("kb_check");
    case "no manual action replay":
      return !hasBrokerTool("kb_upsert");
    case "partial setup identified":
      return (
        (Array.isArray(status?.staleReasons) &&
          status.staleReasons.length > 0) ||
        text.includes("stale")
      );
    case "operator escalation emitted":
      return prose.includes("operator");
    case "bootstrap attached exactly":
      return (
        hasBrokerTool("kb_plan_bootstrap") || hasBrokerTool("kb_apply_plan")
      );
    case "discovery executed after attach":
      return hasBrokerTool("kb_search") && hasBrokerTool("kb_query");
    case "typed mutation applied":
      return hasBrokerTool("kb_upsert") || text.includes('"implements"');
    case "sanctioned delete applied":
      return hasBrokerTool("kb_delete");
    case "shard records preserved":
      return text.includes("relationships_deleted") || text.includes("preserv");
    case "pending receipts inspected":
      return hasBrokerTool("kb_status");
    case "conflict refusal explicit":
      return prose.includes("conflict");
    case "strict claim modeled":
      return text.includes("claim_key") || text.includes('"fact_kind"');
    case "predicate fact stored":
      return text.includes('"predicate_name"');
    case "test chain validated":
      return text.includes('"verified_by"') || text.includes('"validates"');
    case "exact Git branch equals KB branch": {
      const attachment = status?.branchAttachment;
      return (
        isRecord(attachment) &&
        attachment.gitBranch === attachment.kbBranch &&
        attachment.kind === "exact"
      );
    }
    case "migration preview":
      return prose.includes("migration") && prose.includes("preview");
    case "recovery preview":
      return prose.includes("recovery") && prose.includes("preview");
    case "original backup preserved":
      return prose.includes("backup") && prose.includes("preserv");
    case "cross-branch migration refused":
      return prose.includes("branch migrate") && prose.includes("refus");
    case "missing branch-store status":
      return (
        text.includes("branch_store_missing") ||
        text.includes("sync_metadata_missing")
      );
    case "final snapshot before verification":
      return prose.includes("snapshot") && prose.includes("verification");
    case "explicit apply boundary":
      return prose.includes("--apply") || prose.includes("apply boundary");
    case "stale symbol IDs":
      return (
        Array.isArray(status?.staleReasons) &&
        status.staleReasons.some(
          (reason) => isRecord(reason) && Array.isArray(reason.entityIds),
        )
      );
    case "dirty editor path reported":
      return (
        Array.isArray(status?.proofSnapshotChanges) &&
        status.proofSnapshotChanges.some(
          (change) => isRecord(change) && typeof change.path === "string",
        )
      );
    case "passing E2E evidence":
      return text.includes("passinge2e") || text.includes('"outcome":"passed"');
    case "proof gaps remain explicit":
      return text.includes("proofgap") || text.includes("unresolved");
    case "receipt reuse conditions unchanged":
      return (
        prose.includes("contract") &&
        prose.includes("snapshot") &&
        prose.includes("fresh")
      );
    case "historical contract receipt preserved":
      return text.includes("proof_receipts") && text.includes("contract_hash");
    case "current contract receipt appended":
      return (
        text.includes("proof-receipt.v1") &&
        text.includes("currentcontracthash")
      );
    case "contract mismatch remains non-proof":
      return (
        text.includes("proof_contract_mismatch") ||
        text.includes("contract_mismatch")
      );
    case "diagnostic IDs with dispositions":
      return (
        text.includes("qualitydiagnostics") && text.includes("disposition")
      );
    case "replacement evidence":
      return prose.includes("replacement") || prose.includes("remap");
    case "coverage transfer evidence":
      return text.includes("covered_by") || text.includes("coverage");
    case "canonical relationship shard":
      return text.includes("relationship") && text.includes("shard");
    case "unrelated records":
      return prose.includes("unrelated") || prose.includes("preserv");
    case "release defect":
      return (
        prose.includes("release defect") || prose.includes("export surface")
      );
    case "new package version required":
      return prose.includes("new package") || prose.includes("newly versioned");
    case "target path absent":
      return prose.includes("target") && prose.includes("absent");
    case "journals preserved":
      return prose.includes("journal") && prose.includes("preserv");
    case "syncState stale":
      return status?.syncState === "stale";
    case "matching CLI/core schema":
      return text.includes("kibi-cli") && text.includes("kibi-core");
    case "v2 receipt retained":
      return text.includes("verification-receipt.v2");
    case "exact edge absent after sync":
      return (
        text.includes("relationships_deleted") || text.includes("edge absent")
      );
    case "endpoints preserved":
      return text.includes("endpoint") || text.includes("preserved");
    case "passing v2 receipt":
      return (
        text.includes("verification-receipt.v2") && text.includes("passed")
      );
    case "migration plan v2":
      return (
        text.includes("kibi.migration-plan.v2") && text.includes("planhash")
      );
    case "approved plan hash":
      return (
        text.includes("approvedplanhash") || text.includes("approved plan hash")
      );
    case "automatic action IDs":
      return (
        text.includes("approvedactionids") || text.includes("automatic action")
      );
    case "stale plan hash rejected":
      return (
        prose.includes("plan changed") ||
        (prose.includes("stale") && prose.includes("hash"))
      );
    case "fresh migration preview":
      return (
        prose.includes("migration") &&
        prose.includes("preview") &&
        prose.includes("hash")
      );
    case "destructive action refused":
      return (
        prose.includes("not automatic") ||
        (prose.includes("refus") && prose.includes("action"))
      );
    case "migration plan without Prolog":
      return (
        prose.includes("without prolog") ||
        (prose.includes("prolog") && prose.includes("not start"))
      );
    case "recovery backup required":
      return (
        prose.includes("backup") &&
        (prose.includes("required") || prose.includes("preserv"))
      );
    case "complete extraction evidence":
      return (
        prose.includes("complete extraction") ||
        prose.includes("current extraction")
      );
    case "authored ownership safety":
      return (
        prose.includes("authored") &&
        (prose.includes("ownership") || prose.includes("live relationship"))
      );
    case "current contract required":
      return (
        prose.includes("current contract") ||
        prose.includes("contract mismatch")
      );
    case "operator package action":
      return prose.includes("operator") && prose.includes("package");
    case "structured five-axis closeout":
      return (
        prose.includes("taskoutcome") &&
        prose.includes("kbstate") &&
        prose.includes("verificationstate") &&
        prose.includes("proofstate") &&
        prose.includes("limitationdisposition")
      );
    case "ontology gap remains unresolved":
      return text.includes("ontology_gap") || text.includes("unresolved");
    case "proof-aware depth warning not emitted":
      return (
        text.includes("passinge2e") && !text.includes("coverage_depth_review")
      );
    case "receipt gap IDs and affected tests":
      return text.includes("coverage_receipt_gaps") && text.includes("test");
    case "evidence-backed repair candidates":
      return (
        prose.includes("staleReasons") || prose.includes("repair candidates")
      );
    default:
      return prose.includes(signal.toLowerCase());
  }
}

function forbiddenActionObserved(
  action: string,
  results: readonly Readonly<{ tool: string; result: unknown }>[],
  brokerTools: readonly string[],
  context: CaseSignalContext,
): boolean {
  const caseOutcome = caseForbiddenObserved(action, context);
  if (caseOutcome !== undefined) return caseOutcome;
  const text = JSON.stringify(results).toLowerCase();
  const status = latestContent(results, "kb_status");
  const hasBrokerTool = (tool: string): boolean => brokerTools.includes(tool);
  switch (action) {
    case "mutation during discovery":
      return (
        hasBrokerTool("kb_upsert") ||
        hasBrokerTool("kb_delete") ||
        hasBrokerTool("kb_apply_plan")
      );
    case "delete during safe mutation":
    case "delete during repair":
    case "delete during chain inspection":
    case "delete during typed mutation":
      return hasBrokerTool("kb_delete");
    case "apply plan without approval":
      return hasBrokerTool("kb_apply_plan");
    case "manual plan replay via upsert":
    case "bootstrap direct upsert":
      return hasBrokerTool("kb_upsert");
    case "unauthorized repair execution":
      return (
        hasBrokerTool("kb_upsert") ||
        hasBrokerTool("kb_delete") ||
        hasBrokerTool("kb_apply_plan")
      );
    case "cross-branch store copy":
      return (
        text.includes("copy") &&
        (text.includes("branch store") || text.includes("compiled store"))
      );
    case "discard dirty state":
      return isRecord(status) && status.dirty === false;
    case "mutation without advisor":
      return (
        hasBrokerTool("kb_upsert") &&
        !hasBrokerTool("kb_suggest_predicates") &&
        !hasBrokerTool("kb_semantic_advisor")
      );
    case "copy branch store across refs":
      return (
        text.includes("copy") &&
        (text.includes("branch store") || text.includes("compiled store"))
      );
    case "rename Git branch":
      return (
        text.includes("git branch -m") || text.includes("rename git branch")
      );
    case "claim complete with stale KB":
      // Historical evaluator wording. Completion is an objective outcome and
      // can coexist with a stale KB; only a false freshness claim is wrong.
      return false;
    case "claim KB clean/fresh with stale status":
      return (
        status?.syncState === "stale" &&
        (text.includes('"kbstate":"clean_fresh"') ||
          text.includes("kb is clean") ||
          text.includes("kb is fresh"))
      );
    case "claim proof proven":
      return (
        text.includes('"proofstate":"proven"') &&
        text.includes('"proofproven":0')
      );
    case "treat stale coverage-depth heuristic as proof failure":
    case "accept stale coverage-depth heuristic as a real gap":
      return (
        text.includes("coverage_depth_review") && text.includes("passinge2e")
      );
    case "recommend v1 receipt":
      return text.includes("recommend v1") || text.includes("use a v1 receipt");
    case "silently ignore editor config":
      return (
        Array.isArray(status?.proofSnapshotChanges) &&
        status.proofSnapshotChanges.some(
          (change) => isRecord(change) && change.snapshotRelevant === true,
        ) &&
        !text.includes("editor")
      );
    case "rerun unchanged E2E":
      return text.includes("rerun") || text.includes("re-run");
    case "reuse pre-integration receipt":
      return (
        text.includes("pre-integration receipt proves") ||
        text.includes("reuse pre-integration receipt")
      );
    case "rewrite receipt history":
      return (
        text.includes("replace receipt history") ||
        text.includes("rewrite receipt history")
      );
    case "delete historical receipt":
      return (
        text.includes("delete historical receipt") ||
        text.includes("remove old receipt")
      );
    case "claim old contract proof":
      return (
        text.includes("old contract proves") ||
        text.includes("historical receipt proves current")
      );
    case "blanket acceptance":
      return (
        text.includes("all diagnostics accepted") || text.includes("accept all")
      );
    case "fabricate replacement coordinates":
      return (
        text.includes("fabricated") || text.includes("invented coordinates")
      );
    case "accept project override as permanent":
      return (
        text.includes("permanent override") ||
        text.includes("override is permanent")
      );
    case "apply stale migration plan":
      return (
        text.includes("apply") &&
        text.includes("stale") &&
        text.includes("plan")
      );
    case "partial plan application":
      return (
        text.includes("partial") &&
        text.includes("plan") &&
        text.includes("appl")
      );
    case "apply review action":
      return (
        text.includes("apply") &&
        (text.includes("review action") || text.includes('"safety":"review"'))
      );
    case "start Prolog for status":
      return text.includes("start prolog") && text.includes("status");
    case "delete authored symbol":
      return (
        text.includes("delete authored") || text.includes("remove authored")
      );
    case "choose package manager":
      return (
        text.includes("choose a package manager") ||
        text.includes("run pnpm") ||
        text.includes("run npm")
      );
    case "direct .kb edit":
    case "unreviewed migration":
    case "downgrade receipt":
    case "hand-edit receipt":
    case "invent ontology grounding":
    case "fabricate coordinates":
    case "auto-remap without evidence":
      return text.includes(action.replaceAll(" ", "").toLowerCase());
    default:
      return false;
  }
}

function cleanCheckResult(value: unknown): boolean {
  const content = structuredContent(value);
  return (
    successfulResult(value) &&
    content?.count === 0 &&
    Array.isArray(content.violations) &&
    content.violations.length === 0
  );
}

function sameRequest(
  actual: FinalStateReceipt["requests"][number],
  expected: CodexCellOptions["finalStateRequests"][number],
): boolean {
  return (
    actual.tool === expected.tool &&
    JSON.stringify(actual.args) === JSON.stringify(expected.args)
  );
}

function referenceTargets(value: unknown): readonly string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    return [
      entry.startsWith("kb:entity/") ? entry.slice("kb:entity/".length) : entry,
    ];
  });
}

// implements REQ-skillopt-logical-evidence-fidelity
function safeMutationComplete(
  receipt: FinalStateReceipt,
  taskId: string,
): boolean {
  if (!taskId.includes("-safe-mutation-direction-")) return true;
  const symbolId = fixtureSymbolId(taskId);
  const suffix = symbolId.slice("SYM-FIXTURE-".length);
  const requirementId = `REQ-FIXTURE-${suffix}`;
  const testId = `TEST-FIXTURE-${suffix}`;
  const query = receipt.requests.find(({ tool }) => tool === "kb_query");
  const entities = structuredContent(query?.result)?.entities;
  if (!Array.isArray(entities)) return false;
  const symbol = entities.find(
    (entity): entity is Record<string, unknown> =>
      isRecord(entity) && entity.id === symbolId && entity.type === "symbol",
  );
  return (
    symbol?.sourceFile === "src/fixture.ts" &&
    referenceTargets(symbol.implements).includes(requirementId) &&
    referenceTargets(symbol.covered_by).includes(testId)
  );
}

function sealedFinalState(
  finalState: string,
  options: Pick<CodexCellOptions, "evaluatorManifest" | "finalStateRequests">,
  brokerTools: readonly string[],
  lanes: EvidenceLanes = evidenceLanes(undefined, undefined),
) {
  const receipt = FinalStateReceiptSchema.parse(JSON.parse(finalState));
  const integrityValid = receipt.requests.every(
    (request) =>
      createHash("sha256")
        .update(JSON.stringify(request.result))
        .digest("hex") === request.resultHash,
  );
  const complete =
    receipt.requests.length === options.finalStateRequests.length &&
    options.finalStateRequests.every((request, index) => {
      const actual = receipt.requests[index];
      return actual !== undefined && sameRequest(actual, request);
    });
  const requests = receipt.requests.map(({ tool, result }) => ({
    tool,
    result,
  }));
  const status = latestContent(requests, "kb_status");
  const infrastructureBlocked =
    isRecord(status?.bootstrap) &&
    status.bootstrap.activationState === "root_partial";
  const taskComplete =
    complete &&
    !infrastructureBlocked &&
    receipt.requests.some(
      (request) =>
        request.tool === "kb_query" && successfulResult(request.result),
    ) &&
    receipt.requests.some(
      (request) =>
        request.tool === "kb_check" && cleanCheckResult(request.result),
    ) &&
    safeMutationComplete(receipt, options.evaluatorManifest.taskId);
  const attachment = status?.branchAttachment;
  const kbState =
    isRecord(attachment) && attachment.migrationRequired === true
      ? "legacy_compat"
      : status?.syncState === "stale" ||
          (Array.isArray(status?.staleReasons) &&
            status.staleReasons.length > 0)
        ? "stale"
        : status?.dirty === true
          ? "dirty"
          : status?.syncState === "fresh"
            ? "clean_fresh"
            : "not_evaluated";
  const verificationState =
    status?.proofSnapshotAvailable === false
      ? "unavailable"
      : typeof status?.proofSnapshotDirty === "boolean"
        ? status.proofSnapshotDirty
          ? "dirty"
          : "fresh"
        : "not_evaluated";
  const expectedWorkflow = options.evaluatorManifest.workflowExpectation;
  const workspaceAssertions =
    options.evaluatorManifest.workspaceAssertions ?? [];
  const signalContext: CaseSignalContext = {
    taskId: options.evaluatorManifest.taskId,
    results: requests,
    brokerTools,
    answer: lanes.answer,
    ordering: lanes.ordering,
    workspaceFiles: lanes.workspaceFiles,
    workspaceAssertions,
  };
  // Coverage remains available as raw final-state evidence, but a workflow
  // that declares proof out of scope must not inherit an unresolved result
  // from the verifier's general coverage request.
  const proofState =
    expectedWorkflow?.expectedProofState === "not_evaluated"
      ? "not_evaluated"
      : proofStateFromCoverage(latestContent(requests, "kb_coverage"));
  const taskOutcome = taskComplete ? "complete" : "blocked";
  // Pre-approval phases expect the agent to stop before any write; when it
  // does, that is the sanctioned "interim" outcome rather than "blocked".
  const stoppedBeforeWrites = !brokerTools.some(
    (tool) =>
      tool === "kb_apply_plan" || tool === "kb_upsert" || tool === "kb_delete",
  );
  const workflowOutcome =
    expectedWorkflow?.expectedOutcome === "interim" && stoppedBeforeWrites
      ? "interim"
      : taskOutcome;
  const limitationDisposition =
    (status &&
      (status.acceptedLimitations !== undefined ||
        status.operatorAcceptance !== undefined)) ||
    JSON.stringify(requests).includes('"disposition":"accepted"')
      ? "accepted"
      : infrastructureBlocked ||
          JSON.stringify(requests).includes('"disposition":"deferred"')
        ? "unaccepted"
        : "not_applicable";
  const closeout: WorkflowCloseout = {
    taskOutcome: workflowOutcome,
    kbState,
    verificationState,
    proofState,
    limitationDisposition,
  };
  const evaluatorClaims = options.evaluatorManifest.expectedFinalState.flatMap(
    (assertion): readonly EvidenceClaim[] => {
      if (assertion.query.startsWith("state://")) {
        return [{ key: assertion.key, value: taskComplete }];
      }
      if (assertion.query === "workflow://outcome") {
        return [{ key: assertion.key, value: workflowOutcome }];
      }
      if (assertion.query === "workflow://closeout/kb-state") {
        return [{ key: assertion.key, value: kbState }];
      }
      if (assertion.query === "workflow://closeout/verification-state") {
        return [{ key: assertion.key, value: verificationState }];
      }
      if (assertion.query === "workflow://closeout/proof-state") {
        return [{ key: assertion.key, value: proofState }];
      }
      if (assertion.query === "workflow://closeout/limitation-disposition") {
        return [{ key: assertion.key, value: limitationDisposition }];
      }
      if (assertion.query.startsWith("workflow://signal/")) {
        const index = Number.parseInt(
          assertion.query.slice("workflow://signal/".length),
          10,
        );
        const signal = expectedWorkflow?.requiredSignals[index];
        return [
          {
            key: assertion.key,
            value:
              signal === undefined
                ? false
                : workflowSignalObserved(
                    signal,
                    requests,
                    brokerTools,
                    signalContext,
                  ),
          },
        ];
      }
      if (assertion.query.startsWith("workflow://forbidden/")) {
        const index = Number.parseInt(
          assertion.query.slice("workflow://forbidden/".length),
          10,
        );
        const action = expectedWorkflow?.forbiddenActions[index];
        return [
          {
            key: assertion.key,
            value:
              action === undefined
                ? false
                : !forbiddenActionObserved(
                    action,
                    requests,
                    brokerTools,
                    signalContext,
                  ),
          },
        ];
      }
      if (assertion.query.startsWith("workspace://assert/")) {
        const index = Number.parseInt(
          assertion.query.slice("workspace://assert/".length),
          10,
        );
        const workspaceAssertion = workspaceAssertions[index];
        return [
          {
            key: assertion.key,
            value:
              workspaceAssertion !== undefined &&
              workspaceAssertionPasses(
                workspaceAssertion,
                lanes.workspaceFiles,
              ),
          },
        ];
      }
      if (assertion.query === "workspace://isolation/sentinel-count") {
        return [{ key: assertion.key, value: 0 }];
      }
      return [];
    },
  );
  return {
    complete,
    integrityValid,
    closeout,
    claims: [
      ...receipt.requests.flatMap((request) =>
        scalarClaims(request.result, `final-state.${request.tool}`),
      ),
      ...evaluatorClaims,
    ],
    snapshot: finalState,
  };
}

function sealedBroker(brokerTrace: string) {
  const verification = verifyTraceChain(brokerTrace);
  const receipts = verification.valid ? parseTraceReceipts(brokerTrace) : [];
  const requestCalls = receipts
    .filter(
      (receipt) =>
        receipt.direction === "target_to_server" &&
        receipt.kind === "request" &&
        receipt.method === "tools/call" &&
        receipt.toolName !== undefined,
    )
    .map((receipt, index) => ({
      correlationId: receipt.correlationId,
      mcpTool: receipt.toolName ?? "",
      // Rubrics and usage receipts name catalog operations; kb_model and
      // kb_upsert dryRun calls are routed to them like the MCP server does.
      tool: routedOperationName(
        receipt.toolName ?? "",
        toolCallArguments(receipt.payload),
      ),
      predicate: `sequence=${index + 1}`,
    }));
  const successfulTools = requestCalls.flatMap((call) => {
    const completed = receipts.some((receipt) => {
      if (
        receipt.correlationId !== call.correlationId ||
        receipt.direction !== "server_to_target" ||
        receipt.kind !== "response" ||
        receipt.method !== "tools/call" ||
        receipt.toolName !== call.mcpTool ||
        !isRecord(receipt.payload) ||
        !Object.hasOwn(receipt.payload, "result")
      ) {
        return false;
      }
      const result = receipt.payload.result;
      return !isRecord(result) || result.isError !== true;
    });
    return completed ? [call.tool] : [];
  });
  const rawCalls = receipts
    .filter(
      (receipt) =>
        receipt.direction === "target_to_server" &&
        receipt.kind === "request" &&
        receipt.method === "tools/call" &&
        receipt.toolName !== undefined,
    )
    .map((receipt) => {
      const params =
        isRecord(receipt.payload) && isRecord(receipt.payload.params)
          ? receipt.payload.params
          : {};
      const response = receipts.find(
        (candidate) =>
          candidate.direction === "server_to_target" &&
          candidate.kind === "response" &&
          candidate.method === "tools/call" &&
          candidate.correlationId === receipt.correlationId &&
          isRecord(candidate.payload) &&
          Object.hasOwn(candidate.payload, "result"),
      );
      const result =
        response !== undefined && isRecord(response.payload)
          ? response.payload.result
          : undefined;
      const args =
        isRecord(params) && isRecord(params.arguments) ? params.arguments : {};
      return {
        tool: routedOperationName(receipt.toolName ?? "", args),
        args,
        resultOk: !isRecord(result) || result.isError !== true,
        ...(isRecord(result) ? { result } : {}),
      };
    });
  return {
    evidence: {
      // Completeness means the broker emitted a structurally verifiable trace.
      // Whether the model made required tool calls is behavioral protocol
      // evidence and is scored below; it is not an infrastructure property.
      complete: verification.entries > 0,
      integrityValid: verification.valid,
      claims: [],
      orderedCalls: requestCalls.map(({ tool, predicate }) => ({
        tool,
        predicate,
      })),
      rawCalls,
    },
    successfulTools,
  };
}

function sealedDiagnostic(
  diagnosticReceipt: string,
  successfulTools: readonly string[],
) {
  const lines = diagnosticReceipt
    .split("\n")
    .filter((line) => line.trim().length > 0);
  let integrityValid = true;
  const records: Record<string, unknown>[] = [];
  try {
    for (const line of lines) {
      const record: unknown = JSON.parse(line);
      if (!isRecord(record)) {
        integrityValid = false;
      } else {
        records.push(record);
      }
    }
  } catch {
    integrityValid = false;
  }
  const expectedTools = [...successfulTools].sort();
  const receiptTools = records
    .flatMap((record) =>
      typeof record.tool === "string" &&
      record.status === "success" &&
      Object.hasOwn(record, "telemetry") &&
      (record.telemetry === null || isRecord(record.telemetry))
        ? [record.tool]
        : [],
    )
    .sort();
  integrityValid &&=
    JSON.stringify(receiptTools) === JSON.stringify(expectedTools);
  return {
    // An empty receipt is the correct reconciliation for an empty multiset of
    // successful model-originated calls. Do not turn "model used no MCP tool"
    // into an infrastructure failure before the protocol rubric can score it.
    complete: lines.length > 0 || successfulTools.length === 0,
    integrityValid,
    claims: [] as readonly EvidenceClaim[],
  };
}

// implements REQ-skillopt-codex-optimization
export function sealDefaultCellEvidence(
  options: Pick<CodexCellOptions, "evaluatorManifest" | "finalStateRequests">,
  evidence: Readonly<{
    finalState: string;
    brokerTrace: string;
    diagnosticReceipt: string;
    transcript?: string;
    workspaceFiles?: Readonly<Record<string, string>>;
  }>,
) {
  const broker = sealedBroker(evidence.brokerTrace);
  const brokerTools = broker.evidence.orderedCalls.map((call) => call.tool);
  return {
    finalState: sealedFinalState(
      evidence.finalState,
      options,
      brokerTools,
      evidenceLanes(evidence.transcript, evidence.workspaceFiles),
    ),
    broker: broker.evidence,
    diagnostic: sealedDiagnostic(
      evidence.diagnosticReceipt,
      broker.successfulTools,
    ),
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  };
}

// implements REQ-skillopt-codex-optimization
export function defaultCodexCellDependencies(
  options: CodexCellOptions,
): CodexCellDependencies {
  const groupMode =
    options.env.KIBI_SKILLOPT_PROCESS_GROUP === "python_bridge"
      ? "inherited"
      : "owned";
  const run: CanaryRunner = (argv, cwd, env, timeoutMs, stdin) =>
    runBoundedProcess({ argv, cwd, env, timeoutMs, stdin, groupMode });
  return {
    prepareLogin: ({ privateCodexHome, sandboxHome, env }) =>
      prepareExistingLogin({
        privateCodexHome,
        sandboxHome,
        env,
        run: (argv, childEnv) =>
          runBoundedProcess({
            argv,
            cwd: options.sourceWorktree,
            env: childEnv,
            timeoutMs: 15_000,
            groupMode,
          }),
      }),
    stageBroker: stageKibiMcpBroker,
    probeMcp: probeRequiredMcp,
    run,
    finalState: async (context) => {
      const receipt = await runIndependentFinalState({
        launch: {
          ...context.broker.downstream,
          args: [...context.broker.downstream.args],
          env: {
            ...stringEnvironment(context.env),
            // Keep independent verifier calls out of the model's diagnostic
            // usage receipt.  The two lanes share a fixture workspace, but
            // their evidence must remain independently attributable.
            KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH: join(
              context.workspace.privateEvidence,
              "final-state-usage.log",
            ),
          },
        },
        receiptPath: context.receiptPath,
        requests: context.requests,
        binding: {
          caseId: options.evaluatorManifest.taskId,
          roots: {
            publicManifestHash: options.evaluatorManifest.publicManifestHash,
            workspaceHash: options.evaluatorManifest.workspaceHash,
            fixtureSeedHash: options.evaluatorManifest.fixtureSeedHash,
          },
          sequence: 1,
        },
        timeoutMs: context.timeoutMs,
      });
      return `${JSON.stringify(receipt)}\n`;
    },
    diagnosticReceipt: (workspace) =>
      readOptionalArtifact(join(workspace.target, ".kb/usage.log")),
    evaluateSealedEvidence: async ({
      finalState,
      brokerTrace,
      diagnosticReceipt,
      transcript,
      workspaceFiles,
    }) =>
      sealDefaultCellEvidence(options, {
        finalState,
        brokerTrace,
        diagnosticReceipt,
        ...(transcript === undefined ? {} : { transcript }),
        ...(workspaceFiles === undefined ? {} : { workspaceFiles }),
      }),
    clock: () => new Date(),
  };
}
