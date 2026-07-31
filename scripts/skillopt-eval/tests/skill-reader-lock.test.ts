import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonicalize from "canonicalize";
import { withExclusiveAdoptionLock } from "../adoption-lock";
import { CANONICAL_SKILLS, type CanonicalSkill } from "../catalog";
import { loadSurface } from "../offline-artifacts";
import { surface } from "../real-workflow";
import { assembleCanonicalSkills } from "../runtime/skill-assembly";

const roots: string[] = [];
const resource = "resources/workflows.md";
const preBody = "# Pre-adoption snapshot\n";
const postBody = "# Post-adoption snapshot\n";
const preResource = "pre-adoption resource\n";
const postResource = "post-adoption resource\n";

type Fixture = Readonly<{
  sourceRepoRoot: string;
  skillsRoot: string;
  workspace: string;
}>;

type Surface = Readonly<{
  body: string;
  frontmatterHash: string;
  resourcesHash: string;
}>;

type Snapshot = Readonly<{
  skill: CanonicalSkill;
  version: string;
  body: string;
  resourceBody: string;
}>;

function manifest(skill: CanonicalSkill, version: string) {
  return {
    id: skill,
    name: `${skill} fixture`,
    description: "Shared adoption lock fixture",
    version,
    kibiCompatibility: ">=0.1.0",
    resources: [resource],
  };
}

function markdown(
  skill: CanonicalSkill,
  version: string,
  body: string,
): string {
  return `---\nid: ${skill}\nname: ${skill} fixture\ndescription: Shared adoption lock fixture\nversion: ${version}\nkibiCompatibility: ">=0.1.0"\nresources:\n  - ${resource}\n---\n${body}`;
}

function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) throw new Error("fixture_not_canonical");
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function expectedSurface(snapshot: Snapshot): Surface {
  return {
    body: snapshot.body,
    frontmatterHash: canonicalHash(manifest(snapshot.skill, snapshot.version)),
    resourcesHash: canonicalHash({ [resource]: snapshot.resourceBody }),
  };
}

async function fixture(): Promise<Fixture> {
  const sourceRepoRoot = await mkdtemp(
    join(tmpdir(), "skillopt-reader-source-"),
  );
  roots.push(sourceRepoRoot);
  const skillsRoot = join(sourceRepoRoot, "packages/cli/src/public/skills");
  for (const skill of CANONICAL_SKILLS) {
    const root = join(skillsRoot, skill);
    await mkdir(join(root, "resources"), { recursive: true });
    await writeFile(join(root, "SKILL.md"), markdown(skill, "1.0.0", preBody));
    await writeFile(join(root, resource), preResource);
  }
  const workspace = await mkdtemp(join(tmpdir(), "skillopt-reader-target-"));
  roots.push(workspace);
  return { sourceRepoRoot, skillsRoot, workspace };
}

async function readAcrossExclusiveSwap<T>(
  value: Fixture,
  read: () => Promise<T>,
): Promise<T> {
  const skillPath = join(value.skillsRoot, "kibi-usage", "SKILL.md");
  const stagedPath = join(value.skillsRoot, "kibi-usage", "SKILL.before.md");
  const readerStarted = Promise.withResolvers<void>();
  const finishSwap = Promise.withResolvers<void>();
  let result: Promise<T> | undefined;
  const exclusive = withExclusiveAdoptionLock(
    value.sourceRepoRoot,
    async () => {
      await rename(skillPath, stagedPath);
      result = read();
      readerStarted.resolve();
      await finishSwap.promise;
      await writeFile(skillPath, markdown("kibi-usage", "2.0.0", postBody));
      await writeFile(
        join(value.skillsRoot, "kibi-usage", resource),
        postResource,
      );
    },
  );

  await readerStarted.promise;
  finishSwap.resolve();
  await exclusive;
  if (result === undefined) throw new Error("reader_not_started");
  return result;
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("canonical skill reader shared adoption locks", () => {
  test("Given an exclusive source adoption swap When surface reads a canonical skill Then it observes only complete pre or post snapshots", async () => {
    // Given
    const value = await fixture();
    const pre = await surface(value.sourceRepoRoot, "kibi-usage");
    expect(pre).toEqual(
      expectedSurface({
        skill: "kibi-usage",
        version: "1.0.0",
        body: preBody,
        resourceBody: preResource,
      }),
    );

    // When
    const post = await readAcrossExclusiveSwap(value, () =>
      surface(value.sourceRepoRoot, "kibi-usage"),
    );

    // Then
    expect(post).toEqual(
      expectedSurface({
        skill: "kibi-usage",
        version: "2.0.0",
        body: postBody,
        resourceBody: postResource,
      }),
    );
  });

  test("Given an exclusive source adoption swap When offline loadSurface reads a canonical skill Then it observes only complete pre or post snapshots", async () => {
    // Given
    const value = await fixture();
    const pre = await loadSurface(value.sourceRepoRoot);
    expect(pre).toEqual(
      expectedSurface({
        skill: "kibi-usage",
        version: "1.0.0",
        body: preBody,
        resourceBody: preResource,
      }),
    );

    // When
    const post = await readAcrossExclusiveSwap(value, () =>
      loadSurface(value.sourceRepoRoot),
    );

    // Then
    expect(post).toEqual(
      expectedSurface({
        skill: "kibi-usage",
        version: "2.0.0",
        body: postBody,
        resourceBody: postResource,
      }),
    );
  });

  test("Given an exclusive source adoption swap When skills are assembled into a target workspace Then source-root locking prevents a mixed target", async () => {
    // Given
    const value = await fixture();

    // When
    await readAcrossExclusiveSwap(value, () =>
      assembleCanonicalSkills({
        sourceRepoRoot: value.sourceRepoRoot,
        workspace: value.workspace,
        targetSkill: "kibi-usage",
      }),
    );

    // Then
    const skill = await readFile(
      join(value.workspace, ".agents/skills/kibi-usage/SKILL.md"),
      "utf8",
    );
    const resourceBody = await readFile(
      join(value.workspace, ".agents/skills/kibi-usage/resources/workflows.md"),
      "utf8",
    );
    expect(skill).toBe(markdown("kibi-usage", "2.0.0", postBody));
    expect(resourceBody).toBe(postResource);
  });
});
