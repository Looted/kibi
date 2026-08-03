import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  EvaluationInfrastructureError,
  assertCellInfrastructureHealthy,
} from "../evaluation-infrastructure";
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
    evidenceIndex?: Readonly<{
      events: readonly Readonly<{
        event: unknown;
      }>[];
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
  finalStateSummary: string,
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
    failureCategories: [...result.criticalFailures],
    toolSequence: (completed.receipt.evidenceIndex?.events ?? []).flatMap(
      ({ event }) => {
        if (typeof event !== "object" || event === null || Array.isArray(event))
          return [];
        const eventRecord = event as Record<string, unknown>;
        if (eventRecord.type !== "item.completed") return [];
        const payload = eventRecord.payload;
        if (
          typeof payload !== "object" ||
          payload === null ||
          Array.isArray(payload)
        )
          return [];
        const item = (payload as Record<string, unknown>).item;
        if (typeof item !== "object" || item === null || Array.isArray(item))
          return [];
        const itemRecord = item as Record<string, unknown>;
        if (
          itemRecord.type !== "mcp_tool_call" ||
          typeof itemRecord.tool !== "string"
        )
          return [];
        const args =
          typeof itemRecord.arguments === "object" &&
          itemRecord.arguments !== null &&
          !Array.isArray(itemRecord.arguments)
            ? Object.fromEntries(
                Object.entries(itemRecord.arguments).filter(
                  ([key]) => key !== "_diagnostic_telemetry",
                ),
              )
            : itemRecord.arguments;
        return [
          JSON.stringify({
            tool: itemRecord.tool,
            arguments: args,
            outcome: itemRecord.error === null ? "success" : "error",
          }),
        ];
      },
    ),
    finalStateSummary: finalStateSummary.slice(0, 20_000),
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
      failureCategories: [],
      toolSequence: [],
      finalStateSummary: "{}",
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
  const codexExecutable = options.codexExecutable ?? "";
  const bwrapExecutable = options.bwrapExecutable ?? "";
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
          codexExecutable,
          bwrapExecutable,
          env: process.env,
          finalStateRequests: [
            { tool: "kb_query", args: {} },
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
        assertCellInfrastructureHealthy(completed, {
          stage: request.phase === "train" ? "training" : request.phase,
          taskId,
          variant: "skillopt",
        });
        let finalStateSummary: string;
        try {
          finalStateSummary = await readFile(
            join(completed.artifactDirectory, "final-state.json"),
            "utf8",
          );
        } catch {
          throw new EvaluationInfrastructureError({
            stage: request.phase === "train" ? "training" : request.phase,
            taskId,
            variant: "skillopt",
            status: "infrastructure-failure",
            criticalFailures: ["missing_final_state_artifact"],
            receiptPath: completed.receiptPath,
          });
        }
        return bridgeRow(taskId, artifactRoot, completed, finalStateSummary);
      } catch (error) {
        if (error instanceof EvaluationInfrastructureError) throw error;
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
