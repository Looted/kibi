import { describe, expect, test } from "bun:test";
import {
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
} from "../src/public/skills";

describe("bundled Kibi skills", () => {
  test("ships the four canonical skills with source-first descriptions", () => {
    const skills = listBundledSkills();
    expect(skills.map((skill) => skill.id)).toEqual([
      "init-kibi",
      "kibi-freshness",
      "kibi-traceability",
      "kibi-usage",
    ]);
    for (const id of skills.map((skill) => skill.id)) {
      const bundle = loadBundledSkill(id);
      expect(bundle.manifest.version).toMatch(/^2\./);
      expect(bundle.manifest.description).toMatch(
        /Git|source|traceability|bootstrap/i,
      );
      expect(bundle.body).toContain("kibiProtocol");
      expect(bundle.body).toContain("committed_with_repairs");
      expect(bundle.body).toContain("nextActions");
      expect(bundle.body).toContain("Git-stages");
    }
  });

  test("usage teaches exact branching, source authoring, and typed facts", () => {
    const bundle = loadBundledSkill("kibi-usage");
    expect(bundle.body).toContain("KIBI_BRANCH");
    expect(bundle.body).toContain("branch.json");
    expect(bundle.body).toContain("document.path");
    expect(bundle.body).toContain("supersedes");
    expect(bundle.body).toContain("fact_kind: predicate");
    expect(bundle.body).toContain("fact_kind: observation");
    expect(bundle.body).toContain("OpenCode");
    expect(bundle.body).not.toContain("Public Training Trajectories");
    expect(bundle.body).not.toContain("Training Data");
  });

  test("focused resources are declared and readable", () => {
    const bundle = loadBundledSkill("kibi-usage");
    for (const resource of [
      "resources/branch-lifecycle.md",
      "resources/source-authoring.md",
      "resources/operation-access.md",
    ]) {
      expect(bundle.manifest.resources).toContain(resource);
      expect(
        readBundledSkillResource("kibi-usage", resource).length,
      ).toBeGreaterThan(20);
    }
  });

  test("documents supersession in the executable new-to-old direction", () => {
    const directions = readBundledSkillResource(
      "kibi-usage",
      "resources/relationship-directions.md",
    );

    expect(directions).toContain("| `supersedes` | new-req -> old-req |");
    expect(directions).toContain("from: REQ-001-v2\n    to: REQ-001");
    expect(directions).not.toContain("| `supersedes` | old-req -> new-req |");
  });
});
