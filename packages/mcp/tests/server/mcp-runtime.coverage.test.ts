import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
} from "../../../cli/tests/helpers/in-process-workspace.js";
import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  process.exitCode = 0;
});

function port() {
  return {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
}

describe("createMcpRuntime remaining branches", () => {
  test("warns on legacy attachment for read-only tools and throws for Prolog tools", async () => {
    const restore = isolateKibiEnv();
    restores.push(restore);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "branches", "main", "kb.rdf"), "legacy\n");

    const warn = mock();
    const original = console.warn;
    console.warn = warn as typeof console.warn;
    const runtime = createMcpRuntime({
      workspaceRoot: cwd,
      activeBranchName: () => "main",
      attachedBranchKbPath: () => path.join(cwd, ".kb", "branches", "main"),
      ensureProlog: async () => port(),
      adaptProlog: (value) => value,
      refreshAttachedBranchStamp: async () => undefined,
    });
    try {
      const readContext = await runtime.open({
        name: "kb_status",
        requiresProlog: false,
        effects: ["local-read"],
        execute: async () => ({}),
      });
      expect(readContext.workspaceRoot).toBe(cwd);
      expect(warn).toHaveBeenCalled();
      await expect(
        runtime.open({
          name: "kb_query",
          requiresProlog: true,
          effects: ["local-read"],
          execute: async () => ({}),
        }),
      ).rejects.toThrow(/explicit migration/);
    } finally {
      console.warn = original;
    }
  });

  test("lazy-loads Prolog for non-requiring tools and records session Prolog", async () => {
    const ensure = mock(async () => port());
    const cleanup = mock(async () => undefined);
    const runtime = createMcpRuntime({
      workspaceRoot: "/workspace",
      activeBranchName: () => "develop",
      attachedBranchKbPath: () => null,
      ensureProlog: ensure,
      adaptProlog: (value) => value,
      refreshAttachedBranchStamp: async () => undefined,
      requestCleanup: cleanup,
    });
    const spec = {
      name: "kb_skills_list",
      requiresProlog: false,
      effects: ["local-read"],
      execute: async () => ({}),
    };
    const context = await runtime.open(spec as never);
    expect(await context.ensureProlog?.()).toBeDefined();
    expect(await context.ensureProlog?.()).toBeDefined();
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(runtime.sessionProlog(context)).toBeDefined();
    await runtime.close(context, { status: "success", result: undefined });
    expect(cleanup).toHaveBeenCalled();
    await runtime.afterSuccess(
      {
        name: "kb_upsert",
        effects: ["kb-write"],
        requiresProlog: true,
        execute: async () => ({}),
      } as never,
      context,
    );
  });

  test("returns a provided Prolog port without starting the session engine", async () => {
    const { attachedContextWithProlog } = await import(
      "../../src/runtime/mcp-runtime.js"
    );
    const provided = port();
    const ensure = mock(async () => port());
    const runtime = createMcpRuntime({
      workspaceRoot: "/workspace",
      activeBranchName: () => "develop",
      attachedBranchKbPath: () => null,
      ensureProlog: ensure,
      adaptProlog: (value) => value,
      refreshAttachedBranchStamp: async () => undefined,
    });
    const context = await runtime.open(
      {
        name: "kb_query",
        requiresProlog: true,
        effects: ["kb-read"],
        execute: async () => ({}),
      },
      { prolog: provided },
    );
    expect(context.prolog).toBe(provided);
    expect(ensure).not.toHaveBeenCalled();
    expect(
      attachedContextWithProlog({ workspaceRoot: "/workspace" }, provided)
        .prolog,
    ).toBe(provided);
  });
});
