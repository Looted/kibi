// implements REQ-008
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EngineClient } from "kibi-runtime";

import * as session from "../../src/server/session.js";

type QueryResult = { readonly success: boolean; readonly error?: string };

const originalEnv = { ...process.env };
const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];
const calls: string[] = [];
let previousExitCode: string | number | undefined | null;

let queryImpl: (goal: string) => Promise<QueryResult> = async () => ({
  success: true,
});
let startImpl: () => Promise<void> = async () => {};
let terminateImpl: () => Promise<void> = async () => {};

const fakeProlog = {
  query: async (goal: string): Promise<QueryResult> => {
    calls.push(`query:${goal}`);
    return queryImpl(goal);
  },
  terminate: async () => {
    calls.push("terminate");
    return terminateImpl();
  },
  isRunning: () => true,
  getPid: () => 7,
  start: async () => {
    calls.push("start");
    return startImpl();
  },
  invalidateCache: () => {
    calls.push("invalidateCache");
  },
};

function restoreEnv(): void {
  for (const key of Object.keys(process.env))
    Reflect.deleteProperty(process.env, key);
  Object.assign(process.env, originalEnv);
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
}

function branchPath(root: string, branch: string): string {
  return path.join(root, ".kb", "branches", branch);
}

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-session-remaining-"));
  roots.push(root);
  for (const branch of ["develop", "stable"]) {
    mkdirSync(branchPath(root, branch), { recursive: true });
    writeFileSync(path.join(branchPath(root, branch), "kb.rdf"), "<rdf />\n");
  }
  return root;
}

function setFakePrologDeps(root: string): void {
  session._resetSessionDepsForTests();
  session._setSessionDepsForTests({
    PrologProcess: function (this: Record<string, unknown>) {
      Object.assign(this, fakeProlog);
      return this;
    } as unknown as Parameters<
      typeof session._setSessionDepsForTests
    >[0]["PrologProcess"],
    copyCleanSnapshot: () => {},
    createRequire: () => {
      const req = ((_specifier: string) => ({
        version: "1.0.0",
      })) as unknown as NodeJS.Require;
      req.resolve = Object.assign((_specifier: string) => "/resolved", {
        paths: (_specifier: string) => [],
      });
      return req;
    },
    fs: {
      existsSync: (candidate) => {
        const value = candidate.toString();
        return value.includes("develop") || value.includes("stable");
      },
      mkdirSync: (candidate) => {
        mkdirSync(candidate.toString(), { recursive: true });
        writeFileSync(
          path.join(candidate.toString(), "kb.rdf"),
          "<rdf />\n",
        );
        return undefined;
      },
    },
    getBranchDiagnostic: (_cwd, error) => `diagnostic ${error}`,
    isValidBranchName: (branch) => Boolean(branch) && !branch.includes(" "),
    resolveActiveBranch: () => ({ branch: "develop" }),
    resolveKbPath: branchPath,
    resolveWorkspaceRoot: () => root,
  });
}

function setEngineDeps(root: string): void {
  session._resetSessionDepsForTests();
  session._setSessionDepsForTests({
    copyCleanSnapshot: () => {},
    createRequire: () => {
      const req = ((_specifier: string) => ({
        version: "1.0.0",
      })) as unknown as NodeJS.Require;
      req.resolve = Object.assign((_specifier: string) => "/resolved", {
        paths: (_specifier: string) => [],
      });
      return req;
    },
    fs: {
      existsSync: (candidate) => candidate.toString().includes("develop"),
      mkdirSync: (candidate) => {
        mkdirSync(candidate.toString(), { recursive: true });
        return undefined;
      },
    },
    getBranchDiagnostic: (_cwd, error) => `diagnostic ${error}`,
    isValidBranchName: (branch) => Boolean(branch) && !branch.includes(" "),
    resolveActiveBranch: () => ({ branch: "develop" }),
    resolveKbPath: branchPath,
    resolveWorkspaceRoot: () => root,
  });
}

describe.serial("session remaining engine, reset, and empty-branch branches", () => {
  beforeEach(() => {
    previousExitCode = process.exitCode;
    restoreEnv();
    calls.length = 0;
    queryImpl = async () => ({ success: true });
    startImpl = async () => {};
    terminateImpl = async () => {};
    session.resetSessionStateForTests();
  });

  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
    session.resetSessionStateForTests();
    session._resetSessionDepsForTests();
    restoreEnv();
    process.exitCode = previousExitCode ?? 0;
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  test("constructs EngineClient and short-circuits or resets on later ensureProlog calls", async () => {
    const root = workspace();
    setEngineDeps(root);
    process.env.KIBI_BRANCH = "develop";
    spies.push(
      spyOn(EngineClient.prototype, "start").mockResolvedValue(undefined),
      spyOn(EngineClient.prototype, "isRunning").mockReturnValue(true),
      spyOn(EngineClient.prototype, "terminate").mockResolvedValue(undefined),
      spyOn(EngineClient.prototype, "getPid").mockReturnValue(42),
    );

    const first = await session.ensureProlog();
    expect(first.getPid()).toBe(42);
    const second = await session.ensureProlog();
    expect(second).toBe(first);

    process.env.KIBI_BRANCH = "feature";
    const switched = await session.ensureProlog();
    expect(switched.getPid()).toBe(42);
    expect(EngineClient.prototype.terminate).toHaveBeenCalled();
  });

  test("logs terminate failures when reset generation changes during start", async () => {
    const root = workspace();
    setFakePrologDeps(root);
    process.env.KIBI_BRANCH = "develop";
    const errors: unknown[][] = [];
    spies.push(
      spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        errors.push(args);
      }),
    );
    startImpl = async () => {
      await session.resetProlog("during start");
      session._setPrologProcessForTests({
        terminate: async () => {
          throw new Error("stale terminate failed");
        },
        isRunning: () => true,
        getPid: () => 9,
        start: async () => {},
        query: async () => ({ success: true, bindings: {} }),
      } as unknown as NonNullable<typeof session.prologProcess>);
    };

    await expect(session.ensureProlog()).rejects.toThrow(
      /reset while initialization/,
    );
    expect(
      errors.some((args) =>
        String(args[0]).includes("terminating stale Prolog after reset generation change"),
      ),
    ).toBe(true);
  });

  test("fails when initializing an empty switched branch cannot kb_save", async () => {
    const root = workspace();
    setFakePrologDeps(root);
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    queryImpl = async (goal: string) => {
      if (
        goal === "kb_save" &&
        calls.some((item) => item.includes("kb_attach") && item.includes("fresh"))
      ) {
        return { success: false, error: "empty save failed" };
      }
      return { success: true };
    };
    process.env.KIBI_BRANCH = "fresh";
    await expect(session.ensureProlog()).rejects.toThrow(
      /Failed to initialize empty branch KB/,
    );
  });
});
