// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPublicCatalog } from "../catalog";
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";
import { materializeFixtureRun } from "../fixtures/private";
import { parseBridgeOptions } from "../runtime/bridge-cli-options";
import { runBridge } from "../runtime/bridge-cli-execution";
import { defaultCodexCellDependencies } from "../runtime/codex-cell-defaults";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function preparedRequest(root: string) {
  const [task] = buildPublicCatalog();
  if (task === undefined) throw new Error("public catalog must contain a task");
  const fixtureRun = materializeFixtureRun({
    runRoot: join(root, "fixture-run"),
    canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    publicTasks: [task],
    heldOutTasks: [],
  });
  const [entry] = fixtureRun.publicIndex.tasks;
  if (entry === undefined) {
    throw new Error("public fixture index must contain the task");
  }
  return {
    task,
    fixtureRun,
    request: {
      schemaVersion: "1.0.0" as const,
      artifactType: "skillopt-bridge-request" as const,
      runId: "00000000-0000-4000-8000-000000000501",
      batchId: "bridge-exec-1",
      skill: "kibi-usage" as const,
      phase: "held-out" as const,
      candidateBody: "Use the Kibi MCP workflow.\n",
      taskIds: [task.id],
      publicClaim: {
        taskId: task.id,
        text: task.prompt,
        publicManifestHash: entry.manifestHash,
        workspaceHash: entry.workspaceHash,
      },
      sourceLockHash: "a".repeat(64),
    },
  };
}

function options(root: string, fixtureRunRoot: string) {
  return parseBridgeOptions([
    "--pipe",
    "--source-worktree",
    process.cwd(),
    "--artifact-root",
    join(root, "artifacts"),
    "--fixture-run-root",
    fixtureRunRoot,
    "--codex-executable",
    "/staged/codex",
    "--bwrap-executable",
    "/staged/bwrap",
  ]);
}

describe("runBridge remaining behavioral and infrastructure paths", () => {
  test("returns the fake result without launching a cell", async () => {
    const result = await runBridge(
      parseBridgeOptions(["--pipe", "--fake"]),
      {
        schemaVersion: "1.0.0",
        artifactType: "skillopt-bridge-request",
        runId: "00000000-0000-4000-8000-000000000502",
        batchId: "fake-1",
        skill: "kibi-usage",
        phase: "train",
        candidateBody: "body",
        taskIds: ["task-a"],
        publicClaim: {
          taskId: "task-a",
          text: "prompt",
          publicManifestHash: "a".repeat(64),
          workspaceHash: "b".repeat(64),
        },
        sourceLockHash: "c".repeat(64),
      },
    );
    expect(result.rows[0]).toMatchObject({
      id: "task-a",
      hard: 1,
      status: "completed",
    });
  });

  test("classifies behavioral misses, protocol gaps, and tool-sequence noise", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bridge-exec-"));
    roots.push(root);
    const { request, fixtureRun } = await preparedRequest(root);
    const artifactDirectory = join(root, "artifacts", "episodes", "episode-1");
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(join(artifactDirectory, "final-state.json"), "{}");

    const result = await runBridge(options(root, fixtureRun.roots.runRoot), request, {
      defaultCodexCellDependencies,
      runCodexCell: async () => ({
        receipt: {
          result: {
            status: "behavioral-failure",
            hardPass: false,
            score: 75,
            criticalFailures: [],
          },
          evidenceIndex: {
            events: [
              { event: "not-an-object" },
              { event: [] },
              { event: { type: "other" } },
              { event: { type: "item.completed", payload: null } },
              { event: { type: "item.completed", payload: [] } },
              {
                event: {
                  type: "item.completed",
                  payload: { item: null },
                },
              },
              {
                event: {
                  type: "item.completed",
                  payload: { item: { type: "message" } },
                },
              },
              {
                event: {
                  type: "item.completed",
                  payload: {
                    item: {
                      type: "mcp_tool_call",
                      tool: "kb_query",
                      arguments: "raw",
                      error: { message: "nope" },
                    },
                  },
                },
              },
              {
                event: {
                  type: "item.completed",
                  payload: {
                    item: {
                      type: "mcp_tool_call",
                      tool: "kb_status",
                      arguments: { includePassing: true },
                      error: null,
                    },
                  },
                },
              },
            ],
          },
        },
        artifactDirectory,
        receiptPath: join(artifactDirectory, "episode-receipt.json"),
      }),
    });

    expect(result.rows[0]).toMatchObject({
      hard: 0,
      status: "behavioral-failure",
      failureCategory: "protocol-incomplete",
    });
    expect(result.rows[0]?.toolSequence).toEqual([
      JSON.stringify({
        tool: "kb_query",
        arguments: "raw",
        outcome: "error",
      }),
      JSON.stringify({
        tool: "kb_status",
        arguments: { includePassing: true },
        outcome: "success",
      }),
    ]);
  });

  test("maps non-protocol behavioral failures and infrastructure statuses", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bridge-status-"));
    roots.push(root);
    const { request, fixtureRun } = await preparedRequest(root);
    const artifactDirectory = join(root, "artifacts", "episodes", "episode-2");
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(join(artifactDirectory, "final-state.json"), "{}");

    const behavioral = await runBridge(
      options(root, fixtureRun.roots.runRoot),
      request,
      {
        defaultCodexCellDependencies,
        runCodexCell: async () => ({
          receipt: {
            result: {
              status: "behavioral-failure",
              hardPass: false,
              score: 40,
              criticalFailures: [],
            },
          },
          artifactDirectory,
          receiptPath: join(artifactDirectory, "episode-receipt.json"),
        }),
      },
    );
    expect(behavioral.rows[0]).toMatchObject({
      status: "behavioral-failure",
      failureCategory: "behavioral-evaluation-miss",
      failureCategories: ["behavioral-evaluation-miss"],
    });

    await expect(
      runBridge(options(root, fixtureRun.roots.runRoot), request, {
        defaultCodexCellDependencies,
        runCodexCell: async () => ({
          receipt: {
            result: {
              status: "infrastructure-failure",
              hardPass: false,
              score: 0,
              criticalFailures: ["missing_mcp_evidence"],
            },
          },
          artifactDirectory,
          receiptPath: join(artifactDirectory, "episode-receipt.json"),
        }),
      }),
    ).rejects.toBeInstanceOf(EvaluationInfrastructureError);
  });

  test("throws when the final-state artifact is missing and wraps other errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bridge-missing-"));
    roots.push(root);
    const { request, fixtureRun } = await preparedRequest(root);
    const artifactDirectory = join(root, "artifacts", "episodes", "episode-3");
    await mkdir(artifactDirectory, { recursive: true });

    await expect(
      runBridge(options(root, fixtureRun.roots.runRoot), request, {
        defaultCodexCellDependencies,
        runCodexCell: async () => ({
          receipt: {
            result: {
              status: "completed",
              hardPass: true,
              score: 100,
              criticalFailures: [],
            },
          },
          artifactDirectory,
          receiptPath: join(artifactDirectory, "episode-receipt.json"),
        }),
      }),
    ).rejects.toBeInstanceOf(EvaluationInfrastructureError);

    await expect(
      runBridge(options(root, fixtureRun.roots.runRoot), request, {
        defaultCodexCellDependencies,
        runCodexCell: async () => {
          throw new Error("cell_launch_failed");
        },
      }),
    ).rejects.toThrow("bridge_execution_failed");

    await expect(
      runBridge(options(root, fixtureRun.roots.runRoot), request, {
        defaultCodexCellDependencies,
        runCodexCell: async () => {
          throw new EvaluationInfrastructureError({
            stage: "held-out",
            taskId: request.taskIds[0] ?? "task",
            variant: "skillopt",
            status: "runtime-staging-failure",
            criticalFailures: ["stage"],
            receiptPath: null,
          });
        },
      }),
    ).rejects.toBeInstanceOf(EvaluationInfrastructureError);
  });
});
