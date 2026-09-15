import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import canonicalize from "canonicalize";
import {
  type SkillManifest,
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../../packages/cli/src/public/skills";
import { withSharedAdoptionLock } from "../adoption-lock";
import { CANONICAL_SKILLS, type CanonicalSkill } from "../catalog";

export type SkillSurface = Readonly<{
  body: string;
  frontmatterHash: string;
  resourcesHash: string;
}>;

export type SkillCandidateSurface = Readonly<{
  body: string;
  frontmatterHash?: string;
  resourcesHash?: string;
  manifest?: Readonly<SkillManifest>;
  resources?: Readonly<Record<string, string>>;
}>;

export type SkillAssemblyReceipt = Readonly<{
  skills: readonly Readonly<{
    id: CanonicalSkill;
    bodyHash: string;
    frontmatterHash: string;
    resourcesHash: string;
    bodyChanged: boolean;
  }>[];
}>;

export class CandidateSurfaceError extends Error {
  readonly name = "CandidateSurfaceError";

  constructor(
    readonly kind:
      | "baseline_changed"
      | "frontmatter_changed"
      | "resources_changed"
      | "invalid_body",
  ) {
    super(`candidate_surface_${kind}`);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) throw new CandidateSurfaceError("invalid_body");
  return sha256(serialized);
}

function frontmatterPrefix(markdown: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(markdown);
  if (match === null) throw new CandidateSurfaceError("frontmatter_changed");
  return match[0];
}

function canonicalResources(
  skillsDir: string,
  skill: CanonicalSkill,
  manifest: Readonly<SkillManifest>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    [...(manifest.resources ?? [])]
      .sort()
      .map((resource) => [
        resource,
        readBundledSkillResourceFrom(skillsDir, skill, resource),
      ]),
  );
}

function assertCandidateSurface(
  candidate: SkillCandidateSurface,
  manifest: Readonly<SkillManifest>,
  resources: Readonly<Record<string, string>>,
): void {
  if (/^---\r?\n/.test(candidate.body)) {
    throw new CandidateSurfaceError("frontmatter_changed");
  }
  if (
    candidate.frontmatterHash !== undefined &&
    candidate.frontmatterHash !== canonicalHash(manifest)
  ) {
    throw new CandidateSurfaceError("frontmatter_changed");
  }
  if (
    candidate.resourcesHash !== undefined &&
    candidate.resourcesHash !== canonicalHash(resources)
  ) {
    throw new CandidateSurfaceError("resources_changed");
  }
  if (
    candidate.manifest !== undefined &&
    canonicalHash(candidate.manifest) !== canonicalHash(manifest)
  ) {
    throw new CandidateSurfaceError("frontmatter_changed");
  }
  if (
    candidate.resources !== undefined &&
    canonicalHash(candidate.resources) !== canonicalHash(resources)
  ) {
    throw new CandidateSurfaceError("resources_changed");
  }
  if (candidate.body.trim().length === 0) {
    throw new CandidateSurfaceError("invalid_body");
  }
}

// implements REQ-skillopt-codex-optimization
export async function assembleCanonicalSkills(
  input: Readonly<{
    sourceRepoRoot: string;
    workspace: string;
    targetSkill: CanonicalSkill;
    baselineSurfaces?: Readonly<Record<CanonicalSkill, SkillSurface>>;
    candidate?: SkillCandidateSurface;
    /** Bundle assembly: swap several skills at once (each validated). */
    candidates?: Readonly<
      Partial<Record<CanonicalSkill, SkillCandidateSurface>>
    >;
  }>,
): Promise<SkillAssemblyReceipt> {
  return withSharedAdoptionLock(input.sourceRepoRoot, async () =>
    assembleCanonicalSkillsUnlocked(input),
  );
}

async function assembleCanonicalSkillsUnlocked(
  input: Readonly<{
    sourceRepoRoot: string;
    workspace: string;
    targetSkill: CanonicalSkill;
    baselineSurfaces?: Readonly<Record<CanonicalSkill, SkillSurface>>;
    candidate?: SkillCandidateSurface;
    candidates?: Readonly<
      Partial<Record<CanonicalSkill, SkillCandidateSurface>>
    >;
  }>,
): Promise<SkillAssemblyReceipt> {
  const skillsDir = join(
    input.sourceRepoRoot,
    "packages/cli/src/public/skills",
  );
  const loaded = await Promise.all(
    CANONICAL_SKILLS.map(async (id) => {
      const bundle = loadBundledSkillFrom(skillsDir, id);
      const markdown = await readFile(join(bundle.rootDir, "SKILL.md"), "utf8");
      const resources = canonicalResources(skillsDir, id, bundle.manifest);
      const currentSurface: SkillSurface = {
        body: bundle.body,
        frontmatterHash: canonicalHash(bundle.manifest),
        resourcesHash: canonicalHash(resources),
      };
      const expectedBaseline = input.baselineSurfaces?.[id];
      if (
        expectedBaseline !== undefined &&
        (expectedBaseline.body !== currentSurface.body ||
          expectedBaseline.frontmatterHash !== currentSurface.frontmatterHash ||
          expectedBaseline.resourcesHash !== currentSurface.resourcesHash)
      ) {
        throw new CandidateSurfaceError("baseline_changed");
      }
      const candidate =
        input.candidates?.[id] ??
        (id === input.targetSkill ? input.candidate : undefined);
      if (candidate !== undefined) {
        assertCandidateSurface(candidate, bundle.manifest, resources);
      }
      return { id, bundle, markdown, resources, candidate };
    }),
  );

  const receipts: SkillAssemblyReceipt["skills"][number][] = [];
  for (const skill of loaded) {
    const body =
      skill.candidate !== undefined ? skill.candidate.body : skill.bundle.body;
    const root = join(input.workspace, ".agents/skills", skill.id);
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "SKILL.md"),
      `${frontmatterPrefix(skill.markdown)}${body}`,
    );
    for (const [resource, content] of Object.entries(skill.resources)) {
      const target = join(root, resource);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, content);
    }
    receipts.push({
      id: skill.id,
      bodyHash: sha256(body),
      frontmatterHash: canonicalHash(skill.bundle.manifest),
      resourcesHash: canonicalHash(skill.resources),
      bodyChanged: body !== skill.bundle.body,
    });
  }
  return { skills: receipts };
}
