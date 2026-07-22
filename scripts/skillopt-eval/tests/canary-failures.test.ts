import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProcessResult } from "../runtime/process";
import { runCapabilityCanary } from "../runtime/workspace";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function authEnvironment(): Promise<
  Readonly<{
    artifactRoot: string;
    env: NodeJS.ProcessEnv;
  }>
> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-canary-test-"));
  roots.push(root);
  const codexHome = join(root, "codex");
  await mkdir(codexHome);
  await writeFile(
    join(codexHome, "auth.json"),
    JSON.stringify({
      auth_mode: "chatgpt",
      tokens: { access_token: "session-token" },
    }),
    { mode: 0o600 },
  );
  return {
    artifactRoot: join(root, "artifacts"),
    env: { PATH: process.env.PATH, CODEX_HOME: codexHome },
  };
}

function fakeRunner(stdout: string, exitCode = 0) {
  return async (
    argv: readonly [string, ...string[]],
  ): Promise<ProcessResult> => {
    if (argv.join(" ") === "codex login status") {
      return {
        argv,
        stdout: "",
        stderr: "Logged in using ChatGPT\n",
        exitCode: 0,
        signal: null,
      };
    }
    return { argv, stdout, stderr: "", exitCode, signal: null };
  };
}

const completedProbeEvents = [
  JSON.stringify({
    type: "item.completed",
    item: {
      id: "probe-command",
      type: "command_execution",
      command: "./.runtime/canary-probe",
      aggregated_output: "skillopt-capability-canary:pass\n",
      exit_code: 0,
      status: "completed",
    },
  }),
  JSON.stringify({
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  }),
].join("\n");

describe("Codex capability canary failures", () => {
  test("fails when required MCP startup reports an error despite exit zero", async () => {
    // Given
    const fixture = await authEnvironment();

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "required-mcp-failure",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        run: fakeRunner(
          '{"type":"error","message":"required MCP failed"}\n{"type":"turn.completed"}\n',
        ),
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "codex_event_failure",
      paidModelCalls: 2,
    });
    expect(receipt.events[0]).toMatchObject({ message: "required MCP failed" });
  });

  test("rejects malformed JSONL and misleading success exit", async () => {
    // Given
    const fixture = await authEnvironment();

    // When
    const malformed = await runCapabilityCanary(
      {
        runId: "malformed-jsonl",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      { run: fakeRunner('{"type":') },
    );
    const misleading = await runCapabilityCanary(
      {
        runId: "misleading-success",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      { run: fakeRunner('{"type":"turn.started"}\n') },
    );

    // Then
    expect(malformed).toMatchObject({
      verdict: "no-go",
      reason: "malformed_jsonl:1",
    });
    expect(misleading).toMatchObject({
      verdict: "no-go",
      reason: "missing_turn_completed",
    });
  });

  test("records a bounded diagnostic for nonzero Codex exit", async () => {
    // Given
    const fixture = await authEnvironment();

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "nonzero-exit",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      { run: fakeRunner("", 17) },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "codex_exit:17:no_stderr",
    });
  });

  test("rejects a forged final response without broker command evidence", async () => {
    // Given
    const fixture = await authEnvironment();
    const forgedEvents = [
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "final-message",
          type: "agent_message",
          text: '{"probeExecuted":true}',
        },
      }),
      JSON.stringify({ type: "turn.completed", usage: {} }),
    ].join("\n");

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "forged-final-response",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      { run: fakeRunner(forgedEvents) },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "missing_probe_execution",
      paidModelCalls: 2,
    });
  });

  test("runs the identical probe with target and optimizer model identities", async () => {
    // Given
    const fixture = await authEnvironment();
    const modelArgv: string[][] = [];

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "dual-model-pass",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        run: async (argv) => {
          if (argv.join(" ") === "codex login status") {
            return {
              argv,
              stdout: "",
              stderr: "Logged in using ChatGPT\n",
              exitCode: 0,
              signal: null,
            };
          }
          modelArgv.push([...argv]);
          return {
            argv,
            stdout: `${completedProbeEvents}\n`,
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        },
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "pass",
      paidModelCalls: 2,
      modelRuns: [
        { role: "target", model: "gpt-5.4-mini" },
        { role: "optimizer", model: "gpt-5.5" },
      ],
    });
    expect(modelArgv.map((argv) => argv[argv.indexOf("--model") + 1])).toEqual([
      "gpt-5.4-mini",
      "gpt-5.5",
    ]);
  });
});
