// implements REQ-kibi-operation-interface-parity
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { markErrorReported } from "../src/cli-command.js";
import { registerFoundationCommands } from "../src/cli-register-foundation.js";
import { registerJsonOnlyCommands } from "../src/cli-register-json.js";
import { registerMaintenanceCommands } from "../src/cli-register-maintenance.js";
import { registerProofCommand } from "../src/cli-register-proof.js";
import { registerReportingCommands } from "../src/cli-register-reporting.js";
import { registerSkillsCommands } from "../src/cli-register-skills.js";
import {
  buildProgram,
  exitCodeFromCliFailure,
  isClosedOutputError,
  main,
  packageVersion,
} from "../src/cli.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  process.exitCode = 0;
});

const PACKAGE_VERSION: string = JSON.parse(
  fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
).version;

describe("packageVersion", () => {
  test("reads a string version and falls back otherwise", () => {
    expect(packageVersion({ version: "1.2.3" })).toBe("1.2.3");
    for (const value of [null, undefined, "1.2.3", 7, {}, { version: 1 }])
      expect(packageVersion(value)).toBe("0.1.0");
  });
});

describe("exitCodeFromCliFailure", () => {
  test("prints an unreported failure once and returns 1", () => {
    const printed: unknown[][] = [];
    const error = spyOn(console, "error").mockImplementation(
      (...args: unknown[]) => {
        printed.push(args);
      },
    );
    restores.push(() => error.mockRestore());
    const reported = new Error("already shown");
    markErrorReported(reported);
    expect(exitCodeFromCliFailure(reported)).toBe(1);
    expect(exitCodeFromCliFailure(new Error("boom"))).toBe(1);
    expect(exitCodeFromCliFailure("text failure")).toBe(1);
    expect(printed).toStrictEqual([["boom"], ["text failure"]]);
  });
});

describe("isClosedOutputError", () => {
  test("recognizes both closed-stream codes only", () => {
    expect(isClosedOutputError({ code: "EPIPE" })).toBe(true);
    expect(isClosedOutputError({ code: "ERR_STREAM_DESTROYED" })).toBe(true);
    expect(isClosedOutputError({ code: "ENOENT" })).toBe(false);
    expect(isClosedOutputError({ code: "" })).toBe(false);
    expect(isClosedOutputError({})).toBe(false);
    expect(isClosedOutputError("EPIPE")).toBe(false);
  });
});

describe("buildProgram", () => {
  test("names the program and registers every command group in order", () => {
    const program = buildProgram();
    expect(program.name()).toBe("kibi");
    expect(program.description()).toBe("Prolog-based project knowledge base");
    expect(program.version()).toBe(PACKAGE_VERSION);
    expect(
      program.options.map((option) => [option.flags, option.description]),
    ).toStrictEqual([
      ["-V, --version", "output the version number"],
      [
        "--diagnostic-mode",
        "Append diagnostic usage evidence for public JSON operations",
      ],
    ]);
    const expected: string[] = [];
    for (const register of [
      registerFoundationCommands,
      registerReportingCommands,
      registerMaintenanceCommands,
      registerSkillsCommands,
      registerProofCommand,
      registerJsonOnlyCommands,
    ]) {
      const group = new Command();
      register(group);
      expected.push(...group.commands.map((command) => command.name()));
    }
    expect(program.commands.map((command) => command.name())).toStrictEqual(
      expected,
    );
  });
});

describe("main", () => {
  let root: string;
  let exits: Array<number | undefined>;

  beforeEach(() => {
    exits = [];
    const savedEnv = { ...process.env };
    const savedArgv = process.argv;
    const savedCwd = process.cwd();
    const listeners = process.stdout.listeners("error");
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cli-pure-")),
    );
    for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"])
      delete process.env[key];
    process.env.KIBI_TELEMETRY = "0";
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      exits.push(code);
    }) as typeof process.exit);
    restores.push(() => {
      exit.mockRestore();
      for (const listener of process.stdout.listeners("error"))
        if (!listeners.includes(listener))
          process.stdout.removeListener("error", listener as () => void);
      process.chdir(savedCwd);
      process.argv = savedArgv;
      for (const key of Object.keys(process.env))
        if (!(key in savedEnv)) delete process.env[key];
      Object.assign(process.env, savedEnv);
      fs.rmSync(root, { recursive: true, force: true });
    });
  });

  function parsed(): string[][] {
    const seen: string[][] = [];
    const parse = spyOn(Command.prototype, "parseAsync").mockImplementation(
      async function (this: Command, argv?: readonly string[]) {
        seen.push([...(argv ?? [])]);
        return this;
      } as never,
    );
    restores.push(() => parse.mockRestore());
    return seen;
  }

  test("runs from the enclosing workspace with absolute path options", async () => {
    fs.mkdirSync(path.join(root, ".kb"));
    fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
    const sub = path.join(root, "apps");
    fs.mkdirSync(sub);
    process.chdir(sub);
    process.argv = ["node", "kibi", "check", "--input", "in.json"];
    const seen = parsed();
    await main();
    expect(process.cwd()).toBe(root);
    expect(seen).toStrictEqual([
      ["node", "kibi", "check", "--input", path.join(sub, "in.json")],
    ]);
    expect(exits).toStrictEqual([0]);
  });

  test("loads the project environment file before parsing", async () => {
    const envFile = path.join(root, "custom.env");
    fs.writeFileSync(envFile, "KIBI_CLI_PURE_PROBE=loaded\n");
    process.env.KIBI_ENV_FILE = envFile;
    delete process.env.KIBI_CLI_PURE_PROBE;
    process.chdir(root);
    process.argv = ["node", "kibi", "status"];
    let during: string | undefined;
    const parse = spyOn(Command.prototype, "parseAsync").mockImplementation(
      async function (this: Command) {
        during = process.env.KIBI_CLI_PURE_PROBE;
        return this;
      } as never,
    );
    restores.push(() => parse.mockRestore());
    await main();
    expect(during).toBe("loaded");
  });

  test("exits with the exit code the command set", async () => {
    process.chdir(root);
    process.argv = ["node", "kibi", "status"];
    const parse = spyOn(Command.prototype, "parseAsync").mockImplementation(
      async function (this: Command) {
        process.exitCode = 6;
        return this;
      } as never,
    );
    restores.push(() => parse.mockRestore());
    await main();
    expect(exits).toStrictEqual([6]);
  });
});
