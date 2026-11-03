// implements REQ-kibi-operation-interface-parity
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { isClosedOutputError, main } from "../src/cli";
import { finishCliTelemetry } from "../src/usage-telemetry";

type Stream = NodeJS.WriteStream;

const restores: Array<() => void> = [];
let exits: Array<number | undefined> = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Whether `promise` settles within a short wait. */
async function settles(promise: Promise<unknown>): Promise<boolean> {
  return Promise.race([promise.then(() => true), sleep(150).then(() => false)]);
}

function needsDrain(stream: Stream): void {
  const own = Object.getOwnPropertyDescriptor(stream, "writableNeedDrain");
  Object.defineProperty(stream, "writableNeedDrain", {
    configurable: true,
    get: () => true,
  });
  restores.push(() => {
    if (own) Object.defineProperty(stream, "writableNeedDrain", own);
    else Reflect.deleteProperty(stream, "writableNeedDrain");
  });
}

function parseWith(implementation: () => Promise<unknown>): void {
  const parse = spyOn(Command.prototype, "parseAsync").mockImplementation(
    implementation as never,
  );
  restores.push(() => parse.mockRestore());
}

beforeEach(async () => {
  // Forget an error category an earlier test noted without finishing.
  await finishCliTelemetry({
    commandPath: undefined,
    packageVersion: "0.0.0",
    startedAt: new Date(),
    exitCode: 0,
  });
  exits = [];
  const savedEnv = { ...process.env };
  const savedArgv = process.argv;
  const savedCwd = process.cwd();
  const listeners = process.stdout.listeners("error");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cli-main-"));
  process.chdir(directory);
  process.argv = [process.execPath, "kibi", "status"];
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"])
    delete process.env[key];
  process.env.KIBI_TELEMETRY = "0";
  const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
    exits.push(code);
  }) as typeof process.exit);
  const stderr = spyOn(process.stderr, "write").mockImplementation(() => true);
  const consoleError = spyOn(console, "error").mockImplementation(
    () => undefined,
  );
  restores.push(() => {
    exit.mockRestore();
    stderr.mockRestore();
    consoleError.mockRestore();
    for (const listener of process.stdout.listeners("error"))
      if (!listeners.includes(listener))
        process.stdout.removeListener("error", listener as () => void);
    process.chdir(savedCwd);
    process.argv = savedArgv;
    for (const key of Object.keys(process.env))
      if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  process.exitCode = 0;
});

const closed = () => Object.assign(new Error("write EPIPE"), { code: "EPIPE" });

describe("closed output streams", () => {
  test("only an object with a closed-stream code counts", () => {
    expect(isClosedOutputError(null)).toBe(false);
    expect(isClosedOutputError(undefined)).toBe(false);
    expect(isClosedOutputError(Object.assign(() => 0, { code: "EPIPE" }))).toBe(
      false,
    );
    expect(isClosedOutputError({ code: "EPIPE" })).toBe(true);
  });
});

describe("the CLI entry", () => {
  test("records the command and its exit code, then exits with it", async () => {
    const telemetry = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cli-tel-"));
    restores.push(() => fs.rmSync(telemetry, { recursive: true, force: true }));
    process.env.KIBI_TELEMETRY = "1";
    process.env.KIBI_TELEMETRY_DIR = telemetry;
    process.argv = [process.execPath, "kibi", "plan-bootstrap"];
    await main();
    expect(exits).toEqual([2]);
    const events = fs
      .readFileSync(path.join(telemetry, "telemetry-queue.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).properties);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      operation: "plan-bootstrap",
      exit_code: 2,
      error_category: "missing_input",
    });
  });

  test("waits for stdout and stderr to drain before exiting", async () => {
    parseWith(async () => undefined);
    needsDrain(process.stdout);
    const run = main();
    expect(await settles(run)).toBe(false);
    expect(exits).toEqual([]);
    process.stdout.emit("drain");
    await run;
    expect(exits).toEqual([0]);
  });

  test("a closed reader ends the run with the command's exit code, waiting on stderr only", async () => {
    parseWith(async () => {
      process.exitCode = 4;
      throw closed();
    });
    needsDrain(process.stdout);
    needsDrain(process.stderr);
    const run = main();
    expect(await settles(run)).toBe(false);
    process.stderr.emit("drain");
    expect(await settles(run)).toBe(true);
    expect(exits).toEqual([4]);
    expect(console.error).not.toHaveBeenCalled();
  });

  test("any other failure prints its message and exits 1", async () => {
    parseWith(async () => {
      process.exitCode = 4;
      throw new Error("boom");
    });
    await main();
    expect(exits).toEqual([1]);
    expect(console.error).toHaveBeenCalledWith("boom");
  });

  test("a stdout error while the command runs finishes once if the reader closed, and rethrows otherwise", async () => {
    let release: () => void = () => undefined;
    parseWith(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const run = main();
    await sleep(10);
    expect(() =>
      process.stdout.emit(
        "error",
        Object.assign(new Error("bad"), { code: "EIO" }),
      ),
    ).toThrow("bad");
    expect(exits).toEqual([]);
    needsDrain(process.stdout);
    process.exitCode = 3;
    process.stdout.emit("error", closed());
    await sleep(10);
    expect(exits).toEqual([3]);
    release();
    await run;
    expect(exits).toEqual([3]);
  });
});
