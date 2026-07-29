import { afterEach, describe, expect, test } from "bun:test";
import { link, mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { adoptSkillOptCandidate } from "../adoption";
import {
  adoptionIdOf,
  automaticInput,
  baselineBody,
  cleanupRoots,
  createRepo,
  frontmatter,
  rootSet,
} from "./fixtures/adoption-once-fixtures";

afterEach(cleanupRoots);

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
    expect(attempt).rejects.toThrow("held-out predicate matrix");
    expect(
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
    expect(attempt).rejects.toThrow("eligibility lineage root mismatch");
    expect(
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
    expect(attempt).rejects.toThrow("eligibility candidate hash mismatch");
    expect(
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
    expect(attempt).rejects.toThrow("symlink");
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
    expect(attempt).rejects.toThrow("hardlink");
  });
});
