import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const processImpl = { run: async (_options: unknown) => ({
  argv: ["uv"],
  stdout: "",
  stderr: "",
  exitCode: 0,
  signal: null,
}) };

mock.module("../runtime/process", () => ({
  runBoundedProcess: (options: unknown) => processImpl.run(options),
  ProcessControlError: class ProcessControlError extends Error {
    readonly kind: string;
    readonly result: unknown;
    constructor(kind: string, result: unknown) {
      super(`process_${kind}:uv`);
      this.kind = kind;
      this.result = result;
      this.name = "ProcessControlError";
    }
  },
}));

mock.module("../runtime/task-fixture", () => ({
  resolveTaskFixture: async (input: { taskId: string }) => ({
    workspaceRoot: "/tmp/skillopt-dev-fixture",
    workspaceHash: "b".repeat(64),
    publicClaim: {
      taskId: input.taskId,
      text: "do the task",
      publicManifestHash: "c".repeat(64),
      workspaceHash: "b".repeat(64),
    },
    evaluatorManifest: {
      taskId: input.taskId,
      publicManifestHash: "c".repeat(64),
      workspaceHash: "b".repeat(64),
      fixtureSeedHash: "d".repeat(64),
      protocolContract: { required: true },
    },
  }),
}));

mock.module("../runtime/codex-optimizer", () => ({
  runCodexSkillOptStep: async () => ({
    body: "# one shot body\n",
    development: { mean: 0, hardPasses: 0, worstFamilyMean: 0 },
  }),
}));

const {
  defaultEvaluateDevelopment,
  defaultTrain,
  oneShotVariant,
  seedTrainerInitialSkill,
  trainerProcessInfrastructureError,
  trainerProcessThrownInfrastructureError,
} = await import("../training-setup");
import { EvaluationInfrastructureError } from "../evaluation-infrastructure";
import { canonicalHash } from "../real-workflow-types";
import type { FrozenVariant } from "../variants";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const corpusRoots = {
  corpus: "a".repeat(64),
  evaluator: "b".repeat(64),
  querySet: "c".repeat(64),
  baseline: "d".repeat(64),
  catalog: "e".repeat(64),
  verifier: "f".repeat(64),
  publicRoot: "1".repeat(64),
  privateRoot: "2".repeat(64),
  artifactSchema: "3".repeat(64),
};

function frozen(body = "baseline body"): FrozenVariant {
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-variant",
    skill: "kibi-usage",
    variant: "baseline",
    status: "frozen",
    body,
    bodyHash: "9".repeat(64),
    frontmatterHash: "8".repeat(64),
    resourcesHash: "7".repeat(64),
    provenance: "canonical",
  };
}

function trainingInput(artifactRoot: string) {
  return {
    runId: "run-1",
    skill: "kibi-usage" as const,
    sourceWorktree: process.cwd(),
    artifactRoot,
    maxSteps: 1,
    baseline: frozen(),
    trainDescriptors: [
      {
        id: "kibi-usage-discovery-exact-lookup-train-1",
        family: "discovery-exact-lookup",
        split: "train" as const,
        publicClaim: { taskId: "t1", text: "find it" },
      },
    ],
    developmentDescriptors: [
      {
        id: "kibi-usage-discovery-exact-lookup-development-1",
        family: "discovery-exact-lookup",
        split: "development" as const,
        publicClaim: { taskId: "d1", text: "develop" },
      },
    ],
    corpusRoots,
    env: { ...process.env },
    cellRuntime: {
      fixtureRunRoot: "/tmp/fixtures",
      codexExecutable: "/tmp/fake-codex",
      bwrapExecutable: "/tmp/fake-bwrap",
      timeoutMs: 1_000,
      hiddenMarkers: ["x"],
      pricingHash: "0".repeat(64),
      priceAmount: 0,
    },
  };
}

describe("training-setup default implementations", () => {
  test("defaultTrain parses a matching trainer result", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-train-"));
    roots.push(artifactRoot);
    const body = "optimized body";
    const trajectoryHashes = ["4".repeat(64)];
    const candidateBodyHash = canonicalHash(body);
    const trainerCheckpointHash = canonicalHash({
      candidateBodyHash,
      corpusRoots,
      trajectoryHashes,
    });
    processImpl.run = (async (options: {
      argv: readonly string[];
    }) => {
      const resultIdx = options.argv.indexOf("--result");
      const resultPath = options.argv[resultIdx + 1];
      if (!resultPath) throw new Error("missing result path");
      await writeFile(
        resultPath,
        JSON.stringify({
          codex_candidate_body: body,
          codex_candidate_body_hash: candidateBodyHash,
          trainer_checkpoint_hash: trainerCheckpointHash,
          trajectory_hashes: trajectoryHashes,
          corpus_roots: corpusRoots,
          candidate_development: {
            mean: 0.9,
            hardPasses: 3,
            worstFamilyMean: 0.8,
          },
        }),
      );
      return {
        argv: options.argv,
        stdout: "",
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    }) as never;
    const output = await defaultTrain(trainingInput(artifactRoot));
    expect(output.candidateBody).toBe(body);
    expect(output.trainerCheckpointHash).toBe(trainerCheckpointHash);
  });

  test("defaultTrain maps process failures and hash mismatches", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-train-err-"));
    roots.push(artifactRoot);
    processImpl.run = async () => {
      throw new Error("process_timeout:uv");
    };
    await expect(defaultTrain(trainingInput(artifactRoot))).rejects.toBeInstanceOf(
      EvaluationInfrastructureError,
    );

    processImpl.run = async () => ({
      argv: ["uv"],
      stdout: "",
      stderr: "KIBI_SKILLOPT_INFRASTRUCTURE:{}",
      exitCode: 2,
      signal: null,
    });
    await expect(defaultTrain(trainingInput(artifactRoot))).rejects.toThrow();

    processImpl.run = async () => ({
      argv: ["uv"],
      stdout: "failed",
      stderr: "boom",
      exitCode: 3,
      signal: null,
    });
    await expect(defaultTrain(trainingInput(artifactRoot))).rejects.toBeInstanceOf(
      EvaluationInfrastructureError,
    );
  });

  test("defaultEvaluateDevelopment aggregates cell scores", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-dev-"));
    roots.push(artifactRoot);
    const gate = await defaultEvaluateDevelopment({
      runId: "run-dev",
      skill: "kibi-usage",
      sourceWorktree: process.cwd(),
      artifactRoot,
      candidate: {
        ...frozen("# cand"),
        variant: "skillopt",
        provenance: "skillopt",
      },
      descriptors: [
        {
          id: "task-a",
          family: "discovery-exact-lookup",
          split: "development",
          publicClaim: {
            taskId: "task-a",
            text: "do it",
            publicManifestHash: "c".repeat(64),
            workspaceHash: "b".repeat(64),
          },
        },
        {
          id: "task-b",
          family: "safe-mutation-direction",
          split: "development",
          publicClaim: {
            taskId: "task-b",
            text: "mutate",
            publicManifestHash: "c".repeat(64),
            workspaceHash: "b".repeat(64),
          },
        },
      ],
      env: process.env,
      runtime: {
        fixtureRunRoot: "/tmp/fixtures",
        codexExecutable: "/tmp/fake-codex",
        bwrapExecutable: "/tmp/fake-bwrap",
      },
      cellRunner: (async () => ({
        receipt: {
          result: {
            status: "completed",
            hardPass: true,
            score: 80,
            criticalFailures: [],
          },
        },
        receiptPath: join(artifactRoot, "receipt.json"),
      })) as never,
    });
    expect(gate.hardPasses).toBe(2);
    expect(gate.mean).toBeCloseTo(0.8);
  });

  test("defaultEvaluateDevelopment rejects an empty descriptor list", async () => {
    await expect(
      defaultEvaluateDevelopment({
        runId: "run-dev",
        skill: "kibi-usage",
        sourceWorktree: process.cwd(),
        artifactRoot: "/tmp",
        candidate: frozen(),
        descriptors: [],
        env: process.env,
        runtime: {
          fixtureRunRoot: "/tmp/fixtures",
          codexExecutable: "/tmp/fake-codex",
          bwrapExecutable: "/tmp/fake-bwrap",
        },
      }),
    ).rejects.toThrow("development_descriptor_missing");
  });

  test("oneShotVariant freezes the optimizer body", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-oneshot-"));
    roots.push(artifactRoot);
    const variant = await oneShotVariant({
      runId: "run-os",
      skill: "kibi-usage",
      sourceWorktree: process.cwd(),
      artifactRoot,
      baseline: frozen(),
      trainDescriptors: [
        {
          id: "t1",
          family: "discovery-exact-lookup",
          split: "train",
          publicClaim: { text: "train" },
        },
      ],
      env: process.env,
      cellRuntime: {
        fixtureRunRoot: "/tmp/fixtures",
        codexExecutable: "/tmp/fake-codex",
        bwrapExecutable: "/tmp/fake-bwrap",
      },
    } as never);
    expect(variant.variant).toBe("one-shot");
    expect(variant.body).toContain("one shot body");
  });

  test("seedTrainerInitialSkill and infrastructure helpers", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-seed-"));
    roots.push(artifactRoot);
    await expect(seedTrainerInitialSkill(artifactRoot, "   ")).rejects.toThrow(
      "trainer_initial_skill_empty",
    );
    const path = await seedTrainerInitialSkill(artifactRoot, "body");
    expect(await readFile(path, "utf8")).toBe("body");
    const timeout = trainerProcessThrownInfrastructureError(
      new Error("process_timeout:uv"),
      "/tmp/err.log",
    );
    expect(timeout.details.criticalFailures).toContain("trainer-process-timeout");
    const other = trainerProcessThrownInfrastructureError("boom", "/tmp/err.log");
    expect(other.details.criticalFailures).toContain("trainer-process-error");
    expect(
      trainerProcessInfrastructureError(
        {
          argv: ["uv"],
          stdout: "",
          stderr: "x",
          exitCode: 9,
          signal: null,
        },
        "/tmp/err.log",
      ).details.criticalFailures,
    ).toContain("trainer-exit-9");
  });
});
