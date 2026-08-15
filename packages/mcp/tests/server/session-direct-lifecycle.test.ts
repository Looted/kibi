import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import * as session from "../../src/server/session.js";

type QueryResult = { readonly success: boolean; readonly error?: string };

const originalEnv = { ...process.env };
const tempRoots: string[] = [];
const calls: string[] = [];

const fakeProlog = {
  query: mock(async (goal: string): Promise<QueryResult> => {
    calls.push(goal);
    return { success: true };
  }),
  terminate: mock(async () => {
    calls.push("terminate");
  }),
  isRunning: mock(() => true),
  getPid: mock(() => 42),
  start: mock(async () => {
    calls.push("start");
  }),
  invalidateCache: mock(() => {
    calls.push("invalidateCache");
  }),
};

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    Reflect.deleteProperty(process.env, key);
  }
  Object.assign(process.env, originalEnv);
}

function createWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-session-direct-"));
  tempRoots.push(root);
  mkdirSync(path.join(root, ".kb", "branches", "develop"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "branches", "develop", "kb.rdf"),
    "<rdf />\n",
  );
  return root;
}

function branchPath(workspace: string, branch: string): string {
  return path.join(workspace, ".kb", "branches", branch);
}

function installDeps(workspace: string): void {
  session._resetSessionDepsForTests();
  session._setSessionDepsForTests({
    PrologProcess: function (this: Record<string, unknown>) {
      Object.assign(this, fakeProlog);
      return this;
    } as unknown as Parameters<
      typeof session._setSessionDepsForTests
    >[0]["PrologProcess"],
    copyCleanSnapshot: mock((source: string, target: string) => {
      calls.push(`copy:${path.basename(source)}:${path.basename(target)}`);
      mkdirSync(target, { recursive: true });
      writeFileSync(path.join(target, "kb.rdf"), "<rdf />\n");
    }),
    createRequire: mock(() => {
      const req = ((_specifier: string) => ({
        version: "9.9.9",
      })) as unknown as NodeJS.Require;
      req.resolve = Object.assign(
        (_specifier: string) => "/virtual/kibi-cli/prolog.js",
        { paths: (_specifier: string) => [] },
      );
      return req;
    }),
    fs: {
      existsSync: (candidate) => {
        const candidatePath = String(candidate);
        return (
          candidatePath.includes("existing") ||
          candidatePath === branchPath(workspace, "develop")
        );
      },
      mkdirSync: (candidate) => {
        const candidatePath = String(candidate);
        calls.push(`mkdir:${path.basename(candidatePath)}`);
        mkdirSync(candidatePath, { recursive: true });
        writeFileSync(path.join(candidatePath, "kb.rdf"), "<rdf />\n");
        return undefined;
      },
    },
    getBranchDiagnostic: (_cwd, error) => `diagnostic ${error}`,
    isValidBranchName: (branch) => !branch.includes("/"),
    resolveActiveBranch: () => ({ branch: "develop" }),
    resolveBranchAttachment: () => ({
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: branchPath(workspace, "develop"),
      kind: "exact",
      migrationRequired: false,
    }),
    resolveKbPath: branchPath,
    resolveWorkspaceRoot: () => workspace,
  });
}

describe.serial("direct session lifecycle coverage", () => {
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
    fakeProlog.start.mockClear();
    fakeProlog.start.mockImplementation(async () => {
      calls.push("start");
    });
    fakeProlog.invalidateCache.mockClear();
    fakeProlog.invalidateCache.mockImplementation(() => {
      calls.push("invalidateCache");
    });
    session.resetSessionStateForTests();
    installDeps(createWorkspace());
  });

  afterEach(() => {
    session.resetSessionStateForTests();
    session._resetSessionDepsForTests();
    restoreEnv();
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("initializes, reuses, resets, and rejects invalid branch overrides", async () => {
    process.env.KIBI_BRANCH = "develop";

    const first = await session.ensureProlog();
    const second = await session.ensureProlog();
    await session.resetProlog("unit reset");
    process.env.KIBI_BRANCH = "bad/branch";

    expect(session.ensureProlog()).rejects.toThrow(
      "Invalid branch name from KIBI_BRANCH",
    );
    expect(second).toBe(first);
    expect(calls).toContain("start");
    expect(calls).toContain("terminate");
    expect(session.prologProcess).toBeNull();
  });

  test("creates branch KBs, switches branches, and tolerates detach warnings", async () => {
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return goal === "kb_detach"
        ? { success: false, error: "detach warning" }
        : { success: true };
    });

    process.env.KIBI_BRANCH = "feature-switch";
    await session.ensureProlog();
    session.ensureBranchKbExists(
      path.dirname(path.dirname(branchPath(createWorkspace(), "develop"))),
      "new-empty",
    );
    session.updateAttachedBranchStamp(
      await import("../../src/server/kb-freshness.js").then((m) =>
        m.readBranchKbStamp(branchPath(createWorkspace(), "develop")),
      ),
    );

    expect(calls).toContain("kb_save");
    expect(calls).toContain("kb_detach");
    expect(calls.some((call) => call.includes("feature-switch"))).toBe(true);
    expect(calls.some((call) => call.startsWith("mkdir:"))).toBe(true);
  });

  test("reports save, attach, refresh detach, and generation-change failures", async () => {
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      if (goal === "kb_save") return { success: false, error: "save denied" };
      return { success: true };
    });
    process.env.KIBI_BRANCH = "save-fail";
    expect(session.ensureProlog()).rejects.toThrow("save denied");

    await session.resetProlog("after save failure");
    process.env.KIBI_BRANCH = "develop";
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return goal.startsWith("kb_attach")
        ? { success: false, error: "attach denied" }
        : { success: true };
    });
    expect(session.ensureProlog()).rejects.toThrow("attach denied");

    fakeProlog.start.mockImplementation(async () => {
      await session.resetProlog("during initialization");
    });
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return { success: true };
    });
    expect(session.ensureProlog()).rejects.toThrow(
      "reset while initialization was in progress",
    );
  });

  test("graceful shutdown handles in-flight requests, termination errors, and early return", async () => {
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    const originalExit = process.exit;
    const exitMock = mock((_code?: string | number | null) => undefined);
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((_message?: unknown, _error?: unknown) => {});
    process.exit = exitMock as unknown as typeof process.exit;
    console.error = consoleErrorMock as typeof console.error;
    fakeProlog.terminate.mockImplementation(async () => {
      throw new Error("terminate failed");
    });

    try {
      session.inFlightRequests.set("done", Promise.resolve());
      await session.initiateGracefulShutdown(4);
      await session.initiateGracefulShutdown(5);
    } finally {
      process.exit = originalExit;
      console.error = originalConsoleError;
    }

    expect(exitMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[KIBI-MCP] Error terminating Prolog:",
      expect.any(Error),
    );
  });

  test("graceful shutdown clears timeout state when pending requests time out", async () => {
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    const originalExit = process.exit;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const originalConsoleError = console.error;
    const exitMock = mock((_code?: string | number | null) => undefined);
    const clearTimeoutMock = mock(
      (_timer?: number | string | NodeJS.Timeout) => {},
    );
    const consoleErrorMock = mock((_message?: unknown) => {});
    const timerHandle = {} as NodeJS.Timeout;
    process.exit = exitMock as unknown as typeof process.exit;
    console.error = consoleErrorMock as typeof console.error;
    globalThis.setTimeout = ((handler: TimerHandler) => {
      queueMicrotask(() => {
        if (typeof handler === "function") handler();
      });
      return timerHandle;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = clearTimeoutMock as typeof clearTimeout;

    try {
      session.inFlightRequests.set("pending", new Promise(() => {}));
      await session.initiateGracefulShutdown(6);
    } finally {
      session.inFlightRequests.clear();
      process.exit = originalExit;
      console.error = originalConsoleError;
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }

    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[KIBI-MCP] Shutdown timeout reached, forcing exit",
    );
    expect(clearTimeoutMock).toHaveBeenCalledWith(timerHandle);
    expect(exitMock).toHaveBeenCalledWith(6);
  });

  test("same-branch refresh fails closed on detach failure and retry stamp churn", async () => {
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    const attachedPath = session.attachedBranchKbPath;
    if (attachedPath === null) {
      throw new Error("Expected attached branch path after initialization");
    }
    writeFileSync(path.join(attachedPath, "kb.rdf"), "<rdf changed='one' />\n");
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      return goal === "kb_detach"
        ? { success: false, error: "detach denied" }
        : { success: true };
    });
    expect(session.ensureProlog()).rejects.toThrow("detach denied");

    session.resetSessionStateForTests();
    const workspace = createWorkspace();
    installDeps(workspace);
    process.env.KIBI_BRANCH = "develop";
    await session.ensureProlog();
    writeFileSync(
      path.join(branchPath(workspace, "develop"), "kb.rdf"),
      "<rdf changed='two' />\n",
    );
    let attachCount = 0;
    fakeProlog.query.mockImplementation(async (goal: string) => {
      calls.push(goal);
      if (goal.startsWith("kb_attach")) {
        attachCount += 1;
        if (attachCount === 1) {
          writeFileSync(
            path.join(branchPath(workspace, "develop"), "kb.rdf"),
            "<rdf changed='after-first-refresh' />\n",
          );
        }
        if (attachCount === 2) {
          writeFileSync(
            path.join(branchPath(workspace, "develop"), "kb.rdf"),
            "<rdf changed='after-second-refresh-with-longer-content' />\n",
          );
        }
      }
      return { success: true };
    });

    expect(session.ensureProlog()).rejects.toThrow(
      "stamp changed during attach",
    );
  });

  test("active-branch resolution diagnostics and debug require failures are surfaced", async () => {
    const workspace = createWorkspace();
    installDeps(workspace);
    session._setSessionDepsForTests({
      resolveBranchAttachment: () => ({
        error: "detached",
        code: "DETACHED_HEAD",
      }),
    });
    const originalConsoleError = console.error;
    const consoleErrorMock = mock((..._args: unknown[]) => {});
    console.error = consoleErrorMock as typeof console.error;
    expect(session.ensureProlog()).rejects.toThrow("detached");
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[KIBI-MCP] diagnostic detached",
    );

    session.resetSessionStateForTests();
    installDeps(workspace);
    process.env.KIBI_BRANCH = "develop";
    process.env.KIBI_MCP_DEBUG = "1";
    session._setSessionDepsForTests({
      createRequire: () => {
        throw new Error("create require denied");
      },
    });
    await session.ensureProlog();
    console.error = originalConsoleError;

    expect(
      consoleErrorMock.mock.calls.some((call) =>
        call.some((part) => String(part).includes("create require denied")),
      ),
    ).toBe(true);
  });
});
