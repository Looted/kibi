import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type RunMirrorSync,
  adoptApprovedSkill,
  adoptSkillOptCandidate,
  planSkillAdoption,
} from "../adoption";
import { sealedPredicateEligibilityEvidence } from "../adoption-snapshot";
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
  snapshot,
  syncMirrors,
} from "./fixtures/adoption-fixtures";

afterEach(cleanupRoots);

async function adopt(
  input: ReturnType<typeof terminalInput>,
  dependencies: NonNullable<Parameters<typeof adoptSkillOptCandidate>[2]>,
) {
  return adoptSkillOptCandidate(input, externalVerdict(input), {
    ...dependencies,
    verifyExternalAdoptionVerdict: async () => true,
  });
}

function terminalInput(input: ReturnType<typeof automaticInput>) {
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
    await expect(planSkillAdoption(input)).rejects.toThrow(
      "canonical resource hash mismatch",
    );
    expect(await snapshot(repoRoot)).toEqual(before);
  });
  test("Given approval for a different candidate hash When adoption is planned Then validation rejects before mutation", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    const before = await snapshot(repoRoot);
    await expect(
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
  test("Given a local eligibility receipt without an external verdict When adoption is requested Then canonical and mirrors remain unchanged", async () => {
    const repoRoot = await createRepo();
    const before = await snapshot(repoRoot);
    await expect(
      adoptSkillOptCandidate(
        terminalInput(automaticInput(approvalArtifacts(repoRoot))),
        undefined,
        { runMirrorSync: syncMirrors },
      ),
    ).rejects.toThrow("external adoption verdict is required");
    expect(await snapshot(repoRoot)).toEqual(before);
  });
  test("Given an authenticated external verdict When a SkillOpt candidate is adopted Then canonical and mirrors change transactionally", async () => {
    const repoRoot = await createRepo();
    const receipt = await adopt(
      terminalInput(automaticInput(approvalArtifacts(repoRoot))),
      { runMirrorSync: syncMirrors },
    );
    expect(receipt).toMatchObject({ skill, status: "adopted" });
    await expect(
      await Bun.file(
        join(repoRoot, "packages/cursor/skills/kibi-usage/SKILL.md"),
      ).text(),
    ).toBe(frontmatter + candidateBody);
  });
  test("Given a tampered authenticated verdict When adoption is requested Then it fails closed", async () => {
    const repoRoot = await createRepo();
    const input = terminalInput(automaticInput(approvalArtifacts(repoRoot)));
    await expect(
      adoptSkillOptCandidate(
        input,
        { ...externalVerdict(input), candidateHash: "f".repeat(64) },
        {
          runMirrorSync: syncMirrors,
          verifyExternalAdoptionVerdict: async () => true,
        },
      ),
    ).rejects.toThrow("external adoption verdict candidate mismatch");
    expect(await snapshot(repoRoot)).toContain(frontmatter + baselineBody);
  });
  test("Given an approved adoption holding the exclusive lock When canonical planning starts Then the planner waits for the post-adoption snapshot", async () => {
    // Given
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    let plannerFinished = false;
    let planner:
      | Promise<Awaited<ReturnType<typeof planSkillAdoption>>>
      | undefined;

    // When
    const receipt = await adoptApprovedSkill(input, {
      runMirrorSync: async () => {
        planner = planSkillAdoption(input).finally(() => {
          plannerFinished = true;
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 25));
        expect(plannerFinished).toBe(false);
        await syncMirrors(repoRoot);
      },
    });

    // Then
    expect(receipt.status).toBe("adopted");
    if (planner === undefined) throw new Error("planner was not started");
    await expect(planner).resolves.toMatchObject({ mutationRequired: false });
  });
  test("Given a candidate that drops canonical safety guidance When auto-adopted Then adoption is blocked", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    await writeFile(
      join(repoRoot, "packages/cli/src/public/skills/kibi-usage/SKILL.md"),
      `${frontmatter}npx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside \`.kb\` directly\n`,
    );
    const changedCanonical = `${frontmatter}npx --no-install kibi\nbunx --no-install kibi\nDo not read or edit files inside \`.kb\` directly\n`;
    const candidate = terminalInput(automaticInput(input));
    const receipt = await adoptSkillOptCandidate(
      candidate,
      {
        ...externalVerdict(candidate),
        sourceCanonicalPreimageHash: sha256(changedCanonical),
      },
      {
        runMirrorSync: syncMirrors,
        verifyExternalAdoptionVerdict: async () => true,
      },
    );
    expect(receipt.status).toBe("blocked");
    await expect(
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
    await expect(
      adoptApprovedSkill(input, { runMirrorSync: failingSync }),
    ).rejects.toThrow("adoption transaction failed");
    expect(await snapshot(repoRoot)).toEqual(before);
  });
});
