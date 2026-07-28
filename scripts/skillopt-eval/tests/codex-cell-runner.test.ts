import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EpisodeRequest } from "../contracts/episode";
import { hashWorkspace } from "../fixtures/workspace";
import { RequiredMcpStartupError } from "../runtime/canary-runtime";
import { runCodexCell } from "../runtime/codex-cell-runner";
import type { IsolationWorkspace } from "../runtime/isolation-workspace";
import type { StagedBrokerLaunch } from "../runtime/mcp-broker-stage";
import { ProcessControlError, type ProcessResult } from "../runtime/process";
import type { CellReceipt } from "../scoring/cell";
import {
  evaluatorEvidence,
  evaluatorManifest,
  predicateSnapshot,
} from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
const SCORE: CellReceipt = {
  outcome: "pass",
  terminalCategory: null,
  score: 100,
  soft: 1,
  hard: 1,
  retryable: false,
  adoptionEligible: true,
  components: { finalState: 60, protocol: 25, isolation: 15 },
  criticalFailures: [],
  conflictKeys: [],
};
const HAPPY_STDOUT = [
  JSON.stringify({ type: "thread.started", thread_id: "thread-fake" }),
  JSON.stringify({
    type: "turn.completed",
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
  }),
].join("\n");

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture(): Promise<Readonly<{ root: string; hash: string }>> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-cell-fixture-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), '{"private":true}\n');
  await mkdir(join(root, ".kb"), { recursive: true });
  await writeFile(join(root, ".kb/sentinel"), "private\n");
  return { root, hash: hashWorkspace(root) };
}

function request(workspaceFixtureHash: string): EpisodeRequest {
  return {
    schemaVersion: "1.0.0",
    artifactType: "episode-request",
    episodeId: "00000000-0000-4000-8000-000000000011",
    runId: "00000000-0000-4000-8000-000000000012",
    runLockHash: "d".repeat(64),
    variant: "baseline",
    skill: "kibi-usage",
    taskId: "fake-task",
    attempt: 1,
    prompt: "Run the fixture task.",
    workspaceFixtureHash,
  };
}

function fakeBroker(workspace: IsolationWorkspace): StagedBrokerLaunch {
  return {
    command: process.execPath,
    args: ["fake-broker.js"],
    cwd: workspace.target,
    bundlePath: join(workspace.privateEvidence, "fake-broker.js"),
    tracePath: join(workspace.privateEvidence, "broker-trace.jsonl"),
    downstream: {
      command: process.execPath,
      args: ["fake-mcp.js"],
      cwd: workspace.target,
    },
  };
}

function predicateFinalState(): string {
  const snapshot = predicateSnapshot();
  return JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    requests: [
      {
        tool: "kb_query",
        args: { type: "fact" },
        result: snapshot,
        resultHash: new Bun.CryptoHasher("sha256")
          .update(JSON.stringify(snapshot))
          .digest("hex"),
      },
    ],
  });
}

function sealedEvidence(finalState: string) {
  const evidence = evaluatorEvidence(finalState);
  const { snapshot: _snapshot, ...sealedFinalState } = evidence.finalState;
  return { ...evidence, finalState: sealedFinalState };
}

describe("Codex cell runner", () => {
  test("Given a caller-supplied score When a cell starts Then score injection is rejected before execution", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-score-injection-"),
    );
    roots.push(artifactRoot);
    const options = {
      request: request(publicFixture.hash),
      fixtureRoot: publicFixture.root,
      sourceWorktree: process.cwd(),
      artifactRoot,
      targetSkill: "kibi-usage" as const,
      codexExecutable: process.execPath,
      bwrapExecutable: "/usr/bin/bwrap",
      env: process.env,
      finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
      score: SCORE,
      evaluatorManifest: evaluatorManifest("predicate"),
      hiddenMarkers: [],
      pricingHash: "e".repeat(64),
      priceAmount: 0,
      timeoutMs: 1_000,
    };

    // When / Then
    const attempt = runCodexCell(options, {
      prepareLogin: async ({ privateCodexHome }) => ({
        mode: "file",
        env: { CODEX_HOME: privateCodexHome },
        realCodexHome: "/private/real-codex",
      }),
      stageBroker: async (workspace) => fakeBroker(workspace),
      probeMcp: async () => ({ toolNames: ["kb_status"] }),
      run: async () => ({
        argv: [],
        stdout: HAPPY_STDOUT,
        stderr: "",
        exitCode: 0,
        signal: null,
      }),
      finalState: async () => "",
      diagnosticReceipt: async () => "",
      evaluateSealedEvidence: async () => {
        throw new Error("score injection must fail before scoring");
      },
      clock: () => new Date("2026-07-23T11:00:00Z"),
    });
    await attempt.then(
      () => {
        throw new Error("caller score injection must reject");
      },
      (error) => {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toBe("caller_score_injection");
      },
    );
  });

  test("Given fake runtime evidence When one target episode runs Then it is ephemeral, sealed, durable, and cleaned", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-artifacts-"),
    );
    roots.push(artifactRoot);
    let ephemeralRoot = "";
    let observedArgv: readonly string[] = [];
    let observedConfig = "";

    // When
    const completed = await runCodexCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: process.env,
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1_000,
      },
      {
        prepareLogin: async ({ privateCodexHome }) => ({
          mode: "file",
          env: { CODEX_HOME: privateCodexHome },
          realCodexHome: "/private/real-codex",
        }),
        stageBroker: async (workspace) => {
          ephemeralRoot = workspace.root;
          const broker = fakeBroker(workspace);
          await writeFile(broker.tracePath, '{"kind":"tools/call"}\n');
          return broker;
        },
        probeMcp: async () => ({ toolNames: ["kb_status"] }),
        run: async (argv, cwd, _env, _timeout, stdin) => {
          observedArgv = argv;
          observedConfig = await readFile(
            join(ephemeralRoot, "codex-home/config.toml"),
            "utf8",
          );
          expect(cwd).toContain("/workspace");
          expect(stdin).toBe("Run the fixture task.");
          return {
            argv,
            stdout: HAPPY_STDOUT,
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        },
        finalState: async () => predicateFinalState(),
        diagnosticReceipt: async () => '{"tool":"kb_status"}\n',
        evaluateSealedEvidence: async ({ finalState }) =>
          sealedEvidence(finalState),
        clock: (() => {
          const values = [
            new Date("2026-07-23T11:00:00Z"),
            new Date("2026-07-23T11:00:01Z"),
          ];
          return () => values.shift() ?? new Date("2026-07-23T11:00:01Z");
        })(),
      },
    );

    // Then
    expect(completed.receipt.result.status).toBe("completed");
    expect(observedArgv).toContain("--ephemeral");
    expect(observedArgv).toContain("--json");
    expect(observedConfig).toContain('approval_policy = "never"');
    expect(observedConfig).toContain("enabled = false");
    expect(observedConfig).toContain('".kb" = "deny"');
    expect(observedConfig).toContain("required = true");
    expect(existsSync(ephemeralRoot)).toBe(false);
    expect(existsSync(completed.artifactDirectory)).toBe(true);
    expect(JSON.parse(await readFile(completed.receiptPath, "utf8"))).toEqual(
      completed.receipt,
    );
  });

  test("Given required MCP startup failure When the episode is attempted Then no host call occurs and cleanup is bounded", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-mcp-fail-"),
    );
    roots.push(artifactRoot);
    let ephemeralRoot = "";
    let hostCalls = 0;

    // When
    const completed = await runCodexCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: process.env,
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1_000,
      },
      {
        prepareLogin: async ({ privateCodexHome }) => ({
          mode: "file",
          env: { CODEX_HOME: privateCodexHome },
          realCodexHome: "/private/real-codex",
        }),
        stageBroker: async (workspace) => {
          ephemeralRoot = workspace.root;
          return fakeBroker(workspace);
        },
        probeMcp: async () => {
          throw new RequiredMcpStartupError("missing_tools");
        },
        run: async () => {
          hostCalls += 1;
          throw new TypeError("host_must_not_run");
        },
        finalState: async () => "",
        diagnosticReceipt: async () => "",
        evaluateSealedEvidence: async ({ finalState }) =>
          sealedEvidence(finalState),
        clock: () => new Date("2026-07-23T11:00:00Z"),
      },
    );

    // Then
    expect(hostCalls).toBe(0);
    expect(completed.receipt.result.status).toBe("infrastructure-failure");
    expect(completed.receipt.result.criticalFailures).toContain(
      "missing_mcp_evidence",
    );
    expect(existsSync(ephemeralRoot)).toBe(false);
  });

  test("Given a bounded process timeout When the episode terminates Then partial JSONL is replayed and cleanup still runs", async () => {
    // Given
    const publicFixture = await fixture();
    const artifactRoot = await mkdtemp(
      join(tmpdir(), "skillopt-cell-timeout-"),
    );
    roots.push(artifactRoot);
    let ephemeralRoot = "";

    // When
    const completed = await runCodexCell(
      {
        request: request(publicFixture.hash),
        fixtureRoot: publicFixture.root,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: process.env,
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1,
      },
      {
        prepareLogin: async ({ privateCodexHome }) => ({
          mode: "file",
          env: { CODEX_HOME: privateCodexHome },
          realCodexHome: "/private/real-codex",
        }),
        stageBroker: async (workspace) => {
          ephemeralRoot = workspace.root;
          const broker = fakeBroker(workspace);
          await writeFile(broker.tracePath, '{"kind":"tools/call"}\n');
          return broker;
        },
        probeMcp: async () => ({ toolNames: ["kb_status"] }),
        run: async (argv): Promise<ProcessResult> => {
          throw new ProcessControlError("timeout", {
            argv,
            stdout: JSON.stringify({ type: "thread.started" }),
            stderr: "",
            exitCode: -1,
            signal: "SIGTERM",
          });
        },
        finalState: async () => predicateFinalState(),
        diagnosticReceipt: async () => '{"tool":"kb_status"}\n',
        evaluateSealedEvidence: async ({ finalState }) =>
          sealedEvidence(finalState),
        clock: () => new Date("2026-07-23T11:00:00Z"),
      },
    );

    // Then
    expect(completed.receipt.result.status).toBe("behavioral-failure");
    expect(completed.receipt.result.criticalFailures).toContain("timeout");
    expect(existsSync(ephemeralRoot)).toBe(false);
  });
});
