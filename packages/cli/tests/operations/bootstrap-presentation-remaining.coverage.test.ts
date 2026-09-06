// implements REQ-KIBI-BOOTSTRAP-PLAN
import { afterEach, describe, expect, test } from "bun:test";

import { presentBootstrap } from "../../src/operations/bootstrap/presentation.js";
import type {
  ActivationPolicy,
  Candidate,
  DiscoverySummary,
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

function summary(
  overrides: Partial<DiscoverySummary> = {},
): DiscoverySummary {
  return {
    activationState: "root_uninitialized",
    activationMode: "cold_start_bootstrap",
    applyBlocked: false,
    reason: "cold start",
    providersRun: [],
    providerCounts: {},
    detectedLanguages: [],
    detectedTestFrameworks: [],
    excludedRoots: [],
    truncated: false,
    scanWarnings: [],
    ...overrides,
  };
}

const expected = {
  branch: "main",
  kbSnapshotId: "snap",
  workspaceSnapshot: "ws",
  sourceHashes: {},
};

function candidate(
  overrides: Partial<Candidate> & Pick<Candidate, "candidateId" | "applyPlan">,
): Candidate {
  return {
    entityType: "req",
    title: "Candidate",
    sourceKind: "typed_markdown",
    sourcePath: "docs/a.md",
    confidence: 0.8,
    confidenceBand: "high",
    evidence: [],
    relationships: [],
    ...overrides,
  };
}

describe("presentBootstrap remaining action-id and context-question branches", () => {
  test("uses properties.id, relationship dependsOn, and source-only context questions", () => {
    previousExitCode = process.exitCode;
    const result = presentBootstrap({
      root: "/tmp/repo",
      activation: activation(),
      discoverySummary: summary(),
      migrationWarning: null,
      bootstrapContext: {
        projectSummary: "A compiler",
        sourceOfTruthPaths: ["docs"],
      },
      candidates: [
        candidate({
          candidateId: "c-a",
          applyPlan: [{ properties: { id: "REQ-A" } }],
        }),
        candidate({
          candidateId: "c-b",
          applyPlan: [
            {
              id: "REQ-B",
              relationships: [{ to: "REQ-A" }, { from: "REQ-B" }, "skip"],
            },
          ],
        }),
      ],
      sourceOnlySignals: [
        {
          kind: "req",
          title: "Manual",
          sourcePath: "src/app.ts",
          confidence: 0.4,
          evidence: [],
        },
      ],
      suppressedCandidates: [],
      expected,
    });
    const actions = result.structuredContent.actions;
    expect(actions[1]?.dependsOn).toContain("bootstrap-upsert-0001");
    expect(actions[0]?.payload).toEqual(
      expect.objectContaining({ properties: { id: "REQ-A" } }),
    );
  });

  test("asks which source-only behaviors to prioritize when needs_context", () => {
    previousExitCode = process.exitCode;
    const result = presentBootstrap({
      root: "/tmp/repo",
      activation: activation(),
      discoverySummary: summary(),
      migrationWarning: null,
      bootstrapContext: {
        projectSummary: "A compiler",
        sourceOfTruthPaths: ["docs"],
        verificationAnchors: ["bun test"],
      },
      candidates: [],
      sourceOnlySignals: [
        {
          kind: "req",
          title: "Manual",
          sourcePath: "src/app.ts",
          confidence: 0.4,
          evidence: [],
        },
      ],
      suppressedCandidates: [],
      expected,
    });
    expect(result.structuredContent.contextQuestions).toEqual([
      "Which detected product behaviors should be prioritized for bootstrap?",
    ]);
  });

  test("asks the fallback question when needs_context has no other gaps", () => {
    previousExitCode = process.exitCode;
    const result = presentBootstrap({
      root: "/tmp/repo",
      activation: activation(),
      discoverySummary: summary(),
      migrationWarning: null,
      bootstrapContext: {
        projectSummary: "A compiler",
        sourceOfTruthPaths: ["docs"],
        verificationAnchors: ["bun test"],
      },
      candidates: [],
      sourceOnlySignals: [],
      suppressedCandidates: [],
      expected,
    });
    expect(result.structuredContent.status).toBe("needs_context");
    expect(result.structuredContent.contextQuestions).toEqual([
      "Which specific product behavior should this bootstrap plan prioritize before authoring knowledge?",
    ]);
  });
});
