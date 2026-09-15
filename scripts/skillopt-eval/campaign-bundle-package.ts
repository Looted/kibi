import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../packages/cli/src/public/skills";
import {
  type BundleCandidateManifest,
  CampaignArtifactError,
  CampaignArtifactStore,
  type CampaignSourceSurface,
  type SourceFence,
  defaultSourceFence,
  readBundleCandidateManifest,
  sha256Text,
  validateCampaignManifestAgainstSurface,
} from "./campaign-artifacts";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { surface } from "./real-workflow";
import { canonicalHash } from "./real-workflow-types";
import {
  type SkillAssemblyReceipt,
  type SkillCandidateSurface,
  assembleCanonicalSkills,
} from "./runtime/skill-assembly";

export type BundlePackageDependencies = Readonly<{
  sourceFence: (root: string) => Promise<SourceFence>;
  surface: typeof surface;
  assemble: typeof assembleCanonicalSkills;
}>;

export const defaultBundlePackageDependencies = {
  sourceFence: defaultSourceFence,
  surface,
  assemble: assembleCanonicalSkills,
} satisfies BundlePackageDependencies;

type SelectedSurface = Readonly<{
  arm: "baseline" | "candidate";
  body: string;
  bodyHash: string;
  frontmatterHash: string;
  resourcesHash: string;
}>;

function sameFence(left: SourceFence, right: SourceFence): boolean {
  return (
    left.head === right.head &&
    left.treeHash === right.treeHash &&
    left.files === right.files
  );
}

function readAssembledSkillSurface(
  workspace: string,
  skill: CanonicalSkill,
): CampaignSourceSurface {
  const skillsDir = join(workspace, ".agents/skills");
  const bundle = loadBundledSkillFrom(skillsDir, skill);
  const resources = Object.fromEntries(
    [...(bundle.manifest.resources ?? [])]
      .sort()
      .map((resource) => [
        resource,
        readBundledSkillResourceFrom(skillsDir, skill, resource),
      ]),
  );
  return {
    body: bundle.body,
    frontmatterHash: canonicalHash(bundle.manifest),
    resourcesHash: canonicalHash(resources),
  };
}

function selectedSurfaces(
  bundle: BundleCandidateManifest,
  current: Readonly<Record<CanonicalSkill, CampaignSourceSurface>>,
): Readonly<Record<CanonicalSkill, SelectedSurface>> {
  const selected = {} as Record<CanonicalSkill, SelectedSurface>;
  for (const entry of bundle.bundle.entries) {
    const baseline = current[entry.skill];
    if (entry.arm === "baseline") {
      selected[entry.skill] = {
        arm: "baseline",
        body: baseline.body,
        bodyHash: sha256Text(baseline.body),
        frontmatterHash: baseline.frontmatterHash,
        resourcesHash: baseline.resourcesHash,
      };
      continue;
    }
    const manifest = bundle.candidates.get(entry.skill);
    if (manifest === undefined)
      throw new CampaignArtifactError("bundle_candidate_manifest_missing");
    validateCampaignManifestAgainstSurface(manifest, baseline);
    selected[entry.skill] = {
      arm: "candidate",
      body: manifest.frozenBody,
      bodyHash: manifest.frozenBodyHash,
      frontmatterHash: manifest.frontmatterHash,
      resourcesHash: manifest.resourcesHash,
    };
  }
  return selected;
}

function verifyAssembly(
  receipt: SkillAssemblyReceipt,
  workspace: string,
  current: Readonly<Record<CanonicalSkill, CampaignSourceSurface>>,
  selected: Readonly<Record<CanonicalSkill, SelectedSurface>>,
): void {
  if (
    receipt.skills.length !== CANONICAL_SKILLS.length ||
    new Set(receipt.skills.map((entry) => entry.id)).size !==
      CANONICAL_SKILLS.length ||
    receipt.skills.some((entry) => !CANONICAL_SKILLS.includes(entry.id))
  ) {
    throw new CampaignArtifactError("bundle_package_skill_set_invalid");
  }
  for (const skill of CANONICAL_SKILLS) {
    const entry = receipt.skills.find((candidate) => candidate.id === skill);
    const expected = selected[skill];
    const baseline = current[skill];
    if (entry === undefined || expected === undefined)
      throw new CampaignArtifactError("bundle_package_skill_set_invalid");
    const actual = readAssembledSkillSurface(workspace, skill);
    const bodyChanged = expected.bodyHash !== sha256Text(baseline.body);
    if (
      actual.body !== expected.body ||
      sha256Text(actual.body) !== expected.bodyHash ||
      actual.frontmatterHash !== baseline.frontmatterHash ||
      actual.resourcesHash !== baseline.resourcesHash ||
      entry.bodyHash !== expected.bodyHash ||
      entry.frontmatterHash !== actual.frontmatterHash ||
      entry.resourcesHash !== actual.resourcesHash ||
      entry.bodyChanged !== bodyChanged
    ) {
      throw new CampaignArtifactError("bundle_package_assembly_mismatch");
    }
  }
}

async function persistFailure(
  store: CampaignArtifactStore,
  runId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await store.writeJson("campaign-state.json", {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign-state",
    command: "package",
    runId,
    status: "failed",
    attemptedCells: 0,
    cells: [],
    error: message,
  });
  await store.writeJson("campaign.json", {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-campaign",
    command: "package",
    runId,
    status: "failed",
    error: message,
  });
}

export async function runBundlePackageCampaign(
  input: Readonly<{
    sourceRoot: string;
    artifactRoot: string;
    bundleManifestPath: string;
    evaluation?: unknown;
    runId?: string;
    dependencies?: Partial<BundlePackageDependencies>;
  }>,
): Promise<SkillAssemblyReceipt> {
  if (input.evaluation !== undefined) {
    throw new CampaignArtifactError("bundle_package_evidence_unsupported");
  }
  const bundle = await readBundleCandidateManifest(input.bundleManifestPath);
  const dependencies = {
    ...defaultBundlePackageDependencies,
    ...input.dependencies,
  };
  const runId = input.runId ?? randomUUID();
  const store = await CampaignArtifactStore.open({
    artifactRoot: input.artifactRoot,
    sourceRoot: input.sourceRoot,
  });
  try {
    const sourceFenceBefore = await dependencies.sourceFence(input.sourceRoot);
    const currentEntries = await Promise.all(
      CANONICAL_SKILLS.map(
        async (skill) =>
          [skill, await dependencies.surface(input.sourceRoot, skill)] as const,
      ),
    );
    const current = Object.fromEntries(currentEntries) as Record<
      CanonicalSkill,
      CampaignSourceSurface
    >;
    const selected = selectedSurfaces(bundle, current);
    if (
      !CANONICAL_SKILLS.some(
        (skill) => selected[skill].bodyHash !== sha256Text(current[skill].body),
      )
    ) {
      throw new CampaignArtifactError("bundle_no_improvement");
    }

    const workspace = join(
      store.root,
      `bundle-package-workspace-${randomUUID()}`,
    );
    await mkdir(workspace, { recursive: true, mode: 0o700 });
    const candidates = {} as Record<CanonicalSkill, SkillCandidateSurface>;
    for (const skill of CANONICAL_SKILLS) {
      candidates[skill] = {
        body: selected[skill].body,
        frontmatterHash: selected[skill].frontmatterHash,
        resourcesHash: selected[skill].resourcesHash,
      };
    }
    const receipt = await dependencies.assemble({
      sourceRepoRoot: input.sourceRoot,
      workspace,
      targetSkill: CANONICAL_SKILLS[0],
      baselineSurfaces: current,
      candidates,
    });
    verifyAssembly(receipt, workspace, current, selected);
    const sourceFenceAfter = await dependencies.sourceFence(input.sourceRoot);
    if (!sameFence(sourceFenceBefore, sourceFenceAfter))
      throw new CampaignArtifactError("bundle_package_source_fence_changed");

    const candidateSkills = bundle.bundle.entries
      .filter((entry) => entry.arm === "candidate")
      .map((entry) => entry.skill);
    const baselineSkills = bundle.bundle.entries
      .filter((entry) => entry.arm === "baseline")
      .map((entry) => entry.skill);
    await store.writeJson("package-receipt.json", {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-campaign-package",
      status: "ready-for-review",
      bundleManifestPath: resolve(input.bundleManifestPath),
      manifestReadiness: {
        valid: true,
        candidateSkills,
        baselineSkills,
        onlyCandidateBodiesChanged: CANONICAL_SKILLS.filter(
          (skill) =>
            selected[skill].bodyHash !== sha256Text(current[skill].body),
        ),
      },
      selection: CANONICAL_SKILLS.map((skill) => ({
        skill,
        arm: selected[skill].arm,
        bodyHash: selected[skill].bodyHash,
        baselineBodyHash: sha256Text(current[skill].body),
        frontmatterHash: selected[skill].frontmatterHash,
        resourcesHash: selected[skill].resourcesHash,
      })),
      evidenceValid: false,
      bundleEvaluation: "not-performed",
      productionAdoption: "not-performed",
      assembly: receipt,
    });
    await store.writeJson("campaign.json", {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-campaign",
      command: "package",
      runId,
      status: "complete",
    });
    return receipt;
  } catch (error) {
    await persistFailure(store, runId, error);
    throw error;
  } finally {
    await store.close();
  }
}
