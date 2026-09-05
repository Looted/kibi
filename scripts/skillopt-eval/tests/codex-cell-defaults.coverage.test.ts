// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import {
  defaultCodexCellDependencies,
  sealDefaultCellEvidence,
} from "../runtime/codex-cell-defaults";
import { appendTraceReceipt } from "../runtime/jsonrpc";
import {
  evaluatorManifest,
  evaluatorRoots,
} from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function resultHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function options(env: NodeJS.ProcessEnv = process.env) {
  return {
    request: {
      schemaVersion: "1.0.0" as const,
      artifactType: "episode-request" as const,
      episodeId: "00000000-0000-4000-8000-000000000011",
      runId: "00000000-0000-4000-8000-000000000012",
      runLockHash: "d".repeat(64),
      variant: "baseline" as const,
      skill: "kibi-usage" as const,
      taskId: "fake-task",
      attempt: 1,
      prompt: "Run the fixture task.",
      workspaceFixtureHash: "b".repeat(64),
    },
    fixtureRoot: "/tmp/fixture",
    sourceWorktree: process.cwd(),
    artifactRoot: "/tmp/artifacts",
    targetSkill: "kibi-usage" as const,
    codexExecutable: "/tmp/fake-codex",
    bwrapExecutable: "/tmp/fake-bwrap",
    env,
    finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
    evaluatorManifest: evaluatorManifest("predicate"),
    hiddenMarkers: [],
    pricingHash: "0".repeat(64),
    priceAmount: 0,
    timeoutMs: 1_000,
  };
}

const WORKFLOW_SIGNALS = [
  "discovery search executed",
  "source-linked query executed",
  "typed relationship applied",
  "symbol readback after write",
  "final check executed",
  "typed envelope inspected",
  "repair executed after diagnostics",
  "stale reasons identified",
  "recovery boundary reported",
  "status consulted before decision",
  "dirty worktree evidence preserved",
  "source-linked impact inspected",
  "behavioral symbol granularity used",
  "relationship chain traversed",
  "graph traversal executed",
  "executable test identity established",
  "coverage link applied",
  "read-only plan produced",
  "planner context gate honored",
  "approval boundary respected",
  "no premature writes",
  "approved plan applied exactly once",
  "post-apply validation executed",
  "no manual action replay",
  "partial setup identified",
  "operator escalation emitted",
  "bootstrap attached exactly",
  "discovery executed after attach",
  "typed mutation applied",
  "sanctioned delete applied",
  "shard records preserved",
  "pending receipts inspected",
  "conflict refusal explicit",
  "strict claim modeled",
  "predicate fact stored",
  "test chain validated",
  "exact Git branch equals KB branch",
  "migration preview",
  "recovery preview",
  "original backup preserved",
  "cross-branch migration refused",
  "missing branch-store status",
  "final snapshot before verification",
  "explicit apply boundary",
  "stale symbol IDs",
  "dirty editor path reported",
  "passing E2E evidence",
  "proof gaps remain explicit",
  "receipt reuse conditions unchanged",
  "historical contract receipt preserved",
  "current contract receipt appended",
  "contract mismatch remains non-proof",
  "diagnostic IDs with dispositions",
  "replacement evidence",
  "coverage transfer evidence",
  "canonical relationship shard",
  "unrelated records",
  "release defect",
  "new package version required",
  "target path absent",
  "journals preserved",
  "syncState stale",
  "matching CLI/core schema",
  "v2 receipt retained",
  "exact edge absent after sync",
  "endpoints preserved",
  "passing v2 receipt",
  "migration plan v2",
  "approved plan hash",
  "automatic action IDs",
  "stale plan hash rejected",
  "fresh migration preview",
  "destructive action refused",
  "migration plan without Prolog",
  "recovery backup required",
  "complete extraction evidence",
  "authored ownership safety",
  "current contract required",
  "operator package action",
  "structured five-axis closeout",
  "ontology gap remains unresolved",
  "proof-aware depth warning not emitted",
  "receipt gap IDs and affected tests",
  "evidence-backed repair candidates",
  "an unknown custom signal token",
] as const;

const FORBIDDEN_ACTIONS = [
  "mutation during discovery",
  "delete during safe mutation",
  "delete during repair",
  "delete during chain inspection",
  "delete during typed mutation",
  "apply plan without approval",
  "manual plan replay via upsert",
  "bootstrap direct upsert",
  "unauthorized repair execution",
  "cross-branch store copy",
  "discard dirty state",
  "mutation without advisor",
  "copy branch store across refs",
  "rename Git branch",
  "claim complete with stale KB",
  "claim KB clean/fresh with stale status",
  "claim proof proven",
  "treat stale coverage-depth heuristic as proof failure",
  "accept stale coverage-depth heuristic as a real gap",
  "recommend v1 receipt",
  "silently ignore editor config",
  "rerun unchanged E2E",
  "reuse pre-integration receipt",
  "rewrite receipt history",
  "delete historical receipt",
  "claim old contract proof",
  "blanket acceptance",
  "fabricate replacement coordinates",
  "accept project override as permanent",
  "apply stale migration plan",
  "partial plan application",
  "apply review action",
  "start Prolog for status",
  "delete authored symbol",
  "choose package manager",
  "direct .kb edit",
  "unreviewed migration",
  "downgrade receipt",
  "hand-edit receipt",
  "invent ontology grounding",
  "fabricate coordinates",
  "auto-remap without evidence",
  "an unknown forbidden action",
] as const;

function workflowAssertions() {
  return [
    ["workflow-outcome", "workflow://outcome", "blocked"],
    ["workflow-kb-state", "workflow://closeout/kb-state", "stale"],
    [
      "workflow-verification-state",
      "workflow://closeout/verification-state",
      "dirty",
    ],
    ["workflow-proof-state", "workflow://closeout/proof-state", "proven"],
    [
      "workflow-limitation-disposition",
      "workflow://closeout/limitation-disposition",
      "accepted",
    ],
    ...WORKFLOW_SIGNALS.map((signal, index) => [
      `workflow-signal-${index}`,
      `workflow://signal/${index}`,
      true,
    ]),
    ["workflow-signal-missing", "workflow://signal/999", false],
    ...FORBIDDEN_ACTIONS.map((action, index) => [
      `workflow-forbidden-${index}`,
      `workflow://forbidden/${index}`,
      true,
    ]),
    ["workflow-forbidden-missing", "workflow://forbidden/999", false],
    ["workspace-isolated", "workspace://isolation/sentinel-count", 0],
    ["ignored-query", "other://unused", true],
  ].map(([key, query, expected]) => ({
    key,
    query,
    expected,
    critical: false,
  }));
}

function signalManifest() {
  const base = evaluatorManifest("predicate");
  const assertions = workflowAssertions();
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      ...base,
      expectedFinalState: [...base.expectedFinalState, ...assertions],
      workflowExpectation: {
        expectedOutcome: "interim",
        expectedKbState: "stale",
        expectedVerificationState: "dirty",
        expectedProofState: "proven",
        expectedLimitationDisposition: "accepted",
        requiredSignals: [...WORKFLOW_SIGNALS],
        forbiddenActions: [...FORBIDDEN_ACTIONS],
        closeout: {
          taskOutcome: "interim",
          kbState: "stale",
          verificationState: "dirty",
          proofState: "proven",
          limitationDisposition: "accepted",
        },
      },
    }),
  );
}

function richStatusPayload(overrides: Record<string, unknown> = {}) {
  return {
    kibiProtocol: 1,
    status: "success",
    data: {
      syncState: "stale",
      dirty: true,
      staleReasons: [{ entityIds: ["SYM-1"] }, "stale"],
      proofSnapshotAvailable: true,
      proofSnapshotDirty: true,
      proofSnapshotChanges: [
        { path: "src/editor.ts", snapshotRelevant: true },
      ],
      acceptedLimitations: ["operator"],
      operatorAcceptance: true,
      branchAttachment: {
        gitBranch: "main",
        kbBranch: "main",
        kind: "exact",
        migrationRequired: false,
      },
      ...overrides,
    },
  };
}

function richQueryPayload() {
  return {
    kibiProtocol: 1,
    status: "success",
    data: {
      entities: [
        {
          id: "SYM-1",
          type: "symbol",
          implements: "REQ-1",
          covered_by: "TEST-1",
          executable_for: "TEST-1",
          verified_by: "TEST-1",
          validates: "REQ-1",
          fact_kind: "predicate",
          predicate_name: "held_out",
          claim_key: "CLAIM-1",
          verification_scope: "end_to_end",
        },
      ],
    },
  };
}

function richCoverage(kind: "summary-proven" | "rows-proven" | "rows-mixed" | "rows-empty" | "incomplete") {
  if (kind === "incomplete") {
    return { repairPlan: { scope: { complete: false } } };
  }
  if (kind === "rows-empty") {
    return { scope: { complete: true }, rows: [] };
  }
  if (kind === "rows-proven") {
    return {
      scope: { complete: true },
      rows: [{ proofStatus: "proven" }, { proofStatus: "proven" }],
    };
  }
  if (kind === "rows-mixed") {
    return {
      scope: { complete: true },
      rows: [{ proofStatus: "proven" }, { proofStatus: "unresolved" }],
    };
  }
  return {
    repairPlan: { scope: { complete: true } },
    summary: { proofProven: 2, proofMissing: 0 },
    rows: [{ proofStatus: "proven", proofStages: { passingE2e: true } }],
  };
}

function finalStateFor(
  status: unknown,
  coverage: unknown,
  extraText: Record<string, unknown> = {},
): string {
  const query = richQueryPayload();
  const check = {
    structuredContent: { kibiProtocol: 1, data: { count: 1, violations: [{}] } },
  };
  const coverageWrapped = { structuredContent: { ...coverage, notes: extraText } };
  const requests = [
    ["kb_query", {}, query],
    ["kb_check", {}, check],
    ["kb_status", {}, { structuredContent: status }],
    ["kb_coverage", { by: "req" }, coverageWrapped],
  ].map(([tool, args, result]) => ({
    tool,
    args,
    result,
    resultHash: resultHash(result),
  }));
  return `${JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    binding: {
      caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
      roots: evaluatorRoots,
      sequence: 1,
    },
    requests,
  })}\n`;
}

const SIGNAL_TEXT = {
  implements: true,
  covered_by: true,
  executable_for: true,
  kibiprotocol: true,
  sync: true,
  migrate: true,
  recover: true,
  operator: true,
  relationships_deleted: true,
  preserv: true,
  conflict: true,
  claim_key: true,
  predicate_name: true,
  verified_by: true,
  validates: true,
  migration: true,
  preview: true,
  recovery: true,
  backup: true,
  "branch migrate": true,
  refus: true,
  branch_store_missing: true,
  snapshot: true,
  verification: true,
  "--apply": true,
  "apply boundary": true,
  passinge2e: true,
  '"outcome":"passed"': true,
  proofgap: true,
  unresolved: true,
  contract: true,
  fresh: true,
  proof_receipts: true,
  contract_hash: true,
  "proof-receipt.v1": true,
  currentcontracthash: true,
  proof_contract_mismatch: true,
  qualitydiagnostics: true,
  disposition: true,
  replacement: true,
  remap: true,
  coverage: true,
  relationship: true,
  shard: true,
  unrelated: true,
  "release defect": true,
  "export surface": true,
  "new package": true,
  "newly versioned": true,
  target: true,
  absent: true,
  journal: true,
  "kibi-cli": true,
  "kibi-core": true,
  "verification-receipt.v2": true,
  passed: true,
  "kibi.migration-plan.v2": true,
  planhash: true,
  approvedplanhash: true,
  approvedactionids: true,
  "automatic action": true,
  "plan changed": true,
  hash: true,
  "not automatic": true,
  action: true,
  "without prolog": true,
  required: true,
  "complete extraction": true,
  authored: true,
  ownership: true,
  "current contract": true,
  package: true,
  taskoutcome: true,
  kbstate: true,
  verificationstate: true,
  proofstate: true,
  limitationdisposition: true,
  ontology_gap: true,
  coverage_receipt_gaps: true,
  test: true,
  staleReasons: true,
  "repair candidates": true,
  "an unknown custom signal token": true,
  copy: true,
  "branch store": true,
  "compiled store": true,
  "git branch -m": true,
  "rename git branch": true,
  '"kbstate":"clean_fresh"': true,
  '"proofstate":"proven"': true,
  '"proofproven":0': true,
  coverage_depth_review: true,
  "recommend v1": true,
  "use a v1 receipt": true,
  rerun: true,
  "re-run": true,
  "pre-integration receipt proves": true,
  "replace receipt history": true,
  "delete historical receipt": true,
  "old contract proves": true,
  "all diagnostics accepted": true,
  fabricated: true,
  "permanent override": true,
  apply: true,
  stale: true,
  plan: true,
  partial: true,
  appl: true,
  "review action": true,
  '"safety":"review"': true,
  "start prolog": true,
  status: true,
  "delete authored": true,
  "choose a package manager": true,
  "run pnpm": true,
  directkbedit: true,
};

const BROKER_TOOLS = [
  "kb_search",
  "kb_query",
  "kb_query",
  "kb_check",
  "kb_upsert",
  "kb_status",
  "kb_graph",
  "kb_plan_bootstrap",
  "kb_apply_plan",
  "kb_delete",
  "kb_suggest_predicates",
  "kb_semantic_advisor",
] as const;

async function multiToolBrokerTrace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-cell-signals-"));
  roots.push(root);
  const path = join(root, "broker-trace.jsonl");
  await appendTraceReceipt(path, {
    correlationId: "init",
    direction: "target_to_server",
    kind: "request",
    method: "initialize",
    payload: {},
  });
  for (const [index, tool] of BROKER_TOOLS.entries()) {
    const correlationId = `rpc-${index}`;
    await appendTraceReceipt(path, {
      correlationId,
      direction: "target_to_server",
      kind: "request",
      method: "tools/call",
      toolName: tool,
      payload: { params: { arguments: { tool } } },
    });
    await appendTraceReceipt(path, {
      correlationId,
      direction: "server_to_target",
      kind: "response",
      method: "tools/call",
      toolName: tool,
      payload: { result: { ok: true } },
    });
  }
  return readFile(path, "utf8");
}

describe("defaultCodexCellDependencies", () => {
  test("builds owned and inherited runners and evaluates sealed evidence", async () => {
    const owned = defaultCodexCellDependencies(options());
    expect(owned.clock()).toBeInstanceOf(Date);
    const result = await owned.run(
      ["bash", "-c", "printf hi"],
      process.cwd(),
      process.env,
      2_000,
    );
    expect(result.stdout).toContain("hi");

    const inherited = defaultCodexCellDependencies(
      options({ ...process.env, KIBI_SKILLOPT_PROCESS_GROUP: "python_bridge" }),
    );
    const echo = await inherited.run(
      ["bash", "-c", "printf ok"],
      process.cwd(),
      process.env,
      2_000,
    );
    expect(echo.stdout).toContain("ok");

    const root = await mkdtemp(join(tmpdir(), "skillopt-cell-dep-"));
    roots.push(root);
    const workspace = {
      target: root,
      privateEvidence: join(root, "evidence"),
      cleanup: async () => undefined,
    };
    await writeFile(join(root, "usage.log"), "");
    const receipt = await owned.diagnosticReceipt(workspace as never);
    expect(receipt === undefined || typeof receipt === "string").toBe(true);

    const sealed = await owned.evaluateSealedEvidence({
      finalState: JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: "/tmp",
        requests: [],
      }),
      brokerTrace: "",
      diagnosticReceipt: "",
    });
    expect(sealed.codex.complete).toBe(true);

    await expect(
      owned.prepareLogin({
        privateCodexHome: join(root, "codex-home"),
        sandboxHome: join(root, "sandbox"),
        env: { PATH: "/missing-bin" },
      } as never),
    ).rejects.toThrow();

    await expect(
      owned.finalState({
        broker: {
          downstream: {
            command: "/bin/false",
            args: [],
            cwd: root,
          },
        },
        env: { PATH: process.env.PATH, UNUSED: undefined },
        workspace: { privateEvidence: join(root, "evidence") },
        receiptPath: join(root, "final-state.json"),
        requests: [{ tool: "kb_status", args: {} }],
        timeoutMs: 50,
      } as never),
    ).rejects.toThrow();
  });
});

describe("sealDefaultCellEvidence signal and forbidden branches", () => {
  test("walks every workflow signal and forbidden action plus proof/diagnostic edges", async () => {
    const manifest = signalManifest();
    const requests = [
      { tool: "kb_query" as const, args: {} },
      { tool: "kb_check" as const, args: {} },
      { tool: "kb_status" as const, args: {} },
      { tool: "kb_coverage" as const, args: { by: "req" } },
    ];
    const brokerTrace = await multiToolBrokerTrace();
    const rich = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(richStatusPayload(), richCoverage("summary-proven"), SIGNAL_TEXT),
        brokerTrace,
        diagnosticReceipt:
          'not-json\n[]\n{"tool":"kb_query","status":"success","telemetry":null}\n',
      },
    );
    expect(rich.finalState.closeout.kbState).toBe("stale");
    expect(rich.finalState.closeout.verificationState).toBe("dirty");
    expect(rich.finalState.closeout.proofState).toBe("proven");
    expect(rich.finalState.closeout.limitationDisposition).toBe("accepted");
    expect(rich.diagnostic.integrityValid).toBe(false);

    const deferred = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(
          {
            syncState: "fresh",
            dirty: false,
            proofSnapshotAvailable: false,
          },
          richCoverage("rows-mixed"),
          { disposition: "deferred" },
        ),
        brokerTrace: "",
        diagnosticReceipt: '{"oops":',
      },
    );
    expect(deferred.finalState.closeout.kbState).toBe("clean_fresh");
    expect(deferred.finalState.closeout.verificationState).toBe("unavailable");
    expect(deferred.finalState.closeout.proofState).toBe("mixed");
    expect(deferred.finalState.closeout.limitationDisposition).toBe(
      "unaccepted",
    );
    expect(deferred.diagnostic.integrityValid).toBe(false);

    const dirtyKb = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(
          {
            syncState: "unknown",
            dirty: true,
            proofSnapshotDirty: false,
            branchAttachment: { migrationRequired: true },
          },
          richCoverage("rows-proven"),
        ),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(dirtyKb.finalState.closeout.kbState).toBe("legacy_compat");
    expect(dirtyKb.finalState.closeout.verificationState).toBe("fresh");
    expect(dirtyKb.finalState.closeout.proofState).toBe("proven");

    const unresolved = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(
          { dirty: false },
          richCoverage("rows-empty"),
        ),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(unresolved.finalState.closeout.kbState).toBe("not_evaluated");
    expect(unresolved.finalState.closeout.verificationState).toBe(
      "not_evaluated",
    );
    expect(unresolved.finalState.closeout.proofState).toBe("unresolved");

    const incomplete = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor({}, richCoverage("incomplete")),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(incomplete.finalState.closeout.proofState).toBe("not_evaluated");

    const mixedSummary = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(
          {},
          {
            scope: { complete: true },
            summary: { proofProven: 1, proofMissing: 2 },
          },
        ),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(mixedSummary.finalState.closeout.proofState).toBe("mixed");

    const noneProven = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(
          {},
          {
            scope: { complete: true },
            summary: { proofProven: 0, proofMissing: 2 },
          },
        ),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(noneProven.finalState.closeout.proofState).toBe("unresolved");

    const rawStatus = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateFor(
          { syncState: "fresh", dirty: true },
          null,
        ),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(rawStatus.finalState.closeout.kbState).toBe("dirty");

    const scalarClaims = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: `${JSON.stringify({
          schemaVersion: "1.0.0",
          workspaceRoot: "/tmp",
          requests: [
            {
              tool: "kb_status",
              args: {},
              result: {
                flag: true,
                count: 1,
                empty: null,
                nested: { list: ["a", { deep: false }], skip: undefined },
                weird: Symbol.for("x"),
              },
              resultHash: resultHash({
                flag: true,
                count: 1,
                empty: null,
                nested: { list: ["a", { deep: false }], skip: undefined },
                weird: Symbol.for("x"),
              }),
            },
          ],
        })}\n`,
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(
      scalarClaims.finalState.claims.some((claim) =>
        String(claim.key).startsWith("final-state.kb_status"),
      ),
    ).toBe(true);
  });
});
