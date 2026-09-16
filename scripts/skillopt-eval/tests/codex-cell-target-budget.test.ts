import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashWorkspace } from "../fixtures/workspace";
import { runCodexCell } from "../runtime/codex-cell-runner";
import {
  initializeTargetEpisodeBudget,
  readTargetEpisodeBudget,
  reserveTargetEpisode,
} from "../target-episode-budget";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

test("rejects an exhausted target before creating a workspace or invoking dependencies", async () => {
  const budgetRoot = await mkdtemp(join(tmpdir(), "skillopt-budget-runner-"));
  roots.push(budgetRoot);
  const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-budget-cell-"));
  roots.push(artifactRoot);
  const env = await initializeTargetEpisodeBudget(budgetRoot, 1);
  await reserveTargetEpisode(env, process.cwd());

  let dependencyCalls = 0;
  await expect(
    runCodexCell(
      {
        request: {
          schemaVersion: "1.0.0",
          artifactType: "episode-request",
          episodeId: "00000000-0000-4000-8000-000000000011",
          runId: "00000000-0000-4000-8000-000000000012",
          runLockHash: "d".repeat(64),
          variant: "baseline",
          skill: "kibi-usage",
          taskId: "budget-task",
          attempt: 1,
          prompt: "unused",
          workspaceFixtureHash: "a".repeat(64),
        },
        fixtureRoot: "/not-created",
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: {
          ...env,
          CODEX_HOME: join(artifactRoot, "codex-home"),
        },
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1_000,
      },
      {
        prepareLogin: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_prepare_login");
        },
        stageBroker: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_stage_broker");
        },
        probeMcp: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_probe_mcp");
        },
        run: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_run_codex");
        },
        finalState: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_read_final_state");
        },
        diagnosticReceipt: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_read_diagnostics");
        },
        evaluateSealedEvidence: async () => {
          dependencyCalls += 1;
          throw new Error("must_not_score");
        },
        clock: () => new Date("2026-09-09T00:00:00Z"),
      },
    ),
  ).rejects.toThrow("target_episode_budget_exhausted");
  expect(dependencyCalls).toBe(0);
  expect(await readTargetEpisodeBudget(env, process.cwd())).toMatchObject({
    reservedCount: 1,
    remainingCount: 0,
  });
});

test("keeps a reservation when cell setup throws after the reservation", async () => {
  const budgetRoot = await mkdtemp(join(tmpdir(), "skillopt-budget-throw-"));
  roots.push(budgetRoot);
  const artifactRoot = await mkdtemp(
    join(tmpdir(), "skillopt-budget-throw-cell-"),
  );
  roots.push(artifactRoot);
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), "skillopt-budget-throw-fixture-"),
  );
  roots.push(fixtureRoot);
  await Bun.write(join(fixtureRoot, "package.json"), '{"private":true}\n');
  const env = await initializeTargetEpisodeBudget(budgetRoot, 1);

  await expect(
    runCodexCell(
      {
        request: {
          schemaVersion: "1.0.0",
          artifactType: "episode-request",
          episodeId: "00000000-0000-4000-8000-000000000013",
          runId: "00000000-0000-4000-8000-000000000014",
          runLockHash: "d".repeat(64),
          variant: "baseline",
          skill: "kibi-usage",
          taskId: "budget-throw-task",
          attempt: 1,
          prompt: "unused",
          workspaceFixtureHash: hashWorkspace(fixtureRoot),
        },
        fixtureRoot,
        sourceWorktree: process.cwd(),
        artifactRoot,
        targetSkill: "kibi-usage",
        codexExecutable: process.execPath,
        bwrapExecutable: "/usr/bin/bwrap",
        env: {
          ...env,
          CODEX_HOME: join(artifactRoot, "codex-home"),
        },
        finalStateRequests: [{ tool: "kb_status", args: {} }],
        evaluatorManifest: evaluatorManifest("predicate"),
        hiddenMarkers: [],
        pricingHash: "e".repeat(64),
        priceAmount: 0,
        timeoutMs: 1_000,
      },
      {
        prepareLogin: async () => {
          throw new Error("setup_failed_after_reservation");
        },
        stageBroker: async () => {
          throw new Error("must_not_stage_broker");
        },
        probeMcp: async () => ({ toolNames: [] }),
        run: async () => ({
          argv: [],
          stdout: "",
          stderr: "",
          exitCode: 0,
          signal: null,
        }),
        finalState: async () => "",
        diagnosticReceipt: async () => "",
        evaluateSealedEvidence: async () => {
          throw new Error("must_not_score");
        },
        clock: () => new Date("2026-09-09T00:00:00Z"),
      },
    ),
  ).rejects.toThrow("setup_failed_after_reservation");
  expect(await readTargetEpisodeBudget(env, process.cwd())).toMatchObject({
    reservedCount: 1,
    remainingCount: 0,
  });
});
