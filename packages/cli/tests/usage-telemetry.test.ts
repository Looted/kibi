// implements REQ-kibi-anonymous-usage-telemetry
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";

import { telemetryCommand } from "../src/commands/telemetry";
import { finishCliTelemetry, trackCommandPath } from "../src/usage-telemetry";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function telemetryEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cli-telem-"));
  temporaryRoots.push(directory);
  return { KIBI_TELEMETRY_DIR: directory, ...extra };
}

function queued(env: NodeJS.ProcessEnv): Record<string, unknown>[] {
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

describe("CLI anonymous usage telemetry", () => {
  test("names the registered command path, never its arguments", async () => {
    const program = new Command().name("kibi").exitOverride();
    const storage = program.command("storage");
    storage
      .command("compact")
      .option("--path <path>")
      .action(() => undefined);
    const commandPath = trackCommandPath(program);
    await program.parseAsync(
      ["storage", "compact", "--path", "/private/repo"],
      { from: "user" },
    );
    expect(commandPath()).toBe("storage compact");
  });

  test("records one event per command and prints the notice once", async () => {
    const env = telemetryEnv({ CLAUDECODE: "1", KIBI_TELEMETRY: "1" });
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    try {
      for (const exitCode of [0, 2]) {
        await finishCliTelemetry({
          commandPath: "sync",
          packageVersion: "1.2.3",
          startedAt: new Date(Date.now() - 5),
          exitCode,
          env,
        });
      }
      const notices = stderr.mock.calls.filter((call) =>
        String(call[0]).includes("anonymous usage statistics"),
      );
      expect(notices).toHaveLength(1);
    } finally {
      stderr.mockRestore();
    }
    expect(queued(env)).toMatchObject([
      {
        package: "kibi-cli",
        package_version: "1.2.3",
        host: "claude-code",
        interface: "cli",
        operation: "sync",
        status: "success",
        exit_code: 0,
      },
      { operation: "sync", status: "error", exit_code: 2 },
    ]);
  });

  test("does not record telemetry management or unmatched commands", async () => {
    const env = telemetryEnv({ KIBI_TELEMETRY: "1" });
    for (const commandPath of ["telemetry", undefined]) {
      await finishCliTelemetry({
        commandPath,
        packageVersion: "1.2.3",
        startedAt: new Date(),
        exitCode: 0,
        env,
      });
    }
    expect(queued(env)).toEqual([]);
  });

  test("kibi telemetry disable and enable persist the choice", async () => {
    const env = telemetryEnv({ CI: "true" });
    const log = spyOn(console, "log").mockImplementation(() => undefined);
    // The runner's NODE_ENV=test would turn telemetry off regardless.
    const savedNodeEnv = process.env.NODE_ENV;
    Reflect.deleteProperty(process.env, "NODE_ENV");
    try {
      expect(
        (await telemetryCommand("status", { format: "json" }, env)).exitCode,
      ).toBe(0);
      expect(JSON.parse(String(log.mock.calls.at(-1)?.[0]))).toMatchObject({
        enabled: false,
        reason: "CI environment",
      });
      await telemetryCommand("enable", { format: "json" }, env);
      expect(JSON.parse(String(log.mock.calls.at(-1)?.[0])).enabled).toBe(true);
      await telemetryCommand("disable", {}, env);
      expect(String(log.mock.calls.at(-3)?.[0])).toContain(
        "telemetry is off (disabled with `kibi telemetry disable`)",
      );
    } finally {
      log.mockRestore();
      if (savedNodeEnv !== undefined) process.env.NODE_ENV = savedNodeEnv;
    }
    const error = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect((await telemetryCommand("maybe", {}, env)).exitCode).toBe(1);
    } finally {
      error.mockRestore();
    }
  });
});
