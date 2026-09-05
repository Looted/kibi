// implements REQ-core-prolog-process-management
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import type { ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import Module from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrologProcess, resolveKbPlPath } from "../src/prolog.js";
import { isolateKibiEnv } from "./helpers/in-process-workspace.js";

function patchResolveFilename(
  impl: (request: string) => string | never,
): () => void {
  const original = Module._resolveFilename;
  Module._resolveFilename = function (
    request: string,
    parent: NodeModule | undefined,
    isMain: boolean,
    options?: unknown,
  ) {
    if (String(request).includes("kibi-core")) {
      return impl(request);
    }
    return original.call(Module, request, parent, isMain, options);
  };
  return () => {
    Module._resolveFilename = original;
  };
}

const roots: string[] = [];
const restores: Array<() => void> = [];

function tempRoot(prefix = "kibi-prolog-remain-"): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

type FakeChild = EventEmitter & {
  stdout: EventEmitter | null;
  stderr: EventEmitter | null;
  stdin: { write: (chunk: string) => boolean; end: () => void } | null;
  pid: number | undefined;
  exitCode: number | null;
  signalCode: NodeJS.Signals | null;
  killed: boolean;
  kill: (signal?: NodeJS.Signals) => boolean;
};

function fakeChild(options: {
  stdin?: boolean;
  stdout?: boolean;
  stderr?: boolean;
  pid?: number | undefined;
  exitCode?: number | null;
  signalCode?: NodeJS.Signals | null;
  killed?: boolean;
  echoTrue?: boolean;
} = {}): FakeChild {
  const stdout = options.stdout === false ? null : new EventEmitter();
  const stderr = options.stderr === false ? null : new EventEmitter();
  const child = new EventEmitter() as FakeChild;
  child.stdout = stdout;
  child.stderr = stderr;
  child.pid = options.pid === undefined ? 42_424 : options.pid;
  child.exitCode = options.exitCode === undefined ? null : options.exitCode;
  child.signalCode =
    options.signalCode === undefined ? null : options.signalCode;
  child.killed = options.killed ?? false;
  child.stdin =
    options.stdin === false
      ? null
      : {
          write(chunk: string) {
            if (options.echoTrue && stdout && String(chunk).includes("true.")) {
              queueMicrotask(() =>
                stdout.emit("data", Buffer.from("true.\n")),
              );
            }
            return true;
          },
          end() {
            return undefined;
          },
        };
  child.kill = () => {
    child.killed = true;
    child.exitCode = 1;
    queueMicrotask(() => child.emit("close", 1, null));
    return true;
  };
  return child;
}

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("prolog remaining: resolveKbPlPath fallbacks", () => {
  test("walks up to packages/core/src/kb.pl when require.resolve fails", () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    restores.push(
      patchResolveFilename(() => {
        throw new Error("kibi-core not installed");
      }),
    );
    const resolved = resolveKbPlPath();
    expect(resolved).toContain(
      `${path.sep}packages${path.sep}core${path.sep}src${path.sep}kb.pl`,
    );
    expect(fs.existsSync(resolved)).toBe(true);
  });

  test("throws when no override, package, or monorepo kb.pl is available", () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    restores.push(
      patchResolveFilename(() => {
        throw new Error("kibi-core not installed");
      }),
    );
    const originalExists = fs.existsSync;
    const exists = spyOn(fs, "existsSync").mockImplementation((file) => {
      if (String(file).endsWith(`${path.sep}kb.pl`)) return false;
      return originalExists(file);
    });
    restores.push(() => exists.mockRestore());
    expect(() => resolveKbPlPath()).toThrow(/Unable to resolve kb.pl/);
  });
});

describe("prolog remaining: interactive start and query errors", () => {
  test("start fails when spawn returns no stdio pipes", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const child = fakeChild({ stdin: false, stdout: false, stderr: false });
    const spawn = spyOn(childProcess, "spawn").mockReturnValue(
      child as unknown as ChildProcess,
    );
    restores.push(() => spawn.mockRestore());
    const prolog = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
    });
    await expect(prolog.start()).rejects.toThrow(/Failed to spawn Prolog process/);
    await prolog.terminate();
  });

  test("waitForReady reports killed, signaled, and exited children", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const spawn = spyOn(childProcess, "spawn");
    restores.push(() => spawn.mockRestore());

    spawn.mockReturnValueOnce(
      fakeChild({ killed: true, echoTrue: false }) as unknown as ChildProcess,
    );
    await expect(
      new PrologProcess({ swiplPath: "/usr/bin/env", oneShot: false }).start(),
    ).rejects.toThrow(/terminated unexpectedly/);

    spawn.mockReturnValueOnce(
      fakeChild({
        signalCode: "SIGKILL",
        echoTrue: false,
      }) as unknown as ChildProcess,
    );
    await expect(
      new PrologProcess({ swiplPath: "/usr/bin/env", oneShot: false }).start(),
    ).rejects.toThrow(/terminated unexpectedly/);

    spawn.mockReturnValueOnce(
      fakeChild({ exitCode: 1, echoTrue: false }) as unknown as ChildProcess,
    );
    await expect(
      new PrologProcess({ swiplPath: "/usr/bin/env", oneShot: false }).start(),
    ).rejects.toThrow(/terminated unexpectedly/);
  });

  test("waitForReady times out cleanly and fails on a late ERROR", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const child = fakeChild({ echoTrue: false });
    const spawn = spyOn(childProcess, "spawn").mockReturnValue(
      child as unknown as ChildProcess,
    );
    restores.push(() => spawn.mockRestore());
    let now = 1_000_000;
    const date = spyOn(Date, "now").mockImplementation(() => now);
    restores.push(() => date.mockRestore());
    const started = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
    }).start();
    const bump = setInterval(() => {
      now += 2_500;
    }, 5);
    restores.push(() => clearInterval(bump));
    await expect(started).resolves.toBeUndefined();
    date.mockRestore();
    clearInterval(bump);

    const late = fakeChild({ echoTrue: false });
    spawn.mockReturnValue(late as unknown as ChildProcess);
    now = 2_000_000;
    const date2 = spyOn(Date, "now").mockImplementation(() => now);
    restores.push(() => date2.mockRestore());
    const lateStart = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
    }).start();
    queueMicrotask(() => {
      late.stderr?.emit("data", Buffer.from("ERROR: late load\n"));
      now += 3_000;
    });
    await expect(lateStart).rejects.toThrow(/Failed to load kb module|late load/);
  });

  test("interactive query covers overflow, process death, ERROR, and debug timeout", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const previousDebug = process.env.KIBI_PROLOG_DEBUG;
    process.env.KIBI_PROLOG_DEBUG = "1";
    restores.push(() => restoreEnv("KIBI_PROLOG_DEBUG", previousDebug));

    const children: FakeChild[] = [];
    const spawn = spyOn(childProcess, "spawn").mockImplementation(() => {
      const created = fakeChild({ echoTrue: true });
      children.push(created);
      return created as unknown as ChildProcess;
    });
    restores.push(() => spawn.mockRestore());
    const last = (): FakeChild => {
      const child = children.at(-1);
      if (child === undefined) throw new Error("spawn was not called");
      return child;
    };

    const prolog = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
      timeout: 200,
    });
    await prolog.start();
    last().stdin!.write = (chunk: string) => {
      if (String(chunk).includes("overflow") || String(chunk).includes("catch")) {
        last().stdout?.emit("data", Buffer.alloc(8 * 1024 * 1024 + 64, 0x61));
      }
      return true;
    };
    const overflowed = await prolog.query("overflow");
    expect(overflowed.success).toBe(false);
    expect(overflowed.error).toMatch(/ENOBUFS|bounded Prolog output/);
    await prolog.terminate();

    const dead = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
      timeout: 500,
    });
    await dead.start();
    last().stdin!.write = () => {
      last().killed = true;
      last().exitCode = 1;
      return true;
    };
    const interrupted = await dead.query("dead-child");
    expect(interrupted.success).toBe(false);
    expect(interrupted.error).toMatch(/terminated/);
    await dead.terminate();

    const errored = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
      timeout: 500,
    });
    await errored.start();
    last().stdin!.write = () => {
      last().stderr?.emit(
        "data",
        Buffer.from("__KIBI_STAGE__:commit\nERROR: existence_error\n"),
      );
      return true;
    };
    const translated = await errored.query("error-goal");
    expect(translated.success).toBe(false);
    expect(translated.error).toBeDefined();
    await errored.terminate();

    const sleepy = new PrologProcess({
      swiplPath: "/usr/bin/env",
      oneShot: false,
      timeout: 80,
    });
    await sleepy.start();
    last().stdin!.write = () => true;
    await expect(sleepy.query("sleep(9)")).rejects.toThrow(/timeout/);
    await sleepy.terminate();
  });
});

describe("prolog remaining: one-shot spawn, overflow, and decode errors", () => {
  test("execOneShot reports spawn throws, child errors, overflow, and undecodable output", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const previousDebug = process.env.KIBI_PROLOG_DEBUG;
    process.env.KIBI_PROLOG_DEBUG = "1";
    restores.push(() => restoreEnv("KIBI_PROLOG_DEBUG", previousDebug));

    const missingDir = tempRoot();
    const thrown = new PrologProcess({
      swiplPath: missingDir,
      oneShot: true,
      timeout: 1_000,
    });
    const spawned = await thrown.query("true");
    expect(spawned.success).toBe(false);
    expect(spawned.error).toBeDefined();
    await thrown.terminate();

    const spawn = spyOn(childProcess, "spawn");
    restores.push(() => spawn.mockRestore());

    spawn.mockImplementationOnce(() => {
      throw "raw spawn failure";
    });
    const raw = new PrologProcess({ oneShot: true, timeout: 500 });
    const rawResult = await raw.query("true");
    expect(rawResult.success).toBe(false);
    expect(rawResult.error).toContain("raw spawn failure");

    const errorChild = fakeChild();
    spawn.mockImplementationOnce(() => {
      queueMicrotask(() =>
        errorChild.emit("error", new Error("enoent child")),
      );
      return errorChild as unknown as ChildProcess;
    });
    const errored = new PrologProcess({ oneShot: true, timeout: 1_000 });
    const errorResult = await errored.query("true");
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toContain("enoent child");

    const overflowChild = fakeChild();
    spawn.mockImplementationOnce(() => {
      queueMicrotask(() => {
        overflowChild.stdout?.emit(
          "data",
          Buffer.alloc(8 * 1024 * 1024 + 16, 0x62),
        );
        overflowChild.stdout?.emit("data", Buffer.from("ignored"));
        overflowChild.stderr?.emit("data", Buffer.from("more"));
      });
      return overflowChild as unknown as ChildProcess;
    });
    const overflowed = new PrologProcess({ oneShot: true, timeout: 2_000 });
    const overflowResult = await overflowed.query("true");
    expect(overflowResult.success).toBe(false);
    expect(overflowResult.error).toMatch(/ENOBUFS|bounded Prolog output/);

    const falseChild = fakeChild();
    spawn.mockImplementationOnce(() => {
      queueMicrotask(() => {
        falseChild.stdout?.emit("data", Buffer.from("__KIBI_FALSE__.\n"));
        falseChild.emit("close", 0, null);
      });
      return falseChild as unknown as ChildProcess;
    });
    const falsy = new PrologProcess({ oneShot: true, timeout: 1_000 });
    const falseResult = await falsy.query("true");
    expect(falseResult.success).toBe(false);
    expect(falseResult.error).toMatch(/false/i);

    const junkChild = fakeChild();
    spawn.mockImplementationOnce(() => {
      queueMicrotask(() => {
        junkChild.stdout?.emit("data", Buffer.from("no markers here\n"));
        junkChild.stderr?.emit(
          "data",
          Buffer.from("__KIBI_RUNTIME__:node@test\n"),
        );
        junkChild.emit("close", 0, null);
      });
      return junkChild as unknown as ChildProcess;
    });
    const junk = new PrologProcess({ oneShot: true, timeout: 1_000 });
    const junkResult = await junk.query("true");
    expect(junkResult.success).toBe(false);
    expect(junkResult.error).toMatch(/Query failed/);

    const errChild = fakeChild();
    spawn.mockImplementationOnce(() => {
      queueMicrotask(() => {
        errChild.stderr?.emit("data", Buffer.from("ERROR: syntax_error\n"));
        errChild.emit("close", 1, null);
      });
      return errChild as unknown as ChildProcess;
    });
    const stderrErr = new PrologProcess({ oneShot: true, timeout: 1_000 });
    const stderrResult = await stderrErr.query("true");
    expect(stderrResult.success).toBe(false);

    const hang = fakeChild();
    spawn.mockImplementationOnce(() => hang as unknown as ChildProcess);
    const timed = new PrologProcess({ oneShot: true, timeout: 50 });
    await expect(timed.query("true")).rejects.toThrow(/timeout/);
  });

  test("one-shot attach path validation, already-attached, and save-only batches", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const store = tempRoot();
    const spawn = spyOn(childProcess, "spawn").mockImplementation(() => {
      const child = fakeChild();
      queueMicrotask(() => {
        child.stdout?.emit("data", Buffer.from("__KIBI_TRUE__.\n"));
        child.emit("close", 0, null);
      });
      return child as unknown as ChildProcess;
    });
    restores.push(() => spawn.mockRestore());
    const prolog = new PrologProcess({ oneShot: true, timeout: 2_000 });
    const first = await prolog.query(`kb_attach('${store}')`);
    expect(first.success).toBe(true);
    const second = await prolog.query(`kb_attach('${store}')`);
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/already attached/i);
    const saved = await prolog.query(["kb_save"]);
    expect(saved.success).toBe(true);
    const detached = await prolog.query("kb_detach");
    expect(detached.success).toBe(true);
    await prolog.terminate();
  });
});

describe("prolog remaining: process-tree teardown and translators", () => {
  test("signalProcessTree and terminateProcessTree cover pid, group, and kill races", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const prolog = new PrologProcess({ oneShot: true });
    const proto = Object.getPrototypeOf(prolog) as {
      signalProcessTree(child: ChildProcess, signal: NodeJS.Signals): void;
      terminateProcessTree(child: ChildProcess): Promise<void>;
      goalLabel(goal: string): string;
      addDiagnosticStage(
        message: string,
        goal: string,
        diagnostics: string,
      ): string;
      lastDiagnosticStage(text: string): string | null;
      appendErrorChunk(chunk: Buffer): void;
      appendOutputChunk(chunk: Buffer): void;
    };

    proto.signalProcessTree(
      { pid: undefined } as ChildProcess,
      "SIGTERM",
    );
    proto.signalProcessTree({ pid: 0 } as ChildProcess, "SIGTERM");
    proto.signalProcessTree(
      {
        pid: 999_999_991,
        kill() {
          throw new Error("direct kill failed");
        },
      } as unknown as ChildProcess,
      "SIGTERM",
    );

    const alreadyClosed = new EventEmitter() as EventEmitter & {
      pid: number;
      exitCode: number;
      kill: () => boolean;
    };
    alreadyClosed.pid = 7;
    alreadyClosed.exitCode = 0;
    alreadyClosed.kill = () => true;
    queueMicrotask(() => alreadyClosed.emit("close", 0, null));
    await proto.terminateProcessTree(alreadyClosed as unknown as ChildProcess);

    const stubborn = new EventEmitter() as EventEmitter & {
      pid: number;
      exitCode: null;
      kill: (signal?: NodeJS.Signals) => boolean;
    };
    stubborn.pid = 999_999_992;
    stubborn.exitCode = null;
    const signals: NodeJS.Signals[] = [];
    stubborn.kill = (signal?: NodeJS.Signals) => {
      signals.push(signal ?? "SIGTERM");
      return true;
    };
    const hung = proto.terminateProcessTree(stubborn as unknown as ChildProcess);
    await hung;
    expect(signals).toContain("SIGKILL");

    expect(proto.goalLabel("123-not-a-pred")).toBe("anonymous");
    expect(proto.goalLabel("discovery:coverage_report_json(X)")).toBe(
      "discovery:coverage_report_json",
    );
    expect(
      proto.addDiagnosticStage("msg", "kb_commit_upsert(x)", "no stage"),
    ).toBe("msg");
    expect(proto.lastDiagnosticStage("")).toBeNull();
    proto.appendErrorChunk(Buffer.alloc(8 * 1024 * 1024 + 8, 0x63));
    proto.appendErrorChunk(Buffer.from("ignored"));
    proto.appendOutputChunk(Buffer.from("x"));
    await prolog.terminate();
    await prolog.terminate();
  });

  test("isCacheableGoal prefixes stay uncached across one-shot reads", async () => {
    const restoreEnvFn = isolateKibiEnv();
    restores.push(restoreEnvFn);
    const spawn = spyOn(childProcess, "spawn").mockImplementation(() => {
      const child = fakeChild();
      queueMicrotask(() => {
        child.stdout?.emit("data", Buffer.from("X = 1.\n__KIBI_TRUE__.\n"));
        child.emit("close", 0, null);
      });
      return child as unknown as ChildProcess;
    });
    restores.push(() => spawn.mockRestore());
    const prolog = new PrologProcess({ oneShot: true, timeout: 1_000 });
    for (const goal of [
      "kb_attach('/tmp')",
      "kb_detach",
      "kb_save",
      "kb_storage_status(S)",
      "kb_storage_compact",
      "kb_storage_export('/tmp')",
      "status:kb_status_json(J)",
      "kb_commit_upsert(req, [], [], false, K)",
      "kb_assert_entity(req, [])",
      "kb_delete_entity('X')",
      "kb_retract_relationship('a','b','c')",
      "rdf_transaction((true))",
    ]) {
      const result = await prolog.query(goal);
      expect(result.success === true || result.success === false).toBe(true);
    }
    await prolog.terminate();
  });
});
