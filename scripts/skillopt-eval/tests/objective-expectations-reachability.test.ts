import { describe, expect, test } from "bun:test";
import {
  DIRTY_SOURCE_OBJECTIVES,
  OBJECTIVE_WORKFLOWS,
} from "../fixtures/objective-expectations";

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
    ]) {
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedKbState, code).toBe(
        "clean_fresh",
      );
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedVerificationState, code).toBe(
        "dirty",
      );
    }
  });

  test("dirty-source objectives expect the stale KB their staged edit produces", () => {
    for (const code of DIRTY_SOURCE_OBJECTIVES) {
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedKbState, code).toBe("stale");
      expect(OBJECTIVE_WORKFLOWS[code]?.expectedVerificationState, code).toBe(
        "dirty",
      );
    }
  });
});
