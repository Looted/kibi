import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import {
  CANONICAL_SKILLS,
  buildHeldOutCatalog,
  buildPublicCatalog,
} from "../catalog";
import {
  materializePublicCorpus,
  parsePublicTaskManifest,
  parsePublicTaskSpec,
} from "../fixtures";
import * as publicFixtures from "../fixtures";
import { materializeHeldOutCorpus } from "../fixtures/private";
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
    const publicRoot = path.join(root, "public");
    expect(() =>
      materializePublicCorpus({
        publicRoot,
        canonicalSkillRoot: CANONICAL_SKILL_ROOT,
        tasks: [heldOut],
      }),
    ).toThrow("reject held-out");
    expect(existsSync(publicRoot)).toBe(false);

    const heldOutRoot = path.join(root, "held-out");
    const evaluatorRoot = path.join(root, "evaluator");
    materializeHeldOutCorpus({
      heldOutRoot,
      evaluatorRoot,
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      tasks: [heldOut],
    });
    const heldOutManifest = readFileSync(
      path.join(heldOutRoot, "tasks", heldOut.id, "task.json"),
      "utf8",
    );
    expect(() => parsePublicTaskManifest(heldOutManifest)).toThrow();
    expect(Object.keys(publicFixtures).sort()).toEqual([
      "materializePublicCorpus",
      "parsePublicTaskManifest",
      "parsePublicTaskSpec",
    ]);
  });

  test("copies all canonical skill bundles without fabricating Kibi state", () => {
    const root = temporaryRoot();
    roots.push(root);
    const publicRoot = path.join(root, "public");
    const receipt = materializePublicCorpus({
      publicRoot,
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });

    expect(receipt.publicIndex.tasks).toHaveLength(48);
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
    const publicRoot = path.join(root, "public");
    materializePublicCorpus({
      publicRoot,
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const text = readTree(publicRoot);

    expect(text).not.toMatch(
      /scorerKey|scorerReference|fixtureSeed|expectedFinalState/,
    );
    expect(text).not.toMatch(/"(?:baseline|one-shot|skillopt)"/);
    expect(text).not.toMatch(
      /PRIVATE_SENTINEL|SIBLING_SENTINEL|credential|privateTrace/i,
    );
  });
});
