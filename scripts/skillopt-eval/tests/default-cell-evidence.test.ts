import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { sealDefaultCellEvidence } from "../runtime/codex-cell-defaults";
import { appendTraceReceipt } from "../runtime/jsonrpc";
import { scoreCell } from "../scoring/cell";
import {
  evaluatorManifest,
  evaluatorRoots,
} from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function resultHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function finalStateReceipt(): string {
  const queryResult = {
    content: [{ type: "text", text: "Found 2 entities." }],
    structuredContent: {
      entities: [
        {
          id: "REQ-held-out-matrix",
          type: "req",
          logic_claims: ["CLAIM-AAAAAAAAAAAAAAAA"],
          requires_predicate: "kb:entity/FACT-held-out-matrix",
        },
        {
          id: "FACT-held-out-matrix",
          type: "fact",
          fact_kind: "predicate",
          predicate_name: "held_out_matrix",
          predicate_args: [
            "terminal_matrix_id",
            "frozen_skillopt_candidate_hash",
          ],
          polarity: "deny",
          claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
          claim_text: "The matrix must deny changed candidate bytes.",
        },
      ],
      count: 2,
    },
  };
  const checkResult = {
    content: [{ type: "text", text: "No violations found" }],
    structuredContent: { violations: [], count: 0, diagnostics: [] },
  };
  const statusResult = {
    content: [{ type: "text", text: "Branch skillopt-eval is fresh" }],
    structuredContent: { branch: "skillopt-eval", syncState: "fresh" },
  };
  return `${JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    binding: {
      caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
      roots: evaluatorRoots,
      sequence: 1,
    },
    requests: [
      {
        tool: "kb_query",
        args: {},
        result: queryResult,
        resultHash: resultHash(queryResult),
      },
      {
        tool: "kb_check",
        args: {},
        result: checkResult,
        resultHash: resultHash(checkResult),
      },
      {
        tool: "kb_status",
        args: {},
        result: statusResult,
        resultHash: resultHash(statusResult),
      },
    ],
  })}\n`;
}

function workflowManifest() {
  const base = evaluatorManifest("predicate");
  const workflowExpectation = {
    expectedOutcome: "complete" as const,
    expectedKbState: "clean_fresh" as const,
    expectedVerificationState: "fresh" as const,
    expectedProofState: "unresolved" as const,
    expectedLimitationDisposition: "not_applicable" as const,
    requiredSignals: ["passing v2 receipt", "ontology gap remains unresolved"],
    forbiddenActions: ["claim proof proven"],
    closeout: {
      taskOutcome: "complete" as const,
      kbState: "clean_fresh" as const,
      verificationState: "fresh" as const,
      proofState: "unresolved" as const,
      limitationDisposition: "not_applicable" as const,
    },
  };
  const workflowAssertions = [
    ["workflow-outcome", "workflow://outcome", "complete"],
    ["workflow-kb-state", "workflow://closeout/kb-state", "clean_fresh"],
    [
      "workflow-verification-state",
      "workflow://closeout/verification-state",
      "fresh",
    ],
    ["workflow-proof-state", "workflow://closeout/proof-state", "unresolved"],
    [
      "workflow-limitation-disposition",
      "workflow://closeout/limitation-disposition",
      "not_applicable",
    ],
    ["workflow-signal-1", "workflow://signal/0", true],
    ["workflow-signal-2", "workflow://signal/1", true],
    ["workflow-forbidden-1", "workflow://forbidden/0", true],
  ].map(([key, query, expected]) => ({ key, query, expected, critical: true }));
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      ...base,
      expectedFinalState: [...base.expectedFinalState, ...workflowAssertions],
      rubric: base.rubric.map((item) =>
        item.key === "final_state"
          ? {
              ...item,
              criticalAssertionKeys: [
                ...item.criticalAssertionKeys,
                ...workflowAssertions.map(({ key }) => key),
              ],
            }
          : item,
      ),
      workflowExpectation,
    }),
  );
}

function workflowFinalStateReceipt(): string {
  const queryResult = {
    structuredContent: {
      entities: [
        {
          id: "REQ-WORKFLOW",
          type: "req",
          logic_claims: ["CLAIM-WORKFLOW"],
          tags: ["ontology_gap"],
        },
      ],
    },
  };
  const checkResult = {
    structuredContent: { violations: [], count: 0, diagnostics: [] },
  };
  const statusResult = {
    structuredContent: {
      syncState: "fresh",
      dirty: false,
      verificationSnapshotDirty: false,
      branchAttachment: {
        gitBranch: "main",
        kbBranch: "main",
        kind: "exact",
        migrationRequired: false,
      },
    },
  };
  const coverageResult = {
    structuredContent: {
      repairPlan: { scope: { complete: true } },
      summary: { proofProven: 0, proofMissing: 1 },
      rows: [
        {
          proofStatus: "unresolved",
          proofStages: {
            passingE2e: { receiptEvidence: "verification-receipt.v2 passed" },
          },
        },
      ],
    },
  };
  const requests = [
    ["kb_query", {}, queryResult],
    ["kb_check", {}, checkResult],
    ["kb_status", {}, statusResult],
    ["kb_coverage", { by: "req" }, coverageResult],
  ].map(([tool, args, result]) => ({
    tool,
    args,
    result,
    resultHash: resultHash(result),
  }));
  return `${JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    requests,
  })}\n`;
}

function safeMutationManifest() {
  const base = evaluatorManifest("predicate");
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      ...base,
      taskId: "kibi-usage-safe-mutation-direction-development-1",
      expectedFinalState: base.expectedFinalState.map((assertion) =>
        assertion.key === "final-predicate"
          ? {
              ...assertion,
              key: "final-safe-mutation-direction",
              query: "state://kibi-usage/safe-mutation-direction/complete",
            }
          : assertion,
      ),
      rubric: base.rubric.map((item) =>
        item.key === "final_state"
          ? {
              ...item,
              criticalAssertionKeys: ["final-safe-mutation-direction"],
            }
          : item,
      ),
      predicateExpectation: null,
    }),
  );
}

function safeMutationFinalState(includeCoverage: boolean): string {
  const taskId = "kibi-usage-safe-mutation-direction-development-1";
  const suffix = createHash("sha256")
    .update(taskId)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  const queryResult = {
    content: [{ type: "text", text: "Found fixture entities." }],
    structuredContent: {
      entities: [
        {
          id: `REQ-FIXTURE-${suffix}`,
          type: "req",
        },
        {
          id: `TEST-FIXTURE-${suffix}`,
          type: "test",
        },
        {
          id: `SYM-FIXTURE-${suffix}`,
          type: "symbol",
          sourceFile: "src/fixture.ts",
          implements: `kb:entity/REQ-FIXTURE-${suffix}`,
          ...(includeCoverage
            ? { covered_by: `kb:entity/TEST-FIXTURE-${suffix}` }
            : {}),
        },
      ],
      count: 3,
    },
  };
  const checkResult = {
    content: [{ type: "text", text: "No violations found" }],
    structuredContent: { violations: [], count: 0, diagnostics: [] },
  };
  const statusResult = {
    content: [{ type: "text", text: "Branch skillopt-eval is fresh" }],
    structuredContent: { branch: "skillopt-eval", syncState: "fresh" },
  };
  return `${JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    requests: [
      {
        tool: "kb_query",
        args: {},
        result: queryResult,
        resultHash: resultHash(queryResult),
      },
      {
        tool: "kb_check",
        args: {},
        result: checkResult,
        resultHash: resultHash(checkResult),
      },
      {
        tool: "kb_status",
        args: {},
        result: statusResult,
        resultHash: resultHash(statusResult),
      },
    ],
  })}\n`;
}

async function brokerTrace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-default-evidence-"));
  roots.push(root);
  const path = join(root, "broker-trace.jsonl");
  await appendTraceReceipt(path, {
    correlationId: "rpc-1",
    direction: "target_to_server",
    kind: "request",
    method: "initialize",
    payload: {},
  });
  await appendTraceReceipt(path, {
    correlationId: "rpc-2",
    direction: "target_to_server",
    kind: "request",
    method: "tools/call",
    toolName: "kb_query",
    payload: {},
  });
  await appendTraceReceipt(path, {
    correlationId: "rpc-2",
    direction: "server_to_target",
    kind: "response",
    method: "tools/call",
    toolName: "kb_query",
    payload: { result: {} },
  });
  return readFile(path, "utf8");
}

async function brokerTraceWithoutToolCalls(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-default-evidence-"));
  roots.push(root);
  const path = join(root, "broker-trace.jsonl");
  await appendTraceReceipt(path, {
    correlationId: "rpc-1",
    direction: "target_to_server",
    kind: "request",
    method: "initialize",
    payload: {},
  });
  return readFile(path, "utf8");
}

async function brokerTraceWithFailedThenSuccessfulCall(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-default-evidence-"));
  roots.push(root);
  const path = join(root, "broker-trace.jsonl");
  await appendTraceReceipt(path, {
    correlationId: "rpc-1",
    direction: "target_to_server",
    kind: "request",
    method: "tools/call",
    toolName: "kb_query",
    payload: {},
  });
  await appendTraceReceipt(path, {
    correlationId: "rpc-1",
    direction: "server_to_target",
    kind: "response",
    method: "tools/call",
    toolName: "kb_query",
    payload: { result: { isError: true } },
  });
  await appendTraceReceipt(path, {
    correlationId: "rpc-2",
    direction: "target_to_server",
    kind: "request",
    method: "tools/call",
    toolName: "kb_query",
    payload: {},
  });
  await appendTraceReceipt(path, {
    correlationId: "rpc-2",
    direction: "server_to_target",
    kind: "response",
    method: "tools/call",
    toolName: "kb_query",
    payload: { result: {} },
  });
  return readFile(path, "utf8");
}

describe("default Codex cell evidence sealing", () => {
  test("scores closeout dimensions independently when E2E evidence passes but proof remains unresolved", async () => {
    const manifest = workflowManifest();
    const requests = [
      { tool: "kb_query" as const, args: {} },
      { tool: "kb_check" as const, args: {} },
      { tool: "kb_status" as const, args: {} },
      { tool: "kb_coverage" as const, args: { by: "req" } },
    ];
    const evidence = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: workflowFinalStateReceipt(),
        brokerTrace: await brokerTrace(),
        diagnosticReceipt:
          '{"tool":"kb_query","status":"success","telemetry":null}\n',
      },
    );
    expect(evidence.finalState.claims).toContainEqual({
      key: "workflow-outcome",
      value: "complete",
    });
    expect(evidence.finalState.claims).toContainEqual({
      key: "workflow-proof-state",
      value: "unresolved",
    });
    expect(evidence.finalState.closeout).toEqual({
      taskOutcome: "complete",
      kbState: "clean_fresh",
      verificationState: "fresh",
      proofState: "unresolved",
      limitationDisposition: "not_applicable",
    });
    expect(scoreCell(manifest, evidence).criticalFailures).toEqual([]);
  });

  test("binds authentic final-state MCP output and derives evaluator claims", async () => {
    const manifest = evaluatorManifest("predicate");
    const requests = [
      { tool: "kb_query" as const, args: {} },
      { tool: "kb_check" as const, args: {} },
      { tool: "kb_status" as const, args: {} },
    ];
    const evidence = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState: finalStateReceipt(),
        brokerTrace: await brokerTrace(),
        diagnosticReceipt:
          '{"tool":"kb_query","status":"success","telemetry":{"attempt_number":1}}\n',
      },
    );

    expect(evidence.finalState.integrityValid).toBe(true);
    expect(evidence.finalState.complete).toBe(true);
    expect(evidence.finalState.claims).toContainEqual({
      key: "final-predicate",
      value: true,
    });
    expect(evidence.finalState.claims).toContainEqual({
      key: "workspace-isolated",
      value: 0,
    });
    expect(evidence.broker.orderedCalls).toEqual([
      { tool: "kb_query", predicate: "sequence=1" },
    ]);
    expect(evidence.broker.integrityValid).toBe(true);
    expect(evidence.broker.complete).toBe(true);
    expect(evidence.diagnostic.integrityValid).toBe(true);
    expect(evidence.diagnostic.complete).toBe(true);
    expect(scoreCell(manifest, evidence).terminalCategory).toBeNull();
  });

  test("marks a tampered broker hash chain as conflicting evidence", async () => {
    const manifest = evaluatorManifest("predicate");
    const trace = await brokerTrace();
    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
      },
      {
        finalState: finalStateReceipt(),
        brokerTrace: trace.replace(
          '"method":"initialize"',
          '"method":"tampered"',
        ),
        diagnosticReceipt:
          '{"tool":"kb_query","status":"success","telemetry":{"attempt_number":1}}\n',
      },
    );

    expect(evidence.broker.integrityValid).toBe(false);
    expect(scoreCell(manifest, evidence).terminalCategory).toBe(
      "evidence_conflict",
    );
  });

  test("marks a diagnostic receipt for a different tool as conflicting evidence", async () => {
    const manifest = evaluatorManifest("predicate");
    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
      },
      {
        finalState: finalStateReceipt(),
        brokerTrace: await brokerTrace(),
        diagnosticReceipt:
          '{"tool":"kb_status","status":"success","telemetry":{"attempt_number":1}}\n',
      },
    );

    expect(evidence.diagnostic.integrityValid).toBe(false);
    expect(scoreCell(manifest, evidence).terminalCategory).toBe(
      "evidence_conflict",
    );
  });

  test("marks a failed diagnostic record as conflicting evidence", async () => {
    const manifest = evaluatorManifest("predicate");
    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
      },
      {
        finalState: finalStateReceipt(),
        brokerTrace: await brokerTrace(),
        diagnosticReceipt:
          '{"tool":"kb_query","status":"error","telemetry":{"attempt_number":1}}\n',
      },
    );

    expect(evidence.diagnostic.integrityValid).toBe(false);
    expect(scoreCell(manifest, evidence).terminalCategory).toBe(
      "evidence_conflict",
    );
  });

  test("accepts a matching successful diagnostic record without optional telemetry", async () => {
    const manifest = evaluatorManifest("predicate");
    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
      },
      {
        finalState: finalStateReceipt(),
        brokerTrace: await brokerTrace(),
        diagnosticReceipt:
          '{"tool":"kb_query","status":"success","telemetry":null,"telemetry_status":"missing"}\n',
      },
    );

    expect(evidence.diagnostic.integrityValid).toBe(true);
    expect(scoreCell(manifest, evidence).terminalCategory).toBeNull();
  });

  test("scores no model-originated MCP call as behavioral with an empty diagnostic multiset", async () => {
    const manifest = evaluatorManifest("predicate");
    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
      },
      {
        finalState: finalStateReceipt(),
        brokerTrace: await brokerTraceWithoutToolCalls(),
        diagnosticReceipt: "",
      },
    );

    expect(evidence.broker).toMatchObject({
      complete: true,
      integrityValid: true,
      orderedCalls: [],
    });
    expect(evidence.diagnostic).toMatchObject({
      complete: true,
      integrityValid: true,
    });
    expect(scoreCell(manifest, evidence)).toMatchObject({
      terminalCategory: "behavioral_failure",
      score: 75,
      components: { finalState: 60, protocol: 0, isolation: 15 },
    });
  });

  test("requires success receipts only for successfully completed broker calls", async () => {
    const manifest = evaluatorManifest("predicate");
    const evidence = sealDefaultCellEvidence(
      {
        evaluatorManifest: manifest,
        finalStateRequests: [
          { tool: "kb_query", args: {} },
          { tool: "kb_check", args: {} },
          { tool: "kb_status", args: {} },
        ],
      },
      {
        finalState: finalStateReceipt(),
        brokerTrace: await brokerTraceWithFailedThenSuccessfulCall(),
        diagnosticReceipt:
          '{"tool":"kb_query","status":"success","telemetry":null}\n',
      },
    );

    expect(evidence.broker.orderedCalls).toEqual([
      { tool: "kb_query", predicate: "sequence=1" },
      { tool: "kb_query", predicate: "sequence=2" },
    ]);
    expect(evidence.diagnostic.integrityValid).toBe(true);
    expect(scoreCell(manifest, evidence).terminalCategory).toBeNull();
  });

  test("requires the exact public safe-mutation ownership and coverage links", async () => {
    const manifest = safeMutationManifest();
    const options = {
      evaluatorManifest: manifest,
      finalStateRequests: [
        { tool: "kb_query" as const, args: {} },
        { tool: "kb_check" as const, args: {} },
        { tool: "kb_status" as const, args: {} },
      ],
    };
    const complete = sealDefaultCellEvidence(options, {
      finalState: safeMutationFinalState(true),
      brokerTrace: await brokerTrace(),
      diagnosticReceipt:
        '{"tool":"kb_query","status":"success","telemetry":null}\n',
    });
    const missingCoverage = sealDefaultCellEvidence(options, {
      finalState: safeMutationFinalState(false),
      brokerTrace: await brokerTrace(),
      diagnosticReceipt:
        '{"tool":"kb_query","status":"success","telemetry":null}\n',
    });

    expect(complete.finalState.claims).toContainEqual({
      key: "final-safe-mutation-direction",
      value: true,
    });
    expect(missingCoverage.finalState.claims).toContainEqual({
      key: "final-safe-mutation-direction",
      value: false,
    });
  });
});
