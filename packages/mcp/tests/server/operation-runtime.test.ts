import { describe, expect, mock, test } from "bun:test";

import type {
  PrologPort,
  RuntimeOperationSpec,
} from "kibi-cli/operations/runtime-types";
import { executeOperation } from "kibi-cli/operations/runtime-types";
import {
  type McpSession,
  createMcpRuntime,
} from "../../src/runtime/mcp-runtime.js";

function createSession(refresh: () => Promise<void>): McpSession {
  const prolog: PrologPort = {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: "/workspace",
    activeBranchName: () => "feature/runtime",
    attachedBranchKbPath: () => "/workspace/.kb/branches/feature/runtime",
    ensureProlog: async () => prolog,
    adaptProlog: (value) => value,
    refreshAttachedBranchStamp: refresh,
    requestCleanup: async () => undefined,
  };
}

describe("MCP operation adapter integration", () => {
  test("runs the write success hook only after execution succeeds", async () => {
    // Given
    const refresh = mock(async () => undefined);
    const execute = mock(async () => ({ created: 1 }));
    const spec: RuntimeOperationSpec<
      Record<string, never>,
      { readonly created: number }
    > = {
      name: "kb_upsert",
      effects: ["kb-write"],
      requiresProlog: true,
      execute,
    };

    // When
    const result = await executeOperation(
      createMcpRuntime(createSession(refresh)),
      spec,
      {},
    );

    // Then
    expect(result).toEqual({ created: 1 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("skips the write success hook when execution fails", async () => {
    // Given
    const refresh = mock(async () => undefined);
    const spec: RuntimeOperationSpec<Record<string, never>, never> = {
      name: "kb_delete",
      effects: ["kb-write"],
      requiresProlog: true,
      execute: async () => {
        throw new TypeError("delete failed");
      },
    };

    // When
    const invocation = executeOperation(
      createMcpRuntime(createSession(refresh)),
      spec,
      {},
    );

    // Then
    await expect(invocation).rejects.toThrow("delete failed");
    expect(refresh).not.toHaveBeenCalled();
  });
});
