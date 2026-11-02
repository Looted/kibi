// implements REQ-kibi-anonymous-usage-telemetry
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";

import { isClosedOutputError } from "../src/cli";
import { executeOperation } from "../src/cli-protocol";
import {
  missingInputMessage,
  registerJsonOnlyCommands,
} from "../src/cli-register-json";
import {
  finishCliTelemetry,
  noteCliErrorCategory,
} from "../src/usage-telemetry";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  process.exitCode = 0;
});

function telemetryEnv(): NodeJS.ProcessEnv {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cli-fail-"));
  temporaryRoots.push(directory);
  return { KIBI_TELEMETRY_DIR: directory, KIBI_TELEMETRY: "1" };
}

function queuedCategories(env: NodeJS.ProcessEnv): unknown[] {
  const file = path.join(
    env.KIBI_TELEMETRY_DIR as string,
    "telemetry-queue.jsonl",
  );
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line).properties.error_category);
}

function finish(
  env: NodeJS.ProcessEnv,
  commandPath: string,
  exitCode: number,
  error?: unknown,
) {
  return finishCliTelemetry({
    commandPath,
    packageVersion: "1.2.3",
    startedAt: new Date(),
    exitCode,
    error,
    env,
  });
}

describe("CLI failure categories", () => {
  // implements REQ-kibi-operation-interface-parity
  test("a JSON-only command run without --input names the fix and records MISSING_INPUT", async () => {
    const env = telemetryEnv();
    const program = new Command().name("kibi").exitOverride();
    registerJsonOnlyCommands(program);
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    try {
      await program.parseAsync(["plan-bootstrap"], { from: "user" });
      expect(process.exitCode).toBe(2);
      const written = stderr.mock.calls.map((call) => String(call[0])).join("");
      expect(written).toBe(missingInputMessage("plan-bootstrap"));
      expect(written).toContain("echo '{}' | kibi plan-bootstrap --input -");
      expect(written).toContain("kibi plan-bootstrap --schema");
      await finish(env, "plan-bootstrap", 2);
    } finally {
      stderr.mockRestore();
    }
    expect(queuedCategories(env)).toEqual(["missing_input"]);
  });

  // implements REQ-kibi-operation-interface-parity
  test("--schema prints the input schema --input is validated against", async () => {
    const program = new Command().name("kibi").exitOverride();
    registerJsonOnlyCommands(program);
    const chunks: string[] = [];
    const stdout = spyOn(process.stdout, "write").mockImplementation(
      (chunk) => {
        chunks.push(String(chunk));
        return true;
      },
    );
    try {
      await program.parseAsync(["plan-bootstrap", "--schema"], {
        from: "user",
      });
    } finally {
      stdout.mockRestore();
    }
    const schema = JSON.parse(chunks.join(""));
    const source =
      schema.properties.bootstrapContext.properties.knowledgeSources.items
        .properties;
    expect(source.kind.enum).toContain("issue_tracker");
    expect(source.authority.enum).toEqual([
      "authoritative",
      "supporting",
      "stale",
    ]);
    expect(process.exitCode ?? 0).toBe(0);
  });

  // implements REQ-kibi-operation-interface-parity
  test("an invalid JSON-only input points at --schema; an integrated command's does not", async () => {
    const context = {} as Parameters<typeof executeOperation>[2];
    const bootstrap = await executeOperation(
      "kb_plan_bootstrap",
      { bootstrapContext: { knowledgeSources: [{ id: "x", kind: "jira" }] } },
      context,
    );
    expect(bootstrap.exitCode).toBe(2);
    expect(bootstrap.stderr).toContain("VALIDATION_FAILED");
    expect(bootstrap.stderr).toContain("kibi plan-bootstrap --schema");
    const status = await executeOperation(
      "kb_status",
      { unexpected: true },
      context,
    );
    expect(status.stderr).toContain("VALIDATION_FAILED");
    expect(status.stderr).not.toContain("--schema");
  });

  test("a non-zero exit that is the command's answer gets an outcome category", async () => {
    const env = telemetryEnv();
    await finish(env, "check", 1);
    await finish(env, "proof run-steps", 1);
    await finish(env, "prove", 1);
    noteCliErrorCategory("integration_failed");
    await finish(env, "prove", 1);
    await finish(env, "search", 1);
    await finish(
      env,
      "sync",
      1,
      Object.assign(new Error("Pending source hash drift"), {
        name: "SyncError",
        code: "PENDING_SOURCE_HASH_DRIFT",
      }),
    );
    expect(queuedCategories(env)).toEqual([
      "check_violations",
      "tests_failed",
      "tests_failed",
      "integration_failed",
      null,
      "pending_source_hash_drift",
    ]);
  });

  test("only a closed output stream counts as a closed reader", () => {
    expect(
      isClosedOutputError(Object.assign(new Error("x"), { code: "EPIPE" })),
    ).toBe(true);
    expect(
      isClosedOutputError(
        Object.assign(new Error("x"), { code: "ERR_STREAM_DESTROYED" }),
      ),
    ).toBe(true);
    expect(
      isClosedOutputError(Object.assign(new Error("x"), { code: "ENOENT" })),
    ).toBe(false);
    expect(isClosedOutputError("EPIPE")).toBe(false);
  });

  // implements REQ-kibi-operation-interface-parity
  test("a reader that closes stdout early does not crash the CLI", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cli-epipe-"));
    temporaryRoots.push(cwd);
    const child = spawn(
      process.execPath,
      [
        path.resolve(import.meta.dir, "../bin/kibi"),
        "plan-bootstrap",
        "--schema",
      ],
      {
        cwd,
        env: { ...process.env, KIBI_TELEMETRY: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.destroy();
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    const exitCode = await new Promise<number | null>((resolve) =>
      child.on("close", (code) => resolve(code)),
    );
    expect(stderr).not.toContain("EPIPE");
    expect(exitCode).toBe(0);
  });
});
