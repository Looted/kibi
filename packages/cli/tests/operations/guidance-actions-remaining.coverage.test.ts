// implements REQ-KIBI-BOOTSTRAP-PLAN
import { afterEach, describe, expect, test } from "bun:test";

import { buildActions } from "../../src/operations/bootstrap/guidance-actions.js";
import type {
  ActivationPolicy,
  Candidate,
  SourceOnlySignal,
} from "../../src/operations/bootstrap/types.js";

let previousExitCode: string | number | undefined | null;

afterEach(() => {
  process.exitCode = previousExitCode ?? 0;
});

function activation(
  overrides: Partial<ActivationPolicy> = {},
): ActivationPolicy {
  return {
    activationState: "root_uninitialized",
    activationMode: "cold_start_bootstrap",
    applyBlocked: false,
    allowCandidateGeneration: true,
    reason: "cold start",
    ...overrides,
  };
}

function candidate(id: string): Candidate {
  return {
    candidateId: id,
    entityType: "req",
    title: id,
    sourceKind: "typed_markdown",
    sourcePath: "docs/a.md",
    confidence: 0.8,
    confidenceBand: "high",
    evidence: [],
    relationships: [],
    applyPlan: [{ id }],
  };
}

describe("buildActions remaining relative, plan, and source-only branches", () => {
  test("keeps outside-root signal paths and emits plan plus authoring follow-ups", () => {
    previousExitCode = process.exitCode;
    const signals: SourceOnlySignal[] = [
      {
        kind: "req",
        title: "Outside",
        sourcePath: "/tmp/other/file.md",
        confidence: 0.4,
        evidence: [],
      },
      {
        kind: "test",
        title: "Inside",
        sourcePath: "/tmp/repo/src/app.test.ts",
        confidence: 0.4,
        evidence: [],
      },
    ];
    const actions = buildActions(
      "/tmp/repo",
      activation(),
      {
        sourceOfTruthPaths: [],
        sourceOfTruthNotes: [],
        priorityRoots: [],
        verificationAnchors: [],
      },
      [candidate("REQ-1")],
      signals,
    );
    expect(JSON.stringify(actions)).toContain("/tmp/other/file.md");
    expect(actions.some((action) => action.kind === "plan")).toBe(true);
    expect(
      actions.some(
        (action) =>
          action.kind === "handoff" &&
          String(action.description).includes("REQ/TEST"),
      ),
    ).toBe(true);
  });
});
