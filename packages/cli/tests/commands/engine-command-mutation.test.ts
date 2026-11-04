import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import {
  engineJanitorCommand,
  engineStatusCommand,
  engineStopCommand,
  storageCompactCommand,
  storageExportCommand,
  storageStatusCommand,
} from "../../src/commands/engine.js";
import * as engineModule from "../../src/engine.js";
import { EngineClient } from "../../src/engine.js";
import * as janitor from "../../src/prolog/janitor.js";
import * as storeLock from "../../src/prolog/store-lock.js";
import * as resolver from "../../src/utils/branch-resolver.js";

const ENV_KEYS = ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"] as const;
const restores: Array<() => void> = [];
let logs: string[] = [];
let events: unknown[] = [];

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

beforeEach(() => {
  logs = [];
  events = [];
  const saved = ENV_KEYS.map((key) => process.env[key]);
  for (const key of ENV_KEYS) delete process.env[key];
  restores.push(() =>
    ENV_KEYS.forEach((key, index) => {
      const value = saved[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }),
  );
  track(
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
  );
  track(
    spyOn(resolver, "resolveReadBranchAttachment").mockImplementation(((
      root: string,
    ) => {
      events.push(["resolveRead", root]);
      return { kbBranch: "kb-main", storePath: "/store" };
    }) as never),
  );
  track(
    spyOn(EngineClient.prototype, "terminate").mockImplementation(async () => {
      events.push("terminate");
    }),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
});

type Self = { workspaceRoot: string; branch: string };

function stubEngine(
  name: keyof EngineClient,
  answer: (self: Self, ...args: unknown[]) => unknown,
) {
  return track(
    spyOn(EngineClient.prototype, name as never).mockImplementation(function (
      this: Self,
      ...args: unknown[]
    ) {
      events.push([name, this.workspaceRoot, this.branch, ...args]);
      return answer(this, ...args);
    } as never),
  );
}

describe("engineStatusCommand", () => {
  test("prints the decoded status of the engine at the workspace", async () => {
    process.env.KIBI_ROOT = "/root-ws";
    stubEngine("storageStatus", async () => ({
      success: true,
      bindings: { Status: "raw", Json: JSON.stringify('{"open":true}') },
    }));
    stubEngine("getPid", () => 41);
    stubEngine("isRunning", () => true);
    await engineStatusCommand();
    expect(logs).toStrictEqual([
      JSON.stringify({
        pid: 41,
        running: true,
        branch: "kb-main",
        status: { open: true },
      }),
    ]);
    expect(events).toStrictEqual([
      ["resolveRead", path.resolve("/root-ws")],
      ["storageStatus", path.resolve("/root-ws"), "kb-main"],
      ["getPid", path.resolve("/root-ws"), "kb-main"],
      ["isRunning", path.resolve("/root-ws"), "kb-main"],
      ["resolveRead", path.resolve("/root-ws")],
      "terminate",
    ]);
  });

  test("decodes single JSON and keeps the raw status otherwise", async () => {
    stubEngine("getPid", () => 1);
    stubEngine("isRunning", () => false);
    const answers = [
      { Status: "raw", Json: '{"a":1}' },
      { Status: "raw", Json: "not json" },
      { Status: "raw" },
      {},
    ];
    stubEngine("storageStatus", async () => ({
      success: true,
      bindings: answers.shift(),
    }));
    for (let index = 0; index < 4; index++) await engineStatusCommand();
    expect(logs.map((line) => JSON.parse(line).status)).toStrictEqual([
      { a: 1 },
      "raw",
      "raw",
      null,
    ]);
  });

  test("reports a failed status and still terminates", async () => {
    const answers = [
      { success: false, error: "engine down", bindings: {} },
      { success: false, bindings: {} },
    ];
    stubEngine("storageStatus", async () => answers.shift());
    await expect(engineStatusCommand()).rejects.toThrow(
      new Error("engine down"),
    );
    await expect(storageStatusCommand()).rejects.toThrow(
      new Error("Engine status failed"),
    );
    expect(events.filter((event) => event === "terminate")).toHaveLength(2);
  });

  test("refuses a branch that cannot be resolved", async () => {
    track(
      spyOn(resolver, "resolveReadBranchAttachment").mockReturnValue({
        error: "no branch",
      } as never),
    );
    await expect(engineStatusCommand()).rejects.toThrow(new Error("no branch"));
  });

  test("prefers KIBI_WORKSPACE, then KIBI_PROJECT_ROOT, then KIBI_ROOT, then the cwd", async () => {
    stubEngine("storageStatus", async () => ({ success: true, bindings: {} }));
    stubEngine("getPid", () => 1);
    stubEngine("isRunning", () => true);
    const roots: unknown[] = [];
    const run = async () => {
      events = [];
      await engineStatusCommand();
      roots.push((events[1] as unknown[])[1]);
    };
    await run();
    process.env.KIBI_ROOT = "/c";
    await run();
    process.env.KIBI_PROJECT_ROOT = "/b";
    await run();
    process.env.KIBI_WORKSPACE = "/a";
    await run();
    expect(roots).toStrictEqual([
      process.cwd(),
      path.resolve("/c"),
      path.resolve("/b"),
      path.resolve("/a"),
    ]);
  });
});

describe("engineStopCommand", () => {
  test("stops a running engine without starting one", async () => {
    const stop = stubEngine("stop", async () => true);
    await engineStopCommand();
    expect(logs).toStrictEqual(["Kibi engine stopped"]);
    expect(stop.mock.calls as unknown[]).toStrictEqual([[false]]);
    expect(events.at(-1)).toBe("terminate");
  });

  test("names the socket and a live lock holder when none answered", async () => {
    process.env.KIBI_WORKSPACE = "/ws";
    stubEngine("stop", async () => false);
    track(
      spyOn(engineModule, "engineSocketPath").mockImplementation(
        (root: string, branch: string) => `${root}#${branch}.sock`,
      ),
    );
    const owner = { pid: 77 };
    track(
      spyOn(storeLock, "readStoreLockOwner").mockImplementation(((
        store: string,
      ) => {
        events.push(["owner", store]);
        return { owner, journalPath: "/j" };
      }) as never),
    );
    const states: string[] = ["alive", "dead", "alive"];
    track(
      spyOn(storeLock, "classifyStoreLockHolder").mockImplementation(((
        given: unknown,
      ) => {
        expect(given).toBe(owner);
        return states.shift();
      }) as never),
    );
    track(
      spyOn(storeLock, "lockHolderProcess").mockImplementation(((
        pid: number,
      ) => ({
        pid: pid + 1,
      })) as never),
    );
    track(
      spyOn(storeLock, "describeLockHolderPid").mockImplementation(
        (pid: number) => `pid ${pid} (described)`,
      ),
    );
    await engineStopCommand();
    await engineStopCommand();
    owner.pid = undefined as never;
    await engineStopCommand();
    const socket = `No Kibi engine answered at ${path.resolve("/ws")}#kb-main.sock`;
    expect(logs).toStrictEqual([
      socket,
      "The branch store is still held by pid 77 (described). That engine was likely started with a different KIBI_RUNTIME_DIR, XDG_RUNTIME_DIR or TMPDIR; stop it from the same environment, or end pid 78.",
      socket,
      socket,
    ]);
    expect(events).toContainEqual(["owner", "/store"]);
  });

  test("says nothing more without a resolvable store or a lock journal", async () => {
    stubEngine("stop", async () => false);
    track(spyOn(engineModule, "engineSocketPath").mockReturnValue("/s.sock"));
    const owner = track(
      spyOn(storeLock, "readStoreLockOwner").mockReturnValue(null),
    );
    await engineStopCommand();
    const calls: number[] = [];
    track(
      spyOn(resolver, "resolveReadBranchAttachment").mockImplementation((() => {
        calls.push(1);
        return calls.length <= 2
          ? { kbBranch: "kb-main", storePath: "/store" }
          : { error: "gone" };
      }) as never),
    );
    await engineStopCommand();
    expect(logs).toStrictEqual([
      "No Kibi engine answered at /s.sock",
      "No Kibi engine answered at /s.sock",
    ]);
    expect(owner.mock.calls).toHaveLength(1);
  });
});

describe("engineJanitorCommand", () => {
  const findings = [
    {
      kind: "takeover-record",
      action: "clean",
      recordPath: "/r.json",
      at: "2026-01-01",
    },
    {
      kind: "store-lock",
      action: "clean",
      storePath: "/store",
      pid: 5,
      workspaceRoot: "/ws",
      holderState: "dead",
    },
    {
      kind: "store-lock",
      action: "keep",
      storePath: "/store2",
      holderState: "alive",
    },
    {
      kind: "socket",
      action: "clean",
      socketPath: "/s.sock",
      pid: 9,
      workspaceRoot: "/ignored",
      holderState: "dead",
    },
  ];

  function stubJanitor(answer: unknown[]) {
    const calls: unknown[] = [];
    track(
      spyOn(janitor, "runJanitor").mockImplementation(((options: unknown) => {
        calls.push(options);
        return answer;
      }) as never),
    );
    track(spyOn(engineModule, "runtimeDirectory").mockReturnValue("/run"));
    return calls;
  }

  test("reports each finding and what could be cleaned", async () => {
    process.env.KIBI_WORKSPACE = "/ws";
    const calls = stubJanitor(findings);
    await engineJanitorCommand({});
    expect(calls).toStrictEqual([
      {
        workspaceRoot: path.resolve("/ws"),
        runtimeDirectory: "/run",
        all: false,
        apply: false,
      },
    ]);
    expect(logs).toStrictEqual([
      "[clean] takeover record /r.json at=2026-01-01 (past the kb_status notice window)",
      "[clean] store /store pid=5 workspace=/ws holder=dead",
      "[keep] store /store2 holder=alive",
      "[clean] socket /s.sock pid=9 holder=dead",
      "4 finding(s), 3 cleanable (report only; re-run with --apply)",
    ]);
  });

  test("applies and reports the cleaned count", async () => {
    const calls = stubJanitor(findings);
    await engineJanitorCommand({ all: true, apply: true });
    expect(calls).toStrictEqual([
      {
        workspaceRoot: process.cwd(),
        runtimeDirectory: "/run",
        all: true,
        apply: true,
      },
    ]);
    expect(logs.at(-1)).toBe("4 finding(s), 3 cleaned");
  });

  test("prints JSON or says there is nothing", async () => {
    stubJanitor(findings);
    await engineJanitorCommand({ format: "json" });
    await engineJanitorCommand({ format: "json", apply: true });
    expect(logs).toStrictEqual([
      JSON.stringify({ findings, cleaned: 0, cleanable: 3, total: 4 }),
      JSON.stringify({ findings, cleaned: 3, cleanable: 3, total: 4 }),
    ]);
    logs = [];
    stubJanitor([]);
    await engineJanitorCommand({ format: "table" });
    expect(logs).toStrictEqual(["No engine or lock artifacts found."]);
  });
});

describe("storage commands", () => {
  function attachment(answer: unknown) {
    return track(
      spyOn(resolver, "resolveBranchAttachment").mockImplementation(((
        root: string,
      ) => {
        events.push(["resolve", root]);
        return answer;
      }) as never),
    );
  }

  test("compacts the active store", async () => {
    process.env.KIBI_ROOT = "/ws";
    attachment({ kbBranch: "kb-main", migrationRequired: false });
    stubEngine("compact", async () => ({ success: true, bindings: {} }));
    await storageCompactCommand();
    expect(logs).toStrictEqual(["Kibi storage compacted"]);
    expect(events).toStrictEqual([
      ["resolve", path.resolve("/ws")],
      ["resolveRead", path.resolve("/ws")],
      ["compact", path.resolve("/ws"), "kb-main"],
      "terminate",
    ]);
  });

  test("refuses unresolved or legacy attachments and failed compactions", async () => {
    const spy = attachment({ error: "no branch" });
    await expect(storageCompactCommand()).rejects.toThrow(
      new Error("no branch"),
    );
    spy.mockImplementation((() => ({
      gitBranch: "main",
      kbBranch: "master",
      migrationRequired: true,
    })) as never);
    await expect(storageCompactCommand()).rejects.toThrow(
      new Error(
        "Storage compaction blocked by legacy attachment (main -> master); migrate the branch KB first.",
      ),
    );
    expect(events.filter((event) => event === "terminate")).toHaveLength(0);
    spy.mockImplementation((() => ({ migrationRequired: false })) as never);
    const answers = [
      { success: false, error: "disk full", bindings: {} },
      { success: false, bindings: {} },
    ];
    stubEngine("compact", async () => answers.shift());
    await expect(storageCompactCommand()).rejects.toThrow(
      new Error("disk full"),
    );
    await expect(storageCompactCommand()).rejects.toThrow(
      new Error("Storage compaction failed"),
    );
    expect(events.filter((event) => event === "terminate")).toHaveLength(2);
  });

  test("exports the store to the resolved output", async () => {
    const answers = [
      { success: true, bindings: {} },
      { success: false, error: "denied", bindings: {} },
      { success: false, bindings: {} },
    ];
    const exported = stubEngine("exportStorage", async () => answers.shift());
    await storageExportCommand({ output: "out/dir" });
    expect(logs).toStrictEqual([
      `Exported Kibi storage to ${path.resolve("out/dir")}`,
    ]);
    expect(exported.mock.calls[0] as unknown).toStrictEqual([
      path.resolve("out/dir"),
    ]);
    await expect(storageExportCommand({ output: "x" })).rejects.toThrow(
      new Error("denied"),
    );
    await expect(storageExportCommand({ output: "x" })).rejects.toThrow(
      new Error("Storage export failed"),
    );
    expect(events.filter((event) => event === "terminate")).toHaveLength(3);
  });
});
