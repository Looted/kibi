import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  cp,
  link,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonicalize from "canonicalize";
import { adoptSkillOptCandidate } from "../adoption";
import { freezeCandidateVariant } from "../variants";

const roots: string[] = [];
const skill = "kibi-usage" as const;
const frontmatter = `---\nid: ${skill}\nname: Kibi Usage\ndescription: Test fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.1.0"\nresources:\n  - resources/workflows.md\n---\n`;
const baselineBody = "\n# Baseline\n";
const candidateBody = "\n# Adopted candidate\n";
const resourceBody = "workflow fixture\n";
const checkpointHash = "a".repeat(64);
const manifest = {
  id: skill,
  name: "Kibi Usage",
  description: "Test fixture",
  version: "1.0.0",
  kibiCompatibility: ">=0.1.0",
  resources: ["resources/workflows.md"],
};
const rootSet = {
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

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function createRepo(): Promise<string> {
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

function adoptionIdOf(receipt: { readonly adoptionId?: string }): string {
  if (receipt.adoptionId === undefined) throw new Error("missing adoption ID");
  return receipt.adoptionId;
}

function automaticInput(
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

describe("exactly-once predicate candidate adoption", () => {
  test("Given an ineligible held-out receipt When automatic adoption is requested Then it rejects before mutating the canonical skill", async () => {
    // Given
    const repoRoot = await createRepo();
    const input = automaticInput(repoRoot, "HELD_OUT_MATRIX_INELIGIBLE");

    // When
    const attempt = adoptSkillOptCandidate(input, {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow("held-out predicate matrix");
    await expect(
      Bun.file(
        join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      ).text(),
    ).resolves.toBe(frontmatter + baselineBody);
  });

  test("Given receipt lineage that names a different corpus root set When automatic adoption is requested Then it rejects before creating a WAL", async () => {
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
    const attempt = adoptSkillOptCandidate(mismatched, {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow("eligibility lineage root mismatch");
    await expect(
      Bun.file(join(repoRoot, ".kibi/adoption-wals")).exists(),
    ).resolves.toBe(false);
  });

  test("Given an eligibility receipt for a different candidate hash When automatic adoption is requested Then it rejects before creating a WAL", async () => {
    // Given
    const repoRoot = await createRepo();
    const input = automaticInput(repoRoot);
    const mismatched = {
      ...input,
      eligibility: { ...input.eligibility, candidateHash: "0".repeat(64) },
    };

    // When
    const attempt = adoptSkillOptCandidate(mismatched, {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow(
      "eligibility candidate hash mismatch",
    );
    await expect(
      Bun.file(join(repoRoot, ".kibi/adoption-wals")).exists(),
    ).resolves.toBe(false);
  });

  test("Given retries from different run IDs When the same authorized candidate is adopted Then they resolve to one stable adoption ID", async () => {
    // Given
    const firstRepo = await createRepo();
    const secondRepo = await createRepo();

    // When
    const first = await adoptSkillOptCandidate(automaticInput(firstRepo), {
      runMirrorSync: async () => {},
    });
    const second = await adoptSkillOptCandidate(
      automaticInput(secondRepo, "eligible", "run-b"),
      { runMirrorSync: async () => {} },
    );

    // Then
    expect("adoptionId" in first).toBe(true);
    expect("adoptionId" in second).toBe(true);
    expect(adoptionIdOf(first)).toBe(adoptionIdOf(second));
  });

  test("Given repeated automatic adoption calls When the first transaction finishes Then one terminal WAL and identical receipt are reused", async () => {
    // Given
    const repoRoot = await createRepo();
    await mkdir(join(repoRoot, ".kibi/adoption-wals"), { recursive: true });
    let mirrorSyncs = 0;
    const dependencies = {
      runMirrorSync: async () => {
        mirrorSyncs += 1;
      },
    };

    // When
    const first = await adoptSkillOptCandidate(
      automaticInput(repoRoot),
      dependencies,
    );
    const second = await adoptSkillOptCandidate(
      automaticInput(repoRoot),
      dependencies,
    );

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
        adoptSkillOptCandidate(automaticInput(repoRoot), dependencies),
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
    const attempt = adoptSkillOptCandidate(automaticInput(repoRoot), {
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
    const attempt = adoptSkillOptCandidate(automaticInput(repoRoot), {
      runMirrorSync: async () => {},
    });

    // Then
    await expect(attempt).rejects.toThrow("hardlink");
  });
});
