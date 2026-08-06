import { afterEach, describe, expect, test } from "bun:test";
import { link, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { adoptSkillOptCandidate } from "../adoption";
import { sealedPredicateEligibilityEvidence } from "../adoption-snapshot";
import {
  adoptionIdOf,
  baselineBody,
  cleanupRoots,
  createRepo,
  externalVerdict,
  frontmatter,
  automaticInput as legacyAutomaticInput,
  rootSet,
} from "./fixtures/adoption-once-fixtures";

afterEach(cleanupRoots);

function adopt(
  input: ReturnType<typeof automaticInput>,
  dependencies: NonNullable<Parameters<typeof adoptSkillOptCandidate>[2]>,
) {
  return adoptSkillOptCandidate(input, externalVerdict(input), {
    ...dependencies,
    verifyExternalAdoptionVerdict: async () => true,
  });
}

function automaticInput(
  repoRoot: string,
  heldOutEligibility: "eligible" | "HELD_OUT_MATRIX_INELIGIBLE" = "eligible",
  runId = "run-a",
) {
  const input = legacyAutomaticInput(repoRoot, heldOutEligibility, runId);
  const legacy = input.eligibility;
  const eligibility = {
    runId: legacy.runId,
    eligibilityReceiptId: "terminal-receipt-a",
    heldOutEligibility: legacy.heldOutEligibility,
    candidateHash: legacy.candidateHash,
    authorizedRootSet: legacy.authorizedRootSet,
    lineage: {
      candidateHash: legacy.lineage.candidateHash,
      trainerCheckpointHash: legacy.lineage.signedEligibilityId,
      authorizedRootSet: legacy.lineage.authorizedRootSet,
    },
  };
  return {
    ...input,
    eligibility: {
      ...eligibility,
      sealedEvidenceHash: sealedPredicateEligibilityEvidence(eligibility),
    },
  };
}

describe("exactly-once predicate candidate adoption", () => {
  test("Given local held-out evidence When production adoption is requested without a verdict Then it rejects before mutating the canonical skill", async () => {
    // Given
    const repoRoot = await createRepo();
    const input = automaticInput(repoRoot, "HELD_OUT_MATRIX_INELIGIBLE");

    // When
    const attempt = adoptSkillOptCandidate(input, undefined, {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow(
      "external adoption verdict is required",
    );
    await expect(
      Bun.file(
        join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      ).text(),
    ).resolves.toBe(frontmatter + baselineBody);
  });

  test("Given locally modified root evidence When production adoption is requested without a verdict Then it cannot create a WAL", async () => {
    // Given
    const repoRoot = await createRepo();
    const input = automaticInput(repoRoot);
    const differentRoots = { ...rootSet, corpus: "0".repeat(64) };
    const mismatched = {
      ...input,
      eligibility: {
        ...input.eligibility,
        lineage: {
          ...input.eligibility.lineage,
          authorizedRootSet: differentRoots,
        },
      },
    };

    // When
    const attempt = adoptSkillOptCandidate(mismatched, undefined, {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow(
      "external adoption verdict is required",
    );
    await expect(
      Bun.file(join(repoRoot, ".kibi/adoption-wals")).exists(),
    ).resolves.toBe(false);
  });

  test("Given locally modified candidate evidence When production adoption is requested without a verdict Then it cannot create a WAL", async () => {
    // Given
    const repoRoot = await createRepo();
    const input = automaticInput(repoRoot);
    const mismatched = {
      ...input,
      eligibility: { ...input.eligibility, candidateHash: "0".repeat(64) },
    };

    // When
    const attempt = adoptSkillOptCandidate(mismatched, undefined, {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow(
      "external adoption verdict is required",
    );
    await expect(
      Bun.file(join(repoRoot, ".kibi/adoption-wals")).exists(),
    ).resolves.toBe(false);
  });

  test("Given verdicts from different runs When the same candidate is adopted Then their authorization IDs remain distinct", async () => {
    // Given
    const firstRepo = await createRepo();
    const secondRepo = await createRepo();

    // When
    const first = await adopt(automaticInput(firstRepo), {
      runMirrorSync: async () => {},
    });
    const second = await adopt(
      automaticInput(secondRepo, "eligible", "run-b"),
      { runMirrorSync: async () => {} },
    );

    // Then
    expect("adoptionId" in first).toBe(true);
    expect("adoptionId" in second).toBe(true);
    expect(adoptionIdOf(first)).not.toBe(adoptionIdOf(second));
  });

  test("Given repeated automatic adoption calls When the first transaction finishes Then one terminal WAL and identical receipt are reused", async () => {
    // Given
    const repoRoot = await createRepo();
    let mirrorSyncs = 0;
    const dependencies = {
      runMirrorSync: async () => {
        mirrorSyncs += 1;
      },
    };

    // When
    const first = await adopt(automaticInput(repoRoot), dependencies);
    const second = await adopt(automaticInput(repoRoot), dependencies);

    // Then
    const walEntries = await readdir(join(repoRoot, ".kibi/adoption-wals"));
    expect(mirrorSyncs).toBe(1);
    expect(walEntries).toEqual([adoptionIdOf(first)]);
    expect(
      await Bun.file(
        join(
          repoRoot,
          ".kibi/adoption-wals",
          adoptionIdOf(first),
          "terminal.json",
        ),
      ).exists(),
    ).toBe(true);
    expect(second).toEqual(first);
  });

  test("Given concurrent automatic adoption calls When one candidate is authorized Then a single mirror swap and terminal receipt win", async () => {
    // Given
    const repoRoot = await createRepo();
    let mirrorSyncs = 0;
    const dependencies = {
      runMirrorSync: async () => {
        mirrorSyncs += 1;
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
      },
    };

    // When
    const receipts = await Promise.all(
      Array.from({ length: 4 }, () =>
        adopt(automaticInput(repoRoot), dependencies),
      ),
    );

    // Then
    expect(mirrorSyncs).toBe(1);
    expect(new Set(receipts.map(adoptionIdOf)).size).toBe(1);
    expect(
      new Set(receipts.map((receipt) => JSON.stringify(receipt))).size,
    ).toBe(1);
  });

  test("Given a symlinked canonical skill file When automatic adoption is requested Then it rejects without following the link", async () => {
    // Given
    const repoRoot = await createRepo();
    const canonical = join(
      repoRoot,
      "packages/cli/src/public/skills/kibi-usage/SKILL.md",
    );
    const outside = join(repoRoot, "outside-skill.md");
    await writeFile(outside, frontmatter + baselineBody);
    await rm(canonical);
    await symlink(outside, canonical);

    // When
    const attempt = adopt(automaticInput(repoRoot), {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow("symlink");
  });

  test("Given a hardlinked canonical skill file When automatic adoption is requested Then it rejects inode aliasing", async () => {
    // Given
    const repoRoot = await createRepo();
    const canonical = join(
      repoRoot,
      "packages/cli/src/public/skills/kibi-usage/SKILL.md",
    );
    const outside = join(repoRoot, "outside-skill.md");
    await writeFile(outside, frontmatter + baselineBody);
    await rm(canonical);
    await link(outside, canonical);

    // When
    const attempt = adopt(automaticInput(repoRoot), {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow("hardlink");
  });
});
