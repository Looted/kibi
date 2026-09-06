import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  effectiveRelationships,
  executeUpsert,
  validateAppendOnlyProofReceipts,
} from "../../src/operations/mutation/upsert.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

function attachment(workspaceRoot: string, migrationRequired = false) {
  return {
    gitBranch: "develop",
    kbBranch: "develop",
    storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
    kind: "exact" as const,
    migrationRequired,
  };
}

type LooseQueryResult = {
  success: boolean;
  bindings: Record<string, string | undefined>;
  error?: string;
};

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => Promise<LooseQueryResult> | LooseQueryResult,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async (goal) =>
      (await query(
        Array.isArray(goal) ? goal.join(", ") : goal,
      )) as PrologQueryResult,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    prolog,
    branchAttachment: attachment(workspaceRoot),
    ...extras,
  };
}

describe("upsert helpers and executeUpsert guards", () => {
  test("validateAppendOnlyProofReceipts skips non-tests and empty history", async () => {
    const ctx = contextFor("/tmp", async () => ({
      success: true,
      bindings: { Results: "[]" },
    }));
    await validateAppendOnlyProofReceipts({ id: "REQ-1", type: "req" }, ctx);
    await validateAppendOnlyProofReceipts({ id: "TEST-1", type: "test" }, ctx);
  });

  test("validateAppendOnlyProofReceipts rejects truncated receipt history", async () => {
    const ctx = contextFor("/tmp", async (goal) => {
      if (goal.includes("kb_entity")) {
        return {
          success: true,
          bindings: {
            Results:
              "[['TEST-KEEP',test,[id='TEST-KEEP',proof_receipts=\"[{\\\"version\\\":\\\"kibi.proof-receipt.v1\\\"}]\"]]]",
          },
        };
      }
      return { success: true, bindings: { Results: "[]" } };
    });
    await expect(
      validateAppendOnlyProofReceipts(
        { id: "TEST-KEEP", type: "test", proof_receipts: [] },
        ctx,
      ),
    ).rejects.toThrow(/append-only/);
  });

  test("effectiveRelationships returns input when the entity is new", async () => {
    const ctx = contextFor("/tmp", async () => ({
      success: false,
      bindings: {},
    }));
    const input = {
      type: "req",
      id: "REQ-NEW",
      properties: {},
      relationships: [{ type: "verified_by", from: "REQ-NEW", to: "TEST-1" }],
    };
    expect(
      await effectiveRelationships(
        input,
        { id: "REQ-NEW", type: "req" },
        input.relationships,
        ctx,
      ),
    ).toEqual(input.relationships);
  });

  test("effectiveRelationships swallows Error lookups and rethrows non-Errors", async () => {
    const errorCtx = contextFor("/tmp", async (goal) => {
      if (goal.includes("once(kb_entity")) {
        return { success: true, bindings: {} };
      }
      throw new Error("lookup exploded");
    });
    const input = {
      type: "req",
      id: "REQ-ERR",
      properties: {},
      relationships: [{ type: "verified_by", from: "REQ-ERR", to: "TEST-1" }],
    };
    expect(
      await effectiveRelationships(
        input,
        { id: "REQ-ERR", type: "req" },
        input.relationships,
        errorCtx,
      ),
    ).toEqual(input.relationships);

    const rethrowCtx = contextFor("/tmp", async (goal) => {
      if (goal.includes("once(kb_entity")) {
        return { success: true, bindings: {} };
      }
      throw "not-an-error";
    });
    await expect(
      effectiveRelationships(
        input,
        { id: "REQ-ERR", type: "req" },
        input.relationships,
        rethrowCtx,
      ),
    ).rejects.toBe("not-an-error");
  });

  test("executeUpsert requires Prolog and blocks legacy branch storage", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-cov-"));
    workspaces.push(root);
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-NOPROLOG",
          properties: { title: "No prolog", status: "open" },
        },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00.000Z"),
          branchAttachment: attachment(root),
        },
      ),
    ).rejects.toThrow(/Prolog runtime/);

    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-LEGACY",
          properties: { title: "Legacy", status: "open" },
        },
        contextFor(
          root,
          async () => ({ success: true, bindings: {} }),
          {
            fs: nodeFilesystem,
            branchAttachment: attachment(root, true),
          },
        ),
      ),
    ).rejects.toThrow(/legacy branch storage/);

    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-BRANCH",
          properties: { title: "Branch", status: "open" },
        },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00.000Z"),
          branchAttachment: { error: "detached HEAD" } as never,
        },
      ),
    ).rejects.toThrow(/Unable to resolve KB branch/);
  });

  test("executeUpsert writes authored source and accepts quoted change kinds", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-src-"));
    workspaces.push(root);
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-SOURCE",
        properties: { title: "Source", status: "open" },
        document: { path: "docs/REQ-SOURCE.md", body: "must retain data\n" },
      },
      contextFor(
        root,
        async (goal) => {
          if (goal.startsWith("kb_commit_upsert(")) {
            return { success: true, bindings: { ChangeKind: "'created'" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent).toMatchObject({
      created: 1,
      sourceWrites: [expect.objectContaining({ path: "docs/REQ-SOURCE.md" })],
    });
  });

  test("executeUpsert rolls back source writes when commit fails and rejects unknown ChangeKind", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-fail-"));
    workspaces.push(root);
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-FAIL",
          properties: { title: "Fail", status: "open" },
          document: { path: "docs/REQ-FAIL.md", body: "fail\n" },
        },
        contextFor(
          root,
          async (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              return { success: false, bindings: {}, error: "constraint" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem },
        ),
      ),
    ).rejects.toThrow(/constraint/);

    const kind = await executeUpsert(
      {
        type: "req",
        id: "REQ-KIND",
        properties: { title: "Kind", status: "open" },
      },
      contextFor(root, async (goal) => {
        if (goal.startsWith("kb_commit_upsert(")) {
          return { success: true, bindings: { ChangeKind: "mutated" } };
        }
        return { success: true, bindings: { Results: "[]" } };
      }),
    );
    expect(kind.structuredContent?.status).toBe("committed_with_repairs");
    expect(kind.content[0]?.text).toContain("derived effect requires repair");
  });

  test("executeUpsert appends relationship shards and restores them when commit fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-shard-"));
    workspaces.push(root);
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-SHARD-FAIL",
          properties: { title: "Shard fail", status: "open" },
          relationships: [
            {
              type: "relates_to",
              from: "REQ-SHARD-FAIL",
              to: "REQ-SHARD-TO",
            },
          ],
        },
        contextFor(
          root,
          async (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              return { success: false, bindings: {}, error: "rdf reject" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/rdf reject/);
    const relDir = path.join(root, ".kb", "relationships");
    const shards = existsSync(relDir)
      ? readdirSync(relDir).filter((name) => name.endsWith(".yaml"))
      : [];
    expect(shards).toEqual([]);
  });

  test("executeUpsert keeps a concurrently rewritten shard and writes pending receipts on success", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-shard-ok-"));
    workspaces.push(root);
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-SHARD-OK",
        properties: { title: "Shard ok", status: "open" },
        relationships: [
          {
            type: "relates_to",
            from: "REQ-SHARD-OK",
            to: "REQ-SHARD-TO",
          },
        ],
      },
      contextFor(
        root,
        async (goal) => {
          if (goal.startsWith("kb_commit_upsert(")) {
            return { success: true, bindings: { ChangeKind: "created" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem, sourceFirst: false },
      ),
    );
    expect(result.structuredContent?.relationships_created).toBe(1);
    expect(result.structuredContent?.sourceWrites?.some((write) =>
      write.path.startsWith(".kb/relationships/"),
    )).toBe(true);
    const pendingRoot = path.join(root, ".kb", "recovery", "pending-sources");
    expect(existsSync(pendingRoot)).toBe(true);
    expect(readdirSync(pendingRoot).some((name) => name.endsWith(".json"))).toBe(
      true,
    );
  });

  test("executeUpsert skips source writes when sourceFirst is false and when the live source is mcp://", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-srcfirst-"));
    workspaces.push(root);
    const skipped = await executeUpsert(
      {
        type: "req",
        id: "REQ-SKIP-SRC",
        properties: { title: "Skip", status: "open" },
        document: { path: "docs/REQ-SKIP-SRC.md", body: "should not write\n" },
      },
      contextFor(
        root,
        async (goal) => {
          if (goal.startsWith("kb_commit_upsert(")) {
            return { success: true, bindings: { ChangeKind: "created" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem, sourceFirst: false },
      ),
    );
    expect(skipped.structuredContent?.sourceWrites).toBeUndefined();
    expect(existsSync(path.join(root, "docs", "REQ-SKIP-SRC.md"))).toBe(false);

    const mcp = await executeUpsert(
      {
        type: "req",
        id: "REQ-MCP",
        properties: { title: "Mcp", status: "open" },
      },
      contextFor(
        root,
        async (goal) => {
          if (goal.includes("findall(") && goal.includes("kb_entity(")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['REQ-MCP',req,[id='REQ-MCP',type=req,title='Mcp',status=open,source='mcp://kibi/upsert']]]",
              },
            };
          }
          if (goal.startsWith("kb_commit_upsert(")) {
            return { success: true, bindings: { ChangeKind: "updated" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(mcp.structuredContent?.updated).toBe(1);
    expect(mcp.structuredContent?.sourceWrites).toBeUndefined();
  });

  test("executeUpsert rejects a relationship shard that follows a symlink outside the workspace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-symlink-"));
    workspaces.push(root);
    const outside = await mkdtemp(path.join(tmpdir(), "kibi-upsert-outside-"));
    workspaces.push(outside);
    mkdirSync(path.join(root, ".kb"));
    symlinkSync(outside, path.join(root, ".kb", "relationships"));
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-LINK",
          properties: { title: "Link", status: "open" },
          relationships: [
            { type: "relates_to", from: "REQ-LINK", to: "REQ-LINK-TO" },
          ],
        },
        contextFor(
          root,
          async (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              return { success: true, bindings: { ChangeKind: "created" } };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/symlink outside the workspace/);
  });

  test("executeUpsert skips shard rollback when the file changed after the write", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-drift-"));
    workspaces.push(root);
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-DRIFT",
          properties: { title: "Drift", status: "open" },
          relationships: [
            { type: "relates_to", from: "REQ-DRIFT", to: "REQ-DRIFT-TO" },
          ],
        },
        contextFor(
          root,
          async (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              const relDir = path.join(root, ".kb", "relationships");
              if (existsSync(relDir)) {
                for (const name of readdirSync(relDir)) {
                  if (!name.endsWith(".yaml")) continue;
                  const shardPath = path.join(relDir, name);
                  writeFileSync(
                    shardPath,
                    `${readFileSync(shardPath, "utf8")}\n# concurrent rewrite\n`,
                  );
                }
              }
              return { success: false, bindings: {}, error: "commit lost" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/commit lost/);
    const relDir = path.join(root, ".kb", "relationships");
    const shards = existsSync(relDir)
      ? readdirSync(relDir).filter((name) => name.endsWith(".yaml"))
      : [];
    expect(shards.length).toBe(1);
    expect(
      readFileSync(path.join(relDir, shards[0] ?? ""), "utf8"),
    ).toContain("concurrent rewrite");
  });

  test("executeUpsert writes existing markdown sources and skips contradiction checks", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-md-"));
    workspaces.push(root);
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-EXIST",
        properties: { title: "Exist", status: "open" },
        _skipContradictionCheck: true,
      },
      contextFor(
        root,
        async (goal) => {
          if (goal.includes("findall(") && goal.includes("kb_entity(")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['REQ-EXIST',req,[id='REQ-EXIST',type=req,title='Exist',status=open,source='docs/REQ-EXIST.md']]]",
              },
            };
          }
          if (goal.startsWith("kb_commit_upsert(")) {
            return { success: true, bindings: { ChangeKind: "updated" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent?.updated).toBe(1);
    expect(result.structuredContent?.contradictionCheck?.outcome).toBe("skipped");
    expect(existsSync(path.join(root, "docs", "REQ-EXIST.md"))).toBe(true);
  });

  test("executeUpsert skips incomplete relationship tuples and reports skip-contradiction for reqs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-upsert-relskip-"));
    workspaces.push(root);
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-SKIP-REL",
        properties: { title: "Skip rel", status: "open" },
        relationships: [
          { type: "relates_to", from: "REQ-SKIP-REL", to: "REQ-OTHER" },
        ],
      },
      contextFor(
        root,
        async (goal) => {
          if (goal.startsWith("kb_commit_upsert(")) {
            return { success: true, bindings: { ChangeKind: "created" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem, sourceFirst: false },
      ),
    );
    expect(result.structuredContent?.relationships_created).toBe(1);
    expect(result.structuredContent?.sourceWrites?.length).toBeGreaterThan(0);
  });
});

