import { afterAll, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { OperationContext } from "kibi-cli/operations/runtime-types";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "kibi-cli/public/branch-resolver";
import { handleKbCoverage } from "../../src/tools/coverage.js";
import { handleKbFindGaps } from "../../src/tools/find-gaps.js";
import { handleKbGraph } from "../../src/tools/graph.js";
import { handleKbSearch } from "../../src/tools/search.js";
import { handleKbStatus } from "../../src/tools/status.js";

const tempRoots: string[] = [];

function isolatedWorkspace(): string {
  const workspaceRoot = mkdtempSync(
    path.join(tmpdir(), "kibi-mcp-status-err-"),
  );
  tempRoots.push(workspaceRoot);
  return workspaceRoot;
}

function writeHealthyStore(workspaceRoot: string, branch: string): void {
  const storePath = branchStorePath(workspaceRoot, branch);
  ensureBranchStoreManifest(workspaceRoot, branch);
  mkdirSync(path.join(storePath, "rdf"), { recursive: true });
  writeFileSync(path.join(storePath, "storage.json"), "{}\n");
  writeFileSync(path.join(storePath, "CURRENT"), "generation-1:1\n");
}

function statusContext(
  workspaceRoot: string,
  branch: string,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-03-22T12:00:00Z"),
    git: {
      revParse: async () => branch,
      showToplevel: async () => workspaceRoot,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: branch,
      kbBranch: branch,
      storePath: branchStorePath(workspaceRoot, branch),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

function createFailingProlog(error: string): PrologProcess {
  return {
    invalidateCache: mock(() => {}),
    query: mock(async () => ({
      success: false,
      bindings: {},
      error,
    })),
  } as unknown as PrologProcess;
}

afterAll(() => {
  mock.restore();
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("MCP tool handler error wrappers", () => {
  test("rejects blank kb_search queries before execution", async () => {
    await expect(
      handleKbSearch(createFailingProlog("unused"), { query: "  \n\t  " }),
    ).rejects.toThrow(
      "Search execution failed: query must be a non-empty string",
    );
  });

  test("wraps non-prefixed kb_search failures", async () => {
    await expect(
      handleKbSearch(createFailingProlog("backend unavailable"), {
        query: "oauth",
      }),
    ).rejects.toThrow("Search execution failed: backend unavailable");
  });

  test("rethrows already-prefixed kb_search failures unchanged", async () => {
    await expect(
      handleKbSearch(
        createFailingProlog("Search execution failed: backend unavailable"),
        {
          query: "oauth",
        },
      ),
    ).rejects.toThrow("Search execution failed: backend unavailable");
  });

  test("wraps kb_coverage failures", async () => {
    await expect(
      handleKbCoverage(createFailingProlog("coverage backend unavailable"), {
        by: "req",
      }),
    ).rejects.toThrow(
      "Coverage execution failed: Coverage execution query failed: coverage backend unavailable",
    );
  });

  test("wraps kb_find_gaps failures", async () => {
    await expect(
      handleKbFindGaps(createFailingProlog("gap backend unavailable"), {
        type: "req",
      }),
    ).rejects.toThrow(
      "Find-gaps execution failed: Find-gaps execution query failed: gap backend unavailable",
    );
  });

  test("wraps kb_graph failures", async () => {
    await expect(
      handleKbGraph(createFailingProlog("graph backend unavailable"), {
        seedIds: ["REQ-001"],
      }),
    ).rejects.toThrow(
      "Graph execution failed: Graph execution query failed: graph backend unavailable",
    );
  });

  test("reports kb_status engine failures without misclassifying a readable store", async () => {
    const workspaceRoot = isolatedWorkspace();
    writeHealthyStore(workspaceRoot, "main");
    const result = await handleKbStatus(
      createFailingProlog("status backend unavailable"),
      {},
      statusContext(workspaceRoot, "main"),
    );
    expect(result.structuredContent?.dirty).toBe(true);
    expect(result.structuredContent?.branchStore?.state).toBe("healthy");
    expect(result.structuredContent?.engineStatus?.state).toBe("unavailable");
    expect(result.structuredContent?.engineStatus?.detail).toContain(
      "status backend unavailable",
    );
  });
});
