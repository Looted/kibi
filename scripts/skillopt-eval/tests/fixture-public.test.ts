import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import {
  CANONICAL_SKILLS,
  buildHeldOutCatalog,
  buildPublicCatalog,
} from "../catalog";
import { parsePublicTaskManifest, parsePublicTaskSpec } from "../fixtures";
import * as publicFixtures from "../fixtures";
import * as privateFixtures from "../fixtures/private";
import { materializeFixtureRun } from "../fixtures/private";
import {
  CANONICAL_SKILL_ROOT,
  files,
  readTree,
  temporaryRoot,
} from "./fixture-test-helpers";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("public SkillOpt fixture corpus", () => {
  test("exposes only balanced train and development descriptors", () => {
    const tasks = buildPublicCatalog();

    expect(tasks).toHaveLength(48);
    expect(tasks.every((task) => task.split !== "held-out")).toBe(true);
    for (const skill of CANONICAL_SKILLS) {
      const skillTasks = tasks.filter((task) => task.skill === skill);
      expect(skillTasks.filter((task) => task.split === "train")).toHaveLength(
        8,
      );
      expect(
        skillTasks.filter((task) => task.split === "development"),
      ).toHaveLength(4);
      expect(
        new Set(skillTasks.map((task) => task.taskData.objectiveCode)).size,
      ).toBe(4);
    }
  });

  test("rejects held-out access through every public fixture API", () => {
    const heldOut = buildHeldOutCatalog()[0];
    if (heldOut === undefined)
      throw new Error("held-out catalog must not be empty");
    expect(() => parsePublicTaskSpec(heldOut)).toThrow("reject held-out");
    const root = temporaryRoot();
    roots.push(root);
    const rejectedRunRoot = path.join(root, "rejected-run");
    expect(() =>
      materializeFixtureRun({
        runRoot: rejectedRunRoot,
        canonicalSkillRoot: CANONICAL_SKILL_ROOT,
        publicTasks: [heldOut],
        heldOutTasks: [],
      }),
    ).toThrow("reject held-out");
    expect(existsSync(rejectedRunRoot)).toBe(false);

    const receipt = materializeFixtureRun({
      runRoot: path.join(root, "valid-run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      publicTasks: [],
      heldOutTasks: [heldOut],
    });
    const heldOutManifest = readFileSync(
      path.join(receipt.roots.heldOutRoot, "tasks", heldOut.id, "task.json"),
      "utf8",
    );
    expect(() => parsePublicTaskManifest(heldOutManifest)).toThrow();
    expect(Object.keys(publicFixtures).sort()).toEqual([
      "parsePublicTaskManifest",
      "parsePublicTaskSpec",
    ]);
    expect(Object.keys(privateFixtures).sort()).toContain(
      "materializeFixtureRun",
    );
    expect(Object.keys(privateFixtures).sort()).not.toContain(
      "materializeHeldOutCorpus",
    );
  });

  test("copies all canonical skill bundles without fabricating Kibi state", () => {
    const root = temporaryRoot();
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: path.join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      heldOutTasks: [],
    });
    const { publicRoot } = receipt.roots;

    expect(receipt.publicIndex.tasks).toHaveLength(48);
    expect(path.basename(publicRoot)).toBe("public");
    expect(path.basename(receipt.roots.heldOutRoot)).toBe("held-out");
    expect(path.basename(receipt.roots.evaluatorRoot)).toBe("evaluator");
    expect(existsSync(path.join(publicRoot, "train"))).toBe(true);
    expect(existsSync(path.join(publicRoot, "development"))).toBe(true);
    expect(existsSync(path.join(publicRoot, "held-out"))).toBe(false);
    const firstTask = buildPublicCatalog()[0];
    if (firstTask === undefined)
      throw new Error("public catalog must not be empty");
    const workspace = path.join(
      publicRoot,
      firstTask.split,
      "tasks",
      firstTask.id,
      "workspace",
    );
    expect(files(workspace)).toEqual(firstTask.allowedPublicFiles);
    expect(
      files(workspace).some((relative) => relative.startsWith(".kb")),
    ).toBe(false);
    for (const skill of CANONICAL_SKILLS) {
      expect(
        readFileSync(path.join(workspace, "skills", skill, "SKILL.md")),
      ).toEqual(
        readFileSync(path.join(CANONICAL_SKILL_ROOT, skill, "SKILL.md")),
      );
    }
  });

  test("does not expose private scorer or variant identity data", () => {
    const root = temporaryRoot();
    roots.push(root);
    const receipt = materializeFixtureRun({
      runRoot: path.join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      heldOutTasks: [],
    });
    const text = readTree(receipt.roots.publicRoot);

    expect(text).not.toMatch(
      /scorerKey|scorerReference|fixtureSeed|expectedFinalState/,
    );
    expect(text).not.toMatch(/"(?:baseline|one-shot|skillopt)"/);
    expect(text).not.toMatch(
      /PRIVATE_SENTINEL|SIBLING_SENTINEL|credential|privateTrace/i,
    );
  });
});
