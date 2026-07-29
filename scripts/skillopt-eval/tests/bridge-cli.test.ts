import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bridgeMain } from "../bridge-cli";
import { defaultCodexCellDependencies } from "../runtime/codex-cell-defaults";
import { readBridgeResult, writeBridgeRequest } from "../runtime/file-bridge";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("bridge CLI", () => {
  test("Given a real bridge request When bridgeMain executes Then it routes the task through runCodexCell with default dependencies", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-bridge-cli-"));
    roots.push(root);
    const requestPath = join(root, "request.json");
    const resultPath = join(root, "result.json");
    const evaluatorPath = join(root, "evaluator.json");
    const request = {
      schemaVersion: "1.0.0" as const,
      artifactType: "skillopt-bridge-request" as const,
      runId: "00000000-0000-4000-8000-000000000021",
      batchId: "bridge-real-1",
      skill: "kibi-usage" as const,
      phase: "train" as const,
      candidateBody: "Use the Kibi MCP workflow.\n",
      taskIds: ["kibi-usage-fact-predicate-modeling-held-out-3"],
      sourceLockHash: "a".repeat(64),
    };
    await writeBridgeRequest(requestPath, request);
    await writeFile(
      evaluatorPath,
      JSON.stringify(evaluatorManifest("predicate")),
    );
    let defaultDependenciesCalled = false;
    let defaultDependenciesPassed = false;
    let runCodexCellCalled = false;
    let defaultDependencies: ReturnType<
      typeof defaultCodexCellDependencies
    > | null = null;
    const dependencies: NonNullable<Parameters<typeof bridgeMain>[1]> = {
      defaultCodexCellDependencies: (options) => {
        defaultDependenciesCalled = true;
        defaultDependencies = defaultCodexCellDependencies(options);
        return defaultDependencies;
      },
      runCodexCell: async (options, passedDependencies) => {
        runCodexCellCalled = true;
        if (defaultDependencies !== null) {
          defaultDependenciesPassed =
            passedDependencies === defaultDependencies;
        }
        expect(options.sourceWorktree).toBe(process.cwd());
        expect(options.artifactRoot).toBe(join(root, "artifacts"));
        expect(options.fixtureRoot).toBe(join(root, "fixture"));
        expect(options.targetSkill).toBe("kibi-usage");
        expect(options.candidate).toEqual({ body: request.candidateBody });
        expect(options.finalStateRequests.map(({ tool }) => tool)).toEqual([
          "kb_query",
          "kb_check",
          "kb_status",
        ]);
        return {
          receipt: {
            result: {
              status: "completed",
              hardPass: true,
              score: 100,
              criticalFailures: [],
            },
          },
          artifactDirectory: join(root, "artifacts", "episodes", "episode-1"),
          receiptPath: join(
            root,
            "artifacts",
            "episodes",
            "episode-1",
            "episode-receipt.json",
          ),
        };
      },
    };

    // When
    const exitCode = await bridgeMain(
      [
        "--request",
        requestPath,
        "--result",
        resultPath,
        "--source-worktree",
        process.cwd(),
        "--artifact-root",
        join(root, "artifacts"),
        "--fixture-root",
        join(root, "fixture"),
        "--evaluator-manifest",
        evaluatorPath,
      ],
      dependencies,
    );

    // Then
    expect(exitCode).toBe(0);
    expect(defaultDependenciesCalled).toBe(true);
    expect(defaultDependenciesPassed).toBe(true);
    expect(runCodexCellCalled).toBe(true);
    expect((await readBridgeResult(resultPath, request)).rows).toEqual([
      {
        id: "kibi-usage-fact-predicate-modeling-held-out-3",
        hard: 1,
        soft: 1,
        status: "completed",
        failureCategory: null,
        conversationPath: "episodes/episode-1",
        evidenceRefs: ["episodes/episode-1/episode-receipt.json"],
      },
    ]);
  });

  test("Given a task request and evaluator manifest for different task IDs When bridgeMain executes Then no cell is launched", async () => {
    // Given
    const root = await mkdtemp(
      join(tmpdir(), "skillopt-bridge-manifest-mismatch-"),
    );
    roots.push(root);
    const requestPath = join(root, "request.json");
    const resultPath = join(root, "result.json");
    const evaluatorPath = join(root, "evaluator.json");
    await writeBridgeRequest(requestPath, {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-bridge-request",
      runId: "00000000-0000-4000-8000-000000000022",
      batchId: "bridge-manifest-mismatch",
      skill: "kibi-usage",
      phase: "train",
      candidateBody: "Use the Kibi MCP workflow.\n",
      taskIds: ["wrong-task"],
      sourceLockHash: "a".repeat(64),
    });
    await writeFile(
      evaluatorPath,
      JSON.stringify(evaluatorManifest("predicate")),
    );
    let cellLaunches = 0;

    // When
    const attempt = bridgeMain(
      [
        "--request",
        requestPath,
        "--result",
        resultPath,
        "--source-worktree",
        process.cwd(),
        "--artifact-root",
        join(root, "artifacts"),
        "--fixture-root",
        join(root, "fixture"),
        "--evaluator-manifest",
        evaluatorPath,
      ],
      {
        defaultCodexCellDependencies: (options) =>
          defaultCodexCellDependencies(options),
        runCodexCell: async () => {
          cellLaunches += 1;
          throw new Error("cell must not launch");
        },
      },
    );

    // Then
    await expect(attempt).rejects.toThrow("bridge_execution_failed");
    expect(cellLaunches).toBe(0);
  });
});
