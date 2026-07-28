import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import path from "node:path";
import {
  type TaskSpec,
  buildBundleCatalog,
  buildHeldOutCatalog,
  buildPublicCatalog,
  buildSkillCatalog,
  catalogHash,
  validateSkillCatalog,
} from "../catalog";
import { CANONICAL_SKILLS } from "../catalog";
import {
  PREDICATE_DEVELOPMENT_CASE_ID,
  PREDICATE_HELD_OUT_CASE_IDS,
  PREDICATE_SEMANTIC_CLASSES,
  PREDICATE_TRAIN_CASE_IDS,
  type PredicateMaterialization,
  __resetPredicateMatrixCacheForTests,
  materializePredicateCorpus,
  reservePredicateMatrix,
} from "../fixtures/predicate-corpus";
import { temporaryRoot } from "./fixture-test-helpers";

const predicateRoots: string[] = [];
afterEach(() => {
  for (const root of predicateRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
  __resetPredicateMatrixCacheForTests();
});

describe("SkillOpt fixture catalog", () => {
  test("builds the frozen 8/4/16 split for one skill", () => {
    const tasks = buildSkillCatalog("kibi-usage");

    expect(tasks).toHaveLength(28);
    expect(() => validateSkillCatalog(tasks, "kibi-usage")).not.toThrow();
  });

  test("rejects duplicate task IDs before host launch", () => {
    const tasks = buildSkillCatalog("kibi-usage");
    const [first, second] = tasks;
    if (first === undefined || second === undefined) {
      throw new Error("catalog must contain at least two tasks");
    }
    const duplicate: TaskSpec = { ...first, id: second.id };

    expect(() =>
      validateSkillCatalog([duplicate, ...tasks.slice(1)], "kibi-usage"),
    ).toThrow("duplicate task ID");
  });

  test("produces a stable catalog hash and eight distinct bundle cases", () => {
    const tasks = buildBundleCatalog();

    expect(tasks).toHaveLength(8);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(8);
    expect(catalogHash(tasks)).toBe(catalogHash([...tasks]));
  });

  test("encodes explicit state, scorer reference, and family task data", () => {
    const tasks = [...buildPublicCatalog(), ...buildHeldOutCatalog()];

    expect(tasks).toHaveLength(120);
    expect(
      tasks.every(
        (task) =>
          task.activationMode.length > 0 &&
          task.initialState.setupBoundary === "external-kibi-adapter" &&
          task.allowedPublicFiles.length > 0 &&
          task.scorerReference.startsWith("scorer-ref-") &&
          task.taskData.objectiveCode.length > 0,
      ),
    ).toBe(true);
    expect(new Set(tasks.map((task) => task.taskData.approvalPhase))).toEqual(
      new Set(["not-applicable", "pre-approval", "post-approval"]),
    );
    expect(
      new Set(tasks.flatMap((task) => task.taskData.adversarialCases)),
    ).toEqual(
      new Set([
        "malformed-input",
        "prompt-injection",
        "dirty-state",
        "stale-state",
        "misleading-success",
        "interruption-cleanup",
        "approval-boundary",
      ]),
    );
  });
});

describe("predicate corpus materializes stable authorized roots", () => {
  test("materializes the seven distinct predicate cases with exact 2/1/4 allocation", () => {
    const root = temporaryRoot();
    predicateRoots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });

    expect([...corpus.trainCaseIds].sort()).toEqual(
      [...PREDICATE_TRAIN_CASE_IDS].sort(),
    );
    expect(corpus.developmentCaseId).toBe(PREDICATE_DEVELOPMENT_CASE_ID);
    expect([...corpus.heldOutCaseIds].sort()).toEqual(
      [...PREDICATE_HELD_OUT_CASE_IDS].sort(),
    );
    expect(corpus.trainCaseIds).toHaveLength(2);
    expect(corpus.heldOutCaseIds).toHaveLength(4);
    expect(PREDICATE_SEMANTIC_CLASSES.size).toBe(7);
    expect(new Set(PREDICATE_SEMANTIC_CLASSES.values()).size).toBe(7);
  });

  test("emits deterministic JCS roots and unsigned candidate-root manifest twice", () => {
    const firstRoot = temporaryRoot();
    const secondRoot = temporaryRoot();
    predicateRoots.push(firstRoot, secondRoot);
    const first = materializePredicateCorpus({
      artifactRoot: path.join(firstRoot, "corpus"),
    });
    const second = materializePredicateCorpus({
      artifactRoot: path.join(secondRoot, "corpus"),
    });

    expect(second.roots).toEqual(first.roots);
    expect(second.candidateRootManifest).toEqual(first.candidateRootManifest);
    expect(first.candidateRootManifest.signedByRootAuthority).toBe(false);
    expect(second.candidateRootManifest.signedByRootAuthority).toBe(false);
    for (const rootHash of Object.values(first.roots)) {
      expect(rootHash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(first.roots).not.toBe(second.roots);
  });

  test("keeps catalog totals at 120 overall and 28 for kibi-usage", () => {
    const usage = buildSkillCatalog("kibi-usage");
    expect(usage).toHaveLength(28);
    expect(() => validateSkillCatalog(usage, "kibi-usage")).not.toThrow();
    const total = [...buildPublicCatalog(), ...buildHeldOutCatalog()];
    expect(total).toHaveLength(120);
    const usagePublic = buildPublicCatalog().filter(
      (task) => task.skill === "kibi-usage",
    );
    const usageHeldOut = buildHeldOutCatalog().filter(
      (task) => task.skill === "kibi-usage",
    );
    expect(usagePublic.length + usageHeldOut.length).toBe(28);
    expect(CANONICAL_SKILLS.length * 28 + buildBundleCatalog().length).toBe(
      120,
    );
  });

  test("unsigned roots cannot authorize training or evaluation", () => {
    const root = temporaryRoot();
    predicateRoots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });

    expect(() => corpus.assertAuthorized()).toThrow(
      /EXTERNAL_PREREQUISITE_MISSING|unsigned/,
    );
    expect(corpus.eligibility().eligible).toBe(false);
  });
});

describe("predicate corpus rejects leak duplicate root drift or adaptive held-out retry", () => {
  test("rejects injected expected outcome, duplicate claim, and root byte drift", () => {
    const root = temporaryRoot();
    predicateRoots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });

    expect(() => corpus.injectLeak("expectedPredicate")).toThrow(
      /leak|forbidden/i,
    );
    expect(() => corpus.injectDuplicateClaim()).toThrow(/duplicate/i);
    expect(() => corpus.mutateRootByte("baseline")).toThrow(
      /root_drift|digest/i,
    );
    expect(corpus.eligibility().eligible).toBe(false);
  });

  test("freezes the 36-cell terminal matrix before cell one and caches retries", () => {
    const root = temporaryRoot();
    predicateRoots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });
    const matrix = reservePredicateMatrix({
      corpus,
      candidateHashes: corpus.frozenCandidateHashes,
    });

    expect(matrix.matrixId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(matrix.cellCount).toBe(36);
    expect(matrix.reservedBeforeCellOne).toBe(true);
    expect(matrix.transition("pending")).toBe(false);
    expect(matrix.transition("running")).toBe(true);
    expect(matrix.transition("running")).toBe(false);
    expect(matrix.transition("terminal")).toBe(true);
    expect(matrix.transition("terminal")).toBe(false);

    const retry = reservePredicateMatrix({
      corpus,
      candidateHashes: corpus.frozenCandidateHashes,
    });
    expect(retry.receiptBytes).toEqual(matrix.receiptBytes);
    expect(retry.matrixId).toBe(matrix.matrixId);
  });

  test("rejects adaptive candidate after held-out and hides per-case detail", () => {
    const root = temporaryRoot();
    predicateRoots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });
    const first = reservePredicateMatrix({
      corpus,
      candidateHashes: corpus.frozenCandidateHashes,
    });
    first.transition("running");
    first.transition("terminal");

    const adapted = corpus.withAdaptiveCandidate();
    expect(() =>
      reservePredicateMatrix({
        corpus: adapted,
        candidateHashes: adapted.frozenCandidateHashes,
      }),
    ).toThrow(/adaptive|held_out|ineligible/i);

    const view = first.orchestrationView();
    expect(view).toBe("ineligible");
    expect(JSON.stringify(first)).not.toMatch(
      /case-[a-z]|predicate_name|expectedLane/,
    );
  });
});
