// implements REQ-skillopt-codex-optimization
import { describe, expect, test } from "bun:test";
import { buildPublicCatalog } from "../catalog";
import {
  parsePublicTaskManifest,
  parseTaskSpec,
} from "../fixtures/contracts";

describe("fixture contracts remaining superRefine branches", () => {
  test("parseTaskSpec accepts a catalog task and rejects dirty/stale metadata gaps", () => {
    const task = buildPublicCatalog()[0];
    if (task === undefined) throw new Error("public catalog must not be empty");
    expect(parseTaskSpec(task).id).toBe(task.id);

    expect(() =>
      parseTaskSpec({
        ...task,
        initialState: { ...task.initialState, worktree: "dirty" },
        taskData: {
          ...task.taskData,
          adversarialCases: task.taskData.adversarialCases.filter(
            (item) => item !== "dirty-state",
          ),
        },
      }),
    ).toThrow(/dirty state requires dirty-state metadata/);

    expect(() =>
      parseTaskSpec({
        ...task,
        initialState: { ...task.initialState, kb: "stale" },
        taskData: {
          ...task.taskData,
          adversarialCases: task.taskData.adversarialCases.filter(
            (item) => item !== "stale-state",
          ),
        },
      }),
    ).toThrow(/stale KB requires stale-state metadata/);
  });

  test("parsePublicTaskManifest rejects leaked variant labels", () => {
    const task = buildPublicCatalog()[0];
    if (task === undefined) throw new Error("public catalog must not be empty");
    const manifest = {
      schemaVersion: "1.1.0",
      workspaceHash: "a".repeat(64),
      blindVariantSlots: ["variant-a", "variant-b", "variant-c"],
      task: {
        id: task.id,
        skill: task.skill,
        family: task.family,
        split: task.split,
        prompt: "skillopt",
        activationMode: task.activationMode,
        initialState: task.initialState,
        allowedPublicFiles: task.allowedPublicFiles,
        taskData: task.taskData,
        host: "codex",
      },
    };
    expect(() => parsePublicTaskManifest(JSON.stringify(manifest))).toThrow(
      /public manifest exposes a variant label/,
    );
  });
});
