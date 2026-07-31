import { afterEach, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCodexCell } from "../runtime/codex-cell-runner";
import {
  HAPPY_STDOUT,
  SCORE,
  cleanupRoots,
  fakeBroker,
  fixture,
  request,
  roots,
} from "./fixtures/codex-cell-runner-fixtures";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

afterEach(cleanupRoots);
test("Given a caller-supplied score When a cell starts Then score injection is rejected before execution", async () => {
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
  await expect(attempt).rejects.toThrow("caller_score_injection");
});
