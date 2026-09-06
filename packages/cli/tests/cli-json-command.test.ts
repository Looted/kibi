import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runJsonInvocation } from "../src/cli-json-command.js";
import * as cliInput from "../src/cli-input.js";
import * as cliLoader from "../src/cli-operation-loader.js";
import * as cliProtocol from "../src/cli-protocol.js";
import * as cliRuntime from "../src/runtime/cli-runtime.js";
import {
  captureIo,
  isolateKibiEnv,
  restoreWorkspaceCwd,
  withCwd,
} from "./helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "kibi-json-cmd-"));
  roots.push(directory);
  return directory;
}

function writeInput(directory: string, name: string, value: unknown): string {
  const filePath = path.join(directory, name);
  writeFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
  return filePath;
}

function parseSkillsListCommand(argv: string[]): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--diagnostic-mode");
  const command = program
    .command("skills-list")
    .option("--input <path>")
    .option("--format <format>");
  program.parse(argv, { from: "user" });
  return command;
}

describe("runJsonInvocation", () => {
  test("rejects --input combined with other CLI flags", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "skills-list",
      "--input",
      "-",
      "--format",
      "json",
    ]);

    await runJsonInvocation({
      operationName: "kb_skills_list",
      inputPath: "-",
      command,
    });

    expect(process.exitCode).toBe(2);
    expect(io.stderr.join("")).toContain("CONFLICTING_INPUT");
    expect(io.stderr.join("")).toContain("--format");
  });

  test("records diagnostic usage for conflicting input when env enables diagnostics", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    process.env.KIBI_CLI_DIAGNOSTIC_MODE = "1";
    const cwd = tempDir();
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "skills-list",
      "--input",
      "-",
      "--format",
      "table",
    ]);

    await withCwd(cwd, () =>
      runJsonInvocation({
        operationName: "kb_skills_list",
        inputPath: "-",
        command,
      }),
    );

    expect(process.exitCode).toBe(2);
    const logPath = path.join(cwd, ".kb", "usage.log");
    const rows = readUsageLog(logPath);
    expect(rows[0]).toMatchObject({
      tool: "kb_skills_list",
      status: "error",
    });
  });

  test("rejects unreadable input files and writes an InputError", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "skills-list",
      "--input",
      "missing.json",
    ]);

    await runJsonInvocation({
      operationName: "kb_skills_list",
      inputPath: "missing.json",
      command,
    });

    expect(process.exitCode).toBe(2);
    expect(io.stderr.join("")).toContain("INPUT_READ_FAILED");
  });

  test("lists bundled skills from a JSON file without Prolog", async () => {
    const cwd = tempDir();
    const inputPath = writeInput(cwd, "input.json", {});
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "skills-list",
      "--input",
      inputPath,
    ]);

    await withCwd(cwd, () =>
      runJsonInvocation({
        operationName: "kb_skills_list",
        inputPath,
        command,
      }),
    );

    expect(process.exitCode ?? 0).toBe(0);
    const printed = JSON.parse(io.stdout.join(""));
    expect(printed).toMatchObject({
      kibiProtocol: 1,
      operation: "kb_skills_list",
      status: "success",
    });
    expect(printed.data.skills.some((skill: { id: string }) => skill.id === "kibi-usage")).toBe(
      true,
    );
  });

  test("appends diagnostic usage on success when --diagnostic-mode is set", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = tempDir();
    const inputPath = writeInput(cwd, "input.json", {
      _diagnostic_telemetry: {
        is_autonomous: true,
        session_id: "session-json",
        actor_id: "actor-json",
      },
    });
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "--diagnostic-mode",
      "skills-list",
      "--input",
      inputPath,
    ]);

    await withCwd(cwd, () =>
      runJsonInvocation({
        operationName: "kb_skills_list",
        inputPath,
        command,
      }),
    );

    expect(process.exitCode ?? 0).toBe(0);
    const rows = readUsageLog(path.join(cwd, ".kb", "usage.log"));
    expect(rows[0]).toMatchObject({
      tool: "kb_skills_list",
      status: "success",
      session_id: "session-json",
    });
  });

  test("records positional conflicts when extra positionals are supplied", async () => {
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand(["skills-list", "--input", "-"]);

    await runJsonInvocation({
      operationName: "kb_skills_list",
      inputPath: "-",
      command,
      positionals: [{ name: "id", value: "extra" }],
    });

    expect(process.exitCode).toBe(2);
    expect(io.stderr.join("")).toContain("id");
  });

  test("records diagnostic usage when a Prolog operation fails to open", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    process.env.KIBI_CLI_DIAGNOSTIC_MODE = "1";
    const cwd = tempDir();
    const inputPath = writeInput(cwd, "query.json", { type: "req" });
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const program = new Command();
    program.exitOverride();
    const command = program.command("query").option("--input <path>");
    program.parse(["query", "--input", inputPath], { from: "user" });

    await withCwd(cwd, async () => {
      await expect(
        runJsonInvocation({
          operationName: "kb_query",
          inputPath,
          command,
        }),
      ).rejects.toThrow(/Git branch|git|Kibi requires/i);
    });

    const rows = readUsageLog(path.join(cwd, ".kb", "usage.log"));
    expect(rows[0]).toMatchObject({
      tool: "kb_query",
      status: "error",
    });
  });

  test("records diagnostic usage when an input file cannot be read", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    process.env.KIBI_CLI_DIAGNOSTIC_MODE = "1";
    const cwd = tempDir();
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "skills-list",
      "--input",
      "missing.json",
    ]);
    await withCwd(cwd, () =>
      runJsonInvocation({
        operationName: "kb_skills_list",
        inputPath: "missing.json",
        command,
      }),
    );
    expect(io.stderr.join("")).toContain("INPUT_READ_FAILED");
    const rows = readUsageLog(path.join(cwd, ".kb", "usage.log"));
    expect(rows[0]).toMatchObject({
      tool: "kb_skills_list",
      status: "error",
    });
  });

  test("rethrows non-InputError failures from loadInput", async () => {
    const load = spyOn(cliInput, "loadInput").mockRejectedValue(
      new Error("disk exploded"),
    );
    restores.push(() => load.mockRestore());
    const command = parseSkillsListCommand(["skills-list", "--input", "-"]);
    await expect(
      runJsonInvocation({
        operationName: "kb_skills_list",
        inputPath: "-",
        command,
      }),
    ).rejects.toThrow("disk exploded");
  });

  test("runs afterSuccess for kb-write specs and ignores non-json stdout", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = tempDir();
    const inputPath = writeInput(cwd, "input.json", {});
    const spec = await cliLoader.loadOperationSpec("kb_skills_list");
    const load = spyOn(cliLoader, "loadOperationSpec").mockResolvedValue({
      ...spec,
      effects: ["kb-write"],
    });
    let afterSuccess = 0;
    const runtime = spyOn(cliRuntime, "createCliRuntime").mockReturnValue({
      open: async () => ({ workspaceRoot: cwd }) as never,
      afterSuccess: async () => {
        afterSuccess += 1;
      },
      close: async () => undefined,
    });
    const execute = spyOn(cliProtocol, "executeOperation").mockResolvedValue({
      exitCode: 0,
      stdout: "not-json",
    });
    restores.push(() => {
      load.mockRestore();
      runtime.mockRestore();
      execute.mockRestore();
    });
    process.env.KIBI_CLI_DIAGNOSTIC_MODE = "1";
    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    const command = parseSkillsListCommand([
      "skills-list",
      "--input",
      inputPath,
    ]);
    await withCwd(cwd, () =>
      runJsonInvocation({
        operationName: "kb_skills_list",
        inputPath,
        command,
      }),
    );
    expect(afterSuccess).toBe(1);
    expect(io.stdout.join("")).toContain("not-json");
    expect(readUsageLog(path.join(cwd, ".kb", "usage.log"))[0]).toMatchObject({
      status: "success",
    });
  });
});

function readUsageLog(filePath: string): Array<Record<string, unknown>> {
  expect(existsSync(filePath)).toBe(true);
  return readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}
