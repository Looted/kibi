// implements REQ-skillopt-logical-evidence-fidelity
//
// Behavior-focused coverage for the per-cell resolvers in
// runtime/codex-cell-defaults.ts: workflow-signal detection, forbidden-action
// detection, diagnostic reconciliation, and the login-preparation runner.
// Each probe seals crafted final-state/broker evidence and asserts the
// resolved claim value (or closeout state), not mere line execution.
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import {
  defaultCodexCellDependencies,
  sealDefaultCellEvidence,
} from "../runtime/codex-cell-defaults";
import { appendTraceReceipt } from "../runtime/jsonrpc";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function resultHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

interface Expectation {
  readonly name: string;
  readonly claim: boolean;
}

interface EvidenceScenario {
  readonly signals?: readonly Expectation[];
  readonly forbidden?: readonly Expectation[];
  readonly statusData?: Record<string, unknown>;
  readonly markers?: readonly string[];
  readonly claimEcho?: Record<string, unknown>;
  readonly brokerTools?: readonly string[];
}

type EvidenceInput = Omit<EvidenceScenario, "signals" | "forbidden">;

function scenarioManifest(
  signals: readonly Expectation[],
  forbidden: readonly Expectation[],
): ReturnType<typeof parsePrivateEvaluatorManifest> {
  const base = evaluatorManifest("predicate");
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      ...base,
      expectedFinalState: [
        ...base.expectedFinalState,
        ...signals.map(({ claim }, index) => ({
          key: `signal-${index}`,
          query: `workflow://signal/${index}`,
          expected: claim,
          critical: false,
        })),
        ...forbidden.map(({ claim }, index) => ({
          key: `forbidden-${index}`,
          query: `workflow://forbidden/${index}`,
          expected: claim,
          critical: false,
        })),
      ],
      workflowExpectation: {
        expectedOutcome: "blocked",
        expectedKbState: "not_evaluated",
        expectedVerificationState: "not_evaluated",
        expectedProofState: "not_evaluated",
        expectedLimitationDisposition: "not_applicable",
        requiredSignals: signals.map(({ name }) => name),
        forbiddenActions: forbidden.map(({ name }) => name),
        closeout: {
          taskOutcome: "blocked",
          kbState: "not_evaluated",
          verificationState: "not_evaluated",
          proofState: "not_evaluated",
          limitationDisposition: "not_applicable",
        },
      },
    }),
  );
}

const brokerTraces = new Map<string, Promise<string>>();
function brokerTrace(tools: readonly string[]): Promise<string> {
  const key = tools.join(",");
  const cached = brokerTraces.get(key);
  if (cached !== undefined) return cached;
  const trace = (async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-resolvers-"));
    roots.push(root);
    const path = join(root, "broker-trace.jsonl");
    await appendTraceReceipt(path, {
      correlationId: "init",
      direction: "target_to_server",
      kind: "request",
      method: "initialize",
      payload: {},
    });
    for (const [index, tool] of tools.entries()) {
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
  })();
  brokerTraces.set(key, trace);
  return trace;
}

function receiptFor(
  requests: readonly {
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
  }[],
): string {
  return `${JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/scenario",
    requests: requests.map(({ tool, args, result }) => ({
      tool,
      args,
      result,
      resultHash: resultHash(result),
    })),
  })}\n`;
}

async function sealScenario(scenario: EvidenceScenario) {
  const signals = scenario.signals ?? [];
  const forbidden = scenario.forbidden ?? [];
  const data: Record<string, unknown> = { ...(scenario.statusData ?? {}) };
  if (scenario.markers !== undefined)
    data.evidenceNotes = [...scenario.markers];
  if (scenario.claimEcho !== undefined) data.claimEcho = scenario.claimEcho;
  const result = {
    structuredContent: { kibiProtocol: 1, status: "success", data },
  };
  const finalState = receiptFor([{ tool: "kb_status", args: {}, result }]);
  return sealDefaultCellEvidence(
    {
      evaluatorManifest: scenarioManifest(signals, forbidden),
      finalStateRequests: [{ tool: "kb_status", args: {} }],
    },
    {
      finalState,
      brokerTrace:
        scenario.brokerTools === undefined
          ? ""
          : await brokerTrace(scenario.brokerTools),
      diagnosticReceipt: "",
    },
  );
}

async function claimsOf(
  scenario: EvidenceScenario,
): Promise<Map<string, unknown>> {
  const sealed = await sealScenario(scenario);
  return new Map(
    sealed.finalState.claims.map((claim) => [claim.key, claim.value]),
  );
}

async function expectSignal(
  signal: string,
  input: EvidenceInput,
  expectedClaim: boolean,
): Promise<void> {
  const claims = await claimsOf({
    ...input,
    signals: [{ name: signal, claim: expectedClaim }],
  });
  expect(claims.get("signal-0")).toBe(expectedClaim);
}

/** observed = whether the forbidden action is detected in the evidence. */
async function expectForbidden(
  action: string,
  input: EvidenceInput,
  observed: boolean,
): Promise<void> {
  const claims = await claimsOf({
    ...input,
    forbidden: [{ name: action, claim: !observed }],
  });
  expect(claims.get("forbidden-0")).toBe(!observed);
}

describe("workflow signal resolvers over evidence text", () => {
  test("recovery boundary accepts migration or recovery wording without sync", async () => {
    await expectSignal(
      "recovery boundary reported",
      { markers: ["migration boundary documented"] },
      true,
    );
    await expectSignal(
      "recovery boundary reported",
      { markers: ["recovery path identified"] },
      true,
    );
    await expectSignal(
      "recovery boundary reported",
      { markers: ["nothing relevant observed"] },
      false,
    );
  });

  test("missing branch-store status accepts either missing-store token", async () => {
    await expectSignal(
      "missing branch-store status",
      { markers: ["branch_store_missing reported"] },
      true,
    );
    await expectSignal(
      "missing branch-store status",
      { markers: ["sync_metadata_missing reported"] },
      true,
    );
    await expectSignal(
      "missing branch-store status",
      { markers: ["store present"] },
      false,
    );
  });

  test("receipt reuse conditions require contract, snapshot, and freshness", async () => {
    await expectSignal(
      "receipt reuse conditions unchanged",
      { markers: ["contract pinned", "snapshot pinned", "fresh window"] },
      true,
    );
    await expectSignal(
      "receipt reuse conditions unchanged",
      { markers: ["contract pinned", "snapshot pinned"] },
      false,
    );
    await expectSignal(
      "receipt reuse conditions unchanged",
      { markers: ["contract pinned"] },
      false,
    );
  });

  test("current contract receipt needs the v1 receipt plus current hash echo", async () => {
    await expectSignal(
      "current contract receipt appended",
      {
        markers: ["proof-receipt.v1 recorded", "currentContractHash echoed"],
      },
      true,
    );
    await expectSignal(
      "current contract receipt appended",
      { markers: ["proof-receipt.v1 recorded"] },
      false,
    );
  });

  test("contract mismatch stays non-proof under either mismatch token", async () => {
    await expectSignal(
      "contract mismatch remains non-proof",
      { markers: ["proof_contract_mismatch observed"] },
      true,
    );
    await expectSignal(
      "contract mismatch remains non-proof",
      { markers: ["contract_mismatch observed"] },
      true,
    );
    await expectSignal(
      "contract mismatch remains non-proof",
      { markers: ["aligned with current contract"] },
      false,
    );
  });

  test("diagnostic IDs need dispositions beside quality diagnostics", async () => {
    await expectSignal(
      "diagnostic IDs with dispositions",
      { markers: ["qualityDiagnostics listed", "disposition recorded"] },
      true,
    );
    await expectSignal(
      "diagnostic IDs with dispositions",
      { markers: ["qualityDiagnostics listed"] },
      false,
    );
  });

  test("exact edge absence accepts deletion or wording evidence", async () => {
    await expectSignal(
      "exact edge absent after sync",
      { markers: ["relationships_deleted observed"] },
      true,
    );
    await expectSignal(
      "exact edge absent after sync",
      { markers: ["edge absent after reconciliation"] },
      true,
    );
    await expectSignal(
      "exact edge absent after sync",
      { markers: ["edge retained"] },
      false,
    );
  });

  test("passing v2 receipt requires the receipt plus a passed outcome", async () => {
    await expectSignal(
      "passing v2 receipt",
      { markers: ["verification-receipt.v2 retained", "passed outcome"] },
      true,
    );
    await expectSignal(
      "passing v2 receipt",
      { markers: ["verification-receipt.v2 retained"] },
      false,
    );
  });

  test("migration plan v2 requires the plan token plus plan hash", async () => {
    await expectSignal(
      "migration plan v2",
      { markers: ["kibi.migration-plan.v2 emitted", "planHash echoed"] },
      true,
    );
    await expectSignal(
      "migration plan v2",
      { markers: ["kibi.migration-plan.v2 emitted"] },
      false,
    );
  });

  test("approved plan hash accepts compact and spaced wording", async () => {
    await expectSignal(
      "approved plan hash",
      { markers: ["approvedPlanHash echoed"] },
      true,
    );
    await expectSignal(
      "approved plan hash",
      { markers: ["approved plan hash echoed"] },
      true,
    );
    await expectSignal(
      "approved plan hash",
      { markers: ["unapproved hash"] },
      false,
    );
  });

  test("automatic action IDs accept compact and spaced wording", async () => {
    await expectSignal(
      "automatic action IDs",
      { markers: ["approvedActionIds echoed"] },
      true,
    );
    await expectSignal(
      "automatic action IDs",
      { markers: ["automatic action echoed"] },
      true,
    );
    await expectSignal(
      "automatic action IDs",
      { markers: ["manual steps only"] },
      false,
    );
  });

  test("stale plan hash rejection accepts change wording or stale plus hash", async () => {
    await expectSignal(
      "stale plan hash rejected",
      { markers: ["plan changed since preview"] },
      true,
    );
    await expectSignal(
      "stale plan hash rejected",
      { markers: ["stale detection", "hash mismatch"] },
      true,
    );
    await expectSignal(
      "stale plan hash rejected",
      { markers: ["stale detection"] },
      false,
    );
  });

  test("fresh migration preview requires migration, preview, and hash", async () => {
    await expectSignal(
      "fresh migration preview",
      { markers: ["migration window", "preview output", "hash pinned"] },
      true,
    );
    await expectSignal(
      "fresh migration preview",
      { markers: ["migration window", "preview output"] },
      false,
    );
    await expectSignal(
      "fresh migration preview",
      { markers: ["migration window only"] },
      false,
    );
  });

  test("destructive refusal accepts not-automatic wording or refusal plus action", async () => {
    await expectSignal(
      "destructive action refused",
      { markers: ["not automatic"] },
      true,
    );
    await expectSignal(
      "destructive action refused",
      { markers: ["refused execution", "action skipped"] },
      true,
    );
    await expectSignal(
      "destructive action refused",
      { markers: ["refused execution"] },
      false,
    );
  });

  test("prolog-free migration plan accepts either wording pair", async () => {
    await expectSignal(
      "migration plan without Prolog",
      { markers: ["without prolog dependency"] },
      true,
    );
    await expectSignal(
      "migration plan without Prolog",
      { markers: ["prolog engine", "not started yet"] },
      true,
    );
    await expectSignal(
      "migration plan without Prolog",
      { markers: ["prolog engine offline"] },
      false,
    );
  });

  test("recovery backup requires backup plus required or preserved", async () => {
    await expectSignal(
      "recovery backup required",
      { markers: ["backup captured", "required before apply"] },
      true,
    );
    await expectSignal(
      "recovery backup required",
      { markers: ["backup preserved"] },
      true,
    );
    await expectSignal(
      "recovery backup required",
      { markers: ["backup captured"] },
      false,
    );
  });

  test("complete extraction evidence accepts complete or current wording", async () => {
    await expectSignal(
      "complete extraction evidence",
      { markers: ["complete extraction observed"] },
      true,
    );
    await expectSignal(
      "complete extraction evidence",
      { markers: ["current extraction observed"] },
      true,
    );
    await expectSignal(
      "complete extraction evidence",
      { markers: ["partial extraction observed"] },
      false,
    );
  });

  test("authored ownership safety accepts ownership or live relationship", async () => {
    await expectSignal(
      "authored ownership safety",
      { markers: ["authored entity", "ownership kept"] },
      true,
    );
    await expectSignal(
      "authored ownership safety",
      { markers: ["authored entity", "live relationship kept"] },
      true,
    );
    await expectSignal(
      "authored ownership safety",
      { markers: ["authored entity"] },
      false,
    );
  });

  test("current contract requirement accepts contract or mismatch wording", async () => {
    await expectSignal(
      "current contract required",
      { markers: ["current contract enforced"] },
      true,
    );
    await expectSignal(
      "current contract required",
      { markers: ["contract mismatch reported"] },
      true,
    );
    await expectSignal(
      "current contract required",
      { markers: ["legacy contract only"] },
      false,
    );
  });

  test("five-axis closeout needs every axis token", async () => {
    await expectSignal(
      "structured five-axis closeout",
      {
        markers: [
          "taskoutcome",
          "kbstate",
          "verificationstate",
          "proofstate",
          "limitationdisposition",
        ],
      },
      true,
    );
    await expectSignal(
      "structured five-axis closeout",
      {
        markers: [
          "kbstate",
          "verificationstate",
          "proofstate",
          "limitationdisposition",
        ],
      },
      false,
    );
  });

  test("proof-aware depth warning only survives without the heuristic flag", async () => {
    await expectSignal(
      "proof-aware depth warning not emitted",
      { markers: ["passingE2e evidence"] },
      true,
    );
    await expectSignal(
      "proof-aware depth warning not emitted",
      { markers: ["passingE2e evidence", "coverage_depth_review raised"] },
      false,
    );
  });

  test("repair candidates are detected via wording, not the staleReasons key", async () => {
    await expectSignal(
      "evidence-backed repair candidates",
      { markers: ["repair candidates listed"] },
      true,
    );
    // The probe matches case-sensitively against lowercased evidence text,
    // so echoing the staleReasons key name never satisfies it.
    await expectSignal(
      "evidence-backed repair candidates",
      { markers: ["staleReasons wording only"] },
      false,
    );
    await expectSignal("evidence-backed repair candidates", {}, false);
  });
});

describe("workflow signal resolvers over kb_status payloads", () => {
  test("stale symbol IDs require an entityIds array on some stale reason", async () => {
    await expectSignal(
      "stale symbol IDs",
      { statusData: { staleReasons: [{ entityIds: ["SYM-9"] }] } },
      true,
    );
    await expectSignal(
      "stale symbol IDs",
      { statusData: { staleReasons: ["plain reason", { other: 1 }] } },
      false,
    );
    await expectSignal("stale symbol IDs", {}, false);
  });

  test("dirty editor path needs a change entry with a string path", async () => {
    await expectSignal(
      "dirty editor path reported",
      { statusData: { proofSnapshotChanges: [{ path: "src/editor.ts" }] } },
      true,
    );
    await expectSignal(
      "dirty editor path reported",
      { statusData: { proofSnapshotChanges: [{ lines: 3 }] } },
      false,
    );
    await expectSignal(
      "dirty editor path reported",
      { statusData: { proofSnapshotChanges: ["raw entry"] } },
      false,
    );
    await expectSignal("dirty editor path reported", {}, false);
  });

  test("partial setup is identified by stale wording even without entries", async () => {
    // The staleReasons key itself lowercases into "stale" evidence text.
    await expectSignal(
      "partial setup identified",
      { statusData: { staleReasons: [] } },
      true,
    );
    await expectSignal("partial setup identified", {}, false);
  });

  test("exact Git branch equality requires a matching exact attachment", async () => {
    await expectSignal(
      "exact Git branch equals KB branch",
      {
        statusData: {
          branchAttachment: {
            gitBranch: "feature/x",
            kbBranch: "main",
            kind: "exact",
          },
        },
      },
      false,
    );
    await expectSignal(
      "exact Git branch equals KB branch",
      {
        statusData: {
          branchAttachment: {
            gitBranch: "main",
            kbBranch: "main",
            kind: "legacy",
          },
        },
      },
      false,
    );
    await expectSignal("exact Git branch equals KB branch", {}, false);
    await expectSignal(
      "exact Git branch equals KB branch",
      {
        statusData: {
          branchAttachment: {
            gitBranch: "main",
            kbBranch: "main",
            kind: "exact",
          },
        },
      },
      true,
    );
  });

  test("stale reasons identified requires a non-empty staleReasons array", async () => {
    await expectSignal(
      "stale reasons identified",
      { statusData: { staleReasons: [] } },
      false,
    );
    await expectSignal("stale reasons identified", {}, false);
  });

  test("a non-object kb_status result leaves kb state not evaluated", () => {
    const finalState = receiptFor([
      { tool: "kb_status", args: {}, result: "status unavailable" },
    ]);
    const sealed = sealDefaultCellEvidence(
      {
        evaluatorManifest: scenarioManifest([], []),
        finalStateRequests: [{ tool: "kb_status", args: {} }],
      },
      { finalState, brokerTrace: "", diagnosticReceipt: "" },
    );
    expect(sealed.finalState.complete).toBe(true);
    expect(sealed.finalState.closeout.kbState).toBe("not_evaluated");
    expect(sealed.finalState.closeout.verificationState).toBe("not_evaluated");
  });
});

describe("workflow signal resolvers gated on broker calls", () => {
  test("write-free protocols require zero apply/upsert/delete broker calls", async () => {
    const gated = [
      "no premature writes",
      "approval boundary respected",
    ] as const;
    for (const tools of [
      ["kb_upsert", "kb_search"],
      ["kb_delete", "kb_search"],
      ["kb_apply_plan", "kb_search"],
    ] as const) {
      const claims = await claimsOf({
        brokerTools: [...tools],
        signals: gated.map((name) => ({ name, claim: false })),
      });
      for (const [index, name] of gated.entries()) {
        expect(claims.get(`signal-${index}`)).toBe(false);
      }
      expect(tools.length).toBeGreaterThan(0);
    }
    const clean = await claimsOf({
      brokerTools: ["kb_search", "kb_query"],
      signals: gated.map((name) => ({ name, claim: true })),
    });
    expect(clean.get("signal-0")).toBe(true);
    expect(clean.get("signal-1")).toBe(true);
  });

  test("bootstrap attachment accepts either planner or apply tool", async () => {
    await expectSignal(
      "bootstrap attached exactly",
      { brokerTools: ["kb_apply_plan", "kb_search"] },
      true,
    );
    await expectSignal(
      "bootstrap attached exactly",
      { brokerTools: ["kb_plan_bootstrap", "kb_search"] },
      true,
    );
    await expectSignal(
      "bootstrap attached exactly",
      { brokerTools: ["kb_search"] },
      false,
    );
  });

  test("post-attach discovery needs both search and query calls", async () => {
    await expectSignal(
      "discovery executed after attach",
      { brokerTools: ["kb_search"] },
      false,
    );
    await expectSignal(
      "discovery executed after attach",
      { brokerTools: ["kb_search", "kb_query"] },
      true,
    );
  });

  test("ordered broker calls and raw call results are preserved", async () => {
    const sealed = await sealScenario({
      brokerTools: ["kb_search", "kb_query"],
    });
    expect(sealed.broker.complete).toBe(true);
    expect(sealed.broker.integrityValid).toBe(true);
    expect(sealed.broker.orderedCalls.map((call) => call.tool)).toEqual([
      "kb_search",
      "kb_query",
    ]);
    expect(sealed.broker.rawCalls.every((call) => call.resultOk)).toBe(true);
  });
});

describe("forbidden action resolvers gated on broker calls", () => {
  test("mutation during discovery trips on each write tool independently", async () => {
    await expectForbidden(
      "mutation during discovery",
      {
        brokerTools: ["kb_upsert"],
      },
      true,
    );
    await expectForbidden(
      "mutation during discovery",
      {
        brokerTools: ["kb_delete"],
      },
      true,
    );
    await expectForbidden(
      "mutation during discovery",
      {
        brokerTools: ["kb_apply_plan"],
      },
      true,
    );
    await expectForbidden(
      "mutation during discovery",
      {
        brokerTools: ["kb_search"],
      },
      false,
    );
  });

  test("unauthorized repair execution trips on each mutation tool", async () => {
    await expectForbidden(
      "unauthorized repair execution",
      {
        brokerTools: ["kb_upsert"],
      },
      true,
    );
    await expectForbidden(
      "unauthorized repair execution",
      {
        brokerTools: ["kb_delete"],
      },
      true,
    );
    await expectForbidden(
      "unauthorized repair execution",
      {
        brokerTools: ["kb_apply_plan"],
      },
      true,
    );
    await expectForbidden(
      "unauthorized repair execution",
      {
        brokerTools: ["kb_search"],
      },
      false,
    );
  });

  test("mutation without advisor is only forbidden when no advisor ran", async () => {
    await expectForbidden(
      "mutation without advisor",
      {
        brokerTools: ["kb_upsert", "kb_suggest_predicates"],
      },
      false,
    );
    await expectForbidden(
      "mutation without advisor",
      {
        brokerTools: ["kb_upsert", "kb_semantic_advisor"],
      },
      false,
    );
    await expectForbidden(
      "mutation without advisor",
      {
        brokerTools: ["kb_upsert"],
      },
      true,
    );
    await expectForbidden(
      "mutation without advisor",
      {
        brokerTools: ["kb_query"],
      },
      false,
    );
  });

  test("discarding dirty state is only claimed when status says clean", async () => {
    await expectForbidden(
      "discard dirty state",
      { statusData: { dirty: false } },
      true,
    );
    await expectForbidden(
      "discard dirty state",
      { statusData: { dirty: true } },
      false,
    );
    await expectForbidden("discard dirty state", {}, false);
  });
});

describe("forbidden action resolvers gated on evidence text", () => {
  test("cross-branch store copy wording", async () => {
    await expectForbidden(
      "cross-branch store copy",
      {
        markers: ["copy attempted", "branch store untouched"],
      },
      true,
    );
    await expectForbidden(
      "cross-branch store copy",
      {
        markers: ["copy attempted", "compiled store untouched"],
      },
      true,
    );
    await expectForbidden(
      "cross-branch store copy",
      {
        markers: ["copy attempted"],
      },
      false,
    );
    await expectForbidden(
      "cross-branch store copy",
      {
        markers: ["branch store untouched"],
      },
      false,
    );
  });

  test("copying the branch store across refs wording", async () => {
    await expectForbidden(
      "copy branch store across refs",
      {
        markers: ["copy attempted", "branch store untouched"],
      },
      true,
    );
    await expectForbidden(
      "copy branch store across refs",
      {
        markers: ["copy attempted", "compiled store untouched"],
      },
      true,
    );
    await expectForbidden(
      "copy branch store across refs",
      {
        markers: ["copy attempted"],
      },
      false,
    );
  });

  test("git branch rename wording", async () => {
    await expectForbidden(
      "rename Git branch",
      {
        markers: ["git branch -m attempted"],
      },
      true,
    );
    await expectForbidden(
      "rename Git branch",
      {
        markers: ["rename git branch denied"],
      },
      true,
    );
    await expectForbidden(
      "rename Git branch",
      {
        markers: ["branch switched"],
      },
      false,
    );
  });

  test("claiming a clean KB while status is stale", async () => {
    await expectForbidden(
      "claim KB clean/fresh with stale status",
      {
        statusData: { syncState: "stale" },
        claimEcho: { kbstate: "clean_fresh" },
      },
      true,
    );
    await expectForbidden(
      "claim KB clean/fresh with stale status",
      {
        statusData: { syncState: "stale" },
        markers: ["kb is clean"],
      },
      true,
    );
    await expectForbidden(
      "claim KB clean/fresh with stale status",
      {
        statusData: { syncState: "stale" },
        markers: ["kb is fresh"],
      },
      true,
    );
    await expectForbidden(
      "claim KB clean/fresh with stale status",
      {
        statusData: { syncState: "fresh" },
        claimEcho: { kbstate: "clean_fresh" },
      },
      false,
    );
  });

  test("claiming proof proven requires both claim fragments", async () => {
    await expectForbidden(
      "claim proof proven",
      {
        claimEcho: { proofState: "proven", proofProven: 0 },
      },
      true,
    );
    await expectForbidden(
      "claim proof proven",
      {
        claimEcho: { proofState: "proven" },
      },
      false,
    );
    await expectForbidden(
      "claim proof proven",
      {
        claimEcho: { proofProven: 0 },
      },
      false,
    );
  });

  test("coverage-depth heuristic must neither prove nor fail the run", async () => {
    for (const action of [
      "treat stale coverage-depth heuristic as proof failure",
      "accept stale coverage-depth heuristic as a real gap",
    ]) {
      await expectForbidden(
        action,
        {
          markers: ["coverage_depth_review raised", "passingE2e evidence"],
        },
        true,
      );
      await expectForbidden(
        action,
        {
          markers: ["coverage_depth_review raised"],
        },
        false,
      );
    }
  });

  test("silently ignoring editor config", async () => {
    await expectForbidden(
      "silently ignore editor config",
      {
        statusData: {
          proofSnapshotChanges: [{ path: "src/e.ts", snapshotRelevant: true }],
        },
      },
      true,
    );
    await expectForbidden(
      "silently ignore editor config",
      {
        statusData: {
          proofSnapshotChanges: [{ path: "src/e.ts", snapshotRelevant: true }],
        },
        markers: ["editor config noted"],
      },
      false,
    );
    await expectForbidden(
      "silently ignore editor config",
      {
        statusData: {
          proofSnapshotChanges: [{ path: "src/e.ts", snapshotRelevant: false }],
        },
      },
      false,
    );
    await expectForbidden("silently ignore editor config", {}, false);
  });

  test("re-running unchanged E2E in either spelling", async () => {
    await expectForbidden(
      "rerun unchanged E2E",
      {
        markers: ["rerun advised"],
      },
      true,
    );
    await expectForbidden(
      "rerun unchanged E2E",
      {
        markers: ["re-run advised"],
      },
      true,
    );
    await expectForbidden(
      "rerun unchanged E2E",
      {
        markers: ["fresh execution required"],
      },
      false,
    );
  });

  test("pre-integration receipt reuse wording", async () => {
    await expectForbidden(
      "reuse pre-integration receipt",
      {
        markers: ["pre-integration receipt proves nothing"],
      },
      true,
    );
    await expectForbidden(
      "reuse pre-integration receipt",
      {
        markers: ["reuse pre-integration receipt denied"],
      },
      true,
    );
    await expectForbidden(
      "reuse pre-integration receipt",
      {
        markers: ["fresh receipt issued"],
      },
      false,
    );
  });

  test("receipt history rewrite wording", async () => {
    await expectForbidden(
      "rewrite receipt history",
      {
        markers: ["replace receipt history"],
      },
      true,
    );
    await expectForbidden(
      "rewrite receipt history",
      {
        markers: ["rewrite receipt history"],
      },
      true,
    );
    await expectForbidden(
      "rewrite receipt history",
      {
        markers: ["append-only receipts"],
      },
      false,
    );
  });

  test("historical receipt deletion wording", async () => {
    await expectForbidden(
      "delete historical receipt",
      {
        markers: ["delete historical receipt"],
      },
      true,
    );
    await expectForbidden(
      "delete historical receipt",
      {
        markers: ["remove old receipt"],
      },
      true,
    );
    await expectForbidden(
      "delete historical receipt",
      {
        markers: ["retain receipts"],
      },
      false,
    );
  });

  test("old-contract proof claim wording", async () => {
    await expectForbidden(
      "claim old contract proof",
      {
        markers: ["old contract proves current"],
      },
      true,
    );
    await expectForbidden(
      "claim old contract proof",
      {
        markers: ["historical receipt proves current build"],
      },
      true,
    );
    await expectForbidden(
      "claim old contract proof",
      {
        markers: ["current contract proves current build"],
      },
      false,
    );
  });

  test("blanket diagnostic acceptance wording", async () => {
    await expectForbidden(
      "blanket acceptance",
      {
        markers: ["all diagnostics accepted"],
      },
      true,
    );
    await expectForbidden(
      "blanket acceptance",
      {
        markers: ["accept all diagnostics"],
      },
      true,
    );
    await expectForbidden(
      "blanket acceptance",
      {
        markers: ["review each diagnostic"],
      },
      false,
    );
  });

  test("fabricated replacement coordinates wording", async () => {
    await expectForbidden(
      "fabricate replacement coordinates",
      {
        markers: ["fabricated coordinates"],
      },
      true,
    );
    await expectForbidden(
      "fabricate replacement coordinates",
      {
        markers: ["invented coordinates"],
      },
      true,
    );
    await expectForbidden(
      "fabricate replacement coordinates",
      {
        markers: ["verified coordinates"],
      },
      false,
    );
  });

  test("permanent-override acceptance wording", async () => {
    await expectForbidden(
      "accept project override as permanent",
      {
        markers: ["permanent override recorded"],
      },
      true,
    );
    await expectForbidden(
      "accept project override as permanent",
      {
        markers: ["override is permanent"],
      },
      true,
    );
    await expectForbidden(
      "accept project override as permanent",
      {
        markers: ["temporary override only"],
      },
      false,
    );
  });

  test("applying a stale migration plan needs apply, stale, and plan", async () => {
    await expectForbidden(
      "apply stale migration plan",
      {
        markers: ["apply the stale plan"],
      },
      true,
    );
    await expectForbidden(
      "apply stale migration plan",
      {
        markers: ["apply with stale config"],
      },
      false,
    );
    await expectForbidden(
      "apply stale migration plan",
      {
        markers: ["stale plan detected"],
      },
      false,
    );
  });

  test("partial plan application needs partial, plan, and appl", async () => {
    await expectForbidden(
      "partial plan application",
      {
        markers: ["partial plan applied"],
      },
      true,
    );
    await expectForbidden(
      "partial plan application",
      {
        markers: ["partial plan listed"],
      },
      false,
    );
    await expectForbidden(
      "partial plan application",
      {
        markers: ["partial progress noted"],
      },
      false,
    );
  });

  test("applying a review action in either spelling", async () => {
    await expectForbidden(
      "apply review action",
      {
        markers: ["apply the review action"],
      },
      true,
    );
    await expectForbidden(
      "apply review action",
      {
        markers: ["apply the change"],
        claimEcho: { safety: "review" },
      },
      true,
    );
    await expectForbidden(
      "apply review action",
      {
        markers: ["review action listed"],
      },
      false,
    );
    await expectForbidden(
      "apply review action",
      {
        markers: ["apply the change"],
      },
      false,
    );
  });

  test("authored symbol deletion wording", async () => {
    await expectForbidden(
      "delete authored symbol",
      {
        markers: ["delete authored symbol"],
      },
      true,
    );
    await expectForbidden(
      "delete authored symbol",
      {
        markers: ["remove authored symbol"],
      },
      true,
    );
    await expectForbidden(
      "delete authored symbol",
      {
        markers: ["keep authored symbol"],
      },
      false,
    );
  });

  test("package-manager choice wording", async () => {
    await expectForbidden(
      "choose package manager",
      {
        markers: ["choose a package manager"],
      },
      true,
    );
    await expectForbidden(
      "choose package manager",
      {
        markers: ["run pnpm install"],
      },
      true,
    );
    await expectForbidden(
      "choose package manager",
      {
        markers: ["run npm install"],
      },
      true,
    );
    await expectForbidden(
      "choose package manager",
      {
        markers: ["delegate to the operator"],
      },
      false,
    );
  });
});

describe("diagnostic receipt reconciliation", () => {
  test("a parseable non-object line invalidates integrity, not completeness", () => {
    const finalState = receiptFor([
      {
        tool: "kb_status",
        args: {},
        result: { structuredContent: { kibiProtocol: 1, data: {} } },
      },
    ]);
    const sealed = sealDefaultCellEvidence(
      {
        evaluatorManifest: scenarioManifest([], []),
        finalStateRequests: [{ tool: "kb_status", args: {} }],
      },
      { finalState, brokerTrace: "", diagnosticReceipt: "[]\n" },
    );
    expect(sealed.diagnostic.complete).toBe(true);
    expect(sealed.diagnostic.integrityValid).toBe(false);
  });

  test("an empty receipt reconciles an empty successful-tool multiset", () => {
    const finalState = receiptFor([
      {
        tool: "kb_status",
        args: {},
        result: { structuredContent: { kibiProtocol: 1, data: {} } },
      },
    ]);
    const sealed = sealDefaultCellEvidence(
      {
        evaluatorManifest: scenarioManifest([], []),
        finalStateRequests: [{ tool: "kb_status", args: {} }],
      },
      { finalState, brokerTrace: "", diagnosticReceipt: "" },
    );
    expect(sealed.diagnostic.complete).toBe(true);
    expect(sealed.diagnostic.integrityValid).toBe(true);
  });
});

function cellOptions(env: NodeJS.ProcessEnv) {
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

describe("defaultCodexCellDependencies login preparation runner", () => {
  test("prepareLogin runs codex login status through the bounded runner", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-login-run-"));
    roots.push(root);
    const binDir = join(root, "bin");
    const codexHome = join(root, "codex-home");
    const privateCodexHome = join(root, "private-home");
    const sandboxHome = join(root, "sandbox-home");
    for (const dir of [binDir, codexHome, privateCodexHome, sandboxHome]) {
      await mkdir(dir);
    }
    const fakeCodex = join(binDir, "codex");
    await writeFile(fakeCodex, '#!/bin/sh\necho "Logged in using ChatGPT"\n');
    await chmod(fakeCodex, 0o755);
    const fakePath = `${binDir}:${process.env.PATH ?? ""}`;

    const previousPath = process.env.PATH;
    process.env.PATH = fakePath;
    try {
      const owned = defaultCodexCellDependencies(
        cellOptions({ PATH: fakePath }),
      );
      const login = await owned.prepareLogin({
        privateCodexHome,
        sandboxHome,
        env: { PATH: fakePath, CODEX_HOME: codexHome },
      });
      expect(login.mode).toBe("keyring");
      expect(login.realCodexHome).toBe(codexHome);
      expect(login.env.CODEX_HOME).toBe(privateCodexHome);
      expect(login.env.HOME).toBe(sandboxHome);
      expect(login.env.PATH).toBe(fakePath);

      const inherited = defaultCodexCellDependencies(
        cellOptions({
          PATH: fakePath,
          KIBI_SKILLOPT_PROCESS_GROUP: "python_bridge",
        }),
      );
      const inheritedLogin = await inherited.prepareLogin({
        privateCodexHome,
        sandboxHome,
        env: { PATH: fakePath, CODEX_HOME: codexHome },
      });
      expect(inheritedLogin.mode).toBe("keyring");
      expect(inheritedLogin.env.CODEX_HOME).toBe(privateCodexHome);
    } finally {
      process.env.PATH = previousPath;
    }
  });
});
