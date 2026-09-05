/// <reference types="bun" />

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import type {
  PrologPort,
  PrologQueryResult,
  RuntimeOperationSpec,
} from "../src/public/operations/runtime-types.js";
import * as branchResolver from "../src/utils/branch-resolver.js";
import { _setBranchResolverDepsForTests } from "../src/utils/branch-resolver.js";
import { createCliRuntime } from "../src/runtime/cli-runtime.js";

const lazySpec: RuntimeOperationSpec<Record<string, never>, void> = {
  name: "kb_status",
  effects: ["kb-read"],
  requiresProlog: false,
  execute: async () => undefined,
};

const readSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  name: "kb_query",
  effects: ["kb-read"],
  requiresProlog: true,
  execute: async () => undefined,
};

type ManagedProlog = PrologPort & {
  readonly start: () => Promise<void>;
  readonly terminate: () => Promise<void>;
  readonly execute: <T>(command: unknown, signal?: AbortSignal) => Promise<T>;
};

function createManagedProlog(events: string[]): ManagedProlog {
  return {
    start: async () => {
      events.push("start");
    },
    query: async (goal, signal): Promise<PrologQueryResult> => {
      events.push(`query:${goal}:${signal === undefined ? "none" : "sig"}`);
      return { success: true, bindings: {} };
    },
    queryEntities: async (input, signal) => {
      events.push(
        `queryEntities:${JSON.stringify(input)}:${signal === undefined ? "none" : "sig"}`,
      );
      return [];
    },
    searchEntities: async (input, signal) => {
      events.push(
        `searchEntities:${JSON.stringify(input)}:${signal === undefined ? "none" : "sig"}`,
      );
      return [];
    },
    nextSolution: async () => null,
    save: async (signal) => {
      events.push(`save:${signal === undefined ? "none" : "sig"}`);
      return { success: true, bindings: {} };
    },
    execute: async (command, signal) => {
      events.push(
        `execute:${JSON.stringify(command)}:${signal === undefined ? "none" : "sig"}`,
      );
      return { ok: true } as never;
    },
    terminate: async () => {
      events.push("terminate");
    },
  };
}

function fakeBranchExecSync(branch: string) {
  return ((command: string) => {
    if (command.includes("git branch --show-current")) return `${branch}\n`;
    throw new Error(`Unexpected execSync command in test: ${command}`);
  }) as unknown as typeof import("node:child_process").execSync;
}

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  _setBranchResolverDepsForTests({ execSync: undefined as never });
});

describe("createCliRuntime leftover proxy and lazy-engine branches", () => {
  test("bindSignal forwards queryEntities, searchEntities, save, and engine execute", async () => {
    const events: string[] = [];
    _setBranchResolverDepsForTests({ execSync: fakeBranchExecSync("develop") });
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
    });
    const context = await runtime.open(readSpec);
    expect(await context.prolog?.queryEntities?.({ type: "req" })).toEqual([]);
    expect(await context.prolog?.searchEntities?.({ query: "retain" })).toEqual(
      [],
    );
    expect(await context.prolog?.save()).toMatchObject({ success: true });
    expect(await context.engine?.execute({ op: "ping" }, context.signal)).toEqual(
      { ok: true },
    );
    await runtime.close(context);
    expect(events.some((event) => event.startsWith("queryEntities:"))).toBe(
      true,
    );
    expect(events.some((event) => event.startsWith("searchEntities:"))).toBe(
      true,
    );
    expect(events.some((event) => event.startsWith("save:"))).toBe(true);
    expect(events.some((event) => event.startsWith("execute:"))).toBe(true);
  });

  test("lazy ensureProlog throws when branch attachment fails", async () => {
    const resolve = spyOn(
      branchResolver,
      "resolveBranchAttachment",
    ).mockReturnValue({
      error: "no branch",
      code: "DETACHED_HEAD",
    } as never);
    restores.push(() => resolve.mockRestore());
    const runtime = createCliRuntime({ workspaceRoot: "/workspace" });
    const context = await runtime.open(lazySpec);
    await expect(context.ensureProlog?.()).rejects.toThrow(/no branch/);
  });

  test("warns when the attached store still requires migration", async () => {
    const warnings: string[] = [];
    const warn = spyOn(console, "warn").mockImplementation((message) => {
      warnings.push(String(message));
    });
    restores.push(() => warn.mockRestore());
    const resolve = spyOn(
      branchResolver,
      "resolveBranchAttachment",
    ).mockReturnValue({
      gitBranch: "feature",
      kbBranch: "develop",
      storePath: "/workspace/.kb/branches/develop",
      kind: "legacy",
      migrationRequired: true,
    } as never);
    restores.push(() => resolve.mockRestore());
    const events: string[] = [];
    const runtime = createCliRuntime({
      workspaceRoot: "/workspace",
      prolog: createManagedProlog(events),
    });
    const context = await runtime.open(readSpec);
    expect(context.branchAttachment?.migrationRequired).toBe(true);
    expect(warnings.join(" ")).toMatch(/Legacy branch attachment/);
    await runtime.close(context);
  });

  test("names the standalone workspace error when git is unavailable", async () => {
    const events: string[] = [];
    const resolve = spyOn(
      branchResolver,
      "resolveBranchAttachment",
    ).mockReturnValue({
      error: "not a git repository",
      code: "NOT_A_GIT_REPO",
    } as never);
    restores.push(() => resolve.mockRestore());
    const runtime = createCliRuntime({
      workspaceRoot: "/not-a-git-repo",
      prolog: createManagedProlog(events),
    });
    await expect(runtime.open(readSpec)).rejects.toThrow(
      /set KIBI_BRANCH explicitly/,
    );
    expect(events).toContain("terminate");
  });

  test("resolves workspace root from KIBI_WORKSPACE when options omit it", async () => {
    const previous = process.env.KIBI_WORKSPACE;
    process.env.KIBI_WORKSPACE = "/tmp/kibi-workspace-from-env";
    restores.push(() => {
      if (previous === undefined) Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
      else process.env.KIBI_WORKSPACE = previous;
    });
    _setBranchResolverDepsForTests({ execSync: fakeBranchExecSync("develop") });
    const runtime = createCliRuntime({
      prolog: createManagedProlog([]),
    });
    const context = await runtime.open(readSpec);
    expect(context.workspaceRoot).toBe("/tmp/kibi-workspace-from-env");
    await runtime.close(context);
  });
});
