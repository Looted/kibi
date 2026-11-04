// implements REQ-kibi-anonymous-usage-telemetry
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import {
  finishCliTelemetry,
  noteCliErrorCategory,
  noteCliOperationCall,
  noteCliResultError,
  noteCliThrownError,
  trackCommandPath,
} from "../src/usage-telemetry.js";

const roots: string[] = [];
let env: NodeJS.ProcessEnv;
let stderrWrites: string[];
let stderr: { mockRestore(): void };

async function finish(
  commandPath: string | undefined,
  exitCode: number,
  extra: { error?: unknown; startedAt?: Date } = {},
): Promise<void> {
  await finishCliTelemetry({
    commandPath,
    packageVersion: "9.9.9",
    startedAt: extra.startedAt ?? new Date(),
    exitCode,
    ...("error" in extra ? { error: extra.error } : {}),
    env,
  });
}

beforeEach(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-telem-mut-"));
  roots.push(directory);
  env = { KIBI_TELEMETRY_DIR: directory, KIBI_TELEMETRY: "1" };
  stderrWrites = [];
  stderr = spyOn(process.stderr, "write").mockImplementation(
    (chunk: unknown) => {
      stderrWrites.push(String(chunk));
      return true;
    },
  );
  // Clear a category another suite may have noted without finishing.
  await finish(undefined, 1);
});

afterEach(() => {
  stderr.mockRestore();
  setSystemTime();
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function events(): Record<string, unknown>[] {
  const file = path.join(
    env.KIBI_TELEMETRY_DIR as string,
    "telemetry-queue.jsonl",
  );
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line).properties);
}

const categories = () => events().map((event) => event.error_category);
const field = (name: string) => events().map((event) => event[name]);

/** An error thrown from a Kibi source file, so its event names the frame. */
function crash(fn: string): TypeError {
  const error = new TypeError("secret /private");
  error.stack = `TypeError: secret\n    at ${fn} (/x/packages/cli/src/${fn}.ts:3:4)`;
  return error;
}

describe("finishCliTelemetry", () => {
  test("records status, exit code and duration, printing the notice once", async () => {
    setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
    await finish("sync", 0, {
      startedAt: new Date("2026-01-01T00:00:09.993Z"),
    });
    expect(stderrWrites.length).toBe(1);
    expect(stderrWrites[0]).toStartWith(
      "Kibi collects anonymous usage statistics",
    );
    expect(stderrWrites[0]).toEndWith("\n");
    await finish("sync", 2, {
      startedAt: new Date("2026-01-01T00:00:10.000Z"),
    });
    expect(stderrWrites.length).toBe(1);
    const [first, second] = events();
    expect(first).toMatchObject({
      package: "kibi-cli",
      package_version: "9.9.9",
      interface: "cli",
      operation: "sync",
      status: "success",
      duration_ms: 7,
      exit_code: 0,
      error_category: null,
    });
    expect(second).toMatchObject({
      status: "error",
      duration_ms: 0,
      exit_code: 2,
      error_category: null,
    });
  });

  test("names the outcome of commands whose failure is their answer", async () => {
    for (const command of [
      "check",
      "check-diff",
      "check-generated",
      "prove",
      "proof run-steps",
      "sync",
    ])
      await finish(command, 1);
    expect(categories()).toStrictEqual([
      "check_violations",
      "check_violations",
      "generated_artifacts_stale",
      "tests_failed",
      "tests_failed",
      null,
    ]);
  });

  test("a thrown error is named by its code, else its class, never its message", async () => {
    const named = (name: unknown, fields: Record<string, unknown> = {}) =>
      Object.assign(new Error("secret /private"), fields, { name });
    const thrownFunction = Object.assign(() => undefined, { code: "FN" });
    for (const error of [
      named("Error", { code: "E_CODE" }),
      named("TypeError", { code: "" }),
      named("RangeError", { code: 5 }),
      named("Error"),
      named(""),
      named(7),
      null,
      "text",
      thrownFunction,
    ])
      await finish("check", 1, { error });
    expect(categories()).toStrictEqual([
      "e_code",
      "typeerror",
      "rangeerror",
      "uncaught_error",
      "uncaught_error",
      "uncaught_error",
      "uncaught_error",
      "uncaught_error",
      "uncaught_error",
    ]);
  });

  test("the first noted category wins and a success clears it", async () => {
    noteCliErrorCategory(undefined);
    noteCliErrorCategory("");
    noteCliErrorCategory("first");
    noteCliErrorCategory("second");
    await finish("check", 1, { error: new RangeError("x") });
    noteCliErrorCategory("dropped");
    await finish("check", 0);
    await finish("check", 1);
    expect(categories()).toStrictEqual(["first", null, "check_violations"]);
  });

  test("telemetry commands are not recorded, whatever their subcommand", async () => {
    await finish("telemetry", 0);
    await finish("telemetry status", 0);
    await finish("", 0);
    expect(events()).toStrictEqual([]);
    expect(stderrWrites).toStrictEqual([]);
  });
});

describe("noteCliThrownError", () => {
  test("notes a thrown error's code and class; the first note wins", async () => {
    noteCliThrownError(Object.assign(new TypeError("x"), { code: "E_NOTED" }));
    noteCliThrownError(Object.assign(new RangeError("y"), { code: "E_LATER" }));
    await finish("sync", 1);
    expect(categories()).toStrictEqual(["e_noted"]);
    expect(field("error_class")).toStrictEqual(["TypeError"]);
  });

  test("reads a code only from an object, and only a string one", async () => {
    for (const error of [
      null,
      undefined,
      "text",
      Object.assign(() => undefined, { code: "FN" }),
      { code: 5 },
      { code: "" },
    ]) {
      noteCliThrownError(error);
      await finish("check", 1);
    }
    expect(categories()).toStrictEqual(Array(6).fill("check_violations"));
    expect(field("error_class")).toStrictEqual(Array(6).fill(null));
  });

  test("the noted error, else the one thrown at exit, places the crash", async () => {
    noteCliThrownError(crash("noted"));
    await finish("sync", 1, { error: crash("thrown") });
    await finish("sync", 1, { error: crash("thrown") });
    await finish("sync", 1);
    expect(field("crash_frame")).toStrictEqual([
      "kibi-cli/src/noted#noted",
      "kibi-cli/src/thrown#thrown",
      null,
    ]);
  });

  test("a noted class wins over the thrown error's, which is used otherwise", async () => {
    noteCliThrownError(new RangeError("x"));
    await finish("sync", 1, { error: new TypeError("y") });
    await finish("sync", 1, { error: new TypeError("y") });
    await finish("sync", 1, { error: new Error("y") });
    await finish("sync", 0, { error: new TypeError("y") });
    expect(field("error_class")).toStrictEqual([
      "RangeError",
      "TypeError",
      null,
      null,
    ]);
  });
});

describe("noteCliOperationCall", () => {
  test("the first noted call gives the signals, until the event is recorded", async () => {
    noteCliOperationCall({ operation: "kb_upsert", args: { dryRun: true } });
    noteCliOperationCall({ operation: "kb_upsert", args: { dryRun: false } });
    await finish("upsert", 0);
    await finish("upsert", 0);
    expect(field("dry_run")).toStrictEqual([true, null]);
  });

  test("without a noted call the command path names the operation", async () => {
    await finish("kb_validate_upsert", 0);
    expect(field("dry_run")).toStrictEqual([true]);
  });

  test("an error the call carries places the crash when none was thrown", async () => {
    noteCliOperationCall({ operation: "kb_status", error: crash("carried") });
    await finish("status", 1);
    expect(field("crash_frame")).toStrictEqual([
      "kibi-cli/src/carried#carried",
    ]);
  });
});

describe("noteCliResultError", () => {
  test("notes the code of a failed JSON result only", async () => {
    for (const stdout of [
      undefined,
      "",
      "null",
      "not json",
      JSON.stringify({ status: "error" }),
      JSON.stringify({ status: "error", error: { code: 5 } }),
      JSON.stringify({ status: "ok", error: { code: "NOT_FAILED" } }),
    ]) {
      noteCliResultError(stdout);
      await finish("sync", 1);
    }
    noteCliResultError(
      JSON.stringify({ status: "error", error: { code: "BAD_THING" } }),
    );
    await finish("sync", 1);
    expect(categories()).toStrictEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "bad_thing",
    ]);
  });
});

describe("trackCommandPath", () => {
  test("is undefined before any command and names nested commands", async () => {
    const program = new Command().name("kibi").exitOverride();
    program.command("status").action(() => undefined);
    program
      .command("proof")
      .command("run-steps")
      .action(() => undefined);
    const commandPath = trackCommandPath(program);
    expect(commandPath()).toBeUndefined();
    await program.parseAsync(["status"], { from: "user" });
    expect(commandPath()).toBe("status");
    await program.parseAsync(["proof", "run-steps"], { from: "user" });
    expect(commandPath()).toBe("proof run-steps");
  });
});
