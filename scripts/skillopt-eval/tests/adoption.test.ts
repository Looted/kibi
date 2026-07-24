import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonicalize from "canonicalize";
import {
  type RunMirrorSync,
  adoptApprovedSkill,
  adoptSkillOptCandidate,
  planSkillAdoption,
} from "../adoption";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { ApprovalSchema } from "../contracts/review";
import { parseRunLockText, runLockHash } from "../contracts/run-lock";
import { buildProposal } from "../proposal";
import { buildReportArtifacts } from "../report";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";

const roots: string[] = [];
const runLockFixture = join(import.meta.dir, "fixtures/valid-run-lock.json");
const skill = "kibi-usage" as const;
const manifest = {
  id: skill,
  name: "Kibi Usage",
  description: "Test fixture",
  version: "1.0.0",
  kibiCompatibility: ">=0.1.0",
  resources: ["resources/workflows.md"],
} as const;
const frontmatter = `---\nid: ${skill}\nname: Kibi Usage\ndescription: Test fixture\nversion: 1.0.0\nkibiCompatibility: ">=0.1.0"\nresources:\n  - resources/workflows.md\n---\n`;
const baselineBody = "\n# Baseline\n";
const candidateBody = "\n# Adopted candidate\n";
const resourceBody = "workflow fixture\n";

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new Error("fixture is not canonicalizable");
  return sha256(serialized);
}

async function createRepo(): Promise<string> {
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

function approvalArtifacts(repoRoot: string) {
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

async function snapshot(repoRoot: string): Promise<readonly string[]> {
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

const syncMirrors: RunMirrorSync = async (repoRoot) => {
  for (const target of ["cursor", "codex"] as const) {
    const mirror = join(repoRoot, `packages/${target}/skills`);
    await rm(mirror, { recursive: true, force: true });
    await cp(join(repoRoot, "packages/cli/src/public/skills"), mirror, {
      recursive: true,
    });
  }
};

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
    const resource = join(
      repoRoot,
      "packages/cli/src/public/skills/kibi-usage/resources/workflows.md",
    );
    await writeFile(resource, "stale resource\n");
    const before = await snapshot(repoRoot);

    const attempt = planSkillAdoption(input);

    expect(attempt).rejects.toThrow("canonical resource hash mismatch");
    expect(await snapshot(repoRoot)).toEqual(before);
  });

  test("Given approval for a different candidate hash When adoption is planned Then validation rejects before mutation", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);
    const before = await snapshot(repoRoot);
    const approval = {
      ...input.approval,
      candidateBodyHash: "9".repeat(64),
    };

    const attempt = planSkillAdoption({ ...input, approval });

    expect(attempt).rejects.toThrow("approval artifact hash mismatch");
    expect(await snapshot(repoRoot)).toEqual(before);
  });

  test("Given exact approved artifacts When adopted Then only the canonical body changes and mirrors are regenerated", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);

    const receipt = await adoptApprovedSkill(input, {
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
    expect(
      await readFile(
        join(
          repoRoot,
          "packages/cli/src/public/skills/kibi-usage/resources/workflows.md",
        ),
        "utf8",
      ),
    ).toBe(resourceBody);
  });

  test("Given a safety-passing SkillOpt candidate When auto-adopted Then canonical and mirrors change transactionally", async () => {
    const repoRoot = await createRepo();
    const input = approvalArtifacts(repoRoot);

    const receipt = await adoptSkillOptCandidate(
      {
        repoRoot,
        candidate: input.candidate,
        frontmatterHash: input.candidate.frontmatterHash,
        resourcesHash: input.candidate.resourcesHash,
      },
      { runMirrorSync: syncMirrors },
    );

    expect(receipt).toMatchObject({ skill, status: "adopted" });
    expect(await readFile(join(repoRoot, "packages/cursor/skills/kibi-usage/SKILL.md"), "utf8")).toBe(
      frontmatter + candidateBody,
    );
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

    const attempt = adoptApprovedSkill(input, { runMirrorSync: failingSync });

    expect(attempt).rejects.toThrow("adoption transaction failed");
    expect(await snapshot(repoRoot)).toEqual(before);
  });
});
