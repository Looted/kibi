import { describe, expect, test } from "bun:test";
import {
  type TaskSpec,
  buildBundleCatalog,
  buildHeldOutCatalog,
  buildPublicCatalog,
  buildSkillCatalog,
  catalogHash,
  validateSkillCatalog,
} from "../catalog";

describe("SkillOpt fixture catalog", () => {
  test("builds the frozen 8/4/16 split for one skill", () => {
    const tasks = buildSkillCatalog("kibi-usage");

    expect(tasks).toHaveLength(28);
    expect(() => validateSkillCatalog(tasks, "kibi-usage")).not.toThrow();
  });

  test("rejects duplicate task IDs before host launch", () => {
    const tasks = buildSkillCatalog("kibi-usage");
    const [first, second] = tasks;
    if (first === undefined || second === undefined) {
      throw new Error("catalog must contain at least two tasks");
    }
    const duplicate: TaskSpec = { ...first, id: second.id };

    expect(() =>
      validateSkillCatalog([duplicate, ...tasks.slice(1)], "kibi-usage"),
    ).toThrow("duplicate task ID");
  });

  test("produces a stable catalog hash and eight distinct bundle cases", () => {
    const tasks = buildBundleCatalog();

    expect(tasks).toHaveLength(8);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(8);
    expect(catalogHash(tasks)).toBe(catalogHash([...tasks]));
  });

  test("encodes explicit state, scorer reference, and family task data", () => {
    const tasks = [...buildPublicCatalog(), ...buildHeldOutCatalog()];

    expect(tasks).toHaveLength(120);
    expect(
      tasks.every(
        (task) =>
          task.activationMode.length > 0 &&
          task.initialState.setupBoundary === "external-kibi-adapter" &&
          task.allowedPublicFiles.length > 0 &&
          task.scorerReference.startsWith("scorer-ref-") &&
          task.taskData.objectiveCode.length > 0,
      ),
    ).toBe(true);
    expect(new Set(tasks.map((task) => task.taskData.approvalPhase))).toEqual(
      new Set(["not-applicable", "pre-approval", "post-approval"]),
    );
    expect(
      new Set(tasks.flatMap((task) => task.taskData.adversarialCases)),
    ).toEqual(
      new Set([
        "malformed-input",
        "prompt-injection",
        "dirty-state",
        "stale-state",
        "misleading-success",
        "interruption-cleanup",
        "approval-boundary",
      ]),
    );
  });
});
