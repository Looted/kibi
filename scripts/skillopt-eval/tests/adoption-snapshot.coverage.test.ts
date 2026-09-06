// implements REQ-skillopt-automatic-adoption
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AdoptionIntegrityError,
  type AutoAdoptionInput,
  type ExternalAdoptionVerdict,
  type PredicateEligibilityReceipt,
} from "../adoption-types";
import {
  canonicalTargetSet,
  deriveAdoptionId,
  loadCanonicalSnapshot,
  loadCanonicalSurface,
  publicPlan,
  sealedPredicateEligibilityEvidence,
  validateExternalAdoptionVerdict,
  validatePredicateEligibility,
} from "../adoption-snapshot";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";
import {
  approvalArtifacts,
  automaticInput,
  baselineBody,
  candidateBody,
  cleanupRoots,
  createRepo,
  externalVerdict,
  frontmatter,
  resourceBody,
  sha256,
  skill,
} from "./fixtures/adoption-fixtures";

afterEach(cleanupRoots);

const CHECKPOINT = "a".repeat(64);

function eligibilityFor(
  input: AutoAdoptionInput,
  overrides: Record<string, unknown> = {},
): PredicateEligibilityReceipt {
  const lineage = {
    candidateHash: input.candidate.bodyHash,
    trainerCheckpointHash: CHECKPOINT,
    authorizedRootSet: input.eligibility.authorizedRootSet,
  };
  const base = {
    runId: "run-a",
    eligibilityReceiptId: "receipt-a",
    heldOutEligibility: "eligible" as const,
    candidateHash: input.candidate.bodyHash,
    authorizedRootSet: input.eligibility.authorizedRootSet,
    ...overrides,
    lineage: {
      ...lineage,
      ...((overrides.lineage as object | undefined) ?? {}),
    },
  };
  const { sealedEvidenceHash: _ignored, ...withoutSeal } = base as typeof base & {
    sealedEvidenceHash?: string;
  };
  return {
    ...withoutSeal,
    sealedEvidenceHash:
      typeof overrides.sealedEvidenceHash === "string"
        ? overrides.sealedEvidenceHash
        : sealedPredicateEligibilityEvidence(withoutSeal),
  };
}

function autoInput(): AutoAdoptionInput {
  return automaticInput(approvalArtifacts("/unused")) as unknown as AutoAdoptionInput;
}

describe("adoption-snapshot leftover branches", () => {
  test("validatePredicateEligibility rejects every incomplete receipt", () => {
    const input = autoInput();
    const valid = { ...input, eligibility: eligibilityFor(input) };
    expect(() => validatePredicateEligibility(valid)).not.toThrow();

    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, { eligibilityReceiptId: "" }),
      }),
    ).toThrow(/eligibility receipt ID is required/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: {
          ...eligibilityFor(input),
          eligibilityReceiptId: 1,
        } as never,
      }),
    ).toThrow(/eligibility receipt ID is required/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, { sealedEvidenceHash: "" }),
      }),
    ).toThrow(/sealed predicate evidence is required/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, {
          heldOutEligibility: "HELD_OUT_MATRIX_INELIGIBLE",
        }),
      }),
    ).toThrow(/held-out predicate matrix is not eligible/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, { candidateHash: "f".repeat(64) }),
      }),
    ).toThrow(/eligibility candidate hash mismatch/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, {
          sealedEvidenceHash: "0".repeat(64),
        }),
      }),
    ).toThrow(/sealed predicate evidence mismatch/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, {
          lineage: { trainerCheckpointHash: "b".repeat(64) },
        }),
      }),
    ).toThrow(/eligibility lineage checkpoint mismatch/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, {
          lineage: { candidateHash: "c".repeat(64) },
        }),
      }),
    ).toThrow(/eligibility lineage candidate mismatch/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, {
          lineage: {
            authorizedRootSet: {
              ...input.eligibility.authorizedRootSet,
              corpus: "9".repeat(64),
            },
          },
        }),
      }),
    ).toThrow(/eligibility lineage root mismatch/);
    expect(() =>
      validatePredicateEligibility({
        ...valid,
        eligibility: eligibilityFor(input, {
          lineage: { authorizedRootSet: undefined },
        }),
      }),
    ).toThrow(AdoptionIntegrityError);
  });

  test("validateExternalAdoptionVerdict covers required, mismatch, and reject paths", async () => {
    const repoRoot = await createRepo();
    const artifacts = approvalArtifacts(repoRoot);
    const input = automaticInput(artifacts) as unknown as AutoAdoptionInput;
    const snapshot = await loadCanonicalSurface({
      repoRoot,
      candidate: input.candidate,
      frontmatterHash: input.frontmatterHash,
      resourcesHash: input.resourcesHash,
    });
    const verdict = externalVerdict(input);
    await expect(
      validateExternalAdoptionVerdict(input, undefined, snapshot, async () => true),
    ).rejects.toThrow(/external adoption verdict is required/);
    await expect(
      validateExternalAdoptionVerdict(input, verdict, snapshot, undefined),
    ).rejects.toThrow(/verifier is required/);
    await expect(
      validateExternalAdoptionVerdict(
        input,
        { ...verdict, verdictId: "" },
        snapshot,
        async () => true,
      ),
    ).rejects.toThrow(/incomplete/);
    await expect(
      validateExternalAdoptionVerdict(
        input,
        { ...verdict, sourceCanonicalPreimageHash: "d".repeat(64) },
        snapshot,
        async () => true,
      ),
    ).rejects.toThrow(/canonical preimage mismatch/);
    await expect(
      validateExternalAdoptionVerdict(
        input,
        { ...verdict, candidateHash: "e".repeat(64) },
        snapshot,
        async () => true,
      ),
    ).rejects.toThrow(/candidate mismatch/);
    await expect(
      validateExternalAdoptionVerdict(
        input,
        { ...verdict, skill: "kibi-freshness" },
        snapshot,
        async () => true,
      ),
    ).rejects.toThrow(/candidate mismatch/);
    await expect(
      validateExternalAdoptionVerdict(
        input,
        { ...verdict, targetSet: ["packages/cli/src/public/skills/other.md"] },
        snapshot,
        async () => true,
      ),
    ).rejects.toThrow(/target set mismatch/);
    await expect(
      validateExternalAdoptionVerdict(input, verdict, snapshot, async () => false),
    ).rejects.toThrow(/verdict rejected/);

    const candidatePreimage: ExternalAdoptionVerdict = {
      ...verdict,
      sourceCanonicalPreimageHash: sha256(snapshot.candidateMarkdown),
    };
    await expect(
      validateExternalAdoptionVerdict(
        input,
        candidatePreimage,
        snapshot,
        async () => true,
      ),
    ).resolves.toBeUndefined();

    const unchangedCandidate = freezeCandidateVariant({
      skill,
      variant: "skillopt",
      body: baselineBody,
      frontmatterHash: input.frontmatterHash,
      resourcesHash: input.resourcesHash,
      provenance: "skillopt",
      sourceRequestHash: CHECKPOINT,
    });
    const unchanged = await loadCanonicalSurface({
      repoRoot,
      candidate: unchangedCandidate,
      frontmatterHash: input.frontmatterHash,
      resourcesHash: input.resourcesHash,
    });
    expect(unchanged.mutationRequired).toBe(false);
    await expect(
      validateExternalAdoptionVerdict(
        { ...input, candidate: unchangedCandidate },
        {
          ...verdict,
          candidateHash: unchangedCandidate.bodyHash,
          sourceCanonicalPreimageHash: "0".repeat(64),
        },
        unchanged,
        async () => true,
      ),
    ).resolves.toBeUndefined();
  });

  test("loadCanonicalSurface rejects surface mismatches and accepts tags/CRLF", async () => {
    const repoRoot = await createRepo();
    const artifacts = approvalArtifacts(repoRoot);
    const input = automaticInput(artifacts);

    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: createBaselineVariant({
          skill,
          body: baselineBody,
          frontmatterHash: input.frontmatterHash,
          resourcesHash: input.resourcesHash,
        }),
        frontmatterHash: input.frontmatterHash,
        resourcesHash: input.resourcesHash,
      }),
    ).rejects.toThrow(/requires skillopt candidate/);

    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: "1".repeat(64),
        resourcesHash: input.resourcesHash,
      }),
    ).rejects.toThrow(/candidate surface hash mismatch/);
    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: input.frontmatterHash,
        resourcesHash: "2".repeat(64),
      }),
    ).rejects.toThrow(/candidate surface hash mismatch/);

    await writeFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      `# no frontmatter\n${baselineBody}`,
    );
    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: input.frontmatterHash,
        resourcesHash: input.resourcesHash,
      }),
    ).rejects.toThrow(/canonical frontmatter is missing/);

    const tagged = `---\r\nid: ${skill}\r\nname: Kibi Usage\r\ndescription: Test fixture\r\nversion: 1.0.0\r\nkibiCompatibility: ">=0.1.0"\r\ntags:\r\n  - kibi\r\nresources:\r\n  - resources/workflows.md\r\n---\r\n`;
    await writeFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      tagged + baselineBody,
    );
    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: input.frontmatterHash,
        resourcesHash: input.resourcesHash,
      }),
    ).rejects.toThrow(/canonical frontmatter hash mismatch/);

    await writeFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      `${frontmatter}${baselineBody}`,
    );
    await writeFile(
      join(
        repoRoot,
        "packages/cli/src/public/skills/kibi-usage/resources/workflows.md",
      ),
      "changed resource\n",
    );
    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: input.frontmatterHash,
        resourcesHash: input.resourcesHash,
      }),
    ).rejects.toThrow(/canonical resource hash mismatch/);

    const mixedTags = `---\nid: ${skill}\nname: Kibi Usage\ndescription: Test fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.1.0"\ntags:\n  - 1\n  - kibi\nresources: not-an-array\n---\n`;
    await writeFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      mixedTags + baselineBody,
    );
    await expect(
      loadCanonicalSurface({
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: input.frontmatterHash,
        resourcesHash: input.resourcesHash,
      }),
    ).rejects.toThrow(AdoptionIntegrityError);
  });

  test("loadCanonicalSnapshot, publicPlan, target set, and adoption id", async () => {
    const repoRoot = await createRepo();
    const artifacts = approvalArtifacts(repoRoot);
    const snapshot = await loadCanonicalSnapshot(artifacts);
    expect(snapshot.skill).toBe(skill);
    expect(snapshot.mutationRequired).toBe(true);
    expect(publicPlan(snapshot)).toEqual({
      skill: snapshot.skill,
      canonicalPath: snapshot.canonicalPath,
      currentBodyHash: snapshot.currentBodyHash,
      candidateBodyHash: snapshot.candidateBodyHash,
      mutationRequired: snapshot.mutationRequired,
    });
    expect(canonicalTargetSet(repoRoot, snapshot)).toEqual(
      [
        "packages/cli/src/public/skills/kibi-usage/SKILL.md",
        "packages/codex/skills",
        "packages/cursor/skills",
      ].sort(),
    );
    const input = automaticInput(artifacts) as unknown as AutoAdoptionInput;
    const id = deriveAdoptionId(externalVerdict(input), [
      "packages/cursor/skills",
      "packages/cli/src/public/skills/kibi-usage/SKILL.md",
    ]);
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(candidateBody.length).toBeGreaterThan(0);
    expect(resourceBody.length).toBeGreaterThan(0);
    await mkdir(join(repoRoot, "unused"), { recursive: true });
  });
});
