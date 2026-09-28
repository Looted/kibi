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
      "kibi-bootstrap",
      "kibi-freshness",
      "kibi-traceability",
      "kibi-usage",
    ]);
    for (const id of skills.map((skill) => skill.id)) {
      const bundle = loadBundledSkill(id);
      expect(bundle.manifest.version).toMatch(/^[23]\./);
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
    expect(bundle.body).toContain("Hosts may expose prefixed identifiers");
    expect(bundle.body).not.toContain("OpenCode");
    expect(bundle.body).not.toContain("Public Training Trajectories");
    expect(bundle.body).not.toContain("Training Data");
  });

  test("focused resources are declared and readable", () => {
    const bundle = loadBundledSkill("kibi-usage");
    for (const resource of [
      "resources/branch-lifecycle.md",
      "resources/source-authoring.md",
      "resources/operation-access.md",
      "resources/kb-improvement.md",
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
    expect(directions).toContain(
      "from: REQ-opencode-kibi-briefing-v2\n    to: REQ-opencode-kibi-briefing-v1",
    );
    expect(directions).not.toContain("| `supersedes` | old-req -> new-req |");
  });

  test("documents restates and uses slug IDs instead of sequence numbers", () => {
    const directions = readBundledSkillResource(
      "kibi-usage",
      "resources/relationship-directions.md",
    );
    const authoring = readBundledSkillResource(
      "kibi-usage",
      "resources/source-authoring.md",
    );

    expect(directions).toContain("| `restates` | req -> req |");
    expect(directions).toContain("type: restates");
    expect(authoring).toContain("## Naming entities");
    expect(authoring).toContain('Never choose "the next number"');
    for (const text of [directions, authoring]) {
      const numbered = text.match(
        /\b(?:REQ|SCEN|TEST|ADR|FLAG|EVT|SYM)-\d+\b/g,
      );
      // Only the grandfathering note may cite a legacy numbered ID.
      expect(
        (numbered ?? []).filter((id) => !["REQ-123", "REQ-003"].includes(id)),
      ).toEqual([]);
    }
  });
});
