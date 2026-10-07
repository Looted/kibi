import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  normalizeAuthoredSourcePath,
  resolveContainedSourcePath,
  writeSourceForUpsert,
} from "../../src/operations/mutation/source-authoring.js";
import { executeUpsert } from "../../src/operations/mutation/upsert.js";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import { compilePlanHash } from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../helpers/what-if.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function aliasedWorkspace() {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-path-alias-"));
  roots.push(root);
  const physical = path.join(root, "physical");
  const alias = path.join(root, "alias");
  mkdirSync(physical);
  symlinkSync(physical, alias, "dir");
  return { root, physical, alias };
}

function context(workspaceRoot: string): OperationContext {
  return {
    workspaceRoot,
    fs: nodeFilesystem,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-30T00:00:00Z"),
    prolog: {
      query: async (goal): Promise<PrologQueryResult> =>
        isWhatIfGoal(goal)
          ? whatIfResult()
          : String(goal).includes("kb_commit_upsert")
            ? { success: true, bindings: { ChangeKind: "created" } }
            : { success: true, bindings: { Results: "[]" } },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

function sourcePlan(relative: string, body: string) {
  const plan = {
    version: "kibi.compile-plan.v1" as const,
    status: "ready" as const,
    expected: {
      branch: "develop",
      kbSnapshotId: "missing",
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    },
    target: {
      mode: "create" as const,
      context:
        "The fixture requester gave this reason so the plan carries context for the test.",
      requirementId: "REQ-alias",
      selectionReason: "alias regression",
    },
    discovery: { candidates: [], abstained: true },
    propositions: [],
    contradictionAnalysis: { outcome: "no_conflict" as const, witnesses: [] },
    proposals: [],
    steps: [
      {
        type: "req",
        id: "REQ-alias",
        properties: { title: "Alias", status: "open" },
        relationships: [],
        document: { path: relative, body },
      },
    ],
    sourceWrites: [
      {
        path: relative,
        mode: "write" as const,
        beforeHash: null,
        afterHash: createHash("sha256").update(body).digest("hex"),
        body,
      },
    ],
    diagnostics: [],
  };
  return { ...plan, planHash: compilePlanHash(plan) };
}

async function writeShard(workspaceRoot: string) {
  return executeUpsert(
    {
      type: "req",
      id: "REQ-alias",
      properties: { title: "Alias", status: "open" },
      relationships: [
        { type: "relates_to", from: "REQ-alias", to: "REQ-target" },
      ],
    },
    { ...context(workspaceRoot), sourceFirst: false },
  );
}

describe("canonical workspace aliases preserve source containment", () => {
  test("normalizes both absolute root spellings and writes a missing source suffix", async () => {
    const { physical, alias } = aliasedWorkspace();
    const relative = "docs/new/REQ-alias.md";
    expect(
      normalizeAuthoredSourcePath(alias, path.join(physical, relative)),
    ).toBe(relative);
    expect(normalizeAuthoredSourcePath(alias, path.join(alias, relative))).toBe(
      relative,
    );
    const written = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-alias",
        properties: { title: "Alias", status: "open" },
        document: { path: relative, body: "authored body\n" },
      },
      { id: "REQ-alias", type: "req", title: "Alias", status: "open" },
      undefined,
      context(alias),
    );
    expect(written?.receipt.path).toBe(relative);
    expect(readFileSync(path.join(physical, relative), "utf8")).toContain(
      "authored body\n",
    );
    expect(() => resolveContainedSourcePath(alias, "../outside.md")).toThrow(
      /traversal/,
    );
    expect(() =>
      resolveContainedSourcePath(alias, ".kb/branches/runtime.md"),
    ).toThrow(/derived state/);
  });

  test("applies a source-write plan through an aliased root without changing its relative identity", async () => {
    const { physical, alias } = aliasedWorkspace();
    const plan = sourcePlan("docs/new/compiled.md", "compiled body\n");
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(alias),
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      changedPaths: ["docs/new/compiled.md"],
    });
    expect(
      readFileSync(path.join(physical, "docs/new/compiled.md"), "utf8"),
    ).toBe("compiled body\n");
  });

  test("publishes a relationship shard through an aliased workspace root", async () => {
    const { physical, alias } = aliasedWorkspace();
    const result = await writeShard(alias);
    expect(result.structuredContent?.relationships_created).toBe(1);
    const directory = path.join(physical, ".kb/relationships");
    const shards = readdirSync(directory).filter((name) =>
      name.endsWith(".yaml"),
    );
    expect(shards).toHaveLength(1);
    const shard = shards[0];
    if (shard === undefined)
      throw new Error("Expected a published relationship shard");
    expect(readFileSync(path.join(directory, shard), "utf8")).toContain(
      "REQ-target",
    );
  });

  test.each(["source", "plan", "relationship"] as const)(
    "%s still refuses a genuine external symlink beneath an aliased root",
    async (operation) => {
      const { root, physical, alias } = aliasedWorkspace();
      const outside = path.join(root, "outside");
      mkdirSync(outside);
      writeFileSync(path.join(outside, "sentinel.md"), "unchanged\n");
      if (operation === "relationship") {
        mkdirSync(path.join(physical, ".kb"));
        symlinkSync(outside, path.join(physical, ".kb/relationships"), "dir");
        await expect(writeShard(alias)).rejects.toThrow(
          /symlink outside the workspace/,
        );
      } else {
        symlinkSync(outside, path.join(physical, "escape"), "dir");
        if (operation === "source")
          expect(() =>
            resolveContainedSourcePath(alias, "escape/new.md"),
          ).toThrow(/outside the workspace/);
        else {
          const plan = sourcePlan("escape/new.md", "must not publish\n");
          await expect(
            executeApplyPlan(
              { plan, approvedPlanHash: plan.planHash },
              context(alias),
            ),
          ).rejects.toThrow(/symlink outside the workspace/);
        }
      }
      expect(readdirSync(outside)).toEqual(["sentinel.md"]);
      expect(readFileSync(path.join(outside, "sentinel.md"), "utf8")).toBe(
        "unchanged\n",
      );
    },
  );

  test.each(["source", "plan", "relationship"] as const)(
    "%s refuses a dangling external symlink without creating its target",
    async (operation) => {
      const { root, physical, alias } = aliasedWorkspace();
      const outside = path.join(root, "missing-outside");
      if (operation === "relationship") {
        mkdirSync(path.join(physical, ".kb"));
        symlinkSync(outside, path.join(physical, ".kb/relationships"), "dir");
        await expect(writeShard(alias)).rejects.toThrow();
      } else {
        symlinkSync(outside, path.join(physical, "dangling"), "dir");
        if (operation === "source")
          expect(() =>
            resolveContainedSourcePath(alias, "dangling/new.md"),
          ).toThrow();
        else {
          const plan = sourcePlan("dangling/new.md", "must not publish\n");
          await expect(
            executeApplyPlan(
              { plan, approvedPlanHash: plan.planHash },
              context(alias),
            ),
          ).rejects.toThrow();
        }
      }
      expect(existsSync(outside)).toBe(false);
    },
  );
});
