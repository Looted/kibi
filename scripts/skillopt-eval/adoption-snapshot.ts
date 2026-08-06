import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { YAML } from "bun";
import canonicalize from "canonicalize";
import { z } from "zod";
import { type FileIdentity, readSecureFile } from "./adoption-durable";
import {
  type AdoptionInput,
  AdoptionIntegrityError,
  type AdoptionPlan,
  type AutoAdoptionInput,
  type ExternalAdoptionVerdict,
  type ExternalAdoptionVerdictVerifier,
  type PredicateEligibilityReceipt,
} from "./adoption-types";
import { validateApproval } from "./approval";
import { validateCandidateBody } from "./variants";

export type CanonicalSnapshot = AdoptionPlan &
  Readonly<{
    markdown: string;
    frontmatter: string;
    candidateMarkdown: string;
    canonicalIdentity: FileIdentity;
  }>;

type CanonicalSurfaceInput = Omit<AutoAdoptionInput, "eligibility">;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) {
    throw new AdoptionIntegrityError("canonical skill surface is invalid");
  }
  return sha256(serialized);
}

function stringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
    ? value
    : undefined;
}

function canonicalManifest(data: Record<string, unknown>) {
  const resources = stringArray(data.resources);
  const tags = stringArray(data.tags);
  return {
    manifest: {
      id: String(data.id),
      name: String(data.name),
      description: String(data.description),
      version: String(data.version),
      kibiCompatibility: String(data.kibiCompatibility),
      ...(tags === undefined ? {} : { tags }),
      ...(resources === undefined ? {} : { resources }),
    },
    resources: resources ?? [],
  };
}

// implements REQ-skillopt-automatic-adoption
export function validatePredicateEligibility(input: AutoAdoptionInput): void {
  const { candidate, eligibility } = input;
  if (
    typeof eligibility.eligibilityReceiptId !== "string" ||
    eligibility.eligibilityReceiptId.length === 0
  ) {
    throw new AdoptionIntegrityError("eligibility receipt ID is required");
  }
  if (
    typeof eligibility.sealedEvidenceHash !== "string" ||
    eligibility.sealedEvidenceHash.length === 0
  ) {
    throw new AdoptionIntegrityError("sealed predicate evidence is required");
  }
  if (eligibility.heldOutEligibility !== "eligible") {
    throw new AdoptionIntegrityError(
      "held-out predicate matrix is not eligible",
    );
  }
  if (eligibility.candidateHash !== candidate.bodyHash) {
    throw new AdoptionIntegrityError("eligibility candidate hash mismatch");
  }
  const sealedEvidenceHash = sealedPredicateEligibilityEvidence(eligibility);
  if (eligibility.sealedEvidenceHash !== sealedEvidenceHash) {
    throw new AdoptionIntegrityError("sealed predicate evidence mismatch");
  }
  if (
    candidate.sourceRequestHash !== eligibility.lineage.trainerCheckpointHash
  ) {
    throw new AdoptionIntegrityError("eligibility lineage checkpoint mismatch");
  }
  if (eligibility.lineage.candidateHash !== candidate.bodyHash) {
    throw new AdoptionIntegrityError("eligibility lineage candidate mismatch");
  }
  if (
    canonicalHash(eligibility.lineage.authorizedRootSet) !==
    canonicalHash(eligibility.authorizedRootSet)
  ) {
    throw new AdoptionIntegrityError("eligibility lineage root mismatch");
  }
}

export function sealedPredicateEligibilityEvidence(
  eligibility: Omit<PredicateEligibilityReceipt, "sealedEvidenceHash">,
): string {
  return canonicalHash({
    runId: eligibility.runId,
    eligibilityReceiptId: eligibility.eligibilityReceiptId,
    heldOutEligibility: eligibility.heldOutEligibility,
    candidateHash: eligibility.candidateHash,
    authorizedRootSet: eligibility.authorizedRootSet,
    lineage: eligibility.lineage,
  });
}

export function deriveAdoptionId(
  verdict: ExternalAdoptionVerdict,
  canonicalTargetSet: readonly string[],
): string {
  return canonicalHash({
    domain: "kibi.skillopt.predicate-adoption.v1",
    verdictId: verdict.verdictId,
    sourceCanonicalPreimageHash: verdict.sourceCanonicalPreimageHash,
    candidateHash: verdict.candidateHash,
    rootAuthorization: verdict.rootAuthorization,
    supervisorParentId: verdict.supervisorParentId,
    invocationId: verdict.invocationId,
    runId: verdict.runId,
    skill: verdict.skill,
    matrixId: verdict.matrixId,
    fixtureClaimHash: verdict.fixtureClaimHash,
    terminalEvidenceHash: verdict.terminalEvidenceHash,
    canonicalTargetSet: [...canonicalTargetSet].sort(),
  });
}

export async function validateExternalAdoptionVerdict(
  input: Omit<AutoAdoptionInput, "eligibility">,
  verdict: ExternalAdoptionVerdict | undefined,
  snapshot: CanonicalSnapshot,
  verify: ExternalAdoptionVerdictVerifier | undefined,
): Promise<void> {
  if (verdict === undefined)
    throw new AdoptionIntegrityError("external adoption verdict is required");
  if (verify === undefined)
    throw new AdoptionIntegrityError(
      "external adoption verdict verifier is required",
    );
  if (
    verdict.verdictId.length === 0 ||
    verdict.authentication.length === 0 ||
    verdict.supervisorParentId.length === 0 ||
    verdict.invocationId.length === 0 ||
    verdict.runId.length === 0 ||
    verdict.matrixId.length === 0 ||
    verdict.fixtureClaimHash.length === 0 ||
    verdict.terminalEvidenceHash.length === 0
  ) {
    throw new AdoptionIntegrityError("external adoption verdict is incomplete");
  }
  const currentPreimageHash = sha256(snapshot.markdown);
  if (
    snapshot.mutationRequired &&
    verdict.sourceCanonicalPreimageHash !== currentPreimageHash &&
    verdict.sourceCanonicalPreimageHash !== sha256(snapshot.candidateMarkdown)
  ) {
    throw new AdoptionIntegrityError(
      "external adoption verdict canonical preimage mismatch",
    );
  }
  if (
    verdict.candidateHash !== input.candidate.bodyHash ||
    verdict.skill !== input.candidate.skill
  ) {
    throw new AdoptionIntegrityError(
      "external adoption verdict candidate mismatch",
    );
  }
  const targetSet = canonicalTargetSet(input.repoRoot, snapshot);
  if (
    canonicalHash([...verdict.targetSet].sort()) !==
    canonicalHash([...targetSet].sort())
  ) {
    throw new AdoptionIntegrityError(
      "external adoption verdict target set mismatch",
    );
  }
  if (!(await verify(verdict)))
    throw new AdoptionIntegrityError("external adoption verdict rejected");
}

export function canonicalTargetSet(
  repoRoot: string,
  snapshot: CanonicalSnapshot,
): readonly string[] {
  return [
    relative(repoRoot, snapshot.canonicalPath),
    "packages/cursor/skills",
    "packages/codex/skills",
  ].sort();
}

export async function loadCanonicalSnapshot(
  input: AdoptionInput,
): Promise<CanonicalSnapshot> {
  validateApproval(input);
  return loadCanonicalSurface({
    repoRoot: input.repoRoot,
    candidate: input.candidate,
    frontmatterHash: input.candidate.frontmatterHash,
    resourcesHash: input.candidate.resourcesHash,
  });
}

export async function loadCanonicalSurface(
  input: CanonicalSurfaceInput,
): Promise<CanonicalSnapshot> {
  if (input.candidate.variant !== "skillopt") {
    throw new AdoptionIntegrityError(
      "automatic adoption requires skillopt candidate",
    );
  }
  if (
    input.candidate.frontmatterHash !== input.frontmatterHash ||
    input.candidate.resourcesHash !== input.resourcesHash
  ) {
    throw new AdoptionIntegrityError("candidate surface hash mismatch");
  }
  validateCandidateBody(input.candidate.body);
  const canonicalPath = join(
    input.repoRoot,
    "packages/cli/src/public/skills",
    input.candidate.skill,
    "SKILL.md",
  );
  const canonical = await readSecureFile(input.repoRoot, canonicalPath);
  const markdown = canonical.bytes.toString("utf8");
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (frontmatterMatch === null) {
    throw new AdoptionIntegrityError("canonical frontmatter is missing");
  }
  const frontmatter = frontmatterMatch[0];
  const frontmatterData = z
    .record(z.string(), z.unknown())
    .parse(YAML.parse(frontmatterMatch[1] ?? ""));
  const body = markdown.slice(frontmatter.length);
  const { manifest, resources } = canonicalManifest(frontmatterData);
  const canonicalResources = Object.fromEntries(
    await Promise.all(
      [...resources]
        .sort()
        .map(async (resource) => [
          resource,
          (
            await readSecureFile(
              input.repoRoot,
              join(dirname(canonicalPath), resource),
            )
          ).bytes.toString("utf8"),
        ]),
    ),
  );
  const frontmatterHash = canonicalHash(manifest);
  const resourcesHash = canonicalHash(canonicalResources);
  if (
    frontmatterHash !== input.frontmatterHash ||
    frontmatterHash !== input.candidate.frontmatterHash
  ) {
    throw new AdoptionIntegrityError("canonical frontmatter hash mismatch");
  }
  if (
    resourcesHash !== input.resourcesHash ||
    resourcesHash !== input.candidate.resourcesHash
  ) {
    throw new AdoptionIntegrityError("canonical resource hash mismatch");
  }
  return {
    skill: input.candidate.skill,
    canonicalPath,
    currentBodyHash: sha256(body),
    candidateBodyHash: input.candidate.bodyHash,
    mutationRequired: body !== input.candidate.body,
    markdown,
    frontmatter,
    candidateMarkdown: frontmatter + input.candidate.body,
    canonicalIdentity: canonical.identity,
  };
}

export function publicPlan(snapshot: CanonicalSnapshot): AdoptionPlan {
  return {
    skill: snapshot.skill,
    canonicalPath: snapshot.canonicalPath,
    currentBodyHash: snapshot.currentBodyHash,
    candidateBodyHash: snapshot.candidateBodyHash,
    mutationRequired: snapshot.mutationRequired,
  };
}
