import { describe, expect, test } from "bun:test";

import {
  type FilesystemPort,
  type OperationContext,
  type OperationRuntime,
  type PrologPort,
  type RuntimeOperationSpec,
  executeOperation,
} from "../../src/public/operations/runtime-types.js";

const fakeProlog: PrologPort = {
  query: async () => ({ success: true, bindings: {} }),
  nextSolution: async () => null,
  save: async () => ({ success: true, bindings: {} }),
};

const fakeFilesystem: FilesystemPort = {
  readFile: async () => "fixture",
  writeFile: async () => undefined,
  mkdir: async () => undefined,
  stat: async () => ({ isFile: () => true, isDirectory: () => false }),
};

function createContext(): OperationContext {
  return {
    workspaceRoot: "/workspace",
    signal: new AbortController().signal,
    clock: () => new Date(42),
    prolog: fakeProlog,
    fs: fakeFilesystem,
  };
}

function createSpec(
  effect: "kb-read" | "kb-write",
): RuntimeOperationSpec<{ readonly value: string }, string> {
  return {
    name: effect === "kb-write" ? "kb_upsert" : "kb_query",
    effects: [effect],
    requiresProlog: true,
    execute: async (input, _context) => input.value,
  };
}

function createRecordingRuntime(events: string[]): OperationRuntime {
  return {
    open: async (spec) => {
      events.push(`open:${spec.name}`);
      return createContext();
    },
    afterSuccess: async (spec) => {
      events.push(`afterSuccess:${spec.name}`);
    },
    close: async (_context, outcome) => {
      events.push(`close:${outcome.status}`);
    },
  };
}

describe("operation runtime lifecycle", () => {
  test("calls afterSuccess for a successful kb-write operation", async () => {
    // Given
    const events: string[] = [];
    const runtime = createRecordingRuntime(events);

    // When
    const result = await executeOperation(runtime, createSpec("kb-write"), {
      value: "written",
    });

    // Then
    expect(result).toBe("written");
    expect(events).toEqual([
      "open:kb_upsert",
      "afterSuccess:kb_upsert",
      "close:success",
    ]);
  });

  test("does not call afterSuccess for a successful kb-read operation", async () => {
    // Given
    const events: string[] = [];
    const runtime = createRecordingRuntime(events);

    // When
    await executeOperation(runtime, createSpec("kb-read"), { value: "read" });

    // Then
    expect(events).toEqual(["open:kb_query", "close:success"]);
  });

  test("closes an opened context when execution fails", async () => {
    // Given
    const events: string[] = [];
    const runtime = createRecordingRuntime(events);
    const spec: RuntimeOperationSpec<Record<string, never>, never> = {
      name: "kb_query",
      effects: ["kb-read"],
      requiresProlog: true,
      execute: async () => {
        throw new TypeError("query failed");
      },
    };

    // When
    const invocation = executeOperation(runtime, spec, {});

    // Then
    await expect(invocation).rejects.toThrow("query failed");
    expect(events).toEqual(["open:kb_query", "close:error"]);
  });
});
