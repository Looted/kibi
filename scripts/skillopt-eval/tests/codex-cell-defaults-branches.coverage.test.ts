// implements REQ-skillopt-logical-evidence-fidelity
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtureSymbolId } from "../fixtures/workspace";
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

const SAFE_TASK = "kibi-usage-safe-mutation-direction-development-1";

function requests() {
  return [
    { tool: "kb_query" as const, args: {} },
    { tool: "kb_check" as const, args: {} },
    { tool: "kb_status" as const, args: {} },
    { tool: "kb_coverage" as const, args: { by: "req" } },
  ];
}

function completeManifest() {
  const base = evaluatorManifest("predicate");
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      ...base,
      taskId: SAFE_TASK,
      expectedFinalState: [
        ...base.expectedFinalState,
        {
          key: "workflow-outcome",
          query: "workflow://outcome",
          expected: "complete",
          critical: false,
        },
        {
          key: "workflow-kb-state",
          query: "workflow://closeout/kb-state",
          expected: "stale",
          critical: false,
        },
        {
          key: "workflow-limitation",
          query: "workflow://closeout/limitation-disposition",
          expected: "not_applicable",
          critical: false,
        },
        {
          key: "ignored",
          query: "other://unused",
          expected: true,
          critical: false,
        },
      ],
    }),
  );
}

function receipt(parts: {
  query?: unknown;
  check?: unknown;
  status?: unknown;
  coverage?: unknown;
  extra?: Record<string, unknown>;
}): string {
  const query = parts.query ?? {
    structured_content: { entities: [], count: 0 },
  };
  const check = parts.check ?? {
    isError: true,
    structuredContent: { status: "error" },
  };
  const status = parts.status ?? {
    structured_content: {
      staleReasons: ["stale"],
    },
  };
  const coverage = parts.coverage ?? {
    structuredContent: {
      scope: { complete: true },
      rows: [{ proofStatus: "unresolved" }, { proofStatus: "missing" }],
    },
  };
  const listed = [
    ["kb_query", {}, query],
    ["kb_check", {}, check],
    ["kb_status", {}, status],
    ["kb_coverage", { by: "req" }, coverage],
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
      caseId: SAFE_TASK,
      roots: evaluatorRoots,
      sequence: 1,
    },
    requests: listed,
    ...parts.extra,
  })}\n`;
}

async function brokerTrace(calls: readonly {
  tool: string;
  result?: unknown;
  omitResult?: boolean;
  omitParams?: boolean;
  isError?: boolean;
}[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-cell-branch-"));
  roots.push(root);
  const path = join(root, "broker-trace.jsonl");
  await appendTraceReceipt(path, {
    correlationId: "init",
    direction: "target_to_server",
    kind: "request",
    method: "initialize",
    payload: {},
  });
  for (const [index, call] of calls.entries()) {
    const correlationId = `rpc-${index}`;
    await appendTraceReceipt(path, {
      correlationId,
      direction: "target_to_server",
      kind: "request",
      method: "tools/call",
      toolName: call.tool,
      payload: call.omitParams
        ? {}
        : { params: { arguments: { tool: call.tool } } },
    });
    if (!call.omitResult) {
      await appendTraceReceipt(path, {
        correlationId,
        direction: "server_to_target",
        kind: "response",
        method: "tools/call",
        toolName: call.tool,
        payload: {
          result: call.result ?? { isError: call.isError === true },
        },
      });
    }
  }
  return readFile(path, "utf8");
}

describe("sealDefaultCellEvidence remaining closeout and broker branches", () => {
  test("covers underscore envelopes, failed checks, and unresolved rows", async () => {
    const sealed = sealDefaultCellEvidence(
      { evaluatorManifest: completeManifest(), finalStateRequests: requests() },
      {
        finalState: receipt({}),
        brokerTrace: await brokerTrace([
          { tool: "kb_query", isError: true },
          { tool: "kb_status", omitResult: true },
          { tool: "kb_graph", omitParams: true, result: { ok: true } },
        ]),
        diagnosticReceipt:
          '{"tool":"kb_graph","status":"success","telemetry":{}}\n',
      },
    );
    expect(sealed.finalState.closeout.kbState).toBe("stale");
    expect(sealed.finalState.closeout.proofState).toBe("unresolved");
    expect(sealed.finalState.closeout.limitationDisposition).toBe(
      "not_applicable",
    );
    expect(sealed.finalState.closeout.taskOutcome).toBe("blocked");
    expect(sealed.finalState.complete).toBe(true);
    expect(sealed.broker.rawCalls.some((call) => call.tool === "kb_query")).toBe(
      true,
    );
    expect(sealed.diagnostic.complete).toBe(true);
  });

  test("marks a complete clean check and safe-mutation ownership", async () => {
    const symbolId = fixtureSymbolId(SAFE_TASK);
    const suffix = symbolId.slice("SYM-FIXTURE-".length);
    const query = {
      isError: false,
      structuredContent: {
        kibiProtocol: 1,
        data: {
          entities: [
            {
              id: symbolId,
              type: "symbol",
              sourceFile: "src/fixture.ts",
              implements: [`kb:entity/REQ-FIXTURE-${suffix}`, 12],
              covered_by: `TEST-FIXTURE-${suffix}`,
            },
          ],
        },
      },
    };
    const check = {
      structuredContent: {
        kibiProtocol: 1,
        data: { count: 0, violations: [] },
      },
    };
    const complete = sealDefaultCellEvidence(
      { evaluatorManifest: completeManifest(), finalStateRequests: requests() },
      {
        finalState: receipt({
          query,
          check,
          status: { structuredContent: { syncState: "fresh", dirty: false } },
          coverage: {
            structuredContent: {
              scope: { complete: true },
              summary: { proofProven: "nope", proofMissing: "nope" },
              rows: [{ proofStatus: "unresolved" }],
            },
          },
        }),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(complete.finalState.closeout.taskOutcome).toBe("complete");
    expect(complete.finalState.closeout.kbState).toBe("clean_fresh");

    const missingEntities = sealDefaultCellEvidence(
      { evaluatorManifest: completeManifest(), finalStateRequests: requests() },
      {
        finalState: receipt({
          query: { structuredContent: { entities: "nope" } },
          check,
        }),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(missingEntities.finalState.closeout.taskOutcome).toBe("blocked");

    const mismatched = sealDefaultCellEvidence(
      {
        evaluatorManifest: completeManifest(),
        finalStateRequests: [
          { tool: "kb_query", args: { id: "other" } },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
          { tool: "kb_coverage", args: { by: "req" } },
        ],
      },
      {
        finalState: receipt({ query, check }),
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(mismatched.finalState.complete).toBe(false);
  });

  test("raw resultContent, dirty discard, and editor-config forbidden text", () => {
    const manifest = parsePrivateEvaluatorManifest(
      JSON.stringify({
        ...evaluatorManifest("predicate"),
        expectedFinalState: [
          {
            key: "discard-dirty",
            query: "workflow://forbidden/0",
            expected: true,
            critical: false,
          },
          {
            key: "editor-config",
            query: "workflow://forbidden/1",
            expected: true,
            critical: false,
          },
          {
            key: "clean-fresh-claim",
            query: "workflow://forbidden/2",
            expected: true,
            critical: false,
          },
        ],
        workflowExpectation: {
          expectedOutcome: "complete",
          expectedKbState: "dirty",
          expectedVerificationState: "not_evaluated",
          expectedProofState: "not_evaluated",
          expectedLimitationDisposition: "not_applicable",
          requiredSignals: [],
          forbiddenActions: [
            "discard dirty state",
            "silently ignore editor config",
            "claim KB clean/fresh with stale status",
          ],
          closeout: {
            taskOutcome: "complete",
            kbState: "dirty",
            verificationState: "not_evaluated",
            proofState: "not_evaluated",
            limitationDisposition: "not_applicable",
          },
        },
      }),
    );
    const status = {
      kbstate: "clean_fresh",
      dirty: false,
      syncState: "stale",
      proofSnapshotChanges: [{ path: "src/a.ts", snapshotRelevant: true }],
    };
    const sealed = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [{ tool: "kb_status", args: {} }],
      },
      {
        finalState: `${JSON.stringify({
          schemaVersion: "1.0.0",
          workspaceRoot: "/tmp",
          requests: [
            {
              tool: "kb_status",
              args: {},
              result: status,
              resultHash: resultHash(status),
            },
          ],
        })}\n`,
        brokerTrace: "",
        diagnosticReceipt: "",
      },
    );
    expect(sealed.finalState.closeout.kbState).toBe("stale");
    expect(
      sealed.finalState.claims.some((claim) => claim.key === "discard-dirty"),
    ).toBe(true);
  });
});

describe("defaultCodexCellDependencies leftover wiring", () => {
  test("exposes stage/probe seams and evaluates empty sealed evidence", async () => {
    const deps = defaultCodexCellDependencies({
      request: {
        schemaVersion: "1.0.0",
        artifactType: "episode-request",
        episodeId: "00000000-0000-4000-8000-000000000011",
        runId: "00000000-0000-4000-8000-000000000012",
        runLockHash: "d".repeat(64),
        variant: "baseline",
        skill: "kibi-usage",
        taskId: "fake-task",
        attempt: 1,
        prompt: "Run the fixture task.",
        workspaceFixtureHash: "b".repeat(64),
      },
      fixtureRoot: "/tmp/fixture",
      sourceWorktree: process.cwd(),
      artifactRoot: "/tmp/artifacts",
      targetSkill: "kibi-usage",
      codexExecutable: "/tmp/fake-codex",
      bwrapExecutable: "/tmp/fake-bwrap",
      env: { UNUSED: undefined, PATH: process.env.PATH },
      finalStateRequests: [{ tool: "kb_status", args: {} }],
      evaluatorManifest: evaluatorManifest("predicate"),
      hiddenMarkers: [],
      pricingHash: "0".repeat(64),
      priceAmount: 0,
      timeoutMs: 1_000,
    });
    expect(typeof deps.stageBroker).toBe("function");
    expect(typeof deps.probeMcp).toBe("function");
    const sealed = await deps.evaluateSealedEvidence({
      finalState: JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: "/tmp",
        requests: [],
      }),
      brokerTrace: "not-a-valid-trace",
      diagnosticReceipt: "[]\n",
    });
    expect(sealed.broker.integrityValid).toBe(false);
    expect(sealed.diagnostic.integrityValid).toBe(false);
  });
});
