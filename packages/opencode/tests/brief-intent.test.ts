// TDD: These tests will FAIL first, then brief-intent.ts implementation will make them pass.
// implements REQ-opencode-smart-enforcement-v1

import { describe, it } from "node:test";
import assert from "node:assert";
import type { RepoPosture } from "../src/repo-posture.js";
import type { RiskClass } from "../src/risk-classifier.js";
import {
  computeBriefIntent,
  type BriefIntentInputs,
  type BriefIntentResult,
} from "../src/brief-intent.js";

// Helper to create inputs with required defaults
function makeInputs(overrides: Partial<BriefIntentInputs> = {}): BriefIntentInputs {
  return {
    workspaceRoot: "/test-workspace",
    branch: "main",
    editedFilePath: "src/foo.ts",
    posture: "root_active",
    riskClass: "behavior_candidate",
    maintenanceDegraded: false,
    getSourceLinkedRequirementIds: () => [],
    ...overrides,
  };
}

// Test: behavior_candidate + authoritative posture -> eligible=true with seedIds
describe("brief-intent: behavior_candidate with authoritative posture", () => {
  it("returns eligible=true and populates seedIds when source-linked IDs exist", () => {
    const inputs = makeInputs({
      getSourceLinkedRequirementIds: () => ["REQ-001", "REQ-002"],
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, true, "Should be eligible for authoritative risky code");
    assert.deepStrictEqual(result.seedIds, ["REQ-001", "REQ-002"], "Should include source-linked IDs");
    assert.strictEqual(result.keepManualCue, true, "Should keep manual cue by default");
  });
});

// Test: traceability_candidate + authoritative posture -> eligible=true
describe("brief-intent: traceability_candidate with authoritative posture", () => {
  it("returns eligible=true for traceability_candidate", () => {
    const inputs = makeInputs({
      riskClass: "traceability_candidate",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, true, "Should be eligible for traceability_candidate");
  });
});

// Test: non-authoritative posture -> eligible=false
describe("brief-intent: non-authoritative posture", () => {
  it("returns ineligible for vendored_only posture", () => {
    const inputs = makeInputs({
      posture: "vendored_only",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for vendored_only");
  });

  it("returns ineligible for root_partial posture", () => {
    const inputs = makeInputs({
      posture: "root_partial",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for root_partial");
  });

  it("returns ineligible for root_uninitialized posture", () => {
    const inputs = makeInputs({
      posture: "root_uninitialized",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for root_uninitialized");
  });
});

// Test: maintenance_degraded -> eligible=false
describe("brief-intent: maintenance degraded", () => {
  it("returns ineligible when maintenanceDegraded=true", () => {
    const inputs = makeInputs({
      maintenanceDegraded: true,
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible when maintenance degraded");
  });
});

// Test: safe_docs_only -> eligible=false
describe("brief-intent: safe_docs_only", () => {
  it("returns ineligible for safe_docs_only", () => {
    const inputs = makeInputs({
      riskClass: "safe_docs_only",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for safe_docs_only");
  });
});

// Test: safe_test_only -> eligible=false
describe("brief-intent: safe_test_only", () => {
  it("returns ineligible for safe_test_only", () => {
    const inputs = makeInputs({
      riskClass: "safe_test_only",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for safe_test_only");
  });
});

// Test: manual_kb_edit -> eligible=false
describe("brief-intent: manual_kb_edit", () => {
  it("returns ineligible for manual_kb_edit", () => {
    const inputs = makeInputs({
      riskClass: "manual_kb_edit",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for manual_kb_edit");
  });
});

// Test: eligible class but empty source-linked IDs and no sourceFiles -> eligible=false
describe("brief-intent: empty source-linked IDs", () => {
  it("returns ineligible when no sourceFiles and no seedIds", () => {
    const inputs = makeInputs({
      editedFilePath: "",  // Empty path means no source file
      getSourceLinkedRequirementIds: () => [],
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible without source context");
  });

  it("returns eligible with sourceFiles even when seedIds are empty", () => {
    const inputs = makeInputs({
      editedFilePath: "src/foo.ts",
      getSourceLinkedRequirementIds: () => [],
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, true, "Should be eligible with sourceFiles");
  });
});

// Test: same-fingerprint repeated invocations produce identical results (determinism)
describe("brief-intent: determinism", () => {
  it("produces identical results for same inputs", () => {
    const inputs = makeInputs({
      workspaceRoot: "/ws",
      branch: "feature",
      editedFilePath: "src/bar.ts",
      riskClass: "behavior_candidate",
      posture: "root_active",
    });
    const result1 = computeBriefIntent(inputs);
    const result2 = computeBriefIntent(inputs);
    assert.strictEqual(result1.fingerprint, result2.fingerprint, "Fingerprint should be deterministic");
    assert.strictEqual(result1.eligible, result2.eligible, "Eligibility should be deterministic");
    assert.strictEqual(result1.reason, result2.reason, "Reason should be deterministic");
    assert.deepStrictEqual(result1.sourceFiles, result2.sourceFiles, "sourceFiles should be deterministic");
    assert.deepStrictEqual(result1.seedIds, result2.seedIds, "seedIds should be deterministic");
  });
});

// Test: req_policy_candidate -> eligible=false
describe("brief-intent: req_policy_candidate", () => {
  it("returns ineligible for req_policy_candidate", () => {
    const inputs = makeInputs({
      riskClass: "req_policy_candidate",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for req_policy_candidate");
  });
});

// Test: kb_doc_structural -> eligible=false
describe("brief-intent: kb_doc_structural", () => {
  it("returns ineligible for kb_doc_structural", () => {
    const inputs = makeInputs({
      riskClass: "kb_doc_structural",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, false, "Should NOT be eligible for kb_doc_structural");
  });
});

// Test: fingerprint construction
describe("brief-intent: fingerprint", () => {
  it("includes workspaceRoot, branch, editedFilePath, and riskClass", () => {
    const inputs = makeInputs({
      workspaceRoot: "/my-workspace",
      branch: "develop",
      editedFilePath: "src/utils.ts",
      riskClass: "traceability_candidate",
    });
    const result = computeBriefIntent(inputs);
    assert.ok(
      result.fingerprint.includes("/my-workspace") &&
      result.fingerprint.includes("develop") &&
      result.fingerprint.includes("src/utils.ts") &&
      result.fingerprint.includes("traceability_candidate"),
      "Fingerprint should contain all key components",
    );
  });
});

// Test: sourceFiles defaults to edited file
describe("brief-intent: sourceFiles defaults", () => {
  it("defaults sourceFiles to edited file path", () => {
    const inputs = makeInputs({
      editedFilePath: "src/auth/login.ts",
    });
    const result = computeBriefIntent(inputs);
    assert.deepStrictEqual(result.sourceFiles, ["src/auth/login.ts"], "Should default to edited file");
  });

  it("returns empty sourceFiles when editedFilePath is empty", () => {
    const inputs = makeInputs({
      editedFilePath: "",
    });
    const result = computeBriefIntent(inputs);
    assert.deepStrictEqual(result.sourceFiles, [], "Should be empty when no file");
  });
});

// Test: hybrid_root_plus_vendored is authoritative
describe("brief-intent: hybrid_root_plus_vendored authoritative", () => {
  it("returns eligible=true for hybrid_root_plus_vendored with behavior_candidate", () => {
    const inputs = makeInputs({
      posture: "hybrid_root_plus_vendored",
      riskClass: "behavior_candidate",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, true, "Should be eligible for hybrid_root_plus_vendored");
  });

  it("returns eligible=true for hybrid_root_plus_vendored with traceability_candidate", () => {
    const inputs = makeInputs({
      posture: "hybrid_root_plus_vendored",
      riskClass: "traceability_candidate",
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.eligible, true, "Should be eligible for hybrid_root_plus_vendored");
  });
});

// Test: up to 3 seedIds
describe("brief-intent: seedIds limit", () => {
  it("includes up to 3 source-linked requirement IDs", () => {
    const inputs = makeInputs({
      getSourceLinkedRequirementIds: () => ["REQ-001", "REQ-002", "REQ-003", "REQ-004"],
    });
    const result = computeBriefIntent(inputs);
    assert.strictEqual(result.seedIds.length, 3, "Should limit to 3 seedIds");
    assert.deepStrictEqual(result.seedIds, ["REQ-001", "REQ-002", "REQ-003"]);
  });
});