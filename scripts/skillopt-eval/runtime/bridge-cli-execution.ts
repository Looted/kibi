import { randomUUID } from "node:crypto";
import { relative } from "node:path";
import { bridgeFailure } from "./bridge-cli-options";
import type { parseBridgeOptions } from "./bridge-cli-options";
import { defaultCodexCellDependencies } from "./codex-cell-defaults";
import { type CodexCellOptions, runCodexCell } from "./codex-cell-runner";
import type { CodexCellDependencies } from "./codex-cell-types";
import type { BridgeRequest, BridgeResult } from "./file-bridge";
import { resolveTaskFixture } from "./task-fixture";

type BridgeCellCompletion = Readonly<{
  receipt: Readonly<{
    result: Readonly<{
      status:
        | "completed"
        | "behavioral-failure"
        | "infrastructure-failure"
        | "interrupted"
        | "budget-exhausted"
        | "evidence-conflict";
      hardPass: boolean;
      score: number;
      criticalFailures: readonly string[];
    }>;
  }>;
  artifactDirectory: string;
  receiptPath: string;
}>;

// implements REQ-skillopt-codex-optimization
type BridgeCliDependencies = Readonly<{
  runCodexCell: (
    options: CodexCellOptions,
    dependencies: CodexCellDependencies,
  ) => Promise<BridgeCellCompletion>;
  defaultCodexCellDependencies: (
    options: CodexCellOptions,
  ) => CodexCellDependencies;
}>;

function bridgeRow(
  taskId: string,
  artifactRoot: string,
  completed: BridgeCellCompletion,
) {
  const result = completed.receipt.result;
  const status: "completed" | "behavioral-failure" | "infrastructure-failure" =
    result.status === "completed"
      ? "completed"
      : result.status === "infrastructure-failure"
        ? "infrastructure-failure"
        : "behavioral-failure";
  return {
    id: taskId,
    hard: result.hardPass ? (1 as const) : (0 as const),
    soft: result.score / 100,
    status,
    failureCategory: result.criticalFailures[0] ?? null,
    conversationPath: relative(artifactRoot, completed.artifactDirectory),
    evidenceRefs: [relative(artifactRoot, completed.receiptPath)],
  };
}

function fakeResult(request: BridgeRequest): BridgeResult {
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-bridge-result",
    runId: request.runId,
    batchId: request.batchId,
    requestHash: "0".repeat(64),
    rows: request.taskIds.map((id) => ({
      id,
      hard: 1,
      soft: 1,
      status: "completed",
      failureCategory: null,
      conversationPath: `predictions/${id}/conversation.json`,
      evidenceRefs: [`episode/${id}/receipt.json`],
    })),
    checkpoint: { maxSteps: 1, completedSteps: 1, nextStep: 2 },
  };
}

async function realResult(
  options: ReturnType<typeof parseBridgeOptions>,
  request: BridgeRequest,
  dependencies: BridgeCliDependencies,
): Promise<BridgeResult> {
  const sourceWorktree = options.sourceWorktree ?? "";
  const artifactRoot = options.artifactRoot ?? "";
  const fixtureRunRoot = options.fixtureRunRoot ?? "";
  const rows = await Promise.all(
    request.taskIds.map(async (taskId) => {
      try {
        const fixture = await resolveTaskFixture({
          fixtureRunRoot,
          taskId,
          publicClaim: request.publicClaim,
        });
        const cellOptions: CodexCellOptions = {
          request: {
            schemaVersion: "1.0.0",
            artifactType: "episode-request",
            episodeId: randomUUID(),
            runId: request.runId,
            runLockHash: request.sourceLockHash,
            variant: "skillopt",
            skill: request.skill,
            taskId,
            attempt: 1,
            prompt: fixture.publicClaim.text,
            workspaceFixtureHash: fixture.workspaceHash,
          },
          fixtureRoot: fixture.workspaceRoot,
          sourceWorktree,
          artifactRoot,
          targetSkill: request.skill,
          candidate: { body: request.candidateBody },
          codexExecutable: options.codexExecutable,
          bwrapExecutable: options.bwrapExecutable,
          env: process.env,
          finalStateRequests: [
            { tool: "kb_query", args: { type: "fact" } },
            { tool: "kb_check", args: {} },
            { tool: "kb_status", args: {} },
          ],
          evaluatorManifest: fixture.evaluatorManifest,
          hiddenMarkers: options.hiddenMarkers,
          pricingHash: options.pricingHash,
          priceAmount: options.priceAmount,
          timeoutMs: options.timeoutMs,
        };
        const runtimeDependencies =
          dependencies.defaultCodexCellDependencies(cellOptions);
        const completed = await dependencies.runCodexCell(
          cellOptions,
          runtimeDependencies,
        );
        return bridgeRow(taskId, artifactRoot, completed);
      } catch (error) {
        throw bridgeFailure(error);
      }
    }),
  );
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-bridge-result",
    runId: request.runId,
    batchId: request.batchId,
    requestHash: "0".repeat(64),
    rows,
    checkpoint: {
      maxSteps: request.taskIds.length,
      completedSteps: request.taskIds.length,
      nextStep: request.taskIds.length + 1,
    },
  };
}

const defaultBridgeCliDependencies: BridgeCliDependencies = {
  runCodexCell,
  defaultCodexCellDependencies,
};

export function runBridge(
  options: ReturnType<typeof parseBridgeOptions>,
  request: BridgeRequest,
  dependencies = defaultBridgeCliDependencies,
): Promise<BridgeResult> {
  return options.fake
    ? Promise.resolve(fakeResult(request))
    : realResult(options, request, dependencies);
}
