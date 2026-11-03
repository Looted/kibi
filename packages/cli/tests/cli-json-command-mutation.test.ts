// implements REQ-kibi-operation-interface-parity
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import * as cliInput from "../src/cli-input.js";
import {
  type JsonInvocation,
  runJsonInvocation,
  withConsoleOnStderr,
  writeOptionalStderr,
} from "../src/cli-json-command.js";
import * as loader from "../src/cli-operation-loader.js";
import * as protocol from "../src/cli-protocol.js";
import * as diagnosticUsage from "../src/public/diagnostic-usage.js";
import * as cliRuntime from "../src/runtime/cli-runtime.js";
import * as telemetry from "../src/usage-telemetry.js";

const restores: Array<() => void> = [];
const roots: string[] = [];
const savedEnv = {
  a: process.env.KIBI_DIAGNOSTIC_MODE,
  b: process.env.KIBI_CLI_DIAGNOSTIC_MODE,
};
let stdout: string[];
let stderr: string[];
let stdoutResult: boolean;
let appended: unknown[];
let notedCategories: unknown[];
let notedResults: unknown[];
let effects: string[];

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}

beforeEach(() => {
  Reflect.deleteProperty(process.env, "KIBI_DIAGNOSTIC_MODE");
  Reflect.deleteProperty(process.env, "KIBI_CLI_DIAGNOSTIC_MODE");
  stdout = [];
  stderr = [];
  stdoutResult = true;
  appended = [];
  notedCategories = [];
  notedResults = [];
  effects = ["kb-read"];
  track(
    spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return stdoutResult;
    }),
  );
  track(
    spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    }),
  );
  track(
    spyOn(diagnosticUsage, "appendCliDiagnosticUsage").mockImplementation(
      (input: unknown) => {
        appended.push(input);
      },
    ),
  );
  track(
    spyOn(telemetry, "noteCliErrorCategory").mockImplementation((code) => {
      notedCategories.push(code);
    }),
  );
  track(
    spyOn(telemetry, "noteCliResultError").mockImplementation((out) => {
      notedResults.push(out);
    }),
  );
  track(
    spyOn(loader, "loadOperationSpec").mockImplementation(
      async () =>
        ({
          name: "kb_status",
          effects,
          businessInputSchema: {
            type: "object",
            properties: { q: { type: "string" } },
          },
        }) as never,
    ),
  );
});

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
  restoreEnv("KIBI_DIAGNOSTIC_MODE", savedEnv.a);
  restoreEnv("KIBI_CLI_DIAGNOSTIC_MODE", savedEnv.b);
  process.exitCode = 0;
});

function inputFile(content: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-json-mut-"));
  roots.push(root);
  const file = path.join(root, "input.json");
  fs.writeFileSync(file, content);
  return file;
}

function command(args: string[] = []): Command {
  const program = new Command()
    .exitOverride()
    .option("--diagnostic-mode", "diagnostics");
  const status = program
    .command("status")
    .option("--input <path>")
    .option("--format <format>", "format", "table")
    .option("--tag <tag>")
    .option("-v")
    .action(() => undefined);
  program.parse(["status", ...args], { from: "user" });
  return status;
}

type Calls = {
  runtimeOptions: unknown[];
  opened: unknown[];
  afterSuccess: unknown[];
  closed: unknown[];
  executed: unknown[];
};

const CONTEXT = { workspaceRoot: "ctx" };

function stubRuntime(
  result: protocol.CliProtocolResult | (() => never),
  openError?: unknown,
): Calls {
  const calls: Calls = {
    runtimeOptions: [],
    opened: [],
    afterSuccess: [],
    closed: [],
    executed: [],
  };
  track(
    spyOn(cliRuntime, "createCliRuntime").mockImplementation(((
      options: unknown,
    ) => {
      calls.runtimeOptions.push(options);
      return {
        open: async (spec: { name: string }, options: unknown) => {
          calls.opened.push([spec.name, options]);
          if (openError !== undefined) throw openError;
          return CONTEXT;
        },
        afterSuccess: async (spec: { name: string }, context: unknown) => {
          calls.afterSuccess.push([spec.name, context]);
        },
        close: async (context: unknown, outcome: unknown) => {
          calls.closed.push([context, outcome]);
        },
      };
    }) as never),
  );
  track(
    spyOn(protocol, "executeOperation").mockImplementation((async (
      name: string,
      input: unknown,
      context: unknown,
    ) => {
      calls.executed.push([name, input, context]);
      return typeof result === "function" ? result() : result;
    }) as never),
  );
  return calls;
}

function invocation(
  inputPath: string,
  extra: Partial<JsonInvocation> = {},
): JsonInvocation {
  return {
    operationName: "kb_status",
    inputPath,
    command: command(),
    ...extra,
  };
}

describe("runJsonInvocation conflicts", () => {
  test("refuses --input combined with positionals and explicit options", async () => {
    const calls = stubRuntime({ exitCode: 0 });
    await runJsonInvocation(
      invocation("-", {
        command: command(["--tag", "x", "-v", "--input", "-"]),
        positionals: [
          { name: "type", value: "req" },
          { name: "id", value: undefined },
        ],
      }),
    );
    expect(stderr).toStrictEqual([
      "Error [CONFLICTING_INPUT]: --input cannot be combined with: type, --tag\n",
    ]);
    expect(notedCategories).toStrictEqual(["CONFLICTING_INPUT"]);
    expect(process.exitCode).toBe(2);
    expect(appended).toStrictEqual([]);
    expect(calls.runtimeOptions).toStrictEqual([]);
  });

  test("records a conflict in diagnostic mode", async () => {
    process.env.KIBI_DIAGNOSTIC_MODE = "1";
    stubRuntime({ exitCode: 0 });
    await runJsonInvocation(
      invocation("-", {
        positionals: [
          { name: "a", value: "1" },
          { name: "b", value: "2" },
        ],
      }),
    );
    expect(stderr).toStrictEqual([
      "Error [CONFLICTING_INPUT]: --input cannot be combined with: a, b\n",
    ]);
    expect(appended).toStrictEqual([
      {
        workspaceRoot: process.cwd(),
        tool: "kb_status",
        businessArgs: {},
        telemetry: null,
        startedAt: expect.any(Date),
        status: "error",
        error: "--input cannot be combined with: a, b",
      },
    ]);
  });
});

describe("runJsonInvocation input loading", () => {
  test("an unreadable input is an input error", async () => {
    const calls = stubRuntime({ exitCode: 0 });
    await runJsonInvocation(invocation(inputFile("[1]")));
    expect(stderr).toStrictEqual([
      "Error [INVALID_INPUT_ROOT]: JSON input must be an object.\n",
    ]);
    expect(notedCategories).toStrictEqual(["INVALID_INPUT_ROOT"]);
    expect(process.exitCode).toBe(2);
    expect(appended).toStrictEqual([]);
    expect(calls.runtimeOptions).toStrictEqual([]);
  });

  test("records an input error in diagnostic mode", async () => {
    process.env.KIBI_CLI_DIAGNOSTIC_MODE = "true";
    stubRuntime({ exitCode: 0 });
    await runJsonInvocation(invocation(inputFile("[1]")));
    expect(appended).toStrictEqual([
      {
        workspaceRoot: process.cwd(),
        tool: "kb_status",
        businessArgs: {},
        telemetry: null,
        startedAt: expect.any(Date),
        status: "error",
        error: "JSON input must be an object.",
      },
    ]);
  });

  test("any other loading failure propagates", async () => {
    stubRuntime({ exitCode: 0 });
    track(
      spyOn(cliInput, "loadInput").mockImplementation(async () => {
        throw new Error("disk on fire");
      }),
    );
    await expect(runJsonInvocation(invocation("-"))).rejects.toThrow(
      new Error("disk on fire"),
    );
    expect(stderr).toStrictEqual([]);
  });
});

describe("runJsonInvocation execution", () => {
  test("a successful read writes its stdout and nothing else", async () => {
    const calls = stubRuntime({ exitCode: 0, stdout: "{}\n" });
    await runJsonInvocation(invocation(inputFile('{"q":"a"}')));
    expect(calls).toStrictEqual({
      runtimeOptions: [{ workspaceRoot: process.cwd() }],
      opened: [["kb_status", { workspaceRoot: process.cwd() }]],
      afterSuccess: [],
      closed: [
        [
          CONTEXT,
          { status: "success", result: { exitCode: 0, stdout: "{}\n" } },
        ],
      ],
      executed: [["kb_status", { q: "a" }, CONTEXT]],
    });
    expect(stdout).toStrictEqual(["{}\n"]);
    expect(stderr).toStrictEqual([]);
    expect(notedResults).toStrictEqual([]);
    expect(appended).toStrictEqual([]);
    expect(process.exitCode).toBe(0);
  });

  test("a successful write runs the after-success hook", async () => {
    effects = ["kb-read", "kb-write"];
    const calls = stubRuntime({ exitCode: 0 });
    await runJsonInvocation(invocation(inputFile("{}")));
    expect(calls.afterSuccess).toStrictEqual([["kb_status", CONTEXT]]);
    expect(stdout).toStrictEqual([]);
  });

  test("a failed write skips the hook and reports its error", async () => {
    effects = ["kb-write"];
    const calls = stubRuntime({
      exitCode: 1,
      stdout: "out\n",
      stderr: "err\n",
    });
    await runJsonInvocation(invocation(inputFile("{}")));
    expect(calls.afterSuccess).toStrictEqual([]);
    expect(stdout).toStrictEqual(["out\n"]);
    expect(stderr).toStrictEqual(["err\n"]);
    expect(notedResults).toStrictEqual(["out\n"]);
    expect(process.exitCode).toBe(1);
  });

  test("a runtime that cannot open answers with an error envelope", async () => {
    const calls = stubRuntime({ exitCode: 0 }, new Error("no branch"));
    await runJsonInvocation(invocation(inputFile("{}")));
    expect(calls.executed).toStrictEqual([]);
    expect(calls.closed).toStrictEqual([]);
    expect(stderr).toStrictEqual(["Error [OPERATION_FAILED]: no branch\n"]);
    expect(JSON.parse(stdout.join("")).error.code).toBe("OPERATION_FAILED");
    expect(process.exitCode).toBe(1);
  });

  test("waits for stdout to drain when its buffer is full", async () => {
    stubRuntime({ exitCode: 0, stdout: "{}\n" });
    stdoutResult = false;
    let resolved = false;
    const run = runJsonInvocation(invocation(inputFile("{}"))).then(() => {
      resolved = true;
    });
    for (let tick = 0; tick < 50 && stdout.length === 0; tick += 1)
      await new Promise((resolve) => setTimeout(resolve, 1));
    expect(stdout).toStrictEqual(["{}\n"]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(resolved).toBe(false);
    process.stdout.emit("drain");
    await run;
    expect(resolved).toBe(true);
  });

  test("an execution failure propagates", async () => {
    stubRuntime(() => {
      throw new Error("crashed");
    });
    await expect(
      runJsonInvocation(invocation(inputFile("{}"))),
    ).rejects.toThrow(new Error("crashed"));
    expect(appended).toStrictEqual([]);
  });
});

describe("runJsonInvocation diagnostic records", () => {
  beforeEach(() => {
    process.env.KIBI_DIAGNOSTIC_MODE = "1";
  });

  const base = (extra: Record<string, unknown>) => ({
    workspaceRoot: process.cwd(),
    tool: "kb_status",
    businessArgs: { q: "a" },
    telemetry: { attempt: 2 },
    startedAt: expect.any(Date),
    ...extra,
  });
  const INPUT = '{"q":"a","_diagnostic_telemetry":{"attempt":2}}';

  test("a success records its parsed result", async () => {
    stubRuntime({ exitCode: 0, stdout: '{"ok":true}\n', stderr: "warn\n" });
    await runJsonInvocation(invocation(inputFile(INPUT)));
    expect(appended).toStrictEqual([
      base({ status: "success", result: { ok: true } }),
    ]);
  });

  test("a failure records its trimmed stderr", async () => {
    stubRuntime({ exitCode: 1, stdout: "not json", stderr: "  bad\n" });
    await runJsonInvocation(invocation(inputFile(INPUT)));
    expect(appended).toStrictEqual([
      base({ status: "error", result: undefined, error: "bad" }),
    ]);
  });

  test("a failure without stderr or stdout records no error text", async () => {
    stubRuntime({ exitCode: 3 });
    await runJsonInvocation(invocation(inputFile('{"q":"a"}')));
    expect(appended).toStrictEqual([
      base({ telemetry: null, status: "error", result: undefined }),
    ]);
    expect(stdout).toStrictEqual([]);
  });

  test("invalid input records no business arguments", async () => {
    stubRuntime({ exitCode: 2 });
    await runJsonInvocation(invocation(inputFile('{"q":1}')));
    expect(appended).toStrictEqual([
      base({
        businessArgs: {},
        telemetry: null,
        status: "error",
        result: undefined,
      }),
    ]);
  });

  test("a thrown failure is recorded before it propagates", async () => {
    stubRuntime(() => {
      throw "string failure";
    });
    await expect(runJsonInvocation(invocation(inputFile(INPUT)))).rejects.toBe(
      "string failure",
    );
    stubRuntime(() => {
      throw new Error("error failure");
    });
    await expect(
      runJsonInvocation(invocation(inputFile(INPUT))),
    ).rejects.toThrow("error failure");
    expect(appended).toStrictEqual([
      base({ status: "error", error: "string failure" }),
      base({ status: "error", error: "error failure" }),
    ]);
  });

  test("the --diagnostic-mode flag turns recording on", async () => {
    Reflect.deleteProperty(process.env, "KIBI_DIAGNOSTIC_MODE");
    stubRuntime({ exitCode: 0 });
    await runJsonInvocation(invocation(inputFile("{}")));
    expect(appended.length).toBe(0);
    const program = new Command()
      .exitOverride()
      .option("--diagnostic-mode", "diagnostics");
    const status = program
      .command("status")
      .option("--input <path>")
      .action(() => undefined);
    program.parse(["--diagnostic-mode", "status"], { from: "user" });
    await runJsonInvocation({
      ...invocation(inputFile("{}")),
      command: status,
    });
    expect(appended.length).toBe(1);
    process.argv.push("--diagnostic-mode");
    try {
      await runJsonInvocation(invocation(inputFile("{}")));
    } finally {
      process.argv.pop();
    }
    expect(appended.length).toBe(2);
  });
});

describe("console and stderr helpers", () => {
  test("withConsoleOnStderr sends log and info to console.error, then restores them", async () => {
    const errors: unknown[][] = [];
    const error = track(
      spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        errors.push(args);
      }),
    );
    const { log, info } = console;
    expect(
      await withConsoleOnStderr(async () => {
        console.log("a", 1);
        console.info("b");
        return 7;
      }),
    ).toBe(7);
    expect(console.log).toBe(log);
    expect(console.info).toBe(info);
    await expect(
      withConsoleOnStderr(async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    expect(console.log).toBe(log);
    expect(console.info).toBe(info);
    expect(errors).toStrictEqual([["a", 1], ["b"]]);
    error.mockRestore();
  });

  test("writeOptionalStderr writes only defined text", () => {
    writeOptionalStderr(undefined);
    writeOptionalStderr("");
    writeOptionalStderr("x");
    expect(stderr).toStrictEqual(["", "x"]);
  });
});
