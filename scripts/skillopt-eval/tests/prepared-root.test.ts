import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FixtureClaimError,
  assertFixtureAuthorizationClaim,
  buildFixtureAuthorizationClaim,
} from "../fixtures/fixture-claim";
import { PreparedRootError, prepareArtifact } from "../prepared-root";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function git(root: string, args: readonly string[]): Promise<void> {
  const process = Bun.spawn(["git", ...args], { cwd: root, stderr: "pipe" });
  expect(await process.exited).toBe(0);
}

async function cleanSourceRoot(): Promise<string> {
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-source-"));
  roots.push(sourceRoot);
  await Bun.write(join(sourceRoot, "source.txt"), "authorized source\n");
  await git(sourceRoot, ["init", "--quiet"]);
  await git(sourceRoot, ["config", "user.email", "skillopt@example.test"]);
  await git(sourceRoot, ["config", "user.name", "SkillOpt test"]);
  await git(sourceRoot, ["add", "."]);
  await git(sourceRoot, ["commit", "--quiet", "-m", "source fixture"]);
  return sourceRoot;
}

test("fixture authorization claim binds task split family and hashes", () => {
  const claim = buildFixtureAuthorizationClaim({
    taskId: "usage-train-1",
    split: "train",
    family: "fact-predicate-modeling",
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
    evaluatorManifestHash: "c".repeat(64),
  });
  expect(claim.authorizedClaimRoot).toHaveLength(64);
  expect(() =>
    assertFixtureAuthorizationClaim(
      { ...claim, workspaceHash: "d".repeat(64) },
      {
        taskId: claim.taskId,
        split: claim.split,
        family: claim.family,
        publicManifestHash: claim.publicManifestHash,
        workspaceHash: claim.workspaceHash,
        evaluatorManifestHash: claim.evaluatorManifestHash,
      },
    ),
  ).toThrow(FixtureClaimError);
});

test("prepareArtifact persists candidate bytes then hashes them", async () => {
  const sourceRoot = await cleanSourceRoot();
  const preparedRoot = await mkdtemp(join(tmpdir(), "skillopt-prepared-"));
  roots.push(preparedRoot);
  const candidates = {
    baseline: "baseline body\n",
    oneShot: "one-shot body\n",
    skillopt: "skillopt body\n",
  };

  const prepared = await prepareArtifact({
    preparedRoot,
    runId: "00000000-0000-4000-8000-000000000094",
    sourceRoot,
    candidates,
  });

  expect(
    await readFile(join(preparedRoot, "candidate-baseline.md"), "utf8"),
  ).toBe(candidates.baseline);
  expect(prepared.candidateHashes.baseline).toHaveLength(64);
  expect(prepared.candidateHashes.oneShot).not.toBe(
    prepared.candidateHashes.baseline,
  );
});

test("prepareArtifact rejects root authorization mismatch", async () => {
  const sourceRoot = await cleanSourceRoot();
  const preparedRoot = await mkdtemp(join(tmpdir(), "skillopt-prepared-"));
  roots.push(preparedRoot);

  await expect(
    prepareArtifact({
      preparedRoot,
      runId: "00000000-0000-4000-8000-000000000095",
      sourceRoot,
      candidates: {
        baseline: "a\n",
        oneShot: "b\n",
        skillopt: "c\n",
      },
      rootAuthorization: "0".repeat(64),
    }),
  ).rejects.toBeInstanceOf(PreparedRootError);
});
