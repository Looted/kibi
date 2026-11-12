import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import * as runtime from "kibi-runtime";

import * as session from "../../src/server/session.js";
import * as telemetry from "../../src/usage-telemetry.js";
import { resolveKbPath } from "../../src/workspace.js";

type Result = { readonly success: boolean; readonly error?: string };

const ENV_KEYS = ["KIBI_MCP_DEBUG", "KIBI_BRANCH"] as const;
const previousEnv = ENV_KEYS.map((key) => [key, process.env[key]] as const);
const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];

/** Engine stand-in: answers each goal from `answers`, success otherwise. */
class FakeProlog {
  static instances: FakeProlog[] = [];
  static failStart = 0;
  readonly calls: string[] = [];
  answers: Record<string, Result[]> = {};
  running = true;
  constructor(readonly options: unknown) {
    FakeProlog.instances.push(this);
  }
  async start(): Promise<void> {
    this.calls.push("start");
    if (FakeProlog.failStart > 0) {
      FakeProlog.failStart -= 1;
      throw new Error("start failed");
    }
  }
  async query(goal: string): Promise<Result> {
    this.calls.push(goal);
    const key = goal.startsWith("kb_attach") ? "kb_attach" : goal;
    return this.answers[key]?.shift() ?? { success: true };
  }
  async terminate(): Promise<void> {
    this.calls.push("terminate");
    this.running = false;
  }
  isRunning(): boolean {
    return this.running;
  }
  getPid(): number {
    return 7;
  }
  invalidateCache(): void {
    this.calls.push("invalidate");
  }
}

let branch = "main";
let kbPathFor: (root: string, name: string) => string = (root, name) =>
  path.join(root, ".kb", "branches", name);

function workspace(...withStores: string[]): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-session-")));
  roots.push(root);
  for (const name of withStores) {
    mkdirSync(path.join(root, ".kb", "branches", name), { recursive: true });
    writeFileSync(path.join(root, ".kb", "branches", name, "kb.rdf"), "<rdf/>");
  }
  return root;
}

function useWorkspace(root: string, engine = false): void {
  session._resetSessionDepsForTests();
  session._setSessionDepsForTests({
    ...(engine ? {} : { PrologProcess: FakeProlog as never }),
    resolveWorkspaceRoot: () => root,
    resolveBranchAttachment: (() => ({ kbBranch: branch })) as never,
    resolveKbPath: (workspaceRoot, name) => kbPathFor(workspaceRoot, name),
    fs: {
      existsSync: (target) => fs.existsSync(target),
      mkdirSync: ((target: string) =>
        fs.mkdirSync(target, { recursive: true })) as never,
    },
  });
}

function debugLines(): () => string[] {
  process.env.KIBI_MCP_DEBUG = "1";
  const spy = spyOn(console, "error").mockImplementation(() => {});
  spy.mockClear();
  spies.push(spy);
  return () => spy.mock.calls.map((args) => args.map(String).join(" "));
}

async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a failure");
}

const last = () => FakeProlog.instances.at(-1) as FakeProlog;

beforeEach(() => {
  session.resetSessionStateForTests();
  FakeProlog.instances = [];
  FakeProlog.failStart = 0;
  branch = "main";
  kbPathFor = (root, name) => path.join(root, ".kb", "branches", name);
  for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
});

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  session.resetSessionStateForTests();
  session._resetSessionDepsForTests();
  for (const [key, value] of previousEnv) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("first start", () => {
  test("a new branch store is created, attached and saved, with each step logged", async () => {
    const root = workspace();
    useWorkspace(root);
    const lines = debugLines();
    await session.ensureProlog();
    const kbPath = path.join(root, ".kb", "branches", "main");
    expect(last().options).toStrictEqual({ timeout: 120000 });
    expect(last().calls).toStrictEqual([
      "start",
      `kb_attach('${kbPath}')`,
      "kb_save",
    ]);
    expect(lines()).toStrictEqual([
      "[KIBI-MCP] Initializing Prolog process...",
      "[KIBI-MCP] Runtime boundary: kibi-runtime",
      "[KIBI-MCP] Branch selection:",
      "[KIBI-MCP]   KIBI_BRANCH env: not set",
      "[KIBI-MCP]   Resolved branch: main",
      "[KIBI-MCP] Created empty branch KB for 'main'",
      "[KIBI-MCP] Prolog process started (PID: 7)",
      `[KIBI-MCP] KB attached: ${kbPath}`,
    ]);
    expect(session.getActiveBranchName()).toBe("main");
    expect(session.getAttachedBranchKbPath()).toBe(kbPath);
  });

  test("an existing store is only attached, and an override is named", async () => {
    const root = workspace("feat");
    useWorkspace(root);
    process.env.KIBI_BRANCH = "feat";
    const lines = debugLines();
    await session.ensureProlog();
    expect(last().calls).toStrictEqual([
      "start",
      `kb_attach('${path.join(root, ".kb", "branches", "feat")}')`,
    ]);
    expect(lines()).toContain("[KIBI-MCP]   KIBI_BRANCH env: feat");
    expect(lines()).toContain("[KIBI-MCP]   Resolved branch: feat");
  });

  test("attach and first save failures name the engine error", async () => {
    const cases: Array<[string, Result, string]> = [
      ["kb_attach", { success: false }, "Failed to attach KB: Unknown error"],
      [
        "kb_attach",
        { success: false, error: "bad" },
        "Failed to attach KB: bad",
      ],
      [
        "kb_save",
        { success: false },
        "Failed to initialize empty branch KB: Unknown error",
      ],
      [
        "kb_save",
        { success: false, error: "full" },
        "Failed to initialize empty branch KB: full",
      ],
    ];
    for (const [goal, answer, message] of cases) {
      session.resetSessionStateForTests();
      useWorkspace(workspace());
      const original = FakeProlog.prototype.start;
      const start = spyOn(FakeProlog.prototype, "start").mockImplementation(
        async function (this: FakeProlog) {
          this.answers = { [goal]: [answer] };
          return original.call(this);
        },
      );
      try {
        expect(await failure(session.ensureProlog())).toBe(message);
      } finally {
        start.mockRestore();
      }
    }
  });

  test("a cleared process starts a new engine even after initialization", async () => {
    useWorkspace(workspace("main"));
    await session.ensureProlog();
    session._setPrologProcessForTests(null);
    await session.ensureProlog();
    expect(FakeProlog.instances).toHaveLength(2);
  });
});

describe("branch switching", () => {
  async function started(...stores: string[]) {
    const root = workspace(...stores);
    useWorkspace(root);
    await session.ensureProlog();
    const engine = last();
    engine.calls.length = 0;
    return { root, engine };
  }

  test("a switch saves, detaches, attaches and initializes a new store", async () => {
    const { root, engine } = await started("main");
    const lines = debugLines();
    branch = "next";
    await session.ensureProlog();
    const kbPath = path.join(root, ".kb", "branches", "next");
    expect(engine.calls).toStrictEqual([
      "kb_save",
      "kb_detach",
      `kb_attach('${kbPath}')`,
      "kb_save",
    ]);
    expect(lines()).toStrictEqual([
      "[KIBI-MCP] Branch changed: main -> next",
      "[KIBI-MCP] Created empty branch KB for 'next'",
      "[KIBI-MCP] Re-attached to branch: next",
      `[KIBI-MCP] KB path: ${kbPath}`,
    ]);
    expect(session.getActiveBranchName()).toBe("next");
    expect(session.getAttachedBranchKbPath()).toBe(kbPath);
  });

  test("a switch to an existing store does not save it again", async () => {
    const { root, engine } = await started("main", "next");
    branch = "next";
    await session.ensureProlog();
    expect(engine.calls).toStrictEqual([
      "kb_save",
      "kb_detach",
      `kb_attach('${path.join(root, ".kb", "branches", "next")}')`,
    ]);
  });

  test("a failed detach is logged and the switch continues", async () => {
    for (const [answer, detail] of [
      [{ success: false }, "Unknown error"],
      [{ success: false, error: "busy" }, "busy"],
    ] as const) {
      session.resetSessionStateForTests();
      const { engine } = await started("main", "next");
      const lines = debugLines();
      engine.answers = { kb_detach: [answer] };
      branch = "next";
      await session.ensureProlog();
      expect(lines()).toContain(
        `[KIBI-MCP] Warning: failed to detach from old KB: ${detail}`,
      );
      expect(session.getActiveBranchName()).toBe("next");
      branch = "main";
    }
  });

  test("save, attach and first-save failures stop the switch", async () => {
    const cases: Array<[string, Result, string]> = [
      [
        "kb_save",
        { success: false },
        "Failed to save old KB before detach: Unknown error",
      ],
      [
        "kb_save",
        { success: false, error: "disk" },
        "Failed to save old KB before detach: disk",
      ],
      [
        "kb_attach",
        { success: false },
        "Failed to attach to new branch KB: Unknown error",
      ],
      [
        "kb_attach",
        { success: false, error: "no" },
        "Failed to attach to new branch KB: no",
      ],
    ];
    for (const [goal, answer, message] of cases) {
      session.resetSessionStateForTests();
      branch = "main";
      const { engine } = await started("main");
      engine.answers = { [goal]: [answer] };
      branch = "next";
      expect(await failure(session.ensureProlog())).toBe(message);
    }
    for (const [answer, message] of [
      [
        { success: false },
        "Failed to initialize empty branch KB: Unknown error",
      ],
      [
        { success: false, error: "x" },
        "Failed to initialize empty branch KB: x",
      ],
    ] as const) {
      session.resetSessionStateForTests();
      branch = "main";
      const { engine } = await started("main");
      engine.answers = { kb_save: [{ success: true }, answer] };
      branch = "next";
      expect(await failure(session.ensureProlog())).toBe(message);
    }
  });
});

describe("store refresh", () => {
  test("a changed store is detached and attached again", async () => {
    const root = workspace("main");
    useWorkspace(root);
    await session.ensureProlog();
    const engine = last();
    engine.calls.length = 0;
    await session.ensureProlog();
    expect(engine.calls).toStrictEqual([]);
    appendFileSync(path.join(root, ".kb", "branches", "main", "kb.rdf"), "x");
    await session.ensureProlog();
    expect(engine.calls).toStrictEqual([
      "invalidate",
      "kb_detach",
      `kb_attach('${path.join(root, ".kb", "branches", "main")}')`,
    ]);
  });

  test("refresh failures name the failed step", async () => {
    for (const [goal, message] of [
      ["kb_detach", "KB refresh failed: detach failed: Unknown error"],
      ["kb_attach", "KB refresh failed: attach failed: Unknown error"],
    ] as const) {
      session.resetSessionStateForTests();
      const root = workspace("main");
      useWorkspace(root);
      await session.ensureProlog();
      last().answers = { [goal]: [{ success: false }] };
      appendFileSync(path.join(root, ".kb", "branches", "main", "kb.rdf"), "x");
      expect(await failure(session.ensureProlog())).toBe(message);
    }
  });

  test("a store without kb.rdf is refused as unstable", async () => {
    const root = workspace("main");
    useWorkspace(root);
    await session.ensureProlog();
    rmSync(path.join(root, ".kb", "branches", "main", "kb.rdf"));
    expect(await failure(session.ensureProlog())).toStartWith(
      "KB refresh failed: branch KB snapshot is unstable: ",
    );
  });

  test("a store at a new path is adopted without a refresh", async () => {
    const root = workspace("main", "other");
    useWorkspace(root);
    await session.ensureProlog();
    const engine = last();
    engine.calls.length = 0;
    kbPathFor = (workspaceRoot) =>
      path.join(workspaceRoot, ".kb", "branches", "other");
    await session.ensureProlog();
    expect(session.getAttachedBranchKbPath()).toBe(
      path.join(root, ".kb", "branches", "other"),
    );
    await session.ensureProlog();
    expect(engine.calls).toStrictEqual([]);
  });

  test("a store without a recorded stamp is not refreshed", async () => {
    const root = workspace("main");
    useWorkspace(root);
    await session.ensureProlog();
    const engine = last();
    engine.calls.length = 0;
    session.updateAttachedBranchStamp(null as never);
    await session.ensureProlog();
    expect(engine.calls).toStrictEqual([]);
  });
});

describe("engine sessions", () => {
  function engineStandIn() {
    const spy = spyOn(runtime, "EngineClient").mockImplementation(
      ((options: unknown) => new FakeProlog(options)) as never,
    );
    spies.push(spy);
  }

  test("an engine start that failed is retried on the next call", async () => {
    engineStandIn();
    const root = workspace("main", "next");
    useWorkspace(root, true);
    await session.ensureProlog();
    expect(last().options).toStrictEqual({
      workspaceRoot: root,
      branch: "main",
      timeout: 120000,
    });
    branch = "next";
    FakeProlog.failStart = 1;
    expect(await failure(session.ensureProlog())).toBe("start failed");
    expect(FakeProlog.instances).toHaveLength(2);
    expect(FakeProlog.instances[0]?.calls).toContain("terminate");
    branch = "main";
    await session.ensureProlog();
    expect(FakeProlog.instances).toHaveLength(3);
  });
});

describe("state and reset", () => {
  test("a reset restores the initial state", async () => {
    useWorkspace(workspace("main"));
    await session.ensureProlog();
    session.inFlightRequests.set("r", Promise.resolve());
    session.resetSessionStateForTests();
    expect(session.getActiveBranchName()).toBe("develop");
    expect(session.getIsShuttingDown()).toBe(false);
    expect(session.getPrologProcess()).toBeNull();
    expect(session.getAttachedBranchKbPath()).toBeNull();
    expect(session.inFlightRequests.size).toBe(0);
    session._setPrologProcessForTests(new FakeProlog({}) as never);
    await session.ensureProlog();
    expect(FakeProlog.instances).toHaveLength(3);
    expect(last().calls[0]).toBe("start");
  });

  test("resetting without an engine succeeds and logs only in debug mode", async () => {
    const quiet = spyOn(console, "error").mockImplementation(() => {});
    quiet.mockClear();
    spies.push(quiet);
    await session.resetProlog("why");
    expect(quiet).not.toHaveBeenCalled();
    quiet.mockRestore();
    const lines = debugLines();
    await session.resetProlog("again");
    expect(lines()).toStrictEqual([
      "[KIBI-MCP] Resetting Prolog worker: again",
    ]);
  });

  test("an existing store is kept and a new one gets a manifest", () => {
    const root = workspace("main");
    useWorkspace(root);
    expect(session.ensureBranchKbExists(root, "main")).toBe(false);
    session._resetSessionDepsForTests();
    expect(session.ensureBranchKbExists(root, "feat")).toBe(true);
    const store = resolveKbPath(root, "feat");
    expect(existsSync(store)).toBe(true);
    expect(readdirSync(store).length).toBeGreaterThan(0);
    expect(() => session.ensureBranchKbExists(root, "bad name")).toThrow(
      "Invalid branch name: bad name",
    );
  });
});

describe("graceful shutdown", () => {
  function exits() {
    const exit = spyOn(process, "exit").mockImplementation(
      (() => undefined) as never,
    );
    spies.push(exit);
    spies.push(
      spyOn(telemetry, "flushMcpTelemetry").mockImplementation(async () => {}),
    );
    return exit;
  }

  test("an idle server stops its engine and exits with the code", async () => {
    const exit = exits();
    const lines = debugLines();
    const engine = new FakeProlog({});
    session._setPrologProcessForTests(engine as never);
    await session.initiateGracefulShutdown(3);
    expect(engine.calls).toStrictEqual(["terminate"]);
    expect(lines()).toStrictEqual([
      "[KIBI-MCP] Initiating graceful shutdown (exit code: 3)",
      "[KIBI-MCP] Cancelling active Prolog work...",
      "[KIBI-MCP] Prolog process terminated",
    ]);
    expect(exit).toHaveBeenCalledWith(3);
    expect(session.getPrologProcess()).toBeNull();
  });

  test("in-flight requests are awaited and the wait timer cleared", async () => {
    const exit = exits();
    const lines = debugLines();
    const timers: unknown[] = [];
    const realSetTimeout = globalThis.setTimeout;
    const set = spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => {
      const handle = realSetTimeout(handler, ms);
      if (ms === 10000) timers.push(handle);
      return handle;
    }) as never);
    spies.push(set);
    const clear = spyOn(globalThis, "clearTimeout");
    spies.push(clear);
    session.inFlightRequests.set("r", Promise.resolve());
    await session.initiateGracefulShutdown();
    expect(lines()).toStrictEqual([
      "[KIBI-MCP] Initiating graceful shutdown (exit code: 0)",
      "[KIBI-MCP] Waiting for 1 in-flight requests to complete...",
      "[KIBI-MCP] All in-flight requests completed",
    ]);
    expect(timers).toHaveLength(1);
    expect(clear.mock.calls.some(([handle]) => handle === timers[0])).toBe(
      true,
    );
    expect(exit).toHaveBeenCalledWith(0);
  });

  test("a reset clears a pending shutdown wait", async () => {
    exits();
    const timers: unknown[] = [];
    const realSetTimeout = globalThis.setTimeout;
    const set = spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => {
      const handle = realSetTimeout(handler, ms);
      if (ms === 10000) timers.push(handle);
      return handle;
    }) as never);
    spies.push(set);
    session.inFlightRequests.set("r", new Promise(() => {}));
    void session.initiateGracefulShutdown();
    await Promise.resolve();
    expect(timers).toHaveLength(1);
    const clear = spyOn(globalThis, "clearTimeout");
    spies.push(clear);
    session.resetSessionStateForTests();
    expect(clear.mock.calls.some(([handle]) => handle === timers[0])).toBe(
      true,
    );
  });
});
