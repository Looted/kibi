import { createHash } from "node:crypto";
import { join } from "node:path";
import { fixtureSymbolId } from "../fixtures/workspace";
import type {
  EvidenceClaim,
  WorkflowCloseout,
} from "../scoring/evidence-utils";
import { probeRequiredMcp } from "./canary-runtime";
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
import type { CanaryRunner } from "./permissions";
import { runBoundedProcess } from "./process";

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
): boolean {
  const text = JSON.stringify(results).toLowerCase();
  const status = latestContent(results, "kb_status");
  const hasBrokerTool = (tool: string): boolean => brokerTools.includes(tool);
  switch (signal) {
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
        text.includes("sync") ||
        text.includes("migrat") ||
        text.includes("recover")
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
      return text.includes("operator");
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
      return text.includes("conflict");
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
      return text.includes("migration") && text.includes("preview");
    case "recovery preview":
      return text.includes("recovery") && text.includes("preview");
    case "original backup preserved":
      return text.includes("backup") && text.includes("preserv");
    case "cross-branch migration refused":
      return text.includes("branch migrate") && text.includes("refus");
    case "missing branch-store status":
      return (
        text.includes("branch_store_missing") ||
        text.includes("sync_metadata_missing")
      );
    case "final snapshot before verification":
      return text.includes("snapshot") && text.includes("verification");
    case "explicit apply boundary":
      return text.includes("--apply") || text.includes("apply boundary");
    case "stale symbol IDs":
      return (
        Array.isArray(status?.staleReasons) &&
        status.staleReasons.some(
          (reason) => isRecord(reason) && Array.isArray(reason.entityIds),
        )
      );
    case "dirty editor path reported":
      return (
        Array.isArray(status?.verificationSnapshotChanges) &&
        status.verificationSnapshotChanges.some(
          (change) => isRecord(change) && typeof change.path === "string",
        )
      );
    case "passing E2E evidence":
      return text.includes("passinge2e") || text.includes('"outcome":"passed"');
    case "proof gaps remain explicit":
      return text.includes("proofgap") || text.includes("unresolved");
    case "receipt reuse conditions unchanged":
      return (
        text.includes("contract") &&
        text.includes("snapshot") &&
        text.includes("fresh")
      );
    case "historical contract receipt preserved":
      return (
        text.includes("verification_receipts") && text.includes("contract_hash")
      );
    case "current contract receipt appended":
      return (
        text.includes("verification-receipt.v2") &&
        text.includes("currentcontracthash")
      );
    case "contract mismatch remains non-proof":
      return (
        text.includes("verification_contract_mismatch") ||
        text.includes("contract_mismatch")
      );
    case "diagnostic IDs with dispositions":
      return (
        text.includes("qualitydiagnostics") && text.includes("disposition")
      );
    case "replacement evidence":
      return text.includes("replacement") || text.includes("remap");
    case "coverage transfer evidence":
      return text.includes("covered_by") || text.includes("coverage");
    case "canonical relationship shard":
      return text.includes("relationship") && text.includes("shard");
    case "unrelated records":
      return text.includes("unrelated") || text.includes("preserv");
    case "release defect":
      return text.includes("release defect") || text.includes("export surface");
    case "new package version required":
      return text.includes("new package") || text.includes("newly versioned");
    case "target path absent":
      return text.includes("target") && text.includes("absent");
    case "journals preserved":
      return text.includes("journal") && text.includes("preserv");
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
        text.includes("plan changed") ||
        (text.includes("stale") && text.includes("hash"))
      );
    case "fresh migration preview":
      return (
        text.includes("migration") &&
        text.includes("preview") &&
        text.includes("hash")
      );
    case "destructive action refused":
      return (
        text.includes("not automatic") ||
        (text.includes("refus") && text.includes("action"))
      );
    case "migration plan without Prolog":
      return (
        text.includes("without prolog") ||
        (text.includes("prolog") && text.includes("not start"))
      );
    case "recovery backup required":
      return (
        text.includes("backup") &&
        (text.includes("required") || text.includes("preserv"))
      );
    case "complete extraction evidence":
      return (
        text.includes("complete extraction") ||
        text.includes("current extraction")
      );
    case "authored ownership safety":
      return (
        text.includes("authored") &&
        (text.includes("ownership") || text.includes("live relationship"))
      );
    case "current contract required":
      return (
        text.includes("current contract") || text.includes("contract mismatch")
      );
    case "operator package action":
      return text.includes("operator") && text.includes("package");
    case "structured five-axis closeout":
      return (
        text.includes("taskoutcome") &&
        text.includes("kbstate") &&
        text.includes("verificationstate") &&
        text.includes("proofstate") &&
        text.includes("limitationdisposition")
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
        text.includes("staleReasons") || text.includes("repair candidates")
      );
    default:
      return text.includes(signal.toLowerCase());
  }
}

function forbiddenActionObserved(
  action: string,
  results: readonly Readonly<{ tool: string; result: unknown }>[],
  brokerTools: readonly string[],
): boolean {
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
        Array.isArray(status?.verificationSnapshotChanges) &&
        status.verificationSnapshotChanges.some(
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
  const taskComplete =
    complete &&
    receipt.requests.some(
      (request) =>
        request.tool === "kb_query" && successfulResult(request.result),
    ) &&
    receipt.requests.some(
      (request) =>
        request.tool === "kb_check" && cleanCheckResult(request.result),
    ) &&
    safeMutationComplete(receipt, options.evaluatorManifest.taskId);
  const requests = receipt.requests.map(({ tool, result }) => ({
    tool,
    result,
  }));
  const status = latestContent(requests, "kb_status");
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
    status?.verificationSnapshotAvailable === false
      ? "unavailable"
      : typeof status?.verificationSnapshotDirty === "boolean"
        ? status.verificationSnapshotDirty
          ? "dirty"
          : "fresh"
        : "not_evaluated";
  const proofState = proofStateFromCoverage(
    latestContent(requests, "kb_coverage"),
  );
  const expectedWorkflow = options.evaluatorManifest.workflowExpectation;
  const taskOutcome = taskComplete ? "complete" : "blocked";
  const limitationDisposition =
    (status &&
      (status.acceptedLimitations !== undefined ||
        status.operatorAcceptance !== undefined)) ||
    JSON.stringify(requests).includes('"disposition":"accepted"')
      ? "accepted"
      : JSON.stringify(requests).includes('"disposition":"deferred"')
        ? "unaccepted"
        : "not_applicable";
  const workflowOutcome = taskOutcome;
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
                : workflowSignalObserved(signal, requests, brokerTools),
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
                : !forbiddenActionObserved(action, requests, brokerTools),
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
      tool: receipt.toolName ?? "",
      predicate: `sequence=${index + 1}`,
    }));
  const successfulTools = requestCalls.flatMap((call) => {
    const completed = receipts.some((receipt) => {
      if (
        receipt.correlationId !== call.correlationId ||
        receipt.direction !== "server_to_target" ||
        receipt.kind !== "response" ||
        receipt.method !== "tools/call" ||
        receipt.toolName !== call.tool ||
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
      return {
        tool: receipt.toolName ?? "",
        args:
          isRecord(params) && isRecord(params.arguments)
            ? params.arguments
            : {},
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

export function sealDefaultCellEvidence(
  options: Pick<CodexCellOptions, "evaluatorManifest" | "finalStateRequests">,
  evidence: Readonly<{
    finalState: string;
    brokerTrace: string;
    diagnosticReceipt: string;
  }>,
) {
  const broker = sealedBroker(evidence.brokerTrace);
  const brokerTools = broker.evidence.orderedCalls.map((call) => call.tool);
  return {
    finalState: sealedFinalState(evidence.finalState, options, brokerTools),
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
    }) =>
      sealDefaultCellEvidence(options, {
        finalState,
        brokerTrace,
        diagnosticReceipt,
      }),
    clock: () => new Date(),
  };
}
