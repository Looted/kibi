import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import {
  RequiredMcpStartupError,
  RuntimePrerequisiteError,
} from "../runtime/canary-runtime";
import type { ProcessResult } from "../runtime/process";
import { runCapabilityCanary } from "../runtime/workspace";

const roots: string[] = [];
setDefaultTimeout(15_000);
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

const passingPrerequisites = {
  probeSandbox: async () => {},
  probeRequiredMcp: async () => ({
    toolNames: ["kb_search", "kb_query", "kb_check"],
  }),
} as const;

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
  test("fails before paid calls when required MCP startup fails", async () => {
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
        run: fakeRunner(completedProbeEvents),
        probeSandbox: passingPrerequisites.probeSandbox,
        probeRequiredMcp: async () => {
          throw new RequiredMcpStartupError("connection_closed");
        },
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "required_mcp_startup:connection_closed",
      paidModelCalls: 0,
    });
    expect(receipt.events).toEqual([]);
  });

  test("fails before paid calls when no usable bwrap exists", async () => {
    // Given
    const fixture = await authEnvironment();

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "missing-bwrap",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        run: fakeRunner(completedProbeEvents),
        probeSandbox: async () => {
          throw new RuntimePrerequisiteError("missing_bwrap");
        },
        probeRequiredMcp: passingPrerequisites.probeRequiredMcp,
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "missing_isolation:bwrap",
      paidModelCalls: 0,
    });
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
      { run: fakeRunner('{"type":'), ...passingPrerequisites },
    );
    const misleading = await runCapabilityCanary(
      {
        runId: "misleading-success",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        run: fakeRunner('{"type":"turn.started"}\n'),
        ...passingPrerequisites,
      },
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
      { run: fakeRunner("", 17), ...passingPrerequisites },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "codex_exit:17:no_stderr",
    });
  });

  test("classifies Codex MCP handshake failure before paid calls", async () => {
    // Given
    const fixture = await authEnvironment();
    const mcpFailure =
      "required MCP servers failed to initialize: kibi: handshaking with MCP server failed: connection closed: initialize response";

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "codex-required-mcp-failure",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        ...passingPrerequisites,
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
          return {
            argv,
            stdout: "",
            stderr: mcpFailure,
            exitCode: 1,
            signal: null,
          };
        },
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "required_mcp_startup:connection_closed",
      paidModelCalls: 0,
      events: [],
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
      { run: fakeRunner(forgedEvents), ...passingPrerequisites },
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
        ...passingPrerequisites,
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

  test("places default isolation workspaces outside the source worktree", async () => {
    // Given
    const fixture = await authEnvironment();
    const sourceWorktree = process.cwd();
    const modelCwds: string[] = [];

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "external-default-workspace",
        sourceWorktree,
        env: fixture.env,
      },
      {
        ...passingPrerequisites,
        run: async (argv, cwd) => {
          if (argv.join(" ") === "codex login status") {
            return {
              argv,
              stdout: "",
              stderr: "Logged in using ChatGPT\n",
              exitCode: 0,
              signal: null,
            };
          }
          modelCwds.push(cwd);
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
    expect(receipt.verdict).toBe("pass");
    expect(modelCwds).toHaveLength(2);
    for (const cwd of modelCwds) {
      const sourceRelative = relative(sourceWorktree, cwd);
      expect(
        sourceRelative === "" ||
          (!sourceRelative.startsWith("..") && !isAbsolute(sourceRelative)),
      ).toBe(false);
    }
  });

  test("probes every formerly allowlisted source subtree", async () => {
    // Given
    const fixture = await authEnvironment();
    const sourceWorktree = process.cwd();
    const probeScripts: string[] = [];

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "source-file-denial",
        sourceWorktree,
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        ...passingPrerequisites,
        run: async (argv, cwd) => {
          if (argv.join(" ") === "codex login status") {
            return {
              argv,
              stdout: "",
              stderr: "Logged in using ChatGPT\n",
              exitCode: 0,
              signal: null,
            };
          }
          probeScripts.push(
            await readFile(join(cwd, ".runtime/canary-probe"), "utf8"),
          );
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
    expect(receipt.verdict).toBe("pass");
    expect(probeScripts).toHaveLength(2);
    const deniedRepresentatives = [
      "packages/mcp/dist/server.js",
      "packages/cli/dist/cli.js",
      "packages/core/src/kb.pl",
      "node_modules/typescript/package.json",
      ".kb/config.json",
    ].map((path) => join(sourceWorktree, path));
    for (const script of probeScripts) {
      for (const deniedPath of deniedRepresentatives) {
        expect(script).toContain(JSON.stringify(deniedPath));
      }
    }
  });

  test("runs the authoritative source probe in the production profile before model calls", async () => {
    // Given
    const fixture = await authEnvironment();
    let productionProbeCalls = 0;

    // When
    const receipt = await runCapabilityCanary(
      {
        runId: "production-source-probe",
        sourceWorktree: process.cwd(),
        artifactRoot: fixture.artifactRoot,
        env: fixture.env,
      },
      {
        run: fakeRunner(completedProbeEvents),
        probeRequiredMcp: passingPrerequisites.probeRequiredMcp,
        probeSandbox: async (options) => {
          if ("probe" in options) productionProbeCalls += 1;
        },
      },
    );

    // Then
    expect(receipt.verdict).toBe("pass");
    expect(productionProbeCalls).toBe(2);
  });
});
