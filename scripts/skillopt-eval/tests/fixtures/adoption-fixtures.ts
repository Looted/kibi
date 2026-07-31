import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonicalize from "canonicalize";
import type {
  AutoAdoptionInput,
  ExternalAdoptionVerdict,
  RunMirrorSync,
} from "../../adoption";
import { JsonValueSchema, contractHash } from "../../contracts/common";
import { ApprovalSchema } from "../../contracts/review";
import { parseRunLockText, runLockHash } from "../../contracts/run-lock";
import { buildProposal } from "../../proposal";
import { buildReportArtifacts } from "../../report";
import { createBaselineVariant, freezeCandidateVariant } from "../../variants";

// executable_for TEST-skillopt-automatic-adoption
export const roots: string[] = [];
export const skill = "kibi-usage" as const;
const runLockFixture = join(import.meta.dir, "../fixtures/valid-run-lock.json");
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
} as const;
const predicateRoots = {
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
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new Error("fixture is not canonicalizable");
  return sha256(serialized);
}
export async function createRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-adoption-"));
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
export function approvalArtifacts(repoRoot: string) {
  const runLock = parseRunLockText(readFileSync(runLockFixture, "utf8"));
  const surface = {
    frontmatterHash: canonicalHash(manifest),
    resourcesHash: canonicalHash({ "resources/workflows.md": resourceBody }),
  };
  const baseline = createBaselineVariant({
    skill,
    body: baselineBody,
    ...surface,
  });
  const candidate = freezeCandidateVariant({
    skill,
    variant: "skillopt",
    body: candidateBody,
    provenance: "skillopt",
    ...surface,
  });
  const report = buildReportArtifacts({
    runId: runLock.runId,
    runLockHash: runLockHash(runLock),
    skill,
    cells: [{ score: 98 }],
    privateValues: [],
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 1,
      pricingHash: runLock.pricingHash,
      kind: "price-equivalent-estimate-not-invoice",
    },
    gateOutcome: "pass",
    gateResults: {
      aggregate: true,
      bootstrap: true,
      family: true,
      security: true,
      bundle: null,
    },
    generatedAt: "2026-07-23T12:01:00Z",
  }).report;
  const proposal = buildProposal({
    proposalId: "00000000-0000-4000-8000-000000000202",
    createdAt: "2026-07-23T12:02:00Z",
    report,
    baseline,
    candidate,
  });
  const approval = ApprovalSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "approval",
    approvalId: "00000000-0000-4000-8000-000000000203",
    proposalId: proposal.proposalId,
    proposalHash: contractHash(JsonValueSchema.parse(proposal)),
    runId: runLock.runId,
    runLockHash: runLockHash(runLock),
    reportHash: contractHash(JsonValueSchema.parse(report)),
    candidateBodyHash: candidate.bodyHash,
    reviewer: "reviewer@example.test",
    decision: "approved",
    decidedAt: "2026-07-23T12:03:00Z",
  });
  return { repoRoot, approval, proposal, candidate, runLock, report };
}
export function automaticInput(input: ReturnType<typeof approvalArtifacts>) {
  const candidate = freezeCandidateVariant({
    skill: input.candidate.skill,
    variant: "skillopt",
    body: input.candidate.body,
    frontmatterHash: input.candidate.frontmatterHash,
    resourcesHash: input.candidate.resourcesHash,
    provenance: "skillopt",
    sourceRequestHash: checkpointHash,
  });
  const eligibility = {
    runId: "run-a",
    signedEligibilityId: checkpointHash,
    heldOutEligibility: "eligible" as const,
    candidateHash: candidate.bodyHash,
    authorizedRootSet: predicateRoots,
    lineage: {
      candidateHash: candidate.bodyHash,
      signedEligibilityId: checkpointHash,
      authorizedRootSet: predicateRoots,
    },
  };
  return {
    repoRoot: input.repoRoot,
    candidate,
    frontmatterHash: candidate.frontmatterHash,
    resourcesHash: candidate.resourcesHash,
    eligibility: {
      ...eligibility,
      sealedEvidenceHash: canonicalHash(eligibility),
    },
  };
}
export function externalVerdict(
  input: AutoAdoptionInput,
): ExternalAdoptionVerdict {
  return {
    verdictId: "external-verdict-a",
    authentication: "test-external-authentication",
    sourceCanonicalPreimageHash: sha256(frontmatter + baselineBody),
    rootAuthorization: input.eligibility.authorizedRootSet,
    supervisorParentId: "supervisor-parent-a",
    invocationId: "invocation-a",
    runId: input.eligibility.runId,
    skill: input.candidate.skill,
    matrixId: "held-out-matrix-a",
    fixtureClaimHash: "5".repeat(64),
    candidateHash: input.candidate.bodyHash,
    terminalEvidenceHash: input.eligibility.sealedEvidenceHash,
    targetSet: [
      "packages/cli/src/public/skills/kibi-usage/SKILL.md",
      "packages/cursor/skills",
      "packages/codex/skills",
    ],
  };
}
export async function snapshot(repoRoot: string): Promise<readonly string[]> {
  return Promise.all(
    [
      "packages/cli/src/public/skills/kibi-usage/SKILL.md",
      "packages/cli/src/public/skills/kibi-usage/resources/workflows.md",
      "packages/cursor/skills/kibi-usage/SKILL.md",
      "packages/cursor/skills/kibi-usage/resources/workflows.md",
      "packages/codex/skills/kibi-usage/SKILL.md",
      "packages/codex/skills/kibi-usage/resources/workflows.md",
    ].map((path) => readFile(join(repoRoot, path), "utf8")),
  );
}
export const syncMirrors: RunMirrorSync = async (repoRoot) => {
  for (const target of ["cursor", "codex"] as const) {
    const mirror = join(repoRoot, `packages/${target}/skills`);
    await rm(mirror, { recursive: true, force: true });
    await cp(join(repoRoot, "packages/cli/src/public/skills"), mirror, {
      recursive: true,
    });
  }
};
