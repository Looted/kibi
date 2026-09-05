import { afterEach, describe, expect, test } from "bun:test";
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

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => Promise<PrologQueryResult> | PrologQueryResult,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async (goal) => query(Array.isArray(goal) ? goal.join(", ") : goal),
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
});
