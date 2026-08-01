import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBoundedProcess } from "../runtime/process";
import {
  BRIDGE_ARTIFACT_ROOT_ENV,
  BRIDGE_FIXTURE_RUN_ROOT_ENV,
  BRIDGE_SOURCE_WORKTREE_ENV,
  type TrainerRequestPayload,
  buildTrainerRequest,
  seedTrainerInitialSkill,
  skilloptModuleArgv,
  trainerBridgeEnvironment,
} from "../training-setup";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

const HASH = "a".repeat(64);
const CORPUS_ROOTS = {
  corpus: "b".repeat(64),
  evaluator: "c".repeat(64),
  querySet: "d".repeat(64),
  baseline: "e".repeat(64),
  catalog: "f".repeat(64),
  verifier: "1".repeat(64),
  publicRoot: "2".repeat(64),
  privateRoot: "3".repeat(64),
  artifactSchema: "4".repeat(64),
} as const;

function sampleInput(artifactRoot: string) {
  return {
    runId: "00000000-0000-4000-8000-000000000099",
    skill: "kibi-usage" as const,
    artifactRoot,
    sourceWorktree: "/repo",
    maxSteps: 1 as const,
    baseline: {
      schemaVersion: "1.0.0" as const,
      artifactType: "skillopt-variant" as const,
      skill: "kibi-usage" as const,
      variant: "baseline" as const,
      status: "frozen" as const,
      body: "# kibi-usage\n\nUse Kibi through MCP.\n",
      bodyHash: HASH,
      frontmatterHash: HASH,
      resourcesHash: HASH,
      provenance: "canonical" as const,
    },
    corpusRoots: CORPUS_ROOTS,
    trainDescriptors: [
      {
        id: "kibi-usage-fact-predicate-modeling-train-1",
        family: "builtin_relational",
        split: "train" as const,
        publicClaim: {
          taskId: "kibi-usage-fact-predicate-modeling-train-1",
          text: "claim",
          publicManifestHash: HASH,
          workspaceHash: HASH,
        },
      },
    ],
    developmentDescriptors: [
      {
        id: "kibi-usage-fact-predicate-modeling-development-1",
        family: "project_local_schema",
        split: "development" as const,
        publicClaim: {
          taskId: "kibi-usage-fact-predicate-modeling-development-1",
          text: "claim",
          publicManifestHash: HASH,
          workspaceHash: HASH,
        },
      },
    ],
    env: { PATH: "/usr/bin:/bin" },
    cellRuntime: {
      fixtureRunRoot: "/fixtures/run",
    },
  };
}

describe("SkillOpt trainer module argv", () => {
  test("runs kibi_skillopt from the tools/skillopt project directory", () => {
    expect(
      skilloptModuleArgv([
        "train",
        "--request",
        "/tmp/request.json",
        "--result",
        "/tmp/result.json",
      ]),
    ).toEqual([
      "uv",
      "run",
      "--directory",
      "tools/skillopt",
      "python",
      "-m",
      "kibi_skillopt",
      "train",
      "--request",
      "/tmp/request.json",
      "--result",
      "/tmp/result.json",
    ]);
  });
});

describe("SkillOpt trainer request contract", () => {
  test("omits bridge command fields forbidden by TrainRequest", () => {
    const payload = buildTrainerRequest(sampleInput("/artifacts/run"));
    expect(payload).toEqual({
      runId: "00000000-0000-4000-8000-000000000099",
      skill: "kibi-usage",
      runRoot: "/artifacts/run/trainer-run",
      outRoot: "/artifacts/run/trainer-output",
      maxSteps: 1,
      sourceLockHash: expect.any(String),
      corpusRoots: CORPUS_ROOTS,
      trainDescriptors: sampleInput("/artifacts/run").trainDescriptors,
      developmentDescriptors:
        sampleInput("/artifacts/run").developmentDescriptors,
    } satisfies TrainerRequestPayload);
    expect(payload).not.toHaveProperty("bridgeCommand");
    expect(payload).not.toHaveProperty("optimizerBridgeCommand");
    expect(payload).not.toHaveProperty("bridgeCwd");
    expect(payload.sourceLockHash).toHaveLength(64);
  });

  test("passes bridge execution roots through trainer environment", () => {
    const env = trainerBridgeEnvironment(
      sampleInput("/artifacts/run"),
      "/fixtures/run",
    );
    expect(env[BRIDGE_SOURCE_WORKTREE_ENV]).toBe("/repo");
    expect(env[BRIDGE_ARTIFACT_ROOT_ENV]).toBe("/artifacts/run/cells");
    expect(env[BRIDGE_FIXTURE_RUN_ROOT_ENV]).toBe("/fixtures/run");
  });

  test("Python TrainRequest accepts the TypeScript trainer payload", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-trainer-request-"));
    roots.push(root);
    const requestPath = join(root, "trainer-request.json");
    const payload = buildTrainerRequest(sampleInput(root));
    await writeFile(requestPath, `${JSON.stringify(payload)}\n`);

    const result = await runBoundedProcess({
      argv: [
        "uv",
        "run",
        "--directory",
        "tools/skillopt",
        "python",
        "-c",
        [
          "from pathlib import Path",
          "from kibi_skillopt.__main__ import TrainRequest",
          `TrainRequest.model_validate_json(Path(${JSON.stringify(requestPath)}).read_text(encoding='utf-8'))`,
          "print('train-request-ok')",
        ].join("; "),
      ],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 60_000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("train-request-ok");
    expect(result.stderr).not.toContain("Extra inputs are not permitted");
  });

  test("seeds ReflACT initial-skill.md from the baseline body", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-initial-skill-"));
    roots.push(root);
    const outRoot = join(root, "trainer-output");
    const body = sampleInput(root).baseline.body;
    const path = await seedTrainerInitialSkill(outRoot, body);
    expect(path).toBe(join(outRoot, "initial-skill.md"));
    expect(await readFile(path, "utf8")).toBe(body);
    await expect(seedTrainerInitialSkill(outRoot, "   ")).rejects.toThrow(
      "trainer_initial_skill_empty",
    );
  });
});
