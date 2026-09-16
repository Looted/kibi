import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bridgeMain } from "../bridge-cli";
import { buildPublicCatalog } from "../catalog";
import { materializeFixtureRun } from "../fixtures/private";
import { defaultCodexCellDependencies } from "../runtime/codex-cell-defaults";
import { readBridgeResult, writeBridgeRequest } from "../runtime/file-bridge";
import { CANONICAL_SKILL_ROOT } from "./fixture-test-helpers";

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
    const [task] = buildPublicCatalog();
    if (task === undefined) {
      throw new Error("public catalog must contain a task");
    }
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
    const request = {
      schemaVersion: "1.0.0" as const,
      artifactType: "skillopt-bridge-request" as const,
      runId: "00000000-0000-4000-8000-000000000021",
      batchId: "bridge-real-1",
      skill: "kibi-usage" as const,
      phase: "train" as const,
      candidateBody: "Use the Kibi MCP workflow.\n",
      taskIds: [task.id],
      publicClaim: {
        taskId: task.id,
        text: task.prompt,
        publicManifestHash: entry.manifestHash,
        workspaceHash: entry.workspaceHash,
      },
      sourceLockHash: "a".repeat(64),
    };
    await writeBridgeRequest(requestPath, request);
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
        expect(options.fixtureRoot).toBe(
          join(
            fixtureRun.roots.publicRoot,
            task.split,
            "tasks",
            task.id,
            "workspace",
          ),
        );
        expect(options.targetSkill).toBe("kibi-usage");
        expect(options.candidate).toEqual({ body: request.candidateBody });
        expect(options.request.prompt).toBe(request.publicClaim.text);
        expect(options.request.prompt).not.toBe(request.candidateBody);
        expect(options.evaluatorManifest.taskId).toBe(task.id);
        expect(options.finalStateRequests.map(({ tool }) => tool)).toEqual([
          "kb_query",
          "kb_check",
          "kb_status",
          "kb_coverage",
        ]);
        const artifactDirectory = join(
          root,
          "artifacts",
          "episodes",
          "episode-1",
        );
        await mkdir(artifactDirectory, { recursive: true });
        await writeFile(
          join(artifactDirectory, "final-state.json"),
          '{"status":"fresh"}\n',
        );
        return {
          receipt: {
            result: {
              status: "completed",
              hardPass: true,
              score: 100,
              criticalFailures: [],
            },
            evidenceIndex: {
              events: [
                {
                  event: {
                    type: "item.completed",
                    payload: {
                      item: {
                        type: "mcp_tool_call",
                        tool: "kb_status",
                        arguments: {
                          _diagnostic_telemetry: { reasoning: "private" },
                        },
                        error: null,
                      },
                    },
                  },
                },
              ],
            },
          },
          artifactDirectory,
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
        "--fixture-run-root",
        fixtureRun.roots.runRoot,
        "--codex-executable",
        "/staged/codex",
        "--bwrap-executable",
        "/staged/codex-resources/bwrap",
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
        id: task.id,
        hard: 1,
        soft: 1,
        status: "completed",
        failureCategory: null,
        failureCategories: [],
        toolSequence: [
          JSON.stringify({
            tool: "kb_status",
            arguments: {},
            outcome: "success",
          }),
        ],
        finalStateSummary: '{"status":"fresh"}\n',
        conversationPath: "episodes/episode-1",
        evidenceRefs: ["episodes/episode-1/episode-receipt.json"],
      },
    ]);
  });

  test("Given a task request with an unbound public fixture hash When bridgeMain executes Then no cell is launched", async () => {
    // Given
    const root = await mkdtemp(
      join(tmpdir(), "skillopt-bridge-manifest-mismatch-"),
    );
    roots.push(root);
    const requestPath = join(root, "request.json");
    const resultPath = join(root, "result.json");
    const [task] = buildPublicCatalog();
    if (task === undefined) {
      throw new Error("public catalog must contain a task");
    }
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
    await writeBridgeRequest(requestPath, {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-bridge-request",
      runId: "00000000-0000-4000-8000-000000000022",
      batchId: "bridge-manifest-mismatch",
      skill: "kibi-usage",
      phase: "train",
      candidateBody: "Use the Kibi MCP workflow.\n",
      taskIds: [task.id],
      publicClaim: {
        taskId: task.id,
        text: task.prompt,
        publicManifestHash: "f".repeat(64),
        workspaceHash: entry.workspaceHash,
      },
      sourceLockHash: "a".repeat(64),
    });
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
        "--fixture-run-root",
        fixtureRun.roots.runRoot,
        "--codex-executable",
        "/staged/codex",
        "--bwrap-executable",
        "/staged/codex-resources/bwrap",
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

  test("Given an injected pipe When bridgeMain runs Then it writes the bound result to that pipe", async () => {
    const request = {
      schemaVersion: "1.0.0" as const,
      artifactType: "skillopt-bridge-request" as const,
      runId: "00000000-0000-4000-8000-000000000023",
      batchId: "bridge-pipe-1",
      skill: "kibi-usage" as const,
      phase: "train" as const,
      candidateBody: "Use the Kibi MCP workflow.\n",
      taskIds: ["kibi-usage-safe-mutation-direction-development-1"],
      publicClaim: {
        taskId: "kibi-usage-safe-mutation-direction-development-1",
        text: "Use the Kibi MCP workflow.",
        publicManifestHash: "a".repeat(64),
        workspaceHash: "b".repeat(64),
      },
      sourceLockHash: "c".repeat(64),
    };
    let written: unknown;
    const exitCode = await bridgeMain(["--pipe", "--fake"], undefined, {
      readRequest: async () => request,
      writeResult: async (result) => {
        written = result;
      },
    });
    expect(exitCode).toBe(0);
    expect(written).toEqual(
      expect.objectContaining({
        artifactType: "skillopt-bridge-result",
        runId: request.runId,
        batchId: request.batchId,
        rows: [
          expect.objectContaining({
            id: request.taskIds[0],
            status: "completed",
            hard: 1,
          }),
        ],
      }),
    );
  });
});
