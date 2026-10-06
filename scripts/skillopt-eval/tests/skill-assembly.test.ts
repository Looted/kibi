import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  loadBundledSkill,
  loadBundledSkillFrom,
  readBundledSkillResource,
} from "../../../packages/cli/src/public/skills";
import { canonicalHash } from "../real-workflow-types";
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

  test("Given a candidate description When assembled Then the loader reads it back and every other frontmatter field is baseline", async () => {
    // Given
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-bootstrap");
    const description =
      'Use when: a repo has no Kibi store yet ("bootstrap") # sources, intent & proof.';
    const sourceMarkdown = await readFile(
      join(baseline.rootDir, "SKILL.md"),
      "utf8",
    );

    // When
    const receipt = await assembleCanonicalSkills({
      sourceRepoRoot: resolve(import.meta.dir, "../../.."),
      workspace: root,
      targetSkill: "kibi-bootstrap",
      candidate: {
        body: baseline.body,
        description,
        frontmatterHash: canonicalHash(baseline.manifest),
      },
    });

    // Then
    const assembled = loadBundledSkillFrom(
      join(root, ".agents/skills"),
      "kibi-bootstrap",
    );
    expect(assembled.manifest).toEqual({ ...baseline.manifest, description });
    expect(assembled.body).toBe(baseline.body);
    const entry = receipt.skills.find(({ id }) => id === "kibi-bootstrap");
    expect(entry).toMatchObject({
      bodyChanged: false,
      descriptionChanged: true,
      frontmatterHash: canonicalHash({ ...baseline.manifest, description }),
    });
    // Only the description line differs from the source file.
    const written = await readFile(
      join(root, ".agents/skills/kibi-bootstrap/SKILL.md"),
      "utf8",
    );
    const changed = written
      .split("\n")
      .filter((line, index) => line !== sourceMarkdown.split("\n")[index]);
    expect(changed).toEqual([`description: ${JSON.stringify(description)}`]);
    // Skills without a candidate keep their frontmatter and receipt shape.
    const untouched = receipt.skills.find(({ id }) => id === "kibi-usage");
    expect(untouched).not.toHaveProperty("descriptionChanged");
    expect(untouched?.frontmatterHash).toBe(
      canonicalHash(loadBundledSkill("kibi-usage").manifest),
    );
  });

  test("Given a described candidate that also changes other frontmatter When assembled Then it is refused", async () => {
    const baseline = loadBundledSkill("kibi-bootstrap");
    const attempts = [
      {
        candidate: {
          body: baseline.body,
          description: "Bootstrap Kibi from sources.",
          manifest: { ...baseline.manifest, version: "9.9.9" },
        },
        kind: "frontmatter_changed",
      },
      {
        candidate: {
          body: baseline.body,
          description: "Bootstrap Kibi from sources.",
          frontmatterHash: canonicalHash({
            ...baseline.manifest,
            description: "Bootstrap Kibi from sources.",
          }),
        },
        kind: "frontmatter_changed",
      },
      {
        candidate: {
          body: baseline.body,
          description: "Bootstrap Kibi.\nversion: 9.9.9",
        },
        kind: "invalid_description",
      },
      {
        candidate: {
          body: baseline.body,
          description: "Bootstrap <Kibi> from sources.",
        },
        kind: "invalid_description",
      },
    ] as const;
    for (const attempt of attempts) {
      const root = await workspace();
      await expect(
        assembleCanonicalSkills({
          sourceRepoRoot: resolve(import.meta.dir, "../../.."),
          workspace: root,
          targetSkill: "kibi-bootstrap",
          candidate: attempt.candidate,
        }),
      ).rejects.toMatchObject({
        name: "CandidateSurfaceError",
        kind: attempt.kind,
      });
    }
  });

  test("Given a body-only candidate When assembled Then the source frontmatter is written byte for byte", async () => {
    const root = await workspace();
    const baseline = loadBundledSkill("kibi-traceability");
    const sourceMarkdown = await readFile(
      join(baseline.rootDir, "SKILL.md"),
      "utf8",
    );
    const body = `${baseline.body.trimEnd()}\n\nCandidate behavior.\n`;
    await assembleCanonicalSkills({
      sourceRepoRoot: resolve(import.meta.dir, "../../.."),
      workspace: root,
      targetSkill: "kibi-traceability",
      candidate: { body },
    });
    expect(
      await readFile(
        join(root, ".agents/skills/kibi-traceability/SKILL.md"),
        "utf8",
      ),
    ).toBe(`${sourceMarkdown.slice(0, -baseline.body.length)}${body}`);
  });
});
