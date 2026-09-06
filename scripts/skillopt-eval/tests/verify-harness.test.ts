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
import {
  VerificationHarnessError,
  runVerificationHarness,
  verifyHarnessMain,
} from "../verify-harness";
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
  }, 30_000);

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
  }, 30_000);

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
  }, 30_000);

  test("rejects a self-consistent prepared root bound to another source", async () => {
    const fixture = await createFixture();
    await rewritePrepared(fixture, { sourceRoot: "0".repeat(64) });

    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "prepared_source_root_mismatch",
    );
    expect(await pathExists(fixture.targetRoot)).toBe(false);
  }, 30_000);

  test("rejects a self-consistent prepared root bound to another run", async () => {
    const fixture = await createFixture();
    await rewritePrepared(fixture, {
      runId: "00000000-0000-4000-8000-000000000096",
    });

    await expect(runVerificationHarness(options(fixture))).rejects.toThrow(
      "prepared_run_id_mismatch",
    );
    expect(await pathExists(fixture.targetRoot)).toBe(false);
  }, 30_000);

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
  }, 30_000);
});

describe("verification harness remaining boundary and CLI paths", () => {
  const previousExit = process.exitCode;

  afterEach(() => {
    process.exitCode = previousExit;
  });

  function captureStdio() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const writeOut = process.stdout.write.bind(process.stdout);
    const writeErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    return {
      stdout,
      stderr,
      restore() {
        process.stdout.write = writeOut;
        process.stderr.write = writeErr;
      },
    };
  }

  function harnessArgv(fixture: Fixture): string[] {
    return [
      "--skill",
      "kibi-usage",
      "--run-id",
      runId,
      "--artifact-root",
      fixture.artifactRoot,
      "--target-root",
      fixture.targetRoot,
      "--root-authorization",
      fixture.rootAuthorization,
      "--prepared-root",
      fixture.preparedRoot,
      "--preflight-receipt",
      fixture.preflightReceipt,
      "--verification-parent",
      fixture.verificationParent,
      "--output",
      fixture.output,
    ];
  }

  test("rejects overlapping roots, traversal, and a non-artifact output parent", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-verify-bounds-"));
    roots.push(root);
    const sourceRoot = join(root, "source");
    const targetRoot = join(root, "target");
    const artifactRoot = join(root, "artifacts");
    await mkdir(sourceRoot, { recursive: true });
    await mkdir(targetRoot, { recursive: true });
    await mkdir(artifactRoot, { recursive: true });
    const base = {
      skill: "kibi-usage" as const,
      runId,
      sourceRoot,
      targetRoot,
      artifactRoot,
      rootAuthorization: join(root, "auth.json"),
      preparedRoot: join(root, "prepared"),
      preflightReceipt: join(root, "preflight.json"),
      verificationParent: join(root, "parent.json"),
      output: join(artifactRoot, "review.json"),
    };
    await expect(
      runVerificationHarness({
        ...base,
        sourceRoot: `${sourceRoot}/../escape`,
      }),
    ).rejects.toThrow(VerificationHarnessError);
    await expect(
      runVerificationHarness({ ...base, targetRoot: sourceRoot }),
    ).rejects.toMatchObject({ check: "target-root-boundary" });
    await expect(
      runVerificationHarness({ ...base, artifactRoot: sourceRoot }),
    ).rejects.toMatchObject({ check: "artifact-root-boundary" });
    await expect(
      runVerificationHarness({
        ...base,
        output: join(root, "outside.json"),
      }),
    ).rejects.toMatchObject({ check: "output-parent" });
  });

  test("rejects an unqualified preflight and remaining binding mismatches", async () => {
    const fixture = await createFixture();
    const qualified = await readFile(fixture.preflightReceipt, "utf8");
    const parent = await readFile(fixture.verificationParent, "utf8");
    await writeFile(
      fixture.preflightReceipt,
      JSON.stringify(receipt({ status: "no-go", code: "PREFLIGHT_NO_GO" })),
    );
    await expect(runVerificationHarness(options(fixture))).rejects.toMatchObject(
      { check: "preflight-not-qualified" },
    );

    await writeFile(fixture.preflightReceipt, qualified);
    const parsedParent = JSON.parse(parent);
    await writeFile(
      fixture.verificationParent,
      JSON.stringify({ ...parsedParent, sourceRoot: "0".repeat(64) }),
    );
    await expect(runVerificationHarness(options(fixture))).rejects.toMatchObject({
      check: "source-root-mismatch",
    });

    await writeFile(
      fixture.verificationParent,
      JSON.stringify({ ...parsedParent, invocationHash: "0".repeat(64) }),
    );
    await expect(runVerificationHarness(options(fixture))).rejects.toMatchObject({
      check: "invocation_binding_mismatch",
    });

    await writeFile(
      fixture.verificationParent,
      JSON.stringify({
        ...parsedParent,
        matrixId: "00000000-0000-4000-8000-000000000099",
      }),
    );
    await expect(runVerificationHarness(options(fixture))).rejects.toMatchObject({
      check: "matrix_binding_mismatch",
    });
  }, 30_000);

  test("rejects a target path that exists but is not a directory", async () => {
    const fixture = await createFixture();
    await writeFile(fixture.targetRoot, "not-a-directory\n");
    await expect(runVerificationHarness(options(fixture))).rejects.toMatchObject(
      { check: "target-root-directory" },
    );
  }, 30_000);

  test("maps CLI, harness, preflight, and contract errors to exit code 2", async () => {
    const io = captureStdio();
    try {
      expect(await verifyHarnessMain(["--skill"])).toBe(2);
      expect(io.stderr.join("")).toContain("cli-arguments");

      const fixture = await createFixture();
      expect(
        await verifyHarnessMain(
          harnessArgv(fixture),
          `${fixture.sourceRoot}/../x`,
        ),
      ).toBe(2);
      expect(io.stderr.join("")).toContain("path-traversal");

      const missing = harnessArgv(fixture);
      const preflightIndex = missing.indexOf("--preflight-receipt");
      missing[preflightIndex + 1] = join(fixture.root, "missing-preflight.json");
      expect(await verifyHarnessMain(missing, fixture.sourceRoot)).toBe(2);
      expect(io.stderr.join("")).toContain("lock-missing");

      await writeFile(join(fixture.root, "not-a-source"), "file\n");
      expect(
        await verifyHarnessMain(
          harnessArgv(fixture),
          join(fixture.root, "not-a-source"),
        ),
      ).toBe(2);
      expect(io.stderr.join("")).toContain("source-root-directory");

      await writeFile(fixture.preflightReceipt, JSON.stringify({}));
      expect(
        await verifyHarnessMain(harnessArgv(fixture), fixture.sourceRoot),
      ).toBe(2);

      await writeFile(
        fixture.preflightReceipt,
        JSON.stringify(receipt({ status: "qualified", code: "OK" })),
      );
      await writeFile(fixture.rootAuthorization, JSON.stringify({}));
      expect(
        await verifyHarnessMain(harnessArgv(fixture), fixture.sourceRoot),
      ).toBe(2);

      const success = await createFixture();
      expect(
        await verifyHarnessMain(harnessArgv(success), success.sourceRoot),
      ).toBe(0);
      expect(io.stdout.join("")).toContain("skillopt-verification-review");
    } finally {
      io.restore();
    }
  }, 30_000);
});
