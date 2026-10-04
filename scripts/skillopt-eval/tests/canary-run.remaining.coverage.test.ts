// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runModelCanary } from "../runtime/canary-run";
import type { ProcessResult } from "../runtime/process";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function chatGptResult(argv: readonly [string, ...string[]]): ProcessResult {
  return {
    argv,
    stdout: "",
    stderr: "Logged in using ChatGPT\n",
    exitCode: 0,
    signal: null,
  };
}

function jsonl(events: readonly Readonly<Record<string, unknown>>[]): string {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

async function preparedCanary() {
  const root = await mkdtemp(join(tmpdir(), "skillopt-canary-rem-"));
  roots.push(root);
  const realCodexHome = join(root, "real-codex-home");
  await mkdir(realCodexHome);
  await writeFile(
    join(realCodexHome, "auth.json"),
    JSON.stringify({
      auth_mode: "chatgpt",
      tokens: { access_token: "session-token" },
    }),
    { mode: 0o600 },
  );
  const sourceWorktree = process.cwd();
  if (!existsSync(resolve(process.cwd(), "packages"))) {
    throw new Error("canary remaining tests require the repo packages root");
  }
  return {
    root,
    realCodexHome,
    sourceWorktree,
    context: {
      options: {
        runId: "00000000-0000-4000-8000-000000000701",
        sourceWorktree,
        artifactRoot: join(root, "artifacts"),
      },
      role: "target" as const,
      sourceWorktree,
      artifactRoot: join(root, "artifacts"),
      env: { PATH: process.env.PATH, CODEX_HOME: realCodexHome },
      probeSandbox: async () => {},
      probeMcp: async () => {},
      stageDependencies: {
        stagedRuntime: {
          codexExecutable: "/bin/true",
          bwrapExecutable: "/bin/true",
        },
      },
    },
  };
}

describe("runModelCanary remaining event and IO failure branches", () => {
  test.each(["target", "optimizer"] as const)(
    "%s canary requests one probe through the available executor",
    async (role) => {
      const prepared = await preparedCanary();
      let prompt = "";
      const result = await runModelCanary({
        ...prepared.context,
        role,
        run: async (argv, _cwd, _env, _timeout, stdin) => {
          if (argv.join(" ") === "codex login status")
            return chatGptResult(argv);
          prompt = stdin ?? "";
          return {
            argv,
            stdout: jsonl([{ type: "turn.completed" }]),
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        },
      });
      expect(prompt).toContain("exec_command, through code mode when required");
      expect(prompt).toContain(
        "exactly once to execute ./.runtime/canary-probe",
      );
      if (role === "optimizer") {
        const payload = prompt.match(
          /with these JSON arguments: (\{.+\})\. Wait/,
        );
        expect(JSON.parse(payload?.[1] ?? "null")).toEqual({
          mode: "analyze",
          text: "A session timeout must be 30 minutes.",
          _diagnostic_telemetry: {
            is_autonomous: true,
            reasoning: expect.any(String),
            confidence_score: 1,
            attempt_number: 1,
            missing_context: "",
          },
        });
      }
      // Naming the current executor must never admit a final success claim
      // when the model supplied no completed command evidence.
      expect(result).toMatchObject({
        kind: "no-go",
        reason: "missing_probe_execution",
        paidModelCalls: 1,
      });
    },
  );

  test("returns no-go when Codex emits an error event after a zero exit", async () => {
    const prepared = await preparedCanary();
    const result = await runModelCanary({
      ...prepared.context,
      run: async (argv) => {
        if (argv.join(" ") === "codex login status") return chatGptResult(argv);
        return {
          argv,
          stdout: jsonl([{ type: "error", message: "turn exploded" }]),
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      },
    });
    expect(result).toMatchObject({
      kind: "no-go",
      reason: "codex_event_failure",
      paidModelCalls: 1,
    });
  });

  test("classifies a non-ENOENT broker-trace read as canary infrastructure", async () => {
    const prepared = await preparedCanary();
    const result = await runModelCanary({
      ...prepared.context,
      run: async (argv, cwd) => {
        if (argv.join(" ") === "codex login status") return chatGptResult(argv);
        await mkdir(join(cwd, "..", "private-evidence", "broker-trace.jsonl"), {
          recursive: true,
        });
        return {
          argv,
          stdout: jsonl([{ type: "turn.completed" }]),
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      },
    });
    expect(result.kind).toBe("no-go");
    if (result.kind !== "no-go") throw new Error("expected no-go");
    expect(result.reason).toContain("canary_infrastructure:");
    expect(result.paidModelCalls).toBe(1);
    expect(result.run).toBeDefined();
  });

  test("classifies a non-ENOENT usage.log read as canary infrastructure", async () => {
    const prepared = await preparedCanary();
    const result = await runModelCanary({
      ...prepared.context,
      run: async (argv, cwd) => {
        if (argv.join(" ") === "codex login status") return chatGptResult(argv);
        await mkdir(join(cwd, ".kb", "usage.log"), { recursive: true });
        return {
          argv,
          stdout: jsonl([{ type: "turn.completed" }]),
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      },
    });
    expect(result.kind).toBe("no-go");
    if (result.kind !== "no-go") throw new Error("expected no-go");
    expect(result.reason).toContain("canary_infrastructure:");
    expect(result.paidModelCalls).toBe(1);
  });

  test("wraps unknown thrown values after a paid model call", async () => {
    const prepared = await preparedCanary();
    const result = await runModelCanary({
      ...prepared.context,
      run: async (argv) => {
        if (argv.join(" ") === "codex login status") return chatGptResult(argv);
        return {
          argv,
          stdout: jsonl([{ type: "turn.completed" }]),
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      },
      verifyEvidence: async () => {
        throw "bare-string";
      },
    });
    expect(result).toMatchObject({
      kind: "no-go",
      reason: "canary_infrastructure:UnknownError",
      paidModelCalls: 1,
    });
  });
});
