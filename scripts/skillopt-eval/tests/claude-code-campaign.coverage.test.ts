import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  claudeCodeCampaignDependencies,
  runClaudeCodeCanary,
  runClaudeCodePreflight,
} from "../claude-code-campaign";
import * as canaryRuntime from "../runtime/canary-runtime";
import { RequiredMcpStartupError } from "../runtime/canary-runtime";
import { runClaudeSkillOptStep } from "../runtime/claude-optimizer";
import * as brokerStage from "../runtime/mcp-broker-stage";
import * as processRunner from "../runtime/process";

const roots: string[] = [];
const restores: Array<() => void> = [];
const savedEnv = { ...process.env };

const PRICING = JSON.stringify({
  "claude-sonnet-5-5": null,
  "claude-opus-5-5": {
    inputPerMillionTokens: 4,
    cachedInputPerMillionTokens: 0.2,
    outputPerMillionTokens: 20,
  },
});

function modelEnv(): NodeJS.ProcessEnv {
  return {
    KIBI_SKILLOPT_TARGET_MODEL: "claude-sonnet-5-5",
    KIBI_SKILLOPT_OPTIMIZER_MODEL: "claude-opus-5-5",
    KIBI_SKILLOPT_MODEL_PRICING: PRICING,
  };
}

beforeEach(() => {
  Object.assign(process.env, modelEnv());
});

afterEach(async () => {
  while (restores.length > 0) restores.pop()?.();
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

async function temporaryRoot(): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "skillopt-claude-campaign-")),
  );
  roots.push(root);
  return root;
}

async function fakeClaude(root: string, body: string): Promise<string> {
  const claude = join(root, "claude");
  await writeFile(claude, `#!/bin/sh\n${body}\n`);
  await chmod(claude, 0o755);
  return claude;
}

async function cleanRepo(root: string): Promise<string> {
  const repo = join(root, "source");
  await mkdir(repo);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" });
  git("init", "-q");
  await writeFile(join(repo, "file.txt"), "x\n");
  git("add", ".");
  git(
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@example.test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "init",
  );
  return repo;
}

function stubBroker(probe: () => Promise<unknown>) {
  const stage = spyOn(brokerStage, "stageKibiMcpBroker").mockImplementation(
    (async () => ({ command: "/py", args: ["/bridge.py"], cwd: "/" })) as never,
  );
  const probed = spyOn(canaryRuntime, "probeRequiredMcp").mockImplementation(
    probe as never,
  );
  restores.push(
    () => stage.mockRestore(),
    () => probed.mockRestore(),
  );
  return { stage, probed };
}

describe("Claude Code preflight", () => {
  test("passes with a clean source, a working claude and a brokered MCP", async () => {
    const root = await temporaryRoot();
    const source = await cleanRepo(root);
    const claude = await fakeClaude(root, "echo 2.1.0");
    const { probed } = stubBroker(async () => ({ tools: [] }));
    const artifactRoot = join(root, "artifacts");
    const receipt = await runClaudeCodePreflight({
      runId: "run-1",
      sourceWorktree: source,
      artifactRoot,
      env: {
        ...modelEnv(),
        PATH: process.env.PATH,
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
      },
    });
    expect(receipt).toStrictEqual({
      verdict: "pass",
      runId: "run-1",
      targetModel: "claude-sonnet-5-5",
      optimizerModel: "claude-opus-5-5",
      skilloptCommit: "b860a5cf88ce75e2bd02ca981ac21fb28cffba83",
      codexVersion: "claude-code 2.1.0",
      authMode: null,
      bwrap: false,
      sourceClean: true,
      configValid: true,
      paidModelCalls: 0,
    });
    const launch = probed.mock.calls[0]?.[0] as { env: NodeJS.ProcessEnv };
    expect(launch.env.CLAUDE_CONFIG_DIR).toBeString();
    expect(await readdir(artifactRoot)).toStrictEqual([]);
  });

  test("a dirty source is refused before anything is staged", async () => {
    const root = await temporaryRoot();
    const source = await cleanRepo(root);
    await writeFile(join(source, "dirty.txt"), "x\n");
    const receipt = await runClaudeCodePreflight({
      runId: "run-2",
      sourceWorktree: source,
      artifactRoot: join(root, "artifacts"),
      env: { PATH: process.env.PATH },
    });
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "source_not_clean",
      sourceClean: false,
      codexVersion: null,
    });
  });

  test("names a failing claude, a missing executable, bad pricing or MCP startup", async () => {
    const root = await temporaryRoot();
    const source = await cleanRepo(root);
    const failing = await fakeClaude(root, "exit 1");
    stubBroker(async () => {
      throw new RequiredMcpStartupError("no tools");
    });
    const preflight = (env: NodeJS.ProcessEnv) =>
      runClaudeCodePreflight({
        runId: "run-3",
        sourceWorktree: source,
        artifactRoot: join(root, "artifacts"),
        env: { PATH: process.env.PATH, ...env },
      });
    expect(
      await preflight({
        ...modelEnv(),
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: failing,
      }),
    ).toMatchObject({ verdict: "no-go", reason: "missing_host:claude" });
    expect(
      await preflight({
        ...modelEnv(),
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: join(root, "absent"),
      }),
    ).toMatchObject({
      verdict: "no-go",
      reason: "missing_isolation:claude_executable",
    });
    expect(
      (await preflight({ ...modelEnv(), KIBI_SKILLOPT_MODEL_PRICING: "{}" }))
        .reason,
    ).toStartWith("missing pricing for model");
    const working = await fakeClaude(root, "echo 2.1.0");
    expect(
      await preflight({
        ...modelEnv(),
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: working,
      }),
    ).toMatchObject({
      verdict: "no-go",
      reason: "required_mcp_startup:no tools",
      codexVersion: "claude-code 2.1.0",
      configValid: false,
    });
  });

  test("an unexpected failure propagates after the workspace is cleaned", async () => {
    const root = await temporaryRoot();
    const source = await cleanRepo(root);
    const claude = await fakeClaude(root, "echo 2.1.0");
    stubBroker(async () => {
      throw new Error("boom");
    });
    const artifactRoot = join(root, "artifacts");
    await expect(
      runClaudeCodePreflight({
        runId: "run-4",
        sourceWorktree: source,
        artifactRoot,
        env: {
          ...modelEnv(),
          PATH: process.env.PATH,
          KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
        },
      }),
    ).rejects.toThrow("boom");
    expect(await readdir(artifactRoot)).toStrictEqual([]);
  });
});

describe("Claude Code capability canary", () => {
  function canaryStream(model: string): string {
    return `${[
      {
        type: "result",
        subtype: "success",
        is_error: false,
        total_cost_usd: 0.02,
        structured_output: { completed: true, answer: "canary" },
        modelUsage: { [model]: {} },
      },
    ]
      .map((event) => JSON.stringify(event))
      .join("\n")}\n`;
  }

  async function canaryWith(outputs: string[]) {
    const root = await temporaryRoot();
    const claude = await fakeClaude(root, "exit 0");
    let call = 0;
    const runner = spyOn(processRunner, "runBoundedProcess").mockImplementation(
      (async () => ({
        exitCode: 0,
        stdout: outputs[Math.min(call++, outputs.length - 1)] ?? "",
        stderr: "",
      })) as never,
    );
    restores.push(() => runner.mockRestore());
    return runClaudeCodeCanary({
      runId: "canary-run",
      artifactRoot: join(root, "artifacts"),
      env: {
        ...modelEnv(),
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
        CLAUDE_CONFIG_DIR: join(root, "claude-config"),
      },
    });
  }

  test("passes when both roles answer with their pinned models", async () => {
    const receipt = await canaryWith([
      canaryStream("claude-sonnet-5-5"),
      canaryStream("claude-opus-5-5"),
    ]);
    expect(receipt.verdict).toBe("pass");
    expect(receipt.paidModelCalls).toBe(2);
    expect(receipt.modelInvocationAttempts).toBe(2);
    expect(receipt.events).toStrictEqual([
      {
        type: "claude-code.canary",
        role: "target",
        passed: true,
        hostReportedCostUsd: 0.02,
      },
      {
        type: "claude-code.canary",
        role: "optimizer",
        passed: true,
        hostReportedCostUsd: 0.02,
      },
    ]);
    expect(receipt.modelRuns.map((entry) => entry.model)).toStrictEqual([
      "claude-sonnet-5-5",
      "claude-opus-5-5",
    ]);
    expect("reason" in receipt).toBe(false);
  });

  test("stops at the first failing role and reports why", async () => {
    const receipt = await canaryWith([canaryStream("claude-haiku-5-5")]);
    expect(receipt).toMatchObject({
      verdict: "no-go",
      paidModelCalls: 1,
      phase: "model",
      reason: "model_not_observed",
    });
    expect(receipt.events).toStrictEqual([
      {
        type: "claude-code.canary",
        role: "target",
        passed: false,
        hostReportedCostUsd: 0.02,
        reason: "model_not_observed",
      },
    ]);
  });

  test("uses the process environment by default", async () => {
    const root = await temporaryRoot();
    process.env.KIBI_SKILLOPT_CLAUDE_EXECUTABLE = join(root, "absent");
    await expect(
      runClaudeCodeCanary({
        runId: "canary-env",
        artifactRoot: join(root, "artifacts"),
      }),
    ).rejects.toThrow("missing_isolation:claude_executable");
  });
});

describe("Claude Code campaign dependencies", () => {
  test("route every command through the Claude host", async () => {
    const root = await temporaryRoot();
    const claude = await fakeClaude(root, "exit 0");
    const dependencies = claudeCodeCampaignDependencies({
      KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
    });
    expect(dependencies.runPreflight).toBe(runClaudeCodePreflight);
    expect(dependencies.runCanary).toBe(runClaudeCodeCanary);
    expect(dependencies.runOptimizerStep).toBe(runClaudeSkillOptStep);
    expect(dependencies.optimizerModelSource).toBe("runClaudeSkillOptStep");
    const lease = await dependencies.createRuntimeLease?.({
      artifactRoot: join(root, "artifacts"),
    } as never);
    expect(lease?.codexExecutable).toBe(claude);
    await lease?.cleanup();
    expect(claudeCodeCampaignDependencies().runPreflight).toBe(
      runClaudeCodePreflight,
    );
  });
});
