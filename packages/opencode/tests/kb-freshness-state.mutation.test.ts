import { describe, expect, test } from "bun:test";
import {
  type KbFreshnessEvidence,
  type KbFreshnessScope,
  createKbFreshnessEvidenceStore,
  evaluateKbFreshness,
} from "../src/kb-freshness-state";

function evidence(
  overrides: Partial<KbFreshnessEvidence>,
): KbFreshnessEvidence {
  return {
    agentIdentity: "agent",
    worktree: "/w",
    branch: "main",
    fingerprint: "fp",
    changedFiles: ["a.ts"],
    kbStatus: false,
    sourceLinkedDiscovery: false,
    kbMutation: false,
    kbCheck: false,
    ...overrides,
  };
}

describe("evaluateKbFreshness", () => {
  test("no changed files is clean", () => {
    expect(evaluateKbFreshness(evidence({ changedFiles: [] }))).toStrictEqual({
      state: "clean",
      requiresEvidence: false,
      allowsCompletion: true,
      reason: "No files changed",
      missingEvidence: [],
    });
  });

  test("no decision requires evidence", () => {
    expect(evaluateKbFreshness(evidence({}))).toStrictEqual({
      state: "evidence-required",
      requiresEvidence: true,
      allowsCompletion: false,
      reason: "Session modified files without KB tool evidence",
      missingEvidence: [],
    });
  });

  test("deferred", () => {
    expect(
      evaluateKbFreshness(evidence({ decision: "deferred" })),
    ).toStrictEqual({
      state: "deferred",
      requiresEvidence: false,
      allowsCompletion: false,
      reason: "KB freshness check was explicitly deferred",
      missingEvidence: [],
    });
  });

  test("failed", () => {
    expect(evaluateKbFreshness(evidence({ decision: "failed" }))).toStrictEqual(
      {
        state: "check-failed",
        requiresEvidence: false,
        allowsCompletion: false,
        reason: "KB freshness check failed",
        missingEvidence: [],
      },
    );
  });

  test("updated without evidence", () => {
    expect(
      evaluateKbFreshness(evidence({ decision: "updated" })),
    ).toStrictEqual({
      state: "evidence-required",
      requiresEvidence: true,
      allowsCompletion: false,
      reason:
        "KB was updated but required evidence (kbMutation, kbCheck) is missing",
      missingEvidence: ["kbMutation", "kbCheck"],
    });
  });

  test("updated and checked", () => {
    expect(
      evaluateKbFreshness(
        evidence({ decision: "updated", kbMutation: true, kbCheck: true }),
      ),
    ).toStrictEqual({
      state: "updated",
      requiresEvidence: false,
      allowsCompletion: true,
      reason: "KB updated and verified via kb_check",
      missingEvidence: [],
    });
  });

  test("no-impact without evidence", () => {
    expect(
      evaluateKbFreshness(evidence({ decision: "no-impact", rationale: "" })),
    ).toStrictEqual({
      state: "evidence-required",
      requiresEvidence: true,
      allowsCompletion: false,
      reason:
        "No-impact claim needs rationale, sourceLinkedDiscovery, and kbCheck",
      missingEvidence: ["rationale", "sourceLinkedDiscovery", "kbCheck"],
    });
  });

  test("no-impact with every piece of evidence", () => {
    expect(
      evaluateKbFreshness(
        evidence({
          decision: "no-impact",
          rationale: "docs only",
          sourceLinkedDiscovery: true,
          kbCheck: true,
        }),
      ),
    ).toStrictEqual({
      state: "no-impact-accepted",
      requiresEvidence: false,
      allowsCompletion: true,
      reason: "No-impact accepted with rationale and KB check passed",
      missingEvidence: [],
    });
  });
});

describe("evidence store scopes", () => {
  const scope: KbFreshnessScope = {
    agentIdentity: "ab",
    worktree: "c",
    branch: "main",
    fingerprint: "fp",
  };

  test("a fresh scope has no decision or rationale", () => {
    const store = createKbFreshnessEvidenceStore();
    expect(store.getEvidence(scope, [])).toStrictEqual({
      agentIdentity: "ab",
      worktree: "c",
      branch: "main",
      fingerprint: "fp",
      changedFiles: [],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
    });
  });

  test("scopes differing in session or in how parts split are separate", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence({ ...scope, sessionId: "s" }, "kb_check");
    store.recordToolEvidence(
      { ...scope, agentIdentity: "a", worktree: "bc" },
      "kb_status",
    );
    expect(store.getEvidence(scope, []).kbCheck).toBe(false);
    expect(store.getEvidence(scope, []).kbStatus).toBe(false);
    expect(store.getEvidence({ ...scope, sessionId: "s" }, []).kbCheck).toBe(
      true,
    );
  });
});
