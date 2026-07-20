import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { readBranchKbStamp } from "../../src/server/kb-freshness.js";
import * as session from "../../src/server/session.js";

type QueryResult = { readonly success: boolean; readonly error?: string };

const originalEnv = { ...process.env };
const roots: string[] = [];
const calls: string[] = [];
let currentRoot = "";

const fakeProlog = {
  query: mock(async (goal: string): Promise<QueryResult> => {
    calls.push(goal);
    return { success: true };
  }),
  terminate: mock(async () => {
    calls.push("terminate");
  }),
  isRunning: mock(() => true),
  getPid: mock(() => 7),
  start: mock(async () => {
    calls.push("start");
  }),
  invalidateCache: mock(() => {
    calls.push("invalidateCache");
  }),
};

function restoreEnv(): void {
  for (const key of Object.keys(process.env))
    Reflect.deleteProperty(process.env, key);
  Object.assign(process.env, originalEnv);
}

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-session-edges-"));
  roots.push(root);
  for (const branch of ["develop", "previous", "stable", "missing-rdf"]) {
    mkdirSync(branchPath(root, branch), { recursive: true });
    if (branch !== "missing-rdf") {
      writeFileSync(path.join(branchPath(root, branch), "kb.rdf"), "<rdf />\n");
    }
  }
  return root;
}

function branchPath(root: string, branch: string): string {
  return path.join(root, ".kb", "branches", branch);
}

function setDeps(root: string): void {
  session._resetSessionDepsForTests();
  session._setSessionDepsForTests({
    PrologProcess: function (this: Record<string, unknown>) {
      Object.assign(this, fakeProlog);
      return this;
    } as unknown as Parameters<
      typeof session._setSessionDepsForTests
    >[0]["PrologProcess"],
    copyCleanSnapshot: (source, target) => {
      calls.push(`copy:${path.basename(source)}:${path.basename(target)}`);
      mkdirSync(target, { recursive: true });
      writeFileSync(path.join(target, "kb.rdf"), "<rdf />\n");
    },
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
      existsSync: (candidate) =>
        candidate.toString().includes("previous") ||
        candidate.toString().includes("missing-rdf"),
      mkdirSync: (candidate) => {
        const target = candidate.toString();
        calls.push(`mkdir:${path.basename(target)}`);
        mkdirSync(target, { recursive: true });
        writeFileSync(path.join(target, "kb.rdf"), "<rdf />\n");
        return undefined;
      },
    },
    getBranchDiagnostic: (_cwd, error) => `diagnostic ${error}`,
    isValidBranchName: (branch) => !branch.includes("/"),
    resolveActiveBranch: () => ({ branch: "develop" }),
    resolveKbPath: branchPath,
    resolveWorkspaceRoot: () => root,
  });
}

describe.serial("direct session edge coverage", () => {
  beforeEach(() => {
    restoreEnv();
    calls.length = 0;
    fakeProlog.query.mockClear();
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return { success: true };
    });
    fakeProlog.terminate.mockClear();
    fakeProlog.terminate.mockImplementation(async () => {
      calls.push("terminate");
    });
    session.resetSessionStateForTests();
    currentRoot = workspace();
    setDeps(currentRoot);
  });

  afterEach(() => {
    session.resetSessionStateForTests();
    session._resetSessionDepsForTests();
    restoreEnv();
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  test("covers invalid branch, previous-branch copy, and reset termination errors", async () => {
    expect(() =>
      session.ensureBranchKbExists("/workspace", "bad/name"),
    ).toThrow("Invalid branch name: bad/name");
    process.env.KIBI_BRANCH = "previous";
    await session.ensureProlog();
    session.ensureBranchKbExists(currentRoot, "copy-target");
    fakeProlog.terminate.mockImplementation(async () => {
      throw new Error("reset terminate failed");
    });
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((_message?: unknown, _error?: unknown) => {});
    console.error = consoleErrorMock as typeof console.error;
    try {
      await session.resetProlog("cover reset failure");
    } finally {
      console.error = originalConsoleError;
    }

    expect(
      calls.some((call) => call.startsWith("copy:previous:copy-target")),
    ).toBe(true);
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[KIBI-MCP] Error resetting Prolog worker:",
      expect.any(Error),
    );
  });

  test("covers unstable same-branch stamps and branch attach failures", async () => {
    process.env.KIBI_BRANCH = "missing-rdf";
    await session.ensureProlog();
    expect(session.ensureProlog()).rejects.toThrow(
      "branch KB snapshot is unstable",
    );

    await session.resetProlog("after unstable");
    process.env.KIBI_BRANCH = "stable";
    await session.ensureProlog();
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      if (goal.startsWith("kb_attach"))
        return { success: false, error: "switch attach failed" };
      return { success: true };
    });
    process.env.KIBI_BRANCH = "next";
    expect(session.ensureProlog()).rejects.toThrow("switch attach failed");
  });

  test("covers debug require resolution and package metadata branches", async () => {
    const root = workspace();
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;
    process.env.KIBI_BRANCH = "develop";
    process.env.KIBI_MCP_DEBUG = "1";

    try {
      for (const mode of ["resolve", "no-version", "package-error"] as const) {
        session.resetSessionStateForTests();
        setDeps(root);
        session._setSessionDepsForTests({
          createRequire: () => {
            const req = ((_specifier: string) => {
              if (mode === "package-error") throw new Error("package denied");
              return mode === "no-version"
                ? { name: "kibi-cli" }
                : { version: "1.0.0" };
            }) as unknown as NodeJS.Require;
            req.resolve = Object.assign(
              (_specifier: string) => {
                if (mode === "resolve") throw new Error("resolve denied");
                return "/resolved";
              },
              { paths: (_specifier: string) => [] },
            );
            return req;
          },
        });
        await session.ensureProlog();
      }
    } finally {
      console.error = originalConsoleError;
    }

    const logged = consoleErrorMock.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("resolve denied");
    expect(logged).toContain("no version field");
    expect(logged).toContain("package denied");
  });

  test("covers reset cleanup while shutdown timeout is pending", async () => {
    const originalExit = process.exit;
    const originalSetTimeout = globalThis.setTimeout;
    const exitMock = mock((_code?: string | number | null) => undefined);
    process.exit = exitMock as unknown as typeof process.exit;
    globalThis.setTimeout = ((handler: TimerHandler) => {
      calls.push(
        typeof handler === "function" ? "timeout-armed" : "timeout-other",
      );
      return {} as NodeJS.Timeout;
    }) as unknown as typeof setTimeout;

    let releasePending: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      releasePending = resolve;
    });
    try {
      session.inFlightRequests.set("pending", pending);
      const shutdown = session.initiateGracefulShutdown(0);
      await Promise.resolve();
      session.resetSessionStateForTests();
      session.inFlightRequests.clear();
      releasePending();
      await shutdown;
    } finally {
      process.exit = originalExit;
      globalThis.setTimeout = originalSetTimeout;
    }

    expect(calls).toContain("timeout-armed");
  });

  test("covers same-branch refresh attach failure, retry failure, and retry success", async () => {
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    const attachedPath = session.attachedBranchKbPath;
    if (attachedPath === null) throw new Error("Expected attached branch path");
    writeFileSync(
      path.join(attachedPath, "kb.rdf"),
      "<rdf changed='attach-fail' />\n",
    );
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return goal.startsWith("kb_attach")
        ? { success: false, error: "refresh attach failed" }
        : { success: true };
    });
    expect(session.ensureProlog()).rejects.toThrow("refresh attach failed");

    session.resetSessionStateForTests();
    const unstableRoot = workspace();
    setDeps(unstableRoot);
    process.env.KIBI_BRANCH = "develop";
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      if (goal.startsWith("kb_attach")) {
        writeFileSync(
          path.join(branchPath(unstableRoot, "develop"), "kb.rdf"),
          `<rdf changed='${calls.length}'>${"x".repeat(calls.length)}</rdf>\n`,
        );
      }
      return { success: true };
    });
    await session.ensureProlog();
    const unstableCurrent = await readBranchKbStamp(
      branchPath(unstableRoot, "develop"),
    );
    session.updateAttachedBranchStamp({ ...unstableCurrent, rdfSize: -1 });
    expect(session.ensureProlog()).rejects.toThrow(
      "stamp changed during attach",
    );

    session.resetSessionStateForTests();
    const root = workspace();
    setDeps(root);
    process.env.KIBI_BRANCH = "develop";
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return { success: true };
    });
    await session.ensureProlog();
    const branch = branchPath(root, "develop");
    const current = await readBranchKbStamp(branch);
    session.updateAttachedBranchStamp({ ...current, rdfSize: -1 });
    let attachCount = 0;
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      if (goal.startsWith("kb_attach")) {
        attachCount += 1;
        if (attachCount === 1) {
          writeFileSync(
            path.join(branch, "kb.rdf"),
            "<rdf changed='once' />\n",
          );
        }
      }
      return { success: true };
    });

    const refreshed = await session.ensureProlog();
    const activeProcess = session.prologProcess;
    if (activeProcess === null)
      throw new Error("Expected active Prolog process");
    expect(refreshed).toBe(activeProcess);
  });

  test("covers stale worker termination logging after generation changes", async () => {
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((_message?: unknown, _error?: unknown) => {});
    console.error = consoleErrorMock as typeof console.error;
    process.env.KIBI_BRANCH = "develop";
    fakeProlog.start.mockImplementation(async () => {
      fakeProlog.terminate.mockImplementation(async () => {
        throw new Error("stale terminate failed");
      });
      await session.resetProlog("during start");
    });

    try {
      expect(session.ensureProlog()).rejects.toThrow(
        "reset while initialization",
      );
    } finally {
      console.error = originalConsoleError;
    }

    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[KIBI-MCP] Error resetting Prolog worker:",
      expect.any(Error),
    );
  });
});
