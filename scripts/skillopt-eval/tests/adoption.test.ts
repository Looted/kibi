import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type RunMirrorSync,
  adoptApprovedSkill,
  adoptSkillOptCandidate,
  planSkillAdoption,
} from "../adoption";
import {
  approvalArtifacts,
  automaticInput,
  baselineBody,
  candidateBody,
  cleanupRoots,
  createRepo,
  frontmatter,
  resourceBody,
  sha256,
  skill,
  snapshot,
  syncMirrors,
} from "./fixtures/adoption-fixtures";

afterEach(cleanupRoots);
describe("SkillOpt adoption transaction", () => {
  test("Given exact approved artifacts When adoption is planned Then dry-run reports the replacement without mutation", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    const before = await snapshot(repoRoot);
    const plan = await planSkillAdoption(input);
    expect(plan).toMatchObject({
      skill,
      currentBodyHash: sha256(baselineBody),
      candidateBodyHash: sha256(candidateBody),
      mutationRequired: true,
    });
    expect(await snapshot(repoRoot)).toEqual(before);
  });
  test("Given stale canonical surfaces When adoption is planned Then exact-hash validation rejects before mutation", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    await writeFile(
      join(
        repoRoot,
        "packages/cli/src/public/skills/kibi-usage/resources/workflows.md",
      ),
      "stale resource\n",
    );
    const before = await snapshot(repoRoot);
    expect(planSkillAdoption(input)).rejects.toThrow(
      "canonical resource hash mismatch",
    );
    expect(await snapshot(repoRoot)).toEqual(before);
  });
  test("Given approval for a different candidate hash When adoption is planned Then validation rejects before mutation", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    const before = await snapshot(repoRoot);
    expect(
      planSkillAdoption({
        ...input,
        approval: { ...input.approval, candidateBodyHash: "9".repeat(64) },
      }),
    ).rejects.toThrow("approval artifact hash mismatch");
    expect(await snapshot(repoRoot)).toEqual(before);
  });
  test("Given exact approved artifacts When adopted Then only the canonical body changes and mirrors are regenerated", async () => {
    const repoRoot = await createRepo();
    const receipt = await adoptApprovedSkill(approvalArtifacts(repoRoot), {
      runMirrorSync: syncMirrors,
    });
    expect(receipt).toMatchObject({ skill, status: "adopted" });
    expect(await snapshot(repoRoot)).toEqual([
      frontmatter + candidateBody,
      resourceBody,
      frontmatter + candidateBody,
      resourceBody,
      frontmatter + candidateBody,
      resourceBody,
    ]);
  });
  test("Given a safety-passing SkillOpt candidate When auto-adopted Then canonical and mirrors change transactionally", async () => {
    const repoRoot = await createRepo();
    const receipt = await adoptSkillOptCandidate(
      automaticInput(approvalArtifacts(repoRoot)),
      { runMirrorSync: syncMirrors },
    );
    expect(receipt).toMatchObject({ skill, status: "adopted" });
    expect(
      await Bun.file(
        join(repoRoot, "packages/cursor/skills/kibi-usage/SKILL.md"),
      ).text(),
    ).toBe(frontmatter + candidateBody);
  });
  test("Given caller-supplied eligible fields without a sealed matrix receipt When auto-adopted Then adoption is refused", async () => {
    const repoRoot = await createRepo();
    const forged = automaticInput(approvalArtifacts(repoRoot));
    expect(
      adoptSkillOptCandidate(
        {
          ...forged,
          eligibility: {
            ...forged.eligibility,
            sealedEvidenceHash: "f".repeat(64),
          },
        },
        { runMirrorSync: syncMirrors },
      ),
    ).rejects.toThrow(/sealed|evidence|matrix/i);
    expect(await snapshot(repoRoot)).toContain(frontmatter + baselineBody);
  });
  test("Given a candidate that drops canonical safety guidance When auto-adopted Then adoption is blocked", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    await writeFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      `${frontmatter}npx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside \`.kb\` directly\n`,
    );
    const receipt = await adoptSkillOptCandidate(automaticInput(input), {
      runMirrorSync: syncMirrors,
    });
    expect(receipt.status).toBe("blocked");
    expect(
      await Bun.file(
        join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      ).text(),
    ).toContain("npx --no-install kibi");
  });
  test("Given mirror sync fails after partial output When adopted Then rollback leaves zero canonical or mirror mutation", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    const before = await snapshot(repoRoot);
    const failingSync: RunMirrorSync = async (root) => {
      const cursorRoot = join(root, "packages/cursor/skills");
      await rm(cursorRoot, { recursive: true, force: true });
      await mkdir(join(cursorRoot, "kibi-usage"), { recursive: true });
      await writeFile(
        join(cursorRoot, "kibi-usage/SKILL.md"),
        "partial mirror mutation",
      );
      throw new Error("injected sync failure");
    };
    expect(
      adoptApprovedSkill(input, { runMirrorSync: failingSync }),
    ).rejects.toThrow("adoption transaction failed");
    expect(await snapshot(repoRoot)).toEqual(before);
  });
});
