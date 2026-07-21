import { describe, expect, test } from "bun:test";
import {
  type TaskSpec,
  buildBundleCatalog,
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
    const duplicate: TaskSpec = { ...tasks[0], id: tasks[1].id };

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
});
