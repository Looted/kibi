/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import type {
  RuntimeOperationSpec,
  PrologPort,
  PrologQueryResult,
} from "../public/operations/runtime-types.js";
import { createCliRuntime } from "./cli-runtime.js";

const readSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  name: "kb_query",
  effects: ["kb-read"],
  requiresProlog: true,
  execute: async () => undefined,
};

const writeSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  ...readSpec,
  name: "kb_upsert",
  effects: ["kb-write"],
};

type ManagedProlog = PrologPort & {
  readonly start: () => Promise<void>;
  readonly terminate: () => Promise<void>;
};

function createManagedProlog(events: string[]): ManagedProlog {
  return {
    start: async () => {
      events.push("start");
    },
    query: async (goal): Promise<PrologQueryResult> => {
      events.push(`query:${goal}`);
      return { success: true, bindings: {} };
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
    terminate: async () => {
      events.push("terminate");
    },
  };
}

describe("CLI operation runtime", () => {
  test("creates and closes one Prolog lifecycle per invocation", async () => {
    // Given
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
      git: {
        revParse: async () => "feature/runtime",
        showToplevel: async () => "/workspace",
      },
    });

    // When
    const context = await runtime.open(readSpec);
    await runtime.close(context, { status: "success", result: undefined });

    // Then
    expect(context.workspaceRoot).toBe("/workspace");
    expect(context.prolog).toBeDefined();
    expect(events).toEqual([
      "start",
      "query:kb_attach('/workspace/.kb/branches/feature/runtime')",
      "terminate",
    ]);
  });

  test("afterSuccess is a no-op for writes", async () => {
    // Given
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
      git: {
        revParse: async () => "feature/runtime",
        showToplevel: async () => "/workspace",
      },
    });
    const context = await runtime.open(writeSpec);

    // When
    await runtime.afterSuccess(writeSpec, context);

    // Then
    expect(events).toEqual([
      "start",
      "query:kb_attach('/workspace/.kb/branches/feature/runtime')",
    ]);
    await runtime.close(context, { status: "success", result: undefined });
  });

  test("terminates Prolog after an error outcome", async () => {
    // Given
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
      git: {
        revParse: async () => "feature/runtime",
        showToplevel: async () => "/workspace",
      },
    });
    const context = await runtime.open(readSpec);

    // When
    await runtime.close(context, {
      status: "error",
      error: new TypeError("failed"),
    });

    // Then
    expect(events).toEqual([
      "start",
      "query:kb_attach('/workspace/.kb/branches/feature/runtime')",
      "terminate",
    ]);
  });

  test("terminates Prolog when branch attachment fails", async () => {
    // Given
    const events: string[] = [];
    const prolog = createManagedProlog(events);
    prolog.query = async (goal): Promise<PrologQueryResult> => {
      events.push(`query:${goal}`);
      return { success: false, bindings: {}, error: "attach failed" };
    };
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog,
      git: {
        revParse: async () => "feature/runtime",
        showToplevel: async () => "/workspace",
      },
    });

    // When
    const opening = runtime.open(readSpec);

    // Then
    await expect(opening).rejects.toThrow("attach failed");
    expect(events.at(-1)).toBe("terminate");
  });
});
