import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import {
  CANONICAL_SKILLS,
  buildHeldOutCatalog,
  buildPublicCatalog,
} from "../catalog";
import { parseHeldOutTaskSpec } from "../fixtures/contracts";
import {
  blindedVariantOrder,
  materializeFixtureRun,
  parsePrivateEvaluatorManifest,
  verifyPrivateManifestIntegrity,
} from "../fixtures/private";
import {
  CANONICAL_SKILL_ROOT,
  readTree,
  temporaryRoot,
  treeHash,
} from "./fixture-test-helpers";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function oneFixture() {
  const root = temporaryRoot();
  roots.push(root);
  const task = buildHeldOutCatalog()[0];
  if (task === undefined) throw new Error("held-out catalog must not be empty");
  const receipt = materializeFixtureRun({
    runRoot: path.join(root, "run"),
    canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    publicTasks: [],
    heldOutTasks: [task],
  });
  const manifest = parsePrivateEvaluatorManifest(
    readFileSync(
      path.join(receipt.roots.evaluatorRoot, "manifests", `${task.id}.json`),
      "utf8",
    ),
  );
  return { task: parseHeldOutTaskSpec(task), manifest };
}

describe("private SkillOpt fixture corpus", () => {
  test("materializes deterministic held-out and evaluator roots", () => {
    const first = temporaryRoot();
    const second = temporaryRoot();
    roots.push(first, second);
    const firstReceipt = materializeFixtureRun({
      runRoot: path.join(first, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });
    const secondReceipt = materializeFixtureRun({
      runRoot: path.join(second, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
    });

    expect(firstReceipt.publicIndex).toEqual(secondReceipt.publicIndex);
    expect(firstReceipt.heldOutIndex).toEqual(secondReceipt.heldOutIndex);
    expect(firstReceipt.privateIndex).toEqual(secondReceipt.privateIndex);
    expect(firstReceipt.heldOutIndex.tasks).toHaveLength(72);
    expect(firstReceipt.privateIndex.tasks).toHaveLength(120);
    expect(
      new Set(firstReceipt.privateIndex.tasks.map((entry) => entry.taskId)),
    ).toEqual(
      new Set(
        [...buildPublicCatalog(), ...buildHeldOutCatalog()].map(
          (task) => task.id,
        ),
      ),
    );
    expect(treeHash(firstReceipt.roots.heldOutRoot)).toBe(
      treeHash(secondReceipt.roots.heldOutRoot),
    );
    expect(treeHash(firstReceipt.roots.evaluatorRoot)).toBe(
      treeHash(secondReceipt.roots.evaluatorRoot),
    );
  });

  test("uses exact rubric allocation and valid critical keys", () => {
    const { manifest } = oneFixture();

    expect(manifest.rubric.map(({ key, points }) => ({ key, points }))).toEqual(
      [
        { key: "final_state", points: 60 },
        { key: "protocol", points: 25 },
        { key: "isolation", points: 15 },
      ],
    );
    const critical = manifest.expectedFinalState
      .filter(({ critical: isCritical }) => isCritical)
      .map(({ key }) => key)
      .sort();
    expect(
      manifest.rubric.flatMap((item) => item.criticalAssertionKeys).sort(),
    ).toEqual(critical);
  });

  test("covers every blinded permutation from fixed seed and task identity", () => {
    const tasks = [...buildPublicCatalog(), ...buildHeldOutCatalog()];
    const permutations = new Set(
      tasks.map((task) =>
        blindedVariantOrder(task.id, task.skill)
          .map(({ variant }) => variant)
          .join(","),
      ),
    );

    expect(permutations.size).toBe(6);
    expect(CANONICAL_SKILLS).toHaveLength(4);
  });

  test("mutation kills expected state, MCP order, and isolation sentinel changes", () => {
    const { task, manifest } = oneFixture();
    expect(verifyPrivateManifestIntegrity(task, manifest)).toBe(true);
    const changedState = parsePrivateEvaluatorManifest(
      JSON.stringify({
        ...manifest,
        expectedFinalState: manifest.expectedFinalState.map(
          (assertion, index) =>
            index === 0 ? { ...assertion, expected: false } : assertion,
        ),
      }),
    );
    const changedOrder = parsePrivateEvaluatorManifest(
      JSON.stringify({
        ...manifest,
        orderedMcpPredicates: {
          ...manifest.orderedMcpPredicates,
          required: [...manifest.orderedMcpPredicates.required].reverse(),
        },
      }),
    );
    const [, secondSentinel] = manifest.isolationSentinels;
    if (secondSentinel === undefined) {
      throw new Error("private manifest must contain two isolation sentinels");
    }
    const changedSentinel = parsePrivateEvaluatorManifest(
      JSON.stringify({
        ...manifest,
        isolationSentinels: ["MUTATED_SENTINEL", secondSentinel],
      }),
    );

    expect(verifyPrivateManifestIntegrity(task, changedState)).toBe(false);
    expect(verifyPrivateManifestIntegrity(task, changedOrder)).toBe(false);
    expect(verifyPrivateManifestIntegrity(task, changedSentinel)).toBe(false);
  });

  test("records concrete applicable adversarial paths and explicit exclusions", () => {
    const { manifest } = oneFixture();

    expect(manifest.adversarialAssessments).toHaveLength(8);
    expect(
      manifest.adversarialAssessments.every((item) =>
        item.applicable ? item.fixturePath !== null : item.reason.length > 0,
      ),
    ).toBe(true);
  });

  test("contract-drift case preserves history and orders current proof operations", () => {
    const root = temporaryRoot();
    roots.push(root);
    const task = buildHeldOutCatalog().find(
      (candidate) =>
        candidate.taskData.objectiveCode === "append_only_contract_drift",
    );
    if (task === undefined) {
      throw new Error("contract-drift held-out task must exist");
    }
    const receipt = materializeFixtureRun({
      runRoot: path.join(root, "run"),
      canonicalSkillRoot: CANONICAL_SKILL_ROOT,
      publicTasks: [],
      heldOutTasks: [task],
    });
    const manifest = parsePrivateEvaluatorManifest(
      readFileSync(
        path.join(receipt.roots.evaluatorRoot, "manifests", `${task.id}.json`),
        "utf8",
      ),
    );

    expect(
      manifest.orderedMcpPredicates.required.map(({ tool }) => tool),
    ).toEqual([
      "kb_search",
      "kb_query",
      "kb_status",
      "kb_ingest_verification",
      "kb_coverage",
      "kb_check",
    ]);
    expect(manifest.workflowExpectation).toMatchObject({
      expectedOutcome: "complete",
      expectedVerificationState: "fresh",
      expectedProofState: "proven",
      requiredSignals: [
        "historical contract receipt preserved",
        "current contract receipt appended",
        "contract mismatch remains non-proof",
      ],
      forbiddenActions: [
        "rewrite receipt history",
        "delete historical receipt",
        "claim old contract proof",
      ],
    });
  });

  test("predicate corpus private map records expected lane predicate and edges per case", () => {
    const root = temporaryRoot();
    roots.push(root);
    const {
      materializePredicateCorpus,
      PREDICATE_SEMANTIC_CLASSES,
    } = require("../fixtures/predicate-corpus");
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });
    const privateText = readTree(corpus.privateRootDir);

    expect(privateText).toMatch(/expectedLane/);
    for (const semanticClass of PREDICATE_SEMANTIC_CLASSES.keys()) {
      const entry = corpus.privateCaseMap.get(semanticClass);
      if (entry === undefined)
        throw new Error(`missing private case: ${semanticClass}`);
      expect(entry.expectedLane.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.expectedEdges)).toBe(true);
    }
    expect(corpus.privateCaseMap.size).toBe(7);
  });

  test("Given public corpus and workspace artifacts When materialized Then opaque case IDs are the only predicate classification", () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const {
      materializePredicateCorpus,
    } = require("../fixtures/predicate-corpus");
    const corpus = materializePredicateCorpus({
      artifactRoot: path.join(root, "corpus"),
    });

    // When
    const publicText = readTree(corpus.publicRootDir);

    // Then
    expect(publicText).not.toContain("semanticClass");
    expect(publicText).not.toMatch(
      /builtin_relational|strict_scalar_counterexample|project_local_schema|deny_polarity|keyword_false_positive/,
    );
    expect(publicText).toMatch(
      /paraphrase_equivalence|semantic_contrast|temporal_rule/,
    );
  });
});
