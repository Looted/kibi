import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

describe("default Codex cell evidence sealing", () => {
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
});
