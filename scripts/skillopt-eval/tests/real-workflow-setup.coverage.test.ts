// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { materializePredicateCorpus } from "../fixtures/predicate-corpus";
import { predicateRoots } from "../real-workflow-setup";
import { temporaryRoot } from "./fixture-test-helpers";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("real-workflow-setup remaining branches", () => {
  test("predicateRoots materializes when the manifest is missing", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const materialized = await predicateRoots(root);
    expect(materialized.corpus).toMatch(/^[a-f0-9]{64}$/);
  });

  test("predicateRoots returns the current roots when the persisted hash matches", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const first = materializePredicateCorpus({
      artifactRoot: path.join(root, "predicate-corpus"),
    });
    const second = await predicateRoots(root);
    expect(second).toEqual(first.roots);
  });

  test("predicateRoots throws when the persisted roots drift", async () => {
    const root = temporaryRoot();
    roots.push(root);
    materializePredicateCorpus({
      artifactRoot: path.join(root, "predicate-corpus"),
    });
    const manifestPath = path.join(
      root,
      "predicate-corpus",
      "candidate-root-manifest.json",
    );
    writeFileSync(
      manifestPath,
      JSON.stringify({
        roots: {
          corpus: "a".repeat(64),
          evaluator: "b".repeat(64),
          querySet: "c".repeat(64),
          baseline: "d".repeat(64),
          catalog: "e".repeat(64),
          verifier: "f".repeat(64),
          publicRoot: "1".repeat(64),
          privateRoot: "2".repeat(64),
          artifactSchema: "3".repeat(64),
        },
      }),
    );
    await expect(predicateRoots(root)).rejects.toThrow("predicate_root_drift");
  });
});
