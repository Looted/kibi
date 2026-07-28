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

export function validatePredicateEligibility(input: AutoAdoptionInput): void {
  const { candidate, eligibility } = input;
  if (eligibility.heldOutEligibility !== "eligible") {
    throw new AdoptionIntegrityError(
      "held-out predicate matrix is not eligible",
    );
  }
  if (eligibility.candidateHash !== candidate.bodyHash) {
    throw new AdoptionIntegrityError("eligibility candidate hash mismatch");
  }
  if (candidate.sourceRequestHash !== eligibility.signedEligibilityId) {
    throw new AdoptionIntegrityError("eligibility lineage checkpoint mismatch");
  }
  if (eligibility.lineage.candidateHash !== candidate.bodyHash) {
    throw new AdoptionIntegrityError("eligibility lineage candidate mismatch");
  }
  if (
    eligibility.lineage.signedEligibilityId !==
      eligibility.signedEligibilityId ||
    canonicalHash(eligibility.lineage.authorizedRootSet) !==
      canonicalHash(eligibility.authorizedRootSet)
  ) {
    throw new AdoptionIntegrityError("eligibility lineage root mismatch");
  }
}

export function deriveAdoptionId(
  eligibility: PredicateEligibilityReceipt,
  canonicalTargetSet: readonly string[],
): string {
  return canonicalHash({
    domain: "kibi.skillopt.predicate-adoption.v1",
    signedEligibilityId: eligibility.signedEligibilityId,
    candidateHash: eligibility.candidateHash,
    authorizedRootSet: eligibility.authorizedRootSet,
    canonicalTargetSet: [...canonicalTargetSet].sort(),
  });
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
