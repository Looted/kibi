import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contractHash } from "../contracts/common";
import {
  OptimizerResultSchema,
  knownOptimizerRejectionReason,
  optimizerBridgeMain,
} from "../optimizer-bridge-cli";
import { CodexOptimizerError } from "../runtime/codex-optimizer";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const REQUEST = {
  schemaVersion: "1.0.0" as const,
  artifactType: "skillopt-optimizer-request" as const,
  runId: "00000000-0000-4000-8000-000000000701",
  skill: "kibi-usage" as const,
  step: 1,
  maxSteps: 4,
  currentBody: "Use Kibi through MCP.\n",
  trainTrajectories: [
    {
      taskId: "train-1",
      family: "discovery",
      reflection: "public failure",
      status: "behavioral-failure" as const,
      soft: 0,
      hard: 0 as const,
      failureCategories: ["missing_guidance"],
      toolSequence: [],
      finalStateSummary: "{}",
    },
  ],
  publicEvidenceSummary: {
    attempts: 1,
    hardPasses: 0,
    families: [
      {
        family: "discovery",
        attempts: 1,
        hardPasses: 0,
        meanSoft: 0,
        failureCounts: [{ category: "missing_guidance", count: 1 }],
      },
    ],
  },
  previousDevelopment: { mean: 0.5, hardPasses: 1, worstFamilyMean: 0.5 },
  sourceLockHash: "a".repeat(64),
  corpusRoots: {
    corpus: "b".repeat(64),
    evaluator: "c".repeat(64),
    querySet: "d".repeat(64),
    baseline: "e".repeat(64),
    catalog: "f".repeat(64),
    verifier: "1".repeat(64),
    publicRoot: "2".repeat(64),
    privateRoot: "3".repeat(64),
    artifactSchema: "4".repeat(64),
  },
};

describe("optimizer bridge result contract", () => {
  test("accepts success and rejection as distinct strict variants", () => {
    const requestHash = "a".repeat(64);
    expect(
      OptimizerResultSchema.parse({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-optimizer-result",
        status: "accepted",
        requestHash,
        body: "accepted body",
        development: { mean: 0.5, hardPasses: 1, worstFamilyMean: 0.5 },
      }),
    ).toMatchObject({ status: "accepted", body: "accepted body" });
    expect(
      OptimizerResultSchema.parse({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-optimizer-result",
        status: "rejected",
        requestHash,
        reason: "candidate_direct_kb_guidance",
      }),
    ).toEqual({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimizer-result",
      status: "rejected",
      requestHash,
      reason: "candidate_direct_kb_guidance",
    });
    expect(() =>
      OptimizerResultSchema.parse({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-optimizer-result",
        status: "rejected",
        requestHash,
        reason: "candidate_unknown",
      }),
    ).toThrow();
    expect(() =>
      OptimizerResultSchema.parse({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-optimizer-result",
        status: "rejected",
        requestHash,
        reason: "candidate_direct_kb_guidance",
        body: "must not be accepted",
      }),
    ).toThrow();
  });

  test("classifies only known candidate and format errors, not infrastructure errors", () => {
    expect(
      knownOptimizerRejectionReason(
        new CodexOptimizerError("candidate_direct_kb_guidance"),
      ),
    ).toBe("candidate_direct_kb_guidance");
    expect(
      knownOptimizerRejectionReason(
        new CodexOptimizerError("optimizer_output_missing_body"),
      ),
    ).toBe("optimizer_output_missing_body");
    expect(
      knownOptimizerRejectionReason(
        new CodexOptimizerError("optimizer_exit:1"),
      ),
    ).toBeUndefined();
    expect(
      knownOptimizerRejectionReason(new Error("spawn failed")),
    ).toBeUndefined();
  });

  test("fake execution writes a request-hash-bound accepted result", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-optimizer-cli-"));
    roots.push(root);
    const requestPath = join(root, "request.json");
    const resultPath = join(root, "result.json");
    await writeFile(requestPath, `${JSON.stringify(REQUEST)}\n`, "utf8");

    await optimizerBridgeMain([
      "--request",
      requestPath,
      "--result",
      resultPath,
      "--fake",
    ]);

    const result = JSON.parse(await readFile(resultPath, "utf8")) as Record<
      string,
      unknown
    >;
    expect(result).toMatchObject({
      status: "accepted",
      requestHash: contractHash(REQUEST),
      body: REQUEST.currentBody,
    });
  });

  test("writes a rejection result and receipt without persisting the rejected body", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-optimizer-rejection-"));
    roots.push(root);
    const requestPath = join(root, "request.json");
    const resultPath = join(root, "result.json");
    await writeFile(requestPath, `${JSON.stringify(REQUEST)}\n`, "utf8");

    await optimizerBridgeMain(
      ["--request", requestPath, "--result", resultPath],
      {
        runCodexSkillOptStep: async () => {
          throw new CodexOptimizerError("candidate_direct_kb_guidance");
        },
      },
    );

    const result = JSON.parse(await readFile(resultPath, "utf8")) as Record<
      string,
      unknown
    >;
    expect(result).toEqual({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-optimizer-result",
      status: "rejected",
      requestHash: contractHash(REQUEST),
      reason: "candidate_direct_kb_guidance",
    });
    const receipt = JSON.parse(
      await readFile(
        join(root, "optimizer-artifacts", "rejected-output", "receipt.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(receipt).toMatchObject({
      artifactType: "skillopt-optimizer-rejection-receipt",
      step: REQUEST.step,
      reason: "candidate_direct_kb_guidance",
      requestHash: contractHash(REQUEST),
    });
    expect(result.body).toBeUndefined();
  });

  test("does not convert an unknown optimizer error into a rejection", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-optimizer-infra-"));
    roots.push(root);
    const requestPath = join(root, "request.json");
    const resultPath = join(root, "result.json");
    await writeFile(requestPath, `${JSON.stringify(REQUEST)}\n`, "utf8");

    await expect(
      optimizerBridgeMain(["--request", requestPath, "--result", resultPath], {
        runCodexSkillOptStep: async () => {
          throw new CodexOptimizerError("optimizer_exit:1");
        },
      }),
    ).rejects.toThrow("optimizer_exit:1");
  });
});
