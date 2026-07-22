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
  await writeFile(join(codexHome, "auth.json"), "{}", { mode: 0o600 });
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
      paidModelCalls: 1,
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
});
