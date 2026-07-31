import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import path from "node:path";
import { buildHeldOutCatalog, buildPublicCatalog } from "../catalog";
import { materializeFixtureRun } from "../fixtures/private";
import {
  TaskFixtureResolutionError,
  resolveTaskFixture,
} from "../runtime/task-fixture";
import { CANONICAL_SKILL_ROOT, temporaryRoot } from "./fixture-test-helpers";

const roots: string[] = [];

type PromiseSettlement<T> =
  | {
      readonly kind: "ok";
      readonly value: T;
    }
  | {
      readonly kind: "err";
      readonly error: unknown;
    };

async function settlePromise<T>(
  promise: Promise<T>,
): Promise<PromiseSettlement<T>> {
  return promise.then(
    (value) => ({ kind: "ok" as const, value }),
    (error) => ({ kind: "err" as const, error }),
  );
}

function isTaskFixtureResolutionError(
  value: unknown,
): value is TaskFixtureResolutionError {
  return value instanceof Error && value instanceof TaskFixtureResolutionError;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("task fixture resolution", () => {
  test("Given materialized train development and held-out tasks When each task resolves Then it receives only its matching public claim private evaluator and workspace", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: path.join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const entries = new Map(
      [...receipt.publicIndex.tasks, ...receipt.heldOutIndex.tasks].map(
        (entry) => [entry.taskId, entry],
      ),
    );
    const tasks = [...buildPublicCatalog(), ...buildHeldOutCatalog()];

    // When
    const fixtures = await Promise.all(
      tasks.map(async (task) => {
        const entry = entries.get(task.id);
        if (entry === undefined) {
          throw new Error(`missing fixture index entry: ${task.id}`);
        }
        return resolveTaskFixture({
          fixtureRunRoot: receipt.roots.runRoot,
          taskId: task.id,
          publicClaim: {
            taskId: task.id,
            text: task.prompt,
            publicManifestHash: entry.manifestHash,
            workspaceHash: entry.workspaceHash,
          },
        });
      }),
    );

    // Then
    expect(fixtures).toHaveLength(tasks.length);
    for (const fixture of fixtures) {
      expect(fixture.evaluatorManifest.taskId).toBe(fixture.publicClaim.taskId);
      expect(fixture.workspaceRoot).toContain(
        path.join("tasks", fixture.publicClaim.taskId, "workspace"),
      );
      expect(fixture.publicClaim.text).not.toBe("candidate skill bytes");
    }
  });

  test("Given a materialized task When its ID hashes or claim path do not bind Then resolution fails closed", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const [task] = buildPublicCatalog();
    if (task === undefined) {
      throw new Error("public catalog must contain a task");
    }
    const receipt = materializeFixtureRun({
      runRoot: path.join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      publicTasks: [task],
      heldOutTasks: [],
    });
    const [entry] = receipt.publicIndex.tasks;
    if (entry === undefined) {
      throw new Error("public fixture index must contain the task");
    }
    const input = {
      fixtureRunRoot: receipt.roots.runRoot,
      taskId: task.id,
      publicClaim: {
        taskId: task.id,
        text: task.prompt,
        publicManifestHash: entry.manifestHash,
        workspaceHash: entry.workspaceHash,
      },
    } as const;

    // When / Then
    const wrongTask = await settlePromise(
      resolveTaskFixture({ ...input, taskId: "wrong-task" }),
    );
    expect(wrongTask.kind).toBe("err");
    if (wrongTask.kind === "err") {
      expect(isTaskFixtureResolutionError(wrongTask.error)).toBe(true);
    }

    const wrongManifest = await settlePromise(
      resolveTaskFixture({
        ...input,
        publicClaim: {
          ...input.publicClaim,
          publicManifestHash: "f".repeat(64),
        },
      }),
    );
    expect(wrongManifest.kind).toBe("err");
    if (wrongManifest.kind === "err") {
      expect(isTaskFixtureResolutionError(wrongManifest.error)).toBe(true);
    }

    const wrongPath = await settlePromise(
      resolveTaskFixture({
        ...input,
        publicClaim: { ...input.publicClaim, taskId: "../wrong-task" },
      }),
    );
    expect(wrongPath.kind).toBe("err");
    if (wrongPath.kind === "err") {
      expect(isTaskFixtureResolutionError(wrongPath.error)).toBe(true);
    }
  });
});
