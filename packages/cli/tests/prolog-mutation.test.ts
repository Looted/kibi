import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import Module from "node:module";
import * as perf from "../src/performance-trace.js";
import {
  PrologProcess,
  PrologProcessTerminatedError,
  bindProcessExitHandler,
  registerProcessExitOnce,
  resolveKbPlPath,
} from "../src/prolog.js";

// Every child process here is an in-memory fake: no SWI-Prolog runs.
const KB = "/kb/src/kb.pl";
const FRAME = "__KIBI_QUERY_FRAME_END__\ntrue.\n\n";
const STDERR_END = "__KIBI_QUERY_STDERR_END__\n";
const UTF8 =
  "set_prolog_flag(encoding, utf8), set_stream(user_input, encoding(utf8)), set_stream(user_output, encoding(utf8)), set_stream(user_error, encoding(utf8))";
const ENV_KEYS = [
  "KIBI_KB_PL_PATH",
  "KIBI_PROLOG_DEBUG",
  "KIBI_PERF_TIMINGS",
  "KIBI_PACKAGE_VERSIONS",
  "NODE_ENV",
] as const;
const savedEnv: Record<string, string | undefined> = {};
const live: PrologProcess[] = [];

type Reply = {
  out?: string;
  err?: string;
  frame?: boolean;
  exit?: boolean;
  silent?: boolean;
  chunks?: string[];
};

let nextPid = 4242;

class FakeChild extends EventEmitter {
  stdout: EventEmitter | null = new EventEmitter();
  stderr: EventEmitter | null = new EventEmitter();
  stdin: (EventEmitter & { write(c: string): boolean; end(): void }) | null;
  written: string[] = [];
  ended = false;
  pid: number | undefined = nextPid++;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  killed = false;
  kills: Array<NodeJS.Signals | undefined> = [];
  closeOnSignal = true;

  constructor(respond: (child: FakeChild, chunk: string) => void = () => {}) {
    super();
    this.stdin = Object.assign(new EventEmitter(), {
      write: (chunk: string) => {
        this.written.push(chunk);
        respond(this, chunk);
        return true;
      },
      end: () => {
        this.ended = true;
      },
    });
  }

  out(text: string | Buffer): void {
    this.stdout?.emit("data", Buffer.from(text));
  }

  err(text: string | Buffer): void {
    this.stderr?.emit("data", Buffer.from(text));
  }

  close(code: number | null, signal: NodeJS.Signals | null): void {
    this.exitCode = code;
    this.signalCode = signal;
    queueMicrotask(() => this.emit("close", code, signal));
  }

  signal(signal: NodeJS.Signals | undefined): void {
    this.kills.push(signal);
    if (this.closeOnSignal) {
      this.killed = true;
      this.close(null, signal ?? "SIGTERM");
    }
  }

  kill(signal?: NodeJS.Signals): boolean {
    this.signal(signal);
    return true;
  }
}

function interactive(script: (goal: string) => Reply = () => ({})) {
  return (child: FakeChild, chunk: string) => {
    if (chunk === "true.\n") {
      queueMicrotask(() => child.out("true.\n\n"));
      return;
    }
    const reply = script(chunk);
    if (reply.chunks) {
      child.err(STDERR_END);
      const emitNext = () => {
        const next = reply.chunks?.shift();
        if (next === undefined) return;
        child.out(next);
        setImmediate(emitNext);
      };
      queueMicrotask(emitNext);
      return;
    }
    if (reply.silent) {
      if (reply.err !== undefined) {
        const err = reply.err;
        queueMicrotask(() => child.err(err));
      }
      return;
    }
    queueMicrotask(() => {
      if (reply.err !== undefined) child.err(reply.err);
      if (reply.frame !== false) child.err(STDERR_END);
      child.out(reply.out ?? "true.\n\n");
      if (reply.frame !== false) child.out(FRAME);
      if (reply.exit) child.close(1, null);
    });
  };
}

type Spawned = {
  bin: string;
  args: string[];
  options: Record<string, unknown>;
};
let spawned: Spawned[] = [];
let queue: Array<FakeChild | Error | string> = [];
let groupKills: Array<[number, NodeJS.Signals | number | undefined]> = [];
let groupKillFails = false;
let children = new Map<number, FakeChild>();

function oneShotChild(reply: {
  out?: string;
  err?: string;
  code?: number | null;
  error?: Error;
  hang?: boolean;
}): FakeChild {
  const child = new FakeChild();
  child.stdin = null;
  queueMicrotask(() => {
    if (reply.err !== undefined) child.err(reply.err);
    if (reply.out !== undefined) child.out(reply.out);
    if (reply.hang) return;
    if (reply.error) {
      child.emit("error", reply.error);
      return;
    }
    child.close(reply.code ?? 0, null);
  });
  return child;
}

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
  process.env.KIBI_KB_PL_PATH = KB;
  process.env.KIBI_PACKAGE_VERSIONS = "kibi-cli@1";
  spawned = [];
  queue = [];
  groupKills = [];
  groupKillFails = false;
  children = new Map();
  nextPid = 4242;
  spyOn(childProcess, "spawn").mockImplementation(((
    bin: string,
    args: string[],
    options: Record<string, unknown>,
  ) => {
    spawned.push({ bin, args, options });
    const next = queue.shift() ?? oneShotChild({ out: "__KIBI_TRUE__.\n" });
    if (typeof next === "string" || next instanceof Error) throw next;
    if (next.pid !== undefined) children.set(next.pid, next);
    return next;
  }) as never);
  spyOn(process, "kill").mockImplementation(((
    pid: number,
    signal?: NodeJS.Signals | number,
  ) => {
    groupKills.push([pid, signal]);
    if (groupKillFails) throw new Error("ESRCH");
    children.get(-pid)?.signal(signal as NodeJS.Signals);
    return true;
  }) as never);
});

afterEach(async () => {
  for (const prolog of live.splice(0)) await prolog.terminate();
  mock.restore();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = savedEnv[key];
  }
});

function make(options: ConstructorParameters<typeof PrologProcess>[0] = {}) {
  const prolog = new PrologProcess({ swiplPath: "swipl", ...options });
  live.push(prolog);
  return prolog;
}

async function started(
  script?: (goal: string) => Reply,
  options: ConstructorParameters<typeof PrologProcess>[0] = {},
) {
  const child = new FakeChild(interactive(script));
  queue.push(child);
  const prolog = make({ oneShot: false, ...options });
  await prolog.start();
  return { prolog, child };
}

type Privates = {
  timeout: number;
  maxOutputBytes: number;
  useOneShotMode: boolean;
  explicitSwiplPath: string | undefined;
  terminationReason: string | null;
  translateError(text: string): string;
  extractBindings(text: string): Record<string, string>;
  classifyErrorOutput(text: string): { message: string; record?: unknown };
  goalLabel(goal: string): string;
  addDiagnosticStage(message: string, goal: string, text: string): string;
  lastDiagnosticStage(text: string): string | null;
  normalizeGoal(goal: string): string;
  isCacheableGoal(goal: string): boolean;
  isMutatingGoal(goal: string): boolean;
  launchTarget(): { bin: string; env: Record<string, string> };
};

function inner(prolog: PrologProcess): Privates {
  return prolog as unknown as Privates;
}

function wrapped(goal: string): string {
  const report =
    "(write(user_error, '__KIBI_ERROR__:'), write_term(user_error, _E, [quoted(true), max_depth(8)]), nl(user_error), print_message(error, _E), fail)";
  const body = /^once\s*\(/.test(goal)
    ? `catch(${goal}, _E, ${report})`
    : `catch(once((${goal})), _E, ${report})`;
  return `${body}.\nwriteln(user_error, '__KIBI_QUERY_STDERR_END__'), writeln('__KIBI_QUERY_FRAME_END__').\n`;
}

describe("resolveKbPlPath", () => {
  type Resolver = typeof Module & {
    _resolveFilename: (request: string, ...rest: unknown[]) => string;
  };
  const host = Module as unknown as Resolver;

  let restoreResolve: (() => void) | null = null;
  afterEach(() => {
    restoreResolve?.();
    restoreResolve = null;
  });

  function patchResolve(impl: (request: string) => string): void {
    const original = host._resolveFilename;
    host._resolveFilename = (request: string, ...rest: unknown[]) =>
      String(request).startsWith("kibi-core")
        ? impl(request)
        : original.call(Module, request, ...rest);
    restoreResolve = () => {
      host._resolveFilename = original;
    };
  }

  test("prefers the override", () => {
    expect(resolveKbPlPath()).toBe(KB);
  });

  test("resolves the kb.pl file of the installed package", () => {
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    patchResolve((request) => `/pkg/${request}`);
    expect(resolveKbPlPath()).toBe("/pkg/kibi-core/src/kb.pl");
  });

  test("derives kb.pl from the package entry point", () => {
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    patchResolve((request) => {
      if (request === "kibi-core") return "/pkg/core/dist/index.js";
      throw new Error("no file export");
    });
    expect(resolveKbPlPath()).toBe("/pkg/core/dist/src/kb.pl");
  });

  test("walks up to the monorepo source and fails outside it", async () => {
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    patchResolve(() => {
      throw new Error("not installed");
    });
    const found = resolveKbPlPath();
    expect(found.endsWith("/packages/core/src/kb.pl")).toBe(true);
    const fs = await import("node:fs");
    spyOn(fs, "existsSync").mockReturnValue(false);
    expect(() => resolveKbPlPath()).toThrow(
      "Unable to resolve kb.pl. Expected kibi-core to be installed (node_modules) or to be running inside the monorepo checkout.",
    );
  });
});

describe("process exit handlers", () => {
  test("register once", () => {
    const registered: Array<[string, () => void]> = [];
    const on = (event: "exit", listener: () => void) => {
      registered.push([event, listener]);
    };
    const first = () => {};
    expect(registerProcessExitOnce(null, first, on)).toBe(first);
    expect(registerProcessExitOnce(first, () => {}, on)).toBe(first);
    expect(registered).toStrictEqual([["exit", first]]);
  });

  test("bind a terminate call and default to process.on", () => {
    const calls: string[] = [];
    const registered: Array<() => void> = [];
    const handler = bindProcessExitHandler(
      null,
      () => {
        calls.push("terminate");
      },
      (_event, listener) => registered.push(listener),
    );
    expect(registered).toStrictEqual([handler]);
    handler();
    expect(calls).toStrictEqual(["terminate"]);
    const on = spyOn(process, "on").mockImplementation(
      (() => process) as never,
    );
    const viaProcess = registerProcessExitOnce(null, () => {});
    const bound = bindProcessExitHandler(null, () => {});
    expect(on.mock.calls.map((call): unknown => call)).toStrictEqual([
      ["exit", viaProcess],
      ["exit", bound],
    ]);
  });

  test("attach the terminate handler to process exit once", async () => {
    const prolog = make({ oneShot: false });
    const registered: Array<() => void> = [];
    const on = (_event: "exit", listener: () => void) => {
      registered.push(listener);
    };
    prolog.attachProcessExitHandler(on);
    prolog.attachProcessExitHandler(on);
    expect(registered).toHaveLength(1);
    const terminate = spyOn(prolog, "terminate");
    registered[0]?.();
    expect(terminate).toHaveBeenCalledTimes(1);
    const processOn = spyOn(process, "on").mockImplementation(
      (() => process) as never,
    );
    make().attachProcessExitHandler();
    expect(processOn.mock.calls.map((call): unknown => call[0])).toStrictEqual([
      "exit",
    ]);
  });
});

describe("PrologProcessTerminatedError", () => {
  test("names the reason and the remedy", () => {
    const error = new PrologProcessTerminatedError("crash");
    expect([error.name, error.code, error.reason, error.message]).toStrictEqual(
      [
        "PrologProcessTerminatedError",
        "prolog_process_terminated",
        "crash",
        "Kibi Prolog process is no longer running (crash); the interactive session and its attached KB were lost. The owning engine must restart it before serving more queries — run 'kibi engine stop' and retry if this persists.",
      ],
    );
    expect(error).toBeInstanceOf(Error);
  });
});

describe("constructor options", () => {
  test("default the timeout, output cap and executable", () => {
    const fields = inner(new PrologProcess());
    expect([
      fields.timeout,
      fields.maxOutputBytes,
      fields.explicitSwiplPath,
    ]).toStrictEqual([30000, 8 * 1024 * 1024, undefined]);
    const custom = inner(
      new PrologProcess({ timeout: 5, maxOutputBytes: 7, swiplPath: "" }),
    );
    expect([
      custom.timeout,
      custom.maxOutputBytes,
      custom.explicitSwiplPath,
    ]).toStrictEqual([5, 7, undefined]);
    for (const maxOutputBytes of [0, -1, 1.5]) {
      expect(inner(new PrologProcess({ maxOutputBytes })).maxOutputBytes).toBe(
        8 * 1024 * 1024,
      );
    }
    expect(inner(new PrologProcess({ maxOutputBytes: 1 })).maxOutputBytes).toBe(
      1,
    );
  });

  test("choose one-shot mode only for Bun tests unless told", () => {
    expect(inner(new PrologProcess()).useOneShotMode).toBe(false);
    process.env.NODE_ENV = "test";
    expect(inner(new PrologProcess()).useOneShotMode).toBe(true);
    expect(inner(new PrologProcess({ oneShot: false })).useOneShotMode).toBe(
      false,
    );
    process.env.NODE_ENV = "production";
    expect(inner(new PrologProcess()).useOneShotMode).toBe(false);
    expect(inner(new PrologProcess({ oneShot: true })).useOneShotMode).toBe(
      true,
    );
  });

  test("launch an explicit executable or the resolved one", () => {
    expect(inner(make({ swiplPath: "/bin/x" })).launchTarget()).toStrictEqual({
      bin: "/bin/x",
      env: {},
    });
    const resolved = inner(
      new PrologProcess({
        swiplResolver: () => ({ bin: "/r/swipl", home: "/r/home" }) as never,
      }),
    );
    expect(resolved.launchTarget()).toStrictEqual({
      bin: "/r/swipl",
      env: { SWI_HOME_DIR: "/r/home" },
    });
  });
});

describe("pure helpers", () => {
  const p = () => inner(new PrologProcess());

  test("normalize, label and stage goals", () => {
    expect(p().normalizeGoal("  a(X)...  ")).toBe("a(X)");
    expect(p().normalizeGoal("a.b")).toBe("a.b");
    expect(p().goalLabel("  kb_x:goal_1(A)")).toBe("kb_x:goal_1");
    expect(p().goalLabel("Foo(a)")).toBe("anonymous");
    expect(p().goalLabel("a:B")).toBe("a");
    expect(p().lastDiagnosticStage("x")).toBeNull();
    expect(
      p().lastDiagnosticStage("__KIBI_STAGE__:one\n__KIBI_STAGE__:two three\n"),
    ).toBe("two");
    for (const goal of [
      "kb_commit_upsert(x)",
      "kb_preview_upsert_contradiction(x)",
    ]) {
      expect(p().addDiagnosticStage("m", goal, "__KIBI_STAGE__:s")).toBe(
        "m (stage=s)",
      );
      expect(p().addDiagnosticStage("m", goal, "")).toBe("m");
    }
    expect(p().addDiagnosticStage("m", "kb_save", "__KIBI_STAGE__:s")).toBe(
      "m",
    );
  });

  test("classify cacheable and mutating goals", () => {
    for (const goal of [
      "rdf_transaction(x)",
      "kb_assert_entity(x)",
      "kb_attach('x')",
      "kb_detach",
      "kb_save",
      "kb_storage_status(x)",
      "kb_storage_compact(x)",
      "kb_storage_export(x)",
      "status:x",
      "kb_commit_upsert(x)",
      "kb_preview_upsert_contradiction(x)",
      "kb_saved(x)",
    ])
      expect([goal, p().isCacheableGoal(` ${goal} `)]).toStrictEqual([
        goal,
        false,
      ]);
    for (const goal of ["kb_entity(x)", "kb_assert(x)", "rdf(x)"])
      expect([goal, p().isCacheableGoal(` ${goal} `)]).toStrictEqual([
        goal,
        true,
      ]);
    for (const goal of [
      "kb_assert_x",
      "kb_delete_x",
      "kb_retract_x",
      "kb_commit_x",
      "kb_save_x",
      "kb_log_x",
      "kb_save",
      "a, kb_save, b",
      "rdf_assert(x)",
      "rdf_retract(x)",
    ])
      expect([goal, p().isMutatingGoal(goal)]).toStrictEqual([goal, true]);
    for (const goal of ["kb_saved", "xkb_save", "kb_query(x)", "rdf(x)"])
      expect([goal, p().isMutatingGoal(goal)]).toStrictEqual([goal, false]);
  });

  test("extract multi-line bindings", () => {
    expect(
      p().extractBindings(
        'noise\nX = 1,\nJson = "{\n  \\"a\\": 1\n}",\n_Y=b.\n',
      ),
    ).toStrictEqual({ X: "1", Json: '"{\n  \\"a\\": 1\n}"', _Y: "b" });
    expect(p().extractBindings("true.")).toStrictEqual({});
    expect(p().extractBindings("A = x .")).toStrictEqual({ A: "x " });
  });

  test("prefer a structured error record", () => {
    const record = p().classifyErrorOutput(
      "__KIBI_ERROR__:error(permission_error(save,kb,stale_snapshot),kb_save/0)\nERROR: x\n",
    );
    expect(record.message).toBe(
      "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
    );
    expect(record.record).toBeDefined();
    expect(p().classifyErrorOutput("ERROR: plain\n")).toStrictEqual({
      message: "plain",
    });
  });
});

describe("translateError", () => {
  const tr = (text: string) => inner(new PrologProcess()).translateError(text);

  test("names a missing dictionary key or procedure", () => {
    expect(
      tr("__KIBI_ERROR__:error(existence_error(key,'my-Key_1'),x)\n"),
    ).toBe("Predicate or file not found (missing dictionary key: my-Key_1)");
    expect(tr("__KIBI_ERROR__:error(existence_error(key, k),x)\n")).toBe(
      "Predicate or file not found (missing dictionary key: k)",
    );
    expect(tr("__KIBI_ERROR__:error(existence_error(key,1k),x)\n")).toBe(
      "Predicate or file not found",
    );
    expect(
      tr(`__KIBI_ERROR__:error(existence_error(key,${"k".repeat(97)}),x)\n`),
    ).toBe("Predicate or file not found");
    expect(
      tr("__KIBI_ERROR__:error(existence_error(procedure,kb:foo_1/12),x)\n"),
    ).toBe("Predicate or file not found (missing procedure: kb:foo_1/12)");
    expect(
      tr("__KIBI_ERROR__:error(existence_error(procedure,foo/1,y),x)\n"),
    ).toBe("Predicate or file not found (missing procedure: foo/1)");
    for (const bad of ["foo", "foo/1234", "1foo/1", "a:1b/1", "foo/1x"])
      expect(
        tr(`__KIBI_ERROR__:error(existence_error(procedure,${bad}),x)\n`),
      ).toBe("Predicate or file not found");
    expect(tr("x __KIBI_ERROR__:error(existence_error(key,k),x)\n")).toBe(
      "Predicate or file not found",
    );
    expect(tr("__KIBI_ERROR__:error(existence_error(other,k),x)\n")).toBe(
      "Unknown error",
    );
  });

  test("recognizes stale snapshots and audit locks", () => {
    expect(tr("ERROR: stale_snapshot")).toBe(
      "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
    );
    const locked =
      "Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying";
    expect(tr("ERROR: audit_log lock")).toBe(locked);
    expect(tr("ERROR: audit.log permission")).toBe(locked);
    expect(tr("ERROR: Resource temporarily unavailable lock")).toBe(locked);
    expect(tr("ERROR: audit_log busy")).toBe("audit_log busy");
    expect(tr("ERROR: plain lock")).toBe("plain lock");
    expect(tr("__KIBI_STAGE__:audit_log lock\nERROR: other\n")).toBe("other");
    expect(tr("__KIBI_RUNTIME__:audit_log lock\r\nERROR: other\n")).toBe(
      "other",
    );
    expect(tr("x__KIBI_STAGE__:stale_snapshot\nERROR: y")).toBe(
      "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
    );
  });

  test("names missing entities and invalid relationships", () => {
    expect(
      tr(
        "ERROR: Target entity does not exist: entity ''REQ-1'' does not exist",
      ),
    ).toBe("Target entity does not exist: REQ-1");
    expect(
      tr("ERROR: Source entity does not exist: entity `REQ-2' does not exist"),
    ).toBe("Source entity does not exist: REQ-2");
    expect(tr('ERROR: entity "REQ-3" does not exist')).toBe(
      "Entity does not exist: REQ-3",
    );
    expect(tr("ERROR: entity 'a' x does not exist")).toBe(
      "Entity does not exist: unknown",
    );
    expect(tr("ERROR: entity does not exist")).toBe("entity does not exist");
    expect(
      tr(
        "ERROR: Type error: `relationship' expected (Invalid relationship:  rel_x )",
      ),
    ).toBe("Invalid relationship: rel_x");
    expect(tr("ERROR: Type error: `relationship' expected")).toBe(
      "Invalid relationship type or direction",
    );
  });

  test("falls back to error kinds and the first message line", () => {
    expect(tr("existence_error(x)")).toBe("Predicate or file not found");
    expect(tr("Unknown procedure: x/1")).toBe("Predicate or file not found");
    expect(tr("permission_error(x)")).toBe("Access denied or KB locked");
    expect(tr("syntax_error(x)")).toBe("Invalid query syntax");
    expect(tr("Operator expected")).toBe("Invalid query syntax");
    expect(
      inner(new PrologProcess({ timeout: 2500 })).translateError(
        "timeout_error",
      ),
    ).toBe("Operation exceeded 2.5s timeout");
    expect(tr("ERROR:   first\nsecond")).toBe("first");
    expect(tr("** banner **\n  ERROR: real")).toBe("real");
    expect(tr("")).toBe("Unknown error");
    expect(tr("ERROR:   ")).toBe("Unknown error");
  });
});

const START_GOAL = `${UTF8}, use_module('${KB}'), use_module(library(semweb/rdf_db)), set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])`;

function pickEnv(options: Record<string, unknown>, keys: string[]) {
  const env = options.env as Record<string, string | undefined>;
  return Object.fromEntries(keys.map((key) => [key, env[key]]));
}

describe("start", () => {
  test("refuses a missing explicit executable", async () => {
    const error = await make({ swiplPath: "/no/such/swipl" })
      .start()
      .catch((e: Error) => e.message);
    expect(error).toBe(
      "SWI-Prolog not found at /no/such/swipl. Please install SWI-Prolog or check your PATH.",
    );
    expect(spawned).toStrictEqual([]);
  });

  test("spawns the interactive toplevel and waits for it", async () => {
    process.env.EXTRA_MARK = "kept";
    const processOn = spyOn(process, "on");
    try {
      const { prolog, child } = await started(undefined, {
        swiplPath: "/bin/sh",
      });
      expect(spawned).toHaveLength(1);
      const [call] = spawned as [Spawned];
      expect([call.bin, call.args]).toStrictEqual([
        "/bin/sh",
        ["-g", START_GOAL, "--quiet"],
      ]);
      expect(Object.keys(call.options)).toStrictEqual(["detached", "env"]);
      expect(call.options.detached).toBe(true);
      expect(
        pickEnv(call.options, [
          "EXTRA_MARK",
          "KIBI_RUNTIME_NAME",
          "KIBI_RUNTIME_VERSION",
          "KIBI_PACKAGE_VERSIONS",
          "SWI_HOME_DIR",
        ]),
      ).toStrictEqual({
        EXTRA_MARK: "kept",
        KIBI_RUNTIME_NAME: "bun",
        KIBI_RUNTIME_VERSION: process.versions.bun,
        KIBI_PACKAGE_VERSIONS: "kibi-cli@1",
        SWI_HOME_DIR: undefined,
      });
      expect(child.written).toStrictEqual(["true.\n"]);
      expect(
        processOn.mock.calls.filter((call) => String(call[0]) === "exit"),
      ).toHaveLength(1);
      expect([prolog.oneShotMode, prolog.needsRestart()]).toStrictEqual([
        false,
        false,
      ]);
      expect([prolog.isRunning(), prolog.getPid()]).toStrictEqual([true, 4242]);
    } finally {
      Reflect.deleteProperty(process.env, "EXTRA_MARK");
    }
  });

  test("passes the resolved SWI home to the child", async () => {
    queue.push(new FakeChild(interactive()));
    const prolog = new PrologProcess({
      oneShot: false,
      swiplResolver: () => ({ bin: "/r/swipl", home: "/r/home" }) as never,
    });
    live.push(prolog);
    await prolog.start();
    const [call] = spawned as [Spawned];
    expect(call.bin).toBe("/r/swipl");
    expect(pickEnv(call.options, ["SWI_HOME_DIR"])).toStrictEqual({
      SWI_HOME_DIR: "/r/home",
    });
  });

  test("needs every standard stream", async () => {
    for (const stream of ["stdout", "stderr", "stdin"] as const) {
      const child = new FakeChild(interactive());
      child[stream] = null;
      queue.push(child);
      expect(
        await make({ oneShot: false })
          .start()
          .catch((e: Error) => e.message),
      ).toBe("Failed to spawn Prolog process");
    }
  });

  test("reports a child lost during startup", async () => {
    const cases: Array<[(child: FakeChild) => void, string]> = [
      [
        (child) => {
          child.killed = true;
        },
        "Prolog process terminated unexpectedly during startup: boom",
      ],
      [
        (child) => {
          child.exitCode = 1;
        },
        "Prolog process terminated unexpectedly during startup: boom",
      ],
      [
        (child) => {
          child.signalCode = "SIGKILL";
        },
        "Prolog process terminated unexpectedly during startup: boom",
      ],
      [() => {}, "Failed to load kb module: boom"],
    ];
    for (const [lose, message] of cases) {
      queue.push(
        new FakeChild((child) => {
          child.err("ERROR: boom\n");
          lose(child);
        }),
      );
      expect(
        await make({ oneShot: false })
          .start()
          .catch((e: Error) => e.message),
      ).toBe(message);
    }
  });

  test("fails when terminated while starting", async () => {
    queue.push(new FakeChild());
    const prolog = make({ oneShot: false });
    const starting = prolog.start().catch((e: Error) => e.message);
    await prolog.terminate();
    expect(await starting).toBe(
      "Prolog process terminated unexpectedly during startup: Unknown error",
    );
  });

  test("gives up waiting after two seconds", async () => {
    const times = [0, 1999, 2000];
    spyOn(Date, "now").mockImplementation(() => times.shift() ?? 9999);
    queue.push(new FakeChild());
    const quiet = make({ oneShot: false });
    await quiet.start();
    expect(times).toStrictEqual([]);
    // The clock jumps past the limit only once the late error is in.
    let errored = false;
    spyOn(Date, "now").mockImplementation(() => (errored ? 9999 : 0));
    const late = new FakeChild((child) => {
      setTimeout(() => {
        child.err("ERROR: late\n");
        errored = true;
      }, 1);
    });
    queue.push(late);
    expect(
      await make({ oneShot: false })
        .start()
        .catch((e: Error) => e.message),
    ).toBe("Failed to load kb module: late");
  });

  test("records a broken stdin pipe once", async () => {
    const { prolog, child } = await started();
    child.stdin?.emit(
      "error",
      Object.assign(new Error("x"), { code: "EPIPE" }),
    );
    child.stdin?.emit("error", new Error("y"));
    expect(inner(prolog).terminationReason).toBe("stdin EPIPE");
    const other = await started();
    other.child.stdin?.emit("error", new Error("y"));
    expect(inner(other.prolog).terminationReason).toBe("stdin error");
    const restarted = await started();
    const first = restarted.child;
    queue.push(new FakeChild(interactive()));
    await restarted.prolog.start();
    first.stdin?.emit("error", new Error("old"));
    expect(inner(restarted.prolog).terminationReason).toBeNull();
  });
});

describe("interactive queries", () => {
  test("write the wrapped goal and read the bindings", async () => {
    const { prolog, child } = await started(() => ({
      out: "X = 1,\nY = b.\n\n",
    }));
    expect(await prolog.query("  kb_entity(X, Y). ")).toStrictEqual({
      success: true,
      bindings: { X: "1", Y: "b" },
    });
    expect(child.written.slice(1)).toStrictEqual([wrapped("kb_entity(X, Y)")]);
  });

  test("persist mutating goals unless they save themselves", async () => {
    const { prolog, child } = await started();
    await prolog.query("kb_assert_entity(a)");
    await prolog.query("kb_assert_entity(a), kb_save");
    await prolog.query("kb_commit_upsert(a)");
    await prolog.query("once(kb_x(a))");
    await prolog.query("once (kb_y(a))");
    expect(child.written.slice(1)).toStrictEqual([
      wrapped("(kb_assert_entity(a), kb_save)"),
      wrapped("kb_assert_entity(a), kb_save"),
      wrapped("kb_commit_upsert(a)"),
      wrapped("once(kb_x(a))"),
      wrapped("once (kb_y(a))"),
    ]);
    expect(child.written[4]).toBe(
      "catch(once(kb_x(a)), _E, (write(user_error, '__KIBI_ERROR__:'), write_term(user_error, _E, [quoted(true), max_depth(8)]), nl(user_error), print_message(error, _E), fail)).\nwriteln(user_error, '__KIBI_QUERY_STDERR_END__'), writeln('__KIBI_QUERY_FRAME_END__').\n",
    );
  });

  test("report a failed goal but not a bound false", async () => {
    const replies = [
      "false.\n\n",
      "fail.\n\n",
      "X = 1.\nfalse.\n\n",
      "X = false.\n\n",
    ];
    const { prolog } = await started(() => ({
      out: replies.shift() as string,
    }));
    const failed = { success: false, bindings: {}, error: "Query failed" };
    expect(await prolog.query("a")).toStrictEqual(failed);
    expect(await prolog.query("a")).toStrictEqual(failed);
    expect(await prolog.query("a")).toStrictEqual(failed);
    expect(await prolog.query("a")).toStrictEqual({
      success: true,
      bindings: { X: "false" },
    });
  });

  test("classify errors on stderr with their stage", async () => {
    const replies: Reply[] = [
      {
        err: "__KIBI_STAGE__:check\nERROR: Unknown procedure: x/1\n",
        out: "false.\n\n",
      },
      {
        err: "__KIBI_ERROR__:error(permission_error(save,kb,stale_snapshot),kb_save/0)\nERROR: stale\n",
        out: "false.\n\n",
      },
      { err: "warning only\n", out: "true.\n\n" },
    ];
    const { prolog } = await started(() => replies.shift() as Reply);
    expect(await prolog.query("kb_commit_upsert(a)")).toStrictEqual({
      success: false,
      bindings: {},
      error: "Predicate or file not found (stage=check)",
    });
    const stale = await prolog.query("kb_entity(a)");
    expect([stale.success, stale.error, stale.errorRecord?.code]).toStrictEqual(
      [
        false,
        "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
        "stale_snapshot",
      ],
    );
    expect(await prolog.query("kb_other(a)")).toStrictEqual({
      success: true,
      bindings: {},
    });
  });

  test("terminate after an output overflow", async () => {
    const { prolog, child } = await started(
      () => ({ out: "X = 123456789.\n\n" }),
      { maxOutputBytes: 8 },
    );
    expect(await prolog.query("kb_big(X)")).toStrictEqual({
      success: false,
      bindings: {},
      error:
        "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    });
    expect(child.ended).toBe(true);
    expect(prolog.needsRestart()).toBe(true);
    expect(await prolog.query("x").catch((e: Error) => e.message)).toBe(
      "Kibi Prolog process is no longer running (output overflow (ENOBUFS): kb_big); the interactive session and its attached KB were lost. The owning engine must restart it before serving more queries — run 'kibi engine stop' and retry if this persists.",
    );
  });

  test("overflow on stderr too", async () => {
    const { prolog } = await started(
      () => ({ err: "warning 123456789\n", out: "true.\n\n" }),
      { maxOutputBytes: 8 },
    );
    expect((await prolog.query("kb_noisy")).error).toBe(
      "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    );
  });

  test("notice a process that exits mid-query", async () => {
    const { prolog, child } = await started(() => ({ silent: true }));
    const pending = prolog.query("kb_slow");
    setTimeout(() => child.close(1, null), 5);
    expect(await pending).toStrictEqual({
      success: false,
      bindings: {},
      error: "Query interrupted because the Prolog process terminated",
    });
    expect(inner(prolog).terminationReason).toBe(
      "process exited during query: kb_slow",
    );
  });

  test("keep an earlier termination reason", async () => {
    const { prolog, child } = await started(() => ({ silent: true }));
    const pending = prolog.query("kb_slow");
    child.stdin?.emit(
      "error",
      Object.assign(new Error("x"), { code: "EPIPE" }),
    );
    setTimeout(() => child.close(1, null), 5);
    await pending;
    expect(inner(prolog).terminationReason).toBe("stdin EPIPE");
  });

  test("time out a query and stop the process", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    const { prolog, child } = await started(
      () => ({
        silent: true,
        err: "__KIBI_RUNTIME__:node\n__KIBI_STAGE__:load\n",
      }),
      { timeout: 30 },
    );
    const message = await prolog
      .query("kb_wait(x)")
      .catch((e: Error) => e.message);
    expect(message).toBe(
      `Query timeout after 0.03s (stage=load, pid=${child.pid}, killed=no, exitCode=null, signal=null, goal=kb_wait). If several fresh Kibi commands hang or crawl the same way, the engine state is likely wedged: run 'kibi engine stop' (then 'kibi sync --rebuild' if needed) and retry.`,
    );
    expect(logs).toStrictEqual([
      "[prolog debug] start query: kb_wait",
      `[prolog debug] timeout: ${message}`,
      "[prolog debug] runtime=__KIBI_RUNTIME__:node packages=kibi-cli@1",
    ]);
    expect(inner(prolog).terminationReason).toBe("query timeout: kb_wait");
    expect(child.ended).toBe(true);
  });

  test("time out without diagnostics", async () => {
    const { prolog, child } = await started(() => ({ silent: true }), {
      timeout: 20,
    });
    child.killed = true;
    child.exitCode = 3;
    child.signalCode = "SIGHUP";
    const pending = prolog.query("kb_wait").catch((e: Error) => e.message);
    expect(await pending).toBe(
      "Kibi Prolog process is no longer running (process exited); the interactive session and its attached KB were lost. The owning engine must restart it before serving more queries — run 'kibi engine stop' and retry if this persists.",
    );
    const fresh = await started(() => ({ silent: true }), { timeout: 20 });
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    const message = (await fresh.prolog
      .query("Kb")
      .catch((e: Error) => e.message)) as string;
    expect(
      message.startsWith("Query timeout after 0.02s (stage=unknown, "),
    ).toBe(true);
    expect(message).toContain("goal=anonymous)");
    expect(logs[2]).toBe("[prolog debug] runtime=unknown packages=kibi-cli@1");
  });

  test("log a successful and a failed query when debugging", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    const replies: Reply[] = [{}, { err: "ERROR: bad\nmore\n" }];
    const { prolog } = await started(() => replies.shift() as Reply);
    await prolog.query("kb_ok");
    await prolog.query("kb_bad");
    expect(logs[0]).toBe("[prolog debug] start query: kb_ok");
    expect(logs[1]).toMatch(
      /^\[prolog debug\] query success: kb_ok elapsed=\d+(\.\d+)?s$/,
    );
    expect(logs.slice(2)).toStrictEqual([
      "[prolog debug] start query: kb_bad",
      "[prolog debug] query error: kb_bad error=ERROR: bad",
    ]);
  });

  test("cache read goals until a write", async () => {
    let count = 0;
    const { prolog, child } = await started(() => ({
      out: `N = ${++count}.\n\n`,
    }));
    const first = await prolog.query("kb_entity(N)");
    expect(await prolog.query("kb_entity(N)")).toBe(first);
    await prolog.query("(kb_entity(N), true)");
    await prolog.query("(kb_entity(N), true)");
    expect(await prolog.query("kb_entity(N)")).toStrictEqual({
      success: true,
      bindings: { N: "4" },
    });
    const cached = await prolog.query("kb_entity(N)");
    await prolog.query("kb_assert_x(a)");
    expect(await prolog.query("kb_entity(N)")).not.toBe(cached);
    expect(child.written).toHaveLength(7);
    prolog.invalidateCache();
    await prolog.query("kb_entity(N)");
    expect(child.written).toHaveLength(8);
  });

  test("keep a failed read out of the cache", async () => {
    const replies: Reply[] = [{ out: "false.\n\n" }, { out: "X = 1.\n\n" }];
    const { prolog } = await started(() => replies.shift() as Reply);
    expect((await prolog.query("kb_entity(X)")).success).toBe(false);
    expect((await prolog.query("kb_entity(X)")).success).toBe(true);
  });

  test("trace cache hits and round trips", async () => {
    const events: unknown[] = [];
    spyOn(perf, "writePerformanceTraceEvent").mockImplementation((event) => {
      events.push(event.kind);
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });
    const { prolog } = await started();
    await prolog.query("kb_entity(x)");
    await prolog.query("kb_entity(x)");
    expect(events).toStrictEqual([]);
    process.env.KIBI_PERF_TIMINGS = "1";
    await prolog.query("kb_entity(x)");
    await prolog.query("kb_entity(y)");
    expect(events).toStrictEqual([
      "prolog-process-cache-hit",
      "prolog-round-trip",
    ]);
  });

  test("run a batch as one transaction", async () => {
    const { prolog, child } = await started();
    await prolog.queryBatch([" kb_assert_a(x). ", "kb_x(y)"]);
    await prolog.query(["kb_x(y)"]);
    expect(child.written.slice(1)).toStrictEqual([
      wrapped("(rdf_transaction((kb_assert_a(x), kb_x(y))), kb_save)"),
      wrapped("rdf_transaction((kb_x(y)))"),
    ]);
  });

  test("answer queries in order", async () => {
    const { prolog } = await started((goal) => ({
      out: `G = ${goal.includes("first") ? "1" : "2"}.\n\n`,
    }));
    const results = await Promise.all([
      prolog.query("kb_first"),
      prolog.query("kb_second"),
    ]);
    expect(results.map((result) => result.bindings.G)).toStrictEqual([
      "1",
      "2",
    ]);
  });

  test("refuse a queued query once the process is lost", async () => {
    const { prolog } = await started(() => ({ out: "X = 123456789.\n\n" }), {
      maxOutputBytes: 8,
    });
    const first = prolog.query("kb_big");
    const second = prolog.query("kb_next").catch((e: Error) => e.message);
    expect((await first).success).toBe(false);
    expect(await second).toBe(
      "Kibi Prolog process is no longer running (output overflow (ENOBUFS): kb_big); the interactive session and its attached KB were lost. The owning engine must restart it before serving more queries — run 'kibi engine stop' and retry if this persists.",
    );
  });

  test("wake on a frame split across chunks", async () => {
    // Every 50 ms poll is held back, so only an output wake can answer.
    const realSetTimeout = globalThis.setTimeout;
    let polls = 0;
    spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => {
      if (ms !== 50) return realSetTimeout(handler, ms);
      polls += 1;
      return realSetTimeout(handler, 60_000);
    }) as never);
    const { prolog } = await started(
      () => ({
        chunks: ["X = 1.\n\n__KIBI_QUERY", "_FRAME_END__\ntrue.", "\n\n"],
      }),
      { timeout: 1000 },
    );
    expect((await prolog.query("kb_split")).bindings).toStrictEqual({ X: "1" });
    expect(polls).toBe(1);
  });

  test("refuse a lost or unstarted session", async () => {
    const { prolog, child } = await started();
    child.close(0, null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(prolog.needsRestart()).toBe(true);
    expect(prolog.oneShotMode).toBe(false);
    expect(await prolog.query("kb_x").catch((e: Error) => e.message)).toBe(
      "Kibi Prolog process is no longer running (process exited); the interactive session and its attached KB were lost. The owning engine must restart it before serving more queries — run 'kibi engine stop' and retry if this persists.",
    );
    const unstarted = make({ oneShot: false });
    expect([unstarted.oneShotMode, unstarted.needsRestart()]).toStrictEqual([
      true,
      false,
    ]);
    expect((await unstarted.query("X = 1")).success).toBe(true);
    expect(spawned.at(-1)?.args[0]).toBe("-q");
  });
});

function oneShotGoal(options: {
  kb?: boolean;
  batch?: boolean;
  save?: boolean;
}): string {
  return [
    UTF8,
    `use_module('${KB}')`,
    "use_module(library(semweb/rdf_db))",
    "set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])",
    "getenv('KIBI_GOAL', GoalAtomEncoded), base64_encoded(GoalAtom, GoalAtomEncoded, [encoding(utf8), as(atom)])",
    "read_term_from_atom(GoalAtom, Goal, [variable_names(Vars)])",
    options.kb ? "getenv('KIBI_KB_PATH', KBPath), kb_attach(KBPath)" : "true",
    options.batch
      ? "WrappedGoal = rdf_transaction(Goal)"
      : "WrappedGoal = Goal",
    "(catch(call(WrappedGoal), E, (write(user_error, '__KIBI_ERROR__:'), write_term(user_error, E, [quoted(true), max_depth(8)]), nl(user_error), print_message(error, E), fail)) -> QuerySucceeded = true ; QuerySucceeded = false)",
    options.save ? "(QuerySucceeded == true -> kb_save ; true)" : "true",
    options.kb ? "kb_detach" : "true",
    "(QuerySucceeded == true -> (forall(member(Name=Value, Vars), (write(Name), write('='), write_term(Value, [quoted(true), max_depth(0)]), writeln('.'))), writeln('__KIBI_TRUE__.')) ; writeln('__KIBI_FALSE__.'))",
  ].join(", ");
}

function goalEnv(call: Spawned): string {
  const env = call.options.env as Record<string, string>;
  return Buffer.from(env.KIBI_GOAL as string, "base64").toString("utf8");
}

describe("one-shot queries", () => {
  test("spawn an isolated process per query", async () => {
    queue.push(oneShotChild({ out: "X=1.\nY='é'.\n__KIBI_TRUE__.\n" }));
    const prolog = make({ oneShot: true, swiplPath: "/bin/sh" });
    expect(prolog.oneShotMode).toBe(true);
    expect(await prolog.query(" X = 1, Y = 'é'. ")).toStrictEqual({
      success: true,
      bindings: { X: "1", Y: "'é'" },
    });
    const [call] = spawned as [Spawned];
    expect([call.bin, call.args]).toStrictEqual([
      "/bin/sh",
      ["-q", "-g", oneShotGoal({}), "-t", "halt"],
    ]);
    expect(Object.keys(call.options)).toStrictEqual([
      "detached",
      "env",
      "stdio",
    ]);
    expect(call.options.detached).toBe(true);
    expect(call.options.stdio).toStrictEqual(["ignore", "pipe", "pipe"]);
    expect(goalEnv(call)).toBe("X = 1, Y = 'é'");
    expect(
      pickEnv(call.options, [
        "KIBI_RUNTIME_NAME",
        "KIBI_RUNTIME_VERSION",
        "KIBI_PACKAGE_VERSIONS",
        "KIBI_KB_PATH",
        "SWI_HOME_DIR",
      ]),
    ).toStrictEqual({
      KIBI_RUNTIME_NAME: "bun",
      KIBI_RUNTIME_VERSION: process.versions.bun,
      KIBI_PACKAGE_VERSIONS: "kibi-cli@1",
      KIBI_KB_PATH: undefined,
      SWI_HOME_DIR: undefined,
    });
  });

  test("attach, save writes and detach", async () => {
    const prolog = make({ oneShot: true });
    queue.push(oneShotChild({ out: "__KIBI_TRUE__.\n" }));
    expect(await prolog.query("kb_attach('/kb dir')")).toStrictEqual({
      success: true,
      bindings: {},
    });
    expect(spawned[0]?.args[2]).toBe(oneShotGoal({}));
    expect(goalEnv(spawned[0] as Spawned)).toBe("kb_attach('/kb dir')");
    expect(await prolog.query("kb_attach('/other')")).toStrictEqual({
      success: false,
      bindings: {},
      error: "KB already attached",
    });
    await prolog.query("kb_assert_x(a)");
    await prolog.query(["kb_x(a)", "kb_y(b)"]);
    await prolog.query([" kb_save. ", "kb_x(a)"]);
    await prolog.query(["kb_save"]);
    await prolog.query("kb_x(a)");
    const calls = spawned.slice(1);
    expect(calls.map((call) => call.args[2])).toStrictEqual([
      oneShotGoal({ kb: true, save: true }),
      oneShotGoal({ kb: true, batch: true }),
      oneShotGoal({ kb: true, save: true }),
      oneShotGoal({ kb: true, save: true }),
      oneShotGoal({ kb: true }),
    ]);
    expect(calls.map(goalEnv)).toStrictEqual([
      "kb_assert_x(a)",
      "(kb_x(a), kb_y(b))",
      "kb_x(a)",
      "true",
      "kb_x(a)",
    ]);
    expect(pickEnv(calls[0]?.options as never, ["KIBI_KB_PATH"])).toStrictEqual(
      { KIBI_KB_PATH: "/kb dir" },
    );
    expect(await prolog.query(" kb_detach. ")).toStrictEqual({
      success: true,
      bindings: {},
    });
    expect(spawned).toHaveLength(6);
    await prolog.query("kb_x(a)");
    expect(spawned.at(-1)?.args[2]).toBe(oneShotGoal({}));
  });

  test("keep a failed attach detached", async () => {
    const prolog = make({ oneShot: true });
    queue.push(oneShotChild({ out: "__KIBI_FALSE__.\n" }));
    expect(await prolog.query("kb_attach('/kb')")).toStrictEqual({
      success: false,
      bindings: {},
      error: "Query returned false",
    });
    await prolog.query("kb_x");
    expect(spawned.at(-1)?.args[2]).toBe(oneShotGoal({}));
    await prolog.query("kb_attach('/kb')");
    queue.push(oneShotChild({ out: "__KIBI_TRUE__.\n" }));
    expect((await prolog.query("kb_attach('/kb')")).error).toBe(
      "KB already attached",
    );
  });

  test("cache only successful plain reads", async () => {
    const prolog = make({ oneShot: true });
    queue.push(oneShotChild({ out: "__KIBI_FALSE__.\n" }));
    await prolog.query("kb_entity(x)");
    const first = await prolog.query("kb_entity(x)");
    expect(await prolog.query("kb_entity(x)")).toBe(first);
    await prolog.query("(kb_entity(x))");
    await prolog.query("(kb_entity(x))");
    expect(await prolog.query("kb_entity(x)")).not.toBe(first);
    const second = await prolog.query("kb_entity(x)");
    queue.push(oneShotChild({ out: "__KIBI_FALSE__.\n" }));
    await prolog.query("kb_assert_y(b)");
    expect(await prolog.query("kb_entity(x)")).toBe(second);
    await prolog.query("kb_assert_y(b)");
    expect(await prolog.query("kb_entity(x)")).not.toBe(second);
    expect(spawned).toHaveLength(8);
  });

  test("report every way a one-shot query can fail", async () => {
    const prolog = make({ oneShot: true });
    const run = async (child: FakeChild | Error | string, goal = "kb_x") => {
      queue.push(child);
      return prolog.query(goal);
    };
    const failure = (error: string) => ({
      success: false,
      bindings: {},
      error,
    });
    expect(await run(new Error("spawn EACCES"))).toStrictEqual(
      failure("spawn EACCES"),
    );
    expect(await run("plain")).toStrictEqual(failure("plain"));
    expect(
      await run(
        oneShotChild({ error: new Error("lost") }),
        "kb_commit_upsert(a)",
      ),
    ).toStrictEqual(failure("lost"));
    expect(
      await run(
        oneShotChild({ err: "__KIBI_STAGE__:s1\n", error: new Error("lost") }),
        "kb_commit_upsert(a)",
      ),
    ).toStrictEqual(failure("lost (stage=s1)"));
    expect(
      await run(
        oneShotChild({
          err: "__KIBI_STAGE__:s2\nERROR: Unknown procedure: x/1\n",
          out: "__KIBI_TRUE__.\n",
        }),
        "kb_commit_upsert(a)",
      ),
    ).toStrictEqual(failure("Predicate or file not found (stage=s2)"));
    const stale = await run(
      oneShotChild({
        err: "__KIBI_ERROR__:error(permission_error(save,kb,stale_snapshot),kb_save/0)\nERROR: x\n",
      }),
    );
    expect([stale.error, stale.errorRecord?.code]).toStrictEqual([
      "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
      "stale_snapshot",
    ]);
    expect(
      await run(oneShotChild({ out: "X=1.\n__KIBI_FALSE__.\n" })),
    ).toStrictEqual(failure("Query returned false"));
    expect(
      await run(
        oneShotChild({ out: "o".repeat(250), err: "w".repeat(250) }),
        "kb_commit_upsert(b)",
      ),
    ).toStrictEqual(
      failure(
        `Query failed - stdout: ${"o".repeat(200)}, stderr: ${"w".repeat(200)}`,
      ),
    );
    expect(
      await run(
        oneShotChild({ out: "x", err: "__KIBI_STAGE__:s3\n" }),
        "kb_commit_upsert(b)",
      ),
    ).toStrictEqual(
      failure(
        "Query failed - stdout: x, stderr: __KIBI_STAGE__:s3\n (stage=s3)",
      ),
    );
  });

  test("stop a one-shot child that overflows", async () => {
    const prolog = make({ oneShot: true, maxOutputBytes: 4 });
    const child = oneShotChild({ out: "123456", hang: true });
    queue.push(child);
    expect(await prolog.query("kb_commit_upsert(a)")).toStrictEqual({
      success: false,
      bindings: {},
      error:
        "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    });
    expect(groupKills).toStrictEqual([[-(child.pid as number), "SIGTERM"]]);
    const noisy = oneShotChild({ err: "__KIBI_STAGE__:z\nmore", hang: true });
    queue.push(noisy);
    expect((await prolog.query("kb_commit_upsert(a)")).error).toBe(
      "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    );
    const big = make({ oneShot: true, maxOutputBytes: 30 });
    const staged = oneShotChild({
      err: "__KIBI_STAGE__:stage1\n",
      out: "x".repeat(40),
      hang: true,
    });
    queue.push(staged);
    expect((await big.query("kb_commit_upsert(a)")).error).toBe(
      "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size (stage=stage1)",
    );
  });

  test("time out a one-shot child", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    const prolog = make({ oneShot: true, timeout: 20 });
    const child = oneShotChild({
      err: "__KIBI_RUNTIME__:bun 1\n__KIBI_STAGE__:attach\n",
      hang: true,
    });
    queue.push(child);
    expect(
      await prolog.query("kb_wait(x)").catch((e: Error) => e.message),
    ).toBe(
      `Query timeout after 0.02s (stage=attach, pid=${child.pid}, goal=kb_wait)`,
    );
    expect(logs).toStrictEqual([
      "[prolog debug] __KIBI_RUNTIME__:bun 1",
      `[prolog debug] child pid=${child.pid} runtime=bun@${process.versions.bun} packages=kibi-cli@1 stage=attach`,
    ]);
    const quiet = oneShotChild({ hang: true });
    quiet.pid = undefined;
    quiet.closeOnSignal = true;
    queue.push(quiet);
    const pending = prolog.query("Goal").catch((e: Error) => e.message);
    setTimeout(() => quiet.close(null, "SIGTERM"), 40);
    expect(await pending).toBe(
      "Query timeout after 0.02s (stage=unknown, pid=0, goal=anonymous)",
    );
    expect(logs[2]).toBe(
      `[prolog debug] child pid=0 runtime=bun@${process.versions.bun} packages=kibi-cli@1 stage=unknown`,
    );
  });

  test("do not time out a finished child", async () => {
    const prolog = make({ oneShot: true, timeout: 10 });
    const child = oneShotChild({ hang: true });
    queue.push(child);
    const pending = prolog.query("kb_x");
    setTimeout(() => {
      child.out("__KIBI_TRUE__.\n");
      child.emit("close", 0, null);
      child.exitCode = 0;
    }, 1);
    expect((await pending).success).toBe(true);
    expect(groupKills).toStrictEqual([]);
  });
});

describe("terminate", () => {
  test("ends stdin and signals the process group", async () => {
    const { prolog, child } = await started();
    const off = spyOn(process, "off");
    await prolog.terminate();
    expect(child.ended).toBe(true);
    expect(groupKills).toStrictEqual([[-(child.pid as number), "SIGTERM"]]);
    expect(off.mock.calls.map((call): unknown => call[0])).toStrictEqual([
      "exit",
    ]);
    expect([prolog.isRunning(), prolog.getPid()]).toStrictEqual([false, 0]);
    expect(inner(prolog).terminationReason).toBe("terminated");
    await prolog.terminate();
    expect(off).toHaveBeenCalledTimes(1);
    expect(groupKills).toHaveLength(1);
  });

  test("lets the toplevel halt during the grace period", async () => {
    const { prolog, child } = await started();
    child.stdin = Object.assign(child.stdin as EventEmitter, {
      end: () => {
        child.ended = true;
        setTimeout(() => child.close(0, null), 5);
      },
    }) as FakeChild["stdin"];
    await prolog.terminate({ graceMs: 1000 });
    expect(groupKills).toStrictEqual([]);
    const slow = await started();
    const startedAt = Date.now();
    await slow.prolog.terminate({ graceMs: 20 });
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(15);
    expect(groupKills).toStrictEqual([
      [-(slow.child.pid as number), "SIGTERM"],
    ]);
    const exited = await started();
    exited.child.exitCode = 0;
    setTimeout(() => exited.child.emit("close", 0, null), 5);
    await exited.prolog.terminate({ graceMs: 5000 });
    expect(groupKills).toHaveLength(1);
  });

  test("escalates to SIGKILL and falls back to the child", async () => {
    const { prolog, child } = await started();
    child.closeOnSignal = false;
    groupKillFails = true;
    const kill = spyOn(child, "kill");
    const pending = prolog.terminate();
    await new Promise((resolve) => setTimeout(resolve, 1050));
    expect(child.kills).toStrictEqual(["SIGTERM", "SIGKILL"]);
    child.close(null, "SIGKILL");
    await pending;
    expect(kill.mock.calls.map((call): unknown => call[0])).toStrictEqual([
      "SIGTERM",
      "SIGKILL",
    ]);
  });

  test("tolerates a child that cannot be signalled", async () => {
    const { prolog, child } = await started();
    groupKillFails = true;
    child.kill = () => {
      child.close(null, "SIGTERM");
      throw new Error("gone");
    };
    await prolog.terminate();
    expect(child.signalCode).toBe("SIGTERM");
    const nopid = await started();
    nopid.child.pid = 0;
    const pending = nopid.prolog.terminate();
    setTimeout(() => nopid.child.emit("error", new Error("x")), 5);
    await pending;
    expect(groupKills).toStrictEqual([[-(child.pid as number), "SIGTERM"]]);
  });

  test("waits for a termination already in progress", async () => {
    const { prolog, child } = await started();
    child.closeOnSignal = false;
    const first = prolog.terminate();
    let second = false;
    const other = prolog.terminate().then(() => {
      second = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(second).toBe(false);
    child.close(null, "SIGTERM");
    await Promise.all([first, other]);
    expect(second).toBe(true);
  });

  test("stops one-shot children too", async () => {
    const prolog = make({ oneShot: true, timeout: 60_000 });
    const child = oneShotChild({ hang: true });
    queue.push(child);
    const pending = prolog.query("kb_x");
    await new Promise((resolve) => setTimeout(resolve, 1));
    await prolog.terminate();
    expect(groupKills).toStrictEqual([[-(child.pid as number), "SIGTERM"]]);
    expect(inner(prolog).terminationReason).toBeNull();
    expect((await pending).success).toBe(false);
    await new PrologProcess().terminate();
  });
});

describe("edge cases", () => {
  function captureLogs(): string[] {
    const logs: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    return logs;
  }

  test("look for the monorepo kb.pl from this module upward", async () => {
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    type Resolver = typeof Module & {
      _resolveFilename: (request: string, ...rest: unknown[]) => string;
    };
    const host = Module as unknown as Resolver;
    const original = host._resolveFilename;
    host._resolveFilename = (request: string, ...rest: unknown[]) => {
      if (String(request).startsWith("kibi-core")) throw new Error("none");
      return original.call(Module, request, ...rest);
    };
    try {
      const fs = await import("node:fs");
      const seen: string[] = [];
      spyOn(fs, "existsSync").mockImplementation((file) => {
        seen.push(String(file));
        return false;
      });
      expect(() => resolveKbPlPath()).toThrow("Unable to resolve kb.pl");
      const srcDir = new URL("../src/", import.meta.url).pathname.replace(
        /\/$/,
        "",
      );
      const expected: string[] = [];
      for (
        let dir = srcDir;
        dir !== "/";
        dir = dir.replace(/\/[^/]+$/, "") || "/"
      ) {
        expected.push(`${dir}/packages/core/src/kb.pl`);
      }
      expect(seen).toStrictEqual(expected);
    } finally {
      host._resolveFilename = original;
    }
  });

  test("resolve the default executable", async () => {
    const { resolveSwipl } = await import("../src/prolog/swipl-resolver.js");
    let expected: string;
    try {
      expected = resolveSwipl().bin;
    } catch {
      return;
    }
    expect(inner(new PrologProcess()).launchTarget().bin).toBe(expected);
  });

  test("a restart drops cached answers and old output", async () => {
    let count = 0;
    const { prolog, child } = await started(() => ({
      out: `N = ${++count}.\n\n`,
    }));
    await prolog.query("kb_entity(N)");
    child.close(0, null);
    let ready = false;
    const next = new FakeChild((fresh, chunk) => {
      if (chunk === "true.\n")
        setTimeout(() => {
          ready = true;
          fresh.out("true.\n\n");
        }, 20);
      else
        queueMicrotask(() => {
          fresh.err(STDERR_END);
          fresh.out(`N = 9.\n\n${FRAME}`);
        });
    });
    queue.push(next);
    await prolog.start();
    expect(ready).toBe(true);
    expect((await prolog.query("kb_entity(N)")).bindings).toStrictEqual({
      N: "9",
    });
  });

  test("stop waiting exactly at the two second limit", async () => {
    const times = [0, 2000];
    spyOn(Date, "now").mockImplementation(() => times.shift() ?? 9999);
    queue.push(
      new FakeChild((child) => {
        setTimeout(() => child.err("ERROR: late\n"), 1);
      }),
    );
    await make({ oneShot: false }).start();
    expect(times).toStrictEqual([]);
  });

  test("measure trace durations from the start", async () => {
    const durations: number[] = [];
    spyOn(perf, "writePerformanceTraceEvent").mockImplementation((event) => {
      durations.push(event.durationMs);
    });
    let clock = 1_000_000;
    spyOn(performance, "now").mockImplementation(() => {
      clock += 1;
      return clock;
    });
    process.env.KIBI_PERF_TIMINGS = "1";
    const { prolog } = await started();
    await prolog.query("kb_a");
    await prolog.query("kb_a");
    expect(durations).toHaveLength(2);
    for (const duration of durations) {
      expect(duration > 0 && duration < 100).toBe(true);
    }
  });

  test("wrap a goal unless it starts with once", async () => {
    const { prolog, child } = await started();
    await prolog.query("x, once(y)");
    expect(child.written[1]).toBe(wrapped("x, once(y)"));
    expect(child.written[1]?.startsWith("catch(once((x, once(y))), _E,")).toBe(
      true,
    );
  });

  test("stay quiet without debugging", async () => {
    const logs = captureLogs();
    const replies: Reply[] = [{}, { err: "ERROR: bad\n" }, { silent: true }];
    const { prolog } = await started(() => replies.shift() as Reply, {
      timeout: 20,
    });
    await prolog.query("kb_ok");
    await prolog.query("kb_bad");
    await prolog.query("kb_slow").catch(() => {});
    const oneShot = make({ oneShot: true });
    queue.push(
      oneShotChild({ err: "__KIBI_RUNTIME__:x\n", out: "__KIBI_TRUE__.\n" }),
    );
    await oneShot.query("kb_x");
    expect(logs).toStrictEqual([]);
  });

  test("describe a killed process in the timeout", async () => {
    const { prolog, child } = await started(() => ({ silent: true }), {
      timeout: 20,
    });
    setTimeout(() => {
      child.killed = true;
      child.exitCode = 2;
      child.signalCode = "SIGINT";
    }, 5);
    child.pid = undefined;
    const message = (await prolog
      .query("kb_t")
      .catch((e: Error) => e.message)) as string;
    expect(
      message.startsWith(
        "Query timeout after 0.02s (stage=unknown, pid=0, killed=yes, exitCode=2, signal=SIGINT, goal=kb_t).",
      ),
    ).toBe(true);
  });

  test("settle every timer once a query is answered", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs = captureLogs();
    const { prolog } = await started(undefined, { timeout: 30 });
    await prolog.query("kb_ok");
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(logs.filter((line) => line.includes("query success"))).toHaveLength(
      1,
    );
    expect(prolog.isRunning()).toBe(true);
  });

  test("settle the timeout of every failed query", async () => {
    const replies: Reply[] = [{ err: "ERROR: bad\n" }, { out: "false.\n\n" }];
    const { prolog } = await started(() => replies.shift() as Reply, {
      timeout: 30,
    });
    await prolog.query("kb_bad");
    await prolog.query("kb_false");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect([prolog.isRunning(), inner(prolog).terminationReason]).toStrictEqual(
      [true, null],
    );
    const exiting = await started(() => ({ silent: true }), { timeout: 200 });
    const pending = exiting.prolog.query("kb_exit");
    setTimeout(() => exiting.child.close(1, null), 1);
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 230));
    expect(inner(exiting.prolog).terminationReason).toBe(
      "process exited during query: kb_exit",
    );
    const overflowing = await started(() => ({ out: "123456789" }), {
      timeout: 200,
      maxOutputBytes: 4,
    });
    await overflowing.prolog.query("kb_big");
    await new Promise((resolve) => setTimeout(resolve, 230));
    expect(inner(overflowing.prolog).terminationReason).toBe(
      "output overflow (ENOBUFS): kb_big",
    );
  });

  test("read a frame at the start of the output", async () => {
    const { prolog } = await started(() => ({ out: "" }), { timeout: 200 });
    expect(await prolog.query("kb_empty")).toStrictEqual({
      success: true,
      bindings: {},
    });
  });

  test("read false only on the last line", async () => {
    const { prolog } = await started(() => ({ out: "false.\nX = 1.\n\n" }));
    expect(await prolog.query("kb_x(X)")).toStrictEqual({
      success: true,
      bindings: { X: "1" },
    });
  });

  test("keep other cached reads after a read", async () => {
    let count = 0;
    const { prolog, child } = await started(() => ({
      out: `N = ${++count}.\n\n`,
    }));
    const a = await prolog.query("kb_a(N)");
    await prolog.query("kb_b(N)");
    expect(await prolog.query("kb_a(N)")).toBe(a);
    expect(child.written).toHaveLength(3);
  });

  test("report elapsed seconds", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs = captureLogs();
    const { prolog } = await started();
    const times = [1000, 1500];
    spyOn(Date, "now").mockImplementation(() => times.shift() ?? 1500);
    await prolog.query("kb_ok");
    expect(logs[1]).toBe("[prolog debug] query success: kb_ok elapsed=0.5s");
  });

  test("leave a stderr report without a frame to the poll", async () => {
    const { prolog } = await started(() => ({
      silent: true,
      err: "ERROR: early\n",
    }));
    const startedAt = Date.now();
    expect((await prolog.query("kb_e")).error).toBe("early");
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(40);
  });

  test("ignore output between queries", async () => {
    const { prolog, child } = await started();
    await prolog.query("kb_a");
    child.out("stray\n");
    await new Promise((resolve) => setImmediate(resolve));
    expect(prolog.isRunning()).toBe(true);
  });

  test("fill each interactive buffer up to its cap", async () => {
    const replies: Reply[] = [
      { out: "12345" },
      { chunks: ["x".repeat(2 + FRAME.length), "1234"] },
    ];
    const { prolog } = await started(() => replies.shift() as Reply, {
      maxOutputBytes: 5 + FRAME.length,
    });
    expect((await prolog.query("kb_fit")).success).toBe(true);
    expect((await prolog.query("kb_over")).error).toBe(
      "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    );
    const cap = 7 + FRAME.length;
    // With its stderr frame end, the first report fills the cap exactly.
    const errs: Reply[] = [
      { err: "x".repeat(cap - STDERR_END.length) },
      { silent: true },
    ];
    const noisy = await started(() => errs.shift() as Reply, {
      maxOutputBytes: cap,
    });
    const fit = await noisy.prolog.query("kb_fit");
    expect(fit.success).toBe(true);
    const pending = noisy.prolog.query("kb_over");
    await new Promise((resolve) => setTimeout(resolve, 10));
    noisy.child.err("1234");
    noisy.child.err("x".repeat(cap - 3));
    expect((await pending).error).toBe(
      "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    );
  });

  test("judge usability by every process field", async () => {
    for (const lose of [
      (child: FakeChild) => {
        child.killed = true;
      },
      (child: FakeChild) => {
        child.exitCode = 0;
      },
      (child: FakeChild) => {
        child.signalCode = "SIGTERM";
      },
      (child: FakeChild) => {
        child.stdin = null;
      },
    ]) {
      const { prolog, child } = await started();
      expect(prolog.needsRestart()).toBe(false);
      lose(child);
      expect(prolog.needsRestart()).toBe(true);
      expect(prolog.isRunning()).toBe(child.stdin === null);
    }
    const fresh = make();
    expect([fresh.isRunning(), fresh.needsRestart()]).toStrictEqual([
      false,
      false,
    ]);
    await fresh.terminate();
    expect(fresh.needsRestart()).toBe(false);
    const { prolog } = await started();
    await prolog.terminate();
    expect(prolog.needsRestart()).toBe(true);
  });

  test("terminate a restarted process", async () => {
    const { prolog } = await started();
    await prolog.terminate();
    const second = new FakeChild(interactive());
    queue.push(second);
    await prolog.start();
    await prolog.terminate();
    expect(second.ended).toBe(true);
    expect(groupKills.at(-1)).toStrictEqual([
      -(second.pid as number),
      "SIGTERM",
    ]);
  });
});

const OVERFLOW =
  "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size";

function scriptedOneShot(
  steps: Array<["out" | "err", string | Buffer]>,
  options: { code?: number; pid?: number | undefined } = {},
): FakeChild {
  const child = new FakeChild();
  child.stdin = null;
  if ("pid" in options) child.pid = options.pid;
  queueMicrotask(() => {
    for (const [stream, data] of steps) {
      if (stream === "out") child.out(data);
      else child.err(data);
    }
    if (child.exitCode === null && child.signalCode === null)
      child.close(options.code ?? 0, null);
  });
  return child;
}

describe("one-shot capture", () => {
  test("count stdout and stderr against separate caps", async () => {
    const out = "X=1.\n__KIBI_TRUE__.\n";
    queue.push(
      scriptedOneShot([
        ["out", out],
        ["err", "x".repeat(out.length)],
      ]),
    );
    const prolog = make({ oneShot: true, maxOutputBytes: out.length });
    expect(await prolog.query("kb_x(X)")).toStrictEqual({
      success: true,
      bindings: { X: "1" },
    });
  });

  test("decode split characters per stream", async () => {
    const e = Buffer.from("é");
    queue.push(
      scriptedOneShot([
        ["out", "Y='"],
        ["out", e.subarray(0, 1)],
        ["err", e.subarray(0, 1)],
        ["out", Buffer.concat([e.subarray(1), Buffer.from("'.\n")])],
        ["err", e.subarray(1)],
        ["out", "__KIBI_TRUE__.\n"],
      ]),
    );
    expect(await make({ oneShot: true }).query("kb_y(Y)")).toStrictEqual({
      success: true,
      bindings: { Y: "'é'" },
    });
  });

  test("overflow when a later chunk passes the cap", async () => {
    const child = scriptedOneShot([
      ["out", "a".repeat(10)],
      ["out", "b".repeat(11)],
    ]);
    queue.push(child);
    const prolog = make({ oneShot: true, maxOutputBytes: 20 });
    expect(await prolog.query("kb_big")).toStrictEqual({
      success: false,
      bindings: {},
      error: OVERFLOW,
    });
    expect(groupKills).toStrictEqual([[-(child.pid as number), "SIGTERM"]]);
    const errChild = scriptedOneShot([
      ["err", "a".repeat(10)],
      ["err", "b".repeat(11)],
      ["out", "__KIBI_TRUE__.\n"],
    ]);
    queue.push(errChild);
    expect((await prolog.query("kb_big")).error).toBe(OVERFLOW);
  });

  test("keep the part of an overflowing chunk that fits", async () => {
    const first = "__KIBI_STAGE__:validate\n";
    const kept = `${first}__KIBI_STAGE__:sec`;
    queue.push(scriptedOneShot([["err", `${kept}ond-stage\n`]]));
    const prolog = make({ oneShot: true, maxOutputBytes: kept.length });
    expect((await prolog.query("kb_commit_upsert(x)")).error).toBe(
      `${OVERFLOW} (stage=sec)`,
    );
    queue.push(
      scriptedOneShot([
        ["err", first],
        ["out", `__KIBI_STAGE__:fake${"z".repeat(kept.length)}`],
      ]),
    );
    expect((await prolog.query("kb_commit_upsert(x)")).error).toBe(
      `${OVERFLOW} (stage=validate)`,
    );
  });

  test("leave a finished child alone", async () => {
    const prolog = make({ oneShot: true, timeout: 30 });
    expect((await prolog.query("kb_ok")).success).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    await prolog.terminate();
    expect(groupKills).toStrictEqual([]);
  });

  test("save only for a goal that starts with kb_save", async () => {
    const prolog = make({ oneShot: true });
    await prolog.query("kb_attach('/a')");
    await prolog.query(["x_kb_save", "kb_y"]);
    await prolog.query(["kb_assert_x(a)", "kb_y"]);
    await prolog.query(["kb_save", "kb_y"]);
    expect(spawned.slice(1).map((call) => call.args[2])).toStrictEqual([
      oneShotGoal({ kb: true, batch: true }),
      oneShotGoal({ kb: true, batch: true, save: true }),
      oneShotGoal({ kb: true, save: true }),
    ]);
    expect(spawned.slice(1).map(goalEnv)).toStrictEqual([
      "(x_kb_save, kb_y)",
      "(kb_assert_x(a), kb_y)",
      "kb_y",
    ]);
  });

  test("detach any kb_detach goal without a process", async () => {
    const prolog = make({ oneShot: true });
    await prolog.query("kb_attach('/a')");
    expect(await prolog.query("kb_detach(x)")).toStrictEqual({
      success: true,
      bindings: {},
    });
    await prolog.query("kb_y");
    expect(spawned).toHaveLength(2);
    expect(pickEnv(spawned[1]?.options ?? {}, ["KIBI_KB_PATH"])).toStrictEqual({
      KIBI_KB_PATH: undefined,
    });
  });

  test("attach only for a whole kb_attach goal", async () => {
    const prolog = make({ oneShot: true });
    await prolog.query("x, kb_attach('/a')");
    await prolog.query("kb_attach('/a'), y");
    await prolog.query("kb_z");
    expect(
      spawned.map((call) => pickEnv(call.options, ["KIBI_KB_PATH"])),
    ).toStrictEqual([
      { KIBI_KB_PATH: undefined },
      { KIBI_KB_PATH: undefined },
      { KIBI_KB_PATH: undefined },
    ]);
  });
});

describe("termination bounds", () => {
  test("skip SIGTERM without a grace period", async () => {
    const { prolog, child } = await started();
    child.closeOnSignal = false;
    (child.stdin as { end(): void }).end = () => {
      queueMicrotask(() => child.close(0, null));
    };
    await prolog.terminate();
    expect(groupKills).toStrictEqual([[-(child.pid as number), "SIGTERM"]]);
  });

  test("stop when the child closes during the grace period", async () => {
    const { prolog, child } = await started();
    setTimeout(() => child.close(null, "SIGHUP"), 10);
    await prolog.terminate({ graceMs: 100 });
    expect(groupKills).toStrictEqual([]);
  });

  test("bound every wait for a child that never closes", async () => {
    const begin = Date.now();
    const cases: Array<(child: FakeChild) => void> = [
      (child) => {
        child.pid = undefined;
      },
      (child) => {
        child.pid = 0;
      },
      () => {},
      (child) => {
        child.exitCode = 0;
      },
      (child) => {
        child.signalCode = "SIGTERM";
      },
    ];
    const runs = [];
    const pids: Array<number | undefined> = [];
    for (const [index, setup] of cases.entries()) {
      const { prolog, child } = await started();
      child.closeOnSignal = false;
      pids.push(child.pid);
      setup(child);
      runs.push(prolog.terminate({ graceMs: index > 2 ? 5000 : 0 }));
    }
    await Promise.all(runs);
    expect(Date.now() - begin < 4000).toBe(true);
    const byPid = (pid: number | undefined) =>
      groupKills.filter(([target]) => target === -(pid as number));
    expect(groupKills.filter(([target]) => target === 0)).toStrictEqual([]);
    expect(byPid(pids[2])).toStrictEqual([
      [-(pids[2] as number), "SIGTERM"],
      [-(pids[2] as number), "SIGKILL"],
    ]);
    expect(byPid(pids[3])).toStrictEqual([[-(pids[3] as number), "SIGKILL"]]);
    expect(groupKills).toHaveLength(5);
  }, 8000);
});

describe("binding and error text", () => {
  test("parse binding blocks", () => {
    const parse = (text: string) => inner(make()).extractBindings(text);
    expect(parse("X = 'a.b'.")).toStrictEqual({ X: "'a.b'" });
    expect(parse("X = [a,b],")).toStrictEqual({ X: "[a,b]" });
    expect(parse("X = 'a\nb X = c'.")).toStrictEqual({ X: "'a\nb X = c'" });
    expect(parse("noise\nXy_1=2.\n")).toStrictEqual({ Xy_1: "2" });
  });

  test("translate edge texts", () => {
    const translate = (text: string) => inner(make()).translateError(text);
    const key = (id: string) =>
      translate(`__KIBI_ERROR__:error(existence_error(key,${id}),_)\n`);
    expect([key("x'y'"), key("'y'x"), key("foo/1")]).toStrictEqual([
      "Predicate or file not found",
      "Predicate or file not found",
      "Predicate or file not found",
    ]);
    expect(
      translate("__KIBI_ERROR__:error(existence_error(procedure,mod:foo/1),_)"),
    ).toBe("Predicate or file not found (missing procedure: mod:foo/1)");
    expect(translate("ERROR: audit_log x\n__KIBI_STAGE__:lock")).toBe(
      "audit_log x",
    );
    expect(translate("entity 'a' is fine")).toBe("entity 'a' is fine");
    expect(translate("entity 'a does not exist")).toBe(
      "entity 'a does not exist",
    );
    expect(translate("a ERROR:   b")).toBe("a b");
    expect(translate("x **y**")).toBe("x **y**");
    expect(translate("**a** b")).toBe("**a** b");
    expect(translate("\n  \nreal")).toBe("real");
    expect(translate("ERROR: boom \nmore")).toBe("boom");
  });
});

describe("query timers", () => {
  function captureLogs(): string[] {
    const logs: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
    return logs;
  }

  test("stop polling a query that timed out", async () => {
    const { prolog } = await started(() => ({ silent: true }), {
      timeout: 30,
    });
    await prolog.query("kb_t").catch(() => {});
    const next = new FakeChild(interactive());
    queue.push(next);
    await prolog.start();
    await prolog.query("kb_new");
    await new Promise((resolve) => setTimeout(resolve, 120));
    await prolog.query("kb_t");
    expect(next.written).toHaveLength(3);
  });

  test("wake only for an answer frame", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const logs = captureLogs();
    const { prolog } = await started(() => ({
      chunks: ["X = 1.\n", "\n", FRAME],
    }));
    expect((await prolog.query("kb_x(X)")).bindings).toStrictEqual({ X: "1" });
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(logs.filter((line) => line.includes("query success"))).toHaveLength(
      1,
    );
  });

  test("find a frame at the very start without the poll", async () => {
    const realSetTimeout = globalThis.setTimeout;
    spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => realSetTimeout(handler, ms === 50 ? 60_000 : ms)) as never);
    const { prolog } = await started(() => ({ out: "" }), { timeout: 500 });
    expect(await prolog.query("kb_empty")).toStrictEqual({
      success: true,
      bindings: {},
    });
  });

  test("clear the timeout of a finished one-shot child", async () => {
    const prolog = make({ oneShot: true, timeout: 20 });
    expect((await prolog.query("kb_ok")).success).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(groupKills).toStrictEqual([]);
  });
});

describe("stderr frame end", () => {
  // Every 50 ms poll is held back, so only an output wake can answer.
  function holdPolls(): { count: number } {
    const polls = { count: 0 };
    const realSetTimeout = globalThis.setTimeout;
    spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      ms?: number,
    ) => {
      if (ms !== 50) return realSetTimeout(handler, ms);
      polls.count += 1;
      return realSetTimeout(handler, 60_000);
    }) as never);
    return polls;
  }

  const tick = (ms: number) =>
    new Promise((resolve) => globalThis.setTimeout(resolve, ms));

  test("wait for it after the stdout frame, then wake on it", async () => {
    const { prolog, child } = await started(() => ({ silent: true }), {
      timeout: 1000,
    });
    let settled = false;
    const pending = prolog.query("kb_x(X)").then((result) => {
      settled = true;
      return result;
    });
    await tick(5);
    child.out(`X = 1.\n\n${FRAME}`);
    await tick(120);
    expect(settled).toBe(false);
    const polls = holdPolls();
    child.err("__KIBI_QUERY_STDERR");
    child.err("_END__\n");
    expect(await pending).toStrictEqual({
      success: true,
      bindings: { X: "1" },
    });
    expect(polls.count).toBe(0);
  });

  test("wake only once both frame ends were read", async () => {
    const polls = holdPolls();
    const { prolog, child } = await started(() => ({ silent: true }), {
      timeout: 1000,
    });
    const pending = prolog.query("kb_x(X)");
    await tick(5);
    child.out(`X = 1.\n\n${FRAME}`);
    await tick(5);
    child.err(STDERR_END);
    expect((await pending).bindings).toStrictEqual({ X: "1" });
    expect(polls.count).toBe(1);
  });

  test("classify a report read after the stdout frame", async () => {
    holdPolls();
    const { prolog, child } = await started(() => ({ silent: true }), {
      timeout: 1000,
    });
    const pending = prolog.query("kb_x(X)");
    await tick(5);
    child.out(`false.\n\n${FRAME}`);
    await tick(5);
    child.err(`ERROR: late report\n${STDERR_END}`);
    expect(await pending).toStrictEqual({
      success: false,
      bindings: {},
      error: "late report",
    });
  });

  test("keep it out of the error text", async () => {
    const { prolog } = await started(() => ({ err: "ERROR:\n" }));
    expect((await prolog.query("kb_x")).error).toBe("Unknown error");
  });

  test("wake on an overflow read with a pending wake", async () => {
    holdPolls();
    const { prolog, child } = await started(() => ({ silent: true }), {
      timeout: 1000,
      maxOutputBytes: 8,
    });
    const pending = prolog.query("kb_noisy");
    await tick(5);
    child.err("1234");
    child.err("123456789");
    expect((await pending).error).toBe(OVERFLOW);
  });
});
