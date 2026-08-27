import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { compileIntentSpec } from "../../src/public/operations/specs/planning.js";

function contextFor(
  query: (goal: string) => Promise<PrologQueryResult>,
): OperationContext {
  const prolog: PrologPort = {
    query,
    queryStatusJson: async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "develop",
          snapshotId: "stamp:test",
          syncedAt: "2026-08-13T00:00:00Z",
          dirty: false,
          syncState: "fresh",
        }),
      },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog,
    fs: {
      readFile: async () => "source\n",
      writeFile: async () => undefined,
      mkdir: async () => undefined,
      stat: async () => ({ isFile: () => true, isDirectory: () => false }),
    },
    git: {
      revParse: async () => "develop",
      showToplevel: async () => process.cwd(),
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 3,
      }),
    },
  };
}

describe("kb_compile_intent", () => {
  const originalBranch = process.env.KIBI_BRANCH;

  beforeEach(() => {
    process.env.KIBI_BRANCH = "test-branch";
  });

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });
  test("emits a deterministic strict-property plan for a new requirement", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      if (goal.includes("kb_entity('REQ-"))
        return { success: true, bindings: { Results: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });

    const result = await compileIntentSpec.execute(
      { intent: "Customer data must be retained for 7 years.", mode: "create" },
      contextFor(query),
    );
    const plan = result.structuredContent;
    expect(plan.version).toBe("kibi.compile-plan.v1");
    expect(plan.status).toBe("ready");
    expect(plan.target.requirementId).toMatch(
      /^REQ-customer-data-must-be-retained-for-7-years-[A-F0-9]{8}$/,
    );
    expect(plan.propositions).toHaveLength(1);
    expect(plan.propositions[0]?.disposition).toBe("strict_property");
    expect(plan.steps.some((step) => step.type === "fact")).toBe(true);
    expect(plan.steps.some((step) => step.type === "req")).toBe(true);
    expect(plan.planHash).toHaveLength(64);
    expect(plan.planHash).toBe(
      (
        await compileIntentSpec.execute(
          {
            intent: "Customer data must be retained for 7 years.",
            mode: "create",
          },
          contextFor(query),
        )
      ).structuredContent.planHash,
    );
  });

  test("fails closed when an update target is ambiguous", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return { success: true, bindings: { Rows: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return {
        success: true,
        bindings: {
          Results:
            '[[REQ-A,req,[title="Customer retention",status=open]],[REQ-B,req,[title="Customer retention policy",status=open]]]',
        },
      };
    });
    const plan = (
      await compileIntentSpec.execute(
        { intent: "Customer data must be retained.", mode: "update" },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.status).toBe("needs_resolution");
    expect(
      plan.diagnostics.some((diagnostic) =>
        diagnostic.includes("supply requirementId"),
      ),
    ).toBe(true);
  });

  test("reports current contradiction witnesses for an explicit update", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("findall([A,B,Reason]"))
        return {
          success: true,
          bindings: { Rows: '[[REQ-A,REQ-B,"retention conflict"]]' },
        };
      if (goal.includes("kb_entity('REQ-A'"))
        return {
          success: true,
          bindings: { Results: '[[REQ-A,req,[title="Existing",status=open]]]' },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-A",
        },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.status).toBe("blocked");
    expect(plan.contradictionAnalysis.witnesses[0]?.reason).toBe(
      "retention conflict",
    );
  });
});
