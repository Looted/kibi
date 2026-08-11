import { describe, expect, test } from "bun:test";
import { executeOperation } from "../src/cli-protocol.js";
import type { CliContext } from "../src/cli-protocol.js";

function createContext(): CliContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    prolog: {
      query: async () => ({
        success: true,
        bindings: {
          JsonString: JSON.stringify({
            branch: "develop",
            snapshotId: "stamp:test",
            syncedAt: null,
            dirty: false,
            syncState: "fresh",
          }),
        },
      }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      revParse: async () => "develop",
      showToplevel: async () => process.cwd(),
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v1",
        hash: "a".repeat(64),
        dirty: true,
        fileCount: 12,
      }),
    },
  };
}

describe("executeOperation", () => {
  test("renders one JSON value with a trailing newline on success", async () => {
    const result = await executeOperation("kb_status", {}, createContext());

    expect(result).toEqual({
      exitCode: 0,
      stdout: `{"branch":"develop","snapshotId":"stamp:test","syncedAt":null,"dirty":false,"syncState":"fresh","verificationSnapshot":"${"a".repeat(64)}","verificationSnapshotAvailable":true,"verificationSnapshotDirty":true,"verificationSnapshotFileCount":12,"verificationSnapshotVersion":"kibi.workspace-snapshot.v1"}\n`,
    });
  });

  test("returns exit 2 and stderr-only diagnostics for invalid input", async () => {
    const result = await executeOperation(
      "kb_status",
      { unexpected: true },
      createContext(),
    );

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toContain("VALIDATION_FAILED");
    expect(result.stderr).toContain("unexpected");
  });

  test("returns exit 2 for an unknown operation", async () => {
    const result = await executeOperation("unknown", {}, createContext());

    expect(result).toEqual({
      exitCode: 2,
      stderr: "Error [UNKNOWN_OPERATION]: Unknown operation 'unknown'.\n",
    });
  });

  test("rejects MCP-internal upsert fields at the CLI boundary", async () => {
    // Given
    const input = {
      type: "req",
      id: "REQ-INTERNAL-FIELD",
      properties: { title: "Private field", status: "open" },
      _skipContradictionCheck: true,
    };

    // When
    const result = await executeOperation("kb_upsert", input, createContext());

    // Then
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("_skipContradictionCheck");
  });
});
