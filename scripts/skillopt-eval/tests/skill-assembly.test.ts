import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  loadBundledSkill,
  readBundledSkillResource,
} from "../../../packages/cli/src/public/skills";
import {
  CandidateSurfaceError,
  assembleCanonicalSkills,
} from "../runtime/skill-assembly";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-assembly-"));
  roots.push(root);
  return root;
}

describe("canonical skill assembly", () => {
  test("Given a body-only candidate When assembled Then four skills remain discoverable with immutable companion surfaces", async () => {
    // Given
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-usage");
    const candidateBody = `${baseline.body.trimEnd()}\n\nCandidate behavior.\n`;

    // When
    const receipt = await assembleCanonicalSkills({
      workspace: root,
      targetSkill: "kibi-usage",
      candidate: { body: candidateBody },
    });

    // Then
    expect(receipt.skills.map(({ id }) => id)).toEqual([
      "kibi-usage",
      "kibi-freshness",
      "kibi-traceability",
      "init-kibi",
    ]);
    expect(
      receipt.skills.find(({ id }) => id === "kibi-usage")?.bodyChanged,
    ).toBe(true);
    expect(
      await readFile(join(root, ".agents/skills/kibi-usage/SKILL.md"), "utf8"),
    ).toEndWith(candidateBody);
    expect(
      await readFile(
        join(root, ".agents/skills/kibi-usage/resources/workflows.md"),
        "utf8",
      ),
    ).toBe(readBundledSkillResource("kibi-usage", "resources/workflows.md"));
  });

  test("Given candidate frontmatter When it differs Then assembly rejects the immutable surface", async () => {
    // Given
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-freshness");

    // When
    const attempt = assembleCanonicalSkills({
      workspace: root,
      targetSkill: "kibi-freshness",
      candidate: {
        body: baseline.body,
        manifest: { ...baseline.manifest, version: "999.0.0" },
      },
    });

    // Then
    expect(attempt).rejects.toMatchObject({
      name: "CandidateSurfaceError",
      kind: "frontmatter_changed",
    });
  });

  test("Given candidate resources When one byte differs Then assembly rejects the immutable resource surface", async () => {
    // Given
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-usage");
    const resources = Object.fromEntries(
      (baseline.manifest.resources ?? []).map((resource) => [
        resource,
        readBundledSkillResource("kibi-usage", resource),
      ]),
    );

    // When
    const attempt = assembleCanonicalSkills({
      workspace: root,
      targetSkill: "kibi-usage",
      candidate: {
        body: baseline.body,
        resources: { ...resources, "resources/workflows.md": "edited\n" },
      },
    });

    // Then
    expect(attempt).rejects.toBeInstanceOf(CandidateSurfaceError);
    expect(attempt).rejects.toMatchObject({ kind: "resources_changed" });
  });

  test("Given a candidate body containing YAML frontmatter When assembled Then it is rejected before writing", async () => {
    // Given
    const root = await workspace();

    // When
    const attempt = assembleCanonicalSkills({
      workspace: root,
      targetSkill: "init-kibi",
      candidate: { body: "---\nid: changed\n---\nbody\n" },
    });

    // Then
    expect(attempt).rejects.toMatchObject({ kind: "frontmatter_changed" });
    expect(resolve(root)).not.toContain(".kb");
  });
});
