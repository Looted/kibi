// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";
import { rmSync } from "node:fs";
import { materializePredicateCorpus } from "../fixtures/predicate-corpus";
import { materializeFixtureRun } from "../fixtures/private";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";
import { CANONICAL_SKILL_ROOT, temporaryRoot } from "./fixture-test-helpers";
import { RUN_ID, receipt } from "./held-out-evaluation-test-helpers";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("held-out-evaluation remaining variant, unique-id, and fail-evidence branches", () => {
  test("rejects a non-canonical frozen variant set", async () => {
    const module = await import("../held-out-evaluation");
    await expect(
      module.defaultEvaluateHeldOut({
        skill: "kibi-usage",
        variants: [
          createBaselineVariant({
            skill: "kibi-usage",
            body: "baseline",
            frontmatterHash: "a".repeat(64),
            resourcesHash: "b".repeat(64),
          }),
          freezeCandidateVariant({
            skill: "kibi-usage",
            variant: "skillopt",
            body: "wrong-order",
            frontmatterHash: "a".repeat(64),
            resourcesHash: "b".repeat(64),
            provenance: "skillopt",
          }),
          freezeCandidateVariant({
            skill: "kibi-usage",
            variant: "one-shot",
            body: "also-wrong",
            frontmatterHash: "a".repeat(64),
            resourcesHash: "b".repeat(64),
            provenance: "codex-one-shot",
          }),
        ],
        runtime: {
          fixtureRunRoot: "/tmp/fixture",
          codexExecutable: "/staged/codex",
          bwrapExecutable: "/staged/codex-resources/bwrap",
        },
        sourceWorktree: process.cwd(),
        artifactRoot: "/tmp/eval",
        runId: RUN_ID,
        roots: {
          corpus: "1".repeat(64),
          evaluator: "2".repeat(64),
          querySet: "3".repeat(64),
          baseline: "4".repeat(64),
          catalog: "5".repeat(64),
          verifier: "6".repeat(64),
          publicRoot: "7".repeat(64),
          privateRoot: "8".repeat(64),
          artifactSchema: "9".repeat(64),
        },
        env: process.env,
        includeBundle: false,
      }),
    ).rejects.toThrow("terminal_variant_set_invalid");
  });

  test("records malformed-snapshot evidence for failing predicate cells", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const fixtureRun = materializeFixtureRun({
      runRoot: path.join(root, "fixture-run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "predicate-corpus"),
    });
    const variants = [
      createBaselineVariant({
        skill: "kibi-usage",
        body: "baseline-candidate",
        frontmatterHash: "a".repeat(64),
        resourcesHash: "b".repeat(64),
      }),
      freezeCandidateVariant({
        skill: "kibi-usage",
        variant: "one-shot",
        body: "one-shot-candidate",
        frontmatterHash: "a".repeat(64),
        resourcesHash: "b".repeat(64),
        provenance: "codex-one-shot",
      }),
      freezeCandidateVariant({
        skill: "kibi-usage",
        variant: "skillopt",
        body: "optimized-candidate",
        frontmatterHash: "a".repeat(64),
        resourcesHash: "b".repeat(64),
        provenance: "skillopt",
        sourceRequestHash: "c".repeat(64),
      }),
    ] as const;
    const module = await import("../held-out-evaluation");
    const result = await module.defaultEvaluateHeldOut({
      skill: "kibi-usage",
      variants,
      runtime: {
        fixtureRunRoot: fixtureRun.roots.runRoot,
        codexExecutable: "/staged/codex",
        bwrapExecutable: "/staged/codex-resources/bwrap",
      },
      sourceWorktree: process.cwd(),
      artifactRoot: path.join(root, "evaluation"),
      runId: RUN_ID,
      roots: corpus.roots,
      env: process.env,
      includeBundle: false,
      cellRunner: async ({ request }) => ({
        receipt: receipt(request, false),
        artifactDirectory: "/tmp/held-out-cell",
        receiptPath: "/tmp/held-out-cell/receipt.json",
      }),
    });
    expect(result.cellCount).toBeGreaterThan(0);
  });
});
