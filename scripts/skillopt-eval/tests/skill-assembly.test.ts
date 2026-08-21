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
  test("predicate guidance accepts body-only candidate mutation while resources remain immutable", async () => {
    // Given
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-usage");
    const candidateBody = `${baseline.body.trimEnd()}\n\nCandidate behavior.\n`;

    // When
    const receipt = await assembleCanonicalSkills({
      sourceRepoRoot: resolve(import.meta.dir, "../../.."),
      workspace: root,
      targetSkill: "kibi-usage",
      candidate: { body: candidateBody },
    });

    // Then
    expect(receipt.skills.map(({ id }) => id)).toEqual([
      "kibi-usage",
      "kibi-freshness",
      "kibi-traceability",
      "kibi-bootstrap",
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

  test("predicate guidance rejects malformed frontmatter version mutation", async () => {
    // Given
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-freshness");

    // When
    const attempt = assembleCanonicalSkills({
      sourceRepoRoot: resolve(import.meta.dir, "../../.."),
      workspace: root,
      targetSkill: "kibi-freshness",
      candidate: {
        body: baseline.body,
        manifest: { ...baseline.manifest, version: "999.0.0" },
      },
    });

    // Then
    await expect(attempt).rejects.toMatchObject({
      name: "CandidateSurfaceError",
      kind: "frontmatter_changed",
    });
  });

  test("predicate guidance rejects forbidden resource mutation", async () => {
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
      sourceRepoRoot: resolve(import.meta.dir, "../../.."),
      workspace: root,
      targetSkill: "kibi-usage",
      candidate: {
        body: baseline.body,
        resources: { ...resources, "resources/workflows.md": "edited\n" },
      },
    });

    // Then
    await expect(attempt).rejects.toBeInstanceOf(CandidateSurfaceError);
    await expect(attempt).rejects.toMatchObject({ kind: "resources_changed" });
  });

  test("Given a candidate body containing YAML frontmatter When assembled Then it is rejected before writing", async () => {
    // Given
    const root = await workspace();

    // When
    const attempt = assembleCanonicalSkills({
      sourceRepoRoot: resolve(import.meta.dir, "../../.."),
      workspace: root,
      targetSkill: "kibi-bootstrap",
      candidate: { body: "---\nid: changed\n---\nbody\n" },
    });

    // Then
    await expect(attempt).rejects.toMatchObject({
      kind: "frontmatter_changed",
    });
    expect(resolve(root)).not.toContain(".kb");
  });
});
