/// <reference types="bun" />

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type {
  PrologPort,
  PrologQueryResult,
  RuntimeOperationSpec,
} from "../public/operations/runtime-types.js";
import { _setBranchResolverDepsForTests } from "../utils/branch-resolver.js";
import { branchStorePath } from "../utils/branch-store-locator.js";
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

function attachEvent(workspaceRoot: string, branch: string): string {
  return `query:kb_attach('${branchStorePath(workspaceRoot, branch)}')`;
}

// Branch resolution in the runtime goes through `resolveActiveBranch`, which
// consults `defaultDeps.execSync` from branch-resolver.ts. Inject a fake
// execSync so the tests do not depend on a real git repo at /workspace.
function fakeBranchExecSync(branch: string) {
  return ((command: string) => {
    if (command.includes("git branch --show-current")) {
      return `${branch}\n`;
    }
    throw new Error(`Unexpected execSync command in test: ${command}`);
  }) as unknown as typeof import("node:child_process").execSync;
}

describe("CLI operation runtime", () => {
  beforeAll(() => {
    _setBranchResolverDepsForTests({
      execSync: fakeBranchExecSync("feature/runtime"),
    });
  });

  afterAll(() => {
    // Restore real execSync so other test files are not affected.
    _setBranchResolverDepsForTests({ execSync: undefined as never });
  });

  test("creates and closes one Prolog lifecycle per invocation", async () => {
    // Given
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
    });

    // When
    const context = await runtime.open(readSpec);
    await runtime.close(context, { status: "success", result: undefined });

    // Then
    expect(context.workspaceRoot).toBe("/workspace");
    expect(context.prolog).toBeDefined();
    expect(events).toEqual([
      "start",
      attachEvent("/workspace", "feature/runtime"),
      "terminate",
    ]);
  });

  test("afterSuccess is a no-op for writes", async () => {
    // Given
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
    });
    const context = await runtime.open(writeSpec);

    // When
    await runtime.afterSuccess(writeSpec, context);

    // Then
    expect(events).toEqual([
      "start",
      attachEvent("/workspace", "feature/runtime"),
    ]);
    await runtime.close(context, { status: "success", result: undefined });
  });

  test("terminates Prolog after an error outcome", async () => {
    // Given
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
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
      attachEvent("/workspace", "feature/runtime"),
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
    });

    // When
    const opening = runtime.open(readSpec);

    // Then
    const rejection = await opening.then(
      () => new Error("Expected branch attachment to fail"),
      (error) => error,
    );
    expect(rejection).toBeInstanceOf(Error);
    if (rejection instanceof Error) {
      expect(rejection.message).toBe("attach failed");
    }
    expect(events.at(-1)).toBe("terminate");
  });

  test("resolves current branch on an unborn git repo (no commits yet)", async () => {
    // Regression: kibi sync writes to .kb/branches/<actual-branch> via
    // resolveActiveBranch (git branch --show-current), but the operation runtime
    // previously used `git rev-parse --abbrev-ref HEAD` which fails on an
    // unborn branch (no HEAD commit) and silently fell back to "main",
    // causing every read-side operation (query, search, status, gaps, ...)
    // to attach to .kb/branches/main while the data lived under the real
    // branch. Pin the fix: resolveActiveBranch must accept the unborn-branch
    // output from `git branch --show-current`.
    const events: string[] = [];
    _setBranchResolverDepsForTests({ execSync: fakeBranchExecSync("develop") });
    try {
      const runtime = createCliRuntime({
        workspaceRoot: "/workspace",
        prolog: createManagedProlog(events),
      });

      const context = await runtime.open(readSpec);
      await runtime.close(context, { status: "success", result: undefined });

      expect(events).toContain(attachEvent("/workspace", "develop"));
      expect(events).not.toContain(attachEvent("/workspace", "main"));
    } finally {
      _setBranchResolverDepsForTests({
        execSync: fakeBranchExecSync("feature/runtime"),
      });
    }
  });

  test("requires an explicit branch override on non-git workspaces", async () => {
    const events: string[] = [];
    const failingExecSync = (() => {
      throw new Error("fatal: not a git repository");
    }) as unknown as typeof import("node:child_process").execSync;
    _setBranchResolverDepsForTests({ execSync: failingExecSync });
    process.env.KIBI_BRANCH = "standalone";
    try {
      const runtime = createCliRuntime({
        workspaceRoot: "/not-a-git-repo",
        prolog: createManagedProlog(events),
      });

      const context = await runtime.open(readSpec);
      await runtime.close(context, { status: "success", result: undefined });

      expect(events).toContain(attachEvent("/not-a-git-repo", "standalone"));
    } finally {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
      _setBranchResolverDepsForTests({
        execSync: fakeBranchExecSync("feature/runtime"),
      });
    }
  });

  test("propagates branch resolution errors for real git failures", async () => {
    // When a genuine git context cannot determine the branch (detached HEAD,
    // invalid branch name, etc.), the runtime must propagate the error rather
    // than silently attaching to .kb/branches/main. A silent main fallback
    // causes read-side operations to return empty results when the real branch
    // KB exists at a different path.
    const events: string[] = [];
    const detachedExecSync = (() => {
      return "";
    }) as unknown as typeof import("node:child_process").execSync;
    _setBranchResolverDepsForTests({ execSync: detachedExecSync });
    try {
      const runtime = createCliRuntime({
        workspaceRoot: "/detached",
        prolog: createManagedProlog(events),
      });

      const rejection = await runtime.open(readSpec).then(
        () => new Error("Expected open to reject when branch resolution fails"),
        (error) => error,
      );
      expect(rejection).toBeInstanceOf(Error);
      if (rejection instanceof Error) {
        expect(rejection.message).toMatch(/branch/i);
      }
      // Prolog must still be terminated on the error path.
      expect(events).toContain("terminate");
      expect(events).not.toContain(
        "query:kb_attach('/detached/.kb/branches/main')",
      );
    } finally {
      _setBranchResolverDepsForTests({
        execSync: fakeBranchExecSync("feature/runtime"),
      });
    }
  });
});
