import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RequiredMcpStartupError } from "../runtime/canary-runtime";
import { runCodexCell } from "../runtime/codex-cell-runner";
import { ProcessControlError, type ProcessResult } from "../runtime/process";
import {
  HAPPY_STDOUT,
  cleanupRoots,
  fakeBroker,
  fixture,
  predicateFinalState,
  request,
  roots,
  sealedEvidence,
} from "./fixtures/codex-cell-runner-fixtures";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

afterEach(cleanupRoots);

describe("Codex cell runner", () => {
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
