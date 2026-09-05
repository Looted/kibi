// implements REQ-skillopt-predicate-first-requirements
// implements REQ-skillopt-codex-optimization
import { describe, expect, test } from "bun:test";
import {
  buildBundleCatalog,
  buildHeldOutCatalog,
  buildPublicCatalog,
  buildSkillCatalog,
} from "../catalog";
import {
  blindedVariantOrder,
  buildPrivateManifest,
  verifyPrivateManifestIntegrity,
} from "../fixtures/evaluator";

function manifestFor(objectiveCode: string) {
  const catalog = [
    ...buildSkillCatalog("kibi-usage"),
    ...buildSkillCatalog("kibi-freshness"),
    ...buildSkillCatalog("kibi-traceability"),
    ...buildSkillCatalog("kibi-bootstrap"),
    ...buildPublicCatalog(),
    ...buildHeldOutCatalog(),
  ];
  const task = catalog.find(
    (candidate) => candidate.taskData.objectiveCode === objectiveCode,
  );
  if (task === undefined) throw new Error(`missing fixture: ${objectiveCode}`);
  return {
    task,
    manifest: buildPrivateManifest({
      task: task as unknown as Parameters<typeof buildPrivateManifest>[0]["task"],
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
    }),
  };
}

describe("buildPrivateManifest remaining required-tool and workflow branches", () => {
  test("sequences ingest, inspect, delete, migration, and read-only tool lists", () => {
    const ingest = manifestFor("contracted_e2e_with_ontology_gap").manifest;
    expect(ingest.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_ingest_proof", "kb_coverage", "kb_check"]),
    );

    const inspect = manifestFor("unchanged_snapshot_receipt_reuse").manifest;
    expect(inspect.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_status", "kb_coverage", "kb_check"]),
    );
    expect(
      inspect.orderedMcpPredicates.required.some(
        ({ tool }) => tool === "kb_ingest_proof",
      ),
    ).toBe(false);

    const deleted = manifestFor("relationship_shard_delete").manifest;
    expect(
      deleted.orderedMcpPredicates.required.some(({ tool }) => tool === "kb_delete"),
    ).toBe(true);
    expect(
      deleted.orderedMcpPredicates.forbidden.some(
        ({ tool }) => tool === "kb_delete",
      ),
    ).toBe(false);

    const migration = manifestFor("legacy_branch_storage").manifest;
    expect(migration.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_status", "kb_apply_plan", "kb_check"]),
    );

    const drift = manifestFor("append_only_contract_drift").manifest;
    expect(drift.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_ingest_proof", "kb_coverage", "kb_check"]),
    );
  });

  test("keeps interim bootstrap outcomes non-critical and marks applicable adversarial fixtures", () => {
    const { task, manifest } = manifestFor("bootstrap_analysis");
    const complete = manifest.expectedFinalState.find((item) =>
      item.key.startsWith("final-"),
    );
    expect(complete).toMatchObject({ expected: false, critical: false });
    expect(manifest.workflowExpectation?.expectedOutcome).toBe("interim");
    expect(
      manifest.adversarialAssessments.some(
        (assessment) =>
          assessment.applicable ===
          task.taskData.adversarialCases.includes(
            assessment.class === "malformed-task-descriptor"
              ? "malformed-input"
              : assessment.class === "generated-stale-state"
                ? "stale-state"
                : assessment.class === "dirty-worktree"
                  ? "dirty-state"
                  : assessment.class === "misleading-success-output"
                    ? "misleading-success"
                    : assessment.class === "mid-operation-interruption"
                      ? "interruption-cleanup"
                      : assessment.class === "approval-boundary"
                        ? "approval-boundary"
                        : "prompt-injection",
          ),
      ),
    ).toBe(true);
  });

  test("predicate-family tasks carry private expectations and blinded variant slots", () => {
    const predicate = [...buildPublicCatalog(), ...buildHeldOutCatalog()].find(
      (task) => task.family === "fact-predicate-modeling",
    );
    if (!predicate) throw new Error("predicate fixture missing");
    const manifest = buildPrivateManifest({
      task: predicate as unknown as Parameters<
        typeof buildPrivateManifest
      >[0]["task"],
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
    });
    expect(manifest.predicateExpectation).not.toBeNull();
    expect(manifest.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      [
        "kb_search",
        "kb_query",
        "kb_semantic_advisor",
        "kb_suggest_predicates",
        "kb_model_requirement",
        "kb_upsert",
        "kb_check",
      ],
    );
    expect(blindedVariantOrder(predicate.id, predicate.skill)).toHaveLength(3);
  });

  test("read-only usage tasks omit writes while write tasks require upsert", () => {
    const readOnly = manifestFor("discover_then_exact_lookup").manifest;
    expect(
      readOnly.orderedMcpPredicates.required.some(
        ({ tool }) => tool === "kb_upsert",
      ),
    ).toBe(false);
    const written = manifestFor("safe_typed_mutation").manifest;
    expect(
      written.orderedMcpPredicates.required.some(
        ({ tool }) => tool === "kb_upsert",
      ),
    ).toBe(true);
  });

  test("covers leftover skill, receipt, delete, and fixture-setup builders", () => {
    const approved = manifestFor("approved_plan_apply").manifest;
    expect(approved.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_plan_bootstrap", "kb_apply_plan", "kb_check"]),
    );
    expect(approved.workflowExpectation?.expectedOutcome).toBe("complete");

    const repair = manifestFor("repair_escalation").manifest;
    expect(repair.workflowExpectation?.expectedOutcome).toBe("blocked");

    const freshness = manifestFor("recover_stale_state").manifest;
    expect(freshness.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_status", "kb_query", "kb_check"]),
    );
    expect(freshness.fixtureSetup).toBe("seeded_stale_kb");

    const trace = manifestFor("discover_requirement").manifest;
    expect(trace.orderedMcpPredicates.required.map(({ tool }) => tool)).toEqual(
      expect.arrayContaining(["kb_search", "kb_query", "kb_graph"]),
    );

    const inspect = manifestFor("quality_diagnostic_disposition").manifest;
    expect(
      inspect.orderedMcpPredicates.required.some(
        ({ tool }) => tool === "kb_ingest_proof",
      ),
    ).toBe(false);

    const ingest = manifestFor("final_integration_invalidates_receipts").manifest;
    expect(
      ingest.orderedMcpPredicates.required.some(
        ({ tool }) => tool === "kb_ingest_proof",
      ),
    ).toBe(true);

    const deleted = manifestFor("legacy_shard_edge_cleanup").manifest;
    expect(
      deleted.orderedMcpPredicates.required.some(({ tool }) => tool === "kb_delete"),
    ).toBe(true);

    const bundle = buildBundleCatalog()[0];
    if (bundle === undefined) throw new Error("bundle fixture missing");
    const bundleManifest = buildPrivateManifest({
      task: bundle as unknown as Parameters<typeof buildPrivateManifest>[0]["task"],
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
    });
    expect(
      bundleManifest.orderedMcpPredicates.required.map(({ tool }) => tool),
    ).toEqual(expect.arrayContaining(["kb_plan_bootstrap", "kb_search"]));
    expect(verifyPrivateManifestIntegrity(bundle as never, bundleManifest)).toBe(
      true,
    );

    const predicate = [...buildPublicCatalog(), ...buildHeldOutCatalog()].find(
      (task) => task.family === "fact-predicate-modeling",
    );
    if (!predicate) throw new Error("predicate fixture missing");
    const predicateManifest = buildPrivateManifest({
      task: predicate as unknown as Parameters<
        typeof buildPrivateManifest
      >[0]["task"],
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
    });
    expect(predicateManifest.workflowExpectation).toBeNull();

    const partial = buildPrivateManifest({
      task: {
        ...predicate,
        initialState: { ...predicate.initialState, kb: "partial" },
      } as never,
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
    });
    expect(partial.fixtureSetup).toBeUndefined();
  });
});
