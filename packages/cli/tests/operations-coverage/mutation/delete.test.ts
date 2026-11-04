import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  executeDelete,
  executeRelationshipDelete,
} from "../../../src/operations/mutation/delete.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../helpers.js";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};
function workspace(files: Record<string, string>) {
  const made = scratch(files);
  cleanups.push(made.cleanup);
  return made.root;
}
function ctx(
  root: string,
  answer: (goal: string) => Answer | undefined,
): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    fs: nodeFilesystem,
    prolog: {
      query: async (goal: string) =>
        answer(goal) ?? { success: true, bindings: { Results: "[]" } },
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(root, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
  } as unknown as OperationContext;
}

const SHARD = [
  "relationships:",
  "  - id: rel-a",
  "    type: implements",
  "    from: SYM-A",
  "    to: REQ-X",
  "    created_at: '2026-01-01T00:00:00Z'",
  "    created_by: test",
  "    source: test",
  "",
].join("\n");
const REQ_DOC = [
  "---",
  "id: REQ-MD",
  "type: req",
  "relationships:",
  "  - type: verified_by",
  "    target: TEST-MD",
  "---",
  "",
  "body",
  "",
].join("\n");

describe("relationship delete dry run", () => {
  test("lists the shard and source writes without changing them", async () => {
    const root = workspace({
      ".kb/relationships/ab.yaml": SHARD,
      ".kb/requirements/REQ-MD.md": REQ_DOC,
    });
    const result = await executeDelete(
      {
        relationships: [
          { type: "implements", from: "SYM-A", to: "REQ-X" },
          { type: "verified_by", from: "REQ-MD", to: "TEST-MD" },
        ],
        dryRun: true,
      },
      ctx(root, (goal): Answer | undefined => {
        if (goal.includes("findall(['REQ-MD'"))
          return {
            success: true,
            bindings: {
              Results: `[['REQ-MD',req,[id='REQ-MD',source=".kb/requirements/REQ-MD.md"]]]`,
            },
          };
        if (goal.includes("kb_relationship(implements"))
          return { success: true, bindings: {} };
        if (goal.includes("kb_relationship(verified_by"))
          return { success: false, bindings: {} };
        return undefined;
      }),
    );
    const payload = result.structuredContent;
    expect(payload?.wouldDelete).toStrictEqual({
      entities: 0,
      relationships: 2,
      compiledEdges: 1,
    });
    expect(payload?.sync_required).toBe(true);
    expect(payload?.relationship_results).toMatchObject([
      {
        type: "implements",
        deleted: false,
        shard_records_removed: true,
        compiled_edge_retracted: true,
      },
      {
        type: "verified_by",
        deleted: false,
        shard_records_removed: false,
        compiled_edge_retracted: false,
      },
    ]);
    expect(
      payload?.sourceWrites?.map((write) => write.path).sort(),
    ).toStrictEqual([
      ".kb/relationships/ab.yaml",
      ".kb/requirements/REQ-MD.md",
    ]);
    expect(
      payload?.sourceWrites?.find((write) => write.path.endsWith("REQ-MD.md"))
        ?.beforeHash,
    ).toBe(sha(REQ_DOC));
    expect(
      readFileSync(path.join(root, ".kb/relationships/ab.yaml"), "utf8"),
    ).toBe(SHARD);
    expect(
      readFileSync(path.join(root, ".kb/requirements/REQ-MD.md"), "utf8"),
    ).toBe(REQ_DOC);
  });
});

describe("approved entity deletion plans", () => {
  const FACT_DOC = "---\nid: FACT-AUTH\ntype: fact\n---\nbody\n";
  const authored = (goal: string): Answer | undefined => {
    if (goal.startsWith("once(kb_entity("))
      return { success: true, bindings: {} };
    if (goal.includes("Dependents"))
      return { success: true, bindings: { Dependents: "[]" } };
    if (goal.includes("findall(['FACT-AUTH'"))
      return {
        success: true,
        bindings: {
          Results: `[['FACT-AUTH',fact,[id='FACT-AUTH',type=fact,source=".kb/facts/FACT-AUTH.md"]]]`,
        },
      };
    if (goal.includes("findall(['FACT-PLAIN'"))
      return {
        success: true,
        bindings: {
          Results: "[['FACT-PLAIN',fact,[id='FACT-PLAIN',type=fact]]]",
        },
      };
    return undefined;
  };

  async function planFor(root: string) {
    const returned = await executeDelete(
      { ids: ["FACT-AUTH"] },
      ctx(root, authored),
    );
    return returned.structuredContent?.deletionPlan?.planHash ?? "";
  }

  test("refuses a hash that is not the current plan's", async () => {
    const root = workspace({ ".kb/facts/FACT-AUTH.md": FACT_DOC });
    await expect(
      executeDelete(
        { ids: ["FACT-AUTH"], approvedPlanHash: "b".repeat(64) },
        ctx(root, authored),
      ),
    ).rejects.toMatchObject({ code: "DELETE_PLAN_HASH_MISMATCH" });
  });

  test("refuses a plan that leaves a requested id out", async () => {
    const root = workspace({ ".kb/facts/FACT-AUTH.md": FACT_DOC });
    const returned = await executeDelete(
      { ids: ["FACT-AUTH", "FACT-PLAIN"] },
      ctx(root, authored),
    );
    const planHash = returned.structuredContent?.deletionPlan?.planHash ?? "";
    await expect(
      executeDelete(
        { ids: ["FACT-AUTH", "FACT-PLAIN"], approvedPlanHash: planHash },
        ctx(root, authored),
      ),
    ).rejects.toThrow(
      "kb_delete: approvedPlanHash applies a plan only when every requested id is in it. Remove or fix: Entity FACT-PLAIN was not deleted: this call returned an authored-entity deletion plan. Delete FACT-PLAIN in a separate kb_delete call. Nothing was written.",
    );
  });

  test("applies the approved plan", async () => {
    const root = workspace({ ".kb/facts/FACT-AUTH.md": FACT_DOC });
    const planHash = await planFor(root);
    const result = await executeDelete(
      { ids: ["FACT-AUTH"], approvedPlanHash: planHash.toUpperCase() },
      ctx(root, (goal) =>
        goal.includes("kb_retract") || goal.includes("kb_save")
          ? { success: true, bindings: {} }
          : authored(goal),
      ),
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "plan_applied",
      planHash,
      sourcePaths: [".kb/facts/FACT-AUTH.md"],
    });
    expect(result.content[0]?.text).toContain(
      `Applied deletion plan ${planHash.slice(0, 12)}: deleted `,
    );
    expect(existsSync(path.join(root, ".kb/facts/FACT-AUTH.md"))).toBe(false);
  });

  test("reports the repair an approved plan needs when compiled retraction fails", async () => {
    const root = workspace({ ".kb/facts/FACT-AUTH.md": FACT_DOC });
    const planHash = await planFor(root);
    const result = await executeDelete(
      { ids: ["FACT-AUTH"], approvedPlanHash: planHash },
      ctx(root, (goal) =>
        goal.includes("kb_retract")
          ? { success: false, bindings: {}, error: "store locked" }
          : authored(goal),
      ),
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "plan_applied",
      deleted: 0,
      status: "committed_with_repairs",
      nextActions: [{ operation: "kb_apply_plan", required: true }],
    });
    expect(result.content[0]?.text).toContain(
      "Compiled retraction needs repair; follow nextActions.",
    );
  });
});

describe("executeRelationshipDelete under the workspace lock", () => {
  test("reports the commit to its caller", async () => {
    const root = workspace({ ".kb/requirements/REQ-MD.md": REQ_DOC });
    let committed = 0;
    const payload = await executeRelationshipDelete(
      [{ type: "verified_by", from: "REQ-MD", to: "TEST-MD" }],
      ctx(root, (goal): Answer | undefined => {
        if (goal.includes("findall(['REQ-MD'"))
          return {
            success: true,
            bindings: {
              Results: `[['REQ-MD',req,[id='REQ-MD',source=".kb/requirements/REQ-MD.md"]]]`,
            },
          };
        if (goal.includes("kb_relationship(verified_by"))
          return { success: true, bindings: {} };
        if (
          goal.includes("kb_retract_relationship") ||
          goal.includes("kb_save")
        )
          return { success: true, bindings: {} };
        return undefined;
      }),
      () => {
        committed += 1;
      },
    );
    expect(committed).toBe(1);
    expect(payload.errors).toStrictEqual([]);
    expect(
      readFileSync(path.join(root, ".kb/requirements/REQ-MD.md"), "utf8"),
    ).not.toContain("TEST-MD");
  });
});
