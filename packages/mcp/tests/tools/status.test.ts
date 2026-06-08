import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";
import { handleKbStatus } from "../../src/tools/status.js";

describe("MCP status tool handler", () => {
  test("returns branch, snapshot, and freshness metadata", async () => {
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

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbStatus(prolog, {});

    expect(result.structuredContent?.branch).toBe("feature/discovery-bundle");
    expect(result.structuredContent?.snapshotId).toBe("stamp:123");
    expect(result.structuredContent?.dirty).toBe(false);
    expect(result.content[0]?.text).toContain("fresh");
  });

  test("includes dirty flag in human-readable status text", async () => {
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

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbStatus(prolog, {});

    expect(result.content[0]?.text).toContain("dirty=true");
    expect(result.content[0]?.text).toContain("stale");
  });

  test("registered status tool enters the runtime freshness gate before kb_status_json", async () => {
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
    const prolog = { query } as unknown as PrologProcess;
    const ensureProlog = mock(async () => {
      calls.push("ensureProlog");
      return prolog;
    });
    const registered = new Map<string, (args: Record<string, unknown>) => unknown>();
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
      handleKbStatus,
    } as unknown as Parameters<typeof registerAllTools>[1];

    registerAllTools(server as never, runtime);
    await registered.get("kb_status")?.({});

    expect(ensureProlog).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      "(use_module('/home/looted/projects/kibi/packages/core/src/status.pl'), status:kb_status_json(JsonString))",
    );
    expect(calls).toEqual([
      "ensureProlog",
      "(use_module('/home/looted/projects/kibi/packages/core/src/status.pl'), status:kb_status_json(JsonString))",
    ]);
  });
});
