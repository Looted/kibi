import { describe, expect, it } from "bun:test";

import {
  createKbFreshnessEvidenceStore,
  evaluateKbFreshness,
} from "../src/kb-freshness-state";
import type {
  KbFreshnessEvidence,
  KbFreshnessScope,
} from "../src/kb-freshness-state";

describe("evaluateKbFreshness", () => {
  it("returns clean with allowsCompletion=true when changedFiles is empty", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "main",
      fingerprint: "fp-1",
      changedFiles: [],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("clean");
    expect(result.allowsCompletion).toBe(true);
    expect(result.requiresEvidence).toBe(false);
    expect(result.reason).toBe("No files changed");
  });

  it("returns evidence-required with allowsCompletion=false when changedFiles exist but no decision", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-2",
      changedFiles: ["src/foo.ts"],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.requiresEvidence).toBe(true);
  });

  it("returns updated with allowsCompletion=true when decision=updated and kbMutation+kbCheck", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-3",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: true,
      kbCheck: true,
      decision: "updated",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("updated");
    expect(result.allowsCompletion).toBe(true);
  });

  it("returns evidence-required for decision=updated when kbMutation is false", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-4",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: false,
      kbCheck: true,
      decision: "updated",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.missingEvidence).toContain("kbMutation");
  });

  it("returns evidence-required for decision=updated when kbCheck is false", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-5",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: true,
      kbCheck: false,
      decision: "updated",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.missingEvidence).toContain("kbCheck");
  });

  it("returns evidence-required for decision=updated when both kbMutation and kbCheck are missing", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-6",
      changedFiles: ["src/foo.ts"],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
      decision: "updated",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.missingEvidence).toContain("kbMutation");
    expect(result.missingEvidence).toContain("kbCheck");
  });

  it("returns no-impact-accepted with allowsCompletion=true when decision=no-impact and all evidence present", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-7",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: false,
      kbCheck: true,
      decision: "no-impact",
      rationale: "Only renamed internal variables, no KB impact",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("no-impact-accepted");
    expect(result.allowsCompletion).toBe(true);
  });

  it("returns evidence-required for decision=no-impact without rationale", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-8",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: false,
      kbCheck: true,
      decision: "no-impact",
      rationale: "",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.missingEvidence).toContain("rationale");
  });

  it("returns evidence-required for decision=no-impact without sourceLinkedDiscovery", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-9",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: true,
      decision: "no-impact",
      rationale: "Only renamed internal variables",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.missingEvidence).toContain("sourceLinkedDiscovery");
  });

  it("returns evidence-required for decision=no-impact without kbCheck", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-10",
      changedFiles: ["src/foo.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: false,
      kbCheck: false,
      decision: "no-impact",
      rationale: "Only renamed internal variables",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("evidence-required");
    expect(result.allowsCompletion).toBe(false);
    expect(result.missingEvidence).toContain("kbCheck");
  });

  it("returns deferred with allowsCompletion=false when decision=deferred", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-11",
      changedFiles: ["src/foo.ts"],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
      decision: "deferred",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("deferred");
    expect(result.allowsCompletion).toBe(false);
  });

  it("returns check-failed with allowsCompletion=false when decision=failed", () => {
    const evidence: KbFreshnessEvidence = {
      agentIdentity: "test",
      worktree: "/repo",
      branch: "feature",
      fingerprint: "fp-12",
      changedFiles: ["src/foo.ts"],
      kbStatus: false,
      sourceLinkedDiscovery: false,
      kbMutation: false,
      kbCheck: false,
      decision: "failed",
    };

    const result = evaluateKbFreshness(evidence);

    expect(result.state).toBe("check-failed");
    expect(result.allowsCompletion).toBe(false);
  });
});

describe("createKbFreshnessEvidenceStore", () => {
  const scopeA: KbFreshnessScope = {
    sessionId: "session-1",
    agentIdentity: "agent-alpha",
    worktree: "/repo/worktree-a",
    branch: "main",
    fingerprint: "fp-a",
  };

  const scopeB: KbFreshnessScope = {
    sessionId: "session-1",
    agentIdentity: "agent-beta",
    worktree: "/repo/worktree-b",
    branch: "feature-x",
    fingerprint: "fp-b",
  };

  it("records kb_upsert and returns kbMutation=true and decision=updated", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_upsert");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.kbMutation).toBe(true);
    expect(evidence.decision).toBe("updated");
    expect(evidence.agentIdentity).toBe("agent-alpha");
    expect(evidence.worktree).toBe("/repo/worktree-a");
    expect(evidence.branch).toBe("main");
    expect(evidence.fingerprint).toBe("fp-a");
  });

  it("records kb_delete and returns kbMutation=true and decision=updated", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_delete");

    const evidence = store.getEvidence(scopeA, ["src/bar.ts"]);

    expect(evidence.kbMutation).toBe(true);
    expect(evidence.decision).toBe("updated");
  });

  it("records kb_check and returns kbCheck=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_check");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.kbCheck).toBe(true);
  });

  it("records kb_status and returns kbStatus=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_status");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.kbStatus).toBe(true);
  });

  it("records kb_search and returns sourceLinkedDiscovery=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_search");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.sourceLinkedDiscovery).toBe(true);
  });

  it("records kb_query and returns sourceLinkedDiscovery=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_query");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.sourceLinkedDiscovery).toBe(true);
  });

  it("records kb_graph and returns sourceLinkedDiscovery=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_graph");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.sourceLinkedDiscovery).toBe(true);
  });

  it("records kb_find_gaps and returns sourceLinkedDiscovery=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_find_gaps");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.sourceLinkedDiscovery).toBe(true);
  });

  it("records kb_coverage and returns sourceLinkedDiscovery=true", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordToolEvidence(scopeA, "kb_coverage");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.sourceLinkedDiscovery).toBe(true);
  });

  it("records noImpact and returns decision=no-impact with rationale", () => {
    const store = createKbFreshnessEvidenceStore();
    store.recordNoImpact(scopeA, "Only test changes, no KB impact");

    const evidence = store.getEvidence(scopeA, ["src/test.ts"]);

    expect(evidence.decision).toBe("no-impact");
    expect(evidence.rationale).toBe("Only test changes, no KB impact");
  });

  it("combines multiple tool recordings in a single scope", () => {
    const store = createKbFreshnessEvidenceStore();

    store.recordToolEvidence(scopeA, "kb_status");
    store.recordToolEvidence(scopeA, "kb_search");
    store.recordToolEvidence(scopeA, "kb_upsert");
    store.recordToolEvidence(scopeA, "kb_check");

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.kbStatus).toBe(true);
    expect(evidence.sourceLinkedDiscovery).toBe(true);
    expect(evidence.kbMutation).toBe(true);
    expect(evidence.decision).toBe("updated");
    expect(evidence.kbCheck).toBe(true);
  });

  it("does not leak evidence across different scopes", () => {
    const store = createKbFreshnessEvidenceStore();

    // Record kb_upsert for scopeA only
    store.recordToolEvidence(scopeA, "kb_upsert");

    // getEvidence for scopeB should NOT have kbMutation
    const evidenceB = store.getEvidence(scopeB, ["src/bar.ts"]);

    expect(evidenceB.kbMutation).toBe(false);
    expect(evidenceB.decision).toBeUndefined();
    expect(evidenceB.agentIdentity).toBe("agent-beta");
    expect(evidenceB.worktree).toBe("/repo/worktree-b");
    expect(evidenceB.branch).toBe("feature-x");
    expect(evidenceB.fingerprint).toBe("fp-b");
  });

  it("does not leak across different fingerprints in same session", () => {
    const store = createKbFreshnessEvidenceStore();

    const scopeA1: KbFreshnessScope = {
      sessionId: "session-1",
      agentIdentity: "agent-alpha",
      worktree: "/repo/a",
      branch: "main",
      fingerprint: "fp-a1",
    };

    const scopeA2: KbFreshnessScope = {
      sessionId: "session-1",
      agentIdentity: "agent-alpha",
      worktree: "/repo/b",
      branch: "feature",
      fingerprint: "fp-a2",
    };

    store.recordToolEvidence(scopeA1, "kb_upsert");

    const evidence = store.getEvidence(scopeA2, ["src/bar.ts"]);

    expect(evidence.kbMutation).toBe(false);
  });

  it("resetScope clears evidence for that scope", () => {
    const store = createKbFreshnessEvidenceStore();

    store.recordToolEvidence(scopeA, "kb_upsert");
    store.recordToolEvidence(scopeA, "kb_check");

    store.resetScope(scopeA);

    const evidence = store.getEvidence(scopeA, ["src/foo.ts"]);

    expect(evidence.kbMutation).toBe(false);
    expect(evidence.kbCheck).toBe(false);
    expect(evidence.decision).toBeUndefined();
  });

  it("resetScope does not affect other scopes", () => {
    const store = createKbFreshnessEvidenceStore();

    store.recordToolEvidence(scopeA, "kb_upsert");
    store.recordToolEvidence(scopeB, "kb_check");

    store.resetScope(scopeA);

    const evidenceB = store.getEvidence(scopeB, ["src/bar.ts"]);

    expect(evidenceB.kbCheck).toBe(true);
    expect(evidenceB.kbMutation).toBe(false);
  });

  it("passes changedFiles through to getEvidence", () => {
    const store = createKbFreshnessEvidenceStore();

    const evidence = store.getEvidence(scopeA, ["src/a.ts", "src/b.ts"]);

    expect(evidence.changedFiles).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("passes sessionId through to getEvidence", () => {
    const store = createKbFreshnessEvidenceStore();

    const evidence = store.getEvidence(scopeA, []);

    expect(evidence.sessionId).toBe("session-1");
  });

  it("handles missing sessionId gracefully", () => {
    const store = createKbFreshnessEvidenceStore();
    const scopeWithoutSession: KbFreshnessScope = {
      agentIdentity: "anon-agent",
      worktree: "/repo/anon",
      branch: "main",
      fingerprint: "fp-anon",
    };

    const evidence = store.getEvidence(scopeWithoutSession, []);

    expect(evidence.sessionId).toBeUndefined();
    expect(evidence.agentIdentity).toBe("anon-agent");
    expect(evidence.fingerprint).toBe("fp-anon");
  });
});
