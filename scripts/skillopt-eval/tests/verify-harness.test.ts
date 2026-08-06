import { afterEach, describe, expect, test } from "bun:test";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { receipt } from "../preflight-host-model";
import { prepareArtifact } from "../prepared-root";
import { runVerificationHarness } from "../verify-harness";
import {
  rootAuthorizationFixture,
  supervisorParentFixture,
} from "./fixtures/trust-plane-fixtures";

const roots: string[] = [];
const runId = "00000000-0000-4000-8000-000000000095";

type Fixture = Readonly<{
  root: string;
  sourceRoot: string;
  targetRoot: string;
  artifactRoot: string;
  preparedRoot: string;
  rootAuthorization: string;
  preflightReceipt: string;
  verificationParent: string;
  output: string;
}>;

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function git(root: string, args: readonly string[]): Promise<void> {
  const process = Bun.spawn(["git", ...args], { cwd: root, stderr: "pipe" });
  expect(await process.exited).toBe(0);
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-verify-harness-"));
  roots.push(root);
  const sourceRoot = join(root, "source");
  const artifactRoot = join(root, "verify");
  const preparedRoot = join(root, "prepared");
  await Bun.write(join(sourceRoot, "source.txt"), "authorized source\n");
  const skillSource = resolve(
    import.meta.dir,
    "../../../packages/cli/src/public/skills",
  );
  const skillTarget = join(sourceRoot, "packages/cli/src/public/skills");
  await mkdir(join(sourceRoot, "packages/cli/src/public"), { recursive: true });
  await cp(skillSource, skillTarget, { recursive: true, dereference: false });
  await git(sourceRoot, ["init", "--quiet"]);
  await git(sourceRoot, ["config", "user.email", "skillopt@example.test"]);
  await git(sourceRoot, ["config", "user.name", "SkillOpt test"]);
  await git(sourceRoot, ["add", "."]);
  await git(sourceRoot, ["commit", "--quiet", "-m", "source fixture"]);
  const prepared = await prepareArtifact({
    preparedRoot,
    runId,
    sourceRoot,
    candidates: {
      baseline: "baseline\n",
      oneShot: "one-shot\n",
      skillopt: "skillopt\n",
    },
  });
  const parent = {
    ...supervisorParentFixture,
    sourceRoot: prepared.sourceRoot,
    candidateHashes: prepared.candidateHashes,
    invocationHash: prepared.invocationHash,
    matrixId: prepared.matrixId,
  };
  const rootAuthorization = join(root, "root-authorization.json");
  const preflightReceipt = join(root, "preflight.json");
  const verificationParent = join(root, "verification-parent.json");
  await Promise.all([
    Bun.write(rootAuthorization, JSON.stringify(rootAuthorizationFixture)),
    Bun.write(
      preflightReceipt,
      JSON.stringify(receipt({ status: "qualified", code: "OK" })),
    ),
    Bun.write(verificationParent, JSON.stringify(parent)),
  ]);
  return {
    root,
    sourceRoot,
    targetRoot: join(root, "target-root"),
    artifactRoot,
    preparedRoot,
    rootAuthorization,
    preflightReceipt,
    verificationParent,
    output: join(artifactRoot, "verification-review.json"),
  };
}

function options(fixture: Fixture) {
  return { skill: "kibi-usage", runId, ...fixture } as const;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return false;
    throw error;
  }
}

async function rewritePrepared(
  fixture: Fixture,
  changes: Readonly<Record<string, unknown>>,
): Promise<void> {
  const path = join(fixture.preparedRoot, "prepared-root.json");
  const current = JSON.parse(await readFile(path, "utf8"));
  const { generatedArtifactRoot: _, ...binding } = { ...current, ...changes };
  await writeFile(
    path,
    JSON.stringify({
      ...binding,
      generatedArtifactRoot: contractHash(JsonValueSchema.parse(binding)),
    }),
  );
}

describe("SkillOpt F3 verification harness", () => {
  test("creates an isolated empty target snapshot and an external-verdict review without mutation", async () => {
    const fixture = await createFixture();
    const sourceBefore = await readFile(
      join(fixture.sourceRoot, "source.txt"),
      "utf8",
    );
    const review = await runVerificationHarness(options(fixture));
    expect(review.productionAdoption).toBe("external-verdict-required");
    expect(review.paidModelCalls).toBe(0);
    expect(await readFile(join(fixture.targetRoot, "source.txt"), "utf8")).toBe(
      sourceBefore,
    );
    expect(await readFile(fixture.output, "utf8")).toContain(
      "skillopt-verification-review",
    );
    expect(await readFile(join(fixture.sourceRoot, "source.txt"), "utf8")).toBe(
      sourceBefore,
    );
  });

  test("rejects a tampered prepared root before snapshot creation", async () => {
    const fixture = await createFixture();
    const manifest = JSON.parse(
      await readFile(join(fixture.preparedRoot, "prepared-root.json"), "utf8"),
    );
    await writeFile(
      join(fixture.preparedRoot, "prepared-root.json"),
      JSON.stringify({ ...manifest, generatedArtifactRoot: "0".repeat(64) }),
    );
    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "prepared_root_mismatch",
    );
    expect(await pathExists(fixture.targetRoot)).toBe(false);
  });

  test("rejects a missing candidate binding without mutation", async () => {
    const fixture = await createFixture();
    const parent = JSON.parse(
      await readFile(fixture.verificationParent, "utf8"),
    );
    await writeFile(
      fixture.verificationParent,
      JSON.stringify({
        ...parent,
        candidateHashes: {
          ...parent.candidateHashes,
          skillopt: "0".repeat(64),
        },
      }),
    );
    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "candidate_binding_mismatch",
    );
    expect(await pathExists(fixture.targetRoot)).toBe(false);
  });

  test("rejects a self-consistent prepared root bound to another source", async () => {
    const fixture = await createFixture();
    await rewritePrepared(fixture, { sourceRoot: "0".repeat(64) });

    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "prepared_source_root_mismatch",
    );
    expect(await pathExists(fixture.targetRoot)).toBe(false);
  });

  test("rejects a self-consistent prepared root bound to another run", async () => {
    const fixture = await createFixture();
    await rewritePrepared(fixture, {
      runId: "00000000-0000-4000-8000-000000000096",
    });

    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "prepared_run_id_mismatch",
    );
    expect(await pathExists(fixture.targetRoot)).toBe(false);
  });

  test("plans against the isolated target instead of the current checkout", async () => {
    const fixture = await createFixture();
    await cp(fixture.sourceRoot, fixture.targetRoot, {
      recursive: true,
      dereference: false,
    });
    await rm(
      join(
        fixture.targetRoot,
        "packages/cli/src/public/skills/kibi-usage/SKILL.md",
      ),
    );

    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "Skill not found: kibi-usage",
    );
  });
});
