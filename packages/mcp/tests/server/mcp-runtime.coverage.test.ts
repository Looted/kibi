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
    const context = await runtime.open(spec);
    expect(await context.ensureProlog?.()).toBeDefined();
    expect(await context.ensureProlog?.()).toBeDefined();
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(runtime.sessionProlog(context)).toBeDefined();
    await runtime.close(context, { status: "success" });
    expect(cleanup).toHaveBeenCalled();
    await runtime.afterSuccess({
      name: "kb_upsert",
      effects: ["kb-write"],
      requiresProlog: true,
      execute: async () => ({}),
    });
  });
});
