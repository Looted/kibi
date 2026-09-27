import { describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrologProcess, resolveKbPlPath } from "../../src/prolog.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";

import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import {
  coverageSpec,
  findGapsSpec,
  graphSpec,
} from "../../src/public/operations/specs/reporting.js";

function contextWithPayload(payload: Readonly<Record<string, unknown>>): {
  readonly context: OperationContext & { readonly prolog: PrologPort };
  readonly query: ReturnType<typeof mock>;
} {
  const query = mock(async () => ({
    success: true,
    bindings: { JsonString: JSON.stringify(payload) },
  }));
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    context: {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(0),
      prolog,
      git: {
        revParse: async () => "main",
        showToplevel: async () => process.cwd(),
        workspaceSnapshot: async () => ({
          version: "kibi.workspace-snapshot.v2",
          hash: "a".repeat(64),
          dirty: true,
          fileCount: 42,
        }),
      },
    },
    query,
  };
}

function queryContaining(
  query: ReturnType<typeof mock>,
  fragment: string,
): string {
  const goal = query.mock.calls
    .map(([candidate]) => String(candidate))
    .find((candidate) => candidate.includes(fragment));
  if (goal === undefined) {
    throw new Error(`Expected a Prolog query containing ${fragment}`);
  }
  return goal;
}

describe("shared reporting operation executors", () => {
  test("findGapsSpec.execute applies pagination defaults and returns rows", async () => {
    const { context, query } = contextWithPayload({
      rows: [{ id: "REQ-001" }],
      count: 1,
    });

    const result = await findGapsSpec.execute(
      { type: "req", missingRelationships: ["specified_by"] },
      context,
    );

    expect(result.structuredContent?.count).toBe(1);
    expect(result.content[0]?.text).toContain("REQ-001");
    expect(queryContaining(query, "find_gaps_json")).toContain(
      "find_gaps_json('req', ['specified_by'], [], [], none, 100, 0, JsonString)",
    );
  });

  test("coverageSpec.execute preserves passing and transitive defaults", async () => {
    const { context, query } = contextWithPayload({
      summary: { total: 2, fullyCovered: 1, proofProven: 0 },
      rows: [],
    });

    const result = await coverageSpec.execute({}, context);

    expect(result.content[0]?.text).toBe(
      "Coverage summary: 1 structurally covered and 0 proven out of 2.",
    );
    expect(queryContaining(query, "coverage_report_json")).toContain(
      `coverage_report_json('req', [], false, true, 100, 0, '${"a".repeat(64)}', '1970-01-01T00:00:00.000Z', 604800, JsonString)`,
    );
    expect(result.structuredContent?.meta).toMatchObject({
      proofReceiptMaxAgeSeconds: 604800,
      proofSnapshot: "a".repeat(64),
      proofSnapshotAvailable: true,
      proofSnapshotDirty: true,
      proofSnapshotFileCount: 42,
      proofSnapshotVersion: "kibi.workspace-snapshot.v2",
    });
  });

  test("coverageSpec.execute refuses to turn an unavailable snapshot into proof", async () => {
    const { context, query } = contextWithPayload({
      summary: { total: 1, fullyCovered: 1, proofProven: 0 },
      rows: [],
    });
    const withoutSnapshot = { ...context, git: undefined };

    const result = await coverageSpec.execute({}, withoutSnapshot);

    expect(queryContaining(query, "coverage_report_json")).toContain(
      "100, 0, 'unknown', '1970-01-01T00:00:00.000Z', 604800, JsonString)",
    );
    expect(result.structuredContent?.meta).toMatchObject({
      proofSnapshot: "unknown",
      proofSnapshotAvailable: false,
      proofSnapshotError:
        "The active operation runtime does not expose workspace snapshots.",
    });
  });

  test("coverageSpec.execute attaches a deterministic read-only repair plan", async () => {
    const { context } = contextWithPayload({
      summary: {
        total: 1,
        fullyCovered: 0,
        proofProven: 0,
        proofMissing: 1,
        proofUnresolved: 0,
      },
      rows: [
        {
          id: "REQ-PLAN-001",
          proofStatus: "missing",
          proofGaps: ["missing_logic_claims", "missing_semantic_inventory"],
          proofRepairs: [
            {
              gap: "missing_semantic_inventory",
              priority: 10,
              stage: "semantic_inventory",
              action: "Analyze prose.",
            },
            {
              gap: "missing_logic_claims",
              priority: 30,
              stage: "logic_grounding",
              action: "Persist claims.",
            },
          ],
          proofStages: {
            semanticInventory: { status: "missing" },
            logicGrounding: { status: "blocked" },
          },
        },
      ],
    });

    const first = await coverageSpec.execute({}, context);
    const second = await coverageSpec.execute({}, context);

    expect(first.structuredContent?.repairPlan).toMatchObject({
      version: "kibi.repair-plan.v1",
      readOnly: true,
      status: "ready",
      codeSnapshot: "a".repeat(64),
      scope: { complete: true },
      summary: { requirementCount: 1, repairCount: 2, batchCount: 2 },
    });
    expect(first.structuredContent?.repairPlan?.batches[0]?.phase).toBe(
      "semantic_inventory",
    );
    expect(first.structuredContent?.repairPlan?.batches[1]).toMatchObject({
      phase: "manifest_links",
      state: "blocked",
      dependsOn: [first.structuredContent?.repairPlan?.batches[0]?.id],
    });
    expect(second.structuredContent?.repairPlan?.planId).toBe(
      first.structuredContent?.repairPlan?.planId,
    );
  });

  test("graphSpec.execute preserves traversal defaults and explicit bounds", async () => {
    const { context, query } = contextWithPayload({
      nodes: [{ id: "REQ-001" }],
      edges: [],
      truncated: false,
    });

    const result = await graphSpec.execute(
      { seedIds: ["REQ-001"], depth: 5, maxNodes: 40, maxEdges: 80 },
      context,
    );

    expect(result.content[0]?.text).toContain("1 nodes and 0 edges");
    expect(queryContaining(query, "graph_expand_json")).toContain(
      "graph_expand_json(['REQ-001'], [], 'outgoing', 5, [], 40, 80, JsonString)",
    );
  });

  test("graphSpec.execute rejects traversal depth above five", async () => {
    const { context } = contextWithPayload({
      nodes: [],
      edges: [],
      truncated: false,
    });

    await expect(
      graphSpec.execute({ seedIds: ["REQ-001"], depth: 6 }, context),
    ).rejects.toThrow("Graph depth must be between 1 and 5");
  });
});

describe("coverage binding discovery after receipt accumulation", () => {
  test("keeps per-contract coverage and the interactive engine alive above its output limit", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-coverage-receipt-history-"));
    const store = join(root, "store");
    const modulePath = join(root, "fixture.pl");
    const prolog = new PrologProcess({ oneShot: false, timeout: 30000 });
    const previousBindingMode = process.env.KIBI_PROOF_BINDING_MODE;
    const goals: string[] = [];
    const quote = (value: string) => value.replaceAll("'", "''");
    writeFileSync(join(root, "contract.md"), "# Synthetic contracted test\n");
    writeFileSync(
      modulePath,
      `
:- module(coverage_history_fixture, [seed/0]).
:- use_module('${quote(resolveKbPlPath())}').
:- use_module(library(http/json)).
seed :-
    format(string(Padding), '~*c', [9437184, 120]),
    format(string(History), '[{"history":"~s"}]', [Padding]),
    atom_json_dict(ContractAtom, _{version:'kibi.proof-contract.v1', integration:'synthetic', required_proofs:[_{symbol_id:'SYM-SYNTHETIC',target:default}], success_policy:all_required_first_attempt}, []),
    atom_string(ContractAtom, Contract),
    kb_assert_entity(test, [id='TEST-SYNTHETIC-HISTORY', title="Synthetic history", status=active, created_at="2026-08-10T00:00:00Z", updated_at="2026-08-10T00:00:00Z", source="contract.md", proof_contract=Contract, proof_bindings="[]", proof_receipts=History]).
`,
    );
    try {
      process.env.KIBI_PROOF_BINDING_MODE = "per-contract";
      await prolog.start();
      const attached = await prolog.query(`kb_attach('${quote(store)}')`);
      expect(attached.success).toBe(true);
      const loaded = await prolog.query(`use_module('${quote(modulePath)}')`);
      expect(loaded.success).toBe(true);
      const seeded = await prolog.query("coverage_history_fixture:seed");
      expect(seeded.success).toBe(true);
      const { context } = contextWithPayload({});
      const port = {
        ...context.prolog,
        query: async (goal: string) => {
          goals.push(goal);
          return prolog.query(goal);
        },
        // Match the concrete engine's module-loading path in this owned fixture.
        storageStatus: async () => ({ success: true, bindings: {} }),
      };
      const result = await coverageSpec.execute(
        { limit: 1 },
        {
          ...context,
          workspaceRoot: root,
          prolog: port,
          fs: nodeFilesystem,
        },
      );
      expect(result.structuredContent?.summary.total).toBe(0);
      expect(
        goals.some(
          (goal) =>
            goal.includes("per_contract") &&
            goal.includes("TEST-SYNTHETIC-HISTORY"),
        ),
      ).toBe(true);
      expect(prolog.isRunning()).toBe(true);
      expect((await prolog.query("X=42")).bindings.X).toBe("42");
    } finally {
      if (previousBindingMode === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
      } else {
        process.env.KIBI_PROOF_BINDING_MODE = previousBindingMode;
      }
      await prolog.terminate();
      rmSync(root, { recursive: true, force: true });
    }
  }, 60000);

  test("reports an operational binding-query failure before issuing coverage", async () => {
    const { context } = contextWithPayload({});
    const goals: string[] = [];
    const failingContext = {
      ...context,
      prolog: {
        ...context.prolog,
        query: async (goal: string) => {
          goals.push(goal);
          return {
            success: false,
            bindings: {},
            error: "Query exceeded bounded Prolog output capacity (ENOBUFS)",
          };
        },
      },
    };
    const previousBindingMode = process.env.KIBI_PROOF_BINDING_MODE;
    try {
      process.env.KIBI_PROOF_BINDING_MODE = "per-contract";
      await expect(coverageSpec.execute({}, failingContext)).rejects.toThrow(
        "Per-contract receipt binding query failed: Query exceeded bounded Prolog output capacity (ENOBUFS)",
      );
      expect(goals).toHaveLength(1);
      expect(goals[0]).toContain("kb_query_proof_contracts");
    } finally {
      if (previousBindingMode === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_PROOF_BINDING_MODE");
      } else {
        process.env.KIBI_PROOF_BINDING_MODE = previousBindingMode;
      }
    }
  });
});
