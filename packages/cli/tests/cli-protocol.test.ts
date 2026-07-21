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
  };
}

describe("executeOperation", () => {
  test("renders one JSON value with a trailing newline on success", async () => {
    const result = await executeOperation("kb_status", {}, createContext());

    expect(result).toEqual({
      exitCode: 0,
      stdout:
        '{"branch":"develop","snapshotId":"stamp:test","syncedAt":null,"dirty":false,"syncState":"fresh"}\n',
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
});
