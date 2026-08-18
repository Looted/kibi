import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: true,
        fileCount: 12,
      }),
    },
  };
}

describe("executeOperation", () => {
  const originalBranch = process.env.KIBI_BRANCH;

  beforeEach(() => {
    process.env.KIBI_BRANCH = "develop";
  });

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });
  test("renders one JSON value with a trailing newline on success", async () => {
    const result = await executeOperation("kb_status", {}, createContext());

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout ?? "")).toEqual(
      expect.objectContaining({
        kibiProtocol: 1,
        operation: "kb_status",
        status: "success",
        data: expect.objectContaining({
          branch: "develop",
          snapshotId: expect.any(String),
          verificationSnapshot: "a".repeat(64),
          migrationPlan: expect.objectContaining({
            version: "kibi.migration-plan.v2",
          }),
        }),
        effects: expect.any(Array),
        nextActions: [],
      }),
    );
    expect(result.stdout?.endsWith("\n")).toBe(true);
  });

  test("returns exit 2 and stderr-only diagnostics for invalid input", async () => {
    const result = await executeOperation(
      "kb_status",
      { unexpected: true },
      createContext(),
    );

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      kibiProtocol: 1,
      status: "error",
      error: { code: "VALIDATION_FAILED" },
    });
    expect(result.stderr).toContain("VALIDATION_FAILED");
    expect(result.stderr).toContain("unexpected");
  });

  test("returns exit 2 for an unknown operation", async () => {
    const result = await executeOperation("unknown", {}, createContext());

    expect(result).toMatchObject({
      exitCode: 2,
      stderr: "Error [UNKNOWN_OPERATION]: Unknown operation 'unknown'.\n",
    });
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      kibiProtocol: 1,
      operation: "unknown",
      status: "error",
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
