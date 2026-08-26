import { describe, expect, test } from "bun:test";
import { OBJECTIVE_WORKFLOWS } from "../fixtures/objective-expectations";

// The final-state probe always runs kb_status after the episode, and the
// staged fixture workspaces always have an attached branch store with a
// git-anchored verification snapshot. Any expectation that cannot be
// produced by that surface is a scoring defect, not an agent failure.
describe("objective workflow expectations stay surface-reachable", () => {
  test("no objective expects a verification state the probe cannot emit", () => {
    for (const [code, workflow] of Object.entries(OBJECTIVE_WORKFLOWS)) {
      expect(workflow.expectedVerificationState, code).not.toBe(
        "not_evaluated",
      );
    }
  });

  test("mutating bundle objectives expect a dirtied verification snapshot", () => {
    for (const code of [
      "bundle_bootstrap_discovery",
      "bundle_mutation_validation",
      "bundle_mutation_validation_recovery",
      "bundle_semantic_test",
      "bundle_predicate_test",
    ]) {
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedVerificationState, code).toBe(
        "dirty",
      );
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedKbState, code).toBe(
        "clean_fresh",
      );
    }
  });

  test("read-only bundle objectives stay clean_fresh with fresh verification", () => {
    expect(OBJECTIVE_WORKFLOWS.bundle_source_freshness?.expectedKbState).toBe(
      "clean_fresh",
    );
    expect(
      OBJECTIVE_WORKFLOWS.bundle_source_freshness?.expectedVerificationState,
    ).toBe("fresh");
    expect(OBJECTIVE_WORKFLOWS.bundle_source_stale?.expectedKbState).toBe(
      "stale",
    );
    expect(
      OBJECTIVE_WORKFLOWS.bundle_source_stale?.expectedVerificationState,
    ).toBe("fresh");
  });

  test("thin bootstrap interim outcomes expect the staged thin posture", () => {
    for (const code of ["bootstrap_analysis", "bounded_context_questions"]) {
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedKbState, code).toBe(
        "clean_fresh",
      );
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedVerificationState, code).toBe(
        "fresh",
      );
    }
  });

  test("sanctioned mutations auto-sync the store but not the git-anchored snapshot", () => {
    for (const code of [
      "safe_typed_mutation",
      "validation_recovery",
      "approved_plan_apply",
      "symbol_granularity",
    ]) {
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedKbState, code).toBe(
        "clean_fresh",
      );
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedVerificationState, code).toBe(
        "dirty",
      );
    }
  });
});
