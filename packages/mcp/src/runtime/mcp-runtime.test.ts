import { describe, expect, mock, test } from "bun:test";

import type { PrologPort, RuntimeOperationSpec } from "kibi-runtime";
import { type McpSession, createMcpRuntime } from "./mcp-runtime.js";

const readSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  name: "kb_query",
  effects: ["kb-read"],
  requiresProlog: true,
  execute: async () => undefined,
};

const writeSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  ...readSpec,
  name: "kb_delete",
  effects: ["kb-write"],
};

function createSession(): {
  readonly session: McpSession;
  readonly prolog: PrologPort;
  readonly ensureProlog: ReturnType<typeof mock>;
  readonly refreshAttachedBranchStamp: ReturnType<typeof mock>;
  readonly requestCleanup: ReturnType<typeof mock>;
} {
  const prolog: PrologPort = {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  const ensureProlog = mock(async () => prolog);
  const refreshAttachedBranchStamp = mock(async () => undefined);
  const requestCleanup = mock(async () => undefined);
  const session: McpSession = {
    workspaceRoot: "/workspace",
    activeBranchName: () => "feature/runtime",
    attachedBranchKbPath: () => "/workspace/.kb/branches/feature/runtime",
    ensureProlog,
    adaptProlog: (value) => value,
    refreshAttachedBranchStamp,
    requestCleanup,
  };
  return {
    session,
    prolog,
    ensureProlog,
    refreshAttachedBranchStamp,
    requestCleanup,
  };
}

describe("MCP operation runtime", () => {
  test("reuses the session-owned Prolog process across requests", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);

    // When
    const first = await runtime.open(readSpec);
    const second = await runtime.open(readSpec);

    // Then
    expect(first.prolog).toBe(fixture.prolog);
    expect(second.prolog).toBe(fixture.prolog);
    expect(fixture.ensureProlog).toHaveBeenCalledTimes(2);
  });

  test("refreshes the attached branch stamp after every kb-write", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);
    const context = await runtime.open(writeSpec);

    // When
    await runtime.afterSuccess(writeSpec, context);

    // Then
    expect(fixture.refreshAttachedBranchStamp).toHaveBeenCalledTimes(1);
  });

  test("does not refresh the attached branch stamp after a read", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);
    const context = await runtime.open(readSpec);

    // When
    await runtime.afterSuccess(readSpec, context);

    // Then
    expect(fixture.refreshAttachedBranchStamp).not.toHaveBeenCalled();
  });

  test("performs request cleanup without terminating the session Prolog", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);
    const context = await runtime.open(readSpec);

    // When
    await runtime.close(context, {
      status: "error",
      error: new TypeError("request failed"),
    });

    // Then
    expect(fixture.requestCleanup).toHaveBeenCalledTimes(1);
    expect(fixture.ensureProlog).toHaveBeenCalledTimes(1);
  });
});
