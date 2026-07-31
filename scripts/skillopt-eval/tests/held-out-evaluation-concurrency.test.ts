import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { buildBundleCatalog, buildSkillCatalog } from "../catalog";
import { PREDICATE_HELD_OUT_CASE_IDS } from "../fixtures/predicate-cases";
import { materializePredicateCorpus } from "../fixtures/predicate-corpus";
import { materializeFixtureRun } from "../fixtures/private";
import { HeldOutReceiptStore } from "../held-out-receipt-store";
import { createBaselineVariant, freezeCandidateVariant } from "../variants";
import { CANONICAL_SKILL_ROOT, temporaryRoot } from "./fixture-test-helpers";
import { RUN_ID, receipt } from "./held-out-evaluation-test-helpers";
import type { request } from "./held-out-evaluation-test-helpers";

const roots: string[] = [];
const capturedPrompts: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  capturedPrompts.splice(0);
});

describe("held-out terminal evaluation concurrency", () => {
  test("Given frozen variants and a task-scoped fixture run When same-candidate terminal calls overlap Then only one owner executes 96 cells", async () => {
    // Given
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
    const expectedPrompts = new Set(
      [
        ...buildSkillCatalog("kibi-usage").filter(
          (task) => task.split === "held-out",
        ),
        ...buildBundleCatalog(),
      ].map((task) => task.prompt),
    );
    const module = await import("../held-out-evaluation");
    let runnerCalls = 0;
    let reservationVisibleBeforeCellOne = false;
    const firstCellStarted = Promise.withResolvers<void>();
    const allowFirstCell = Promise.withResolvers<void>();
    const cellRunner = async (input: {
      readonly request: ReturnType<typeof request>;
    }) => {
      if (runnerCalls === 0) {
        reservationVisibleBeforeCellOne = existsSync(
          path.join(
            root,
            "evaluation",
            "held-out-evidence",
            "reservation.json",
          ),
        );
        firstCellStarted.resolve();
        await allowFirstCell.promise;
      }
      runnerCalls += 1;
      capturedPrompts.push(input.request.prompt);
      return {
        receipt: receipt(input.request, true),
        artifactDirectory: "/tmp/held-out-cell",
        receiptPath: "/tmp/held-out-cell/receipt.json",
      };
    };
    const input = {
      skill: "kibi-usage" as const,
      variants,
      runtime: { fixtureRunRoot: fixtureRun.roots.runRoot },
      sourceWorktree: process.cwd(),
      artifactRoot: path.join(root, "evaluation"),
      runId: RUN_ID,
      roots: corpus.roots,
      env: process.env,
      cellRunner,
    };
    const first = module.defaultEvaluateHeldOut(input);
    await firstCellStarted.promise;

    // When
    const retry = module.defaultEvaluateHeldOut(input);
    await new Promise<void>((resolve) => setImmediate(resolve));
    allowFirstCell.resolve();
    const [result, retried] = await Promise.all([first, retry]);
    const receiptStoreOptions = {
      artifactRoot: input.artifactRoot,
      roots: corpus.roots,
      candidateHashes: {
        baseline: variants[0].bodyHash,
        oneShot: variants[1].bodyHash,
        skillopt: variants[2].bodyHash,
      },
      heldOutCaseIds: PREDICATE_HELD_OUT_CASE_IDS,
      runId: input.runId,
      fixtureClaimRoot: corpus.roots.corpus,
    };
    const [firstTerminal, retryTerminal] = await Promise.all([
      new HeldOutReceiptStore(receiptStoreOptions).loadTerminal(),
      new HeldOutReceiptStore(receiptStoreOptions).loadTerminal(),
    ]);

    // Then
    expect(retried).toEqual(result);
    expect(result.cellCount).toBe(96);
    expect(runnerCalls).toBe(96);
    expect(reservationVisibleBeforeCellOne).toBe(true);
    expect(capturedPrompts).toHaveLength(96);
    expect(capturedPrompts.every((prompt) => expectedPrompts.has(prompt))).toBe(
      true,
    );
    expect(capturedPrompts).not.toContain(variants[2].body);
    expect(firstTerminal).toBeDefined();
    expect(retryTerminal).toBeDefined();
    expect(firstTerminal?.receiptBytes).toBe(retryTerminal?.receiptBytes);
  });
});
