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
import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";
import { handleKbStatus } from "../../src/tools/status.js";

const tempRoots: string[] = [];

function isolatedWorkspace(): string {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "kibi-mcp-status-"));
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

afterAll(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("MCP status tool handler", () => {
  test("returns branch, snapshot, and freshness metadata", async () => {
    const workspaceRoot = isolatedWorkspace();
    writeHealthyStore(workspaceRoot, "main");
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "feature/discovery-bundle",
          snapshotId: "stamp:123",
          syncedAt: "2026-03-22T12:00:00Z",
          dirty: false,
          syncState: "fresh",
          kbPath: ".kb/branches/feature-discovery-bundle",
        }),
      },
    }));

    const prolog = {
      invalidateCache: mock(() => {}),
      query,
    } as unknown as PrologProcess;
    const result = await handleKbStatus(
      prolog,
      {},
      statusContext(workspaceRoot, "main"),
    );

    expect(result.structuredContent?.branch).toBe("main");
    expect(result.structuredContent?.snapshotId).toBe("stamp:123");
    expect(result.structuredContent?.dirty).toBe(false);
    expect(result.content[0]?.text).toContain("fresh");
    expect(query).toHaveBeenCalled();
  });

  test("includes dirty flag in human-readable status text", async () => {
    const workspaceRoot = isolatedWorkspace();
    writeHealthyStore(workspaceRoot, "main");
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "main",
          snapshotId: "stamp:456",
          syncedAt: "2026-03-22T13:00:00Z",
          dirty: true,
          syncState: "stale",
        }),
      },
    }));

    const prolog = {
      invalidateCache: mock(() => {}),
      query,
    } as unknown as PrologProcess;
    const result = await handleKbStatus(
      prolog,
      {},
      statusContext(workspaceRoot, "main"),
    );

    expect(result.content[0]?.text).toContain("dirty=true");
    expect(result.content[0]?.text).toContain("stale");
  });

  test("reports a missing branch store without querying Prolog", async () => {
    const workspaceRoot = isolatedWorkspace();
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          snapshotId: "stamp:should-not-be-used",
        }),
      },
    }));
    const prolog = {
      invalidateCache: mock(() => {}),
      query,
    } as unknown as PrologProcess;
    const result = await handleKbStatus(
      prolog,
      {},
      statusContext(workspaceRoot, "trunk"),
    );

    expect(result.structuredContent?.snapshotId).toBe("missing");
    expect(result.structuredContent?.branchStore?.state).toBe("missing");
    expect(result.content[0]?.text).toContain("unknown");
    expect(query).toHaveBeenCalledTimes(0);
  });

  test("registered status tool does not initialise a session engine for diagnostics", async () => {
    const previousBranch = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "test";
    try {
      const calls: string[] = [];
      const query = mock(async (goal: string) => {
        calls.push(goal);
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              branch: "main",
              snapshotId: "stamp:789",
              syncedAt: "2026-03-22T14:00:00Z",
              dirty: false,
              syncState: "fresh",
            }),
          },
        };
      });
      const prolog = {
        invalidateCache: mock(() => {}),
        query,
      } as unknown as PrologProcess;
      const ensureProlog = mock(async () => {
        calls.push("ensureProlog");
        return prolog;
      });
      const registered = new Map<
        string,
        (args: Record<string, unknown>) => unknown
      >();
      const server = {
        registerTool: mock(
          (
            name: string,
            _config: unknown,
            handler: (args: Record<string, unknown>) => unknown,
          ) => {
            registered.set(name, handler);
          },
        ),
      };
      const runtime = {
        tools: TOOLS,
        diagnosticModeEnabled: () => false,
        extractToolCallPayload: (args: Record<string, unknown>) => ({
          businessArgs: args,
          telemetry: null,
        }),
        inFlightRequests: async () => new Map<string, Promise<unknown>>(),
        isShuttingDown: async () => false,
        resetProlog: async () => {},
        prologProcess: async () => null,
        activeBranchName: async () => "test",
        appendUsageLogLine: () => {},
        deriveDiagnosticFields: () => ({}),
        classifyDiagnosticError: () => ({}),
        ensureProlog,
        operationRuntime: createMcpRuntime({
          workspaceRoot: "/workspace",
          activeBranchName: async () => "test",
          attachedBranchKbPath: () => null,
          ensureProlog,
          adaptProlog: () => ({
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          }),
          refreshAttachedBranchStamp: async () => undefined,
        }),
        handleKbStatus,
      } as unknown as Parameters<typeof registerAllTools>[1];

      registerAllTools(server as never, runtime);
      await registered.get("kb_status")?.({});

      expect(ensureProlog).toHaveBeenCalledTimes(0);
      expect(query).toHaveBeenCalledTimes(0);
      expect(calls).toEqual([]);
    } finally {
      if (previousBranch === undefined)
        Reflect.deleteProperty(process.env, "KIBI_BRANCH");
      else process.env.KIBI_BRANCH = previousBranch;
    }
  });
});
