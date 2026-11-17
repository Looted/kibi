import { describe, expect, test } from "bun:test";
import {
  listBundledSkills,
  loadBundledSkill,
  readBundledSkillResource,
} from "../src/public/skills";

/** A skill's guidance as an agent can reach it: the body plus every declared resource. */
function skillGuidance(id: string): string {
  const bundle = loadBundledSkill(id);
  return [
    bundle.body,
    ...(bundle.manifest.resources ?? []).map((resource) =>
      readBundledSkillResource(id, resource),
    ),
  ].join("\n");
}

describe("skill core arc", () => {
  test("usage body carries only the core arc and points to its topic resources", () => {
    const bundle = loadBundledSkill("kibi-usage");
    expect(bundle.body.length).toBeLessThan(4500);
    const headings = bundle.body
      .split("\n")
      .filter((line) => line.startsWith("## "));
    expect(headings).toEqual([
      "## Interface Selection",
      "## 1. Search for prior intent",
      "## 2. Edit",
      "## 3. Record",
      "## 4. Check",
      "## 5. Commit",
      "## Resources",
    ]);
    for (const resource of [
      "resources/second-agent-edits.md",
      "resources/predicate-ontology.md",
      "resources/requirement-size.md",
      "resources/domain-subjects.md",
      "resources/hook-snippets.md",
      "resources/quantified-claims.md",
    ]) {
      expect(bundle.manifest.resources).toContain(resource);
      expect(bundle.body).toContain(resource.replace("resources/", ""));
    }
    expect(bundle.body).toContain("is a question, not a task");
  });

  test("usage guidance drops paragraphs written for single evaluation cases", () => {
    const guidance = skillGuidance("kibi-usage");
    expect(guidance).not.toContain("explicitly supplies a malformed");
    expect(guidance).not.toContain("exactly two Kibi calls");
  });

  test("commit review forbids hand edits of .kb but expects staging it", () => {
    const body = loadBundledSkill("kibi-commit-review").body;
    expect(body).toContain(
      "Do not edit `.kb` files by hand; staging `.kb` with `git add` is expected.",
    );
    expect(body).not.toMatch(/never (read or )?open any file under `?\.kb/i);
    expect(body).not.toMatch(/Never read or edit `\.kb\/` files/);
  });

  test("no skill makes a dry run and a read-back the default steps of a write", () => {
    for (const { id } of listBundledSkills()) {
      if (id === "kibi-bootstrap") continue;
      const body = loadBundledSkill(id).body;
      expect(body, id).not.toMatch(/exact-read the result/i);
      expect(body, id).not.toMatch(/read the result back/i);
      expect(body, id).not.toMatch(
        /validate (the|that same|each) payload with `?kb_upsert`? and `?dryRun: true/i,
      );
      expect(body, id).not.toMatch(
        /check each payload with kb_upsert and dryRun/i,
      );
    }
  });
});
