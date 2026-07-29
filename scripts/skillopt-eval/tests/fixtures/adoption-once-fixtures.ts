import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonicalize from "canonicalize";
import { freezeCandidateVariant } from "../../variants";

// executable_for TEST-skillopt-automatic-adoption
export const roots: string[] = [];
export const skill = "kibi-usage" as const;
export const frontmatter = `---\nid: ${skill}\nname: Kibi Usage\ndescription: Test fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.1.0"\nresources:\n  - resources/workflows.md\n---\n`;
export const baselineBody = "\n# Baseline\n";
export const candidateBody = "\n# Adopted candidate\n";
export const resourceBody = "workflow fixture\n";
const checkpointHash = "a".repeat(64);
const manifest = {
  id: skill,
  name: "Kibi Usage",
  description: "Test fixture",
  version: "1.0.0",
  kibiCompatibility: ">=0.1.0",
  resources: ["resources/workflows.md"],
};
export const rootSet = {
  corpus: "b".repeat(64),
  evaluator: "c".repeat(64),
  querySet: "d".repeat(64),
  baseline: "e".repeat(64),
  catalog: "f".repeat(64),
  verifier: "1".repeat(64),
  publicRoot: "2".repeat(64),
  privateRoot: "3".repeat(64),
  artifactSchema: "4".repeat(64),
};
export async function cleanupRoots(): Promise<void> {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
}
export async function createRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-adoption-once-"));
  roots.push(root);
  const canonical = join(root, "packages/cli/src/public/skills", skill);
  await mkdir(join(canonical, "resources"), { recursive: true });
  await writeFile(join(canonical, "SKILL.md"), frontmatter + baselineBody);
  await writeFile(join(canonical, "resources/workflows.md"), resourceBody);
  for (const target of ["cursor", "codex"] as const) {
    await mkdir(join(root, `packages/${target}/skills`), { recursive: true });
    await cp(
      join(root, "packages/cli/src/public/skills"),
      join(root, `packages/${target}/skills`),
      { recursive: true },
    );
  }
  return root;
}
function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new Error("fixture cannot be canonicalized");
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}
export function adoptionIdOf(receipt: {
  readonly adoptionId?: string;
}): string {
  if (receipt.adoptionId === undefined) throw new Error("missing adoption ID");
  return receipt.adoptionId;
}
export function automaticInput(
  repoRoot: string,
  heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE" = "eligible",
  runId = "run-a",
) {
  const candidate = freezeCandidateVariant({
    skill,
    variant: "skillopt",
    body: candidateBody,
    frontmatterHash: canonicalHash(manifest),
    resourcesHash: canonicalHash({ "resources/workflows.md": resourceBody }),
    provenance: "skillopt",
    sourceRequestHash: checkpointHash,
  });
  return {
    repoRoot,
    candidate,
    frontmatterHash: candidate.frontmatterHash,
    resourcesHash: candidate.resourcesHash,
    eligibility: {
      runId,
      signedEligibilityId: checkpointHash,
      heldOutEligibility,
      candidateHash: candidate.bodyHash,
      authorizedRootSet: rootSet,
      lineage: {
        candidateHash: candidate.bodyHash,
        signedEligibilityId: checkpointHash,
        authorizedRootSet: rootSet,
      },
    },
  };
}
